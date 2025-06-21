#!/usr/bin/env python3
"""
Configuration Loader for Desktop Applications
Loads configuration from env.json and environment variables
"""

import json
import os
import sys
from typing import Dict, Any, Optional
from pathlib import Path

class ConfigLoader:
    """Centralized configuration loader for all Python services"""
    
    def __init__(self, config_path: str = None):
        """Initialize configuration loader"""
        self.config_path = config_path or self._find_config_file()
        self.config = None
        self._load_config()
    
    def _find_config_file(self) -> str:
        """Find env.json file in project root"""
        current_dir = Path(__file__).parent
        
        # Search up the directory tree for env.json
        for parent in [current_dir] + list(current_dir.parents):
            config_file = parent / "env.json"
            if config_file.exists():
                return str(config_file)
        
        # Fallback to project root
        project_root = current_dir.parent
        config_file = project_root / "env.json"
        if config_file.exists():
            return str(config_file)
        
        raise FileNotFoundError(f"env.json configuration file not found. Searched: {current_dir}, {project_root}")
    
    def _load_config(self):
        """Load configuration from file and apply environment overrides"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
            
            # Apply environment variable overrides
            self._apply_env_overrides()
            
            print(f"✓ Configuration loaded from: {self.config_path}")
            
        except FileNotFoundError:
            print(f"❌ Configuration file not found: {self.config_path}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in configuration file: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"❌ Failed to load configuration: {e}")
            sys.exit(1)
    
    def _apply_env_overrides(self):
        """Apply environment variable overrides to configuration"""
        # System overrides
        if os.getenv('NODE_ENV'):
            self.config['system']['environment'] = os.getenv('NODE_ENV')
        
        if os.getenv('API_BASE_URL'):
            self.config['system']['api_base_url'] = os.getenv('API_BASE_URL')
        
        # Admin overrides
        if os.getenv('ADMIN_USERNAME'):
            self.config['admin']['username'] = os.getenv('ADMIN_USERNAME')
        
        if os.getenv('ADMIN_PASSWORD'):
            self.config['admin']['password'] = os.getenv('ADMIN_PASSWORD')
        
        # MT5 overrides
        if os.getenv('MT5_TERMINAL_PATH'):
            self.config['mt5']['terminal_path'] = os.getenv('MT5_TERMINAL_PATH')
        
        if os.getenv('MT5_SIGNALS_FILE'):
            self.config['mt5']['signals_file'] = os.getenv('MT5_SIGNALS_FILE')
        
        # Telegram overrides
        if os.getenv('TELEGRAM_BOT_TOKEN'):
            self.config['telegram']['bot_token'] = os.getenv('TELEGRAM_BOT_TOKEN')
        
        if os.getenv('TELEGRAM_CHAT_ID'):
            self.config['telegram']['chat_id'] = os.getenv('TELEGRAM_CHAT_ID')
        
        # Cloud API overrides
        if os.getenv('CLOUD_API_URL'):
            self.config['sync']['cloud_api_url'] = os.getenv('CLOUD_API_URL')
    
    def get_config(self, section: str = None) -> Dict[str, Any]:
        """Get configuration section or full config"""
        if section is None:
            return self.config
        
        if section not in self.config:
            raise KeyError(f"Configuration section '{section}' not found")
        
        return self.config[section]
    
    def get_system_config(self) -> Dict[str, Any]:
        """Get system configuration"""
        return self.get_config('system')
    
    def get_mt5_config(self) -> Dict[str, Any]:
        """Get MT5 configuration with risk management"""
        mt5_config = self.get_config('mt5').copy()
        mt5_config.update({
            'risk_management': self.get_config('risk_management'),
            'alerts': self.get_config('alerts')
        })
        return mt5_config
    
    def get_telegram_config(self) -> Dict[str, Any]:
        """Get Telegram configuration"""
        telegram_config = self.get_config('telegram').copy()
        telegram_config.update({
            'admin': self.get_config('admin'),
            'alerts': self.get_config('alerts')
        })
        return telegram_config
    
    def get_parser_config(self) -> Dict[str, Any]:
        """Get parser configuration"""
        parser_config = self.get_config('parser').copy()
        parser_config.update({
            'risk_management': self.get_config('risk_management'),
            'system': self.get_config('system')
        })
        return parser_config
    
    def get_sync_config(self) -> Dict[str, Any]:
        """Get sync configuration"""
        sync_config = self.get_config('sync').copy()
        sync_config.update({
            'system': self.get_config('system'),
            'alerts': self.get_config('alerts')
        })
        return sync_config
    
    def get_database_url(self) -> str:
        """Get database URL from environment (fallback to config)"""
        return os.getenv('DATABASE_URL', self.config.get('database', {}).get('url', ''))
    
    def validate_config(self) -> bool:
        """Validate essential configuration values"""
        required_sections = ['system', 'mt5', 'telegram', 'parser']
        
        for section in required_sections:
            if section not in self.config:
                print(f"❌ Missing required configuration section: {section}")
                return False
        
        # Validate MT5 paths
        mt5_config = self.get_config('mt5')
        if not mt5_config.get('terminal_path') or not mt5_config.get('signals_file'):
            print("❌ MT5 configuration incomplete: missing terminal_path or signals_file")
            return False
        
        # Validate Telegram token if alerts are enabled
        alerts_config = self.get_config('alerts')
        if alerts_config.get('telegram_alerts', False):
            telegram_config = self.get_config('telegram')
            if not telegram_config.get('bot_token') or telegram_config.get('bot_token') == 'YOUR_BOT_TOKEN_HERE':
                print("⚠️  Telegram alerts enabled but bot_token not configured")
        
        print("✓ Configuration validation passed")
        return True
    
    def export_for_mt5_ea(self) -> Dict[str, Any]:
        """Export configuration for MT5 Expert Advisor"""
        mt5_config = self.get_mt5_config()
        
        return {
            'SignalFile': mt5_config['signals_file'],
            'RiskPercent': mt5_config['risk_percent'],
            'MaxLotSize': mt5_config['max_lot_size'],
            'EnableStealthMode': mt5_config['enable_stealth_mode'],
            'MinDelayMS': mt5_config['min_delay_ms'],
            'MaxDelayMS': mt5_config['max_delay_ms'],
            'MagicNumber': mt5_config['magic_number'],
            'EnableTrailingStop': mt5_config['risk_management']['enable_trailing_stop'],
            'BreakevenPips': mt5_config['risk_management']['breakeven_pips']
        }
    
    def save_config(self, config: Dict[str, Any] = None):
        """Save configuration back to file"""
        if config:
            self.config = config
        
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
            print(f"✓ Configuration saved to: {self.config_path}")
        except Exception as e:
            print(f"❌ Failed to save configuration: {e}")
            raise
    
    def update_section(self, section: str, updates: Dict[str, Any]):
        """Update specific configuration section"""
        if section not in self.config:
            raise KeyError(f"Configuration section '{section}' not found")
        
        self.config[section].update(updates)
        self.save_config()
        print(f"✓ Configuration section '{section}' updated")

# Global configuration instance
_config_loader = None

def get_config_loader() -> ConfigLoader:
    """Get global configuration loader instance"""
    global _config_loader
    if _config_loader is None:
        _config_loader = ConfigLoader()
    return _config_loader

def get_config(section: str = None) -> Dict[str, Any]:
    """Convenience function to get configuration"""
    return get_config_loader().get_config(section)

def get_mt5_config() -> Dict[str, Any]:
    """Convenience function to get MT5 configuration"""
    return get_config_loader().get_mt5_config()

def get_telegram_config() -> Dict[str, Any]:
    """Convenience function to get Telegram configuration"""
    return get_config_loader().get_telegram_config()

def get_parser_config() -> Dict[str, Any]:
    """Convenience function to get parser configuration"""
    return get_config_loader().get_parser_config()

def get_sync_config() -> Dict[str, Any]:
    """Convenience function to get sync configuration"""
    return get_config_loader().get_sync_config()

if __name__ == "__main__":
    # Test configuration loading
    try:
        loader = ConfigLoader()
        print("Configuration sections:")
        for section in loader.get_config().keys():
            print(f"  - {section}")
        
        print("\nValidation result:", loader.validate_config())
        
        print("\nMT5 EA Configuration:")
        mt5_ea_config = loader.export_for_mt5_ea()
        for key, value in mt5_ea_config.items():
            print(f"  {key}: {value}")
            
    except Exception as e:
        print(f"Configuration test failed: {e}")
        sys.exit(1)