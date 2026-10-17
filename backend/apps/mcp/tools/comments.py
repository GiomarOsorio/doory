"""Comments on a design (the same threads the editor shows)."""

from __future__ import annotations

from typing import Annotated, Any

from mcp.server.mcpserver.exceptions import ToolError
from pydantic import Field

from apps.apitokens.scopes import COMMENTS_WRITE, DESIGNS_READ
from apps.sharing.models import Comment
from apps.sharing.serializers import CommentCreateSerializer, public_name
from apps.sharing.services import MAX_COMMENTS_PER_DESIGN

from ..context import current
from ..registry import tool
from .designs import DesignId, _design


def _comment(comment: Comment) -> dict[str, Any]:
    return {
        "id": str(comment.pk),
        "author": public_name(comment.author),
        "body": comment.body,
        "page_id": comment.page_id or None,
        "x": comment.x,
        "y": comment.y,
        "reply_to": str(comment.parent_id) if comment.parent_id else None,
        "resolved": comment.resolved,
        "created_at": comment.created_at.isoformat(),
    }


@tool(scope=DESIGNS_READ, title="List comments", read_only=True)
def list_comments(
    design_id: DesignId,
    include_resolved: bool = False,
    limit: Annotated[int, Field(ge=1, le=200)] = 100,
) -> dict[str, Any]:
    """Comments on a design, oldest first. A comment with x, y is pinned to that point of its page."""
    design = _design(design_id, document=False)
    comments = Comment.objects.filter(design=design).select_related("author")
    if not include_resolved:
        comments = comments.filter(resolved=False)
    return {"comments": [_comment(c) for c in comments.order_by("created_at", "id")[:limit]]}


@tool(scope=COMMENTS_WRITE, title="Add a comment")
def add_comment(
    design_id: DesignId,
    body: Annotated[str, Field(min_length=1, max_length=2000)],
    page_id: Annotated[str | None, Field(description="Pin to this page (with x and y).")] = None,
    x: float | None = None,
    y: float | None = None,
    reply_to: Annotated[str | None, Field(description="Answer this comment instead.")] = None,
) -> dict[str, Any]:
    """Comment on a design, optionally pinned to a point (x, y) of a page, or reply to a comment."""
    design = _design(design_id, document=False)
    if Comment.objects.filter(design=design).count() >= MAX_COMMENTS_PER_DESIGN:
        raise ToolError("This design has reached its comment limit.")
    data = {"body": body, "page_id": page_id, "x": x, "y": y, "parent": reply_to}
    serializer = CommentCreateSerializer(
        data={key: value for key, value in data.items() if value is not None},
        context={"design_id": design.pk},
    )
    serializer.is_valid(raise_exception=True)
    comment = serializer.save(design_id=design.pk, author=current().user)
    return _comment(comment)
