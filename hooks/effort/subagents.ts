// Subagent (helper) effort: the pending picks, the judge's question and the lowest effort a helper gets.
import type { Effort } from '../../types'
import { EFFORTS } from '../core/models'

// The judge's pick per subagent id. A subagent's first request can come before its spawn returns the id, so a pick
// waits under the spawn's description and type until a request from an unknown subagent claims it.
export const helperPicks = new Map<string, Effort>()
export function helperQuestion(prompt: string, type: string): string {
  return `${prompt.slice(0, 4000)}

[This is the task Claude gave a ${type} subagent, not a message from the person. Judge the effort that subagent needs to do it well.]`
}
/** At least medium (or the person's Min), never above their Max: a helper's answer goes back to the chat unchecked,
 * and at low it made mistakes medium did not. */
export function helperFloor(floor: Effort, ceiling: Effort): Effort {
  const i = Math.min(Math.max(EFFORTS.indexOf(floor), EFFORTS.indexOf('medium')), EFFORTS.indexOf(ceiling))
  return EFFORTS[i]
}
