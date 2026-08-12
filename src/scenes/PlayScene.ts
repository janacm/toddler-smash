import Phaser from 'phaser'
import { CONFIG } from '../config'
import { Synth } from '../audio'
import { SpritePool, TextPool } from '../pool'
import { buildTextures } from '../textures'
import { installInput } from '../input'
import { playSmash, type SmashEvent, type ToyContext } from '../toys'

/**
 * The only scene. There is deliberately no menu, no level select, and no game
 * over — every one of those is a state a toddler can get stuck in and cannot
 * read their way out of. The game boots straight into play and stays there.
 */
export class PlayScene extends Phaser.Scene {
  private synth = new Synth()
  private pool!: SpritePool
  private text!: TextPool
  private rng!: Phaser.Math.RandomDataGenerator
  private teardownInput?: () => void
  private parentPanel?: Phaser.GameObjects.Container

  constructor() {
    super('play')
  }

  create(): void {
    this.rng = new Phaser.Math.RandomDataGenerator([String(Date.now())])
    buildTextures(this)
    this.pool = new SpritePool(this)
    this.text = new TextPool(this)

    this.drawBackground()
    this.drawHint()

    this.teardownInput = installInput(this.game.canvas.parentElement ?? document.body, {
      onSmash: (e) => this.handleSmash(e),
      onParentEscape: () => this.toggleParentPanel(),
    })

    this.scale.on('resize', () => this.drawBackground())
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardownInput?.())
  }

  private handleSmash(e: SmashEvent): void {
    // Any input dismisses the hint text — the child has worked it out.
    this.hint?.setVisible(false)

    if (this.parentPanel?.visible) return

    const ctx: ToyContext = {
      scene: this,
      pool: this.pool,
      text: this.text,
      synth: this.synth,
      rng: this.rng,
      width: this.scale.width,
      height: this.scale.height,
      color: (seed) => this.color(seed),
    }
    playSmash(e, ctx)
  }

  private color(seed?: number): number {
    const p = CONFIG.palette
    if (seed === undefined) return p[this.rng.between(0, p.length - 1)]
    return p[Math.abs(Math.floor(seed)) % p.length]
  }

  private bg?: Phaser.GameObjects.Graphics

  private drawBackground(): void {
    this.bg?.destroy()
    const { width, height } = this.scale
    const g = this.add.graphics()
    g.fillGradientStyle(
      CONFIG.background.top,
      CONFIG.background.top,
      CONFIG.background.bottom,
      CONFIG.background.bottom,
      1,
    )
    g.fillRect(0, 0, width, height)
    g.setDepth(-1000)
    this.bg = g
  }

  private hint?: Phaser.GameObjects.Text

  private drawHint(): void {
    const { width, height } = this.scale
    this.hint = this.add
      .text(width / 2, height * 0.5, 'press anything', {
        fontFamily: 'Verdana, Geneva, sans-serif',
        fontSize: '38px',
        color: '#5b6480',
      })
      .setOrigin(0.5)
      .setDepth(-500)

    this.tweens.add({
      targets: this.hint,
      alpha: 0.35,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  /**
   * The grown-up panel. Reached by holding Escape for three seconds, which is
   * well outside what random mashing produces.
   */
  private toggleParentPanel(): void {
    if (this.parentPanel) {
      const showing = this.parentPanel.visible
      this.parentPanel.setVisible(!showing)
      return
    }

    const { width, height } = this.scale
    const panel = this.add.container(width / 2, height / 2).setDepth(10_000)

    const bg = this.add.rectangle(0, 0, Math.min(520, width * 0.9), 260, 0x0d1018, 0.96)
    bg.setStrokeStyle(2, 0x39405c)

    const title = this.add
      .text(0, -86, 'Grown-up menu', {
        fontFamily: 'Verdana, Geneva, sans-serif',
        fontSize: '26px',
        color: '#e8ecff',
      })
      .setOrigin(0.5)

    const body = this.add
      .text(0, -14, 'Fullscreen  ·  press F\nQuit to browser  ·  close the tab\n\nHold Escape again to hide this.', {
        fontFamily: 'Verdana, Geneva, sans-serif',
        fontSize: '17px',
        color: '#9aa3c4',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)

    panel.add([bg, title, body])
    this.parentPanel = panel

    // 'F' only works while the panel is open, so a child pressing F during
    // play just gets a shape.
    this.input.keyboard?.on('keydown-F', () => {
      if (!this.parentPanel?.visible) return
      if (this.scale.isFullscreen) this.scale.stopFullscreen()
      else this.scale.startFullscreen()
    })
  }
}
