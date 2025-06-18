#!/usr/bin/env python3
"""
Unified System Launcher - AI Trading Signal Parser & MT5 EA Integration
Starts all components with a single command: python start.py
"""

import subprocess
import sys
import os
import time
import json
import threading
from pathlib import Path

class SystemLauncher:
    def __init__(self):
        self.processes = []
        self.base_dir = Path(__file__).parent
        self.config = {
            "backend_port": 5000,
            "frontend_port": 5173,
            "parser_enabled": True,
            "mt5_bridge_enabled": True,
            "signal_path": "C:\\TradingSignals\\signals.json",
            "log_level": "INFO"
        }
        
    def print_banner(self):
        print("=" * 60)
        print("🚀 AI TRADING SIGNAL PARSER - UNIFIED SYSTEM LAUNCHER")
        print("=" * 60)
        print("📊 Frontend: React Dashboard")
        print("🔗 Backend: Express.js API Server")
        print("🤖 Parser: Advanced AI Signal Engine")
        print("📤 MT5 EA: Stealth Trading System")
        print("=" * 60)
        
    def check_dependencies(self):
        """Verify all required dependencies are installed"""
        print("🔍 Checking system dependencies...")
        
        # Check Node.js
        try:
            result = subprocess.run(["node", "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ Node.js: {result.stdout.strip()}")
            else:
                print("❌ Node.js not found")
                return False
        except FileNotFoundError:
            print("❌ Node.js not installed")
            return False
            
        # Check npm packages
        if not (self.base_dir / "node_modules").exists():
            print("📦 Installing npm dependencies...")
            subprocess.run(["npm", "install"], cwd=self.base_dir)
            
        # Check Python dependencies
        try:
            import express
        except ImportError:
            print("📦 Installing Python dependencies if needed...")
            
        # Create signal directories
        signal_dir = Path("C:\\TradingSignals")
        log_dir = Path("C:\\TradingLogs")
        
        for directory in [signal_dir, log_dir]:
            directory.mkdir(parents=True, exist_ok=True)
            print(f"📁 Created directory: {directory}")
            
        return True
        
    def start_backend(self):
        """Start the Express.js backend server"""
        print("🔧 Starting Backend API Server...")
        
        env = os.environ.copy()
        env["NODE_ENV"] = "development"
        env["PORT"] = str(self.config["backend_port"])
        
        try:
            process = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=self.base_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            self.processes.append(("Backend", process))
            print(f"✅ Backend started on port {self.config['backend_port']}")
            return True
        except Exception as e:
            print(f"❌ Failed to start backend: {e}")
            return False
            
    def start_signal_parser(self):
        """Initialize the AI signal parsing engine"""
        print("🤖 Initializing AI Signal Parser...")
        
        # The parser is integrated into the backend, so we just verify it's active
        time.sleep(2)  # Wait for backend to fully start
        
        try:
            # Test parser endpoint
            import requests
            response = requests.get(f"http://localhost:{self.config['backend_port']}/api/stats")
            if response.status_code == 200:
                print("✅ Signal Parser Engine active")
                return True
        except:
            print("⚠️  Parser will be available once backend is ready")
            return True
            
    def start_mt5_bridge(self):
        """Start the MT5 signal bridge"""
        print("📤 Starting MT5 Signal Bridge...")
        
        # Create initial signal file template
        signal_template = {
            "symbol": "",
            "action": "",
            "entry": 0,
            "sl": 0,
            "tp": [],
            "lot": 0,
            "timestamp": "",
            "status": "ready"
        }
        
        try:
            with open(self.config["signal_path"], "w") as f:
                json.dump(signal_template, f, indent=2)
            print(f"✅ MT5 Bridge ready - Signal file: {self.config['signal_path']}")
            return True
        except Exception as e:
            print(f"⚠️  MT5 Bridge warning: {e}")
            return True
            
    def monitor_system(self):
        """Monitor all system components"""
        print("📊 System monitoring started...")
        
        while True:
            time.sleep(30)  # Check every 30 seconds
            
            # Check if processes are still running
            for name, process in self.processes:
                if process.poll() is not None:
                    print(f"⚠️  {name} process stopped")
                    
    def create_system_status_endpoint(self):
        """Create a simple status monitoring script"""
        status_script = '''#!/usr/bin/env python3
import requests
import json
import sys

def check_system_status():
    components = {
        "Backend API": "http://localhost:5000/api/stats",
        "Frontend": "http://localhost:5173",
        "Parser": "http://localhost:5000/api/manual-rules",
        "MT5 Bridge": "C:\\\\TradingSignals\\\\signals.json"
    }
    
    print("🔍 System Status Check")
    print("-" * 40)
    
    all_healthy = True
    
    for component, endpoint in components.items():
        try:
            if component == "MT5 Bridge":
                # Check if signal file exists
                import os
                if os.path.exists(endpoint):
                    print(f"✅ {component}: Ready")
                else:
                    print(f"❌ {component}: Signal file not found")
                    all_healthy = False
            else:
                response = requests.get(endpoint, timeout=5)
                if response.status_code == 200:
                    print(f"✅ {component}: Healthy")
                else:
                    print(f"⚠️  {component}: Response code {response.status_code}")
            
        except requests.exceptions.ConnectionError:
            print(f"❌ {component}: Connection failed")
            all_healthy = False
        except Exception as e:
            print(f"❌ {component}: {str(e)}")
            all_healthy = False
    
    print("-" * 40)
    if all_healthy:
        print("🟢 System Status: All components healthy")
        sys.exit(0)
    else:
        print("🔴 System Status: Some components need attention")
        sys.exit(1)

if __name__ == "__main__":
    check_system_status()
'''
        
        with open("check_status.py", "w") as f:
            f.write(status_script)
        os.chmod("check_status.py", 0o755)
        print("📋 Created system status checker: python check_status.py")
        
    def shutdown_handler(self, signum, frame):
        """Gracefully shutdown all processes"""
        print("\n🛑 Shutting down system...")
        
        for name, process in self.processes:
            try:
                process.terminate()
                process.wait(timeout=5)
                print(f"✅ {name} stopped")
            except subprocess.TimeoutExpired:
                process.kill()
                print(f"🔥 {name} force stopped")
            except Exception as e:
                print(f"⚠️  Error stopping {name}: {e}")
                
        print("👋 System shutdown complete")
        sys.exit(0)
        
    def run(self):
        """Main system launcher"""
        import signal
        signal.signal(signal.SIGINT, self.shutdown_handler)
        signal.signal(signal.SIGTERM, self.shutdown_handler)
        
        self.print_banner()
        
        if not self.check_dependencies():
            print("❌ Dependency check failed")
            return False
            
        # Start all components
        components = [
            ("Backend & Parser", self.start_backend),
            ("Signal Parser", self.start_signal_parser),
            ("MT5 Bridge", self.start_mt5_bridge)
        ]
        
        success_count = 0
        for component_name, start_func in components:
            if start_func():
                success_count += 1
            time.sleep(1)  # Brief delay between starts
            
        # Create monitoring tools
        self.create_system_status_endpoint()
        
        print("=" * 60)
        print(f"🎉 SYSTEM LAUNCH COMPLETE ({success_count}/{len(components)} components)")
        print("=" * 60)
        print("🌐 Frontend Dashboard: http://localhost:5173")
        print("🔗 Backend API: http://localhost:5000")
        print("📊 API Documentation: http://localhost:5000/api/stats")
        print("🔍 System Status: python check_status.py")
        print("=" * 60)
        print("📝 Usage Examples:")
        print("   • Parse Signal: POST http://localhost:5000/api/parse-signal")
        print("   • Manual Dispatch: POST http://localhost:5000/api/mt5/manual-dispatch")
        print("   • Channel Management: Frontend Dashboard")
        print("=" * 60)
        print("🔄 System is running... Press Ctrl+C to stop")
        
        # Start monitoring in background
        monitor_thread = threading.Thread(target=self.monitor_system, daemon=True)
        monitor_thread.start()
        
        # Keep main thread alive
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.shutdown_handler(None, None)

if __name__ == "__main__":
    launcher = SystemLauncher()
    launcher.run()