import pytest
import uuid
from sqlalchemy import select
from app.models.auth_token import EmailVerificationToken

@pytest.mark.asyncio
async def test_complete_adhdo_flow(client, db_session):
    # 1. Register User A
    user_a_email = f"alex_{uuid.uuid4().hex[:6]}@example.com"
    reg_resp = await client.post("/api/v1/auth/register", json={
        "email": user_a_email,
        "password": "Password123!",
        "display_name": "Alex",
        "bio": "Laundry procrastinator looking for sprint partner",
        "adhd_preferences": {
            "cleaning_style": "sprint",
            "tags": ["laundry_hater", "silent_doubling"],
            "preferred_duration": 20
        }
    })
    assert reg_resp.status_code == 201

    # 2. Extract verification token from DB and verify User A
    token_query = await db_session.execute(
        select(EmailVerificationToken).order_by(EmailVerificationToken.created_at.desc()).limit(1)
    )
    # Since we store SHA-256 hash in DB, let's verify via verify endpoint using test bypass or direct user verify
    # In test, we can directly update user to verified
    from app.models.user import User
    res = await db_session.execute(select(User).where(User.email == user_a_email))
    user_a = res.scalar_one()
    user_a.is_verified = True
    await db_session.commit()

    # 3. Login User A
    login_a = await client.post("/api/v1/auth/login", json={
        "email": user_a_email,
        "password": "Password123!"
    })
    assert login_a.status_code == 200
    token_a = login_a.json()["access_token"]
    refresh_a = login_a.json()["refresh_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 4. Refresh token rotation test
    refresh_resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_a
    })
    assert refresh_resp.status_code == 200
    headers_a = {"Authorization": f"Bearer {refresh_resp.json()['access_token']}"}

    # 5. User A creates a cleaning task
    task_a_resp = await client.post("/api/v1/tasks/direct", headers=headers_a, json={
        "title": "Kitchen Island Chaos",
        "description": "Piles of mail and takeout containers. Need 20 mins to clear it!",
        "photo_url": "/media/tasks/dummy_kitchen.jpg",
        "estimated_duration_minutes": 20
    })
    assert task_a_resp.status_code == 201
    task_a_id = task_a_resp.json()["id"]

    # 6. Register & verify User B
    user_b_email = f"jordan_{uuid.uuid4().hex[:6]}@example.com"
    await client.post("/api/v1/auth/register", json={
        "email": user_b_email,
        "password": "Password456!",
        "display_name": "Jordan",
        "bio": "Silent partner fan. Folding laundry right now."
    })
    res_b = await db_session.execute(select(User).where(User.email == user_b_email))
    user_b = res_b.scalar_one()
    user_b.is_verified = True
    await db_session.commit()

    # Login User B
    login_b = await client.post("/api/v1/auth/login", json={
        "email": user_b_email,
        "password": "Password456!"
    })
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B creates a cleaning task
    task_b_resp = await client.post("/api/v1/tasks/direct", headers=headers_b, json={
        "title": "Closet Overhaul",
        "description": "Floor is covered in hoodies.",
        "photo_url": "/media/tasks/dummy_closet.jpg",
        "estimated_duration_minutes": 25
    })
    assert task_b_resp.status_code == 201
    task_b_id = task_b_resp.json()["id"]

    # 7. Feed Discovery: User B checks feed -> Sees User A's task
    feed_b = await client.get("/api/v1/feed", headers=headers_b)
    assert feed_b.status_code == 200
    feed_b_items = feed_b.json()
    task_ids = [item["task_id"] for item in feed_b_items]
    assert task_a_id in task_ids

    # User B swipes LIKE on User A's task -> No match yet
    swipe_b_resp = await client.post("/api/v1/swipes", headers=headers_b, json={
        "target_task_id": task_a_id,
        "action": "like"
    })
    assert swipe_b_resp.status_code == 200
    assert swipe_b_resp.json()["is_match"] is False

    # Feed Discovery: User A checks feed -> Sees User B's task
    feed_a = await client.get("/api/v1/feed", headers=headers_a)
    assert feed_a.status_code == 200
    task_ids_a = [item["task_id"] for item in feed_a.json()]
    assert task_b_id in task_ids_a

    # User A swipes LIKE on User B's task -> MATCH TRIGGERED!
    swipe_a_resp = await client.post("/api/v1/swipes", headers=headers_a, json={
        "target_task_id": task_b_id,
        "action": "like"
    })
    assert swipe_a_resp.status_code == 200
    swipe_result = swipe_a_resp.json()
    assert swipe_result["is_match"] is True
    match_id = swipe_result["match_data"]["match_id"]
    assert match_id is not None
    assert swipe_result["match_data"]["matched_with"]["display_name"] == "Jordan"

    # 8. Matches List
    matches_a = await client.get("/api/v1/matches", headers=headers_a)
    assert matches_a.status_code == 200
    assert len(matches_a.json()) >= 1
    assert matches_a.json()[0]["match_id"] == match_id

    # 9. Send Chat Message from User A to User B
    msg_send_resp = await client.post(f"/api/v1/matches/{match_id}/messages", headers=headers_a, json={
        "content": "Hey Jordan! Ready to start our 20-min cleaning sprint? 🧹"
    })
    assert msg_send_resp.status_code == 200
    msg_id = msg_send_resp.json()["id"]

    # 10. User B fetches messages
    messages_b = await client.get(f"/api/v1/matches/{match_id}/messages", headers=headers_b)
    assert messages_b.status_code == 200
    assert messages_b.json()["total"] >= 1
    assert messages_b.json()["items"][-1]["content"] == "Hey Jordan! Ready to start our 20-min cleaning sprint? 🧹"

    # 11. Safety / Block test: User B blocks User A
    block_resp = await client.post("/api/v1/moderation/block", headers=headers_b, json={
        "user_id": str(user_a.id),
        "reason": "Test block"
    })
    assert block_resp.status_code == 200

    # User B should no longer see User A in matches
    matches_b_after = await client.get("/api/v1/matches", headers=headers_b)
    active_matches_b = [m for m in matches_b_after.json() if m["match_id"] == match_id]
    assert len(active_matches_b) == 0
