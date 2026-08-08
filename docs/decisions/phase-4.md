# Phase 4 Decision Log

## Open Questions & Deliberations

### 1. Internal Table-Naming Scheme for Imports
**@Backend-Agent:** We will use `data_import_{uuid_v4_hex}` for the internal SQLite table names. The UUID will have hyphens removed, ensuring the table name starts with a letter and consists solely of alphanumeric characters and underscores. We will never use the user-supplied filename in the DDL.

### 2. Column Name Whitelist & Failure Behavior
**@Security-Agent:** The whitelist pattern must be strict: `^[a-zA-Z_][a-zA-Z0-9_]{0,63}$`.
**@Backend-Agent:** Rejecting a whole CSV because a bank includes a space in a header ("Transaction Date") is terrible UX. 
**Decision:** We will *auto-rename* offending columns. The pipeline will:
1. Lowercase the header.
2. Replace spaces and hyphens with underscores.
3. Strip all characters not matching `[a-z0-9_]`.
4. Ensure it starts with a letter (prefix with `col_` if it doesn't).
5. Ensure uniqueness (append `_2`, `_3` for duplicates).
This preserves the data while remaining strictly within the whitelist.

### 3. Identifier Quoting Strategy
**@Security-Agent:** Whitelisting is our first line of defense. As a secondary defense-in-depth layer, all identifiers (the generated table name and the sanitized column names) MUST be wrapped in double quotes `"{identifier}"` during every `CREATE TABLE` and `INSERT` operation.

### 4. File-Path Validation
**@Backend-Agent & @Security-Agent:** All file paths passed from the frontend for CSV/JSON import or `.enc` backup export must be validated in the Rust core.
We will verify that the path does not contain `..` (path traversal) and use `std::fs::canonicalize` to resolve the real path. If the resolved path points outside a safe subset of user directories (or if we just want to ensure it is an absolute file path that actually exists without symlink trickery), we'll restrict it. For v1, rejecting `..` and ensuring the file exists/is readable is the baseline.

### 5. Anonymization Utility Scope
**@UIUX-Agent:** We want a simple, focused feature set for v1. 
**Decision:** We will only support "Masking" (replacing contents with `***` or `XXXX`) and "Dropping" (removing the column entirely from the view) in v1. Cryptographic hashing and tokenization are deferred to v2.

### 6. Activity Log Retention
**@Backend-Agent:** A single-user SQLite database can store millions of rows effortlessly. Capping the `activity_logs` table introduces deletion logic which contradicts its "immutable audit trail" nature.
**Decision:** Unbounded retention for v1. We will not implement a cap or rotation.

## Implementation Notes: The Failed Unlock Paradox
**@Backend-Agent:** `PLAN.md` requires logging failed unlock attempts to `activity_logs`. However, `activity_logs` lives *inside* the SQLCipher-encrypted database, which cannot be opened without the correct password. 
**Workaround:** We track `failed_unlock_count` unencrypted in `auth_state.json`. When a *successful* unlock finally occurs, if `failed_unlock_count > 0`, we will write a batch log entry to `activity_logs` indicating "N Failed Unlock Attempts Prior to Success", and then reset the counter.

## Sign-off
[ ] Pending @QA-Agent verification of the malicious CSV test.
[x] @Security-Agent explicitly signs off on the `data_import_{uuid}` table naming, column sanitization pipeline, and mandatory double-quoting architecture.
