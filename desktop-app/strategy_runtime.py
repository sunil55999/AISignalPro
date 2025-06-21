"""
Strategy Runtime Engine - AI Trading Signal Parser
Executes strategy logic based on visual rule structures from StrategyBuilder.
Supports logic chaining and returns modified signal payloads for trade execution.
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    handlers=[
        logging.FileHandler('strategy_runtime.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class RuleType(Enum):
    TRIGGER = "trigger"
    CONDITION = "condition"
    ACTION = "action"

class ComparisonOperator(Enum):
    LESS_THAN = "<"
    GREATER_THAN = ">"
    EQUALS = "="
    NOT_EQUALS = "!="
    LESS_EQUAL = "<="
    GREATER_EQUAL = ">="

@dataclass
class SignalPayload:
    """Modified signal payload for trade execution"""
    pair: str
    action: str  # buy/sell
    entry: float
    sl: Optional[float] = None
    tp: Optional[float] = None
    lot_size: float = 0.1
    confidence: float = 0.0
    modified_by_strategy: bool = False
    strategy_actions: List[str] = None
    execution_allowed: bool = True
    
    def __post_init__(self):
        if self.strategy_actions is None:
            self.strategy_actions = []

@dataclass
class RuleExecution:
    """Track rule execution results"""
    rule_id: str
    rule_type: str
    executed: bool
    result: Any
    timestamp: datetime
    next_rules: List[str] = None
    
    def __post_init__(self):
        if self.next_rules is None:
            self.next_rules = []

class StrategyEngine:
    """
    Executes strategy logic based on visual rule structures.
    Supports logic chaining and conditional execution.
    """
    
    def __init__(self):
        self.execution_history: List[RuleExecution] = []
        self.current_payload: Optional[SignalPayload] = None
        self.strategy_rules: Dict[str, Any] = {}
        self.rule_connections: Dict[str, List[str]] = {}
        
        logger.info("StrategyEngine initialized")
    
    def execute_strategy(self, parsed_signal: Dict, user_strategy: Dict) -> SignalPayload:
        """
        Main execution method that processes signal through strategy rules.
        
        Args:
            parsed_signal: JSON from signal parser
            user_strategy: JSON from StrategyBuilder visual rules
            
        Returns:
            Modified SignalPayload for trade execution
        """
        try:
            # Initialize signal payload
            self.current_payload = self._create_signal_payload(parsed_signal)
            
            # Load strategy configuration
            self._load_strategy_rules(user_strategy)
            
            # Execute strategy chain starting from triggers
            trigger_rules = self._find_trigger_rules()
            
            for trigger_rule in trigger_rules:
                if self._should_execute_trigger(trigger_rule, parsed_signal):
                    logger.info(f"Executing trigger: {trigger_rule['id']}")
                    self._execute_rule_chain(trigger_rule['id'])
            
            # Log final execution state
            logger.info(f"Strategy execution completed. Modified: {self.current_payload.modified_by_strategy}")
            logger.info(f"Execution allowed: {self.current_payload.execution_allowed}")
            
            return self.current_payload
            
        except Exception as e:
            logger.error(f"Strategy execution failed: {e}")
            # Return original payload on error
            return self._create_signal_payload(parsed_signal)
    
    def _create_signal_payload(self, parsed_signal: Dict) -> SignalPayload:
        """Create SignalPayload from parsed signal"""
        return SignalPayload(
            pair=parsed_signal.get('pair', 'UNKNOWN'),
            action=parsed_signal.get('action', 'buy'),
            entry=float(parsed_signal.get('entry', 0)),
            sl=float(parsed_signal.get('sl', 0)) if parsed_signal.get('sl') else None,
            tp=float(parsed_signal.get('tp', 0)) if parsed_signal.get('tp') else None,
            confidence=float(parsed_signal.get('confidence', 0)),
            lot_size=float(parsed_signal.get('lot_size', 0.1))
        )
    
    def _load_strategy_rules(self, user_strategy: Dict):
        """Load and index strategy rules from visual builder"""
        self.strategy_rules = {}
        self.rule_connections = {}
        
        # Index rules by ID
        for rule in user_strategy.get('rules', []):
            rule_id = rule['id']
            self.strategy_rules[rule_id] = rule
        
        # Build connection map
        for connection in user_strategy.get('connections', []):
            from_rule = connection['from']
            to_rule = connection['to']
            
            if from_rule not in self.rule_connections:
                self.rule_connections[from_rule] = []
            self.rule_connections[from_rule].append(to_rule)
        
        logger.info(f"Loaded {len(self.strategy_rules)} rules with {len(user_strategy.get('connections', []))} connections")
    
    def _find_trigger_rules(self) -> List[Dict]:
        """Find all trigger rules that can start execution chains"""
        triggers = []
        for rule_id, rule in self.strategy_rules.items():
            if rule['config']['type'] == RuleType.TRIGGER.value:
                triggers.append(rule)
        return triggers
    
    def _should_execute_trigger(self, trigger_rule: Dict, parsed_signal: Dict) -> bool:
        """Determine if trigger should fire based on event"""
        trigger_event = trigger_rule['config'].get('event', '')
        
        # Map trigger events to signal conditions
        trigger_map = {
            'signal_received': True,  # Always trigger on new signal
            'tp1_hit': parsed_signal.get('tp1_hit', False),
            'tp2_hit': parsed_signal.get('tp2_hit', False),
            'sl_hit': parsed_signal.get('sl_hit', False),
            'trade_opened': parsed_signal.get('trade_opened', False),
            'market_close': parsed_signal.get('market_close', False)
        }
        
        return trigger_map.get(trigger_event, False)
    
    def _execute_rule_chain(self, rule_id: str) -> bool:
        """Execute a rule and its connected downstream rules"""
        if rule_id not in self.strategy_rules:
            logger.warning(f"Rule {rule_id} not found")
            return False
        
        rule = self.strategy_rules[rule_id]
        rule_config = rule['config']
        rule_type = rule_config['type']
        
        logger.info(f"Executing rule {rule_id} of type {rule_type}")
        
        # Execute based on rule type
        execution_result = None
        
        if rule_type == RuleType.TRIGGER.value:
            execution_result = self._execute_trigger(rule_config)
        elif rule_type == RuleType.CONDITION.value:
            execution_result = self._execute_condition(rule_config)
        elif rule_type == RuleType.ACTION.value:
            execution_result = self._execute_action(rule_config)
        
        # Record execution
        self.execution_history.append(RuleExecution(
            rule_id=rule_id,
            rule_type=rule_type,
            executed=True,
            result=execution_result,
            timestamp=datetime.now(),
            next_rules=self.rule_connections.get(rule_id, [])
        ))
        
        # Execute connected rules if condition passed or action completed
        if execution_result and rule_id in self.rule_connections:
            for next_rule_id in self.rule_connections[rule_id]:
                self._execute_rule_chain(next_rule_id)
        
        return execution_result
    
    def _execute_trigger(self, config: Dict) -> bool:
        """Execute trigger rule - always returns True if reached"""
        event = config.get('event', '')
        logger.info(f"Trigger fired: {event}")
        return True
    
    def _execute_condition(self, config: Dict) -> bool:
        """Execute IF condition rule"""
        field = config.get('field', '')
        operator = config.get('operator', '')
        value = config.get('value', '')
        
        # Get current value from signal payload
        current_value = self._get_payload_value(field)
        comparison_value = self._parse_value(value, current_value)
        
        # Perform comparison
        result = self._compare_values(current_value, operator, comparison_value)
        
        logger.info(f"Condition: {field} {operator} {value} = {current_value} {operator} {comparison_value} = {result}")
        
        return result
    
    def _execute_action(self, config: Dict) -> bool:
        """Execute THEN action rule"""
        action = config.get('action', '')
        parameters = config.get('parameters', {})
        
        logger.info(f"Executing action: {action} with params: {parameters}")
        
        # Execute specific actions
        if action == 'skip_trade':
            self.current_payload.execution_allowed = False
            self.current_payload.strategy_actions.append('trade_skipped')
            
        elif action == 'move_sl':
            target = parameters.get('target', 'entry')
            self._move_stop_loss(target)
            
        elif action == 'close_trade':
            self.current_payload.strategy_actions.append('close_trade')
            
        elif action == 'reduce_lot':
            multiplier = float(parameters.get('multiplier', 0.5))
            self.current_payload.lot_size *= multiplier
            self.current_payload.strategy_actions.append(f'lot_reduced_{multiplier}')
            
        elif action == 'increase_lot':
            multiplier = float(parameters.get('multiplier', 2.0))
            self.current_payload.lot_size *= multiplier
            self.current_payload.strategy_actions.append(f'lot_increased_{multiplier}')
            
        elif action == 'set_tp':
            tp_value = float(parameters.get('value', 0))
            if tp_value > 0:
                self.current_payload.tp = tp_value
                self.current_payload.strategy_actions.append('tp_modified')
                
        elif action == 'send_alert':
            self.current_payload.strategy_actions.append('alert_sent')
        
        # Mark payload as modified
        self.current_payload.modified_by_strategy = True
        
        return True
    
    def _get_payload_value(self, field: str) -> Union[float, str, bool]:
        """Get value from current signal payload"""
        field_map = {
            'confidence': self.current_payload.confidence,
            'pair': self.current_payload.pair,
            'entry': self.current_payload.entry,
            'sl': self.current_payload.sl or 0,
            'tp': self.current_payload.tp or 0,
            'risk': self.current_payload.lot_size * 10000,  # Convert lot to risk units
            'lot_size': self.current_payload.lot_size
        }
        
        return field_map.get(field, 0)
    
    def _parse_value(self, value_str: str, current_value: Union[float, str, bool]) -> Union[float, str, bool]:
        """Parse comparison value with type matching"""
        if isinstance(current_value, bool):
            return value_str.lower() in ['true', '1', 'yes']
        elif isinstance(current_value, (int, float)):
            try:
                return float(value_str)
            except ValueError:
                return 0.0
        else:
            return str(value_str)
    
    def _compare_values(self, left: Any, operator: str, right: Any) -> bool:
        """Perform comparison operation"""
        try:
            if operator == ComparisonOperator.LESS_THAN.value:
                return float(left) < float(right)
            elif operator == ComparisonOperator.GREATER_THAN.value:
                return float(left) > float(right)
            elif operator == ComparisonOperator.EQUALS.value:
                return left == right
            elif operator == ComparisonOperator.NOT_EQUALS.value:
                return left != right
            elif operator == ComparisonOperator.LESS_EQUAL.value:
                return float(left) <= float(right)
            elif operator == ComparisonOperator.GREATER_EQUAL.value:
                return float(left) >= float(right)
            else:
                logger.warning(f"Unknown operator: {operator}")
                return False
        except (ValueError, TypeError) as e:
            logger.error(f"Comparison error: {e}")
            return False
    
    def _move_stop_loss(self, target: str):
        """Move stop loss to specified target"""
        if target == 'entry':
            self.current_payload.sl = self.current_payload.entry
            self.current_payload.strategy_actions.append('sl_moved_to_entry')
        elif target == 'breakeven':
            self.current_payload.sl = self.current_payload.entry
            self.current_payload.strategy_actions.append('sl_moved_to_breakeven')
        elif target == 'tp1' and self.current_payload.tp:
            # Move SL to halfway between entry and TP
            if self.current_payload.action == 'buy':
                self.current_payload.sl = self.current_payload.entry + (self.current_payload.tp - self.current_payload.entry) * 0.5
            else:
                self.current_payload.sl = self.current_payload.entry - (self.current_payload.entry - self.current_payload.tp) * 0.5
            self.current_payload.strategy_actions.append('sl_moved_to_tp1_level')
    
    def get_execution_summary(self) -> Dict:
        """Get summary of strategy execution"""
        return {
            'total_rules_executed': len(self.execution_history),
            'execution_timeline': [asdict(exec) for exec in self.execution_history],
            'final_payload': asdict(self.current_payload) if self.current_payload else None,
            'strategy_modified_signal': self.current_payload.modified_by_strategy if self.current_payload else False
        }
    
    def clear_execution_history(self):
        """Clear execution history for new strategy run"""
        self.execution_history.clear()
        self.current_payload = None
        self.strategy_rules.clear()
        self.rule_connections.clear()


# Example usage and testing
def test_strategy_engine():
    """Test the strategy engine with sample data"""
    
    # Sample parsed signal
    sample_signal = {
        'pair': 'EURUSD',
        'action': 'buy',
        'entry': 1.1000,
        'sl': 1.0950,
        'tp': 1.1100,
        'confidence': 0.65,  # Low confidence to test skip rule
        'lot_size': 0.1
    }
    
    # Sample strategy from StrategyBuilder
    sample_strategy = {
        'name': 'Low Confidence Filter',
        'rules': [
            {
                'id': 'trigger-1',
                'type': 'trigger',
                'config': {
                    'type': 'trigger',
                    'event': 'signal_received'
                }
            },
            {
                'id': 'condition-1',
                'type': 'condition',
                'config': {
                    'type': 'condition',
                    'field': 'confidence',
                    'operator': '<',
                    'value': '0.70'
                }
            },
            {
                'id': 'action-1',
                'type': 'action',
                'config': {
                    'type': 'action',
                    'action': 'skip_trade',
                    'parameters': {}
                }
            }
        ],
        'connections': [
            {'from': 'trigger-1', 'to': 'condition-1'},
            {'from': 'condition-1', 'to': 'action-1'}
        ]
    }
    
    # Execute strategy
    engine = StrategyEngine()
    result = engine.execute_strategy(sample_signal, sample_strategy)
    
    print("\n=== Strategy Execution Test ===")
    print(f"Original confidence: {sample_signal['confidence']}")
    print(f"Execution allowed: {result.execution_allowed}")
    print(f"Strategy actions: {result.strategy_actions}")
    print(f"Modified by strategy: {result.modified_by_strategy}")
    
    # Print execution summary
    summary = engine.get_execution_summary()
    print(f"\nRules executed: {summary['total_rules_executed']}")
    for exec_record in summary['execution_timeline']:
        print(f"  {exec_record['rule_id']} ({exec_record['rule_type']}) -> {exec_record['result']}")


if __name__ == "__main__":
    test_strategy_engine()