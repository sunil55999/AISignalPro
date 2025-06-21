import {
  User, InsertUser, Signal, InsertSignal, Channel, InsertChannel, 
  Message, InsertMessage, Trade, InsertTrade, ManualRule, InsertManualRule,
  TrainingData, InsertTrainingData, UserSettings, InsertUserSettings,
  AuditLog, InsertAuditLog, ProviderStats, InsertProviderStats
} from "../shared/schema.js";

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
      id: 1,
      username: "admin",
      email: "admin@tradingsignals.com",
      role: "admin",
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(1, adminUser);

    // Create sample channels
    const goldChannel: Channel = {
      id: 1,
      name: "Gold Signals VIP",
      telegramId: "123456789",
      isActive: true,
      description: "Premium gold trading signals",
      subscriberCount: 1250,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const forexChannel: Channel = {
      id: 2,
      name: "Forex Master Signals",
      telegramId: "987654321",
      isActive: true,
      description: "Professional forex signals",
      subscriberCount: 890,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.channels.set(1, goldChannel);
    this.channels.set(2, forexChannel);

    // Create user settings
    const settings: UserSettings = {
      id: 1,
      userId: 1,
      maxLot: 0.1,
      riskPercent: 2.0,
      enableSignalCopier: true,
      enabledChannels: [1, 2],
      tradeFilters: {},
      executionMode: "auto",
      minConfidence: 0.85,
      timezone: "UTC",
      maxDailyTrades: 10,
      maxDrawdown: 10.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userSettings.set(1, settings);

    // Create sample manual rules
    const rule1: ManualRule = {
      id: 1,
      channelId: 1,
      name: "Gold Buy Pattern",
      pattern: "GOLD.*BUY.*@([0-9]+)",
      priority: 1,
      isActive: true,
      defaultPair: "XAUUSD",
      defaultAction: "buy",
      defaultEntry: null,
      defaultSl: null,
      defaultTp: null,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const rule2: ManualRule = {
      id: 2,
      channelId: 2,
      name: "EUR/USD Sell Pattern",
      pattern: "EURUSD.*SELL.*([0-9.]+)",
      priority: 2,
      isActive: true,
      defaultPair: "EURUSD",
      defaultAction: "sell",
      defaultEntry: null,
      defaultSl: null,
      defaultTp: null,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.manualRules.set(1, rule1);
    this.manualRules.set(2, rule2);
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.currentUserId++,
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | null> {
    const existingUser = this.users.get(id);
    if (!existingUser) return null;

    const updatedUser = { ...existingUser, ...user, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Signal operations
  async getSignals(): Promise<Signal[]> {
    return Array.from(this.signals.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getSignalById(id: number): Promise<Signal | null> {
    return this.signals.get(id) || null;
  }

  async createSignal(signal: InsertSignal): Promise<Signal> {
    const newSignal: Signal = {
      id: this.currentSignalId++,
      ...signal,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.signals.set(newSignal.id, newSignal);
    return newSignal;
  }

  async updateSignal(id: number, signal: Partial<InsertSignal>): Promise<Signal | null> {
    const existingSignal = this.signals.get(id);
    if (!existingSignal) return null;

    const updatedSignal = { ...existingSignal, ...signal, updatedAt: new Date() };
    this.signals.set(id, updatedSignal);
    return updatedSignal;
  }

  async deleteSignal(id: number): Promise<boolean> {
    return this.signals.delete(id);
  }

  async getSignalsByUser(userId: number): Promise<Signal[]> {
    return Array.from(this.signals.values()).filter(s => s.userId === userId);
  }

  async getSignalsByDateRange(startDate: Date, endDate: Date): Promise<Signal[]> {
    return Array.from(this.signals.values()).filter(s => 
      s.createdAt >= startDate && s.createdAt <= endDate
    );
  }

  async getSignalsByChannel(channelId: number): Promise<Signal[]> {
    return Array.from(this.signals.values()).filter(s => s.channelId === channelId);
  }

  // Channel operations
  async getChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values());
  }

  async getChannelById(id: number): Promise<Channel | null> {
    return this.channels.get(id) || null;
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    const newChannel: Channel = {
      id: this.currentChannelId++,
      ...channel,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.channels.set(newChannel.id, newChannel);
    return newChannel;
  }

  async updateChannel(id: number, channel: Partial<InsertChannel>): Promise<Channel | null> {
    const existingChannel = this.channels.get(id);
    if (!existingChannel) return null;

    const updatedChannel = { ...existingChannel, ...channel, updatedAt: new Date() };
    this.channels.set(id, updatedChannel);
    return updatedChannel;
  }

  async deleteChannel(id: number): Promise<boolean> {
    return this.channels.delete(id);
  }

  // Message operations
  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getMessageById(id: number): Promise<Message | null> {
    return this.messages.get(id) || null;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const newMessage: Message = {
      id: this.currentMessageId++,
      ...message,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.messages.set(newMessage.id, newMessage);
    return newMessage;
  }

  async updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message | null> {
    const existingMessage = this.messages.get(id);
    if (!existingMessage) return null;

    const updatedMessage = { ...existingMessage, ...message, updatedAt: new Date() };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  async deleteMessage(id: number): Promise<boolean> {
    return this.messages.delete(id);
  }

  async getMessagesByChannel(channelId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(m => m.channelId === channelId);
  }

  // Trade operations
  async getTrades(): Promise<Trade[]> {
    return Array.from(this.trades.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTradeById(id: number): Promise<Trade | null> {
    return this.trades.get(id) || null;
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const newTrade: Trade = {
      id: this.currentTradeId++,
      ...trade,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.trades.set(newTrade.id, newTrade);
    return newTrade;
  }

  async updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade | null> {
    const existingTrade = this.trades.get(id);
    if (!existingTrade) return null;

    const updatedTrade = { ...existingTrade, ...trade, updatedAt: new Date() };
    this.trades.set(id, updatedTrade);
    return updatedTrade;
  }

  async deleteTrade(id: number): Promise<boolean> {
    return this.trades.delete(id);
  }

  async getTradesByUser(userId: number): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(t => t.userId === userId);
  }

  // Manual Rules operations
  async getManualRules(): Promise<ManualRule[]> {
    return Array.from(this.manualRules.values());
  }

  async getManualRuleById(id: number): Promise<ManualRule | null> {
    return this.manualRules.get(id) || null;
  }

  async createManualRule(rule: InsertManualRule): Promise<ManualRule> {
    const newRule: ManualRule = {
      id: this.currentManualRuleId++,
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.manualRules.set(newRule.id, newRule);
    return newRule;
  }

  async updateManualRule(id: number, rule: Partial<InsertManualRule>): Promise<ManualRule | null> {
    const existingRule = this.manualRules.get(id);
    if (!existingRule) return null;

    const updatedRule = { ...existingRule, ...rule, updatedAt: new Date() };
    this.manualRules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteManualRule(id: number): Promise<boolean> {
    return this.manualRules.delete(id);
  }

  async getActiveManualRules(): Promise<ManualRule[]> {
    return Array.from(this.manualRules.values()).filter(r => r.isActive);
  }

  // Training Data operations
  async getTrainingData(): Promise<TrainingData[]> {
    return Array.from(this.trainingData.values());
  }

  async getTrainingDataById(id: number): Promise<TrainingData | null> {
    return this.trainingData.get(id) || null;
  }

  async createTrainingData(data: InsertTrainingData): Promise<TrainingData> {
    const newData: TrainingData = {
      id: this.currentTrainingDataId++,
      ...data,
      createdAt: new Date(),
    };
    this.trainingData.set(newData.id, newData);
    return newData;
  }

  async updateTrainingData(id: number, data: Partial<InsertTrainingData>): Promise<TrainingData | null> {
    const existingData = this.trainingData.get(id);
    if (!existingData) return null;

    const updatedData = { ...existingData, ...data };
    this.trainingData.set(id, updatedData);
    return updatedData;
  }

  async deleteTrainingData(id: number): Promise<boolean> {
    return this.trainingData.delete(id);
  }

  // User Settings operations
  async getUserSettings(userId: number): Promise<UserSettings | null> {
    return Array.from(this.userSettings.values()).find(s => s.userId === userId) || null;
  }

  async updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | null> {
    const existing = Array.from(this.userSettings.values()).find(s => s.userId === userId);
    
    if (existing) {
      const updated = { ...existing, ...settings, updatedAt: new Date() };
      this.userSettings.set(existing.id, updated);
      return updated;
    } else {
      const newSettings: UserSettings = {
        id: this.currentUserSettingsId++,
        userId,
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserSettings;
      this.userSettings.set(newSettings.id, newSettings);
      return newSettings;
    }
  }

  // Audit Log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const newLog: AuditLog = {
      id: this.currentAuditLogId++,
      ...log,
      createdAt: new Date(),
    };
    this.auditLogs.set(newLog.id, newLog);
    return newLog;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Provider Stats operations
  async getProviderStats(): Promise<ProviderStats[]> {
    return Array.from(this.providerStats.values());
  }

  async updateProviderStats(channelId: number, stats: Partial<InsertProviderStats>): Promise<ProviderStats | null> {
    const existing = Array.from(this.providerStats.values()).find(s => s.channelId === channelId);
    
    if (existing) {
      const updated = { ...existing, ...stats, updatedAt: new Date() };
      this.providerStats.set(existing.id, updated);
      return updated;
    } else {
      const newStats: ProviderStats = {
        id: this.currentProviderStatsId++,
        channelId,
        ...stats,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ProviderStats;
      this.providerStats.set(newStats.id, newStats);
      return newStats;
    }
  }

  // Infrastructure methods
  async initialize(): Promise<void> {
    console.log("Fallback storage initialized with sample data");
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Helper methods
  async incrementRuleUsage(ruleId: number): Promise<void> {
    const rule = this.manualRules.get(ruleId);
    if (rule) {
      rule.usageCount = (rule.usageCount || 0) + 1;
      this.manualRules.set(ruleId, rule);
    }
  }

  async markMessageProcessed(messageId: number): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      message.isProcessed = true;
      this.messages.set(messageId, message);
    }
  }

  // Additional helper methods for compatibility
  async getUser(id: number): Promise<User | null> {
    return this.getUserById(id);
  }

  async getUserPerformance(userId: number): Promise<any> {
    const trades = await this.getTradesByUser(userId);
    const signals = await this.getSignalsByUser(userId);
    
    return {
      totalTrades: trades.length,
      totalSignals: signals.length,
      winRate: trades.length > 0 ? (trades.filter(t => t.status === 'closed' && t.profit > 0).length / trades.length) * 100 : 0,
      totalProfit: trades.reduce((sum, t) => sum + (t.profit || 0), 0),
    };
  }

  async getTradesByStatus(status: string): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(t => t.status === status);
  }

  async getChannelByName(name: string): Promise<Channel | null> {
    return Array.from(this.channels.values()).find(c => c.name === name) || null;
  }

  async getParsingStats(): Promise<any> {
    const signals = await this.getSignals();
    return {
      totalParsed: signals.length,
      averageConfidence: signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length || 0,
      successRate: signals.filter(s => s.confidence >= 0.85).length / signals.length || 0,
    };
  }
}

export const fallbackStorage = new FallbackStorage();