//! macOS lockdown: a session-wide CGEventTap that strips Cmd/Ctrl/Option/Fn
//! from every key before macOS sees it (so Cmd-Q, Cmd-Tab, Cmd-Space become
//! plain keys the game can draw), plus kiosk presentation options that hide
//! the Dock and menu bar and disable app switching and Force Quit.
//!
//! The tap needs the Accessibility permission. Until it's granted we leave the
//! system usable, otherwise the grown-up couldn't reach System Settings to
//! grant it, and lock down the moment it is.

use std::ffi::c_void;
use std::ptr;
use std::sync::atomic::{AtomicBool, AtomicPtr, Ordering};
use std::thread;
use std::time::Duration;

use core_foundation::base::TCFType;
use core_foundation::boolean::CFBoolean;
use core_foundation::dictionary::{CFDictionary, CFDictionaryRef};
use core_foundation::string::{CFString, CFStringRef};
use objc2_app_kit::{NSApplication, NSApplicationPresentationOptions as Presentation};
use objc2_foundation::MainThreadMarker;
use tauri::{AppHandle, Manager};

use super::rules::mac::{decide, Verdict, FLAGS_CHANGED, KEY_DOWN, KEY_UP, SYSTEM_DEFINED};

type CGEventRef = *mut c_void;
type CFMachPortRef = *mut c_void;
type TapCallback = extern "C" fn(*mut c_void, u32, CGEventRef, *mut c_void) -> CGEventRef;

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventTapCreate(
        tap: u32,
        place: u32,
        options: u32,
        events_of_interest: u64,
        callback: TapCallback,
        user_info: *mut c_void,
    ) -> CFMachPortRef;
    fn CGEventTapEnable(tap: CFMachPortRef, enable: bool);
    fn CGEventGetFlags(event: CGEventRef) -> u64;
    fn CGEventSetFlags(event: CGEventRef, flags: u64);
    fn CGEventGetIntegerValueField(event: CGEventRef, field: u32) -> i64;
}

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFMachPortCreateRunLoopSource(
        allocator: *const c_void,
        port: CFMachPortRef,
        order: isize,
    ) -> *mut c_void;
    fn CFRunLoopGetMain() -> *mut c_void;
    fn CFRunLoopAddSource(run_loop: *mut c_void, source: *mut c_void, mode: CFStringRef);
    static kCFRunLoopCommonModes: CFStringRef;
}

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrusted() -> bool;
    fn AXIsProcessTrustedWithOptions(options: CFDictionaryRef) -> bool;
    static kAXTrustedCheckOptionPrompt: CFStringRef;
}

const SESSION_EVENT_TAP: u32 = 1;
const HEAD_INSERT: u32 = 0;
const ACTIVE_FILTER: u32 = 0;
const KEYCODE_FIELD: u32 = 9;

static TAP: AtomicPtr<c_void> = AtomicPtr::new(ptr::null_mut());
static RELEASED: AtomicBool = AtomicBool::new(false);

extern "C" fn on_event(
    _proxy: *mut c_void,
    kind: u32,
    event: CGEventRef,
    _user_info: *mut c_void,
) -> CGEventRef {
    unsafe {
        let (keycode, flags) = if matches!(kind, KEY_DOWN | KEY_UP | FLAGS_CHANGED) {
            (CGEventGetIntegerValueField(event, KEYCODE_FIELD), CGEventGetFlags(event))
        } else {
            (0, 0)
        };
        match decide(kind, keycode, flags) {
            Verdict::Pass => event,
            Verdict::Rewrite(flags) => {
                CGEventSetFlags(event, flags);
                event
            }
            Verdict::Swallow => ptr::null_mut(),
            Verdict::Reenable => {
                let tap = TAP.load(Ordering::SeqCst);
                if !tap.is_null() {
                    CGEventTapEnable(tap, true);
                }
                event
            }
        }
    }
}

/// Must run on the main thread.
unsafe fn install_tap() -> bool {
    let mask = (1 << KEY_DOWN) | (1 << KEY_UP) | (1 << FLAGS_CHANGED) | (1 << SYSTEM_DEFINED);
    let tap = CGEventTapCreate(
        SESSION_EVENT_TAP,
        HEAD_INSERT,
        ACTIVE_FILTER,
        mask,
        on_event,
        ptr::null_mut(),
    );
    if tap.is_null() {
        return false;
    }
    let source = CFMachPortCreateRunLoopSource(ptr::null(), tap, 0);
    CFRunLoopAddSource(CFRunLoopGetMain(), source, kCFRunLoopCommonModes);
    CGEventTapEnable(tap, true);
    TAP.store(tap, Ordering::SeqCst);
    true
}

fn set_presentation(options: Presentation) {
    if let Some(mtm) = MainThreadMarker::new() {
        NSApplication::sharedApplication(mtm).setPresentationOptions(options);
    }
}

/// Must run on the main thread.
fn lock(app: &AppHandle) {
    if RELEASED.load(Ordering::SeqCst) || !unsafe { install_tap() } {
        return;
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(true);
        let _ = window.set_focus();
    }
    set_presentation(
        Presentation::HideDock
            | Presentation::HideMenuBar
            | Presentation::DisableProcessSwitching
            | Presentation::DisableForceQuit
            | Presentation::DisableSessionTermination
            | Presentation::DisableHideApplication
            | Presentation::DisableAppleMenu,
    );
}

fn prompt_for_accessibility() {
    unsafe {
        let key = CFString::wrap_under_get_rule(kAXTrustedCheckOptionPrompt);
        let options = CFDictionary::from_CFType_pairs(&[(key, CFBoolean::true_value())]);
        AXIsProcessTrustedWithOptions(options.as_concrete_TypeRef());
    }
}

pub fn engage(app: &AppHandle) {
    if unsafe { AXIsProcessTrusted() } {
        lock(app);
        return;
    }
    prompt_for_accessibility();
    let app = app.clone();
    thread::spawn(move || {
        while !RELEASED.load(Ordering::SeqCst) {
            thread::sleep(Duration::from_secs(2));
            if unsafe { AXIsProcessTrusted() } {
                let handle = app.clone();
                let _ = app.run_on_main_thread(move || lock(&handle));
                return;
            }
        }
    });
}

pub fn release() {
    RELEASED.store(true, Ordering::SeqCst);
    let tap = TAP.swap(ptr::null_mut(), Ordering::SeqCst);
    if !tap.is_null() {
        unsafe { CGEventTapEnable(tap, false) };
    }
    set_presentation(Presentation::Default);
}

pub fn is_active() -> bool {
    !TAP.load(Ordering::SeqCst).is_null()
}
