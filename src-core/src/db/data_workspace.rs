use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use super::activity::log_activity;
use regex::Regex;

#[derive(Debug, Serialize, Deserialize)]
pub struct DataImport {
    pub id: String,
    pub source_filename: String,
    pub internal_table_name: String,
    pub row_count: u32,
    pub imported_at: String,
}

/// A strictly defensive function to sanitize column names exactly as mandated in Phase 4 decisions.
pub fn sanitize_column_name(header: &str, index: usize, seen: &mut Vec<String>) -> String {
    let mut clean = header.to_lowercase().replace([' ', '-'], "_");
    
    // Strip all non-alphanumeric/underscore chars
    let re = Regex::new(r"[^a-z0-9_]").unwrap();
    clean = re.replace_all(&clean, "").to_string();

    // Must start with a letter
    if clean.is_empty() {
        clean = format!("col_{}", index);
    } else {
        let first_char = clean.chars().next().unwrap();
        if !first_char.is_ascii_alphabetic() && first_char != '_' {
            clean = format!("col_{}", clean);
        }
    }

    // Limit length to 63
    if clean.len() > 63 {
        clean.truncate(63);
    }

    // Ensure uniqueness
    let mut final_name = clean.clone();
    let mut counter = 2;
    while seen.contains(&final_name) {
        let suffix = format!("_{}", counter);
        if clean.len() + suffix.len() > 63 {
            final_name = format!("{}{}", &clean[..63 - suffix.len()], suffix);
        } else {
            final_name = format!("{}{}", clean, suffix);
        }
        counter += 1;
    }

    seen.push(final_name.clone());
    final_name
}

pub fn import_csv(
    conn: &mut Connection,
    filename: &str,
    headers: Vec<String>,
    rows: Vec<Vec<String>>,
) -> Result<DataImport, String> {
    if headers.is_empty() || rows.is_empty() {
        return Err("Cannot import empty dataset".into());
    }

    let uuid_hex = Uuid::new_v4().simple().to_string();
    let internal_table_name = format!("data_import_{}", uuid_hex);

    let mut sanitized_headers = Vec::new();
    let mut seen = Vec::new();
    for (i, header) in headers.iter().enumerate() {
        sanitized_headers.push(sanitize_column_name(header, i, &mut seen));
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Defense in Depth: the internal_table_name is strictly known safe (UUID hex). We still wrap it in quotes.
    // The sanitized_headers are strictly regex-validated. We still wrap them in quotes.
    
    let mut columns_ddl = Vec::new();
    columns_ddl.push("\"id\" INTEGER PRIMARY KEY AUTOINCREMENT".to_string());
    for col in &sanitized_headers {
        columns_ddl.push(format!("\"{}\" TEXT", col));
    }

    let create_table_sql = format!(
        "CREATE TABLE \"{}\" ({})",
        internal_table_name,
        columns_ddl.join(", ")
    );

    tx.execute(&create_table_sql, []).map_err(|e| e.to_string())?;

    let placeholders = vec!["?"; sanitized_headers.len()].join(", ");
    let insert_sql = format!(
        "INSERT INTO \"{}\" ({}) VALUES ({})",
        internal_table_name,
        sanitized_headers.iter().map(|h| format!("\"{}\"", h)).collect::<Vec<_>>().join(", "),
        placeholders
    );

    let mut insert_stmt = tx.prepare(&insert_sql).map_err(|e| e.to_string())?;
    let mut row_count = 0;
    
    for row in rows {
        // Ensure row length matches header length by padding or truncating
        let mut row_data = row;
        if row_data.len() < sanitized_headers.len() {
            row_data.resize(sanitized_headers.len(), "".to_string());
        } else if row_data.len() > sanitized_headers.len() {
            row_data.truncate(sanitized_headers.len());
        }
        
        let params_vec: Vec<&dyn rusqlite::ToSql> = row_data.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
        insert_stmt.execute(params_vec.as_slice()).map_err(|e| e.to_string())?;
        row_count += 1;
    }

    drop(insert_stmt);

    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO data_imports (id, source_filename, internal_table_name, row_count) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, filename, internal_table_name, row_count],
    ).map_err(|e| e.to_string())?;

    log_activity(&tx, "Data Import", Some(filename)).map_err(|e| e.to_string())?;
    
    let import_record = tx.query_row(
        "SELECT id, source_filename, internal_table_name, row_count, datetime(imported_at, 'localtime') FROM data_imports WHERE id = ?1",
        rusqlite::params![id],
        |r| Ok(DataImport {
            id: r.get(0)?,
            source_filename: r.get(1)?,
            internal_table_name: r.get(2)?,
            row_count: r.get(3)?,
            imported_at: r.get(4)?,
        })
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(import_record)
}

pub fn get_imports(conn: &Connection) -> Result<Vec<DataImport>> {
    let mut stmt = conn.prepare("SELECT id, source_filename, internal_table_name, row_count, datetime(imported_at, 'localtime') FROM data_imports ORDER BY imported_at DESC")?;
    let imports = stmt.query_map([], |row| {
        Ok(DataImport {
            id: row.get(0)?,
            source_filename: row.get(1)?,
            internal_table_name: row.get(2)?,
            row_count: row.get(3)?,
            imported_at: row.get(4)?,
        })
    })?.collect::<Result<Vec<_>, _>>()?;
    Ok(imports)
}

pub fn get_import_data(conn: &Connection, internal_table_name: &str) -> Result<(Vec<String>, Vec<Vec<String>>), String> {
    // Whitelist internal_table_name before doing ANYTHING
    let re = Regex::new(r"^data_import_[a-f0-9]{32}$").unwrap();
    if !re.is_match(internal_table_name) {
        return Err("Invalid table name".into());
    }

    let mut stmt = conn.prepare(&format!("PRAGMA table_info(\"{}\")", internal_table_name)).map_err(|e| e.to_string())?;
    let mut headers = Vec::new();
    let rows = stmt.query_map([], |row| {
        let name: String = row.get(1)?;
        Ok(name)
    }).map_err(|e| e.to_string())?;

    for row in rows {
        let name = row.map_err(|e| e.to_string())?;
        if name != "id" {
            headers.push(name);
        }
    }

    let mut stmt = conn.prepare(&format!("SELECT * FROM \"{}\"", internal_table_name)).map_err(|e| e.to_string())?;
    let column_count = stmt.column_count();
    
    let mut data_rows = Vec::new();
    let rows = stmt.query_map([], |row| {
        let mut row_data = Vec::new();
        // Skip 'id' column which is at index 0
        for i in 1..column_count {
            let val: Option<String> = row.get(i)?;
            row_data.push(val.unwrap_or_default());
        }
        Ok(row_data)
    }).map_err(|e| e.to_string())?;

    for row in rows {
        data_rows.push(row.map_err(|e| e.to_string())?);
    }

    Ok((headers, data_rows))
}

pub fn delete_import(conn: &mut Connection, id: &str) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    let internal_table_name: String = tx.query_row(
        "SELECT internal_table_name FROM data_imports WHERE id = ?1",
        rusqlite::params![id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    let re = Regex::new(r"^data_import_[a-f0-9]{32}$").unwrap();
    if !re.is_match(&internal_table_name) {
        return Err("Invalid table name".into());
    }

    tx.execute(&format!("DROP TABLE \"{}\"", internal_table_name), []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM data_imports WHERE id = ?1", rusqlite::params![id]).map_err(|e| e.to_string())?;
    
    log_activity(&tx, "Data Import Deleted", None).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_malicious_column_sanitization() {
        let mut seen = Vec::new();
        
        let header1 = "DROP TABLE users;--";
        let clean1 = sanitize_column_name(header1, 0, &mut seen);
        assert_eq!(clean1, "drop_table_users");

        let header2 = "Transaction Date!";
        let clean2 = sanitize_column_name(header2, 1, &mut seen);
        assert_eq!(clean2, "transaction_date");

        let header3 = "123_invalid_start";
        let clean3 = sanitize_column_name(header3, 2, &mut seen);
        assert_eq!(clean3, "col_123_invalid_start");

        let header4 = "";
        let clean4 = sanitize_column_name(header4, 3, &mut seen);
        assert_eq!(clean4, "col_3");

        // Duplicate test
        let header5 = "Transaction Date!";
        let clean5 = sanitize_column_name(header5, 4, &mut seen);
        assert_eq!(clean5, "transaction_date_2");

        let header6 = "VeryLongHeaderThatExceedsTheSixtyThreeCharacterLimitToSeeIfTruncationWorksCorrectlyAndSafely";
        let clean6 = sanitize_column_name(header6, 5, &mut seen);
        assert_eq!(clean6.len(), 63);
    }
}
