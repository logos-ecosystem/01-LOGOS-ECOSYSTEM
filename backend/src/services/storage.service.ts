import AWS from 'aws-sdk';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'logos-ecosystem-storage';

class StorageService {
  /**
   * Upload file to S3
   */
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${crypto.randomUUID()}${fileExtension}`;
      const key = `${folder}/${fileName}`;

      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private'
      };

      const result = await s3.upload(params).promise();
      logger.info('File uploaded successfully', { key, location: result.Location });

      return result.Location;
    } catch (error) {
      logger.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  /**
   * Upload file from local path
   */
  async uploadFileFromPath(filePath: string, folder: string): Promise<string> {
    try {
      const fileContent = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const key = `${folder}/${fileName}`;

      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ACL: 'private'
      };

      const result = await s3.upload(params).promise();
      logger.info('File uploaded successfully', { key, location: result.Location });

      return result.Location;
    } catch (error) {
      logger.error('Error uploading file from path:', error);
      throw error;
    }
  }

  /**
   * Get signed URL for temporary access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Expires: expiresIn
      };

      const url = await s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: key
      };

      await s3.deleteObject(params).promise();
      logger.info('File deleted successfully', { key });
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Copy file within S3
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<string> {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${sourceKey}`,
        Key: destinationKey
      };

      await s3.copyObject(params).promise();
      logger.info('File copied successfully', { sourceKey, destinationKey });

      return `https://${BUCKET_NAME}.s3.amazonaws.com/${destinationKey}`;
    } catch (error) {
      logger.error('Error copying file:', error);
      throw error;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string): Promise<AWS.S3.ObjectList> {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Prefix: folder
      };

      const result = await s3.listObjectsV2(params).promise();
      return result.Contents || [];
    } catch (error) {
      logger.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: key
      };

      const metadata = await s3.headObject(params).promise();
      return metadata;
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Upload JSON data as file
   */
  async uploadJson(data: any, folder: string, fileName: string): Promise<string> {
    try {
      const key = `${folder}/${fileName}.json`;
      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(data, null, 2),
        ContentType: 'application/json',
        ACL: 'private'
      };

      const result = await s3.upload(params).promise();
      logger.info('JSON uploaded successfully', { key, location: result.Location });

      return result.Location;
    } catch (error) {
      logger.error('Error uploading JSON:', error);
      throw error;
    }
  }

  /**
   * Download file to local path
   */
  async downloadFile(key: string, localPath: string): Promise<void> {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: key
      };

      const fileStream = fs.createWriteStream(localPath);
      const s3Stream = s3.getObject(params).createReadStream();

      s3Stream.pipe(fileStream);

      return new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          logger.info('File downloaded successfully', { key, localPath });
          resolve();
        });

        s3Stream.on('error', reject);
        fileStream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Create presigned POST data for direct browser upload
   */
  async createPresignedPost(folder: string, fileType: string): Promise<AWS.S3.PresignedPost> {
    try {
      const fileName = `${crypto.randomUUID()}`;
      const key = `${folder}/${fileName}`;

      const params = {
        Bucket: BUCKET_NAME,
        Fields: {
          key,
          'Content-Type': fileType,
          'ACL': 'private'
        },
        Expires: 300, // 5 minutes
        Conditions: [
          ['content-length-range', 0, 10485760], // Max 10MB
          ['starts-with', '$Content-Type', fileType]
        ]
      };

      const presignedPost = await s3.createPresignedPost(params);
      return presignedPost;
    } catch (error) {
      logger.error('Error creating presigned post:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();

// Export convenience function
export const uploadFile = (file: Express.Multer.File, folder: string) => 
  storageService.uploadFile(file, folder);