// The crew row: when the cgp-crew plugin runs a crew, its bar is drawn here, above the dashboard, so the person sees
// one band instead of two. cgp-crew hands over a ready-to-draw feed (types/index.d.ts, CrewFeed); this file only
// draws it. Presses go back to cgp-crew as a request it reads every second.

import type { CrewFeed } from '../../types'
import { isLight } from '../core/theme'

/** The feed format this build draws. cgp-crew draws its own bar for any other. */
export const CREW_FEED_VERSION = 1

export type CrewDraw = {
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

const GOLD = '#ffab19'
const TROUBLE = '#d9534f'
const OK = '#3b9c5f'

const look = () =>
  isLight()
    ? { bg: '#fdf6e7', edge: '#ecd29c', track: '#e6e7ea', text: '#1d1f24' }
    : { bg: '#1c1608', edge: '#6b5218', track: '#30333a', text: '#eceef2' }

/** True when the feed is one this build can draw. */
export const crewFeedShows = (feed: CrewFeed | null | undefined): feed is CrewFeed =>
  !!feed && feed.v === CREW_FEED_VERSION && Array.isArray(feed.segments)

/** The task track as one SVG: a rounded segment per task, filled by its state; too many tasks become one bar. */
export function crewTrackSvg(feed: CrewFeed, width: number, height = 8): string {
  const l = look()
  const r = height / 2
  const n = feed.segments.length
  let body: string
  if (n === 0 || width / n < 5) {
    const filled = Math.round(width * Math.max(0, Math.min(1, feed.share)))
    body = `<rect x="0" y="0" width="${width}" height="${height}" rx="${r}" fill="${l.track}"/>${filled > 0 ? `<rect x="0" y="0" width="${filled}" height="${height}" rx="${r}" fill="${GOLD}"/>` : ''}`
  } else {
    const gap = width / n > 14 ? 3 : 1.5
    const w = (width - gap * (n - 1)) / n
    body = feed.segments
      .map((s, i) => {
        const x = (i * (w + gap)).toFixed(2)
        const paint =
          s.state === 'accepted'
            ? `fill="${s.color}"`
            : s.state === 'delivered'
              ? `fill="${s.color}" fill-opacity="0.5"`
              : s.state === 'active'
                ? `fill="${s.color}" class="pulse"`
                : s.state === 'trouble'
                  ? `fill="${TROUBLE}"`
                  : `fill="${l.track}"`
        return `<rect x="${x}" y="0" width="${w.toFixed(2)}" height="${height}" rx="${Math.min(r, w / 2).toFixed(2)}" ${paint}/>`
      })
      .join('')
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    '<style>.pulse{animation:p 1s ease-in-out infinite}@keyframes p{50%{opacity:.45}}@media (prefers-reduced-motion: reduce){.pulse{animation:none}}</style>' +
    body +
    '</svg>'
  )
}

const GLYPH: Record<CrewFeed['segments'][number]['state'], string> = { accepted: '━', delivered: '━', active: '╍', trouble: '━', waiting: '─' }

export function crewRow(feed: CrewFeed, d: CrewDraw) {
  const { Box, Text, Button } = d
  const l = look()
  const head = (
    <Box key="crew-head" flexDirection="row" gap={1} alignItems="center">
      <Box key="crew-name" flexShrink={0}>
        <Text color={GOLD} bold>
          ✦ CGP Crew
        </Text>
      </Box>
      <Box key="crew-words" flexShrink={1} minWidth={0} flexDirection="row" gap={1}>
        <Text bold wrap="truncate">
          {feed.title}
        </Text>
        <Text color={feed.isFinished ? OK : undefined} dimColor={!feed.isFinished} wrap="truncate">
          {feed.status}
        </Text>
      </Box>
      <Box flexGrow={1} />
      <Button key="crew-panel" plain label={`Crew ${feed.crew}`} onPress={d.onPanel} />
      <Button key="crew-close" plain role="dismiss" label="✕" onPress={d.onHide} />
    </Box>
  )
  const trackW = Math.max(120, Math.min(1500, (d.columns || 100) * 8 - 40))
  const track = d.Svg ? (
    <Box key="crew-track" flexDirection="row">
      <d.Svg source={crewTrackSvg(feed, trackW)} alt={`${feed.title}: ${feed.status}`} width={trackW} height={8} />
    </Box>
  ) : (
    <Box key="crew-track" width="100%" height={1} flexDirection="row" gap={feed.segments.length <= 12 ? 1 : 0}>
      {feed.segments.length > 0 && feed.segments.length <= 24 ? (
        feed.segments.map((s, i) => (
          <Box key={`crew-seg-${i}`} flexGrow={1} flexShrink={1} minWidth={0} height={1} overflow="hidden">
            <Text color={s.state === 'waiting' ? undefined : s.state === 'trouble' ? TROUBLE : s.color} dimColor={s.state === 'waiting' || s.state === 'delivered'}>
              {GLYPH[s.state].repeat(160)}
            </Text>
          </Box>
        ))
      ) : (
        <Box key="crew-seg-all" width={`${Math.round(feed.share * 100)}%`} height={1} overflow="hidden">
          <Text color={GOLD}>{'━'.repeat(320)}</Text>
        </Box>
      )}
    </Box>
  )
  return (
    <Box key="crew-row" flexDirection="column" paddingX={1} overflow="hidden" backgroundColor={l.bg} borderStyle="round" borderColor={l.edge}>
      {head}
      {track}
    </Box>
  )
}
