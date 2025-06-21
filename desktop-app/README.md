# Desktop App Components

This directory contains all desktop application components that were moved from the root directory during the project structure refactoring.

## Contents Moved Here

- `core/` - AI processing modules (parser, OCR, Telegram listener, MT5 bridge)
- `mt5_ea/` - MetaTrader 5 Expert Advisor files
- `start.py` & `start_enhanced.py` - System launcher scripts
- `run_all.sh` & `test_signal.sh` - Shell utilities

## Integration

These desktop components work alongside the web-based admin panel and dashboard to provide:

- Local signal processing
- MT5 trade execution
- Telegram monitoring
- OCR image processing
- Enhanced system launchers with dependency management