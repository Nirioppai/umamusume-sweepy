# Conventions

## Code Style
- **Indentation:** 4 spaces (consistent throughout)
- **Quote style:** Mixed — double quotes for docstrings/multi-line strings, single quotes for simple string literals
- **Line length:** No enforced limit; long function signatures span multiple lines
- **No formatter config** (.prettierrc, .black, etc.) detected

## Naming Conventions
- **Functions & variables:** `snake_case` exclusively (e.g. `normalize_turn_delay`, `active_client`, `turn_delay_min_sec`)
- **Private methods:** Underscore prefix (e.g. `_init_trace_log`, `_debug`)
- **Classes:** `PascalCase` (e.g. `CareerRunner`, `UmaClient`, `LoginRequest`, `StateRecoveryError`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g. `PROCESS_NAME`, `BASE_URL`, `GLOBAL_DELAYS_DISABLED`)
- **Pydantic models:** `PascalCase` with descriptive suffixes (`Request`, `Response`)

## Module Patterns
- **Import order:** stdlib → third-party → local (not alphabetically sorted within groups)
- **No `__all__` exports** observed
- **Relative imports:** Not used; all local imports are absolute from package root
- Example:
  ```python
  import os, json, re, subprocess, sys          # stdlib
  from fastapi import FastAPI, HTTPException     # third-party
  from career_bot import master_data            # local
  ```

## Error Handling
- **Custom exceptions:** Defined for domain-specific errors (e.g. `StateRecoveryError(Exception)`)
- **Broad catching common:** `except Exception: pass` pattern appears in several places
- **Conditional re-raise:** Error codes checked in exception strings (`"102" in str(exc)`)
- **Defensive dict access:** `.get()` used consistently; nested: `(state.get("data") or {}).get("chara_info") or {}`
- **API validation:** FastAPI `HTTPException` raised for invalid request states
- No centralized error handling middleware

## Comments & Documentation
- **Docstrings:** Minimal to absent — most functions lack them
- **Inline comments:** Primary documentation style (`# API error handling logic`)
- **Logging:** Heavy use of `print(..., flush=True)` instead of a proper logging framework
- **Type hints:** Present in Pydantic `BaseModel` fields; sparse elsewhere; uses Python 3.9+ syntax (`list[int]`)
