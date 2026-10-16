"""How tools are declared: `@tool(scope=…)` adds scope checks, rate limits, database hygiene and error
translation around a plain synchronous function, and records it for `server.build_server`.

Tools are synchronous Django code; the SDK runs them on worker threads. A tool calls the same services the
REST API uses and never trusts its arguments beyond their declared types.
"""

from __future__ import annotations

import functools
import logging
import math
import time
from collections.abc import Callable
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import close_old_connections
from django.http import Http404
from mcp.server.mcpserver.exceptions import ToolError
from mcp_types import ToolAnnotations
from pydantic import ValidationError as PydanticValidationError
from rest_framework.exceptions import APIException
from rest_framework.exceptions import ValidationError as DrfValidationError

from apps.designs.doc.ops import EditError
from apps.designs.exceptions import RevisionConflict

from . import context

log = logging.getLogger("doory.mcp")


@dataclass(frozen=True)
class ToolSpec:
    fn: Callable[..., Any]
    name: str
    title: str
    scope: str
    annotations: ToolAnnotations


TOOLS: list[ToolSpec] = []


def _flatten(detail: Any, prefix: str = "") -> list[str]:
    if isinstance(detail, dict):
        return [line for key, value in detail.items() for line in _flatten(value, f"{prefix}{key}: ")]
    if isinstance(detail, list):
        return [line for item in detail for line in _flatten(item, prefix)]
    return [f"{prefix}{detail}"]


def explain(exc: Exception) -> str | None:
    """A message an agent can act on, for the errors the services raise; None for anything unexpected."""
    if isinstance(exc, Http404):
        return "Not found (or not yours)."
    if isinstance(exc, RevisionConflict):
        return (
            f"The design changed since the revision you sent; it is now at revision {exc.revision}. "
            "Read it again with get_design and retry."
        )
    if isinstance(exc, EditError):
        return f"{exc} Nothing was changed."
    if isinstance(exc, PydanticValidationError):
        problems = [f"{'.'.join(str(part) for part in e['loc'])}: {e['msg']}" for e in exc.errors()[:10]]
        return "Invalid input. " + "; ".join(problems)
    if isinstance(exc, DrfValidationError):
        return "Invalid input. " + "; ".join(_flatten(exc.detail))
    if isinstance(exc, APIException):
        return str(exc.detail)
    if isinstance(exc, DjangoValidationError):
        return "; ".join(exc.messages)
    return None


UNEXPECTED = (
    "Something went wrong on the server. Try again; if it keeps failing, ask the Doory administrator."
)


def throttle(rate_throttle: Any) -> None:
    """Apply one of the REST API's per-user throttles (e.g. `StockRateThrottle()`) to the caller, sharing
    its budget, so a tool cannot be used to get around the limits of the endpoint it stands in for."""
    caller = context.current()
    if not rate_throttle.allow_request(SimpleNamespace(user=caller.user), None):
        wait = math.ceil(rate_throttle.wait() or 1)
        raise ToolError(f"Too many requests of this kind. Wait {wait} s and try again.")


RATE_CLAIM_ATTEMPTS = 8


def _check_rate(caller: context.Caller) -> None:
    limit = settings.MCP_CALLS_PER_MINUTE
    if not limit:
        return
    window = int(time.time() // 60)
    # Per user, not per token: holding several tokens must not multiply the budget.
    key = f"mcp:rate:{caller.user.pk}:{window}"
    # `incr` is a get-then-set on the database cache, so two parallel calls can read the same count. Each call
    # also claims its number with `add` (atomic everywhere: an insert on the database cache); a call that
    # loses the race counts again, so no more than `limit` calls get through.
    for _ in range(RATE_CLAIM_ATTEMPTS):
        cache.add(key, 0, timeout=90)
        try:
            calls = cache.incr(key)
        except ValueError:  # evicted between add and incr
            continue
        if calls > limit:
            raise ToolError(f"Too many calls: at most {limit} a minute. Wait {60 - int(time.time() % 60)} s.")
        if cache.add(f"{key}:{calls}", 1, timeout=90):
            return
    raise ToolError("Too many calls at once. Try again in a moment.")


def tool(
    *, scope: str, title: str, read_only: bool = False, destructive: bool = False, idempotent: bool = False
):
    """Register a tool that needs `scope`. The function's docstring is the description agents read."""

    def decorate(fn: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            caller = context.current()
            if caller is None:
                raise ToolError("Not signed in.")
            if not caller.has(scope):
                raise ToolError(
                    f"This token lacks the `{scope}` scope. Create a token with it in Doory: "
                    "Account settings > API tokens."
                )
            _check_rate(caller)
            close_old_connections()
            started = time.monotonic()
            outcome = "ok"
            try:
                return fn(*args, **kwargs)
            except ToolError:
                outcome = "refused"
                raise
            except Exception as exc:
                message = explain(exc)
                if message is None:
                    outcome = "error"
                    log.exception("tool=%s failed", fn.__name__)
                    raise ToolError(UNEXPECTED) from exc
                outcome = "refused"
                raise ToolError(message) from exc
            finally:
                close_old_connections()
                log.info(
                    "tool=%s user=%s token=%s outcome=%s ms=%d",
                    fn.__name__,
                    caller.user.pk,
                    caller.token.prefix,
                    outcome,
                    (time.monotonic() - started) * 1000,
                )

        TOOLS.append(
            ToolSpec(
                wrapper,
                fn.__name__,
                title,
                scope,
                ToolAnnotations(
                    title=title,
                    read_only_hint=read_only,
                    destructive_hint=destructive,
                    idempotent_hint=idempotent or read_only,
                    open_world_hint=False,
                ),
            )
        )
        return wrapper

    return decorate
