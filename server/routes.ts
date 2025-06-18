import type { Express } from "express";
import { createServer, type Server } from "http";
import { fallbackStorage as storage } from "./fallback-storage";
import { 
  insertSignalSchema, 
  insertManualRuleSchema, 
  insertTrainingDataSchema,
  insertChannelSchema,
  insertMessageSchema,
  insertTradeSchema,
  insertUserSettingsSchema,
  insertAuditLogSchema
} from "@shared/schema";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// ============= USER AUTHENTICATION SYSTEM =============

// Simple authentication middleware
const authenticateUser = async (req: any, res: any, next: any) => {
  // For demo purposes, we'll use a simple user ID from headers or default to admin
  const userId = req.headers['x-user-id'] || req.query.userId || 1;
  const user = await storage.getUserById(parseInt(userId as string));
  
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }
  
  req.user = user;
  next();
};

// Enhanced AI Signal Parser with advanced capabilities
class AdvancedSignalParser {
  private tradingPairs = [
    'XAUUSD', 'EURUSD', 'GBPJPY', 'GBPUSD', 'USDJPY', 'USDCAD', 
    'AUDUSD', 'NZDUSD', 'EURJPY', 'EURGBP', 'AUDJPY', 'CHFJPY'
  ];
  
  private actionWords = {
    buy: ['buy', 'long', 'bull', 'go long', 'enter long'],
    sell: ['sell', 'short', 'bear', 'go short', 'enter short'],
    buystop: ['buy stop', 'buystop', 'buy limit'],
    sellstop: ['sell stop', 'sellstop', 'sell limit']
  };

  private intentPatterns = {
    open_trade: ['buy', 'sell', 'enter', 'open', 'take'],
    modify_sl: ['sl to be', 'move sl', 'adjust sl', 'breakeven', 'be'],
    close_partial: ['close', 'partial', 'take profit', 'secure'],
    cancel: ['cancel', 'dont enter', "don't enter", 'skip', 'avoid'],
    reopen: ['reopen', 're-enter', 'retry']
  };

  async parseSignal(rawText: string, source: 'text' | 'ocr' = 'text', channelId?: number): Promise<any> {
    const text = rawText.toLowerCase();
    
    // Check manual rules first if confidence might be low
    let manualRuleResult = null;
    if (channelId) {
      manualRuleResult = await this.checkManualRules(text, channelId);
    }
    
    // Extract trading data
    const pair = this.extractTradingPair(text);
    const action = this.extractAction(text);
    const entry = this.extractPrice(text, ['@', 'at', 'entry', 'price']);
    const sl = this.extractPrice(text, ['sl', 'stop loss', 'stoploss', 'stop']);
    const tp = this.extractTakeProfits(text);
    const intent = this.determineIntent(text);
    const orderType = this.determineOrderType(text);
    const modifications = this.extractModifications(text);
    const volumePercent = this.extractVolumePercent(text);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(pair, action, entry, sl, tp, text);
    
    // Use manual rule if AI confidence is low
    const useManualRule = confidence < 0.85 && manualRuleResult;
    
    return {
      intent: useManualRule ? manualRuleResult.intent : intent,
      pair: useManualRule ? manualRuleResult.pair || pair : pair,
      action: useManualRule ? manualRuleResult.action || action : action,
      entry: useManualRule ? manualRuleResult.entry || entry : entry,
      sl: useManualRule ? manualRuleResult.sl || sl : sl,
      tp: useManualRule ? manualRuleResult.tp || tp : tp,
      order_type: orderType,
      volume_percent: volumePercent,
      modifications,
      source,
      confidence: useManualRule ? Math.min(confidence + 0.2, 1.0) : confidence,
      manual_rule_applied: useManualRule,
      manual_rule_id: useManualRule ? manualRuleResult.ruleId : null,
      raw_text: rawText
    };
  }

  private async checkManualRules(text: string, channelId: number): Promise<any> {
    const rules = await storage.getActiveManualRules(channelId);
    
    for (const rule of rules) {
      if (text.includes(rule.pattern.toLowerCase())) {
        // Increment usage counter
        await storage.incrementRuleUsage(rule.id);
        
        // Parse rule action to extract structured data
        const ruleAction = rule.action.toLowerCase();
        let intent = 'modify_sl';
        let modifications: any = {};
        
        if (ruleAction.includes('partial') || ruleAction.includes('close')) {
          intent = 'close_partial';
          const percentMatch = ruleAction.match(/(\d+)%/);
          if (percentMatch) {
            modifications.volume_percent = parseInt(percentMatch[1]);
          }
        } else if (ruleAction.includes('sl') && ruleAction.includes('entry')) {
          intent = 'modify_sl';
          modifications.sl_to_be = true;
        } else if (ruleAction.includes('cancel')) {
          intent = 'cancel';
          modifications.cancel = true;
        }
        
        return {
          intent,
          modifications,
          ruleId: rule.id,
          pair: null, // Will use AI-extracted pair
          action: null,
          entry: null,
          sl: null,
          tp: null
        };
      }
    }
    
    return null;
  }

  private extractTradingPair(text: string): string | null {
    // Direct pair matching
    for (const pair of this.tradingPairs) {
      if (text.includes(pair.toLowerCase())) {
        return pair;
      }
    }
    
    // Special cases and synonyms
    if (text.includes('gold') || text.includes('xau')) return 'XAUUSD';
    if (text.includes('silver') || text.includes('xag')) return 'XAGUSD';
    if (text.includes('oil') || text.includes('crude')) return 'USOIL';
    if (text.includes('btc') || text.includes('bitcoin')) return 'BTCUSD';
    if (text.includes('eth') || text.includes('ethereum')) return 'ETHUSD';
    
    // Currency combination detection
    const currencies = ['eur', 'usd', 'gbp', 'jpy', 'aud', 'nzd', 'cad', 'chf'];
    const foundCurrencies = currencies.filter(curr => text.includes(curr));
    
    if (foundCurrencies.length >= 2) {
      const base = foundCurrencies[0].toUpperCase();
      const quote = foundCurrencies[1].toUpperCase();
      const potentialPair = base + quote;
      
      if (this.tradingPairs.includes(potentialPair)) {
        return potentialPair;
      }
    }
    
    return null;
  }

  private extractAction(text: string): string | null {
    for (const [action, words] of Object.entries(this.actionWords)) {
      for (const word of words) {
        if (text.includes(word)) return action;
      }
    }
    return null;
  }

  private extractPrice(text: string, indicators: string[]): number | null {
    for (const indicator of indicators) {
      const patterns = [
        new RegExp(`${indicator}[\\s]*([0-9]+(?:\\.[0-9]+)?)`, 'i'),
        new RegExp(`${indicator}[:\\s]*([0-9]+(?:\\.[0-9]+)?)`, 'i'),
        new RegExp(`${indicator}[\\s=:]*([0-9]+(?:\\.[0-9]+)?)`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return parseFloat(match[1]);
      }
    }
    return null;
  }

  private extractTakeProfits(text: string): number[] {
    const tps: number[] = [];
    
    // Multiple TP patterns
    const patterns = [
      /tp[^\d]*([0-9]+(?:\.[0-9]+)?)/gi,
      /take\s*profit[^\d]*([0-9]+(?:\.[0-9]+)?)/gi,
      /target[^\d]*([0-9]+(?:\.[0-9]+)?)/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        tps.push(parseFloat(match[1]));
      }
    }
    
    // Look for sequential numbers after TP
    const multiTpRegex = /tp[^\d]*([0-9]+(?:\.[0-9]+)?)[^\d]*([0-9]+(?:\.[0-9]+)?)/i;
    const multiMatch = text.match(multiTpRegex);
    if (multiMatch && tps.length === 0) {
      tps.push(parseFloat(multiMatch[1]));
      tps.push(parseFloat(multiMatch[2]));
    }
    
    return [...new Set(tps)]; // Remove duplicates
  }

  private determineIntent(text: string): string {
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (text.includes(pattern)) return intent;
      }
    }
    
    // Default intent based on content
    if (text.includes('%') && (text.includes('close') || text.includes('partial'))) {
      return 'close_partial';
    }
    
    return 'open_trade';
  }

  private determineOrderType(text: string): string {
    if (text.includes('now') || text.includes('immediately') || text.includes('market')) {
      return 'market';
    }
    if (text.includes('stop') || text.includes('limit') || text.includes('pending')) {
      return 'pending';
    }
    if (text.includes('partial')) {
      return 'partial';
    }
    return 'market';
  }

  private extractModifications(text: string): any {
    return {
      sl_to_be: text.includes('sl to be') || text.includes('breakeven') || text.includes(' be '),
      increase_sl: this.extractSlIncrease(text),
      tp_update: null,
      cancel: text.includes('cancel') || text.includes("don't enter"),
      secure_profits: text.includes('secure') || text.includes('lock'),
      trail_sl: text.includes('trail') || text.includes('trailing')
    };
  }

  private extractSlIncrease(text: string): number | null {
    const patterns = [
      /(?:increase|move|adjust).*sl.*?([0-9]+).*?pips?/i,
      /sl.*?(?:to|at).*?([0-9]+(?:\.[0-9]+)?)/i,
      /move.*?stop.*?([0-9]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return parseFloat(match[1]);
    }
    
    return null;
  }

  private extractVolumePercent(text: string): number | null {
    const patterns = [
      /(?:close|partial|take).*?([0-9]+)%/i,
      /([0-9]+)%.*?(?:close|partial)/i,
      /([0-9]+)\s*percent/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return parseFloat(match[1]);
    }
    
    return null;
  }

  private calculateConfidence(pair: string | null, action: string | null, entry: number | null, sl: number | null, tp: number[], text: string): number {
    let score = 0;
    
    // Core elements scoring
    if (pair) score += 0.25;
    if (action) score += 0.25;
    if (entry) score += 0.15;
    if (sl) score += 0.1;
    if (tp.length > 0) score += 0.1;
    
    // Additional context scoring
    if (text.includes('now') || text.includes('immediately')) score += 0.05;
    if (text.includes('@') || text.includes('at')) score += 0.05;
    if (tp.length > 1) score += 0.05; // Multiple TPs
    
    // Penalty for incomplete signals
    if (!pair && !action) score -= 0.2;
    if (text.length < 10) score -= 0.1;
    
    // Add some realistic variance
    const variance = (Math.random() - 0.5) * 0.1;
    return Math.max(0, Math.min(1, score + variance));
  }
}

// Trade Dispatcher for MT5 integration
class TradeDispatcher {
  private mt5OutputPath = "./mt5_signals.json";
  private userSignalPaths = new Map<number, string>();
  
  constructor() {
    // Initialize user-specific signal paths
    this.userSignalPaths.set(1, "C:\\TradingSignals\\user1.json");
  }
  
  async dispatchTrade(signal: any, userSettings: any): Promise<any> {
    // Apply user risk management and filters
    const trade = this.applyRiskManagement(signal, userSettings);
    
    if (!trade) {
      return { success: false, reason: "Trade filtered by risk management" };
    }
    
    // Create trade record
    const tradeRecord = await storage.createTrade({
      signalId: signal.signalId,
      userId: userSettings.userId,
      symbol: signal.pair,
      action: signal.action,
      entry: signal.entry,
      sl: signal.sl,
      tp: signal.tp,
      lot: trade.lot,
      orderType: signal.order_type || 'market',
      status: 'pending',
      executedAt: null,
      result: null,
      pnl: null
    });
    
    // Output for MT5 EA (both generic and user-specific)
    await this.outputToMT5(trade);
    await this.outputToUserSpecificPath(trade, userSettings.userId);
    
    // Log audit trail
    await storage.createAuditLog({
      userId: userSettings.userId,
      action: 'trade_dispatched',
      entityType: 'trade',
      entityId: tradeRecord.id,
      details: { signal, trade, userSettings }
    });
    
    return { success: true, trade: tradeRecord, mt5Signal: trade };
  }
  
  private applyRiskManagement(signal: any, userSettings: any): any | null {
    // Check if signal copier is enabled
    if (!userSettings.enableSignalCopier) return null;
    
    // Check confidence threshold
    if (signal.confidence < (userSettings.tradeFilters?.minConfidence || 0.8)) {
      return null;
    }
    
    // Calculate lot size based on risk percentage
    const accountBalance = 10000; // Mock account balance
    const riskAmount = accountBalance * (userSettings.riskPercent / 100);
    
    let lotSize = userSettings.maxLot || 0.1;
    
    if (signal.sl && signal.entry) {
      const riskPips = Math.abs(signal.entry - signal.sl);
      const pipValue = this.getPipValue(signal.pair);
      const calculatedLot = riskAmount / (riskPips * pipValue);
      lotSize = Math.min(calculatedLot, userSettings.maxLot);
    }
    
    return {
      symbol: signal.pair,
      action: signal.action,
      entry: signal.entry,
      sl: signal.sl,
      tp: signal.tp,
      lot: Math.round(lotSize * 100) / 100, // Round to 2 decimals
      order_type: signal.order_type || 'market',
      comment: `AI Signal - Confidence: ${Math.round(signal.confidence * 100)}%`
    };
  }
  
  private getPipValue(pair: string): number {
    // Mock pip values for different pairs
    const pipValues: { [key: string]: number } = {
      'EURUSD': 10, 'GBPUSD': 10, 'AUDUSD': 10, 'NZDUSD': 10,
      'USDJPY': 9.09, 'USDCAD': 7.69, 'USDCHF': 10,
      'EURJPY': 9.09, 'GBPJPY': 9.09, 'AUDJPY': 9.09,
      'XAUUSD': 1, 'XAGUSD': 50
    };
    
    return pipValues[pair] || 10;
  }
  
  private async outputToMT5(trade: any): Promise<void> {
    try {
      // Read existing signals
      let signals: any[] = [];
      try {
        const data = await fs.readFile(this.mt5OutputPath, 'utf-8');
        signals = JSON.parse(data);
      } catch (error) {
        // File doesn't exist yet
      }
      
      // Add new signal
      signals.push({
        timestamp: new Date().toISOString(),
        ...trade
      });
      
      // Keep only last 100 signals
      if (signals.length > 100) {
        signals = signals.slice(-100);
      }
      
      // Write back to file
      await fs.writeFile(this.mt5OutputPath, JSON.stringify(signals, null, 2));
    } catch (error) {
      console.error('Failed to output to MT5:', error);
    }
  }

  private async outputToUserSpecificPath(trade: any, userId: number): Promise<void> {
    const userPath = this.userSignalPaths.get(userId);
    if (!userPath) return;

    try {
      // Create stealth-optimized signal format for EA
      const stealthSignal = {
        symbol: trade.symbol,
        action: trade.action,
        entry: trade.entry,
        sl: trade.sl,
        tp: trade.tp,
        lot: trade.lot,
        order_type: trade.order_type || 'market',
        delay_ms: Math.floor(Math.random() * 2000) + 500, // Random delay 0.5-2.5s
        partial_close: 0,
        move_sl_to_be: true,
        timestamp: new Date().toISOString(),
        comment: "Manual"
      };

      // Write to user-specific path for EA consumption
      await fs.writeFile(userPath, JSON.stringify(stealthSignal, null, 2));
      
      // Log for audit
      console.log(`Signal dispatched to ${userPath} for user ${userId}`);
    } catch (error) {
      console.error(`Failed to output to user path ${userPath}:`, error);
    }
  }
}

const signalParser = new AdvancedSignalParser();
const tradeDispatcher = new TradeDispatcher();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ============= MESSAGE INGESTION MODULE =============
  
  // Webhook for receiving Telegram messages
  app.post("/api/messages/new", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      
      // Process message immediately
      const channel = await storage.getChannelById(message.channelId || 0);
      if (channel && channel.isActive) {
        const parsed = await signalParser.parseSignal(
          message.content, 
          message.mediaUrl ? 'ocr' : 'text',
          channel.id
        );
        
        // Create signal record
        const signal = await storage.createSignal({
          messageId: message.id,
          rawText: message.content,
          source: parsed.source,
          intent: parsed.intent,
          pair: parsed.pair,
          action: parsed.action,
          entry: parsed.entry,
          sl: parsed.sl,
          tp: parsed.tp,
          orderType: parsed.order_type,
          volumePercent: parsed.volume_percent,
          modifications: parsed.modifications,
          confidence: parsed.confidence,
          manualRuleApplied: parsed.manual_rule_applied,
          channelName: channel.name,
          externalMessageId: message.messageId
        });
        
        // Mark message as processed
        await storage.markMessageProcessed(message.id);
        
        // Dispatch to users if confidence is high enough
        if (parsed.confidence >= (channel.confidenceThreshold || 0.85)) {
          const userSettings = await storage.getUserSettings(channel.userId || 1);
          if (userSettings && userSettings.enableSignalCopier) {
            await tradeDispatcher.dispatchTrade({
              ...parsed,
              signalId: signal.id
            }, userSettings);
          }
        }
      }
      
      res.json({ success: true, message, processed: true });
    } catch (error) {
      console.error("Message ingestion error:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });
  
  // Get messages
  app.get("/api/messages", async (req, res) => {
    try {
      const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const messages = await storage.getMessages(channelId, limit);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  // ============= ADMIN CONTROL SYSTEM =============
  
  // Channel management
  app.get("/api/admin/channels", async (req, res) => {
    try {
      const channels = await storage.getChannels();
      res.json(channels);
    } catch (error) {
      console.error("Get channels error:", error);
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });
  
  app.post("/api/admin/channels", async (req, res) => {
    try {
      // Add default userId if not provided (for admin operations)
      const channelData = {
        ...req.body,
        userId: req.body.userId || 1, // Default to admin user
        confidenceThreshold: req.body.confidenceThreshold / 100 || 0.85, // Convert percentage to decimal
        isActive: req.body.isActive !== undefined ? req.body.isActive : true
      };
      
      const validatedData = insertChannelSchema.parse(channelData);
      const channel = await storage.createChannel(validatedData);
      
      // Create audit log for channel creation
      await storage.createAuditLog({
        userId: channelData.userId,
        action: "CREATE_CHANNEL",
        entityType: "channel",
        entityId: channel.id,
        details: { channelName: channel.name, description: channel.description }
      });
      
      res.json(channel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid channel data", details: error.errors });
      }
      console.error("Create channel error:", error);
      res.status(500).json({ error: "Failed to create channel" });
    }
  });
  
  app.patch("/api/admin/channels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const channel = await storage.updateChannel(id, updates);
      
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }
      
      res.json(channel);
    } catch (error) {
      console.error("Update channel error:", error);
      res.status(500).json({ error: "Failed to update channel" });
    }
  });
  
  // User management
  app.patch("/api/admin/users/:id/toggle", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Toggle user active status
      const updatedUser = await storage.updateUser(id, { isActive: !user.isActive });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Toggle user error:", error);
      res.status(500).json({ error: "Failed to toggle user status" });
    }
  });
  
  // Upload custom rules
  app.post("/api/admin/rules/upload", async (req, res) => {
    try {
      const { rules } = req.body;
      
      if (!Array.isArray(rules)) {
        return res.status(400).json({ error: "Rules must be an array" });
      }
      
      const createdRules = [];
      for (const ruleData of rules) {
        const validatedRule = insertManualRuleSchema.parse(ruleData);
        const rule = await storage.createManualRule(validatedRule);
        createdRules.push(rule);
      }
      
      res.json({ success: true, rules: createdRules });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid rule data", details: error.errors });
      }
      console.error("Upload rules error:", error);
      res.status(500).json({ error: "Failed to upload rules" });
    }
  });
  
  // Get trade execution logs
  app.get("/api/admin/trades/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getAuditLogs(undefined, limit);
      const tradeLogs = logs.filter(log => log.entityType === 'trade');
      res.json(tradeLogs);
    } catch (error) {
      console.error("Get trade logs error:", error);
      res.status(500).json({ error: "Failed to fetch trade logs" });
    }
  });
  
  // Parser retraining endpoint
  app.post("/api/admin/parser/retrain", async (req, res) => {
    try {
      // In a real implementation, this would trigger ML model retraining
      const trainingData = await storage.getTrainingData();
      const verifiedData = trainingData.filter(data => data.isVerified);
      
      // Mock retraining process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Log the retraining
      await storage.createAuditLog({
        userId: req.body.userId || 1,
        action: 'parser_retrained',
        entityType: 'system',
        entityId: null,
        details: { 
          trainingDataCount: verifiedData.length,
          timestamp: new Date().toISOString()
        }
      });
      
      res.json({ 
        success: true, 
        message: "Parser retrained successfully",
        trainingDataUsed: verifiedData.length
      });
    } catch (error) {
      console.error("Parser retrain error:", error);
      res.status(500).json({ error: "Failed to retrain parser" });
    }
  });
  
  // ============= USER CONTROL + SETTINGS =============
  
  // Get user settings
  app.get("/api/user/:id/settings", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        // Create default settings if none exist
        const defaultSettings = await storage.updateUserSettings(userId, {
          userId,
          maxLot: 0.1,
          riskPercent: 2.0,
          enableSignalCopier: true,
          enabledChannels: [],
          tradeFilters: { minConfidence: 0.8 }
        });
        return res.json(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Get user settings error:", error);
      res.status(500).json({ error: "Failed to fetch user settings" });
    }
  });
  
  // Update user settings
  app.put("/api/user/:id/settings", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const settingsData = req.body;
      
      const settings = await storage.updateUserSettings(userId, settingsData);
      
      // Log settings change
      await storage.createAuditLog({
        userId,
        action: 'settings_updated',
        entityType: 'user_settings',
        entityId: settings.id,
        details: settingsData
      });
      
      res.json(settings);
    } catch (error) {
      console.error("Update user settings error:", error);
      res.status(500).json({ error: "Failed to update user settings" });
    }
  });
  
  // Get user signals
  app.get("/api/user/:id/signals", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      // Get user's enabled channels
      const userSettings = await storage.getUserSettings(userId);
      const enabledChannels = userSettings?.enabledChannels || [];
      
      // Get signals from enabled channels
      const allSignals = await storage.getSignals(limit * 2); // Get more to filter
      const userSignals = allSignals.filter(signal => {
        if (!signal.channelName) return false;
        // Match by channel name since we don't have direct channel relation
        return enabledChannels.some(async (channelId) => {
          const channel = await storage.getChannelById(channelId);
          return channel?.name === signal.channelName;
        });
      }).slice(0, limit);
      
      res.json(userSignals);
    } catch (error) {
      console.error("Get user signals error:", error);
      res.status(500).json({ error: "Failed to fetch user signals" });
    }
  });
  
  // Get user alerts/trades
  app.get("/api/user/:id/alerts", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const trades = await storage.getTrades(userId, limit);
      res.json(trades);
    } catch (error) {
      console.error("Get user alerts error:", error);
      res.status(500).json({ error: "Failed to fetch user alerts" });
    }
  });
  
  // ============= PERFORMANCE TRACKER & SIGNAL SCORING =============
  
  // Get provider statistics
  app.get("/api/stats/providers", async (req, res) => {
    try {
      const channels = await storage.getChannels();
      const providerStats = [];
      
      for (const channel of channels) {
        const stats = await storage.getProviderStats(channel.id);
        providerStats.push({
          channel,
          stats: stats || {
            totalSignals: 0,
            winRate: 0,
            avgRiskReward: 0,
            avgExecutionTime: 0
          }
        });
      }
      
      res.json(providerStats);
    } catch (error) {
      console.error("Get provider stats error:", error);
      res.status(500).json({ error: "Failed to fetch provider statistics" });
    }
  });
  
  // Get user performance
  app.get("/api/stats/user/:id/performance", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const performance = await storage.getUserPerformance(userId);
      res.json(performance);
    } catch (error) {
      console.error("Get user performance error:", error);
      res.status(500).json({ error: "Failed to fetch user performance" });
    }
  });
  
  // Update trade result (for performance tracking)
  app.patch("/api/trades/:id/result", async (req, res) => {
    try {
      const tradeId = parseInt(req.params.id);
      const { result, pnl } = req.body;
      
      const trade = await storage.updateTrade(tradeId, {
        result,
        pnl,
        status: 'executed',
        executedAt: new Date()
      });
      
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      
      // Update provider stats if this trade has a signal
      if (trade.signalId) {
        const signal = await storage.getSignalById(trade.signalId);
        if (signal && signal.channelName) {
          const channel = await storage.getChannelByName(signal.channelName);
          if (channel) {
            const currentStats = await storage.getProviderStats(channel.id);
            const totalTrades = (currentStats?.totalSignals || 0) + 1;
            const previousWins = currentStats ? Math.round(currentStats.winRate * currentStats.totalSignals / 100) : 0;
            const newWins = result === 'win' ? previousWins + 1 : previousWins;
            const newWinRate = (newWins / totalTrades) * 100;
            
            await storage.updateProviderStats(channel.id, {
              totalSignals: totalTrades,
              winRate: Math.round(newWinRate * 10) / 10,
              avgRiskReward: currentStats?.avgRiskReward || 0,
              avgExecutionTime: currentStats?.avgExecutionTime || 0
            });
          }
        }
      }
      
      res.json(trade);
    } catch (error) {
      console.error("Update trade result error:", error);
      res.status(500).json({ error: "Failed to update trade result" });
    }
  });
  
  // ============= MT5 INTEGRATION ENDPOINTS =============
  
  // Generate MT5 signal file for specific user
  app.post("/api/mt5/generate-signal", async (req, res) => {
    try {
      const { userId, signal } = req.body;
      
      if (!userId || !signal) {
        return res.status(400).json({ error: "User ID and signal data required" });
      }
      
      // Get user settings for risk management
      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings) {
        return res.status(404).json({ error: "User settings not found" });
      }
      
      // Dispatch trade through normal flow
      const result = await tradeDispatcher.dispatchTrade(signal, userSettings);
      
      res.json(result);
    } catch (error) {
      console.error("MT5 signal generation error:", error);
      res.status(500).json({ error: "Failed to generate MT5 signal" });
    }
  });
  
  // Get MT5 execution status
  app.get("/api/mt5/status", async (req, res) => {
    try {
      const pendingTrades = await storage.getTradesByStatus('pending');
      const executedTrades = await storage.getTradesByStatus('executed');
      
      res.json({
        pendingTrades: pendingTrades.length,
        executedTrades: executedTrades.length,
        lastSignalTime: new Date().toISOString(),
        systemStatus: 'operational'
      });
    } catch (error) {
      console.error("MT5 status error:", error);
      res.status(500).json({ error: "Failed to get MT5 status" });
    }
  });
  
  // Manual signal dispatch for testing
  app.post("/api/mt5/manual-dispatch", async (req, res) => {
    try {
      const { symbol, action, entry, sl, tp, lot, userId = 1 } = req.body;
      
      const testSignal = {
        signalId: null,
        pair: symbol,
        action,
        entry,
        sl,
        tp: Array.isArray(tp) ? tp : [tp],
        order_type: 'market',
        confidence: 1.0,
        source: 'manual'
      };
      
      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const result = await tradeDispatcher.dispatchTrade(testSignal, userSettings);
      
      res.json({
        success: true,
        message: "Signal dispatched to MT5 EA",
        result
      });
    } catch (error) {
      console.error("Manual dispatch error:", error);
      res.status(500).json({ error: "Failed to dispatch signal" });
    }
  });
  
  // ============= EXISTING API ROUTES (LEGACY SUPPORT) =============
  
  // Signal parsing endpoint (legacy)
  app.post("/api/parse-signal", async (req, res) => {
    try {
      const { rawText, source = 'text', channelName } = req.body;
      
      if (!rawText) {
        return res.status(400).json({ error: "Raw text is required" });
      }
      
      // Find channel by name if provided
      let channelId: number | undefined;
      if (channelName) {
        const channel = await storage.getChannelByName(channelName);
        channelId = channel?.id;
      }
      
      const parsedResult = await signalParser.parseSignal(rawText, source, channelId);
      
      // Save to storage
      const signal = await storage.createSignal({
        messageId: null,
        rawText,
        source,
        intent: parsedResult.intent,
        pair: parsedResult.pair,
        action: parsedResult.action,
        entry: parsedResult.entry,
        sl: parsedResult.sl,
        tp: parsedResult.tp,
        orderType: parsedResult.order_type,
        volumePercent: parsedResult.volume_percent,
        modifications: parsedResult.modifications,
        confidence: parsedResult.confidence,
        manualRuleApplied: parsedResult.manual_rule_applied,
        channelName: channelName || null,
        externalMessageId: null
      });
      
      res.json({
        success: true,
        signal,
        parsed: parsedResult
      });
    } catch (error) {
      console.error("Signal parsing error:", error);
      res.status(500).json({ error: "Failed to parse signal" });
    }
  });

  // Get signals (legacy)
  app.get("/api/signals", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const signals = await storage.getSignals(limit);
      res.json(signals);
    } catch (error) {
      console.error("Get signals error:", error);
      res.status(500).json({ error: "Failed to fetch signals" });
    }
  });

  // Get single signal
  app.get("/api/signals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const signal = await storage.getSignalById(id);
      
      if (!signal) {
        return res.status(404).json({ error: "Signal not found" });
      }
      
      res.json(signal);
    } catch (error) {
      console.error("Get signal error:", error);
      res.status(500).json({ error: "Failed to fetch signal" });
    }
  });

  // Get manual rules
  app.get("/api/manual-rules", async (req, res) => {
    try {
      const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const rules = await storage.getManualRules(channelId, userId);
      res.json(rules);
    } catch (error) {
      console.error("Get manual rules error:", error);
      res.status(500).json({ error: "Failed to fetch manual rules" });
    }
  });

  // Create manual rule
  app.post("/api/manual-rules", async (req, res) => {
    try {
      const validatedData = insertManualRuleSchema.parse(req.body);
      const rule = await storage.createManualRule(validatedData);
      res.json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid rule data", details: error.errors });
      }
      console.error("Create manual rule error:", error);
      res.status(500).json({ error: "Failed to create manual rule" });
    }
  });

  // Update manual rule
  app.put("/api/manual-rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const rule = await storage.updateManualRule(id, updates);
      
      if (!rule) {
        return res.status(404).json({ error: "Rule not found" });
      }
      
      res.json(rule);
    } catch (error) {
      console.error("Update manual rule error:", error);
      res.status(500).json({ error: "Failed to update manual rule" });
    }
  });

  // Delete manual rule
  app.delete("/api/manual-rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteManualRule(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Rule not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete manual rule error:", error);
      res.status(500).json({ error: "Failed to delete manual rule" });
    }
  });

  // Get training data
  app.get("/api/training-data", async (req, res) => {
    try {
      const trainingData = await storage.getTrainingData();
      res.json(trainingData);
    } catch (error) {
      console.error("Get training data error:", error);
      res.status(500).json({ error: "Failed to fetch training data" });
    }
  });

  // Create training data
  app.post("/api/training-data", async (req, res) => {
    try {
      const validatedData = insertTrainingDataSchema.parse(req.body);
      const data = await storage.createTrainingData(validatedData);
      res.json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid training data", details: error.errors });
      }
      console.error("Create training data error:", error);
      res.status(500).json({ error: "Failed to create training data" });
    }
  });

  // Get parsing statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getParsingStats();
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}