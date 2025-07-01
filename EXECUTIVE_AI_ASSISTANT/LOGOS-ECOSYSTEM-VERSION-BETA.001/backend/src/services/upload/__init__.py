"""
File upload service for handling media and document uploads
Supports both local filesystem and S3 storage
"""

import os
import uuid
import hashlib
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
import aiofiles
from typing import Optional, Dict, Any, List, BinaryIO
from datetime import datetime
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import imageio
from PIL import Image
import io

from src.shared.utils.config import get_settings
from src.shared.utils.logger import setup_logger

settings = get_settings()
from src.shared.models.upload import Upload, UploadStatus
from src.shared.models.user import User

logger = setup_logger(__name__)

class UploadService:
    """Service for handling file uploads"""
    
    def __init__(self):
        self.storage_type = settings.UPLOAD_STORAGE_TYPE  # 'local' or 's3'
        self.upload_dir = settings.UPLOAD_DIR
        self.allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'zip', 'mp3', 'mp4', 'wav']
        self.max_file_size = settings.MAX_UPLOAD_SIZE
        
        # S3 configuration
        if self.storage_type == 's3':
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            self.s3_bucket = settings.AWS_S3_BUCKET
            self.s3_base_url = f"https://{self.s3_bucket}.s3.{settings.AWS_REGION}.amazonaws.com"
        
        # Initialize magic for file type detection
        if MAGIC_AVAILABLE:
            self.mime = magic.Magic(mime=True)
        else:
            self.mime = None
        
        # Ensure local upload directory exists
        if self.storage_type == 'local':
            Path(self.upload_dir).mkdir(parents=True, exist_ok=True)
    
    async def upload_file(
        self,
        file: UploadFile,
        user_id: str,
        category: str = 'general',
        is_public: bool = True,
        db: AsyncSession = None
    ) -> Upload:
        """
        Upload a file and create database record
        
        Args:
            file: FastAPI UploadFile object
            user_id: ID of the user uploading the file
            category: Category of the upload (avatar, product, document, etc.)
            is_public: Whether the file should be publicly accessible
            db: Database session
            
        Returns:
            Upload model instance
        """
        try:
            # Validate file size
            content = await file.read()
            file_size = len(content)
            
            if file_size > self.max_file_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"File size exceeds maximum allowed size of {self.max_file_size / 1024 / 1024}MB"
                )
            
            # Reset file position
            await file.seek(0)
            
            # Validate file type
            if self.mime:
                file_type = self.mime.from_buffer(content)
            else:
                file_type = "application/octet-stream"  # Default if magic not available
            file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
            
            if file_extension not in self.allowed_extensions:
                raise HTTPException(
                    status_code=415,
                    detail=f"File type '{file_extension}' is not allowed"
                )
            
            # Generate unique filename
            file_hash = hashlib.sha256(content).hexdigest()[:16]
            unique_id = str(uuid.uuid4())
            unique_filename = f"{unique_id}_{file_hash}.{file_extension}"
            
            # Process image if applicable
            metadata = {}
            if file_type.startswith('image/'):
                metadata = await self._process_image(content, file_extension)
            
            # Upload to storage
            if self.storage_type == 's3':
                url = await self._upload_to_s3(content, unique_filename, file_type, is_public)
            else:
                url = await self._upload_to_local(content, unique_filename, category)
            
            # Create database record
            upload = Upload(
                id=str(uuid.uuid4()),
                user_id=user_id,
                filename=file.filename,
                unique_filename=unique_filename,
                file_size=file_size,
                file_type=file_type,
                file_extension=file_extension,
                category=category,
                url=url,
                is_public=is_public,
                metadata=metadata,
                status=UploadStatus.COMPLETED,
                uploaded_at=datetime.utcnow()
            )
            
            if db:
                db.add(upload)
                await db.commit()
                await db.refresh(upload)
            
            logger.info(f"File uploaded successfully: {upload.id}")
            return upload
            
        except Exception as e:
            logger.error(f"File upload failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"File upload failed: {str(e)}"
            )
    
    async def _upload_to_s3(
        self,
        content: bytes,
        filename: str,
        content_type: str,
        is_public: bool
    ) -> str:
        """Upload file to S3"""
        try:
            # Determine S3 key
            s3_key = f"uploads/{datetime.utcnow().strftime('%Y/%m/%d')}/{filename}"
            
            # Set ACL based on is_public
            acl = 'public-read' if is_public else 'private'
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=s3_key,
                Body=content,
                ContentType=content_type,
                ACL=acl
            )
            
            # Return URL
            return f"{self.s3_base_url}/{s3_key}"
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to upload file to storage"
            )
    
    async def _upload_to_local(
        self,
        content: bytes,
        filename: str,
        category: str
    ) -> str:
        """Upload file to local filesystem"""
        try:
            # Create category directory
            category_dir = os.path.join(self.upload_dir, category)
            Path(category_dir).mkdir(parents=True, exist_ok=True)
            
            # Create date-based subdirectory
            date_dir = datetime.utcnow().strftime('%Y/%m/%d')
            full_dir = os.path.join(category_dir, date_dir)
            Path(full_dir).mkdir(parents=True, exist_ok=True)
            
            # Write file
            file_path = os.path.join(full_dir, filename)
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            # Return relative URL
            return f"/uploads/{category}/{date_dir}/{filename}"
            
        except Exception as e:
            logger.error(f"Local file upload failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to save file to local storage"
            )
    
    async def _process_image(self, content: bytes, extension: str) -> Dict[str, Any]:
        """Process image and extract metadata"""
        try:
            # Open image with PIL
            image = Image.open(io.BytesIO(content))
            
            # Extract metadata
            metadata = {
                'width': image.width,
                'height': image.height,
                'format': image.format,
                'mode': image.mode
            }
            
            # Generate thumbnails if needed
            if image.width > 1920 or image.height > 1080:
                # Create a smaller version for web display
                image.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
                
                # Save thumbnail
                thumb_io = io.BytesIO()
                image.save(thumb_io, format=image.format)
                thumb_content = thumb_io.getvalue()
                
                # You could upload this thumbnail as well
                metadata['has_thumbnail'] = True
            
            return metadata
            
        except Exception as e:
            logger.error(f"Image processing failed: {str(e)}")
            return {}
    
    async def delete_file(
        self,
        upload_id: str,
        user_id: str,
        db: AsyncSession
    ) -> bool:
        """Delete a file and its database record"""
        try:
            # Get upload record
            upload = await db.get(Upload, upload_id)
            
            if not upload:
                raise HTTPException(
                    status_code=404,
                    detail="Upload not found"
                )
            
            # Check ownership
            if upload.user_id != user_id:
                raise HTTPException(
                    status_code=403,
                    detail="You don't have permission to delete this file"
                )
            
            # Delete from storage
            if self.storage_type == 's3':
                await self._delete_from_s3(upload.unique_filename)
            else:
                await self._delete_from_local(upload.url)
            
            # Delete database record
            await db.delete(upload)
            await db.commit()
            
            logger.info(f"File deleted: {upload_id}")
            return True
            
        except Exception as e:
            logger.error(f"File deletion failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete file: {str(e)}"
            )
    
    async def _delete_from_s3(self, filename: str) -> None:
        """Delete file from S3"""
        try:
            # Reconstruct S3 key
            s3_key = f"uploads/{filename}"
            
            self.s3_client.delete_object(
                Bucket=self.s3_bucket,
                Key=s3_key
            )
        except ClientError as e:
            logger.error(f"S3 deletion failed: {str(e)}")
            raise
    
    async def _delete_from_local(self, url: str) -> None:
        """Delete file from local filesystem"""
        try:
            # Convert URL to file path
            file_path = os.path.join(
                self.upload_dir,
                url.replace('/uploads/', '').replace('/', os.path.sep)
            )
            
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.error(f"Local file deletion failed: {str(e)}")
            raise
    
    async def get_user_uploads(
        self,
        user_id: str,
        category: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        db: AsyncSession = None
    ) -> List[Upload]:
        """Get all uploads for a user"""
        try:
            from sqlalchemy import select
            
            query = select(Upload).where(Upload.user_id == user_id)
            
            if category:
                query = query.where(Upload.category == category)
            
            query = query.order_by(Upload.uploaded_at.desc())
            query = query.limit(limit).offset(offset)
            
            result = await db.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Failed to get user uploads: {str(e)}")
            return []
    
    async def generate_presigned_url(
        self,
        upload_id: str,
        user_id: str,
        expiration: int = 3600,
        db: AsyncSession = None
    ) -> str:
        """Generate a presigned URL for private files (S3 only)"""
        if self.storage_type != 's3':
            raise HTTPException(
                status_code=400,
                detail="Presigned URLs are only available for S3 storage"
            )
        
        try:
            # Get upload record
            upload = await db.get(Upload, upload_id)
            
            if not upload:
                raise HTTPException(
                    status_code=404,
                    detail="Upload not found"
                )
            
            # Check ownership or public status
            if upload.user_id != user_id and not upload.is_public:
                raise HTTPException(
                    status_code=403,
                    detail="You don't have permission to access this file"
                )
            
            # Generate presigned URL
            s3_key = f"uploads/{upload.unique_filename}"
            
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.s3_bucket, 'Key': s3_key},
                ExpiresIn=expiration
            )
            
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to generate access URL"
            )
    
    async def cleanup_orphaned_uploads(self, db: AsyncSession) -> int:
        """Clean up uploads that are no longer referenced"""
        try:
            from sqlalchemy import select
            from datetime import timedelta
            
            # Find uploads older than 7 days that aren't referenced
            cutoff_date = datetime.utcnow() - timedelta(days=7)
            
            query = select(Upload).where(
                Upload.uploaded_at < cutoff_date,
                Upload.reference_count == 0
            )
            
            result = await db.execute(query)
            orphaned_uploads = result.scalars().all()
            
            count = 0
            for upload in orphaned_uploads:
                try:
                    await self.delete_file(upload.id, upload.user_id, db)
                    count += 1
                except Exception as e:
                    logger.error(f"Failed to cleanup upload {upload.id}: {str(e)}")
            
            logger.info(f"Cleaned up {count} orphaned uploads")
            return count
            
        except Exception as e:
            logger.error(f"Cleanup failed: {str(e)}")
            return 0

# Initialize upload service
upload_service = UploadService()