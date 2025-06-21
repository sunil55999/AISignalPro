/**
 * Terminal Management Routes - Admin Panel
 * Handles terminal status tracking, MT5 connections, and stealth mode monitoring
 */

import express from 'express';
import { Request, Response } from 'express';

interface TerminalData {
  id: string;
  name: string;
  lastPing: Date;
  mt5AccountId?: number;
  mt5Connected: boolean;
  stealthMode: boolean;
  retryQueueSize: number;
  ipAddress: string;
  version: string;
  status: 'online' | 'offline' | 'warning';
  errorCount24h: number;
  totalSignalsToday: number;
  activeTrades: number;
  balance?: number;
  equity?: number;
  marginFree?: number;
}

// In-memory storage for terminal data (replace with database in production)
const terminals: Map<string, TerminalData> = new Map();

// Initialize with sample data for demonstration
function initializeSampleTerminals() {
  const sampleTerminals: TerminalData[] = [
    {
      id: 'terminal-001',
      name: 'Desktop Terminal Alpha',
      lastPing: new Date(Date.now() - 30000), // 30 seconds ago
      mt5AccountId: 123456789,
      mt5Connected: true,
      stealthMode: true,
      retryQueueSize: 2,
      ipAddress: '192.168.1.100',
      version: '2.1.4',
      status: 'online',
      errorCount24h: 1,
      totalSignalsToday: 15,
      activeTrades: 3,
      balance: 10000.50,
      equity: 10125.30,
      marginFree: 8500.00
    },
    {
      id: 'terminal-002',
      name: 'VPS Terminal Beta',
      lastPing: new Date(Date.now() - 120000), // 2 minutes ago
      mt5AccountId: 987654321,
      mt5Connected: true,
      stealthMode: false,
      retryQueueSize: 0,
      ipAddress: '10.0.1.55',
      version: '2.1.3',
      status: 'warning',
      errorCount24h: 5,
      totalSignalsToday: 8,
      activeTrades: 1,
      balance: 5000.00,
      equity: 4980.25,
      marginFree: 4200.10
    },
    {
      id: 'terminal-003',
      name: 'Backup Terminal Gamma',
      lastPing: new Date(Date.now() - 600000), // 10 minutes ago
      mt5AccountId: undefined,
      mt5Connected: false,
      stealthMode: true,
      retryQueueSize: 7,
      ipAddress: '172.16.0.10',
      version: '2.0.8',
      status: 'offline',
      errorCount24h: 0,
      totalSignalsToday: 0,
      activeTrades: 0
    }
  ];

  sampleTerminals.forEach(terminal => {
    terminals.set(terminal.id, terminal);
  });
}

// Initialize sample data on module load
initializeSampleTerminals();

const router = express.Router();

/**
 * GET /api/terminals
 * Returns list of all active terminals with their status information
 */
router.get('/api/terminals', (req: Request, res: Response) => {
  try {
    const now = new Date();
    const terminalList = Array.from(terminals.values()).map(terminal => {
      // Calculate time since last ping
      const timeSinceLastPing = now.getTime() - terminal.lastPing.getTime();
      const minutesSinceLastPing = Math.floor(timeSinceLastPing / 60000);
      
      // Determine status based on last ping
      let status: 'online' | 'offline' | 'warning' = 'offline';
      if (timeSinceLastPing < 60000) { // Less than 1 minute
        status = 'online';
      } else if (timeSinceLastPing < 300000) { // Less than 5 minutes
        status = 'warning';
      }

      return {
        ...terminal,
        status,
        minutesSinceLastPing,
        lastPingFormatted: terminal.lastPing.toISOString()
      };
    });

    // Sort by last ping (most recent first)
    terminalList.sort((a, b) => b.lastPing.getTime() - a.lastPing.getTime());

    res.json({
      success: true,
      terminals: terminalList,
      totalTerminals: terminalList.length,
      onlineTerminals: terminalList.filter(t => t.status === 'online').length,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error fetching terminals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch terminal data'
    });
  }
});

/**
 * POST /api/terminals/:id/ping
 * Update terminal status with ping data
 */
router.post('/api/terminals/:id/ping', (req: Request, res: Response) => {
  try {
    const terminalId = req.params.id;
    const {
      mt5AccountId,
      mt5Connected,
      stealthMode,
      retryQueueSize,
      errorCount24h,
      totalSignalsToday,
      activeTrades,
      balance,
      equity,
      marginFree,
      version
    } = req.body;

    let terminal = terminals.get(terminalId);
    
    if (!terminal) {
      // Create new terminal if it doesn't exist
      terminal = {
        id: terminalId,
        name: `Terminal ${terminalId}`,
        lastPing: new Date(),
        mt5Connected: false,
        stealthMode: false,
        retryQueueSize: 0,
        ipAddress: req.ip || 'unknown',
        version: '1.0.0',
        status: 'online',
        errorCount24h: 0,
        totalSignalsToday: 0,
        activeTrades: 0
      };
    }

    // Update terminal data
    terminal.lastPing = new Date();
    terminal.mt5AccountId = mt5AccountId;
    terminal.mt5Connected = mt5Connected || false;
    terminal.stealthMode = stealthMode || false;
    terminal.retryQueueSize = retryQueueSize || 0;
    terminal.errorCount24h = errorCount24h || 0;
    terminal.totalSignalsToday = totalSignalsToday || 0;
    terminal.activeTrades = activeTrades || 0;
    terminal.balance = balance;
    terminal.equity = equity;
    terminal.marginFree = marginFree;
    terminal.version = version || terminal.version;
    terminal.status = 'online';

    terminals.set(terminalId, terminal);

    res.json({
      success: true,
      message: 'Terminal status updated',
      terminal: {
        id: terminal.id,
        lastPing: terminal.lastPing.toISOString(),
        status: terminal.status
      }
    });

  } catch (error) {
    console.error('Error updating terminal ping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update terminal status'
    });
  }
});

/**
 * GET /api/terminals/:id
 * Get detailed information for a specific terminal
 */
router.get('/api/terminals/:id', (req: Request, res: Response) => {
  try {
    const terminalId = req.params.id;
    const terminal = terminals.get(terminalId);

    if (!terminal) {
      return res.status(404).json({
        success: false,
        error: 'Terminal not found'
      });
    }

    const now = new Date();
    const timeSinceLastPing = now.getTime() - terminal.lastPing.getTime();
    
    res.json({
      success: true,
      terminal: {
        ...terminal,
        minutesSinceLastPing: Math.floor(timeSinceLastPing / 60000),
        lastPingFormatted: terminal.lastPing.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching terminal details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch terminal details'
    });
  }
});

/**
 * DELETE /api/terminals/:id
 * Remove a terminal from tracking (admin only)
 */
router.delete('/api/terminals/:id', (req: Request, res: Response) => {
  try {
    const terminalId = req.params.id;
    
    if (terminals.has(terminalId)) {
      terminals.delete(terminalId);
      res.json({
        success: true,
        message: 'Terminal removed from tracking'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Terminal not found'
      });
    }

  } catch (error) {
    console.error('Error removing terminal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove terminal'
    });
  }
});

/**
 * GET /api/terminals/stats/summary
 * Get summary statistics for all terminals
 */
router.get('/api/terminals/stats/summary', (req: Request, res: Response) => {
  try {
    const terminalList = Array.from(terminals.values());
    const now = new Date();
    
    const stats = {
      totalTerminals: terminalList.length,
      onlineTerminals: 0,
      warningTerminals: 0,
      offlineTerminals: 0,
      totalMT5Accounts: 0,
      connectedMT5: 0,
      stealthModeActive: 0,
      totalRetryQueue: 0,
      totalSignalsToday: 0,
      totalActiveTrades: 0,
      totalErrors24h: 0,
      totalBalance: 0,
      totalEquity: 0
    };

    terminalList.forEach(terminal => {
      const timeSinceLastPing = now.getTime() - terminal.lastPing.getTime();
      
      if (timeSinceLastPing < 60000) {
        stats.onlineTerminals++;
      } else if (timeSinceLastPing < 300000) {
        stats.warningTerminals++;
      } else {
        stats.offlineTerminals++;
      }

      if (terminal.mt5AccountId) stats.totalMT5Accounts++;
      if (terminal.mt5Connected) stats.connectedMT5++;
      if (terminal.stealthMode) stats.stealthModeActive++;
      
      stats.totalRetryQueue += terminal.retryQueueSize;
      stats.totalSignalsToday += terminal.totalSignalsToday;
      stats.totalActiveTrades += terminal.activeTrades;
      stats.totalErrors24h += terminal.errorCount24h;
      
      if (terminal.balance) stats.totalBalance += terminal.balance;
      if (terminal.equity) stats.totalEquity += terminal.equity;
    });

    res.json({
      success: true,
      stats,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error fetching terminal stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch terminal statistics'
    });
  }
});

export default router;