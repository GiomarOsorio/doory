"""Encryption of provider secrets (API keys) at rest.

The key is `AI_SECRETS_KEY` (a Fernet key: `python -c "from cryptography.fernet import Fernet;
print(Fernet.generate_key().decode())"`). When it is empty the key is derived from `SECRET_KEY` with HKDF, so
installs work without another setting; rotating `SECRET_KEY` then needs the old one in
`DJANGO_SECRET_KEY_FALLBACKS`, or stored secrets can no longer be read and have to be entered again.
`AI_SECRETS_KEY_FALLBACKS` (and the derived keys of `SECRET_KEY_FALLBACKS`) are still accepted for reading.
"""

import base64
import binascii

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from django.conf import settings

_SALT = b"doory.ai.secrets"
_INFO = b"provider secrets v1"


class SecretUnreadable(Exception):
    """A stored secret cannot be decrypted with any configured key (the key changed)."""


def derive_key(secret_key: str) -> bytes:
    """A Fernet key derived from Django's `SECRET_KEY`."""
    raw = HKDF(algorithm=hashes.SHA256(), length=32, salt=_SALT, info=_INFO).derive(secret_key.encode())
    return base64.urlsafe_b64encode(raw)


def _keys() -> list[bytes]:
    configured = getattr(settings, "AI_SECRETS_KEY", "")
    if configured:
        keys = [
            configured.encode(),
            *(key.encode() for key in getattr(settings, "AI_SECRETS_KEY_FALLBACKS", [])),
            derive_key(settings.SECRET_KEY),
        ]
    else:
        keys = [derive_key(settings.SECRET_KEY)]
    # Secrets written under an earlier SECRET_KEY stay readable while it is listed as a fallback.
    keys += [derive_key(key) for key in getattr(settings, "SECRET_KEY_FALLBACKS", [])]
    return keys


def _fernet() -> MultiFernet:
    fernets = []
    for key in _keys():
        try:
            fernets.append(Fernet(key))
        except (ValueError, binascii.Error) as exc:
            raise SecretUnreadable("A configured secrets key is not a valid Fernet key.") from exc
    if not fernets:
        raise SecretUnreadable("No valid secrets key is configured.")
    return MultiFernet(fernets)


def encrypt(value: str) -> bytes:
    return _fernet().encrypt(value.encode())


def decrypt(token: bytes) -> str:
    try:
        return _fernet().decrypt(token).decode()
    except (InvalidToken, SecretUnreadable, ValueError, binascii.Error) as exc:
        raise SecretUnreadable("The stored secret cannot be read; enter it again.") from exc


def uses_derived_key() -> bool:
    return not getattr(settings, "AI_SECRETS_KEY", "")
