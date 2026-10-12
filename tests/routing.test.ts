import { describe, expect, test } from 'claude-code/testing'
import { DEFAULT_TURN, routeAllowed, routeSaving, turnCost, typicalTurn } from '../hooks/effort/routing'
import { looksLikeRedo } from '../hooks/effort/policy'
import { asSpent, savedText } from '../hooks/effort/spend'

const near = (a: number, b: number, tolerance = 0.005) => expect(Math.abs(a - b) <= tolerance).toBe(true)
// The analysis case: a 200K chat, a simple turn of 3 requests writing 6K tokens.
const turn = { requests: 3, out: 6000 }
const ctx = 200_000

describe('turn cost on today\'s prices', () => {
  test('staying on a warm chat model', () => {
    near(turnCost('opus', ctx, true, turn), 0.24)
    near(turnCost('fable', ctx, true, turn), 0.45)
  })

  test('moving to Haiku: its long-prompt rate when cold, almost nothing when warm', () => {
    near(turnCost('haiku', ctx, false, turn), 0.235)
    near(turnCost('haiku', ctx, true, turn), 0.045)
  })

  test('a cold Sonnet has to write the whole chat first', () => {
    near(turnCost('sonnet', ctx, false, turn), 0.94)
  })
})

describe('when moving pays', () => {
  test('from Fable a cold Haiku already halves the turn', () => {
    const saved = routeSaving('haiku', 'fable', ctx, { to: false, inUse: true }, turn)
    expect(saved).not.toBe(null)
    near(saved ?? 0, 0.215)
  })

  test('from Opus a cold Haiku is a wash, so it stays; a warm one saves most of the turn', () => {
    expect(routeSaving('haiku', 'opus', ctx, { to: false, inUse: true }, turn)).toBe(null)
    near(routeSaving('haiku', 'opus', ctx, { to: true, inUse: true }, turn) ?? 0, 0.195)
  })

  test('a cold Sonnet never pays on a warm chat', () => {
    expect(routeSaving('sonnet', 'opus', ctx, { to: false, inUse: true }, turn)).toBe(null)
    expect(routeSaving('sonnet', 'fable', ctx, { to: false, inUse: true }, turn)).toBe(null)
  })

  test('no context size known: routes as before', () => {
    expect(routeSaving('haiku', 'opus', 0, { to: false, inUse: true })).toBe(0)
  })
})

describe('which prompts may move', () => {
  test('only easy calls the judge is sure of', () => {
    expect(routeAllowed('low', 0.9)).toBe(true)
    expect(routeAllowed('medium', undefined)).toBe(true)
    expect(routeAllowed('medium', 0.4)).toBe(false)
    expect(routeAllowed('high', 0.95)).toBe(false)
    expect(routeAllowed('max', undefined)).toBe(false)
  })

  test('the typical turn is the median of the recent ones, the default until there are three', () => {
    expect(typicalTurn([{ requests: 9, out: 1 }])).toEqual(DEFAULT_TURN)
    expect(typicalTurn([{ requests: 2, out: 1000 }, { requests: 40, out: 90_000 }, { requests: 4, out: 3000 }])).toEqual({ requests: 4, out: 3000 })
  })
})

describe('German corrections count as a redo', () => {
  test('a redo', () => {
    for (const yes of ['nein, das ist falsch', 'Nein.', 'falsch, die andere Datei', 'das ist nicht richtig', 'funktioniert nicht', 'geht immer noch nicht', 'klappt leider nicht', 'immer noch kaputt', 'nochmal bitte', 'versuch es nochmal', 'du hast den Test vergessen', '„das ist falsch"'])
      expect(looksLikeRedo(yes)).toBe(true)
  })

  test('not a redo', () => {
    for (const no of ['nein danke', 'nein, passt so', 'neue Funktion bitte', 'nochmalige Prüfung der Logs morgen', 'funktioniert super', 'jetzt noch einen Test dazu', 'geht das auch schneller?'])
      expect(looksLikeRedo(no)).toBe(false)
  })
})

describe('stats', () => {
  test('moved prompts show what they saved', () => {
    const text = savedText({ ...asSpent({}), prompts: 5, moved: 3, redone: 1, routeSaved: 0.62 })
    expect(text).toContain('3 prompts moved down, 1 redone (33 %), about 62 cents saved')
    expect(savedText({ ...asSpent({}), prompts: 2, moved: 2, routeSaved: 1.5 })).toContain('about $1.50 saved')
  })

  test('an older tally without the saving reads as zero', () => {
    expect(asSpent({ moved: 2 }).routeSaved).toBe(0)
  })
})
