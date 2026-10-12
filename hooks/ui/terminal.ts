// The terminal band's shape and the dashboard's text lines.
import type { ArtKind } from './pixel-art'
import type { Effort } from '../../types'
import { cacheLabel } from '../chat/cache'
import { EFFORT_LABELS } from '../core/models'
import { tokens } from '../effort/spend'

export type TerminalBand = { key: string; kind: ArtKind; color: string; bg: string; edge: string; title: string; detail: string; buttons: unknown[]; autoInBar?: boolean; word?: { text: string; color: string; rest: string } }
/** The dashboard's two lines: the effort with the cache and the context, then the judge's reason and the last reply. */
export function dashboardLines(d: {
  auto: boolean
  paused: boolean
  judging: boolean
  effort: Effort | undefined
  cacheNow: number | null
  contextPercent: number | null
  reason: string
  last: { cost: number; ms: number } | null
}): { head: string; what: string; rest: string; detail: string } {
  const level = d.effort ? EFFORT_LABELS[d.effort] : 'Auto'
  // Auto on or off is the button's to say (and the terminal's effort row's), not the text's.
  const what = d.judging ? 'Deciding…' : !d.auto ? 'Off' : d.paused ? `${level} · Auto paused` : level
  const head = [
    `✦ ${what}`,
    d.cacheNow === null ? null : `cache ${cacheLabel(d.cacheNow)}`,
    d.contextPercent === null ? null : `${Math.round(d.contextPercent)}% context`,
  ]
  const last = d.last ? `last reply ≈${tokens(Math.round(d.last.cost))} tokens · ${Math.max(1, Math.round(d.last.ms / 1000))}s` : null
  const shown = head.filter(Boolean) as string[]
  return {
    head: shown.join(' · '),
    what,
    rest: shown.slice(1).map(part => ` · ${part}`).join(''),
    detail: [d.reason, last].filter(Boolean).join(' · '),
  }
}

/**
 * Columns a row of terminal buttons takes: a filled button draws `[ label ]`, a plain one its label alone, with one
 * column between buttons. Anything that is not a labelled Button (a wrapper Box) counts as a generous 12.
 */
export function buttonsWidth(buttons: readonly unknown[]): number {
  const widths = buttons.map(b => {
    const props = (b as { type?: unknown; props?: { label?: unknown; plain?: unknown } } | null)?.props
    if (!props || typeof props.label !== 'string') return 12
    return [...props.label].length + (props.plain ? 0 : 4)
  })
  return widths.reduce((sum, w) => sum + w, 0) + Math.max(0, widths.length - 1)
}

/**
 * True when the band's title and its buttons fit on one row of `columns`: the round border and padding take 4, the
 * title and the buttons keep at least two columns apart, and art on the right takes its width and a gap.
 */
export function bandFitsOneRow(columns: number, title: string, buttons: readonly unknown[], artColumns = 0): boolean {
  if (!columns) return true
  const art = artColumns > 0 ? artColumns + 1 : 0
  return 4 + [...title].length + 2 + buttonsWidth(buttons) + art <= columns
}
