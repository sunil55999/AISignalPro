"""
AI Trading Signal Copilot Bot
Telegram bot for monitoring and controlling the trading system
"""

import json
import logging
import asyncio
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import MetaTrader5 as mt5
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, ContextTypes, 
    CallbackQueryHandler, MessageHandler, filters
)
import sqlite3
from dataclasses import dataclass
import requests
import threading
import time

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    handlers=[
        logging.FileHandler('copilot_bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class TradeInfo:
    """Trade information structure"""
    symbol: str
    action: str
    lot_size: float
    entry_price: float
    stop_loss: Optional[float]
    take_profit: Optional[float]
    profit: float
    timestamp: datetime
    status: str
    magic_number: int

@dataclass
class ChannelInfo:
    """Channel information structure"""
    id: int
    name: str
    last_signal: Optional[str]
    last_signal_time: Optional[datetime]
    is_active: bool

@dataclass
class AlertInfo:
    """Alert information structure"""
    alert_type: str
    message: str
    timestamp: datetime
    severity: str  # "low", "medium", "high", "critical"
    source: str
    details: Optional[Dict] = None

@dataclass
class SignalSummary:
    """Signal summary for alerts"""
    channel_name: str
    raw_text: str
    parsed_data: Optional[Dict]
    error_message: Optional[str]
    timestamp: datetime
    confidence: Optional[float] = None

class TradingCopilotBot:
    """Main Telegram bot class for trading system control"""
    
    def __init__(self, config_path: str = "env.json"):
        self.config = self._load_config(config_path)
        self.bot_token = self.config.get("TELEGRAM_BOT_TOKEN")
        self.authorized_users = self.config.get("AUTHORIZED_USERS", [])
        self.admin_users = self.config.get("ADMIN_USERS", [])
        
        # System state
        self.blacklisted_pairs = set()
        self.stealth_mode = False
        self.parser_version = "v2.1.0"
        
        # Database for storing bot data
        self._init_database()
        
        # MT5 connection state
        self.mt5_connected = False
        self.last_mt5_status = True  # For disconnect alerts
        
        # Alert system
        self.alert_queue = []
        self.pending_retries = {}  # Store failed trades pending retry
        
        # Initialize Telegram bot
        self.application = None
        
        # Start monitoring thread
        self.monitoring_active = False
        self.monitoring_thread = None
        
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            # Create default config
            default_config = {
                "TELEGRAM_BOT_TOKEN": "YOUR_BOT_TOKEN_HERE",
                "AUTHORIZED_USERS": [],
                "ADMIN_USERS": [],
                "API_BASE_URL": "http://localhost:5000",
                "MT5_MAGIC_NUMBERS": [12345, 67890]
            }
            with open(config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
            logger.warning(f"Created default config at {config_path}. Please update with your credentials.")
            return default_config
    
    def _init_database(self):
        """Initialize SQLite database for bot state"""
        self.db_path = "copilot_bot.db"
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS blacklisted_pairs (
                pair TEXT PRIMARY KEY,
                added_by INTEGER,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bot_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS command_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                command TEXT,
                parameters TEXT,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pending_retries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trade_data TEXT,
                signal_summary TEXT,
                retry_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_id INTEGER
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alert_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT,
                message TEXT,
                severity TEXT,
                source TEXT,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                acknowledged BOOLEAN DEFAULT FALSE
            )
        """)
        
        conn.commit()
        conn.close()
        
        # Load blacklisted pairs
        self._load_blacklisted_pairs()
        self._load_bot_settings()
    
    def _load_blacklisted_pairs(self):
        """Load blacklisted pairs from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT pair FROM blacklisted_pairs")
        self.blacklisted_pairs = {row[0] for row in cursor.fetchall()}
        conn.close()
    
    def _load_bot_settings(self):
        """Load bot settings from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM bot_settings")
        settings = dict(cursor.fetchall())
        conn.close()
        
        self.stealth_mode = settings.get("stealth_mode", "false").lower() == "true"
    
    def _save_setting(self, key: str, value: str):
        """Save setting to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO bot_settings (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        """, (key, value))
        conn.commit()
        conn.close()
    
    def _log_command(self, user_id: int, command: str, parameters: str = ""):
        """Log command execution"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO command_history (user_id, command, parameters)
            VALUES (?, ?, ?)
        """, (user_id, command, parameters))
        conn.commit()
        conn.close()
    
    def _check_authorization(self, user_id: int) -> bool:
        """Check if user is authorized to use the bot"""
        return user_id in self.authorized_users or user_id in self.admin_users
    
    def _check_admin(self, user_id: int) -> bool:
        """Check if user has admin privileges"""
        return user_id in self.admin_users
    
    def _check_mt5_connection(self) -> bool:
        """Check MT5 connection status"""
        try:
            if not mt5.initialize():
                self.mt5_connected = False
                return False
            
            account_info = mt5.account_info()
            if account_info is None:
                self.mt5_connected = False
                return False
            
            self.mt5_connected = True
            return True
        except Exception as e:
            logger.error(f"MT5 connection check failed: {e}")
            self.mt5_connected = False
            return False
    
    def _get_mt5_status(self) -> Dict:
        """Get comprehensive MT5 status"""
        if not self._check_mt5_connection():
            return {
                "connected": False,
                "error": "MT5 not connected",
                "account": None,
                "server": None,
                "balance": 0,
                "equity": 0,
                "margin": 0,
                "free_margin": 0
            }
        
        try:
            account_info = mt5.account_info()
            terminal_info = mt5.terminal_info()
            
            return {
                "connected": True,
                "account": account_info.login if account_info else None,
                "server": account_info.server if account_info else None,
                "balance": account_info.balance if account_info else 0,
                "equity": account_info.equity if account_info else 0,
                "margin": account_info.margin if account_info else 0,
                "free_margin": account_info.margin_free if account_info else 0,
                "currency": account_info.currency if account_info else "USD",
                "leverage": account_info.leverage if account_info else 0,
                "terminal_build": terminal_info.build if terminal_info else 0,
                "terminal_connected": terminal_info.connected if terminal_info else False
            }
        except Exception as e:
            logger.error(f"Error getting MT5 status: {e}")
            return {"connected": False, "error": str(e)}
    
    def _get_recent_trades(self, limit: int = 3) -> List[TradeInfo]:
        """Get recent trades from MT5"""
        if not self._check_mt5_connection():
            return []
        
        try:
            # Get closed positions from the last 30 days
            from_date = datetime.now() - timedelta(days=30)
            deals = mt5.history_deals_get(from_date, datetime.now())
            
            if deals is None:
                return []
            
            # Filter by magic numbers and convert to TradeInfo
            magic_numbers = self.config.get("MT5_MAGIC_NUMBERS", [])
            trades = []
            
            for deal in reversed(deals):  # Most recent first
                if len(trades) >= limit:
                    break
                
                if deal.magic in magic_numbers:
                    # Get position info
                    trade_info = TradeInfo(
                        symbol=deal.symbol,
                        action="BUY" if deal.type == mt5.DEAL_TYPE_BUY else "SELL",
                        lot_size=deal.volume,
                        entry_price=deal.price,
                        stop_loss=None,  # Not available in deal info
                        take_profit=None,  # Not available in deal info
                        profit=deal.profit,
                        timestamp=datetime.fromtimestamp(deal.time),
                        status="CLOSED",
                        magic_number=deal.magic
                    )
                    trades.append(trade_info)
            
            return trades
            
        except Exception as e:
            logger.error(f"Error getting recent trades: {e}")
            return []
    
    def _get_api_data(self, endpoint: str) -> Optional[Dict]:
        """Get data from the API server"""
        try:
            api_base = self.config.get("API_BASE_URL", "http://localhost:5000")
            response = requests.get(f"{api_base}{endpoint}", timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"API error {response.status_code}: {response.text}")
                return None
        except Exception as e:
            logger.error(f"API request failed: {e}")
            return None
    
    def _get_channels(self) -> List[ChannelInfo]:
        """Get channel information from API"""
        data = self._get_api_data("/api/admin/channels")
        if not data:
            return []
        
        channels = []
        for channel_data in data:
            # Get last signal from messages
            messages_data = self._get_api_data(f"/api/messages?channel_id={channel_data['id']}&limit=1")
            last_signal = None
            last_signal_time = None
            
            if messages_data and len(messages_data) > 0:
                last_signal = messages_data[0].get("content", "")[:100] + "..."
                last_signal_time = datetime.fromisoformat(messages_data[0]["createdAt"].replace('Z', '+00:00'))
            
            channel_info = ChannelInfo(
                id=channel_data["id"],
                name=channel_data["name"],
                last_signal=last_signal,
                last_signal_time=last_signal_time,
                is_active=channel_data.get("isActive", True)
            )
            channels.append(channel_info)
        
        return channels
    
    # Alert System Methods
    
    async def _send_alert(self, alert: AlertInfo, signal_summary: Optional[SignalSummary] = None):
        """Send alert message to all authorized users"""
        if not self.application:
            return
        
        # Get severity emoji
        severity_icons = {
            "low": "⚠️",
            "medium": "🟡",
            "high": "🔴",
            "critical": "🚨"
        }
        
        icon = severity_icons.get(alert.severity, "⚠️")
        
        # Build alert message
        alert_msg = f"""
{icon} **SYSTEM ALERT**

**Type:** {alert.alert_type}
**Severity:** {alert.severity.upper()}
**Source:** {alert.source}
**Time:** {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}

**Message:** {alert.message}
        """
        
        # Add signal summary if provided
        if signal_summary:
            alert_msg += f"""

📊 **Signal Summary:**
**Channel:** {signal_summary.channel_name}
**Time:** {signal_summary.timestamp.strftime('%H:%M:%S')}
**Raw Text:** {signal_summary.raw_text[:150]}...

"""
            if signal_summary.parsed_data:
                alert_msg += f"**Parsed Data:** {json.dumps(signal_summary.parsed_data, indent=2)[:200]}...\n"
            
            if signal_summary.confidence:
                alert_msg += f"**Confidence:** {signal_summary.confidence*100:.1f}%\n"
                
            if signal_summary.error_message:
                alert_msg += f"**Error:** {signal_summary.error_message}\n"
        
        # Add details if provided
        if alert.details:
            alert_msg += f"\n**Details:** {json.dumps(alert.details, indent=2)[:300]}..."
        
        # Save alert to database
        self._save_alert(alert)
        
        # Send to all authorized users
        for user_id in self.authorized_users + self.admin_users:
            try:
                await self.application.bot.send_message(
                    chat_id=user_id,
                    text=alert_msg,
                    parse_mode='Markdown'
                )
            except Exception as e:
                logger.error(f"Failed to send alert to user {user_id}: {e}")
    
    async def _send_retry_prompt(self, trade_data: Dict, signal_summary: SignalSummary, error_msg: str):
        """Send retry prompt with YES/NO buttons"""
        if not self.application:
            return
        
        # Generate unique retry ID
        retry_id = f"retry_{int(time.time())}"
        
        # Store pending retry
        self.pending_retries[retry_id] = {
            "trade_data": trade_data,
            "signal_summary": signal_summary,
            "error_message": error_msg,
            "timestamp": datetime.now()
        }
        
        # Save to database
        self._save_pending_retry(retry_id, trade_data, signal_summary)
        
        # Build retry message
        retry_msg = f"""
🔄 **TRADE RETRY REQUIRED**

**Signal:** {signal_summary.channel_name}
**Pair:** {trade_data.get('pair', 'Unknown')}
**Action:** {trade_data.get('action', 'Unknown')}
**Lot Size:** {trade_data.get('lot_size', 'Unknown')}
**Entry:** {trade_data.get('entry', 'Market')}
**SL:** {trade_data.get('sl', 'None')}
**TP:** {trade_data.get('tp', 'None')}

**Error:** {error_msg}
**Time:** {signal_summary.timestamp.strftime('%H:%M:%S')}

**Raw Signal:** {signal_summary.raw_text[:200]}...

Would you like to retry this trade?
        """
        
        # Create inline keyboard
        keyboard = [
            [
                InlineKeyboardButton("✅ YES - Retry", callback_data=f"retry_yes_{retry_id}"),
                InlineKeyboardButton("❌ NO - Skip", callback_data=f"retry_no_{retry_id}")
            ],
            [
                InlineKeyboardButton("⚙️ Edit & Retry", callback_data=f"retry_edit_{retry_id}"),
                InlineKeyboardButton("📊 View Details", callback_data=f"retry_details_{retry_id}")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        # Send to admin users only
        for user_id in self.admin_users:
            try:
                await self.application.bot.send_message(
                    chat_id=user_id,
                    text=retry_msg,
                    parse_mode='Markdown',
                    reply_markup=reply_markup
                )
            except Exception as e:
                logger.error(f"Failed to send retry prompt to user {user_id}: {e}")
    
    def _save_alert(self, alert: AlertInfo):
        """Save alert to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alert_history (alert_type, message, severity, source, details)
            VALUES (?, ?, ?, ?, ?)
        """, (
            alert.alert_type,
            alert.message,
            alert.severity,
            alert.source,
            json.dumps(alert.details) if alert.details else None
        ))
        conn.commit()
        conn.close()
    
    def _save_pending_retry(self, retry_id: str, trade_data: Dict, signal_summary: SignalSummary):
        """Save pending retry to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO pending_retries (id, trade_data, signal_summary, user_id)
            VALUES (?, ?, ?, ?)
        """, (
            retry_id,
            json.dumps(trade_data),
            json.dumps(signal_summary.__dict__, default=str),
            self.admin_users[0] if self.admin_users else None
        ))
        conn.commit()
        conn.close()
    
    def _start_monitoring(self):
        """Start system monitoring thread"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        logger.info("System monitoring started")
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Check MT5 connection status
                current_mt5_status = self._check_mt5_connection()
                
                # Check for MT5 disconnect
                if self.last_mt5_status and not current_mt5_status:
                    alert = AlertInfo(
                        alert_type="MT5_DISCONNECTION",
                        message="MT5 connection lost. Trading operations suspended.",
                        timestamp=datetime.now(),
                        severity="critical",
                        source="MT5_Monitor",
                        details={"previous_status": True, "current_status": False}
                    )
                    
                    # Send alert asynchronously
                    if self.application:
                        asyncio.create_task(self._send_alert(alert))
                
                self.last_mt5_status = current_mt5_status
                
                # Check API server health
                api_status = self._get_api_data("/api/mt5/status")
                if not api_status:
                    alert = AlertInfo(
                        alert_type="API_SERVER_DOWN",
                        message="API server is not responding. System functionality limited.",
                        timestamp=datetime.now(),
                        severity="high",
                        source="API_Monitor"
                    )
                    
                    if self.application:
                        asyncio.create_task(self._send_alert(alert))
                
                # Sleep before next check
                time.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                time.sleep(60)  # Wait longer on error
    
    # Public API methods for external integration
    
    async def alert_parse_error(self, signal_text: str, channel_name: str, error_msg: str):
        """Alert about signal parsing errors"""
        signal_summary = SignalSummary(
            channel_name=channel_name,
            raw_text=signal_text,
            parsed_data=None,
            error_message=error_msg,
            timestamp=datetime.now()
        )
        
        alert = AlertInfo(
            alert_type="SIGNAL_PARSE_ERROR",
            message=f"Failed to parse signal from {channel_name}",
            timestamp=datetime.now(),
            severity="medium",
            source="Signal_Parser"
        )
        
        await self._send_alert(alert, signal_summary)
    
    async def alert_strategy_error(self, trade_data: Dict, channel_name: str, validation_errors: List[str]):
        """Alert about strategy validation errors"""
        signal_summary = SignalSummary(
            channel_name=channel_name,
            raw_text=trade_data.get("raw_text", ""),
            parsed_data=trade_data,
            error_message="; ".join(validation_errors),
            timestamp=datetime.now()
        )
        
        alert = AlertInfo(
            alert_type="STRATEGY_VALIDATION_ERROR",
            message=f"Strategy validation failed: {', '.join(validation_errors)}",
            timestamp=datetime.now(),
            severity="medium",
            source="Strategy_Validator",
            details={"validation_errors": validation_errors, "trade_data": trade_data}
        )
        
        # Check if this should trigger a retry prompt
        critical_errors = ["missing_sl", "invalid_lot_size", "invalid_pair"]
        has_critical_error = any(error in validation_errors[0] for error in critical_errors)
        
        if has_critical_error:
            await self._send_retry_prompt(trade_data, signal_summary, "; ".join(validation_errors))
        else:
            await self._send_alert(alert, signal_summary)
    
    async def alert_trade_failure(self, trade_data: Dict, signal_summary: SignalSummary, error_msg: str):
        """Alert about trade execution failures"""
        alert = AlertInfo(
            alert_type="TRADE_EXECUTION_FAILURE",
            message=f"Trade execution failed: {error_msg}",
            timestamp=datetime.now(),
            severity="high",
            source="Trade_Executor",
            details={"trade_data": trade_data}
        )
        
        await self._send_retry_prompt(trade_data, signal_summary, error_msg)
    
    # Command Handlers
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        user_id = update.effective_user.id
        username = update.effective_user.username or "Unknown"
        
        if not self._check_authorization(user_id):
            await update.message.reply_text(
                "❌ Unauthorized access. Contact administrator for access."
            )
            logger.warning(f"Unauthorized access attempt from {username} (ID: {user_id})")
            return
        
        welcome_msg = f"""
🤖 **AI Trading Signal Copilot Bot**

Welcome, {username}! You have access to the trading system.

**Available Commands:**
/status - System and MT5 status
/trades - Recent trade history  
/replay <channel> - Replay last signal
/disable <pair> - Blacklist trading pair
/stealth <on|off> - Toggle stealth mode
/channels - List all channels
/help - Show this help message

**Admin Commands:** {'✅' if self._check_admin(user_id) else '❌'}
/users - Manage authorized users
/logs - View system logs
/settings - Bot configuration

Current Status: {'🟢 Connected' if self.mt5_connected else '🔴 Disconnected'}
Parser Version: {self.parser_version}
Stealth Mode: {'🔒 ON' if self.stealth_mode else '🔓 OFF'}
        """
        
        await update.message.reply_text(welcome_msg, parse_mode='Markdown')
        self._log_command(user_id, "/start")
    
    async def status_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /status command"""
        user_id = update.effective_user.id
        
        if not self._check_authorization(user_id):
            await update.message.reply_text("❌ Unauthorized access.")
            return
        
        # Get MT5 status
        mt5_status = self._get_mt5_status()
        
        # Get API server status
        api_status = self._get_api_data("/api/mt5/status")
        
        # Build status message
        status_icon = "🟢" if mt5_status["connected"] else "🔴"
        api_icon = "🟢" if api_status else "🔴"
        
        status_msg = f"""
**📊 System Status Report**

**MT5 Connection:** {status_icon} {'Connected' if mt5_status['connected'] else 'Disconnected'}
"""
        
        if mt5_status["connected"]:
            status_msg += f"""
• Account: {mt5_status.get('account', 'N/A')}
• Server: {mt5_status.get('server', 'N/A')}
• Balance: ${mt5_status.get('balance', 0):,.2f}
• Equity: ${mt5_status.get('equity', 0):,.2f}
• Free Margin: ${mt5_status.get('free_margin', 0):,.2f}
• Leverage: 1:{mt5_status.get('leverage', 0)}
"""
        
        status_msg += f"""
**API Server:** {api_icon} {'Online' if api_status else 'Offline'}
**Parser Version:** {self.parser_version}
**Stealth Mode:** {'🔒 ON' if self.stealth_mode else '🔓 OFF'}
**Blacklisted Pairs:** {len(self.blacklisted_pairs)}

**System Uptime:** {self._get_uptime()}
**Last Updated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """
        
        # Add inline keyboard for quick actions
        keyboard = [
            [
                InlineKeyboardButton("🔄 Refresh", callback_data="refresh_status"),
                InlineKeyboardButton("📈 Trades", callback_data="show_trades")
            ],
            [
                InlineKeyboardButton("📡 Channels", callback_data="show_channels"),
                InlineKeyboardButton("⚙️ Settings", callback_data="show_settings")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(status_msg, parse_mode='Markdown', reply_markup=reply_markup)
        self._log_command(user_id, "/status")
    
    async def trades_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /trades command"""
        user_id = update.effective_user.id
        
        if not self._check_authorization(user_id):
            await update.message.reply_text("❌ Unauthorized access.")
            return
        
        trades = self._get_recent_trades(3)
        
        if not trades:
            await update.message.reply_text("📭 No recent trades found.")
            return
        
        trades_msg = "**📈 Latest 3 Trades**\n\n"
        
        for i, trade in enumerate(trades, 1):
            profit_icon = "💰" if trade.profit >= 0 else "💸"
            trades_msg += f"""
**{i}.** {trade.symbol} {trade.action}
• Size: {trade.lot_size} lots
• Entry: {trade.entry_price:.5f}
• P&L: {profit_icon} ${trade.profit:,.2f}
• Time: {trade.timestamp.strftime('%m/%d %H:%M')}
• Magic: {trade.magic_number}
            """
        
        # Add summary
        total_profit = sum(trade.profit for trade in trades)
        profit_icon = "💰" if total_profit >= 0 else "💸"
        trades_msg += f"\n**Total P&L:** {profit_icon} ${total_profit:,.2f}"
        
        await update.message.reply_text(trades_msg, parse_mode='Markdown')
        self._log_command(user_id, "/trades")
    
    async def replay_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /replay command"""
        user_id = update.effective_user.id
        
        if not self._check_authorization(user_id):
            await update.message.reply_text("❌ Unauthorized access.")
            return
        
        if not context.args:
            await update.message.reply_text("❌ Usage: /replay <channel_name>")
            return
        
        channel_name = " ".join(context.args)
        
        # Find channel
        channels = self._get_channels()
        target_channel = None
        
        for channel in channels:
            if channel_name.lower() in channel.name.lower():
                target_channel = channel
                break
        
        if not target_channel:
            available_channels = "\n".join([f"• {ch.name}" for ch in channels])
            await update.message.reply_text(
                f"❌ Channel '{channel_name}' not found.\n\n**Available channels:**\n{available_channels}"
            )
            return
        
        if not target_channel.last_signal:
            await update.message.reply_text(f"❌ No signals found for channel '{target_channel.name}'")
            return
        
        # Replay the signal (send to parser API)
        try:
            api_base = self.config.get("API_BASE_URL", "http://localhost:5000")
            replay_data = {
                "rawText": target_channel.last_signal,
                "channelId": target_channel.id,
                "source": "telegram_bot_replay"
            }
            
            response = requests.post(f"{api_base}/api/parse-signal", json=replay_data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                await update.message.reply_text(
                    f"✅ **Signal Replayed Successfully**\n\n"
                    f"**Channel:** {target_channel.name}\n"
                    f"**Pair:** {result.get('pair', 'Unknown')}\n"
                    f"**Action:** {result.get('action', 'Unknown')}\n"
                    f"**Confidence:** {result.get('confidence', 0)*100:.1f}%\n"
                    f"**Original Time:** {target_channel.last_signal_time.strftime('%m/%d %H:%M') if target_channel.last_signal_time else 'Unknown'}"
                )
            else:
                await update.message.reply_text(f"❌ Failed to replay signal: {response.text}")
                
        except Exception as e:
            await update.message.reply_text(f"❌ Error replaying signal: {str(e)}")
        
        self._log_command(user_id, "/replay", channel_name)
    
    async def disable_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /disable command"""
        user_id = update.effective_user.id
        
        if not self._check_authorization(user_id):
            await update.message.reply_text("❌ Unauthorized access.")
            return
        
        if not context.args:
            # Show current blacklist
            if self.blacklisted_pairs:
                blacklist_msg = "**🚫 Blacklisted Pairs:**\n" + "\n".join([f"• {pair}" for pair in sorted(self.blacklisted_pairs)])
            else:
                blacklist_msg = "✅ No pairs are currently blacklisted."
            
            blacklist_msg += "\n\n**Usage:** /disable <pair> to blacklist\n**Example:** /disable EURUSD"
            await update.message.reply_text(blacklist_msg, parse_mode='Markdown')
            return
        
        pair = context.args[0].upper()
        
        if pair in self.blacklisted_pairs:
            await update.message.reply_text(f"⚠️ {pair} is already blacklisted.")
            return
        
        # Add to blacklist
        self.blacklisted_pairs.add(pair)
        
        # Save to database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO blacklisted_pairs (pair, added_by) VALUES (?, ?)",
            (pair, user_id)
        )
        conn.commit()
        conn.close()
        
        await update.message.reply_text(f"🚫 {pair} has been blacklisted and will be ignored for trading.")
        self._log_command(user_id, "/disable", pair)
    
    async def stealth_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /stealth command"""
        user_id = update.effective_user.id
        
        if not self._check_authorization(user_id):
            await update.message.reply_text("❌ Unauthorized access.")
            return
        
        if not context.args:
            status = "ON" if self.stealth_mode else "OFF"
            await update.message.reply_text(
                f"**🔒 Stealth Mode Status:** {status}\n\n"
                f"**Usage:** /stealth <on|off>\n"
                f"**Example:** /stealth on"
            )
            return
        
        mode = context.args[0].lower()
        
        if mode not in ['on', 'off']:
            await update.message.reply_text("❌ Invalid option. Use 'on' or 'off'.")
            return
        
        self.stealth_mode = mode == 'on'
        self._save_setting("stealth_mode", str(self.stealth_mode).lower())
        
        status_icon = "🔒" if self.stealth_mode else "🔓"
        status_text = "ON" if self.stealth_mode else "OFF"
        
        await update.message.reply_text(f"{status_icon} **Stealth Mode:** {status_text}")
        self._log_command(user_id, "/stealth", mode)
    
    async def channels_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /channels command"""
        user_id = update.effective_user.id
        
        if not self._check_authorization(user_id):
            await update.message.reply_text("❌ Unauthorized access.")
            return
        
        channels = self._get_channels()
        
        if not channels:
            await update.message.reply_text("📭 No channels configured.")
            return
        
        channels_msg = "**📡 Configured Channels**\n\n"
        
        for channel in channels:
            status_icon = "🟢" if channel.is_active else "🔴"
            last_signal_text = "No signals" if not channel.last_signal else f"Last: {channel.last_signal_time.strftime('%m/%d %H:%M') if channel.last_signal_time else 'Unknown'}"
            
            channels_msg += f"""
**{channel.name}** {status_icon}
• ID: {channel.id}
• {last_signal_text}
• Status: {'Active' if channel.is_active else 'Inactive'}
            """
        
        await update.message.reply_text(channels_msg, parse_mode='Markdown')
        self._log_command(user_id, "/channels")
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command"""
        user_id = update.effective_user.id
        
        if not self._check_authorization(user_id):
            await update.message.reply_text("❌ Unauthorized access.")
            return
        
        help_msg = """
**🤖 AI Trading Signal Copilot Bot**

**Basic Commands:**
/status - System and MT5 status
/trades - Recent trade history (last 3)
/replay <channel> - Replay last signal from channel
/disable <pair> - Blacklist trading pair
/stealth <on|off> - Toggle stealth mode
/channels - List all configured channels

**Information Commands:**
/help - Show this help message
/start - Welcome message and status

**Examples:**
• `/replay Gold Signals` - Replay from Gold channel
• `/disable EURUSD` - Blacklist EURUSD pair
• `/stealth on` - Enable stealth mode

**Tips:**
• Use inline buttons for quick actions
• Commands are case-insensitive
• Partial channel names work for /replay
        """
        
        if self._check_admin(user_id):
            help_msg += """
**Admin Commands:**
/users - Manage authorized users
/logs - View recent system logs
/settings - Bot configuration
/blacklist - Manage pair blacklist
            """
        
        await update.message.reply_text(help_msg, parse_mode='Markdown')
        self._log_command(user_id, "/help")
    
    # Callback Query Handlers
    
    async def button_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle inline button callbacks"""
        query = update.callback_query
        user_id = query.from_user.id
        
        if not self._check_authorization(user_id):
            await query.answer("❌ Unauthorized access.")
            return
        
        await query.answer()
        
        # Handle retry callbacks
        if query.data.startswith("retry_"):
            await self._handle_retry_callback(query, user_id)
            return
        
        if query.data == "refresh_status":
            # Refresh status
            mt5_status = self._get_mt5_status()
            status_msg = f"🔄 **Status Refreshed**\n\nMT5: {'🟢 Connected' if mt5_status['connected'] else '🔴 Disconnected'}\nTime: {datetime.now().strftime('%H:%M:%S')}"
            await query.edit_message_text(status_msg, parse_mode='Markdown')
            
        elif query.data == "show_trades":
            # Show trades inline
            trades = self._get_recent_trades(3)
            if trades:
                trades_summary = f"📈 **Quick Trades Summary**\n\n"
                for trade in trades:
                    profit_icon = "💰" if trade.profit >= 0 else "💸"
                    trades_summary += f"{trade.symbol} {trade.action}: {profit_icon}${trade.profit:.2f}\n"
                await query.edit_message_text(trades_summary, parse_mode='Markdown')
            else:
                await query.edit_message_text("📭 No recent trades found.")
                
        elif query.data == "show_channels":
            # Show channels inline
            channels = self._get_channels()
            if channels:
                channels_summary = "📡 **Channels Summary**\n\n"
                for ch in channels[:5]:  # Show first 5
                    status = "🟢" if ch.is_active else "🔴"
                    channels_summary += f"{status} {ch.name}\n"
                await query.edit_message_text(channels_summary, parse_mode='Markdown')
            else:
                await query.edit_message_text("📭 No channels configured.")
    
    async def _handle_retry_callback(self, query, user_id: int):
        """Handle retry button callbacks"""
        callback_data = query.data
        action = callback_data.split("_")[1]  # yes, no, edit, details
        retry_id = "_".join(callback_data.split("_")[2:])
        
        # Get pending retry data
        if retry_id not in self.pending_retries:
            await query.edit_message_text("❌ Retry request expired or not found.")
            return
        
        retry_data = self.pending_retries[retry_id]
        trade_data = retry_data["trade_data"]
        signal_summary = retry_data["signal_summary"]
        error_message = retry_data["error_message"]
        
        if action == "yes":
            # User chose to retry the trade
            await self._execute_retry(query, retry_id, trade_data, signal_summary)
            
        elif action == "no":
            # User chose to skip the trade
            response_msg = f"""
✅ **Trade Skipped**

**Signal:** {signal_summary.channel_name}
**Pair:** {trade_data.get('pair', 'Unknown')}
**Action:** Skipped by user
**Time:** {datetime.now().strftime('%H:%M:%S')}

The trade has been removed from retry queue.
            """
            
            # Remove from pending retries
            del self.pending_retries[retry_id]
            self._remove_pending_retry(retry_id)
            
            await query.edit_message_text(response_msg, parse_mode='Markdown')
            
        elif action == "edit":
            # Show edit options
            await self._show_edit_options(query, retry_id, trade_data, signal_summary)
            
        elif action == "details":
            # Show detailed information
            await self._show_retry_details(query, retry_id, trade_data, signal_summary, error_message)
    
    async def _execute_retry(self, query, retry_id: str, trade_data: Dict, signal_summary: SignalSummary):
        """Execute the retry trade"""
        try:
            # Send trade to API for execution
            api_base = self.config.get("API_BASE_URL", "http://localhost:5000")
            
            # Prepare retry payload
            retry_payload = {
                "rawText": signal_summary.raw_text,
                "channelId": trade_data.get("channel_id"),
                "source": "telegram_bot_retry",
                "forced_execution": True,
                "retry_data": trade_data
            }
            
            response = requests.post(f"{api_base}/api/parse-signal", json=retry_payload, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                
                response_msg = f"""
✅ **Trade Retry Successful**

**Signal:** {signal_summary.channel_name}
**Pair:** {result.get('pair', 'Unknown')}
**Action:** {result.get('action', 'Unknown')}
**Confidence:** {result.get('confidence', 0)*100:.1f}%
**Status:** Executed
**Time:** {datetime.now().strftime('%H:%M:%S')}

The trade has been successfully processed and sent to MT5.
                """
                
                # Log successful retry
                self._log_command(query.from_user.id, f"retry_executed", retry_id)
                
            else:
                response_msg = f"""
❌ **Trade Retry Failed**

**Error:** {response.text}
**Time:** {datetime.now().strftime('%H:%M:%S')}

The retry attempt failed. Please check the system status.
                """
            
            # Remove from pending retries
            del self.pending_retries[retry_id]
            self._remove_pending_retry(retry_id)
            
            await query.edit_message_text(response_msg, parse_mode='Markdown')
            
        except Exception as e:
            error_msg = f"""
❌ **Retry Execution Error**

**Error:** {str(e)}
**Time:** {datetime.now().strftime('%H:%M:%S')}

Please try again or contact system administrator.
            """
            await query.edit_message_text(error_msg, parse_mode='Markdown')
    
    async def _show_edit_options(self, query, retry_id: str, trade_data: Dict, signal_summary: SignalSummary):
        """Show edit options for the trade"""
        edit_msg = f"""
⚙️ **Edit Trade Parameters**

**Current Values:**
• Pair: {trade_data.get('pair', 'Unknown')}
• Action: {trade_data.get('action', 'Unknown')}
• Lot Size: {trade_data.get('lot_size', 'Unknown')}
• Entry: {trade_data.get('entry', 'Market')}
• SL: {trade_data.get('sl', 'None')}
• TP: {trade_data.get('tp', 'None')}

**Note:** Advanced editing requires manual intervention.
Use /replay command with corrected parameters or contact admin.
        """
        
        keyboard = [
            [
                InlineKeyboardButton("✅ Execute As-Is", callback_data=f"retry_yes_{retry_id}"),
                InlineKeyboardButton("❌ Cancel", callback_data=f"retry_no_{retry_id}")
            ],
            [
                InlineKeyboardButton("📊 View Details", callback_data=f"retry_details_{retry_id}")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(edit_msg, parse_mode='Markdown', reply_markup=reply_markup)
    
    async def _show_retry_details(self, query, retry_id: str, trade_data: Dict, signal_summary: SignalSummary, error_message: str):
        """Show detailed retry information"""
        confidence_text = f"{signal_summary.confidence*100:.1f}%" if signal_summary.confidence is not None else "N/A"
        
        details_msg = f"""
📊 **Detailed Retry Information**

**Signal Details:**
• Channel: {signal_summary.channel_name}
• Timestamp: {signal_summary.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
• Confidence: {confidence_text}

**Trade Parameters:**
• Symbol: {trade_data.get('pair', 'Unknown')}
• Action: {trade_data.get('action', 'Unknown')}
• Volume: {trade_data.get('lot_size', 'Unknown')} lots
• Entry Price: {trade_data.get('entry', 'Market order')}
• Stop Loss: {trade_data.get('sl', 'Not set')}
• Take Profit: {trade_data.get('tp', 'Not set')}

**Error Information:**
{error_message}

**Raw Signal Text:**
{signal_summary.raw_text[:300]}...

**Parsed Data:**
{json.dumps(signal_summary.parsed_data, indent=2)[:400] if signal_summary.parsed_data else 'None'}...
        """
        
        keyboard = [
            [
                InlineKeyboardButton("✅ Retry", callback_data=f"retry_yes_{retry_id}"),
                InlineKeyboardButton("❌ Skip", callback_data=f"retry_no_{retry_id}")
            ],
            [
                InlineKeyboardButton("⚙️ Edit", callback_data=f"retry_edit_{retry_id}")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(details_msg, parse_mode='Markdown', reply_markup=reply_markup)
    
    def _remove_pending_retry(self, retry_id: str):
        """Remove pending retry from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM pending_retries WHERE id = ?", (retry_id,))
        conn.commit()
        conn.close()
    
    # Utility Methods
    
    def _get_uptime(self) -> str:
        """Get system uptime (placeholder)"""
        return "24h 15m"  # This would be calculated from actual startup time
    
    # Bot Management
    
    async def error_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle errors"""
        logger.error(f"Update {update} caused error {context.error}")
        
        if update and update.effective_message:
            await update.effective_message.reply_text(
                "❌ An error occurred while processing your request. Please try again."
            )
    
    def run_bot(self):
        """Start the Telegram bot"""
        if not self.bot_token or self.bot_token == "YOUR_BOT_TOKEN_HERE":
            logger.error("Bot token not configured. Please update env.json with your bot token.")
            return
        
        # Create application
        self.application = Application.builder().token(self.bot_token).build()
        
        # Add command handlers
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("status", self.status_command))
        self.application.add_handler(CommandHandler("trades", self.trades_command))
        self.application.add_handler(CommandHandler("replay", self.replay_command))
        self.application.add_handler(CommandHandler("disable", self.disable_command))
        self.application.add_handler(CommandHandler("stealth", self.stealth_command))
        self.application.add_handler(CommandHandler("channels", self.channels_command))
        
        # Add callback query handler
        self.application.add_handler(CallbackQueryHandler(self.button_callback))
        
        # Add error handler
        self.application.add_error_handler(self.error_handler)
        
        logger.info("Starting Telegram Copilot Bot...")
        logger.info(f"Authorized users: {len(self.authorized_users)}")
        logger.info(f"Admin users: {len(self.admin_users)}")
        
        # Start monitoring thread
        self._start_monitoring()
        
        # Start the bot
        self.application.run_polling(allowed_updates=Update.ALL_TYPES)
    
    def stop_bot(self):
        """Stop the Telegram bot"""
        if self.application:
            self.application.stop()
            logger.info("Telegram Copilot Bot stopped.")


# Standalone execution
if __name__ == "__main__":
    try:
        bot = TradingCopilotBot()
        bot.run_bot()
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Bot failed to start: {e}")
    finally:
        # Cleanup
        mt5.shutdown()