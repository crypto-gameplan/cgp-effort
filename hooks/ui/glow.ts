// Animated band rims: the judge's rise and fade, drawn in short pieces, and the cold band's breathing rim.
import { ICE } from '../core/palette'
import { AUTO_GLOW_H, AUTO_GLOW_W, COLD_GLOW_MS } from './dashboard'

// The judge rim rises while it thinks and fades once the verdict is in. The app swaps the whole band on each redraw,
// restarting every animation, so nothing may depend on an image surviving a redraw.
export const JUDGE_RISE_MS = 500
export const JUDGE_FADE_MS = 450
export const JUDGE_GLOW_MAX = 0.85
/** CSS ease-in-out's progress at time t (0 to 1), found by bisection on the curve's x. */
export function easeInOut(t: number): number {
  const at = (a: number, b: number, u: number) => 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u
  let lo = 0, hi = 1
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (at(0.42, 0.58, mid) < t) lo = mid
    else hi = mid
  }
  return at(0, 1, (lo + hi) / 2)
}
export function judgeBrightnessAt(kind: 'rise' | 'fade', elapsedMs: number): number {
  const p = Math.min(1, Math.max(0, elapsedMs / (kind === 'rise' ? JUDGE_RISE_MS : JUDGE_FADE_MS)))
  return kind === 'rise' ? JUDGE_GLOW_MAX * easeInOut(p) : JUDGE_GLOW_MAX * (1 - easeInOut(p))
}
// The rim is drawn in short pieces: the app redraws stale copies of the band at moments the mod does not see, and a
// short piece replayed from one is wrong for at most one step.
export const JUDGE_STEP_MS = 50
// Longer than the gap between the app's redraws (measured 100 to 120 ms), so a piece never stands still before the next.
export const JUDGE_PIECE_MS = 150
export function coldGlowSvg(): string {
  const W = AUTO_GLOW_W, H = AUTO_GLOW_H
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><style>.r{opacity:.15;animation:r ${COLD_GLOW_MS / 1000}s ease-in-out infinite}@keyframes r{0%,100%{opacity:.15}50%{opacity:.6}}</style><defs><filter id="b" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="1.5"/></filter></defs><g class="r"><rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="none" stroke="${ICE}" stroke-width="4" opacity=".16" filter="url(#b)"/><rect x=".75" y="1.75" width="${W - 1.5}" height="${H - 3.5}" rx="8.25" fill="none" stroke="#cfeeff" stroke-width="1.5" vector-effect="non-scaling-stroke"/></g></svg>`
}
