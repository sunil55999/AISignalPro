#!/bin/bash

# Signal Testing Utility for MT5 EA Integration
# Usage: bash test_signal.sh

echo "🧪 Signal Testing Utility"
echo "========================="

# Test different signal types
test_signals=(
    '{"symbol":"XAUUSD","action":"buy","entry":1985.0,"sl":1975.0,"tp":[1995,2005],"lot":0.1}'
    '{"symbol":"EURUSD","action":"sell","entry":1.0850,"sl":1.0900,"tp":[1.0800,1.0750],"lot":0.2}'
    '{"symbol":"GBPUSD","action":"buy","entry":1.2500,"sl":1.2450,"tp":[1.2550],"lot":0.15}'
)

test_names=(
    "Gold Buy Signal"
    "EUR/USD Sell Signal" 
    "GBP/USD Buy Signal"
)

echo "Available test signals:"
for i in "${!test_names[@]}"; do
    echo "$((i+1)). ${test_names[$i]}"
done

echo "4. Custom signal"
echo "5. Parse text signal"
echo ""

read -p "Select test (1-5): " choice

case $choice in
    1|2|3)
        idx=$((choice-1))
        signal="${test_signals[$idx]}"
        echo "Testing: ${test_names[$idx]}"
        
        # Send to manual dispatch endpoint
        if command -v curl >/dev/null 2>&1; then
            response=$(curl -s -X POST http://localhost:5000/api/mt5/manual-dispatch \
                -H "Content-Type: application/json" \
                -d "$signal")
            echo "Response: $response"
        else
            # Write to signal file directly
            echo "$signal" > C:\\TradingSignals\\signals.json 2>/dev/null || echo "$signal" > /tmp/TradingSignals/signals.json
            echo "Signal written to file for MT5 EA"
        fi
        ;;
    4)
        echo "Enter custom signal JSON:"
        read -r custom_signal
        
        if command -v curl >/dev/null 2>&1; then
            curl -s -X POST http://localhost:5000/api/mt5/manual-dispatch \
                -H "Content-Type: application/json" \
                -d "$custom_signal"
        else
            echo "$custom_signal" > C:\\TradingSignals\\signals.json 2>/dev/null || echo "$custom_signal" > /tmp/TradingSignals/signals.json
        fi
        ;;
    5)
        echo "Enter signal text to parse:"
        read -r signal_text
        
        if command -v curl >/dev/null 2>&1; then
            curl -s -X POST http://localhost:5000/api/parse-signal \
                -H "Content-Type: application/json" \
                -d "{\"rawText\":\"$signal_text\"}"
        else
            echo "Backend API required for text parsing"
        fi
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo "Test completed"