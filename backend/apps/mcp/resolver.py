"""Database lookups the document toolkit needs while it applies operations (`doc.ops.Resolver`)."""

from __future__ import annotations

import uuid

from django.db.models import Q
from mcp.server.mcpserver.exceptions import ToolError
from rest_framework.exceptions import APIException

from apps.apitokens.scopes import ASSETS_WRITE
from apps.assets.models import Asset
from apps.designs.doc.builders import primary_family
from apps.designs.doc.ops import ImageSource
from apps.elements.models import Element
from apps.fonts.models import FontFamily

from . import context
from .tools.assets import import_url_asset


def _uuid(value: str | None) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        return None


class DjangoResolver:
    """Pictures come from the caller's own uploads or the published element catalogue; fonts from the
    catalogue plus the caller's uploaded fonts."""

    def __init__(self, user) -> None:
        self.user = user

    def image(
        self, *, asset_id: str | None = None, element_id: str | None = None, url: str | None = None
    ) -> ImageSource:
        if url is not None:
            caller = context.current()
            if caller is None or not caller.has(ASSETS_WRITE):
                raise LookupError(
                    f"Uploading from a URL needs the `{ASSETS_WRITE}` scope. "
                    "Create a token with it in Doory: Account settings > API tokens."
                )
            try:
                asset = import_url_asset(self.user, url)
            except (ToolError, APIException) as exc:
                raise LookupError(str(getattr(exc, "detail", exc))) from exc
            return ImageSource(
                asset.file.url,
                asset.width or 1,
                asset.height or 1,
                asset_id=str(asset.pk),
                name=asset.name or None,
            )
        if asset_id is not None:
            asset = (
                Asset.objects.filter(pk=_uuid(asset_id), owner=self.user).first() if _uuid(asset_id) else None
            )
            if asset is None or asset.kind == Asset.Kind.AUDIO:
                raise LookupError(f"There is no picture {asset_id!r} in your uploads (see list_assets).")
            return ImageSource(
                asset.file.url,
                asset.width or 1,
                asset.height or 1,
                asset_id=str(asset.pk),
                name=asset.name or None,
            )
        element = (
            Element.objects.filter(pk=_uuid(element_id), is_published=True, pack__is_published=True).first()
            if _uuid(element_id)
            else None
        )
        if element is None:
            raise LookupError(f"There is no element {element_id!r} (see search_elements).")
        return ImageSource(element.svg.url, element.width or 100, element.height or 100, name=element.name)

    def font_category(self, family: str) -> str | None:
        name = primary_family(family)
        return (
            FontFamily.objects.filter(Q(owner__isnull=True) | Q(owner=self.user), family__iexact=name)
            .values_list("category", flat=True)
            .first()
        )
