use rusqlite::{Connection, Result};
use uuid::Uuid;

pub fn log_activity(conn: &Connection, action_type: &str, details: Option<&str>) -> Result<()> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO activity_logs (id, action_type, details) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, action_type, details],
    )?;
    Ok(())
}
