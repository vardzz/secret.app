use tauri::State;
use crate::ipc::auth_commands::AppState;
use crate::db::{connection, notes::{self, Note, NoteFolder}};

fn open_conn(state: &State<'_, AppState>) -> Result<rusqlite::Connection, String> {
    let session = state.session.lock().unwrap();
    let key = session.key.as_ref().ok_or("Vault is locked")?;
    connection::open_database(state.db_path.to_str().unwrap(), key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_folder(name: String, parent_id: Option<String>, state: State<'_, AppState>) -> Result<NoteFolder, String> {
    let mut conn = open_conn(&state)?;
    notes::create_folder(&mut conn, &name, parent_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_folders(state: State<'_, AppState>) -> Result<Vec<NoteFolder>, String> {
    let conn = open_conn(&state)?;
    notes::get_folders(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_folder(id: String, name: String, parent_id: Option<String>, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = open_conn(&state)?;
    notes::update_folder(&mut conn, &id, &name, parent_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_folder(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = open_conn(&state)?;
    notes::delete_folder(&mut conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_note(
    title: String,
    content_markdown: Option<String>,
    folder_id: Option<String>,
    is_favorite: bool,
    state: State<'_, AppState>
) -> Result<Note, String> {
    let mut conn = open_conn(&state)?;
    notes::create_note(&mut conn, &title, content_markdown.as_deref(), folder_id.as_deref(), is_favorite).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_notes(state: State<'_, AppState>) -> Result<Vec<Note>, String> {
    let conn = open_conn(&state)?;
    notes::get_notes(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_note(
    id: String,
    title: String,
    content_markdown: Option<String>,
    folder_id: Option<String>,
    is_favorite: bool,
    state: State<'_, AppState>
) -> Result<(), String> {
    let mut conn = open_conn(&state)?;
    notes::update_note(&mut conn, &id, &title, content_markdown.as_deref(), folder_id.as_deref(), is_favorite).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_note(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = open_conn(&state)?;
    notes::delete_note(&mut conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_notes(query: String, state: State<'_, AppState>) -> Result<Vec<Note>, String> {
    let conn = open_conn(&state)?;
    notes::search_notes(&conn, &query).map_err(|e| e.to_string())
}
