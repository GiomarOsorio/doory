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
        self._urls: dict[str, ImageSource] = {}

    def image(
        self, *, asset_id: str | None = None, element_id: str | None = None, url: str | None = None
    ) -> ImageSource:
        if url is not None:
            if url in self._urls:
                return self._urls[url]
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
            source = ImageSource(
                asset.file.url,
                asset.width or 1,
                asset.height or 1,
                asset_id=str(asset.pk),
                name=asset.name or None,
            )
            self._urls[url] = source
            return source
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

    def remove_background(self, *, obj: dict, model: str | None = None) -> ImageSource:
        caller = context.current()
        if caller is None or not caller.has(ASSETS_WRITE):
            raise LookupError(
                f"Removing backgrounds needs the `{ASSETS_WRITE}` scope. "
                "Create a token with it in Doory: Account settings > API tokens."
            )
        from apps.ai.throttling import AIRateThrottle

        from .registry import throttle
        from .tools.ai import resolve_and_run_background_removal

        throttle(AIRateThrottle())
        asset = self._resolve_source_asset(obj)
        try:
            cutout = resolve_and_run_background_removal(self.user, asset, model)
        except ToolError as exc:
            raise LookupError(str(exc)) from exc
        return ImageSource(
            cutout.file.url,
            cutout.width or 1,
            cutout.height or 1,
            asset_id=str(cutout.pk),
            name=cutout.name or None,
        )

    def _resolve_source_asset(self, obj: dict) -> Asset:
        asset_id = obj.get("assetId") or obj.get("asset_id")
        if asset_id:
            uid = _uuid(asset_id)
            if uid:
                user_asset = Asset.objects.filter(pk=uid, owner=self.user).first()
                if user_asset and user_asset.kind != Asset.Kind.AUDIO:
                    return user_asset
                other_asset = Asset.objects.filter(pk=uid).first()
                if other_asset and other_asset.kind != Asset.Kind.AUDIO:
                    from apps.assets.services import create_asset
                    from apps.assets.uploads import clean_name

                    other_asset.file.seek(0)
                    return create_asset(
                        self.user,
                        other_asset.file.read(),
                        name=clean_name(other_asset.name or "Image"),
                        meta={"copied_from": str(other_asset.pk)},
                    )

        src = obj.get("src")
        if src:
            if src.startswith("http://") or src.startswith("https://"):
                try:
                    return import_url_asset(self.user, src, name=obj.get("name"))
                except ToolError as exc:
                    raise LookupError(str(exc)) from exc

            from django.conf import settings
            from django.core.files.storage import default_storage

            from apps.assets.services import create_asset
            from apps.assets.uploads import clean_name

            media_prefix = getattr(settings, "MEDIA_URL", "/media/")
            file_path = src[len(media_prefix) :] if src.startswith(media_prefix) else src.lstrip("/")
            match = Asset.objects.filter(file=file_path).first()
            if match:
                if match.owner == self.user:
                    return match
                match.file.seek(0)
                return create_asset(
                    self.user,
                    match.file.read(),
                    name=clean_name(match.name or "Image"),
                    meta={"copied_from": str(match.pk)},
                )
            if default_storage.exists(file_path):
                with default_storage.open(file_path) as f:
                    return create_asset(
                        self.user, f.read(), name=clean_name(obj.get("name") or "Image")
                    )

        raise LookupError("This picture has no source image to remove the background from.")

    def font_category(self, family: str) -> str | None:
        name = primary_family(family)
        return (
            FontFamily.objects.filter(Q(owner__isnull=True) | Q(owner=self.user), family__iexact=name)
            .values_list("category", flat=True)
            .first()
        )
