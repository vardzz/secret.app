use rusqlite::{Connection, Result};
use uuid::Uuid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivityLog {
    pub id: String,
    pub action_type: String,
    pub details: Option<String>,
    pub timestamp: String,
}

pub fn log_activity(conn: &Connection, action_type: &str, details: Option<&str>) -> Result<()> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO activity_logs (id, action_type, details) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, action_type, details],
    )?;
    Ok(())
}

pub fn get_activity_logs(conn: &Connection) -> Result<Vec<ActivityLog>> {
    let mut stmt = conn.prepare("SELECT id, action_type, details, datetime(timestamp, 'localtime') FROM activity_logs ORDER BY timestamp DESC")?;
    let logs = stmt.query_map([], |row| {
        Ok(ActivityLog {
            id: row.get(0)?,
            action_type: row.get(1)?,
            details: row.get(2)?,
            timestamp: row.get(3)?,
        })
    })?.collect::<Result<Vec<_>, _>>()?;
    Ok(logs)
}
