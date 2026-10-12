// The settings panel's cards, choices, labels and icons.

export type SettingsCard = 'effort' | 'model' | 'judge' | 'handoff' | 'show'
export const CARDS: readonly { id: SettingsCard; title: string; about: string }[] = [
  { id: 'effort', title: 'Effort', about: 'How hard Claude thinks. The slider tips close calls; Min and Max are hard limits.' },
  { id: 'model', title: 'Model', about: "Whether a simple prompt may run on a cheaper model, and which model writes a compaction." },
  { id: 'handoff', title: 'Handoff & alerts', about: 'The full handoff skill, when to suggest compacting, and which alerts show.' },
  { id: 'show', title: 'Customize', about: 'How CGP Effort looks and which parts it shows. Uninstall removes it.' },
  { id: 'judge', title: 'Judge', about: 'Haiku judges prompts and handoffs. Add Jev for quicker effort calls. Test checks it answers.' },
]
export const MODEL_CHOICES = [
  { value: 'on', label: 'Cheaper when it can', tag: 'experimental', about: "A simple prompt may run on Haiku or Sonnet. Rarely pays: the other model has to reread the whole chat." },
  { value: 'off', label: "Always the chat's", tag: '', about: "Every prompt keeps the model you picked. Only effort changes." },
] as const
export const BIAS_WORDS = ['Cheapest', 'Cheaper', 'Balanced', 'Smarter', 'Smartest'] as const
// Text glyphs, since an Svg does not draw beside the settings rows' titles.
export const ICON_EFFORT = '◔'
export const ICON_JUDGE = '⚖︎'
export const ICON_HANDOFF = '⇥'
export const ICON_SHOW = '◉'
export const SAVED_CARD_MS = 2500
export const CONFIGURE_COMMAND = '/plugin configure cgp-effort@crypto-gameplan'
