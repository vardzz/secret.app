use tauri::State;
use std::sync::Mutex;
use crate::auth::session::{SessionState, SessionKey};
use crate::auth::kdf;
use crate::auth::state_store::AuthStateStore;
use crate::db::connection;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::db::activity::log_activity;
use rand::{rngs::OsRng, RngCore};

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
    if !state.db_path.exists() {
        return Ok(true);
    }
    
    // If the file exists but is 0 bytes, setup failed halfway previously.
    if let Ok(metadata) = std::fs::metadata(&state.db_path) {
        if metadata.len() == 0 {
            return Ok(true);
        }
    }
    
    Ok(false)
}

#[tauri::command]
pub fn change_master_password(old_password: String, new_password: String, state: State<'_, AppState>) -> Result<(), String> {
    if new_password.len() < 12 {
        return Err("New password too short".into());
    }

    let mut session = state.session.lock().unwrap();
    let current_key = session.key.as_ref().ok_or("Vault is locked")?.clone();
    
    let mut auth_store = AuthStateStore::load(&state.auth_state_path);
    
    // Verify old password
    let mut old_pwd_bytes = old_password.into_bytes();
    let old_key = kdf::derive_key(&mut old_pwd_bytes, &auth_store.salt).map_err(|e| e.to_string())?;
    
    if old_key != current_key.key {
        return Err("Invalid current password".into());
    }

    // Generate new salt and derive new key
    let mut new_salt = [0u8; 16];
    OsRng.fill_bytes(&mut new_salt);
    
    let mut new_pwd_bytes = new_password.into_bytes();
    let new_key_bytes = kdf::derive_key(&mut new_pwd_bytes, &new_salt).map_err(|e| e.to_string())?;
    let new_session_key = SessionKey::new(new_key_bytes);

    // Open DB with current key to issue rekey
    let conn = connection::open_database(state.db_path.to_str().unwrap(), &current_key)
        .map_err(|e| e.to_string())?;

    // PRAGMA rekey takes the new key as a hex string with "x'" prefix, but rusqlite bundled-sqlcipher 
    // provides a high-level way to rekey via standard pragma bindings if we execute it.
    // However, the safest and cleanest way is using the built-in raw execute for pragma rekey.
    let hex_key = hex::encode(&new_session_key.key);
    conn.execute(&format!("PRAGMA rekey = \"x'{}'\"", hex_key), []).map_err(|e| e.to_string())?;

    let _ = log_activity(&conn, "Master Password Changed", None);

    // Update state store with new salt
    auth_store.salt = new_salt;
    auth_store.save(&state.auth_state_path)?;

    // Update session
    session.unlock(new_session_key);

    Ok(())
}
