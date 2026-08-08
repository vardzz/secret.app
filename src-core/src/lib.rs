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
use ipc::vault_commands;
use ipc::notes_commands;
use ipc::tasks_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
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
        vault_commands::create_credential,
        vault_commands::get_credentials,
        vault_commands::update_credential,
        vault_commands::delete_credential,
        vault_commands::copy_to_clipboard,
        notes_commands::create_folder,
        notes_commands::get_folders,
        notes_commands::update_folder,
        notes_commands::delete_folder,
        notes_commands::create_note,
        notes_commands::get_notes,
        notes_commands::update_note,
        notes_commands::delete_note,
        notes_commands::search_notes,
        tasks_commands::create_task,
        tasks_commands::get_tasks,
        tasks_commands::update_task,
        tasks_commands::delete_task,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
