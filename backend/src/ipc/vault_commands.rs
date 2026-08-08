use tauri::State;
use crate::ipc::auth_commands::AppState;
use crate::db::{connection, vault, backup, vault::VaultCredential};
use tauri_plugin_clipboard_manager::ClipboardExt;
use crate::auth::state_store::AuthStateStore;

fn open_conn(state: &State<'_, AppState>) -> Result<rusqlite::Connection, String> {
    let session = state.session.lock().unwrap();
    let key = session.key.as_ref().ok_or("Vault is locked")?;
    connection::open_database(state.db_path.to_str().unwrap(), key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_credential(
    account_name: String,
    username_email: String,
    encrypted_password: String,
    provider_url: Option<String>,
    state: State<'_, AppState>,
) -> Result<VaultCredential, String> {
    let mut conn = open_conn(&state)?;
    vault::create_credential(&mut conn, &account_name, &username_email, &encrypted_password, provider_url.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_credentials(state: State<'_, AppState>) -> Result<Vec<VaultCredential>, String> {
    let conn = open_conn(&state)?;
    vault::get_credentials(&conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_credential(
    id: String,
    account_name: String,
    username_email: String,
    encrypted_password: String,
    provider_url: Option<String>,
    is_favorite: bool,
    state: State<'_, AppState>,
) -> Result<VaultCredential, String> {
    let mut conn = open_conn(&state)?;
    vault::update_credential(&mut conn, &id, &account_name, &username_email, &encrypted_password, provider_url.as_deref(), is_favorite)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_db_integrity(state: State<'_, AppState>) -> Result<String, String> {
    let conn = open_conn(&state)?;
    let result: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0)).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub fn export_backup(out_path: String, password: String, state: State<'_, AppState>) -> Result<(), String> {
    let session = state.session.lock().unwrap();
    if session.is_locked() {
        return Err("Vault is locked".into());
    }
    
    let auth_store = AuthStateStore::load(&state.auth_state_path);
    let path = std::path::Path::new(&out_path);
    backup::export_backup(&state.db_path, path, &password, &auth_store.salt)
}

#[tauri::command]
pub fn import_backup(in_path: String, password: String, state: State<'_, AppState>) -> Result<(), String> {
    let path = std::path::Path::new(&in_path);
    let auth_salt = backup::import_backup(&state.db_path, path, &password)?;
    
    // Update auth_state.json with the restored salt
    let mut auth_store = AuthStateStore::load(&state.auth_state_path);
    auth_store.salt = auth_salt;
    auth_store.save(&state.auth_state_path)?;
    
    // Lock the session because the live DB key just changed underneath us
    let mut session = state.session.lock().unwrap();
    session.lock();
    
    Ok(())
}

#[tauri::command]
pub fn delete_credential(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = open_conn(&state)?;
    vault::delete_credential(&mut conn, &id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn copy_to_clipboard(
    text: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = open_conn(&state)?;
    
    // Write text to clipboard
    app.clipboard().write_text(text.clone()).map_err(|e| e.to_string())?;
    
    // Get clipboard clear seconds
    let seconds: u64 = conn.query_row(
        "SELECT clipboard_clear_seconds FROM app_settings WHERE id = 1",
        [],
        |row| row.get(0),
    ).unwrap_or(30);
    
    // Spawn background task
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(seconds)).await;
        
        // Read current clipboard to see if it hasn't been changed by the user
        if let Ok(current_text) = app_handle.clipboard().read_text() {
            if current_text == text {
                let _ = app_handle.clipboard().write_text("".to_string());
            }
        }
    });

    Ok(())
}
