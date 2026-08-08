use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    ChaCha20Poly1305, Nonce,
};
use rand::RngCore;
use std::fs;
use std::path::Path;
use crate::auth::session::SessionKey;
use argon2::{Argon2, Params};
use crate::db::connection;
use std::time::{SystemTime, UNIX_EPOCH};

const MAGIC_HEADER: &[u8] = b"SECVLTv1"; // 8 bytes
const SALT_LEN: usize = 32;
const NONCE_LEN: usize = 12;
// MAC is appended by ChaCha20Poly1305 automatically (16 bytes)

fn derive_backup_key(password: &str, salt_bytes: &[u8]) -> Result<[u8; 32], String> {
    // We use raw Argon2id to derive a 32-byte key
    let mut key = [0u8; 32];
    let params = Params::new(
        64 * 1024, // m_cost: 64 MB
        3,         // t_cost: 3 iterations
        4,         // p_cost: 4 lanes
        Some(32),  // output length
    ).map_err(|e| e.to_string())?;
    
    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        argon2::Version::V0x13,
        params,
    );
    
    argon2.hash_password_into(
        password.as_bytes(),
        salt_bytes,
        &mut key,
    ).map_err(|e| e.to_string())?;
    
    Ok(key)
}

pub fn export_backup(db_path: &Path, backup_out_path: &Path, password: &str, auth_salt: &[u8; 16]) -> Result<(), String> {
    if !db_path.exists() {
        return Err("Vault database not found".into());
    }

    let db_bytes = fs::read(db_path).map_err(|e| e.to_string())?;

    let mut salt = [0u8; SALT_LEN];
    OsRng.fill_bytes(&mut salt);

    let key_bytes = derive_backup_key(password, &salt)?;
    
    let cipher = ChaCha20Poly1305::new(chacha20poly1305::Key::from_slice(&key_bytes));
    let nonce = ChaCha20Poly1305::generate_nonce(&mut OsRng); // 12-bytes
    
    let ciphertext = cipher.encrypt(&nonce, db_bytes.as_ref())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let mut payload = Vec::new();
    payload.extend_from_slice(MAGIC_HEADER);
    payload.extend_from_slice(&salt);
    payload.extend_from_slice(auth_salt); // 16 bytes
    payload.extend_from_slice(nonce.as_slice());
    payload.extend_from_slice(&ciphertext); // includes the MAC tag at the end

    fs::write(backup_out_path, payload).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn import_backup(live_db_path: &Path, backup_in_path: &Path, password: &str) -> Result<[u8; 16], String> {
    let enc_bytes = fs::read(backup_in_path).map_err(|e| e.to_string())?;

    let min_len = MAGIC_HEADER.len() + SALT_LEN + 16 + NONCE_LEN + 16; // 16 bytes auth_salt + 16 bytes MAC
    if enc_bytes.len() < min_len {
        return Err("Backup file is too small or corrupted".into());
    }

    let (magic, rest) = enc_bytes.split_at(MAGIC_HEADER.len());
    if magic != MAGIC_HEADER {
        return Err("Invalid backup file signature".into());
    }

    let (backup_salt, rest) = rest.split_at(SALT_LEN);
    let (auth_salt_bytes, rest) = rest.split_at(16);
    let mut auth_salt = [0u8; 16];
    auth_salt.copy_from_slice(auth_salt_bytes);
    
    let (nonce_bytes, ciphertext) = rest.split_at(NONCE_LEN);

    let key_bytes = derive_backup_key(password, backup_salt)?;
    let cipher = ChaCha20Poly1305::new(chacha20poly1305::Key::from_slice(&key_bytes));
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext_db_bytes = cipher.decrypt(nonce, ciphertext)
        .map_err(|_| "Decryption failed. Incorrect password or corrupted backup file.")?;

    // Temp Staging
    let tmp_db_path = live_db_path.with_extension("restore.tmp.db");
    fs::write(&tmp_db_path, plaintext_db_bytes).map_err(|e| e.to_string())?;

    // Integrity Check on Temp DB
    let verify_result = (|| -> Result<(), String> {
        let mut pwd_bytes = password.to_string().into_bytes();
        let derived_key = crate::auth::kdf::derive_key(&mut pwd_bytes, &auth_salt).map_err(|e| e.to_string())?;
        let session_key = SessionKey::new(derived_key);
        let conn = connection::open_database(tmp_db_path.to_str().unwrap(), &session_key).map_err(|e| e.to_string())?;
        
        let result: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0)).map_err(|e| e.to_string())?;
        if result.to_lowercase() != "ok" {
            return Err(format!("Backup database failed integrity check: {}", result));
        }
        Ok(())
    })();

    if let Err(e) = verify_result {
        let _ = fs::remove_file(&tmp_db_path);
        return Err(e);
    }

    // Atomic Swap
    if live_db_path.exists() {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        let pre_restore_path = live_db_path.with_file_name(format!("vault.{}.pre_restore.db", now));
        fs::copy(live_db_path, &pre_restore_path).map_err(|e| format!("Failed to create pre-restore snapshot: {}", e))?;
    }

    fs::rename(&tmp_db_path, live_db_path).map_err(|e| format!("Failed to swap restored database: {}", e))?;
    
    Ok(auth_salt)
}
