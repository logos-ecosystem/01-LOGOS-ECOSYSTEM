/**
 * A2A Security Service - Handles encryption, signatures, and trust
 * Implements security aspects of Google A2A Protocol
 */

import * as crypto from 'crypto';
import { promisify } from 'util';
import {
  A2AMessage,
  JWSSignature,
  JWEEncryption,
  PublicKeyInfo,
  TrustCertificate,
  AgentDID
} from '../interfaces/a2a-types';
import { logger } from '../utils/logger';

const generateKeyPair = promisify(crypto.generateKeyPair);

export class A2ASecurityService {
  private trustStore: Map<AgentDID, TrustCertificate[]>;
  private keyCache: Map<string, crypto.KeyObject>;
  private nonceStore: Set<string>;

  constructor() {
    this.trustStore = new Map();
    this.keyCache = new Map();
    this.nonceStore = new Set();
    
    // Clean up old nonces periodically
    setInterval(() => this.cleanupNonces(), 300000); // 5 minutes
  }

  /**
   * Sign a message with agent's private key
   */
  async signMessage(
    message: A2AMessage,
    privateKey: crypto.KeyObject | string
  ): Promise<A2AMessage> {
    try {
      // Create signing input
      const signingInput = this.createSigningInput(message);
      
      // Create signature
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(signingInput);
      
      const key = typeof privateKey === 'string' 
        ? crypto.createPrivateKey(privateKey)
        : privateKey;
        
      const signature = signer.sign(key, 'base64');
      
      // Create JWS structure
      const jws: JWSSignature = {
        protected: Buffer.from(JSON.stringify({
          alg: 'RS256',
          kid: message.from,
          typ: 'A2A+JSON',
          crit: ['timestamp', 'nonce']
        })).toString('base64url'),
        signature: signature,
        header: {
          timestamp: message.timestamp,
          nonce: crypto.randomBytes(16).toString('hex')
        }
      };
      
      return {
        ...message,
        signature: jws
      };
    } catch (error) {
      logger.error('Message signing failed:', error);
      throw new Error('Failed to sign message');
    }
  }

  /**
   * Verify message signature
   */
  async verifySignature(message: A2AMessage): Promise<boolean> {
    if (!message.signature) {
      return false;
    }
    
    try {
      const { signature, protected: protectedHeader, header } = message.signature;
      
      // Decode protected header
      const decodedHeader = JSON.parse(
        Buffer.from(protectedHeader, 'base64url').toString()
      );
      
      // Check critical parameters
      if (!header?.timestamp || !header?.nonce) {
        return false;
      }
      
      // Verify timestamp (within 5 minutes)
      const messageTime = new Date(header.timestamp).getTime();
      const now = Date.now();
      if (Math.abs(now - messageTime) > 300000) {
        logger.warn('Message timestamp out of range');
        return false;
      }
      
      // Check nonce for replay protection
      if (this.nonceStore.has(header.nonce)) {
        logger.warn('Duplicate nonce detected');
        return false;
      }
      this.nonceStore.add(header.nonce);
      
      // Get public key for sender
      const publicKey = await this.getPublicKey(message.from);
      if (!publicKey) {
        return false;
      }
      
      // Verify signature
      const signingInput = this.createSigningInput(message);
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(signingInput);
      
      return verifier.verify(publicKey, signature, 'base64');
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Encrypt message for recipient
   */
  async encryptMessage(
    message: A2AMessage,
    recipientPublicKey: PublicKeyInfo
  ): Promise<A2AMessage> {
    try {
      // Generate content encryption key (CEK)
      const cek = crypto.randomBytes(32); // 256-bit key
      const iv = crypto.randomBytes(16); // 128-bit IV
      
      // Encrypt the message body
      const cipher = crypto.createCipheriv('aes-256-gcm', cek, iv);
      const plaintext = JSON.stringify(message.body);
      
      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');
      const tag = cipher.getAuthTag();
      
      // Encrypt CEK with recipient's public key
      const publicKey = await this.loadPublicKey(recipientPublicKey);
      const encryptedKey = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        cek
      );
      
      // Create JWE structure
      const jwe: JWEEncryption = {
        protected: Buffer.from(JSON.stringify({
          alg: 'RSA-OAEP-256',
          enc: 'A256GCM',
          typ: 'A2A+JSON',
          kid: recipientPublicKey.id
        })).toString('base64url'),
        encrypted_key: encryptedKey.toString('base64url'),
        iv: iv.toString('base64url'),
        ciphertext: ciphertext,
        tag: tag.toString('base64url')
      };
      
      return {
        ...message,
        encryption: jwe,
        body: null // Body is now encrypted
      };
    } catch (error) {
      logger.error('Message encryption failed:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt message
   */
  async decryptMessage(
    message: A2AMessage,
    privateKey: crypto.KeyObject | string
  ): Promise<A2AMessage> {
    if (!message.encryption) {
      return message;
    }
    
    try {
      const { protected: protectedHeader, encrypted_key, iv, ciphertext, tag } = message.encryption;
      
      // Decode protected header
      const header = JSON.parse(
        Buffer.from(protectedHeader, 'base64url').toString()
      );
      
      // Decrypt CEK
      const key = typeof privateKey === 'string'
        ? crypto.createPrivateKey(privateKey)
        : privateKey;
        
      const cek = crypto.privateDecrypt(
        {
          key: key,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(encrypted_key, 'base64url')
      );
      
      // Decrypt message body
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        cek,
        Buffer.from(iv, 'base64url')
      );
      
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      
      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return {
        ...message,
        body: JSON.parse(decrypted),
        encryption: undefined
      };
    } catch (error) {
      logger.error('Message decryption failed:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Generate agent key pair
   */
  async generateAgentKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
    publicKeyInfo: PublicKeyInfo;
  }> {
    const { publicKey, privateKey } = await generateKeyPair('rsa', {
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
    
    const keyId = crypto.randomBytes(16).toString('hex');
    
    return {
      publicKey,
      privateKey,
      publicKeyInfo: {
        id: keyId,
        type: 'RSA',
        publicKeyPem: publicKey,
        purposes: ['authentication', 'keyAgreement']
      }
    };
  }

  /**
   * Create trust certificate
   */
  async createTrustCertificate(
    issuer: AgentDID,
    subject: AgentDID,
    claims: Record<string, any>,
    issuerPrivateKey: crypto.KeyObject | string
  ): Promise<TrustCertificate> {
    const certificate: TrustCertificate = {
      id: crypto.randomBytes(16).toString('hex'),
      issuer,
      subject,
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      trustLevel: 'verified',
      claims,
      signature: {} as JWSSignature // Will be populated
    };
    
    // Sign the certificate
    const certData = {
      id: certificate.id,
      issuer: certificate.issuer,
      subject: certificate.subject,
      validFrom: certificate.validFrom,
      validTo: certificate.validTo,
      trustLevel: certificate.trustLevel,
      claims: certificate.claims
    };
    
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(JSON.stringify(certData));
    
    const key = typeof issuerPrivateKey === 'string'
      ? crypto.createPrivateKey(issuerPrivateKey)
      : issuerPrivateKey;
      
    const signature = signer.sign(key, 'base64');
    
    certificate.signature = {
      protected: Buffer.from(JSON.stringify({
        alg: 'RS256',
        kid: issuer,
        typ: 'A2A-CERT'
      })).toString('base64url'),
      signature
    };
    
    // Store in trust store
    const certificates = this.trustStore.get(subject) || [];
    certificates.push(certificate);
    this.trustStore.set(subject, certificates);
    
    return certificate;
  }

  /**
   * Verify trust certificate
   */
  async verifyTrustCertificate(
    certificate: TrustCertificate,
    issuerPublicKey: PublicKeyInfo
  ): Promise<boolean> {
    try {
      // Check validity period
      const now = new Date();
      const validFrom = new Date(certificate.validFrom);
      const validTo = new Date(certificate.validTo);
      
      if (now < validFrom || now > validTo) {
        return false;
      }
      
      // Verify signature
      const certData = {
        id: certificate.id,
        issuer: certificate.issuer,
        subject: certificate.subject,
        validFrom: certificate.validFrom,
        validTo: certificate.validTo,
        trustLevel: certificate.trustLevel,
        claims: certificate.claims
      };
      
      const publicKey = await this.loadPublicKey(issuerPublicKey);
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(JSON.stringify(certData));
      
      return verifier.verify(publicKey, certificate.signature.signature, 'base64');
    } catch (error) {
      logger.error('Certificate verification failed:', error);
      return false;
    }
  }

  /**
   * Get trust level for agent
   */
  getTrustLevel(agentDid: AgentDID): TrustCertificate['trustLevel'] | null {
    const certificates = this.trustStore.get(agentDid) || [];
    
    // Return highest trust level
    if (certificates.some(c => c.trustLevel === 'certified')) {
      return 'certified';
    }
    if (certificates.some(c => c.trustLevel === 'verified')) {
      return 'verified';
    }
    if (certificates.some(c => c.trustLevel === 'basic')) {
      return 'basic';
    }
    
    return null;
  }

  /**
   * Helper: Create signing input from message
   */
  private createSigningInput(message: A2AMessage): string {
    // Create canonical representation for signing
    const signingData = {
      '@context': message['@context'],
      '@type': message['@type'],
      id: message.id,
      timestamp: message.timestamp,
      from: message.from,
      to: message.to,
      body: message.body
    };
    
    return JSON.stringify(signingData);
  }

  /**
   * Helper: Load public key
   */
  private async loadPublicKey(publicKeyInfo: PublicKeyInfo): Promise<crypto.KeyObject> {
    const cacheKey = publicKeyInfo.id;
    
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey)!;
    }
    
    let key: crypto.KeyObject;
    
    if (publicKeyInfo.publicKeyPem) {
      key = crypto.createPublicKey(publicKeyInfo.publicKeyPem);
    } else if (publicKeyInfo.publicKeyJwk) {
      key = crypto.createPublicKey({
        key: publicKeyInfo.publicKeyJwk,
        format: 'jwk'
      });
    } else {
      throw new Error('No public key data available');
    }
    
    this.keyCache.set(cacheKey, key);
    return key;
  }

  /**
   * Helper: Get public key for agent
   */
  private async getPublicKey(agentDid: AgentDID): Promise<crypto.KeyObject | null> {
    // In a real implementation, this would query the discovery service
    // For now, return null (would need to be implemented with discovery service)
    return null;
  }

  /**
   * Clean up old nonces
   */
  private cleanupNonces(): void {
    // In a real implementation, nonces would have timestamps
    // For now, just clear if too many
    if (this.nonceStore.size > 10000) {
      this.nonceStore.clear();
    }
  }
}

export default A2ASecurityService;