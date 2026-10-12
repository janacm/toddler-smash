//! Desktop shell. The game itself is the unchanged web build in `../dist`; this
//! crate only adds what a browser can't do: cover the whole screen and keep
//! system shortcuts (Windows key, Cmd-Tab, Alt-F4...) away from the OS.

mod lockdown;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Manager, RunEvent, WebviewWindow, WindowEvent};

/// Set only by the grown-up panel's Quit. Every other close or exit request is
/// refused, because the only other things that send one are stray shortcuts.
static QUITTING: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    QUITTING.store(true, Ordering::SeqCst);
    lockdown::release();
    app.exit(0);
}

#[tauri::command]
fn keyboard_locked() -> bool {
    lockdown::is_active()
}

fn cover_screen(window: &WebviewWindow) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    {
        // Native macOS fullscreen moves the app to its own Space, where Dock
        // and menu-bar presentation options can't be applied. A borderless
        // window sized to the display avoids that.
        if let Some(monitor) = window.current_monitor()? {
            window.set_position(*monitor.position())?;
            window.set_size(*monitor.size())?;
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        window.set_fullscreen(true)?;
        window.set_always_on_top(true)?;
    }
    window.show()?;
    window.set_focus()
}

pub fn run() {
    tauri::Builder::default()
        .enable_macos_default_menu(false)
        .invoke_handler(tauri::generate_handler![quit, keyboard_locked])
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .expect("main window is declared in tauri.conf.json");
            cover_screen(&window)?;
            lockdown::engage(app.handle());
            Ok(())
        })
        .on_window_event(|_, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if !QUITTING.load(Ordering::SeqCst) {
                    api.prevent_close();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("failed to build the Tauri app")
        .run(|_, event| match event {
            RunEvent::ExitRequested { api, .. } if !QUITTING.load(Ordering::SeqCst) => {
                api.prevent_exit()
            }
            RunEvent::Exit => lockdown::release(),
            _ => {}
        });
}
