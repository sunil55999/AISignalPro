#!/bin/bash

# AI Trading Signal Parser - Unified System Launcher
# Usage: bash run_all.sh

echo "=========================================="
echo "🚀 AI TRADING SIGNAL PARSER SYSTEM"
echo "=========================================="
echo "📊 Starting unified trading system..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Create signal directories
echo "📁 Setting up signal directories..."
mkdir -p "C:\\TradingSignals" 2>/dev/null || mkdir -p "/tmp/TradingSignals"
mkdir -p "C:\\TradingLogs" 2>/dev/null || mkdir -p "/tmp/TradingLogs"

# Check if we're on Windows (MSYS/MinGW) or Unix-like
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    SIGNAL_PATH="C:\\TradingSignals\\signals.json"
    LOG_PATH="C:\\TradingLogs\\tradelog.txt"
else
    SIGNAL_PATH="/tmp/TradingSignals/signals.json"
    LOG_PATH="/tmp/TradingLogs/tradelog.txt"
fi

print_status "Signal directories created"

# Initialize signal file
echo '{"symbol":"","action":"","entry":0,"sl":0,"tp":[],"lot":0,"timestamp":"","status":"ready"}' > "$SIGNAL_PATH"
print_status "Signal file initialized: $SIGNAL_PATH"

# Check dependencies
print_info "Checking system dependencies..."

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js"
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    print_status "npm found"
else
    print_error "npm not found"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_info "Installing npm dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    print_info "Shutting down system..."
    
    # Kill all background jobs
    jobs -p | xargs -r kill
    
    # Wait a moment for graceful shutdown
    sleep 2
    
    # Force kill any remaining processes
    pkill -f "npm run dev" 2>/dev/null
    pkill -f "node.*server" 2>/dev/null
    
    print_status "System shutdown complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the main application
print_info "Starting unified backend + frontend system..."

# Set environment variables
export NODE_ENV=development
export PORT=5000

# Start the main application (backend + frontend via Vite)
npm run dev &
MAIN_PID=$!

print_status "Backend API started on port 5000"
print_status "Frontend dashboard starting..."

# Wait a moment for the server to start
sleep 3

# Test if the system is running
print_info "Testing system connectivity..."

# Simple connectivity test
if command -v curl >/dev/null 2>&1; then
    if curl -s -f http://localhost:5000/api/stats >/dev/null; then
        print_status "Backend API is responding"
    else
        print_warning "Backend API not yet ready (this is normal during startup)"
    fi
else
    print_warning "curl not available for connectivity testing"
fi

# Create a simple signal test
create_test_signal() {
    local test_signal='{
        "symbol": "XAUUSD",
        "action": "buy",
        "entry": 1985.0,
        "sl": 1975.0,
        "tp": [1995, 2005],
        "lot": 0.1,
        "order_type": "market",
        "delay_ms": 1000,
        "move_sl_to_be": true,
        "comment": "Test Signal",
        "timestamp": "'$(date -Iseconds)'"
    }'
    
    echo "$test_signal" > "$SIGNAL_PATH"
    print_status "Test signal created for MT5 EA"
}

# Display system information
echo "=========================================="
echo "🎉 SYSTEM LAUNCH COMPLETE"
echo "=========================================="
echo "🌐 Frontend Dashboard: http://localhost:5000"
echo "🔗 Backend API: http://localhost:5000/api/stats"
echo "📤 Signal File: $SIGNAL_PATH"
echo "📝 Log File: $LOG_PATH"
echo "=========================================="
echo "📋 Available Endpoints:"
echo "   • Parse Signal: POST /api/parse-signal"
echo "   • Manual Dispatch: POST /api/mt5/manual-dispatch"
echo "   • MT5 Status: GET /api/mt5/status"
echo "   • Admin Panel: /admin"
echo "   • User Dashboard: /dashboard"
echo "=========================================="
echo "🔧 Quick Commands:"
echo "   • Test Signal: bash test_signal.sh"
echo "   • System Status: curl localhost:5000/api/stats"
echo "   • Create Test Signal: Enter 't' and press Enter"
echo "=========================================="
echo "🔄 System is running... Press Ctrl+C to stop"
echo "   Press 't' + Enter to create a test signal"
echo "   Press 's' + Enter to check system status"
echo "=========================================="

# Interactive command loop
while true; do
    read -t 1 -n 1 input 2>/dev/null
    
    case $input in
        t|T)
            echo ""
            print_info "Creating test signal..."
            create_test_signal
            ;;
        s|S)
            echo ""
            print_info "Checking system status..."
            if command -v curl >/dev/null 2>&1; then
                curl -s http://localhost:5000/api/stats | head -1
            else
                print_warning "curl not available for status check"
            fi
            ;;
        q|Q)
            echo ""
            cleanup
            ;;
    esac
    
    # Check if main process is still running
    if ! kill -0 $MAIN_PID 2>/dev/null; then
        print_error "Main process stopped unexpectedly"
        exit 1
    fi
done