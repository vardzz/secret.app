use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use super::activity::log_activity;

#[derive(Debug, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub tags: Option<String>,
    pub due_date: Option<String>,
    pub created_at: String,
}

pub fn create_task(
    conn: &mut Connection,
    title: &str,
    description: Option<&str>,
    status: &str,
    priority: &str,
    tags: Option<&str>,
    due_date: Option<&str>,
) -> Result<Task> {
    let id = Uuid::new_v4().to_string();
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO tasks (id, title, description, status, priority, tags, due_date) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, title, description, status, priority, tags, due_date],
    )?;
    log_activity(&tx, "Task Created", Some(title))?;
    let task = tx.query_row(
        "SELECT id, title, description, status, priority, tags, due_date, datetime(created_at, 'localtime') FROM tasks WHERE id = ?1",
        params![id],
        |row| Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            status: row.get(3)?,
            priority: row.get(4)?,
            tags: row.get(5)?,
            due_date: row.get(6)?,
            created_at: row.get(7)?,
        })
    )?;
    tx.commit()?;
    Ok(task)
}

pub fn get_tasks(conn: &Connection) -> Result<Vec<Task>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, description, status, priority, tags, due_date, datetime(created_at, 'localtime') FROM tasks ORDER BY created_at DESC",
    )?;
    let task_iter = stmt.query_map([], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            status: row.get(3)?,
            priority: row.get(4)?,
            tags: row.get(5)?,
            due_date: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;

    let mut tasks = Vec::new();
    for task in task_iter {
        tasks.push(task?);
    }
    Ok(tasks)
}

pub fn update_task(
    conn: &mut Connection,
    id: &str,
    title: &str,
    description: Option<&str>,
    status: &str,
    priority: &str,
    tags: Option<&str>,
    due_date: Option<&str>,
) -> Result<()> {
    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE tasks SET title = ?1, description = ?2, status = ?3, priority = ?4, tags = ?5, due_date = ?6 WHERE id = ?7",
        params![title, description, status, priority, tags, due_date, id],
    )?;
    log_activity(&tx, "Task Updated", Some(title))?;
    tx.commit()?;
    Ok(())
}

pub fn delete_task(conn: &mut Connection, id: &str) -> Result<()> {
    let tx = conn.transaction()?;
    let title: String = tx.query_row("SELECT title FROM tasks WHERE id = ?1", params![id], |row| row.get(0)).unwrap_or_default();
    tx.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
    log_activity(&tx, "Task Deleted", Some(&title))?;
    tx.commit()?;
    Ok(())
}
