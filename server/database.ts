import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../shared/schema.js";
import { 
  User, InsertUser, Signal, InsertSignal, Channel, InsertChannel, 
  Message, InsertMessage, Trade, InsertTrade, ManualRule, InsertManualRule,
  TrainingData, InsertTrainingData, UserSettings, InsertUserSettings,
  AuditLog, InsertAuditLog, ProviderStats, InsertProviderStats,
  ParserDeployment, InsertParserDeployment, ApiKey, InsertApiKey,
  SyncRequest, InsertSyncRequest
} from "../shared/schema.js";
import { eq, and, gte, lte, desc } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

export class DatabaseStorage {
  private db = db;

  async initialize(): Promise<void> {
    try {
      // Test connection
      await this.db.select().from(schema.users).limit(1);
      console.log("Database connection established successfully");
    } catch (error) {
      console.error("Database initialization failed:", error);
      throw error;
    }
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return await this.db.select().from(schema.users);
  }

  async getUserById(id: number): Promise<User | null> {
    const users = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    return users[0] || null;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(schema.users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | null> {
    const result = await this.db.update(schema.users).set(user).where(eq(schema.users.id, id)).returning();
    return result[0] || null;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.users).where(eq(schema.users.id, id));
    return result.rowCount > 0;
  }

  // Signal operations
  async getSignals(): Promise<Signal[]> {
    return await this.db.select().from(schema.signals).orderBy(desc(schema.signals.createdAt));
  }

  async getSignalById(id: number): Promise<Signal | null> {
    const signals = await this.db.select().from(schema.signals).where(eq(schema.signals.id, id));
    return signals[0] || null;
  }

  async createSignal(signal: InsertSignal): Promise<Signal> {
    const result = await this.db.insert(schema.signals).values(signal).returning();
    return result[0];
  }

  async updateSignal(id: number, signal: Partial<InsertSignal>): Promise<Signal | null> {
    const result = await this.db.update(schema.signals).set(signal).where(eq(schema.signals.id, id)).returning();
    return result[0] || null;
  }

  async deleteSignal(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.signals).where(eq(schema.signals.id, id));
    return result.rowCount > 0;
  }

  async getSignalsByUser(userId: number): Promise<Signal[]> {
    return await this.db.select().from(schema.signals).where(eq(schema.signals.userId, userId));
  }

  async getSignalsByDateRange(startDate: Date, endDate: Date): Promise<Signal[]> {
    return await this.db.select().from(schema.signals).where(
      and(
        gte(schema.signals.createdAt, startDate),
        lte(schema.signals.createdAt, endDate)
      )
    );
  }

  async getSignalsByChannel(channelId: number): Promise<Signal[]> {
    return await this.db.select().from(schema.signals).where(eq(schema.signals.channelId, channelId));
  }

  // Channel operations
  async getChannels(): Promise<Channel[]> {
    return await this.db.select().from(schema.channels);
  }

  async getChannelById(id: number): Promise<Channel | null> {
    const channels = await this.db.select().from(schema.channels).where(eq(schema.channels.id, id));
    return channels[0] || null;
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    const result = await this.db.insert(schema.channels).values(channel).returning();
    return result[0];
  }

  async updateChannel(id: number, channel: Partial<InsertChannel>): Promise<Channel | null> {
    const result = await this.db.update(schema.channels).set(channel).where(eq(schema.channels.id, id)).returning();
    return result[0] || null;
  }

  async deleteChannel(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.channels).where(eq(schema.channels.id, id));
    return result.rowCount > 0;
  }

  // Message operations
  async getMessages(): Promise<Message[]> {
    return await this.db.select().from(schema.messages).orderBy(desc(schema.messages.createdAt));
  }

  async getMessageById(id: number): Promise<Message | null> {
    const messages = await this.db.select().from(schema.messages).where(eq(schema.messages.id, id));
    return messages[0] || null;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await this.db.insert(schema.messages).values(message).returning();
    return result[0];
  }

  async updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message | null> {
    const result = await this.db.update(schema.messages).set(message).where(eq(schema.messages.id, id)).returning();
    return result[0] || null;
  }

  async deleteMessage(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.messages).where(eq(schema.messages.id, id));
    return result.rowCount > 0;
  }

  async getMessagesByChannel(channelId: number): Promise<Message[]> {
    return await this.db.select().from(schema.messages).where(eq(schema.messages.channelId, channelId));
  }

  // Trade operations
  async getTrades(): Promise<Trade[]> {
    return await this.db.select().from(schema.trades).orderBy(desc(schema.trades.createdAt));
  }

  async getTradeById(id: number): Promise<Trade | null> {
    const trades = await this.db.select().from(schema.trades).where(eq(schema.trades.id, id));
    return trades[0] || null;
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const result = await this.db.insert(schema.trades).values(trade).returning();
    return result[0];
  }

  async updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade | null> {
    const result = await this.db.update(schema.trades).set(trade).where(eq(schema.trades.id, id)).returning();
    return result[0] || null;
  }

  async deleteTrade(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.trades).where(eq(schema.trades.id, id));
    return result.rowCount > 0;
  }

  async getTradesByUser(userId: number): Promise<Trade[]> {
    return await this.db.select().from(schema.trades).where(eq(schema.trades.userId, userId));
  }

  // Manual Rules operations
  async getManualRules(): Promise<ManualRule[]> {
    return await this.db.select().from(schema.manualRules);
  }

  async getManualRuleById(id: number): Promise<ManualRule | null> {
    const rules = await this.db.select().from(schema.manualRules).where(eq(schema.manualRules.id, id));
    return rules[0] || null;
  }

  async createManualRule(rule: InsertManualRule): Promise<ManualRule> {
    const result = await this.db.insert(schema.manualRules).values(rule).returning();
    return result[0];
  }

  async updateManualRule(id: number, rule: Partial<InsertManualRule>): Promise<ManualRule | null> {
    const result = await this.db.update(schema.manualRules).set(rule).where(eq(schema.manualRules.id, id)).returning();
    return result[0] || null;
  }

  async deleteManualRule(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.manualRules).where(eq(schema.manualRules.id, id));
    return result.rowCount > 0;
  }

  async getActiveManualRules(): Promise<ManualRule[]> {
    return await this.db.select().from(schema.manualRules).where(eq(schema.manualRules.isActive, true));
  }

  // Training Data operations
  async getTrainingData(): Promise<TrainingData[]> {
    return await this.db.select().from(schema.trainingData);
  }

  async getTrainingDataById(id: number): Promise<TrainingData | null> {
    const data = await this.db.select().from(schema.trainingData).where(eq(schema.trainingData.id, id));
    return data[0] || null;
  }

  async createTrainingData(data: InsertTrainingData): Promise<TrainingData> {
    const result = await this.db.insert(schema.trainingData).values(data).returning();
    return result[0];
  }

  async updateTrainingData(id: number, data: Partial<InsertTrainingData>): Promise<TrainingData | null> {
    const result = await this.db.update(schema.trainingData).set(data).where(eq(schema.trainingData.id, id)).returning();
    return result[0] || null;
  }

  async deleteTrainingData(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.trainingData).where(eq(schema.trainingData.id, id));
    return result.rowCount > 0;
  }

  // User Settings operations
  async getUserSettings(userId: number): Promise<UserSettings | null> {
    const settings = await this.db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, userId));
    return settings[0] || null;
  }

  async updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | null> {
    const result = await this.db.update(schema.userSettings).set(settings).where(eq(schema.userSettings.userId, userId)).returning();
    return result[0] || null;
  }

  // Audit Log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await this.db.insert(schema.auditLogs).values(log).returning();
    return result[0];
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return await this.db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.createdAt));
  }

  // Provider Stats operations
  async getProviderStats(): Promise<ProviderStats[]> {
    return await this.db.select().from(schema.providerStats);
  }

  async updateProviderStats(channelId: number, stats: Partial<InsertProviderStats>): Promise<ProviderStats | null> {
    const result = await this.db.update(schema.providerStats).set(stats).where(eq(schema.providerStats.channelId, channelId)).returning();
    return result[0] || null;
  }

  // Parser Deployment operations
  async createParserDeployment(deployment: InsertParserDeployment): Promise<ParserDeployment> {
    const result = await this.db.insert(schema.parserDeployments).values(deployment).returning();
    return result[0];
  }

  async getParserDeployments(): Promise<ParserDeployment[]> {
    return await this.db.select().from(schema.parserDeployments).orderBy(desc(schema.parserDeployments.deployTimestamp));
  }

  async getParserDeploymentById(deploymentId: string): Promise<ParserDeployment | null> {
    const deployments = await this.db.select().from(schema.parserDeployments).where(eq(schema.parserDeployments.deploymentId, deploymentId));
    return deployments[0] || null;
  }

  async updateParserDeployment(deploymentId: string, deployment: Partial<InsertParserDeployment>): Promise<ParserDeployment | null> {
    const result = await this.db.update(schema.parserDeployments).set(deployment).where(eq(schema.parserDeployments.deploymentId, deploymentId)).returning();
    return result[0] || null;
  }

  async deleteParserDeployment(deploymentId: string): Promise<boolean> {
    const result = await this.db.delete(schema.parserDeployments).where(eq(schema.parserDeployments.deploymentId, deploymentId));
    return result.rowCount > 0;
  }

  // Additional signal operations for replay functionality
  async getSignalById(id: number): Promise<Signal | null> {
    const signals = await this.db.select().from(schema.signals).where(eq(schema.signals.id, id));
    return signals[0] || null;
  }

  async updateSignal(id: number, updates: Partial<InsertSignal>): Promise<Signal | null> {
    const result = await this.db.update(schema.signals).set(updates).where(eq(schema.signals.id, id)).returning();
    return result[0] || null;
  }

  // API Key operations
  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const result = await this.db.insert(schema.apiKeys).values(apiKey).returning();
    return result[0];
  }

  async getApiKeys(): Promise<ApiKey[]> {
    return await this.db.select().from(schema.apiKeys).orderBy(desc(schema.apiKeys.createdAt));
  }

  async getApiKeysByUserId(userId: number): Promise<ApiKey[]> {
    return await this.db.select().from(schema.apiKeys).where(eq(schema.apiKeys.userId, userId));
  }

  async getApiKeyById(id: number): Promise<ApiKey | null> {
    const keys = await this.db.select().from(schema.apiKeys).where(eq(schema.apiKeys.id, id));
    return keys[0] || null;
  }

  async getApiKeyByPrefix(prefix: string): Promise<ApiKey | null> {
    const keys = await this.db.select().from(schema.apiKeys).where(eq(schema.apiKeys.keyPrefix, prefix));
    return keys[0] || null;
  }

  async updateApiKey(id: number, updates: Partial<InsertApiKey>): Promise<ApiKey | null> {
    const result = await this.db.update(schema.apiKeys).set({ 
      ...updates, 
      updatedAt: new Date() 
    }).where(eq(schema.apiKeys.id, id)).returning();
    return result[0] || null;
  }

  async deleteApiKey(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.apiKeys).where(eq(schema.apiKeys.id, id));
    return result.rowCount > 0;
  }

  async updateApiKeyLastUsed(id: number): Promise<void> {
    await this.db.update(schema.apiKeys).set({ 
      lastUsed: new Date(),
      updatedAt: new Date()
    }).where(eq(schema.apiKeys.id, id));
  }

  // Sync Request operations
  async createSyncRequest(request: InsertSyncRequest): Promise<SyncRequest> {
    const result = await this.db.insert(schema.syncRequests).values(request).returning();
    return result[0];
  }

  async getSyncRequestsByUser(userId: number, limit: number = 100): Promise<SyncRequest[]> {
    return await this.db.select().from(schema.syncRequests)
      .where(eq(schema.syncRequests.userId, userId))
      .orderBy(desc(schema.syncRequests.createdAt))
      .limit(limit);
  }

  async getSyncRequestByRequestId(requestId: string): Promise<SyncRequest | null> {
    const requests = await this.db.select().from(schema.syncRequests).where(eq(schema.syncRequests.requestId, requestId));
    return requests[0] || null;
  }

  async getSyncRequestsByApiKey(apiKeyId: number, limit: number = 100): Promise<SyncRequest[]> {
    return await this.db.select().from(schema.syncRequests)
      .where(eq(schema.syncRequests.apiKeyId, apiKeyId))
      .orderBy(desc(schema.syncRequests.createdAt))
      .limit(limit);
  }

  async updateSyncRequest(id: number, updates: Partial<InsertSyncRequest>): Promise<SyncRequest | null> {
    const result = await this.db.update(schema.syncRequests).set(updates).where(eq(schema.syncRequests.id, id)).returning();
    return result[0] || null;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.select().from(schema.users).limit(1);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Helper methods
  async incrementRuleUsage(ruleId: number): Promise<void> {
    await this.db.update(schema.manualRules)
      .set({ usageCount: schema.manualRules.usageCount + 1 })
      .where(eq(schema.manualRules.id, ruleId));
  }
}

export const storage = new DatabaseStorage();