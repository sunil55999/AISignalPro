"""
Auto Sync Module - AI Trading Signal Parser
Handles automatic synchronization with cloud API for strategy updates,
system status reporting, and configuration management.
"""

import json
import logging
import time
import threading
import requests
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, List
import MetaTrader5 as mt5
import os
import sqlite3
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    handlers=[
        logging.FileHandler('auto_sync.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class SystemStatus:
    """System status structure for cloud reporting"""
    mt5_connected: bool
    mt5_account: Optional[int]
    mt5_balance: float
    mt5_equity: float
    mt5_margin_free: float
    parser_health: str  # "healthy", "warning", "error"
    error_count_24h: int
    last_signal_time: Optional[datetime]
    active_trades: int
    total_signals_today: int
    uptime_seconds: int
    version: str
    timestamp: datetime

@dataclass
class StrategyConfig:
    """Strategy configuration from cloud"""
    max_lot_size: float
    risk_percent: float
    enabled_pairs: List[str]
    disabled_pairs: List[str]
    stealth_mode: bool
    auto_trade: bool
    confidence_threshold: float
    max_daily_trades: int
    trading_hours: Dict[str, Any]
    symbol_mapping: Dict[str, str]
    last_updated: datetime

class AutoSyncManager:
    """Manages automatic synchronization with cloud API"""
    
    def __init__(self, config_path: str = "env.json"):
        self.config = self._load_config(config_path)
        self.api_base = self.config.get("API_BASE_URL", "http://localhost:5000")
        self.sync_interval = 60  # Pull every 60 seconds as requested
        self.api_key = self.config.get("API_KEY", "")
        
        # Database for tracking sync state
        self.db_path = "auto_sync.db"
        self._init_database()
        
        # System state
        self.running = False
        self.sync_thread = None
        self.start_time = datetime.now()
        self.last_sync_attempt = None
        self.last_successful_sync = None
        
        # Cached configurations
        self.current_strategy = None
        self.current_symbols = {}
        self.stealth_config = {}
        self.lot_settings = {}
        self.error_counts = {"parser": 0, "mt5": 0, "api": 0}
        
        # Initialize MT5 connection
        self._init_mt5()
        
        logger.info("AutoSyncManager initialized with 60-second sync interval")
    
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from JSON file"""
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    return json.load(f)
            else:
                logger.warning(f"Config file {config_path} not found, using defaults")
                return {}
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return {}
    
    def _init_database(self):
        """Initialize SQLite database for sync tracking"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Sync history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sync_type TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Error tracking table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS error_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                error_type TEXT NOT NULL,
                error_message TEXT NOT NULL,
                source TEXT NOT NULL,
                count INTEGER DEFAULT 1,
                first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Configuration cache table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS config_cache (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
    
    def _init_mt5(self) -> bool:
        """Initialize MT5 connection"""
        try:
            if not mt5.initialize():
                logger.error("MT5 initialization failed")
                return False
            
            account_info = mt5.account_info()
            if account_info is None:
                logger.error("MT5 account info not available")
                return False
            
            logger.info(f"MT5 connected to account {account_info.login}")
            return True
        except Exception as e:
            logger.error(f"MT5 initialization error: {e}")
            return False
    
    def start_sync(self):
        """Start the automatic sync process"""
        if self.running:
            logger.warning("Sync already running")
            return
        
        self.running = True
        self.sync_thread = threading.Thread(target=self._sync_loop, daemon=True)
        self.sync_thread.start()
        logger.info("Auto sync started")
    
    def stop_sync(self):
        """Stop the automatic sync process"""
        self.running = False
        if self.sync_thread:
            self.sync_thread.join(timeout=5)
        logger.info("Auto sync stopped")
    
    def _sync_loop(self):
        """Main synchronization loop"""
        while self.running:
            try:
                self.last_sync_attempt = datetime.now()
                
                # Pull strategy updates from admin API
                strategy_updated = self._pull_strategy_config()
                
                # Pull symbol mapping and settings
                symbols_updated = self._pull_symbol_mapping()
                stealth_updated = self._pull_stealth_config()
                
                # Push system status to cloud
                status_pushed = self._push_system_status()
                
                # Log sync attempt
                self._log_sync_attempt({
                    "strategy_updated": strategy_updated,
                    "symbols_updated": symbols_updated,
                    "stealth_updated": stealth_updated,
                    "status_pushed": status_pushed
                })
                
                if all([strategy_updated, symbols_updated, stealth_updated, status_pushed]):
                    self.last_successful_sync = datetime.now()
                    logger.info("Sync cycle completed successfully")
                else:
                    logger.warning("Sync cycle completed with some failures")
                
            except Exception as e:
                logger.error(f"Sync loop error: {e}")
                self._track_error("sync_loop", str(e), "auto_sync")
            
            # Wait for next sync interval
            time.sleep(self.sync_interval)
    
    def _pull_strategy_config(self) -> bool:
        """Pull updated strategy configuration from admin API"""
        try:
            headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
            
            # Get latest strategy configuration
            response = requests.get(
                f"{self.api_base}/api/admin/strategy-config",
                headers=headers,
                timeout=15
            )
            
            if response.status_code == 200:
                strategy_data = response.json()
                
                # Parse strategy configuration
                new_strategy = StrategyConfig(
                    max_lot_size=strategy_data.get("max_lot_size", 1.0),
                    risk_percent=strategy_data.get("risk_percent", 2.0),
                    enabled_pairs=strategy_data.get("enabled_pairs", []),
                    disabled_pairs=strategy_data.get("disabled_pairs", []),
                    stealth_mode=strategy_data.get("stealth_mode", True),
                    auto_trade=strategy_data.get("auto_trade", True),
                    confidence_threshold=strategy_data.get("confidence_threshold", 0.85),
                    max_daily_trades=strategy_data.get("max_daily_trades", 10),
                    trading_hours=strategy_data.get("trading_hours", {}),
                    symbol_mapping=strategy_data.get("symbol_mapping", {}),
                    last_updated=datetime.now()
                )
                
                # Check if configuration changed
                if self._strategy_changed(new_strategy):
                    self.current_strategy = new_strategy
                    self._save_strategy_config(new_strategy)
                    logger.info("Strategy configuration updated from cloud")
                    return True
                else:
                    logger.debug("Strategy configuration unchanged")
                    return True
            
            else:
                logger.error(f"Failed to pull strategy config: {response.status_code}")
                self._track_error("api_pull", f"HTTP {response.status_code}", "strategy_config")
                return False
                
        except Exception as e:
            logger.error(f"Error pulling strategy config: {e}")
            self._track_error("api_pull", str(e), "strategy_config")
            return False
    
    def _pull_symbol_mapping(self) -> bool:
        """Pull updated symbol mapping from API"""
        try:
            headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
            
            response = requests.get(
                f"{self.api_base}/api/admin/symbol-mapping",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                symbol_data = response.json()
                
                if symbol_data != self.current_symbols:
                    self.current_symbols = symbol_data
                    self._save_config_cache("symbol_mapping", json.dumps(symbol_data))
                    logger.info(f"Symbol mapping updated: {len(symbol_data)} symbols")
                
                return True
            else:
                logger.error(f"Failed to pull symbol mapping: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error pulling symbol mapping: {e}")
            self._track_error("api_pull", str(e), "symbol_mapping")
            return False
    
    def _pull_stealth_config(self) -> bool:
        """Pull updated stealth configuration from API"""
        try:
            headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
            
            response = requests.get(
                f"{self.api_base}/api/admin/stealth-config",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                stealth_data = response.json()
                
                if stealth_data != self.stealth_config:
                    self.stealth_config = stealth_data
                    self._save_config_cache("stealth_config", json.dumps(stealth_data))
                    logger.info("Stealth configuration updated from cloud")
                
                return True
            else:
                logger.error(f"Failed to pull stealth config: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error pulling stealth config: {e}")
            self._track_error("api_pull", str(e), "stealth_config")
            return False
    
    def _pull_lot_settings(self) -> bool:
        """Pull updated lot settings from API"""
        try:
            headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
            
            response = requests.get(
                f"{self.api_base}/api/admin/lot-settings",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                lot_data = response.json()
                
                if lot_data != self.lot_settings:
                    self.lot_settings = lot_data
                    self._save_config_cache("lot_settings", json.dumps(lot_data))
                    logger.info("Lot settings updated from cloud")
                
                return True
            else:
                logger.error(f"Failed to pull lot settings: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error pulling lot settings: {e}")
            self._track_error("api_pull", str(e), "lot_settings")
            return False
    
    def _push_system_status(self) -> bool:
        """Push MT5 connection status, parser health, error count to cloud API"""
        try:
            # Collect system status
            status = self._collect_system_status()
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}" if self.api_key else ""
            }
            
            # Push to cloud API
            response = requests.post(
                f"{self.api_base}/api/system/status",
                json=asdict(status),
                headers=headers,
                timeout=15
            )
            
            if response.status_code == 200:
                logger.debug("System status pushed successfully")
                return True
            else:
                logger.error(f"Failed to push system status: {response.status_code}")
                self._track_error("api_push", f"HTTP {response.status_code}", "system_status")
                return False
                
        except Exception as e:
            logger.error(f"Error pushing system status: {e}")
            self._track_error("api_push", str(e), "system_status")
            return False
    
    def _collect_system_status(self) -> SystemStatus:
        """Collect current system status"""
        # MT5 status
        mt5_connected = False
        mt5_account = None
        mt5_balance = 0.0
        mt5_equity = 0.0
        mt5_margin_free = 0.0
        active_trades = 0
        
        try:
            if mt5.initialize():
                account_info = mt5.account_info()
                if account_info:
                    mt5_connected = True
                    mt5_account = account_info.login
                    mt5_balance = account_info.balance
                    mt5_equity = account_info.equity
                    mt5_margin_free = account_info.margin_free
                
                # Count active trades
                positions = mt5.positions_get()
                active_trades = len(positions) if positions else 0
        except Exception as e:
            logger.error(f"Error collecting MT5 status: {e}")
            self._track_error("mt5_status", str(e), "system_collect")
        
        # Parser health check
        parser_health = self._check_parser_health()
        
        # Error counts
        error_count_24h = self._get_error_count_24h()
        
        # Signal statistics
        total_signals_today = self._get_signals_today()
        last_signal_time = self._get_last_signal_time()
        
        # System uptime
        uptime_seconds = int((datetime.now() - self.start_time).total_seconds())
        
        return SystemStatus(
            mt5_connected=mt5_connected,
            mt5_account=mt5_account,
            mt5_balance=mt5_balance,
            mt5_equity=mt5_equity,
            mt5_margin_free=mt5_margin_free,
            parser_health=parser_health,
            error_count_24h=error_count_24h,
            last_signal_time=last_signal_time,
            active_trades=active_trades,
            total_signals_today=total_signals_today,
            uptime_seconds=uptime_seconds,
            version="1.0.0",
            timestamp=datetime.now()
        )
    
    def _log_sync_attempt(self, details: Dict[str, Any]):
        """Log sync attempts with timestamps"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO sync_history (sync_type, status, details)
                VALUES (?, ?, ?)
            """, (
                "full_sync",
                "completed" if all(details.values()) else "partial",
                json.dumps(details)
            ))
            
            conn.commit()
            conn.close()
            
            # Log to file with timestamp
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            logger.info(f"[{timestamp}] Sync attempt: {details}")
            
        except Exception as e:
            logger.error(f"Failed to log sync attempt: {e}")
    
    def _check_parser_health(self) -> str:
        """Check parser health status"""
        try:
            # Check error rates
            error_count = self._get_error_count_24h()
            
            if error_count == 0:
                return "healthy"
            elif error_count < 5:
                return "warning"
            else:
                return "error"
                
        except Exception:
            return "error"
    
    def _get_error_count_24h(self) -> int:
        """Get error count in last 24 hours"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT COUNT(*) FROM error_tracking 
                WHERE last_seen > datetime('now', '-24 hours')
            """)
            
            result = cursor.fetchone()
            conn.close()
            
            return result[0] if result else 0
            
        except Exception:
            return 0
    
    def _get_signals_today(self) -> int:
        """Get total signals processed today"""
        # This would connect to your signal database
        # For now, return a placeholder
        return 0
    
    def _get_last_signal_time(self) -> Optional[datetime]:
        """Get timestamp of last signal processed"""
        # This would connect to your signal database
        # For now, return None
        return None
            
            response = requests.get(
                f"{self.api_base}/api/admin/stealth-settings",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                settings_data = response.json()
                
                # Save stealth settings
                self._save_config_cache("stealth_settings", json.dumps(settings_data))
                logger.debug("Stealth settings updated")
                return True
            else:
                logger.error(f"Failed to pull stealth settings: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error pulling stealth settings: {e}")
            self._track_error("api_pull", str(e), "stealth_settings")
            return False
    
    def _push_system_status(self) -> bool:
        """Push system status to cloud API"""
        try:
            # Collect system status
            status = self._collect_system_status()
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}" if self.api_key else ""
            }
            
            # Push to cloud API
            response = requests.post(
                f"{self.api_base}/api/system/status",
                json=asdict(status),
                headers=headers,
                timeout=15
            )
            
            if response.status_code == 200:
                logger.debug("System status pushed successfully")
                return True
            else:
                logger.error(f"Failed to push system status: {response.status_code}")
                self._track_error("api_push", f"HTTP {response.status_code}", "system_status")
                return False
                
        except Exception as e:
            logger.error(f"Error pushing system status: {e}")
            self._track_error("api_push", str(e), "system_status")
            return False
    
    def _collect_system_status(self) -> SystemStatus:
        """Collect current system status"""
        # MT5 status
        mt5_connected = False
        mt5_account = None
        mt5_balance = 0.0
        mt5_equity = 0.0
        mt5_margin_free = 0.0
        active_trades = 0
        
        try:
            if mt5.initialize():
                account_info = mt5.account_info()
                if account_info:
                    mt5_connected = True
                    mt5_account = account_info.login
                    mt5_balance = account_info.balance
                    mt5_equity = account_info.equity
                    mt5_margin_free = account_info.margin_free
                
                # Count active trades
                positions = mt5.positions_get()
                active_trades = len(positions) if positions else 0
        except Exception as e:
            logger.error(f"Error collecting MT5 status: {e}")
            self._track_error("mt5_status", str(e), "system_collect")
        
        # Parser health check
        parser_health = self._check_parser_health()
        
        # Error counts
        error_count_24h = self._get_error_count_24h()
        
        # Signal statistics
        total_signals_today = self._get_signals_today()
        last_signal_time = self._get_last_signal_time()
        
        # System uptime
        uptime_seconds = int((datetime.now() - self.start_time).total_seconds())
        
        return SystemStatus(
            mt5_connected=mt5_connected,
            mt5_account=mt5_account,
            mt5_balance=mt5_balance,
            mt5_equity=mt5_equity,
            mt5_margin_free=mt5_margin_free,
            parser_health=parser_health,
            error_count_24h=error_count_24h,
            last_signal_time=last_signal_time,
            active_trades=active_trades,
            total_signals_today=total_signals_today,
            uptime_seconds=uptime_seconds,
            version="2.1.0",
            timestamp=datetime.now()
        )
    
    def _check_parser_health(self) -> str:
        """Check parser health status"""
        try:
            # Test parser with simple signal
            test_response = requests.post(
                f"{self.api_base}/api/parse-signal",
                json={"rawText": "EURUSD BUY @1.1000, SL 1.0950, TP 1.1050"},
                timeout=10
            )
            
            if test_response.status_code == 200:
                result = test_response.json()
                if result.get("confidence", 0) > 0.5:
                    return "healthy"
                else:
                    return "warning"
            else:
                return "error"
                
        except Exception as e:
            logger.error(f"Parser health check failed: {e}")
            return "error"
    
    def _get_error_count_24h(self) -> int:
        """Get error count in last 24 hours"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cutoff_time = datetime.now() - timedelta(hours=24)
            cursor.execute("""
                SELECT SUM(count) FROM error_tracking 
                WHERE last_seen > ?
            """, (cutoff_time,))
            
            result = cursor.fetchone()
            conn.close()
            
            return result[0] if result and result[0] else 0
        except Exception as e:
            logger.error(f"Error getting error count: {e}")
            return 0
    
    def _get_signals_today(self) -> int:
        """Get total signals processed today"""
        try:
            # This would query the main application database
            # For now, return a placeholder
            return 0
        except Exception as e:
            logger.error(f"Error getting signals count: {e}")
            return 0
    
    def _get_last_signal_time(self) -> Optional[datetime]:
        """Get timestamp of last processed signal"""
        try:
            # This would query the main application database
            # For now, return None
            return None
        except Exception as e:
            logger.error(f"Error getting last signal time: {e}")
            return None
    
    def _strategy_changed(self, new_strategy: StrategyConfig) -> bool:
        """Check if strategy configuration has changed"""
        if not self.current_strategy:
            return True
        
        # Compare key fields
        return (
            self.current_strategy.max_lot_size != new_strategy.max_lot_size or
            self.current_strategy.risk_percent != new_strategy.risk_percent or
            self.current_strategy.enabled_pairs != new_strategy.enabled_pairs or
            self.current_strategy.disabled_pairs != new_strategy.disabled_pairs or
            self.current_strategy.stealth_mode != new_strategy.stealth_mode or
            self.current_strategy.auto_trade != new_strategy.auto_trade or
            self.current_strategy.confidence_threshold != new_strategy.confidence_threshold
        )
    
    def _save_strategy_config(self, strategy: StrategyConfig):
        """Save strategy configuration to local cache"""
        try:
            strategy_json = json.dumps(asdict(strategy), default=str)
            self._save_config_cache("strategy_config", strategy_json)
            
            # Also save to file for MT5 EA
            strategy_file = "strategy_config.json"
            with open(strategy_file, 'w') as f:
                json.dump(asdict(strategy), f, indent=2, default=str)
                
            logger.info(f"Strategy configuration saved to {strategy_file}")
        except Exception as e:
            logger.error(f"Error saving strategy config: {e}")
    
    def _save_config_cache(self, key: str, value: str):
        """Save configuration value to cache"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO config_cache (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            """, (key, value))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving config cache: {e}")
    
    def _track_error(self, error_type: str, error_message: str, source: str):
        """Track error occurrence"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if error already exists
            cursor.execute("""
                SELECT id, count FROM error_tracking 
                WHERE error_type = ? AND error_message = ? AND source = ?
            """, (error_type, error_message, source))
            
            existing = cursor.fetchone()
            
            if existing:
                # Update existing error
                cursor.execute("""
                    UPDATE error_tracking 
                    SET count = count + 1, last_seen = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (existing[0],))
            else:
                # Insert new error
                cursor.execute("""
                    INSERT INTO error_tracking (error_type, error_message, source)
                    VALUES (?, ?, ?)
                """, (error_type, error_message, source))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error tracking error: {e}")
    
    def _log_sync_attempt(self, results: Dict):
        """Log sync attempt with timestamp and results"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            status = "success" if all(results.values()) else "partial_failure"
            details = json.dumps(results)
            
            cursor.execute("""
                INSERT INTO sync_history (sync_type, status, details)
                VALUES (?, ?, ?)
            """, ("full_sync", status, details))
            
            conn.commit()
            conn.close()
            
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            logger.info(f"[{timestamp}] Sync attempt logged: {status} - {details}")
            
        except Exception as e:
            logger.error(f"Error logging sync attempt: {e}")
    
    def get_sync_status(self) -> Dict:
        """Get current sync status"""
        return {
            "running": self.running,
            "last_sync_attempt": self.last_sync_attempt.isoformat() if self.last_sync_attempt else None,
            "last_successful_sync": self.last_successful_sync.isoformat() if self.last_successful_sync else None,
            "sync_interval_seconds": self.sync_interval,
            "uptime_seconds": int((datetime.now() - self.start_time).total_seconds()),
            "current_strategy_loaded": self.current_strategy is not None,
            "symbols_loaded": len(self.current_symbols),
            "error_count_24h": self._get_error_count_24h()
        }
    
    def force_sync(self) -> Dict:
        """Force immediate sync and return results"""
        try:
            results = {
                "strategy_updated": self._pull_strategy_config(),
                "symbols_updated": self._pull_symbol_mapping(),
                "stealth_updated": self._pull_stealth_config(),
                "status_pushed": self._push_system_status()
            }
            
            self._log_sync_attempt(results)
            return {"success": True, "results": results}
            
        except Exception as e:
            logger.error(f"Force sync failed: {e}")
            return {"success": False, "error": str(e)}

# Main execution
if __name__ == "__main__":
    # Create auto sync manager
    sync_manager = AutoSyncManager()
    
    try:
        # Start sync process
        sync_manager.start_sync()
        
        # Keep running
        while True:
            time.sleep(60)
            status = sync_manager.get_sync_status()
            logger.info(f"Sync status: {status}")
            
    except KeyboardInterrupt:
        logger.info("Shutdown requested")
        sync_manager.stop_sync()
    except Exception as e:
        logger.error(f"Main process error: {e}")
        sync_manager.stop_sync()