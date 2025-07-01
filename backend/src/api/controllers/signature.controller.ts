import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { digitalSignatureService } from '../../services/digital-signature.service';
import { s3Service } from '../../services/s3.service';
import { emailService } from '../../services/email.service';
import { logger } from '../../utils/logger';

export class SignatureController {
  // Sign a document
  async signDocument(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { documentId } = req.params;
      const { signatureData, signatureImage, location } = req.body;
      const file = req.file;

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, username: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get document buffer
      let documentBuffer: Buffer;
      if (file) {
        documentBuffer = file.buffer;
      } else {
        // Fetch document from storage
        const document = await prisma.invoice.findUnique({
          where: { id: documentId }
        });
        
        if (!document) {
          return res.status(404).json({ error: 'Document not found' });
        }

        // Fetch from S3 or generate PDF
        documentBuffer = Buffer.from(''); // Placeholder
      }

      // Prepare signer info
      const signerInfo = {
        signerId: userId,
        signerName: user.username || user.email,
        signerEmail: user.email,
        timestamp: new Date(),
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        location
      };

      // Sign the document
      const signature = await digitalSignatureService.signDocument(
        documentId,
        documentBuffer,
        signerInfo
      );

      // Send confirmation email
      await emailService.sendEmail({
        to: user.email,
        subject: 'Document Signed Successfully',
        template: 'document-signed',
        data: {
          documentId,
          timestamp: signerInfo.timestamp,
          verificationUrl: signature.verificationUrl
        }
      });

      res.json({
        message: 'Document signed successfully',
        signature
      });
    } catch (error) {
      logger.error('Error signing document:', error);
      res.status(500).json({ error: 'Failed to sign document' });
    }
  }

  // Create signature request
  async createSignatureRequest(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { documentId, signers, deadline, sequential, message } = req.body;

      const requestId = await digitalSignatureService.createSignatureRequest(
        documentId,
        userId,
        signers,
        {
          deadline: deadline ? new Date(deadline) : undefined,
          reminders: true,
          sequential,
          message
        }
      );

      res.json({
        message: 'Signature request created successfully',
        requestId
      });
    } catch (error) {
      logger.error('Error creating signature request:', error);
      res.status(500).json({ error: 'Failed to create signature request' });
    }
  }

  // Get signature requests
  async getSignatureRequests(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { status, page = 1, limit = 20 } = req.query;

      const where: any = {
        OR: [
          { requesterId: userId },
          { signers: { path: '$[*].email', equals: req.user?.email } }
        ]
      };

      if (status) {
        where.status = status;
      }

      const [requests, total] = await Promise.all([
        prisma.signatureRequest.findMany({
          where,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            document: true,
            requester: {
              select: { email: true, username: true }
            }
          }
        }),
        prisma.signatureRequest.count({ where })
      ]);

      res.json({
        requests,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error fetching signature requests:', error);
      res.status(500).json({ error: 'Failed to fetch signature requests' });
    }
  }

  // Get signature request details
  async getSignatureRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;

      const request = await prisma.signatureRequest.findUnique({
        where: { id: requestId },
        include: {
          document: true,
          requester: {
            select: { email: true, username: true }
          },
          signatures: true
        }
      });

      if (!request) {
        return res.status(404).json({ error: 'Signature request not found' });
      }

      res.json(request);
    } catch (error) {
      logger.error('Error fetching signature request:', error);
      res.status(500).json({ error: 'Failed to fetch signature request' });
    }
  }

  // Cancel signature request
  async cancelSignatureRequest(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { requestId } = req.params;

      const request = await prisma.signatureRequest.findUnique({
        where: { id: requestId }
      });

      if (!request) {
        return res.status(404).json({ error: 'Signature request not found' });
      }

      if (request.requesterId !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this request' });
      }

      await prisma.signatureRequest.update({
        where: { id: requestId },
        data: { status: 'cancelled' }
      });

      res.json({ message: 'Signature request cancelled successfully' });
    } catch (error) {
      logger.error('Error cancelling signature request:', error);
      res.status(500).json({ error: 'Failed to cancel signature request' });
    }
  }

  // Verify document
  async verifyDocument(req: Request, res: Response) {
    try {
      const { documentId } = req.params;

      const verification = await digitalSignatureService.verifyDocument(documentId);

      res.json(verification);
    } catch (error) {
      logger.error('Error verifying document:', error);
      res.status(500).json({ error: 'Failed to verify document' });
    }
  }

  // Get document signatures
  async getDocumentSignatures(req: Request, res: Response) {
    try {
      const { documentId } = req.params;

      const signedDocument = await prisma.signedDocument.findUnique({
        where: { documentId },
        include: {
          signatures: {
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      if (!signedDocument) {
        return res.status(404).json({ error: 'No signatures found for this document' });
      }

      res.json({
        document: signedDocument,
        signatures: signedDocument.signatures
      });
    } catch (error) {
      logger.error('Error fetching document signatures:', error);
      res.status(500).json({ error: 'Failed to fetch document signatures' });
    }
  }

  // Download signed document
  async downloadSignedDocument(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { documentId } = req.params;

      const signedDocument = await prisma.signedDocument.findUnique({
        where: { documentId },
        include: { signatures: true }
      });

      if (!signedDocument) {
        return res.status(404).json({ error: 'Signed document not found' });
      }

      // Check access permissions
      const hasAccess = signedDocument.signatures.some(sig => sig.signerId === userId);
      if (!hasAccess) {
        // Check if user owns the original document
        const invoice = await prisma.invoice.findFirst({
          where: { id: documentId, userId }
        });
        
        if (!invoice) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Fetch from S3
      if (signedDocument.signedUrl) {
        const fileBuffer = await s3Service.getFile(signedDocument.signedUrl);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="signed_${documentId}.pdf"`);
        res.send(fileBuffer);
      } else {
        res.status(404).json({ error: 'Signed document file not found' });
      }
    } catch (error) {
      logger.error('Error downloading signed document:', error);
      res.status(500).json({ error: 'Failed to download signed document' });
    }
  }

  // Generate signature certificate
  async generateCertificate(req: Request, res: Response) {
    try {
      const { signatureId } = req.params;

      const certificate = await digitalSignatureService.generateCertificate(signatureId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate_${signatureId}.pdf"`);
      res.send(certificate);
    } catch (error) {
      logger.error('Error generating certificate:', error);
      res.status(500).json({ error: 'Failed to generate certificate' });
    }
  }

  // Revoke signature
  async revokeSignature(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { signatureId } = req.params;
      const { reason } = req.body;

      // Check if user can revoke this signature
      const signature = await prisma.signature.findUnique({
        where: { id: signatureId }
      });

      if (!signature) {
        return res.status(404).json({ error: 'Signature not found' });
      }

      if (signature.signerId !== userId) {
        return res.status(403).json({ error: 'Not authorized to revoke this signature' });
      }

      await digitalSignatureService.revokeSignature(signatureId, reason, userId);

      res.json({ message: 'Signature revoked successfully' });
    } catch (error) {
      logger.error('Error revoking signature:', error);
      res.status(500).json({ error: 'Failed to revoke signature' });
    }
  }

  // Get audit trail
  async getAuditTrail(req: Request, res: Response) {
    try {
      const { documentId } = req.params;

      const auditTrail = await digitalSignatureService.getAuditTrail(documentId);

      res.json({ auditTrail });
    } catch (error) {
      logger.error('Error fetching audit trail:', error);
      res.status(500).json({ error: 'Failed to fetch audit trail' });
    }
  }

  // Bulk sign documents
  async bulkSign(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { documentIds, signatureData } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, username: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const signerInfo = {
        signerId: userId,
        signerName: user.username || user.email,
        signerEmail: user.email,
        timestamp: new Date(),
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      };

      const signatures = await digitalSignatureService.bulkSign(documentIds, signerInfo);

      res.json({
        message: `Successfully signed ${signatures.length} documents`,
        signatures
      });
    } catch (error) {
      logger.error('Error bulk signing documents:', error);
      res.status(500).json({ error: 'Failed to bulk sign documents' });
    }
  }

  // Upload signature image
  async uploadSignatureImage(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No signature image provided' });
      }

      // Upload to S3
      const signatureUrl = await s3Service.uploadFile(
        file.buffer,
        `signatures/${userId}/signature_${Date.now()}.png`,
        file.mimetype
      );

      // Save to user preferences
      await prisma.user.update({
        where: { id: userId },
        data: {
          preferences: {
            signatureImage: signatureUrl
          }
        }
      });

      res.json({
        message: 'Signature image uploaded successfully',
        signatureUrl
      });
    } catch (error) {
      logger.error('Error uploading signature image:', error);
      res.status(500).json({ error: 'Failed to upload signature image' });
    }
  }

  // Get signature settings
  async getSignatureSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
      });

      const preferences = user?.preferences as any || {};

      res.json({
        signatureSettings: {
          defaultSignatureImage: preferences.signatureImage,
          signatureType: preferences.signatureType || 'draw',
          fontFamily: preferences.signatureFontFamily || 'Dancing Script',
          autoSign: preferences.autoSign || false
        }
      });
    } catch (error) {
      logger.error('Error fetching signature settings:', error);
      res.status(500).json({ error: 'Failed to fetch signature settings' });
    }
  }

  // Update signature settings
  async updateSignatureSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const updates = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
      });

      const currentPreferences = (user?.preferences as any) || {};

      await prisma.user.update({
        where: { id: userId },
        data: {
          preferences: {
            ...currentPreferences,
            ...updates
          }
        }
      });

      res.json({ message: 'Signature settings updated successfully' });
    } catch (error) {
      logger.error('Error updating signature settings:', error);
      res.status(500).json({ error: 'Failed to update signature settings' });
    }
  }

  // Public certificate verification (no auth required)
  async publicVerifyCertificate(req: Request, res: Response) {
    try {
      const { certificateId } = req.params;

      const signature = await prisma.signature.findFirst({
        where: { certificateId },
        include: {
          signedDocument: true
        }
      });

      if (!signature) {
        return res.status(404).json({ error: 'Certificate not found' });
      }

      const isValid = digitalSignatureService.verifySignature(
        JSON.stringify(signature.signatureData),
        signature.signature
      );

      res.json({
        valid: isValid && !signature.revoked,
        certificate: {
          id: certificateId,
          signerName: signature.signerName,
          signerEmail: signature.signerEmail,
          signedAt: signature.timestamp,
          documentId: signature.signedDocument.documentId,
          revoked: signature.revoked,
          revokedAt: signature.revokedAt,
          revocationReason: signature.revocationReason
        }
      });
    } catch (error) {
      logger.error('Error verifying certificate:', error);
      res.status(500).json({ error: 'Failed to verify certificate' });
    }
  }
}

export const signatureController = new SignatureController();