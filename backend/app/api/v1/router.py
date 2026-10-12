from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    tasks,
    feed,
    swipes,
    matches,
    moderation,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(tasks.router)
api_router.include_router(feed.router)
api_router.include_router(swipes.router)
api_router.include_router(matches.router)
api_router.include_router(moderation.router)
