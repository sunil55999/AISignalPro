/**
 * Parser Management Routes - Admin Panel
 * Handles parser file uploads, version control, and WebSocket broadcasting to desktop terminals
 */

import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { Request, Response } from 'express';

interface ParserDeployment {
  id: string;
  filename: string;
  originalName: string;
  fileHash: string;
  fileSize: number;
  version: string;
  deployTimestamp: Date;
  uploadedBy: string;
  status: 'uploaded' | 'broadcasting' | 'deployed' | 'failed';
  notifiedTerminals: string[];
  totalTerminals: number;
}

interface ConnectedTerminal {
  id: string;
  ws: WebSocket;
  lastSeen: Date;
  version: string;
}

// In-memory storage for deployments and connected terminals
const deployments: Map<string, ParserDeployment> = new Map();
const connectedTerminals: Map<string, ConnectedTerminal> = new Map();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'parsers');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const hash = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `parser_${timestamp}_${hash}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow Python files and archives
    const allowedTypes = ['.py', '.zip', '.tar.gz', '.tar', '.gz'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext) || file.mimetype.includes('python') || file.mimetype.includes('archive')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Python files and archives are allowed.'));
    }
  }
});

const router = express.Router();

/**
 * Calculate file hash for integrity verification
 */
function calculateFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Setup WebSocket server for terminal communication
 */
export function setupParserWebSocket(server: any): WebSocketServer {
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws/parser'
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const terminalId = url.searchParams.get('terminalId');
    const version = url.searchParams.get('version') || '1.0.0';

    if (!terminalId) {
      ws.close(1008, 'Terminal ID required');
      return;
    }

    // Register terminal
    connectedTerminals.set(terminalId, {
      id: terminalId,
      ws,
      lastSeen: new Date(),
      version
    });

    console.log(`Terminal ${terminalId} connected for parser updates`);

    // Handle messages from terminal
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'parser_update_ack') {
          // Terminal acknowledged parser update
          const deployment = deployments.get(message.deploymentId);
          if (deployment) {
            deployment.notifiedTerminals.push(terminalId);
            console.log(`Terminal ${terminalId} acknowledged parser update ${message.deploymentId}`);
          }
        } else if (message.type === 'parser_update_error') {
          // Terminal reported update error
          console.error(`Terminal ${terminalId} reported parser update error:`, message.error);
        } else if (message.type === 'heartbeat') {
          // Update last seen timestamp
          const terminal = connectedTerminals.get(terminalId);
          if (terminal) {
            terminal.lastSeen = new Date();
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      connectedTerminals.delete(terminalId);
      console.log(`Terminal ${terminalId} disconnected from parser updates`);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connection_established',
      terminalId,
      timestamp: new Date().toISOString()
    }));
  });

  return wss;
}

/**
 * Broadcast parser update to all connected terminals
 */
function broadcastParserUpdate(deployment: ParserDeployment) {
  const message = {
    type: 'parser_update',
    deploymentId: deployment.id,
    filename: deployment.filename,
    originalName: deployment.originalName,
    fileHash: deployment.fileHash,
    version: deployment.version,
    downloadUrl: `/api/parser/download/${deployment.id}`,
    timestamp: deployment.deployTimestamp.toISOString()
  };

  const messageStr = JSON.stringify(message);
  let broadcastCount = 0;

  connectedTerminals.forEach((terminal, terminalId) => {
    if (terminal.ws.readyState === WebSocket.OPEN) {
      terminal.ws.send(messageStr);
      broadcastCount++;
    } else {
      // Remove disconnected terminals
      connectedTerminals.delete(terminalId);
    }
  });

  deployment.totalTerminals = broadcastCount;
  deployment.status = broadcastCount > 0 ? 'broadcasting' : 'deployed';
  
  console.log(`Broadcasted parser update to ${broadcastCount} terminals`);
  return broadcastCount;
}

/**
 * POST /api/parser/push
 * Upload new parser file version and trigger broadcast
 */
router.post('/api/parser/push', upload.single('parserFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No parser file provided'
      });
    }

    const { version, description } = req.body;
    const uploadedBy = req.session?.user?.username || 'admin';

    // Calculate file hash
    const fileHash = calculateFileHash(req.file.path);

    // Create deployment record
    const deployment: ParserDeployment = {
      id: crypto.randomUUID(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileHash,
      fileSize: req.file.size,
      version: version || '1.0.0',
      deployTimestamp: new Date(),
      uploadedBy,
      status: 'uploaded',
      notifiedTerminals: [],
      totalTerminals: 0
    };

    // Store deployment record
    deployments.set(deployment.id, deployment);

    // Log to database
    try {
      const { storage } = await import('../../server/database.js');
      await storage.createParserDeployment({
        deploymentId: deployment.id,
        filename: deployment.filename,
        originalName: deployment.originalName,
        fileHash: deployment.fileHash,
        fileSize: deployment.fileSize,
        version: deployment.version,
        uploadedBy: deployment.uploadedBy,
        status: deployment.status,
        notifiedTerminals: deployment.notifiedTerminals,
        totalTerminals: deployment.totalTerminals,
        description: description || null
      });
      console.log('Parser deployment logged to database:', deployment.id);
    } catch (dbError) {
      console.error('Failed to log deployment to database:', dbError);
      // Continue with deployment even if DB logging fails
    }

    // Broadcast to connected terminals
    const broadcastCount = broadcastParserUpdate(deployment);

    res.json({
      success: true,
      deployment: {
        id: deployment.id,
        filename: deployment.originalName,
        fileHash: deployment.fileHash,
        version: deployment.version,
        deployTimestamp: deployment.deployTimestamp.toISOString(),
        broadcastCount,
        status: deployment.status
      },
      message: `Parser file uploaded and broadcasted to ${broadcastCount} terminals`
    });

  } catch (error) {
    console.error('Parser upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload parser file'
    });
  }
});

/**
 * GET /api/parser/deployments
 * Get list of all parser deployments
 */
router.get('/api/parser/deployments', (req: Request, res: Response) => {
  try {
    const deploymentList = Array.from(deployments.values())
      .sort((a, b) => b.deployTimestamp.getTime() - a.deployTimestamp.getTime())
      .map(deployment => ({
        ...deployment,
        deployTimestamp: deployment.deployTimestamp.toISOString()
      }));

    res.json({
      success: true,
      deployments: deploymentList,
      totalDeployments: deploymentList.length
    });
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployment history'
    });
  }
});

/**
 * GET /api/parser/download/:deploymentId
 * Download parser file for terminals
 */
router.get('/api/parser/download/:deploymentId', (req: Request, res: Response) => {
  try {
    const deploymentId = req.params.deploymentId;
    const deployment = deployments.get(deploymentId);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'parsers', deployment.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Parser file not found'
      });
    }

    // Verify file integrity
    const currentHash = calculateFileHash(filePath);
    if (currentHash !== deployment.fileHash) {
      return res.status(500).json({
        success: false,
        error: 'File integrity check failed'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${deployment.originalName}"`);
    res.setHeader('X-File-Hash', deployment.fileHash);
    res.setHeader('X-File-Version', deployment.version);

    // Stream file to client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading parser file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download parser file'
    });
  }
});

/**
 * GET /api/parser/terminals
 * Get list of connected terminals waiting for updates
 */
router.get('/api/parser/terminals', (req: Request, res: Response) => {
  try {
    const terminals = Array.from(connectedTerminals.values()).map(terminal => ({
      id: terminal.id,
      version: terminal.version,
      lastSeen: terminal.lastSeen.toISOString(),
      connected: terminal.ws.readyState === WebSocket.OPEN
    }));

    res.json({
      success: true,
      terminals,
      totalConnected: terminals.filter(t => t.connected).length
    });
  } catch (error) {
    console.error('Error fetching connected terminals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch terminal list'
    });
  }
});

/**
 * POST /api/parser/broadcast/:deploymentId
 * Re-broadcast existing deployment to terminals
 */
router.post('/api/parser/broadcast/:deploymentId', (req: Request, res: Response) => {
  try {
    const deploymentId = req.params.deploymentId;
    const deployment = deployments.get(deploymentId);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    // Reset notification tracking
    deployment.notifiedTerminals = [];
    
    // Re-broadcast to terminals
    const broadcastCount = broadcastParserUpdate(deployment);

    res.json({
      success: true,
      message: `Re-broadcasted to ${broadcastCount} terminals`,
      broadcastCount
    });

  } catch (error) {
    console.error('Error re-broadcasting deployment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to re-broadcast deployment'
    });
  }
});

/**
 * DELETE /api/parser/deployments/:deploymentId
 * Delete deployment and associated file
 */
router.delete('/api/parser/deployments/:deploymentId', (req: Request, res: Response) => {
  try {
    const deploymentId = req.params.deploymentId;
    const deployment = deployments.get(deploymentId);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    // Delete file
    const filePath = path.join(process.cwd(), 'uploads', 'parsers', deployment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from deployments
    deployments.delete(deploymentId);

    res.json({
      success: true,
      message: 'Deployment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting deployment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete deployment'
    });
  }
});

export default router;