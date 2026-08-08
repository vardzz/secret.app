# 🔐 SECRET — Master Project Plan (PLAN.md)

**Single-User, Offline-First, Encrypted Desktop Workspace**

> This document is the authoritative source of truth for any AI coding agent, human developer, or reviewer working on this project. Every module, schema, and phase below is binding. Do not deviate from architectural decisions in this document without explicitly flagging the change and updating this file.

---

## 0. Project Identity

| Field                 | Value                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| **Project Name**      | Secret                                                                                          |
| **Type**              | Desktop Application                                                                             |
| **Deployment Model**  | 100% Offline, Local-First, Single-User                                                          |
| **Security Posture**  | Zero-Knowledge, Zero Cloud Exposure                                                             |
| **Primary Objective** | A hardened personal vault + productivity workspace + financial ledger + local analytics station |

**Non-negotiable constraints (apply to every phase, every agent, every PR):**

1. No network calls of any kind outside of local IPC between the frontend and the Rust/Electron backend. No telemetry, no update-check pings, no font/CDN fetches at runtime.
2. All persisted data lives inside a single SQLCipher-encrypted database file, opened with hardening pragmas defined in §9.2 — encryption-at-rest alone is not sufficient without them.
3. Master key material exists in memory only, is zeroized on lock/timeout/exit, and is never logged, serialized, or written to disk in plaintext.
4. Every write to sensitive tables must be paired with an `activity_logs` entry.
5. UI is dark by default and restricted to the two-color system defined in §5 (`#0F0E0D` obsidian, `#F4EDE4` bone) — no third color, no light-mode variant in v1.
6. The master password itself must meet a minimum strength bar (§9.6) — every other control in this document is downstream of that one secret, so it cannot be the weak link.
7. Every schema migration and every "destructive-adjacent" operation (rekey, restore, bulk import) must be preceded by an automatic local snapshot per §10.

---

## 1. Executive Summary

Secret is a hardened, single-user desktop application combining a zero-knowledge password/credential vault, a Markdown notes system, a task manager, a personal income ledger, and a local data-analytics workspace — all backed by one AES-256-encrypted SQLite database (SQLCipher), with keys derived via Argon2id and held only in volatile memory during an active session.

The product is architected as **one encrypted source of truth** with **six modules** sitting on top of it, plus two system-level utilities (Activity Log, Settings) and one hard security control (Lock).

**Current phase of the project:** single-user, pre-launch, starting from Phase 0 (project scaffold, §12) — no code exists yet. You (the developer) are also the only user. This document treats that as a real constraint, not a shortcut — see §2.3 for what changes before this ever goes to a second user.

---

## 2. Threat Model & Security Boundaries

> Every security decision in this document is made against this model. If a proposed feature doesn't map to something in "What Secret Defends Against," question whether it belongs in v1.

### 2.1 What Secret Defends Against

- **Device theft or loss** while locked — the SQLCipher file is unreadable without the master password; Argon2id makes offline brute-force expensive.
- **Casual/opportunistic local access** — someone with temporary physical access to an unlocked machine but not the master password (auto-lock on idle + OS suspend closes this).
- **Disk/forensic recovery after deletion** — `secure_delete` pragma (§9.2) ensures deleted vault rows are overwritten, not just unlinked.
- **A compromised or malicious npm/crate dependency** in the frontend — the process-boundary design (§3.2) means even a fully hostile renderer cannot read the master key or raw DB, only whatever the IPC layer explicitly exposes.
- **Accidental data loss from a bad migration, failed rekey, or interrupted write** — covered by §10.

### 2.2 What Secret Does NOT Defend Against (be honest about this, in-app)

- **Keyloggers or OS-level malware running as the same user** — if the OS is compromised, the master password can be captured at entry. No desktop app can fully solve this.
- **An unlocked, unattended session** — auto-lock reduces the window but a user who walks away unlocked and un-timed-out is exposed. This is a UX/discipline problem, not a crypto problem.
- **Coercion** ("rubber-hose cryptanalysis") — no duress/decoy-vault feature is in v1 scope. Flag as a possible v2 idea, not a current gap.
- **Screen recording / shoulder surfing** while the vault is open.
- **Loss of the only device with no backup taken** — see §10.4. This is the single biggest realistic risk for a solo, offline-only user and is a reliability issue, not a security one.

State this plainly to the user somewhere in-app (e.g. a "Security Model" panel in Settings) rather than implying the app is invincible — false confidence is itself a security risk.

### 2.3 Single-User Today, Not Necessarily Forever

Because you are currently the only user, some things are safe to be _lenient_ about that would not be safe once this ships to other people:

- **Safe to defer right now:** code signing/notarization, crash-reporting opt-in flow, formal security audit, licensing/update-server design.
- **Not safe to defer, even for an audience of one:** everything in §9 (crypto hardening), §10 (data integrity), and §11 (supply chain) — these protect _your_ real passwords and _your_ real financial data today, and retrofitting crypto/schema decisions after real data exists is far more painful than building them correctly from Phase 1.
- **Before any second user (including "just my partner" or a public release):** revisit §9.6 (password policy needs to be enforced, not just suggested), add code signing (§11.3), and formalize the backup story in §10.4 into an actual guided flow rather than a manual habit.

---

## 3. System Architecture

### 3.1 High-Level Diagram

```mermaid
flowchart TD
    U[User] -->|Master Password| AUTH[Auth Layer: Argon2id KDF]
    AUTH -->|Derived Key, RAM only| SESSION[Session Key Manager]
    SESSION --> DB[(SQLCipher Encrypted DB)]
    SESSION --> UI[React/Next.js Frontend]

    UI --> M1[My Vault]
    UI --> M2[Notes]
    UI --> M3[Tasks]
    UI --> M4[Income]
    UI --> M5[Data Workspace]
    UI --> M6[Dashboard]
    UI --> M7[Activity Log]
    UI --> M8[Settings]

    M1 --> DB
    M2 --> DB
    M3 --> DB
    M4 --> DB
    M5 --> DB
    M6 -.read only.-> DB
    M7 -.append only.-> DB

    LOCK[Lock Trigger: manual / idle timeout / OS suspend] --> WIPE[Zeroize Key in RAM]
    WIPE --> AUTH
```

### 3.2 Process/Trust Boundary

- **Renderer process (frontend):** never touches the encryption key or raw SQLCipher connection directly. It communicates only through a typed IPC bridge (Tauri commands or Electron `ipcMain`/`contextBridge`).
- **Main/core process (backend):** owns the SQLCipher connection, the Argon2id key derivation, session key lifecycle, and clipboard timers.
- **Rationale:** even if the renderer is compromised (e.g. malicious dependency, XSS in a Markdown preview), it cannot exfiltrate the master key because it never has it.
- **Markdown preview is a sub-boundary of its own:** rendered Markdown/HTML from user notes must be sanitized (§9.7) and, if using an iframe/webview for preview, that surface must have **no** access to the IPC bridge at all — treat note content as untrusted input even though it's "your own" note, because it becomes an attack surface the moment any pasted content or imported file lands in it.

### 3.3 Directory Structure

```
secret/
├── backend/                  # Rust (Tauri) or Node main process (Electron)
│   ├── auth/
│   │   ├── kdf.rs             # Argon2id derivation
│   │   └── session.rs         # In-memory key lifecycle, auto-lock timer, lockout counter
│   ├── db/
│   │   ├── connection.rs      # SQLCipher open/close/rekey, hardening pragmas (§9.2)
│   │   ├── migrations/        # Versioned, each preceded by an auto-snapshot (§10.1)
│   │   └── repositories/      # vault, notes, tasks, income, data, logs
│   ├── ipc/                   # Command handlers exposed to frontend
│   ├── import/                # CSV/JSON/SQL import, identifier sanitization (§9.8)
│   └── backup/                # .enc export/import engine, snapshot rotation (§10.4)
├── frontend/src/                       # React/Next.js frontend
│   ├── app/ or pages/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── vault/
│   │   ├── notes/              # Markdown editor + sandboxed, sanitized preview
│   │   ├── tasks/
│   │   ├── income/
│   │   ├── data-workspace/
│   │   ├── activity-log/
│   │   └── settings/
│   ├── lib/
│   │   ├── ipc-client.ts      # Typed wrapper around backend commands
│   │   ├── password-gen.ts    # Client-side generator (no key material), rejection-sampled CSPRNG
│   │   ├── entropy.ts
│   │   └── sanitize.ts        # Markdown/HTML sanitization for note preview
│   ├── state/                 # Session/auth state, lock state
│   └── styles/                # Tailwind config wired to §5 obsidian/bone tokens
├── PLAN.md                    # ← this file
└── README.md
```

---

## 4. Module Specification

| #   | Module             | Purpose                          | Key Features                                                                                                                                                                           |
| --- | ------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Dashboard**      | System overview / landing screen | Summary counters (credentials, notes, active tasks, monthly income), upcoming-task widget with priority indicators, recent income feed, DB health + backup-freshness indicator (§10.4) |
| 2   | **My Vault**       | Zero-knowledge credential store  | Masked password field, provider-domain icon resolution, favorite toggle, copy-to-clipboard with 30s auto-clear, full CRUD                                                              |
| 3   | **Notes**          | Markdown developer notepad       | Write/Preview dual mode (sandboxed + sanitized, §9.7), folder taxonomy, tag filtering, full-text search                                                                                |
| 4   | **Tasks**          | Grouped task manager             | Columns: `To Do` / `In Progress` / `Done`; priority badges (`Low`/`Medium`/`High`); custom tags; due dates; inline status toggle                                                       |
| 5   | **Income**         | Personal finance ledger          | Header stats (This Month, All-Time, Total Entries); category tags (Consulting, Freelance, Revenue, Bonus); tabular ledger with currency formatting                                     |
| 6   | **Data Workspace** | Local analytics station          | Import CSV/JSON/SQL dumps into isolated local tables (identifiers sanitized, §9.8); high-performance sortable/filterable grid; anonymization utility for sensitive columns             |
| 7   | **Activity Log**   | Immutable local audit trail      | Append-only log of sensitive actions (`Password Copied`, `Note Created`, `Failed Unlock Attempt`, `Backup Exported`, `Data Exported`) with exact timestamps                            |
| 8   | **Settings**       | App configuration                | Master password change/rotation (§9.5), auto-lock timeout, theme tokens, encrypted `.enc` backup export/import, Security Model panel (§2.2)                                            |
| 9   | **Lock**           | Hard security control            | Instantly zeroizes the session key, clears sensitive UI state, returns to unlock screen; also fires automatically on OS sleep/screen-lock (§9.3)                                       |

---

## 5. Design System & Visual Identity

> This section is binding for every screen, component, and state in the app. No component ships with a color, gradient, or visual treatment outside what's defined here without this section being updated first.

### 5.1 Design Philosophy

Minimalist, premium, quiet-luxury. The interface should feel like a high-end hardware product (think: a premium safe, not a SaaS dashboard) — restrained, confident, dark, with cream/bone accents used sparingly as the "reveal" moment (unlocked state, active selections, primary actions). No visual noise: no drop shadows stacked on drop shadows, no more than one accent treatment per screen, generous whitespace, and typography doing most of the hierarchy work rather than color.

### 5.2 Color System — Two Colors Only

| Token                     | Hex       | Role                                                            |
| ------------------------- | --------- | --------------------------------------------------------------- |
| `--color-obsidian` (base) | `#0F0E0D` | Primary background, near-black surfaces, default UI chrome      |
| `--color-bone` (accent)   | `#F4EDE4` | Primary text, primary buttons, active/focus states, key accents |

**Hard rule: no third color is introduced.** All depth, hierarchy, and state are created through opacity/alpha variants and gradient blends of these two colors only — never a new hue (no blues for "info," no reds for "error" as a _color swap_; use bone-on-obsidian weight/opacity/iconography instead, per §5.5).

**Derived tokens (opacity variants, not new colors):**

```css
:root {
  --color-obsidian: #0f0e0d;
  --color-bone: #f4ede4;

  /* Obsidian surface layers — for depth without a new hue */
  --surface-base: var(--color-obsidian);
  --surface-raised: rgba(244, 237, 228, 0.03); /* card on top of base */
  --surface-raised-hover: rgba(244, 237, 228, 0.06);
  --border-subtle: rgba(244, 237, 228, 0.08);
  --border-default: rgba(244, 237, 228, 0.14);

  /* Bone text/foreground layers */
  --text-primary: var(--color-bone);
  --text-secondary: rgba(244, 237, 228, 0.64);
  --text-tertiary: rgba(244, 237, 228, 0.38);
  --text-disabled: rgba(244, 237, 228, 0.2);

  /* Interactive */
  --accent-solid: var(--color-bone);
  --accent-on-accent: var(
    --color-obsidian
  ); /* text/icon color when sitting ON a bone-filled element */
}
```

### 5.3 Gradient Usage (the only two-color gradient permitted)

- **Primary gradient:** `linear-gradient(135deg, #0F0E0D 0%, #1A1815 100%)` — an obsidian-only gradient (subtle lightening, not toward bone) used on large background surfaces (app shell, sidebar, dashboard hero) to avoid a flat, cheap-looking fill.
- **Accent gradient (sparingly):** `linear-gradient(135deg, #F4EDE4 0%, #E4D9C8 100%)` — a bone-only gradient (subtle warming, not toward obsidian) used only on primary CTAs (`Unlock`, `Save`, `Generate Password`) and the active nav-item indicator. Max one accent-gradient element visible per screen at rest.
- **Never blend obsidian directly into bone in a single gradient** (i.e. no `linear-gradient(#0F0E0D, #F4EDE4)`). That reads as a generic dark-mode toggle effect, not premium — it also fails contrast in the middle of the blend. Keep the two gradients (obsidian-family, bone-family) visually separate; let sharp edges/borders do the contrast work between them, not a blended transition.

### 5.4 Typography

- **Primary typeface:** a refined sans (e.g. `Inter`, `Söhne`, or `General Sans`) for UI chrome; bundled locally as a font file — no CDN/Google Fonts fetch (violates the offline constraint in §0).
- **Monospace:** for anything data-like — passwords (masked/unmasked), entropy bits, table/grid contents, activity-log timestamps, note code blocks. Bundled locally (e.g. `JetBrains Mono` or `IBM Plex Mono`).
- **Hierarchy via weight and size, not color:** headings at 500–600 weight, body at 400, secondary/meta text uses `--text-secondary` opacity rather than a lighter tint — do not introduce grays outside the bone-opacity scale.
- **Letter-spacing:** slightly widened tracking (`0.01–0.02em`) on all-caps labels (section headers, badges) to reinforce the premium/editorial feel.

### 5.5 State & Semantic Meaning Without New Colors

Since only obsidian and bone exist, status/priority/severity must be communicated through **weight, opacity, iconography, and shape** — not hue:

- **Priority badges** (`Low`/`Medium`/`High`): differentiate via filled vs. outlined vs. bold-filled bone treatment, plus an icon (dot / half-fill / full-fill), not red/yellow/green.
- **Task status columns:** differentiate via border weight and background opacity step (`To Do` = subtle outline only, `In Progress` = `--surface-raised`, `Done` = `--surface-raised` + reduced text opacity to imply completion/fade).
- **Errors / failed unlock:** communicated via icon (e.g. an alert glyph), motion (a subtle shake), and bone-on-obsidian at full opacity with bold weight — not a red state. If a task genuinely requires a distinct error color, flag it for explicit sign-off before adding a third hue; the default expectation is _no third color, ever_.
- **Favorites / active states:** solid bone fill with obsidian icon/text on top (`--accent-on-accent`), reserved for the single most important action or item on a given screen.

### 5.6 Component Treatment

- **Cards:** `--surface-raised` background, 1px `--border-subtle`, generous internal padding (24–32px), no drop shadow at rest; on hover, border steps to `--border-default` and background to `--surface-raised-hover` — no shadow, no scale-jump; a slow (150–200ms) ease is enough.
- **Buttons — primary:** accent-gradient fill (§5.3), `--accent-on-accent` text, no border, subtle press-state scale (0.98).
- **Buttons — secondary/ghost:** transparent fill, `--border-default`, `--text-primary` text.
- **Inputs:** transparent/`--surface-raised` background, `--border-subtle` at rest, `--border-default` or full-opacity bone on focus (no glow/box-shadow halo — a clean border-color shift only). Password inputs additionally disable OS/browser autofill and suggestion UI (§9.3).
- **Modals:** `--surface-base` with a slightly stepped-up obsidian gradient (§5.3) and a 1px `--border-subtle` edge; avoid a heavy scrim — a light obsidian-at-70%-opacity backdrop is enough given the app is already dark.
- **Icons:** single-weight line icons only (no filled/line mixing), always bone at `--text-primary` or `--text-secondary`, never a third color.

### 5.7 Motion

- Motion is restrained and functional, never decorative-for-its-own-sake: unlock transition, card hover, tab switch, modal open/close.
- Standard easing: `cubic-bezier(0.16, 1, 0.3, 1)` (a confident, premium "settle" curve), 150–250ms for micro-interactions, up to 400ms for the unlock/lock full-screen transition.
- No bouncy/spring overshoot — it reads as playful, not premium.

### 5.8 Accessibility Within a Two-Color System

- Body text (`--text-primary` on `--surface-base`) must maintain ≥ 7:1 contrast — `#F4EDE4` on `#0F0E0D` comfortably exceeds this.
- Secondary text (`--text-secondary`, 64% opacity) must still clear ≥ 4.5:1 — verify against `--surface-base`, not against a raised card, since opacity math compounds when stacked on `--surface-raised`.
- Never drop below `--text-tertiary` (38%) for anything conveying information — reserve sub-38% opacity purely for disabled states.

---

## 6. Credential Creation & Smart Password Generator

### 6.1 Credential Modal Fields

- **Account Name** — friendly label (e.g. `GitHub Main`)
- **Provider URL** — domain used to resolve a brand icon locally (bundled icon set + simple domain matcher; no live favicon fetching, since that would violate the offline constraint)
- **Username / Email** — plain text, single-click copy
- **Password** — obfuscated input, visibility toggle, fast copy, "Generate" button wired to the Smart Generator

### 6.2 Smart Password Generator

- **Length Slider:** 8–64 characters, default 18
- **Rule toggles:** Uppercase (`A-Z`), Lowercase (`a-z`), Digits (`0-9`), Symbols (`!@#$%^&*()_+-=[]{}|;:,.<>?`), Exclude Ambiguous (`1 l I 0 O`)
- **Entropy display:** `E = L × log2(N)` computed live, with a labeled strength meter (e.g. Weak / Fair / Strong / Excellent)
- **Generation must happen using a CSPRNG** (`crypto.getRandomValues` in the frontend, or the platform CSPRNG if generated in `backend`), never `Math.random()`.
- **No modulo bias:** when mapping random bytes to the selected character set, use rejection sampling (discard and re-draw bytes that would produce a non-uniform distribution) rather than `byte % charset.length`, which skews toward lower character indices.

---

## 7. Technical Stack

| Layer                | Choice                                                                                       | Rationale                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Desktop Shell        | **Tauri (Rust)** — preferred over Electron                                                   | ~15MB footprint, native Rust memory safety for the key-holding core process                                  |
| Frontend             | **React / Next.js + TypeScript**                                                             | Strict typing across IPC boundary reduces class of runtime bugs touching sensitive data                      |
| Styling              | **Tailwind CSS**, configured with the `--color-obsidian` / `--color-bone` token system in §5 | Fast, consistent enforcement of the two-color minimalist-premium system — no ad-hoc hex values in components |
| Database             | **SQLCipher (SQLite + AES-256)**, opened with hardening pragmas (§9.2)                       | Full-database encryption at rest, battle-tested — but only as strong as the pragmas around it                |
| Key Derivation       | **Argon2id**                                                                                 | Memory-hard, GPU/ASIC brute-force resistant                                                                  |
| Markdown Rendering   | Sanitized renderer (e.g. `markdown-it` + `DOMPurify`, or a Rust equivalent)                  | Prevents stored-content XSS in the Notes preview (§9.7)                                                      |
| Animation (optional) | **Framer Motion**                                                                            | Micro-interactions on unlock, card transitions                                                               |

---

## 8. Database Schema (authoritative DDL)

**ID strategy:** all `TEXT PRIMARY KEY` columns use **UUIDv4** (or ULID if you want sortable-by-creation IDs) generated by the core process — never sequential integers, and never generated in the (less trustworthy) renderer.

```sql
-- Vault Credentials
CREATE TABLE vault_credentials (
    id TEXT PRIMARY KEY,
    account_name TEXT NOT NULL,
    username_email TEXT NOT NULL,
    encrypted_password TEXT NOT NULL,
    provider_url TEXT,
    icon_svg_or_path TEXT,
    tags TEXT,
    is_favorite BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notes
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content_markdown TEXT,
    folder_id TEXT,
    is_favorite BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Note Folders
CREATE TABLE note_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'To Do',       -- 'To Do' | 'In Progress' | 'Done'
    priority TEXT DEFAULT 'Medium',    -- 'Low' | 'Medium' | 'High'
    tags TEXT,
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Income Entries
CREATE TABLE income_entries (
    id TEXT PRIMARY KEY,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,            -- 'Consulting' | 'Freelance' | 'Revenue' | 'Bonus' | custom
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Data Workspace: imported dataset registry
-- NOTE: table_name is the ONLY thing ever used to build dynamic SQL identifiers,
-- and it must be generated/sanitized server-side (§9.8) — never taken verbatim
-- from a user-supplied CSV/JSON filename or header.
CREATE TABLE data_imports (
    id TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL,         -- 'csv' | 'json' | 'sql'
    table_name TEXT NOT NULL,          -- isolated local table this import created (sanitized identifier)
    row_count INTEGER DEFAULT 0,
    anonymized BOOLEAN DEFAULT 0,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System Audit Logs (append-only; no UPDATE/DELETE permitted at the app layer)
CREATE TABLE activity_logs (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App Settings (single row)
CREATE TABLE app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    auto_lock_minutes INTEGER DEFAULT 5,
    clipboard_clear_seconds INTEGER DEFAULT 30,
    theme TEXT DEFAULT 'dark',
    last_backup_at DATETIME,
    failed_unlock_count INTEGER DEFAULT 0,      -- persisted so a restart can't bypass backoff (§9.4)
    lockout_until DATETIME,                     -- set when backoff is active
    schema_version INTEGER NOT NULL DEFAULT 1   -- drives migration logic in §10.1
);
```

**Indexing requirements:** `idx_vault_favorite`, `idx_tasks_status`, `idx_tasks_due_date`, `idx_income_date`, `idx_logs_timestamp` — all to be added in the initial migration, not deferred.

---

## 9. Security Architecture Detail

### 9.1 Key Derivation

- Argon2id, tuned for ≥ 500ms derivation time on target hardware (memory cost ≥ 64MB, iterations tuned accordingly). Salt stored alongside the encrypted DB header, never reused.
- The master password input buffer itself (not just the derived key) must be handled carefully: avoid unnecessary `String` copies in Rust, prefer a type that can be zeroized (e.g. the `zeroize` crate), and never let it hit a debug log or panic message.
- Comparisons involving derived key material or password hashes must be **constant-time** (e.g. `subtle::ConstantTimeEq` in Rust) — never a plain `==`, which can leak timing information about how many leading bytes matched.

### 9.2 SQLite/SQLCipher Hardening Pragmas

Encryption-at-rest is necessary but not sufficient — SQLite's own temp/journal behavior can otherwise leak plaintext to disk even inside an encrypted-DB setup. On every connection open, the core process must set:

- `PRAGMA cipher_page_size`, `kdf_iter`, etc. per SQLCipher's own key-derivation settings (separate from the app's Argon2id layer — SQLCipher does its own internal KDF on the key you hand it).
- `PRAGMA secure_delete = ON;` — overwrites deleted content with zeros instead of just unlinking it, closing the forensic-recovery gap noted in §2.1.
- `PRAGMA temp_store = MEMORY;` — prevents SQLite from spilling temporary tables/sort data to an unencrypted temp file on disk.
- Journal mode: if using WAL for performance, be aware the `-wal` and `-shm` files are separate from the main DB file — verify your SQLCipher build encrypts these too, or fall back to `DELETE` journal mode, which keeps everything inside the single encrypted file at the cost of some write concurrency (irrelevant for a single-user app).

### 9.3 Session & Lock Behavior

- Auto-lock fires on: idle timeout (`auto_lock_minutes`), **and** on OS-level sleep/suspend/screen-lock events, not idle timeout alone — a user who locks their OS screen but not the app should still get a locked vault.
- RAM hardening: derived key stored in a locked/pinned memory region where the platform allows it (`mlock` equivalent); zeroized byte-by-byte on `Lock`, idle timeout, or app exit — not just dereferenced.
- Password input fields disable OS/browser-level autofill, autocomplete, and predictive-text suggestion (`autocomplete="off"`, platform-specific flags in Tauri/Electron) so the OS doesn't cache the master password outside the app's control.

### 9.4 Failed Unlock Attempts

- Logged to `activity_logs` on every failure.
- The failure counter (`failed_unlock_count`) and any active `lockout_until` are **persisted in `app_settings`, not just held in memory** — otherwise restarting the app resets the counter and defeats the backoff entirely.
- Exponential backoff: e.g. no delay for attempts 1–3, then delay doubling from a small base (2s, 4s, 8s...) up to a capped maximum, rather than an unbounded lockout — since there is no account-recovery path for a single local vault, a full lockout would mean **permanent data loss**, which is worse than a slow brute-force deterrent. Do not implement a "wipe after N failures" feature in v1 given that risk, unless the user explicitly opts in with a clear warning.

### 9.5 Master Password Rotation

- Changing the master password triggers an SQLCipher `PRAGMA rekey` (or equivalent full re-encrypt), re-derives the Argon2id key, and re-encrypts any `.enc` backups created under the old key are **not** automatically migrated — surface this clearly ("your existing backups were made with your old password; create a fresh backup now").
- A rekey operation is treated as a "destructive-adjacent operation" per §0 constraint 7: take an automatic snapshot (§10.1) immediately before starting.

### 9.6 Master Password Strength Policy

- The whole system's security is bounded by this one secret. Enforce (not just suggest) a minimum bar at setup and at rotation: minimum length (e.g. 12+ characters) plus a real strength estimator (e.g. zxcvbn-style scoring, not just a character-class checklist) rather than a fake "must contain 1 number and 1 symbol" rule that produces predictable patterns like `Password1!`.
- Show the same entropy/strength meter used for generated credential passwords (§6.2) on the master password field too, for consistency.

### 9.7 Markdown / Note Content Sanitization

- Treat all note content as untrusted input when rendering the Preview mode, even though it's self-authored — pasted content, imported files, or a future "shared notes" feature could all introduce hostile Markdown/HTML.
- Sanitize rendered HTML output (e.g. `DOMPurify` or equivalent) before injecting into the DOM; strip `<script>`, inline event handlers, and `javascript:` URIs.
- The preview surface should have **zero** access to the IPC bridge — render it in a context (sandboxed iframe or equivalent) that cannot call back into `backend` even if a sanitization bypass is later found. Defense in depth: sanitize _and_ sandbox, not one or the other.

### 9.8 SQL Injection & Dynamic Identifier Safety (Data Workspace)

- All queries anywhere in the app use parameterized statements / prepared statements — never string-concatenated SQL, without exception.
- The Data Workspace's CSV/JSON import feature is the highest-risk surface in the schema: it creates new tables and column names **derived from user-supplied file headers**. Column/table names cannot be parameterized the way values can, so:
  - Generate an internal, sanitized table name (e.g. `import_<uuid>`) rather than using the source filename directly.
  - Whitelist-validate any user-facing column names against a strict pattern (alphanumeric + underscore, fixed max length) before using them in DDL; reject or auto-rename anything that doesn't match, and always quote identifiers properly as a second layer of defense.
- File-path handling for import/export/backup must reject path traversal (`../`) and symlinks pointing outside the app's designated data directory.

---

## 10. Reliability & Data Integrity

> This is the section that matters most for a solo, fully-offline user: there is no cloud fallback, so the local copy is the only copy unless you personally back it up. Data loss here is unrecoverable.

### 10.1 Migration Safety

- Every schema migration is versioned against `app_settings.schema_version`.
- Before running any migration, automatically copy the current encrypted DB file to a timestamped snapshot in a local `backups/pre-migration/` directory. If the migration fails partway, the app can detect the version mismatch on next launch and offer to restore the snapshot rather than opening a half-migrated (and potentially corrupted) database.
- Migrations run inside a transaction where the underlying engine supports it, so a failure rolls back cleanly instead of leaving partial DDL applied.

### 10.2 Write Durability

- Prefer `DELETE` journal mode over `WAL` unless a concrete performance need arises (see §9.2) — it keeps the "what does a crash mid-write leave behind" story simpler for a single encrypted file.
- On app exit and before `Lock`, ensure any pending writes are flushed and the connection is closed cleanly rather than killed mid-transaction.

### 10.3 Corruption Detection

- On app launch, run SQLite's built-in integrity check (`PRAGMA integrity_check` post-decryption) as part of the DB-health indicator shown on the Dashboard (already specified in §4) — surface a clear warning and point to the most recent local backup if it fails, rather than silently proceeding.

### 10.4 Backup Policy (the actual biggest risk for this project)

- The Dashboard's "backup-freshness indicator" (§4) should visibly nag if `last_backup_at` is older than a sane threshold (e.g. 7 days) — don't let this be a passive stat nobody looks at.
- `.enc` exports are the disaster-recovery path for **device loss, drive failure, or corruption** — not just a "nice to have" feature. Recommend the user store at least one backup off the primary device (external drive, encrypted USB) precisely because there is no cloud copy by design.
- Backup import must fully verify (checksum + successful decryption + integrity check) into a temporary location before it's allowed to replace or merge into the live DB — never overwrite the live vault with an unverified file.

---

## 11. Supply Chain & Build Security

### 11.1 Dependency Hygiene

- Lockfiles (`package-lock.json` / `Cargo.lock`) are committed and treated as the source of truth for exact versions — no floating version ranges resolved fresh at build time.
- Run `npm audit` / `cargo audit` (or equivalent) as part of the build/CI process; a new dependency touching `backend/auth/`, `backend/db/`, or anything handling key material gets manual review before being added, not just an automated pass.
- Minimize dependency count in the core process specifically — every crate in `backend` is inside the trust boundary that holds your master key; the frontend can afford to be less paranoid since it never sees that key.
- Be wary of postinstall scripts from new/unfamiliar packages; prefer well-established, widely-audited crates/packages for anything crypto-adjacent (Argon2id, SQLCipher bindings, CSPRNG) rather than rolling or picking obscure implementations.

### 11.2 Build Hygiene

- Production builds strip debug logging that could contain sensitive data (§0 constraint 3 extends to build config, not just runtime code — a debug build that logs decrypted rows "for testing" must never be the build that gets used with real data).
- No dev-only bypass flags (e.g. a "skip master password in dev mode" flag) should be able to ship in a release build — gate them at compile time, not runtime, so they can't be flipped on accidentally.

### 11.3 Before This Goes Beyond You (deferred, but tracked)

- Code signing / notarization (Windows Authenticode, macOS notarization) so the OS doesn't flag the binary and so a second user has some integrity guarantee about what they're installing.
- A documented, reproducible build process so "the binary matches this source" is verifiable.
- These are explicitly **not** required for your own single-user use today (§2.3) but should not be forgotten when scoping a public release.

---

## 12. Phased Implementation Roadmap

### Phase 0 — Environment & Project Scaffold

> Not a feature phase — this is the prerequisite that makes Phase 1 possible at all. Nothing in Phase 1's exit criteria can be attempted until the project actually builds and launches.

- Initialize the repository with the directory structure defined in §3.3 (`backend/`, `frontend/src/`, module subfolders) — empty stubs are fine, but the shape must exist.
- Initialize the Tauri + Rust core project; add the crates Phase 1 will need (SQLCipher binding, Argon2id implementation, `zeroize`, `subtle`) so the dependency tree resolves before any auth logic is written.
- Initialize the React/Next.js + TypeScript frontend; configure Tailwind with the `--color-obsidian` / `--color-bone` token system from §5.2 from the start, not retrofitted later.
- Confirm the Tauri window launches end-to-end (empty shell, no auth yet) — frontend and core process talking over IPC with a trivial "ping" command is a good smoke test.
- Commit lockfiles (`package-lock.json`, `Cargo.lock`) per §11.1, and add a `.gitignore` covering build artifacts, local DB files, and any `backups/` directory before either can accidentally be committed.
- **Owners:** `@Backend-Agent` (Rust/Tauri init, crate selection) and `@Frontend-Agent` (React/Tailwind init) jointly; `@DevOps-Agent` owns the lockfile/`.gitignore`/build-config baseline.
- **Exit criteria:** `cargo build` and the frontend build both succeed from a clean clone; the Tauri app window opens; a trivial round-trip IPC call works; lockfiles and `.gitignore` are committed. No auth, no database, no UI beyond an empty shell — that's Phase 1.

### Phase 1 — Core Auth & Encryption Engine

- Master password setup/onboarding flow, with strength enforcement (§9.6)
- Argon2id key derivation + SQLCipher open/close, with hardening pragmas applied on every connection (§9.2)
- Session key manager with auto-lock timer **and** OS suspend/lock hook (§9.3)
- Persisted failed-unlock counter and backoff (§9.4)
- `Lock` action wired to full RAM zeroization
- **Exit criteria:** DB opens/decrypts only with correct password; key is unrecoverable from a memory dump after lock; restarting the app does not reset the failed-attempt counter.

### Phase 2 — Vault & Smart Generator

- Credential CRUD + modal
- Provider icon resolution (bundled/local matcher)
- Smart Password Generator with entropy meter and rejection-sampled CSPRNG (§6.2)
- Clipboard copy + auto-clear timer
- **Exit criteria:** full vault CRUD works end-to-end against the encrypted DB; generator never uses a non-CSPRNG source and shows no modulo bias under statistical spot-check.

### Phase 3 — Notes & Tasks Modules

- Markdown editor (Write/Preview toggle) with sanitized, sandboxed preview rendering (§9.7)
- Notes folder taxonomy, search
- Grouped task board (`To Do`/`In Progress`/`Done`), priority badges, due dates
- **Exit criteria:** both modules persist correctly and appear in Dashboard summary counts; a Markdown note containing a script/event-handler payload renders inert in Preview.

### Phase 4 — Finance, Data Workspace & Activity Log

- Income ledger CRUD + monthly/all-time aggregation
- CSV/JSON/SQL import into isolated local tables with sanitized identifiers (§9.8), sortable/filterable grid, anonymization utility
- Activity Log wired as append-only listener across all prior modules
- Integrity check + DB-health indicator wired into Dashboard (§10.3)
- **Exit criteria:** every sensitive action from Phases 1–3 now produces a log entry retroactively verified by QA; a crafted CSV with a malicious header/filename cannot alter or inject into unrelated tables.

### Phase 5 — UI Polish, Backup Engine & Reliability Hardening

- Full application of the §5 Design System (obsidian/bone tokens, gradients, typography, motion) across every screen; audit for any stray third color or ad-hoc hex value
- `.enc` encrypted backup export/import engine with verify-before-restore (§10.4)
- Migration snapshot system wired to every future schema change (§10.1)
- Settings screen finalized (auto-lock timeout, clipboard timing, theme tokens, Security Model panel from §2.2)
- Dependency audit pass (§11.1) and debug-log strip verification (§11.2) before calling v1 "done"
- **Exit criteria:** full backup → wipe → restore cycle verified with no data loss; a simulated failed migration correctly offers snapshot restore instead of opening a corrupted DB.

---

## 13. Agent Delegation Protocol

Any AI coding agent operating on this repository must self-assign to one of the roles defined in `AGENTS.md` and stay within its boundary. `AGENTS.md` is authoritative for persona detail, non-negotiables, and instinctive review checklists per role; this section is the quick map of ownership.

- `@UIUX-Agent` — design system (§5), information architecture, interaction patterns. No implementation code.
- `@Frontend-Agent` — `frontend/src/components/`, `frontend/src/state/`, `frontend/src/lib/`, Tailwind implementation, IPC client. Never touches raw SQLCipher connections or key material — IPC client only.
- `@Backend-Agent` — `backend/db/`, `backend/ipc/`, `backend/import/`, migrations, repositories, indexing, all of §8. Schema changes must update Section 8 of this file in the same PR, and migrations follow the snapshot-first rule in §10.1.
- `@Security-Agent` — `backend/auth/`, `backend/backup/`, key derivation, session lifecycle, backup encryption, all of §9. No UI work, and sole reviewer on any change touching key material.
- `@DevOps-Agent` — dependency management, CI/audit config, build scripts, release packaging (deferred per §11.3), backup/snapshot infrastructure.
- `@QA-Agent` — test strategy, edge-case coverage (empty vault, max-length passwords, concurrent lock during write, corrupted backup import, malicious CSV headers, restart-during-lockout), and phase-exit sign-off before a phase in §12 is called complete.

Delegated instructions should be issued in the form:
`[Delegate to @AgentName]: <specific task, boundary, and exit criteria>`

Cross-boundary work uses the handoff format defined in `AGENTS.md` §8.

---

## 14. Definition of Done (applies to every phase)

1. No plaintext secret (password, master key, derived key) appears in logs, error messages, or crash reports.
2. All new sensitive-data mutations produce a corresponding `activity_logs` row.
3. No new runtime network call is introduced (verify via a network-monitor smoke test).
4. TypeScript strict mode passes with zero `any` on any file touching credential or key data.
5. All new queries use parameterized statements; any new dynamic-identifier code path is validated against §9.8.
6. Any new failure/comparison path involving key material or password hashes uses constant-time comparison (§9.1).
7. Any new destructive-adjacent operation (migration, rekey, restore, bulk import) takes an automatic snapshot first (§10.1).
8. This `PLAN.md` is updated in the same PR if architecture, schema, threat model, or phase scope changes.
