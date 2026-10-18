from rest_framework.throttling import SimpleRateThrottle


class BulkFillRateThrottle(SimpleRateThrottle):
    """Per-user limit for creating designs via bulk-fill (`bulk_fill` rate)."""

    scope = "bulk_fill"

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {"scope": self.scope, "ident": request.user.pk}
