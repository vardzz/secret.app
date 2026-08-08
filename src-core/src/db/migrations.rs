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

    if schema_version < 3 {
        // Snapshot
        snapshot_db(db_path)?;
        
        let tx = conn.transaction()?;
        
        tx.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS note_folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                parent_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content_markdown TEXT,
                folder_id TEXT,
                is_favorite BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'To Do',
                priority TEXT DEFAULT 'Medium',
                tags TEXT,
                due_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

            UPDATE app_settings SET schema_version = 3 WHERE id = 1;
            "
        )?;

        tx.commit()?;
    }

    if schema_version < 4 {
        // Snapshot
        snapshot_db(db_path)?;
        
        let tx = conn.transaction()?;
        
        tx.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS income_entries (
                id TEXT PRIMARY KEY,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'USD',
                date DATE NOT NULL,
                category TEXT NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS data_imports (
                id TEXT PRIMARY KEY,
                source_filename TEXT NOT NULL,
                internal_table_name TEXT NOT NULL,
                row_count INTEGER NOT NULL,
                imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_income_date ON income_entries(date);
            CREATE INDEX IF NOT EXISTS idx_income_category ON income_entries(category);

            UPDATE app_settings SET schema_version = 4 WHERE id = 1;
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
