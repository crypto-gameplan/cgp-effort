// Small shared UI pieces: animation phasing, card titles, icons, and card timings and sizes.
import { MARK_SVG } from '../core/mark'

// A band's entrance is drawn only this long after it appears, since every redraw would replay it.
export const INTRO_MS = 1300
/** Starts the Svg's animations `elapsedMs` in, so a redraw (which restarts them) picks up where they were. */
export function inPhase(svg: string, elapsedMs: number): string {
  return svg.replace('</svg>', `<style>svg *{animation-delay:${(-Math.max(0, elapsedMs) / 1000).toFixed(3)}s !important}</style></svg>`)
}
const TITLE_MARK_SIZE = 16
/** A card title with the mark in place of its ✦; plain text where the surface draws no images. */
export function markTitle(els: { Box: unknown; Text: unknown; Svg?: unknown }, key: string, color: string, title: string, mark = MARK_SVG) {
  const { Box: B, Text: T, Svg: S } = els as unknown as { Box: (p: Record<string, unknown>) => unknown; Text: (p: Record<string, unknown>) => unknown; Svg?: (p: Record<string, unknown>) => unknown }
  if (!S) return <T key={key} color={color} bold wrap="truncate">{title}</T>
  return (
    <B key={key} flexDirection="row" alignItems="center" flexShrink={1} minWidth={0}>
      <B flexShrink={0} marginRight={1} alignItems="center">
        <S source={mark} alt="CGP Effort" width={TITLE_MARK_SIZE} height={TITLE_MARK_SIZE} />
      </B>
      <T color={color} bold wrap="truncate">{title.replace(/^✦ /, '')}</T>
    </B>
  )
}
export function ringSvg(percent: number, color: string): string {
  const p = Math.max(0, Math.min(100, percent))
  const c = 2 * Math.PI * 6
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-opacity=".25" stroke-width="2.2"/><circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="${((c * p) / 100).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 8 8)"/></svg>`
}
/** A drawn cog, since the gear glyph has a different shape in every font. Row icons below are drawn for the same reason. */
export function settingsSvg(color: string): string {
  const step = (2 * Math.PI) / 8
  const pts: string[] = []
  for (let i = 0; i < 8; i++) {
    const a = i * step
    const at = (f: number, r: number) => `${(7 + r * Math.cos(a + f * step)).toFixed(2)},${(7 + r * Math.sin(a + f * step)).toFixed(2)}`
    pts.push(at(-0.42, 4.6), at(-0.27, 4.6), at(-0.2, 6.1), at(0.2, 6.1), at(0.27, 4.6), at(0.42, 4.6))
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><g fill="none" stroke="${color}" stroke-width="1.3" stroke-linejoin="round" shape-rendering="geometricPrecision"><path d="M${pts.join('L')}Z"/><circle cx="7" cy="7" r="2"/></g></svg>`
}
export function rowIconSvg(kind: 'effort' | 'model' | 'judge' | 'handoff' | 'show' | 'quick' | 'full', color: string): string {
  const shapes = {
    effort: '<path d="M2.6 10.4A5 5 0 1 1 11.4 10.4"/><path d="M7 8.2L9.6 5.2"/><circle cx="7" cy="8.6" r=".9"/>',
    model: '<path d="M7 2 12.2 4.7 7 7.4 1.8 4.7Z"/><path d="M1.8 7.3 7 10 12.2 7.3"/><path d="M1.8 9.9 7 12.6 12.2 9.9"/>',
    judge: '<path d="M7 2.4V11.6M4.4 11.6H9.6M2.6 4.2H11.4"/><path d="M2.6 4.2L1.2 7.6A1.5 1.5 0 0 0 4 7.6Z"/><path d="M11.4 4.2L10 7.6A1.5 1.5 0 0 0 12.8 7.6Z"/>',
    handoff: '<path d="M1.8 7H9.4M6.6 4.2L9.4 7L6.6 9.8"/><path d="M11.8 2.6V11.4"/>',
    show: '<path d="M9.6 2.1 11.9 4.4 4.9 11.4 2.1 11.9 2.6 9.1Z"/><path d="M8.1 3.6 10.4 5.9"/>',
    // Drawn solid below: an outline at 14 px was too thin to read.
    quick: '',
    full: '',
  }[kind]
  if (kind === 'quick' || kind === 'full') {
    const solid = kind === 'quick'
      ? 'M8.6 1 2.8 8.2H6.6L5.4 13 11.2 5.8H7.4Z'
      : 'M10.2 1.5 12.5 3.8 5.3 11 2.3 11.7 3 8.7ZM9 2.7 11.3 5'
    return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><path d="${solid}" fill="${color}" stroke="${color}" stroke-width="0.6" stroke-linejoin="round"/></svg>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><g fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision">${shapes}</g></svg>`
}
/** k/M for token counts: 420000 -> "420k", 1000000 -> "1.0M". */
export function kTokens(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}k`
}
export const COMPACT_CARD_MS = 20_000
// As tall as the overview's cards (56 px, measured on tools/render-band), so the settings panel keeps its height in every
// part. A Box height is in lines, and the app's line is 19 px.
export const SETTINGS_BODY_H = 56 / 19
// The app's ghost hover fill is lost on the green and violet cards, so the ✕ hover darkens the card itself.
export const CARD_CLOSE_HOVER = '#00000040'
