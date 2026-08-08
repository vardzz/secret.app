use tauri::State;
use crate::ipc::auth_commands::AppState;
use crate::db::{connection, tasks::{self, Task}};

fn open_conn(state: &State<'_, AppState>) -> Result<rusqlite::Connection, String> {
    let session = state.session.lock().unwrap();
    let key = session.key.as_ref().ok_or("Vault is locked")?;
    connection::open_database(state.db_path.to_str().unwrap(), key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_task(
    title: String,
    description: Option<String>,
    status: String,
    priority: String,
    tags: Option<String>,
    due_date: Option<String>,
    state: State<'_, AppState>
) -> Result<Task, String> {
    let mut conn = open_conn(&state)?;
    tasks::create_task(&mut conn, &title, description.as_deref(), &status, &priority, tags.as_deref(), due_date.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let conn = open_conn(&state)?;
    tasks::get_tasks(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_task(
    id: String,
    title: String,
    description: Option<String>,
    status: String,
    priority: String,
    tags: Option<String>,
    due_date: Option<String>,
    state: State<'_, AppState>
) -> Result<(), String> {
    let mut conn = open_conn(&state)?;
    tasks::update_task(&mut conn, &id, &title, description.as_deref(), &status, &priority, tags.as_deref(), due_date.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_task(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = open_conn(&state)?;
    tasks::delete_task(&mut conn, &id).map_err(|e| e.to_string())
}
