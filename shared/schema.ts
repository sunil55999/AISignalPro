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
  signalId: text("signal_id").notNull().unique(), // Unique fingerprint
  signalHash: text("signal_hash").notNull(), // Hash for deduplication
  messageId: integer("message_id").references(() => messages.id),
  channelId: integer("channel_id").references(() => channels.id),
  rawText: text("raw_text").notNull(),
  source: text("source").notNull(), // 'text', 'ocr', 'image'
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
  status: text("status").notNull().default("pending"), // pending, executed, ignored, failed
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  channelName: text("channel_name"),
  externalMessageId: text("external_message_id"),
  imagePath: text("image_path"),
  imageCaption: text("image_caption"),
  isVerified: boolean("is_verified").default(false),
  userId: integer("user_id").references(() => users.id),
  retryCount: integer("retry_count").default(0),
  errorMessage: text("error_message")
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
  executionMode: text("execution_mode").default("auto"), // shadow, semi-auto, auto
  minConfidence: real("min_confidence").default(0.85),
  timezone: text("timezone").default("UTC"),
  maxDailyTrades: integer("max_daily_trades").default(10),
  maxDrawdown: real("max_drawdown").default(10.0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role-Based Access Control
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Provider Performance Scoring
export const providerPerformance = pgTable("provider_performance", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id).notNull(),
  period: text("period").notNull(),
  totalSignals: integer("total_signals").default(0),
  executedTrades: integer("executed_trades").default(0),
  winningTrades: integer("winning_trades").default(0),
  totalPips: real("total_pips").default(0),
  winRate: real("win_rate").default(0),
  trustScore: real("trust_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Signal Processing Queue
export const signalQueue = pgTable("signal_queue", {
  id: serial("id").primaryKey(),
  signalId: text("signal_id").notNull(),
  userId: integer("user_id").references(() => users.id),
  priority: integer("priority").default(5),
  status: text("status").notNull().default("pending"),
  retryCount: integer("retry_count").default(0),
  scheduledAt: timestamp("scheduled_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
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

export const parserDeployments = pgTable("parser_deployments", {
  id: serial("id").primaryKey(),
  deploymentId: text("deployment_id").notNull().unique(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileHash: text("file_hash").notNull(),
  fileSize: integer("file_size").notNull(),
  version: text("version").notNull(),
  deployTimestamp: timestamp("deploy_timestamp").defaultNow(),
  uploadedBy: text("uploaded_by").notNull(),
  status: text("status").notNull().default("uploaded"), // uploaded, broadcasting, deployed, failed
  notifiedTerminals: text("notified_terminals").array().default([]),
  totalTerminals: integer("total_terminals").default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
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
  processedAt: true,
  isVerified: true,
  retryCount: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
  executedAt: true,
  status: true,
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

export const insertParserDeploymentSchema = createInsertSchema(parserDeployments).omit({
  id: true,
  createdAt: true,
  deployTimestamp: true,
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

export type ParserDeployment = typeof parserDeployments.$inferSelect;
export type InsertParserDeployment = z.infer<typeof insertParserDeploymentSchema>;
