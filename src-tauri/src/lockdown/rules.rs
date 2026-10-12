//! The "block it or let it through" decision for each OS, as pure functions of
//! plain numbers. `mac.rs` and `win.rs` feed them real events; keeping the
//! decisions here means `cargo test` checks both platforms' rules on any
//! machine.

/// macOS CGEventTap rules.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub mod mac {
    pub const KEY_DOWN: u32 = 10;
    pub const KEY_UP: u32 = 11;
    pub const FLAGS_CHANGED: u32 = 12;
    /// Media, volume, brightness and eject keys arrive as this type.
    pub const SYSTEM_DEFINED: u32 = 14;
    pub const TAP_DISABLED_BY_TIMEOUT: u32 = 0xFFFF_FFFE;
    pub const TAP_DISABLED_BY_USER_INPUT: u32 = 0xFFFF_FFFF;

    pub const FLAG_CONTROL: u64 = 0x0004_0000;
    pub const FLAG_OPTION: u64 = 0x0008_0000;
    pub const FLAG_COMMAND: u64 = 0x0010_0000;
    pub const FLAG_FN: u64 = 0x0080_0000;
    pub const SYSTEM_MODIFIERS: u64 = FLAG_CONTROL | FLAG_OPTION | FLAG_COMMAND | FLAG_FN;

    /// Shift and Caps Lock can't trigger anything on their own, so the game
    /// may as well see them.
    pub const HARMLESS_MODIFIER_KEYS: [i64; 3] = [56, 57, 60];
    /// Dedicated keys on Apple keyboards: Launchpad, Mission Control,
    /// Dictation, Spotlight, Do Not Disturb, Globe.
    pub const SYSTEM_KEYS: [i64; 6] = [131, 160, 176, 177, 178, 179];

    #[derive(Debug, PartialEq, Eq)]
    pub enum Verdict {
        /// Deliver unchanged.
        Pass,
        /// Deliver with these modifier flags instead.
        Rewrite(u64),
        /// Drop it; nothing else sees the event.
        Swallow,
        /// macOS switched the tap off; turn it back on.
        Reenable,
    }

    /// `keycode` and `flags` are only read for key and flags-changed events.
    pub fn decide(kind: u32, keycode: i64, flags: u64) -> Verdict {
        match kind {
            TAP_DISABLED_BY_TIMEOUT | TAP_DISABLED_BY_USER_INPUT => Verdict::Reenable,
            SYSTEM_DEFINED => Verdict::Swallow,
            FLAGS_CHANGED if HARMLESS_MODIFIER_KEYS.contains(&keycode) => Verdict::Pass,
            FLAGS_CHANGED => Verdict::Swallow,
            KEY_DOWN | KEY_UP if SYSTEM_KEYS.contains(&keycode) => Verdict::Swallow,
            KEY_DOWN | KEY_UP if flags & SYSTEM_MODIFIERS != 0 => Verdict::Rewrite(flags & !SYSTEM_MODIFIERS),
            _ => Verdict::Pass,
        }
    }
}

/// Windows low-level keyboard hook rules.
#[cfg_attr(not(windows), allow(dead_code))]
pub mod win {
    pub const VK_TAB: u16 = 0x09;
    pub const VK_ESCAPE: u16 = 0x1B;
    pub const VK_SPACE: u16 = 0x20;
    pub const VK_LWIN: u16 = 0x5B;
    pub const VK_RWIN: u16 = 0x5C;
    pub const VK_APPS: u16 = 0x5D;
    pub const VK_SLEEP: u16 = 0x5F;
    pub const VK_F4: u16 = 0x73;
    /// Browser, volume, media and "launch mail/app" keys are contiguous.
    pub const VK_BROWSER_BACK: u16 = 0xA6;
    pub const VK_LAUNCH_APP2: u16 = 0xB7;

    pub fn should_block(vk: u16, alt: bool, ctrl: bool) -> bool {
        if matches!(vk, VK_LWIN | VK_RWIN | VK_APPS | VK_SLEEP) {
            return true;
        }
        if (VK_BROWSER_BACK..=VK_LAUNCH_APP2).contains(&vk) {
            return true;
        }
        if alt && matches!(vk, VK_TAB | VK_ESCAPE | VK_F4 | VK_SPACE) {
            return true;
        }
        ctrl && vk == VK_ESCAPE
    }
}

#[cfg(test)]
mod tests {
    mod mac {
        use crate::lockdown::rules::mac::*;

        const KEY_A: i64 = 0;
        const KEY_Q: i64 = 12;
        const KEY_3: i64 = 20;
        const KEY_TAB: i64 = 48;
        const KEY_SPACE: i64 = 49;
        const KEY_ESCAPE: i64 = 53;
        const KEY_COMMAND: i64 = 55;
        const KEY_SHIFT: i64 = 56;
        const KEY_CAPS_LOCK: i64 = 57;
        const KEY_OPTION: i64 = 58;
        const KEY_CONTROL: i64 = 59;
        const KEY_FN: i64 = 63;
        const KEY_SPOTLIGHT: i64 = 177;
        const KEY_MISSION_CONTROL: i64 = 160;
        const MOUSE_DOWN: u32 = 1;
        const FLAG_SHIFT: u64 = 0x0002_0000;

        #[test]
        fn plain_keys_reach_the_game() {
            assert_eq!(decide(KEY_DOWN, KEY_A, 0), Verdict::Pass);
            assert_eq!(decide(KEY_UP, KEY_A, 0), Verdict::Pass);
        }

        #[test]
        fn escape_passes_so_the_grown_up_panel_works() {
            assert_eq!(decide(KEY_DOWN, KEY_ESCAPE, 0), Verdict::Pass);
        }

        #[test]
        fn cmd_shortcuts_become_plain_keys() {
            assert_eq!(decide(KEY_DOWN, KEY_Q, FLAG_COMMAND), Verdict::Rewrite(0));
            assert_eq!(decide(KEY_DOWN, KEY_TAB, FLAG_COMMAND), Verdict::Rewrite(0));
            assert_eq!(decide(KEY_DOWN, KEY_SPACE, FLAG_COMMAND), Verdict::Rewrite(0));
        }

        #[test]
        fn force_quit_chord_loses_its_modifiers() {
            assert_eq!(decide(KEY_DOWN, KEY_ESCAPE, FLAG_COMMAND | FLAG_OPTION), Verdict::Rewrite(0));
        }

        #[test]
        fn ctrl_and_fn_are_stripped_too() {
            assert_eq!(decide(KEY_DOWN, KEY_SPACE, FLAG_CONTROL), Verdict::Rewrite(0));
            assert_eq!(decide(KEY_DOWN, KEY_A, FLAG_FN), Verdict::Rewrite(0));
        }

        #[test]
        fn shift_survives_stripping() {
            assert_eq!(
                decide(KEY_DOWN, KEY_3, FLAG_COMMAND | FLAG_SHIFT),
                Verdict::Rewrite(FLAG_SHIFT)
            );
            assert_eq!(decide(KEY_DOWN, KEY_A, FLAG_SHIFT), Verdict::Pass);
        }

        #[test]
        fn dedicated_system_keys_are_swallowed() {
            assert_eq!(decide(KEY_DOWN, KEY_SPOTLIGHT, 0), Verdict::Swallow);
            assert_eq!(decide(KEY_UP, KEY_MISSION_CONTROL, 0), Verdict::Swallow);
        }

        #[test]
        fn media_keys_are_swallowed() {
            assert_eq!(decide(SYSTEM_DEFINED, 0, 0), Verdict::Swallow);
        }

        #[test]
        fn modifier_presses_are_swallowed_except_shift_and_caps_lock() {
            for key in [KEY_COMMAND, KEY_OPTION, KEY_CONTROL, KEY_FN] {
                assert_eq!(decide(FLAGS_CHANGED, key, 0), Verdict::Swallow, "keycode {key}");
            }
            assert_eq!(decide(FLAGS_CHANGED, KEY_SHIFT, FLAG_SHIFT), Verdict::Pass);
            assert_eq!(decide(FLAGS_CHANGED, KEY_CAPS_LOCK, 0), Verdict::Pass);
        }

        #[test]
        fn a_disabled_tap_is_turned_back_on() {
            assert_eq!(decide(TAP_DISABLED_BY_TIMEOUT, 0, 0), Verdict::Reenable);
            assert_eq!(decide(TAP_DISABLED_BY_USER_INPUT, 0, 0), Verdict::Reenable);
        }

        #[test]
        fn other_event_types_are_left_alone() {
            assert_eq!(decide(MOUSE_DOWN, 0, FLAG_COMMAND), Verdict::Pass);
        }
    }

    mod win {
        use crate::lockdown::rules::win::*;

        const VK_A: u16 = 0x41;
        const VK_W: u16 = 0x57;
        const VK_VOLUME_UP: u16 = 0xAF;
        const VK_MEDIA_PLAY_PAUSE: u16 = 0xB3;
        const VK_BROWSER_HOME: u16 = 0xAC;
        const VK_LAUNCH_MAIL: u16 = 0xB4;

        #[test]
        fn windows_and_menu_keys_are_always_blocked() {
            for vk in [VK_LWIN, VK_RWIN, VK_APPS, VK_SLEEP] {
                assert!(should_block(vk, false, false), "vk {vk:#x}");
                assert!(should_block(vk, true, true), "vk {vk:#x} with modifiers");
            }
        }

        #[test]
        fn alt_chords_that_leave_the_app_are_blocked() {
            for vk in [VK_TAB, VK_ESCAPE, VK_F4, VK_SPACE] {
                assert!(should_block(vk, true, false), "Alt + {vk:#x}");
            }
        }

        #[test]
        fn the_same_keys_without_alt_reach_the_game() {
            for vk in [VK_TAB, VK_F4, VK_SPACE] {
                assert!(!should_block(vk, false, false), "{vk:#x}");
            }
        }

        #[test]
        fn plain_escape_passes_so_the_grown_up_panel_works() {
            assert!(!should_block(VK_ESCAPE, false, false));
        }

        #[test]
        fn ctrl_escape_is_blocked() {
            // Covers Ctrl-Shift-Esc (Task Manager) too: Shift doesn't matter.
            assert!(should_block(VK_ESCAPE, false, true));
        }

        #[test]
        fn media_browser_and_launch_keys_are_blocked() {
            for vk in [VK_VOLUME_UP, VK_MEDIA_PLAY_PAUSE, VK_BROWSER_HOME, VK_LAUNCH_MAIL, VK_BROWSER_BACK, VK_LAUNCH_APP2] {
                assert!(should_block(vk, false, false), "vk {vk:#x}");
            }
        }

        #[test]
        fn letters_reach_the_game_even_with_modifiers() {
            assert!(!should_block(VK_A, false, false));
            assert!(!should_block(VK_A, true, false));
            assert!(!should_block(VK_W, false, true));
        }
    }
}
