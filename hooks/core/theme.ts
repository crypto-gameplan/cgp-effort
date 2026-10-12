// Colour theme: the CGP look and the light-app variant of every colour.
// Drawings are written in a violet source palette that 'cgp' turns into navy (dark) and gold (light); 'violet' is for tests.

export type ThemeName = 'violet' | 'cgp'
export const THEMES: readonly ThemeName[] = ['violet', 'cgp']
export const CGP_GOLD = '#ffab19'
export const CGP_NAVY = '#011e33'
const GOLD_HUE = 38
const NAVY_HUE = 205

let current: ThemeName = 'violet'
let light = false
export const setLight = (on: boolean) => {
  if (on !== light) lmemo.clear()
  light = on
}
export const isLight = () => light
export const setTheme = (name: ThemeName) => {
  if (name !== current) memo.clear()
  current = name
}
export const getTheme = () => current

export const VIOLET = '#a79cf7'

const hexRe = /#[0-9a-fA-F]{6}\b/g
const memo = new Map<string, string>()
const lmemo = new Map<string, string>()

function toHsl(r: number, g: number, b: number): [number, number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d !== 0) {
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h = (h * 60 + 360) % 360
  }
  return [h, s, l, d]
}

function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const byte = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255))).toString(16).padStart(2, '0')
  return `#${byte(r)}${byte(g)}${byte(b)}`
}

// Wide washes and glows: faint gold over navy reads brown, so these turn light navy instead.
const GLOWS = new Set(['#7c6cf0', '#8f7ff0', '#b3a6ff', '#c9bdff', '#9a86ff'])

function cgpHex(h: number, s: number, l: number, key: string): string {
  if (key === VIOLET) return CGP_GOLD
  if (GLOWS.has(key)) return fromHsl(NAVY_HUE, 0.55, l)
  // Edges and hovers get a calmer navy than the panel itself, so they do not glow.
  if (l < 0.45) return fromHsl(NAVY_HUE, l < 0.15 ? 0.9 : 0.45, l)
  // A touch more saturation so pale golds still read as gold.
  return fromHsl(GOLD_HUE, Math.min(1, s + 0.1), l)
}

/** Turns a violet hex into its CGP colour; any other colour passes through. */
export function tintHex(hex: string): string {
  if (current === 'violet') return hex
  const key = hex.toLowerCase()
  const hit = memo.get(key)
  if (hit) return hit
  const n = parseInt(key.slice(1), 16)
  const [h, s, l, chroma] = toHsl((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
  // Blue-leaning greys (hardly any chroma) are not part of the violet family.
  const out = h >= 235 && h <= 300 && chroma >= 0.03 && s >= 0.15 ? cgpHex(h, s, l, key) : hex
  memo.set(key, out)
  return out
}

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16)
  const f = (v: number) => (v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255)
}
// The palest turned surface; text must reach 4.6:1 against it.
const PALE_REF = luminance('#e3e0ed')
/** A hex for a light app: dark surfaces turn pale, text turns deep enough to read; 'art' picks by lightness; alpha is kept. */
export function lightHex(hex: string, role: 'text' | 'surface' | 'art' = 'art'): string {
  const key = hex.toLowerCase()
  const memoKey = role + key
  const hit = lmemo.get(memoKey)
  if (hit) return hit
  const n = parseInt(key.slice(1, 7), 16)
  const [h, s, l] = toHsl((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
  const asText = role === 'text' || (role === 'art' && l >= 0.5)
  let out: string
  if (asText) {
    const sat = Math.min(s, 0.72)
    // Greys keep their order; strong colours start a little lighter so they stay colours.
    let at = l >= 0.5 ? Math.max(0.12, Math.min(0.5, 1 - l + (s >= 0.35 ? 0.2 : 0))) : l
    out = fromHsl(h, sat, at)
    while (at > 0.12 && (PALE_REF + 0.05) / (luminance(out) + 0.05) < 4.6) {
      at -= 0.01
      out = fromHsl(h, sat, at)
    }
  } else {
    // Lightness order flips (the panel palest, edges and hovers a step darker); tinted surfaces keep more colour.
    const top = s >= 0.2 ? 0.955 : 0.99
    out = l >= 0.5 ? key.slice(0, 7) : fromHsl(h, Math.min(s, s >= 0.2 ? 0.6 : 0.35), Math.max(0.8, Math.min(top, top - (l - 0.07) * 0.9)))
  }
  const result = key.length === 9 ? out + key.slice(7) : out
  lmemo.set(memoKey, result)
  return result
}
const lightRe = /#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?(?![0-9a-fA-F])/g

/** Every hex in a string (an SVG, a style) in the current theme and appearance. */
export function tint(text: string): string {
  if (current === 'violet' && !light) return text
  const drawn = current === 'violet' ? text : text.replace(hexRe, tintHex)
  if (!light) return drawn
  // Tags marked data-keep (a switch's knob) sit on their own colour, not the panel, so they are not turned.
  return drawn.replace(/(<[^>]*>)|([^<]+)/g, (part: string, tag?: string) =>
    tag && tag.includes('data-keep') ? part : part.replace(lightRe, hex => lightHex(hex)))
}

export const accent = () => tintHex(VIOLET)

type Component = (props: Record<string, unknown>) => unknown
const wrapped = new WeakMap<object, Component>()

/** Wraps Svg so its source is tinted; returns it unchanged when nothing would be. */
// Animations off: every drawing is shown as it stands, without its CSS animations (Settings → Customize).
let still = false
export const setStill = (on: boolean) => {
  still = on
}
export const isStill = () => still
/** A drawing with its animations stopped when still is on; anything that only appeared through an animation stays hidden. */
export function frozen(text: string): string {
  if (!still) return text
  const at = text.lastIndexOf('</svg>')
  return at < 0 ? text : `${text.slice(0, at)}<style>*{animation:none!important;transition:none!important}</style>${text.slice(at)}`
}

export function themedSvg<T>(Svg: T): T {
  if ((current === 'violet' && !light && !still) || typeof Svg !== 'function') return Svg
  let wrap = wrapped.get(Svg as object)
  if (!wrap) {
    const inner = Svg as unknown as Component
    wrap = props => inner(typeof props.source === 'string' ? { ...props, source: frozen(tint(props.source)) } : props)
    wrapped.set(Svg as object, wrap)
  }
  return wrap as unknown as T
}

const PAINT = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor']
const paint = (v: unknown, role: 'text' | 'surface') => (typeof v === 'string' && /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(v) ? lightHex(v, role) : v)
/** A props object with its hex colours, and its hover's, turned for a light app. */
export function lightProps(props: Record<string, unknown>): Record<string, unknown> {
  let out = props
  for (const k of PAINT) {
    const turned = paint(props[k], k === 'color' ? 'text' : 'surface')
    if (turned !== props[k]) out = { ...out, [k]: turned }
  }
  const hover = props.hover
  if (hover && typeof hover === 'object') out = { ...out, hover: lightProps(hover as Record<string, unknown>) }
  return out
}
const lightWrapped = new WeakMap<object, Component>()
const lit = (Part: unknown): unknown => {
  if (typeof Part !== 'function') return Part
  let wrap = lightWrapped.get(Part as object)
  if (!wrap) {
    const inner = Part as unknown as Component
    wrap = props => inner(props && typeof props === 'object' ? lightProps(props) : props)
    lightWrapped.set(Part as object, wrap)
  }
  return wrap
}

/** `$.ui.resolve` parts with Svg themed and, in a light app, Box, Text and Button turned light. */
export function themedEls<T extends object>(els: T): T {
  const out: Record<string, unknown> = { ...els }
  if ('Svg' in els) out.Svg = themedSvg((els as { Svg: unknown }).Svg)
  if (light) for (const part of ['Box', 'Text', 'Button']) if (part in els) out[part] = lit((els as Record<string, unknown>)[part])
  return out as T
}
