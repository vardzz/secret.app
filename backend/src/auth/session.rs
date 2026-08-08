use zeroize::Zeroize;
use std::ffi::c_void;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Zeroize)]
pub struct SessionKey {
    pub key: [u8; 32],
}

impl SessionKey {
    pub fn new(key: [u8; 32]) -> Self {
        let mut sk = Self { key };
        sk.pin_memory();
        sk
    }

    fn pin_memory(&mut self) {
        let ptr = self.key.as_mut_ptr() as *mut c_void;
        let size = self.key.len();

        #[cfg(windows)]
        unsafe {
            use windows_sys::Win32::System::Memory::VirtualLock;
            // VirtualLock requires size in bytes
            let _ = VirtualLock(ptr, size);
        }

        #[cfg(unix)]
        unsafe {
            use libc::mlock;
            let _ = mlock(ptr, size);
        }
    }

    fn unpin_memory(&mut self) {
        let ptr = self.key.as_mut_ptr() as *mut c_void;
        let size = self.key.len();

        #[cfg(windows)]
        unsafe {
            use windows_sys::Win32::System::Memory::VirtualUnlock;
            let _ = VirtualUnlock(ptr, size);
        }

        #[cfg(unix)]
        unsafe {
            use libc::munlock;
            let _ = munlock(ptr, size);
        }
    }
}

impl Drop for SessionKey {
    fn drop(&mut self) {
        self.zeroize();
        self.unpin_memory();
    }
}

pub struct SessionState {
    pub key: Option<Arc<SessionKey>>,
    pub locked_until: u64,
    pub failed_attempts: u32,
}

impl SessionState {
    pub fn new() -> Self {
        Self {
            key: None,
            locked_until: 0,
            failed_attempts: 0,
        }
    }

    pub fn unlock(&mut self, key: SessionKey) {
        self.key = Some(Arc::new(key));
        self.failed_attempts = 0;
        self.locked_until = 0;
    }

    pub fn lock(&mut self) {
        // Drop the key. The Drop trait will zeroize and unpin it.
        self.key = None;
    }

    pub fn is_locked(&self) -> bool {
        self.key.is_none()
    }

    pub fn register_failure(&mut self) {
        self.failed_attempts += 1;
        let delay_secs = Self::calculate_backoff(self.failed_attempts);
        if delay_secs > 0 {
            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            self.locked_until = now + delay_secs;
        }
    }

    pub fn calculate_backoff(attempts: u32) -> u64 {
        match attempts {
            1..=3 => 0,
            4 => 2,
            5 => 4,
            6 => 8,
            7 => 16,
            8 => 32,
            9 => 64,
            _ => 128,
        }
    }
}
