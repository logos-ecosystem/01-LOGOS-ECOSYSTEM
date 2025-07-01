"""
Upload API endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, get_db
from src.services.upload import upload_service
from src.api.schemas.upload import (
    UploadResponse,
    UploadListResponse,
    PresignedUrlResponse
)
from src.shared.models.user import User
from src.shared.models.upload import UploadCategory

router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    category: UploadCategory = Query(UploadCategory.GENERAL),
    is_public: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a file
    
    - **file**: The file to upload
    - **category**: Category of the upload (avatar, product, document, general)
    - **is_public**: Whether the file should be publicly accessible
    """
    try:
        # Upload file
        upload = await upload_service.upload_file(
            file=file,
            user_id=current_user.id,
            category=category,
            is_public=is_public,
            db=db
        )
        
        return UploadResponse(
            id=upload.id,
            filename=upload.filename,
            url=upload.url,
            file_size=upload.file_size,
            file_type=upload.file_type,
            category=upload.category,
            is_public=upload.is_public,
            metadata=upload.metadata,
            uploaded_at=upload.uploaded_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )

@router.post("/upload/multiple", response_model=List[UploadResponse])
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    category: UploadCategory = Query(UploadCategory.GENERAL),
    is_public: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload multiple files at once
    
    - **files**: List of files to upload
    - **category**: Category for all uploads
    - **is_public**: Whether files should be publicly accessible
    """
    try:
        uploads = []
        
        for file in files[:10]:  # Limit to 10 files per request
            upload = await upload_service.upload_file(
                file=file,
                user_id=current_user.id,
                category=category,
                is_public=is_public,
                db=db
            )
            
            uploads.append(UploadResponse(
                id=upload.id,
                filename=upload.filename,
                url=upload.url,
                file_size=upload.file_size,
                file_type=upload.file_type,
                category=upload.category,
                is_public=upload.is_public,
                metadata=upload.metadata,
                uploaded_at=upload.uploaded_at
            ))
        
        return uploads
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Multiple upload failed: {str(e)}"
        )

@router.get("/uploads", response_model=UploadListResponse)
async def get_my_uploads(
    category: Optional[UploadCategory] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's uploads
    
    - **category**: Filter by category
    - **limit**: Number of items to return
    - **offset**: Number of items to skip
    """
    try:
        uploads = await upload_service.get_user_uploads(
            user_id=current_user.id,
            category=category,
            limit=limit,
            offset=offset,
            db=db
        )
        
        items = [
            UploadResponse(
                id=upload.id,
                filename=upload.filename,
                url=upload.url,
                file_size=upload.file_size,
                file_type=upload.file_type,
                category=upload.category,
                is_public=upload.is_public,
                metadata=upload.metadata,
                uploaded_at=upload.uploaded_at
            )
            for upload in uploads
        ]
        
        return UploadListResponse(
            items=items,
            total=len(items),
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get uploads: {str(e)}"
        )

@router.delete("/upload/{upload_id}")
async def delete_upload(
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an upload"""
    try:
        success = await upload_service.delete_file(
            upload_id=upload_id,
            user_id=current_user.id,
            db=db
        )
        
        if success:
            return {"message": "File deleted successfully"}
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to delete file"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Deletion failed: {str(e)}"
        )

@router.post("/upload/{upload_id}/presigned-url", response_model=PresignedUrlResponse)
async def generate_presigned_url(
    upload_id: str,
    expiration: int = Query(3600, ge=60, le=86400),  # 1 minute to 24 hours
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a presigned URL for private file access (S3 only)
    
    - **upload_id**: ID of the upload
    - **expiration**: URL expiration time in seconds
    """
    try:
        url = await upload_service.generate_presigned_url(
            upload_id=upload_id,
            user_id=current_user.id,
            expiration=expiration,
            db=db
        )
        
        return PresignedUrlResponse(
            url=url,
            expires_in=expiration
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate presigned URL: {str(e)}"
        )