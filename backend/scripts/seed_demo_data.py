import asyncio
import os
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.task import CleaningTask
from app.models.swipe import Swipe
from app.core.config import settings

SAMPLE_USERS = [
    {
        "email": "maya@adhdo.app",
        "display_name": "Maya 🎨",
        "bio": "ADHD artist whose studio looks like a glitter bomb detonated. Let's do a 20m burst!",
        "avatar_url": "/media/avatars/maya.svg",
        "adhd_preferences": {
            "cleaning_style": "sprint",
            "tags": ["art_mess", "20min_burst", "music_vibes"],
            "preferred_duration": 20
        },
        "task": {
            "title": "Glitter & Canvas Studio Floor",
            "description": "Scattered acrylic paints, brushes, and shipping boxes. I need someone to work alongside while I pick up!",
            "photo_url": "/media/tasks/art_studio.svg",
            "duration": 20
        }
    },
    {
        "email": "leo@adhdo.app",
        "display_name": "Leo ⚡",
        "bio": "Software dev with acute laundry blindness. Body doubling keeps me from opening Reddit.",
        "avatar_url": "/media/avatars/leo.svg",
        "adhd_preferences": {
            "cleaning_style": "pomodoro",
            "tags": ["laundry_hater", "silent_body_doubling", "desk_clutter"],
            "preferred_duration": 25
        },
        "task": {
            "title": "Mt. Everest Clean Laundry Pile",
            "description": "It's clean, but it has lived on the chair for 9 days. Time to fold and hang!",
            "photo_url": "/media/tasks/laundry_mountain.svg",
            "duration": 25
        }
    },
    {
        "email": "sam@adhdo.app",
        "display_name": "Sam ☕",
        "bio": "Executive dysfunction champion. 15 minutes of dishes and coffee mugs.",
        "avatar_url": "/media/avatars/sam.svg",
        "adhd_preferences": {
            "cleaning_style": "sprint",
            "tags": ["dish_hater", "15min_dash", "gentle_encouragement"],
            "preferred_duration": 15
        },
        "task": {
            "title": "Kitchen Sink Armageddon",
            "description": "Mugs from all week. Looking for an energetic body double to cheer me on!",
            "photo_url": "/media/tasks/kitchen_sink.svg",
            "duration": 15
        }
    },
    {
        "email": "chloe@adhdo.app",
        "display_name": "Chloe 🌱",
        "bio": "Plants are happy, desk is crying. Let's set a timer and crush this together.",
        "avatar_url": "/media/avatars/chloe.svg",
        "adhd_preferences": {
            "cleaning_style": "relaxed",
            "tags": ["desk_clutter", "body_doubling_chatty", "plant_parent"],
            "preferred_duration": 30
        },
        "task": {
            "title": "Workspace & Bookshelf Reset",
            "description": "Paper notes everywhere, cables tangled, loose books. 30 min focus session.",
            "photo_url": "/media/tasks/desk_reset.svg",
            "duration": 30
        }
    }
]

def generate_svg_avatar(name: str, color: str) -> str:
    initial = name[0].upper()
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="100" fill="{color}"/>
  <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="80" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">{initial}</text>
</svg>"""

def generate_svg_task(title: str, bg_color: str, icon: str) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700" viewBox="0 0 600 700">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{bg_color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e1e2e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="600" height="700" fill="url(#grad)" rx="24"/>
  <circle cx="300" cy="280" r="110" fill="rgba(255,255,255,0.08)"/>
  <text x="300" y="300" font-size="110" text-anchor="middle">{icon}</text>
  <rect x="50" y="470" width="500" height="150" rx="16" fill="rgba(0,0,0,0.4)"/>
  <text x="75" y="525" font-family="system-ui, sans-serif" font-size="26" font-weight="bold" fill="#ffffff">{title[:30]}</text>
  <text x="75" y="565" font-family="system-ui, sans-serif" font-size="18" fill="#cbd5e1">Active Cleaning Challenge • ADHDo Body Doubling</text>
  <rect x="75" y="585" width="130" height="26" rx="13" fill="#6366f1"/>
  <text x="140" y="603" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">📸 ROOM PHOTO</text>
</svg>"""

async def seed():
    # Make directories
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "avatars"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "tasks"), exist_ok=True)

    # Write assets
    assets = [
        ("avatars/maya.svg", generate_svg_avatar("Maya", "#ec4899")),
        ("avatars/leo.svg", generate_svg_avatar("Leo", "#3b82f6")),
        ("avatars/sam.svg", generate_svg_avatar("Sam", "#eab308")),
        ("avatars/chloe.svg", generate_svg_avatar("Chloe", "#10b981")),
        ("tasks/art_studio.svg", generate_svg_task("Studio Glitter Bomb", "#831843", "🎨")),
        ("tasks/laundry_mountain.svg", generate_svg_task("Mt. Everest Laundry", "#1e3a8a", "🧺")),
        ("tasks/kitchen_sink.svg", generate_svg_task("Kitchen Sink Armageddon", "#713f12", "☕")),
        ("tasks/desk_reset.svg", generate_svg_task("Workspace & Bookshelf Reset", "#064e3b", "📚")),
    ]
    for rel_path, content in assets:
        full_path = os.path.join(settings.UPLOAD_DIR, rel_path)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)

    async with AsyncSessionLocal() as session:
        for u_data in SAMPLE_USERS:
            res = await session.execute(select(User).where(User.email == u_data["email"]))
            user = res.scalar_one_or_none()
            if not user:
                user = User(
                    email=u_data["email"],
                    hashed_password=hash_password("DemoPassword123!"),
                    display_name=u_data["display_name"],
                    bio=u_data["bio"],
                    avatar_url=u_data["avatar_url"],
                    adhd_preferences=u_data["adhd_preferences"],
                    is_active=True,
                    is_verified=True
                )
                session.add(user)
                await session.flush()

                task = CleaningTask(
                    user_id=user.id,
                    title=u_data["task"]["title"],
                    description=u_data["task"]["description"],
                    photo_url=u_data["task"]["photo_url"],
                    estimated_duration_minutes=u_data["task"]["duration"],
                    status="active"
                )
                session.add(task)

        # Also create a default test account for easy login
        demo_email = "test@adhdo.app"
        res_demo = await session.execute(select(User).where(User.email == demo_email))
        demo_user = res_demo.scalar_one_or_none()
        if not demo_user:
            demo_user = User(
                email=demo_email,
                hashed_password=hash_password("Password123!"),
                display_name="Alex (You) ✨",
                bio="ADHD-Combined. Looking for 20-minute body-doubling sprints to tackle clutter!",
                avatar_url=None,
                adhd_preferences={
                    "cleaning_style": "sprint",
                    "tags": ["silent_body_doubling", "laundry_hater", "20min_burst"],
                    "preferred_duration": 20
                },
                is_active=True,
                is_verified=True
            )
            session.add(demo_user)
            await session.flush()

            demo_task = CleaningTask(
                user_id=demo_user.id,
                title="My Messy Living Room Floor",
                description="Books, unopened mail, and dog toys everywhere. Need to power through!",
                photo_url="/media/tasks/desk_reset.svg",
                estimated_duration_minutes=20,
                status="active"
            )
            session.add(demo_task)
            await session.flush()

            # Make Maya already like Alex so that Alex swiping Maya will trigger an instant Match!
            maya_res = await session.execute(select(User).where(User.email == "maya@adhdo.app"))
            maya_user = maya_res.scalar_one_or_none()
            if maya_user:
                maya_swipe = Swipe(
                    swiper_id=maya_user.id,
                    target_user_id=demo_user.id,
                    target_task_id=demo_task.id,
                    action="like"
                )
                session.add(maya_swipe)

        await session.commit()
    print("Seed data initialized successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
