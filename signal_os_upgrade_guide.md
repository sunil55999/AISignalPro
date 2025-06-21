# 📘 SignalOS Upgrade Implementation Guide (Replit-Optimized)

This document provides a fully structured upgrade implementation guide for SignalOS — specifically tailored for use with Replit Agent and production deployment. The instructions ensure modular, maintainable code while integrating next-gen features across the Desktop App, Admin Panel, and User Dashboard.

---

## 📁 Phase 0: Restructure Project Directory

### 🗂️ Prompt 0.1 — Move Files into Proper Module Folders

```prompt
Refactor the root project structure as follows:
- Move all files related to the desktop application (MT5 EA integration, AI parser, Telegram session manager, etc.) into `/desktop-app/`
- Move all Express.js API backend files (`server`, `routes.ts`, `index.ts`, database config, etc.) into `/admin-panel/`
- Move all React dashboard frontend files into `/dashboard/`
Ensure all inter-folder imports are updated to reflect the new structure.
```

New Folder Tree:

```
telegram-signal-copier/
├── desktop-app/
├── admin-panel/
├── dashboard/
├── shared/
└── deployment/
```

---

## 🧠 Phase 1: Upgrade SignalOS Desktop App

### 🔁 Prompt 1.1 — Implement AI Smart Retry System

```prompt
In `/desktop-app/retry_engine.py`, build a class `SmartRetryExecutor` that:
- Buffers incoming trades in a queue
- On MT5 disconnection or execution failure, retries up to N times
- Before retrying, rechecks:
  - Spread (from MT5 API)
  - Slippage threshold (user-defined)
- Retry window and max attempts should be configurable via `config.json`
- Log all retry attempts in `retry_log.txt`
```

### 📲 Prompt 1.2 — Implement Telegram Copilot Bot (User Assistant)

```prompt
In `/desktop-app/copilot_bot.py`, create a Telegram bot that supports:
- /status → Returns current MT5 status, parser version
- /trades → Returns latest 3 trades executed
- /replay <channel> → Replays last signal from specified channel
- /disable <pair> → Blacklists that pair
- /stealth on|off → Toggles shadow mode
Use python-telegram-bot or Telethon. Bot token should be pulled from `env.json`
```

### 🧪 Prompt 1.3 — Add Real-Time Error Notification via Telegram Bot

```prompt
Modify `copilot_bot.py` to:
- Send an alert message if:
  - MT5 disconnects
  - A signal can't be parsed (parser throws Exception)
  - Strategy logic is invalid (missing SL, wrong lot size)
- Use inline buttons for YES/NO on retrying trades
- Include signal summary in the message with timestamp
```

### 🧠 Prompt 1.4 — Auto Sync Engine

```prompt
In `/desktop-app/auto_sync.py`:
- Pull updated strategy JSON from admin API every 60 seconds
- Push MT5 connection status, parser health, error count to cloud API
- Auto-fetch updated symbol mapping, stealth config, lot settings
- Log sync attempts with timestamps
```

---

## 🧩 Phase 2: Build Modular Smart Strategy Blocks

### 🎯 Prompt 2.1 — Drag & Drop Strategy Editor (User Dashboard)

```prompt
In `/dashboard/components/StrategyBuilder.tsx`:
- Use React Flow or React DnD to let users visually link logic blocks
- Allow creation of IF/THEN rules like:
  [IF Confidence < 70%] → [Skip Trade]
  [IF TP1 Hit] → [Move SL to Entry]
- Convert block configuration to structured JSON
- Send JSON to backend via `/api/strategy/update` endpoint
```

### 🔄 Prompt 2.2 — Strategy Execution Runtime Parser

```prompt
In `/desktop-app/strategy_runtime.py`, create:
- Class `StrategyEngine`
- Accepts parsed signal JSON + user strategy JSON
- Executes logic based on visual rule structure
- Supports logic chaining (e.g. TP1 → SL Move → TP2 → Exit)
- Return modified signal payload for trade execution
```

---

## 🛠 Phase 3: Admin Panel Enhancements

### 📊 Prompt 3.1 — Live Terminal Status Dashboard

```prompt
In `/admin-panel/routes/terminal.ts`, create:
- GET `/api/terminals` — Returns list of all active terminals
- Data includes:
  - Last ping
  - MT5 account ID
  - Stealth mode status
  - Retry queue size
Render results in Admin Dashboard `/dashboard/Terminals.tsx`
```

### 🧠 Prompt 3.2 — Parser Version Push

```prompt
In `/admin-panel/routes/parser.ts`, add:
- POST `/api/parser/push` — Accepts new parser file version
- Store uploaded file
- Trigger WebSocket broadcast to all online desktops to update parser
- Log file hash + deploy timestamp in DB
```

---

## 🔐 Phase 4: Web Dashboard Improvements

### 🧩 Prompt 4.1 — Strategy Config Import/Export

```prompt
In `/dashboard/pages/Strategy.tsx`:
- Add buttons to:
  - Export strategy as JSON file
  - Import strategy JSON via file upload
- Validate and show preview of imported logic
- Push to `/api/strategy/import` endpoint
```

### 🧪 Prompt 4.2 — Signal Replay Button

```prompt
In `/dashboard/pages/Signals.tsx`:
- Add a replay button next to each signal entry
- On click, send `/api/signal/replay` with signal_id
- Desktop app should pick up and re-execute signal
```

---

## 🏁 Final Cleanup

### 🧹 Prompt 5.1 — Environment Variable Standardization

```prompt
Standardize all config values into `env.json` or `.env`
- MT5 path
- Telegram token
- API base URL
- Admin credentials
Load into all services on boot
```

### 🔒 Prompt 5.2 — Secure Sync Auth

```prompt
Ensure all sync actions between desktop and admin panel use:
- Auth headers with HMAC or JWT tokens
- Timestamped requests
- Per-user API keys from database
```

---

This guide ensures that SignalOS evolves into a **modular**, **AI-enhanced**, and **developer-maintainable** platform, while giving Replit Agent clear instructions that prevent missed tasks or broken logic.

