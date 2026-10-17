"""Tools to organise designs: folders, stars and the trash (trashed designs can be restored)."""

from __future__ import annotations

from typing import Annotated, Any

from django.shortcuts import get_object_or_404
from pydantic import Field

from apps.apitokens.scopes import DESIGNS_READ, DESIGNS_TRASH, DESIGNS_WRITE
from apps.designs import services
from apps.designs.models import Design, Folder

from ..context import current
from ..registry import tool
from .designs import DesignId, _design, _info, _uuid


def _folder(folder_id: str) -> Folder:
    return get_object_or_404(Folder, owner=current().user, pk=_uuid(folder_id))


@tool(scope=DESIGNS_READ, title="List folders", read_only=True)
def list_folders() -> dict[str, Any]:
    """Your folders, by name. A folder with a parent_id is inside that folder."""
    folders = Folder.objects.filter(owner=current().user).order_by("name", "id")
    return {
        "folders": [
            {"id": str(f.pk), "name": f.name, "parent_id": str(f.parent_id) if f.parent_id else None}
            for f in folders
        ]
    }


@tool(scope=DESIGNS_WRITE, title="Move a design to a folder", idempotent=True)
def move_design(
    design_id: DesignId,
    folder_id: Annotated[str | None, Field(description="A folder from list_folders; none = top level.")],
) -> dict[str, Any]:
    """Put a design in a folder, or back at the top level."""
    design = _design(design_id, document=False)
    folder = _folder(folder_id) if folder_id else None
    services.bulk_apply(current().user, [design.pk], "move", folder)
    return _info(Design.objects.defer("document").get(pk=design.pk))


@tool(scope=DESIGNS_WRITE, title="Star a design", idempotent=True)
def star_design(design_id: DesignId, starred: bool = True) -> dict[str, Any]:
    """Star a design (or unstar it with starred = false); list_designs can filter on stars."""
    design = _design(design_id, document=False)
    services.bulk_apply(current().user, [design.pk], "star" if starred else "unstar", None)
    return _info(Design.objects.defer("document").get(pk=design.pk))


@tool(scope=DESIGNS_TRASH, title="Move a design to the trash", destructive=True, idempotent=True)
def trash_design(design_id: DesignId) -> dict[str, Any]:
    """Move a design to the trash. It can be brought back with restore_design until the trash is emptied."""
    design = _design(design_id, document=False)
    services.trash_design(design.pk, current().user)
    return {"id": str(design.pk), "trashed": True}


@tool(scope=DESIGNS_TRASH, title="Restore a design from the trash", idempotent=True)
def restore_design(
    design_id: Annotated[str, Field(description="A design id from list_designs(in_trash=true).")],
) -> dict[str, Any]:
    """Bring a trashed design back."""
    design = services.restore_trashed(_design(design_id, document=False, trashed=True))
    return _info(design)
