// The agent panel: a pane showing this chat's subagents and the code they touch.
import type { AgentRec, AgentState, FileTouch, Progress, ProgressStep } from '../../types'
import { MARK_SVG } from '../core/mark'
import { accent, tintHex } from '../core/theme'
import { ART_H, ART_W, looks, PILL_H, progressArtSvg, progressShare, progressTrackSvg, THINK_W, thinkingSvg } from './progress'

export const AGENTS_PANE = 'cgp-effort-agents'

// Each agent state borrows the progress band's look and art for a phase.
const PHASE: Record<Exclude<AgentState, 'failed'>, Progress['phase']> = {
  picking: 'planning',
  running: 'working',
  waiting: 'asking',
  done: 'done',
}
const FAILED = { color: '#e5534b', bg: '#1a0f0f', edge: '#6a2a26' }
const lookOf = (s: AgentState) => (s === 'failed' ? FAILED : looks(PHASE[s]))

export type Mood = 'waiting' | 'working' | 'done' | 'quiet'
export function moodOf(agents: readonly AgentRec[]): Mood {
  if (agents.some(a => a.state === 'waiting')) return 'waiting'
  if (agents.some(a => a.state === 'running' || a.state === 'picking')) return 'working'
  return agents.length ? 'done' : 'quiet'
}

export function moodWord(agents: readonly AgentRec[]): string {
  const live = agents.filter(a => a.state === 'running' || a.state === 'picking').length
  const waiting = agents.filter(a => a.state === 'waiting').length
  if (waiting) return `${waiting} waiting`
  if (live) return `${live} working`
  return agents.length ? 'All done' : 'Quiet'
}

export function overallPercent(agents: readonly AgentRec[]): number {
  if (!agents.length) return 0
  const share = agents.map(a => (a.state === 'done' || a.state === 'failed' ? 1 : a.steps?.length ? progressShare(a.steps) : 0))
  return Math.round((share.reduce((s, v) => s + v, 0) / agents.length) * 100)
}

/** Formats a duration as m:ss. */
export function clockText(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// An agent in one tool call longer than this (a test run, a build) counts as waiting.
export const WAIT_MS = 8000

/** Agents past WAIT_MS in one tool call turned to waiting; null when none changed. */
export function withWaits(agents: readonly AgentRec[], nowMs: number): AgentRec[] | null {
  let changed = false
  const next = agents.map(a => {
    if (a.state !== 'running' || a.toolSince === undefined || nowMs - a.toolSince < WAIT_MS) return a
    changed = true
    return { ...a, state: 'waiting' as const, waitingSince: a.toolSince }
  })
  return changed ? next : null
}

export function toolLine(tool: string, input: Record<string, unknown>): string {
  const str = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '')
  const base = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() ?? path
  const arg =
    tool === 'Bash' ? str('command')
    : tool === 'Read' || tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit' ? base(str('file_path') || str('notebook_path'))
    : tool === 'Grep' || tool === 'Glob' ? str('pattern')
    : tool === 'WebFetch' ? str('url').replace(/^https?:\/\//, '')
    : tool === 'WebSearch' ? str('query')
    : tool === 'Agent' ? str('description')
    : ''
  const name = tool.startsWith('mcp__') ? tool.split('__').pop() ?? tool : tool
  const one = arg.split('\n')[0].trim()
  return one ? `${name} ${one.length > 60 ? `${one.slice(0, 59)}…` : one}` : name
}

export function splitAgents(agents: readonly AgentRec[]): { live: AgentRec[]; done: AgentRec[] } {
  return { live: agents.filter(a => a.state !== 'done'), done: agents.filter(a => a.state === 'done') }
}

const CORNER_MARK = MARK_SVG.replace('<g mask=', '<g opacity=".16" transform="rotate(9 50 50)" mask=')

/** The pane's background; one source per mood, so a redraw in the same mood is the same image. */
export function paneWashSvg(mood: Mood, w = 400, h = 900): string {
  const c = mood === 'waiting' ? looks('asking').color : mood === 'done' ? looks('done').color : '#8f7ff0'
  const light = mood === 'waiting' ? '#f2c97a' : mood === 'done' ? '#b4f0c8' : '#b3a6ff'
  const strength = mood === 'quiet' ? 0.45 : mood === 'waiting' ? 0.6 : 1
  const f = (v: number) => v.toFixed(1)
  const lines = [0, 1, 2, 3, 4, 5]
    .map(i => {
      const x = w * 0.18 + i * (w * 0.15)
      return `<line x1="${f(x)}" y1="${h + 10}" x2="${f(x + h * 0.36)}" y2="-10" stroke="#fff" stroke-opacity="${i % 2 ? 0.05 : 0.04}" stroke-width="${[3, 1.2, 4, 1.5, 3, 1.2][i]}"/>`
    })
    .join('')
  const count = mood === 'quiet' ? 8 : mood === 'done' ? 12 : 18
  const sparks = Array.from({ length: count }, (_, i) => {
    const a = Math.sin((i + 1) * 12.9898) * 43758.5453
    const b = Math.sin((i + 1) * 78.233) * 24634.6345
    const x = w * 0.15 + (a - Math.floor(a)) * w * 0.85
    const y = h * 0.3 + (b - Math.floor(b)) * h * 0.7
    const s = 1.6 + ((a * 7) % 1) * 1.8
    const d = `M${f(x)} ${f(y - s)}L${f(x + s * 0.21)} ${f(y - s * 0.21)}L${f(x + s)} ${f(y)}L${f(x + s * 0.21)} ${f(y + s * 0.21)}L${f(x)} ${f(y + s)}L${f(x - s * 0.21)} ${f(y + s * 0.21)}L${f(x - s)} ${f(y)}L${f(x - s * 0.21)} ${f(y - s * 0.21)}Z`
    return `<path class="sp" style="transform-origin:${f(x)}px ${f(y)}px;animation-duration:${(3.6 + (i % 5) * 0.45).toFixed(2)}s;animation-delay:${((i * 0.83) % 4.4).toFixed(2)}s" d="${d}"/>`
  }).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMaxYMax slice">` +
    '<style>:root{color-scheme:light dark}html,body{margin:0}svg{background:transparent;display:block}' +
    '.sp{fill:#fff;opacity:0;transform:scale(0);animation-name:gl;animation-timing-function:ease-in-out;animation-iteration-count:infinite}' +
    '@keyframes gl{0%,72%,100%{opacity:0;transform:scale(0) rotate(0deg)}82%{opacity:.9;transform:scale(1) rotate(30deg)}92%{opacity:0;transform:scale(.2) rotate(60deg)}}' +
    '.br{animation:br 6s ease-in-out infinite}@keyframes br{0%,100%{opacity:.85}50%{opacity:1}}</style>' +
    `<defs><radialGradient id="bg" cx="${w}" cy="${h}" r="${f(h * 0.95)}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="${light}" stop-opacity="${(0.42 * strength).toFixed(2)}"/>` +
    `<stop offset=".35" stop-color="${c}" stop-opacity="${(0.24 * strength).toFixed(2)}"/>` +
    `<stop offset=".75" stop-color="${c}" stop-opacity="${(0.06 * strength).toFixed(2)}"/>` +
    `<stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>` +
    '<linearGradient id="fade" x1="0" y1="0" x2="1" y2="1"><stop offset=".2" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff"/></linearGradient>' +
    `<mask id="m"><rect width="${w}" height="${h}" fill="url(#fade)"/></mask>` +
    '<pattern id="grain" width="2" height="2" patternUnits="userSpaceOnUse"><rect width=".6" height=".6" fill="#fff" fill-opacity=".07"/></pattern></defs>' +
    `<rect class="br" width="${w}" height="${h}" fill="url(#bg)"/>` +
    `<g mask="url(#m)">${lines}${sparks}<rect width="${w}" height="${h}" fill="url(#grain)"/></g>` +
    '</svg>'
  )
}

// The map: the parts of the code this chat touched and how they import each other.

export function touchOf(tool: string, input: Record<string, unknown>): { path: string; edited: boolean } | null {
  const path = typeof input.file_path === 'string' ? input.file_path : typeof input.notebook_path === 'string' ? input.notebook_path : ''
  if (!path) return null
  if (tool === 'Read') return { path, edited: false }
  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit' || tool === 'NotebookEdit') return { path, edited: true }
  return null
}

/** Root-relative path with forward slashes; null when outside the root. */
export function relPath(path: string, root: string): string | null {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '')
  const p = norm(path)
  const r = norm(root)
  if (!/^([a-zA-Z]:)?\//.test(p)) return p.replace(/^\.\//, '')
  if (p.toLowerCase() === r.toLowerCase()) return null
  return p.toLowerCase().startsWith(`${r.toLowerCase()}/`) ? p.slice(r.length + 1) : null
}

/** A path as an import names it: no extension, no trailing /index. */
export function stemOf(path: string): string {
  return path.replace(/\.(d\.ts|tsx?|jsx?|mjs|cjs|py)$/, '').replace(/\/index$/, '')
}

function joinRel(from: string, spec: string): string {
  const parts = from.split('/').slice(0, -1)
  for (const seg of spec.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg !== '.' && seg !== '') parts.push(seg)
  }
  return parts.join('/')
}

/** Stems a file imports: relative JS/TS imports and Python modules. */
export function importsOf(path: string, text: string): string[] {
  const out = new Set<string>()
  if (/\.(tsx?|jsx?|mjs|cjs)$/.test(path)) {
    const re = /(?:from\s*|import\s*\(?\s*|require\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g
    for (const m of text.matchAll(re)) out.add(stemOf(joinRel(path, m[1])))
  } else if (/\.py$/.test(path)) {
    for (const m of text.matchAll(/^\s*from\s+(\.*)([\w.]*)\s+import/gm)) {
      const dots = m[1].length
      const mod = m[2].replace(/\./g, '/')
      if (dots) out.add(joinRel(path, `${'../'.repeat(dots - 1)}./${mod}`))
      else if (mod) out.add(mod)
    }
    for (const m of text.matchAll(/^\s*import\s+([\w.]+)/gm)) out.add(m[1].replace(/\./g, '/'))
  }
  out.delete(stemOf(path))
  return [...out]
}

export function moduleOf(path: string): string {
  const dirs = path.split('/').slice(0, -1)
  return dirs.length ? dirs.slice(0, 2).join('/') : 'project'
}

export type Module = { key: string; files: FileTouch[]; edited: boolean; live: AgentRec[] }

export function modulesOf(files: readonly FileTouch[], agents: readonly AgentRec[]): Module[] {
  const map = new Map<string, Module>()
  for (const f of files) {
    const key = moduleOf(f.path)
    const m = map.get(key) ?? { key, files: [], edited: false, live: [] }
    m.files.push(f)
    m.edited ||= f.edited
    map.set(key, m)
  }
  for (const a of agents) if (a.file && (a.state === 'running' || a.state === 'waiting')) map.get(moduleOf(a.file))?.live.push(a)
  return [...map.values()].sort((x, y) => y.files.length - x.files.length || x.key.localeCompare(y.key))
}

/** Cross-module imports among the touched files, as "from>to" pairs. */
export function moduleLinks(files: readonly FileTouch[]): string[] {
  const byStem = new Map(files.map(f => [stemOf(f.path), f.path]))
  const links = new Set<string>()
  for (const f of files)
    for (const stem of f.imports) {
      const to = byStem.get(stem)
      if (to && moduleOf(to) !== moduleOf(f.path)) links.add(`${moduleOf(f.path)}>${moduleOf(to)}`)
    }
  return [...links]
}

export function withTouch(files: readonly FileTouch[], path: string, edited: boolean, by: string, nowMs: number, imports?: string[]): FileTouch[] {
  const old = files.find(f => f.path === path)
  const next: FileTouch = {
    path,
    edited: edited || Boolean(old?.edited),
    by: old ? (old.by.includes(by) ? old.by : [...old.by, by]) : [by],
    lastAt: nowMs,
    imports: imports ?? old?.imports ?? [],
  }
  return [...files.filter(f => f.path !== path), next].slice(-80)
}

const MAP_W = 400
const MAP_H = 190
/** A folder name as SVG text: a repository can name a folder with markup in it. */
export const svgText = (text: string) =>
  text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
export function mapSvg(modules: readonly Module[], links: readonly string[]): string {
  const f = (v: number) => v.toFixed(1)
  const shown = modules.slice(0, 10)
  const cx = MAP_W / 2
  const cy = MAP_H / 2
  const pos = new Map<string, { x: number; y: number; r: number }>()
  shown.forEach((m, i) => {
    const n = shown.length
    const a = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2
    const ring = n === 1 ? 0 : 1
    pos.set(m.key, { x: cx + Math.cos(a) * 150 * ring, y: cy + Math.sin(a) * 62 * ring, r: 4 + Math.min(7, Math.sqrt(m.files.length) * 2.6) })
  })
  const live = new Set(shown.filter(m => m.live.length).map(m => m.key))
  const edges = links
    .map(l => l.split('>'))
    .filter(([a, b]) => pos.has(a) && pos.has(b))
    .map(([a, b]) => {
      const p = pos.get(a)!
      const q = pos.get(b)!
      const mx = (p.x + q.x) / 2 + (q.y - p.y) * 0.15
      const my = (p.y + q.y) / 2 - (q.x - p.x) * 0.15
      const hot = live.has(a) || live.has(b)
      return `<path d="M${f(p.x)} ${f(p.y)} Q${f(mx)} ${f(my)} ${f(q.x)} ${f(q.y)}" fill="none" stroke="${hot ? '#a79cf7' : '#4a3f80'}" stroke-opacity="${hot ? 0.9 : 0.7}" stroke-width="1.2"${hot ? ' stroke-dasharray="3 5" class="fl"' : ''}/>`
    })
    .join('')
  const nodes = shown
    .map(m => {
      const p = pos.get(m.key)!
      const isLive = live.has(m.key)
      const name = svgText(m.key.split('/').pop() ?? m.key)
      const halo = isLive ? `<circle class="br" cx="${f(p.x)}" cy="${f(p.y)}" r="${f(p.r + 9)}" fill="url(#halo)"/>` : ''
      const body = m.edited
        ? `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(p.r)}" fill="${isLive ? '#a79cf7' : '#d4d4d8'}"/>`
        : `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(p.r)}" fill="#15121f" stroke="${isLive ? '#a79cf7' : '#8b8b93'}" stroke-width="1.4"/>`
      const label = `<text x="${f(p.x)}" y="${f(p.y + p.r + 13)}" text-anchor="middle" class="${isLive ? 'tl' : 't'}">${name}</text>`
      return halo + body + label
    })
    .join('')
  const dots: string[] = []
  for (let y = 6; y < MAP_H; y += 12) for (let x = 6; x < MAP_W; x += 12) dots.push(`<circle cx="${x}" cy="${y}" r=".6"/>`)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_W}" height="${MAP_H}" viewBox="0 0 ${MAP_W} ${MAP_H}">` +
    '<style>:root{color-scheme:light dark}html,body{margin:0}svg{background:transparent;display:block}' +
    ".t{font:11px system-ui,'Segoe UI',sans-serif;fill:#8b8b93}.tl{font:600 11px system-ui,'Segoe UI',sans-serif;fill:#ececf0}" +
    '.fl{animation:fl 1s linear infinite}@keyframes fl{to{stroke-dashoffset:-8}}' +
    '.br{animation:br 2.4s ease-in-out infinite}@keyframes br{0%,100%{opacity:.5}50%{opacity:1}}</style>' +
    '<defs><radialGradient id="halo"><stop offset="0" stop-color="#a79cf7" stop-opacity=".55"/><stop offset="1" stop-color="#a79cf7" stop-opacity="0"/></radialGradient></defs>' +
    `<g fill="#ffffff" fill-opacity=".06">${dots.join('')}</g>${edges}${nodes}</svg>`
  )
}

function mapCard(d: AgentsDraw, modules: readonly Module[], links: readonly string[]) {
  const { Box, Text, Button, Svg } = d
  return (
    <Box key="agents-map" position="relative" flexDirection="column" paddingX={1} backgroundColor={CARD_BG} borderStyle="round" borderColor={CARD_EDGE}>
      <Box flexDirection="row">
        <Text color={TEXT} bold>Map</Text>
        <Box flexGrow={1} />
        <Text dimColor>{`${modules.length} part${modules.length === 1 ? '' : 's'} touched`}</Text>
      </Box>
      {Svg ? <Svg source={mapSvg(modules, links)} alt={`map of ${modules.length} parts of the code`} width={MAP_W} height={MAP_H} /> : null}
      {modules.map(m => {
        const isOpen = d.module === m.key
        const lead = m.live.length ? m.live.map(a => a.type).join(', ') : m.edited ? 'changed' : 'read'
        return (
          <Box key={`mod-${m.key}`} position="relative" flexDirection="column">
            <Box flexDirection="row">
              <Text color={m.live.length ? accent() : DIM}>{isOpen ? '▾ ' : '▸ '}</Text>
              <Text color={TEXT} bold={m.live.length > 0}>{m.key}</Text>
              <Text dimColor>{`  ${m.files.length}`}</Text>
              <Box flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden" />
              <Text color={m.live.length ? accent() : DIM}>{lead}</Text>
            </Box>
            {isOpen
              ? m.files.map(file => {
                  const worker = m.live.find(a => a.file === file.path)
                  return (
                    <Box key={`file-${file.path}`} flexDirection="row" paddingLeft={2}>
                      <Box flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
                        <Text color={worker ? '#ececf0' : TEXT} wrap="truncate">{file.path.split('/').pop()}</Text>
                      </Box>
                      <Text color={worker ? accent() : DIM}>{worker ? `  ${worker.type}` : file.edited ? '  changed' : '  read'}</Text>
                    </Box>
                  )
                })
              : null}
            <Box position="absolute" top={0} left={0} right={0} height={1}>
              <Button key={`mod-${m.key}-press`} plain label={' '.repeat(60)} hover={{ backgroundColor: '#00000000' }} onPress={() => d.onModule(m.key)} />
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

export type AgentsDraw = {
  // From $.ui.resolve(e).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Box: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Text: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Svg?: any
  rows: number
  nowMs: number
  title: string
  // An agent's id, 'done' for the finished card, or null.
  open: string | null
  // From register.tsx: the context ring and the card art.
  ringSvg: (percent: number, color: string) => string
  cardArt: { source: string; width: number; height: number }
  onOpen: (id: string) => unknown
  files: readonly FileTouch[]
  steps: readonly ProgressStep[] | null
  module: string | null
  onModule: (key: string) => unknown
}

const TEXT = '#d4d4d8'
const PANE_BG = '#15121f'
const DIM = '#8b8b93'
const CARD_BG = '#141416'
const CARD_EDGE = '#2a2a2f'

function header(d: AgentsDraw, agents: readonly AgentRec[]) {
  const { Box, Text, Svg } = d
  const mood = moodOf(agents)
  const color = mood === 'waiting' ? looks('asking').color : mood === 'done' ? looks('done').color : TEXT
  const pct = d.steps && d.steps.length > 1 ? Math.round(progressShare(d.steps) * 100) : overallPercent(agents)
  return (
    <Box key="agents-head" position="relative" flexDirection="column" paddingX={1} overflow="hidden"
      backgroundColor={CARD_BG} borderStyle="round" borderColor={CARD_EDGE}>
      {Svg ? (
        <Box key="agents-head-art" position="absolute" top={-1} right={0} bottom={-1}>
          <Svg source={d.cardArt.source} alt="CGP Effort" width={d.cardArt.width} height={d.cardArt.height} />
        </Box>
      ) : null}
      <Box position="relative" flexDirection="row" alignItems="center" minWidth={0}>
        <Box position="absolute" top={0} left={0} />
        {Svg ? (
          <Box flexShrink={0} marginRight={1} alignItems="center">
            <Svg source={MARK_SVG} alt="CGP Effort" width={18} height={18} />
          </Box>
        ) : <Text color={accent()} bold>✦ </Text>}
        <Text color={color} bold>{moodWord(agents)}</Text>
        {Svg && agents.length ? (
          <Box flexShrink={0} marginLeft={2} flexDirection="row" gap={1} alignItems="center">
            <Svg source={d.ringSvg(pct, color)} alt={`${pct}% done`} width={16} height={16} />
            <Text color={TEXT}>{`${pct}%`}</Text>
          </Box>
        ) : null}
        <Box flexGrow={1} flexShrink={1} minWidth={0} marginLeft={2} overflow="hidden">
          <Text dimColor wrap="truncate">{agents.length ? `${agents.length} agent${agents.length > 1 ? 's' : ''}` : d.title}</Text>
        </Box>
      </Box>
      {Svg && d.steps && d.steps.length > 1 ? (
        <Box position="relative" flexDirection="column">
          <Box position="absolute" top={0} left={0} />
          <Svg source={progressTrackSvg({ phase: mood === 'done' ? 'done' : 'working', steps: [...d.steps] })}
            alt={`${d.steps.filter(s => s.status === 'completed').length} of ${d.steps.length} steps`} width={1000} height={24} />
        </Box>
      ) : null}
    </Box>
  )
}

function agentLine(d: AgentsDraw, a: AgentRec) {
  const { Box, Text, Svg } = d
  const look = lookOf(a.state)
  if (a.state === 'picking')
    return (
      <Box flexDirection="row" alignItems="center" gap={1}>
        {Svg ? <Svg source={thinkingSvg('planning')} alt="picking" width={THINK_W} height={PILL_H} /> : null}
        <Text color={look.color}>picking a model</Text>
      </Box>
    )
  if (a.state === 'waiting')
    return <Text color={look.color} wrap="truncate">{`waiting on ${a.now ?? 'a tool'}`}</Text>
  if (a.state === 'failed') return <Text color={look.color}>{`failed after ${clockText((a.endedAt ?? d.nowMs) - a.startedAt)}`}</Text>
  if (Svg && a.steps && a.steps.length > 1)
    return <Svg source={progressTrackSvg({ phase: 'working', steps: a.steps })} alt={`${a.steps.filter(s => s.status === 'completed').length} of ${a.steps.length}`} width={1000} height={24} />
  return <Text dimColor wrap="truncate">{a.now ?? 'starting'}</Text>
}

function agentCard(d: AgentsDraw, a: AgentRec) {
  const { Box, Text, Button, Svg } = d
  const look = lookOf(a.state)
  const phase = a.state === 'failed' ? null : PHASE[a.state]
  const isOpen = d.open === a.id
  return (
    <Box key={`agent-${a.id}`} position="relative" flexDirection="column" paddingX={1} overflow="hidden"
      backgroundColor={look.bg} borderStyle="round" borderColor={look.edge}>
      {Svg && phase ? (
        <Box key={`agent-${a.id}-art`} position="absolute" top={0} left={0} right={0} bottom={0}>
          <Svg source={cardArtSvg(phase)} alt={`${a.type} ${a.state}`} width={ART_W} height={CARD_ART_H} />
        </Box>
      ) : null}
      <Box position="relative" flexDirection="column">
        <Box position="absolute" top={0} left={0} />
        <Box flexDirection="row">
          <Text color={look.color} bold>{a.parentId ? `└ ${a.type}` : a.type}</Text>
          <Box flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
            <Text color={TEXT} wrap="truncate">{`  ${a.task}`}</Text>
          </Box>
          {a.endedAt ? <Text color={DIM}>{`  ${clockText(a.endedAt - a.startedAt)}`}</Text> : null}
        </Box>
        {agentLine(d, a)}
        {isOpen ? (
          <Box flexDirection="column" marginTop={1}>
            {a.model ? (
              <Box flexDirection="row">
                <Text color={look.color} bold>{a.effort ? `${a.model} ${a.effort}` : a.model}</Text>
                {a.why ? <Text dimColor wrap="truncate">{`  ${a.why}`}</Text> : null}
              </Box>
            ) : null}
            {a.now && a.state !== 'waiting' ? <Text dimColor wrap="truncate">{a.now}</Text> : null}
          </Box>
        ) : null}
      </Box>
      {/* A blank button layered over the card makes the whole card pressable. */}
      <Box position="absolute" top={0} left={0} right={0} bottom={0}>
        <Button key={`agent-${a.id}-press`} plain label={' '.repeat(60)} hover={{ backgroundColor: '#00000000' }} onPress={() => d.onOpen(a.id)} />
      </Box>
    </Box>
  )
}

const CARD_ART_H = ART_H
const cardArtCache = new Map<string, string>()
/** The band's art for a phase, sliced to a card's height rather than squeezed. */
export function cardArtSvg(phase: Progress['phase']): string {
  let svg = cardArtCache.get(phase)
  if (!svg) {
    svg = progressArtSvg(phase).replace(
      `width="${ART_W}" height="${ART_H}" viewBox="0 0 ${ART_W} ${ART_H}">`,
      `width="${ART_W}" height="${CARD_ART_H}" viewBox="0 0 ${ART_W} ${ART_H}" preserveAspectRatio="xMinYMin slice">`,
    )
    cardArtCache.set(phase, svg)
  }
  return svg
}

function doneCard(d: AgentsDraw, done: readonly AgentRec[]) {
  const { Box, Text, Button, Svg } = d
  const look = looks('done')
  const isOpen = d.open === 'done'
  return (
    <Box key="agents-done" position="relative" flexDirection="column" paddingX={1} overflow="hidden"
      backgroundColor={look.bg} borderStyle="round" borderColor={look.edge}>
      {Svg ? (
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <Svg source={cardArtSvg('done')} alt="finished agents" width={ART_W} height={CARD_ART_H} />
        </Box>
      ) : null}
      <Box position="relative" flexDirection="column">
        <Box position="absolute" top={0} left={0} />
        <Box flexDirection="row">
          <Text color={look.color} bold>{`✓ ${done.length} done`}</Text>
          <Box flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
            <Text dimColor wrap="truncate">  reported back</Text>
          </Box>
        </Box>
        {isOpen
          ? done.map(a => (
              <Box key={`done-${a.id}`} flexDirection="row">
                <Text color={TEXT}>{a.parentId ? `└ ${a.type}` : a.type}</Text>
                <Box flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
                  <Text dimColor wrap="truncate">{`  ${a.task}`}</Text>
                </Box>
                <Text color={DIM}>{`  ${clockText((a.endedAt ?? d.nowMs) - a.startedAt)}`}</Text>
              </Box>
            ))
          : null}
      </Box>
      <Box position="absolute" top={0} left={0} right={0} bottom={0}>
        <Button key="agents-done-press" plain label={' '.repeat(60)} hover={{ backgroundColor: '#00000000' }} onPress={() => d.onOpen('done')} />
      </Box>
    </Box>
  )
}

export function agentsPane(d: AgentsDraw, agents: readonly AgentRec[]) {
  const { Box, Text, Svg } = d
  const { live, done } = splitAgents(agents)
  const mood = moodOf(agents)
  // A desktop pane row is about 19 px; the background is drawn a little taller than the body.
  const tall = Math.max(240, (d.rows + 2) * 19)
  return (
    <Box key="agents" position="relative" flexDirection="column" height={d.rows} overflow="hidden" backgroundColor={tintHex(PANE_BG)}>
      {Svg ? (
        <Box key="agents-wash" position="absolute" top={0} left={0} right={0} bottom={0}>
          <Svg source={paneWashSvg(mood, 400, tall)} alt={`agents ${mood}`} width={400} height={tall} />
        </Box>
      ) : null}
      {Svg ? (
        <Box key="agents-mark" position="absolute" right={-7} bottom={-4}>
          <Svg source={CORNER_MARK} alt="CGP Effort" width={230} height={230} />
        </Box>
      ) : null}
      <Box position="relative" flexDirection="column" gap={1}>
        <Box position="absolute" top={0} left={0} />
        {header(d, agents)}
        {d.files.length ? mapCard(d, modulesOf(d.files, agents), moduleLinks(d.files)) : null}
        {live.map(a => agentCard(d, a))}
        {done.length ? doneCard(d, done) : null}
        {!agents.length ? <Text dimColor>  Agents show here when Claude sends some off.</Text> : null}
      </Box>
    </Box>
  )
}

/** Sample agents for `/cgp-effort agents demo`, one per state. */
export function demoAgents(nowMs: number): AgentRec[] {
  const step = (label: string, status: 'completed' | 'in_progress' | 'pending', i: number) => ({ id: `s${i}`, label, doing: label, status })
  return [
    { id: 'demo-1', type: 'Explore', task: 'find the pane and agent hooks', state: 'running', startedAt: nowMs - 103_000, model: 'Haiku', effort: 'Low', why: 'read-only search, wide but shallow', file: 'hooks/agents.tsx',
      now: 'Grep "agentId" in hooks/', steps: [step('List hooks', 'completed', 0), step('Read types', 'completed', 1), step('Find spawn', 'in_progress', 2), step('Report', 'pending', 3)] },
    { id: 'demo-2', type: 'code-reviewer', task: 'review the agent-panel branch', state: 'waiting', file: 'tests/cgp-effort.test.ts', startedAt: nowMs - 251_000, waitingSince: nowMs - 38_000, now: 'Bash npm test', model: 'Opus', effort: 'High', why: 'a review before merge: misses cost more' },
    { id: 'demo-3', type: 'Plan', task: 'outline the release notes', state: 'picking', startedAt: nowMs - 2_000 },
    { id: 'demo-4', type: 'general-purpose', task: 'add state for the panel', state: 'done', startedAt: nowMs - 400_000, endedAt: nowMs - 208_000, model: 'Sonnet', effort: 'Medium' },
    { id: 'demo-5', parentId: 'demo-4', type: 'Explore', task: 'read the tests', state: 'done', startedAt: nowMs - 380_000, endedAt: nowMs - 340_000, model: 'Haiku', effort: 'Low' },
  ]
}

export function demoFiles(nowMs: number): FileTouch[] {
  const f = (path: string, edited: boolean, imports: string[]): FileTouch => ({ path, edited, by: ['main'], lastAt: nowMs, imports })
  return [
    f('hooks/register.tsx', true, ['hooks/agents', 'hooks/progress', 'hooks/art', 'hooks/brand-mark', 'types']),
    f('hooks/agents.tsx', true, ['hooks/progress', 'hooks/brand-mark', 'types']),
    f('hooks/progress.tsx', false, ['types']),
    f('types/index.d.ts', true, []),
    f('tests/cgp-effort.test.ts', false, ['hooks/register', 'hooks/progress']),
    f('docs/agent-panel/PLAN.md', false, []),
    f('tools/render-band/render.mjs', false, []),
  ]
}

export function demoSteps(): ProgressStep[] {
  const step = (label: string, status: ProgressStep['status'], i: number): ProgressStep => ({ id: `m${i}`, label, doing: label, status })
  return [
    step('Find the hooks', 'completed', 0),
    step('Add the state', 'completed', 1),
    step('Draw the pane', 'in_progress', 2),
    step('Review the branch', 'pending', 3),
    step('Release', 'pending', 4),
  ]
}
