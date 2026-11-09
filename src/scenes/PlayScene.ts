import Phaser from 'phaser'
import { CONFIG, type MoodName } from '../config'
import { Synth } from '../audio'
import { ComboTracker, IDLE_HIT, type ComboHit } from '../combo'
import { SpritePool, TextPool } from '../pool'
import { buildTextures } from '../textures'
import { installInput, type PlayAction } from '../input'
import { Progression, type GameId } from '../challenges/model'
import { ChallengeController } from '../challenges/controller'
import { isDesktop, keyboardLocked, quitApp } from '../desktop'
import { applyDesktopUpdate, getDesktopUpdateState, onDesktopUpdateChange } from '../desktopUpdates'
import { currentMood, saveSettings, settings } from '../settings'
import { ModeSwitcher } from '../switcher'
import { ParentPanel, type PanelAction, type PanelState } from '../parentPanel'
import { safeAreaInsets } from '../safeArea'
import { AlbumModel } from '../discovery/albumModel'
import { DiscoveryTray } from '../discovery/tray'
import type { BadgeId } from '../discovery/types'
import { MODES, findMode, type Mode } from '../modes'
import { playSmash, type SmashEvent, type ToyContext } from '../toys'
import { ThoughtCompanion } from '../companion/thoughtCompanion'
import { keyIndex, pianoKeyCount } from '../modes/pianoLayout'
import { getAnimalForPianoKey } from '../modes/pianoChoralLogic'
import { VERSION_CODE } from '../version'

const isTouchScreen = window.matchMedia('(pointer: coarse)').matches
const isStandalone =
  window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/**
 * The only scene. There is deliberately no menu, no level select, and no game
 * over — every one of those is a state a toddler can get stuck in and cannot
 * read their way out of. The game boots straight into play and stays there.
 *
 * Sub-games (`src/modes/`) and moods (`CONFIG.moods`) swap what happens inside
 * this scene; they never add a screen of their own.
 */
export class PlayScene extends Phaser.Scene {
  private synth = new Synth()
  private pool!: SpritePool
  private text!: TextPool
  private rng!: Phaser.Math.RandomDataGenerator
  private teardownInput?: () => void
  private panel!: ParentPanel
  private lockStatus = ''
  private mode: Mode = MODES[0]
  private leaveMode?: () => void
  private switcher!: ModeSwitcher
  private progress = new Progression()
  private album = new AlbumModel()
  private tray!: DiscoveryTray
  private challenge?: ChallengeController
  private companion?: ThoughtCompanion
  private matchingSmash = false
  private lastSmashChar?: string
  private blockedPointers = new Set<number>()
  private comboTracker = new ComboTracker(CONFIG.combo)

  constructor() {
    super('play')
  }

  create(): void {
    this.rng = new Phaser.Math.RandomDataGenerator([String(Date.now())])
    buildTextures(this)
    this.pool = new SpritePool(this)
    this.pool.onSpawn = (texture) => {
      if (this.matchingSmash && this.mode.name === 'smash') {
        this.companion?.checkMatch({
          shape: texture,
          char: this.lastSmashChar,
        })
      }
    }
    this.text = new TextPool(this)
    this.switcher = new ModeSwitcher(this, MODES)
    this.panel = new ParentPanel(this)
    this.tray = new DiscoveryTray(this, this.album, () => ({
      pool: this.pool,
      synth: this.synth,
      rng: this.rng,
      color: (seed) => this.color(seed),
    }))
    this.mode = findMode(settings.mode)
    this.companion = new ThoughtCompanion(this, () => this.context())

    this.drawHint()
    this.drawVersion()
    this.applyMood()
    this.layoutCompanion()

    this.teardownInput = installInput(this.game.canvas.parentElement ?? document.body, {
      onAction: (action) => {
        const handled = this.handleAction(action)
        if (handled && action.event.pointerId !== undefined) this.blockedPointers.add(action.event.pointerId)
        return handled
      },
      onSmash: (e) => this.handleSmash(e),
      onStroke: (e) => {
        if (this.blockedPointers.has(e.pointerId)) {
          if (e.phase === 'end') this.blockedPointers.delete(e.pointerId)
          return
        }
        if (!this.panel.visible) {
          this.safely(() => this.challenge?.stroke(e))
          this.safely(() => this.mode.stroke?.(e, this.context()))
        }
      },
      onParentEscape: () => this.toggleParentPanel(),
    })

    // Panel shortcuts only work while it's open, so during play they're just
    // ordinary smashes.
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (!this.panel.visible) return
      const action = this.panelActionForKey(ev.key.toLowerCase())
      if (action) this.runPanelAction(action, 'key')
    })

    // iOS only lets audio start from a tap that has ended, which a
    // pointerdown hasn't yet. Unlocking is idempotent, so listen for good.
    const unlockAudio = () => this.synth.unlock()
    window.addEventListener('touchend', unlockAudio)
    window.addEventListener('click', unlockAudio)

    const unsubUpdates = isDesktop
      ? onDesktopUpdateChange(() => {
          if (this.panel.visible) this.panel.refresh(this.panelState())
        })
      : undefined

    this.scale.on('resize', () => {
      this.refresh()
      this.panel.refresh(this.panelState())
      this.layoutCompanion()
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubUpdates?.()
      this.teardownInput?.()
      this.challenge?.destroy()
      this.companion?.destroy()
      this.tray.destroy()
      this.leaveMode?.()
      window.removeEventListener('touchend', unlockAudio)
      window.removeEventListener('click', unlockAudio)
    })
  }

  private safely<T>(fn: () => T): T | undefined {
    try { return fn() } catch { return undefined }
  }

  private handleAction(action: PlayAction): boolean {
    this.hint?.setVisible(false)
    const e = action.event
    if (this.panel.visible) {
      const picked = e.source === 'pointer' ? this.panel.hit(e.x, e.y) : undefined
      if (picked) this.runPanelAction(picked, 'pointer')
      return true
    }
    if (e.source === 'pointer') {
      const mode = this.switcher.hit(e.x, e.y)
      if (mode) {
        this.setMode(mode)
        return true
      }
    }
    const challengeHandled = this.safely(() => this.challenge?.action(action)) ?? false
    this.syncCompanionVisibility()
    if (challengeHandled) return true

    if (e.source === 'pointer') {
      const badge = this.tray.hit(e.x, e.y)
      if (badge) return true
    }
    return false
  }

  private handleSmash(e: SmashEvent): void {
    // Any input dismisses the hint text — the child has worked it out.
    this.hint?.setVisible(false)

    if (this.panel.visible) {
      const action = e.source === 'pointer' ? this.panel.hit(e.x, e.y) : undefined
      if (action) this.runPanelAction(action, 'pointer')
      return
    }

    if (e.source === 'pointer') {
      const picked = this.switcher.hit(e.x, e.y)
      if (picked) {
        this.setMode(picked)
        return
      }
      const badge = this.tray.hit(e.x, e.y)
      if (badge) return
    }

    if (this.mode.name === 'piano') {
      const key = keyIndex(e, this.scale.width, pianoKeyCount(this.scale.width))
      const noteIndex = key % 5
      const animal = getAnimalForPianoKey(key)
      this.companion?.checkMatch({ noteIndex, animal })
    } else if (this.mode.name === 'smash') {
      this.matchingSmash = true
      this.lastSmashChar = e.char
      if (e.char === 'D' || e.char === 'd') {
        this.companion?.checkMatch({ animal: 'dinosaur', char: 'D' })
      } else if (e.char === 'S' || e.char === 's') {
        this.companion?.checkMatch({ animal: 'shark', char: 'S' })
      }
    }

    // Only Smash climbs the arpeggio. Piano and Drawing keep their own notes,
    // and a celebration chord must not land on top of a melody puzzle.
    if (this.mode.name !== 'smash') {
      playSmash(e, this.context(), this.mode.toys)
      this.matchingSmash = false
      this.syncCompanionVisibility()
      return
    }
    const combo = this.comboTracker.hit(performance.now())
    const ctx = this.context(combo)
    if (combo.isPeak) {
      this.safely(() => this.celebrateCombo(e, ctx))
      // The chord sits an octave above the arpeggio's last note.
      this.synth.playWarmChord(CONFIG.combo.maxCombo - 1)
    }
    playSmash(e, ctx, this.mode.toys)
    this.matchingSmash = false
    this.syncCompanionVisibility()
  }

  /**
   * The crescendo at the top of a streak: a few big rings and a shimmer of
   * stars and dots. Everything comes from the sprite pool, so mashing a streak
   * over and over stays capped. Bedtime spreads slower and fades later.
   */
  private celebrateCombo(e: SmashEvent, ctx: ToyContext): void {
    const { rings, shimmerCount } = CONFIG.combo.celebration
    const { speedScale } = ctx.mood.motion
    const { rippleMs } = ctx.mood.decay

    for (let i = 0; i < rings; i++) {
      const ring = ctx.pool.spawn('ring', e.x, e.y)
      ring.setTint(ctx.color(e.index + i))
      ring.setScale(0.2)
      ring.setAlpha(0.95)
      ctx.scene.tweens.add({
        targets: ring,
        scale: ctx.rng.realInRange(4.5, 6),
        alpha: 0,
        delay: i * 90,
        duration: rippleMs,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          ring.setVisible(false)
          ring.setActive(false)
        },
      })
    }

    for (let i = 0; i < shimmerCount; i++) {
      const p = ctx.pool.spawn(i % 2 === 0 ? 'star' : 'dot', e.x, e.y)
      p.setTint(ctx.color(e.index + i))
      p.setScale(ctx.rng.realInRange(0.5, 0.9))
      const angle = (i / shimmerCount) * Math.PI * 2 + ctx.rng.realInRange(-0.15, 0.15)
      const dist = ctx.rng.between(140, 260) * speedScale
      ctx.scene.tweens.add({
        targets: p,
        x: Phaser.Math.Clamp(e.x + Math.cos(angle) * dist, 10, ctx.width - 10),
        y: e.y + Math.sin(angle) * dist,
        scale: p.scale * 1.5,
        duration: 650, // the mood's tween timeScale already slows Bedtime
        ease: 'Sine.easeInOut',
        yoyo: true,
      })
      ctx.pool.retire(p, 700, 350)
    }
  }

  private context(combo: ComboHit = IDLE_HIT): ToyContext {
    return {
      scene: this,
      pool: this.pool,
      text: this.text,
      synth: this.synth,
      rng: this.rng,
      width: this.scale.width,
      height: this.scale.height,
      color: (seed) => this.color(seed),
      discover: (id: BadgeId) => {
        if (this.album.discover(id)) {
          this.tray.refresh()
        }
      },
      checkMatch: (action) => this.companion?.checkMatch(action),
      combo,
      mood: currentMood(),
    }
  }

  private color(seed?: number): number {
    const p = currentMood().palette
    if (seed === undefined) return p[this.rng.between(0, p.length - 1)]
    return p[Math.abs(Math.floor(seed)) % p.length]
  }

  private setMode(mode: Mode): void {
    this.comboTracker.reset()
    if (mode === this.mode) {
      if (this.challenge) this.progress.back(this.mode.name as GameId)
      this.challenge?.destroy()
      this.challenge = this.createChallenge()
      this.challenge?.pause(this.panel.visible)
      this.syncCompanionVisibility()
      this.switcher.wiggle(mode)
      return
    }
    if (this.challenge) this.progress.back(this.mode.name as GameId)
    this.mode = mode
    settings.mode = mode.name
    saveSettings()
    this.enterMode()
    this.layoutSwitcher()
    this.layoutCompanion()
    this.layoutTray()
    this.synth.chime()
  }

  private setMood(name: MoodName): void {
    this.comboTracker.reset()
    settings.mood = name
    saveSettings()
    this.applyMood()
  }

  private applyMood(): void {
    const mood = currentMood()
    document.documentElement.dataset.mood = settings.mood
    this.tweens.timeScale = mood.timeScale
    this.synth.setMood(mood.audio)
    this.hint?.setColor(mood.hintColor)
    this.versionText?.setColor(mood.hintColor)
    document.body.style.background = '#' + mood.background.top.toString(16).padStart(6, '0')
    this.refresh()
  }

  /** Rebuild everything that depends on screen size, mood or mode. */
  private refresh(): void {
    this.drawBackground()
    this.enterMode()
    this.layoutSwitcher()
    this.layoutCompanion()
    this.layoutTray()
    this.layoutVersion()
  }

  private layoutTray(): void {
    this.tray.layout({
      width: this.scale.width,
      height: this.scale.height,
      mode: this.mode.name,
      night: currentMood().night,
    })
  }

  private enterMode(): void {
    this.challenge?.destroy()
    this.leaveMode?.()
    this.leaveMode = this.mode.enter?.(this.context())
    this.challenge = this.createChallenge()
    this.challenge?.pause(this.panel.visible)
  }

  private createChallenge(): ChallengeController | undefined {
    const name = this.mode.name
    if (name === 'smash' || name === 'piano' || name === 'drawing') {
      return this.safely(() => new ChallengeController(this.progress, name, () => this.context(), this.mode))
    }
    return undefined
  }

  private layoutSwitcher(): void {
    const insets = safeAreaInsets()
    this.switcher.layout({
      width: this.scale.width,
      inset: { top: insets.top, right: insets.right },
      current: this.mode,
      visible: settings.childCanSwitch,
      night: currentMood().night,
      color: (i) => this.color(i),
    })
  }

  private bg?: Phaser.GameObjects.Graphics

  private drawBackground(): void {
    this.bg?.destroy()
    const { width, height } = this.scale
    const mood = currentMood()
    const g = this.add.graphics()
    g.fillGradientStyle(mood.background.top, mood.background.top, mood.background.bottom, mood.background.bottom, 1)
    g.fillRect(0, 0, width, height)

    if (mood.night) {
      // Seeded so the sky doesn't rearrange itself on every resize.
      const sky = new Phaser.Math.RandomDataGenerator(['stars'])
      for (let i = 0; i < 70; i++) {
        g.fillStyle(0xffffff, sky.realInRange(0.2, 0.7))
        g.fillCircle(sky.between(0, width), sky.between(0, height * 0.6), sky.realInRange(0.8, 2.2))
      }
      const r = Math.min(width, height) * 0.06
      const mx = width * 0.1 + safeAreaInsets().left
      const my = height * 0.15
      g.fillStyle(0xfff1c1, 0.95)
      g.fillCircle(mx, my, r)
      // The bite out of the moon is sky-coloured, so match the gradient there.
      const top = Phaser.Display.Color.ValueToColor(mood.background.top)
      const bottom = Phaser.Display.Color.ValueToColor(mood.background.bottom)
      const bite = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, height, my - r * 0.2)
      g.fillStyle(Phaser.Display.Color.GetColor(bite.r, bite.g, bite.b), 1)
      g.fillCircle(mx + r * 0.45, my - r * 0.2, r * 0.9)
    }

    g.setDepth(-1000)
    this.bg = g
  }

  private hint?: Phaser.GameObjects.Text

  private drawHint(): void {
    const { width, height } = this.scale
    this.hint = this.add
      .text(width / 2, height * 0.3, isTouchScreen ? 'touch anything' : 'press anything', {
        fontFamily: 'Verdana, Geneva, sans-serif',
        fontSize: `${Math.round(Math.min(38, width / 11))}px`,
        color: currentMood().hintColor,
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

  private versionText?: Phaser.GameObjects.Text

  private drawVersion(): void {
    const insets = safeAreaInsets()
    const { width, height } = this.scale
    const mood = currentMood()
    this.versionText = this.add
      .text(width - insets.right - 10, height - insets.bottom - 8, VERSION_CODE, {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '11px',
        color: mood.hintColor,
      })
      .setOrigin(1, 1)
      .setAlpha(0.5)
      .setDepth(10)
  }

  private layoutVersion(): void {
    if (!this.versionText) return
    const insets = safeAreaInsets()
    const { width, height } = this.scale
    this.versionText.setPosition(width - insets.right - 10, height - insets.bottom - 8)
  }

  /**
   * The grown-up panel. Reached by holding Escape, or the top-left and
   * bottom-right corners, for three seconds — well outside what random
   * mashing produces.
   */
  private toggleParentPanel(): void {
    this.comboTracker.reset()
    if (this.panel.visible) {
      this.panel.hide()
      this.challenge?.pause(false)
      this.syncCompanionVisibility()
      return
    }
    this.panel.show(this.panelState())
    this.challenge?.pause(true)
    this.tray.cancelDance()
    this.syncCompanionVisibility()
    if (isDesktop) {
      void keyboardLocked().then((on) => {
        this.lockStatus = on
          ? 'Keyboard lock · on'
          : navigator.userAgent.includes('Mac')
            ? 'Keyboard lock · off: allow Toddler Smash in\nSystem Settings › Privacy & Security › Accessibility'
            : 'Keyboard lock · off'
        this.panel.refresh(this.panelState())
      })
    }
  }

  private panelState(): PanelState {
    return {
      modes: MODES,
      mode: this.mode,
      mood: settings.mood,
      childCanSwitch: settings.childCanSwitch,
      isDesktop,
      canFullscreen: !isDesktop && !isStandalone && this.scale.fullscreen.available,
      isFullscreen: this.scale.isFullscreen,
      standalone: isStandalone,
      lockStatus: this.lockStatus,
      desktopUpdate: isDesktop ? getDesktopUpdateState() : undefined,
    }
  }

  private panelActionForKey(key: string): PanelAction | undefined {
    const mode = MODES[Number(key) - 1]
    if (mode) return { kind: 'mode', mode }
    const mood = (Object.keys(CONFIG.moods) as MoodName[]).find((m) => CONFIG.moods[m].panelKey.toLowerCase() === key)
    if (mood) return { kind: 'mood', mood }
    if (key === 'c') return { kind: 'toggleChild' }
    if (key === 'r') return { kind: 'resetProgress' }
    if (key === 'f' && !isDesktop) return { kind: 'fullscreen' }
    if (key === 'u' && isDesktop && getDesktopUpdateState().status === 'ready') return { kind: 'desktopUpdate' }
    if (key === 'q' && isDesktop) return { kind: 'quit' }
    return undefined
  }

  private runPanelAction(action: PanelAction, source: 'key' | 'pointer'): void {
    switch (action.kind) {
      case 'mode':
        this.setMode(action.mode)
        break
      case 'mood':
        this.setMood(action.mood)
        break
      case 'toggleChild':
        settings.childCanSwitch = !settings.childCanSwitch
        saveSettings()
        this.layoutSwitcher()
        break
      case 'resetProgress':
        this.progress.reset()
        this.leaveMode?.()
        this.leaveMode = undefined
        for (const m of MODES) m.resetDiscovery?.()
        this.album.reset()
        this.tray.refresh()
        this.comboTracker.reset()
        this.challenge?.destroy()
        this.enterMode()
        this.challenge?.pause(true)
        break
      case 'fullscreen': {
        const toggle = () => {
          if (this.scale.isFullscreen) this.scale.stopFullscreen()
          else this.scale.startFullscreen()
          window.setTimeout(() => this.panel.refresh(this.panelState()), 300)
        }
        // Browsers only allow full screen from a finished tap, so wait for
        // the finger to lift.
        if (source === 'pointer') window.addEventListener('pointerup', toggle, { once: true })
        else toggle()
        break
      }
      case 'desktopUpdate':
        applyDesktopUpdate().catch(() => {})
        break
      case 'quit':
        quitApp()
        return
      case 'close':
        this.panel.hide()
        this.challenge?.pause(false)
        this.syncCompanionVisibility()
        return
    }
    this.panel.refresh(this.panelState())
    this.syncCompanionVisibility()
  }

  private layoutCompanion(): void {
    if (!this.companion) return
    const insets = safeAreaInsets()
    const { width, height } = this.scale
    const night = currentMood().night
    this.companion.layout(width, height, insets, night)
    this.companion.setGameMode(this.mode.name)
    this.syncCompanionVisibility()
  }

  private syncCompanionVisibility(): void {
    if (!this.companion) return
    const isPuzzle =
      this.mode.name === 'smash' || this.mode.name === 'piano' || this.mode.name === 'drawing'
        ? this.progress.state(this.mode.name as GameId).view === 'puzzle'
        : false
    const hidden = this.panel.visible || isPuzzle
    this.companion.setVisible(!hidden)
  }
}
