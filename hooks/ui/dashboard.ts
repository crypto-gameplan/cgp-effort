// Dashboard band constants: the effort word's flash, the Handoff button's glow, the Quick | Full switch and rim glows.

export const SWITCHED_MS = 2500
// The effort word's glow after it changes: held at full colour for FLASH_HOLD_MS, gone by FLASH_MS.
export const FLASH_HOLD_MS = 1000
export const FLASH_MS = 1800
/** [ms, share of the way to white]. Keep them few: each step is a redraw, and every redraw rebuilds the band. */
export const FLASH_STEPS: readonly (readonly [number, number])[] = [[1000, 0.15], [1160, 0.35], [1320, 0.55], [1480, 0.75], [1640, 0.9]]
// Check glow changes on tools/render-band: a preview draws it tighter than the app does.
export const HANDOFF_GLOW = true
// Context percent from which Handoff turns white: below it a handoff saves little.
export const HANDOFF_LOUD_AT = 30
export const HANDOFF_ADVICE_LEVEL = 50
// Handoff's box fades in grey up to this percent, then lightens to white by HANDOFF_LOUD_AT, where the glow takes over.
export const HANDOFF_BOX_AT = 15
export const HANDOFF_PILL_W = 66
export const HANDOFF_PILL_H = 19
export function handoffGlowStep(percent: number): number {
  return percent < HANDOFF_LOUD_AT ? 0 : Math.min(5, 1 + Math.floor((percent - HANDOFF_LOUD_AT) / 10))
}
// One glow per handoffGlowStep: wider, softer and brighter each step, pulsing between low and peak.
export const GLOW_LEVELS: ReadonlyArray<{ spread: number; blur: number; peak: number; low: number; period: number }> = [
  { spread: 0, blur: 0, peak: 0, low: 0, period: 0 },
  { spread: 1.5, blur: 1.2, peak: 0.55, low: 0.2, period: 3.4 },
  { spread: 2, blur: 1.5, peak: 0.65, low: 0.25, period: 2.8 },
  { spread: 2.5, blur: 1.8, peak: 0.75, low: 0.3, period: 2.3 },
  { spread: 3, blur: 2.1, peak: 0.85, low: 0.35, period: 1.9 },
  { spread: 3.5, blur: 2.4, peak: 0.95, low: 0.4, period: 1.5 },
]
// The band leaves 8 px above and below the button. The drawing is no wider than its layer, so the app never scales it.
export const GLOW_W = HANDOFF_PILL_W + 16
export const GLOW_H = HANDOFF_PILL_H + 16
export const GLOW_BUTTON = { w: HANDOFF_PILL_W, h: HANDOFF_PILL_H, r: 6 }
export const AUTO_SLIDE_MS = 260
// Width of each half of the Quick | Full switch. Its words are app Text laid over the image, to keep the band's font.
export const KIND_CELLS = 9
// One cell (`1ch`) of the desktop band in CSS px, measured on tools/render-band.
const CELL_PX = 7.9
export const KIND_W = Math.round(KIND_CELLS * 2 * CELL_PX)
export const KIND_H = 20
export const KIND_SLIDE_MS = 300
export const KIND_SLIDE_DELAY_MS = 70
// The rim glow as Auto switches on. Drawn at about the band's real width so its sides stay as thick as top and bottom.
export const AUTO_GLOW_MS = 2600
export const AUTO_GLOW_W = 760
export const AUTO_GLOW_H = 37
export const COLD_GLOW_MS = 4200
