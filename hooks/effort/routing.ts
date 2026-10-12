// Cheaper-model routing: what a turn costs on each model, whether moving it pays, and per-model cache warmth.
import type { Effort, ModelKey } from '../../types'
import { CACHE_TTL, cacheTtlOf } from '../chat/cache'
import { keyOf } from '../core/models'

const MODEL_RANK: ModelKey[] = ['haiku', 'sonnet', 'opus', 'fable']
export function routeTo(verdict: ModelKey, inUse: ModelKey): ModelKey | null {
  if (verdict === 'fable') return null
  return MODEL_RANK.indexOf(verdict) < MODEL_RANK.indexOf(inUse) ? verdict : null
}

/** USD per million tokens. Claude Code writes the 1-hour cache, which costs twice the input price. */
type Rate = { input: number; output: number; read: number }
// Claude API price list as of 2026-10 (Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5). Update with the list.
export const RATES: Record<ModelKey, Rate> = {
  haiku: { input: 0.1, output: 0.5, read: 0.01 },
  sonnet: { input: 2, output: 10, read: 0.2 },
  opus: { input: 4, output: 20, read: 0.2 },
  fable: { input: 10, output: 50, read: 0.25 },
}
// Haiku 5.5 charges more for a prompt over 100K tokens: $0.50 in, $2.50 out (its cache read scales the same way).
const HAIKU_LONG: Rate = { input: 0.5, output: 2.5, read: 0.05 }
const HAIKU_LONG_FROM = 100_000
const WRITE_1H = 2

export const rateOf = (model: ModelKey, contextTokens: number): Rate =>
  model === 'haiku' && contextTokens > HAIKU_LONG_FROM ? HAIKU_LONG : RATES[model]

/** What one turn usually takes in this chat: its main-loop requests and the tokens they write out. */
export type TurnShape = { requests: number; out: number }
export const DEFAULT_TURN: TurnShape = { requests: 3, out: 4000 }

/**
 * USD a turn costs on `model`: the first request reads the chat from cache, or writes all of it when the cache is
 * cold; each further request of the turn (a tool round) reads it; and the turn's output.
 */
export function turnCost(model: ModelKey, contextTokens: number, warm: boolean, turn: TurnShape = DEFAULT_TURN): number {
  const r = rateOf(model, contextTokens)
  const first = contextTokens * (warm ? r.read : r.input * WRITE_1H)
  const rest = Math.max(0, turn.requests - 1) * contextTokens * r.read
  return (first + rest + turn.out * r.output) / 1e6
}

/** A move has to beat staying by this share: the estimate is rough, and the chat's model answers best. */
export const ROUTE_MARGIN = 0.1

/**
 * What moving this turn saves (USD, an estimate), or null when it does not pay by the margin. With no context size
 * known it routes, saving an unknown 0.
 */
export function routeSaving(
  to: ModelKey,
  inUse: ModelKey,
  contextTokens: number,
  warm: { to: boolean; inUse: boolean },
  turn: TurnShape = DEFAULT_TURN,
): number | null {
  if (!(contextTokens > 0)) return 0
  const stay = turnCost(inUse, contextTokens, warm.inUse, turn)
  const move = turnCost(to, contextTokens, warm.to, turn)
  return move < stay * (1 - ROUTE_MARGIN) ? stay - move : null
}

export const routeWorth = (
  to: ModelKey,
  inUse: ModelKey,
  contextTokens: number,
  warm: { to: boolean; inUse: boolean },
  turn: TurnShape = DEFAULT_TURN,
): boolean => routeSaving(to, inUse, contextTokens, warm, turn) !== null

/** Only prompts the judge rates easy, and is sure enough of, may leave the chat's model. */
export const ROUTE_EFFORTS: readonly Effort[] = ['low', 'medium']
export const ROUTE_MIN_SURE = 0.6
export const routeAllowed = (effort: Effort, sure: number | undefined): boolean =>
  ROUTE_EFFORTS.includes(effort) && (sure === undefined || sure >= ROUTE_MIN_SURE)

/** The chat's typical turn from its recent ones: the median of each, so one long task does not skew it. */
export function typicalTurn(recent: readonly TurnShape[]): TurnShape {
  if (recent.length < 3) return DEFAULT_TURN
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
  }
  return { requests: Math.max(1, median(recent.map(t => t.requests))), out: median(recent.map(t => t.out)) }
}

const warmUntil: Partial<Record<ModelKey, number>> = {}
// `now` must come from the same clock the cache countdown runs on.
export function markWarm(modelId: string, usage: unknown, now: number) {
  const key = keyOf(modelId)
  if (key) warmUntil[key] = now + CACHE_TTL[cacheTtlOf(usage) ?? '5m']
}
export const isWarm = (key: ModelKey, now: number) => (warmUntil[key] ?? 0) > now
