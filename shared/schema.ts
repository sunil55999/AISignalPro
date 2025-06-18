import { pgTable, text, serial, integer, boolean, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  apiKey: text("api_key").unique(),
  isActive: boolean("is_active").default(true),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  confidenceThreshold: real("confidence_threshold").default(0.85),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull(),
  channelId: integer("channel_id").references(() => channels.id),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id),
  rawText: text("raw_text").notNull(),
  source: text("source").notNull(), // 'text' or 'ocr'
  intent: text("intent").notNull(),
  pair: text("pair"),
  action: text("action"),
  entry: real("entry"),
  sl: real("sl"),
  tp: real("tp").array(),
  orderType: text("order_type"),
  volumePercent: real("volume_percent"),
  modifications: jsonb("modifications"),
  confidence: real("confidence").notNull(),
  manualRuleApplied: boolean("manual_rule_applied").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  channelName: text("channel_name"),
  externalMessageId: text("external_message_id"),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  signalId: integer("signal_id").references(() => signals.id),
  userId: integer("user_id").references(() => users.id),
  symbol: text("symbol").notNull(),
  action: text("action").notNull(),
  entry: real("entry"),
  sl: real("sl"),
  tp: real("tp").array(),
  lot: real("lot"),
  orderType: text("order_type"),
  status: text("status").default("pending"), // pending, executed, cancelled, failed
  executedAt: timestamp("executed_at"),
  result: text("result"), // win, loss, breakeven
  pnl: real("pnl"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const manualRules = pgTable("manual_rules", {
  id: serial("id").primaryKey(),
  pattern: text("pattern").notNull(),
  action: text("action").notNull(),
  channelId: integer("channel_id").references(() => channels.id),
  userId: integer("user_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trainingData = pgTable("training_data", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  imagePath: text("image_path"),
  intent: text("intent").notNull(),
  pair: text("pair"),
  action: text("action"),
  entry: real("entry"),
  sl: real("sl"),
  tp: real("tp").array(),
  volumePercent: real("volume_percent"),
  source: text("source").notNull(),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  maxLot: real("max_lot").default(0.1),
  riskPercent: real("risk_percent").default(2.0),
  enableSignalCopier: boolean("enable_signal_copier").default(true),
  enabledChannels: integer("enabled_channels").array().default([]),
  tradeFilters: jsonb("trade_filters"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"), // signal, trade, rule, etc.
  entityId: integer("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const providerStats = pgTable("provider_stats", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  totalSignals: integer("total_signals").default(0),
  winRate: real("win_rate").default(0),
  avgRiskReward: real("avg_risk_reward").default(0),
  avgExecutionTime: real("avg_execution_time").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertSignalSchema = createInsertSchema(signals).omit({
  id: true,
  createdAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
  executedAt: true,
});

export const insertManualRuleSchema = createInsertSchema(manualRules).omit({
  id: true,
  usageCount: true,
  createdAt: true,
});

export const insertTrainingDataSchema = createInsertSchema(trainingData).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertProviderStatsSchema = createInsertSchema(providerStats).omit({
  id: true,
  lastUpdated: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Signal = typeof signals.$inferSelect;
export type InsertSignal = z.infer<typeof insertSignalSchema>;

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;

export type ManualRule = typeof manualRules.$inferSelect;
export type InsertManualRule = z.infer<typeof insertManualRuleSchema>;

export type TrainingData = typeof trainingData.$inferSelect;
export type InsertTrainingData = z.infer<typeof insertTrainingDataSchema>;

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type ProviderStats = typeof providerStats.$inferSelect;
export type InsertProviderStats = z.infer<typeof insertProviderStatsSchema>;
