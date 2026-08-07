use rusqlite::{Connection, Result};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn run_migrations(conn: &mut Connection, db_path: &str) -> Result<()> {
    let schema_version: u32 = conn.query_row(
        "SELECT schema_version FROM app_settings WHERE id = 1",
        [],
        |row| row.get(0),
    ).unwrap_or(1);

    if schema_version < 2 {
        // Snapshot
        snapshot_db(db_path)?;
        
        let tx = conn.transaction()?;
        
        tx.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS vault_credentials (
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

            CREATE TABLE IF NOT EXISTS activity_logs (
                id TEXT PRIMARY KEY,
                action_type TEXT NOT NULL,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_vault_favorite ON vault_credentials(is_favorite);
            CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON activity_logs(timestamp);

            UPDATE app_settings SET schema_version = 2 WHERE id = 1;
            "
        )?;

        tx.commit()?;
    }

    Ok(())
}

fn snapshot_db(db_path: &str) -> Result<()> {
    let path = Path::new(db_path);
    if !path.exists() {
        return Ok(());
    }

    let parent = path.parent().unwrap_or(Path::new(""));
    let backup_dir = parent.join("backups").join("pre-migration");
    
    fs::create_dir_all(&backup_dir).map_err(|_| {
        rusqlite::Error::ExecuteReturnedResults // Dummy error mapping for simplicity
    })?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
        
    let file_stem = path.file_stem().unwrap().to_str().unwrap();
    let file_name = format!("{}_{}.db", file_stem, timestamp);
    let backup_path = backup_dir.join(file_name);
    
    fs::copy(path, backup_path).map_err(|_| {
        rusqlite::Error::ExecuteReturnedResults
    })?;

    Ok(())
}
