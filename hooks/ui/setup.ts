// The first-run setup guide.
import type { SettingsDraft } from '../../types'
import type { Hideable, JudgeConfig } from '../core/config'

export type SetupStep = 'pick' | 'jev' | 'lean' | 'handoff' | 'look' | 'done'
export const LEAN_STOPS = [
  ['Cheapest', 'more picks go lower'],
  ['Cheaper', 'unsure picks go lower'],
  ['Balanced', 'the judge decides'],
  ['Smarter', 'unsure picks go higher'],
  ['Smartest', 'more picks go higher'],
] as const
export function setupNext(step: SetupStep): SetupStep | null {
  if (step === 'pick' || step === 'jev') return 'lean'
  if (step === 'lean') return 'handoff'
  if (step === 'handoff') return 'look'
  if (step === 'look') return 'done'
  return null
}
export function setupBack(step: SetupStep): SetupStep | null {
  if (step === 'jev' || step === 'lean') return 'pick'
  if (step === 'handoff') return 'lean'
  if (step === 'look') return 'handoff'
  if (step === 'done') return 'look'
  return null
}
export function setupCounter(step: SetupStep): string {
  const n = { pick: 1, jev: 1, lean: 2, handoff: 3, look: 4, done: 0 }[step]
  return n ? `${n}/4` : ''
}
/** The guide's unsaved choices laid over the saved settings. */
export function setupShown(draft: SettingsDraft, saved: JudgeConfig) {
  return {
    judge: (draft.judge ?? saved.judge) as JudgeConfig['judge'],
    bias: draft.bias !== undefined ? Number(draft.bias) : saved.bias,
    handoffSkill: draft.handoffSkill ?? saved.handoffSkill,
    hide: (draft.hide ?? saved.hide.join(',')).split(',').filter(Boolean) as Hideable[],
    appearance: (draft.appearance ?? saved.appearance) as JudgeConfig['appearance'],
  }
}
