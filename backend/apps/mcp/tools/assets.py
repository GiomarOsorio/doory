"""Pictures: the caller's uploads and stock photos (Unsplash / Pexels, when the server has a key)."""

from __future__ import annotations

from typing import Annotated, Any, Literal
from urllib.parse import unquote, urlsplit, urlunsplit

from django.conf import settings
from mcp.server.mcpserver.exceptions import ToolError
from pydantic import Field

from apps.apitokens.scopes import ASSETS_WRITE, DESIGNS_READ
from apps.assets import remote, stock
from apps.assets.audio import looks_like_audio
from apps.assets.models import Asset
from apps.assets.services import create_asset
from apps.assets.throttling import StockRateThrottle, UploadRateThrottle
from apps.assets.uploads import clean_name

from ..context import current
from ..registry import throttle, tool


def _bare(url: str) -> str:
    """`url` without its query and fragment: they can hold a signature or token that must not be kept."""
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def _asset(asset: Asset) -> dict[str, Any]:
    out = {
        "asset_id": str(asset.pk),
        "name": asset.name,
        "kind": asset.kind,
        "width": asset.width,
        "height": asset.height,
        "url": asset.file.url,
    }
    attribution = (asset.meta or {}).get("attribution")
    if attribution:
        out["attribution"] = attribution
    return out


@tool(scope=DESIGNS_READ, title="List uploads", read_only=True)
def list_assets(
    query: Annotated[str | None, Field(description="Words in the name.", max_length=100)] = None,
    limit: Annotated[int, Field(ge=1, le=100)] = 30,
) -> dict[str, Any]:
    """Your uploaded pictures, newest first. Place one with edit_design:
    {"op": "add_image", "asset_id": …}."""
    assets = Asset.objects.filter(owner=current().user).exclude(kind=Asset.Kind.AUDIO)
    if query and query.strip():
        assets = assets.filter(name__icontains=query.strip())
    return {"assets": [_asset(a) for a in assets.order_by("-created_at")[:limit]]}


@tool(scope=DESIGNS_READ, title="Search stock photos", read_only=True)
def search_stock_photos(
    query: Annotated[str, Field(min_length=1, max_length=100)],
    provider: Literal["unsplash", "pexels"] | None = None,
    page: Annotated[int, Field(ge=1, le=stock.MAX_PAGE)] = 1,
    per_page: Annotated[int, Field(ge=1, le=30)] = 12,
) -> dict[str, Any]:
    """Search free stock photos. Use import_stock_photo to add one to your uploads before placing it."""
    throttle(StockRateThrottle())
    return stock.search(provider, query, page, per_page)


@tool(scope=ASSETS_WRITE, title="Import a stock photo", idempotent=True)
def import_stock_photo(
    provider: Literal["unsplash", "pexels"],
    photo_id: Annotated[
        str, Field(min_length=1, max_length=64, description="`id` from search_stock_photos.")
    ],
) -> dict[str, Any]:
    """Copy a stock photo into your uploads (once; importing it again returns the same asset)."""
    throttle(UploadRateThrottle())
    asset, _ = stock.import_photo(current().user, provider, photo_id)
    return _asset(asset)


@tool(scope=ASSETS_WRITE, title="Upload an image from a URL")
def upload_image_from_url(
    url: Annotated[str, Field(min_length=8, max_length=2048, description="A public https link to an image.")],
    name: Annotated[str | None, Field(max_length=120)] = None,
) -> dict[str, Any]:
    """Copy an image from a public https URL into your uploads; it is checked like any upload. Only use
    images the user has the right to use."""
    if not settings.MCP_URL_UPLOADS:
        raise ToolError("Uploading from a URL is switched off on this server.")
    throttle(UploadRateThrottle())
    try:
        data = remote.fetch_image(url, max_bytes=settings.MAX_UPLOAD_BYTES)
    except remote.RemoteImageError as exc:
        raise ToolError(f"{exc} Nothing was uploaded.") from exc
    if looks_like_audio(data):
        raise ToolError("That URL is not an image. Nothing was uploaded.")
    fallback = unquote(urlsplit(url).path.rsplit("/", 1)[-1]) or "Image"  # the path only, never the query
    asset = create_asset(
        current().user, data, name=clean_name(name or fallback), meta={"source_url": _bare(url)}
    )
    return _asset(asset)
