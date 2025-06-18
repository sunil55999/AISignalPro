import { 
  users, 
  signals,
  manualRules,
  trainingData,
  channels,
  messages,
  trades,
  userSettings,
  auditLogs,
  providerStats,
  type User, 
  type InsertUser,
  type Signal,
  type InsertSignal,
  type ManualRule,
  type InsertManualRule,
  type TrainingData,
  type InsertTrainingData,
  type Channel,
  type InsertChannel,
  type Message,
  type InsertMessage,
  type Trade,
  type InsertTrade,
  type UserSettings,
  type InsertUserSettings,
  type AuditLog,
  type InsertAuditLog,
  type ProviderStats,
  type InsertProviderStats
} from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  generateApiKey(userId: number): Promise<string>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  
  // Channel methods
  createChannel(channel: InsertChannel): Promise<Channel>;
  getChannels(): Promise<Channel[]>;
  getChannelById(id: number): Promise<Channel | undefined>;
  getChannelByName(name: string): Promise<Channel | undefined>;
  updateChannel(id: number, updates: Partial<Channel>): Promise<Channel | undefined>;
  deleteChannel(id: number): Promise<boolean>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(channelId?: number, limit?: number): Promise<Message[]>;
  getMessageById(id: number): Promise<Message | undefined>;
  markMessageProcessed(id: number): Promise<void>;
  
  // Signal methods
  createSignal(signal: InsertSignal): Promise<Signal>;
  getSignals(limit?: number): Promise<Signal[]>;
  getSignalById(id: number): Promise<Signal | undefined>;
  getSignalsByDateRange(startDate: Date, endDate: Date): Promise<Signal[]>;
  
  // Trade methods
  createTrade(trade: InsertTrade): Promise<Trade>;
  getTrades(userId?: number, limit?: number): Promise<Trade[]>;
  getTradeById(id: number): Promise<Trade | undefined>;
  updateTrade(id: number, updates: Partial<Trade>): Promise<Trade | undefined>;
  getTradesByStatus(status: string): Promise<Trade[]>;
  
  // Manual rule methods
  createManualRule(rule: InsertManualRule): Promise<ManualRule>;
  getManualRules(channelId?: number, userId?: number): Promise<ManualRule[]>;
  getActiveManualRules(channelId?: number): Promise<ManualRule[]>;
  updateManualRule(id: number, updates: Partial<ManualRule>): Promise<ManualRule | undefined>;
  deleteManualRule(id: number): Promise<boolean>;
  incrementRuleUsage(id: number): Promise<void>;
  
  // Training data methods
  createTrainingData(data: InsertTrainingData): Promise<TrainingData>;
  getTrainingData(): Promise<TrainingData[]>;
  updateTrainingData(id: number, updates: Partial<TrainingData>): Promise<TrainingData | undefined>;
  deleteTrainingData(id: number): Promise<boolean>;
  
  // User settings methods
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings>;
  
  // Audit log methods
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(userId?: number, limit?: number): Promise<AuditLog[]>;
  
  // Provider stats methods
  getProviderStats(channelId: number): Promise<ProviderStats | undefined>;
  updateProviderStats(channelId: number, stats: Partial<InsertProviderStats>): Promise<ProviderStats>;
  
  // Statistics methods
  getParsingStats(): Promise<{
    todayCount: number;
    avgConfidence: number;
    manualRulesUsed: number;
    ocrSuccessRate: number;
  }>;
  
  getUserPerformance(userId: number): Promise<{
    totalTrades: number;
    winRate: number;
    totalPnl: number;
    avgRiskReward: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private channels: Map<number, Channel> = new Map();
  private messages: Map<number, Message> = new Map();
  private signals: Map<number, Signal> = new Map();
  private trades: Map<number, Trade> = new Map();
  private manualRules: Map<number, ManualRule> = new Map();
  private trainingData: Map<number, TrainingData> = new Map();
  private userSettings: Map<number, UserSettings> = new Map();
  private auditLogs: Map<number, AuditLog> = new Map();
  private providerStats: Map<number, ProviderStats> = new Map();
  
  private currentUserId: number = 1;
  private currentChannelId: number = 1;
  private currentMessageId: number = 1;
  private currentSignalId: number = 1;
  private currentTradeId: number = 1;
  private currentRuleId: number = 1;
  private currentTrainingId: number = 1;
  private currentUserSettingsId: number = 1;
  private currentAuditLogId: number = 1;
  private currentProviderStatsId: number = 1;

  constructor() {
    this.initializeDemo();
  }

  private async initializeDemo() {
    // Create demo admin user
    const adminUser: User = {
      id: this.currentUserId++,
      username: "admin",
      password: "admin123",
      apiKey: nanoid(32),
      isActive: true,
      isAdmin: true,
      createdAt: new Date()
    };
    this.users.set(adminUser.id, adminUser);

    // Create demo channels
    const goldChannel: Channel = {
      id: this.currentChannelId++,
      name: "@XAUUSDChannel",
      description: "Premium Gold Trading Signals",
      isActive: true,
      confidenceThreshold: 0.85,
      userId: adminUser.id,
      createdAt: new Date()
    };
    this.channels.set(goldChannel.id, goldChannel);

    const forexChannel: Channel = {
      id: this.currentChannelId++,
      name: "@ForexSignals",
      description: "EUR/USD and GBP/USD signals",
      isActive: true,
      confidenceThreshold: 0.80,
      userId: adminUser.id,
      createdAt: new Date()
    };
    this.channels.set(forexChannel.id, forexChannel);

    // Create default rules
    const rule1: ManualRule = {
      id: this.currentRuleId++,
      pattern: "SL to BE",
      action: "Set SL to Entry Price",
      channelId: null,
      userId: adminUser.id,
      isActive: true,
      usageCount: 0,
      createdAt: new Date()
    };
    this.manualRules.set(rule1.id, rule1);

    const rule2: ManualRule = {
      id: this.currentRuleId++,
      pattern: "Close 50%",
      action: "Partial Close 50%",
      channelId: goldChannel.id,
      userId: adminUser.id,
      isActive: true,
      usageCount: 0,
      createdAt: new Date()
    };
    this.manualRules.set(rule2.id, rule2);

    // Create user settings
    const settings: UserSettings = {
      id: this.currentUserSettingsId++,
      userId: adminUser.id,
      maxLot: 0.2,
      riskPercent: 2.0,
      enableSignalCopier: true,
      enabledChannels: [goldChannel.id, forexChannel.id],
      tradeFilters: { minConfidence: 0.8 },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userSettings.set(settings.id, settings);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.currentUserId++,
      username: insertUser.username,
      password: insertUser.password,
      apiKey: null,
      isActive: true,
      isAdmin: false,
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async generateApiKey(userId: number): Promise<string> {
    const apiKey = nanoid(32);
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, apiKey });
    }
    return apiKey;
  }

  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.apiKey === apiKey);
  }

  // Channel methods
  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const channel: Channel = {
      id: this.currentChannelId++,
      name: insertChannel.name,
      description: insertChannel.description || null,
      isActive: insertChannel.isActive ?? true,
      confidenceThreshold: insertChannel.confidenceThreshold ?? 0.85,
      userId: insertChannel.userId || null,
      createdAt: new Date()
    };
    this.channels.set(channel.id, channel);
    return channel;
  }

  async getChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values());
  }

  async getChannelById(id: number): Promise<Channel | undefined> {
    return this.channels.get(id);
  }

  async getChannelByName(name: string): Promise<Channel | undefined> {
    return Array.from(this.channels.values()).find(channel => channel.name === name);
  }

  async updateChannel(id: number, updates: Partial<Channel>): Promise<Channel | undefined> {
    const channel = this.channels.get(id);
    if (!channel) return undefined;
    
    const updatedChannel = { ...channel, ...updates };
    this.channels.set(id, updatedChannel);
    return updatedChannel;
  }

  async deleteChannel(id: number): Promise<boolean> {
    return this.channels.delete(id);
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.currentMessageId++,
      messageId: insertMessage.messageId,
      channelId: insertMessage.channelId || null,
      content: insertMessage.content,
      mediaUrl: insertMessage.mediaUrl || null,
      processedAt: null,
      createdAt: new Date()
    };
    this.messages.set(message.id, message);
    return message;
  }

  async getMessages(channelId?: number, limit = 50): Promise<Message[]> {
    let messages = Array.from(this.messages.values());
    
    if (channelId) {
      messages = messages.filter(msg => msg.channelId === channelId);
    }
    
    return messages
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async getMessageById(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async markMessageProcessed(id: number): Promise<void> {
    const message = this.messages.get(id);
    if (message) {
      this.messages.set(id, { ...message, processedAt: new Date() });
    }
  }

  // Signal methods
  async createSignal(insertSignal: InsertSignal): Promise<Signal> {
    const signal: Signal = {
      id: this.currentSignalId++,
      ...insertSignal,
      createdAt: new Date()
    };
    this.signals.set(signal.id, signal);
    return signal;
  }

  async getSignals(limit = 50): Promise<Signal[]> {
    return Array.from(this.signals.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async getSignalById(id: number): Promise<Signal | undefined> {
    return this.signals.get(id);
  }

  async getSignalsByDateRange(startDate: Date, endDate: Date): Promise<Signal[]> {
    return Array.from(this.signals.values()).filter(signal => {
      const signalDate = signal.createdAt;
      return signalDate && signalDate >= startDate && signalDate <= endDate;
    });
  }

  // Trade methods
  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const trade: Trade = {
      id: this.currentTradeId++,
      ...insertTrade,
      createdAt: new Date()
    };
    this.trades.set(trade.id, trade);
    return trade;
  }

  async getTrades(userId?: number, limit = 50): Promise<Trade[]> {
    let trades = Array.from(this.trades.values());
    
    if (userId) {
      trades = trades.filter(trade => trade.userId === userId);
    }
    
    return trades
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async getTradeById(id: number): Promise<Trade | undefined> {
    return this.trades.get(id);
  }

  async updateTrade(id: number, updates: Partial<Trade>): Promise<Trade | undefined> {
    const trade = this.trades.get(id);
    if (!trade) return undefined;
    
    const updatedTrade = { ...trade, ...updates };
    this.trades.set(id, updatedTrade);
    return updatedTrade;
  }

  async getTradesByStatus(status: string): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(trade => trade.status === status);
  }

  // Manual rule methods
  async createManualRule(insertRule: InsertManualRule): Promise<ManualRule> {
    const rule: ManualRule = {
      id: this.currentRuleId++,
      ...insertRule,
      usageCount: 0,
      createdAt: new Date()
    };
    this.manualRules.set(rule.id, rule);
    return rule;
  }

  async getManualRules(channelId?: number, userId?: number): Promise<ManualRule[]> {
    let rules = Array.from(this.manualRules.values());
    
    if (channelId !== undefined) {
      rules = rules.filter(rule => rule.channelId === channelId || rule.channelId === null);
    }
    
    if (userId !== undefined) {
      rules = rules.filter(rule => rule.userId === userId);
    }
    
    return rules;
  }

  async getActiveManualRules(channelId?: number): Promise<ManualRule[]> {
    const rules = await this.getManualRules(channelId);
    return rules.filter(rule => rule.isActive);
  }

  async updateManualRule(id: number, updates: Partial<ManualRule>): Promise<ManualRule | undefined> {
    const rule = this.manualRules.get(id);
    if (!rule) return undefined;
    
    const updatedRule = { ...rule, ...updates };
    this.manualRules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteManualRule(id: number): Promise<boolean> {
    return this.manualRules.delete(id);
  }

  async incrementRuleUsage(id: number): Promise<void> {
    const rule = this.manualRules.get(id);
    if (rule) {
      this.manualRules.set(id, { ...rule, usageCount: (rule.usageCount || 0) + 1 });
    }
  }

  // Training data methods
  async createTrainingData(insertData: InsertTrainingData): Promise<TrainingData> {
    const data: TrainingData = {
      id: this.currentTrainingId++,
      ...insertData,
      createdAt: new Date()
    };
    this.trainingData.set(data.id, data);
    return data;
  }

  async getTrainingData(): Promise<TrainingData[]> {
    return Array.from(this.trainingData.values());
  }

  async updateTrainingData(id: number, updates: Partial<TrainingData>): Promise<TrainingData | undefined> {
    const data = this.trainingData.get(id);
    if (!data) return undefined;
    
    const updatedData = { ...data, ...updates };
    this.trainingData.set(id, updatedData);
    return updatedData;
  }

  async deleteTrainingData(id: number): Promise<boolean> {
    return this.trainingData.delete(id);
  }

  // User settings methods
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    return Array.from(this.userSettings.values()).find(settings => settings.userId === userId);
  }

  async updateUserSettings(userId: number, settingsUpdate: Partial<InsertUserSettings>): Promise<UserSettings> {
    const existing = await this.getUserSettings(userId);
    
    const settings: UserSettings = {
      id: existing?.id || this.currentUserSettingsId++,
      userId,
      maxLot: settingsUpdate.maxLot ?? existing?.maxLot ?? 0.1,
      riskPercent: settingsUpdate.riskPercent ?? existing?.riskPercent ?? 2.0,
      enableSignalCopier: settingsUpdate.enableSignalCopier ?? existing?.enableSignalCopier ?? true,
      enabledChannels: settingsUpdate.enabledChannels ?? existing?.enabledChannels ?? [],
      tradeFilters: settingsUpdate.tradeFilters ?? existing?.tradeFilters ?? null,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date()
    };
    
    this.userSettings.set(settings.id, settings);
    return settings;
  }

  // Audit log methods
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const log: AuditLog = {
      id: this.currentAuditLogId++,
      ...insertLog,
      createdAt: new Date()
    };
    this.auditLogs.set(log.id, log);
    return log;
  }

  async getAuditLogs(userId?: number, limit = 100): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values());
    
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    
    return logs
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  // Provider stats methods
  async getProviderStats(channelId: number): Promise<ProviderStats | undefined> {
    return Array.from(this.providerStats.values()).find(stats => stats.channelId === channelId);
  }

  async updateProviderStats(channelId: number, statsUpdate: Partial<InsertProviderStats>): Promise<ProviderStats> {
    const existing = await this.getProviderStats(channelId);
    
    const stats: ProviderStats = {
      id: existing?.id || this.currentProviderStatsId++,
      channelId,
      totalSignals: statsUpdate.totalSignals ?? existing?.totalSignals ?? 0,
      winRate: statsUpdate.winRate ?? existing?.winRate ?? 0,
      avgRiskReward: statsUpdate.avgRiskReward ?? existing?.avgRiskReward ?? 0,
      avgExecutionTime: statsUpdate.avgExecutionTime ?? existing?.avgExecutionTime ?? 0,
      lastUpdated: new Date()
    };
    
    this.providerStats.set(stats.id, stats);
    return stats;
  }

  // Statistics methods
  async getParsingStats(): Promise<{
    todayCount: number;
    avgConfidence: number;
    manualRulesUsed: number;
    ocrSuccessRate: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySignals = await this.getSignalsByDateRange(today, tomorrow);
    const allSignals = Array.from(this.signals.values());
    
    const todayCount = todaySignals.length;
    const avgConfidence = allSignals.length > 0 
      ? allSignals.reduce((sum, signal) => sum + (signal.confidence || 0), 0) / allSignals.length 
      : 0;
    
    const manualRulesUsed = allSignals.filter(signal => signal.manualRuleApplied).length;
    const ocrSignals = allSignals.filter(signal => signal.source === 'ocr');
    const ocrSuccessRate = ocrSignals.length > 0 
      ? (ocrSignals.filter(signal => (signal.confidence || 0) > 0.8).length / ocrSignals.length) 
      : 0;

    return {
      todayCount,
      avgConfidence: Math.round(avgConfidence * 1000) / 10,
      manualRulesUsed,
      ocrSuccessRate: Math.round(ocrSuccessRate * 1000) / 10,
    };
  }

  async getUserPerformance(userId: number): Promise<{
    totalTrades: number;
    winRate: number;
    totalPnl: number;
    avgRiskReward: number;
  }> {
    const userTrades = await this.getTrades(userId);
    const executedTrades = userTrades.filter(trade => trade.status === 'executed');
    
    const totalTrades = executedTrades.length;
    const winningTrades = executedTrades.filter(trade => trade.result === 'win');
    const winRate = totalTrades > 0 ? winningTrades.length / totalTrades : 0;
    const totalPnl = executedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    // Calculate average risk-reward ratio
    const rrRatios = executedTrades
      .filter(trade => trade.sl && trade.tp && trade.tp.length > 0 && trade.entry)
      .map(trade => {
        const risk = Math.abs((trade.entry || 0) - (trade.sl || 0));
        const reward = Math.abs((trade.tp?.[0] || 0) - (trade.entry || 0));
        return risk > 0 ? reward / risk : 0;
      });
    
    const avgRiskReward = rrRatios.length > 0 
      ? rrRatios.reduce((sum, ratio) => sum + ratio, 0) / rrRatios.length 
      : 0;

    return {
      totalTrades,
      winRate: Math.round(winRate * 1000) / 10,
      totalPnl: Math.round(totalPnl * 100) / 100,
      avgRiskReward: Math.round(avgRiskReward * 100) / 100
    };
  }
}

export const storage = new MemStorage();