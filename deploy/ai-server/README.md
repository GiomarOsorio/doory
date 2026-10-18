# Doory AI Reference Server

A self-hosted, CPU-friendly background removal service implementing Doory's open contract (`backend/apps/ai/contract/openapi.yaml`).

- **Contract:** `GET /v1/models`, `POST /v1/{task}` (`background-removal`), `GET /health`
- **Output:** Transparent PNG stream (preferred) or base64 JSON
- **License compliance:** Every model is strictly **Apache-2.0** or **MIT** (commercial and private use permitted; no non-commercial clauses)
- **Engine:** [rembg](https://github.com/danielgatis/rembg) with [ONNX Runtime](https://onnxruntime.ai/) CPU provider

---

## Supported Models

| Model ID | License | Weight Size | RAM Usage | Warm Call (CPU) | Quality & Best Use |
|---|---|---|---|---|---|
| **`isnet-general-use`** *(default)* | Apache-2.0 | ~179 MB | ~1.4 GB flat | **~1.2–1.5s** | **Crispest edge definition** on hair, spokes, and fine silhouettes. Recommended default for server deployments. |
| **`u2net`** | Apache-2.0 | ~176 MB | ~1.3 GB | ~1.0s | Solid general accuracy on broad foreground objects. |
| **`u2netp`** | Apache-2.0 | ~4.7 MB | ~200 MB | ~0.7s | Ultra-lightweight variant; matches Doory's in-browser model. |
| **`birefnet-general-lite`** | MIT | ~224 MB | ~6–8 GB | ~6.0s (CPU) | High-resolution bilateral reference network; best with GPU or high-RAM VPS. |

> [!NOTE]
> `bria-rmbg` is excluded because its commercial restrictions conflict with open self-hosting.

---

## Quick Start (Docker)

### 1. Build and Run Standalone

```bash
docker build -t doory-ai-server deploy/ai-server

# Run with model weights persisted in a Docker volume
docker run -d \
  --name doory-ai-server \
  -p 7000:7000 \
  -v doory-ai-models:/models \
  -e DEFAULT_MODEL=isnet-general-use \
  doory-ai-server
```

### 2. Run with Doory Docker Compose

In Doory's root directory:

```bash
# Add to .env:
COMPOSE_PROFILES=ai
AI_PROVIDERS_ENABLED=true
AI_ALLOWED_PRIVATE_HOSTS=ai-server,doory-ai-server
AI_PROVIDER_1_URL=http://ai-server:7000
AI_PROVIDER_1_STYLE=doory
AI_PROVIDER_1_LABEL="High quality (server)"

# Start the stack including the ai-server service
docker compose up -d
```

---

## Testing the Server

### 1. Health check

```bash
curl http://localhost:7000/health
# {"status":"ok","default_model":"isnet-general-use","loaded_models":[]}
```

### 2. List available models

```bash
curl http://localhost:7000/v1/models
```

Output:
```json
{
  "models": [
    {
      "id": "isnet-general-use",
      "label": "IS-Net (Balanced)",
      "tasks": ["background-removal"]
    },
    {
      "id": "u2net",
      "label": "U²-Net (High Quality)",
      "tasks": ["background-removal"]
    },
    {
      "id": "u2netp",
      "label": "U²-Netp (Fast)",
      "tasks": ["background-removal"]
    }
  ]
}
```

### 3. Remove background (binary PNG)

```bash
curl -X POST http://localhost:7000/v1/background-removal \
  -F "image=@photo.jpg" \
  -o cutout.png
```

### 4. Remove background with a specific model

```bash
curl -X POST http://localhost:7000/v1/background-removal \
  -F "image=@photo.jpg" \
  -F "model=u2netp" \
  -o cutout.png
```

### 5. Remove background as JSON base64

```bash
curl -X POST http://localhost:7000/v1/background-removal \
  -H "Accept: application/json" \
  -F "image=@photo.jpg"
# {"image_b64":"iVBORw0KGgoAAAANSUhEUgAA..."}
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `7000` | Port uvicorn binds to |
| `DEFAULT_MODEL` | `isnet-general-use` | Default model when request omits `model` field |
| `AVAILABLE_MODELS` | `isnet-general-use,u2net,u2netp` | Comma-separated model IDs returned by `/v1/models` |
| `API_KEY` | *(empty)* | Optional secret. When set, requests must pass `Authorization: Bearer <key>` or `X-Api-Key: <key>` |
| `MAX_IMAGE_BYTES` | `26214400` (25 MB) | Maximum accepted upload file size |
| `OMP_NUM_THREADS` | `4` | OpenMP CPU thread pool for ONNX Runtime |
| `U2NET_HOME` | `/models` | Directory where downloaded ONNX weights are cached |
| `PRELOAD_MODELS` | *(empty)* | Comma-separated model IDs to load into RAM at server boot |
| `LOG_LEVEL` | `INFO` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
