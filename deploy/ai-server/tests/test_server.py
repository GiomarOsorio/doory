"""Unit tests for the Doory reference AI server."""

from __future__ import annotations

import base64
import io
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image

# Import the reference server app
from app import app, CATALOG_MODELS, DEFAULT_MODEL


def make_test_image(width: int = 10, height: int = 10, color: str = "red", format: str = "PNG") -> bytes:
    """Generate in-memory image bytes for testing."""
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format=format)
    return buf.getvalue()


class ReferenceServerTestCase(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.sample_png = make_test_image(20, 20, "blue", "PNG")
        self.cutout_png = make_test_image(20, 20, "blue", "PNG")

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["default_model"], DEFAULT_MODEL)

    def test_list_models(self):
        response = self.client.get("/v1/models")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("models", data)
        models = data["models"]
        self.assertGreaterEqual(len(models), 1)

        # First model should be the default model
        self.assertEqual(models[0]["id"], DEFAULT_MODEL)

        for m in models:
            self.assertIn("id", m)
            self.assertIn("label", m)
            self.assertIn("tasks", m)
            self.assertIn("background-removal", m["tasks"])

    def test_unknown_task_returns_404(self):
        files = {"image": ("test.png", self.sample_png, "image/png")}
        response = self.client.post("/v1/non-existent-task", files=files)
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "not_found")

    def test_empty_image_returns_400(self):
        files = {"image": ("empty.png", b"", "image/png")}
        response = self.client.post("/v1/background-removal", files=files)
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "empty_image")

    def test_corrupted_image_returns_400(self):
        files = {"image": ("corrupted.png", b"not-a-valid-image-stream", "image/png")}
        response = self.client.post("/v1/background-removal", files=files)
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "invalid_image")

    def test_unknown_model_returns_400(self):
        files = {"image": ("test.png", self.sample_png, "image/png")}
        data = {"model": "non-existent-model-xyz"}
        response = self.client.post("/v1/background-removal", files=files, data=data)
        self.assertEqual(response.status_code, 400)
        resp_data = response.json()
        self.assertIn("error", resp_data)
        self.assertEqual(resp_data["error"]["code"], "unknown_model")

    @patch("app.run_background_removal")
    def test_run_background_removal_success_png(self, mock_remove):
        mock_remove.return_value = self.cutout_png

        files = {"image": ("photo.jpg", self.sample_png, "image/jpeg")}
        data = {"model": "u2netp"}
        response = self.client.post("/v1/background-removal", files=files, data=data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "image/png")
        self.assertEqual(response.content, self.cutout_png)
        mock_remove.assert_called_once_with(self.sample_png, "u2netp")

    @patch("app.run_background_removal")
    def test_run_background_removal_json_negotiation(self, mock_remove):
        mock_remove.return_value = self.cutout_png

        files = {"image": ("photo.png", self.sample_png, "image/png")}
        headers = {"Accept": "application/json"}
        response = self.client.post("/v1/background-removal", files=files, headers=headers)

        self.assertEqual(response.status_code, 200)
        self.assertIn("application/json", response.headers["content-type"])
        data = response.json()
        self.assertIn("image_b64", data)

        decoded = base64.b64decode(data["image_b64"])
        self.assertEqual(decoded, self.cutout_png)

    @patch("app.API_KEY", "secret-test-token-12345")
    def test_authentication_required_when_api_key_set(self):
        # 1. Unauthenticated request fails
        resp = self.client.get("/v1/models")
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.json()["error"]["code"], "unauthorized")

        # 2. Invalid bearer token fails
        resp = self.client.get("/v1/models", headers={"Authorization": "Bearer wrong-token"})
        self.assertEqual(resp.status_code, 401)

        # 3. Valid bearer token succeeds
        resp = self.client.get("/v1/models", headers={"Authorization": "Bearer secret-test-token-12345"})
        self.assertEqual(resp.status_code, 200)

        # 4. Valid X-Api-Key succeeds
        resp = self.client.get("/v1/models", headers={"X-Api-Key": "secret-test-token-12345"})
        self.assertEqual(resp.status_code, 200)


if __name__ == "__main__":
    unittest.main()
