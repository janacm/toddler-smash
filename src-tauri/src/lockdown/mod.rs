//! Per-OS keyboard lockdown. Each platform module exposes the same three
//! functions: `engage` once at startup, `release` before exit, and `is_active`
//! for the grown-up panel to report whether the lock is actually working.

#[cfg(windows)]
mod win;
#[cfg(windows)]
pub use win::{engage, is_active, release};

#[cfg(target_os = "macos")]
mod mac;
#[cfg(target_os = "macos")]
pub use mac::{engage, is_active, release};

#[cfg(not(any(windows, target_os = "macos")))]
mod other {
    pub fn engage(_app: &tauri::AppHandle) {}
    pub fn release() {}
    pub fn is_active() -> bool {
        false
    }
}
#[cfg(not(any(windows, target_os = "macos")))]
pub use other::{engage, is_active, release};
