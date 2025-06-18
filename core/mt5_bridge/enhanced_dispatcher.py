#!/usr/bin/env python3
"""
Enhanced Multi-User MT5 Signal Dispatcher
Handles user-specific signal routing with execution modes and retry logic
"""

import json
import asyncio
import hashlib
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path
import os

logger = logging.getLogger(__name__)

class MultiUserMT5Dispatcher:
    def __init__(self, base_signal_path: str = "core/storage/signals"):
        self.base_signal_path = Path(base_signal_path)
        self.base_signal_path.mkdir(parents=True, exist_ok=True)
        
        self.user_configs: Dict[str, Dict] = {}
        self.retry_counts: Dict[str, int] = {}
        self.max_retries = 3
        
    async def initialize(self):
        """Initialize dispatcher with user configurations"""
        await self._load_user_configs()
        logger.info(f"MT5 Dispatcher initialized for {len(self.user_configs)} users")
    
    async def dispatch_signal(self, signal_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Dispatch signal to specific user with execution mode handling"""
        try:
            user_config = self.user_configs.get(user_id)
            if not user_config:
                return {"success": False, "error": "User configuration not found"}
            
            # Check execution mode
            execution_mode = user_config.get('execution_mode', 'auto')
            
            if execution_mode == 'shadow':
                # Log only, no trade execution
                await self._log_shadow_trade(signal_data, user_id)
                return {"success": True, "mode": "shadow", "message": "Signal logged in shadow mode"}
            
            elif execution_mode == 'semi-auto':
                # Require confirmation via Telegram bot
                await self._request_confirmation(signal_data, user_id)
                return {"success": True, "mode": "semi-auto", "message": "Confirmation requested"}
            
            else:  # auto mode
                # Direct execution
                return await self._execute_auto_trade(signal_data, user_id)
                
        except Exception as e:
            logger.error(f"Signal dispatch failed for user {user_id}: {e}")
            return {"success": False, "error": str(e)}
    
    async def _execute_auto_trade(self, signal_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Execute trade automatically for user"""
        try:
            user_config = self.user_configs[user_id]
            
            # Apply risk management
            processed_signal = await self._apply_risk_management(signal_data, user_config)
            if not processed_signal:
                return {"success": False, "error": "Signal rejected by risk management"}
            
            # Apply user-specific adjustments
            adjusted_signal = await self._apply_user_adjustments(processed_signal, user_config)
            
            # Generate signal file path
            signal_file = self.base_signal_path / f"user_{user_id}.json"
            
            # Create enhanced signal with checksum
            enhanced_signal = {
                "signal_id": adjusted_signal.get('signal_id'),
                "symbol": adjusted_signal.get('pair'),
                "action": adjusted_signal.get('action'),
                "entry": adjusted_signal.get('entry'),
                "sl": adjusted_signal.get('sl'),
                "tp": adjusted_signal.get('tp', []),
                "lot": adjusted_signal.get('lot'),
                "order_type": adjusted_signal.get('order_type', 'market'),
                "delay_ms": self._calculate_human_delay(),
                "move_sl_to_be": user_config.get('auto_breakeven', True),
                "partial_close": 0,
                "comment": "AI Signal",
                "timestamp": datetime.now().isoformat(),
                "user_id": user_id,
                "checksum": ""
            }
            
            # Add checksum for validation
            enhanced_signal["checksum"] = self._calculate_checksum(enhanced_signal)
            
            # Write signal file with retry logic
            success = await self._write_signal_file(signal_file, enhanced_signal, user_id)
            
            if success:
                # Log successful dispatch
                await self._log_trade_execution(enhanced_signal, user_id, "dispatched")
                
                return {
                    "success": True,
                    "signal_id": enhanced_signal["signal_id"],
                    "file_path": str(signal_file),
                    "checksum": enhanced_signal["checksum"]
                }
            else:
                return {"success": False, "error": "Failed to write signal file"}
                
        except Exception as e:
            logger.error(f"Auto trade execution failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _apply_risk_management(self, signal_data: Dict[str, Any], user_config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Apply user-specific risk management rules"""
        try:
            # Check minimum confidence
            min_confidence = user_config.get('min_confidence', 0.85)
            if signal_data.get('confidence', 0) < min_confidence:
                logger.warning(f"Signal rejected: confidence {signal_data.get('confidence')} < {min_confidence}")
                return None
            
            # Check allowed pairs
            allowed_pairs = user_config.get('allowed_pairs', [])
            if allowed_pairs and signal_data.get('pair') not in allowed_pairs:
                logger.warning(f"Signal rejected: pair {signal_data.get('pair')} not in allowed list")
                return None
            
            # Check daily trade limit
            max_daily_trades = user_config.get('max_daily_trades', 10)
            daily_count = await self._get_daily_trade_count(user_config['user_id'])
            if daily_count >= max_daily_trades:
                logger.warning(f"Signal rejected: daily limit {max_daily_trades} reached")
                return None
            
            # Calculate position size
            lot_size = await self._calculate_position_size(signal_data, user_config)
            signal_data['lot'] = lot_size
            
            return signal_data
            
        except Exception as e:
            logger.error(f"Risk management failed: {e}")
            return None
    
    async def _apply_user_adjustments(self, signal_data: Dict[str, Any], user_config: Dict[str, Any]) -> Dict[str, Any]:
        """Apply user-specific signal adjustments"""
        try:
            # SL adjustment
            sl_adjustment = user_config.get('sl_adjustment', 0)
            if sl_adjustment and signal_data.get('sl'):
                if signal_data.get('action') == 'buy':
                    signal_data['sl'] -= sl_adjustment * 0.0001  # Pips to price
                else:
                    signal_data['sl'] += sl_adjustment * 0.0001
            
            # TP adjustment
            tp_adjustment = user_config.get('tp_adjustment', 0)
            if tp_adjustment and signal_data.get('tp'):
                adjusted_tp = []
                for tp in signal_data['tp']:
                    if signal_data.get('action') == 'buy':
                        adjusted_tp.append(tp + tp_adjustment * 0.0001)
                    else:
                        adjusted_tp.append(tp - tp_adjustment * 0.0001)
                signal_data['tp'] = adjusted_tp
            
            return signal_data
            
        except Exception as e:
            logger.error(f"User adjustments failed: {e}")
            return signal_data
    
    async def _calculate_position_size(self, signal_data: Dict[str, Any], user_config: Dict[str, Any]) -> float:
        """Calculate position size based on risk management"""
        try:
            max_lot = user_config.get('max_lot', 1.0)
            risk_percent = user_config.get('risk_percent', 2.0)
            
            # Simple position sizing (can be enhanced with account balance)
            base_lot = 0.1
            risk_multiplier = risk_percent / 2.0  # Normalize to base 2%
            
            calculated_lot = base_lot * risk_multiplier
            return min(calculated_lot, max_lot)
            
        except Exception as e:
            logger.error(f"Position size calculation failed: {e}")
            return 0.1
    
    def _calculate_human_delay(self) -> int:
        """Calculate human-like execution delay"""
        import random
        return random.randint(500, 3000)  # 0.5-3.0 seconds
    
    def _calculate_checksum(self, signal_data: Dict[str, Any]) -> str:
        """Calculate checksum for signal validation"""
        # Remove checksum field for calculation
        data_copy = signal_data.copy()
        data_copy.pop('checksum', None)
        
        # Create string representation
        data_string = json.dumps(data_copy, sort_keys=True)
        
        # Calculate MD5 hash
        return hashlib.md5(data_string.encode()).hexdigest()[:8]
    
    async def _write_signal_file(self, file_path: Path, signal_data: Dict[str, Any], user_id: str) -> bool:
        """Write signal file with retry logic"""
        retry_key = f"{user_id}_{signal_data.get('signal_id')}"
        
        for attempt in range(self.max_retries):
            try:
                # Ensure directory exists
                file_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Write signal file
                with open(file_path, 'w') as f:
                    json.dump(signal_data, f, indent=2)
                
                # Verify file was written correctly
                if await self._verify_signal_file(file_path, signal_data):
                    logger.info(f"Signal file written successfully: {file_path}")
                    return True
                else:
                    logger.warning(f"Signal file verification failed on attempt {attempt + 1}")
                    
            except Exception as e:
                logger.error(f"Write attempt {attempt + 1} failed: {e}")
                
            if attempt < self.max_retries - 1:
                await asyncio.sleep(1)  # Wait before retry
        
        logger.error(f"Failed to write signal file after {self.max_retries} attempts")
        return False
    
    async def _verify_signal_file(self, file_path: Path, expected_data: Dict[str, Any]) -> bool:
        """Verify signal file integrity"""
        try:
            with open(file_path, 'r') as f:
                written_data = json.load(f)
            
            # Verify checksum
            written_checksum = written_data.get('checksum')
            expected_checksum = expected_data.get('checksum')
            
            return written_checksum == expected_checksum
            
        except Exception as e:
            logger.error(f"Signal file verification failed: {e}")
            return False
    
    async def _log_shadow_trade(self, signal_data: Dict[str, Any], user_id: str):
        """Log trade in shadow mode"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "mode": "shadow",
            "signal": signal_data,
            "action": "logged_only"
        }
        
        log_file = self.base_signal_path / f"shadow_trades_{user_id}.jsonl"
        
        with open(log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    
    async def _request_confirmation(self, signal_data: Dict[str, Any], user_id: str):
        """Request confirmation for semi-auto mode"""
        # This would integrate with Telegram bot for confirmation
        # For now, we'll log the confirmation request
        
        confirmation_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "mode": "semi-auto",
            "signal": signal_data,
            "status": "pending_confirmation"
        }
        
        pending_file = self.base_signal_path / f"pending_confirmations_{user_id}.jsonl"
        
        with open(pending_file, 'a') as f:
            f.write(json.dumps(confirmation_entry) + '\n')
    
    async def _log_trade_execution(self, signal_data: Dict[str, Any], user_id: str, status: str):
        """Log trade execution details"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "signal_id": signal_data.get('signal_id'),
            "symbol": signal_data.get('symbol'),
            "action": signal_data.get('action'),
            "lot": signal_data.get('lot'),
            "status": status
        }
        
        log_file = self.base_signal_path / "trade_executions.jsonl"
        
        with open(log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    
    async def _get_daily_trade_count(self, user_id: str) -> int:
        """Get number of trades executed today for user"""
        try:
            today = datetime.now().strftime('%Y-%m-%d')
            log_file = self.base_signal_path / "trade_executions.jsonl"
            
            if not log_file.exists():
                return 0
            
            count = 0
            with open(log_file, 'r') as f:
                for line in f:
                    try:
                        entry = json.loads(line)
                        if (entry.get('user_id') == user_id and 
                            entry.get('timestamp', '').startswith(today) and
                            entry.get('status') == 'dispatched'):
                            count += 1
                    except json.JSONDecodeError:
                        continue
            
            return count
            
        except Exception as e:
            logger.error(f"Failed to get daily trade count: {e}")
            return 0
    
    async def _load_user_configs(self):
        """Load user configurations from database or file"""
        # This would typically load from database
        # For now, we'll use a default configuration
        
        self.user_configs = {
            "1": {
                "user_id": "1",
                "execution_mode": "auto",
                "min_confidence": 0.85,
                "max_lot": 1.0,
                "risk_percent": 2.0,
                "max_daily_trades": 10,
                "allowed_pairs": ["EURUSD", "GBPUSD", "XAUUSD"],
                "sl_adjustment": 0,
                "tp_adjustment": 0,
                "auto_breakeven": True
            }
        }
    
    async def update_user_config(self, user_id: str, config: Dict[str, Any]):
        """Update user configuration"""
        self.user_configs[user_id] = config
        logger.info(f"Updated configuration for user {user_id}")
    
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get statistics for specific user"""
        try:
            daily_trades = await self._get_daily_trade_count(user_id)
            
            stats = {
                "user_id": user_id,
                "daily_trades": daily_trades,
                "execution_mode": self.user_configs.get(user_id, {}).get('execution_mode', 'unknown'),
                "signal_file": str(self.base_signal_path / f"user_{user_id}.json"),
                "config": self.user_configs.get(user_id, {})
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get user stats: {e}")
            return {"error": str(e)}

# Performance monitoring and provider scoring
class ProviderScoring:
    def __init__(self):
        self.performance_data: Dict[str, List] = {}
        
    async def update_signal_result(self, signal_id: str, channel_id: str, result: Dict[str, Any]):
        """Update signal result for provider scoring"""
        if channel_id not in self.performance_data:
            self.performance_data[channel_id] = []
        
        self.performance_data[channel_id].append({
            "signal_id": signal_id,
            "timestamp": datetime.now().isoformat(),
            "result": result,
            "pips": result.get('pips', 0),
            "success": result.get('success', False)
        })
    
    async def calculate_provider_score(self, channel_id: str) -> Dict[str, Any]:
        """Calculate comprehensive provider score"""
        data = self.performance_data.get(channel_id, [])
        
        if not data:
            return {"score": 0, "trades": 0}
        
        total_trades = len(data)
        successful_trades = sum(1 for trade in data if trade['result'].get('success'))
        total_pips = sum(trade['result'].get('pips', 0) for trade in data)
        
        win_rate = successful_trades / total_trades if total_trades > 0 else 0
        avg_pips = total_pips / total_trades if total_trades > 0 else 0
        
        # Calculate composite score (0-100)
        score = (win_rate * 60) + (min(avg_pips / 10, 40))  # 60% win rate, 40% avg pips
        
        return {
            "score": round(score, 2),
            "trades": total_trades,
            "win_rate": round(win_rate * 100, 2),
            "avg_pips": round(avg_pips, 2),
            "total_pips": round(total_pips, 2)
        }