import uuid
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models.user import User
from app.models.task import CleaningTask
from app.schemas.task import TaskRead, TaskCreate, TaskUpdate
from app.api.v1.deps import get_current_user
from app.services.storage_service import storage_provider

router = APIRouter(prefix="/tasks", tags=["Cleaning Tasks"])

@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_cleaning_task(
    title: str = Form(..., min_length=2, max_length=120),
    description: Optional[str] = Form(None, max_length=1000),
    estimated_duration_minutes: int = Form(20, ge=5, le=180),
    photo: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Archive any previous active task for this user so they have 1 current active task
    existing_active = await db.execute(
        select(CleaningTask).where(
            and_(
                CleaningTask.user_id == current_user.id,
                CleaningTask.status == "active"
            )
        )
    )
    for old_task in existing_active.scalars().all():
        old_task.status = "archived"

    # Save photo
    photo_url = await storage_provider.save_file(photo, subfolder="tasks")

    # Create new task
    task = CleaningTask(
        user_id=current_user.id,
        title=title,
        description=description,
        photo_url=photo_url,
        estimated_duration_minutes=estimated_duration_minutes,
        status="active"
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task

@router.post("/direct", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task_direct(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create task with an existing photo_url."""
    existing_active = await db.execute(
        select(CleaningTask).where(
            and_(
                CleaningTask.user_id == current_user.id,
                CleaningTask.status == "active"
            )
        )
    )
    for old_task in existing_active.scalars().all():
        old_task.status = "archived"

    task = CleaningTask(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        photo_url=data.photo_url,
        estimated_duration_minutes=data.estimated_duration_minutes,
        status="active"
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task

@router.post("/upload-photo")
async def upload_task_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    photo_url = await storage_provider.save_file(file, subfolder="tasks")
    return {"photo_url": photo_url}

@router.get("/me/active", response_model=Optional[TaskRead])
async def get_my_active_task(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CleaningTask).where(
            and_(
                CleaningTask.user_id == current_user.id,
                CleaningTask.status == "active"
            )
        ).order_by(CleaningTask.created_at.desc()).limit(1)
    )
    return result.scalar_one_or_none()

@router.patch("/{task_id}", response_model=TaskRead)
async def update_cleaning_task(
    task_id: uuid.UUID,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CleaningTask).where(
            and_(
                CleaningTask.id == task_id,
                CleaningTask.user_id == current_user.id
            )
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.estimated_duration_minutes is not None:
        task.estimated_duration_minutes = data.estimated_duration_minutes
    if data.status is not None:
        task.status = data.status
    if data.photo_url is not None:
        task.photo_url = data.photo_url

    await db.commit()
    await db.refresh(task)
    return task
