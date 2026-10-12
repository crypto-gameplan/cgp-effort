// The follow-up row: while the cgp-follow-ups plugin tracks issues, its bar is drawn here, above the dashboard and
// in the same look as the crew row, so the person sees one band. cgp-follow-ups hands over a ready-to-draw feed
// (types/index.d.ts, FollowFeed); this file only draws it. Presses go back as a request it reads every second.

import type { FollowFeed } from '../../types'
import { isLight } from '../core/theme'

/** The feed format this build draws. cgp-follow-ups draws its own bar for any other. */
export const FOLLOW_FEED_VERSION = 1

export type FollowDraw = {
  // From $.ui.resolve(e).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Box: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Text: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: any
  // Desktop only: the terminal lists the element but does not paint it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Svg?: any
  columns: number
  onPanel: () => unknown
  onHide: () => unknown
}

type Category = FollowFeed['chips'][number]['category']

const GOLD = '#ffab19'

const look = () =>
  isLight()
    ? { bg: '#fdf6e7', edge: '#ecd29c', text: '#1d1f24', muted: '#6e737c', todo: '#5b8fc7', done: '#3b9c5f', unknown: '#8d929a', tick: '#ffffff' }
    : { bg: '#1c1608', edge: '#6b5218', text: '#eceef2', muted: '#a0a5ad', todo: '#7cc4ff', done: '#7fe0a4', unknown: '#6e737c', tick: '#0f1c15' }

const colorOf = (c: Category): string => {
  const l = look()
  return c === 'doing' ? GOLD : c === 'done' ? l.done : c === 'todo' ? l.todo : l.unknown
}

/** True when the feed is one this build can draw. */
export const followFeedShows = (feed: FollowFeed | null | undefined): feed is FollowFeed =>
  !!feed && feed.v === FOLLOW_FEED_VERSION && Array.isArray(feed.chips)

const esc = (s: string): string => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch)
const textW = (s: string, size: number) => [...s].reduce((w, ch) => w + (/[ .,:;'!|il1()[\]{}ftj-]/.test(ch) ? 0.3 : /[A-Z@%MWmw]/.test(ch) ? 0.74 : 0.56) * size, 0)

/** The status dot cgp-follow-ups draws: ring for to do, half for in progress, tick for done, dotted while unchecked. */
function dotSvg(cx: number, cy: number, r: number, c: Category, pulse: boolean): string {
  const color = colorOf(c)
  const sw = 1.6
  const anim = pulse ? ' class="pulse"' : ''
  if (c === 'done') {
    const t = r * 0.5
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/><path d="M${cx - t} ${cy}l${t * 0.7} ${t * 0.7}l${t * 1.3} ${-t * 1.4}" fill="none" stroke="${look().tick}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  }
  const ring = `<circle${anim} cx="${cx}" cy="${cy}" r="${r - sw / 2}" fill="none" stroke="${color}" stroke-width="${sw}"${c === 'unknown' ? ' stroke-dasharray="1.8 1.8"' : ''}/>`
  if (c !== 'doing') return ring
  const ir = r - sw * 1.6
  return `${ring}<path d="M${cx} ${cy - ir}A${ir} ${ir} 0 0 1 ${cx} ${cy + ir}Z" fill="${color}"/>`
}

/** One line of chips: a status dot and the key per issue, as many as fit; the rest become `+n`. */
export function followChipsSvg(feed: FollowFeed, width: number, height = 16): string {
  const l = look()
  let x = 0
  const out: string[] = []
  for (let i = 0; i < feed.chips.length; i++) {
    const c = feed.chips[i]
    if (!c) continue
    const w = 14 + textW(c.key, 12)
    if (x + w > width - (i < feed.chips.length - 1 ? 30 : 0)) {
      out.push(`<text x="${x}" y="${height / 2 + 4}" font-size="12" fill="${l.muted}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">+${feed.chips.length - i}</text>`)
      break
    }
    out.push(
      dotSvg(x + 5, height / 2, 5, c.category, feed.isSyncing && c.category !== 'done'),
      `<text x="${x + 14}" y="${height / 2 + 4}" font-size="12" fill="${c.category === 'done' ? l.muted : l.text}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-variant-numeric="tabular-nums">${esc(c.key)}</text>`,
    )
    x += w + 14
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    '<style>.pulse{animation:p 1.2s ease-in-out infinite}@keyframes p{50%{opacity:.45}}@media (prefers-reduced-motion: reduce){.pulse{animation:none}}</style>' +
    out.join('') +
    '</svg>'
  )
}

/** `1 in progress · 2 to do · 3 done`, or `all 3 done`. */
export function followCounts(feed: FollowFeed): string {
  if (feed.open === 0) return `all ${feed.done} done`
  const todo = feed.open - feed.doing
  return [feed.doing ? `${feed.doing} in progress` : '', todo ? `${todo} to do` : '', feed.done ? `${feed.done} done` : ''].filter(Boolean).join(' · ')
}

const GLYPH: Record<Category, string> = { todo: '○', doing: '◐', done: '●', unknown: '◌' }

export function followRow(feed: FollowFeed, d: FollowDraw) {
  const { Box, Text, Button } = d
  const l = look()
  const allDone = feed.open === 0
  const counts = followCounts(feed)
  const cols = d.columns || 100
  const chipsW = Math.max(80, Math.min(1200, cols * 8 - 420))
  let room = Math.max(8, cols - counts.length - 40)
  const termChips = []
  for (const c of feed.chips) {
    const w = c.key.length + 3
    if (w > room) break
    room -= w
    termChips.push(
      <Text key={`fu-chip-${c.key}`} color={colorOf(c.category)} dimColor={c.category === 'done'}>
        {`${GLYPH[c.category]} ${c.key} `}
      </Text>,
    )
  }
  return (
    <Box key="follow-row" flexDirection="row" gap={1} alignItems="center" paddingX={1} overflow="hidden" backgroundColor={l.bg} borderStyle="round" borderColor={l.edge}>
      <Box key="fu-name" flexShrink={0}>
        <Text color={GOLD} bold>
          ✦ Follow-ups
        </Text>
      </Box>
      <Box key="fu-chips" flexShrink={1} minWidth={0} flexDirection="row" overflow="hidden">
        {d.Svg ? <d.Svg source={followChipsSvg(feed, chipsW)} alt={feed.chips.map(c => `${c.key} ${c.category}`).join(', ')} width={chipsW} height={16} /> : <Text wrap="truncate">{termChips}</Text>}
      </Box>
      <Box flexGrow={1} />
      <Box key="fu-counts" flexShrink={0}>
        <Text color={allDone ? l.done : undefined} dimColor={!allDone} bold={allDone}>
          {counts}
        </Text>
      </Box>
      <Button key="fu-panel" plain label={`Follow-ups ${feed.open + feed.done}`} onPress={d.onPanel} />
      <Button key="fu-close" plain role="dismiss" label="✕" onPress={d.onHide} />
    </Box>
  )
}
