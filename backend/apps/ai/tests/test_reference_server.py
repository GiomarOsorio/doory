"""End-to-end integration test verifying Doory's `DooryStyle` transport against the
bundled reference AI server implementation (`deploy/ai-server/app.py`).
"""

from __future__ import annotations

import base64
import io
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

# Add deploy/ai-server to sys.path so we can import the reference server app directly
AI_SERVER_DIR = Path(__file__).resolve().parents[4] / "deploy" / "ai-server"
if str(AI_SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(AI_SERVER_DIR))

from app import app, DEFAULT_MODEL  # type: ignore[import-not-found]

from apps.ai.errors import AIProviderError
from apps.ai.results import SourceImage
from apps.ai.styles import get_style
from apps.ai.styles.base import Connection, OutgoingRequest, StyleConfig
from apps.ai.transport import HttpResponse, Policy


def make_test_image(width: int = 40, height: int = 30) -> bytes:
    """Generate in-memory test PNG bytes."""
    buf = io.BytesIO()
    img = Image.new("RGBA", (width, height), color=(255, 0, 0, 255))
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_cutout_image(width: int = 40, height: int = 30) -> bytes:
    """Generate in-memory cut-out PNG bytes (half transparent)."""
    buf = io.BytesIO()
    img = Image.new("RGBA", (width, height), color=(255, 0, 0, 255))
    # Make left half transparent
    for x in range(width // 2):
        for y in range(height):
            img.putpixel((x, y), (255, 0, 0, 0))
    img.save(buf, format="PNG")
    return buf.getvalue()


def send_to_app(client: TestClient, request: OutgoingRequest, max_bytes: int = 10 * 1024 * 1024) -> HttpResponse:
    """Bridge Doory's `OutgoingRequest` to FastAPI `TestClient`."""
    # Parse path and query
    url = request.url
    if "://" in url:
        path = "/" + url.split("://", 1)[1].split("/", 1)[1] if "/" in url.split("://", 1)[1] else "/"
    else:
        path = url

    headers = dict(request.headers)
    resp = client.request(
        method=request.method,
        url=path,
        headers=headers,
        content=request.body,
    )
    return HttpResponse(
        status=resp.status_code,
        headers={k.lower(): v for k, v in resp.headers.items()},
        body=resp.content,
    )


class TestDooryStyleWithReferenceServer:
    @pytest.fixture(autouse=True)
    def setup_client(self):
        self.client = TestClient(app)
        self.style = get_style("doory")
        self.source_bytes = make_test_image(40, 30)
        self.cutout_bytes = make_cutout_image(40, 30)
        self.source = SourceImage(
            bytes=self.source_bytes,
            format="PNG",
            size=(40, 30),
            has_alpha=True,
            mode="RGBA",
        )

    def _connection(self, *, auth_header: str = "", auth_value: str = "") -> Connection:
        return Connection(
            ref="test-ref",
            name="Reference AI Server",
            base_url="http://doory-ai-server:7000",
            style="doory",
            config=StyleConfig(path="/v1/{task}"),
            auth_header=auth_header,
            auth_value=auth_value,
            timeout=10.0,
            max_image_bytes=25 * 1024 * 1024,
            policy=Policy("operator", allow_http=True),
        )

    def test_list_models_against_reference_server(self):
        conn = self._connection()
        send = lambda req, limit: send_to_app(self.client, req, limit)

        models = self.style.list_models(conn, send)
        assert len(models) >= 1
        model_ids = [m.remote_name for m in models]
        assert DEFAULT_MODEL in model_ids
        for m in models:
            assert m.remote_name
            assert m.label
            assert "background-removal" in m.tasks

    @patch("app.run_background_removal")
    def test_run_background_removal_returns_transparent_png(self, mock_remove):
        mock_remove.return_value = self.cutout_bytes

        conn = self._connection()
        send = lambda req, limit: send_to_app(self.client, req, limit)

        # 1. Build request using Doory's DooryStyle
        req = self.style.build_request(
            conn,
            task="background-removal",
            model="isnet-general-use",
            image=self.source,
            options=None,
        )

        # 2. Execute via bridge to reference server
        response = send(req, 10 * 1024 * 1024)
        assert response.status == 200
        assert response.content_type == "image/png"

        # 3. Parse response using Doory's DooryStyle
        result = self.style.parse_response(req, response, self.source)
        assert result.format == "PNG"
        assert result.size == (40, 30)

        # Verify pixel transparency is preserved
        with Image.open(io.BytesIO(result.bytes)) as parsed_img:
            assert parsed_img.mode == "RGBA"
            assert parsed_img.getpixel((5, 5))[3] == 0  # left half transparent
            assert parsed_img.getpixel((35, 15))[3] == 255  # right half opaque

    @patch("app.run_background_removal")
    def test_run_background_removal_json_base64_negotiation(self, mock_remove):
        mock_remove.return_value = self.cutout_bytes

        # Configure connection to request application/json
        conn = Connection(
            ref="test-ref",
            name="Reference AI Server",
            base_url="http://doory-ai-server:7000",
            style="doory",
            config=StyleConfig(path="/v1/{task}", extra_headers={"Accept": "application/json"}),
            auth_header="",
            auth_value="",
            timeout=10.0,
            max_image_bytes=25 * 1024 * 1024,
            policy=Policy("operator", allow_http=True),
        )
        send = lambda req, limit: send_to_app(self.client, req, limit)

        req = self.style.build_request(
            conn,
            task="background-removal",
            model="",
            image=self.source,
            options=None,
        )
        response = send(req, 10 * 1024 * 1024)
        assert response.status == 200
        assert "application/json" in response.content_type

        # Verify Doory auto response mode extracts image_b64 from json
        result = self.style.parse_response(req, response, self.source)
        assert result.format == "PNG"
        assert result.size == (40, 30)

    @patch("app.API_KEY", "test-auth-secret-key")
    def test_authenticated_calls_succeed(self):
        conn = self._connection(auth_header="Authorization", auth_value="Bearer test-auth-secret-key")
        send = lambda req, limit: send_to_app(self.client, req, limit)

        models = self.style.list_models(conn, send)
        assert len(models) >= 1

    @patch("app.API_KEY", "test-auth-secret-key")
    def test_unauthenticated_calls_fail(self):
        conn = self._connection(auth_header="Authorization", auth_value="Bearer wrong-secret")
        send = lambda req, limit: send_to_app(self.client, req, limit)

        with pytest.raises(AIProviderError) as exc_info:
            self.style.list_models(conn, send)
        assert exc_info.value.code == "auth_failed"
