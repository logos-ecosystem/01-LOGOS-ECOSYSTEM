import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from '../config/database';
import crypto from 'crypto';

export class TwoFactorAuthService {
  private static readonly APP_NAME = 'LOGOS ECOSYSTEM';
  private static readonly BACKUP_CODE_LENGTH = 8;
  private static readonly BACKUP_CODE_COUNT = 10;

  /**
   * Generate 2FA secret for user
   */
  static async generateSecret(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, username: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.APP_NAME} (${user.email})`,
      issuer: this.APP_NAME,
      length: 32
    });

    // Generate QR code
    const otpAuthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: encodeURIComponent(user.email),
      issuer: this.APP_NAME,
      encoding: 'base32'
    });

    const qrCode = await QRCode.toDataURL(otpAuthUrl);

    // Store secret temporarily (not enabled yet)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32
      }
    });

    return {
      secret: secret.base32,
      qrCode
    };
  }

  /**
   * Verify 2FA token and enable 2FA
   */
  static async verifyAndEnable(userId: string, token: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true }
    });

    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA secret not found. Please generate a new secret.');
    }

    if (user.twoFactorEnabled) {
      throw new Error('2FA is already enabled');
    }

    // Verify token
    const isValid = this.verifyToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    // Enable 2FA and store backup codes
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorVerified: new Date(),
        twoFactorBackupCodes: hashedBackupCodes
      }
    });

    // Create audit log
    await this.createAuditLog(userId, 'ENABLE_2FA', 'User', userId);

    return backupCodes;
  }

  /**
   * Verify 2FA token
   */
  static verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps before/after for clock skew
    });
  }

  /**
   * Disable 2FA
   */
  static async disable(userId: string, password: string): Promise<void> {
    // Password verification should be done in the controller
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        twoFactorVerified: null
      }
    });

    // Create audit log
    await this.createAuditLog(userId, 'DISABLE_2FA', 'User', userId);
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorBackupCodes: true }
    });

    if (!user || user.twoFactorBackupCodes.length === 0) {
      return false;
    }

    const hashedCode = this.hashBackupCode(code);
    const codeIndex = user.twoFactorBackupCodes.indexOf(hashedCode);

    if (codeIndex === -1) {
      return false;
    }

    // Remove used backup code
    const updatedCodes = user.twoFactorBackupCodes.filter((_, index) => index !== codeIndex);
    
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: updatedCodes }
    });

    // Create audit log
    await this.createAuditLog(userId, 'USE_BACKUP_CODE', 'User', userId);

    return true;
  }

  /**
   * Regenerate backup codes
   */
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true }
    });

    if (!user || !user.twoFactorEnabled) {
      throw new Error('2FA is not enabled');
    }

    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: hashedBackupCodes }
    });

    // Create audit log
    await this.createAuditLog(userId, 'REGENERATE_BACKUP_CODES', 'User', userId);

    return backupCodes;
  }

  /**
   * Check if user has 2FA enabled
   */
  static async isEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true }
    });

    return user?.twoFactorEnabled || false;
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      const code = crypto.randomBytes(this.BACKUP_CODE_LENGTH / 2).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  /**
   * Hash backup code
   */
  private static hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Create audit log entry
   */
  private static async createAuditLog(
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    changes?: any
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        changes: changes ? JSON.stringify(changes) : undefined,
        success: true
      }
    });
  }
}