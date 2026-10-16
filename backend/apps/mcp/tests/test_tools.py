"""Each tool called directly, as the holder of a token with every scope (see `as_caller`)."""

from __future__ import annotations

import pytest
from django.core.files.base import ContentFile
from django.test import override_settings
from mcp.server.mcpserver.exceptions import ToolError

from apps.apitokens import services as tokens
from apps.apitokens.scopes import SCOPES
from apps.assets.models import Asset
from apps.assets.throttling import StockRateThrottle, UploadRateThrottle
from apps.designs.models import Design, DesignVersion
from apps.designs.tests.helpers import make_design, make_doc, text_object
from apps.elements.tests.factories import make_element
from apps.fonts.tests.factories import make_family
from apps.gallery.tests.factories import make_category, make_template
from apps.mcp import context
from apps.mcp.tools import assets, catalog, comments, designs, history
from apps.sharing.models import Comment

pytestmark = pytest.mark.django_db


def make_asset(owner, name="Logo", width=400, height=200) -> Asset:
    asset = Asset(owner=owner, name=name, width=width, height=height, mime="image/png", size=10)
    asset.file.save("logo.png", ContentFile(b"png"), save=False)
    asset.save()
    return asset


@pytest.fixture
def design(user):
    return make_design(user, title="Spring poster", document=make_doc(objects=[text_object("Hello")]))


# ---------------------------------------------------------------------------------------------
# Designs
# ---------------------------------------------------------------------------------------------


def test_list_designs_only_shows_the_callers_live_designs(as_caller, user, other, design):
    make_design(other, title="Not mine")
    make_design(user, title="Old", trashed_at="2024-01-01T00:00:00Z")
    listed = designs.list_designs()
    assert listed["total"] == 1 and listed["designs"][0]["title"] == "Spring poster"
    assert listed["designs"][0]["editor_url"].endswith(f"/design/{design.pk}")
    assert designs.list_designs(query="nothing")["total"] == 0


def test_get_design_summarises_it(as_caller, design):
    got = designs.get_design(str(design.pk))
    assert got["title"] == "Spring poster" and got["open_in_editor"] is False
    assert got["pages"][0]["objects"][0]["text"] == "Hello"
    assert "document" not in got
    assert designs.get_design(str(design.pk), include_document=True)["document"] == design.document


def test_other_peoples_designs_are_not_found(as_caller, other):
    theirs = make_design(other)
    for call in (
        lambda: designs.get_design(str(theirs.pk)),
        lambda: designs.rename_design(str(theirs.pk), "Mine now"),
        lambda: designs.edit_design(str(theirs.pk), [{"op": "set_notes", "notes": "x"}]),
        lambda: designs.get_design("not-a-uuid"),
    ):
        with pytest.raises(ToolError, match="Not found"):
            call()


def test_create_design_blank_or_from_a_template(as_caller, user):
    blank = designs.create_design(title="Story", width=1080, height=1920)
    assert (blank["width"], blank["height"]) == (1080, 1920) and len(blank["pages"]) == 1
    make_template("Summer Sale", category=make_category())
    from_template = designs.create_design(template="summer-sale")
    assert from_template["title"] == "Summer Sale"
    assert from_template["pages"][0]["objects"][0]["text"] == "Hello"
    assert Design.objects.filter(owner=user).count() == 2
    with pytest.raises(ToolError, match="Template not found"):
        designs.create_design(template="nope")


def test_rename_and_duplicate(as_caller, user, design):
    assert designs.rename_design(str(design.pk), "  Better   title ")["title"] == "Better title"
    copy = designs.duplicate_design(str(design.pk))
    assert copy["title"] == "Copy of Better title" and copy["id"] != str(design.pk)


def test_edit_design_places_uploads_and_catalogue_graphics(as_caller, user, design):
    logo = make_asset(user)
    element = make_element(name="Red square")
    make_family("Playfair Display", category="serif")
    result = designs.edit_design(
        str(design.pk),
        [
            {"op": "add_image", "asset_id": str(logo.pk), "x": 0, "y": 0, "width": 200},
            {"op": "add_image", "element_id": str(element.pk), "width": 80},
            {"op": "add_text", "text": "Title", "font_family": "Playfair Display"},
        ],
    )
    assert result["applied_live"] is False and result["revision"] == 2
    objects = Design.objects.get(pk=design.pk).document["pages"][0]["objects"]
    assert objects[1]["assetId"] == str(logo.pk) and objects[1]["src"] == logo.file.url
    assert objects[2]["src"] == element.svg.url and objects[2]["name"] == "Red square"
    assert objects[3]["fontFamily"] == '"Playfair Display", serif'
    version = DesignVersion.objects.get(design=design)
    assert version.label == "Before edits by Claude"


def test_edit_design_explains_what_went_wrong_and_changes_nothing(as_caller, other, design):
    theirs = make_asset(other)
    with pytest.raises(ToolError, match=r"Operation 1: There is no picture .* Nothing was changed"):
        designs.edit_design(str(design.pk), [{"op": "add_image", "asset_id": str(theirs.pk)}])
    with pytest.raises(ToolError, match="revision 1"):
        designs.edit_design(str(design.pk), [{"op": "set_notes", "notes": "x"}], base_revision=7)
    assert Design.objects.get(pk=design.pk).revision == 1


# ---------------------------------------------------------------------------------------------
# Catalogue
# ---------------------------------------------------------------------------------------------


def test_catalogue_searches(as_caller, user):
    make_template("Summer Sale", category=make_category(), tags=["sale"])
    make_template("Wedding Invite", category=make_category("Invitations"))
    make_element(name="Arrow right", kind="icon")
    make_family(
        "Playfair Display", category="serif", variants=((400, "normal", "latin"), (700, "italic", "latin"))
    )
    assert [t["slug"] for t in catalog.list_templates(query="sale")["templates"]] == ["summer-sale"]
    assert [t["slug"] for t in catalog.list_templates(category="invitations")["templates"]] == [
        "wedding-invite"
    ]
    assert catalog.search_elements("arrow")["elements"][0]["name"] == "Arrow right"
    font = catalog.search_fonts(category="serif")["fonts"][0]
    assert font == {"family": "Playfair Display", "category": "serif", "weights": [400, 700], "italic": True}


def test_brand_kits_list_logos_as_assets(as_caller, user):
    from apps.brand.models import BrandKit

    kit = BrandKit.objects.create(owner=user, name="Acme", colors=[{"id": "a", "name": "Red", "hex": "#f00"}])
    kit.logos.add(make_asset(user))
    listed = catalog.list_brand_kits()["brand_kits"][0]
    assert listed["name"] == "Acme" and listed["logos"][0]["name"] == "Logo"


# ---------------------------------------------------------------------------------------------
# History, comments, assets
# ---------------------------------------------------------------------------------------------


def test_an_edit_can_be_undone_with_its_version(as_caller, design):
    designs.edit_design(
        str(design.pk),
        [{"op": "delete_objects", "object_ids": [design.document["pages"][0]["objects"][0]["id"]]}],
    )
    versions = history.list_versions(str(design.pk))["versions"]
    assert len(versions) == 1
    restored = history.restore_version(str(design.pk), versions[0]["id"])
    assert restored["revision"] == 3
    assert Design.objects.get(pk=design.pk).document["pages"][0]["objects"][0]["text"] == "Hello"


def test_comments(as_caller, user, other, design):
    page_id = design.document["pages"][0]["id"]
    first = comments.add_comment(str(design.pk), "Make the title bigger", page_id=page_id, x=10, y=20)
    reply = comments.add_comment(str(design.pk), "Done", reply_to=first["id"])
    assert reply["reply_to"] == first["id"] and reply["page_id"] == page_id
    assert first["author"] == "Alice"
    theirs = Comment.objects.create(design=design, author=other, body="Hi")
    listed = {c["id"]: c for c in comments.list_comments(str(design.pk))["comments"]}
    assert listed[str(theirs.pk)]["author"] == "Doory user"  # never derived from bob@example.com
    theirs.delete()
    Comment.objects.filter(pk=first["id"]).update(resolved=True)
    assert [c["body"] for c in comments.list_comments(str(design.pk))["comments"]] == ["Done"]
    assert len(comments.list_comments(str(design.pk), include_resolved=True)["comments"]) == 2
    with pytest.raises(ToolError, match="x and y"):
        comments.add_comment(str(design.pk), "Pinned?", x=10)


def test_assets_and_stock(as_caller, user, other):
    make_asset(user, name="Beach")
    make_asset(other, name="Theirs")
    assert [a["name"] for a in assets.list_assets()["assets"]] == ["Beach"]
    assert assets.search_stock_photos("beach")["configured"] is False  # no provider key in tests
    with pytest.raises(ToolError):
        assets.import_stock_photo("unsplash", "abc")


# ---------------------------------------------------------------------------------------------
# Scopes and limits
# ---------------------------------------------------------------------------------------------


def test_missing_scopes_are_named(as_caller, design):
    as_caller.token.scopes = ["designs:read"]
    with pytest.raises(ToolError, match="`designs:write` scope"):
        designs.rename_design(str(design.pk), "x")


@override_settings(MCP_CALLS_PER_MINUTE=3)
def test_calls_are_rate_limited_per_user_across_tokens(as_caller, user):
    for _ in range(3):
        designs.list_designs()
    second = tokens.issue_token(user, name="Second", scopes=list(SCOPES), expires_in_days=30)
    bound = context.bind(context.Caller(user, second.token))
    try:
        with pytest.raises(ToolError, match="Too many calls"):
            designs.list_designs()  # a fresh token does not get a fresh budget
    finally:
        context.unbind(bound)


@override_settings(MCP_CALLS_PER_MINUTE=3)
def test_the_rate_limit_holds_when_the_cache_loses_increments(as_caller, monkeypatch):
    """The database cache's `incr` is get-then-set: parallel calls can all read the same count."""
    from apps.mcp import registry

    monkeypatch.setattr(
        registry.cache, "incr", lambda key: 1
    )  # every increment lost: always "the first call"
    allowed = 0
    for _ in range(10):
        try:
            designs.list_designs()
            allowed += 1
        except ToolError:
            pass
    assert allowed <= 3


def test_stock_tools_share_the_rest_throttles(as_caller, monkeypatch):
    monkeypatch.setattr(StockRateThrottle, "THROTTLE_RATES", {"stock": "1/min"})
    monkeypatch.setattr(UploadRateThrottle, "THROTTLE_RATES", {"upload": "1/min"})
    assets.search_stock_photos("beach")
    with pytest.raises(ToolError, match="Too many requests"):
        assets.search_stock_photos("beach")
    with pytest.raises(ToolError) as first:
        assets.import_stock_photo("unsplash", "abc")
    assert "Too many requests" not in str(first.value)  # refused for another reason (no provider key)
    with pytest.raises(ToolError, match="Too many requests"):
        assets.import_stock_photo("unsplash", "abc")


def test_unexpected_errors_do_not_leak_their_text(as_caller, monkeypatch, caplog):
    def boom(*args, **kwargs):
        raise RuntimeError("db password is hunter2")

    monkeypatch.setattr(designs, "_design", boom)
    with pytest.raises(ToolError) as raised:
        designs.get_design("00000000-0000-4000-8000-000000000000")
    assert "hunter2" not in str(raised.value) and "Something went wrong" in str(raised.value)
    assert "hunter2" in caplog.text  # logged for the administrator


def test_tools_need_a_caller(db):
    with pytest.raises(ToolError, match="Not signed in"):
        designs.list_designs()
