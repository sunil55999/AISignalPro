import { 
  users, channels, messages, signals, trades, manualRules, trainingData,
  userSettings, auditLogs, providerStats,
  type User, type InsertUser, type Channel, type InsertChannel, type Message, type InsertMessage,
  type Signal, type InsertSignal, type Trade, type InsertTrade, type ManualRule, type InsertManualRule,
  type TrainingData, type InsertTrainingData, type UserSettings, type InsertUserSettings,
  type AuditLog, type InsertAuditLog, type ProviderStats, type InsertProviderStats
} from "@shared/schema";

// Fallback in-memory storage with proper types to fix infinite loops
export class FallbackStorage {
  private users = new Map<number, User>();
  private channels = new Map<number, Channel>();
  private messages = new Map<number, Message>();
  private signals = new Map<number, Signal>();
  private trades = new Map<number, Trade>();
  private manualRules = new Map<number, ManualRule>();
  private trainingData = new Map<number, TrainingData>();
  private userSettings = new Map<number, UserSettings>();
  private auditLogs = new Map<number, AuditLog>();
  private providerStats = new Map<number, ProviderStats>();

  private currentUserId = 1;
  private currentChannelId = 1;
  private currentMessageId = 1;
  private currentSignalId = 1;
  private currentTradeId = 1;
  private currentManualRuleId = 1;
  private currentTrainingDataId = 1;
  private currentUserSettingsId = 1;
  private currentAuditLogId = 1;
  private currentProviderStatsId = 1;

  constructor() {
    this.seedDatabase();
  }

  private seedDatabase() {
    // Create admin user
    const adminUser: User = {
      id: this.currentUserId++,
      username: 'admin',
      password: 'admin123',
      apiKey: null,
      isActive: true,
      isAdmin: true,
      createdAt: new Date()
    };
    this.users.set(adminUser.id, adminUser);

    // Create channels
    const goldChannel: Channel = {
      id: this.currentChannelId++,
      name: '@XAUUSDChannel',
      description: 'Gold trading signals',
      isActive: true,
      confidenceThreshold: 0.85,
      userId: adminUser.id,
      createdAt: new Date()
    };
    this.channels.set(goldChannel.id, goldChannel);

    const forexChannel: Channel = {
      id: this.currentChannelId++,
      name: '@ForexPro',
      description: 'Forex signals',
      isActive: true,
      confidenceThreshold: 0.80,
      userId: adminUser.id,
      createdAt: new Date()
    };
    this.channels.set(forexChannel.id, forexChannel);

    // Create user settings - Fixed to prevent infinite loops
    const settings: UserSettings = {
      id: this.currentUserSettingsId++,
      userId: adminUser.id,
      maxLot: 0.2,
      riskPercent: 2.0,
      enableSignalCopier: true,
      enabledChannels: [goldChannel.id, forexChannel.id],
      tradeFilters: { minConfidence: 0.8 },
      executionMode: "auto",
      minConfidence: 0.85,
      timezone: "UTC",
      maxDailyTrades: 10,
      maxDrawdown: 10.0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userSettings.set(adminUser.id, settings); // Key by userId, not id

    // Create manual rules
    const rule1: ManualRule = {
      id: this.currentManualRuleId++,
      pattern: 'SL to BE',
      action: 'Set stop loss to breakeven',
      isActive: true,
      userId: adminUser.id,
      channelId: goldChannel.id,
      usageCount: 0,
      createdAt: new Date()
    };
    this.manualRules.set(rule1.id, rule1);

    const rule2: ManualRule = {
      id: this.currentManualRuleId++,
      pattern: 'Close 50%',
      action: 'Close 50% of position',
      isActive: true,
      userId: adminUser.id,
      channelId: forexChannel.id,
      usageCount: 0,
      createdAt: new Date()
    };
    this.manualRules.set(rule2.id, rule2);
  }

  // Users
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.currentUserId++,
      username: user.username,
      password: user.password,
      apiKey: null,
      isActive: true,
      isAdmin: false,
      createdAt: new Date()
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    
    const updated = { ...existing, ...user };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Signals
  async getSignals(): Promise<Signal[]> {
    return Array.from(this.signals.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getSignalById(id: number): Promise<Signal | null> {
    return this.signals.get(id) || null;
  }

  async createSignal(signal: InsertSignal): Promise<Signal> {
    const newSignal: Signal = {
      id: this.currentSignalId++,
      signalId: signal.signalId,
      signalHash: signal.signalHash,
      rawText: signal.rawText,
      source: signal.source,
      intent: signal.intent,
      confidence: signal.confidence,
      pair: signal.pair || null,
      action: signal.action || null,
      entry: signal.entry || null,
      sl: signal.sl || null,
      tp: signal.tp || null,
      orderType: signal.orderType || null,
      volumePercent: signal.volumePercent || null,
      modifications: signal.modifications || null,
      status: "pending",
      isVerified: false,
      retryCount: 0,
      manualRuleApplied: signal.manualRuleApplied || null,
      channelName: signal.channelName || null,
      externalMessageId: signal.externalMessageId || null,
      createdAt: new Date(),
      processedAt: null,
      userId: signal.userId || null,
      messageId: signal.messageId || null,
      channelId: signal.channelId || null,
      imagePath: signal.imagePath || null,
      imageCaption: signal.imageCaption || null,
      errorMessage: signal.errorMessage || null
    };
    this.signals.set(newSignal.id, newSignal);
    return newSignal;
  }

  async updateSignal(id: number, signal: Partial<InsertSignal>): Promise<Signal | null> {
    const existing = this.signals.get(id);
    if (!existing) return null;
    
    const updated = { ...existing, ...signal };
    this.signals.set(id, updated);
    return updated;
  }

  async deleteSignal(id: number): Promise<boolean> {
    return this.signals.delete(id);
  }

  async getSignalsByUser(userId: number): Promise<Signal[]> {
    return Array.from(this.signals.values())
      .filter(signal => signal.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getSignalsByDateRange(startDate: Date, endDate: Date): Promise<Signal[]> {
    return Array.from(this.signals.values()).filter(signal => {
      const createdAt = new Date(signal.createdAt!);
      return createdAt >= startDate && createdAt <= endDate;
    });
  }

  async getSignalsByChannel(channelId: number): Promise<Signal[]> {
    return Array.from(this.signals.values()).filter(signal => signal.channelId === channelId);
  }

  // Channels
  async getChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getChannelById(id: number): Promise<Channel | null> {
    return this.channels.get(id) || null;
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    const newChannel: Channel = {
      id: this.currentChannelId++,
      ...channel,
      createdAt: new Date()
    };
    this.channels.set(newChannel.id, newChannel);
    return newChannel;
  }

  async updateChannel(id: number, channel: Partial<InsertChannel>): Promise<Channel | null> {
    const existing = this.channels.get(id);
    if (!existing) return null;
    
    const updated = { ...existing, ...channel };
    this.channels.set(id, updated);
    return updated;
  }

  async deleteChannel(id: number): Promise<boolean> {
    return this.channels.delete(id);
  }

  // Messages
  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }

  async getMessageById(id: number): Promise<Message | null> {
    return this.messages.get(id) || null;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const newMessage: Message = {
      id: this.currentMessageId++,
      ...message,
      createdAt: new Date(),
      processedAt: message.processedAt || null
    };
    this.messages.set(newMessage.id, newMessage);
    return newMessage;
  }

  async updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message | null> {
    const existing = this.messages.get(id);
    if (!existing) return null;
    
    const updated = { ...existing, ...message };
    this.messages.set(id, updated);
    return updated;
  }

  async deleteMessage(id: number): Promise<boolean> {
    return this.messages.delete(id);
  }

  async getMessagesByChannel(channelId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(msg => msg.channelId === channelId);
  }

  // Trades
  async getTrades(): Promise<Trade[]> {
    return Array.from(this.trades.values());
  }

  async getTradeById(id: number): Promise<Trade | null> {
    return this.trades.get(id) || null;
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const newTrade: Trade = {
      id: this.currentTradeId++,
      status: "pending",
      executedAt: null,
      result: null,
      ...trade,
      createdAt: new Date()
    };
    this.trades.set(newTrade.id, newTrade);
    return newTrade;
  }

  async updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade | null> {
    const existing = this.trades.get(id);
    if (!existing) return null;
    
    const updated = { ...existing, ...trade };
    this.trades.set(id, updated);
    return updated;
  }

  async deleteTrade(id: number): Promise<boolean> {
    return this.trades.delete(id);
  }

  async getTradesByUser(userId: number): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(trade => trade.userId === userId);
  }

  // Manual Rules
  async getManualRules(): Promise<ManualRule[]> {
    return Array.from(this.manualRules.values());
  }

  async getManualRuleById(id: number): Promise<ManualRule | null> {
    return this.manualRules.get(id) || null;
  }

  async createManualRule(rule: InsertManualRule): Promise<ManualRule> {
    const newRule: ManualRule = {
      id: this.currentManualRuleId++,
      usageCount: 0,
      isActive: rule.isActive ?? true,
      ...rule,
      createdAt: new Date()
    };
    this.manualRules.set(newRule.id, newRule);
    return newRule;
  }

  async updateManualRule(id: number, rule: Partial<InsertManualRule>): Promise<ManualRule | null> {
    const existing = this.manualRules.get(id);
    if (!existing) return null;
    
    const updated = { ...existing, ...rule };
    this.manualRules.set(id, updated);
    return updated;
  }

  async deleteManualRule(id: number): Promise<boolean> {
    return this.manualRules.delete(id);
  }

  async getActiveManualRules(): Promise<ManualRule[]> {
    return Array.from(this.manualRules.values()).filter(rule => rule.isActive);
  }

  // Training Data
  async getTrainingData(): Promise<TrainingData[]> {
    return Array.from(this.trainingData.values());
  }

  async getTrainingDataById(id: number): Promise<TrainingData | null> {
    return this.trainingData.get(id) || null;
  }

  async createTrainingData(data: InsertTrainingData): Promise<TrainingData> {
    const newData: TrainingData = {
      id: this.currentTrainingDataId++,
      isVerified: data.isVerified ?? false,
      ...data,
      createdAt: new Date()
    };
    this.trainingData.set(newData.id, newData);
    return newData;
  }

  async updateTrainingData(id: number, data: Partial<InsertTrainingData>): Promise<TrainingData | null> {
    const existing = this.trainingData.get(id);
    if (!existing) return null;
    
    const updated = { ...existing, ...data };
    this.trainingData.set(id, updated);
    return updated;
  }

  async deleteTrainingData(id: number): Promise<boolean> {
    return this.trainingData.delete(id);
  }

  // User Settings - Fixed to prevent infinite loops
  async getUserSettings(userId: number): Promise<UserSettings | null> {
    return this.userSettings.get(userId) || null;
  }

  async updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | null> {
    const existing = this.userSettings.get(userId);
    if (!existing) {
      // Create new settings if they don't exist
      const newSettings: UserSettings = {
        id: this.currentUserSettingsId++,
        userId,
        maxLot: 0.2,
        riskPercent: 2.0,
        enableSignalCopier: true,
        enabledChannels: [],
        tradeFilters: {},
        executionMode: "auto",
        minConfidence: 0.85,
        timezone: "UTC",
        maxDailyTrades: 10,
        maxDrawdown: 10.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...settings
      };
      this.userSettings.set(userId, newSettings);
      return newSettings;
    }
    
    const updated = { 
      ...existing, 
      ...settings, 
      updatedAt: new Date() 
    };
    this.userSettings.set(userId, updated);
    return updated;
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const newLog: AuditLog = {
      id: this.currentAuditLogId++,
      ...log,
      createdAt: new Date()
    };
    this.auditLogs.set(newLog.id, newLog);
    return newLog;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values());
  }

  // Provider Stats
  async getProviderStats(): Promise<ProviderStats[]> {
    return Array.from(this.providerStats.values());
  }

  async updateProviderStats(channelId: number, stats: Partial<InsertProviderStats>): Promise<ProviderStats | null> {
    const existing = Array.from(this.providerStats.values()).find(s => s.channelId === channelId);
    
    if (existing) {
      const updated = { ...existing, ...stats, lastUpdated: new Date() };
      this.providerStats.set(existing.id, updated);
      return updated;
    } else {
      const newStats: ProviderStats = {
        id: this.currentProviderStatsId++,
        channelId,
        totalSignals: 0,
        winRate: 0,
        avgRiskReward: 0,
        avgExecutionTime: 0,
        lastUpdated: new Date(),
        ...stats
      };
      this.providerStats.set(newStats.id, newStats);
      return newStats;
    }
  }

  async initialize(): Promise<void> {
    // Already initialized in constructor
    console.log('Fallback storage initialized');
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Missing methods for API compatibility
  async incrementRuleUsage(ruleId: number): Promise<void> {
    const rule = this.manualRules.get(ruleId);
    if (rule) {
      rule.usageCount = (rule.usageCount || 0) + 1;
    }
  }

  async markMessageProcessed(messageId: number): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      message.processedAt = new Date();
    }
  }

  async getUser(id: number): Promise<User | null> {
    return this.getUserById(id);
  }

  async getUserPerformance(userId: number): Promise<any> {
    const userTrades = await this.getTradesByUser(userId);
    const totalTrades = userTrades.length;
    const winningTrades = userTrades.filter(t => t.pnl && t.pnl > 0).length;
    const totalPnl = userTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    return {
      totalTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      totalPnl,
      avgPnl: totalTrades > 0 ? totalPnl / totalTrades : 0
    };
  }

  async getTradesByStatus(status: string): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(trade => trade.status === status);
  }

  async getChannelByName(name: string): Promise<Channel | null> {
    return Array.from(this.channels.values()).find(channel => channel.name === name) || null;
  }

  async getParsingStats(): Promise<any> {
    const signals = await this.getSignals();
    const totalSignals = signals.length;
    const successfulSignals = signals.filter(s => s.confidence && s.confidence > 0.8).length;
    
    return {
      totalParsed: totalSignals,
      successRate: totalSignals > 0 ? (successfulSignals / totalSignals) * 100 : 0,
      avgConfidence: totalSignals > 0 ? 
        signals.reduce((sum, s) => sum + (s.confidence || 0), 0) / totalSignals : 0
    };
  }
}

export const fallbackStorage = new FallbackStorage();