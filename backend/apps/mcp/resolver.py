"""Database lookups the document toolkit needs while it applies operations (`doc.ops.Resolver`)."""

from __future__ import annotations

import uuid

from django.db.models import Q

from apps.assets.models import Asset
from apps.designs.doc.builders import primary_family
from apps.designs.doc.ops import ImageSource
from apps.elements.models import Element
from apps.fonts.models import FontFamily


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

    def image(self, *, asset_id: str | None, element_id: str | None) -> ImageSource:
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
