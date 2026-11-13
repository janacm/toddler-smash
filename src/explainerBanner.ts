import Phaser from 'phaser'
import { CONFIG } from './config'
import { currentMood } from './settings'
import { getCurrentExplainer, type ActiveExplainer } from './explainers'
import type { GameId } from './challenges/model'
import { safeAreaInsets } from './safeArea'

const FONT_SYSTEM = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
const FONT_BADGE = "'Arial Rounded MT Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

function getTextResolution(): number {
  if (typeof window === 'undefined') return 3
  return Math.max(window.devicePixelRatio || 1, 3)
}

export class ExplainerBanner {
  private container: Phaser.GameObjects.Container
  private bg: Phaser.GameObjects.Graphics
  private badgeBg: Phaser.GameObjects.Graphics
  private badgeText: Phaser.GameObjects.Text
  private titleText: Phaser.GameObjects.Text
  private descText: Phaser.GameObjects.Text
  private currentKey = ''
  private currentGame: GameId = 'smash'
  private currentView: 'free' | 'puzzle' | 'playground' = 'free'
  private isVisible = true

  constructor(private scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(80)

    this.bg = scene.add.graphics()
    this.badgeBg = scene.add.graphics()

    const res = getTextResolution()

    this.badgeText = scene.add.text(0, 0, '', {
      fontFamily: FONT_BADGE,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#3b4cb8',
      align: 'center',
      resolution: res,
    }).setOrigin(0.5)

    this.titleText = scene.add.text(0, 0, '', {
      fontFamily: FONT_SYSTEM,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#1e293b',
      align: 'center',
      resolution: res,
    }).setOrigin(0.5)

    this.descText = scene.add.text(0, 0, '', {
      fontFamily: FONT_SYSTEM,
      fontSize: '11px',
      color: '#505c80',
      align: 'center',
      resolution: res,
    }).setOrigin(0.5)

    this.container.add([this.bg, this.badgeBg, this.badgeText, this.titleText, this.descText])
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible
    this.container.setVisible(visible)
  }

  get visible(): boolean {
    return this.container.visible
  }

  update(
    game: GameId,
    view: 'free' | 'puzzle' | 'playground',
    solved = 0,
    entranceStep = 0,
  ): void {
    if (!this.isVisible) return

    this.currentGame = game
    this.currentView = view
    const explainer = getCurrentExplainer(game, view, solved, entranceStep)
    const key = `${explainer.gameId}:${view}:${solved}:${entranceStep}`

    if (key === this.currentKey) {
      this.layout()
      return
    }

    this.currentKey = key
    this.render(explainer)
  }

  layout(): void {
    if (!this.isVisible || !this.currentKey) return
    const { width, height } = this.scene.scale
    const insets = safeAreaInsets()
    const compact = height < 500
    const isPortraitPhone = width < 600 && height >= 500

    const bannerW = isPortraitPhone
      ? Math.min(340, width - 32)
      : compact
        ? Math.min(420, width * 0.6)
        : Math.min(480, width * 0.46)

    const bannerH = isPortraitPhone ? 50 : compact ? 40 : 50

    let bannerY: number
    if (isPortraitPhone) {
      if (this.currentGame === 'piano') {
        // In piano mode (free play, puzzle, or playground):
        // Switcher buttons sit across the top row (y <= insets.top + 125).
        // Companion / prompt notes sit in the upper deck (y <= insets.top + 260).
        // Piano keys occupy the bottom ~40% of the screen, with discovery tray right above them.
        // Center the banner cleanly in the open corridor between the upper controls and the discovery tray.
        const pianoTop = height * (1 - CONFIG.piano.heightFrac - 0.04)
        const trayTop = pianoTop - 18 - 12 - 24
        const topLimit = insets.top + (this.currentView === 'free' ? 215 : 260)
        bannerY = Math.round((topLimit + trayTop) / 2)
      } else {
        // In smash and drawing (free play, puzzle, or playground):
        // In free play: companion dino sits at x=54, y=insets.top+160 (extends to y=insets.top+215).
        // In puzzles: 3x3 challenge nodes / scratch card extend down to nodesBottom (~480).
        // In playground: "Playground" HUD pill & buttons sit at insets.top+152.
        // Discovery tray is at the bottom (trayTop ~ height - insets.bottom - 52).
        // Placing the banner in the spacious lower corridor between central content and the bottom tray
        // guarantees it never covers switcher buttons, companion dino, HUD pills, puzzle nodes, or scratch card!
        const trayTop = height - insets.bottom - 28 - 24
        const top = compact ? height * 0.42 : Math.max(insets.top + 230, height * 0.3)
        const nodesBottom = Math.min(height - insets.bottom - 100, top + Math.min(width, height) * 0.52)
        bannerY = Math.round((nodesBottom + trayTop) / 2)
      }
    } else if (compact) {
      bannerY = insets.top + 34
    } else {
      bannerY = insets.top + 64
    }

    this.container.setPosition(width / 2, bannerY)
    this.drawGraphics(bannerW, bannerH)
  }

  destroy(): void {
    this.container.destroy()
  }

  private render(explainer: ActiveExplainer): void {
    const night = currentMood().night
    const textColor = night ? '#f1f5f9' : '#1e293b'
    const descColor = night ? '#cbd5e1' : '#505c80'
    const badgeColor = night ? '#c7d2fe' : '#3b4cb8'

    this.badgeText.setText(`${explainer.gameIcon} ${explainer.gameName.toUpperCase()} · ${explainer.badge}`)
    this.badgeText.setColor(badgeColor)

    this.titleText.setText(explainer.title)
    this.titleText.setColor(textColor)

    this.descText.setText(explainer.instruction)
    this.descText.setColor(descColor)

    this.layout()

    // Smooth subtle entry animation
    this.container.setAlpha(0.3)
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 220,
      ease: 'Quad.easeOut',
    })
  }

  private drawGraphics(w: number, h: number): void {
    const night = currentMood().night
    const halfW = w / 2
    const halfH = h / 2

    // Card background
    this.bg.clear()

    // Subtle drop shadow
    this.bg.fillStyle(night ? 0x070b19 : 0x1e293b, night ? 0.4 : 0.08)
    this.bg.fillRoundedRect(-halfW + 1, -halfH + 3, w, h, 16)

    // Frosted glass background
    const bgFill = night ? 0x141a33 : 0xffffff
    const bgAlpha = night ? 0.94 : 0.94
    this.bg.fillStyle(bgFill, bgAlpha)
    this.bg.fillRoundedRect(-halfW, -halfH, w, h, 16)

    // Delicate border
    const strokeColor = night ? 0x47558a : 0xcbd5e1
    const strokeAlpha = night ? 0.8 : 0.85
    this.bg.lineStyle(1.5, strokeColor, strokeAlpha)
    this.bg.strokeRoundedRect(-halfW, -halfH, w, h, 16)

    // Badge mini pill
    this.badgeBg.clear()
    const badgeW = Math.min(w - 24, this.badgeText.width + 16)
    const badgeH = 16
    const badgeY = -halfH + 12

    const badgeFill = night ? 0x312e81 : 0xe0e7ff
    this.badgeBg.fillStyle(badgeFill, night ? 0.75 : 0.85)
    this.badgeBg.fillRoundedRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 8)

    this.badgeText.setPosition(0, badgeY)

    // Content lines
    const titleY = -halfH + 28
    const descY = -halfH + 42

    // On compact screens, show a single aesthetic line
    if (h <= 42) {
      this.badgeText.setVisible(false)
      this.badgeBg.setVisible(false)
      this.titleText.setPosition(0, -6).setFontSize(12)
      this.descText.setPosition(0, 8).setFontSize(10)
    } else {
      this.badgeText.setVisible(true)
      this.badgeBg.setVisible(true)
      this.titleText.setPosition(0, titleY).setFontSize(13)
      this.descText.setPosition(0, descY).setFontSize(11)
    }
  }
}
