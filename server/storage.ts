import { 
  users, 
  signals,
  manualRules,
  trainingData,
  type User, 
  type InsertUser,
  type Signal,
  type InsertSignal,
  type ManualRule,
  type InsertManualRule,
  type TrainingData,
  type InsertTrainingData
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Signal methods
  createSignal(signal: InsertSignal): Promise<Signal>;
  getSignals(limit?: number): Promise<Signal[]>;
  getSignalById(id: number): Promise<Signal | undefined>;
  getSignalsByDateRange(startDate: Date, endDate: Date): Promise<Signal[]>;
  
  // Manual rule methods
  createManualRule(rule: InsertManualRule): Promise<ManualRule>;
  getManualRules(): Promise<ManualRule[]>;
  getActiveManualRules(): Promise<ManualRule[]>;
  updateManualRule(id: number, updates: Partial<ManualRule>): Promise<ManualRule | undefined>;
  deleteManualRule(id: number): Promise<boolean>;
  incrementRuleUsage(id: number): Promise<void>;
  
  // Training data methods
  createTrainingData(data: InsertTrainingData): Promise<TrainingData>;
  getTrainingData(): Promise<TrainingData[]>;
  updateTrainingData(id: number, updates: Partial<TrainingData>): Promise<TrainingData | undefined>;
  deleteTrainingData(id: number): Promise<boolean>;
  
  // Statistics methods
  getParsingStats(): Promise<{
    todayCount: number;
    avgConfidence: number;
    manualRulesUsed: number;
    ocrSuccessRate: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private signals: Map<number, Signal>;
  private manualRules: Map<number, ManualRule>;
  private trainingData: Map<number, TrainingData>;
  private currentUserId: number;
  private currentSignalId: number;
  private currentRuleId: number;
  private currentTrainingId: number;

  constructor() {
    this.users = new Map();
    this.signals = new Map();
    this.manualRules = new Map();
    this.trainingData = new Map();
    this.currentUserId = 1;
    this.currentSignalId = 1;
    this.currentRuleId = 1;
    this.currentTrainingId = 1;
    
    // Initialize with some default rules
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    const defaultRules: InsertManualRule[] = [
      {
        pattern: "SL to BE",
        action: "Set SL to Entry Price",
        channelName: "All Channels",
        isActive: true,
      },
      {
        pattern: "Close 50%",
        action: "Partial Close 50%",
        channelName: "Premium Signals",
        isActive: true,
      },
      {
        pattern: "Don't enter",
        action: "Cancel Signal",
        channelName: "All Channels",
        isActive: false,
      },
    ];

    defaultRules.forEach(rule => {
      this.createManualRule(rule);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Signal methods
  async createSignal(insertSignal: InsertSignal): Promise<Signal> {
    const id = this.currentSignalId++;
    const signal: Signal = { 
      ...insertSignal, 
      id, 
      createdAt: new Date(),
    };
    this.signals.set(id, signal);
    return signal;
  }

  async getSignals(limit = 50): Promise<Signal[]> {
    const allSignals = Array.from(this.signals.values());
    return allSignals
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

  // Manual rule methods
  async createManualRule(insertRule: InsertManualRule): Promise<ManualRule> {
    const id = this.currentRuleId++;
    const rule: ManualRule = { 
      ...insertRule, 
      id, 
      usageCount: 0,
      createdAt: new Date(),
    };
    this.manualRules.set(id, rule);
    return rule;
  }

  async getManualRules(): Promise<ManualRule[]> {
    return Array.from(this.manualRules.values());
  }

  async getActiveManualRules(): Promise<ManualRule[]> {
    return Array.from(this.manualRules.values()).filter(rule => rule.isActive);
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
      rule.usageCount = (rule.usageCount || 0) + 1;
      this.manualRules.set(id, rule);
    }
  }

  // Training data methods
  async createTrainingData(insertData: InsertTrainingData): Promise<TrainingData> {
    const id = this.currentTrainingId++;
    const data: TrainingData = { 
      ...insertData, 
      id, 
      createdAt: new Date(),
    };
    this.trainingData.set(id, data);
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
      avgConfidence: Math.round(avgConfidence * 1000) / 10, // Convert to percentage with 1 decimal
      manualRulesUsed,
      ocrSuccessRate: Math.round(ocrSuccessRate * 1000) / 10,
    };
  }
}

export const storage = new MemStorage();
