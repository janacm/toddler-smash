import Phaser from 'phaser'
import { CONFIG, type MoodName } from './config'
import type { Mode } from './modes'
import { BUILD_ID } from './version'
import type { DesktopUpdateState } from './desktopUpdates'

export type PanelAction =
  | { kind: 'mode'; mode: Mode }
  | { kind: 'mood'; mood: MoodName }
  | { kind: 'toggleChild' }
  | { kind: 'resetProgress' }
  | { kind: 'fullscreen' }
  | { kind: 'desktopUpdate' }
  | { kind: 'quit' }
  | { kind: 'close' }

export interface PanelState {
  modes: Mode[]
  mode: Mode
  mood: MoodName
  childCanSwitch: boolean
  isDesktop: boolean
  /** Browser full screen works here (not on iPhone, not when installed). */
  canFullscreen: boolean
  isFullscreen: boolean
  /** Running from the home screen, already without browser chrome. */
  standalone: boolean
  /** Desktop only: the keyboard-lock line, or '' while checking. */
  lockStatus: string
  /** Desktop only: status of available/downloaded background updates. */
  desktopUpdate?: DesktopUpdateState
}

interface Button {
  action: PanelAction
  x: number
  y: number
  w: number
  h: number
}

const FONT = 'Verdana, Geneva, sans-serif'
const PANEL_W = 560
const PAD = 24
const BUTTON_H = 54
const GAP = 12
const COLORS = {
  panel: 0x0d1018,
  stroke: 0x39405c,
  button: 0x232a40,
  selected: 0x5468ff,
  title: '#e8ecff',
  text: '#e8ecff',
  muted: '#9aa3c4',
}

/**
 * The grown-up panel: big tappable buttons for touch screens, with keyboard
 * shortcuts shown for everyone else. Rebuilt from `PanelState` whenever it
 * changes, and scaled down to fit short screens like a phone in landscape.
 *
 * Taps reach it through `hit`, not Phaser's input system, the same way the
 * child's corner buttons work: `input.ts` already turns every pointer into a
 * SmashEvent, and the scene routes those here while the panel is open.
 */
export class ParentPanel {
  private container?: Phaser.GameObjects.Container
  private buttons: Button[] = []

  constructor(private scene: Phaser.Scene) {}

  get visible(): boolean {
    return this.container?.visible ?? false
  }

  show(state: PanelState): void {
    this.build(state)
  }

  hide(): void {
    this.clear()
  }

  /** Redraw with new state, if open. */
  refresh(state: PanelState): void {
    if (this.visible) this.build(state)
  }

  hit(x: number, y: number): PanelAction | undefined {
    const c = this.container
    if (!c?.visible) return undefined
    const lx = (x - c.x) / c.scale
    const ly = (y - c.y) / c.scale
    return this.buttons.find((b) => lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h)?.action
  }

  private clear(): void {
    this.container?.destroy()
    this.container = undefined
    this.buttons = []
  }

  private build(state: PanelState): void {
    this.clear()
    const scene = this.scene
    const { width, height } = scene.scale

    // Layout is in panel-local coordinates: x is centred on 0, y grows down
    // from the panel's top edge. The container is positioned and scaled last.
    const c = scene.add.container(0, 0).setDepth(10_000)
    this.container = c
    const inner = PANEL_W - PAD * 2
    const left = -inner / 2
    let y = PAD

    const text = (str: string, size: number, color: string, at = y) => {
      const t = scene.add
        .text(0, at, str, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', lineSpacing: 6 })
        .setOrigin(0.5, 0)
      c.add(t)
      return t
    }

    const button = (label: string, action: PanelAction, x: number, w: number, selected = false) => {
      const g = scene.add.graphics()
      g.fillStyle(selected ? COLORS.selected : COLORS.button, 1)
      g.fillRoundedRect(x, y, w, BUTTON_H, 14)
      const t = scene.add
        .text(x + w / 2, y + BUTTON_H / 2, label, { fontFamily: FONT, fontSize: '19px', color: COLORS.text })
        .setOrigin(0.5)
      c.add([g, t])
      this.buttons.push({ action, x, y, w, h: BUTTON_H })
    }

    const row = (items: { label: string; action: PanelAction; selected?: boolean }[]) => {
      const w = (inner - GAP * (items.length - 1)) / items.length
      items.forEach((item, i) => button(item.label, item.action, left + i * (w + GAP), w, item.selected))
      y += BUTTON_H + GAP
    }

    const section = (label: string) => {
      text(label, 15, COLORS.muted)
      y += 24
    }

    const bg = scene.add.graphics()
    c.add(bg)

    text('Grown-up menu', 26, COLORS.title)
    y += 48

    section('Game')
    row(state.modes.map((m) => ({ label: m.label, action: { kind: 'mode', mode: m }, selected: m === state.mode })))
    y += 6

    section('Mood')
    row(
      (Object.keys(CONFIG.moods) as MoodName[]).map((name) => ({
        label: CONFIG.moods[name].label,
        action: { kind: 'mood', mood: name },
        selected: name === state.mood,
      })),
    )
    y += 6

    row([
      {
        label: `Child can switch games: ${state.childCanSwitch ? 'on' : 'off'}`,
        action: { kind: 'toggleChild' },
        selected: state.childCanSwitch,
      },
    ])

    row([{ label: 'New player', action: { kind: 'resetProgress' } }])

    if (state.isDesktop) {
      if (state.desktopUpdate?.status === 'ready') {
        row([{ label: `Update to v${state.desktopUpdate.version} (restart)`, action: { kind: 'desktopUpdate' } }])
      } else if (state.desktopUpdate?.status === 'downloading') {
        row([{ label: `Downloading update v${state.desktopUpdate.version}...`, action: { kind: 'desktopUpdate' } }])
      } else if (state.desktopUpdate?.status === 'installing') {
        row([{ label: 'Updating...', action: { kind: 'desktopUpdate' } }])
      }
      row([{ label: 'Quit', action: { kind: 'quit' } }])
      if (state.lockStatus) {
        y += text(state.lockStatus, 14, COLORS.muted).height + GAP
      }
    } else if (state.canFullscreen) {
      row([{ label: state.isFullscreen ? 'Exit full screen' : 'Full screen', action: { kind: 'fullscreen' } }])
    } else if (!state.standalone) {
      y += text('For full screen on a phone or tablet:\nShare › Add to Home Screen', 14, COLORS.muted).height + GAP
    }

    y += 6
    row([{ label: 'Done', action: { kind: 'close' } }])

    const games = `1–${state.modes.length} game`
    const updateKey = state.desktopUpdate?.status === 'ready' ? ' · U update' : ''
    const shortcuts = state.isDesktop
      ? `Keys: ${games} · D/B mood · C · R new player${updateKey} · Q quit`
      : `Keys: ${games} · D/B mood · C · R new player · F full screen`
    y += text(`${shortcuts}\nOpen again: hold Escape, or hold the top-left\nand bottom-right corners, for 3 seconds`, 13, COLORS.muted).height
    y += GAP
    y += text(`Build ${BUILD_ID}`, 11, COLORS.muted).height
    y += PAD

    bg.fillStyle(COLORS.panel, 0.97)
    bg.fillRoundedRect(-PANEL_W / 2, 0, PANEL_W, y, 20)
    bg.lineStyle(2, COLORS.stroke, 1)
    bg.strokeRoundedRect(-PANEL_W / 2, 0, PANEL_W, y, 20)

    const scale = Math.min(1, (width * 0.94) / PANEL_W, (height * 0.94) / y)
    c.setScale(scale)
    c.setPosition(width / 2, (height - y * scale) / 2)
  }
}
