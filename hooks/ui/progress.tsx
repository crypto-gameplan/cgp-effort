// The progress bar: a band above the prompt that follows a multi-step task.
import { atom, read, update } from 'claude-code'
import type { On } from 'claude-code'
import { tintHex } from '../core/theme'

import type { Progress, ProgressStep } from '../../types'

// The engine follows $ only into functions of the file holding the hook, so hooks register.tsx already has stay there.

export const MIN_STEPS = 3
const SEGMENTS_MAX = 12

export const looks = (phase: Progress['phase']) => {
  const l = LOOKS[phase]
  return { color: tintHex(l.color), bg: tintHex(l.bg), edge: tintHex(l.edge) }
}
export const LOOKS: Record<Progress['phase'], { color: string; bg: string; edge: string }> = {
  planning: { color: '#a79cf7', bg: '#15121f', edge: '#4a3f80' },
  working: { color: '#a79cf7', bg: '#15121f', edge: '#4a3f80' },
  paused: { color: '#7d76a8', bg: '#15121f', edge: '#3a3360' },
  asking: { color: '#e0a33a', bg: '#1c1608', edge: '#6b5218' },
  done: { color: '#6fcf8e', bg: '#0e1a12', edge: '#2f6b45' },
}
// Every segment holds the same long run of characters, clipped, so all segments get equal width.
const RUN = 160

const progressState = atom({ plugin: 'cgp-effort', key: 'progress' } as const, null)
// Set by register.tsx when the person closes the bar; read-only here.
const progressHidden = atom({ plugin: 'cgp-effort', key: 'progressHidden' } as const, null)

export type Cue = 'question' | 'done'

type Todo = { content: string; status: ProgressStep['status']; activeForm?: string }

export function stepsFromTodos(todos: readonly Todo[]): ProgressStep[] {
  return todos.map((t, i) => ({ id: `todo-${i}`, label: t.content, doing: t.activeForm || t.content, status: t.status }))
}

export function withTaskCreated(steps: readonly ProgressStep[], id: string, task: { subject: string; activeForm?: string }): ProgressStep[] {
  return [...steps.filter(s => s.id !== id), { id, label: task.subject, doing: task.activeForm || task.subject, status: 'pending' }]
}

export function withTaskUpdated(
  steps: readonly ProgressStep[],
  change: { taskId: string; status?: ProgressStep['status'] | 'deleted'; subject?: string; activeForm?: string },
): ProgressStep[] {
  if (change.status === 'deleted') return steps.filter(s => s.id !== change.taskId)
  return steps.map(s =>
    s.id !== change.taskId
      ? s
      : {
          ...s,
          ...(change.status ? { status: change.status } : {}),
          ...(change.subject ? { label: change.subject } : {}),
          ...(change.activeForm ? { doing: change.activeForm } : {}),
        },
  )
}

/** Share done, 0 to 1. */
export function progressShare(steps: readonly ProgressStep[]): number {
  if (!steps.length) return 0
  const done = steps.filter(s => s.status === 'completed').length
  const doing = steps.filter(s => s.status === 'in_progress').length
  return Math.min(1, (done + doing / 2) / steps.length)
}

export function currentStep(steps: readonly ProgressStep[]): ProgressStep | undefined {
  return steps.find(s => s.status === 'in_progress') ?? steps.find(s => s.status === 'pending')
}

export function stepNumber(steps: readonly ProgressStep[]): number {
  return Math.min(steps.length, steps.filter(s => s.status === 'completed').length + 1)
}

/** Identifies a list: closing the bar hides it until a different list comes. */
export function stepsKey(steps: readonly ProgressStep[]): string {
  return steps.map(s => s.label).join('\n')
}

export function phaseAtTurnEnd(
  p: Progress,
  turn: { reason: string; answer: string },
  endsOnQuestion: (context: string) => boolean,
): Progress['phase'] | null {
  if (p.steps.length < MIN_STEPS) return null
  if (p.steps.every(s => s.status === 'completed')) return 'done'
  if (turn.reason === 'answer' && endsOnQuestion(`assistant: ${turn.answer}`)) return 'asking'
  return 'paused'
}

export function atTurnEnd(
  p: Progress | null,
  turn: { reason: string; answer: string },
  endsOnQuestion: (context: string) => boolean,
): { next: Progress | null; cue?: Cue } {
  if (!p) return { next: null }
  const phase = phaseAtTurnEnd(p, turn, endsOnQuestion)
  if (phase === null) return { next: null }
  if (phase === p.phase) return { next: p }
  return { next: { ...p, phase }, ...(phase === 'done' ? { cue: 'done' } : phase === 'asking' ? { cue: 'question' } : {}) }
}

export function afterPrompt(p: Progress | null, prompt: { text: string; origin: { kind: string } }): Progress | null {
  const byPerson = prompt.origin.kind === 'composer' || prompt.origin.kind === 'bridge' || prompt.origin.kind === 'sdk'
  if (!p || !byPerson || prompt.text.trim().startsWith('/')) return p
  if (p.phase === 'done') return null
  return p.phase === 'asking' || p.phase === 'paused' ? { ...p, phase: 'working' } : p
}

/** `$.audio.play` is silent in a Windows terminal, so there PowerShell plays the file; null elsewhere. */
export function soundArgv(root: string, file: string): string[] | null {
  if (!/^[A-Za-z]:[\\/]/.test(root)) return null
  const path = `${root.replace(/[\\/]+$/, '')}\\${file}`.replace(/\//g, '\\').replace(/'/g, "''")
  return ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', `(New-Object Media.SoundPlayer '${path}').PlaySync()`]
}

// Sounds wait for the session timer in register.tsx: a hook's $ is refused once the hook returns,
// and a sound must not hold up the turn.
let cues: Cue[] = []

export function queueCue(hidden: readonly string[], sound: Cue | undefined) {
  if (sound && !hidden.includes('sounds') && !hidden.includes('progress')) cues.push(sound)
}

export function takeCues(): Cue[] {
  const due = cues
  cues = []
  return due
}

/** Demo bar for `/cgp-effort progress [plan|ask|done|clear]`. */
export function demoProgress(arg: string): { progress: Progress | null; cue?: Cue; text: string } {
  const demo = (completed: number, doing: boolean): ProgressStep[] =>
    [
      ['Read the code', 'Reading the code'],
      ['Write the tests', 'Writing the tests'],
      ['Build the bar', 'Building the bar'],
      ['Run the tests', 'Running the tests'],
      ['Write the handoff', 'Writing the handoff'],
    ].map(([label, running], i) => ({
      id: `demo-${i}`,
      label,
      doing: running,
      status: i < completed ? 'completed' : i === completed && doing ? 'in_progress' : 'pending',
    }))
  if (arg === 'clear') return { progress: null, text: 'The progress bar is cleared.' }
  if (arg === 'plan')
    return { progress: { phase: 'planning', steps: [] }, text: 'The progress bar is planning (a test): Claude is in plan mode and no steps exist yet.' }
  if (arg === 'ask')
    return {
      progress: { phase: 'asking', steps: demo(2, true) },
      cue: 'question',
      text: 'The progress bar is yellow: Claude is asking something (a test). /cgp-effort progress clear removes it.',
    }
  if (arg === 'done')
    return {
      progress: { phase: 'done', steps: demo(5, false) },
      cue: 'done',
      text: 'The progress bar is green: every step is done (a test). /cgp-effort progress clear removes it.',
    }
  return {
    progress: { phase: 'working', steps: demo(2, true) },
    text: 'A demo progress bar is showing, step 3 of 5 (a test). Try /cgp-effort progress plan, progress ask, progress done, progress clear.',
  }
}

export const PROGRESS_PROMPT =
  'When a request takes three or more distinct steps, write them as a task list with the task tools (TaskCreate and ' +
  'TaskUpdate, or TodoWrite) before you start, and keep the status of each step current as you go. Skip the list for quick ' +
  'answers and one-step changes.'

/** Hooks for the step list, AskUserQuestion and plan mode; `hidden` lists the parts switched off. */
export function registerProgress(on: On, hidden: () => readonly string[]) {
  const off = () => hidden().includes('progress')

  // Static text keeps the prompt cache warm. Context, not system prompt: a module that names
  // prompt.compose does not load on the stable CLI.
  on('prompt.context', async ($, e, next) => {
    const result = await next(e)
    if (off()) return result
    return { ...result, blocks: [...result.blocks, { name: 'cgp-effort-progress', text: PROGRESS_PROMPT }] }
  })

  on('tool.call', async ($, e, next) => {
    if (off() || e.agentId !== undefined) return next(e)
    if (e.tool === 'AskUserQuestion') {
      const p = await read($, progressState)
      const shown = Boolean(p && (p.phase === 'working' || p.phase === 'paused') && p.steps.length >= MIN_STEPS)
      if (shown) {
        await update($, progressState, cur => (cur ? { ...cur, phase: 'asking' } : cur))
        // No chime for a list the person closed.
        if (p && (await read($, progressHidden)) !== stepsKey(p.steps)) queueCue(hidden(), 'question')
      }
      const result = await next(e)
      if (shown) await update($, progressState, cur => (cur?.phase === 'asking' ? { ...cur, phase: 'working' } : cur))
      return result
    }
    if (e.tool === 'EnterPlanMode') {
      const result = await next(e)
      if (!('deny' in result && result.deny) && !result.isError) await update($, progressState, p => p ?? { phase: 'planning', steps: [] })
      return result
    }
    if (e.tool !== 'TodoWrite' && e.tool !== 'TaskCreate' && e.tool !== 'TaskUpdate') return next(e)
    const result = await next(e)
    if (('deny' in result && result.deny) || result.isError) return result
    if (e.tool === 'TodoWrite') {
      const steps = stepsFromTodos(e.todos)
      await update($, progressState, () => ({ phase: 'working', steps }))
    } else if (e.tool === 'TaskCreate') {
      const id = (result.result as { task?: { id?: string } } | undefined)?.task?.id
      if (id) await update($, progressState, p => ({ phase: 'working', steps: withTaskCreated(p && p.phase !== 'done' ? p.steps : [], id, e) }))
    } else {
      await update($, progressState, p => (p ? { phase: p.phase === 'planning' ? 'working' : p.phase, steps: withTaskUpdated(p.steps, e) } : p))
    }
    return result
  })
}

export type ProgressDraw = {
  // From $.ui.resolve(e).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Box: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Text: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: any
  // Absent in the terminal.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Svg?: any
  maxRows: number
  onClose: () => unknown
}

/** 'active' is drawn above the alert bands, 'resting' below; a short or closed list shows nowhere. */
export function progressShows(p: Progress | null, hiddenKey: string | null, when: 'active' | 'resting'): p is Progress {
  if (!p) return false
  // Done counts as active: it is news, and lasts only until the next message.
  const active = p.phase === 'planning' || p.phase === 'working' || p.phase === 'asking' || p.phase === 'done'
  if ((when === 'active') !== active) return false
  if (p.phase === 'planning') return true
  return p.steps.length >= MIN_STEPS && hiddenKey !== stepsKey(p.steps)
}

export const THINK_W = 34

/** Pulsing dots for planning; fixed size so its interactive frame fits. */
export function thinkingSvg(phase: Progress['phase'], w = THINK_W, h = PILL_H): string {
  const look = looks(phase)
  const r = h / 2
  const dots = [0, 1, 2]
    .map(i => `<circle class="dot" style="animation-delay:${(i * 0.18).toFixed(2)}s" cx="${6 + i * 11}" cy="${r}" r="3" fill="${look.color}"/>`)
    .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    '<style>:root{color-scheme:light dark}html,body{margin:0;overflow:hidden}svg{background:transparent;display:block}' +
    '.dot{transform-box:fill-box;transform-origin:center;opacity:.3;animation:dot 1.1s ease-in-out infinite}' +
    '@keyframes dot{30%{opacity:1;transform:translateY(-2.5px) scale(1.15)}60%{opacity:.3;transform:none}}</style>' +
    dots +
    '</svg>'
  )
}

export const PILL_H = 16

/** The track as one image scaled to the band's width; not interactive, since an interactive Svg needs a fixed size. */
export function progressTrackSvg(p: Progress): string {
  const look = looks(p.phase)
  const id = p.phase
  const W = 1000
  const H = 24
  const end = 30
  const y = 4
  const h = 16
  const r = h / 2
  const n = (v: number) => v.toFixed(1)
  const finished = p.phase === 'done'
  const pending = (x: number, w: number) =>
    `<rect x="${n(x + 0.6)}" y="${y + 0.6}" width="${n(Math.max(0, w - 1.2))}" height="${h - 1.2}" rx="${r - 0.6}" fill="#ffffff" fill-opacity=".04" stroke="${look.color}" stroke-opacity=".3" stroke-width="1.2"/>`
  const filled = (x: number, w: number) => `<rect x="${n(x)}" y="${y}" width="${n(Math.max(0, w))}" height="${h}" rx="${r}" fill="url(#fill-${id})"/>`
  const live = (x: number, w: number, share = 1) => {
    const lit = Math.max(r * 2, w * share)
    const flow = 160
    return (
      `<rect class="halo" x="${n(x)}" y="${y}" width="${n(lit)}" height="${h}" rx="${r}" fill="${look.color}" filter="url(#halo-${id})"/>` +
      (share < 1 ? `<rect x="${n(x)}" y="${y}" width="${n(w)}" height="${h}" rx="${r}" fill="${look.color}" fill-opacity=".1"/>` : '') +
      `<clipPath id="cut-${id}"><rect x="${n(x)}" y="${y}" width="${n(lit)}" height="${h}" rx="${r}"/></clipPath>` +
      `<g clip-path="url(#cut-${id})">` +
      `<rect x="${n(x)}" y="${y}" width="${n(lit)}" height="${h}" fill="${look.color}" fill-opacity=".78"/>` +
      `<g class="flow"><rect x="${n(x - flow)}" y="${y}" width="${n(lit + flow * 2)}" height="${h}" fill="url(#flow-${id})"/></g>` +
      `<rect x="${n(x)}" y="${y}" width="${n(lit)}" height="${h / 2}" fill="#ffffff" fill-opacity=".1"/>` +
      `<g class="shine"><rect x="${n(x - 60)}" y="${y - 4}" width="44" height="${h + 8}" transform="skewX(-25)" fill="url(#shine-${id})"/></g>` +
      '</g>' +
      `<rect x="${n(x + 0.6)}" y="${y + 0.6}" width="${n(lit - 1.2)}" height="${h - 1.2}" rx="${r - 0.6}" fill="none" stroke="#ffffff" stroke-opacity=".32" stroke-width="1.2"/>` +
      `<style>.shine{animation:shine-${id} 3.2s ease-in-out infinite}@keyframes shine-${id}{0%,35%{transform:translateX(0)}100%{transform:translateX(${n(lit + 140)}px)}}</style>`
    )
  }
  const total = p.steps.length
  const room = W - end
  const parts: string[] = []
  if (total > 0 && total <= SEGMENTS_MAX) {
    const gap = 10
    const seg = (room - gap * (total - 1)) / total
    p.steps.forEach((step, i) => {
      const x = i * (seg + gap)
      if (finished || step.status === 'completed') parts.push(filled(x, seg))
      else if (step.status === 'in_progress' && p.phase !== 'paused') parts.push(live(x, seg))
      else parts.push(pending(x, seg))
    })
  } else {
    parts.push(finished ? filled(0, room) : live(0, room, progressShare(p.steps)))
  }
  const fx = W - 12
  const flag = finished
    ? `<circle cx="${fx}" cy="12" r="9" fill="${look.color}"/><path d="M${fx - 4.4} 12.2L${fx - 1.4} 15.2L${fx + 4.2} 8.8" fill="none" stroke="${look.bg}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="M${fx - 6} 21V3.5" stroke="${look.color}" stroke-opacity=".75" stroke-width="1.6" stroke-linecap="round"/><path d="M${fx - 5.2} 4L${fx + 7} 7.8L${fx - 5.2} 11.6Z" fill="${look.color}" fill-opacity=".75"/>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    '<style>svg{background:transparent;display:block;overflow:visible}' +
    '.flow{animation:flow 2.6s linear infinite}@keyframes flow{from{transform:translateX(0)}to{transform:translateX(160px)}}' +
    '.halo{opacity:.35;animation:halo 2.4s ease-in-out infinite}@keyframes halo{50%{opacity:.75}}</style>' +
    `<defs><linearGradient id="fill-${id}" x1="0" x2="1"><stop offset="0" stop-color="${look.color}" stop-opacity=".62"/><stop offset="1" stop-color="${look.color}"/></linearGradient>` +
    // Repeats every 160 units, the flow's travel, so the loop has no seam.
    `<linearGradient id="flow-${id}" gradientUnits="userSpaceOnUse" x1="0" x2="160" spreadMethod="repeat"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/>` +
    `<stop offset=".5" stop-color="#ffffff" stop-opacity=".26"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="shine-${id}" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".8"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
    `<filter id="halo-${id}" x="-10%" y="-80%" width="120%" height="260%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>` +
    parts.join('') + flag + '</svg>'
  )
}

// Wider than any band, which clips it on the right.
export const ART_W = 1600
export const ART_H = 64

/** The band's animated background for a phase; fixed size so its interactive frame fits. */
export function progressArtSvg(phase: Progress['phase']): string {
  const c = looks(phase).color
  // Deterministic, so a state always draws the same art.
  const spread = (count: number, salt: number) =>
    Array.from({ length: count }, (_, i) => {
      const a = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453
      const b = Math.sin((i + 1) * 39.3467 + salt * 11.135) * 24634.6345
      return [(i + (a - Math.floor(a))) * (ART_W / count), 8 + (b - Math.floor(b)) * (ART_H - 16), a - Math.floor(a)] as const
    })
  const f = (v: number) => v.toFixed(1)
  const sparks = spread(26, 1)
    .map(([x, y, k]) => {
      const s = 2 + k * 2.6
      return (
        `<path class="sp" style="transform-origin:${f(x)}px ${f(y)}px;animation-delay:${(k * 4.2).toFixed(2)}s" ` +
        `d="M${f(x)} ${f(y - s)}L${f(x + s * 0.28)} ${f(y - s * 0.28)}L${f(x + s)} ${f(y)}L${f(x + s * 0.28)} ${f(y + s * 0.28)}L${f(x)} ${f(y + s)}L${f(x - s * 0.28)} ${f(y + s * 0.28)}L${f(x - s)} ${f(y)}L${f(x - s * 0.28)} ${f(y - s * 0.28)}Z" fill="#fff"/>`
      )
    })
    .join('')
  const clouds = spread(6, 5)
    .map(([x, , k], i) =>
      `<ellipse class="cl" style="animation-delay:-${(k * 9).toFixed(2)}s;animation-duration:${(9 + k * 6).toFixed(2)}s" cx="${f(x)}" cy="${i % 2 ? 50 : 14}" rx="${f(120 + k * 90)}" ry="26" fill="${c}"/>`,
    )
    .join('')
  const wave = (amp: number, period: number, phase0: number, cls: string, op: number) => {
    let d = ''
    for (let x = 0; x <= ART_W; x += 20) d += `${x ? 'L' : 'M'}${x} ${f(ART_H / 2 + amp * Math.sin((x / period) * Math.PI * 2 + phase0))}`
    return `<path class="${cls}" d="${d}" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="1.2" stroke-linecap="round"/>`
  }
  const rising = (count: number, glyph: (x: number) => string) =>
    spread(count, 7)
      .map(([x, , k]) => `<g class="up" style="animation-delay:${(k * 3).toFixed(2)}s;animation-duration:${(3 + k * 1.5).toFixed(2)}s">${glyph(x)}</g>`)
      .join('')
  let extra = ''
  if (phase === 'done') {
    const hues = [c, '#ffffff', '#f2d16b', '#a79cf7']
    extra =
      spread(34, 11)
        .map(([x, , k], i) =>
          `<rect class="cf" style="animation-delay:-${(k * 4).toFixed(2)}s;animation-duration:${(2.6 + k * 2).toFixed(2)}s" x="${f(x)}" y="-8" width="${(3 + k * 3).toFixed(1)}" height="${(2 + k * 2).toFixed(1)}" rx=".6" fill="${hues[i % hues.length]}"/>`,
        )
        .join('') +
      rising(14, x => `<path d="M${f(x - 5)} 56L${f(x - 1.5)} 59.5L${f(x + 5.5)} 52" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`)
  } else if (phase === 'asking') {
    extra =
      spread(5, 9)
        .map(([x, y, k]) => `<circle class="rp" style="transform-origin:${f(x)}px ${f(y)}px;animation-delay:${(k * 3).toFixed(2)}s" cx="${f(x)}" cy="${f(y)}" r="22" fill="none" stroke="${c}" stroke-width="1.2"/>`)
        .join('') +
      rising(10, x => `<text x="${f(x)}" y="60" font-size="13" font-family="sans-serif" font-weight="700" fill="${c}">?</text>`)
  } else if (phase === 'planning') {
    const pts = spread(16, 4)
    extra =
      pts
        .slice(1)
        .map(([x, y], i) => {
          const [px, py] = pts[i]
          return `<line class="lk" style="animation-delay:${(i * 0.35).toFixed(2)}s" x1="${f(px)}" y1="${f(py)}" x2="${f(x)}" y2="${f(y)}" stroke="${c}" stroke-width="1" stroke-dasharray="140" stroke-dashoffset="140"/>`
        })
        .join('') +
      pts.map(([x, y], i) => `<circle class="nd" style="animation-delay:${(i * 0.35).toFixed(2)}s" cx="${f(x)}" cy="${f(y)}" r="2.2" fill="${c}"/>`).join('')
  } else {
    extra = spread(30, 3)
      .map(([x, y, k]) => `<circle class="pt" style="animation-delay:-${(k * 3).toFixed(2)}s;animation-duration:${(1.8 + k * 2.2).toFixed(2)}s" cx="${f(x)}" cy="${f(y)}" r="${(0.8 + k * 1.4).toFixed(1)}" fill="${c}"/>`)
      .join('') +
      spread(9, 6)
        .map(([x, y, k]) => `<rect class="ln" style="animation-delay:${(k * 2.4).toFixed(2)}s" x="${f(x)}" y="${f(y)}" width="${f(40 + k * 50)}" height="1.2" rx=".6" fill="${c}"/>`)
        .join('')
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ART_W}" height="${ART_H}" viewBox="0 0 ${ART_W} ${ART_H}">` +
    '<style>:root{color-scheme:light dark}html,body{margin:0;overflow:hidden}svg{background:transparent;display:block}' +
    '.sp{opacity:0;transform:scale(0);animation:tw 4.2s ease-in-out infinite}' +
    '@keyframes tw{0%,70%,100%{opacity:0;transform:scale(0) rotate(0)}82%{opacity:.85;transform:scale(1) rotate(30deg)}92%{opacity:0;transform:scale(.2) rotate(60deg)}}' +
    '.cl{opacity:.1;animation-name:cl;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}' +
    '@keyframes cl{from{opacity:.06;transform:translateX(-60px)}to{opacity:.2;transform:translateX(60px)}}' +
    '.w1{stroke-dasharray:90 260;animation:w 7s linear infinite}.w2{stroke-dasharray:50 330;animation:w 11s linear infinite reverse}' +
    '@keyframes w{to{stroke-dashoffset:-1400}}' +
    '.up{opacity:0;animation-name:up;animation-timing-function:ease-out;animation-iteration-count:infinite}' +
    '@keyframes up{0%{opacity:0;transform:translateY(0)}20%{opacity:.6}100%{opacity:0;transform:translateY(-52px)}}' +
    '.ln{opacity:0;animation:ln 2.4s ease-in infinite}@keyframes ln{0%{opacity:0;transform:translateX(-60px)}30%{opacity:.35}100%{opacity:0;transform:translateX(220px)}}' +
    '.pt{opacity:0;animation-name:pt;animation-timing-function:linear;animation-iteration-count:infinite}' +
    '@keyframes pt{0%{opacity:0;transform:translateX(0)}15%{opacity:.6}100%{opacity:0;transform:translateX(160px)}}' +
    '.rp{opacity:0;transform:scale(.2);animation:rp 3s ease-out infinite}@keyframes rp{0%{opacity:.6;transform:scale(.2)}100%{opacity:0;transform:scale(1.6)}}' +
    '.cf{animation-name:cf;animation-timing-function:linear;animation-iteration-count:infinite}' +
    '@keyframes cf{0%{opacity:0;transform:translateY(0) rotate(0)}10%{opacity:.85}100%{opacity:0;transform:translateY(80px) rotate(540deg)}}' +
    '.cf{transform-box:fill-box;transform-origin:center}' +
    '.lk{opacity:.4;animation:lk 5.6s ease-in-out infinite}@keyframes lk{0%{stroke-dashoffset:140;opacity:0}30%{opacity:.45}60%{stroke-dashoffset:0;opacity:.45}100%{stroke-dashoffset:0;opacity:0}}' +
    '.nd{transform-box:fill-box;transform-origin:center;opacity:.2;animation:nd 5.6s ease-in-out infinite}@keyframes nd{0%,100%{opacity:.15;transform:scale(.7)}25%{opacity:1;transform:scale(1.5)}50%{opacity:.5;transform:scale(1)}}' +
    `.sweep{animation:sweep 6s linear infinite}@keyframes sweep{from{transform:translateX(-400px)}to{transform:translateX(${ART_W + 100}px)}}</style>` +
    `<defs><linearGradient id="wash" x1="0" x2="1"><stop offset="0" stop-color="${c}" stop-opacity=".06"/><stop offset=".6" stop-color="${c}" stop-opacity=".1"/><stop offset="1" stop-color="${c}" stop-opacity=".2"/></linearGradient>` +
    '<linearGradient id="beam" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    `<pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r=".8" fill="${c}" fill-opacity=".16"/></pattern>` +
    '<filter id="soft" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="16"/></filter></defs>' +
    `<rect width="${ART_W}" height="${ART_H}" fill="url(#wash)"/>` +
    `<rect width="${ART_W}" height="${ART_H}" fill="url(#dots)"/>` +
    `<g filter="url(#soft)">${clouds}</g>` +
    wave(9, 420, 0, 'w1', 0.5) + wave(6, 300, 2, 'w2', 0.35) +
    `<g class="sweep"><rect x="0" y="-20" width="300" height="${ART_H + 40}" transform="skewX(-20)" fill="url(#beam)"/></g>` +
    sparks + extra + '</svg>'
  )
}

export function progressTitle(p: Progress): string {
  const total = p.steps.length
  const at = stepNumber(p.steps)
  if (p.phase === 'planning') return 'Planning a bigger task'
  if (p.phase === 'done') return `Done · all ${total} steps`
  if (p.phase === 'asking') return `Waiting for your answer · step ${at} of ${total}`
  if (p.phase === 'paused') return `Paused at step ${at} of ${total}`
  return `Step ${at} of ${total}`
}

/** The band. The track is a still Svg: an interactive one gets a fixed ~300x150 frame unless given both sizes. */
export function drawProgress(p: Progress, d: ProgressDraw) {
  const { Box, Text, Button } = d
  const look = looks(p.phase)
  const total = p.steps.length
  const step = currentStep(p.steps)
  const title = progressTitle(p)
  const words = p.phase === 'done' || p.phase === 'planning' ? '' : ((p.phase === 'paused' ? step?.label : step?.doing) ?? '')
  const name = (
    <Box key="progress-name" position="relative" flexShrink={0}>
      <Text color={look.color} bold>
        ✦ CGP Effort
      </Text>
    </Box>
  )
  const closeButton = <Button key="progress-close" plain role="dismiss" label="✕" onPress={d.onClose} />
  if (d.maxRows < 4 || p.phase === 'planning') {
    const blocks = Math.round(progressShare(p.steps) * 10)
    return (
      <Box key="progress-bar" position="relative" flexDirection="row" gap={1} alignItems="center" paddingX={1} overflow="hidden"
        backgroundColor={look.bg} borderStyle="round" borderColor={look.edge}>
        {d.Svg ? (
          <Box key="progress-art" position="absolute" top={-1} left={0} bottom={-1}>
            <d.Svg key={`art-${p.phase}`} source={progressArtSvg(p.phase)} alt="" width={ART_W} height={ART_H} />
          </Box>
        ) : null}
        {name}
        {p.phase === 'planning' ? (
          d.Svg ? (
            <Box key="progress-thinking" position="relative" flexShrink={0}>
              <d.Svg source={thinkingSvg(p.phase)} alt="thinking" width={THINK_W} height={PILL_H} />
            </Box>
          ) : null
        ) : (
          <Box key="progress-blocks" position="relative" flexShrink={0} flexDirection="row">
            <Text color={look.color}>{'▰'.repeat(blocks)}</Text>
            <Text dimColor>{'▱'.repeat(10 - blocks)}</Text>
          </Box>
        )}
        <Box key="progress-words" position="relative" flexShrink={1} minWidth={0}>
          <Text wrap="truncate">{words ? `${title} · ${words}` : title}</Text>
        </Box>
        <Box flexGrow={1} />
        {closeButton}
      </Box>
    )
  }
  const fill = (key: string, lit: boolean) => (
    <Box key={key} flexGrow={1} flexShrink={1} minWidth={0} height={1} overflow="hidden">
      {lit ? <Text color={look.color}>{'━'.repeat(RUN)}</Text> : <Text dimColor>{'─'.repeat(RUN)}</Text>}
    </Box>
  )
  const track =
    total <= SEGMENTS_MAX
      ? p.steps.map((s, i) =>
          s.status === 'in_progress' && p.phase !== 'done' ? (
            <Box key={`seg-${i}`} flexGrow={1} flexShrink={1} minWidth={0} height={1} overflow="hidden" flexDirection="row">
              {fill(`seg-${i}-a`, true)}
              {fill(`seg-${i}-b`, false)}
            </Box>
          ) : (
            fill(`seg-${i}`, p.phase === 'done' || s.status === 'completed')
          ),
        )
      : [
          <Box key="seg-done" width={`${Math.round(progressShare(p.steps) * 100)}%`} height={1} overflow="hidden">
            <Text color={look.color}>{'━'.repeat(RUN * 2)}</Text>
          </Box>,
          fill('seg-rest', false),
        ]
  return (
    <Box key="progress-bar" position="relative" flexDirection="column" paddingX={1} overflow="hidden"
      backgroundColor={look.bg} borderStyle="round" borderColor={look.edge}>
      {d.Svg ? (
        <Box key="progress-art" position="absolute" top={-1} left={0} bottom={-1}>
          <d.Svg key={`art-${p.phase}`} source={progressArtSvg(p.phase)} alt="" width={ART_W} height={ART_H} />
        </Box>
      ) : null}
      <Box key="progress-head" position="relative" flexDirection="row" gap={1} alignItems="center">
        {name}
        <Box key="progress-words" flexShrink={1} minWidth={0} flexDirection="row" gap={1}>
          <Text color={look.color} wrap="truncate">
            {title}
          </Text>
          {words ? <Text wrap="truncate">{words}</Text> : null}
        </Box>
        <Box flexGrow={1} />
        {closeButton}
      </Box>
      {d.Svg ? (
        <Box key="progress-track" position="relative" flexDirection="row">
          <d.Svg key={`track-${p.phase}`} source={progressTrackSvg(p)} alt={title} />
        </Box>
      ) : (
        <Box key="progress-track" width="100%" height={1} flexDirection="row" gap={total <= SEGMENTS_MAX ? 1 : 0} alignItems="center">
          {track}
          <Box key="progress-flag" flexShrink={0}>
            <Text color={p.phase === 'done' ? look.color : undefined} dimColor={p.phase !== 'done'}>
              ⚑
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}
