import AWS from 'aws-sdk';
import { logger } from '../utils/logger';

export class S3Service {
  private s3: AWS.S3;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'logos-ecosystem-storage';
    
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
    } else {
      logger.warn('AWS credentials not configured - S3 features will be limited');
      this.s3 = null as any;
    }
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.s3) {
      throw new Error('S3 service not configured');
    }

    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType
      };

      const result = await this.s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      logger.error('S3 upload error:', error);
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.s3) {
      throw new Error('S3 service not configured');
    }

    try {
      return this.s3.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn
      });
    } catch (error) {
      logger.error('S3 signed URL error:', error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.s3) {
      throw new Error('S3 service not configured');
    }

    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();
    } catch (error) {
      logger.error('S3 delete error:', error);
      throw error;
    }
  }
}

export const s3Service = new S3Service();