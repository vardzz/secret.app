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
2. All persisted data lives inside a single SQLCipher-encrypted database file.
3. Master key material exists in memory only, is zeroized on lock/timeout/exit, and is never logged, serialized, or written to disk in plaintext.
4. Every write to sensitive tables must be paired with an `activity_logs` entry.
5. UI must default to dark mode; there is no "light mode" requirement in v1.

---

## 1. Executive Summary

Secret is a hardened, single-user desktop application combining a zero-knowledge password/credential vault, a Markdown notes system, a task manager, a personal income ledger, and a local data-analytics workspace — all backed by one AES-256-encrypted SQLite database (SQLCipher), with keys derived via Argon2id and held only in volatile memory during an active session.

The product is architected as **one encrypted source of truth** with **six modules** sitting on top of it, plus two system-level utilities (Activity Log, Settings) and one hard security control (Lock).

---

## 2. System Architecture

### 2.1 High-Level Diagram

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

    LOCK[Lock Trigger: manual / idle timeout] --> WIPE[Zeroize Key in RAM]
    WIPE --> AUTH
```

### 2.2 Process/Trust Boundary

- **Renderer process (frontend):** never touches the encryption key or raw SQLCipher connection directly. It communicates only through a typed IPC bridge (Tauri commands or Electron `ipcMain`/`contextBridge`).
- **Main/core process (backend):** owns the SQLCipher connection, the Argon2id key derivation, session key lifecycle, and clipboard timers.
- **Rationale:** even if the renderer is compromised (e.g. malicious dependency, XSS in a Markdown preview), it cannot exfiltrate the master key because it never has it.

### 2.3 Directory Structure

```
secret/
├── src-core/                  # Rust (Tauri) or Node main process (Electron)
│   ├── auth/
│   │   ├── kdf.rs             # Argon2id derivation
│   │   └── session.rs         # In-memory key lifecycle, auto-lock timer
│   ├── db/
│   │   ├── connection.rs      # SQLCipher open/close/rekey
│   │   ├── migrations/
│   │   └── repositories/      # vault, notes, tasks, income, data, logs
│   ├── ipc/                   # Command handlers exposed to frontend
│   └── backup/                # .enc export/import engine
├── src/                       # React/Next.js frontend
│   ├── app/ or pages/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── vault/
│   │   ├── notes/
│   │   ├── tasks/
│   │   ├── income/
│   │   ├── data-workspace/
│   │   ├── activity-log/
│   │   └── settings/
│   ├── lib/
│   │   ├── ipc-client.ts      # Typed wrapper around backend commands
│   │   ├── password-gen.ts    # Client-side generator (no key material)
│   │   └── entropy.ts
│   ├── state/                 # Session/auth state, lock state
│   └── styles/                # Tailwind config, dark theme tokens
├── plan.md                    # ← this file
└── README.md
```

---

## 3. Module Specification

| #   | Module             | Purpose                          | Key Features                                                                                                                                                                   |
| --- | ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Dashboard**      | System overview / landing screen | Summary counters (credentials, notes, active tasks, monthly income), upcoming-task widget with priority indicators, recent income feed, DB health + backup-freshness indicator |
| 2   | **My Vault**       | Zero-knowledge credential store  | Masked password field, provider-domain icon resolution, favorite toggle, copy-to-clipboard with 30s auto-clear, full CRUD                                                      |
| 3   | **Notes**          | Markdown developer notepad       | Write/Preview dual mode, folder taxonomy, tag filtering, full-text search                                                                                                      |
| 4   | **Tasks**          | Grouped task manager             | Columns: `To Do` / `In Progress` / `Done`; priority badges (`Low`/`Medium`/`High`); custom tags; due dates; inline status toggle                                               |
| 5   | **Income**         | Personal finance ledger          | Header stats (This Month, All-Time, Total Entries); category tags (Consulting, Freelance, Revenue, Bonus); tabular ledger with currency formatting                             |
| 6   | **Data Workspace** | Local analytics station          | Import CSV/JSON/SQL dumps into isolated local tables; high-performance sortable/filterable grid; anonymization utility for sensitive columns                                   |
| 7   | **Activity Log**   | Immutable local audit trail      | Append-only log of sensitive actions (`Password Copied`, `Note Created`, `Failed Unlock Attempt`, `Backup Exported`) with exact timestamps                                     |
| 8   | **Settings**       | App configuration                | Master password change/rotation, auto-lock timeout, theme tokens, encrypted `.enc` backup export/import                                                                        |
| 9   | **Lock**           | Hard security control            | Instantly zeroizes the session key, clears sensitive UI state, returns to unlock screen                                                                                        |

---

## 4. Credential Creation & Smart Password Generator

### 4.1 Credential Modal Fields

- **Account Name** — friendly label (e.g. `GitHub Main`)
- **Provider URL** — domain used to resolve a brand icon locally (bundled icon set + simple domain matcher; no live favicon fetching, since that would violate the offline constraint)
- **Username / Email** — plain text, single-click copy
- **Password** — obfuscated input, visibility toggle, fast copy, "Generate" button wired to the Smart Generator

### 4.2 Smart Password Generator

- **Length Slider:** 8–64 characters, default 18
- **Rule toggles:** Uppercase (`A-Z`), Lowercase (`a-z`), Digits (`0-9`), Symbols (`!@#$%^&*()_+-=[]{}|;:,.<>?`), Exclude Ambiguous (`1 l I 0 O`)
- **Entropy display:** `E = L × log2(N)` computed live, with a labeled strength meter (e.g. Weak / Fair / Strong / Excellent)
- **Generation must happen in the frontend using a CSPRNG** (`crypto.getRandomValues`), never `Math.random()`.

---

## 5. Technical Stack

| Layer                | Choice                                     | Rationale                                                                               |
| -------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Desktop Shell        | **Tauri (Rust)** — preferred over Electron | ~15MB footprint, native Rust memory safety for the key-holding core process             |
| Frontend             | **React / Next.js + TypeScript**           | Strict typing across IPC boundary reduces class of runtime bugs touching sensitive data |
| Styling              | **Tailwind CSS**                           | Fast, consistent dark-mode + luxury-minimal design tokens                               |
| Database             | **SQLCipher (SQLite + AES-256)**           | Full-database encryption at rest, battle-tested                                         |
| Key Derivation       | **Argon2id**                               | Memory-hard, GPU/ASIC brute-force resistant                                             |
| Animation (optional) | **Framer Motion**                          | Micro-interactions on unlock, card transitions                                          |

---

## 6. Database Schema (authoritative DDL)

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
CREATE TABLE data_imports (
    id TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL,         -- 'csv' | 'json' | 'sql'
    table_name TEXT NOT NULL,          -- isolated local table this import created
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
    last_backup_at DATETIME
);
```

**Indexing requirements:** `idx_vault_favorite`, `idx_tasks_status`, `idx_tasks_due_date`, `idx_income_date`, `idx_logs_timestamp` — all to be added in the initial migration, not deferred.

---

## 7. Security Architecture Detail

- **Key derivation:** Argon2id, tuned for ≥ 500ms derivation time on target hardware (memory cost ≥ 64MB, iterations tuned accordingly). Salt stored alongside the encrypted DB header, never reused.
- **RAM hardening:** derived key stored in a locked/pinned memory region where the platform allows it (`mlock` equivalent); zeroized byte-by-byte on `Lock`, idle timeout, or app exit — not just dereferenced.
- **Clipboard security:** copied passwords are cleared after `clipboard_clear_seconds` (default 30s) regardless of whether the user copies something else first.
- **Failed unlock attempts:** logged to `activity_logs`; after N consecutive failures (configurable), enforce an exponential backoff delay before the next attempt is accepted.
- **Backup encryption:** `.enc` export encrypts a full snapshot of the SQLCipher file with a user-supplied (or session) key using authenticated encryption (e.g. AES-256-GCM); import path re-derives and verifies before touching the live DB.

---

## 8. Phased Implementation Roadmap

### Phase 1 — Core Auth & Encryption Engine

- Master password setup/onboarding flow
- Argon2id key derivation + SQLCipher open/close
- Session key manager with auto-lock timer
- `Lock` action wired to full RAM zeroization
- **Exit criteria:** DB opens/decrypts only with correct password; key is unrecoverable from a memory dump after lock.

### Phase 2 — Vault & Smart Generator

- Credential CRUD + modal
- Provider icon resolution (bundled/local matcher)
- Smart Password Generator with entropy meter
- Clipboard copy + auto-clear timer
- **Exit criteria:** full vault CRUD works end-to-end against the encrypted DB; generator never uses a non-CSPRNG source.

### Phase 3 — Notes & Tasks Modules

- Markdown editor (Write/Preview toggle), folder taxonomy, search
- Grouped task board (`To Do`/`In Progress`/`Done`), priority badges, due dates
- **Exit criteria:** both modules persist correctly and appear in Dashboard summary counts.

### Phase 4 — Finance, Data Workspace & Activity Log

- Income ledger CRUD + monthly/all-time aggregation
- CSV/JSON/SQL import into isolated local tables, sortable/filterable grid, anonymization utility
- Activity Log wired as append-only listener across all prior modules
- **Exit criteria:** every sensitive action from Phases 1–3 now produces a log entry retroactively verified by QA.

### Phase 5 — UI Polish & Backup/Export Engine

- Dark-mode visual polish, minimal-luxury typography pass, micro-interactions
- `.enc` encrypted backup export/import engine
- Settings screen finalized (auto-lock timeout, clipboard timing, theme tokens)
- **Exit criteria:** full backup → wipe → restore cycle verified with no data loss.

---

## 9. Agent Delegation Protocol

Any AI coding agent operating on this repository must self-assign to one of the roles below and stay within its boundary. Cross-boundary changes require a note in the PR description.

- `@Security-Agent` — owns `src-core/auth/`, key derivation, session lifecycle, backup encryption. No UI work.
- `@Database-Agent` — owns `src-core/db/`, migrations, repositories, indexing, query performance. Schema changes must update Section 6 of this file in the same PR.
- `@Frontend-Agent` — owns `src/components/`, `src/state/`, Tailwind theme tokens, micro-interactions. Never touches raw SQLCipher connections or key material — IPC client only.
- `@QA-Agent` — owns test strategy, edge-case coverage (empty vault, max-length passwords, concurrent lock during write, corrupted backup import), and a security checklist per phase before sign-off.

Delegated instructions should be issued in the form:
`[Delegate to @AgentName]: <specific task, boundary, and exit criteria>`

---

## 10. Definition of Done (applies to every phase)

1. No plaintext secret (password, master key, derived key) appears in logs, error messages, or crash reports.
2. All new sensitive-data mutations produce a corresponding `activity_logs` row.
3. No new runtime network call is introduced (verify via a network-monitor smoke test).
4. TypeScript strict mode passes with zero `any` on any file touching credential or key data.
5. This `plan.md` is updated in the same PR if architecture, schema, or phase scope changes.
