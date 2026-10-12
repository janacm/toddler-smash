//! Windows lockdown: a low-level keyboard hook that swallows the Windows keys,
//! the menu key, Alt-Tab, Alt-Esc, Alt-F4, Alt-Space, Ctrl-Esc,
//! Ctrl-Shift-Esc and the media/browser/launch keys while our window is in
//! front. Also turns off the Sticky Keys / Filter Keys / Toggle Keys hotkeys
//! (five Shift presses, holding right Shift, holding Num Lock) and puts them
//! back on exit.
//!
//! Ctrl-Alt-Del and Win-L are handled by the OS below any hook and can't be
//! blocked; both land on the lock screen, which is harmless.

use std::ffi::c_void;
use std::mem::size_of;
use std::ptr;
use std::sync::atomic::{AtomicPtr, Ordering};
use std::sync::Mutex;

use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::Threading::GetCurrentProcessId;
use windows::Win32::UI::Accessibility::{
    FILTERKEYS, SKF_CONFIRMHOTKEY, SKF_HOTKEYACTIVE, SKF_STICKYKEYSON, STICKYKEYS, TOGGLEKEYS,
};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, VK_APPS, VK_BROWSER_BACK, VK_CONTROL, VK_ESCAPE, VK_F4, VK_LAUNCH_APP2,
    VK_LWIN, VK_RWIN, VK_SLEEP, VK_SPACE, VK_TAB,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, GetForegroundWindow, GetWindowThreadProcessId, SetWindowsHookExW,
    SystemParametersInfoW, UnhookWindowsHookEx, HC_ACTION, HHOOK, KBDLLHOOKSTRUCT, LLKHF_ALTDOWN,
    SPI_GETFILTERKEYS, SPI_GETSTICKYKEYS, SPI_GETTOGGLEKEYS, SPI_SETFILTERKEYS, SPI_SETSTICKYKEYS,
    SPI_SETTOGGLEKEYS, SYSTEM_PARAMETERS_INFO_ACTION, SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS,
    WH_KEYBOARD_LL,
};

// WinUser.h values; the `windows` crate types these fields as plain u32.
const FKF_FILTERKEYSON: u32 = 0x1;
const FKF_HOTKEYACTIVE: u32 = 0x4;
const FKF_CONFIRMHOTKEY: u32 = 0x8;
const TKF_TOGGLEKEYSON: u32 = 0x1;
const TKF_HOTKEYACTIVE: u32 = 0x4;
const TKF_CONFIRMHOTKEY: u32 = 0x8;

static HOOK: AtomicPtr<c_void> = AtomicPtr::new(ptr::null_mut());
static SAVED: Mutex<Option<(STICKYKEYS, FILTERKEYS, TOGGLEKEYS)>> = Mutex::new(None);

fn we_are_in_front() -> bool {
    unsafe {
        let mut pid = 0u32;
        GetWindowThreadProcessId(GetForegroundWindow(), Some(&mut pid));
        pid == GetCurrentProcessId()
    }
}

fn should_block(key: &KBDLLHOOKSTRUCT) -> bool {
    let vk = key.vkCode as u16;
    let alt = key.flags.contains(LLKHF_ALTDOWN);
    let ctrl = unsafe { GetAsyncKeyState(VK_CONTROL.0 as i32) } < 0;

    if vk == VK_LWIN.0 || vk == VK_RWIN.0 || vk == VK_APPS.0 || vk == VK_SLEEP.0 {
        return true;
    }
    // Volume, media, browser and "launch mail/app" keys.
    if (VK_BROWSER_BACK.0..=VK_LAUNCH_APP2.0).contains(&vk) {
        return true;
    }
    if alt && (vk == VK_TAB.0 || vk == VK_ESCAPE.0 || vk == VK_F4.0 || vk == VK_SPACE.0) {
        return true;
    }
    ctrl && vk == VK_ESCAPE.0
}

unsafe extern "system" fn keyboard_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code == HC_ACTION as i32 && we_are_in_front() {
        let key = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
        if should_block(key) {
            return LRESULT(1);
        }
    }
    CallNextHookEx(None, code, wparam, lparam)
}

unsafe fn spi_get<T>(action: SYSTEM_PARAMETERS_INFO_ACTION, mut value: T) -> Option<T> {
    SystemParametersInfoW(
        action,
        size_of::<T>() as u32,
        Some(&mut value as *mut T as *mut c_void),
        SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
    )
    .ok()
    .map(|_| value)
}

unsafe fn spi_set<T>(action: SYSTEM_PARAMETERS_INFO_ACTION, mut value: T) {
    let _ = SystemParametersInfoW(
        action,
        size_of::<T>() as u32,
        Some(&mut value as *mut T as *mut c_void),
        SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
    );
}

/// Only touches a hotkey when its feature is currently off, so a grown-up who
/// relies on Sticky Keys keeps it.
unsafe fn disable_accessibility_hotkeys() {
    let sticky = spi_get(
        SPI_GETSTICKYKEYS,
        STICKYKEYS { cbSize: size_of::<STICKYKEYS>() as u32, ..Default::default() },
    );
    let filter = spi_get(
        SPI_GETFILTERKEYS,
        FILTERKEYS { cbSize: size_of::<FILTERKEYS>() as u32, ..Default::default() },
    );
    let toggle = spi_get(
        SPI_GETTOGGLEKEYS,
        TOGGLEKEYS { cbSize: size_of::<TOGGLEKEYS>() as u32, ..Default::default() },
    );
    let (Some(sticky), Some(filter), Some(toggle)) = (sticky, filter, toggle) else {
        return;
    };
    *SAVED.lock().unwrap() = Some((sticky, filter, toggle));

    if !sticky.dwFlags.contains(SKF_STICKYKEYSON) {
        let mut off = sticky;
        off.dwFlags &= !(SKF_HOTKEYACTIVE | SKF_CONFIRMHOTKEY);
        spi_set(SPI_SETSTICKYKEYS, off);
    }
    if filter.dwFlags & FKF_FILTERKEYSON == 0 {
        let mut off = filter;
        off.dwFlags &= !(FKF_HOTKEYACTIVE | FKF_CONFIRMHOTKEY);
        spi_set(SPI_SETFILTERKEYS, off);
    }
    if toggle.dwFlags & TKF_TOGGLEKEYSON == 0 {
        let mut off = toggle;
        off.dwFlags &= !(TKF_HOTKEYACTIVE | TKF_CONFIRMHOTKEY);
        spi_set(SPI_SETTOGGLEKEYS, off);
    }
}

unsafe fn restore_accessibility_hotkeys() {
    if let Some((sticky, filter, toggle)) = SAVED.lock().unwrap().take() {
        spi_set(SPI_SETSTICKYKEYS, sticky);
        spi_set(SPI_SETFILTERKEYS, filter);
        spi_set(SPI_SETTOGGLEKEYS, toggle);
    }
}

/// Must run on a thread with a message loop (Tauri's main thread), or the
/// hook is never called.
pub fn engage(_app: &tauri::AppHandle) {
    unsafe {
        disable_accessibility_hotkeys();
        let module = GetModuleHandleW(None).ok();
        if let Ok(hook) = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_hook), module.map(Into::into), 0) {
            HOOK.store(hook.0, Ordering::SeqCst);
        }
    }
}

pub fn release() {
    unsafe {
        let hook = HOOK.swap(ptr::null_mut(), Ordering::SeqCst);
        if !hook.is_null() {
            let _ = UnhookWindowsHookEx(HHOOK(hook));
        }
        restore_accessibility_hotkeys();
    }
}

pub fn is_active() -> bool {
    !HOOK.load(Ordering::SeqCst).is_null()
}
