#!/bin/bash

# Fix email.service.ts - nodemailer import
sed -i 's/createTransporter/createTransport/g' src/services/email.service.ts
sed -i 's/createTransporter/createTransport/g' src/services/health.service.ts

# Fix logger imports
find src -name "*.ts" -exec sed -i 's/import logger from/import { logger } from/g' {} \;

# Fix auditLogService imports
find src -name "*.ts" -exec sed -i 's/import { auditLogService }/import { AuditLogService }/g' {} \;
find src -name "*.ts" -exec sed -i 's/auditLogService\./AuditLogService\./g' {} \;

# Create missing s3.service.ts
cat > src/services/s3.service.ts << 'EOF'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';

class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
    this.bucketName = process.env.S3_BUCKET_NAME || 'logos-ecosystem-files';
  }

  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType
      });

      await this.s3Client.send(command);
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      logger.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3Client.send(command);
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      throw error;
    }
  }
}

export const s3Service = new S3Service();
EOF

# Install missing AWS SDK
cd /home/juan/Claude/LOGOS-ECOSYSTEM/backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

echo "Critical fixes applied. Now rebuilding..."