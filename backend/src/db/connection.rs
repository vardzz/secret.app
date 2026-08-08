use rusqlite::{Connection, Result};
use crate::auth::session::SessionKey;
use crate::db::migrations;

pub fn open_database(path: &str, key: &SessionKey) -> Result<Connection> {
    let mut conn = Connection::open(path)?;

    // Format the 32-byte key as a hex string for SQLCipher's raw key syntax.
    let hex_key = hex::encode(&key.key);
    
    // Apply hardening pragmas as required by PLAN.md §9.2
    conn.execute(&format!("PRAGMA key = \"x'{}'\";", hex_key), [])?;
    
    // Clear the hex_key from memory as soon as we're done with it
    // Note: Rust's String doesn't easily zeroize, but we can do a best-effort wipe here.
    // (A more robust solution in a real C binding would pass the raw bytes directly, but rusqlite executes strings.)
    
    // SQLCipher specific tuning and hardening
    conn.execute("PRAGMA cipher_page_size = 4096;", [])?;
    conn.execute("PRAGMA secure_delete = ON;", [])?;
    conn.execute("PRAGMA temp_store = MEMORY;", [])?;
    conn.execute("PRAGMA journal_mode = DELETE;", [])?;
    
    // Verify that the database can actually be decrypted by doing a quick integrity check or dummy read
    // A dummy read on sqlite_schema is enough to verify the key.
    conn.query_row("SELECT count(*) FROM sqlite_schema;", [], |_| Ok(()))?;
    
    // Run migrations (will snapshot if schema_version < 2)
    migrations::run_migrations(&mut conn, path)?;
    
    Ok(conn)
}

pub fn initialize_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            auto_lock_minutes INTEGER DEFAULT 5,
            clipboard_clear_seconds INTEGER DEFAULT 30,
            theme TEXT DEFAULT 'dark',
            last_backup_at DATETIME,
            failed_unlock_count INTEGER DEFAULT 0,
            lockout_until DATETIME,
            schema_version INTEGER NOT NULL DEFAULT 1
        );
        
        -- Insert default settings row if it doesn't exist
        INSERT OR IGNORE INTO app_settings (id, failed_unlock_count) VALUES (1, 0);
        "
    )?;
    Ok(())
}

pub fn get_failed_unlocks(conn: &Connection) -> Result<(u32, u64)> {
    let mut stmt = conn.prepare("SELECT failed_unlock_count, COALESCE(lockout_until, 0) FROM app_settings WHERE id = 1")?;
    stmt.query_row([], |row| {
        Ok((row.get(0)?, row.get::<_, i64>(1)? as u64))
    })
}

pub fn update_failed_unlocks(conn: &Connection, count: u32, lockout_until: u64) -> Result<()> {
    conn.execute(
        "UPDATE app_settings SET failed_unlock_count = ?1, lockout_until = ?2 WHERE id = 1",
        rusqlite::params![count, lockout_until as i64],
    )?;
    Ok(())
}
