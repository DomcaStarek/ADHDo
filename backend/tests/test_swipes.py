import pytest
import uuid
from sqlalchemy import select
from app.models.user import User

@pytest.mark.asyncio
async def test_swipes_and_task_filtering(client, db_session):
    # Setup User 1
    u1_email = f"u1_{uuid.uuid4().hex[:6]}@example.com"
    await client.post("/api/v1/auth/register", json={
        "email": u1_email,
        "password": "Password123!",
        "display_name": "User One"
    })
    res1 = await db_session.execute(select(User).where(User.email == u1_email))
    u1 = res1.scalar_one()
    u1.is_verified = True
    await db_session.commit()
    
    login1 = await client.post("/api/v1/auth/login", json={"email": u1_email, "password": "Password123!"})
    h1 = {"Authorization": f"Bearer {login1.json()['access_token']}"}

    # Setup User 2
    u2_email = f"u2_{uuid.uuid4().hex[:6]}@example.com"
    await client.post("/api/v1/auth/register", json={
        "email": u2_email,
        "password": "Password123!",
        "display_name": "User Two"
    })
    res2 = await db_session.execute(select(User).where(User.email == u2_email))
    u2 = res2.scalar_one()
    u2.is_verified = True
    await db_session.commit()
    
    login2 = await client.post("/api/v1/auth/login", json={"email": u2_email, "password": "Password123!"})
    h2 = {"Authorization": f"Bearer {login2.json()['access_token']}"}

    # User 1 creates active task
    t1_resp = await client.post("/api/v1/tasks/direct", headers=h1, json={
        "title": "Living Room Clean Up",
        "photo_url": "/media/tasks/sample1.jpg",
        "estimated_duration_minutes": 15
    })
    t1_id = t1_resp.json()["id"]

    # User 2 sees task in feed
    feed_resp = await client.get("/api/v1/feed", headers=h2)
    assert any(item["task_id"] == t1_id for item in feed_resp.json())

    # User 2 PASSES on task
    pass_resp = await client.post("/api/v1/swipes", headers=h2, json={
        "target_task_id": t1_id,
        "action": "pass"
    })
    assert pass_resp.status_code == 200
    assert pass_resp.json()["is_match"] is False

    # After passing, task is no longer in User 2's feed
    feed_after = await client.get("/api/v1/feed", headers=h2)
    assert not any(item["task_id"] == t1_id for item in feed_after.json())
