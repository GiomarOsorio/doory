from __future__ import annotations

from typing import Any
from urllib.parse import urlsplit

from rest_framework import serializers

from . import transport
from .models import MAX_TIMEOUT_SECONDS, Provider, ProviderModel, Style
from .styles import ConfigError, get_style
from .styles.base import check_header_name
from .tasks import TASKS

MAX_SECRET_LENGTH = 4096
MAX_MODELS_PER_PROVIDER = 50


class OptionSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="`device`, or `<provider id>:<model name>`.")
    label = serializers.CharField()
    task = serializers.CharField()
    kind = serializers.ChoiceField(choices=["device", "server"])
    provider_name = serializers.CharField()
    owner = serializers.ChoiceField(choices=["device", "operator", "user"])
    sends_offsite = serializers.BooleanField(help_text="The image leaves this installation.")


class TaskOptionsSerializer(serializers.Serializer):
    default = serializers.CharField(allow_null=True)
    models = OptionSerializer(many=True)


class TaskRequestSerializer(serializers.Serializer):
    asset_id = serializers.UUIDField()
    model = serializers.CharField(max_length=300, help_text="An option id from GET /api/v1/ai/models/.")
    options = serializers.DictField(required=False, default=dict, help_text="Task options (none for now).")


class ProviderModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProviderModel
        fields = ["id", "task", "remote_name", "label", "enabled", "sort_order"]
        read_only_fields = ["id"]

    def validate_task(self, value: str) -> str:
        if value not in TASKS:
            raise serializers.ValidationError("Unknown task.")
        return value


class ProviderModelsSerializer(serializers.Serializer):
    models = ProviderModelSerializer(many=True)

    def validate_models(self, value: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if len(value) > MAX_MODELS_PER_PROVIDER:
            raise serializers.ValidationError(f"At most {MAX_MODELS_PER_PROVIDER} models.")
        keys = [(item["task"], item.get("remote_name", "")) for item in value]
        if len(keys) != len(set(keys)):
            raise serializers.ValidationError("Each model may be listed once per task.")
        return value


def validate_base_url(value: str, *, operator: bool) -> str:
    """The base URL's form, and for users that it does not name a private address (host names are checked
    after DNS on every call)."""
    value = value.strip()
    policy = transport.operator_policy() if operator else transport.user_policy()
    try:
        transport.check_url(value, policy, resolve_hosts=False)
    except transport.TransportError as exc:
        raise serializers.ValidationError(exc.message) from None
    if "?" in value or "#" in value:
        raise serializers.ValidationError("The server address may not have a query or fragment.")
    return value.rstrip("/")


class ProviderSerializer(serializers.ModelSerializer):
    """A user's own provider. The secret is write-only: it is never returned, only whether one is set."""

    secret = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        max_length=MAX_SECRET_LENGTH,
        trim_whitespace=True,
        help_text="The value of the auth header (e.g. `Bearer …`). Omit to keep the stored one; "
        "empty to remove it.",
    )
    has_secret = serializers.BooleanField(read_only=True)
    models = ProviderModelSerializer(many=True, read_only=True)
    style = serializers.ChoiceField(choices=Style.choices, default=Style.DOORY)
    tasks = serializers.ListField(
        child=serializers.ChoiceField(choices=[]), allow_empty=False, max_length=len(TASKS) or 1
    )

    class Meta:
        model = Provider
        fields = [
            "id",
            "name",
            "base_url",
            "style",
            "style_config",
            "auth_header",
            "secret",
            "has_secret",
            "tasks",
            "timeout_seconds",
            "max_image_bytes",
            "sends_offsite",
            "enabled",
            "sort_order",
            "models",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "has_secret", "models", "created_at", "updated_at"]
        extra_kwargs = {"timeout_seconds": {"min_value": 1, "max_value": MAX_TIMEOUT_SECONDS}}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["tasks"].child.choices = list(TASKS)

    def validate_base_url(self, value: str) -> str:
        return validate_base_url(value, operator=False)

    def validate_auth_header(self, value: str) -> str:
        if not value:
            return value
        try:
            return check_header_name(value.strip())
        except ConfigError as exc:
            raise serializers.ValidationError(str(exc)) from None

    def validate_secret(self, value: str) -> str:
        if "\r" in value or "\n" in value:
            raise serializers.ValidationError("The secret may not contain line breaks.")
        return value

    def validate_tasks(self, value: list[str]) -> list[str]:
        return list(dict.fromkeys(value))

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        style = attrs.get("style", getattr(self.instance, "style", Style.DOORY))
        style_config = attrs.get("style_config", getattr(self.instance, "style_config", {}))
        try:
            get_style(style).config(style_config)
        except ConfigError as exc:
            raise serializers.ValidationError({"style_config": [str(exc)]}) from None
        if self.instance and self.instance.has_secret and not attrs.get("secret"):
            new_url = attrs.get("base_url")
            if new_url:
                old_host = urlsplit(self.instance.base_url).netloc.lower()
                new_host = urlsplit(new_url).netloc.lower()
                if old_host != new_host:
                    raise serializers.ValidationError(
                        {"secret": "Enter the key again when changing the server address."}
                    )
        return attrs

    def save(self, **kwargs) -> Provider:
        secret = self.validated_data.pop("secret", None)
        provider = self.instance or Provider(**kwargs)
        for field, value in self.validated_data.items():
            setattr(provider, field, value)
        if secret is not None:
            provider.set_secret(secret)
        provider.save()
        self.instance = provider
        return provider


class ProviderTestRequestSerializer(serializers.Serializer):
    task = serializers.CharField(required=False, help_text="Default: the provider's first task.")
    model = serializers.CharField(
        required=False, allow_blank=True, max_length=200, help_text="Default: the first enabled model."
    )


class ProviderTestResultSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    duration_ms = serializers.IntegerField()
    task = serializers.CharField()
    model = serializers.CharField()
    preview = serializers.CharField(
        help_text="data: URL of the result (PNG, at most 256 px), when it worked."
    )
    error = serializers.DictField(allow_null=True, child=serializers.CharField())
