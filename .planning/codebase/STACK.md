# Technology Stack

**Analysis Date:** 2026-06-03

## Languages

**Primary:**
- Python 3 - Backend server, API logic, game automation (`main.py`, `uma_api/`, `career_bot/`)
- JavaScript (Node.js) - Steam ticket generation, embedded inline in `uma_api/client.py` as `TICKET_GEN_JS`
- JavaScript (Browser) - Frontend UI (`public/app.js`, `public/index.html`)
- Frida JS (injected) - TLS hook script injected into game process at runtime, defined inline in `main.py` as `JS_CODE`

**Secondary:**
- CSS - Frontend styling (`public/styles.css`)

## Runtime

**Environment:**
- Python 3 (standard library: `os`, `json`, `re`, `subprocess`, `threading`, `pathlib`, `sqlite3`, `struct`, `hashlib`, `socket`, `shutil`, `ctypes`)
- Node.js - Invoked as subprocess for Steam ticket generation via `steam-user` npm package

**Platform:**
- Windows only (enforced explicitly in `uma_api/client.py` for GPU detection; Steam launch and console window manipulation use Windows-specific APIs)

**Package Manager:**
- pip (Python) — `requirements.txt` present, no lockfile
- npm (Node.js) — `package.json` + `package-lock.json` present

## Frameworks & Libraries

**Core (Python):**
- `fastapi==0.136.1` — REST API server, serves both the backend API and static frontend files
- `uvicorn==0.18.2` — ASGI server, runs FastAPI on `127.0.0.1:1616`
- `pydantic==2.13.4` — Request/response model validation (used throughout `main.py` for all API request models)

**Automation & Reverse Engineering:**
- `frida==17.9.1` — Dynamic instrumentation; injects JS into `UmamusumePrettyDerby.exe` to intercept TLS traffic and capture auth credentials
- `curl_cffi==0.7.4` — HTTP client with browser TLS fingerprint impersonation; used in `uma_api/client.py` for all game API calls

**Cryptography & Data:**
- `pycryptodome==3.14.1` — AES-CBC encryption/decryption for game API request/response payloads (`uma_api/client.py`)
- `msgpack==1.1.0` — Binary serialization format used by the game's API wire protocol
- `Requests==2.33.1` — HTTP library (present in requirements; secondary to `curl_cffi`)

**Frontend (Node.js):**
- `steam-user==^5.0.0` — Steam client library used to generate session tickets for game authentication

## Build & Tooling

**Start command:**
```bash
python main.py
```
(Also listed as `npm start` in `package.json`, which runs `python main.py`)

**Auto-install:** `main.py` runs `pip install -r requirements.txt` on startup via subprocess.

**Git auto-update:** `main.py` runs `git pull` on startup before serving.

**No build pipeline** — frontend is plain HTML/CSS/JS served directly from `public/` as static files via FastAPI's `StaticFiles` and custom route handlers.

## Dev Dependencies

No separate dev dependencies declared. No test framework, no linter config, no formatter config detected.

## Data Files

Local JSON data files used at runtime (not generated, committed to repo):
- `data/chara_list.json` — character name map
- `data/support_list.json` — support card metadata
- `data/skill_data.json` — skill definitions
- `data/factor_map.json` — factor/gene definitions
- `data/race_map.json` — race grade/metadata
- `data/event_outcomes.json` — event decision data
- `data/presets/` — user preset JSON files (read/written at runtime)

Local SQLite data (user-provided, not committed):
- `master.mdb` — Cygames' game master database, read from `%LOCALAPPDATA%\..\LocalLow\Cygames\Umamusume\master\master.mdb`; parsed by `career_bot/master_data.py` using `sqlite3`

---

*Stack analysis: 2026-06-03*
