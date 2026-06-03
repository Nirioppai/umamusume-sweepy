# Concerns

## Technical Debt
- **`main.py` monolith:** 1642-line single file handling all FastAPI routes, global state, startup logic — needs decomposition
- **Single-scenario bottleneck:** Architecture only supports scenario 4; adding new scenarios requires significant restructuring
- **Bare `except:` clauses:** Multiple broad `except Exception: pass` blocks silently swallow errors
- **String-based error code matching:** Brittle pattern like `"102" in str(exc)` — fragile, prone to false positives
- **Hard-coded turn-77 limit:** Magic number with no explanation or configurability
- **Fuzzy suffix matching in event outcome resolution:** Unclear/fragile event matching logic

## Security Concerns
- **Credential leakage via trace files:** `steam_session_ticket` written unredacted to trace JSONL log files on disk
- **Steam password as CLI argument:** Visible in process listings/task manager
- **No authentication on local FastAPI server:** Any process on the machine can call the bot's API
- **Frida TLS interception (by design):** Captures live game credentials; unintentional leakage to logs is a risk

## Performance Concerns
- **`pip install` on every startup:** Sequential dependency install runs at launch even when packages are installed
- **Trace log file opened/closed per API call:** High I/O overhead for frequent logging
- **Stale session connections:** No connection pooling or session reuse validation

## Reliability Concerns
- **Race condition on `backend_loop_stop` bool:** Shared mutable flag modified across threads without synchronization
- **Silent `pre_single_mode` failure:** Errors swallowed without surfacing to caller
- **`_drain_events` silently drops events at limit:** Event loss without warning or logging
- **String-match error code false positives:** Error code checks like `"102" in str(exc)` can match unrelated strings
- **`rank_point` never stored from login response:** Parent rank bonuses always calculate as 0 (likely a bug)

## Maintainability Concerns
- **14+ module-level globals in `main.py`:** `active_client`, `active_dashboard_data`, `backend_loop_stop`, etc. — difficult to reason about state
- **Inline Frida JS as Python string:** JavaScript embedded as multi-line strings in Python; no syntax highlighting or validation
- **Undocumented `_parse_race_rank` with magic byte offsets:** Binary parsing with no explanation of the data format
- **Undocumented `MantStrategy`:** Purpose and behavior unclear from code alone
- **Unexplained `SALT`/`HEAD` cryptographic constants:** No documentation on origin or protocol

## Missing Features/Gaps
- **Zero test coverage:** No automated tests of any kind
- **Only scenario 4 supported:** Other Uma Musume scenarios blocked
- **No rate limiting on local API:** Bot's REST API has no throttling or abuse protection
- **Windows-only:** Hard failures on non-Windows platforms (Frida + Steam integration assumed Windows)
- **No web UI authentication:** Frontend served from FastAPI with no login gate
