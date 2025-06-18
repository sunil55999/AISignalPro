//+------------------------------------------------------------------+
//|                                           StealthCopierEA.mq5  |
//|                                    Copyright 2025, Prop Safe   |
//|                                              prop-safe.com     |
//+------------------------------------------------------------------+
#property copyright "Copyright 2025, Prop Safe"
#property link      "prop-safe.com"
#property version   "1.00"
#property description "Generic algorithmic trading assistant"

//--- Input parameters
input string    SignalFile = "C:\\TradingSignals\\signals.json";     // Signal file path
input double    RiskPercent = 1.0;                                   // Risk percentage per trade
input bool      EnableStealthMode = true;                            // Hide all visual elements
input int       MinDelayMS = 500;                                    // Minimum execution delay (ms)
input int       MaxDelayMS = 3000;                                   // Maximum execution delay (ms)
input bool      AllowPartialClose = true;                            // Enable partial position closing
input bool      AutoMoveSLToBE = true;                               // Auto move SL to breakeven
input double    MaxLotSize = 1.0;                                    // Maximum lot size limit
input int       MagicNumber = 12345;                                 // Unique magic number
input bool      EnableLogging = false;                               // Enable trade logging
input string    LogFile = "C:\\TradingLogs\\tradelog.txt";          // Log file path
input string    TradeHoursStart = "09:00";                          // Trading hours start
input string    TradeHoursEnd = "18:00";                            // Trading hours end
input bool      UseTimeFilter = false;                               // Enable time filtering

//--- Global variables
datetime lastFileCheck = 0;
datetime lastSignalTime = 0;
string currentSignalHash = "";
bool isProcessingSignal = false;

//--- Structure for signal data
struct SignalData {
    string symbol;
    string action;
    double entry;
    double sl;
    double tp[10];
    int tpCount;
    double lot;
    string orderType;
    int delayMs;
    double partialClosePercent;
    bool moveSLToBE;
    string comment;
};

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    if(EnableStealthMode) {
        Comment("");
        ChartSetInteger(0, CHART_SHOW_GRID, false);
        ChartSetInteger(0, CHART_SHOW_VOLUMES, false);
        ChartSetInteger(0, CHART_SHOW_OHLC, false);
    }
    
    Print("Algorithmic trading assistant initialized");
    
    // Validate inputs
    if(RiskPercent <= 0 || RiskPercent > 10) {
        Print("Warning: Risk percentage should be between 0.1 and 10");
        RiskPercent = 1.0;
    }
    
    if(MaxLotSize <= 0) {
        Print("Warning: Max lot size should be positive");
        MaxLotSize = 1.0;
    }
    
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    if(!EnableStealthMode) {
        Comment("Trading assistant stopped");
    }
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
    // Check for new signals every 1 second (not every tick for stealth)
    if(TimeCurrent() - lastFileCheck >= 1) {
        lastFileCheck = TimeCurrent();
        CheckForNewSignal();
    }
    
    // Manage existing positions
    ManageOpenPositions();
}

//+------------------------------------------------------------------+
//| Check for new signal in JSON file                               |
//+------------------------------------------------------------------+
void CheckForNewSignal()
{
    if(isProcessingSignal) return;
    
    int fileHandle = FileOpen(SignalFile, FILE_READ|FILE_TXT);
    if(fileHandle == INVALID_HANDLE) {
        // File doesn't exist or can't be read - this is normal
        return;
    }
    
    string jsonContent = "";
    while(!FileIsEnding(fileHandle)) {
        jsonContent += FileReadString(fileHandle) + "\n";
    }
    FileClose(fileHandle);
    
    if(StringLen(jsonContent) < 10) return; // Invalid JSON
    
    // Create hash of content to avoid processing same signal twice
    string signalHash = GetStringHash(jsonContent);
    if(signalHash == currentSignalHash) return;
    
    currentSignalHash = signalHash;
    
    // Parse and execute signal
    SignalData signal;
    if(ParseSignalJSON(jsonContent, signal)) {
        ProcessSignal(signal);
    }
}

//+------------------------------------------------------------------+
//| Parse JSON signal data                                           |
//+------------------------------------------------------------------+
bool ParseSignalJSON(string json, SignalData &signal)
{
    // Initialize signal structure
    ZeroMemory(signal);
    signal.tpCount = 0;
    signal.delayMs = MinDelayMS + (rand() % (MaxDelayMS - MinDelayMS));
    signal.comment = "Manual";
    
    // Simple JSON parsing (prop-safe, no external libraries)
    signal.symbol = ExtractJSONValue(json, "symbol");
    signal.action = ExtractJSONValue(json, "action");
    signal.orderType = ExtractJSONValue(json, "order_type");
    
    string entryStr = ExtractJSONValue(json, "entry");
    string slStr = ExtractJSONValue(json, "sl");
    string lotStr = ExtractJSONValue(json, "lot");
    string delayStr = ExtractJSONValue(json, "delay_ms");
    string partialStr = ExtractJSONValue(json, "partial_close");
    string moveSLStr = ExtractJSONValue(json, "move_sl_to_be");
    
    // Convert strings to numbers
    signal.entry = StringToDouble(entryStr);
    signal.sl = StringToDouble(slStr);
    signal.lot = StringToDouble(lotStr);
    
    if(StringLen(delayStr) > 0) signal.delayMs = (int)StringToInteger(delayStr);
    if(StringLen(partialStr) > 0) signal.partialClosePercent = StringToDouble(partialStr);
    if(StringLen(moveSLStr) > 0) signal.moveSLToBE = (moveSLStr == "true");
    
    // Parse TP array
    signal.tpCount = ParseTPArray(json, signal.tp);
    
    // Validate signal
    if(StringLen(signal.symbol) == 0 || StringLen(signal.action) == 0) return false;
    if(signal.entry <= 0 || signal.lot <= 0) return false;
    
    return true;
}

//+------------------------------------------------------------------+
//| Process parsed signal                                            |
//+------------------------------------------------------------------+
void ProcessSignal(SignalData &signal)
{
    if(!IsValidTradingTime()) return;
    
    isProcessingSignal = true;
    
    // Apply human-like delay
    Sleep(signal.delayMs);
    
    // Apply risk management
    double adjustedLot = CalculateAdjustedLotSize(signal);
    if(adjustedLot <= 0) {
        isProcessingSignal = false;
        return;
    }
    
    signal.lot = adjustedLot;
    
    // Execute based on action
    if(signal.action == "buy" || signal.action == "sell") {
        ExecuteMarketOrder(signal);
    } else if(signal.action == "close_partial") {
        ExecutePartialClose(signal);
    } else if(signal.action == "move_sl") {
        MoveSLToBreakeven(signal.symbol);
    } else if(signal.action == "cancel") {
        CancelPendingOrders(signal.symbol);
    }
    
    // Log if enabled
    if(EnableLogging) {
        LogTrade(signal);
    }
    
    // Clean up signal file to avoid reprocessing
    CleanupSignalFile();
    
    isProcessingSignal = false;
}

//+------------------------------------------------------------------+
//| Execute market order                                             |
//+------------------------------------------------------------------+
void ExecuteMarketOrder(SignalData &signal)
{
    ENUM_ORDER_TYPE orderType = (signal.action == "buy") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
    
    MqlTradeRequest request;
    MqlTradeResult result;
    ZeroMemory(request);
    ZeroMemory(result);
    
    request.action = TRADE_ACTION_DEAL;
    request.symbol = signal.symbol;
    request.volume = signal.lot;
    request.type = orderType;
    request.price = (orderType == ORDER_TYPE_BUY) ? SymbolInfoDouble(signal.symbol, SYMBOL_ASK) : SymbolInfoDouble(signal.symbol, SYMBOL_BID);
    request.sl = signal.sl;
    request.tp = (signal.tpCount > 0) ? signal.tp[0] : 0;
    request.magic = MagicNumber;
    request.comment = signal.comment;
    request.type_filling = ORDER_FILLING_FOK;
    
    // Apply realistic slippage
    double slippage = GetRealisticSlippage(signal.symbol);
    if(orderType == ORDER_TYPE_BUY) {
        request.price += slippage;
    } else {
        request.price -= slippage;
    }
    
    bool success = OrderSend(request, result);
    
    if(success && result.retcode == TRADE_RETCODE_DONE) {
        Print("Order executed successfully: ", signal.symbol, " ", signal.action, " ", signal.lot);
        
        // Handle multiple TP levels
        if(signal.tpCount > 1) {
            SetMultipleTPLevels(result.order, signal);
        }
    } else {
        Print("Order failed: ", result.retcode, " - ", result.comment);
    }
}

//+------------------------------------------------------------------+
//| Calculate adjusted lot size based on risk                       |
//+------------------------------------------------------------------+
double CalculateAdjustedLotSize(SignalData &signal)
{
    double accountBalance = AccountInfoDouble(ACCOUNT_BALANCE);
    double riskAmount = accountBalance * (RiskPercent / 100.0);
    
    if(signal.sl <= 0 || signal.entry <= 0) {
        // No SL defined, use maximum allowed lot size
        return MathMin(signal.lot, MaxLotSize);
    }
    
    double pipValue = GetPipValue(signal.symbol);
    double stopLossPips = MathAbs(signal.entry - signal.sl) / SymbolInfoDouble(signal.symbol, SYMBOL_POINT);
    
    if(StringFind(signal.symbol, "JPY") >= 0) {
        stopLossPips /= 100; // Adjust for JPY pairs
    } else {
        stopLossPips /= 10000; // Adjust for other pairs
    }
    
    double calculatedLot = riskAmount / (stopLossPips * pipValue);
    calculatedLot = MathMin(calculatedLot, MaxLotSize);
    calculatedLot = MathMin(calculatedLot, signal.lot);
    
    // Round to valid lot size
    double lotStep = SymbolInfoDouble(signal.symbol, SYMBOL_VOLUME_STEP);
    calculatedLot = MathFloor(calculatedLot / lotStep) * lotStep;
    
    return MathMax(calculatedLot, SymbolInfoDouble(signal.symbol, SYMBOL_VOLUME_MIN));
}

//+------------------------------------------------------------------+
//| Manage open positions                                            |
//+------------------------------------------------------------------+
void ManageOpenPositions()
{
    for(int i = PositionsTotal() - 1; i >= 0; i--) {
        if(PositionSelectByIndex(i)) {
            if(PositionGetInteger(POSITION_MAGIC) == MagicNumber) {
                string symbol = PositionGetString(POSITION_SYMBOL);
                
                if(AutoMoveSLToBE) {
                    CheckBreakevenCondition(symbol);
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Check and move SL to breakeven                                   |
//+------------------------------------------------------------------+
void CheckBreakevenCondition(string symbol)
{
    if(!PositionSelectBySymbol(symbol)) return;
    
    double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
    double currentPrice = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 
                         SymbolInfoDouble(symbol, SYMBOL_BID) : 
                         SymbolInfoDouble(symbol, SYMBOL_ASK);
    double sl = PositionGetDouble(POSITION_SL);
    
    ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
    double profitPips = 0;
    
    if(posType == POSITION_TYPE_BUY) {
        profitPips = (currentPrice - openPrice) / SymbolInfoDouble(symbol, SYMBOL_POINT);
    } else {
        profitPips = (openPrice - currentPrice) / SymbolInfoDouble(symbol, SYMBOL_POINT);
    }
    
    // Move to BE if 20+ pips in profit and SL not at BE yet
    if(profitPips >= 200 && MathAbs(sl - openPrice) > SymbolInfoDouble(symbol, SYMBOL_POINT) * 10) {
        MoveSLToBreakeven(symbol);
    }
}

//+------------------------------------------------------------------+
//| Move stop loss to breakeven                                      |
//+------------------------------------------------------------------+
void MoveSLToBreakeven(string symbol)
{
    if(!PositionSelectBySymbol(symbol)) return;
    
    double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
    ulong ticket = PositionGetInteger(POSITION_TICKET);
    
    MqlTradeRequest request;
    MqlTradeResult result;
    ZeroMemory(request);
    ZeroMemory(result);
    
    request.action = TRADE_ACTION_SLTP;
    request.symbol = symbol;
    request.sl = openPrice;
    request.tp = PositionGetDouble(POSITION_TP);
    request.position = ticket;
    
    if(OrderSend(request, result)) {
        Print("SL moved to breakeven for ", symbol);
    }
}

//+------------------------------------------------------------------+
//| Execute partial close                                            |
//+------------------------------------------------------------------+
void ExecutePartialClose(SignalData &signal)
{
    if(!AllowPartialClose || signal.partialClosePercent <= 0) return;
    
    if(!PositionSelectBySymbol(signal.symbol)) return;
    
    double currentVolume = PositionGetDouble(POSITION_VOLUME);
    double closeVolume = currentVolume * (signal.partialClosePercent / 100.0);
    
    // Round to valid lot step
    double lotStep = SymbolInfoDouble(signal.symbol, SYMBOL_VOLUME_STEP);
    closeVolume = MathFloor(closeVolume / lotStep) * lotStep;
    
    if(closeVolume < SymbolInfoDouble(signal.symbol, SYMBOL_VOLUME_MIN)) return;
    
    MqlTradeRequest request;
    MqlTradeResult result;
    ZeroMemory(request);
    ZeroMemory(result);
    
    request.action = TRADE_ACTION_DEAL;
    request.symbol = signal.symbol;
    request.volume = closeVolume;
    request.position = PositionGetInteger(POSITION_TICKET);
    request.type = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
    request.price = (request.type == ORDER_TYPE_SELL) ? SymbolInfoDouble(signal.symbol, SYMBOL_BID) : SymbolInfoDouble(signal.symbol, SYMBOL_ASK);
    request.magic = MagicNumber;
    request.comment = "Partial";
    
    if(OrderSend(request, result)) {
        Print("Partial close executed: ", closeVolume, " lots of ", signal.symbol);
    }
}

//+------------------------------------------------------------------+
//| Cancel pending orders                                            |
//+------------------------------------------------------------------+
void CancelPendingOrders(string symbol)
{
    for(int i = OrdersTotal() - 1; i >= 0; i--) {
        if(OrderSelectByIndex(i)) {
            if(OrderGetString(ORDER_SYMBOL) == symbol && OrderGetInteger(ORDER_MAGIC) == MagicNumber) {
                MqlTradeRequest request;
                MqlTradeResult result;
                ZeroMemory(request);
                
                request.action = TRADE_ACTION_REMOVE;
                request.order = OrderGetInteger(ORDER_TICKET);
                
                OrderSend(request, result);
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Utility functions                                                |
//+------------------------------------------------------------------+
string ExtractJSONValue(string json, string key)
{
    string searchKey = "\"" + key + "\"";
    int startPos = StringFind(json, searchKey);
    if(startPos < 0) return "";
    
    startPos = StringFind(json, ":", startPos);
    if(startPos < 0) return "";
    
    startPos++;
    while(startPos < StringLen(json) && (StringGetCharacter(json, startPos) == ' ' || StringGetCharacter(json, startPos) == '\t')) {
        startPos++;
    }
    
    int endPos = startPos;
    bool inQuotes = false;
    
    if(StringGetCharacter(json, startPos) == '"') {
        inQuotes = true;
        startPos++;
        endPos = StringFind(json, "\"", startPos);
    } else {
        while(endPos < StringLen(json)) {
            ushort ch = StringGetCharacter(json, endPos);
            if(ch == ',' || ch == '}' || ch == ']' || ch == '\n' || ch == '\r') break;
            endPos++;
        }
    }
    
    if(endPos <= startPos) return "";
    
    string value = StringSubstr(json, startPos, endPos - startPos);
    StringTrimLeft(value);
    StringTrimRight(value);
    
    return value;
}

int ParseTPArray(string json, double &tp[])
{
    string tpStr = ExtractJSONValue(json, "tp");
    if(StringLen(tpStr) == 0) return 0;
    
    if(StringFind(tpStr, "[") >= 0) {
        // Array format
        int count = 0;
        int startPos = StringFind(tpStr, "[") + 1;
        
        while(startPos < StringLen(tpStr) && count < 10) {
            int endPos = StringFind(tpStr, ",", startPos);
            if(endPos < 0) endPos = StringFind(tpStr, "]", startPos);
            if(endPos < 0) break;
            
            string value = StringSubstr(tpStr, startPos, endPos - startPos);
            StringTrimLeft(value);
            StringTrimRight(value);
            
            tp[count] = StringToDouble(value);
            count++;
            
            startPos = endPos + 1;
        }
        
        return count;
    } else {
        // Single value
        tp[0] = StringToDouble(tpStr);
        return 1;
    }
}

void SetMultipleTPLevels(ulong ticket, SignalData &signal)
{
    // For multiple TP levels, we would need to implement position splitting
    // This is a simplified version that sets the first TP level
    if(signal.tpCount > 0) {
        MqlTradeRequest request;
        MqlTradeResult result;
        ZeroMemory(request);
        
        request.action = TRADE_ACTION_SLTP;
        request.position = ticket;
        request.tp = signal.tp[0];
        request.sl = signal.sl;
        
        OrderSend(request, result);
    }
}

double GetPipValue(string symbol)
{
    double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
    double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
    
    if(tickSize > 0) {
        return tickValue / tickSize;
    }
    
    return 1.0; // Fallback
}

double GetRealisticSlippage(string symbol)
{
    double spread = SymbolInfoInteger(symbol, SYMBOL_SPREAD) * SymbolInfoDouble(symbol, SYMBOL_POINT);
    
    // Add random slippage between 0-2 pips to mimic manual trading
    double randomSlippage = (rand() % 20) * SymbolInfoDouble(symbol, SYMBOL_POINT) / 10.0;
    
    return spread + randomSlippage;
}

string GetStringHash(string str)
{
    // Simple hash function for string comparison
    int hash = 0;
    for(int i = 0; i < StringLen(str); i++) {
        hash = ((hash << 5) - hash) + StringGetCharacter(str, i);
    }
    return IntegerToString(hash);
}

bool IsValidTradingTime()
{
    if(!UseTimeFilter) return true;
    
    datetime currentTime = TimeCurrent();
    MqlDateTime dt;
    TimeToStruct(currentTime, dt);
    
    int currentMinutes = dt.hour * 60 + dt.min;
    
    // Parse start and end times
    string parts[];
    int startHour = 9, startMin = 0, endHour = 18, endMin = 0;
    
    if(StringSplit(TradeHoursStart, ':', parts) == 2) {
        startHour = (int)StringToInteger(parts[0]);
        startMin = (int)StringToInteger(parts[1]);
    }
    
    if(StringSplit(TradeHoursEnd, ':', parts) == 2) {
        endHour = (int)StringToInteger(parts[0]);
        endMin = (int)StringToInteger(parts[1]);
    }
    
    int startMinutes = startHour * 60 + startMin;
    int endMinutes = endHour * 60 + endMin;
    
    return (currentMinutes >= startMinutes && currentMinutes <= endMinutes);
}

void LogTrade(SignalData &signal)
{
    int fileHandle = FileOpen(LogFile, FILE_WRITE|FILE_READ|FILE_TXT);
    if(fileHandle == INVALID_HANDLE) return;
    
    FileSeek(fileHandle, 0, SEEK_END);
    
    string logEntry = TimeToString(TimeCurrent()) + "," + 
                     signal.symbol + "," + 
                     signal.action + "," + 
                     DoubleToString(signal.lot, 2) + "," + 
                     DoubleToString(signal.entry, 5) + "," + 
                     DoubleToString(signal.sl, 5) + "\n";
    
    FileWriteString(fileHandle, logEntry);
    FileClose(fileHandle);
}

void CleanupSignalFile()
{
    // Write empty JSON to signal file to mark as processed
    int fileHandle = FileOpen(SignalFile, FILE_WRITE|FILE_TXT);
    if(fileHandle != INVALID_HANDLE) {
        FileWriteString(fileHandle, "{}");
        FileClose(fileHandle);
    }
}

//+------------------------------------------------------------------+