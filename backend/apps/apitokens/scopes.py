"""What a personal access token may do. Every tool that accepts tokens names the scope it needs."""

from __future__ import annotations

DESIGNS_READ = "designs:read"
DESIGNS_WRITE = "designs:write"
ASSETS_WRITE = "assets:write"
COMMENTS_WRITE = "comments:write"

SCOPES: dict[str, str] = {
    DESIGNS_READ: "See your designs, their versions and comments, and browse templates, elements and fonts.",
    DESIGNS_WRITE: "Create, edit, rename, duplicate and restore your designs.",
    ASSETS_WRITE: "Add images to your uploads (stock photo import).",
    COMMENTS_WRITE: "Add comments to your designs.",
}
DEFAULT_SCOPES = (DESIGNS_READ, DESIGNS_WRITE)
