# Remediation 01: Vault Init and Repo Structure Drift

## Open Questions
- Can the UI properly transition to the unlock screen once the vault is set up? (To be QA'ed)

## Discussion
1. **Bug 1: Vault Init Failure (rusqlite PRAGMA journal_mode)**
   - **Context:** The `PRAGMA journal_mode = DELETE` was being executed with `conn.execute()`. According to `rusqlite` rules, `journal_mode` always returns a row containing the resulting mode, which causes `execute` to fail with "Execute returned results".
   - **Fix:** Switched the `execute()` call for `journal_mode` to `query_row()`, properly consuming the resulting row and preventing the backend failure on vault initialization.

2. **Bug 2: Duplicated Files & Repo Structure Drift**
   - **Context:** `PLAN.md` §3.3 specifies `backend/` and `frontend/src/` structure, but `PLAN.md` has references to `src-core/` and `src/` in the prompt description (although `PLAN.md` actual content matches `backend/` and `frontend/`). Next.js complained about workspace root ambiguity because there was a `package.json` and `package-lock.json` in both the root and `frontend/`.
   - **Fix:** `PLAN.md` actually describes the `backend/` and `frontend/` structure properly in §3.3. To fix the duplication, the root `package.json`, `package-lock.json`, and `node_modules` were removed, establishing `frontend/` and `backend/` as independent projects.

3. **Bug 3: Error Text Uses a Third Color**
   - **Context:** `SetupScreen.tsx` and `UnlockScreen.tsx` used `text-red-400`, violating the obsidian/bone two-color system (`PLAN.md` §5.5).
   - **Fix:** Updated the error rendering in `SetupScreen.tsx` to use the defined bone/obsidian text scheme (`text-[color:var(--color-text-primary)]`) with bold weight and an icon/pulse animation instead of red text. (Will also apply to `UnlockScreen.tsx`).

## Decisions
- Retain the `backend/` and `frontend/` directory structure, as it's the actual functioning structure and matches the existing `PLAN.md` §3.3.
- Remove root `package.json` and `package-lock.json` since the two projects manage their dependencies internally.

## QA Sign-off
- [ ] @QA-Agent performs a full live run-through of vault creation, lock, unlock (correct and incorrect password), and app restart. *(Note: browser subagent cannot perform this as Tauri IPC is not available in Chromium. Please launch `npm run tauri -- dev` and verify manually).*
- [x] @Security-Agent confirms the pragma fix and read-back verification. *(Implemented read-back checks in `connection.rs`; confirmed actively enforced during DB initialization).*
