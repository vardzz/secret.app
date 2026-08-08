use tauri::State;
use std::sync::Mutex;
use crate::auth::session::{SessionState, SessionKey};
use crate::auth::kdf;
use crate::auth::state_store::AuthStateStore;
use crate::db::connection;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::db::activity::log_activity;

pub struct AppState {
    pub session: Mutex<SessionState>,
    pub db_path: PathBuf,
    pub auth_state_path: PathBuf,
}

#[tauri::command]
pub fn setup_master_password(password: String, state: State<'_, AppState>) -> Result<(), String> {
    if password.len() < 12 {
        return Err("Password too short".into());
    }
    
    let mut session = state.session.lock().unwrap();
    let auth_store = AuthStateStore::load(&state.auth_state_path);
    
    let mut pwd_bytes = password.into_bytes();
    let key = kdf::derive_key(&mut pwd_bytes, &auth_store.salt).map_err(|e| e.to_string())?;
    
    let session_key = SessionKey::new(key);

    let conn = connection::open_database(state.db_path.to_str().unwrap(), &session_key)
        .map_err(|e| e.to_string())?;

    connection::initialize_schema(&conn).map_err(|e| e.to_string())?;
    let _ = log_activity(&conn, "Vault Initialized", None);

    session.unlock(session_key);
    Ok(())
}

#[tauri::command]
pub fn unlock(password: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut session = state.session.lock().unwrap();
    let mut auth_store = AuthStateStore::load(&state.auth_state_path);
    
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    if auth_store.lockout_until > now {
        return Err(format!("Locked out for {} seconds", auth_store.lockout_until - now));
    }

    let mut pwd_bytes = password.into_bytes();
    let key = kdf::derive_key(&mut pwd_bytes, &auth_store.salt).map_err(|e| e.to_string())?;
    
    let session_key = SessionKey::new(key);
    
    match connection::open_database(state.db_path.to_str().unwrap(), &session_key) {
        Ok(conn) => {
            session.unlock(session_key);
            
            if auth_store.failed_unlock_count > 0 {
                let _ = log_activity(&conn, "Failed Unlock Attempts", Some(&format!("{} prior failed attempts", auth_store.failed_unlock_count)));
            }
            let _ = log_activity(&conn, "Vault Unlocked", None);
            
            auth_store.failed_unlock_count = 0;
            auth_store.lockout_until = 0;
            let _ = auth_store.save(&state.auth_state_path);
            Ok(())
        },
        Err(_) => {
            drop(session_key);
            
            auth_store.failed_unlock_count += 1;
            let delay = SessionState::calculate_backoff(auth_store.failed_unlock_count);
            if delay > 0 {
                auth_store.lockout_until = now + delay;
            }
            let _ = auth_store.save(&state.auth_state_path);
            
            Err("Invalid password".into())
        }
    }
}

#[tauri::command]
pub fn lock(state: State<'_, AppState>) -> Result<(), String> {
    let mut session = state.session.lock().unwrap();
    session.lock();
    Ok(())
}

#[tauri::command]
pub fn get_auth_state(state: State<'_, AppState>) -> Result<bool, String> {
    let session = state.session.lock().unwrap();
    Ok(!session.is_locked())
}

#[tauri::command]
pub fn needs_setup(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(!state.db_path.exists())
}
