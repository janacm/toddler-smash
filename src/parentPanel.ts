import Phaser from 'phaser'
import { CONFIG, type MoodName } from './config'
import type { Mode } from './modes'
import { BUILD_ID } from './version'
import type { DesktopUpdateState } from './desktopUpdates'
import type { GameId } from './challenges/model'
import { getSubGameExplainer, getCurrentExplainer } from './explainers'
import { textResolution } from './textResolution'

export type PanelAction =
  | { kind: 'mode'; mode: Mode }
  | { kind: 'mood'; mood: MoodName }
  | { kind: 'toggleChild' }
  | { kind: 'toggleExplainers' }
  | { kind: 'showGuide'; game?: GameId }
  | { kind: 'closeGuide' }
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
  showExplainers: boolean
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
  /** When defined, shows the detailed level guide for that game. */
  guideGame?: GameId
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
const BUTTON_H = 50
const GAP = 10
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
    if (state.guideGame) {
      this.buildGuide(state, state.guideGame)
      return
    }

    this.clear()
    const scene = this.scene
    const { width, height } = scene.scale

    const c = scene.add.container(0, 0).setDepth(10_000)
    this.container = c
    const inner = PANEL_W - PAD * 2
    const left = -inner / 2
    let y = PAD

    const text = (str: string, size: number, color: string, at = y) => {
      const t = scene.add
        .text(0, at, str, {
          fontFamily: FONT,
          fontSize: `${size}px`,
          color,
          align: 'center',
          lineSpacing: 4,
          resolution: textResolution(),
        })
        .setOrigin(0.5, 0)
      c.add(t)
      return t
    }

    const button = (label: string, action: PanelAction, x: number, w: number, selected = false, fontSize = '17px') => {
      const g = scene.add.graphics()
      g.fillStyle(selected ? COLORS.selected : COLORS.button, 1)
      g.fillRoundedRect(x, y, w, BUTTON_H, 12)
      const t = scene.add
        .text(x + w / 2, y + BUTTON_H / 2, label, {
          fontFamily: FONT,
          fontSize,
          color: COLORS.text,
          resolution: textResolution(),
        })
        .setOrigin(0.5)
      c.add([g, t])
      this.buttons.push({ action, x, y, w, h: BUTTON_H })
    }

    const row = (items: { label: string; action: PanelAction; selected?: boolean; fontSize?: string }[]) => {
      const w = (inner - GAP * (items.length - 1)) / items.length
      items.forEach((item, i) => button(item.label, item.action, left + i * (w + GAP), w, item.selected, item.fontSize))
      y += BUTTON_H + GAP
    }

    const section = (label: string) => {
      text(label, 14, COLORS.muted)
      y += 20
    }

    const bg = scene.add.graphics()
    c.add(bg)

    text('Grown-up menu', 24, COLORS.title)
    y += 42

    section('Game')
    row(state.modes.map((m) => ({ label: m.label, action: { kind: 'mode', mode: m }, selected: m === state.mode })))
    y += 2

    // Aesthetic Explainer & Level Guide row for active game
    const activeGid = state.mode.name as GameId
    const activeExp = getCurrentExplainer(activeGid, 'free')
    const previewBox = scene.add.graphics()
    c.add(previewBox)
    const prevY = y
    previewBox.fillStyle(0x192138, 0.9)
    previewBox.fillRoundedRect(left, prevY, inner, 36, 10)
    previewBox.lineStyle(1, 0x33416b, 0.8)
    previewBox.strokeRoundedRect(left, prevY, inner, 36, 10)

    const prevT = scene.add
      .text(0, prevY + 18, `${activeExp.gameIcon} ${activeExp.title} — ${activeExp.instruction}`, {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#b8c5ff',
        align: 'center',
        wordWrap: { width: inner - 20 },
        resolution: textResolution(),
      })
      .setOrigin(0.5)
    c.add(prevT)
    y += 36 + GAP

    row([
      {
        label: '📖 Level Guide (all 6 levels)',
        action: { kind: 'showGuide', game: activeGid },
        fontSize: '14px',
      },
      {
        label: `Explainers: ${state.showExplainers ? 'on' : 'off'}`,
        action: { kind: 'toggleExplainers' },
        selected: state.showExplainers,
        fontSize: '14px',
      },
    ])
    y += 4

    section('Mood')
    row(
      (Object.keys(CONFIG.moods) as MoodName[]).map((name) => ({
        label: CONFIG.moods[name].label,
        action: { kind: 'mood', mood: name },
        selected: name === state.mood,
      })),
    )
    y += 4

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
        y += text(`Downloading update v${state.desktopUpdate.version}…`, 13, COLORS.text).height + GAP
      } else if (state.desktopUpdate?.status === 'installing') {
        y += text('Updating…', 13, COLORS.text).height + GAP
      }
      row([{ label: 'Quit', action: { kind: 'quit' } }])
      if (state.lockStatus) {
        y += text(state.lockStatus, 13, COLORS.muted).height + GAP
      }
    } else if (state.canFullscreen) {
      row([{ label: state.isFullscreen ? 'Exit full screen' : 'Full screen', action: { kind: 'fullscreen' } }])
    } else if (!state.standalone) {
      y += text('For full screen on a phone or tablet:\nShare › Add to Home Screen', 13, COLORS.muted).height + GAP
    }

    y += 4
    row([{ label: 'Done', action: { kind: 'close' } }])

    const games = `1–${state.modes.length} game`
    const updateKey = state.desktopUpdate?.status === 'ready' ? ' · U update' : ''
    const shortcuts = state.isDesktop
      ? `Keys: ${games} · G guide · E explainers · D/B mood · C · R new player${updateKey} · Q quit`
      : `Keys: ${games} · G guide · E explainers · D/B mood · C · R new player · F full screen`
    y += text(`${shortcuts}\nOpen again: hold Escape, or hold the top-left\nand bottom-right corners, for 3 seconds`, 12, COLORS.muted).height
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

  private buildGuide(_state: PanelState, gameId: GameId): void {
    this.clear()
    const scene = this.scene
    const { width, height } = scene.scale

    const c = scene.add.container(0, 0).setDepth(10_000)
    this.container = c
    const inner = PANEL_W - PAD * 2
    const left = -inner / 2
    let y = PAD

    const text = (str: string, size: number, color: string, align: 'center' | 'left' = 'center', at = y) => {
      const t = scene.add
        .text(align === 'center' ? 0 : left + 14, at, str, {
          fontFamily: FONT,
          fontSize: `${size}px`,
          color,
          align,
          lineSpacing: 3,
          wordWrap: { width: inner - 28 },
          resolution: textResolution(),
        })
        .setOrigin(align === 'center' ? 0.5 : 0, 0)
      c.add(t)
      return t
    }

    const button = (label: string, action: PanelAction, x: number, w: number, selected = false, fontSize = '16px') => {
      const g = scene.add.graphics()
      g.fillStyle(selected ? COLORS.selected : COLORS.button, 1)
      g.fillRoundedRect(x, y, w, 44, 12)
      const t = scene.add
        .text(x + w / 2, y + 22, label, {
          fontFamily: FONT,
          fontSize,
          color: COLORS.text,
          resolution: textResolution(),
        })
        .setOrigin(0.5)
      c.add([g, t])
      this.buttons.push({ action, x, y, w, h: 44 })
    }

    const bg = scene.add.graphics()
    c.add(bg)

    const exp = getSubGameExplainer(gameId)

    text(`${exp.icon} ${exp.name} · Level Guide`, 22, COLORS.title)
    y += 38

    // Game tabs
    const tabW = (inner - GAP * 2) / 3
    const allGames: GameId[] = ['smash', 'piano', 'drawing']
    allGames.forEach((gid, i) => {
      const ginfo = getSubGameExplainer(gid)
      button(`${ginfo.icon} ${ginfo.name}`, { kind: 'showGuide', game: gid }, left + i * (tabW + GAP), tabW, gid === gameId, '15px')
    })
    y += 44 + 12

    y += text(exp.tagline, 13, '#93c5fd', 'center').height + 3
    y += text(exp.description, 11, COLORS.muted, 'center').height + 12

    // Levels card
    const cardY = y
    const cardBg = scene.add.graphics()
    c.add(cardBg)
    y += 10

    // Tier 1
    text(`★ ${exp.levels[0].tierName}`, 12, '#93c5fd', 'left')
    y += 18
    text(`• Level 1: ${exp.levels[0].title} — ${exp.levels[0].instruction}`, 11, COLORS.text, 'left')
    y += 16
    text(`• Level 2: ${exp.levels[1].title} — ${exp.levels[1].instruction}`, 11, COLORS.text, 'left')
    y += 20

    // Tier 2
    text(`★ ${exp.levels[2].tierName}`, 12, '#93c5fd', 'left')
    y += 18
    text(`• Level 3: ${exp.levels[2].title} — ${exp.levels[2].instruction}`, 11, COLORS.text, 'left')
    y += 16
    text(`• Level 4: ${exp.levels[3].title} — ${exp.levels[3].instruction}`, 11, COLORS.text, 'left')
    y += 20

    // Tier 3
    text(`★ ${exp.levels[4].tierName}`, 12, '#93c5fd', 'left')
    y += 18
    text(`• Level 5: ${exp.levels[4].title} — ${exp.levels[4].instruction}`, 11, COLORS.text, 'left')
    y += 16
    text(`• Level 6: ${exp.levels[5].title} — ${exp.levels[5].instruction}`, 11, COLORS.text, 'left')
    y += 20

    // Creative Power
    text(`✨ Creative Power: ${exp.playground.title}`, 12, '#fde047', 'left')
    y += 18
    text(`• ${exp.playground.power} — ${exp.playground.instruction}`, 11, COLORS.text, 'left')
    y += 20

    cardBg.fillStyle(0x161c2e, 0.92)
    cardBg.fillRoundedRect(left, cardY, inner, y - cardY, 12)
    cardBg.lineStyle(1.5, 0x2e3859, 1)
    cardBg.strokeRoundedRect(left, cardY, inner, y - cardY, 12)

    y += 14

    button('Back to Grown-up menu', { kind: 'closeGuide' }, left, inner, false, '16px')
    y += 44 + GAP

    y += text('Keys: 1 Smash · 2 Piano · 3 Drawing · G / Esc back', 12, COLORS.muted).height + PAD

    bg.fillStyle(COLORS.panel, 0.97)
    bg.fillRoundedRect(-PANEL_W / 2, 0, PANEL_W, y, 20)
    bg.lineStyle(2, COLORS.stroke, 1)
    bg.strokeRoundedRect(-PANEL_W / 2, 0, PANEL_W, y, 20)

    const scale = Math.min(1, (width * 0.94) / PANEL_W, (height * 0.94) / y)
    c.setScale(scale)
    c.setPosition(width / 2, (height - y * scale) / 2)
  }
}
