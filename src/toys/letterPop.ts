import { CONFIG } from '../config'
import type { Toy } from './types'

/**
 * Press A, get a giant bouncing A.
 *
 * This is the toy that quietly turns mashing into something educational: the
 * child is not being taught letters, but they are seeing the exact glyph they
 * pressed, big and coloured, every single time.
 */
export const letterPop: Toy = {
  name: 'letterPop',

  // Claim every printable character exclusively — a pressed letter should
  // always show that letter, never a random shape.
  match: (e) => e.isLetter || e.isDigit,

  play(e, ctx) {
    const color = ctx.color(e.index)
    const size = ctx.rng.between(140, 230)

    const txt = ctx.text.spawn(e.char, e.x, e.y, size)
    txt.setColor(hex(color))
    txt.setScale(0.2)
    txt.setAngle(ctx.rng.between(-18, 18))

    // Overshoot-and-settle. Toddlers track this far better than a linear fade.
    ctx.scene.tweens.add({
      targets: txt,
      scale: 1,
      duration: 420,
      ease: 'Back.easeOut',
    })

    // Drift upward slowly so the screen self-clears toward the top.
    ctx.scene.tweens.add({
      targets: txt,
      y: e.y - ctx.rng.between(50, 120),
      duration: CONFIG.lifetime.glyphMs,
      ease: 'Sine.easeOut',
    })

    ctx.text.retire(txt, CONFIG.lifetime.glyphMs * 0.55)

    // Pitch tracks position on screen: left is low, right is high. Sweeping a
    // hand across the keyboard produces a rising run rather than random notes.
    const note = Math.floor((e.x / ctx.width) * ctx.synth.noteCount)
    ctx.synth.play(note)

    // A few sparkles so the glyph has some weight behind it.
    for (let i = 0; i < 6; i++) {
      const dot = ctx.pool.spawn('dot', e.x, e.y)
      dot.setTint(ctx.color(e.index + i))
      dot.setScale(ctx.rng.realInRange(0.6, 1.6))
      const angle = ctx.rng.realInRange(0, Math.PI * 2)
      const dist = ctx.rng.between(70, 190)
      ctx.scene.tweens.add({
        targets: dot,
        x: e.x + Math.cos(angle) * dist,
        y: e.y + Math.sin(angle) * dist,
        alpha: 0,
        duration: ctx.rng.between(500, 900),
        ease: 'Cubic.easeOut',
      })
      ctx.pool.retire(dot, 400, 300)
    }
  },
}

function hex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}
