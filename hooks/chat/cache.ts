// Prompt cache lifetime, its countdown in the footer and dashboard, and turn/redraw timing.
import { ICE, RED, YELLOW } from '../core/palette'

// Lifetime after the last read or write. Until a response names one (usage.cache_creation), 1h is assumed:
// 99% of 292k cache writes in real Claude Code use were 1h.
export const CACHE_TTL = { '5m': 5 * 60_000, '1h': 60 * 60_000 } as const
export const CACHE_TICK_MS = 15_000
const CACHE_YELLOW_MIN = 20
const CACHE_RED_MIN = 5
export function cacheTtlOf(usage: unknown): keyof typeof CACHE_TTL | undefined {
  const c = (usage as { cache_creation?: { ephemeral_1h_input_tokens?: number; ephemeral_5m_input_tokens?: number } } | null)
    ?.cache_creation
  if ((c?.ephemeral_1h_input_tokens ?? 0) > 0) return '1h'
  if ((c?.ephemeral_5m_input_tokens ?? 0) > 0) return '5m'
  return undefined
}
export function mostlyCached(usage: unknown): boolean {
  const u = (usage ?? {}) as { input_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number }
  const read_ = u.cache_read_input_tokens ?? 0
  const all = read_ + (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)
  return all > 0 && read_ / all > 0.5
}
/** Below this a cold cache costs too little to warn about: the next message rereads the chat at full price once. */
export const COLD_MIN_TOKENS = 150_000
/** Colour for whole minutes left, rounded up: undefined (grey), yellow, red, or ICE once cold. */
export function cacheColor(minutesLeft: number): string | undefined {
  const shown = minutesLeft - 1
  if (minutesLeft <= 0) return ICE
  if (shown > CACHE_YELLOW_MIN) return undefined
  return shown <= CACHE_RED_MIN ? RED : YELLOW
}
export function cacheLabel(minutesLeft: number): string {
  if (minutesLeft <= 0) return '❄ Cold'
  if (minutesLeft === 1) return '<1m'
  return `${minutesLeft - 1}m`
}
export function cacheClock(msLeft: number): string {
  if (msLeft <= 0) return '❄ Cold'
  const s = Math.ceil(msLeft / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
// Seconds of frames per image: the band is redrawn once a minute, plus slack.
const CLOCK_FRAMES = 75
/** A countdown image that ticks by itself (one CSS-animated frame per second), so the band is redrawn only once a
 * minute: each redraw restarts every image's animation in it. */
export function cacheClockSvg(msLeft: number, color: string): string {
  const start = Math.max(0, Math.ceil(msLeft / 1000))
  const frames: string[] = []
  for (let j = 0; j < CLOCK_FRAMES && start - j > 0; j++) {
    const left = start - j
    const label = `cache ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
    frames.push(`<text x="0" y="12.5" style="animation-delay:${j}s">${label}</text>`)
  }
  frames.push(`<text x="0" y="12.5" style="animation-delay:${frames.length}s;animation-duration:100000s">❄ Cold</text>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="17" viewBox="0 0 84 17"><style>text{font-size:13px;fill:${color};opacity:0;animation:f 1s step-end 1}@keyframes f{0%{opacity:1}100%{opacity:0}}</style>${frames.join('')}</svg>`
}
export const TURN_STALE_MS = 10 * 60_000
// A draw this soon after the ask may come before the app has the band up, so it does not count.
export const REDRAW_SETTLE_MS = 500

/** How long after the person's last message the cache may be kept warm, by setting. */
export const KEEP_WARM_MS = { off: 0, '1h': 3_600_000, '2h': 7_200_000, '3h': 10_800_000 } as const
export type KeepWarm = keyof typeof KEEP_WARM_MS
// A warm-up goes out this long before the cache would go cold: more than one 15 s tick, so one tick always catches it.
const WARM_LEAD_MS = { '5m': 45_000, '1h': 90_000 } as const
/**
 * Whether to warm the cache now. A warm-up reads the whole chat from cache (about a tenth of its price) where a cold
 * cache rewrites it (about 1.25 times): worth it on big chats for a few hours, never once the cache is already cold.
 */
export function warmDue(s: { now: number; expires: number; ttl: '5m' | '1h'; lastPrompt: number | undefined; lastWarm: number; keep: KeepWarm; busy: boolean; tokens: number | null }): boolean {
  const limit = KEEP_WARM_MS[s.keep]
  if (!limit || s.busy || s.tokens === null || s.lastPrompt === undefined) return false
  if (s.expires <= 0 || s.now >= s.expires) return false
  if (s.expires - s.now > WARM_LEAD_MS[s.ttl]) return false
  if (s.now - s.lastWarm < WARM_LEAD_MS[s.ttl]) return false
  return s.now - s.lastPrompt < limit
}
