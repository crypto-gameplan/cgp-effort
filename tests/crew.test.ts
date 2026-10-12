import { describe, expect, test } from 'claude-code/testing'
import type { CrewFeed } from '../types'
import { CREW_FEED_VERSION, crewFeedShows, crewTrackSvg } from '../hooks/ui/crew'

const feed = (segments: CrewFeed['segments'], share = 0): CrewFeed => ({
  v: CREW_FEED_VERSION,
  title: 'CSV export',
  status: 'Reviewing 1/3',
  segments,
  share,
  crew: 3,
  isWorking: true,
  isFinished: false,
})

describe('crew row', () => {
  test('draws only a feed format it knows', () => {
    expect(crewFeedShows(null)).toBe(false)
    expect(crewFeedShows({ ...feed([]), v: CREW_FEED_VERSION + 1 })).toBe(false)
    expect(crewFeedShows(feed([]))).toBe(true)
  })

  test('one segment per task, painted by state', () => {
    const svg = crewTrackSvg(
      feed([
        { title: 'a', color: '#e0703a', state: 'accepted' },
        { title: 'b', color: '#d39a1c', state: 'active' },
        { title: 'c', color: '#26a37a', state: 'trouble' },
      ]),
      300,
    )
    expect(svg.match(/<rect /g)?.length).toBe(3)
    expect(svg).toContain('fill="#e0703a"')
    expect(svg).toContain('class="pulse"')
    expect(svg).toContain('#d9534f')
  })

  test('too many tasks for the width collapse into one bar', () => {
    const many = Array.from({ length: 100 }, () => ({ title: 'x', color: '#26a37a', state: 'waiting' as const }))
    const svg = crewTrackSvg(feed(many, 0.5), 200)
    expect(svg.match(/<rect /g)?.length).toBe(2)
    expect(svg).toContain('width="100"')
  })
})
