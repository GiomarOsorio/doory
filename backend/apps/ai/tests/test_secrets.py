"""Provider secrets are stored encrypted and can only be read with the right key."""

from __future__ import annotations

import pytest
from cryptography.fernet import Fernet

from apps.ai import secrets
from apps.ai.models import Provider

from .conftest import make_provider

pytestmark = pytest.mark.django_db


def test_a_secret_is_stored_encrypted_and_read_back(fake):
    provider = make_provider(fake.url, secret="Bearer top-secret-value")
    stored = bytes(Provider.objects.get(pk=provider.pk).secret_encrypted)
    assert b"top-secret-value" not in stored and stored
    assert Provider.objects.get(pk=provider.pk).secret() == "Bearer top-secret-value"


def test_an_empty_secret_removes_it(fake):
    provider = make_provider(fake.url, secret="abc")
    provider.set_secret("")
    assert not provider.has_secret and provider.secret() == ""


def test_without_ai_secrets_key_the_key_is_derived_from_secret_key(settings):
    settings.AI_SECRETS_KEY = ""
    token = secrets.encrypt("value")
    assert Fernet(secrets.derive_key(settings.SECRET_KEY)).decrypt(token) == b"value"
    assert secrets.uses_derived_key()


def test_a_configured_key_is_used_and_old_keys_still_read(settings):
    old, new = Fernet.generate_key().decode(), Fernet.generate_key().decode()
    settings.AI_SECRETS_KEY = old
    token = secrets.encrypt("value")
    settings.AI_SECRETS_KEY = new
    with pytest.raises(secrets.SecretUnreadable):
        secrets.decrypt(token)
    settings.AI_SECRETS_KEY_FALLBACKS = [old]
    assert secrets.decrypt(token) == "value"
    assert Fernet(new.encode()).decrypt(secrets.encrypt("x")) == b"x"  # new secrets use the new key


def test_rotating_secret_key_keeps_secrets_readable_through_the_fallbacks(settings):
    settings.AI_SECRETS_KEY = ""
    token = secrets.encrypt("value")
    previous = settings.SECRET_KEY
    settings.SECRET_KEY = "a-brand-new-secret-key-for-the-test"
    with pytest.raises(secrets.SecretUnreadable):
        secrets.decrypt(token)
    settings.SECRET_KEY_FALLBACKS = [previous]
    assert secrets.decrypt(token) == "value"


def test_an_unreadable_secret_is_a_clean_provider_error(settings, fake, user, photo):
    from apps.ai import services
    from apps.ai.errors import AIProviderError

    provider = make_provider(fake.url, style="multipart", secret="abc", style_config={"path": "/api/remove"})
    settings.AI_SECRETS_KEY = Fernet.generate_key().decode()
    with pytest.raises(AIProviderError) as caught:
        services.run(user, "background-removal", photo, f"{provider.id}:")
    assert caught.value.code == "secret_unreadable"
    assert fake.requests == []
