# Stealth MT5 EA - Prop Firm Safe Trading System

## Overview

This Expert Advisor (EA) is designed to execute trades from JSON signal files in a completely stealth manner, making it undetectable by prop firm monitoring systems. The EA mimics manual trading behavior with realistic delays, slippage handling, and zero external connections.

## Key Features

### 🕵️ Stealth Capabilities
- **Generic Name**: Uses "StealthCopierEA" to avoid detection
- **No External Connections**: Reads only from local JSON files
- **Human-like Timing**: Random delays between 0.5-3.0 seconds
- **Realistic Slippage**: Adds natural market slippage patterns
- **Minimal Logging**: Only essential information logged
- **No Visual Elements**: Optional stealth mode hides all UI

### 🛡️ Prop Firm Safety
- **No DLLs**: Pure MQL5 code with no external libraries
- **No Network Calls**: Completely offline operation
- **Local File Reading**: JSON signal input from local filesystem
- **Manual Trading Mimicry**: Realistic order execution patterns
- **Configurable Magic Number**: Unique identification system

### 📊 Risk Management
- **Percentage-based Risk**: Calculate lot sizes based on account risk
- **Maximum Lot Limits**: Hard caps on position sizes
- **Stop Loss Validation**: Automatic risk calculation
- **Breakeven Management**: Auto-move SL to entry after profit
- **Partial Position Closing**: Support for scaling out of trades

## Installation & Setup

### 1. EA Installation
1. Copy `StealthCopierEA.mq5` to your MT5 `Experts` folder
2. Compile the EA in MetaEditor
3. Create signal directories:
   ```
   C:\TradingSignals\
   C:\TradingLogs\
   ```

### 2. Configuration
Key input parameters:

```mql5
input string    SignalFile = "C:\\TradingSignals\\signals.json";
input double    RiskPercent = 1.0;                    // 1% risk per trade
input bool      EnableStealthMode = true;             // Hide all visuals
input int       MinDelayMS = 500;                     // Minimum delay
input int       MaxDelayMS = 3000;                    // Maximum delay
input bool      AllowPartialClose = true;             // Enable partial closes
input bool      AutoMoveSLToBE = true;                // Auto breakeven
input double    MaxLotSize = 1.0;                     // Lot size limit
input int       MagicNumber = 12345;                  // Unique identifier
```

### 3. Signal File Format

The EA reads JSON signals in this format:

```json
{
  "symbol": "XAUUSD",
  "action": "buy",
  "entry": 1985.0,
  "sl": 1975.0,
  "tp": [1995, 2005],
  "lot": 0.2,
  "order_type": "market",
  "delay_ms": 1200,
  "partial_close": 0,
  "move_sl_to_be": true,
  "comment": "Manual"
}
```

## Signal Actions

### Primary Actions
- **buy/sell**: Execute market orders
- **close_partial**: Close percentage of position
- **move_sl**: Move stop loss to breakeven
- **cancel**: Cancel pending orders

### Advanced Features
- **Multiple TP Levels**: Array of take profit targets
- **Custom Delays**: Override default timing
- **Partial Closes**: Percentage-based position scaling
- **Breakeven Management**: Automatic SL adjustment

## Prop Firm Safety Features

### 1. No Detection Signatures
- Generic EA name without "copier" or "signal" keywords
- No external API calls or socket connections
- No suspicious DLL imports
- Natural execution timing patterns

### 2. Manual Trading Simulation
- Random execution delays (0.5-3.0 seconds)
- Realistic slippage application
- Natural order flow patterns
- Human-like lot size variations

### 3. Stealth Operation
- Optional invisible mode (no chart objects)
- Minimal journal logging
- Clean execution footprint
- Configurable magic numbers

## Integration with Backend

### Signal Flow
1. **Web Dashboard** → Parses Telegram signals
2. **Backend API** → Applies risk management
3. **JSON Output** → Writes to user-specific files
4. **MT5 EA** → Reads and executes trades
5. **Audit Logs** → Records execution results

### File Paths
- Signals: `C:\TradingSignals\user1.json`
- Logs: `C:\TradingLogs\tradelog.txt`
- MT5 Output: `./mt5_signals.json`

## Risk Management System

### Lot Size Calculation
```mql5
// Calculate lot based on risk percentage
double accountBalance = AccountInfoDouble(ACCOUNT_BALANCE);
double riskAmount = accountBalance * (RiskPercent / 100.0);
double stopLossPips = MathAbs(entry - sl) / SymbolInfoDouble(symbol, SYMBOL_POINT);
double calculatedLot = riskAmount / (stopLossPips * pipValue);
```

### Safety Limits
- Maximum lot size enforcement
- Stop loss validation
- Account balance checks
- Symbol-specific minimums

## Advanced Features

### Breakeven Management
- Automatically moves SL to entry when 20+ pips in profit
- Configurable profit threshold
- Position-specific tracking

### Partial Position Closing
- Percentage-based closing (e.g., close 50% at TP1)
- Multiple TP level support
- Risk-free continuation trades

### Time Filtering
- Optional trading hours restriction
- Configurable start/end times
- Market session awareness

## Logging & Monitoring

### Execution Logs
- Trade entry/exit details
- Risk management decisions
- Error conditions
- Performance metrics

### Audit Trail
- Signal processing timestamps
- Execution delays applied
- Risk calculations
- Position modifications

## Troubleshooting

### Common Issues
1. **Signal File Not Found**: Check file path permissions
2. **Invalid JSON**: Validate signal format
3. **Insufficient Margin**: Review lot size calculations
4. **Symbol Not Available**: Verify market hours

### Performance Optimization
- File reading frequency (1-second intervals)
- Memory management for large positions
- Efficient JSON parsing
- Minimal CPU usage

## Security Considerations

### File Access
- Use full file paths for reliability
- Handle file locking gracefully
- Validate JSON before processing
- Clean up processed signals

### Prop Firm Compliance
- No suspicious network activity
- Natural trading patterns
- Realistic execution timing
- Standard MT5 API usage only

## Updates & Maintenance

### Version Control
- Track EA modifications
- Test on demo accounts first
- Monitor execution patterns
- Update safety parameters

### Performance Monitoring
- Track execution success rates
- Monitor slippage patterns
- Analyze profit/loss distribution
- Review risk management effectiveness

## Support & Documentation

For technical support or advanced configuration, refer to:
- Backend API documentation
- Web dashboard user guide
- Risk management best practices
- Prop firm compliance guidelines

---

**Important**: Always test thoroughly on demo accounts before live trading. Ensure compliance with your prop firm's specific rules and regulations.