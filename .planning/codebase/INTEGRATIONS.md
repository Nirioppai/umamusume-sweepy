# External Integrations

**Analysis Date:** 2026-06-03

## APIs & External Services

**Umamusume Game API (Cygames):**
- Base URL: `https://api.games.umamusume.com/umamusume/` (defined as `BASE_URL` in `uma_api/client.py`)
- Protocol: Custom binary wire format — HTTP POST with AES-CBC encrypted msgpack payloads encoded as Base64
- Auth: Per-request headers including `ViewerID`, `APP-VER`, `RES-VER`, and a rotating `auth_key` derived from UDID and viewer ID
- Client: `curl_cffi` with browser TLS fingerprint impersonation (`uma_api/client.py`)
- Key endpoints called (via `active_client.call(endpoint, payload)`):
  - `load/index` — account state/dashboard
  - `single_mode/start` — start career training run
  - `single_mode/command/[type]` — execute training commands
  - `single_mode/finish` — finish/delete career
  - `recovery_tp` — restore training points
  - `pre_single_mode` — fetch friend support cards
- No API key env var — credentials are captured live from the game process via Frida injection

**Steam API (Valve):**
- Purpose: Obtain `steam_id` and `steam_session_ticket` required for game authentication
- Integration method: Node.js subprocess using `steam-user` npm package (`uma_api/client.py`, `TICKET_GEN_JS` inline script)
- Auth: Steam username + password (optionally Steam Guard / 2FA code)
- The generated session ticket is passed as a credential to the Umamusume game login flow

## Data Storage

**Databases:**
- SQLite — Local game master database (`master.mdb`)
  - Location: `%LOCALAPPDATA%\..\LocalLow\Cygames\Umamusume\master\master.mdb` (default), configurable via `settings.json`
  - Client: Python stdlib `sqlite3`
  - Used by: `career_bot/master_data.py` — extracts skill, race, support card, and text data into local JSON files in `data/`
  - Read-only; the file is owned by the game client

**File-based storage:**
- JSON files in `data/` — runtime data store for game metadata; some are generated from `master.mdb`, some are static
- JSON files in `data/presets/` — user preset configuration files; read and written at runtime by `career_bot/presets.py`
- `settings.json` at project root — user configuration (turn delay, master.mdb path)
- Trace logs written to `uma_runtime/trace_logs/` (path controlled by `UMA_RUNTIME_DIR` env var)

**No external database, no cloud storage, no caching layer.**

## Third-Party Services

**Frida (dynamic instrumentation):**
- Used to attach to `UmamusumePrettyDerby.exe` at startup
- Injects a JavaScript hook (`JS_CODE` in `main.py`) into the game process to intercept outbound TLS traffic
- Parses raw HTTP POST bodies to extract `viewer_id`, `udid`, `auth_key`, `app_ver`, `res_ver` from game requests
- Required once per session to capture fresh auth credentials before the web server starts

**No analytics, no error tracking, no cloud auth providers, no payment processors, no CDN integrations detected.**

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `UMA_RUNTIME_DIR` | auto-detected from `.git` parent | Override directory for runtime output files (trace logs etc.) — `uma_api/client.py`, `career_bot/runner.py` |
| `SWEEPY_AUTH_CAPTURE_TIMEOUT_SEC` | `180` | Seconds to wait for Frida to capture auth credentials from the game — `main.py` |
| `LOCALAPPDATA` | Windows system var | Used to locate the default `master.mdb` path — `career_bot/master_data.py` |

No `.env` file detected. No secrets stored in environment variables — all sensitive auth data (Steam credentials, game auth tokens) is passed at runtime through the web UI or captured live from the game process.

## Webhooks & Callbacks

**Incoming:** None.

**Outgoing:** None. All communication is outbound HTTP POST to `api.games.umamusume.com`.

---

*Integration audit: 2026-06-03*
