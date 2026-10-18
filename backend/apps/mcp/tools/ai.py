"""Tools for AI capabilities (background removal, and future AI tasks)."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from django.conf import settings
from mcp.server.mcpserver.exceptions import ToolError
from pydantic import Field
from rest_framework.exceptions import APIException

from apps.ai import catalog, services as ai_services
from apps.ai.errors import (
    AIProviderError,
    ModelNotAvailable,
    QuotaReached,
    RunsOnDevice,
    UnsupportedAsset,
)
from apps.ai.tasks import TASKS
from apps.apitokens.scopes import ASSETS_WRITE
from apps.assets.models import Asset

from ..context import current
from ..registry import tool


def resolve_and_run_background_removal(user, asset: Asset, model: str | None = None) -> Asset:
    """Run background removal on `asset` for `user`, using the chosen server model or the server default.
    Raises `ToolError` on invalid options, quotas, or provider errors."""
    if not settings.AI_PROVIDERS_ENABLED:
        raise ToolError("AI providers are not enabled on this installation.")

    if model:
        option = catalog.find(user, "background-removal", model)
        if option is None:
            raise ToolError(f"AI model {model!r} does not exist or is not available to you.")
        if option.kind == "device":
            raise ToolError(
                f"Option {model!r} runs in the browser, not on the server. Pick a server model."
            )
        chosen_id = option.id
    else:
        server_options = [o for o in catalog.options(user, "background-removal") if o.kind == "server"]
        if not server_options:
            raise ToolError(
                "No AI server is configured for background removal on this installation. "
                "(The on-device model only runs in the browser.)"
            )
        wanted = settings.AI_TASK_DEFAULTS.get("background-removal")
        if wanted and wanted in [o.id for o in server_options]:
            chosen_id = wanted
        else:
            chosen_id = server_options[0].id

    try:
        return ai_services.run(user, "background-removal", asset, chosen_id)
    except QuotaReached as exc:
        wait_msg = f" (resets in {exc.wait} s)" if getattr(exc, "wait", None) else ""
        raise ToolError(f"You have used all of today's calls of this AI model.{wait_msg}") from exc
    except AIProviderError as exc:
        raise ToolError(f"Background removal failed: {exc}") from exc
    except ModelNotAvailable as exc:
        raise ToolError("That AI model does not exist or is not available to you.") from exc
    except RunsOnDevice as exc:
        raise ToolError("That AI model runs in the browser, not on the server.") from exc
    except UnsupportedAsset as exc:
        raise ToolError(
            "Only raster images (PNG, JPEG, WebP, GIF, AVIF) can have their background removed."
        ) from exc
    except APIException as exc:
        raise ToolError(str(getattr(exc, "detail", exc))) from exc


@tool(scope=ASSETS_WRITE, title="List AI models", read_only=True)
def list_ai_models(
    task: Annotated[
        Literal["background-removal"] | str,
        Field(description="The AI task to list options for (e.g. 'background-removal')."),
    ] = "background-removal",
) -> dict[str, Any]:
    """List AI models and providers available to you for a task (such as background removal). Models marked
    'device' run in the browser and cannot be used by MCP tools; pick a 'server' model when removing
    backgrounds via MCP."""
    caller = current()
    if task not in TASKS:
        raise ToolError(f"Unknown task {task!r}. Available tasks: {', '.join(TASKS.keys())}")
    options = catalog.options(caller.user, task)
    default = catalog.default_option(task, options)
    server_options = [o for o in options if o.kind == "server"]
    server_default = None
    if server_options:
        wanted = settings.AI_TASK_DEFAULTS.get(task)
        if wanted and wanted in [o.id for o in server_options]:
            server_default = wanted
        else:
            server_default = server_options[0].id
    return {
        "task": task,
        "default": default,
        "server_default": server_default,
        "models": [o.public() for o in options],
    }


@tool(scope=ASSETS_WRITE, title="Remove background from an upload")
def remove_asset_background(
    asset_id: Annotated[
        str,
        Field(description="The ID of an uploaded picture (from list_assets or import_stock_photo)."),
    ],
    model: Annotated[
        str | None,
        Field(description="The AI model option to use (from list_ai_models). If omitted, uses the default server model."),
    ] = None,
) -> dict[str, Any]:
    """Remove the background of an image in your uploads and save the cut-out as a new asset.
    Returns the new asset."""
    caller = current()
    import uuid

    from apps.ai.throttling import AIRateThrottle
    from apps.assets.models import Asset
    from apps.mcp.tools.assets import _asset

    try:
        uid = uuid.UUID(str(asset_id))
    except ValueError:
        raise ToolError(f"Invalid asset id {asset_id!r}.")

    asset = Asset.objects.filter(pk=uid, owner=caller.user).first()
    if asset is None or asset.kind == Asset.Kind.AUDIO:
        raise ToolError(f"There is no picture {asset_id!r} in your uploads (see list_assets).")

    throttle(AIRateThrottle())
    cutout = resolve_and_run_background_removal(caller.user, asset, model)
    return _asset(cutout)
