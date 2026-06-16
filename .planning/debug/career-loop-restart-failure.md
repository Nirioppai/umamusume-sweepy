# Investigation: career loop fails to auto-restart after a finished career

**Status:** Diagnosed, not fixed (user deferred the fix on 2026-06-16)
**Reporter:** observed during a dev-mode loop run on 2026-06-16

## Symptom

With the loop toggle on, a career finishes and writes its report normally:

```
Endpoint: finish_career | Delay: 3.626s
career report written: C:\Active Codebase\umamusume-sweepy\uma_runtime\bot_logs\career_log_20260616_152312.json
```

The bot should then auto-start a new career. Instead it cycles through `load_index` /
`read_info` / `pre_single_mode` / `start_career`, gets `result_code: 205` on
`single_mode_free/start`, retries 3 times, fails, and repeats this whole sequence 3 times
total. After that it starts failing `read_info`/`pre_single_mode`/`start_career` with
`result_code: 201` (invalid session) on every call and never recovers. The next successful
run only appears in a new log file ~40 minutes later, implying the app was restarted
manually.

## Confirmed facts (verified against code + the actual report JSON)

- The career that finished did so cleanly: `uma_runtime/bot_logs/career_log_20260616_152312.json`
  shows `status: "finished"`, `error: None`, and the last turn's `single_mode_free/finish`
  API call has `result_code: 1` (success). The crash is **not** in finishing/reporting.
- The restart loop lives in `manage_career_loop()` in [main.py:1239](../../main.py#L1239).
  After a successful run it waits, refreshes account state via `load/index`, and if no
  career is active server-side, calls `start_career_from_request(req)` again
  ([main.py:1294-1320](../../main.py#L1294)) — reusing the **same** `req` object (same
  `parent_id_1`, `parent_id_2`, `friend_viewer_id`, `friend_card_id`, `card_id`,
  `support_card_ids`) that was used for the very first career in this session. Nothing
  re-validates or re-selects these between loop iterations.
- The `rc == 205` retry handler in `uma_api/client.py:618-634` assumes 205 means a stale
  `res_ver` and tries to pull `res_ver`/`required_res_ver` out of `data_headers`, or
  refresh it via a nested `load/index` call. Checked actual logged responses (success and
  error) from this run — **`res_ver` never appears in `data_headers`** for any call. This
  recovery path has never actually been able to do anything; it's dead code that just
  burns 3 retries and a `load/index` call before giving up. (Added in commit `ebc5f1d`,
  "res_ver fix" — the fix doesn't fire because the field it looks for isn't where it
  expects.)
- `self.sid` is only advanced when `result_code == 1` ([client.py:649](../../uma_api/client.py#L649)).
  During a run of consecutive failures, the client just keeps reusing the same sid.
- `client.login()` exists and is the standard recovery used elsewhere
  (`CareerRunner._fresh_career_state` in `career_bot/runner.py` calls it when an in-career
  call fails with 201/102/etc). **`manage_career_loop`'s restart-retry block never calls
  `login()` or `hard_reset()`.** It just sleeps and resends the identical request up to 5
  times ([main.py:1294-1320](../../main.py#L1294)). There is no path in this loop that can
  recover from a bad session — once `read_info`/`pre_single_mode` start returning 201, it's
  stuck until the process is restarted.

## Working hypothesis (not confirmed)

The most likely trigger for the initial 205 is that `parent_id_1`/`parent_id_2` and/or the
borrowed `friend_viewer_id`/`friend_card_id` are no longer valid for starting a new career
(e.g. a reuse/daily limit on the friend support card, or the parent itself). The loop has
no awareness of such limits and no fallback — it just keeps resending the exact same
(now-rejected) selection. This part is **not confirmed**; the 205 response body carried no
`error_code`/`message`, only `data_headers` with `result_code: 205`, so there's no direct
evidence of *why* the server rejected it.

User noted this hasn't happened before and suspects a recent game-side update may have
changed something about how `single_mode_free/start` validates the request. Not verified —
would need a known-good capture from before this started happening to confirm.

## Ruled out

- **`github.com/SweepTosher/dumper`** was suggested as a possible base for this app. Checked
  it directly: it's a Frida packet sniffer that only builds the event-outcome database
  (`outcomes.json`) by hooking `HttpHelper.DecompressResponse`/`CompressRequest`. It has
  **no session/SID management, no `result_code` handling, no `RES-VER`/`APP-VER` logic**.
  Recent commits (late May/June 2026) are UI-only ("display nrg", "show all"). It offers no
  insight into this failure — the actual session/protocol client (`uma_api/client.py`) is
  this project's own code, not derived from dumper.
- Old entries in `uma_runtime/crash_trace.txt` (2026-06-05/06) are unrelated prior crashes,
  not connected to this run — `CareerRunner._run`'s own crash handler never fired during
  this incident, since the failure happens entirely inside `manage_career_loop` in
  `main.py`, which doesn't write to that file.

## Suggested fix (deferred — not yet implemented)

1. In `manage_career_loop`'s restart-retry block ([main.py:1294-1320](../../main.py#L1294)),
   call `active_client.login()` (mirroring `_fresh_career_state`'s pattern in
   `career_bot/runner.py`) after a failed `start_career_from_request` attempt, before
   retrying — so a bad/stale session has a chance to recover instead of cascading into
   permanent 201s.
2. If `start_career_from_request` still fails after a session refresh, stop the loop
   cleanly with a clear, surfaced error (e.g. "server rejected career start — check parent/
   friend support card selection") rather than silently retrying forever.
3. Separately, the dead `res_ver` recovery code in `client.py:618-634` should either be
   fixed (find where `res_ver` actually lives in a real response, if anywhere) or removed
   — as written it can't do anything useful.

## Open questions for whoever picks this up

- Where (if anywhere) does this game's protocol actually expose a refreshed `res_ver`? Need
  a captured response that legitimately returns one to know where to look.
- Is there a way to detect "this parent/friend card is no longer usable" *before* attempting
  `start_career`, so the loop could pick a different one automatically instead of just
  failing?
- Was there a recent game-client update around 2026-06-16? Worth checking patch notes /
  comparing `APP-VER` if there's a record of what version this bot was built against.
