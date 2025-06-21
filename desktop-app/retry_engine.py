"""
Smart Retry Executor for MT5 Trade Management
Handles trade buffering, intelligent retry logic, and market condition validation
"""

import json
import time
import logging
import threading
from datetime import datetime, timedelta
from queue import Queue, Empty
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import MetaTrader5 as mt5


class RetryReason(Enum):
    """Enumeration of retry reasons for logging and analysis"""
    MT5_DISCONNECTION = "mt5_disconnection"
    EXECUTION_FAILURE = "execution_failure"
    SPREAD_TOO_HIGH = "spread_too_high"
    SLIPPAGE_EXCEEDED = "slippage_exceeded"
    MARKET_CLOSED = "market_closed"
    INSUFFICIENT_MARGIN = "insufficient_margin"
    INVALID_STOPS = "invalid_stops"
    PRICE_CHANGED = "price_changed"


@dataclass
class TradeRequest:
    """Trade request structure with metadata"""
    symbol: str
    action: str  # "buy" or "sell"
    lot_size: float
    entry_price: Optional[float]
    stop_loss: Optional[float]
    take_profit: Optional[float]
    order_type: str  # "market", "limit", "stop"
    magic_number: int
    deviation: int
    comment: str
    timestamp: datetime
    original_signal_id: Optional[str] = None
    user_id: Optional[int] = None
    retry_count: int = 0
    max_retries: int = 3
    
    def to_dict(self) -> Dict:
        """Convert trade request to dictionary for logging"""
        return {
            "symbol": self.symbol,
            "action": self.action,
            "lot_size": self.lot_size,
            "entry_price": self.entry_price,
            "stop_loss": self.stop_loss,
            "take_profit": self.take_profit,
            "order_type": self.order_type,
            "magic_number": self.magic_number,
            "timestamp": self.timestamp.isoformat(),
            "retry_count": self.retry_count,
            "max_retries": self.max_retries
        }


@dataclass
class RetryAttempt:
    """Retry attempt logging structure"""
    trade_id: str
    attempt_number: int
    reason: RetryReason
    timestamp: datetime
    spread_before: float
    spread_after: float
    slippage_threshold: float
    success: bool
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convert retry attempt to dictionary for logging"""
        return {
            "trade_id": self.trade_id,
            "attempt_number": self.attempt_number,
            "reason": self.reason.value,
            "timestamp": self.timestamp.isoformat(),
            "spread_before": self.spread_before,
            "spread_after": self.spread_after,
            "slippage_threshold": self.slippage_threshold,
            "success": self.success,
            "error_message": self.error_message
        }


class SmartRetryExecutor:
    """
    Advanced retry engine for MT5 trade execution with intelligent market validation
    """
    
    def __init__(self, config_path: str = "config.json"):
        self.config_path = config_path
        self.config = self._load_config()
        
        # Trade queue and processing
        self.trade_queue = Queue()
        self.processing_thread = None
        self.is_running = False
        
        # Retry tracking
        self.retry_attempts: List[RetryAttempt] = []
        self.failed_trades: List[TradeRequest] = []
        
        # MT5 connection state
        self.mt5_connected = False
        self.last_connection_check = datetime.now()
        
        # Setup logging
        self._setup_logging()
        
        # Initialize MT5 connection
        self._initialize_mt5()
        
        # Start processing thread
        self.start_processing()
    
    def _load_config(self) -> Dict:
        """Load configuration from JSON file with defaults"""
        default_config = {
            "retry_settings": {
                "max_retries": 3,
                "retry_window_seconds": 300,
                "base_delay_seconds": 1,
                "exponential_backoff": True,
                "max_delay_seconds": 30
            },
            "market_validation": {
                "max_spread_multiplier": 2.0,
                "slippage_threshold_pips": 5,
                "check_market_hours": True,
                "min_free_margin_percent": 20
            },
            "logging": {
                "retry_log_file": "retry_log.txt",
                "log_level": "INFO",
                "max_log_size_mb": 10,
                "backup_count": 5
            },
            "mt5_settings": {
                "connection_timeout": 5,
                "reconnection_attempts": 3,
                "health_check_interval": 30
            }
        }
        
        try:
            with open(self.config_path, 'r') as f:
                user_config = json.load(f)
                # Merge with defaults
                config = default_config.copy()
                config.update(user_config)
                return config
        except FileNotFoundError:
            # Create default config file
            with open(self.config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
            return default_config
        except json.JSONDecodeError as e:
            self.logger.error(f"Invalid JSON in config file: {e}")
            return default_config
    
    def _setup_logging(self):
        """Setup logging configuration"""
        log_config = self.config.get("logging", {})
        log_file = log_config.get("retry_log_file", "retry_log.txt")
        log_level = getattr(logging, log_config.get("log_level", "INFO"))
        
        # Create logger
        self.logger = logging.getLogger("SmartRetryExecutor")
        self.logger.setLevel(log_level)
        
        # Create file handler with rotation
        from logging.handlers import RotatingFileHandler
        max_bytes = log_config.get("max_log_size_mb", 10) * 1024 * 1024
        backup_count = log_config.get("backup_count", 5)
        
        file_handler = RotatingFileHandler(
            log_file, maxBytes=max_bytes, backupCount=backup_count
        )
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        
        # Add handler to logger
        self.logger.addHandler(file_handler)
        
        self.logger.info("SmartRetryExecutor initialized")
    
    def _initialize_mt5(self) -> bool:
        """Initialize MT5 connection"""
        try:
            if not mt5.initialize():
                self.logger.error(f"MT5 initialization failed: {mt5.last_error()}")
                return False
            
            # Test connection
            account_info = mt5.account_info()
            if account_info is None:
                self.logger.error("Failed to get account info")
                return False
            
            self.mt5_connected = True
            self.last_connection_check = datetime.now()
            self.logger.info(f"MT5 connected successfully. Account: {account_info.login}")
            return True
            
        except Exception as e:
            self.logger.error(f"MT5 initialization error: {e}")
            self.mt5_connected = False
            return False
    
    def _check_mt5_connection(self) -> bool:
        """Check MT5 connection status with periodic health checks"""
        now = datetime.now()
        health_check_interval = self.config["mt5_settings"]["health_check_interval"]
        
        # Only check if enough time has passed since last check
        if (now - self.last_connection_check).seconds < health_check_interval:
            return self.mt5_connected
        
        try:
            # Test connection with account info
            account_info = mt5.account_info()
            if account_info is None:
                self.mt5_connected = False
                self.logger.warning("MT5 connection lost - account info unavailable")
            else:
                self.mt5_connected = True
                
            self.last_connection_check = now
            return self.mt5_connected
            
        except Exception as e:
            self.logger.error(f"MT5 connection check failed: {e}")
            self.mt5_connected = False
            self.last_connection_check = now
            return False
    
    def _reconnect_mt5(self) -> bool:
        """Attempt to reconnect to MT5"""
        max_attempts = self.config["mt5_settings"]["reconnection_attempts"]
        
        for attempt in range(max_attempts):
            self.logger.info(f"Reconnection attempt {attempt + 1}/{max_attempts}")
            
            # Shutdown current connection
            mt5.shutdown()
            time.sleep(2)
            
            # Try to reconnect
            if self._initialize_mt5():
                self.logger.info("MT5 reconnection successful")
                return True
            
            # Wait before next attempt
            time.sleep(5 * (attempt + 1))  # Exponential backoff
        
        self.logger.error("All MT5 reconnection attempts failed")
        return False
    
    def _get_symbol_info(self, symbol: str) -> Optional[Any]:
        """Get symbol information from MT5"""
        try:
            symbol_info = mt5.symbol_info(symbol)
            if symbol_info is None:
                self.logger.error(f"Symbol {symbol} not found")
                return None
            
            if not symbol_info.visible:
                # Try to make symbol visible
                if not mt5.symbol_select(symbol, True):
                    self.logger.error(f"Failed to select symbol {symbol}")
                    return None
                symbol_info = mt5.symbol_info(symbol)
            
            return symbol_info
            
        except Exception as e:
            self.logger.error(f"Error getting symbol info for {symbol}: {e}")
            return None
    
    def _calculate_spread(self, symbol: str) -> Optional[float]:
        """Calculate current spread for symbol in pips"""
        try:
            symbol_info = self._get_symbol_info(symbol)
            if symbol_info is None:
                return None
            
            tick = mt5.symbol_info_tick(symbol)
            if tick is None:
                self.logger.error(f"Failed to get tick data for {symbol}")
                return None
            
            # Calculate spread in pips
            point = symbol_info.point
            if symbol_info.digits == 5 or symbol_info.digits == 3:
                pip_value = point * 10
            else:
                pip_value = point
            
            spread_pips = (tick.ask - tick.bid) / pip_value
            return spread_pips
            
        except Exception as e:
            self.logger.error(f"Error calculating spread for {symbol}: {e}")
            return None
    
    def _check_market_conditions(self, trade_request: TradeRequest) -> tuple[bool, Optional[RetryReason], Dict]:
        """
        Check if market conditions are suitable for trade execution
        Returns: (is_valid, retry_reason, validation_data)
        """
        validation_data = {
            "spread_pips": None,
            "max_allowed_spread": None,
            "free_margin_percent": None,
            "market_open": None
        }
        
        # Check MT5 connection
        if not self._check_mt5_connection():
            return False, RetryReason.MT5_DISCONNECTION, validation_data
        
        # Get symbol info
        symbol_info = self._get_symbol_info(trade_request.symbol)
        if symbol_info is None:
            return False, RetryReason.EXECUTION_FAILURE, validation_data
        
        # Check market hours
        if self.config["market_validation"]["check_market_hours"]:
            if symbol_info.trade_mode == mt5.SYMBOL_TRADE_MODE_DISABLED:
                validation_data["market_open"] = False
                return False, RetryReason.MARKET_CLOSED, validation_data
        
        validation_data["market_open"] = True
        
        # Check spread
        current_spread = self._calculate_spread(trade_request.symbol)
        if current_spread is None:
            return False, RetryReason.EXECUTION_FAILURE, validation_data
        
        validation_data["spread_pips"] = current_spread
        
        # Calculate maximum allowed spread
        typical_spread = symbol_info.spread / (10 if symbol_info.digits in [5, 3] else 1)
        max_spread_multiplier = self.config["market_validation"]["max_spread_multiplier"]
        max_allowed_spread = typical_spread * max_spread_multiplier
        validation_data["max_allowed_spread"] = max_allowed_spread
        
        if current_spread > max_allowed_spread:
            return False, RetryReason.SPREAD_TOO_HIGH, validation_data
        
        # Check account margin
        account_info = mt5.account_info()
        if account_info:
            if account_info.equity > 0:
                free_margin_percent = (account_info.margin_free / account_info.equity) * 100
                validation_data["free_margin_percent"] = free_margin_percent
                
                min_margin = self.config["market_validation"]["min_free_margin_percent"]
                if free_margin_percent < min_margin:
                    return False, RetryReason.INSUFFICIENT_MARGIN, validation_data
        
        return True, None, validation_data
    
    def _execute_trade(self, trade_request: TradeRequest) -> tuple[bool, Optional[str], Dict]:
        """
        Execute trade in MT5
        Returns: (success, error_message, execution_data)
        """
        execution_data = {
            "order_ticket": None,
            "execution_price": None,
            "slippage_pips": None,
            "execution_time": None
        }
        
        try:
            start_time = time.time()
            
            # Prepare order request
            symbol_info = self._get_symbol_info(trade_request.symbol)
            if symbol_info is None:
                return False, "Symbol info unavailable", execution_data
            
            # Get current prices
            tick = mt5.symbol_info_tick(trade_request.symbol)
            if tick is None:
                return False, "Tick data unavailable", execution_data
            
            # Determine order type and price
            if trade_request.order_type.lower() == "market":
                if trade_request.action.lower() == "buy":
                    price = tick.ask
                    order_type = mt5.ORDER_TYPE_BUY
                else:
                    price = tick.bid
                    order_type = mt5.ORDER_TYPE_SELL
            elif trade_request.order_type.lower() == "limit":
                price = trade_request.entry_price
                order_type = mt5.ORDER_TYPE_BUY_LIMIT if trade_request.action.lower() == "buy" else mt5.ORDER_TYPE_SELL_LIMIT
            else:  # stop order
                price = trade_request.entry_price
                order_type = mt5.ORDER_TYPE_BUY_STOP if trade_request.action.lower() == "buy" else mt5.ORDER_TYPE_SELL_STOP
            
            # Prepare request
            request = {
                "action": mt5.TRADE_ACTION_DEAL if trade_request.order_type.lower() == "market" else mt5.TRADE_ACTION_PENDING,
                "symbol": trade_request.symbol,
                "volume": trade_request.lot_size,
                "type": order_type,
                "price": price,
                "deviation": trade_request.deviation,
                "magic": trade_request.magic_number,
                "comment": trade_request.comment,
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": mt5.ORDER_FILLING_IOC,
            }
            
            # Add stops if provided
            if trade_request.stop_loss:
                request["sl"] = trade_request.stop_loss
            if trade_request.take_profit:
                request["tp"] = trade_request.take_profit
            
            # Send order
            result = mt5.order_send(request)
            execution_time = time.time() - start_time
            execution_data["execution_time"] = execution_time
            
            if result is None:
                return False, "Order send failed - no result", execution_data
            
            if result.retcode != mt5.TRADE_RETCODE_DONE:
                error_msg = f"Order failed: {result.retcode} - {result.comment if hasattr(result, 'comment') else 'Unknown error'}"
                return False, error_msg, execution_data
            
            # Calculate slippage
            if hasattr(result, 'price') and trade_request.entry_price:
                point = symbol_info.point
                pip_value = point * 10 if symbol_info.digits in [5, 3] else point
                slippage_pips = abs(result.price - trade_request.entry_price) / pip_value
                execution_data["slippage_pips"] = slippage_pips
                
                # Check if slippage exceeds threshold
                slippage_threshold = self.config["market_validation"]["slippage_threshold_pips"]
                if slippage_pips > slippage_threshold:
                    self.logger.warning(f"High slippage detected: {slippage_pips:.2f} pips (threshold: {slippage_threshold})")
            
            execution_data["order_ticket"] = result.order
            execution_data["execution_price"] = result.price if hasattr(result, 'price') else None
            
            self.logger.info(f"Trade executed successfully: {trade_request.symbol} {trade_request.action} {trade_request.lot_size} lots")
            return True, None, execution_data
            
        except Exception as e:
            error_msg = f"Trade execution error: {str(e)}"
            self.logger.error(error_msg)
            return False, error_msg, execution_data
    
    def _calculate_retry_delay(self, attempt_number: int) -> float:
        """Calculate delay before retry attempt"""
        base_delay = self.config["retry_settings"]["base_delay_seconds"]
        max_delay = self.config["retry_settings"]["max_delay_seconds"]
        
        if self.config["retry_settings"]["exponential_backoff"]:
            delay = base_delay * (2 ** attempt_number)
            return min(delay, max_delay)
        else:
            return base_delay
    
    def _log_retry_attempt(self, trade_request: TradeRequest, reason: RetryReason, 
                          spread_before: float, spread_after: float, 
                          success: bool, error_message: Optional[str] = None):
        """Log retry attempt details"""
        attempt = RetryAttempt(
            trade_id=f"{trade_request.symbol}_{trade_request.timestamp.timestamp()}",
            attempt_number=trade_request.retry_count,
            reason=reason,
            timestamp=datetime.now(),
            spread_before=spread_before,
            spread_after=spread_after,
            slippage_threshold=self.config["market_validation"]["slippage_threshold_pips"],
            success=success,
            error_message=error_message
        )
        
        self.retry_attempts.append(attempt)
        
        # Log to file
        log_entry = json.dumps(attempt.to_dict())
        self.logger.info(f"RETRY_ATTEMPT: {log_entry}")
    
    def _process_trade_with_retry(self, trade_request: TradeRequest):
        """Process a single trade with retry logic"""
        original_spread = self._calculate_spread(trade_request.symbol) or 0
        
        while trade_request.retry_count <= trade_request.max_retries:
            # Check if we're within retry window
            retry_window = self.config["retry_settings"]["retry_window_seconds"]
            time_elapsed = (datetime.now() - trade_request.timestamp).total_seconds()
            
            if time_elapsed > retry_window:
                self.logger.warning(f"Trade retry window expired for {trade_request.symbol}")
                self.failed_trades.append(trade_request)
                return
            
            # Check market conditions
            conditions_valid, retry_reason, validation_data = self._check_market_conditions(trade_request)
            
            if not conditions_valid:
                current_spread = validation_data.get("spread_pips", 0)
                self._log_retry_attempt(
                    trade_request, retry_reason, original_spread, current_spread,
                    False, f"Market conditions not suitable: {retry_reason.value}"
                )
                
                # If it's a connection issue, try to reconnect
                if retry_reason == RetryReason.MT5_DISCONNECTION:
                    if not self._reconnect_mt5():
                        trade_request.retry_count += 1
                        if trade_request.retry_count <= trade_request.max_retries:
                            delay = self._calculate_retry_delay(trade_request.retry_count)
                            time.sleep(delay)
                        continue
                
                # For other issues, wait and retry
                trade_request.retry_count += 1
                if trade_request.retry_count <= trade_request.max_retries:
                    delay = self._calculate_retry_delay(trade_request.retry_count)
                    self.logger.info(f"Retrying trade in {delay} seconds (attempt {trade_request.retry_count})")
                    time.sleep(delay)
                continue
            
            # Attempt trade execution
            success, error_message, execution_data = self._execute_trade(trade_request)
            current_spread = validation_data.get("spread_pips", 0)
            
            if success:
                self._log_retry_attempt(
                    trade_request, RetryReason.EXECUTION_FAILURE, original_spread, 
                    current_spread, True
                )
                self.logger.info(f"Trade executed successfully after {trade_request.retry_count} retries")
                return
            else:
                self._log_retry_attempt(
                    trade_request, RetryReason.EXECUTION_FAILURE, original_spread,
                    current_spread, False, error_message
                )
                
                trade_request.retry_count += 1
                if trade_request.retry_count <= trade_request.max_retries:
                    delay = self._calculate_retry_delay(trade_request.retry_count)
                    self.logger.info(f"Trade execution failed, retrying in {delay} seconds: {error_message}")
                    time.sleep(delay)
                else:
                    self.logger.error(f"Trade failed after {trade_request.max_retries} retries: {error_message}")
                    self.failed_trades.append(trade_request)
                    return
        
        # If we get here, all retries exhausted
        self.failed_trades.append(trade_request)
    
    def _process_queue(self):
        """Main processing loop for trade queue"""
        while self.is_running:
            try:
                # Get trade request from queue with timeout
                trade_request = self.trade_queue.get(timeout=1)
                
                self.logger.info(f"Processing trade: {trade_request.symbol} {trade_request.action} {trade_request.lot_size}")
                
                # Process trade with retry logic
                self._process_trade_with_retry(trade_request)
                
                # Mark task as done
                self.trade_queue.task_done()
                
            except Empty:
                # Timeout - continue loop
                continue
            except Exception as e:
                self.logger.error(f"Error processing trade queue: {e}")
                continue
    
    def start_processing(self):
        """Start the trade processing thread"""
        if self.processing_thread is None or not self.processing_thread.is_alive():
            self.is_running = True
            self.processing_thread = threading.Thread(target=self._process_queue, daemon=True)
            self.processing_thread.start()
            self.logger.info("Trade processing thread started")
    
    def stop_processing(self):
        """Stop the trade processing thread"""
        self.is_running = False
        if self.processing_thread and self.processing_thread.is_alive():
            self.processing_thread.join(timeout=5)
            self.logger.info("Trade processing thread stopped")
    
    def add_trade(self, trade_request: TradeRequest) -> bool:
        """
        Add trade to processing queue
        Returns: True if added successfully, False otherwise
        """
        try:
            # Set max retries from config if not specified
            if trade_request.max_retries == 3:  # Default value
                trade_request.max_retries = self.config["retry_settings"]["max_retries"]
            
            self.trade_queue.put(trade_request)
            self.logger.info(f"Trade added to queue: {trade_request.symbol} {trade_request.action}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to add trade to queue: {e}")
            return False
    
    def get_queue_status(self) -> Dict:
        """Get current queue status and statistics"""
        return {
            "queue_size": self.trade_queue.qsize(),
            "is_processing": self.is_running,
            "mt5_connected": self.mt5_connected,
            "total_retry_attempts": len(self.retry_attempts),
            "failed_trades": len(self.failed_trades),
            "last_connection_check": self.last_connection_check.isoformat()
        }
    
    def get_retry_statistics(self) -> Dict:
        """Get detailed retry statistics"""
        if not self.retry_attempts:
            return {"no_data": True}
        
        # Calculate statistics
        total_attempts = len(self.retry_attempts)
        successful_retries = sum(1 for attempt in self.retry_attempts if attempt.success)
        
        # Group by reason
        reason_counts = {}
        for attempt in self.retry_attempts:
            reason = attempt.reason.value
            reason_counts[reason] = reason_counts.get(reason, 0) + 1
        
        # Average spreads
        avg_spread_before = sum(attempt.spread_before for attempt in self.retry_attempts) / total_attempts
        avg_spread_after = sum(attempt.spread_after for attempt in self.retry_attempts) / total_attempts
        
        return {
            "total_retry_attempts": total_attempts,
            "successful_retries": successful_retries,
            "success_rate": (successful_retries / total_attempts) * 100,
            "retry_reasons": reason_counts,
            "average_spread_before": avg_spread_before,
            "average_spread_after": avg_spread_after,
            "failed_trades_count": len(self.failed_trades)
        }
    
    def clear_failed_trades(self):
        """Clear the failed trades list"""
        self.failed_trades.clear()
        self.logger.info("Failed trades list cleared")
    
    def shutdown(self):
        """Shutdown the retry executor"""
        self.logger.info("Shutting down SmartRetryExecutor")
        self.stop_processing()
        
        # Wait for queue to empty
        if not self.trade_queue.empty():
            self.logger.info("Waiting for trade queue to empty...")
            self.trade_queue.join()
        
        # Shutdown MT5
        mt5.shutdown()
        self.logger.info("SmartRetryExecutor shutdown complete")


# Example usage and helper functions
def create_trade_request_from_signal(signal_data: Dict, user_settings: Dict) -> TradeRequest:
    """Create TradeRequest from parsed signal data"""
    return TradeRequest(
        symbol=signal_data.get("pair", ""),
        action=signal_data.get("action", ""),
        lot_size=user_settings.get("lot_size", 0.1),
        entry_price=signal_data.get("entry"),
        stop_loss=signal_data.get("sl"),
        take_profit=signal_data.get("tp", [None])[0] if signal_data.get("tp") else None,
        order_type=signal_data.get("orderType", "market"),
        magic_number=user_settings.get("magic_number", 12345),
        deviation=user_settings.get("deviation", 10),
        comment=f"Signal_{signal_data.get('signalId', 'unknown')}",
        timestamp=datetime.now(),
        original_signal_id=signal_data.get("signalId"),
        user_id=user_settings.get("user_id")
    )


if __name__ == "__main__":
    # Example usage
    retry_executor = SmartRetryExecutor()
    
    # Example trade request
    trade = TradeRequest(
        symbol="EURUSD",
        action="buy",
        lot_size=0.1,
        entry_price=None,  # Market order
        stop_loss=1.0800,
        take_profit=1.0900,
        order_type="market",
        magic_number=12345,
        deviation=10,
        comment="Test trade",
        timestamp=datetime.now()
    )
    
    # Add trade to queue
    retry_executor.add_trade(trade)
    
    # Monitor for a while
    time.sleep(10)
    
    # Check status
    status = retry_executor.get_queue_status()
    stats = retry_executor.get_retry_statistics()
    
    print("Queue Status:", json.dumps(status, indent=2))
    print("Retry Statistics:", json.dumps(stats, indent=2))
    
    # Shutdown
    retry_executor.shutdown()