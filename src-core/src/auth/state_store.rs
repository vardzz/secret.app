use std::fs;
use std::path::PathBuf;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Default)]
pub struct AuthStateStore {
    pub failed_unlock_count: u32,
    pub lockout_until: u64,
    pub salt: [u8; 16], // Store salt here since DB header is encrypted
}

impl AuthStateStore {
    pub fn load(path: &PathBuf) -> Self {
        if let Ok(data) = fs::read_to_string(path) {
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            // Generate a secure salt on first run
            let mut state = Self::default();
            // TODO: Use getrandom for real randomness
            state.salt = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
            state
        }
    }

    pub fn save(&self, path: &PathBuf) -> Result<(), String> {
        let data = serde_json::to_string(self).map_err(|e| e.to_string())?;
        fs::write(path, data).map_err(|e| e.to_string())
    }
}
