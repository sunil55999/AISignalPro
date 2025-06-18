import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSignalSchema, insertManualRuleSchema, insertTrainingDataSchema } from "@shared/schema";
import { z } from "zod";

// Simple NLP-based signal parser
class SignalParser {
  private tradingPairs = ['XAUUSD', 'EURUSD', 'GBPJPY', 'GBPUSD', 'USDJPY', 'USDCAD', 'AUDUSD', 'NZDUSD'];
  private actionWords = {
    buy: ['buy', 'long', 'bull'],
    sell: ['sell', 'short', 'bear'],
    buystop: ['buy stop', 'buystop'],
    sellstop: ['sell stop', 'sellstop']
  };

  async parseSignal(rawText: string, source: 'text' | 'ocr' = 'text'): Promise<any> {
    const text = rawText.toLowerCase();
    
    // Extract trading pair
    const pair = this.extractTradingPair(text);
    
    // Extract action
    const action = this.extractAction(text);
    
    // Extract entry price
    const entry = this.extractPrice(text, ['@', 'at', 'entry']);
    
    // Extract stop loss
    const sl = this.extractPrice(text, ['sl', 'stop loss', 'stoploss']);
    
    // Extract take profit(s)
    const tp = this.extractTakeProfits(text);
    
    // Determine intent and order type
    const intent = this.determineIntent(text);
    const orderType = this.determineOrderType(text);
    
    // Extract modifications
    const modifications = this.extractModifications(text);
    
    // Calculate confidence based on extracted elements
    const confidence = this.calculateConfidence(pair, action, entry, sl, tp);
    
    // Check if manual rule should be applied
    const manualRuleApplied = confidence < 0.85;
    
    return {
      intent,
      pair,
      action,
      entry,
      sl,
      tp,
      order_type: orderType,
      volume_percent: this.extractVolumePercent(text),
      modifications,
      source,
      confidence,
      manual_rule_applied: manualRuleApplied,
      raw_text: rawText
    };
  }

  private extractTradingPair(text: string): string | null {
    for (const pair of this.tradingPairs) {
      if (text.includes(pair.toLowerCase()) || text.includes(pair.replace('USD', '').toLowerCase())) {
        return pair;
      }
    }
    
    // Special cases
    if (text.includes('gold') || text.includes('xau')) return 'XAUUSD';
    if (text.includes('eur') && text.includes('usd')) return 'EURUSD';
    if (text.includes('gbp') && text.includes('jpy')) return 'GBPJPY';
    
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
      const regex = new RegExp(`${indicator}[\\s]*([0-9]+(?:\\.[0-9]+)?)`, 'i');
      const match = text.match(regex);
      if (match) return parseFloat(match[1]);
    }
    return null;
  }

  private extractTakeProfits(text: string): number[] {
    const tps: number[] = [];
    const tpRegex = /tp[^\d]*([0-9]+(?:\.[0-9]+)?)/gi;
    let match;
    
    while ((match = tpRegex.exec(text)) !== null) {
      tps.push(parseFloat(match[1]));
    }
    
    // Also look for multiple prices after TP
    const multiTpRegex = /tp[^\d]*([0-9]+(?:\.[0-9]+)?)[^\d]*([0-9]+(?:\.[0-9]+)?)/i;
    const multiMatch = text.match(multiTpRegex);
    if (multiMatch && tps.length === 0) {
      tps.push(parseFloat(multiMatch[1]));
      tps.push(parseFloat(multiMatch[2]));
    }
    
    return tps;
  }

  private determineIntent(text: string): string {
    if (text.includes('close') && (text.includes('%') || text.includes('percent'))) {
      return 'close_partial';
    }
    if (text.includes('sl to be') || text.includes('move sl')) {
      return 'modify_sl';
    }
    if (text.includes('cancel') || text.includes("don't enter")) {
      return 'cancel';
    }
    if (text.includes('reopen')) {
      return 'reopen';
    }
    return 'open_trade';
  }

  private determineOrderType(text: string): string {
    if (text.includes('now') || text.includes('immediately')) return 'market';
    if (text.includes('stop') || text.includes('pending')) return 'pending';
    return 'market';
  }

  private extractModifications(text: string): any {
    return {
      sl_to_be: text.includes('sl to be') || text.includes('breakeven'),
      increase_sl: this.extractSlIncrease(text),
      tp_update: null,
      cancel: text.includes('cancel') || text.includes("don't enter")
    };
  }

  private extractSlIncrease(text: string): number | null {
    const regex = /(?:increase|move).*sl.*?([0-9]+).*?pips?/i;
    const match = text.match(regex);
    return match ? parseFloat(match[1]) : null;
  }

  private extractVolumePercent(text: string): number | null {
    const regex = /(?:close|partial).*?([0-9]+)%/i;
    const match = text.match(regex);
    return match ? parseFloat(match[1]) : null;
  }

  private calculateConfidence(pair: string | null, action: string | null, entry: number | null, sl: number | null, tp: number[]): number {
    let score = 0;
    
    if (pair) score += 0.3;
    if (action) score += 0.3;
    if (entry) score += 0.2;
    if (sl) score += 0.1;
    if (tp.length > 0) score += 0.1;
    
    // Add randomness to simulate real AI confidence
    const randomFactor = (Math.random() - 0.5) * 0.1;
    return Math.max(0, Math.min(1, score + randomFactor));
  }
}

const signalParser = new SignalParser();

export async function registerRoutes(app: Express): Promise<Server> {
  // Signal parsing endpoint
  app.post("/api/parse-signal", async (req, res) => {
    try {
      const { rawText, source = 'text' } = req.body;
      
      if (!rawText) {
        return res.status(400).json({ error: "Raw text is required" });
      }
      
      const parsedResult = await signalParser.parseSignal(rawText, source);
      
      // Save to storage
      const signal = await storage.createSignal({
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
        channelName: req.body.channelName || null,
        messageId: req.body.messageId || null,
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

  // Get signals
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
      const rules = await storage.getManualRules();
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
