import crypto from 'crypto';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { s3Service } from './s3.service';
import PDFDocument from 'pdfkit';
import { createCanvas } from 'canvas';
import QRCode from 'qrcode';

interface SignatureData {
  signerId: string;
  signerName: string;
  signerEmail: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface DocumentSignature {
  documentId: string;
  documentHash: string;
  signatures: SignatureData[];
  certificateId?: string;
  verificationUrl: string;
}

export class DigitalSignatureService {
  private privateKey: string;
  private publicKey: string;
  private certificateAuthority: string = 'LOGOS Digital Signature Authority';

  constructor() {
    this.initializeKeys();
  }

  private initializeKeys() {
    // In production, these should be loaded from secure storage
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    this.privateKey = process.env.SIGNATURE_PRIVATE_KEY || keyPair.privateKey;
    this.publicKey = process.env.SIGNATURE_PUBLIC_KEY || keyPair.publicKey;
  }

  // Generate document hash
  private generateDocumentHash(documentBuffer: Buffer): string {
    return crypto
      .createHash('sha256')
      .update(documentBuffer)
      .digest('hex');
  }

  // Create digital signature
  private createSignature(data: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(this.privateKey, 'base64');
  }

  // Verify digital signature
  public verifySignature(data: string, signature: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(this.publicKey, signature, 'base64');
  }

  // Sign a document
  async signDocument(
    documentId: string,
    documentBuffer: Buffer,
    signerInfo: SignatureData
  ): Promise<DocumentSignature> {
    try {
      // Generate document hash
      const documentHash = this.generateDocumentHash(documentBuffer);

      // Check if document already exists
      let signedDocument = await prisma.signedDocument.findUnique({
        where: { documentId },
        include: { signatures: true }
      });

      if (!signedDocument) {
        // Create new signed document record
        signedDocument = await prisma.signedDocument.create({
          data: {
            documentId,
            documentHash,
            documentType: 'invoice', // Could be dynamic
            originalUrl: '', // Will be updated after upload
            signedUrl: '', // Will be updated after signing
            status: 'pending',
            metadata: {}
          },
          include: { signatures: true }
        });
      }

      // Verify document hasn't been tampered with
      if (signedDocument.documentHash !== documentHash) {
        throw new Error('Document has been modified since last signature');
      }

      // Create signature data
      const signatureData = {
        documentId,
        documentHash,
        signerId: signerInfo.signerId,
        signerName: signerInfo.signerName,
        signerEmail: signerInfo.signerEmail,
        timestamp: signerInfo.timestamp,
        ipAddress: signerInfo.ipAddress,
        userAgent: signerInfo.userAgent,
        location: signerInfo.location
      };

      // Create cryptographic signature
      const signature = this.createSignature(JSON.stringify(signatureData));

      // Save signature to database
      const savedSignature = await prisma.signature.create({
        data: {
          signedDocumentId: signedDocument.id,
          signerId: signerInfo.signerId,
          signerName: signerInfo.signerName,
          signerEmail: signerInfo.signerEmail,
          signature,
          signatureData: signatureData as any,
          timestamp: signerInfo.timestamp,
          ipAddress: signerInfo.ipAddress,
          certificateId: await this.generateCertificateId()
        }
      });

      // Apply visual signature to PDF
      const signedPdfBuffer = await this.applyVisualSignature(
        documentBuffer,
        savedSignature,
        signedDocument.signatures.length + 1
      );

      // Upload signed document
      const signedUrl = await s3Service.uploadFile(
        signedPdfBuffer,
        `signed-documents/${documentId}_signed_${Date.now()}.pdf`,
        'application/pdf'
      );

      // Update document status
      await prisma.signedDocument.update({
        where: { id: signedDocument.id },
        data: {
          signedUrl,
          status: 'signed',
          lastSignedAt: new Date()
        }
      });

      // Generate verification URL
      const verificationUrl = `${process.env.APP_URL}/verify/document/${signedDocument.id}`;

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: signerInfo.signerId,
          action: 'document_signed',
          entity: 'document',
          entityId: documentId,
          metadata: {
            documentHash,
            certificateId: savedSignature.certificateId,
            timestamp: signerInfo.timestamp
          }
        }
      });

      return {
        documentId,
        documentHash,
        signatures: [...signedDocument.signatures, signatureData],
        certificateId: savedSignature.certificateId,
        verificationUrl
      };
    } catch (error) {
      logger.error('Error signing document:', error);
      throw error;
    }
  }

  // Apply visual signature to PDF
  private async applyVisualSignature(
    pdfBuffer: Buffer,
    signature: any,
    signatureNumber: number
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        // Load existing PDF
        const existingPdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = existingPdfDoc.getPages();
        const lastPage = pages[pages.length - 1];

        // Create new PDF for signature
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];
        
        doc.on('data', chunks.push.bind(chunks));
        doc.on('end', () => {
          const signatureBuffer = Buffer.concat(chunks);
          // Here you would merge the signature with the existing PDF
          // This is a simplified version
          resolve(pdfBuffer); // For now, return original
        });

        // Calculate signature position
        const signatureY = 50 + (signatureNumber - 1) * 100;

        // Add signature box
        doc
          .rect(50, signatureY, 200, 80)
          .stroke()
          .fontSize(8);

        // Add signature text
        doc
          .text('Digitally signed by:', 55, signatureY + 5)
          .font('Helvetica-Bold')
          .text(signature.signerName, 55, signatureY + 15)
          .font('Helvetica')
          .text(signature.signerEmail, 55, signatureY + 25)
          .text(`Date: ${new Date(signature.timestamp).toLocaleString()}`, 55, signatureY + 35)
          .text(`Certificate: ${signature.certificateId}`, 55, signatureY + 45);

        // Add QR code for verification
        const qrCodeData = await QRCode.toDataURL(
          `${process.env.APP_URL}/verify/signature/${signature.id}`
        );
        // doc.image(qrCodeData, 200, signatureY + 10, { width: 60 });

        // Add tamper-evident seal
        doc
          .fontSize(6)
          .fillColor('#666666')
          .text('This document has been digitally signed and sealed.', 55, signatureY + 60)
          .text('Any modification will invalidate the signature.', 55, signatureY + 68);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate certificate ID
  private async generateCertificateId(): Promise<string> {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `LOGOS-CERT-${timestamp}-${random}`.toUpperCase();
  }

  // Verify document signatures
  async verifyDocument(documentId: string): Promise<{
    valid: boolean;
    signatures: any[];
    issues: string[];
  }> {
    try {
      const signedDocument = await prisma.signedDocument.findUnique({
        where: { documentId },
        include: { signatures: true }
      });

      if (!signedDocument) {
        return {
          valid: false,
          signatures: [],
          issues: ['Document not found in signature database']
        };
      }

      const issues: string[] = [];
      const validSignatures: any[] = [];

      // Verify each signature
      for (const sig of signedDocument.signatures) {
        const signatureValid = this.verifySignature(
          JSON.stringify(sig.signatureData),
          sig.signature
        );

        if (signatureValid) {
          validSignatures.push({
            ...sig,
            valid: true,
            verifiedAt: new Date()
          });
        } else {
          issues.push(`Invalid signature from ${sig.signerName}`);
        }
      }

      // Check document integrity
      // In a real implementation, you would fetch and hash the current document
      // to compare with the stored hash

      return {
        valid: issues.length === 0,
        signatures: validSignatures,
        issues
      };
    } catch (error) {
      logger.error('Error verifying document:', error);
      return {
        valid: false,
        signatures: [],
        issues: ['Verification error: ' + (error as any).message]
      };
    }
  }

  // Create signature request
  async createSignatureRequest(
    documentId: string,
    requesterId: string,
    signers: Array<{
      email: string;
      name: string;
      role: string;
      order: number;
    }>,
    options: {
      deadline?: Date;
      reminders?: boolean;
      sequential?: boolean;
      message?: string;
    } = {}
  ): Promise<string> {
    try {
      const signatureRequest = await prisma.signatureRequest.create({
        data: {
          documentId,
          requesterId,
          signers: signers as any,
          status: 'pending',
          deadline: options.deadline,
          sequential: options.sequential || false,
          message: options.message,
          createdAt: new Date()
        }
      });

      // Send signature request emails to signers
      for (const signer of signers) {
        if (!options.sequential || signer.order === 1) {
          await this.sendSignatureRequestEmail(
            signer.email,
            signer.name,
            documentId,
            signatureRequest.id,
            options.message
          );
        }
      }

      // Set up reminders if requested
      if (options.reminders && options.deadline) {
        await this.scheduleReminders(signatureRequest.id, options.deadline);
      }

      return signatureRequest.id;
    } catch (error) {
      logger.error('Error creating signature request:', error);
      throw error;
    }
  }

  // Send signature request email
  private async sendSignatureRequestEmail(
    email: string,
    name: string,
    documentId: string,
    requestId: string,
    message?: string
  ): Promise<void> {
    // Implementation would use email service
    logger.info(`Sending signature request to ${email} for document ${documentId}`);
  }

  // Schedule reminder emails
  private async scheduleReminders(requestId: string, deadline: Date): Promise<void> {
    // Implementation would use a job scheduler
    logger.info(`Scheduling reminders for signature request ${requestId}`);
  }

  // Generate signature certificate
  async generateCertificate(signatureId: string): Promise<Buffer> {
    const signature = await prisma.signature.findUnique({
      where: { id: signatureId },
      include: { signedDocument: true }
    });

    if (!signature) {
      throw new Error('Signature not found');
    }

    // Create certificate PDF
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', chunks.push.bind(chunks));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Certificate header
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('CERTIFICATE OF DIGITAL SIGNATURE', { align: 'center' });

      doc
        .fontSize(12)
        .font('Helvetica')
        .moveDown(2)
        .text('This certifies that', { align: 'center' })
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(signature.signerName, { align: 'center' })
        .fontSize(12)
        .font('Helvetica')
        .text(signature.signerEmail, { align: 'center' })
        .moveDown()
        .text('has digitally signed the document', { align: 'center' })
        .moveDown()
        .text(`Document ID: ${signature.signedDocument.documentId}`, { align: 'center' })
        .text(`Document Hash: ${signature.signedDocument.documentHash}`, { align: 'center' })
        .moveDown()
        .text(`on ${new Date(signature.timestamp).toLocaleString()}`, { align: 'center' })
        .moveDown(2);

      // Certificate details
      doc
        .fontSize(10)
        .text('Certificate Details:', { underline: true })
        .moveDown(0.5)
        .text(`Certificate ID: ${signature.certificateId}`)
        .text(`Signature Algorithm: RSA-SHA256`)
        .text(`IP Address: ${signature.ipAddress}`)
        .text(`Issuing Authority: ${this.certificateAuthority}`)
        .moveDown(2);

      // Verification section
      doc
        .text('Verification:', { underline: true })
        .moveDown(0.5)
        .text('This certificate can be verified at:')
        .fillColor('blue')
        .text(`${process.env.APP_URL}/verify/certificate/${signature.certificateId}`, {
          link: `${process.env.APP_URL}/verify/certificate/${signature.certificateId}`
        })
        .fillColor('black')
        .moveDown(2);

      // QR Code for verification
      // Would add QR code here

      // Footer
      doc
        .fontSize(8)
        .text('This certificate is issued by LOGOS Digital Signature Authority', { align: 'center' })
        .text('and is valid proof of digital signature', { align: 'center' });

      doc.end();
    });
  }

  // Bulk sign multiple documents
  async bulkSign(
    documentIds: string[],
    signerInfo: SignatureData
  ): Promise<DocumentSignature[]> {
    const results: DocumentSignature[] = [];

    for (const documentId of documentIds) {
      try {
        // Fetch document (this would need to be implemented based on your storage)
        const documentBuffer = Buffer.from(''); // Placeholder
        
        const signature = await this.signDocument(
          documentId,
          documentBuffer,
          signerInfo
        );
        
        results.push(signature);
      } catch (error) {
        logger.error(`Error signing document ${documentId}:`, error);
        // Continue with other documents
      }
    }

    return results;
  }

  // Revoke signature
  async revokeSignature(
    signatureId: string,
    reason: string,
    revokedBy: string
  ): Promise<void> {
    try {
      await prisma.signature.update({
        where: { id: signatureId },
        data: {
          revoked: true,
          revokedAt: new Date(),
          revokedBy,
          revocationReason: reason
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: revokedBy,
          action: 'signature_revoked',
          entity: 'signature',
          entityId: signatureId,
          metadata: { reason }
        }
      });
    } catch (error) {
      logger.error('Error revoking signature:', error);
      throw error;
    }
  }

  // Get signature audit trail
  async getAuditTrail(documentId: string): Promise<any[]> {
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity: 'document',
        entityId: documentId,
        action: {
          in: ['document_signed', 'signature_revoked', 'document_viewed']
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return auditLogs;
  }
}

export const digitalSignatureService = new DigitalSignatureService();