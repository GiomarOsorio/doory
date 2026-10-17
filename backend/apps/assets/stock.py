"""`/stock/photos/` — search and import photos from the configured providers (Unsplash, Pexels)."""

from __future__ import annotations

import hashlib

from django.conf import settings
from django.core.cache import cache
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import providers
from .exceptions import FileTooLarge, StockNotConfigured, StockUnavailable
from .models import Asset
from .serializers import AssetSerializer
from .services import create_asset
from .throttling import StockRateThrottle, UploadRateThrottle
from .uploads import clean_name

SEARCH_CACHE_SECONDS = 10 * 60
DEFAULT_PER_PAGE = 24
MAX_PAGE = 100
PROVIDER_CHOICES = tuple(providers.PROVIDERS)


class StockSearchSerializer(serializers.Serializer):
    q = serializers.CharField(max_length=100, required=False, allow_blank=True)
    page = serializers.IntegerField(min_value=1, max_value=MAX_PAGE, required=False)
    per_page = serializers.IntegerField(min_value=1, max_value=providers.MAX_PER_PAGE, required=False)
    provider = serializers.ChoiceField(choices=PROVIDER_CHOICES, required=False)


class StockImportSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=PROVIDER_CHOICES)
    id = serializers.CharField(max_length=64)


def _pick_provider(requested: str | None) -> providers.StockProvider | None:
    if requested:
        provider = providers.PROVIDERS[requested]
        return provider if provider.configured else None
    configured = providers.configured_providers()
    return configured[0] if configured else None


def _cache_key(provider: str, query: str, page: int, per_page: int) -> str:
    digest = hashlib.sha256(query.lower().encode()).hexdigest()[:32]
    return f"stock:v1:{provider}:{digest}:{page}:{per_page}"


def search(
    requested_provider: str | None, query: str, page: int = 1, per_page: int = DEFAULT_PER_PAGE
) -> dict:
    """One page of stock photos (cached ten minutes). Raises `StockUnavailable` when the provider fails."""
    provider = _pick_provider(requested_provider)
    if provider is None:
        return {
            "configured": False,
            "provider": requested_provider or "",
            "total": 0,
            "next_page": None,
            "results": [],
        }
    query = query.strip()
    key = _cache_key(provider.name, query, page, per_page)
    payload = cache.get(key)
    if payload is None:
        try:
            found = provider.search(query, page, per_page)
        except providers.ProviderError as exc:
            raise StockUnavailable() from exc
        payload = {
            "configured": True,
            "provider": provider.name,
            "total": found.total,
            "next_page": found.next_page,
            "results": [photo.as_dict() for photo in found.photos],
        }
        cache.set(key, payload, SEARCH_CACHE_SECONDS)
    return payload


def import_photo(owner, provider_name: str, photo_id: str) -> tuple[Asset, bool]:
    """The owner's asset for a stock photo, downloaded on first use; returns (asset, created)."""
    provider = providers.PROVIDERS[provider_name]
    if not provider.configured:
        raise StockNotConfigured()
    if not provider.valid_id(photo_id):
        raise serializers.ValidationError({"id": ["Not a valid photo id for this provider."]})

    existing = Asset.objects.filter(
        owner=owner, meta__provider=provider.name, meta__photo_id=photo_id
    ).first()
    if existing:
        return existing, False

    try:
        resolved = provider.resolve(photo_id)
        data = providers.download_image(
            resolved.download_url, hosts=provider.image_hosts, max_bytes=settings.MAX_UPLOAD_BYTES
        )
    except providers.PhotoTooLarge as exc:
        raise FileTooLarge() from exc
    except providers.ProviderError as exc:
        raise StockUnavailable() from exc

    photo = resolved.photo
    asset = create_asset(
        owner,
        data,
        name=clean_name(f"Photo by {photo.author}" if photo.author else f"{provider.name.title()} photo"),
        meta={
            "provider": provider.name,
            "photo_id": photo_id,
            "attribution": {
                "provider": provider.name,
                "author": photo.author,
                "author_url": photo.author_url,
                "source_url": photo.source_url,
            },
        },
    )
    provider.track_download(resolved)
    return asset, True


class StockSearchView(APIView):
    def get_throttles(self):
        return [*super().get_throttles(), StockRateThrottle()]

    @extend_schema(parameters=[StockSearchSerializer], responses={200: dict}, tags=["stock"])
    def get(self, request):
        params = StockSearchSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        data = params.validated_data
        payload = search(
            data.get("provider"),
            data.get("q", ""),
            data.get("page", 1),
            data.get("per_page", DEFAULT_PER_PAGE),
        )
        return Response(payload)


class StockImportView(APIView):
    def get_throttles(self):
        return [*super().get_throttles(), UploadRateThrottle()]

    @extend_schema(
        request=StockImportSerializer, responses={200: AssetSerializer, 201: AssetSerializer}, tags=["stock"]
    )
    def post(self, request):
        body = StockImportSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        asset, created = import_photo(
            request.user, body.validated_data["provider"], body.validated_data["id"]
        )
        return Response(
            AssetSerializer(asset).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
