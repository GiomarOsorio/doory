"""`POST /api/v1/designs/{id}/export/image/` (the browser is stubbed out; see test_chromium for the real one)."""

import io
import zipfile

import pytest
from django.utils import timezone

from apps.designs.tests.helpers import make_design, make_doc
from apps.exports import services, views
from apps.exports.exceptions import ExportBusy, InvalidExport
from apps.exports.services import IMAGE_FORMATS, ImageResult
from apps.exports.throttling import ExportRateThrottle

IMAGE = b"\x89PNG\r\n\x1a\nfake"
# What the view passes on when the body only names the page and format.
DEFAULTS = {
    "quality": 90,
    "scale": 1.0,
    "size": None,
    "transparent": False,
    "max_bytes": None,
    "png_colors": None,
    "strip_metadata": True,
    "srgb": True,
    "progressive": False,
}


def url(design) -> str:
    return f"/api/v1/designs/{design.pk}/export/image/"


@pytest.fixture
def renders(monkeypatch) -> list[dict]:
    calls: list[dict] = []

    def fake_export_image(design, **options):
        calls.append(options)
        index = options["page"] if isinstance(options["page"], int) else 0
        ext = {"jpeg": "jpg", "auto": "webp"}.get(options["format"], options["format"])
        return ImageResult(
            data=IMAGE,
            format=ext,
            mime=IMAGE_FORMATS[ext],
            width=10,
            height=10,
            page_id="p",
            page_index=index,
            placeholders=1,
            page_width=1080,
            page_height=1920,
            page_count=design.page_count,
            preset=design.preset,
        )

    monkeypatch.setattr(services, "export_image", fake_export_image)
    return calls


@pytest.fixture
def design(user):
    return make_design(user, title="Summer sale", document=make_doc())


def test_the_image_is_the_response(client, design, renders):
    response = client.post(url(design), {}, format="json")
    assert response.status_code == 200
    assert response.content == IMAGE
    assert response["Content-Type"] == "image/png"
    assert response["Content-Disposition"] == 'attachment; filename="Summer sale.png"'
    assert response["Cache-Control"] == "no-store" and response["X-Content-Type-Options"] == "nosniff"
    assert response["X-Doory-Placeholders"] == "1"
    assert renders == [{"page": 0, "format": "png", **DEFAULTS}]


def test_options_are_passed_on_and_pages_count_from_one(client, user, renders):
    design = make_design(user, title="Deck", document=make_doc(pages=3))
    body = {"page": 2, "format": "webp", "quality": 40, "scale": 2, "transparent": True}
    response = client.post(url(design), body, format="json")
    assert response.status_code == 200
    assert response["Content-Disposition"] == 'attachment; filename="Deck - page 2.webp"'
    assert renders[-1] == {
        "page": 1,
        "format": "webp",
        **DEFAULTS,
        "quality": 40,
        "scale": 2.0,
        "transparent": True,
    }
    client.post(url(design), {"page": design.document["pages"][2]["id"], "format": "jpeg"}, format="json")
    assert renders[-1]["page"] == 2


@pytest.mark.django_db
def test_structured_names_on_request_and_by_default(client, user, renders, settings, monkeypatch):
    design = make_design(user, title="Summer Sale", document=make_doc(pages=3))
    design.preset = "instagram-story"
    design.save()
    body = {"page": 2, "filename_style": "structured"}
    response = client.post(url(design), body, format="json")
    expected = "summer-sale_instagram_instagram-story_1080x1920_p02"
    assert response["Content-Disposition"] == f'attachment; filename="{expected}.png"'
    monkeypatch.setattr(views, "unix_now", lambda: 1792259000)
    settings.EXPORT_FILENAME_STYLE = "structured"
    settings.EXPORT_FILENAME_TIMESTAMP = True
    response = client.post(url(design), {"page": 2}, format="json")
    assert response["Content-Disposition"] == f'attachment; filename="{expected}_1792259000.png"'
    response = client.post(url(design), {"page": 2, "filename_timestamp": False}, format="json")
    assert response["Content-Disposition"] == f'attachment; filename="{expected}.png"'
    response = client.post(url(design), {"page": 2, "filename_style": "simple"}, format="json")
    assert response["Content-Disposition"] == 'attachment; filename="Summer Sale - page 2.png"'


def test_an_image_comes_back_whatever_the_accept_header(client, design, renders):
    response = client.post(url(design), {}, format="json", HTTP_ACCEPT="image/png")
    assert response.status_code == 200


@pytest.mark.parametrize(
    "body",
    [
        {"page": 0},
        {"page": True},
        {"page": ""},
        {"format": "gif"},
        {"filename_style": "fancy"},
        {"quality": 0},
        {"scale": 5},
        {"scale": "NaN"},
        {"format": "tiff"},
        {"quality": "great"},
        {"quality": True},
        {"size": "big"},
        {"size": "2y"},
        {"max_bytes": 0},
        {"png_colors": 1},
        {"png_colors": 257},
        {"png_colors": "half"},
        {"pages": []},
        {"pages": "some"},
        {"pages": [0]},
        {"pages": [1, ""]},
        {"file_names": "fancy"},
    ],
)
def test_bad_options_are_refused(client, design, renders, body):
    response = client.post(url(design), body, format="json")
    assert response.status_code == 400
    assert renders == []


def test_only_the_owner_gets_it_and_not_from_the_trash(client, anon, design, renders, db):
    from apps.accounts.models import User

    stranger = make_design(User.objects.create_user("x@example.com", "pass-pass-123"))
    assert client.post(url(stranger), {}, format="json").status_code == 404
    assert anon.post(url(design), {}, format="json").status_code == 401
    design.trashed_at = timezone.now()
    design.save()
    assert client.post(url(design), {}, format="json").status_code == 404
    assert renders == []


def test_typed_export_errors_keep_their_status_and_code(client, design, monkeypatch):
    def refuse(error):
        def fake(design, **options):
            raise error

        return fake

    monkeypatch.setattr(services, "export_image", refuse(InvalidExport("too_large", "Too big.")))
    response = client.post(url(design), {}, format="json", HTTP_ACCEPT="image/png")
    assert response.status_code == 400 and response["Content-Type"] == "application/json"
    assert "Too big." in response.content.decode()
    monkeypatch.setattr(services, "export_image", refuse(ExportBusy()))
    response = client.post(url(design), {}, format="json")
    assert response.status_code == 503 and response["Retry-After"] == "5"


def test_renders_are_rate_limited(client, design, renders, monkeypatch):
    monkeypatch.setattr(ExportRateThrottle, "THROTTLE_RATES", {"export": "1/min"})
    assert client.post(url(design), {}, format="json").status_code == 200
    assert client.post(url(design), {}, format="json").status_code == 429


def test_the_new_options_are_passed_on(client, design, renders):
    body = {
        "format": "avif",
        "quality": "small",
        "size": "1080w",
        "max_bytes": 200_000,
        "png_colors": 256,
        "strip_metadata": False,
        "srgb": False,
        "progressive": True,
    }
    response = client.post(url(design), body, format="json")
    assert response.status_code == 200
    assert response["Content-Type"] == "image/avif"
    assert response["Content-Disposition"] == 'attachment; filename="Summer sale.avif"'
    assert renders[-1] == {"page": 0, **DEFAULTS, **body}
    client.post(url(design), {"format": "auto", "quality": 70, "png_colors": "full"}, format="json")
    assert renders[-1] | {"page": None} == {"page": None, **DEFAULTS, "format": "auto", "quality": 70}


def test_several_pages_come_back_as_one_zip(client, user, renders):
    design = make_design(user, title="Deck", document=make_doc(pages=3))
    response = client.post(url(design), {"pages": [3, 1], "format": "jpg"}, format="json")
    assert response.status_code == 200
    assert response["Content-Type"] == "application/zip"
    assert response["Content-Disposition"] == 'attachment; filename="Deck.zip"'
    assert response["X-Doory-Placeholders"] == "2"
    assert [r["page"] for r in renders] == [2, 0]
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    assert archive.namelist() == ["Deck - page 3.jpg", "Deck - page 1.jpg"]
    assert {info.compress_type for info in archive.infolist()} == {zipfile.ZIP_STORED}
    assert archive.read("Deck - page 1.jpg") == IMAGE

    renders.clear()
    response = client.post(url(design), {"pages": "all", "file_names": "detailed"}, format="json")
    assert [r["page"] for r in renders] == [0, 1, 2]
    names = zipfile.ZipFile(io.BytesIO(response.content)).namelist()
    assert names == [f"deck_1080x1920_p0{n}.png" for n in (1, 2, 3)]


def test_one_page_asked_for_as_pages_is_a_plain_image(client, design, renders):
    response = client.post(url(design), {"pages": "all"}, format="json")
    assert response["Content-Type"] == "image/png" and response.content == IMAGE


def test_each_extra_page_counts_against_the_export_rate(client, user, renders, monkeypatch):
    monkeypatch.setattr(ExportRateThrottle, "THROTTLE_RATES", {"export": "3/min"})
    design = make_design(user, document=make_doc(pages=3))
    assert client.post(url(design), {"pages": [1, 2]}, format="json").status_code == 200
    response = client.post(url(design), {"pages": [1, 2]}, format="json")
    assert response.status_code == 429
    assert len(renders) == 2  # nothing is drawn once the budget is spent


def test_too_many_pages_are_refused_before_anything_is_drawn(client, user, renders, settings):
    settings.EXPORT_IMAGE_MAX_PAGES = 2
    design = make_design(user, document=make_doc(pages=3))
    response = client.post(url(design), {"pages": "all"}, format="json")
    assert response.status_code == 400 and "at most 2 pages" in response.content.decode()
    assert client.post(url(design), {"pages": [1, 9]}, format="json").status_code == 400
    assert renders == []


def test_the_schema_documents_the_new_formats(client, db):
    schema = client.get("/api/v1/schema/", {"format": "json"}).json()
    operation = schema["paths"]["/api/v1/designs/{id}/export/image/"]["post"]
    assert set(operation["responses"]["200"]["content"]) >= {"image/avif", "application/zip"}
