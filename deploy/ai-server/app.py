"""Doory reference AI server.

Implements the Doory-compatible OpenAPI contract (apps/ai/contract/openapi.yaml):
- `GET  /v1/models` -> list models and supported tasks
- `POST /v1/{task}`  -> execute task on an image (e.g. background-removal)
- `GET  /health`    -> liveness / readiness probe

Open model licenses only (MIT / Apache-2.0). CPU-friendly execution via ONNX Runtime.
"""

from __future__ import annotations

import asyncio
import base64
import hmac
import io
import json
import logging
import os
import threading
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, File, Form, Header, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper(), format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("doory-ai-server")

# Available model specifications (MIT / Apache-2.0 only)
CATALOG_MODELS: dict[str, dict[str, Any]] = {
    "isnet-general-use": {
        "id": "isnet-general-use",
        "label": "IS-Net (Balanced)",
        "tasks": ["background-removal"],
        "license": "Apache-2.0",
        "description": "Salient object detection with crisp edge definition (~1.4s CPU).",
    },
    "u2net": {
        "id": "u2net",
        "label": "U²-Net (High Quality)",
        "tasks": ["background-removal"],
        "license": "Apache-2.0",
        "description": "Full U²-Net model with strong general accuracy (~1.0s CPU).",
    },
    "u2netp": {
        "id": "u2netp",
        "label": "U²-Netp (Fast)",
        "tasks": ["background-removal"],
        "license": "Apache-2.0",
        "description": "Lightweight 4.7 MB variant, ultra fast (~0.7s CPU).",
    },
    "birefnet-general-lite": {
        "id": "birefnet-general-lite",
        "label": "BiRefNet Lite",
        "tasks": ["background-removal"],
        "license": "MIT",
        "description": "Bilateral reference network for complex edge detail.",
    },
}

DEFAULT_MODEL = os.environ.get("DEFAULT_MODEL", "isnet-general-use").strip()
MAX_IMAGE_BYTES = int(os.environ.get("MAX_IMAGE_BYTES", 25 * 1024 * 1024))  # 25 MB
API_KEY = os.environ.get("API_KEY", "").strip()

# Active models configured for this server instance
_active_model_ids = [
    m.strip()
    for m in os.environ.get("AVAILABLE_MODELS", "isnet-general-use,u2net,u2netp").split(",")
    if m.strip() and m.strip() in CATALOG_MODELS
]
if not _active_model_ids:
    _active_model_ids = ["isnet-general-use", "u2net", "u2netp"]

# Ensure default model is in active models list
if DEFAULT_MODEL not in _active_model_ids:
    _active_model_ids.insert(0, DEFAULT_MODEL)

# Session caching: model_name -> rembg session
_sessions: dict[str, Any] = {}
_session_lock = threading.Lock()


def get_rembg_session(model_name: str) -> Any:
    """Retrieve or initialize a rembg session thread-safely."""
    with _session_lock:
        if model_name not in _sessions:
            logger.info("Initializing rembg session for model '%s'...", model_name)
            try:
                from rembg import new_session
                _sessions[model_name] = new_session(model_name)
            except Exception as exc:
                logger.error("Failed to load model '%s': %s", model_name, exc)
                raise RuntimeError(f"Failed to load model '{model_name}': {exc}") from exc
        return _sessions[model_name]


def run_background_removal(image_bytes: bytes, model_name: str) -> bytes:
    """Execute background removal synchronously inside a worker thread."""
    from rembg import remove

    session = get_rembg_session(model_name)
    return remove(image_bytes, session=session)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm up requested models at startup if configured."""
    preload = os.environ.get("PRELOAD_MODELS", "").strip()
    if preload:
        to_load = [m.strip() for m in preload.split(",") if m.strip()]
        for mid in to_load:
            if mid in CATALOG_MODELS:
                logger.info("Pre-warming model '%s'...", mid)
                try:
                    await asyncio.to_thread(get_rembg_session, mid)
                except Exception as exc:
                    logger.warning("Could not pre-warm model '%s': %s", mid, exc)
    logger.info("Doory AI reference server started (default model: %s).", DEFAULT_MODEL)
    yield
    _sessions.clear()
    logger.info("Doory AI reference server stopped.")


app = FastAPI(
    title="Doory-compatible AI Server",
    description="Reference implementation of the Doory AI OpenAPI contract.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _check_auth(request: Request) -> bool:
    """Verify incoming Authorization or X-Api-Key headers when API_KEY is set."""
    if not API_KEY:
        return True
    auth = request.headers.get("Authorization", "").strip()
    if auth.startswith("Bearer "):
        token = auth[7:].strip()
        if hmac.compare_digest(token, API_KEY):
            return True
    api_key_header = request.headers.get("X-Api-Key", "").strip()
    if api_key_header and hmac.compare_digest(api_key_header, API_KEY):
        return True
    return False


@app.get("/health", summary="Health check")
async def health():
    """Liveness probe."""
    return {"status": "ok", "default_model": DEFAULT_MODEL, "loaded_models": list(_sessions.keys())}


@app.get("/v1/models", summary="List available models")
async def list_models(request: Request):
    """List available AI models and their supported tasks, best first."""
    if not _check_auth(request):
        return JSONResponse(
            status_code=401,
            content={"error": {"code": "unauthorized", "message": "Missing or invalid credentials."}},
        )

    models_list = []
    # Place DEFAULT_MODEL first
    ordered_ids = [DEFAULT_MODEL] + [m for m in _active_model_ids if m != DEFAULT_MODEL]
    for mid in ordered_ids:
        spec = CATALOG_MODELS.get(mid)
        if spec:
            models_list.append({
                "id": spec["id"],
                "label": spec["label"],
                "tasks": spec["tasks"],
            })

    return {"models": models_list}


@app.post("/v1/{task}", summary="Run task on image")
async def run_task(
    task: str,
    request: Request,
    image: UploadFile = File(..., description="Source image file"),
    model: str | None = Form(None, description="Optional model ID"),
    options: str | None = Form(None, description="Optional JSON options"),
):
    """Run an AI task (e.g. background-removal) on an uploaded image."""
    if not _check_auth(request):
        return JSONResponse(
            status_code=401,
            content={"error": {"code": "unauthorized", "message": "Missing or invalid credentials."}},
        )

    if task != "background-removal":
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "not_found", "message": f"Task '{task}' is not supported."}},
        )

    # Determine model
    selected_model = (model or "").strip() or DEFAULT_MODEL
    if selected_model not in CATALOG_MODELS and selected_model not in _active_model_ids:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "unknown_model", "message": f"Model '{selected_model}' is not supported."}},
        )

    # Read and validate image content
    try:
        image_bytes = await image.read()
    except Exception as exc:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "bad_request", "message": f"Could not read upload: {exc}"}},
        )

    if not image_bytes:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "empty_image", "message": "The uploaded image file is empty."}},
        )

    if len(image_bytes) > MAX_IMAGE_BYTES:
        return JSONResponse(
            status_code=413,
            content={
                "error": {
                    "code": "too_large",
                    "message": f"Image exceeds maximum size of {MAX_IMAGE_BYTES} bytes.",
                }
            },
        )

    # Verify image integrity with PIL
    try:
        with Image.open(io.BytesIO(image_bytes)) as pil_img:
            pil_img.verify()
    except Exception as exc:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "invalid_image", "message": f"Invalid or corrupted image: {exc}"}},
        )

    # Execute task in thread pool to avoid blocking the event loop
    try:
        output_png = await asyncio.to_thread(run_background_removal, image_bytes, selected_model)
    except Exception as exc:
        logger.exception("Inference error for model '%s'", selected_model)
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "inference_error", "message": f"Failed to process image: {exc}"}},
        )

    # Content negotiation: return JSON with image_b64 if requested, else raw PNG
    accept = request.headers.get("Accept", "").lower()
    if "application/json" in accept and "image/png" not in accept and "*/*" not in accept:
        b64_str = base64.b64encode(output_png).decode("ascii")
        return {"image_b64": b64_str}

    return Response(content=output_png, media_type="image/png")
