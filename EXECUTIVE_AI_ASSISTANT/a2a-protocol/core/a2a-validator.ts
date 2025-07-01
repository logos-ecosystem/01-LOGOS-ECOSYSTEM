/**
 * A2A Message Validator - Validates messages according to A2A Protocol
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { A2AMessage, A2AMessageType } from '../interfaces/a2a-types';
import { logger } from '../utils/logger';

export class A2AMessageValidator {
  private ajv: Ajv;
  private messageSchema: object;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
    
    this.messageSchema = {
      type: 'object',
      required: ['@context', '@type', 'id', 'timestamp', 'version', 'from', 'to', 'body'],
      properties: {
        '@context': {
          oneOf: [
            { type: 'string', format: 'uri' },
            {
              type: 'array',
              items: { type: 'string', format: 'uri' },
              minItems: 1
            }
          ]
        },
        '@type': {
          type: 'string',
          enum: Object.values(A2AMessageType)
        },
        id: {
          type: 'string',
          pattern: '^[a-zA-Z0-9-_]+$'
        },
        timestamp: {
          type: 'string',
          format: 'date-time'
        },
        version: {
          type: 'string',
          const: '1.0'
        },
        from: {
          type: 'string',
          pattern: '^did:logos:[a-zA-Z0-9-_]+$'
        },
        to: {
          oneOf: [
            {
              type: 'string',
              pattern: '^did:logos:[a-zA-Z0-9-_]+$'
            },
            {
              type: 'array',
              items: {
                type: 'string',
                pattern: '^did:logos:[a-zA-Z0-9-_]+$'
              },
              minItems: 1
            }
          ]
        },
        replyTo: {
          type: 'string',
          pattern: '^did:logos:[a-zA-Z0-9-_]+$'
        },
        correlationId: {
          type: 'string',
          pattern: '^[a-zA-Z0-9-_]+$'
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high', 'urgent', 'critical']
        },
        ttl: {
          type: 'number',
          minimum: 0
        },
        requiresAck: {
          type: 'boolean'
        },
        headers: {
          type: 'object'
        },
        body: {
          // Body can be any type
        },
        attachments: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'mimeType', 'size'],
            properties: {
              id: { type: 'string' },
              mimeType: { type: 'string' },
              filename: { type: 'string' },
              size: { type: 'number', minimum: 0 },
              data: { type: 'string' },
              url: { type: 'string', format: 'uri' },
              hash: { type: 'string' }
            }
          }
        },
        signature: {
          type: 'object',
          required: ['protected', 'signature'],
          properties: {
            protected: { type: 'string' },
            signature: { type: 'string' },
            header: { type: 'object' }
          }
        },
        encryption: {
          type: 'object',
          required: ['protected', 'encrypted_key', 'iv', 'ciphertext', 'tag'],
          properties: {
            protected: { type: 'string' },
            encrypted_key: { type: 'string' },
            iv: { type: 'string' },
            ciphertext: { type: 'string' },
            tag: { type: 'string' }
          }
        }
      }
    };
    
    this.ajv.compile(this.messageSchema);
  }

  /**
   * Validate A2A message structure
   */
  async validateMessage(message: A2AMessage): Promise<void> {
    const validate = this.ajv.compile(this.messageSchema);
    const valid = validate(message);
    
    if (!valid) {
      const errors = validate.errors?.map(err => 
        `${err.instancePath} ${err.message}`
      ).join(', ');
      
      logger.error('Message validation failed:', errors);
      throw new Error(`Invalid message format: ${errors}`);
    }
    
    // Additional business logic validation
    await this.validateBusinessRules(message);
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(message: A2AMessage): Promise<void> {
    // Check timestamp is not too far in the past or future
    const messageTime = new Date(message.timestamp).getTime();
    const now = Date.now();
    const maxDrift = 5 * 60 * 1000; // 5 minutes
    
    if (Math.abs(now - messageTime) > maxDrift) {
      throw new Error('Message timestamp is outside acceptable range');
    }
    
    // Validate TTL if present
    if (message.ttl !== undefined) {
      if (message.ttl < 0 || message.ttl > 86400) { // Max 24 hours
        throw new Error('TTL must be between 0 and 86400 seconds');
      }
    }
    
    // Validate correlation ID references
    if (message.correlationId && message['@type'] === A2AMessageType.REQUEST) {
      throw new Error('Request messages should not have correlationId');
    }
    
    // Validate response messages have correlation ID
    if (message['@type'] === A2AMessageType.RESPONSE && !message.correlationId) {
      throw new Error('Response messages must have correlationId');
    }
    
    // Validate encrypted messages don't have plain body
    if (message.encryption && message.body !== null) {
      throw new Error('Encrypted messages should not have plain body');
    }
    
    // Validate attachment sizes
    if (message.attachments) {
      const totalSize = message.attachments.reduce((sum, att) => sum + att.size, 0);
      if (totalSize > 100 * 1024 * 1024) { // 100MB limit
        throw new Error('Total attachment size exceeds 100MB limit');
      }
    }
  }

  /**
   * Validate agent DID format
   */
  validateAgentDID(did: string): boolean {
    const pattern = /^did:logos:[a-zA-Z0-9-_]+$/;
    return pattern.test(did);
  }

  /**
   * Validate capability schema
   */
  validateCapabilityInput(input: any, schema: object): boolean {
    const validate = this.ajv.compile(schema);
    return validate(input);
  }
}

export default A2AMessageValidator;