import express, { type Express } from "express";
import { type Server } from "http";
import { storage } from "./database.js";
import { fallbackStorage } from "./fallback-storage.js";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

// Advanced Signal Parser Class
class AdvancedSignalParser {
  private processedSignals = new Set<string>(); // Signal deduplication
  private globalMinConfidence = 0.85; // Global confidence threshold

  private tradingPairs = [
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD",
    "EURJPY", "EURGBP", "GBPJPY", "AUDJPY", "NZDJPY", "XAUUSD", "GOLD",
    "XAGUSD", "SILVER", "BTCUSD", "ETHUSD", "US30", "SPX500", "NAS100"
  ];

  private actionWords = {
    buy: ["buy", "long", "bullish", "call", "上涨", "买入"],
    sell: ["sell", "short", "bearish", "put", "下跌", "卖出"]
  };

  private intentPatterns = {
    trade: /(?:buy|sell|long|short|bullish|bearish)/i,
    modify: /(?:move|set|adjust|update|change).*(?:sl|stop|tp|target)/i,
    close: /(?:close|exit|take profit|stop loss hit)/i
  };

  async parseSignal(rawText: string, source: 'text' | 'ocr' = 'text', channelId?: number): Promise<any> {
    const signalHash = this.createSignalHash(rawText, channelId);
    
    if (this.processedSignals.has(signalHash)) {
      return { error: "Signal already processed", duplicate: true };
    }

    // Check manual rules first if channelId provided
    if (channelId) {
      const manualResult = await this.checkManualRules(rawText, channelId);
      if (manualResult && manualResult.confidence >= this.globalMinConfidence) {
        this.markSignalProcessed(signalHash);
        return manualResult;
      }
    }

    const pair = this.extractTradingPair(rawText);
    const action = this.extractAction(rawText);
    const entry = this.extractPrice(rawText, ["entry", "at", "@", "price"]);
    const sl = this.extractPrice(rawText, ["sl", "stop loss", "stop"]);
    const tp = this.extractTakeProfits(rawText);
    const intent = this.determineIntent(rawText);
    const orderType = this.determineOrderType(rawText);
    const modifications = this.extractModifications(rawText);
    const slIncrease = this.extractSlIncrease(rawText);
    const volumePercent = this.extractVolumePercent(rawText);

    const confidence = this.calculateConfidence(pair, action, entry, sl, tp, rawText);
    
    if (!this.meetsConfidenceThreshold(confidence)) {
      return { error: "Signal confidence below threshold", confidence, threshold: this.globalMinConfidence };
    }

    this.markSignalProcessed(signalHash);

    return {
      pair,
      action,
      entry,
      sl,
      tp,
      intent,
      orderType,
      confidence,
      modifications,
      slIncrease,
      volumePercent,
      source,
      channelId,
      rawText,
      timestamp: new Date().toISOString()
    };
  }

  private async checkManualRules(text: string, channelId: number): Promise<any> {
    try {
      const rules = await storage.getActiveManualRules();
      const channelRules = rules.filter(rule => rule.channelId === channelId);
      
      for (const rule of channelRules) {
        const regex = new RegExp(rule.pattern, 'gi');
        if (regex.test(text)) {
          await storage.incrementRuleUsage(rule.id);
          return {
            pair: rule.defaultPair,
            action: rule.defaultAction,
            entry: rule.defaultEntry,
            sl: rule.defaultSl,
            tp: rule.defaultTp ? [rule.defaultTp] : [],
            confidence: 0.95,
            source: 'manual_rule',
            ruleId: rule.id
          };
        }
      }
    } catch (error) {
      console.error('Manual rules check failed:', error);
    }
    return null;
  }

  private extractTradingPair(text: string): string | null {
    const upperText = text.toUpperCase();
    for (const pair of this.tradingPairs) {
      if (upperText.includes(pair)) {
        return pair;
      }
    }
    return null;
  }

  private extractAction(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    for (const [action, words] of Object.entries(this.actionWords)) {
      for (const word of words) {
        if (lowerText.includes(word)) {
          return action;
        }
      }
    }
    return null;
  }

  private extractPrice(text: string, indicators: string[]): number | null {
    for (const indicator of indicators) {
      const regex = new RegExp(`${indicator}[:\\s@]*([0-9]+\\.?[0-9]*)`, 'gi');
      const match = text.match(regex);
      if (match) {
        const price = parseFloat(match[0].replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) return price;
      }
    }
    return null;
  }

  private extractTakeProfits(text: string): number[] {
    const tpRegex = /tp[:\s]*([0-9]+\.?[0-9]*)[,\s]*([0-9]+\.?[0-9]*)?[,\s]*([0-9]+\.?[0-9]*)?/gi;
    const matches = text.match(tpRegex);
    
    if (!matches) return [];
    
    const tps: number[] = [];
    for (const match of matches) {
      const numbers = match.match(/[0-9]+\.?[0-9]*/g);
      if (numbers) {
        tps.push(...numbers.map(n => parseFloat(n)).filter(n => !isNaN(n)));
      }
    }
    
    return tps;
  }

  private determineIntent(text: string): string {
    for (const [intent, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(text)) {
        return intent;
      }
    }
    return 'trade';
  }

  private determineOrderType(text: string): string {
    if (/pending|limit|stop/i.test(text)) return 'pending';
    if (/market|now|immediately/i.test(text)) return 'market';
    return 'market';
  }

  private extractModifications(text: string): any {
    const modifications: any = {};
    
    if (/move.*sl.*be|sl.*be/i.test(text)) {
      modifications.moveSlToBreakeven = true;
    }
    
    if (/close.*50%|50%.*close/i.test(text)) {
      modifications.partialClose = 50;
    }
    
    return modifications;
  }

  private extractSlIncrease(text: string): number | null {
    const slIncreaseRegex = /sl.*\+([0-9]+)/i;
    const match = text.match(slIncreaseRegex);
    return match ? parseFloat(match[1]) : null;
  }

  private extractVolumePercent(text: string): number | null {
    const volumeRegex = /([0-9]+)%.*volume|volume.*([0-9]+)%/i;
    const match = text.match(volumeRegex);
    return match ? parseFloat(match[1] || match[2]) : null;
  }

  private createSignalHash(rawText: string, channelId?: number): string {
    const hashInput = `${rawText.trim()}-${channelId || 'unknown'}-${Date.now()}`;
    return createHash('md5').update(hashInput).digest('hex');
  }

  private markSignalProcessed(signalHash: string): void {
    this.processedSignals.add(signalHash);
  }

  private meetsConfidenceThreshold(confidence: number): boolean {
    return confidence >= this.globalMinConfidence;
  }

  private calculateConfidence(pair: string | null, action: string | null, entry: number | null, sl: number | null, tp: number[], text: string): number {
    let confidence = 0;
    
    if (pair) confidence += 0.3;
    if (action) confidence += 0.3;
    if (entry) confidence += 0.2;
    if (sl) confidence += 0.1;
    if (tp.length > 0) confidence += 0.1;
    
    // Bonus for clear signal structure
    if (text.includes('@') || text.includes(':')) confidence += 0.05;
    if (/\d+\.\d+/.test(text)) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }
}

// Trade Dispatcher Class
class TradeDispatcher {
  private mt5OutputPath = "./mt5_signals.json";
  private userSignalPaths = new Map<number, string>();

  constructor() {
    // Initialize user-specific signal paths
    this.userSignalPaths.set(1, "C:\\TradingSignals\\user1.json");
  }

  async dispatchTrade(signal: any, userSettings: any): Promise<any> {
    const trade = this.applyRiskManagement(signal, userSettings);
    
    if (!trade) {
      return { error: "Trade rejected by risk management" };
    }

    // Output to MT5
    await this.outputToMT5(trade);
    
    // Output to user-specific path if configured
    if (userSettings.userId) {
      await this.outputToUserSpecificPath(trade, userSettings.userId);
    }

    return { success: true, trade };
  }

  private applyRiskManagement(signal: any, userSettings: any): any | null {
    const { maxLot = 0.1, riskPercent = 2.0, minConfidence = 0.85 } = userSettings;
    
    if (signal.confidence < minConfidence) {
      return null;
    }

    const pipValue = this.getPipValue(signal.pair);
    const riskAmount = (userSettings.accountBalance || 10000) * (riskPercent / 100);
    const pipRisk = Math.abs(signal.entry - signal.sl) / pipValue;
    
    let lotSize = riskAmount / (pipRisk * 10);
    lotSize = Math.min(lotSize, maxLot);
    lotSize = Math.max(lotSize, 0.01);

    return {
      ...signal,
      lotSize: parseFloat(lotSize.toFixed(2)),
      riskAmount,
      pipRisk,
      timestamp: new Date().toISOString()
    };
  }

  private getPipValue(pair: string): number {
    const pipValues: { [key: string]: number } = {
      "EURUSD": 0.0001, "GBPUSD": 0.0001, "USDJPY": 0.01,
      "USDCHF": 0.0001, "USDCAD": 0.0001, "AUDUSD": 0.0001,
      "NZDUSD": 0.0001, "XAUUSD": 0.01, "GOLD": 0.01
    };
    return pipValues[pair] || 0.0001;
  }

  private async outputToMT5(trade: any): Promise<void> {
    try {
      await fs.promises.writeFile(this.mt5OutputPath, JSON.stringify(trade, null, 2));
    } catch (error) {
      console.error('Failed to output to MT5:', error);
    }
  }

  private async outputToUserSpecificPath(trade: any, userId: number): Promise<void> {
    const userPath = this.userSignalPaths.get(userId);
    if (userPath) {
      try {
        // Ensure directory exists
        const dir = path.dirname(userPath);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(userPath, JSON.stringify(trade, null, 2));
      } catch (error) {
        console.error(`Failed to output to user path ${userPath}:`, error);
      }
    }
  }
}

export async function registerRoutes(app: Express): Promise<Express> {
  const signalParser = new AdvancedSignalParser();
  const tradeDispatcher = new TradeDispatcher();

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session?.user) {
      next();
    } else {
      res.status(401).json({ error: "Authentication required" });
    }
  };

  // Core signal parsing endpoint
  app.post("/api/parse-signal", async (req, res) => {
    try {
      const { rawText, channelId, source = 'text' } = req.body;
      
      if (!rawText) {
        return res.status(400).json({ error: "Raw text is required" });
      }

      const result = await signalParser.parseSignal(rawText, source, channelId);
      
      if (result.error) {
        return res.status(400).json(result);
      }

      // Store parsed signal
      await storage.createSignal({
        rawText,
        pair: result.pair,
        action: result.action,
        entry: result.entry,
        sl: result.sl,
        tp: result.tp,
        confidence: result.confidence,
        intent: result.intent,
        channelId: channelId || null,
        userId: req.session?.user?.id || 1,
        status: 'parsed'
      });

      res.json(result);
    } catch (error) {
      console.error('Signal parsing error:', error);
      res.status(500).json({ error: "Signal parsing failed" });
    }
  });

  // MT5 manual dispatch endpoint
  app.post("/api/mt5/manual-dispatch", async (req, res) => {
    try {
      const { signal, userSettings } = req.body;
      
      const result = await tradeDispatcher.dispatchTrade(signal, userSettings);
      
      if (result.error) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('MT5 dispatch error:', error);
      res.status(500).json({ error: "MT5 dispatch failed" });
    }
  });

  // System status endpoint
  app.get("/api/mt5/status", async (req, res) => {
    try {
      const health = await storage.healthCheck();
      res.json({
        status: "operational",
        database: health ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "System status check failed" });
    }
  });

  // Statistics endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const signals = await storage.getSignals();
      const trades = await storage.getTrades();
      
      res.json({
        totalSignals: signals.length,
        totalTrades: trades.length,
        averageConfidence: signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length || 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Statistics fetch failed" });
    }
  });

  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    
    // Simple authentication - in production, use proper hashing
    if (username === "admin" && password === "admin123") {
      req.session.user = { id: 1, username: "admin", role: "admin" };
      res.json({ success: true, user: req.session.user });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: "Logout failed" });
      } else {
        res.json({ success: true });
      }
    });
  });

  app.get("/api/auth/check", (req, res) => {
    if (req.session?.user) {
      res.json({ authenticated: true, user: req.session.user });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Admin endpoints (require authentication)
  app.get("/api/admin/channels", requireAuth, async (req, res) => {
    try {
      const channels = await storage.getChannels();
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  app.post("/api/admin/channels", requireAuth, async (req, res) => {
    try {
      const channel = await storage.createChannel(req.body);
      res.json(channel);
    } catch (error) {
      res.status(500).json({ error: "Failed to create channel" });
    }
  });

  // Strategy management endpoints
  app.post("/api/strategy/update", requireAuth, async (req, res) => {
    try {
      const strategyData = req.body;
      
      // Validate strategy data
      if (!strategyData.name || !strategyData.rules) {
        return res.status(400).json({ error: "Invalid strategy data" });
      }
      
      // Store strategy configuration
      const strategyJson = JSON.stringify(strategyData);
      
      // Store in database for persistence
      await storage.createManualRule({
        name: strategyData.name,
        description: `Visual strategy: ${strategyData.rules.length} rules, ${strategyData.connections?.length || 0} connections`,
        conditionType: 'visual_strategy',
        conditionValue: strategyJson,
        actionType: 'execute_strategy',
        actionValue: 'strategy_runtime',
        isActive: true,
        priority: 1,
        usageCount: 0,
        userId: req.session?.user?.id || 1
      });
      
      console.log('Strategy updated:', strategyData.name);
      console.log('Rules count:', strategyData.rules.length);
      console.log('Connections count:', strategyData.connections?.length || 0);
      
      res.json({ 
        success: true, 
        message: "Strategy updated successfully",
        strategyId: `strategy_${Date.now()}`
      });
    } catch (error) {
      console.error('Strategy update error:', error);
      res.status(500).json({ error: "Failed to update strategy" });
    }
  });

  // Strategy execution endpoint for testing
  app.post("/api/strategy/execute", async (req, res) => {
    try {
      const { parsedSignal, userStrategy } = req.body;
      
      if (!parsedSignal || !userStrategy) {
        return res.status(400).json({ error: "Missing parsedSignal or userStrategy" });
      }
      
      // Mock strategy execution result
      const result = {
        original_signal: parsedSignal,
        strategy_applied: userStrategy.name,
        modified_payload: {
          ...parsedSignal,
          modified_by_strategy: true,
          execution_allowed: parsedSignal.confidence >= 0.7,
          strategy_actions: parsedSignal.confidence < 0.7 ? ['trade_skipped'] : ['trade_allowed']
        },
        execution_summary: {
          rules_executed: userStrategy.rules?.length || 0,
          execution_time: new Date().toISOString()
        }
      };
      
      res.json(result);
    } catch (error) {
      console.error('Strategy execution error:', error);
      res.status(500).json({ error: "Failed to execute strategy" });
    }
  });

  app.get("/api/admin/strategy-config", requireAuth, async (req, res) => {
    try {
      // Return default strategy configuration for auto_sync.py
      const defaultConfig = {
        max_lot_size: 1.0,
        risk_percent: 2.0,
        enabled_pairs: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
        disabled_pairs: ["AUDNZD", "NZDCAD"],
        stealth_mode: true,
        auto_trade: true,
        confidence_threshold: 0.85,
        max_daily_trades: 10,
        trading_hours: {
          start: "08:00",
          end: "18:00",
          timezone: "UTC"
        },
        symbol_mapping: {
          "GOLD": "XAUUSD",
          "SILVER": "XAGUSD"
        }
      };
      
      res.json(defaultConfig);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch strategy config" });
    }
  });

  app.get("/api/admin/symbol-mapping", requireAuth, async (req, res) => {
    try {
      const symbolMapping = {
        "GOLD": "XAUUSD",
        "SILVER": "XAGUSD",
        "US30": "US30.cash",
        "NAS100": "NAS100.cash",
        "SPX500": "SPX500.cash"
      };
      
      res.json(symbolMapping);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch symbol mapping" });
    }
  });

  app.get("/api/admin/stealth-config", requireAuth, async (req, res) => {
    try {
      const stealthConfig = {
        enabled: true,
        delay_range: [1000, 3000],
        randomize_lots: true,
        max_concurrent_trades: 5,
        hide_from_history: false
      };
      
      res.json(stealthConfig);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stealth config" });
    }
  });

  app.get("/api/admin/lot-settings", requireAuth, async (req, res) => {
    try {
      const lotSettings = {
        default_lot: 0.1,
        max_lot: 1.0,
        min_lot: 0.01,
        risk_based: true,
        account_percentage: 2.0
      };
      
      res.json(lotSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lot settings" });
    }
  });

  app.post("/api/system/status", async (req, res) => {
    try {
      const statusData = req.body;
      
      // Log the received system status
      console.log('System status received:', {
        mt5_connected: statusData.mt5_connected,
        parser_health: statusData.parser_health,
        error_count_24h: statusData.error_count_24h,
        active_trades: statusData.active_trades,
        timestamp: statusData.timestamp
      });
      
      res.json({ success: true, message: "Status received" });
    } catch (error) {
      console.error('System status error:', error);
      res.status(500).json({ error: "Failed to process system status" });
    }
  });

  // Terminal management endpoints
  app.get("/api/terminals", async (req, res) => {
    try {
      // Mock terminal data for demonstration
      const terminals = [
        {
          id: 'terminal-001',
          name: 'Desktop Terminal Alpha',
          lastPing: new Date(Date.now() - 30000),
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
          marginFree: 8500.00,
          minutesSinceLastPing: 0,
          lastPingFormatted: new Date(Date.now() - 30000).toISOString()
        },
        {
          id: 'terminal-002',
          name: 'VPS Terminal Beta',
          lastPing: new Date(Date.now() - 120000),
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
          marginFree: 4200.10,
          minutesSinceLastPing: 2,
          lastPingFormatted: new Date(Date.now() - 120000).toISOString()
        },
        {
          id: 'terminal-003',
          name: 'Backup Terminal Gamma',
          lastPing: new Date(Date.now() - 600000),
          mt5Connected: false,
          stealthMode: true,
          retryQueueSize: 7,
          ipAddress: '172.16.0.10',
          version: '2.0.8',
          status: 'offline',
          errorCount24h: 0,
          totalSignalsToday: 0,
          activeTrades: 0,
          minutesSinceLastPing: 10,
          lastPingFormatted: new Date(Date.now() - 600000).toISOString()
        }
      ];

      res.json({
        success: true,
        terminals,
        totalTerminals: terminals.length,
        onlineTerminals: terminals.filter(t => t.status === 'online').length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch terminals" });
    }
  });

  app.get("/api/terminals/stats/summary", async (req, res) => {
    try {
      const stats = {
        totalTerminals: 3,
        onlineTerminals: 1,
        warningTerminals: 1,
        offlineTerminals: 1,
        totalMT5Accounts: 2,
        connectedMT5: 2,
        stealthModeActive: 2,
        totalRetryQueue: 9,
        totalSignalsToday: 23,
        totalActiveTrades: 4,
        totalErrors24h: 6,
        totalBalance: 15000.50,
        totalEquity: 15105.55
      };

      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch terminal stats" });
    }
  });

  // Parser management endpoints
  app.post("/api/parser/push", async (req, res) => {
    try {
      // Mock parser file upload and broadcast
      const { version = "2.1.5", description = "Parser update" } = req.body;
      
      const deployment = {
        id: `deploy_${Date.now()}`,
        filename: `parser_v${version}.py`,
        originalName: `signal_parser_v${version}.py`,
        fileHash: `sha256_${Math.random().toString(36).substring(2)}`,
        fileSize: 45678,
        version,
        deployTimestamp: new Date().toISOString(),
        uploadedBy: req.session?.user?.username || 'admin',
        status: 'broadcasting',
        broadcastCount: 3
      };

      // Log deployment to database (mock)
      console.log('Parser deployment logged:', deployment);

      res.json({
        success: true,
        deployment,
        message: `Parser file uploaded and broadcasted to ${deployment.broadcastCount} terminals`
      });
    } catch (error) {
      console.error('Parser upload error:', error);
      res.status(500).json({ error: "Failed to upload parser file" });
    }
  });

  app.get("/api/parser/deployments", async (req, res) => {
    try {
      const deployments = [
        {
          id: 'deploy_001',
          filename: 'parser_v2.1.5.py',
          originalName: 'signal_parser_v2.1.5.py',
          fileHash: 'sha256_abc123def456',
          fileSize: 45678,
          version: '2.1.5',
          deployTimestamp: new Date(Date.now() - 3600000).toISOString(),
          uploadedBy: 'admin',
          status: 'deployed',
          notifiedTerminals: ['terminal-001', 'terminal-002'],
          totalTerminals: 3
        },
        {
          id: 'deploy_002',
          filename: 'parser_v2.1.4.py',
          originalName: 'signal_parser_v2.1.4.py',
          fileHash: 'sha256_def456ghi789',
          fileSize: 43210,
          version: '2.1.4',
          deployTimestamp: new Date(Date.now() - 86400000).toISOString(),
          uploadedBy: 'admin',
          status: 'deployed',
          notifiedTerminals: ['terminal-001', 'terminal-002', 'terminal-003'],
          totalTerminals: 3
        }
      ];

      res.json({
        success: true,
        deployments,
        totalDeployments: deployments.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deployment history" });
    }
  });

  app.get("/api/parser/terminals", async (req, res) => {
    try {
      const terminals = [
        {
          id: 'terminal-001',
          version: '2.1.5',
          lastSeen: new Date(Date.now() - 30000).toISOString(),
          connected: true
        },
        {
          id: 'terminal-002',
          version: '2.1.4',
          lastSeen: new Date(Date.now() - 120000).toISOString(),
          connected: true
        },
        {
          id: 'terminal-003',
          version: '2.1.3',
          lastSeen: new Date(Date.now() - 600000).toISOString(),
          connected: false
        }
      ];

      res.json({
        success: true,
        terminals,
        totalConnected: terminals.filter(t => t.connected).length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch terminal list" });
    }
  });

  // Strategy import/export endpoints
  app.post("/api/strategy/import", requireAuth, async (req, res) => {
    try {
      const strategyData = req.body;
      
      // Validate strategy data
      if (!strategyData.name || !strategyData.rules) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid strategy data: name and rules are required" 
        });
      }

      // Additional validation
      const errors = [];
      
      if (strategyData.rules.length === 0) {
        errors.push("Strategy must have at least one rule");
      }

      // Check rule structure
      for (const rule of strategyData.rules) {
        if (!rule.id || !rule.type || !rule.config) {
          errors.push(`Rule ${rule.id || 'unknown'} is missing required fields`);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors
        });
      }

      // Store strategy in database
      const strategyRecord = await storage.createManualRule({
        name: `imported_${strategyData.name}`,
        description: `Imported strategy: ${strategyData.description || strategyData.name}`,
        conditionType: 'imported_strategy',
        conditionValue: JSON.stringify(strategyData),
        actionType: 'execute_strategy',
        actionValue: 'strategy_runtime',
        isActive: true,
        priority: 1,
        usageCount: 0,
        userId: req.session?.user?.id || 1
      });

      console.log('Strategy imported successfully:', strategyData.name);

      res.json({
        success: true,
        message: "Strategy imported successfully",
        strategyId: strategyRecord.id,
        strategy: {
          id: strategyRecord.id,
          name: strategyData.name,
          version: strategyData.version || '1.0.0',
          importedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Strategy import error:', error);
      res.status(500).json({
        success: false,
        error: "Failed to import strategy"
      });
    }
  });

  app.get("/api/strategy/list", requireAuth, async (req, res) => {
    try {
      // Get strategies from database
      const manualRules = await storage.getManualRules();
      
      const strategies = manualRules
        .filter(rule => rule.conditionType === 'visual_strategy' || rule.conditionType === 'imported_strategy')
        .map(rule => {
          try {
            const strategyData = JSON.parse(rule.conditionValue);
            return {
              id: rule.id,
              name: strategyData.name || rule.name,
              description: strategyData.description || rule.description,
              version: strategyData.version || '1.0.0',
              created: strategyData.created || new Date().toISOString(),
              rules: strategyData.rules || [],
              connections: strategyData.connections || [],
              lastUpdated: rule.updatedAt || new Date().toISOString(),
              usageCount: rule.usageCount
            };
          } catch (e) {
            // Handle malformed strategy data
            return {
              id: rule.id,
              name: rule.name,
              description: rule.description,
              version: '1.0.0',
              created: new Date().toISOString(),
              rules: [],
              connections: [],
              lastUpdated: new Date().toISOString(),
              usageCount: rule.usageCount,
              error: 'Invalid strategy data'
            };
          }
        });

      res.json({
        success: true,
        strategies,
        totalStrategies: strategies.length
      });

    } catch (error) {
      console.error('Error fetching strategies:', error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch strategies"
      });
    }
  });

  app.get("/api/strategy/export/:id", requireAuth, async (req, res) => {
    try {
      const strategyId = parseInt(req.params.id);
      const rule = await storage.getManualRuleById(strategyId);

      if (!rule) {
        return res.status(404).json({
          success: false,
          error: "Strategy not found"
        });
      }

      try {
        const strategyData = JSON.parse(rule.conditionValue);
        
        // Set appropriate headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${strategyData.name || 'strategy'}_export.json"`);
        
        res.json(strategyData);

      } catch (e) {
        res.status(500).json({
          success: false,
          error: "Invalid strategy data"
        });
      }

    } catch (error) {
      console.error('Strategy export error:', error);
      res.status(500).json({
        success: false,
        error: "Failed to export strategy"
      });
    }
  });

  return app;
}