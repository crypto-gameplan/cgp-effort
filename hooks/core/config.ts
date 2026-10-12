// Plugin settings: their shape, defaults and the option names they are stored under.
import type { KeepWarm } from '../chat/cache'
import type { Effort, HandoffAfter } from '../../types'
import { EFFORTS } from './models'

export type JudgeConfig = {
  /** off: Auto effort is switched off for good; the band, cache timer, handoff and alerts keep working. */
  autoEffort: 'on' | 'off'
  judge: 'auto' | 'haiku' | 'jev'
  typesafeKey: string
  /** A skill or slash command that writes the handoff instead of the built-in prompt. */
  handoffSkill: string
  /** The handoff bar's first choice; after that it opens on the one made last. */
  handoffAfter: HandoffAfter
  /** -2 (cheaper) to 2 (smarter): tips the judge's close calls that way. */
  bias: number
  floor: Effort
  ceiling: Effort
  hide: Hideable[]
  /** Percent of the context window at which the swamp band shows. */
  swampAt: number
  /** default: the dashboard band above the prompt; minimal: the footer's small buttons and no band. */
  layout: 'default' | 'minimal'
  /** session: the chat's own model writes the summary. */
  compactWith: 'haiku' | 'session'
  /** advised: the footer slot is Compact until Haiku advises a handoff. always: it is always the Handoff button. */
  handoffButton: 'advised' | 'always'
  /** Keep the prompt cache warm on big chats for this long after the person's last message. */
  keepWarm: KeepWarm
  /** on: a prompt the judge calls simple runs on a cheaper model than the chat's, never a dearer one. */
  modelAuto: 'on' | 'off'
  /** on: the judge picks an effort for every subagent before it starts. */
  helpers: 'on' | 'off'
  /** auto follows Claude Code's own theme. */
  appearance: 'auto' | 'dark' | 'light'
}
export const SWAMP_STEPS = [10, 20, 30, 40, 50, 60, 70, 80] as const
/** Parts a person can switch off; the judge-down alert always shows. */
export const HIDEABLE = ['handoff', 'timer', 'reason', 'progress', 'sounds', 'swamp', 'hot', 'cold', 'motion'] as const
export type Hideable = (typeof HIDEABLE)[number]
/** The engine's options (defaults already filled in), cleaned to a JudgeConfig. */
export function readConfig(options: unknown): JudgeConfig {
  const o = (options ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const picked = str(o.judge)
  return {
    autoEffort: str(o.autoEffort) === 'off' ? 'off' : 'on',
    judge: picked === 'haiku' || picked === 'jev' ? picked : 'auto',
    typesafeKey: str(o.typesafeKey),
    handoffSkill: str(o.handoffSkill).replace(/^\//, ''),
    handoffAfter: (['confirm', 'copy'] as const).find(a => a === str(o.handoffAfter)) ?? 'continue',
    bias: Math.max(-2, Math.min(2, Math.round(Number(str(o.effortBias)) || 0))),
    floor: EFFORTS.includes(str(o.effortFloor) as Effort) ? (str(o.effortFloor) as Effort) : 'low',
    ceiling: EFFORTS.includes(str(o.effortCeiling) as Effort) ? (str(o.effortCeiling) as Effort) : 'max',
    swampAt: SWAMP_STEPS.includes(Number(str(o.swampAt)) as (typeof SWAMP_STEPS)[number]) ? Number(str(o.swampAt)) : 70,
    layout: str(o.layout) === 'minimal' ? 'minimal' : 'default',
    compactWith: str(o.compactWith) === 'session' ? 'session' : 'haiku',
    handoffButton: str(o.handoffButton) === 'always' ? 'always' : 'advised',
    keepWarm: (['1h', '2h', '3h'] as const).find(k => k === str(o.keepWarm)) ?? 'off',
    // Off by default: one prompt on another model writes the whole chat into that model's cache, which costs more
    // than it saves in a chat in use (measured).
    modelAuto: str(o.modelAuto) === 'on' ? 'on' : 'off',
    helpers: str(o.helpers) === 'on' ? 'on' : 'off',
    appearance: (['dark', 'light'] as const).find(a => a === str(o.appearance)) ?? 'auto',
    // Unset hides the judge's reason line; an empty string saved from the panel shows everything.
    hide: (o.hide === undefined ? 'reason' : str(o.hide))
      .split(',')
      .map(part => part.trim())
      .filter((part): part is Hideable => (HIDEABLE as readonly string[]).includes(part)),
  }
}
export const SETTING_FIELDS = {
  autoEffort: 'autoEffort',
  judge: 'judge',
  bias: 'effortBias',
  floor: 'effortFloor',
  ceiling: 'effortCeiling',
  handoffAfter: 'handoffAfter',
  handoffSkill: 'handoffSkill',
  hide: 'hide',
  swampAt: 'swampAt',
  layout: 'layout',
  compactWith: 'compactWith',
  handoffButton: 'handoffButton',
  keepWarm: 'keepWarm',
  modelAuto: 'modelAuto',
  helpers: 'helpers',
  appearance: 'appearance',
} as const
