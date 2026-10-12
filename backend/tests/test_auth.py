import pytest
import uuid
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token

def test_password_hashing():
    pwd = "SecretPassword123!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_access_token():
    user_id = str(uuid.uuid4())
    token = create_access_token(user_id, extra_claims={"role": "user"})
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == user_id
    assert decoded["role"] == "user"
    assert decoded["type"] == "access"

@pytest.mark.asyncio
async def test_auth_endpoints(client):
    email = f"tester_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "ValidPassword123!"
    
    # 1. Register
    reg = await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": pwd,
        "display_name": "Test User",
        "bio": "Just testing"
    })
    assert reg.status_code == 201
    
    # 2. Duplicate registration fails
    dup = await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": pwd,
        "display_name": "Another User"
    })
    assert dup.status_code == 400

    # 3. Invalid login credentials
    bad_login = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401
