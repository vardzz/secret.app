# CLAUDE.md — Operating Instructions for AI Agents Working on "Secret"

> **Read this file in full before touching any code, in every session, before every task.**
> This file is the operating contract. `PLAN.md` is the architecture contract. If the two ever conflict, stop and flag it — do not guess.

---

## 0. Read Order (mandatory, every session)

1. `CLAUDE.md` (this file) — how to work
2. `PLAN.md` — what to build (architecture, schema, phases, module specs)
3. `AGENTS.md` — who you are for this task: the specialist persona, ownership boundary, and numbered clean-code rules for the role you're operating as
4. Current phase status (see §4) — where we are right now
5. Only then: open the relevant source files

Do not skip straight to a task prompt and start editing files. If any of the files above are missing or contradict each other, stop and report the conflict instead of proceeding on assumption.

---

## 1. Project Snapshot

- **Name:** Secret
- **Type:** Offline, single-user, encrypted desktop application
- **Stack:** Tauri (Rust core) or Electron · React/Next.js + TypeScript · Tailwind CSS · SQLCipher (SQLite + AES-256) · Argon2id
- **Full spec:** `PLAN.md` (14 sections, including a Threat Model §2, Security Architecture §9, Reliability & Data Integrity §10, and Supply Chain & Build Security §11) is authoritative for architecture, schema, and phase scope. This file governs _how_ you work, not _what_ to build.

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
8. **Parameterized queries only, always.** No string-concatenated SQL, anywhere. If a task involves dynamic table/column names (Data Workspace imports), sanitize/whitelist identifiers per `PLAN.md` §9.8 — never pass a user-supplied filename or header straight into DDL.
9. **Constant-time comparison for anything key- or password-hash-related.** Never a plain `==` on derived key material or password hashes (`PLAN.md` §9.1).

If a task conflicts with any rule above, do not silently comply and do not silently skip it — stop and surface the conflict before writing code.

---

## 3. Workflow Protocol (every task, in order)

1. **Restate the task** in your own words in 1–3 sentences before starting, including which module/file(s) it touches and which agent boundary (§5) it falls under.
2. **Check `PLAN.md`** for the relevant module/schema section. If the task requires a schema change, update Section 8 of `PLAN.md` in the _same_ change — never let code and PLAN.md drift.
3. **Check existing patterns** in the codebase before introducing a new one (e.g. don't hand-roll a new IPC pattern if one already exists).
4. **Implement** within your agent boundary (§5). If the task requires crossing a boundary (e.g. a Frontend task needs a new IPC command), implement the core-side command as a small, explicitly-labeled sub-task and say so.
5. **Self-check against §2 and §6** before declaring done.
6. **Report back** with: what changed, files touched, whether `PLAN.md` was updated, and which Definition of Done items (§6) were verified.

Do not mark a task complete without walking through step 6.

---

## 4. Phase Discipline

Work proceeds in the five phases defined in `PLAN.md` §12:

| Phase | Focus                                  |
| ----- | -------------------------------------- |
| 1     | Core Auth & Encryption Engine          |
| 2     | Vault & Smart Generator                |
| 3     | Notes & Tasks Modules                  |
| 4     | Finance, Data Workspace & Activity Log |
| 5     | UI Polish & Backup/Export Engine       |

- Do not start work belonging to a later phase until the current phase's exit criteria (stated in `PLAN.md` §12) are met, unless explicitly instructed otherwise.
- If a task prompt asks for something from a later phase out of order, flag it, then proceed only if the person confirms.
- When a phase's exit criteria are satisfied, state clearly that the phase is complete and name the next phase.

---

## 5. Agent Role Boundaries

Full persona detail, philosophy, and instinctive review checklists for each agent live in `AGENTS.md` — read it before working as any of these roles. This section is the quick-reference summary; `AGENTS.md` is authoritative if the two ever diverge.

Every task belongs to exactly one of these roles. Identify which one you're operating as before writing code.

- **`@UIUX-Agent`** — design system, information architecture, interaction patterns. Never writes implementation code.
- **`@Frontend-Agent`** — `src/components/`, `src/state/`, `src/lib/`, Tailwind implementation, IPC client. Never accesses SQLCipher directly or handles raw key material — IPC client only.
- **`@Backend-Agent`** — `src-core/db/`, `src-core/ipc/`, `src-core/import/`, migrations, repositories, indexing. Any schema change requires updating `PLAN.md` §8 in the same change, and migrations must follow the snapshot-first rule in `PLAN.md` §10.1.
- **`@Security-Agent`** — `src-core/auth/`, `src-core/backup/`, key derivation, session lifecycle, backup encryption. No UI work, and sole reviewer on any change touching key material regardless of who wrote it.
- **`@DevOps-Agent`** — dependencies, CI/audit config, build scripts, code signing/release (deferred, `PLAN.md` §11.3), backup/snapshot infrastructure.
- **`@QA-Agent`** — test strategy, edge cases (empty vault, max-length passwords, lock during write, corrupted backup import, malicious CSV headers, restart during lockout), phase-exit sign-off (`PLAN.md` §12), Definition of Done verification.

If a task doesn't cleanly fit one role, say so and propose which role should own it rather than blending responsibilities silently. For cross-boundary tasks, use the handoff format defined in `AGENTS.md` §8.

---

## 6. Definition of Done (checklist before any task is reported complete)

- [ ] No plaintext secret appears in logs, error messages, or crash output
- [ ] New sensitive-data mutations have a matching `activity_logs` entry
- [ ] No new runtime network call introduced
- [ ] TypeScript strict mode passes; no `any` on files touching credential/key data
- [ ] `PLAN.md` updated in the same change if architecture, schema, or phase scope changed
- [ ] Change stays within the declared agent boundary (§5), or crossing it was explicitly flagged

---

## 7. Coding Standards

- **TypeScript:** strict mode, no implicit `any`, no `@ts-ignore` without an inline justification comment.
- **Rust (if Tauri):** no `unwrap()` on anything touching key material or DB I/O — handle errors explicitly.
- **Commits:** one logical change per commit; message states which module and which phase.
- **Comments referencing clean-code rules:** `AGENTS.md` §1 defines the numbered engineering rules (1–25) shared by every agent. Cite the rule number in the commit or PR description when a change specifically exists to satisfy one (e.g. "Rule 8" for a parameterized-query fix).
- **No dead code, no commented-out blocks left behind** — remove or don't commit.
- **UI is restricted to the two-color obsidian/bone system** per `PLAN.md` §5; never introduce a third color or a light-mode variant. No component ships a raw hex value — always reference the `--color-obsidian` / `--color-bone` tokens.

---

## 8. What to Do When Uncertain

- **Ambiguous requirement:** pick the most conservative, most secure interpretation, state the assumption explicitly, and proceed — don't block on it unless it's a security-rule conflict (§2).
- **Conflict between a task prompt and `PLAN.md` or this file:** stop, state the conflict plainly, do not proceed until it's resolved.
- **Missing context (e.g. no migration file for a table `PLAN.md` describes):** flag the gap, propose the fix, then proceed.

---

## 9. Explicitly Out of Scope (do not implement unless `PLAN.md` is updated first)

- Cloud sync, multi-device support, or any server component
- Multi-user accounts or sharing features
- Telemetry, crash reporting to a remote service, or usage analytics
- Auto-update mechanisms that phone home
- Any third color, or a light-mode variant, beyond the obsidian/bone system in `PLAN.md` §5
- A hard vault wipe/self-destruct after N failed unlock attempts, unless the user explicitly opts in (`PLAN.md` §9.4) — there is no recovery path, so this is a data-loss risk, not just a security feature
- Code signing, notarization, or public-release build pipeline work (`PLAN.md` §11.3) unless explicitly requested — deferred while single-user

---

## 10. Quick Reference

- Architecture, schema, module specs, phases → `PLAN.md`
- How to work, security rules, agent boundaries, done-checklist → this file
- Who you are, specialist depth, numbered clean-code rules, handoff protocol → `AGENTS.md`
