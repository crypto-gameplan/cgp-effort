// Thresholds and visibility rules for the swamped-context and running-hot (usage limit) bands.

// The context size /cgp-effort swamp pretends to have when it shows the band as a test.
export const SWAMP_TOKENS = 150_000
// Once closed, the swamp band returns only after the context has grown this much more.
export const SWAMP_REGROW = 50_000
export const HOT_PERCENT = 80
export const HOT_FINAL = 95
/** Recorded when the running-hot band is closed: its window key (hotWindow) and how full it was. */
export type HotClosed = { window: string; percent: number }
export const hotWindow = (heat: { kind: string; resetsAt: string | null }) =>
  // To the quarter hour: the reset time the app reports can shift by seconds between checks.
  `${heat.kind} ${heat.resetsAt ? Math.round(new Date(heat.resetsAt).getTime() / 900_000) : ''}`
/** Whether the running-hot band shows: always until closed; closed, not again in that window unless it passes HOT_FINAL. */
export function hotVisible(heat: { kind: string; percent: number; resetsAt: string | null }, closed: HotClosed | null): boolean {
  if (!closed || closed.window !== hotWindow(heat)) return true
  return heat.percent >= HOT_FINAL && closed.percent < HOT_FINAL
}
/** "14:20" for a reset within 20 hours, "Mon 14:20" further out. */
export function resetLabel(iso: string | null, now: number): string {
  if (!iso) return ''
  const at = new Date(iso)
  const hm = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
  return at.getTime() - now < 20 * 3600_000 ? hm : `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][at.getDay()]} ${hm}`
}

/** The share against the compaction window when it is smaller than the model's: a chat that compacts at 350k on a 1M
 * model reads 100% there, not 35%. Rounded to a whole number, as the app's own share is. */
export function contextAgainst<T extends { tokens?: number; window: number; percent?: number }>(context: T, compactAt: number | undefined): T {
  if (!compactAt || !context.window || compactAt >= context.window) return context
  const percent = context.tokens === undefined ? context.percent : Math.min(100, Math.round((context.tokens / compactAt) * 100))
  return { ...context, window: compactAt, percent }
}
