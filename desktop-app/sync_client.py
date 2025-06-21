#!/usr/bin/env python3
"""
Secure Sync Client for Desktop Applications
Handles authenticated communication with admin panel using HMAC and JWT tokens
"""

import requests
import hashlib
import hmac
import time
import json
import uuid
from typing import Dict, Any, Optional, List
from config_loader import get_config, get_sync_config, get_system_config

class SecureSyncClient:
    """Secure client for authenticated sync operations with admin panel"""
    
    def __init__(self, user_id: int, api_key: str, api_key_id: int):
        """Initialize secure sync client with user credentials"""
        self.user_id = user_id
        self.api_key = api_key
        self.api_key_id = api_key_id
        
        # Load configuration
        self.sync_config = get_sync_config()
        self.system_config = get_system_config()
        
        self.base_url = self.system_config['api_base_url']
        self.sync_base_url = f"{self.base_url}/api/sync"
        
        # Session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': f"TradingSystem-Desktop/{self.system_config['version']}"
        })
        
        print(f"✓ Secure sync client initialized for user {user_id}")
    
    def _generate_nonce(self) -> str:
        """Generate unique nonce for request"""
        return str(uuid.uuid4()).replace('-', '')
    
    def _create_signature(self, method: str, endpoint: str, timestamp: int, nonce: str) -> str:
        """Create HMAC signature for request authentication"""
        data = f"{method}|{endpoint}|{timestamp}|{nonce}|{self.user_id}"
        return hmac.new(
            self.api_key.encode('utf-8'),
            data.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    def _create_auth_headers(self, method: str, endpoint: str) -> Dict[str, str]:
        """Create authentication headers for sync request"""
        timestamp = int(time.time() * 1000)  # milliseconds
        nonce = self._generate_nonce()
        signature = self._create_signature(method, endpoint, timestamp, nonce)
        
        return {
            'Authorization': f'ApiKey {self.api_key}',
            'X-Timestamp': str(timestamp),
            'X-Nonce': nonce,
            'X-User-ID': str(self.user_id),
            'X-API-Key-ID': str(self.api_key_id),
            'X-Signature': signature,
            'Content-Type': 'application/json'
        }
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                     use_sync_auth: bool = True) -> Dict[str, Any]:
        """Make authenticated request to admin panel"""
        try:
            # Determine URL and headers
            if use_sync_auth:
                url = f"{self.sync_base_url}{endpoint}"
                headers = self._create_auth_headers(method, endpoint)
            else:
                url = f"{self.base_url}{endpoint}"
                headers = {'Content-Type': 'application/json'}
            
            # Make request
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers, timeout=30)
            elif method.upper() == 'POST':
                response = self.session.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == 'PUT':
                response = self.session.put(url, headers=headers, json=data, timeout=30)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            # Handle response
            if response.status_code == 401:
                raise Exception("Authentication failed - check API key and permissions")
            elif response.status_code == 403:
                raise Exception("Access forbidden - insufficient permissions")
            elif response.status_code == 429:
                raise Exception("Rate limit exceeded - please wait before retrying")
            elif response.status_code >= 400:
                error_msg = response.text
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', error_msg)
                except:
                    pass
                raise Exception(f"Request failed ({response.status_code}): {error_msg}")
            
            return response.json()
            
        except requests.exceptions.Timeout:
            raise Exception("Request timeout - admin panel may be unavailable")
        except requests.exceptions.ConnectionError:
            raise Exception("Connection error - cannot reach admin panel")
        except Exception as e:
            raise Exception(f"Sync request failed: {str(e)}")
    
    # Terminal Management Operations
    def register_terminal(self, terminal_info: Dict[str, Any]) -> Dict[str, Any]:
        """Register desktop terminal with admin panel"""
        return self._make_request('POST', '/terminal/register', terminal_info)
    
    def update_terminal_status(self, terminal_id: str, status: Dict[str, Any]) -> Dict[str, Any]:
        """Update terminal status and health info"""
        return self._make_request('PUT', f'/terminal/{terminal_id}/status', status)
    
    def get_terminal_config(self, terminal_id: str) -> Dict[str, Any]:
        """Get terminal-specific configuration"""
        return self._make_request('GET', f'/terminal/{terminal_id}/config')
    
    def report_terminal_metrics(self, terminal_id: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Report terminal performance metrics"""
        return self._make_request('POST', f'/terminal/{terminal_id}/metrics', metrics)
    
    # Parser Operations
    def check_parser_updates(self) -> Dict[str, Any]:
        """Check for available parser updates"""
        return self._make_request('GET', '/parser/updates')
    
    def download_parser(self, deployment_id: str) -> Dict[str, Any]:
        """Download parser file"""
        return self._make_request('GET', f'/parser/download/{deployment_id}')
    
    def acknowledge_parser_deployment(self, deployment_id: str, status: str) -> Dict[str, Any]:
        """Acknowledge parser deployment success/failure"""
        return self._make_request('POST', f'/parser/acknowledge/{deployment_id}', {'status': status})
    
    # Signal Operations
    def get_signal_queue(self) -> Dict[str, Any]:
        """Get pending signals for execution"""
        return self._make_request('GET', '/signals/queue')
    
    def report_signal_execution(self, signal_id: int, execution_data: Dict[str, Any]) -> Dict[str, Any]:
        """Report signal execution results"""
        return self._make_request('POST', f'/signals/{signal_id}/execution', execution_data)
    
    def get_replay_signals(self) -> Dict[str, Any]:
        """Get signals queued for replay"""
        return self._make_request('GET', '/signals/replay')
    
    # Configuration Sync
    def sync_configuration(self, config_sections: List[str]) -> Dict[str, Any]:
        """Sync configuration sections from admin panel"""
        return self._make_request('POST', '/config/sync', {'sections': config_sections})
    
    def push_local_config(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """Push local configuration changes to admin panel"""
        return self._make_request('POST', '/config/push', config_data)
    
    # Health and Monitoring
    def send_heartbeat(self, health_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send heartbeat with system health data"""
        return self._make_request('POST', '/health/heartbeat', health_data)
    
    def report_error(self, error_data: Dict[str, Any]) -> Dict[str, Any]:
        """Report system errors to admin panel"""
        return self._make_request('POST', '/health/error', error_data)
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status from admin panel"""
        return self._make_request('GET', '/health/status')
    
    # Utility Methods
    def test_connection(self) -> bool:
        """Test connection and authentication with admin panel"""
        try:
            result = self._make_request('GET', '/health/ping')
            return result.get('success', False)
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False
    
    def get_sync_logs(self, limit: int = 50) -> Dict[str, Any]:
        """Get recent sync operation logs"""
        return self._make_request('GET', f'/logs?limit={limit}', use_sync_auth=False)
    
    def close(self):
        """Close session and cleanup resources"""
        self.session.close()
        print("✓ Sync client session closed")

class SyncManager:
    """High-level sync manager for desktop applications"""
    
    def __init__(self, config_file: str = None):
        """Initialize sync manager with configuration"""
        self.config = get_config() if not config_file else self._load_config(config_file)
        self.client: Optional[SecureSyncClient] = None
        self.is_connected = False
        
    def _load_config(self, config_file: str) -> Dict[str, Any]:
        """Load configuration from file"""
        with open(config_file, 'r') as f:
            return json.load(f)
    
    def connect(self, user_id: int, api_key: str, api_key_id: int) -> bool:
        """Connect to admin panel with credentials"""
        try:
            self.client = SecureSyncClient(user_id, api_key, api_key_id)
            self.is_connected = self.client.test_connection()
            
            if self.is_connected:
                print(f"✓ Connected to admin panel as user {user_id}")
            else:
                print("❌ Failed to connect to admin panel")
                
            return self.is_connected
            
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    def start_sync_loop(self, interval_seconds: int = 60):
        """Start continuous sync loop"""
        if not self.is_connected or not self.client:
            raise Exception("Not connected to admin panel")
        
        print(f"🔄 Starting sync loop (interval: {interval_seconds}s)")
        
        try:
            while True:
                # Perform sync operations
                self._sync_once()
                time.sleep(interval_seconds)
                
        except KeyboardInterrupt:
            print("🛑 Sync loop stopped by user")
        except Exception as e:
            print(f"❌ Sync loop error: {e}")
        finally:
            self.disconnect()
    
    def _sync_once(self):
        """Perform one sync cycle"""
        if not self.client:
            return
            
        try:
            # Send heartbeat
            health_data = {
                'timestamp': time.time(),
                'status': 'running',
                'version': self.config.get('system', {}).get('version', '1.0.0')
            }
            self.client.send_heartbeat(health_data)
            
            # Check for parser updates
            updates = self.client.check_parser_updates()
            if updates.get('hasUpdates'):
                print(f"📦 Parser updates available: {updates.get('updateCount', 0)}")
            
            # Check for replay signals
            replay_signals = self.client.get_replay_signals()
            if replay_signals.get('signals'):
                print(f"🔄 Replay signals available: {len(replay_signals['signals'])}")
            
        except Exception as e:
            print(f"⚠️  Sync cycle warning: {e}")
    
    def disconnect(self):
        """Disconnect from admin panel"""
        if self.client:
            self.client.close()
            self.client = None
        self.is_connected = False
        print("🔌 Disconnected from admin panel")

# Example usage and testing
if __name__ == "__main__":
    print("🧪 Testing Secure Sync Client")
    print("=" * 50)
    
    # Test configuration loading
    try:
        config = get_config()
        print("✓ Configuration loaded")
    except Exception as e:
        print(f"❌ Configuration loading failed: {e}")
        exit(1)
    
    # Test sync manager
    manager = SyncManager()
    
    # Example credentials (replace with actual values)
    user_id = 1
    api_key = "your_api_key_here"
    api_key_id = 1
    
    print(f"\n📡 Testing connection (Note: API key needed for actual test)")
    print("To test with real credentials:")
    print("1. Create API key in admin panel")
    print("2. Update credentials in this script")
    print("3. Run the test again")
    
    # Uncomment to test with real credentials:
    # if manager.connect(user_id, api_key, api_key_id):
    #     print("✓ Sync test successful")
    #     manager.disconnect()
    # else:
    #     print("❌ Sync test failed")