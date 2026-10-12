import os
import uuid
import aiofiles
from abc import ABC, abstractmethod
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

class StorageProvider(ABC):
    @abstractmethod
    async def save_file(self, file: UploadFile, subfolder: str = "tasks") -> str:
        """Save an uploaded file and return its accessible URL."""
        pass

    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        """Delete a file by its relative path or URL."""
        pass


class LocalStorageProvider(StorageProvider):
    def __init__(self, base_dir: str = settings.UPLOAD_DIR, url_prefix: str = settings.MEDIA_URL_PREFIX):
        self.base_dir = base_dir
        self.url_prefix = url_prefix
        os.makedirs(self.base_dir, exist_ok=True)

    async def save_file(self, file: UploadFile, subfolder: str = "tasks") -> str:
        # Validate content type
        if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type {file.content_type}. Allowed types: {', '.join(settings.ALLOWED_IMAGE_TYPES)}"
            )

        # Get extension
        filename = file.filename or "upload.jpg"
        ext = os.path.splitext(filename)[1].lower()
        if not ext:
            ext = ".jpg"

        # Unique file name
        unique_name = f"{uuid.uuid4()}{ext}"
        target_dir = os.path.join(self.base_dir, subfolder)
        os.makedirs(target_dir, exist_ok=True)

        destination_path = os.path.join(target_dir, unique_name)

        # Read and check size
        size = 0
        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024

        async with aiofiles.open(destination_path, "wb") as out_file:
            while chunk := await file.read(1024 * 64):  # 64KB chunks
                size += len(chunk)
                if size > max_bytes:
                    # Clean up partial file
                    await out_file.close()
                    if os.path.exists(destination_path):
                        os.remove(destination_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB"
                    )
                await out_file.write(chunk)

        # Return web accessible path
        return f"{self.url_prefix}/{subfolder}/{unique_name}"

    async def delete_file(self, file_path: str) -> bool:
        if file_path.startswith(self.url_prefix):
            rel_path = file_path[len(self.url_prefix):].lstrip("/\\")
            full_path = os.path.join(self.base_dir, rel_path)
            if os.path.exists(full_path):
                os.remove(full_path)
                return True
        return False

# Default instance
storage_provider: StorageProvider = LocalStorageProvider()
