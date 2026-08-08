use tauri::State;
use crate::ipc::auth_commands::AppState;
use crate::db::{connection, activity::{self, ActivityLog}};

fn open_conn(state: &State<'_, AppState>) -> Result<rusqlite::Connection, String> {
    let session = state.session.lock().unwrap();
    let key = session.key.as_ref().ok_or("Vault is locked")?;
    connection::open_database(state.db_path.to_str().unwrap(), key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_activity_logs(state: State<'_, AppState>) -> Result<Vec<ActivityLog>, String> {
    let conn = open_conn(&state)?;
    activity::get_activity_logs(&conn).map_err(|e| e.to_string())
}
