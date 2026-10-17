"""Pictures: the caller's uploads and stock photos (Unsplash / Pexels, when the server has a key)."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import Field

from apps.apitokens.scopes import ASSETS_WRITE, DESIGNS_READ
from apps.assets import stock
from apps.assets.models import Asset
from apps.assets.throttling import StockRateThrottle, UploadRateThrottle

from ..context import current
from ..registry import throttle, tool


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
