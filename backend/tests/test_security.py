import uuid
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token


def test_password_hashing_and_verification():
    raw_password = "SuperSecretPassword123!"
    hashed = get_password_hash(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_access_token_creation_and_claims():
    user_id = uuid.uuid4()
    email = "testuser@movierec.com"
    token = create_access_token(subject=user_id, role="USER", extra_claims={"email": email})

    payload = decode_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["role"] == "USER"
    assert payload["type"] == "access"
    assert payload["email"] == email
    assert "exp" in payload


def test_jwt_refresh_token_creation():
    user_id = uuid.uuid4()
    refresh_token = create_refresh_token(subject=user_id)

    payload = decode_token(refresh_token)
    assert payload["sub"] == str(user_id)
    assert payload["type"] == "refresh"
    assert "exp" in payload

