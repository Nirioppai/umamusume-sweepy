# Structure

## Directory Layout

```
umamusume-sweepy/
├── main.py                    # FastAPI server, Frida injection, all API routes (~1,642 lines)
├── requirements.txt           # Python dependencies
├── package.json               # Node.js deps (steam-user for ticket generation)
├── package-lock.json
├── settings.json              # Runtime config: credentials, presets, master DB path
├── README.md
│
├── uma_api/                   # Game API client
│   └── client.py              # UmaClient class: encryption, auth, HTTP (~911 lines)
│
├── career_bot/                # Automation decision engine
│   ├── runner.py              # CareerRunner: main loop, error recovery (~1,195 lines)
│   ├── delay.py               # DNA delay simulation (lognormal profiles, ~189 lines)
│   ├── master_data.py         # SQLite master.mdb reader, generates JSON data files
│   ├── presets.py             # PresetStore: JSON preset read/write
│   ├── report.py              # JSON report generation
│   └── scenarios/
│       ├── base.py            # Abstract base strategy class
│       └── mant.py            # MantStrategy: scenario 4 decision logic (~350+ lines)
│
├── data/                      # Game master data (generated from master.mdb)
│   ├── chara_list.json        # Character definitions
│   ├── support_list.json      # Support card definitions
│   ├── skill_list.json        # Skill definitions
│   └── *.json                 # Other game data files
│
├── scripts/                   # Utility scripts
│   └── generate_master_data.py  # One-time data generation from SQLite
│
├── public/                    # Frontend web UI
│   ├── index.html             # Single-page app entry
│   ├── *.js                   # Frontend JavaScript
│   └── *.css                  # Styles
│
└── uma_runtime/               # Runtime output (gitignored, created at runtime)
    ├── bot_logs/              # Career JSON reports
    ├── trace_logs/            # API payload JSONL traces
    └── presets/               # User preset JSON files
```

## Module Organization

- **`main.py`** owns all HTTP routing and global state — acts as the application shell
- **`uma_api/`** is a standalone package with no dependencies on `career_bot/`
- **`career_bot/`** depends on `uma_api/` for game API calls; `runner.py` orchestrates all sub-modules
- **`career_bot/scenarios/`** implements the strategy pattern — `base.py` defines the interface, `mant.py` is the only implementation
- **`data/`** is pre-generated static data; updated by running `scripts/generate_master_data.py`
- **`public/`** is served verbatim as static files by FastAPI

## Entry Points

1. **Server start:** `python main.py`
   - Checks Python dependencies (`pip install -r requirements.txt`)
   - Generates master data if stale
   - Launches Uma Musume game via Steam (`steam://rungameid/3224770`)
   - Injects Frida script to capture credentials
   - Starts uvicorn on `127.0.0.1:1616`

2. **Key API endpoints:**
   - `POST /api/login` — authenticate and capture game credentials
   - `POST /api/career/start` — configure a career run
   - `POST /api/career/run` — start automation loop (background thread)
   - `POST /api/career/runner/stop` — stop automation
   - `GET /api/session` — check login state
   - `GET/POST /api/presets` — manage presets
   - `POST /api/master-data/path` — configure master DB path

3. **Data generation:** `python scripts/generate_master_data.py`

## File Conventions

- **Python files:** snake_case filenames, PascalCase class names, snake_case functions/variables
- **Constants:** UPPER_SNAKE_CASE at module level
- **Pydantic models:** Named with `Request`/`Response` suffix, defined near their endpoint in `main.py`
- **Runtime outputs:** Written to `uma_runtime/` (not committed)
- **Config persistence:** `settings.json` in project root — read/written by `main.py` at runtime
- **No `__init__.py` convention:** Packages import directly without re-exporting
