import { Request, Response, NextFunction } from 'express';
import { storage } from '../database.js';
import { authManager, validateSyncAuth } from '../../shared/auth.js';

// Extend Express Request type to include user and apiKey info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
      };
      apiKey?: {
        id: number;
        userId: number;
        permissions: string[];
      };
      syncAuth?: {
        requestId: string;
        timestamp: number;
        nonce: string;
      };
    }
  }
}

/**
 * Middleware for JWT-based session authentication
 */
export const authenticateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check session first (for web dashboard)
    if (req.session?.user) {
      req.user = req.session.user;
      return next();
    }

    // Check JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authManager.extractBearerToken(authHeader);
      if (token) {
        try {
          const payload = authManager.verifyJWTToken(token);
          req.user = {
            id: payload.userId,
            username: payload.username,
            role: payload.role
          };
          return next();
        } catch (error) {
          console.error('JWT verification failed:', error);
        }
      }
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

/**
 * Middleware for API key-based sync authentication
 */
export const authenticateSync = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const method = req.method;
    const endpoint = req.path;
    
    // Validate sync authentication headers
    const validation = validateSyncAuth(req.headers as Record<string, string>, method, endpoint);
    
    if (!validation.isValid) {
      return res.status(401).json({
        success: false,
        error: validation.error || 'Invalid sync authentication'
      });
    }

    const { userId, apiKeyId } = validation;
    
    // Get API key from database
    const apiKey = await storage.getApiKeyById(apiKeyId!);
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key not found'
      });
    }

    // Check if API key is active
    if (!apiKey.isActive) {
      return res.status(401).json({
        success: false,
        error: 'API key is disabled'
      });
    }

    // Check expiration
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return res.status(401).json({
        success: false,
        error: 'API key has expired'
      });
    }

    // Verify API key hash
    const providedApiKey = authManager.extractApiKey(req.headers.authorization || '');
    if (!providedApiKey || !authManager.verifyApiKey(providedApiKey, apiKey.keyHash)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Check IP whitelist if configured
    if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
      const clientIP = req.ip || req.connection.remoteAddress;
      if (clientIP && !apiKey.ipWhitelist.includes(clientIP)) {
        return res.status(403).json({
          success: false,
          error: 'IP address not whitelisted'
        });
      }
    }

    // Update last used timestamp
    await storage.updateApiKeyLastUsed(apiKey.id);

    // Set request context
    req.user = {
      id: userId!,
      username: '',
      role: 'sync-client'
    };
    
    req.apiKey = {
      id: apiKey.id,
      userId: apiKey.userId!,
      permissions: apiKey.permissions || []
    };

    req.syncAuth = {
      requestId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: parseInt(req.headers['x-timestamp'] as string),
      nonce: req.headers['x-nonce'] as string
    };

    next();

  } catch (error) {
    console.error('Sync authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Sync authentication failed'
    });
  }
};

/**
 * Middleware to check specific permissions
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Admin users have all permissions
    if (req.user?.role === 'admin') {
      return next();
    }

    // Check API key permissions
    if (req.apiKey?.permissions?.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Permission '${permission}' required`
    });
  };
};

/**
 * Middleware to log sync requests
 */
export const logSyncRequest = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Capture original send method
  const originalSend = res.send;
  
  // Override send to capture response
  res.send = function(data: any) {
    const processingTime = Date.now() - startTime;
    
    // Log sync request if it's a sync operation
    if (req.syncAuth && req.apiKey) {
      storage.createSyncRequest({
        userId: req.user!.id,
        apiKeyId: req.apiKey.id,
        requestId: req.syncAuth.requestId,
        endpoint: req.path,
        method: req.method,
        timestamp: new Date(req.syncAuth.timestamp),
        nonce: req.syncAuth.nonce,
        signature: req.headers['x-signature'] as string,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        requestSize: req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0,
        responseStatus: res.statusCode,
        processingTime
      }).catch(error => {
        console.error('Failed to log sync request:', error);
      });
    }
    
    // Call original send method
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Rate limiting middleware for API keys
 */
export const rateLimitApiKey = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.apiKey) {
    return next();
  }

  try {
    // Get recent requests for this API key (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await storage.getSyncRequestsByApiKey(req.apiKey.id, 1000);
    
    const requestsLastHour = recentRequests.filter(r => 
      r.createdAt && r.createdAt > oneHourAgo
    ).length;

    // Get API key details for rate limit
    const apiKey = await storage.getApiKeyById(req.apiKey.id);
    const rateLimit = apiKey?.rateLimit || 1000;

    if (requestsLastHour >= rateLimit) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: 3600 // 1 hour in seconds
      });
    }

    next();

  } catch (error) {
    console.error('Rate limiting error:', error);
    next(); // Continue on error to avoid blocking legitimate requests
  }
};