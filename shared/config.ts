import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Configuration schema for validation
const ConfigSchema = z.object({
  system: z.object({
    version: z.string(),
    environment: z.string(),
    api_base_url: z.string().url(),
    admin_panel_url: z.string().url(),
    websocket_url: z.string()
  }),
  admin: z.object({
    username: z.string(),
    password: z.string(),
    email: z.string().email(),
    default_user_id: z.number()
  }),
  mt5: z.object({
    terminal_path: z.string(),
    data_path: z.string(),
    signals_file: z.string(),
    user_signals_path: z.string(),
    ea_name: z.string(),
    magic_number: z.number(),
    default_lot_size: z.number(),
    max_lot_size: z.number(),
    risk_percent: z.number(),
    enable_stealth_mode: z.boolean(),
    min_delay_ms: z.number(),
    max_delay_ms: z.number()
  }),
  telegram: z.object({
    bot_token: z.string(),
    chat_id: z.string(),
    webhook_url: z.string(),
    api_base: z.string().url(),
    polling_interval: z.number(),
    allowed_users: z.array(z.string()),
    admin_users: z.array(z.string())
  }),
  database: z.object({
    type: z.string(),
    host: z.string(),
    port: z.number(),
    name: z.string(),
    ssl: z.boolean(),
    connection_timeout: z.number(),
    query_timeout: z.number()
  }),
  parser: z.object({
    confidence_threshold: z.number(),
    auto_execute: z.boolean(),
    enable_ocr: z.boolean(),
    max_signals_per_minute: z.number(),
    blacklisted_pairs: z.array(z.string()),
    supported_pairs: z.array(z.string()),
    retry_attempts: z.number(),
    retry_delay_ms: z.number()
  }),
  risk_management: z.object({
    max_daily_loss: z.number(),
    max_daily_trades: z.number(),
    position_size_method: z.string(),
    default_risk_percent: z.number(),
    max_risk_percent: z.number(),
    enable_trailing_stop: z.boolean(),
    breakeven_pips: z.number(),
    partial_close_levels: z.array(z.number())
  }),
  alerts: z.object({
    enable_notifications: z.boolean(),
    email_alerts: z.boolean(),
    telegram_alerts: z.boolean(),
    push_notifications: z.boolean(),
    alert_on_trade_open: z.boolean(),
    alert_on_trade_close: z.boolean(),
    alert_on_error: z.boolean(),
    alert_on_high_drawdown: z.boolean()
  }),
  sync: z.object({
    enable_auto_sync: z.boolean(),
    sync_interval_seconds: z.number(),
    cloud_api_url: z.string().url(),
    sync_timeout_ms: z.number(),
    retry_failed_syncs: z.boolean(),
    max_sync_retries: z.number()
  }),
  logging: z.object({
    log_level: z.string(),
    enable_file_logging: z.boolean(),
    log_file_path: z.string(),
    max_log_file_size_mb: z.number(),
    log_retention_days: z.number(),
    enable_audit_trail: z.boolean()
  }),
  security: z.object({
    session_timeout_minutes: z.number(),
    enable_rate_limiting: z.boolean(),
    max_requests_per_minute: z.number(),
    enable_cors: z.boolean(),
    allowed_origins: z.array(z.string()),
    jwt_expires_in: z.string()
  }),
  backup: z.object({
    enable_auto_backup: z.boolean(),
    backup_interval_hours: z.number(),
    backup_path: z.string(),
    max_backup_files: z.number(),
    compress_backups: z.boolean()
  })
});

export type Config = z.infer<typeof ConfigSchema>;

class ConfigManager {
  private config: Config | null = null;
  private configPath: string;
  private envPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), 'env.json');
    this.envPath = path.join(process.cwd(), '.env');
  }

  /**
   * Load configuration from env.json and environment variables
   */
  public loadConfig(): Config {
    if (this.config) {
      return this.config;
    }

    try {
      // Load base configuration from env.json
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }

      const configFile = fs.readFileSync(this.configPath, 'utf-8');
      const baseConfig = JSON.parse(configFile);

      // Override with environment variables if available
      this.applyEnvironmentOverrides(baseConfig);

      // Validate configuration
      this.config = ConfigSchema.parse(baseConfig);

      console.log('✓ Configuration loaded successfully');
      return this.config;

    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw new Error(`Configuration loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply environment variable overrides to configuration
   */
  private applyEnvironmentOverrides(config: any): void {
    // System overrides
    if (process.env.NODE_ENV) {
      config.system.environment = process.env.NODE_ENV;
    }
    if (process.env.PORT) {
      const port = process.env.PORT;
      config.system.api_base_url = `http://localhost:${port}`;
      config.system.admin_panel_url = `http://localhost:${port}/admin`;
      config.system.websocket_url = `ws://localhost:${port}/ws`;
    }
    if (process.env.API_BASE_URL) {
      config.system.api_base_url = process.env.API_BASE_URL;
    }

    // Admin overrides
    if (process.env.ADMIN_USERNAME) {
      config.admin.username = process.env.ADMIN_USERNAME;
    }
    if (process.env.ADMIN_PASSWORD) {
      config.admin.password = process.env.ADMIN_PASSWORD;
    }

    // MT5 overrides
    if (process.env.MT5_TERMINAL_PATH) {
      config.mt5.terminal_path = process.env.MT5_TERMINAL_PATH;
    }
    if (process.env.MT5_SIGNALS_FILE) {
      config.mt5.signals_file = process.env.MT5_SIGNALS_FILE;
    }

    // Telegram overrides
    if (process.env.TELEGRAM_BOT_TOKEN) {
      config.telegram.bot_token = process.env.TELEGRAM_BOT_TOKEN;
    }
    if (process.env.TELEGRAM_CHAT_ID) {
      config.telegram.chat_id = process.env.TELEGRAM_CHAT_ID;
    }

    // Database overrides (handled by existing DATABASE_URL)
    if (process.env.DATABASE_URL) {
      // DATABASE_URL is already handled by Drizzle
    }

    // Cloud API overrides
    if (process.env.CLOUD_API_URL) {
      config.sync.cloud_api_url = process.env.CLOUD_API_URL;
    }
  }

  /**
   * Get specific configuration section
   */
  public getConfig<T extends keyof Config>(section: T): Config[T] {
    const config = this.loadConfig();
    return config[section];
  }

  /**
   * Get full configuration
   */
  public getFullConfig(): Config {
    return this.loadConfig();
  }

  /**
   * Update configuration section and save to file
   */
  public updateConfig<T extends keyof Config>(section: T, updates: Partial<Config[T]>): void {
    const config = this.loadConfig();
    config[section] = { ...config[section], ...updates };
    
    // Validate updated configuration
    ConfigSchema.parse(config);
    
    // Save to file
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    
    // Update in-memory cache
    this.config = config;
    
    console.log(`✓ Configuration section '${section}' updated`);
  }

  /**
   * Reload configuration from file
   */
  public reloadConfig(): Config {
    this.config = null;
    return this.loadConfig();
  }

  /**
   * Get configuration file path
   */
  public getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Validate current configuration
   */
  public validateConfig(): boolean {
    try {
      ConfigSchema.parse(this.loadConfig());
      return true;
    } catch (error) {
      console.error('Configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Export configuration for specific service
   */
  public exportForService(service: 'mt5' | 'telegram' | 'parser' | 'sync'): any {
    const config = this.loadConfig();
    
    switch (service) {
      case 'mt5':
        return {
          ...config.mt5,
          risk_management: config.risk_management,
          alerts: config.alerts,
          system: config.system
        };
      
      case 'telegram':
        return {
          ...config.telegram,
          admin: config.admin,
          alerts: config.alerts,
          system: config.system
        };
      
      case 'parser':
        return {
          ...config.parser,
          risk_management: config.risk_management,
          system: config.system,
          database: config.database
        };
      
      case 'sync':
        return {
          ...config.sync,
          system: config.system,
          database: config.database,
          alerts: config.alerts
        };
      
      default:
        return config;
    }
  }
}

// Export singleton instance
export const configManager = new ConfigManager();

// Export convenience functions
export const loadConfig = () => configManager.loadConfig();
export const getConfig = <T extends keyof Config>(section: T) => configManager.getConfig(section);
export const updateConfig = <T extends keyof Config>(section: T, updates: Partial<Config[T]>) => 
  configManager.updateConfig(section, updates);
export const reloadConfig = () => configManager.reloadConfig();
export const validateConfig = () => configManager.validateConfig();
export const exportForService = (service: 'mt5' | 'telegram' | 'parser' | 'sync') => 
  configManager.exportForService(service);

// Export types
export type { Config };
export { ConfigSchema };