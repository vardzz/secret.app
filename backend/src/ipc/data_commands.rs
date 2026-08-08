use tauri::State;
use crate::ipc::auth_commands::AppState;
use crate::db::{connection, data_workspace::{self, DataImport}};
use std::path::Path;
use std::fs;
use csv::ReaderBuilder;

fn open_conn(state: &State<'_, AppState>) -> Result<rusqlite::Connection, String> {
    let session = state.session.lock().unwrap();
    let key = session.key.as_ref().ok_or("Vault is locked")?;
    connection::open_database(state.db_path.to_str().unwrap(), key)
        .map_err(|e| e.to_string())
}

fn validate_path(path_str: &str) -> Result<std::path::PathBuf, String> {
    if path_str.contains("..") {
        return Err("Path traversal detected".into());
    }
    let path = Path::new(path_str);
    if !path.exists() {
        return Err("File does not exist".into());
    }
    fs::canonicalize(path).map_err(|e| format!("Failed to canonicalize path: {}", e))
}

#[tauri::command]
pub fn import_csv_file(file_path: String, state: State<'_, AppState>) -> Result<DataImport, String> {
    let valid_path = validate_path(&file_path)?;
    let mut rdr = ReaderBuilder::new().from_path(&valid_path).map_err(|e| e.to_string())?;
    
    let headers_record = rdr.headers().map_err(|e| e.to_string())?.clone();
    let mut headers = Vec::new();
    for h in headers_record.iter() {
        headers.push(h.to_string());
    }

    let mut rows = Vec::new();
    for result in rdr.records() {
        let record = result.map_err(|e| e.to_string())?;
        let mut row = Vec::new();
        for field in record.iter() {
            row.push(field.to_string());
        }
        rows.push(row);
    }

    let filename = valid_path.file_name().unwrap_or_default().to_string_lossy().into_owned();

    let mut conn = open_conn(&state)?;
    data_workspace::import_csv(&mut conn, &filename, headers, rows)
}

#[tauri::command]
pub fn get_imports(state: State<'_, AppState>) -> Result<Vec<DataImport>, String> {
    let conn = open_conn(&state)?;
    data_workspace::get_imports(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_import_data(internal_table_name: String, state: State<'_, AppState>) -> Result<(Vec<String>, Vec<Vec<String>>), String> {
    let conn = open_conn(&state)?;
    data_workspace::get_import_data(&conn, &internal_table_name)
}

#[tauri::command]
pub fn delete_import(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = open_conn(&state)?;
    data_workspace::delete_import(&mut conn, &id)
}
