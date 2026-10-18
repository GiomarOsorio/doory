"""Tests for AI MCP tools and design operations: list_ai_models, import_stock_photo(remove_background=True),
and edit_design with remove_background."""

from __future__ import annotations

import pytest
from django.core.files.base import ContentFile
from mcp.server.mcpserver.exceptions import ToolError

from apps.ai.models import Provider
from apps.ai.throttling import AIRateThrottle
from apps.assets import stock
from apps.assets.models import Asset
from apps.assets.tests.helpers import image_bytes
from apps.designs.models import Design
from apps.designs.tests.helpers import make_design, make_doc
from apps.mcp.tools import ai, assets, designs

pytestmark = pytest.mark.django_db


def make_test_asset(owner, name="Hero", width=200, height=100) -> Asset:
    asset = Asset(owner=owner, name=name, width=width, height=height, mime="image/png", size=10)
    asset.file.save(
        f"{name.lower()}.png", ContentFile(image_bytes(mode="RGB", size=(width, height))), save=False
    )
    asset.save()
    return asset


def make_provider(base_url="http://ai.example.com", name="Server Provider", style="doory") -> Provider:
    return Provider.objects.create(
        name=name,
        base_url=base_url,
        style=style,
        tasks=["background-removal"],
        enabled=True,
    )


# ---------------------------------------------------------------------------------------------
# list_ai_models
# ---------------------------------------------------------------------------------------------


def test_list_ai_models(as_caller, settings):
    settings.AI_PROVIDERS_ENABLED = True
    provider = make_provider()
    listed = ai.list_ai_models()
    assert listed["task"] == "background-removal"
    assert listed["server_default"] is not None
    models = listed["models"]
    assert any(m["provider_name"] == provider.name for m in models)
    for m in models:
        assert "id" in m and "label" in m and "kind" in m and "provider_name" in m
        assert "secret" not in m and "base_url" not in m and "url" not in m


def test_list_ai_models_unknown_task_is_refused(as_caller):
    with pytest.raises(ToolError, match="Unknown task 'invalid-task'"):
        ai.list_ai_models(task="invalid-task")


def test_list_ai_models_requires_assets_write_scope(as_caller):
    as_caller.token.scopes = ["designs:read", "designs:write"]
    with pytest.raises(ToolError, match="`assets:write` scope"):
        ai.list_ai_models()


# ---------------------------------------------------------------------------------------------
# import_stock_photo with remove_background
# ---------------------------------------------------------------------------------------------


def test_import_stock_photo_with_remove_background(as_caller, user, monkeypatch, settings):
    settings.AI_PROVIDERS_ENABLED = True
    make_provider()
    raw = make_test_asset(user, name="Raw Stock Photo")
    cutout = make_test_asset(user, name="Cutout Photo")

    monkeypatch.setattr(stock, "import_photo", lambda u, p, pid: (raw, True))
    monkeypatch.setattr(ai, "resolve_and_run_background_removal", lambda u, a, m: cutout)

    imported = assets.import_stock_photo("unsplash", "photo-1", remove_background=True)
    assert imported["asset_id"] == str(cutout.pk)


def test_import_stock_photo_remove_background_fails_when_no_server_provider(
    as_caller, user, monkeypatch, settings
):
    settings.AI_PROVIDERS_ENABLED = True
    raw = make_test_asset(user, name="Raw Stock Photo")
    monkeypatch.setattr(stock, "import_photo", lambda u, p, pid: (raw, True))

    with pytest.raises(ToolError, match="No AI server is configured for background removal"):
        assets.import_stock_photo("unsplash", "photo-1", remove_background=True)


def test_import_stock_photo_shares_ai_rate_throttle(as_caller, user, monkeypatch, settings):
    settings.AI_PROVIDERS_ENABLED = True
    make_provider()
    raw = make_test_asset(user, name="Raw Stock Photo")
    cutout = make_test_asset(user, name="Cutout Photo")

    monkeypatch.setattr(stock, "import_photo", lambda u, p, pid: (raw, True))
    monkeypatch.setattr(ai, "resolve_and_run_background_removal", lambda u, a, m: cutout)
    monkeypatch.setattr(AIRateThrottle, "THROTTLE_RATES", {"ai": "1/min"})

    assets.import_stock_photo("unsplash", "photo-1", remove_background=True)
    with pytest.raises(ToolError, match="Too many requests"):
        assets.import_stock_photo("unsplash", "photo-2", remove_background=True)


# ---------------------------------------------------------------------------------------------
# edit_design with remove_background
# ---------------------------------------------------------------------------------------------


def test_edit_design_remove_background_replaces_image_in_place(as_caller, user, monkeypatch, settings):
    settings.AI_PROVIDERS_ENABLED = True
    make_provider()
    hero = make_test_asset(user, name="Hero", width=400, height=200)
    cutout = make_test_asset(user, name="Hero (cutout)", width=400, height=200)

    monkeypatch.setattr(ai, "resolve_and_run_background_removal", lambda u, a, m: cutout)

    design = make_design(
        user,
        title="Poster",
        document=make_doc(
            objects=[
                {
                    "id": "hero-obj",
                    "type": "image",
                    "src": hero.file.url,
                    "assetId": str(hero.pk),
                    "left": 50,
                    "top": 60,
                    "width": 200,
                    "height": 100,
                    "scaleX": 1,
                    "scaleY": 1,
                }
            ]
        ),
    )

    result = designs.edit_design(
        str(design.pk),
        [{"op": "remove_background", "object_id": "hero-obj"}],
    )
    assert result["revision"] == 2
    doc = Design.objects.get(pk=design.pk).document
    obj = doc["pages"][0]["objects"][0]
    assert obj["assetId"] == str(cutout.pk)
    assert obj["src"] == cutout.file.url
    assert obj["left"] == 50 and obj["top"] == 60


def test_edit_design_remove_background_needs_assets_write_scope(as_caller, user, monkeypatch, settings):
    settings.AI_PROVIDERS_ENABLED = True
    make_provider()
    hero = make_test_asset(user, name="Hero")

    design = make_design(
        user,
        title="Poster",
        document=make_doc(
            objects=[
                {
                    "id": "hero-obj",
                    "type": "image",
                    "src": hero.file.url,
                    "assetId": str(hero.pk),
                    "left": 0,
                    "top": 0,
                    "width": 100,
                    "height": 100,
                }
            ]
        ),
    )

    as_caller.token.scopes = ["designs:read", "designs:write"]
    with pytest.raises(ToolError, match="`assets:write` scope"):
        designs.edit_design(
            str(design.pk),
            [{"op": "remove_background", "object_id": "hero-obj"}],
        )


def test_edit_design_remove_background_refuses_non_images(as_caller, user):
    design = make_design(
        user,
        title="Poster",
        document=make_doc(
            objects=[
                {
                    "id": "text-obj",
                    "type": "textbox",
                    "text": "Hello",
                    "left": 0,
                    "top": 0,
                    "width": 100,
                    "height": 50,
                }
            ]
        ),
    )

    with pytest.raises(ToolError, match="Only pictures can have their background removed"):
        designs.edit_design(
            str(design.pk),
            [{"op": "remove_background", "object_id": "text-obj"}],
        )


def test_edit_design_remove_background_fails_atomically_on_provider_error(
    as_caller, user, monkeypatch, settings
):
    settings.AI_PROVIDERS_ENABLED = True
    make_provider()
    hero = make_test_asset(user, name="Hero")

    def failing_removal(u, a, m):
        raise ToolError("The AI provider timed out.")

    monkeypatch.setattr(ai, "resolve_and_run_background_removal", failing_removal)

    design = make_design(
        user,
        title="Poster",
        document=make_doc(
            objects=[
                {
                    "id": "hero-obj",
                    "type": "image",
                    "src": hero.file.url,
                    "assetId": str(hero.pk),
                    "left": 10,
                    "top": 20,
                    "width": 100,
                    "height": 100,
                }
            ]
        ),
    )

    with pytest.raises(ToolError, match=r"AI provider timed out.*Nothing was changed"):
        designs.edit_design(
            str(design.pk),
            [{"op": "remove_background", "object_id": "hero-obj"}],
        )

    # Design document unchanged
    unchanged_doc = Design.objects.get(pk=design.pk).document
    assert unchanged_doc["pages"][0]["objects"][0]["src"] == hero.file.url


def test_remove_asset_background(as_caller, user, monkeypatch, settings):
    settings.AI_PROVIDERS_ENABLED = True
    make_provider()
    hero = make_test_asset(user, name="Hero")
    cutout = make_test_asset(user, name="Hero (cutout)")

    monkeypatch.setattr(ai, "resolve_and_run_background_removal", lambda u, a, m: cutout)

    result = ai.remove_asset_background(str(hero.pk))
    assert result["asset_id"] == str(cutout.pk)

    with pytest.raises(ToolError, match="Invalid asset id"):
        ai.remove_asset_background("not-a-uuid")

    with pytest.raises(ToolError, match="There is no picture"):
        ai.remove_asset_background("00000000-0000-0000-0000-000000000000")


def test_upload_image_from_url_with_remove_background(as_caller, user, monkeypatch, settings):
    settings.AI_PROVIDERS_ENABLED = True
    make_provider()
    raw = make_test_asset(user, name="URL Pic")
    cutout = make_test_asset(user, name="Cutout Pic")

    from apps.assets import remote

    monkeypatch.setattr(remote, "fetch_image", lambda url, max_bytes: image_bytes())
    monkeypatch.setattr(ai, "resolve_and_run_background_removal", lambda u, a, m: cutout)

    result = assets.upload_image_from_url("https://img.example/pic.png", remove_background=True)
    assert result["asset_id"] == str(cutout.pk)


def test_edit_design_remove_background_on_placeholder_slot(as_caller, user, monkeypatch, settings):
    settings.AI_PROVIDERS_ENABLED = True
    make_provider()
    hero = make_test_asset(user, name="Hero")
    cutout = make_test_asset(user, name="Hero (cutout)")

    monkeypatch.setattr(ai, "resolve_and_run_background_removal", lambda u, a, m: cutout)

    design = make_design(
        user,
        title="Poster",
        document=make_doc(
            objects=[
                {
                    "id": "slot-obj",
                    "type": "image",
                    "isPlaceholder": True,
                    "slot": {"cx": 100, "cy": 100, "width": 100, "height": 100, "mask": "circle"},
                    "src": hero.file.url,
                    "assetId": str(hero.pk),
                    "left": 50,
                    "top": 50,
                    "width": 100,
                    "height": 100,
                }
            ]
        ),
    )

    result = designs.edit_design(
        str(design.pk),
        [{"op": "remove_background", "object_id": "slot-obj"}],
    )
    assert result["revision"] == 2
    doc = Design.objects.get(pk=design.pk).document
    obj = doc["pages"][0]["objects"][0]
    assert obj["assetId"] == str(cutout.pk)
    assert obj["src"] == cutout.file.url

