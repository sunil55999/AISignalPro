"""
Strategy Integration Example - AI Trading Signal Parser
Demonstrates integration between signal parsing, visual strategy execution, and trade dispatch.
"""

import json
import asyncio
from datetime import datetime
from strategy_runtime import StrategyEngine, SignalPayload

class IntegratedTradingSystem:
    """
    Example integration showing complete signal-to-trade flow
    with visual strategy execution
    """
    
    def __init__(self):
        self.strategy_engine = StrategyEngine()
        self.active_strategies = []
        
    def load_visual_strategy(self, strategy_file_path: str):
        """Load visual strategy from StrategyBuilder export"""
        try:
            with open(strategy_file_path, 'r') as f:
                strategy = json.load(f)
            self.active_strategies.append(strategy)
            print(f"Loaded strategy: {strategy['name']}")
            return True
        except Exception as e:
            print(f"Failed to load strategy: {e}")
            return False
    
    async def process_telegram_signal(self, raw_signal_text: str, channel_name: str):
        """
        Complete processing pipeline:
        1. Parse raw signal text
        2. Apply visual strategy rules
        3. Execute modified trade
        """
        
        print(f"\n=== Processing Signal from {channel_name} ===")
        print(f"Raw text: {raw_signal_text}")
        
        # Step 1: Parse signal (mock parser for example)
        parsed_signal = self.mock_signal_parser(raw_signal_text)
        print(f"Parsed signal: {parsed_signal}")
        
        # Step 2: Apply each active strategy
        final_payload = None
        for strategy in self.active_strategies:
            print(f"\nApplying strategy: {strategy['name']}")
            
            # Execute strategy engine
            result_payload = self.strategy_engine.execute_strategy(parsed_signal, strategy)
            
            # Get execution summary
            summary = self.strategy_engine.get_execution_summary()
            print(f"Rules executed: {summary['total_rules_executed']}")
            print(f"Strategy actions: {result_payload.strategy_actions}")
            print(f"Execution allowed: {result_payload.execution_allowed}")
            
            final_payload = result_payload
            
            # Clear for next strategy
            self.strategy_engine.clear_execution_history()
        
        # Step 3: Execute trade if allowed
        if final_payload and final_payload.execution_allowed:
            await self.execute_trade(final_payload)
        else:
            print("Trade execution blocked by strategy")
            
        return final_payload
    
    def mock_signal_parser(self, raw_text: str) -> dict:
        """Mock signal parser - replace with actual parser"""
        # Simple keyword-based parsing for demo
        signal = {
            'pair': 'EURUSD',
            'action': 'buy' if 'buy' in raw_text.lower() else 'sell',
            'entry': 1.1000,
            'sl': 1.0950,
            'tp': 1.1100,
            'confidence': 0.75,
            'lot_size': 0.1,
            'timestamp': datetime.now().isoformat()
        }
        
        # Extract confidence if mentioned
        if 'low confidence' in raw_text.lower():
            signal['confidence'] = 0.45
        elif 'high confidence' in raw_text.lower():
            signal['confidence'] = 0.95
            
        return signal
    
    async def execute_trade(self, payload: SignalPayload):
        """Execute the final trade with MT5 or broker API"""
        print(f"\n=== Executing Trade ===")
        print(f"Pair: {payload.pair}")
        print(f"Action: {payload.action}")
        print(f"Entry: {payload.entry}")
        print(f"SL: {payload.sl}")
        print(f"TP: {payload.tp}")
        print(f"Lot Size: {payload.lot_size}")
        print(f"Strategy Modified: {payload.modified_by_strategy}")
        
        # Mock MT5 execution
        trade_result = {
            'success': True,
            'order_id': f"ORDER_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'execution_price': payload.entry,
            'timestamp': datetime.now().isoformat()
        }
        
        print(f"Trade executed: {trade_result['order_id']}")
        return trade_result


def create_sample_strategies():
    """Create sample strategy files for testing"""
    
    # Strategy 1: Low Confidence Filter
    low_confidence_strategy = {
        "name": "Low Confidence Filter",
        "created": "2025-06-21T12:46:00.000Z",
        "rules": [
            {
                "id": "trigger-1",
                "type": "trigger",
                "position": {"x": 100, "y": 100},
                "config": {
                    "type": "trigger",
                    "event": "signal_received",
                    "label": "Signal Received"
                }
            },
            {
                "id": "condition-1", 
                "type": "condition",
                "position": {"x": 300, "y": 100},
                "config": {
                    "type": "condition",
                    "field": "confidence",
                    "operator": "<",
                    "value": "0.70",
                    "label": "Confidence < 70%"
                }
            },
            {
                "id": "action-1",
                "type": "action", 
                "position": {"x": 500, "y": 100},
                "config": {
                    "type": "action",
                    "action": "skip_trade",
                    "parameters": {},
                    "label": "Skip Trade"
                }
            }
        ],
        "connections": [
            {"from": "trigger-1", "to": "condition-1", "id": "conn-1"},
            {"from": "condition-1", "to": "action-1", "id": "conn-2"}
        ]
    }
    
    # Strategy 2: TP1 Hit -> Move SL
    tp_management_strategy = {
        "name": "TP1 Management",
        "created": "2025-06-21T12:46:00.000Z", 
        "rules": [
            {
                "id": "trigger-2",
                "type": "trigger",
                "position": {"x": 100, "y": 200},
                "config": {
                    "type": "trigger",
                    "event": "tp1_hit",
                    "label": "TP1 Hit"
                }
            },
            {
                "id": "action-2",
                "type": "action",
                "position": {"x": 300, "y": 200}, 
                "config": {
                    "type": "action",
                    "action": "move_sl",
                    "parameters": {"target": "entry"},
                    "label": "Move SL to Entry"
                }
            }
        ],
        "connections": [
            {"from": "trigger-2", "to": "action-2", "id": "conn-3"}
        ]
    }
    
    # Save strategy files
    with open('strategy_low_confidence.json', 'w') as f:
        json.dump(low_confidence_strategy, f, indent=2)
        
    with open('strategy_tp_management.json', 'w') as f:
        json.dump(tp_management_strategy, f, indent=2)
    
    print("Sample strategy files created:")
    print("- strategy_low_confidence.json")
    print("- strategy_tp_management.json")


async def main():
    """Run integration example"""
    
    print("=== Strategy Integration Example ===\n")
    
    # Create sample strategies
    create_sample_strategies()
    
    # Initialize trading system
    system = IntegratedTradingSystem()
    
    # Load strategies
    system.load_visual_strategy('strategy_low_confidence.json')
    
    # Test signals
    test_signals = [
        ("EURUSD BUY at 1.1000, SL 1.0950, TP 1.1100 - low confidence", "Premium Channel"),
        ("GBPUSD SELL at 1.2500, high confidence setup", "VIP Signals"),
        ("XAUUSD BUY entry 1950, stop 1940, target 1970", "Gold Signals")
    ]
    
    # Process each signal
    for signal_text, channel in test_signals:
        await system.process_telegram_signal(signal_text, channel)
        print("\n" + "="*60)
    
    # Cleanup
    import os
    os.remove('strategy_low_confidence.json')
    os.remove('strategy_tp_management.json')
    print("\nCleanup completed")


if __name__ == "__main__":
    asyncio.run(main())