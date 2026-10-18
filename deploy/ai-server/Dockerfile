# Doory AI reference server (background removal)
# Implements the Doory-compatible OpenAPI contract (apps/ai/contract/openapi.yaml).
# Open-source models only (Apache-2.0 / MIT). Native linux/amd64 and linux/arm64.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    U2NET_HOME=/models \
    OMP_NUM_THREADS=4 \
    PORT=7000 \
    DEFAULT_MODEL=isnet-general-use

# Install system libraries needed by onnxruntime (libgomp)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgomp1 && \
    rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user and directories
RUN groupadd -g 10001 appuser && \
    useradd -u 10001 -g appuser -s /bin/bash -m appuser && \
    mkdir -p /models /app && \
    chown -R appuser:appuser /models /app

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server application
COPY app.py .
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 7000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7000/health')"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7000", "--no-server-header"]
