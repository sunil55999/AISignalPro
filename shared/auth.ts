import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getConfig } from './config.js';

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  apiKeyId?: number;
  permissions?: string[];
  iat: number;
  exp: number;
}

export interface SyncAuthPayload {
  userId: number;
  apiKeyId: number;
  timestamp: number;
  nonce: string;
  endpoint: string;
  method: string;
}

export class AuthManager {
  private jwtSecret: string;
  private hmacSecret: string;

  constructor() {
    const securityConfig = getConfig('security');
    this.jwtSecret = process.env.JWT_SECRET || 'ai-trading-signal-parser-jwt-secret-2025';
    this.hmacSecret = process.env.HMAC_SECRET || 'ai-trading-signal-parser-hmac-secret-2025';
  }

  /**
   * Generate JWT token for user session
   */
  generateJWTToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const securityConfig = getConfig('security');
    
    return jwt.sign(
      payload,
      this.jwtSecret,
      {
        expiresIn: securityConfig.jwt_expires_in,
        issuer: 'ai-trading-system',
        audience: 'admin-panel'
      }
    );
  }

  /**
   * Verify JWT token
   */
  verifyJWTToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'ai-trading-system',
        audience: 'admin-panel'
      }) as JWTPayload;
    } catch (error) {
      throw new Error(`Invalid JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate API key for sync operations
   */
  generateApiKey(length: number = 32): { key: string; hash: string; prefix: string } {
    const key = crypto.randomBytes(length).toString('hex');
    const hash = this.hashApiKey(key);
    const prefix = key.substring(0, 8);
    
    return { key, hash, prefix };
  }

  /**
   * Hash API key for storage
   */
  hashApiKey(key: string): string {
    return crypto.createHmac('sha256', this.hmacSecret).update(key).digest('hex');
  }

  /**
   * Verify API key hash
   */
  verifyApiKey(key: string, storedHash: string): boolean {
    const computedHash = this.hashApiKey(key);
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash));
  }

  /**
   * Generate HMAC signature for sync requests
   */
  generateHMACSignature(payload: SyncAuthPayload, apiKey: string): string {
    const data = `${payload.method}|${payload.endpoint}|${payload.timestamp}|${payload.nonce}|${payload.userId}`;
    return crypto.createHmac('sha256', apiKey).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHMACSignature(
    payload: SyncAuthPayload,
    signature: string,
    apiKey: string
  ): boolean {
    const expectedSignature = this.generateHMACSignature(payload, apiKey);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Generate nonce for request uniqueness
   */
  generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Validate timestamp (within 5 minutes)
   */
  validateTimestamp(timestamp: number, maxAgeMs: number = 5 * 60 * 1000): boolean {
    const now = Date.now();
    const age = Math.abs(now - timestamp);
    return age <= maxAgeMs;
  }

  /**
   * Extract bearer token from authorization header
   */
  extractBearerToken(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Extract API key from authorization header
   */
  extractApiKey(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('ApiKey ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Create authentication headers for desktop client
   */
  createSyncAuthHeaders(
    userId: number,
    apiKeyId: number,
    apiKey: string,
    method: string,
    endpoint: string
  ): Record<string, string> {
    const timestamp = Date.now();
    const nonce = this.generateNonce();
    
    const payload: SyncAuthPayload = {
      userId,
      apiKeyId,
      timestamp,
      nonce,
      endpoint,
      method
    };

    const signature = this.generateHMACSignature(payload, apiKey);

    return {
      'Authorization': `ApiKey ${apiKey}`,
      'X-Timestamp': timestamp.toString(),
      'X-Nonce': nonce,
      'X-User-ID': userId.toString(),
      'X-API-Key-ID': apiKeyId.toString(),
      'X-Signature': signature,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Validate complete sync request authentication
   */
  validateSyncAuth(headers: Record<string, string>, method: string, endpoint: string): {
    isValid: boolean;
    userId?: number;
    apiKeyId?: number;
    error?: string;
  } {
    try {
      // Extract required headers
      const apiKey = this.extractApiKey(headers.authorization || '');
      const timestamp = parseInt(headers['x-timestamp'] || '0');
      const nonce = headers['x-nonce'];
      const userId = parseInt(headers['x-user-id'] || '0');
      const apiKeyId = parseInt(headers['x-api-key-id'] || '0');
      const signature = headers['x-signature'];

      if (!apiKey || !timestamp || !nonce || !userId || !apiKeyId || !signature) {
        return { isValid: false, error: 'Missing required authentication headers' };
      }

      // Validate timestamp
      if (!this.validateTimestamp(timestamp)) {
        return { isValid: false, error: 'Request timestamp expired or invalid' };
      }

      // Create payload for signature verification
      const payload: SyncAuthPayload = {
        userId,
        apiKeyId,
        timestamp,
        nonce,
        endpoint,
        method
      };

      // Verify HMAC signature (API key verification happens in middleware)
      if (!this.verifyHMACSignature(payload, signature, apiKey)) {
        return { isValid: false, error: 'Invalid HMAC signature' };
      }

      return { isValid: true, userId, apiKeyId };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Authentication validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

// Export singleton instance
export const authManager = new AuthManager();

// Export convenience functions
export const generateJWTToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>) => 
  authManager.generateJWTToken(payload);

export const verifyJWTToken = (token: string) => 
  authManager.verifyJWTToken(token);

export const generateApiKey = (length?: number) => 
  authManager.generateApiKey(length);

export const createSyncAuthHeaders = (
  userId: number,
  apiKeyId: number,
  apiKey: string,
  method: string,
  endpoint: string
) => authManager.createSyncAuthHeaders(userId, apiKeyId, apiKey, method, endpoint);

export const validateSyncAuth = (headers: Record<string, string>, method: string, endpoint: string) =>
  authManager.validateSyncAuth(headers, method, endpoint);