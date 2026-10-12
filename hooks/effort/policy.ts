// Effort policy: the slider, limits, save mode and redo detection.
import type { Effort } from '../../types'
import { EFFORTS } from '../core/models'

let lastFooter = ''
// A reply saying the last answer was wrong. After a prompt ran on a cheaper model, the retry and the next few prompts
// stay on the chat's own model.
const REDO_RE = /^(no|nope|nah)(?![a-z'])(?! +(problem|worries|thanks|thank|need|rush|hurry))|^(that'?s |this is |it'?s )?(wrong|incorrect|not (right|correct|what i))|^(it |that |this )?(still )?(doesn'?t|didn'?t|isn'?t|does not|did not|is not) (work|fix|help|change|run|compile|pass)|^still (not|broken|wrong|failing|fails|the same|happening|doesn'?t)|^(not working|try again|do it again|redo|you missed|you forgot|you broke)|^(fel|inte rätt|funkar inte|fungerar inte|försök igen|gör om|det är fel)(?![a-zåäö])|(still (broken|wrong|failing)|try again|funkar fortfarande inte)/i
export const REDO_STAY_PROMPTS = 4
export function looksLikeRedo(text: string): boolean {
  return REDO_RE.test(text.trim().replace(/^["'“ ]+/, ''))
}
/** The slider moves only unsure verdicts, one step; its outer stops count more verdicts as unsure. */
export function tipped(effort: Effort, sure: number | undefined, bias: number): Effort {
  if (!bias || sure === undefined || sure >= (Math.abs(bias) === 1 ? 0.65 : 0.85)) return effort
  const i = Math.max(0, Math.min(EFFORTS.length - 1, EFFORTS.indexOf(effort) + Math.sign(bias)))
  return EFFORTS[i]
}
export function bounded(effort: Effort, floor: Effort, ceiling: Effort): Effort {
  const lo = EFFORTS.indexOf(floor)
  const hi = Math.max(lo, EFFORTS.indexOf(ceiling))
  return EFFORTS[Math.max(lo, Math.min(hi, EFFORTS.indexOf(effort)))]
}
export function capped(effort: Effort, saving: boolean): Effort {
  return saving && EFFORTS.indexOf(effort) > EFFORTS.indexOf('medium') ? 'medium' : effort
}
