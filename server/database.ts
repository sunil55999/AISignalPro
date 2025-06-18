import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import {
  users, channels, messages, signals, trades, manualRules, trainingData,
  userSettings, auditLogs, providerStats, roles, userRoles, providerPerformance, signalQueue,
  type User, type InsertUser, type Channel, type InsertChannel, type Message, type InsertMessage,
  type Signal, type InsertSignal, type Trade, type InsertTrade, type ManualRule, type InsertManualRule,
  type TrainingData, type InsertTrainingData, type UserSettings, type InsertUserSettings,
  type AuditLog, type InsertAuditLog, type ProviderStats, type InsertProviderStats
} from "@shared/schema";

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export class DatabaseStorage {
  // Initialize and seed database
  async initialize(): Promise<void> {
    try {
      // Check if admin user exists
      const existingUser = await db.select().from(users).where(eq(users.id, 1)).limit(1);
      
      if (existingUser.length === 0) {
        // Create admin user
        await db.insert(users).values({
          username: 'admin',
          password: 'admin123', // In production, use proper hashing
        });

        // Create default channels
        const goldChannel = await db.insert(channels).values({
          name: '@XAUUSDChannel',
          description: 'Gold trading signals',
          isActive: true,
        }).returning();

        const forexChannel = await db.insert(channels).values({
          name: '@ForexPro',
          description: 'Forex signals',
          isActive: true,
        }).returning();

        // Create default user settings
        await db.insert(userSettings).values({
          userId: 1,
          maxLot: 0.2,
          riskPercent: 2.0,
          enableSignalCopier: true,
          enabledChannels: [goldChannel[0].id, forexChannel[0].id],
          tradeFilters: { minConfidence: 0.8 },
          executionMode: "auto",
          minConfidence: 0.85,
          timezone: "UTC",
          maxDailyTrades: 10,
          maxDrawdown: 10.0,
        });

        // Create default manual rules
        await db.insert(manualRules).values([
          {
            pattern: 'SL to BE',
            action: 'Set stop loss to breakeven',
            isActive: true,
            userId: 1,
            channelId: goldChannel[0].id,
            usageCount: 0,
          },
          {
            pattern: 'Close 50%',
            action: 'Close 50% of position',
            isActive: true,
            userId: 1,
            channelId: forexChannel[0].id,
            usageCount: 0,
          }
        ]);

        console.log('Database initialized with default data');
      }
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  // Users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserById(id: number): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | null> {
    const result = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return result[0] || null;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // Signals
  async getSignals(): Promise<Signal[]> {
    return await db.select().from(signals).orderBy(desc(signals.createdAt));
  }

  async getSignalById(id: number): Promise<Signal | null> {
    const result = await db.select().from(signals).where(eq(signals.id, id)).limit(1);
    return result[0] || null;
  }

  async createSignal(signal: InsertSignal): Promise<Signal> {
    const result = await db.insert(signals).values({
      ...signal,
      signalId: signal.signalId || `SIG_${Date.now()}`,
      signalHash: signal.signalHash || `HASH_${Date.now()}`,
    }).returning();
    return result[0];
  }

  async updateSignal(id: number, signal: Partial<InsertSignal>): Promise<Signal | null> {
    const result = await db.update(signals).set(signal).where(eq(signals.id, id)).returning();
    return result[0] || null;
  }

  async deleteSignal(id: number): Promise<boolean> {
    const result = await db.delete(signals).where(eq(signals.id, id));
    return result.rowCount > 0;
  }

  async getSignalsByUser(userId: number): Promise<Signal[]> {
    return await db.select().from(signals).where(eq(signals.userId, userId)).orderBy(desc(signals.createdAt));
  }

  async getSignalsByDateRange(startDate: Date, endDate: Date): Promise<Signal[]> {
    return await db.select().from(signals)
      .where(and(
        gte(signals.createdAt, startDate),
        lte(signals.createdAt, endDate)
      ))
      .orderBy(desc(signals.createdAt));
  }

  async getSignalsByChannel(channelId: number): Promise<Signal[]> {
    return await db.select().from(signals).where(eq(signals.channelId, channelId)).orderBy(desc(signals.createdAt));
  }

  // Channels
  async getChannels(): Promise<Channel[]> {
    return await db.select().from(channels).orderBy(asc(channels.name));
  }

  async getChannelById(id: number): Promise<Channel | null> {
    const result = await db.select().from(channels).where(eq(channels.id, id)).limit(1);
    return result[0] || null;
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    const result = await db.insert(channels).values(channel).returning();
    return result[0];
  }

  async updateChannel(id: number, channel: Partial<InsertChannel>): Promise<Channel | null> {
    const result = await db.update(channels).set(channel).where(eq(channels.id, id)).returning();
    return result[0] || null;
  }

  async deleteChannel(id: number): Promise<boolean> {
    const result = await db.delete(channels).where(eq(channels.id, id));
    return result.rowCount > 0;
  }

  // Messages
  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getMessageById(id: number): Promise<Message | null> {
    const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return result[0] || null;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message | null> {
    const result = await db.update(messages).set(message).where(eq(messages.id, id)).returning();
    return result[0] || null;
  }

  async deleteMessage(id: number): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return result.rowCount > 0;
  }

  async getMessagesByChannel(channelId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.channelId, channelId)).orderBy(desc(messages.createdAt));
  }

  // Trades
  async getTrades(): Promise<Trade[]> {
    return await db.select().from(trades).orderBy(desc(trades.createdAt));
  }

  async getTradeById(id: number): Promise<Trade | null> {
    const result = await db.select().from(trades).where(eq(trades.id, id)).limit(1);
    return result[0] || null;
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const result = await db.insert(trades).values({
      ...trade,
      status: trade.status || "pending",
      executedAt: null,
    }).returning();
    return result[0];
  }

  async updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade | null> {
    const result = await db.update(trades).set(trade).where(eq(trades.id, id)).returning();
    return result[0] || null;
  }

  async deleteTrade(id: number): Promise<boolean> {
    const result = await db.delete(trades).where(eq(trades.id, id));
    return result.rowCount > 0;
  }

  async getTradesByUser(userId: number): Promise<Trade[]> {
    return await db.select().from(trades).where(eq(trades.userId, userId)).orderBy(desc(trades.createdAt));
  }

  // Manual Rules
  async getManualRules(): Promise<ManualRule[]> {
    return await db.select().from(manualRules).orderBy(asc(manualRules.pattern));
  }

  async getManualRuleById(id: number): Promise<ManualRule | null> {
    const result = await db.select().from(manualRules).where(eq(manualRules.id, id)).limit(1);
    return result[0] || null;
  }

  async createManualRule(rule: InsertManualRule): Promise<ManualRule> {
    const result = await db.insert(manualRules).values({
      ...rule,
      usageCount: 0,
      isActive: rule.isActive ?? true,
    }).returning();
    return result[0];
  }

  async updateManualRule(id: number, rule: Partial<InsertManualRule>): Promise<ManualRule | null> {
    const result = await db.update(manualRules).set(rule).where(eq(manualRules.id, id)).returning();
    return result[0] || null;
  }

  async deleteManualRule(id: number): Promise<boolean> {
    const result = await db.delete(manualRules).where(eq(manualRules.id, id));
    return result.rowCount > 0;
  }

  async getActiveManualRules(): Promise<ManualRule[]> {
    return await db.select().from(manualRules).where(eq(manualRules.isActive, true));
  }

  // Training Data
  async getTrainingData(): Promise<TrainingData[]> {
    return await db.select().from(trainingData).orderBy(desc(trainingData.createdAt));
  }

  async getTrainingDataById(id: number): Promise<TrainingData | null> {
    const result = await db.select().from(trainingData).where(eq(trainingData.id, id)).limit(1);
    return result[0] || null;
  }

  async createTrainingData(data: InsertTrainingData): Promise<TrainingData> {
    const result = await db.insert(trainingData).values({
      ...data,
      isVerified: data.isVerified ?? false,
    }).returning();
    return result[0];
  }

  async updateTrainingData(id: number, data: Partial<InsertTrainingData>): Promise<TrainingData | null> {
    const result = await db.update(trainingData).set(data).where(eq(trainingData.id, id)).returning();
    return result[0] || null;
  }

  async deleteTrainingData(id: number): Promise<boolean> {
    const result = await db.delete(trainingData).where(eq(trainingData.id, id));
    return result.rowCount > 0;
  }

  // User Settings
  async getUserSettings(userId: number): Promise<UserSettings | null> {
    const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    return result[0] || null;
  }

  async updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | null> {
    const result = await db.update(userSettings).set({
      ...settings,
      updatedAt: new Date(),
    }).where(eq(userSettings.userId, userId)).returning();
    return result[0] || null;
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLogs).values(log).returning();
    return result[0];
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
  }

  // Provider Stats
  async getProviderStats(): Promise<ProviderStats[]> {
    return await db.select().from(providerStats).orderBy(desc(providerStats.lastUpdated));
  }

  async updateProviderStats(channelId: number, stats: Partial<InsertProviderStats>): Promise<ProviderStats | null> {
    const result = await db.update(providerStats).set({
      ...stats,
      lastUpdated: new Date(),
    }).where(eq(providerStats.channelId, channelId)).returning();
    
    if (result.length === 0) {
      // Create if doesn't exist
      const created = await db.insert(providerStats).values({
        channelId,
        totalSignals: 0,
        winRate: 0,
        avgRiskReward: 0,
        avgExecutionTime: 0,
        ...stats,
      }).returning();
      return created[0];
    }
    
    return result[0];
  }

  // Database health check
  async healthCheck(): Promise<boolean> {
    try {
      await db.select().from(users).limit(1);
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();