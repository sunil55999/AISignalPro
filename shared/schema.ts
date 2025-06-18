import { pgTable, text, serial, integer, boolean, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
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
  messageId: text("message_id"),
});

export const manualRules = pgTable("manual_rules", {
  id: serial("id").primaryKey(),
  pattern: text("pattern").notNull(),
  action: text("action").notNull(),
  channelName: text("channel_name"),
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

export const insertSignalSchema = createInsertSchema(signals).omit({
  id: true,
  createdAt: true,
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

export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signals.$inferSelect;
export type InsertManualRule = z.infer<typeof insertManualRuleSchema>;
export type ManualRule = typeof manualRules.$inferSelect;
export type InsertTrainingData = z.infer<typeof insertTrainingDataSchema>;
export type TrainingData = typeof trainingData.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
