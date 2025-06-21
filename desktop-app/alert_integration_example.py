"""
Alert Integration Example
Demonstrates how to integrate the Telegram bot alert system with signal processing
"""

import asyncio
import json
from datetime import datetime
from copilot_bot import TradingCopilotBot, SignalSummary
from retry_engine import SmartRetryExecutor, TradeRequest, create_trade_request_from_signal

class SignalProcessorWithAlerts:
    """
    Example signal processor that integrates with the Telegram alert system
    """
    
    def __init__(self):
        # Initialize components
        self.bot = TradingCopilotBot("env.json")
        self.retry_executor = SmartRetryExecutor("config.json")
        
        # Start bot in background (non-blocking)
        self.bot_task = None
        
    async def start_bot_background(self):
        """Start the Telegram bot in background"""
        try:
            # This would typically run in a separate process or thread
            self.bot_task = asyncio.create_task(self._run_bot_async())
        except Exception as e:
            print(f"Failed to start bot: {e}")
    
    async def _run_bot_async(self):
        """Async wrapper for bot.run_bot()"""
        # In real implementation, you'd need to properly handle the sync/async bridge
        # This is a simplified example
        pass
    
    async def process_signal(self, raw_text: str, channel_name: str, channel_id: int):
        """
        Process a signal with full alert integration
        """
        print(f"Processing signal from {channel_name}: {raw_text[:50]}...")
        
        try:
            # Step 1: Parse the signal
            parsed_data = await self._parse_signal(raw_text)
            
            if not parsed_data:
                # Alert: Parse error
                await self.bot.alert_parse_error(
                    signal_text=raw_text,
                    channel_name=channel_name,
                    error_msg="Parser returned empty result"
                )
                return None
                
        except Exception as e:
            # Alert: Parse exception
            await self.bot.alert_parse_error(
                signal_text=raw_text,
                channel_name=channel_name,
                error_msg=f"Parser exception: {str(e)}"
            )
            return None
        
        try:
            # Step 2: Validate strategy
            validation_errors = self._validate_strategy(parsed_data)
            
            if validation_errors:
                # Alert: Strategy validation error
                await self.bot.alert_strategy_error(
                    trade_data=parsed_data,
                    channel_name=channel_name,
                    validation_errors=validation_errors
                )
                return None
                
        except Exception as e:
            # Alert: Validation exception
            await self.bot.alert_strategy_error(
                trade_data=parsed_data,
                channel_name=channel_name,
                validation_errors=[f"Validation exception: {str(e)}"]
            )
            return None
        
        try:
            # Step 3: Create trade request
            user_settings = {
                "lot_size": 0.1,
                "magic_number": 12345,
                "deviation": 10,
                "user_id": 1
            }
            
            # Add raw_text and channel info
            parsed_data["raw_text"] = raw_text
            parsed_data["channel_id"] = channel_id
            
            trade_request = create_trade_request_from_signal(parsed_data, user_settings)
            
            # Step 4: Execute trade through retry engine
            success = self.retry_executor.add_trade(trade_request)
            
            if not success:
                # Alert: Trade execution failure
                signal_summary = SignalSummary(
                    channel_name=channel_name,
                    raw_text=raw_text,
                    parsed_data=parsed_data,
                    error_message="Failed to add trade to retry queue",
                    timestamp=datetime.now(),
                    confidence=parsed_data.get("confidence")
                )
                
                await self.bot.alert_trade_failure(
                    trade_data=parsed_data,
                    signal_summary=signal_summary,
                    error_msg="Failed to add trade to retry queue"
                )
                return None
            
            print(f"✅ Successfully processed signal from {channel_name}")
            return parsed_data
            
        except Exception as e:
            # Alert: General execution error
            signal_summary = SignalSummary(
                channel_name=channel_name,
                raw_text=raw_text,
                parsed_data=parsed_data,
                error_message=f"Execution error: {str(e)}",
                timestamp=datetime.now(),
                confidence=parsed_data.get("confidence")
            )
            
            await self.bot.alert_trade_failure(
                trade_data=parsed_data,
                signal_summary=signal_summary,
                error_msg=str(e)
            )
            return None
    
    async def _parse_signal(self, raw_text: str) -> dict:
        """
        Mock signal parser - replace with your actual parser
        """
        # Simulate parsing
        await asyncio.sleep(0.1)
        
        # Example parsing logic
        text_upper = raw_text.upper()
        
        if "BUY" in text_upper or "LONG" in text_upper:
            action = "buy"
        elif "SELL" in text_upper or "SHORT" in text_upper:
            action = "sell"
        else:
            raise Exception("Could not determine trade action")
        
        # Extract pair
        common_pairs = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "XAUUSD", "GOLD"]
        pair = None
        for p in common_pairs:
            if p in text_upper or p.replace("USD", "") in text_upper:
                pair = p
                break
        
        if not pair:
            raise Exception("Could not identify trading pair")
        
        # Extract levels (simplified)
        import re
        
        # Look for entry price
        entry_match = re.search(r"@?\s*(\d+\.?\d*)", raw_text)
        entry = float(entry_match.group(1)) if entry_match else None
        
        # Look for SL
        sl_match = re.search(r"SL:?\s*(\d+\.?\d*)", raw_text, re.IGNORECASE)
        sl = float(sl_match.group(1)) if sl_match else None
        
        # Look for TP
        tp_match = re.search(r"TP:?\s*(\d+\.?\d*)", raw_text, re.IGNORECASE)
        tp = [float(tp_match.group(1))] if tp_match else None
        
        return {
            "pair": pair,
            "action": action,
            "entry": entry,
            "sl": sl,
            "tp": tp,
            "confidence": 0.85,
            "lot_size": 0.1
        }
    
    def _validate_strategy(self, parsed_data: dict) -> list:
        """
        Validate trading strategy and return list of errors
        """
        errors = []
        
        # Check required fields
        if not parsed_data.get("pair"):
            errors.append("missing_pair")
        
        if not parsed_data.get("action"):
            errors.append("missing_action")
        
        # Check stop loss
        if not parsed_data.get("sl"):
            errors.append("missing_sl")
        
        # Check lot size
        lot_size = parsed_data.get("lot_size", 0)
        if lot_size <= 0 or lot_size > 10:
            errors.append("invalid_lot_size")
        
        # Check action validity
        if parsed_data.get("action") not in ["buy", "sell"]:
            errors.append("invalid_action")
        
        # Check price levels
        entry = parsed_data.get("entry")
        sl = parsed_data.get("sl")
        
        if entry and sl:
            action = parsed_data.get("action")
            if action == "buy" and sl >= entry:
                errors.append("invalid_sl_for_buy")
            elif action == "sell" and sl <= entry:
                errors.append("invalid_sl_for_sell")
        
        return errors
    
    def stop(self):
        """Stop all components"""
        self.retry_executor.shutdown()
        if self.bot_task:
            self.bot_task.cancel()


# Example usage
async def main():
    """
    Example of how to use the signal processor with alerts
    """
    processor = SignalProcessorWithAlerts()
    
    # Start the bot (in real implementation, this would be in a separate process)
    await processor.start_bot_background()
    
    # Example signals to process
    test_signals = [
        {
            "text": "EURUSD BUY @1.0850, SL 1.0800, TP 1.0900",
            "channel": "Premium Signals",
            "channel_id": 1
        },
        {
            "text": "GOLD SELL NOW, TP 1950",  # Missing SL - should trigger alert
            "channel": "Gold Signals",
            "channel_id": 2
        },
        {
            "text": "INVALID SIGNAL TEXT",  # Parse error - should trigger alert
            "channel": "Test Channel",
            "channel_id": 3
        },
        {
            "text": "GBPUSD LONG @1.2500, SL 1.2600, TP 1.2400",  # Invalid SL - should trigger alert
            "channel": "Forex Pro",
            "channel_id": 4
        }
    ]
    
    # Process each signal
    for signal in test_signals:
        print(f"\n--- Processing: {signal['text'][:40]}... ---")
        
        result = await processor.process_signal(
            raw_text=signal["text"],
            channel_name=signal["channel"],
            channel_id=signal["channel_id"]
        )
        
        if result:
            print(f"✅ Success: {result}")
        else:
            print("❌ Failed - Alert sent")
        
        # Wait between signals
        await asyncio.sleep(2)
    
    # Check retry queue status
    status = processor.retry_executor.get_queue_status()
    stats = processor.retry_executor.get_retry_statistics()
    
    print(f"\n--- Final Status ---")
    print(f"Queue Status: {json.dumps(status, indent=2)}")
    print(f"Retry Stats: {json.dumps(stats, indent=2)}")
    
    # Cleanup
    processor.stop()


# Example API integration hook
class APISignalHook:
    """
    Example of how to hook the alert system into your existing API
    """
    
    def __init__(self):
        self.bot = TradingCopilotBot("env.json")
    
    async def handle_parse_signal_request(self, request_data: dict):
        """
        Hook this into your /api/parse-signal endpoint
        """
        raw_text = request_data.get("rawText", "")
        channel_id = request_data.get("channelId")
        source = request_data.get("source", "api")
        
        try:
            # Your existing parsing logic here
            result = self._your_existing_parser(raw_text)
            
            # If parsing succeeds, return result
            return {"success": True, "data": result}
            
        except Exception as e:
            # On parse error, send alert
            channel_name = f"Channel_{channel_id}" if channel_id else "Unknown"
            
            await self.bot.alert_parse_error(
                signal_text=raw_text,
                channel_name=channel_name,
                error_msg=str(e)
            )
            
            # Return error response
            return {"success": False, "error": str(e)}
    
    def _your_existing_parser(self, raw_text: str):
        """Replace with your actual parser"""
        # Your existing parser logic
        pass


if __name__ == "__main__":
    # Run the example
    asyncio.run(main())