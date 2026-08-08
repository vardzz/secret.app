use tauri::State;
use crate::ipc::auth_commands::AppState;
use crate::db::{connection, income::{self, IncomeEntry}};

fn open_conn(state: &State<'_, AppState>) -> Result<rusqlite::Connection, String> {
    let session = state.session.lock().unwrap();
    let key = session.key.as_ref().ok_or("Vault is locked")?;
    connection::open_database(state.db_path.to_str().unwrap(), key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_income_entry(
    amount: f64,
    currency: String,
    date: String,
    category: String,
    notes: Option<String>,
    state: State<'_, AppState>
) -> Result<IncomeEntry, String> {
    let mut conn = open_conn(&state)?;
    income::create_income_entry(&mut conn, amount, &currency, &date, &category, notes.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_income_entries(state: State<'_, AppState>) -> Result<Vec<IncomeEntry>, String> {
    let conn = open_conn(&state)?;
    income::get_income_entries(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_income_entry(
    id: String,
    amount: f64,
    currency: String,
    date: String,
    category: String,
    notes: Option<String>,
    state: State<'_, AppState>
) -> Result<(), String> {
    let mut conn = open_conn(&state)?;
    income::update_income_entry(&mut conn, &id, amount, &currency, &date, &category, notes.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_income_entry(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = open_conn(&state)?;
    income::delete_income_entry(&mut conn, &id).map_err(|e| e.to_string())
}
