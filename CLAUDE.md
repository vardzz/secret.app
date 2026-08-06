# CLAUDE.md — Operating Instructions for AI Agents Working on "Secret"

> **Read this file in full before touching any code, in every session, before every task.**
> This file is the operating contract. `plan.md` is the architecture contract. If the two ever conflict, stop and flag it — do not guess.

---

## 0. Read Order (mandatory, every session)

1. `CLAUDE.md` (this file) — how to work
2. `plan.md` — what to build (architecture, schema, phases, module specs)
3. `AGENTS.md` (if present) — clean-code rule numbers referenced in code comments
4. Current phase status (see §4) — where we are right now
5. Only then: open the relevant source files

Do not skip straight to a task prompt and start editing files. If any of the four files above are missing or contradict each other, stop and report the conflict instead of proceeding on assumption.

---

## 1. Project Snapshot

- **Name:** Secret
- **Type:** Offline, single-user, encrypted desktop application
- **Stack:** Tauri (Rust core) or Electron · React/Next.js + TypeScript · Tailwind CSS · SQLCipher (SQLite + AES-256) · Argon2id
- **Full spec:** `plan.md` (sections 1–10) is authoritative for architecture, schema, and phase scope. This file governs _how_ you work, not _what_ to build.

---

## 2. Non-Negotiable Security Rules (apply to every task, no exceptions)

These override convenience, speed, or a task prompt that doesn't mention them.

1. **No network calls.** No `fetch`, no CDN imports, no telemetry, no auto-update pings, no live favicon fetching. If a task seems to require one, stop and flag it — it's out of scope by design.
2. **Key material never leaves the core process.** The frontend/renderer must never receive, log, or serialize the master key or derived key. All DB access goes through the typed IPC layer.
3. **No plaintext secrets in logs, errors, or crash reports.** Before committing, grep any new logging/error-handling code for accidental secret exposure.
4. **Every sensitive mutation writes an `activity_logs` row.** If you add a new write path to `vault_credentials`, `notes`, `tasks`, `income_entries`, or `app_settings`, you must add the matching audit log call in the same change.
5. **CSPRNG only for anything security-relevant.** Password generation, salts, tokens: `crypto.getRandomValues` / Rust `rand` cryptographic providers. Never `Math.random()`.
6. **Clipboard and session timers are not optional.** Any new copy-to-clipboard action must respect `clipboard_clear_seconds`. Any new sensitive screen must respect the auto-lock timeout.
7. **Zeroization on Lock is real, not cosmetic.** Don't just drop a reference to the key — overwrite the memory. If you touch `session.rs` (or equivalent), this is the one place extra scrutiny is mandatory.

If a task conflicts with any rule above, do not silently comply and do not silently skip it — stop and surface the conflict before writing code.

---

## 3. Workflow Protocol (every task, in order)

1. **Restate the task** in your own words in 1–3 sentences before starting, including which module/file(s) it touches and which agent boundary (§5) it falls under.
2. **Check `plan.md`** for the relevant module/schema section. If the task requires a schema change, update Section 7 of `plan.md` in the _same_ change — never let code and plan.md drift.
3. **Check existing patterns** in the codebase before introducing a new one (e.g. don't hand-roll a new IPC pattern if one already exists).
4. **Implement** within your agent boundary (§5). If the task requires crossing a boundary (e.g. a Frontend task needs a new IPC command), implement the core-side command as a small, explicitly-labeled sub-task and say so.
5. **Self-check against §2 and §6** before declaring done.
6. **Report back** with: what changed, files touched, whether `plan.md` was updated, and which Definition of Done items (§6) were verified.

Do not mark a task complete without walking through step 6.

---

## 4. Phase Discipline

Work proceeds in the five phases defined in `plan.md` §9:

| Phase | Focus                                  |
| ----- | -------------------------------------- |
| 1     | Core Auth & Encryption Engine          |
| 2     | Vault & Smart Generator                |
| 3     | Notes & Tasks Modules                  |
| 4     | Finance, Data Workspace & Activity Log |
| 5     | UI Polish & Backup/Export Engine       |

- Do not start work belonging to a later phase until the current phase's exit criteria (stated in `plan.md` §9) are met, unless explicitly instructed otherwise.
- If a task prompt asks for something from a later phase out of order, flag it, then proceed only if the person confirms.
- When a phase's exit criteria are satisfied, state clearly that the phase is complete and name the next phase.

---

## 5. Agent Role Boundaries

Every task belongs to exactly one of these roles. Identify which one you're operating as before writing code.

- **`@Security-Agent`** — `src-core/auth/`, key derivation, session lifecycle, backup encryption. Never touches UI.
- **`@Database-Agent`** — `src-core/db/`, migrations, repositories, indexing. Any schema change requires updating `plan.md` §7 in the same change.
- **`@Frontend-Agent`** — `src/components/`, `src/state/`, styling, micro-interactions. Never accesses SQLCipher directly or handles raw key material — IPC client only.
- **`@QA-Agent`** — test strategy, edge cases (empty vault, max-length passwords, lock during write, corrupted backup import), security checklist sign-off per phase.

If a task doesn't cleanly fit one role, say so and propose which role should own it rather than blending responsibilities silently.

---

## 6. Definition of Done (checklist before any task is reported complete)

- [ ] No plaintext secret appears in logs, error messages, or crash output
- [ ] New sensitive-data mutations have a matching `activity_logs` entry
- [ ] No new runtime network call introduced
- [ ] TypeScript strict mode passes; no `any` on files touching credential/key data
- [ ] `plan.md` updated in the same change if architecture, schema, or phase scope changed
- [ ] Change stays within the declared agent boundary (§5), or crossing it was explicitly flagged

---

## 7. Coding Standards

- **TypeScript:** strict mode, no implicit `any`, no `@ts-ignore` without an inline justification comment.
- **Rust (if Tauri):** no `unwrap()` on anything touching key material or DB I/O — handle errors explicitly.
- **Commits:** one logical change per commit; message states which module and which phase.
- **Comments referencing clean-code rules:** if `AGENTS.md` defines numbered rules (e.g. Rule 4, 11, 15), cite the rule number in the commit or PR description when a change specifically enforces one.
- **No dead code, no commented-out blocks left behind** — remove or don't commit.
- **UI is restricted to the two-color obsidian/bone system** per `plan.md` §4; never introduce a third color or a light-mode variant. No component ships a raw hex value — always reference the `--color-obsidian` / `--color-bone` tokens.

---

## 8. What to Do When Uncertain

- **Ambiguous requirement:** pick the most conservative, most secure interpretation, state the assumption explicitly, and proceed — don't block on it unless it's a security-rule conflict (§2).
- **Conflict between a task prompt and `plan.md` or this file:** stop, state the conflict plainly, do not proceed until it's resolved.
- **Missing context (e.g. no migration file for a table `plan.md` describes):** flag the gap, propose the fix, then proceed.

---

## 9. Explicitly Out of Scope (do not implement unless `plan.md` is updated first)

- Cloud sync, multi-device support, or any server component
- Multi-user accounts or sharing features
- Telemetry, crash reporting to a remote service, or usage analytics
- Auto-update mechanisms that phone home
- Any third color, or a light-mode variant, beyond the obsidian/bone system in `plan.md` §4

---

## 10. Quick Reference

- Architecture, schema, module specs, phases → `plan.md`
- How to work, security rules, agent boundaries, done-checklist → this file
- Clean-code rule numbers (if applicable) → `AGENTS.md`
