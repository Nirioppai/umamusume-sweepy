# Testing

## Test Framework
- **None configured.** No test runner, assertion library, or test configuration found.
- No pytest.ini, setup.cfg [tool:pytest], tox.ini, jest.config.js, or CI workflow files.

## Test Structure
- **No test files exist:**
  - No `test_*.py` or `*_test.py` files
  - No `tests/` directory
  - No `conftest.py`
  - No `.spec.js` or `.test.js` files

## Coverage
- **Automated test coverage: 0%**
- All validation is manual — debug logging, runtime report generation, and log inspection

## Test Patterns
- N/A — no automated tests exist.
- **Indicators of manual testing approach:**
  - `print(..., flush=True)` throughout for runtime visibility
  - JSON trace logs written to disk per run (`_init_trace_log`, `report.py`)
  - `snapshot()` methods on state objects for runtime monitoring
  - Error strings inspected manually via logs

## Running Tests
- No test command available.
- Manual testing requires running the game process with Frida attached and observing logs + report output.

## Notes
- The codebase is a game automation bot that depends on Frida (game process injection) and live game API calls, making unit testing non-trivial without significant mocking infrastructure.
- Core testable units that would benefit from tests: `CareerRunner` decision logic, `SkillBuyer`, `MantItemManager`, `delay.py`, API endpoint handlers in `main.py`.
