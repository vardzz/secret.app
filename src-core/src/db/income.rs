use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use super::activity::log_activity;

#[derive(Debug, Serialize, Deserialize)]
pub struct IncomeEntry {
    pub id: String,
    pub amount: f64,
    pub currency: String,
    pub date: String,
    pub category: String,
    pub notes: Option<String>,
    pub created_at: String,
}

pub fn create_income_entry(
    conn: &mut Connection,
    amount: f64,
    currency: &str,
    date: &str,
    category: &str,
    notes: Option<&str>,
) -> Result<IncomeEntry> {
    let id = Uuid::new_v4().to_string();
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO income_entries (id, amount, currency, date, category, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, amount, currency, date, category, notes],
    )?;
    log_activity(&tx, "Income Entry Created", Some(&format!("{} {}", amount, currency)))?;
    let entry = tx.query_row(
        "SELECT id, amount, currency, date, category, notes, datetime(created_at, 'localtime') FROM income_entries WHERE id = ?1",
        params![id],
        |row| Ok(IncomeEntry {
            id: row.get(0)?,
            amount: row.get(1)?,
            currency: row.get(2)?,
            date: row.get(3)?,
            category: row.get(4)?,
            notes: row.get(5)?,
            created_at: row.get(6)?,
        })
    )?;
    tx.commit()?;
    Ok(entry)
}

pub fn get_income_entries(conn: &Connection) -> Result<Vec<IncomeEntry>> {
    let mut stmt = conn.prepare("SELECT id, amount, currency, date, category, notes, datetime(created_at, 'localtime') FROM income_entries ORDER BY date DESC")?;
    let entries = stmt.query_map([], |row| {
        Ok(IncomeEntry {
            id: row.get(0)?,
            amount: row.get(1)?,
            currency: row.get(2)?,
            date: row.get(3)?,
            category: row.get(4)?,
            notes: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?.collect::<Result<Vec<_>, _>>()?;
    Ok(entries)
}

pub fn update_income_entry(
    conn: &mut Connection,
    id: &str,
    amount: f64,
    currency: &str,
    date: &str,
    category: &str,
    notes: Option<&str>,
) -> Result<()> {
    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE income_entries SET amount = ?1, currency = ?2, date = ?3, category = ?4, notes = ?5 WHERE id = ?6",
        params![amount, currency, date, category, notes, id],
    )?;
    log_activity(&tx, "Income Entry Updated", Some(&format!("{} {}", amount, currency)))?;
    tx.commit()?;
    Ok(())
}

pub fn delete_income_entry(conn: &mut Connection, id: &str) -> Result<()> {
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM income_entries WHERE id = ?1", params![id])?;
    log_activity(&tx, "Income Entry Deleted", None)?;
    tx.commit()?;
    Ok(())
}
