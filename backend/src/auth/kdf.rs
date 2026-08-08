use argon2::{Argon2, Algorithm, Version, Params};
use zeroize::Zeroize;

pub fn derive_key(password: &mut [u8], salt: &[u8]) -> Result<[u8; 32], argon2::Error> {
    // m=262144 (256 MB), t=3, p=4
    let params = Params::new(262144, 3, 4, Some(32))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = [0u8; 32];
    argon2.hash_password_into(password, salt, &mut key)?;

    // Zeroize the password buffer immediately after deriving the key
    password.zeroize();

    Ok(key)
}
