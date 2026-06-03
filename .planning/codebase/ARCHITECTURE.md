# Architecture

## Overview
Umamusume-sweepy is a game automation bot for Uma Musume Pretty Derby that uses Frida process injection to intercept TLS credentials, then drives gameplay via a reverse-engineered REST API. It exposes a local FastAPI web server (port 1616) with a frontend UI for configuration and control.

## System Design

### Core Components

**FastAPI Web Server (`main.py`, ~1,642 lines)**
- Entry point and orchestration hub
- Manages global session state (`active_client`, `active_account`, `active_dashboard_data`)
- Injects Frida JavaScript into the game process to capture auth credentials via TLS hooking
- Spawns and manages the background `CareerRunner` thread
- Serves the frontend UI as static files

**UMA API Client (`uma_api/client.py`, ~911 lines)**
- Handles encrypted communication with Cygames servers
- AES-128-CBC encryption + msgpack serialization
- Steam authentication via Node.js subprocess (`ticket_gen.js`)
- Device fingerprint spoofing (reads Windows Registry for GPU, HWID, BIOS)
- JA3/TLS fingerprint spoofing via `curl_cffi`
- Statistical delay simulation (`career_bot/delay.py`) to mimic human behavior

**Career Runner (`career_bot/runner.py`, ~1,195 lines)**
- Multi-threaded automation engine running in background
- Decision loop: drain events → strategy decides action → execute API call
- Coordinates `MantStrategy`, `RacePlanner`, `SkillBuyer`, `MantItemManager`
- Error recovery and state reconciliation on API failures
- Writes JSON reports to `uma_runtime/bot_logs/`

**Scenario Strategy (`career_bot/scenarios/mant.py`, ~350+ lines)**
- Decision tree for training command scoring
- Event choice resolution via outcome database lookup
- Race selection via `RacePlanner`
- Bad status cure logic

**Delay Module (`career_bot/delay.py`, ~189 lines)**
- Per-installation DNA seed for deterministic random delays
- Lognormal distribution delay profiles per API endpoint
- Distraction probability for longer random delays

## Data Flow

```
User opens frontend UI
    ↓
POST /api/login → Launch game via Steam subprocess
    ↓
Frida injects JS → Hooks TLS interface in GameAssembly.dll
    ↓
Game makes API call → TLS hook captures viewer_id, auth_key, UDID
    ↓
Credentials saved to settings.json + UmaClient instantiated
    ↓
POST /api/career/start → Validate deck selection, build StartCareerRequest
    ↓
POST /api/career/run → Spawn CareerRunner background thread
    ↓
CareerRunner loop (max 77 turns):
  1. Drain pending events (pick best outcome from event DB)
  2. MantStrategy: score commands/races, decide action
  3. Execute action via UmaClient (AES encrypt → HTTP → AES decrypt)
  4. Handle skill/item buying based on preset
  5. Log turn to report
    ↓
Career ends → JSON report written to uma_runtime/bot_logs/
```

## Key Design Decisions

- **Monolithic `main.py`:** All FastAPI routes, global state, Frida injection, and startup in one file. Convenient but hinders testability and maintainability.
- **Thread-based concurrency:** Single background thread for career loop with `backend_loop_stop` flag for cancellation (no async/await, no proper synchronization primitives).
- **Frida for credential capture:** Avoids need to reimplement Steam auth entirely; captures credentials at the TLS layer after the game authenticates.
- **Node.js subprocess for Steam tickets:** Python can't easily generate Steam session tickets; delegates to `steam-user` npm package.
- **Statistical delay simulation:** Mimics human API timing per-endpoint to reduce bot detection risk.
- **Scenario 4 (Mant) only:** Strategy is hardcoded for a specific game scenario; other scenarios would need new strategy implementations.
- **Local-only web server:** All API endpoints bound to `127.0.0.1` — security by obscurity rather than authentication.
