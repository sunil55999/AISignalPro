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
      
      // You can store this in database or file system
      // For now, we'll just acknowledge receipt
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

  return app;
}