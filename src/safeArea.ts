export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Pixels hidden by a notch, rounded corners or the home indicator, read from
 * CSS `env(safe-area-inset-*)` (which needs `viewport-fit=cover`, set in
 * index.html). All zeros on screens without them.
 */
export function safeAreaInsets(): Insets {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  }
  probe.remove()
  return insets
}
