#![deny(warnings)]

pub mod auth;
pub mod db;
pub mod ipc;
pub mod import;
pub mod backup;

use std::sync::Mutex;
use std::path::PathBuf;
use auth::session::SessionState;
use ipc::auth_commands::{self, AppState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      use tauri::Manager;
      
      let app_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
      std::fs::create_dir_all(&app_dir).unwrap_or_default();
      
      let db_path = app_dir.join("vault.db");
      let auth_state_path = app_dir.join("auth_state.json");
      
      app.manage(AppState {
          session: Mutex::new(SessionState::new()),
          db_path,
          auth_state_path,
      });

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        auth_commands::setup_master_password,
        auth_commands::unlock,
        auth_commands::lock,
        auth_commands::get_auth_state,
        auth_commands::needs_setup,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
