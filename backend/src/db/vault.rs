use rusqlite::{Connection, Result, Row};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use super::activity::log_activity;

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultCredential {
    pub id: String,
    pub account_name: String,
    pub username_email: String,
    pub encrypted_password: String,
    pub provider_url: Option<String>,
    pub icon_svg_or_path: Option<String>,
    pub tags: Option<String>,
    pub is_favorite: bool,
    pub created_at: String,
    pub updated_at: String,
}

fn map_row_to_credential(row: &Row) -> Result<VaultCredential> {
    Ok(VaultCredential {
        id: row.get(0)?,
        account_name: row.get(1)?,
        username_email: row.get(2)?,
        encrypted_password: row.get(3)?,
        provider_url: row.get(4)?,
        icon_svg_or_path: row.get(5)?,
        tags: row.get(6)?,
        is_favorite: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

pub fn create_credential(
    conn: &mut Connection,
    account_name: &str,
    username_email: &str,
    encrypted_password: &str,
    provider_url: Option<&str>,
) -> Result<VaultCredential> {
    let id = Uuid::new_v4().to_string();
    
    let tx = conn.transaction()?;
    
    tx.execute(
        "INSERT INTO vault_credentials (id, account_name, username_email, encrypted_password, provider_url) 
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, account_name, username_email, encrypted_password, provider_url],
    )?;
    
    // Log activity in the same transaction
    log_activity(&tx, "Credential Created", Some(account_name))?;
    
    let cred = tx.query_row(
        "SELECT id, account_name, username_email, encrypted_password, provider_url, icon_svg_or_path, tags, is_favorite, created_at, updated_at 
         FROM vault_credentials WHERE id = ?1",
        rusqlite::params![id],
        map_row_to_credential,
    )?;
    
    tx.commit()?;
    
    Ok(cred)
}

pub fn get_credentials(conn: &Connection) -> Result<Vec<VaultCredential>> {
    let mut stmt = conn.prepare(
        "SELECT id, account_name, username_email, encrypted_password, provider_url, icon_svg_or_path, tags, is_favorite, created_at, updated_at 
         FROM vault_credentials ORDER BY account_name ASC"
    )?;
    
    let cred_iter = stmt.query_map([], map_row_to_credential)?;
    let mut creds = Vec::new();
    for cred in cred_iter {
        creds.push(cred?);
    }
    Ok(creds)
}

pub fn update_credential(
    conn: &mut Connection,
    id: &str,
    account_name: &str,
    username_email: &str,
    encrypted_password: &str,
    provider_url: Option<&str>,
    is_favorite: bool,
) -> Result<VaultCredential> {
    let tx = conn.transaction()?;
    
    tx.execute(
        "UPDATE vault_credentials SET 
         account_name = ?1, username_email = ?2, encrypted_password = ?3, provider_url = ?4, is_favorite = ?5, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?6",
        rusqlite::params![account_name, username_email, encrypted_password, provider_url, is_favorite, id],
    )?;
    
    log_activity(&tx, "Credential Updated", Some(account_name))?;
    
    let cred = tx.query_row(
        "SELECT id, account_name, username_email, encrypted_password, provider_url, icon_svg_or_path, tags, is_favorite, created_at, updated_at 
         FROM vault_credentials WHERE id = ?1",
        rusqlite::params![id],
        map_row_to_credential,
    )?;
    
    tx.commit()?;
    
    Ok(cred)
}

pub fn delete_credential(conn: &mut Connection, id: &str) -> Result<()> {
    let tx = conn.transaction()?;
    
    let account_name: String = tx.query_row(
        "SELECT account_name FROM vault_credentials WHERE id = ?1",
        rusqlite::params![id],
        |row| row.get(0),
    )?;
    
    tx.execute("DELETE FROM vault_credentials WHERE id = ?1", rusqlite::params![id])?;
    
    log_activity(&tx, "Credential Deleted", Some(&account_name))?;
    
    tx.commit()?;
    
    Ok(())
}
