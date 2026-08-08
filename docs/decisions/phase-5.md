# Phase 5 Decision Log

## Open Questions & Deliberations

### 1. The .enc Backup Encryption Scheme
**@Security-Agent:** 
We must use authenticated encryption as specified in `PLAN.md` §10.4. Since the raw `vault.db` file is already encrypted via SQLCipher (which uses AES-256-GCM or AES-256-CBC under the hood), simply copying the file isn't enough to satisfy the "independent salt" and "detect tampering before sqlite opens it" requirements. 
**Decision:** We will serialize the raw `vault.db` bytes (and optionally `auth_state.json` if we want to retain lockout states, but typically a backup only contains the vault) into a payload. This payload will be encrypted with **ChaCha20-Poly1305** (or AES-256-GCM via `ring` or `RustCrypto`).
- **Key Derivation:** We will use `Argon2id` with the *same master password* but a **brand-new, independent, random salt** generated at the time of backup export. This ensures that the `.enc` file has a completely distinct encryption key from the live vault. The `.enc` file format will be: `[MAGIC_HEADER][SALT (32b)][NONCE (12b)][CIPHERTEXT (payload)][MAC/TAG (16b)]`.

### 2. Backup Verify-Before-Restore Pipeline
**@Backend-Agent & @Security-Agent:** 
To prevent a corrupted backup from destroying the live vault, the restore process must be atomic and strictly verified:
1. **Decrypt & Authenticate:** Read the `.enc` file. Derive the key using the backup salt and the user-provided password. Decrypt using ChaCha20-Poly1305. If the MAC tag fails, abort immediately (tampering or wrong password detected).
2. **Temp Staging:** Write the decrypted bytes to a temporary file (e.g., `vault.restore.tmp.db`).
3. **Integrity Check:** Open the temp DB with SQLCipher using the derived key. Run `PRAGMA integrity_check`. If it returns anything other than `ok`, abort and delete the temp file.
4. **Snapshot & Atomic Swap:** Take a snapshot of the *current* live DB (`vault.pre_restore.db`). Then, atomically rename the temp DB over the live DB (`vault.db`).

### 3. Migration Snapshot Retention
**@Backend-Agent:**
Given this is a local-only app with no cloud storage, we cannot endlessly accumulate snapshots.
**Decision:** We will retain exactly **the 3 most recent pre-migration snapshots** (`vault.vX_pre.db`). We will also retain the single most recent `pre_restore` snapshot. The `src-core/src/db/migrations.rs` module will automatically prune snapshots exceeding this limit during startup.

### 4. Master Password Rotation Flow UX
**@UIUX-Agent:**
Changing the master password invalidates all previously exported `.enc` backups because the password used to derive their keys is now obsolete (the live vault is rekeyed, but offline `.enc` files obviously are not).
**Decision:**
- When the user clicks "Change Master Password", a mandatory warning dialog will appear: *"WARNING: Your old backup files (.enc) will NOT work with your new password. You must create a new backup immediately after changing your password."*
- Upon successful rotation, the UI will automatically redirect to the Backup/Restore panel and aggressively prompt the user to export a new `.enc` file.

## UI/UX Design System Audit
**@UIUX-Agent:**
A full codebase audit (`grep_search`) for stray hex values revealed:
- `SandboxedPreview.tsx`: Hardcoded `#0f0e0d` and `#f4ede4` CSS variables.
- `UnlockScreen.tsx` & `SetupScreen.tsx`: Hardcoded `linear-gradient` with `#F4EDE4` and `#E4D9C8`.
- `globals.css`: Hardcoded `linear-gradient(135deg, #0F0E0D 0%, #1A1815 100%)`.

**Action Plan:** The UI audit dictates that these must be replaced with strict CSS variables matching the two-color obsidian/bone system from `plan.md` §5. The gradient in `UnlockScreen`/`SetupScreen` introduces an unauthorized third color (`#E4D9C8` and `#1A1815`). We will fix this by converting the gradients to use opacity stops of the core `--color-bone` and `--color-obsidian` tokens (e.g. `rgba(244, 237, 228, 0.8)`).
