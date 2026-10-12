// Cheaper-model routing and per-model cache warmth.
import type { ModelKey } from '../../types'
import { CACHE_TTL, cacheTtlOf } from '../chat/cache'
import { keyOf, WEIGHT } from '../core/models'

const MODEL_RANK: ModelKey[] = ['haiku', 'sonnet', 'opus', 'fable']
export function routeTo(verdict: ModelKey, inUse: ModelKey): ModelKey | null {
  if (verdict === 'fable') return null
  return MODEL_RANK.indexOf(verdict) < MODEL_RANK.indexOf(inUse) ? verdict : null
}
// Input price relative to Sonnet (Opus measured at 1.97x). Only needs to tell which side of a switch is cheaper.
export const MODEL_PRICE: Record<ModelKey, number> = { haiku: 1 / 3, sonnet: 1, opus: 2, fable: 5 }
/** Whether moving this prompt pays: a model with a cold cache must first write the whole context, which can cost more
 * than staying on the chat's warm one. */
export function routeWorth(to: ModelKey, inUse: ModelKey, contextTokens: number, warm: { to: boolean; inUse: boolean }): boolean {
  if (!(contextTokens > 0)) return true
  // Claude Code writes the 1-hour cache, which costs twice the input price (measured), not the 5-minute 1.25.
  const write = 2
  const stay = contextTokens * MODEL_PRICE[inUse] * (warm.inUse ? WEIGHT.read : write)
  const move = contextTokens * MODEL_PRICE[to] * (warm.to ? WEIGHT.read : write)
  return move < stay
}
const warmUntil: Partial<Record<ModelKey, number>> = {}
// `now` must come from the same clock the cache countdown runs on.
export function markWarm(modelId: string, usage: unknown, now: number) {
  const key = keyOf(modelId)
  if (key) warmUntil[key] = now + CACHE_TTL[cacheTtlOf(usage) ?? '5m']
}
export const isWarm = (key: ModelKey, now: number) => (warmUntil[key] ?? 0) > now
