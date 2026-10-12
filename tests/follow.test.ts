import { describe, expect, test } from 'claude-code/testing'
import type { FollowFeed } from '../types'
import { FOLLOW_FEED_VERSION, followChipsSvg, followCounts, followFeedShows } from '../hooks/ui/follow'

const feed = (chips: FollowFeed['chips'], extra: Partial<FollowFeed> = {}): FollowFeed => ({
  v: FOLLOW_FEED_VERSION,
  open: chips.filter(c => c.category !== 'done').length,
  doing: chips.filter(c => c.category === 'doing').length,
  done: chips.filter(c => c.category === 'done').length,
  next: null,
  chips,
  isSyncing: false,
  ...extra,
})

describe('follow-up row', () => {
  test('draws only a feed format it knows', () => {
    expect(followFeedShows(null)).toBe(false)
    expect(followFeedShows({ ...feed([]), v: FOLLOW_FEED_VERSION + 1 })).toBe(false)
    expect(followFeedShows(feed([]))).toBe(true)
  })

  test('counts read in progress, to do, done, and "all done" at the end', () => {
    expect(followCounts(feed([{ key: 'A-1', category: 'doing' }, { key: 'A-2', category: 'todo' }, { key: 'A-3', category: 'done' }]))).toBe('1 in progress · 1 to do · 1 done')
    expect(followCounts(feed([{ key: 'A-3', category: 'done' }]))).toBe('all 1 done')
  })

  test('one chip per issue, escaped, and the rest as +n when the width runs out', () => {
    const svg = followChipsSvg(feed([{ key: 'CGP-1<', category: 'doing' }, { key: 'CGP-2', category: 'done' }], { isSyncing: true }), 400)
    expect(svg).toContain('CGP-1&lt;')
    expect(svg).toContain('class="pulse"')
    const many = Array.from({ length: 30 }, (_, i) => ({ key: `CGP-${100 + i}`, category: 'todo' as const }))
    expect(followChipsSvg(feed(many), 200)).toMatch(/\+\d+/)
  })
})
