import { atom, read, type EngineInterface, type ModelForkResult, type RenderInput, update } from 'claude-code'
import { isStill, setStill, accent, setLight, setTheme, themedEls, tintHex } from './core/theme'
import type { AgentRec, Effort, HandoffAfter, HandoffChoice, ModelKey, Pick, SettingsDraft } from '../types'
import { ART_COLUMNS, ART_FRAME_MS, ART_MIN_WIDTH, ART_ROWS, artFrame, MOVING, type ArtKind } from './ui/pixel-art'
import { MARK_SVG } from './core/mark'
import { PILL_H, stepsFromTodos, THINK_W, thinkingSvg, withTaskCreated, withTaskUpdated } from './ui/progress'
import { agentsPane, demoAgents, demoFiles, demoSteps, importsOf, relPath, toolLine, touchOf, withTouch, withWaits } from './ui/agents-pane'
import { contextAgainst, HOT_PERCENT, hotVisible, hotWindow, resetLabel, SWAMP_REGROW, SWAMP_TOKENS, type HotClosed } from './chat/alerts'
import { warmDue, CACHE_TICK_MS, CACHE_TTL, cacheClock, cacheClockSvg, cacheColor, cacheLabel, cacheTtlOf, COLD_MIN_TOKENS, mostlyCached, REDRAW_SETTLE_MS, TURN_STALE_MS } from './chat/cache'
import { COMPACT_FADE_MS, COMPACT_MAX_CHARS, COMPACT_MODEL, COMPACT_SYSTEM, compactFadeSvg, compactTranscript } from './chat/compact'
import { cardLanded, cardRunning, COMPACT_BUTTON_MIN_COLUMNS, enterSvg, forkOutcome, GO_CELLS, GO_W, goPillSvg, HANDOFF_CARD_MS, HANDOFF_FULL_PROMPT, HANDOFF_POLL_MS, HANDOFF_PROMPT, handoffMessage, handoffWhat, type HandoffCard, withFocus } from './chat/handoff'
import { readConfig, SETTING_FIELDS, SWAMP_STEPS, type Hideable, type JudgeConfig } from './core/config'
import { proofLines, renderLog, safeLogPath, type EnvAsk } from './core/env'
import { cacheSafe, EFFORT_LABELS, EFFORTS, keyOf, MODELS, WEIGHT } from './core/models'
import { BOG, BOG_BG, BOG_EDGE, DASH_DIM, DASH_TEXT, DONE_ACCENT, DONE_BG, DONE_EDGE, EMBER, EMBER_BG, EMBER_EDGE, ICE, ICE_BG, ICE_EDGE, SLATE, SLATE_BG, SLATE_EDGE, UPDATED_BG, UPDATED_EDGE, UPDATED_HOVER, YELLOW } from './core/palette'
import { bounded, capped, looksLikeRedo, REDO_STAY_PROMPTS, tipped } from './effort/policy'
import { isWarm, markWarm, routeTo, routeWorth } from './effort/routing'
import { asSpent, EMPTY_SPENT, savedText, weighted } from './effort/spend'
import { helperFloor, helperPicks, helperQuestion } from './effort/subagents'
import { benchReport, type BenchAnswer, type BenchCase } from './judge/bench'
import { HANDOFF_CHECK_EVERY, HANDOFF_CHECK_FROM, HANDOFF_SYSTEM, handoffEvidence, parseHandoffAnswer } from './judge/handoff-advice'
import { JEV_EFFORTS, JEV_MODELS, JEV_TASK, JEV_TIMEOUT_MS, JEV_URL, parseJevAnswer, parseJevKey, safeJevUrl, UNSURE } from './judge/jev'
import { contextFrom, isFollowUp, JUDGE_SYSTEM, JUDGE_TEST_PROMPT, judgeFailure, judgeQuestion, keepsEffort, namedEffort, parseVerdict, type Judged, warned, withAttachments, withMidTurn } from './judge/judge'
import { claudeCandidates, noClaudeHint, NOT_STARTED, binSvg, GITHUB_OVER_HTTPS, isNewer, latestRelease, RELEASES_URL, RELOAD_ARGS, REPORT_BUG_URL, syncPlan, type UpdateCard, UNINSTALL_ARM_MS, UNINSTALL_RED, UPDATE_CHECK_MS, UPDATE_LOAD_WAIT_MS, UPDATE_LOADING, UPDATED_CARD_MS, updateFailure, updateSnoozed, WHATS_NEW_URL } from './plugin/update'
import { BRAND_SVG, CLAUDE_MARK, DASH_MARK_OFF, DASH_MARK_SIZE, DASH_SVG, DONE_MARK_SVG, DONE_SVG, DOWN_SVG, EMBER_SVG, FROST_HEIGHT, FROST_SVG, FROST_WIDTH, HANDOFF_SVG, INTRO_SVG, SETTINGS_MARK, SETTINGS_TITLE, SWAMP_SVG, TYPESAFE_MARK, UPDATED_GLOW_SVG } from './ui/artwork'
import { AUTO_GLOW_H, AUTO_GLOW_MS, AUTO_GLOW_W, AUTO_SLIDE_MS, COLD_GLOW_MS, FLASH_HOLD_MS, FLASH_MS, FLASH_STEPS, GLOW_BUTTON, GLOW_H, GLOW_LEVELS, GLOW_W, HANDOFF_ADVICE_LEVEL, HANDOFF_BOX_AT, HANDOFF_GLOW, HANDOFF_LOUD_AT, HANDOFF_PILL_H, HANDOFF_PILL_W, handoffGlowStep, KIND_CELLS, KIND_H, KIND_SLIDE_DELAY_MS, KIND_SLIDE_MS, KIND_W, SWITCHED_MS } from './ui/dashboard'
import { coldGlowSvg, JUDGE_FADE_MS, JUDGE_GLOW_MAX, JUDGE_PIECE_MS, JUDGE_RISE_MS, JUDGE_STEP_MS, judgeBrightnessAt } from './ui/glow'
import { CARD_CLOSE_HOVER, COMPACT_CARD_MS, inPhase, INTRO_MS, kTokens, markTitle, ringSvg, rowIconSvg, SETTINGS_BODY_H, settingsSvg } from './ui/kit'
import { BIAS_WORDS, CARDS, CONFIGURE_COMMAND, ICON_EFFORT, ICON_HANDOFF, ICON_JUDGE, ICON_SHOW, MODEL_CHOICES, SAVED_CARD_MS, type SettingsCard } from './ui/settings'
import { LEAN_STOPS, setupBack, setupCounter, setupNext, setupShown, type SetupStep } from './ui/setup'
import { dashboardLines, type TerminalBand } from './ui/terminal'

let ACCENT = accent()
function applyTheme() {
  setTheme('cgp')
  setStill(config.hide.includes('motion'))
  ACCENT = accent()
  BRAND_BG = tintHex('#15121f')
  BRAND_EDGE = tintHex('#4a3f80')
  BRAND_HEAD = tintHex('#221c3a')
  FLASH_COLOR = tintHex('#9b7bff')
  DASH_BG = '#11161b'
  DASH_EDGE = '#26303a'
  DASH_HEAD = '#151b21'
  CARD_HOVER = '#19212a'
  CARD_HOVER_EDGE = '#354452'
  HOVER_BOX = '#26313c'
  applyAppearance()
}
let claudeIsLight = false
let appearanceCheckedAt = -Infinity
function applyAppearance() {
  setLight(config.appearance === 'light' || (config.appearance === 'auto' && claudeIsLight))
}
async function refreshAppearance($: EngineInterface) {
  const now = await $.clock.now().catch(() => Date.now())
  if (now - appearanceCheckedAt < 4000) return
  appearanceCheckedAt = now
  const rows = await $.config.list().catch(() => [])
  const value = rows.find(row => row.key === 'theme')?.value
  const lightNow = typeof value === 'string' && value.startsWith('light')
  if (lightNow === claudeIsLight) return
  claudeIsLight = lightNow
  applyAppearance()
  $.ui.invalidate('ui.render')
}
let BRAND_BG = '#15121f'
let BRAND_EDGE = '#4a3f80'
let BRAND_HEAD = '#221c3a'
let HOVER_BOX = '#2b2b2f'
// `isAuto` is the effort switch (name kept: the store holds it); `isAutoModel` lets the judge pick a model.
const isAuto = atom({ plugin: 'cgp-effort', key: 'isAuto' } as const, true)
const isAutoModel = atom({ plugin: 'cgp-effort', key: 'isAutoModel' } as const, false)
const pick = atom({ plugin: 'cgp-effort', key: 'pick' } as const, null)
const isJudging = atom({ plugin: 'cgp-effort', key: 'isJudging' } as const, false)
const suggestion = atom({ plugin: 'cgp-effort', key: 'suggestion' } as const, null)
const appEffort = atom({ plugin: 'cgp-effort', key: 'appEffort' } as const, null)
const model = atom({ plugin: 'cgp-effort', key: 'model' } as const, null)
const switched = atom({ plugin: 'cgp-effort', key: 'switched' } as const, null)
const saved = atom({ plugin: 'cgp-effort', key: 'saved' } as const, EMPTY_SPENT)
const paused = atom({ plugin: 'cgp-effort', key: 'paused' } as const, false)
// Warm-cache minutes left: null before the first response, 0 when cold; written only when the minute changes.
const cacheLeft = atom({ plugin: 'cgp-effort', key: 'cacheLeft' } as const, null)
const cacheMemo = atom({ plugin: 'cgp-effort', key: 'cacheMemo' } as const, null)
const isCompacting = atom({ plugin: 'cgp-effort', key: 'isCompacting' } as const, false)
const compactAsk = atom({ plugin: 'cgp-effort', key: 'compactAsk' } as const, false)
// Not in state: a write per key would redraw the bar under the cursor.
let compactNote = ''
let compactOpenedAt = 0
const handoffStage = atom({ plugin: 'cgp-effort', key: 'handoffStage' } as const, null)
const handoffPick = atom({ plugin: 'cgp-effort', key: 'handoffPick' } as const, null)
const swamped = atom({ plugin: 'cgp-effort', key: 'swamped' } as const, null)
// Haiku's reason a handoff suits now, or null; there is no percent threshold.
const handoffAdvice = atom({ plugin: 'cgp-effort', key: 'handoffAdvice' } as const, null)
const handoffCard = atom({ plugin: 'cgp-effort', key: 'handoffCard' } as const, null)
const updateCard = atom({ plugin: 'cgp-effort', key: 'updateCard' } as const, null)
async function setHandoffCard($: EngineInterface, kind: HandoffCard['kind'], full: boolean, seen = false) {
  const at = await $.clock.now()
  await update($, handoffAdvice, () => null)
  await update($, handoffCard, () => ({ kind, full, at, seen }))
  // A timer that dies with its request leaves the next reply to clear the card.
  if (!cardRunning(kind)) {
    try {
      $.clock.after(HANDOFF_CARD_MS, () => void update($, handoffCard, card => (card && card.at === at ? null : card)))
    } catch {}
  }
}
const lastAnswer = atom({ plugin: 'cgp-effort', key: 'lastAnswer' } as const, '')
const lastTurn = atom({ plugin: 'cgp-effort', key: 'lastTurn' } as const, null)
let turnCost = 0
const swampHiddenAt = atom({ plugin: 'cgp-effort', key: 'swampHiddenAt' } as const, null)
const setupPending = atom({ plugin: 'cgp-effort', key: 'setupPending' } as const, false)
const settingsOpen = atom({ plugin: 'cgp-effort', key: 'settingsOpen' } as const, false)
const installedSkills = atom({ plugin: 'cgp-effort', key: 'installedSkills' } as const, [])
const settingsDraft = atom({ plugin: 'cgp-effort', key: 'settingsDraft' } as const, {})
const judgeDown = atom({ plugin: 'cgp-effort', key: 'judgeDown' } as const, null)
const settingsCard = atom({ plugin: 'cgp-effort', key: 'settingsCard' } as const, null)
const judgeTest = atom({ plugin: 'cgp-effort', key: 'judgeTest' } as const, null)
const judgeDownHidden = atom({ plugin: 'cgp-effort', key: 'judgeDownHidden' } as const, null)
const hot = atom({ plugin: 'cgp-effort', key: 'hot' } as const, null)
const hotHidden = atom({ plugin: 'cgp-effort', key: 'hotHidden' } as const, null as HotClosed | null)
const agentsState = atom({ plugin: 'cgp-effort', key: 'agents' } as const, [])
const agentsOpen = atom({ plugin: 'cgp-effort', key: 'agentsOpen' } as const, null)
const agentFiles = atom({ plugin: 'cgp-effort', key: 'agentFiles' } as const, [])
const agentSteps = atom({ plugin: 'cgp-effort', key: 'agentSteps' } as const, null)
const agentsModule = atom({ plugin: 'cgp-effort', key: 'agentsModule' } as const, null)
// Save mode: Auto caps at medium until this time (ms), when the limit resets.
const saveUntil = atom({ plugin: 'cgp-effort', key: 'saveUntil' } as const, null)
const isColdHidden = atom({ plugin: 'cgp-effort', key: 'isColdHidden' } as const, false)
const setupStep = atom({ plugin: 'cgp-effort', key: 'setupStep' } as const, null)
// Saved in one go at Done or ✕: each saved setting reloads the plugin and posts a notice in the chat.
const setupDraft = atom({ plugin: 'cgp-effort', key: 'setupDraft' } as const, {})
let DASH_BG = '#141416'
let DASH_EDGE = '#2a2a2f'
let introKind = ''
let introAt = 0
let introElapsed = 0
let introFresh = false
async function introShows($: EngineInterface, kind: string): Promise<boolean> {
  const now = await $.clock.now()
  if (kind !== introKind) {
    introKind = kind
    introAt = now
    introFresh = true
    $.clock.after(INTRO_MS + 100, () => $.ui.invalidate('ui.render'))
  }
  introElapsed = now - introAt
  return introElapsed < INTRO_MS
}
// Slate and pale, not gold: gold this faint on a dark panel reads brown.
function introLayer(els: { Box: unknown; Svg?: unknown }, key: string, show: boolean, wash = '#6b8599', light = '#dfe5ee') {
  if (!els.Svg || !show || isStill()) return null
  const { Box: B, Svg: S } = els as unknown as { Box: (p: Record<string, unknown>) => unknown; Svg: (p: Record<string, unknown>) => unknown }
  return (
    <B key={`${key}-intro`} position="absolute" top={-1} left={0} right={0} bottom={-1}>
      <S source={inPhase(INTRO_SVG.replace('#8b6cff', wash).replace('#b9a7ff', light), introElapsed)} alt="" width={1600} height={240} />
    </B>
  )
}
let DASH_HEAD = '#18181b'
let CARD_HOVER = '#1c1c20'
let CARD_HOVER_EDGE = '#3b3b42'
// Judge
async function recentContext($: EngineInterface): Promise<string> {
  return contextFrom(await $.session.messages())
}
/** The skill or custom command a typed "/name args" runs, or nothing for the app's own commands and CGP Effort's. */
async function typedSkill($: EngineInterface, text: string): Promise<{ name: string; description: string } | undefined> {
  const name = text.trim().slice(1).split(/\s+/)[0]
  if (!name) return undefined
  const found = (await $.command.list().catch(() => [])).find(c => c.name === name)
  if (!found || !['user', 'plugin', 'mcp'].includes(found.source) || found.plugin === 'cgp-effort') return undefined
  return { name, description: found.description ?? '' }
}
// A lower verdict for a message typed mid-turn, applied when that turn ends.
let heldPick: Pick | null = null
let askJevFile: EnvAsk | undefined
/** The TypeSafe key: secure settings, then TYPESAFE_API_KEY, then ~/.config/jev/.env (only with judge set to jev). */
async function jevKey($: EngineInterface): Promise<string | undefined> {
  if (config.typesafeKey) return config.typesafeKey
  const fromEnv = await envJevKey($)
  if (fromEnv) return fromEnv
  if (config.judge !== 'jev') return undefined
  askJevFile =
    askJevFile ??
    (async () => {
      const home = (await envUserProfile($)) ?? (await envHome($))
      if (!home) return undefined
      const text = await $.fs.read(`${home}/.config/jev/.env`).catch(() => '')
      return parseJevKey(typeof text === 'string' ? text : '')
    })()
  return askJevFile
}
function warnJudge($: EngineInterface, reason: string) {
  // A settings-panel test shows the reason on its own line: no toast, no band.
  if (judgeTesting) {
    judgeTesting.reason = reason
    return
  }
  void proof($, `judge fallback: ${reason}`)
  void update($, judgeDown, () => reason).then(() => $.ui.invalidate('ui.render'))
  if (warned.has(reason)) return
  warned.add(reason)
  $.ui.toast(`CGP Effort: ${reason}. Haiku judges for now.`)
}
let pluginOptions: Record<string, unknown> = {}
let config: JudgeConfig = {
  autoEffort: 'on',
  judge: 'auto',
  typesafeKey: '',
  handoffSkill: '',
  handoffAfter: 'continue',
  bias: 0,
  floor: 'low',
  ceiling: 'max',
  hide: ['reason'],
  swampAt: 70,
  layout: 'default',
  compactWith: 'haiku',
  handoffButton: 'advised',
  keepWarm: 'off',
  modelAuto: 'off',
  helpers: 'off',
  appearance: 'auto',
}
/** Jev first when a TypeSafe key is found; Haiku when Jev is unsure, fails or is slow. Never throws. */
async function judge($: EngineInterface, prompt: string, current: Pick | null): Promise<Judged> {
  const context = await recentContext($).catch(() => '')
  const key = config.judge !== 'haiku' ? await jevKey($).catch(() => undefined) : undefined
  if (key) {
    const jev = await askJev($, key, prompt, current, context)
    if (jev) return jev.verdict?.why === UNSURE ? haikuAfter($, jev, prompt, current, context) : jev
  }
  return askHaiku($, prompt, current, context)
}
async function haikuAfter($: EngineInterface, jev: Judged, prompt: string, current: Pick | null, context: string): Promise<Judged> {
  const haiku = await askHaiku($, prompt, current, context)
  return haiku.verdict ? { verdict: haiku.verdict, tokens: haiku.tokens + jev.tokens } : jev
}
async function askJev($: EngineInterface, key: string, prompt: string, current: Pick | null, context: string): Promise<Judged | undefined> {
  try {
    const res = await Promise.race([
      $.http.fetch(safeJevUrl(await envJevUrl($)) ?? JEV_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'jev-latest',
          state: {
            task: JEV_TASK,
            current_model: current?.model ?? null,
            current_effort: current?.effort ?? null,
            recent_conversation: context,
            next_message: prompt.slice(0, 4000),
          },
          questions: {
            effort: { type: 'choice', instructions: 'Which effort fits the next message?', criteria: JEV_EFFORTS },
            model: { type: 'choice', instructions: 'Which model fits the next message?', criteria: JEV_MODELS },
          },
        }),
      }),
      $.clock.sleep(JEV_TIMEOUT_MS).then(() => {
        throw new Error('jev timeout')
      }),
    ])
    if (!res.ok) warnJudge($, judgeFailure('Jev', res.status))
    const verdict = res.ok ? parseJevAnswer(res.text, current) : undefined
    if (verdict) {
      let used = 0
      try {
        const usage = (JSON.parse(res.text) as { usage?: { input_tokens?: number; output_tokens?: number } }).usage
        used = (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0)
      } catch {}
      if (await read($, judgeDown)) await update($, judgeDown, () => null)
      return { verdict: { ...verdict, by: 'jev' }, tokens: used }
    }
  } catch (error) {
    warnJudge($, String(error).includes('timeout') ? judgeFailure('Jev', 'timeout') : 'Jev could not be reached')
  }
  return undefined
}
// Set during a panel test: warnJudge stores its reason here instead of warning.
let judgeTesting: { reason?: string } | null = null
/** Tests the judge picked in the panel, unsaved key included; never falls back to Haiku. */
async function testJudge($: EngineInterface, judgeKind: string, draftKey: string): Promise<{ ok: boolean; text: string }> {
  const start = await $.clock.now()
  const took = async () => `${(((await $.clock.now()) - start) / 1000).toFixed(1)} s`
  const said = (name: string, j: Judged | undefined) =>
    j?.verdict?.why === UNSURE ? `${name} answered, unsure on the sample` : `${name} answered: ${j?.verdict?.effort}`
  judgeTesting = {}
  try {
    if (judgeKind === 'jev' || judgeKind === 'auto') {
      const key = parseJevKey(draftKey) ?? (draftKey.trim() || undefined) ?? (await jevKey($).catch(() => undefined)) ?? (await typesafeKeyAnywhere($).catch(() => undefined))
      if (!key && judgeKind === 'jev') return { ok: false, text: 'No TypeSafe key found' }
      if (key) {
        const j = await askJev($, key, JUDGE_TEST_PROMPT, null, '')
        if (j?.verdict) return { ok: true, text: `${said('Jev', j)} in ${await took()}` }
        return { ok: false, text: judgeTesting.reason ?? 'Jev gave no usable answer' }
      }
    }
    const h = await askHaiku($, JUDGE_TEST_PROMPT, null, '')
    return h.verdict ? { ok: true, text: `${said('Haiku', h)} in ${await took()}` } : { ok: false, text: 'Haiku gave no answer' }
  } catch (error) {
    return { ok: false, text: String(error).slice(0, 80) }
  } finally {
    judgeTesting = null
  }
}
async function askHaiku($: EngineInterface, prompt: string, current: Pick | null, context: string): Promise<Judged> {
  const used = lastContext && lastContext.window ? `Context used: ${Math.round(lastContext.percent)}% of the window` : ''
  const asked = [judgeQuestion(prompt, current, context), used].filter(Boolean).join('\n\n')
  const ask = (model: string) => $.model.complete({ model, system: JUDGE_SYSTEM, prompt: asked, maxTokens: 160, effort: 'low', timeoutMs: 6000 })
  // By name: older Claude Code maps the plain alias to Haiku 4.5, at ten times the price. The alias is the fallback.
  let r = await ask(COMPACT_MODEL)
  if (!r.isAnswered) r = await ask('haiku')
  const verdict = r.isAnswered ? parseVerdict(r.text) : undefined
  const tokens = r.isAnswered && r.usage ? r.usage.input_tokens + r.usage.output_tokens : 0
  return { verdict: verdict && { ...verdict, by: 'haiku' }, tokens }
}
let promptsSinceHandoffCheck = 0
async function checkHandoff($: EngineInterface, next: string) {
  const percent = lastContext?.percent ?? 0
  if (percent < HANDOFF_CHECK_FROM) {
    promptsSinceHandoffCheck = 0
    if ((await read($, handoffAdvice)) !== null) {
      await update($, handoffAdvice, () => null)
      $.ui.invalidate('ui.render')
    }
    return
  }
  promptsSinceHandoffCheck++
  if (promptsSinceHandoffCheck < HANDOFF_CHECK_EVERY) return
  promptsSinceHandoffCheck = 0
  try {
    const evidence = handoffEvidence(await $.session.messages(), next, percent, (await cacheMinutes($)) === 0 && cacheExpires > 0)
    const ask = (model: string) => $.model.complete({ model, system: HANDOFF_SYSTEM, prompt: evidence, maxTokens: 60, effort: 'low', timeoutMs: 8000 })
    let r = await ask(COMPACT_MODEL)
    if (!r.isAnswered) r = await ask('haiku')
    if (!r.isAnswered) return
    const reason = parseHandoffAnswer(r.text)
    void proof($, `handoff check at ${Math.round(percent)}%: ${reason ?? 'no'}`)
    if (reason !== (await read($, handoffAdvice))) {
      await update($, handoffAdvice, () => reason)
      $.ui.invalidate('ui.render')
    }
  } catch {}
}
async function runBench($: EngineInterface, cases: BenchCase[]): Promise<BenchAnswer[]> {
  const key = await typesafeKeyAnywhere($).catch(() => undefined)
  const judges: [string, (c: BenchCase) => Promise<Judged | undefined>][] = [
    ['haiku', c => askHaiku($, c.message, c.current, c.context ?? '')],
  ]
  if (key)
    judges.push([
      'jev',
      async c => {
        const jev = await askJev($, key, c.message, c.current, c.context ?? '')
        if (!jev) return askHaiku($, c.message, c.current, c.context ?? '')
        return jev.verdict?.why === UNSURE ? haikuAfter($, jev, c.message, c.current, c.context ?? '') : jev
      },
    ])
  const answers: BenchAnswer[] = []
  for (const fixed of ['medium', 'high'] as Effort[])
    for (const c of cases) answers.push({ id: c.id, judge: `always ${fixed}`, effort: fixed, ms: 0, tokens: 0 })
  const jobs = judges.flatMap(([name, ask]) => cases.map(c => ({ name, ask, c })))
  let next = 0
  const worker = async () => {
    while (next < jobs.length) {
      const { name, ask, c } = jobs[next++]
      if (keepsEffort(c.message, c.context ?? '')) {
        answers.push({ id: c.id, judge: name, effort: c.current.effort, ms: 0, tokens: 0 })
        continue
      }
      const started = await $.clock.now()
      const got = await ask(c).catch(() => undefined)
      answers.push({ id: c.id, judge: name, effort: got?.verdict?.effort, by: got?.verdict?.by, why: got?.verdict?.why, sure: got?.verdict?.sure, model: got?.verdict?.model, ms: (await $.clock.now()) - started, tokens: got?.tokens ?? 0 })
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return answers
}
async function modelIs($: EngineInterface, id: string) {
  const pause = !cacheSafe(id) && keyOf(id) !== 'haiku'
  if (pause !== (await read($, paused))) await update($, paused, () => pause)
  const key = keyOf(id)
  if (!key || key === (await read($, model))) return
  await update($, model, () => key)
  // Effort can differ per model, so a change across a switch is not the person's; a declined model may come back.
  engineEffort = undefined
  declined = null
  const current = await read($, pick)
  if (current && current.model !== key) await choose($, { ...current, model: key })
  if ((await read($, suggestion)) === key) await update($, suggestion, () => null)
}
async function sessionModel($: EngineInterface): Promise<ModelKey> {
  const id = await $.session.model()
  return MODELS.find(m => id.includes(m.key))?.key ?? 'sonnet'
}
let askLog: EnvAsk
let askTemp: EnvAsk
let askTmpdir: EnvAsk
let askModelUi: EnvAsk
let askJevUrl: EnvAsk
let askJevKey: EnvAsk
let askUserProfile: EnvAsk
let askHome: EnvAsk
const envLog = ($: EngineInterface) => (askLog = askLog ?? $.env.get('CGP_EFFORT_LOG'))
const envTemp = ($: EngineInterface) => (askTemp = askTemp ?? $.env.get('TEMP'))
const envTmpdir = ($: EngineInterface) => (askTmpdir = askTmpdir ?? $.env.get('TMPDIR'))
const envModelUi = ($: EngineInterface) => (askModelUi = askModelUi ?? $.env.get('CGP_EFFORT_MODEL_UI'))
const envJevUrl = ($: EngineInterface) => (askJevUrl = askJevUrl ?? $.env.get('JEV_URL'))
const envJevKey = ($: EngineInterface) => (askJevKey = askJevKey ?? $.env.get('TYPESAFE_API_KEY'))
const envUserProfile = ($: EngineInterface) => (askUserProfile = askUserProfile ?? $.env.get('USERPROFILE'))
const envHome = ($: EngineInterface) => (askHome = askHome ?? $.env.get('HOME'))
async function proofPath($: EngineInterface): Promise<string | undefined> {
  const named = safeLogPath(await envLog($))
  if (named) return named
  if (!$.plugin.root.replace(/\\/g, '/').includes('/dev-mods/')) return undefined
  const tmp = (await envTemp($)) ?? (await envTmpdir($)) ?? '/tmp'
  return `${tmp}/cgp-effort-proof.log`
}
async function proof($: EngineInterface, line: string) {
  const path = await proofPath($).catch(() => undefined)
  if (!path) return
  proofLines.push(`${new Date().toISOString()} ${line}`)
  await $.fs.write(path, proofLines.slice(-200).join('\n') + '\n').catch(() => undefined)
}
// The app's effort setting as last seen on a request (only the request is rewritten, never the setting).
// A change means the person set it, which wins: Auto goes off.
let engineEffort: string | undefined
// Carried over from the last chat via the store: the app's effort may overrule it.
let pickCarried = false
let lastRequest: { index: number; appModel: string; appEffort: unknown; model: string; effort: unknown; at: number } | null = null
let lastTyped = ''
let toldAboutEnter = false
let declined: ModelKey | null = null
/** Fills the prompt box for the person to send: the app's own controls follow only commands they send. Never overwrites a draft. */
async function typeCommand($: EngineInterface, text: string): Promise<boolean> {
  try {
    const draft = (await $.prompt.read()).text.trim()
    if (draft !== '' && draft !== lastTyped) return false
    const filled = await $.prompt.fill({ text })
    if (filled.isFilled) lastTyped = text
    if (filled.isFilled && !toldAboutEnter) {
      toldAboutEnter = true
      $.ui.toast(`Press Enter to send ${text} so the app's own control follows`)
    }
    return filled.isFilled
  } catch {
    return false
  }
}
/** A model change reloads the context, so it only happens when the person says yes. */
async function switchModel($: EngineInterface, model: ModelKey) {
  try {
    await $.command.run({ command: 'model', args: model })
    declined = null
    await update($, suggestion, () => null)
    const current = await read($, pick)
    if (current) await choose($, { ...current, model })
  } catch {
    $.ui.toast('Could not switch the model right now')
  }
}
async function tally(
  $: EngineInterface,
  effort: Effort,
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null },
) {
  const cached = usage.cache_read_input_tokens ?? 0
  const write = usage.cache_creation_input_tokens ?? 0
  const cost = usage.input_tokens * WEIGHT.input + write * WEIGHT.write + cached * WEIGHT.read + usage.output_tokens * WEIGHT.out
  await update($, saved, old => {
    const t = asSpent(old)
    const bucket = t.byEffort[effort] ?? { prompts: 0, cost: 0 }
    return {
      ...t,
      requests: t.requests + 1,
      input: t.input + usage.input_tokens,
      write: t.write + write,
      read: t.read + cached,
      out: t.out + usage.output_tokens,
      byEffort: { ...t.byEffort, [effort]: { ...bucket, cost: bucket.cost + cost } },
    }
  })
}
async function countPrompt($: EngineInterface, effort: Effort | undefined, by: Pick['by'] | undefined, ms: number, judgeTokens: number) {
  await update($, saved, old => {
    const t = asSpent(old)
    const judged = {
      jev: t.judge.jev + (by === 'jev' ? 1 : 0),
      haiku: t.judge.haiku + (by === 'haiku' ? 1 : 0),
      ms: t.judge.ms + ms,
      tokens: t.judge.tokens + judgeTokens,
    }
    if (!effort) return { ...t, judge: judged }
    const bucket = t.byEffort[effort] ?? { prompts: 0, cost: 0 }
    return { ...t, judge: judged, prompts: t.prompts + 1, byEffort: { ...t.byEffort, [effort]: { ...bucket, prompts: bucket.prompts + 1 } } }
  })
}
async function toggleSave($: EngineInterface): Promise<string> {
  const saving = (await read($, saveUntil)) !== null
  const heat = await read($, hot)
  const until = heat?.resetsAt ? new Date(heat.resetsAt).getTime() : (await $.clock.now()) + 5 * 3600_000
  await update($, saveUntil, () => (saving ? null : until))
  return saving ? 'save mode off' : 'save mode on, Auto stays at medium or below until the limit resets'
}
async function coldWorth($: EngineInterface): Promise<number | null> {
  if ((await read($, cacheLeft)) !== 0 || config.hide.includes('cold') || (await read($, isColdHidden))) return null
  const tokens = lastContext?.tokens
  if (coldForced) return tokens ?? 0
  return tokens !== undefined && tokens >= COLD_MIN_TOKENS ? tokens : null
}
// Cache and usage
let cacheTtl: keyof typeof CACHE_TTL = '1h'
let cacheExpires = 0
// A reload restarts the module but not the chat's cache, so the countdown is read back from session state.
let cacheRestored = false
async function restoreCache($: EngineInterface) {
  if (cacheRestored) return
  cacheRestored = true
  const memo = await read($, cacheMemo)
  if (!memo || cacheExpires !== 0 || memo.expires <= 0) {
    // A "Cold" left in shared state by the previous copy is not this chat's cache.
    if (cacheExpires === 0 && !coldForced && (await read($, cacheLeft)) === 0) await update($, cacheLeft, () => null)
    return
  }
  cacheExpires = memo.expires
  cacheTtl = memo.ttl
  lastResponseAt = memo.last
}
const rememberCache = ($: EngineInterface) => update($, cacheMemo, () => ({ expires: cacheExpires, ttl: cacheTtl, last: lastResponseAt }))
let hotClosedLoaded = false
/** Read from the store once per session: a new chat starts with the atom empty. */
async function hotClosedNow($: EngineInterface): Promise<HotClosed | null> {
  if (!hotClosedLoaded) {
    hotClosedLoaded = true
    const kept = (await $.store.get('hotClosed').catch(() => null)) as HotClosed | null
    if (kept && typeof kept.window === 'string') await update($, hotHidden, () => kept)
  }
  return read($, hotHidden)
}
async function closeHot($: EngineInterface, heat: { kind: string; percent: number; resetsAt: string | null }) {
  const closed: HotClosed = { window: hotWindow(heat), percent: heat.percent }
  await update($, hotHidden, () => closed)
  await $.store.set('hotClosed', closed).catch(() => undefined)
}
async function checkHot($: EngineInterface, limits: readonly { kind: string; percentUsed: number; resetsAt?: string }[]) {
  const windows = limits.filter(l => l.kind === 'five_hour' || l.kind === 'seven_day')
  const top = windows.sort((a, b) => b.percentUsed - a.percentUsed)[0]
  const next = top && top.percentUsed >= HOT_PERCENT ? { kind: top.kind, percent: top.percentUsed, resetsAt: top.resetsAt ?? null } : null
  const was = await read($, hot)
  if (JSON.stringify(next) !== JSON.stringify(was)) {
    await update($, hot, () => next)
    $.ui.invalidate('ui.render')
  }
  const until = await read($, saveUntil)
  if (until !== null && (await $.clock.now()) >= until) await update($, saveUntil, () => null)
}
// The swamp band waits for the turn: Compact or Handoff mid-turn would cut the reply off.
// No request for TURN_STALE_MS counts as over, so a missed end never hides the band for good.
let turnBusyAt: number | undefined
function turnBusy(): boolean {
  return turnBusyAt !== undefined && Date.now() - turnBusyAt < TURN_STALE_MS
}
async function setTurnBusy($: EngineInterface, busy: boolean) {
  const was = turnBusyAt !== undefined
  turnBusyAt = busy ? Date.now() : undefined
  if (was !== busy) $.ui.invalidate('ui.render')
}
/** A fake context percent from ~/.claude/cgp-effort-preview.json ({"contextPercent": 45}), to check levels on screen. */
async function previewPercent($: EngineInterface): Promise<number | undefined> {
  const home = (await envUserProfile($)) ?? (await envHome($))
  if (!home) return undefined
  const text = await $.fs.read(`${home}/.claude/cgp-effort-preview.json`).catch(() => '')
  if (!text) return undefined
  try {
    const n = Number((JSON.parse(text) as { contextPercent?: unknown }).contextPercent)
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : undefined
  } catch {
    return undefined
  }
}
// The compaction window and the model window it was read for; read again when the model's window changes.
let compactWindow: { model: number; at: number | undefined } | undefined
async function compactWindowFor($: EngineInterface, context: { tokens?: number; window: number }): Promise<number | undefined> {
  if (!context.window) return undefined
  if (compactWindow?.model === context.window) return compactWindow.at
  // The breakdown needs a response in the session first.
  if (context.tokens === undefined) return undefined
  const usage = await $.session.usage({ breakdown: 'summary' }).catch(() => undefined)
  // Kept when missing too, so the 15 s check does not ask again each time.
  const at = usage?.context.breakdown?.rawMaxTokens || undefined
  compactWindow = { model: context.window, at }
  if (at) void proof($, `context window ${context.window}, compacts at ${at} (${usage?.context.breakdown?.autocompactSource ?? '?'})`)
  return at
}

async function checkSwamp($: EngineInterface) {
  const usage = await $.session.usage()
  const rateLimits = usage.rateLimits
  const context = contextAgainst(usage.context, await compactWindowFor($, usage.context))
  const preview = await previewPercent($)
  const tokens = preview === undefined ? (context.tokens ?? 0) : Math.round(((context.window || 200_000) * preview) / 100)
  const percent = preview ?? (context.percent || (context.window ? (tokens / context.window) * 100 : 0))
  if (preview !== undefined && !context.window) context.window = 200_000
  const wasStep = handoffGlowStep(lastContext?.percent ?? 0)
  lastContext = { tokens, window: context.window ?? 0, percent }
  if (handoffGlowStep(percent) !== wasStep) $.ui.invalidate('ui.render')
  await checkHot($, rateLimits ?? [])
  const over = percent >= config.swampAt
  const next = over ? tokens : null
  if (next !== (await read($, swamped))) {
    await update($, swamped, () => next)
    $.ui.invalidate('ui.render')
  }
}
// A reopened chat may draw the band before it is ready, so the 1 s timer asks again a few times.
let redrawsOwed = 0
let clockMinute = -1
// Once the band is drawn after this, no redraws are owed: each one restarts the band's animations.
let redrawAskedAt = 0
function redrawSoon(times = 5) {
  redrawsOwed = Math.max(redrawsOwed, times)
  redrawAskedAt = Date.now()
}
// Keeping the cache warm: when the person last sent a message, and what the warm-ups did.
let lastPromptAt: number | undefined
let lastWarmAt = 0
let warming = false
let warmUps = 0
let warmCost = 0
/** Reads the chat once from cache (a fork with a one-word reply), which restarts the cache's lifetime. */
async function keepWarm($: EngineInterface) {
  if (warming || config.keepWarm === 'off') return
  const now = await $.clock.now().catch(() => Date.now())
  const s = { now, expires: cacheExpires, ttl: cacheTtl, lastPrompt: lastPromptAt, lastWarm: lastWarmAt, keep: config.keepWarm, busy: turnBusy() || (await read($, isCompacting)), tokens: lastContext?.tokens !== undefined && lastContext.tokens >= COLD_MIN_TOKENS ? lastContext.tokens : null }
  if (!warmDue(s)) return
  warming = true
  lastWarmAt = now
  try {
    const r = await $.model.fork({ prompt: 'Reply with the single word ok. Nothing else.' })
    if (r.isAnswered && r.usage) {
      warmUps++
      warmCost += weighted(r.usage)
      void proof($, `kept the cache warm: ${JSON.stringify(r.usage)}`)
      await cacheTouched($, r.usage)
    } else void proof($, `warm-up got no reply: ${'reason' in r ? r.reason : '?'}`)
  } finally {
    warming = false
  }
}
async function showCache($: EngineInterface) {
  void keepWarm($).catch(() => undefined)
  // No response seen by this copy yet: a 0 left by an earlier copy is not this chat's cache.
  if (cacheExpires === 0) {
    if (!coldForced && (await read($, cacheLeft)) !== null) {
      await update($, cacheLeft, () => null)
      $.ui.invalidate('ui.render')
    }
    return
  }
  const minutes = await cacheMinutes($)
  const was = await read($, cacheLeft)
  if (minutes === was) return
  await update($, cacheLeft, () => minutes)
  // The desktop app redraws the band above the prompt only when asked.
  if ((minutes === 0) !== (was === 0)) $.ui.invalidate('ui.render')
}
async function cacheMinutes($: EngineInterface): Promise<number> {
  const left = cacheExpires - (await $.clock.now())
  return left <= 0 ? 0 : Math.ceil(left / 60_000)
}
let usageLogged = false
let lastResponseAt: number | undefined
let repliesSeen = 0
async function cacheTouched($: EngineInterface, usage: unknown) {
  const now = await $.clock.now()
  repliesSeen++
  if (!usageLogged) {
    usageLogged = true
    void proof($, `first response usage: ${JSON.stringify(usage)}`)
  }
  // No TTL in the response: a cache read after more than 5 minutes means 1 hour.
  const ttl = cacheTtlOf(usage) ?? (lastResponseAt !== undefined && now - lastResponseAt > CACHE_TTL['5m'] && mostlyCached(usage) ? '1h' : undefined)
  lastResponseAt = now
  coldForced = false
  // A 5m tail write still reads the rest from the 1h cache: once 1h is seen, 5m never lowers the countdown.
  if (ttl && ttl !== cacheTtl && !(ttl === '5m' && cacheTtl === '1h' && mostlyCached(usage))) {
    cacheTtl = ttl
    void proof($, `cache lifetime ${ttl}`)
  }
  cacheExpires = now + CACHE_TTL[cacheTtl]
  await rememberCache($)
  if (await read($, isColdHidden)) await update($, isColdHidden, () => false)
  await showCache($)
}
/** Compacts once the cache is cold: the next message would rewrite the whole context to the cache anyway. */
async function compactCold($: EngineInterface, note = '') {
  if (await read($, isCompacting)) return
  await update($, compactAsk, () => false)
  await update($, isCompacting, () => true)
  await setHandoffCard($, 'compacting', false)
  let compacted = false
  try {
    // /compact as if typed waits for idle; $.session.compact() is refused while the app counts a turn as running.
    await $.command.run({ command: 'compact', args: note.trim() })
    cacheExpires = 0
    await rememberCache($)
    await update($, cacheLeft, () => null)
    compacted = true
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error)
    void proof($, `compact failed: ${why}`)
    $.ui.toast(`CGP Effort: compact failed: ${why.slice(0, 140)}`)
  } finally {
    await update($, isCompacting, () => false)
    if (compacted) {
      await setHandoffCard($, 'compacted', false)
      $.clock.after(COMPACT_CARD_MS + 100, () => $.ui.invalidate('ui.render'))
    } else await update($, handoffCard, card => (card?.kind === 'compacting' ? null : card))
  }
}
// Handoff
let handoffText: string | undefined
let handoffDriving = false
// Begun from the session timer: the app refuses a prompt sent from a command or a press.
let handoffQueued = false
let handoffFull = false
let handoffThen: HandoffAfter = 'continue'
/** What the next chat is for, from /cgp-effort handoff <focus>; empty from the bar. */
let handoffFocus = ''
async function startHandoff($: EngineInterface, full = false, after: HandoffAfter = config.handoffAfter, focus = '') {
  if ((await read($, handoffStage)) !== null) return
  handoffFocus = focus
  await update($, handoffStage, () => 'writing')
  handoffFull = full
  handoffThen = after
  handoffQueued = true
  await setHandoffCard($, 'writing', handoffFull)
}
async function lastHandoffChoice($: EngineInterface): Promise<HandoffChoice> {
  const kept = (await $.store.get('handoffChoice').catch(() => null)) as Partial<HandoffChoice> | null
  const kind = kept?.kind === 'full' ? 'full' : 'quick'
  const after = (['continue', 'confirm', 'copy'] as const).find(a => a === kept?.after) ?? config.handoffAfter
  return { kind, after }
}
async function openHandoffBar($: EngineInterface) {
  if ((await read($, handoffStage)) !== null) return
  const choice = await lastHandoffChoice($)
  await update($, handoffPick, () => choice)
  $.ui.invalidate('ui.render')
}
async function openCompact($: EngineInterface, e: { surface: string }) {
  if (e.surface === 'terminal') return compactCold($)
  compactNote = ''
  compactOpenedAt = await $.clock.now()
  await update($, compactAsk, () => true)
}
async function closeHandoffBar($: EngineInterface) {
  await update($, handoffPick, () => null)
  $.ui.invalidate('ui.render')
}
async function goHandoff($: EngineInterface, choice: HandoffChoice) {
  await $.store.set('handoffChoice', choice).catch(() => undefined)
  await closeHandoffBar($)
  await startHandoff($, choice.kind === 'full', choice.after)
}
/** Quick: a fork with the built-in prompt. Full: the person's skill as a turn. Runs from the timer. */
async function writeHandoff($: EngineInterface) {
  if (!handoffQueued) return
  handoffQueued = false
  try {
    if (handoffFull) {
      if (config.handoffSkill) await $.command.run({ command: config.handoffSkill, args: handoffFocus })
      else await $.prompt.submit({ text: withFocus(HANDOFF_FULL_PROMPT, handoffFocus) })
      return
    }
    // Cold cache: a fork would reread and rewrite the whole chat at full price, so Haiku writes it from the transcript.
    const now = await $.clock.now().catch(() => Date.now())
    if ((await read($, cacheLeft)) === 0 || (cacheExpires > 0 && now >= cacheExpires)) {
      const messages = await $.session.messages().catch(() => [])
      const got = messages.length ? await haikuHandoff($, messages, handoffFocus).catch(() => null) : null
      await $.store.set('lastFork', { at: Date.now(), outcome: got ? 'cold cache: written by Haiku' : 'cold cache: Haiku failed, forked' }).catch(() => undefined)
      if (got) {
        handoffText = got
        return
      }
    }
    const startedAt = Date.now()
    const forked = await $.model.fork({ prompt: withFocus(HANDOFF_PROMPT, handoffFocus) }).catch((error: unknown) => error)
    const outcome = forkOutcome(forked, Date.now() - startedAt)
    // In the store: before a chat's first message the session may restart and lose its variables.
    await $.store.set('lastFork', { at: Date.now(), outcome }).catch(() => undefined)
    const answered = forked as ModelForkResult
    if (answered?.isAnswered && answered.text.trim()) {
      handoffText = answered.text
      return
    }
    if (!outcome.startsWith('nothing-to-fork')) $.ui.toast(`CGP Effort: the fork wrote no handoff (${outcome}); writing it as a turn`)
    await $.prompt.submit({ text: withFocus(HANDOFF_PROMPT, handoffFocus) })
  } catch (error) {
    await update($, handoffStage, () => null)
    $.ui.toast(`CGP Effort: handoff failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 140)}`)
  }
}
export async function finishHandoff($: EngineInterface) {
  await writeHandoff($)
  if (handoffText === undefined || handoffDriving) return
  handoffDriving = true
  const text = handoffText
  handoffText = undefined
  try {
    if (handoffThen === 'copy') {
      const message = handoffMessage(text, 'continue', handoffFull ? config.handoffSkill : undefined)
      const copied = await $.ui.copy({ text: message }).catch(() => ({ isCopied: false as const }))
      // seen: under the current reply, so the next reply removes it.
      await setHandoffCard($, 'copied', handoffFull, true)
      if (copied.isCopied) $.ui.toast('CGP Effort: handoff copied. Paste it into a new chat.')
      else {
        await $.prompt.fill({ text: message, mode: 'replace' })
        $.ui.toast('CGP Effort: the clipboard refused, so the handoff is in the prompt box')
      }
      return
    }
    await update($, handoffStage, () => 'clearing')
    await $.command.run({ command: 'clear', args: '' })
    await setHandoffCard($, 'done', handoffFull)
    await $.prompt.submit({ text: handoffMessage(text, handoffThen, handoffFull ? config.handoffSkill : undefined) })
  } catch (error) {
    await update($, handoffCard, () => null)
    $.ui.toast(`CGP Effort: handoff failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 140)}`)
  } finally {
    handoffDriving = false
    await update($, handoffStage, () => null)
  }
}
// Settings and setup
async function loadInstalledSkills($: EngineInterface) {
  // Read once here, not while drawing: a slow or refused lookup must not cost the panel.
  const installed = await $.command.list().catch(() => [])
  // At most 25, handoff-like first: the picker slot takes no more.
  const names = [...new Set(installed.filter(c => c.source === 'user' || c.source === 'plugin').map(c => c.name))]
    .filter(name => !name.startsWith('cgp-effort'))
    .sort((a, b) => Number(!/handoff/i.test(a)) - Number(!/handoff/i.test(b)) || a.localeCompare(b))
    .slice(0, 25)
  await update($, installedSkills, () => names)
}
/** Our own panel: the app does not let a plugin open its /plugin dialog. */
async function openPluginSettings($: EngineInterface) {
  await loadInstalledSkills($)
  await update($, settingsOpen, () => true)
  // Before the first message the session may restart per command, so the request also goes to the store,
  // tagged with this session because every chat shares the store.
  await $.store.set('openSettingsAt', { at: Date.now(), session: await $.session.id().catch(() => '') })
  $.ui.invalidate('ui.render')
}
async function saveSetting($: EngineInterface, field: keyof typeof SETTING_FIELDS, value: string) {
  const { deny } = await $.config
    .set({ key: `cgp-effort.${SETTING_FIELDS[field]}`, value })
    .catch((error: unknown) => ({ deny: error instanceof Error ? error.message : String(error) }))
  // Some builds refuse a plugin's /config write: the value is kept in the store and read back at session start.
  const kept = ((await $.store.get('savedSettings').catch(() => null)) ?? {}) as Record<string, string>
  const { [SETTING_FIELDS[field]]: _old, ...others } = kept
  const stored = await $.store
    .set('savedSettings', deny ? { ...kept, [SETTING_FIELDS[field]]: value } : others)
    .then(() => true)
    .catch(() => false)
  if (deny && !stored) $.ui.toast(`CGP Effort: could not save ${field}: ${String(deny).slice(0, 120)}`)
  const raw: Record<string, unknown> = {
    judge: config.judge,
    effortBias: String(config.bias),
    effortFloor: config.floor,
    effortCeiling: config.ceiling,
    handoffAfter: config.handoffAfter,
    handoffSkill: config.handoffSkill,
    hide: config.hide.join(','),
    swampAt: String(config.swampAt),
    layout: config.layout,
    compactWith: config.compactWith,
    handoffButton: config.handoffButton,
    keepWarm: config.keepWarm,
    autoEffort: config.autoEffort,
    modelAuto: config.modelAuto,
    helpers: config.helpers,
    appearance: config.appearance,
    [SETTING_FIELDS[field]]: value,
  }
  config = { ...readConfig(raw), typesafeKey: config.typesafeKey }
  applyTheme()
  $.ui.invalidate('ui.render')
}
function savedCardTree($: EngineInterface, e: RenderInput<'AbovePrompt'>) {
  const { Box, Text } = themedEls($.ui.resolve(e))
  return (
    <Box key="saved" flexDirection="row" alignItems="center" gap={1} paddingX={1} backgroundColor={DASH_BG} borderStyle="round" borderColor={DASH_EDGE}>
      <Text color={ACCENT}>✓</Text>
      <Text bold>Settings saved</Text>
    </Box>
  )
}
async function saveDraft($: EngineInterface) {
  const draft = await read($, settingsDraft)
  const { key, ...rest } = draft
  if (key?.trim()) await saveJevKey($, key, false)
  const changes: Record<string, string> = {}
  for (const field of Object.keys(SETTING_FIELDS) as (keyof typeof SETTING_FIELDS)[]) {
    const value = rest[field]
    if (value !== undefined) changes[field] = value
  }
  if (key?.trim() && (changes.judge ?? config.judge) !== 'jev') changes.judge = 'jev'
  await update($, settingsDraft, () => ({}))
  await update($, settingsOpen, () => false)
  // In the store: each written setting reloads the plugin.
  await $.store.set('settingsSavedAt', await $.clock.now().catch(() => Date.now()))
  $.ui.invalidate('ui.render')
  await $.store.set('setupSave', changes)
  await drainSetupSave($)
}
/** Saves to the sensitive setting (secure storage); a refused write drops the key, never writing it to a file. */
async function saveJevKey($: EngineInterface, key: string, setJudge = true) {
  const clean = parseJevKey(key) ?? key.trim()
  if (!clean) return
  const { deny } = await $.config
    .set({ key: 'cgp-effort.typesafeKey', value: clean })
    .catch((error: unknown) => ({ deny: error instanceof Error ? error.message : String(error) }))
  if (deny) {
    $.ui.toast(`CGP Effort: the key was not saved (${String(deny).slice(0, 80)}). Use ${CONFIGURE_COMMAND}.`)
    return
  }
  config = { ...config, typesafeKey: clean }
  if (setJudge && config.judge !== 'jev') await saveSetting($, 'judge', 'jev')
  await update($, judgeDown, () => null)
  warned.clear()
  $.ui.toast('CGP Effort: key saved in secure storage. Jev judges from the next message.')
  $.ui.invalidate('ui.render')
}
async function findTypesafeKey($: EngineInterface): Promise<boolean> {
  return Boolean(await typesafeKeyAnywhere($))
}
/** Like jevKey, but reads ~/.config/jev/.env whatever the judge setting. */
async function typesafeKeyAnywhere($: EngineInterface): Promise<string | undefined> {
  const known = config.typesafeKey || (await envJevKey($))
  if (known) return known
  const home = (await envUserProfile($)) ?? (await envHome($))
  if (!home) return undefined
  const text = await $.fs.read(`${home}/.config/jev/.env`).catch(() => '')
  return parseJevKey(typeof text === 'string' ? text : '')
}
async function goSetup($: EngineInterface, step: SetupStep | null) {
  if (step === 'handoff') await loadInstalledSkills($)
  await update($, setupStep, () => step)
}
async function flushSetup($: EngineInterface) {
  const draft = await read($, setupDraft)
  await update($, setupDraft, () => ({}))
  const saved: Record<string, string> = {
    judge: config.judge,
    bias: String(config.bias),
    handoffSkill: config.handoffSkill,
    hide: config.hide.join(','),
    appearance: config.appearance,
  }
  const changes: Record<string, string> = {}
  for (const field of ['hide', 'judge', 'bias', 'handoffSkill', 'appearance'] as const) {
    const value = draft[field]
    if (value !== undefined && value.trim() !== saved[field]) changes[field] = value.trim()
  }
  await $.store.set('setupSave', changes)
  await drainSetupSave($)
}
let drainingSetup = false
// Each saved setting reloads the plugin and cuts this loop off, so a field leaves the store queue before it is
// saved and the reloaded plugin carries on with the rest.
async function drainSetupSave($: EngineInterface) {
  if (drainingSetup) return
  drainingSetup = true
  try {
    for (;;) {
      const queue = ((await $.store.get('setupSave').catch(() => null)) ?? {}) as Record<string, string>
      const [field] = Object.keys(queue)
      if (!field) return
      const { [field]: value, ...rest } = queue
      await $.store.set('setupSave', Object.keys(rest).length ? rest : null)
      if (field in SETTING_FIELDS) await saveSetting($, field as keyof typeof SETTING_FIELDS, value)
    }
  } finally {
    drainingSetup = false
  }
}
async function markSetupDone($: EngineInterface) {
  await Promise.all([update($, setupPending, () => false), $.store.set('setupDone', true)])
}
async function finishSetup($: EngineInterface) {
  await markSetupDone($)
  await goSetup($, null)
  await flushSetup($)
}
async function closeSetup($: EngineInterface) {
  await goSetup($, null)
  await flushSetup($)
}
async function pickJudge($: EngineInterface, choice: 'haiku' | 'jev') {
  // Haiku is saved as Auto: Jev whenever a TypeSafe key is there, else Haiku.
  await update($, setupDraft, d => ({ ...d, judge: choice === 'haiku' ? 'auto' : choice }))
  await markSetupDone($)
  if (choice === 'haiku') {
    $.ui.toast('CGP Effort: Haiku 5.5 judges, no key needed. Add a Jev key later for faster answers.')
    return goSetup($, 'lean')
  }
  if (choice === 'jev' && (await findTypesafeKey($))) {
    $.ui.toast('CGP Effort: Jev judges with the TypeSafe key it found.')
    return goSetup($, 'lean')
  }
  await goSetup($, choice)
}
async function pickEffort($: EngineInterface, level: Effort) {
  const t0 = Date.now()
  const inUse = (await read($, model)) ?? (await sessionModel($))
  const t1 = Date.now()
  // Together, so the app redraws once per click, not once per write.
  await Promise.all([
    update($, isAuto, () => false),
    $.store.set('isAuto', false),
    choose($, { model: inUse, effort: level, why: 'your pick', by: 'manual' }),
  ])
  const t2 = Date.now()
  await typeCommand($, `/effort ${level}`)
  const t3 = Date.now()
  void proof($, `click ${level}: ${t3 - t0} ms (read ${t1 - t0}, state ${t2 - t1}, typed command ${t3 - t2})`)
}
/** The Auto switch, unless the settings switched Auto effort off for good. */
async function autoOn($: EngineInterface) {
  return config.autoEffort === 'on' && (await read($, isAuto))
}
async function toggleAutoEffort($: EngineInterface) {
  if (config.autoEffort === 'off') {
    $.ui.toast('CGP Effort: Auto effort is switched off in Settings (Effort card). The effort is yours.')
    return
  }
  const turnOn = !(await read($, isAuto))
  await update($, isAuto, () => turnOn)
  await $.store.set('isAuto', turnOn)
}
async function choose($: EngineInterface, next: Pick | null) {
  pickCarried = false
  const before = await read($, pick)
  await Promise.all([update($, pick, () => next), $.store.set('pick', next)])
  if (next && next.by !== 'manual' && before && before.model !== 'haiku' && before.effort !== next.effort) {
    const change = { from: before.effort, to: next.effort }
    await update($, switched, () => change)
    $.clock.after(SWITCHED_MS, () => void update($, switched, () => null))
  }
}
let lastContext: { tokens: number; window: number; percent: number } | null = null
async function snap($: EngineInterface) {
  const [auto, autoModel, current, judging, wanted, shownByApp, modelNow, switchedNow, pausedNow, cacheNow, compacting] = await Promise.all([
    autoOn($),
    read($, isAutoModel),
    read($, pick),
    read($, isJudging),
    read($, suggestion),
    read($, appEffort),
    read($, model),
    read($, switched),
    read($, paused),
    read($, cacheLeft),
    read($, isCompacting),
  ])
  return { auto, autoModel, current, judging, wanted, shownByApp, modelNow, switchedNow, pausedNow, cacheNow, compacting }
}
type Snap = Awaited<ReturnType<typeof snap>>
function hoverTips(v: Snap): { effort: string; cache: string } {
  const effortTip = !v.auto
    ? 'Auto is off: the effort stays as you set it. The ○ at the bottom turns Auto on.'
    : v.pausedNow
      ? 'Auto waits on this model: an effort change would rewrite its prompt cache.'
      : !effortOf(v, v.modelNow ?? 'sonnet')
        ? 'This model runs without an effort level, so Auto has nothing to set.'
      : [
          v.current ? `Auto picked ${EFFORT_LABELS[v.current.effort]}${v.current.by !== 'manual' ? ` (${v.current.by})` : ''}` : 'Auto picks the effort for each message',
          v.current?.why ? `Why: ${v.current.why}` : '',
          `Lean: ${['much cheaper', 'cheaper', 'as the judge says', 'smarter', 'much smarter'][config.bias + 2]} · range ${config.floor} to ${config.ceiling}`,
        ]
          .filter(Boolean)
          .join(' · ')
  const ctx = lastContext && lastContext.window ? ` · Context ${lastContext.percent}% · ${kTokens(lastContext.tokens)}/${kTokens(lastContext.window)}` : ''
  const cacheTip =
    v.cacheNow === 0
      ? `Prompt cache cold: the next message reads the whole chat again at full price. Compact first to save.${ctx}`
      : `Prompt cache warm for ${cacheLabel(v.cacheNow ?? 0)} more: the next message reads the chat from cache, cheap and fast.${config.keepWarm !== 'off' ? ` Kept warm on big chats for ${config.keepWarm} after your last message.` : ''}${ctx}`
  return { effort: effortTip, cache: cacheTip }
}
function effortOf(v: Snap, inUse: ModelKey): Effort | undefined {
  if (inUse === 'haiku') return undefined
  if (v.current) return v.current.effort
  return EFFORTS.includes(v.shownByApp as Effort) ? (v.shownByApp as Effort) : undefined
}
// /cgp-effort probe N: 1 a bare box, 2 the panel's frame and header only, 3 the panel without pickers or fields.
let probeLevel = 0
let renderCalls = 0
let lastRenderProps = ''
let lastRenderBranch = ''
let renderLogWritten = 0
async function writeRenderLog($: EngineInterface) {
  if (renderLog.length === renderLogWritten) return
  if (renderLog.length > 600) renderLog.splice(0, renderLog.length - 300)
  renderLogWritten = renderLog.length
  const home = (await envUserProfile($)) ?? (await envHome($))
  // One file per chat: a shared file is overwritten by whichever chat drew last.
  if (home) await $.fs.write(`${home}/.claude/cgp-effort-render-${loadedSession}.log`, renderLog.slice(-300).join('\n') + '\n').catch(() => undefined)
}
let lastRenderAt = 0
let loadedSession = '-'
let loadedAt = Date.now()
let firstDrawLogged = false
let drawsTimed = 0
let lastRenderError = ''
let sessionStarted = 0
let classicStart: { at: number; said: string } | null = null
// /cgp-effort cold: show the band whatever the chat's size, until the next response.
let coldForced = false
let handoffTimer: { cancel: () => void } | undefined
// A cheaper model for this prompt's requests, else null. The chat's model stays, so its cache stays warm.
let routed: ModelKey | null = null
// Prompts left on the chat's model after a cheaper answer was redone.
let stayUp = 0
let lastHaikuCompact = 0
// A blit the surface refuses (the band went away) ends the art timer, so nothing has to stop it from outside.
let artTimer: { cancel(): void } | null = null
let artShown: { requestId: string; kind: ArtKind } | null = null
let artFrameCount = 0
function bandArt($: EngineInterface, e: RenderInput<'AbovePrompt'>, kind: ArtKind) {
  const els = themedEls($.ui.resolve(e))
  const columns = typeof e.props.bodyColumns === 'number' ? e.props.bodyColumns : 0
  if (e.surface !== 'terminal' || !('Raster' in els) || columns < ART_MIN_WIDTH) return null
  // The still sparkles read as noise at 16 by 4 pixels: only the art that says something stays.
  if (kind === 'calm' || kind === 'brand') return null
  const { Box, Raster } = els
  artShown = { requestId: e.requestId, kind }
  if (MOVING.has(kind) && !artTimer && !isStill()) {
    artTimer = $.clock.every(ART_FRAME_MS, () => {
      const shown = artShown
      if (!shown || !MOVING.has(shown.kind)) {
        artTimer?.cancel()
        artTimer = null
        return
      }
      artFrameCount++
      void $.ui
        .blit({ requestId: shown.requestId, key: 'art', cells: artFrame(shown.kind, artFrameCount) })
        .then(r => {
          if ('deny' in r && r.deny) {
            artTimer?.cancel()
            artTimer = null
          }
        })
        .catch(() => undefined)
    })
  }
  return (
    <Box key="art-box" flexShrink={0}>
      <Raster key="art" columns={ART_COLUMNS} rows={ART_ROWS} cells={artFrame(kind, artFrameCount)} />
    </Box>
  )
}
/** Controls get a wrapping row of their own, so nothing is cut at 80 columns. */
function terminalPanel($: EngineInterface, e: RenderInput<'AbovePrompt'>, key: string, title: string, words: unknown, controls: unknown[]) {
  const { Box, Text } = themedEls($.ui.resolve(e))
  return (
    <Box key={key} flexDirection="column" paddingX={1} backgroundColor={BRAND_BG} borderStyle="round" borderColor={BRAND_EDGE}>
      <Box flexDirection="row" gap={1} alignItems="center">
        <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
          <Text color={ACCENT} bold wrap="truncate">{title}</Text>
          {typeof words === 'string' ? <Text key={`${key}-what`} dimColor wrap="truncate">{words}</Text> : words}
        </Box>
        {bandArt($, e, 'brand')}
      </Box>
      <Box key={`${key}-actions`} flexDirection="row" flexWrap="wrap" justifyContent="flex-end" columnGap={1} alignItems="center">
        {controls}
      </Box>
    </Box>
  )
}
async function terminalBand($: EngineInterface, e: RenderInput<'AbovePrompt'>, b: TerminalBand) {
  const { Box, Text } = themedEls($.ui.resolve(e))
  const { rows } = await effortRows($, e, { auto: !b.autoInBar })
  return (
    <Box key={`${b.key}-col`} flexDirection="column">
      <Box key={b.key} flexDirection="row" gap={1} alignItems="center" paddingX={1} backgroundColor={b.bg} borderStyle="round" borderColor={b.edge}>
        <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
          <Box flexDirection="row" gap={1} alignItems="center">
            <Box flexShrink={0}>
              {b.word ? (
                <Box flexDirection="row">
                  <Text color={b.color} bold>{'✦ '}</Text>
                  <Text key={`${b.key}-word`} color={b.word.color} bold>{b.word.text}</Text>
                  <Text color={b.color} bold>{b.word.rest}</Text>
                </Box>
              ) : (
                <Text color={b.color} bold>{`✦ ${b.title}`}</Text>
              )}
            </Box>
            <Box flexGrow={1} />
            {b.buttons}
          </Box>
          <Text dimColor wrap="truncate">{b.detail}</Text>
        </Box>
        {bandArt($, e, b.kind)}
      </Box>
      {rows}
    </Box>
  )
}
let FLASH_COLOR = '#9b7bff'
export function flashColor(ms: number | null): string {
  if (ms === null || ms >= FLASH_MS) return DASH_TEXT
  if (ms < FLASH_HOLD_MS) return FLASH_COLOR
  const k = [...FLASH_STEPS].reverse().find(([at]) => ms >= at)?.[1] ?? 0
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2].map(i => Math.round(ch(FLASH_COLOR, i) + (ch(DASH_TEXT, i) - ch(FLASH_COLOR, i)) * k).toString(16).padStart(2, '0')).join('')}`
}
let flashWord: string | null = null
let flashAt: number | null = null
async function effortFlash($: EngineInterface, what: string, judging: boolean, entering = false): Promise<string> {
  const now = await $.clock.now()
  // A change made while the dashboard was away (handoff, settings, an alert) is not a switch to point at.
  if (entering && !judging) {
    flashWord = what
    flashAt = null
  }
  if (!judging) {
    // Auto turned off or on is not a verdict: the word changes without the flash.
    if (flashWord !== null && flashWord !== what) flashAt = what === 'Off' || flashWord === 'Off' ? null : now
    flashWord = what
  }
  const since = flashAt === null ? null : now - flashAt
  if (since === 0) {
    for (const at of [...FLASH_STEPS.map(([t]) => t), FLASH_MS]) $.clock.after(at + 20, () => $.ui.invalidate('ui.render'))
  }
  return flashColor(since)
}
let uninstallArmedAt = 0
let uninstalling = false
function uninstallButton($: EngineInterface, els: ReturnType<EngineInterface['ui']['resolve']>) {
  const { Box, Text, Button, Svg } = els
  const armed = Date.now() - uninstallArmedAt < UNINSTALL_ARM_MS
  const press = async () => {
    if (uninstalling) return
    if (!armed) {
      uninstallArmedAt = Date.now()
      $.ui.invalidate('ui.render')
      $.clock.after(UNINSTALL_ARM_MS + 50, () => $.ui.invalidate('ui.render'))
      return
    }
    uninstalling = true
    $.ui.invalidate('ui.render')
    const r = await runClaude($, ['plugin', 'uninstall', pluginId($)], { timeoutMs: 120_000 }).catch(error => ({ exitCode: 1, stdout: '', stderr: String(error) }))
    uninstalling = false
    if (r.exitCode !== 0) {
      const why = (r.stderr || r.stdout).trim().split('\n').pop() ?? ''
      $.ui.toast(`CGP Effort: uninstall failed: ${noClaudeHint(why, await homeDir($)) ?? why}`)
      $.ui.invalidate('ui.render')
      return
    }
    $.ui.toast('CGP Effort is uninstalled.')
    const reloaded = await $.command.run({ command: 'reload-plugins', args: RELOAD_ARGS } as never).then(() => true, () => false)
    if (!reloaded) await typeCommand($, `/reload-plugins ${RELOAD_ARGS}`)
  }
  const label = uninstalling ? 'Uninstalling…' : armed ? 'Press again to uninstall' : 'Uninstall'
  if (!Svg) return <Button key="settings-uninstall" plain dimColor={!armed} label={label} onPress={press} />
  // The red bin lies over the grey one since a hover can only reveal; a blank button over both takes the press.
  const red = armed || uninstalling
  return (
    <Box key="settings-uninstall-box" position="relative" flexDirection="row" alignItems="center" flexShrink={0}>
      <Box position="relative" width={2} height={1} alignItems="center">
        <Box position="absolute" top={0} left={0}>
          <Svg source={binSvg(DASH_DIM)} alt="bin" width={14} height={14} />
        </Box>
        <Box position="absolute" top={0} left={0} display={red ? 'flex' : 'none'} hover={red ? undefined : { scope: 'uninstall', display: 'flex' }}>
          <Svg source={binSvg(UNINSTALL_RED)} alt="bin" width={14} height={14} />
        </Box>
      </Box>
      <Text color={red ? UNINSTALL_RED : DASH_DIM} hover={{ scope: 'uninstall', color: UNINSTALL_RED }}>{label}</Text>
      <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
        <Button key="settings-uninstall" plain hover={{ scope: 'uninstall', backgroundColor: '#00000000' }} label={' '.repeat(label.length + 3)} onPress={press} />
      </Box>
    </Box>
  )
}
/** `above` is the reply the card hangs under, or nothing for the band above the prompt. */
function handoffCardTree($: EngineInterface, e: RenderInput<'AssistantMessage'> | RenderInput<'AbovePrompt'>, fresh: HandoffCard, above: unknown, onDismiss?: () => unknown) {
  const { Box, Text, Svg, Button } = themedEls($.ui.resolve(e))
  const by = fresh.full ? 'Full' : 'Quick'
  const words = {
    writing: ['✦ Handing off…', `${by} handoff being written. ${fresh.full ? 'Your skill takes a little while.' : 'A few seconds.'}`],
    done: ['✦ Handoff complete', 'Carried on from the last chat. The old one is cleared.'],
    copied: ['✦ Handoff copied', 'Paste it into a new chat. This one stays.'],
    compacting: ['✦ Compacting…', 'The chat is being summed up. Takes a minute or so.'],
    compacted: ['✦ Compact complete', 'The chat is summed up; the next message reads far less.'],
  }[fresh.kind]
  const quiet = fresh.kind === 'compacting'
  const card = (
    <Box key="reply-handoff" position="relative" flexDirection="row" alignItems="center" paddingX={1} overflow="hidden"
      backgroundColor={cardLanded(fresh.kind) ? DONE_BG : BRAND_BG} borderStyle="round" borderColor={cardLanded(fresh.kind) ? DONE_EDGE : BRAND_EDGE}>
      <Box key="reply-handoff-art" position="absolute" top={-1} right={0} bottom={-1}>
        {quiet ? (
          <Svg source={DASH_SVG} alt="compacting" width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
        ) : cardRunning(fresh.kind) ? (
          <Svg source={HANDOFF_SVG} alt="handing off" width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
        ) : (
          <Svg source={cardLanded(fresh.kind) ? DONE_SVG : BRAND_SVG} alt="CGP Effort" width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
        )}
      </Box>
      <Box key="reply-handoff-words" position="relative" flexDirection={quiet ? 'row' : 'column'} gap={quiet ? 1 : 0} flexShrink={1} minWidth={0}>
        {markTitle({ Box, Text, Svg }, 'reply-handoff-title', cardLanded(fresh.kind) ? DONE_ACCENT : ACCENT, words[0], cardLanded(fresh.kind) ? DONE_MARK_SVG : MARK_SVG)}
        <Text wrap="truncate">{words[1]}</Text>
      </Box>
      {onDismiss ? (
        <Box key="reply-handoff-close" position="relative" flexGrow={1} flexDirection="row" justifyContent="flex-end">
          <Box position="absolute" top={0} left={0} />
          {/* Sized to the ✕: a wider box lit its hover across half the card. */}
          <Box key="card-close-box" position="relative" flexShrink={0}>
            <Box position="absolute" top={0} left={0} />
            <Button key="card-close" plain role="dismiss" label="✕" hover={{ backgroundColor: CARD_CLOSE_HOVER }} onPress={onDismiss} />
          </Box>
        </Box>
      ) : null}
    </Box>
  )
  if (above === undefined) return card
  return (
    <Box key="reply" flexDirection="column" gap={1}>
      {above as never}
      {card}
    </Box>
  )
}
// Updates
let ownVersion = ''
async function installedVersion($: EngineInterface): Promise<string | undefined> {
  const text = await $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`).catch(() => '')
  try {
    const v = (JSON.parse(typeof text === 'string' ? text : '') as { version?: unknown }).version
    return typeof v === 'string' ? v : undefined
  } catch {
    return undefined
  }
}
let lastUpdateCheck = 'not checked yet'
/** public.json on stable via a blobless depth-1 git fetch: git has no cache in the way, unlike the host's web fetch. */
async function latestFromGit($: EngineInterface): Promise<{ version: string; note: string } | undefined> {
  const dir = `${$.plugin.root.replace(/[\\/]cache[\\/].*$/, '')}/data/cgp-effort-release-check`
  const git = (...args: string[]) => $.process.run(['git', '-C', dir, ...args], { timeoutMs: 60_000 })
  if ((await git('rev-parse', '--git-dir').catch(() => null))?.exitCode !== 0) {
    await $.process.run(['git', 'init', '-q', dir], { timeoutMs: 30_000 })
    await git('remote', 'add', 'origin', 'https://github.com/crypto-gameplan/cgp-effort.git')
  }
  const fetched = await git('fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', 'stable')
  if (fetched.exitCode !== 0) return undefined
  const shown = await git('show', 'FETCH_HEAD:public.json')
  return shown.exitCode === 0 ? latestRelease(shown.stdout) : undefined
}
async function latestAvailable($: EngineInterface): Promise<{ latest?: { version: string; note: string }; how: string }> {
  const fromGit = await latestFromGit($).catch(() => undefined)
  if (fromGit) return { latest: fromGit, how: `git ${fromGit.version}` }
  const res = await $.http.fetch(`${RELEASES_URL}&t=${Date.now()}`, { headers: { accept: 'application/vnd.github.raw', 'user-agent': 'cgp-effort' } }).catch((error: unknown) => ({ ok: false, status: 0, text: String(error) }))
  const fromWeb = res.ok ? latestRelease(res.text) : undefined
  const web = res.ok ? (fromWeb ? `web ${fromWeb.version}` : 'web: unreadable') : `web refused (${res.status || res.text.slice(0, 80)})`
  // The marketplace (crypto-gameplan/cgp-marketplace) lists several plugins and holds no release notes of this one.
  return { latest: fromWeb, how: `git failed; ${web}` }
}
// A reload restarts the module, maybe with no session start, so the band's first draw starts the timers too.
// A session start always does: a timer started inside a request may end with it.
let timersFrom: 'start' | 'draw' | null = null
function startTimers($: EngineInterface, from: 'start' | 'draw') {
  if (timersFrom === 'start' || (timersFrom === 'draw' && from === 'draw')) return
  timersFrom = from
  $.clock.every(UPDATE_CHECK_MS, () => void checkUpdate($).catch(() => undefined))
  $.clock.every(CACHE_TICK_MS, () => void showCache($).catch(() => undefined))
  $.clock.every(CACHE_TICK_MS, () => void checkSwamp($).catch(() => undefined))
  void checkSwamp($).then(() => $.ui.invalidate('ui.render')).catch(() => undefined)
  // The handoff is finished from here: a hook the turn waits on may not run commands.
  handoffTimer?.cancel()
  handoffTimer = $.clock.every(HANDOFF_POLL_MS, () => {
    void agentWaits($).catch(() => undefined)
    if (redrawsOwed > 0) {
      // Drawn since the ask: a redraw would only restart its animations.
      if (lastRenderAt > redrawAskedAt + REDRAW_SETTLE_MS) redrawsOwed = 0
      else {
        redrawsOwed--
        $.ui.invalidate('ui.render')
      }
    }
    if (!lastContext || !lastContext.window) void checkSwamp($).then(() => lastContext?.window && $.ui.invalidate('ui.render')).catch(() => undefined)
    // The countdown ticks inside its own image; a redraw once a minute starts the next one.
    if (cacheExpires > 0 && !config.hide.includes('timer'))
      void $.clock.now().then(now => {
        const minute = Math.floor((cacheExpires - now) / 60_000)
        if (now < cacheExpires + HANDOFF_POLL_MS && minute !== clockMinute) {
          clockMinute = minute
          $.ui.invalidate('ui.render')
        }
      })
    void writeRenderLog($).catch(() => undefined)
    void finishHandoff($).catch(() => undefined)
  })
}
// /reload-plugins loads the module again without a session start, so the band's first draw runs afterLoad too.
let loadChecked = false
async function afterLoad($: EngineInterface) {
  if (loadChecked) return
  loadChecked = true
  ownVersion = (await installedVersion($)) ?? ownVersion
  startTimers($, 'draw')
  const updatedTo = (await $.store.get('updatedTo').catch(() => null)) as { version: string; note: string; at: number } | null
  // A "Loading it…" left by the previous copy is over either way.
  await update($, updateCard, c => (c && c.detail === UPDATE_LOADING ? { ...c, detail: 'Installed. Open a new chat to load it.' } : c))
  if (updatedTo) {
    await $.store.set('updatedTo', null)
    // The reload may bring back older code (the chat's folder was not refreshed); then a new chat has to load it.
    const loaded = (await installedVersion($)) === updatedTo.version
    await update($, updateCard, () => ({ stage: 'done', version: updatedTo.version, note: updatedTo.note, at: Date.now(), ...(loaded ? {} : { detail: 'Installed. Open a new chat to load it.' }) }))
  }
  await checkUpdate($)
}
async function checkUpdate($: EngineInterface) {
  const shown = await read($, updateCard)
  if (shown && shown.stage !== 'offer') {
    lastUpdateCheck = `skipped while the ${shown.stage} card shows`
    return
  }
  const { latest, how } = await latestAvailable($)
  const mine = await installedVersion($)
  lastUpdateCheck = `installed ${mine ?? 'unreadable'}; ${how}`
  if (!latest || !mine || !isNewer(latest.version, mine)) {
    if (shown) await update($, updateCard, () => null)
    // A version found earlier is stale once one as new is installed some other way.
    await update($, updateCheck, cur => (cur.startsWith('found ') ? 'idle' : cur))
    return
  }
  const now = await $.clock.now()
  const hidden = (await $.store.get('updateHidden').catch(() => null)) as { version: string; at: number } | null
  if (updateSnoozed(hidden, latest.version, now)) return
  if (shown?.version !== latest.version) await update($, updateCard, () => ({ stage: 'offer', version: latest.version, note: latest.note, at: now }))
}
const updateCheck = atom({ plugin: 'cgp-effort', key: 'updateCheck' } as const, 'idle')
async function checkUpdateNow($: EngineInterface) {
  await update($, updateCheck, () => 'checking')
  await $.store.set('updateHidden', null).catch(() => undefined)
  // A leftover done or failed card would make checkUpdate skip the look.
  await update($, updateCard, c => (c && (c.stage === 'done' || c.stage === 'failed') ? null : c))
  await checkUpdate($).catch((error: unknown) => { lastUpdateCheck = `check failed: ${String(error).slice(0, 120)}` })
  const card = await read($, updateCard)
  await update($, updateCheck, () => (card && card.stage === 'offer' ? `found ${card.version}` : 'newest'))
  if (!(card && card.stage === 'offer')) $.clock.after(5000, () => void update($, updateCheck, cur => (cur === 'newest' ? 'idle' : cur)))
}
const homeDir = async ($: EngineInterface) => ((await envUserProfile($)) ?? (await envHome($))) || undefined
/** `claude <args>`, trying the next place it may be when one will not start. */
async function runClaude($: EngineInterface, args: string[], opts: Parameters<EngineInterface['process']['run']>[1]) {
  let last: unknown
  for (const bin of claudeCandidates(await homeDir($))) {
    try {
      return await $.process.run([bin, ...args], opts)
    } catch (error) {
      last = error
      if (!NOT_STARTED.test(String(error))) throw error
    }
  }
  throw last
}

async function runUpdate($: EngineInterface, card: UpdateCard) {
  await update($, updateCard, () => ({ ...card, stage: 'updating' }))
  const step = async (args: string[]) => {
    const r = await runClaude($, args, { timeoutMs: 180_000, env: GITHUB_OVER_HTTPS })
    if (r.exitCode !== 0) throw new Error(updateFailure(r.stderr || r.stdout) || `claude ${args.join(' ')} failed`)
  }
  try {
    await step(['plugin', 'marketplace', 'update', pluginId($).split('@')[1]])
    await step(['plugin', 'update', pluginId($)])
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error)
    // No CLI anywhere (a desktop-only install): say what to install, not the engine's ENOENT.
    const home = await homeDir($)
    await update($, updateCard, () => ({ ...card, stage: 'failed', detail: noClaudeHint(message, home) ?? message }))
    return
  }
  // The desktop app keeps the chat on its original folder and a reload rereads it, so the new files go there.
  await syncRunningCopy($).catch(() => undefined)
  const now = await $.clock.now()
  await $.store.set('updatedTo', { version: card.version, note: card.note, at: now })
  await update($, updateCard, () => ({ ...card, stage: 'done', at: now, detail: UPDATE_LOADING }))
  const reloaded = await $.command.run({ command: 'reload-plugins', args: RELOAD_ARGS } as never).then(() => true, () => false)
  if (!reloaded && (await typeCommand($, `/reload-plugins ${RELOAD_ARGS}`)))
    await update($, updateCard, c => (c ? { ...c, detail: 'Press Enter to load it' } : c))
  // Still this code's words after a while: the reload did not take, so a new chat has to.
  $.clock.after(UPDATE_LOAD_WAIT_MS, () => void update($, updateCard, c => (c && c.at === now && c.detail === UPDATE_LOADING ? { ...c, detail: 'Installed. Open a new chat to load it.' } : c)))
}
async function syncRunningCopy($: EngineInterface) {
  const home = $.plugin.root.replace(/[\\/]cache[\\/].*$/, '')
  const record = JSON.parse(String(await $.fs.read(`${home}/installed_plugins.json`))) as { plugins?: Record<string, { installPath?: unknown }[]> }
  const installed = record.plugins?.[pluginId($)]?.map(x => x.installPath).filter((x): x is string => typeof x === 'string').at(-1)
  const argv = syncPlan($.plugin.root, installed)
  if (!argv) return
  const r = await $.process.run(argv, { timeoutMs: 120_000 })
  // robocopy exits below 8 on success.
  if (argv[0] === 'robocopy' ? r.exitCode >= 8 : r.exitCode !== 0) throw new Error(`copy failed (${r.exitCode})`)
}
function updateCardTree($: EngineInterface, e: RenderInput<'AbovePrompt'>, card: UpdateCard) {
  const { Box, Text, Svg, Button, Link } = themedEls($.ui.resolve(e))
  const landed = card.stage === 'done'
  const words = {
    offer: [`✦ CGP Effort ${card.version} is out`, card.note || 'A new version is ready.'],
    updating: ['✦ Updating…', `Getting ${card.version}. Takes a few seconds.`],
    done: [`✦ Updated to ${card.version}`, card.detail ?? 'Loaded in this chat.'],
    failed: ['✦ Update failed', card.detail ?? 'Try again, or run claude plugin update cgp-effort@crypto-gameplan.'],
  }[card.stage]
  const hide = async () => {
    if (card.stage === 'offer') await $.store.set('updateHidden', { version: card.version, at: await $.clock.now() })
    await update($, updateCard, () => null)
  }
  // Each control in its own box: under a shared one, hovering one lit the others too.
  const installLine = card.stage === 'failed' ? card.detail?.match(/(irm \S+ \| iex|curl -fsSL \S+ \| bash)/)?.[1] : undefined
  const own = (key: string, el: unknown) => (
    <Box key={key} position="relative" flexShrink={0}>
      <Box position="absolute" top={0} left={0} />
      {el as never}
    </Box>
  )
  const controls =
    card.stage === 'offer'
      ? [
          own('update-go-box', <Button key="update-go" variant="primary" label="Update" onPress={() => runUpdate($, card)} />),
          own('update-later-box', <Button key="update-later" variant="secondary" label="Later" onPress={hide} />),
        ]
      : card.stage === 'failed'
        ? [
            // The install line may be cut off on a narrow card, so it is one press away whole.
            ...(installLine
              ? [own('update-copy-box', <Button key="update-copy" variant="secondary" label="Copy install command" onPress={async () => {
                  const r = await $.ui.copy({ text: installLine, surface: e.surface }).catch(() => ({ isCopied: false as const }))
                  $.ui.toast(r.isCopied ? 'Install command copied. Paste it in PowerShell or Terminal, then reopen the app.' : `CGP Effort: run ${installLine}`)
                }} />)]
              : []),
            own('update-go-box', <Button key="update-go" variant="primary" label="Try again" onPress={() => runUpdate($, card)} />),
            own('update-close-box', <Button key="update-close" plain label="✕" hover={{ backgroundColor: CARD_CLOSE_HOVER }} onPress={hide} />),
          ]
        : landed
          ? [
              own('update-link-box', <Text color="#ffffff" bold><Link href={WHATS_NEW_URL} label="What's new →" /></Text>),
              own('update-close-box', <Button key="update-close" plain label="✕" hover={{ backgroundColor: UPDATED_HOVER }} onPress={hide} />),
            ]
          : []
  return (
    <Box key="update-card" position="relative" flexDirection="row" alignItems="center" paddingX={1} overflow="hidden"
      backgroundColor={landed ? UPDATED_BG : BRAND_BG} borderStyle="round" borderColor={landed ? UPDATED_EDGE : BRAND_EDGE}>
      {landed ? (
        <Box key="update-glow" position="absolute" top={-1} left={0} bottom={-1}>
          <Svg source={UPDATED_GLOW_SVG} alt="CGP Effort" width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
        </Box>
      ) : (
        <Box key="update-art" position="absolute" top={-1} right={0} bottom={-1}>
          <Svg source={card.stage === 'updating' ? HANDOFF_SVG : BRAND_SVG} alt={card.stage === 'updating' ? 'updating' : 'CGP Effort'} width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
        </Box>
      )}
      <Box key="update-words" position="relative" flexDirection="column" flexShrink={1} minWidth={0}>
        {markTitle({ Box, Text, Svg }, 'update-title', landed ? DONE_ACCENT : ACCENT, words[0], landed ? DONE_MARK_SVG : MARK_SVG)}
        <Text wrap="truncate">{words[1]}</Text>
      </Box>
      <Box key="update-controls" position="relative" flexGrow={1} flexDirection="row" justifyContent="flex-end" alignItems="center" gap={1}>
        {/* An empty absolute child makes it paint over the art and take the clicks. */}
        <Box position="absolute" top={0} left={0} />
        {controls}
      </Box>
    </Box>
  )
}
/** The handoff or compact card while it runs, then until the next message, its ✕ or its time is up. */
async function compactCard($: EngineInterface, working = false) {
  const card = await read($, handoffCard)
  if (!card || cardRunning(card.kind)) return card
  const keep = card.kind === 'compacted' ? COMPACT_CARD_MS : HANDOFF_CARD_MS
  if (working || (card.kind === 'compacted' && card.seen) || (await $.clock.now()) - card.at >= keep) return null
  return card
}
// Dashboard
// handoffAdvice as last read, so the drawing helpers need no await.
let adviceNow: string | null = null
const handoffLevel = () => (adviceNow ? HANDOFF_ADVICE_LEVEL : config.handoffButton === 'always' ? HANDOFF_BOX_AT : 0)
const handoffLoud = () => adviceNow !== null
const handoffSlot = () => handoffLoud() || config.handoffButton === 'always'
/** Handoff's look at `percent` of context: no box at 0, grey by HANDOFF_BOX_AT, white by HANDOFF_LOUD_AT. */
export function handoffLook(percent: number, hovered = false): { fill: string; opacity: number; edge: string; label: string } {
  const p = Math.max(hovered ? HANDOFF_BOX_AT : 0, Math.min(HANDOFF_LOUD_AT, Math.round(percent) + (hovered ? 5 : 0)))
  const mix = (a: string, b: string, k: number) => {
    const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
    return `#${[0, 1, 2].map(i => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * k).toString(16).padStart(2, '0')).join('')}`
  }
  if (p <= HANDOFF_BOX_AT) {
    const k = p / HANDOFF_BOX_AT
    return { fill: HOVER_BOX, opacity: k, edge: mix(DASH_BG, '#3a3a40', k), label: mix(DASH_DIM, '#ececf0', k) }
  }
  const k = (p - HANDOFF_BOX_AT) / (HANDOFF_LOUD_AT - HANDOFF_BOX_AT)
  return { fill: mix(HOVER_BOX, '#ececf0', k), opacity: 1, edge: mix('#3a3a40', '#ffffff', k), label: k > 0.45 ? '#141416' : '#ececf0' }
}
export function handoffPillSvg(percent: number, hovered = false): string {
  const l = handoffLook(percent, hovered)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${HANDOFF_PILL_W}" height="${HANDOFF_PILL_H}" viewBox="0 0 ${HANDOFF_PILL_W} ${HANDOFF_PILL_H}"><rect x=".5" y=".5" width="${HANDOFF_PILL_W - 1}" height="${HANDOFF_PILL_H - 1}" rx="6" fill="${l.fill}" fill-opacity="${l.opacity.toFixed(3)}" stroke="${l.edge}" stroke-opacity="${l.opacity.toFixed(3)}"/></svg>`
}
export function handoffGlowSvg(step: number, nowMs = 0): string {
  const { spread: e, blur, peak, low, period } = GLOW_LEVELS[step]
  // Phase from the clock, so a redraw does not restart the pulse.
  const lock = (svg: string) => inPhase(svg, nowMs % (period * 1000))
  const x = (GLOW_W - GLOW_BUTTON.w) / 2 - e
  const y = (GLOW_H - GLOW_BUTTON.h) / 2 - e
  return lock(`<svg xmlns="http://www.w3.org/2000/svg" width="${GLOW_W}" height="${GLOW_H}" viewBox="0 0 ${GLOW_W} ${GLOW_H}"><style>.g{animation:p ${period}s ease-in-out infinite}@keyframes p{0%,100%{opacity:${low}}50%{opacity:${peak}}}</style><defs><filter id="b" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs><g class="g" filter="url(#b)"><rect x="${x}" y="${y}" width="${GLOW_BUTTON.w + 2 * e}" height="${GLOW_BUTTON.h + 2 * e}" rx="${GLOW_BUTTON.r + e}" fill="${ACCENT}"/></g></svg>`)
}
/** Pass `slideMs` only on the redraw right after a click: every redraw replays an image's animation. */
export function autoSwitchSvg(on: boolean, slideMs: number | null = null): string {
  const slide = slideMs !== null && slideMs < AUTO_SLIDE_MS
  const t = `${AUTO_SLIDE_MS / 1000}s cubic-bezier(.3,.7,.2,1)`
  const css = slide
    ? `<style>.k{animation:k ${t}}.p{animation:p ${t}}@keyframes k{from{transform:translateX(${on ? -11 : 11}px);fill:${on ? '#8b8b93' : '#ffffff'}}}@keyframes p{from{fill:${on ? '#2c2c31' : ACCENT};stroke:${on ? '#4a4a52' : ACCENT}}}</style>`
    : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="15" viewBox="0 0 26 15">${css}<rect class="p" x=".5" y=".5" width="25" height="14" rx="7" fill="${on ? ACCENT : '#2c2c31'}" stroke="${on ? ACCENT : '#4a4a52'}"/><circle class="k" data-keep="1" cx="${on ? 18.5 : 7.5}" cy="7.5" r="5" fill="${on ? '#ffffff' : '#8b8b93'}"/></svg>`
  return slide ? inPhase(svg, slideMs) : svg
}
/** Pass `slideMs` only on the redraw right after a click: every redraw replays an image's animation. */
export function kindSwitchSvg(kind: 'quick' | 'full', slideMs: number | null = null): string {
  const half = KIND_W / 2
  const at = (k: 'quick' | 'full') => (k === 'full' ? half + 0.5 : 2)
  const slide = slideMs !== null && slideMs < KIND_SLIDE_DELAY_MS + KIND_SLIDE_MS
  // A beat after the click: sliding in the frames that redraw the whole bar stutters.
  // SMIL, not CSS: it moves the knob's own x, held at the old side until it begins.
  const from = at(kind === 'full' ? 'quick' : 'full')
  const begin = slideMs === null ? 0 : KIND_SLIDE_DELAY_MS - slideMs
  const move = slide
    ? `<animate attributeName="x" from="${from}" to="${at(kind)}" begin="${(begin / 1000).toFixed(3)}s" dur="${KIND_SLIDE_MS / 1000}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".3 .7 .2 1"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${KIND_W}" height="${KIND_H}" viewBox="0 0 ${KIND_W} ${KIND_H}"><rect x=".5" y=".5" width="${KIND_W - 1}" height="${KIND_H - 1}" rx="5.5" fill="#ffffff" fill-opacity=".05" stroke="#ffffff" stroke-opacity=".1"/><rect x="${slide ? from : at(kind)}" y="2" width="${half - 2.5}" height="${KIND_H - 4}" rx="4" data-keep="1" fill="#ececf0">${move}</rect>${slide ? `<!--${kindFlipAt}-->` : ''}</svg>`
}
// Stamped into the slide's image: the app reuses an identical image without replaying the slide.
let kindFlipAt = 0
/** cgp-effort@<marketplace>, read off the cache path (…/plugins/cache/<marketplace>/cgp-effort/<version>). */
const pluginId = ($: EngineInterface) => `cgp-effort@${$.plugin.root.match(/cache[\\/]([^\\/]+)[\\/]/)?.[1] ?? 'crypto-gameplan'}`
export function judgeGlowSvg(kind: 'rise' | 'fade', elapsedMs = 0): string {
  const W = AUTO_GLOW_W, H = AUTO_GLOW_H
  const dur = kind === 'rise' ? JUDGE_RISE_MS : JUDGE_FADE_MS
  const from = judgeBrightnessAt(kind, elapsedMs)
  const span = Math.max(1, Math.min(JUDGE_PIECE_MS, dur - elapsedMs))
  const points = [0, 0.25, 0.5, 0.75, 1].map(k => `${(k * 100).toFixed(0)}%{opacity:${judgeBrightnessAt(kind, elapsedMs + k * span).toFixed(3)}}`).join('')
  const still = kind === 'rise' && elapsedMs >= dur
  const css = still
    ? `.r{opacity:${JUDGE_GLOW_MAX}}`
    : `.r{opacity:${from.toFixed(3)};animation:r ${(span / 1000).toFixed(3)}s linear forwards}@keyframes r{${points}}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><style>${css}</style><defs><filter id="b" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="1.5"/></filter></defs><g class="r"><rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="none" stroke="${ACCENT}" stroke-width="4" opacity=".16" filter="url(#b)"/><rect x=".75" y="1.75" width="${W - 1.5}" height="${H - 3.5}" rx="8.25" fill="none" stroke="#b9a7ff" stroke-width="1.5" vector-effect="non-scaling-stroke"/></g></svg>`
}
/** `endedAt` is null while the judge decides. */
export function judgeGlowAt(startedAt: number, endedAt: number | null, now: number): string | null {
  if (now < startedAt) return null
  const fadeFrom = endedAt === null ? Infinity : Math.max(endedAt, startedAt + JUDGE_RISE_MS)
  if (now < fadeFrom) return judgeGlowSvg('rise', now - startedAt)
  if (now < fadeFrom + JUDGE_FADE_MS) return judgeGlowSvg('fade', now - fadeFrom)
  return null
}
function drawGlowSteps($: EngineInterface, from: number, span: number) {
  for (let at = Math.max(0, from); at <= from + span + JUDGE_STEP_MS; at += JUDGE_STEP_MS) $.clock.after(at + 5, () => $.ui.invalidate('ui.render'))
}
// The glow's clock is set ahead by the measured rest-of-draw time: a fade placed at draw start lagged and read as a second glow.
let glowReadAt: number | null = null
let drawLead = 20
let judgeStartedAt = 0
let judgeEndedAt: number | null = 0
/** Fades with the effort word's flash, not after the effort is applied: that came a beat later and read as a second glow. */
async function endJudgeGlow($: EngineInterface, why: string) {
  if (judgeEndedAt !== null) return
  judgeEndedAt = await $.clock.now().catch(() => Date.now())
  const fadeAt = Math.max(judgeEndedAt, judgeStartedAt + JUDGE_RISE_MS) - judgeEndedAt
  renderLog.push(`${new Date().toISOString()} ${loadedSession} glow: ${why} ${judgeEndedAt - judgeStartedAt} ms after start, fade in ${fadeAt} ms`)
  drawGlowSteps($, fadeAt, JUDGE_FADE_MS)
  $.ui.invalidate('ui.render')
}
export function autoGlowSvg(on: boolean): string {
  const W = AUTO_GLOW_W, H = AUTO_GLOW_H
  const rim = `x="0" y="0" width="${W}" height="${H}" rx="8"`
  const [wash, line, strength] = on ? [ACCENT, '#b9a7ff', 0.9] : ['#8b8b93', '#c8c8d0', 0.6]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><style>.r{opacity:0;animation:r ${AUTO_GLOW_MS / 1000}s ease-in-out}@keyframes r{0%{opacity:0}15%{opacity:${strength}}45%{opacity:${(strength * 0.85).toFixed(2)}}100%{opacity:0}}</style><defs><filter id="b" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="1.5"/></filter><filter id="s" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation=".8"/></filter></defs><g class="r"><rect ${rim} fill="none" stroke="${wash}" stroke-width="4" opacity=".14" filter="url(#b)"/><rect x=".75" y="1.75" width="${W - 1.5}" height="${H - 3.5}" rx="8.25" fill="none" stroke="${line}" stroke-width="1.5" vector-effect="non-scaling-stroke"/></g></svg>`
}
let autoSeen: boolean | undefined
let autoOnAt = -Infinity
let autoFlipAt = 0
let helpersSeen: string | undefined
let helpersFlipAt = 0
let autoEffortSeen: string | undefined
let autoEffortFlipAt = 0
async function dashboardBand($: EngineInterface, e: RenderInput<'AbovePrompt'>) {
  const els = themedEls($.ui.resolve(e))
  const { Box, Text, Button } = els
  const v = await snap($)
  adviceNow = (await read($, handoffAdvice)) ?? null
  await introShows($, 'dash')
  const entering = introFresh
  introFresh = false
  const nowMs = await $.clock.now()
  if (autoSeen !== undefined && autoSeen !== v.auto) {
    autoFlipAt = nowMs
    // No redraw to end the slide or glow: both finish inside their images, and a redraw flickers the buttons' hover.
    autoOnAt = nowMs
  }
  autoSeen = v.auto
  const effortNow = effortOf(v, v.modelNow ?? (await sessionModel($)))
  const by = v.current?.by
  const reason = v.current
    ? `${by === 'manual' || by === 'named' ? 'You' : by === 'jev' ? 'Jev' : 'Haiku'}: ${v.current.why}`
    : v.auto
      ? 'Auto picks the effort at the next prompt'
      : 'You pick the effort'
  const drawn = e.surface !== 'terminal' && 'Svg' in els
  const cacheShown = config.hide.includes('timer') || (v.cacheNow !== null && v.cacheNow <= 0) ? null : v.cacheNow
  const { head, what, rest, detail } = dashboardLines({
    auto: v.auto,
    paused: Boolean(v.pausedNow),
    judging: Boolean(v.judging),
    effort: effortNow,
    cacheNow: drawn ? null : cacheShown,
    contextPercent: e.surface === 'terminal' && lastContext && lastContext.window ? lastContext.percent : null,
    reason: adviceNow ? `Handoff would suit: ${adviceNow}` : config.hide.includes('reason') ? '' : reason,
    last: null,
  })
  const toggleSettings = async () => {
    if (await read($, settingsOpen)) {
      await update($, settingsDraft, () => ({}))
      await update($, settingsOpen, () => false)
      $.ui.invalidate('ui.render')
    } else await openPluginSettings($)
  }
  const buttons = [
    // In the terminal the effort row under the band drops its own (autoInBar): a short window cut it off. The hotkey
    // only there; the app draws it faint on grey.
    e.surface === 'terminal' ? (
      <Button key="dash-auto" hotkey="a" variant={v.auto ? 'primary' : undefined} label={v.auto ? 'Auto on' : 'Auto off'} onPress={() => toggleAutoEffort($)} />
    ) : (
      <Button key="dash-auto" variant="secondary" dimColor={!v.auto} label={v.auto ? 'Auto on' : 'Auto off'} onPress={() => toggleAutoEffort($)} />
    ),
    ...(e.surface !== 'terminal' && 'Svg' in els && !config.hide.includes('handoff') && handoffSlot() && (typeof e.props.bodyColumns !== 'number' || e.props.bodyColumns >= COMPACT_BUTTON_MIN_COLUMNS)
      ? [<Button key="dash-compact" plain dimColor label="Compact" onPress={() => openCompact($, e)} />]
      : []),
    ...(config.hide.includes('handoff')
      ? []
      : [
          // Desktop draws the box (handoffLook), the label as Text over it and a blank button on top to take the click.
          'Svg' in els && e.surface !== 'terminal' ? (
            <Box key="dash-handoff-wrap" flexShrink={0} flexDirection="row">
              {/* No glow while a reply runs: each redraw restarts it, so it flickers. */}
              {HANDOFF_GLOW && handoffLoud() && !e.props.isWorking ? (
                <Box key="dash-glow" position="absolute" top={0} bottom={0} left={-2} right={-2} alignItems="center" justifyContent="center">
                  <els.Svg source={handoffGlowSvg(handoffGlowStep(handoffLevel()), nowMs)} alt="handoff glow" width={GLOW_W} height={GLOW_H} />
                </Box>
              ) : null}
              {/* The H key on a clipped button of its own: a blank button with a hotkey draws its letter over the label. */}
              {handoffLoud() ? (
                <Box key="dash-handoff-key" width={0} height={1} overflow="hidden">
                  <Button key="dash-handoff-h" plain hotkey="h" label="Handoff" onPress={() => openHandoffBar($)} />
                </Box>
              ) : null}
              {/* A spacer sets the width: the app can lay an image out at no width. */}
              <Box key="dash-handoff-box" flexShrink={0} flexDirection="row" alignItems="center">
                <Box width={9} height={1} flexShrink={0} />
                <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
                  <els.Svg source={handoffPillSvg(handoffLevel())} alt="Handoff box" width={HANDOFF_PILL_W} height={HANDOFF_PILL_H} />
                </Box>
                {/* Own hover pill: the app's ghost fill is sized to the blank label and sits off the box. */}
                <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center"
                  display="none" hover={{ scope: 'handoff', display: 'flex' }}>
                  <els.Svg source={handoffPillSvg(handoffLevel(), true)} alt="Handoff box" width={HANDOFF_PILL_W} height={HANDOFF_PILL_H} />
                </Box>
                <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
                  <Text color={handoffLook(handoffLevel()).label} hover={{ scope: 'handoff', color: handoffLook(handoffLevel(), true).label }}>{handoffSlot() ? 'Handoff' : 'Compact'}</Text>
                </Box>
                <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
                  <Button key="dash-handoff" plain label={' '.repeat(14)} hover={{ scope: 'handoff', backgroundColor: '#00000000' }} onPress={() => (handoffSlot() ? openHandoffBar($) : openCompact($, e))} />
                </Box>
              </Box>
            </Box>
          ) : handoffLoud() ? (
            <Button key="dash-handoff" variant="primary" hotkey="h" label="Handoff" onPress={() => openHandoffBar($)} />
          ) : (
            <Button key="dash-handoff" variant="secondary" label="Handoff" onPress={() => openHandoffBar($)} />
          ),
        ]),
    // No-break spaces, not braille blanks: some fonts draw U+2800 as a dot.
    <Button key="dash-settings" plain label={'Svg' in els && e.surface !== 'terminal' ? '   ' : 'Settings'} onPress={toggleSettings} />,
  ].filter(Boolean)
  if (e.surface === 'terminal')
    return terminalBand($, e, { key: 'dash', kind: 'calm', color: DASH_TEXT, bg: DASH_BG, edge: DASH_EDGE, title: head.replace(/^✦ /, ''), detail, buttons, autoInBar: true,
      word: { text: what, color: await effortFlash($, what, Boolean(v.judging), entering), rest } })
  const Svg = 'Svg' in els ? els.Svg : undefined
  const wordColor = await effortFlash($, what, Boolean(v.judging), entering)
  glowReadAt = Date.now()
  const glowNow = (await $.clock.now().catch(() => nowMs)) + drawLead
  const glowSource = Svg ? judgeGlowAt(judgeStartedAt, judgeEndedAt, glowNow) : null
  if (glowSource && judgeEndedAt !== null) renderLog.push(`${new Date().toISOString()} ${loadedSession} glow: fade drawn at +${Math.round(glowNow - Math.max(judgeEndedAt, judgeStartedAt + JUDGE_RISE_MS))} ms, lead ${Math.round(drawLead)} ms, ${Math.round(glowNow - drawLead - nowMs)} ms after the draw began`)
  return (
    <Box key="dash" position="relative" flexDirection="row" alignItems="center" paddingX={1} overflow="hidden"
      backgroundColor={DASH_BG} borderStyle="round" borderColor={DASH_EDGE}>
      {Svg ? (
        v.auto ? (
          <Box key="dash-art" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={DASH_SVG} alt="CGP Effort" width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
          </Box>
        ) : null
      ) : null}
      {Svg && v.auto && nowMs - autoOnAt < AUTO_GLOW_MS && renderLog.push(`glow ${v.auto ? 'on' : 'off'} at ${nowMs - autoOnAt} ms`) ? (
        <Box key="dash-auto-glow" position="absolute" top={0} left={0} right={0} bottom={0}>
          <Svg source={inPhase(autoGlowSvg(v.auto), nowMs - autoOnAt)} alt="auto glow" width={AUTO_GLOW_W} height={AUTO_GLOW_H} />
        </Box>
      ) : null}
      {Svg && glowSource ? (
        <Box key="dash-judge-glow" position="absolute" top={0} left={0} right={0} bottom={0}>
          <Svg source={glowSource} alt="deciding glow" width={AUTO_GLOW_W} height={AUTO_GLOW_H} />
        </Box>
      ) : null}
      {/* Siblings, not nested: a shrunk parent let the word spill under the ring. */}
      <Box key="dash-words" position="relative" flexDirection="row" flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
        <Box flexShrink={0} flexDirection="row">
          {Svg ? (
            <Box key="dash-mark" flexShrink={0} marginRight={1} alignItems="center">
              <Svg source={v.auto ? MARK_SVG : DASH_MARK_OFF} alt="CGP Effort" width={DASH_MARK_SIZE} height={DASH_MARK_SIZE} />
            </Box>
          ) : <Text color={v.auto ? ACCENT : DASH_DIM} bold>✦ </Text>}
          <Text key="dash-level" color={wordColor} bold>{v.judging && Svg ? 'Deciding' : what}</Text>
          {!v.judging && v.auto && MODELS.find(m => m.key === (routed ?? v.modelNow)) ? (
            <Text key="dash-model" color={DASH_DIM}>{` · ${MODELS.find(m => m.key === (routed ?? v.modelNow))!.label}`}</Text>
          ) : null}
          {/* A plain image: its CSS still runs, and a redraw does not restart it as an interactive frame does. */}
          {v.judging && Svg ? (
            <Box key="dash-thinking" flexShrink={0} marginLeft={1} alignItems="center">
              <Svg source={thinkingSvg('planning')} alt="deciding" width={THINK_W} height={PILL_H} />
            </Box>
          ) : null}
        </Box>
        {rest ? (
          <Box flexShrink={detail ? 0 : 1} minWidth={0}>
            <Text color={DASH_TEXT} bold wrap="truncate">{rest}</Text>
          </Box>
        ) : null}
        {Svg && lastContext && lastContext.window ? (
          <Box key="dash-ring" flexShrink={0} marginLeft={2} flexDirection="row" gap={1} alignItems="center"
            hover={{ scope: 'dash-cache', backgroundColor: HOVER_BOX }}>
            <Svg source={ringSvg(lastContext.percent, DASH_TEXT)} alt={`${Math.round(lastContext.percent)}% of context`} width={16} height={16} />
            <Text color={DASH_TEXT}>{`${Math.round(lastContext.percent)}%`}</Text>
          </Box>
        ) : null}
        {/* One wrapping row, one line high: the widthless reason goes first; the fixed-width cache wraps whole to the
            hidden second row once it no longer fits, taking the reason with it. */}
        {Svg && (cacheShown !== null || detail) ? (
          <Box key="dash-tail" flexGrow={1} flexShrink={1} minWidth={0} height={1} overflow="hidden" flexDirection="row" flexWrap="wrap" marginLeft={2}>
            <Box width={0} height={1} />
            {cacheShown !== null ? (
              <Box key="dash-cache-time" width={11} flexShrink={0} hover={{ scope: 'dash-cache', backgroundColor: HOVER_BOX }}>
                <Svg source={cacheClockSvg(cacheExpires - (await $.clock.now()), cacheShown === 0 ? ICE : (cacheColor(cacheShown) ?? DASH_DIM))}
                  alt={`cache ${cacheClock(cacheExpires - (await $.clock.now()))}`} width={84} height={17} />
              </Box>
            ) : null}
            {detail ? (
              // A hover can only reveal, so the tip is a layer on the band's colour that covers the reason.
              <Box key="dash-detail" position="relative" width={0} flexGrow={1} flexShrink={1} minWidth={10} marginLeft={cacheShown !== null ? 2 : 0}>
                <Text dimColor wrap="truncate">{detail}</Text>
                <Box key="dash-cache-tip" position="absolute" top={0} left={0} right={0} bottom={0} backgroundColor={DASH_BG}
                  display="none" hover={{ scope: 'dash-cache', display: 'flex' }}>
                  <Text dimColor wrap="truncate">{hoverTips(v).cache.replace(/^Prompt cache/, 'Cache')}</Text>
                </Box>
              </Box>
            ) : null}
          </Box>
        ) : detail ? (
          <Box key="dash-detail" flexShrink={1000} minWidth={0} marginLeft={2}>
            <Text dimColor wrap="truncate">{detail}</Text>
          </Box>
        ) : null}
      </Box>
      {/* An empty absolute child makes the box paint over the art; a plain flow box sits under it and loses clicks. */}
      <Box minWidth={1} />
      <Box key="dash-actions" flexShrink={0} flexDirection="row" gap={1} alignItems="center" marginLeft={1}>
        <Box position="absolute" top={0} left={0} />
        {Svg ? (
          <Box key="dash-auto-switch" position="relative" flexDirection="row" alignItems="center" gap={1} paddingX={1}>
            <Svg source={autoSwitchSvg(v.auto, nowMs - autoFlipAt)} alt={v.auto ? 'Auto on' : 'Auto off'} width={26} height={15} />
            <Text color={v.auto ? DASH_TEXT : DASH_DIM}>Auto</Text>
            <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
              <Button key="dash-auto" plain label={' '.repeat(24)} onPress={() => toggleAutoEffort($)} />
            </Box>
          </Box>
        ) : null}
        {Svg ? buttons.slice(1, -1) : buttons}
        {Svg ? (
          // Desktop ignores position="relative" on a Box without absolute children; a Button is at most as wide as its
          // box, so the padding gives the hover room.
          <Box key="dash-settings-icon" position="relative" alignItems="center" justifyContent="center" paddingX={1}>
            <Svg source={settingsSvg(DASH_TEXT)} alt="Settings" width={14} height={14} />
            <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
              {buttons[buttons.length - 1]}
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}
/** The terminal's effort rows, and on any surface the judge's model question. */
async function effortRows($: EngineInterface, e: RenderInput<'AbovePrompt'>, opts: { auto?: boolean } = {}) {
  const { Box, Text, Button } = themedEls($.ui.resolve(e))
  const v = await snap($)
  const { auto, autoModel, current, judging, wanted, shownByApp } = v
  const inUse = v.modelNow ?? (await sessionModel($))
  const effortNow = effortOf(v, inUse)
  // The model row is paused; CGP_EFFORT_MODEL_UI=1 brings it back.
  const showModel = (await envModelUi($)) === '1'

  const setEffort = (level: Effort) => () => pickEffort($, level)
  // Accepting a suggestion (changeModel) leaves Auto for model on.
  const setModel = (model: ModelKey) => async () => {
    await update($, isAutoModel, () => false)
    await $.store.set('isAutoModel', false)
    await changeModel(model)
  }
  // With a draft in the box the mod runs /model itself.
  const changeModel = async (model: ModelKey) => {
    if (await typeCommand($, `/model ${model}`)) return
    await switchModel($, model)
  }
  const acceptSuggestion = (model: ModelKey) => () => changeModel(model)
  const toggleAutoModel = async () => {
    const turnOn = !(await read($, isAutoModel))
    await update($, isAutoModel, () => turnOn)
    await $.store.set('isAutoModel', turnOn)
    if (!turnOn) await update($, suggestion, () => null)
  }
  const dismiss = async () => {
    declined = wanted
    await update($, suggestion, () => null)
  }

  const question = wanted ? (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1} alignItems="center">
        <Text>Switch to {MODELS.find(m => m.key === wanted)?.label}? The context reloads.</Text>
        <Button key="accept" variant="primary" label="Switch" onPress={acceptSuggestion(wanted)} />
        <Button key="decline" label="Keep" onPress={dismiss} />
      </Box>
    </Box>
  ) : null
  if (e.surface !== 'terminal') return { question, rows: null }

  const notAligned = current && inUse !== 'haiku' && shownByApp && shownByApp !== current.effort
  const note = judging
    ? 'Deciding…'
    : notAligned
      ? `/effort shows ${EFFORT_LABELS[shownByApp as Effort] ?? shownByApp}`
      : current
        ? `${current.by === 'manual' ? 'You' : current.by === 'jev' ? 'Jev' : 'Haiku'}: ${current.why}`
        : auto
          ? 'Picks the effort at the next prompt'
          : 'Pick an effort'
  const modelRow = (
    <Box flexDirection="row" alignItems="center" gap={1}>
      {MODELS.map(m =>
        m.key === inUse ? (
          <Button key={`m-${m.key}`} variant="primary" label={m.label} onPress={setModel(m.key)} />
        ) : (
          <Button key={`m-${m.key}`} plain dimColor label={m.label} onPress={setModel(m.key)} />
        ),
      )}
      <Box flexGrow={1} />
      <Button
        key="auto-model"
        hotkey="m"
        variant={autoModel ? 'primary' : undefined}
        label={autoModel ? 'Auto on' : 'Auto off'}
        onPress={toggleAutoModel}
      />
    </Box>
  )
  const rows = (
    <Box flexDirection="column">
      {question}
      {showModel ? modelRow : null}
      <Box flexDirection="row" gap={1} alignItems="center">
        <Box flexShrink={0}>
          <Text dimColor>Effort</Text>
        </Box>
        {EFFORTS.map(level =>
          level === effortNow ? (
            <Button key={`e-${level}`} variant="primary" label={level} onPress={setEffort(level)} />
          ) : (
            <Button key={`e-${level}`} plain dimColor label={level} onPress={setEffort(level)} />
          ),
        )}
        <Box flexGrow={1} />
        {opts.auto === false ? null : (
          <Button
            key="auto"
            hotkey="a"
            variant={auto ? 'primary' : undefined}
            label={auto ? 'Auto on' : 'Auto off'}
            onPress={() => toggleAutoEffort($)}
          />
        )}
        <Box flexShrink={1} minWidth={0}>
          <Text dimColor wrap="truncate-end">
            {note}
          </Text>
        </Box>
      </Box>
    </Box>
  )
  return { question, rows }
}
// Agent panel

async function agentSet($: EngineInterface, id: string, fn: (a: AgentRec) => AgentRec) {
  await update($, agentsState, list => (list.some(a => a.id === id) ? list.map(a => (a.id === id ? fn(a) : a)) : list))
}
async function agentEnded($: EngineInterface, id: string, reason: string) {
  const now = await $.clock.now()
  await agentSet($, id, a => ({ ...a, state: reason === 'answer' ? 'done' : 'failed', endedAt: now, toolSince: undefined, now: undefined }))
}
async function agentCost($: EngineInterface, id: string, cost: number) {
  await agentSet($, id, a => ({ ...a, cost: (a.cost ?? 0) + cost }))
}
let helperWaiting: { description: string; type: string; parentId?: string; effort: Effort }[] = []
async function helperEffort($: EngineInterface, prompt: string, type: string): Promise<Pick | null> {
  const { verdict } = await judge($, helperQuestion(prompt, type), null)
  if (!verdict || verdict.why === UNSURE) return null
  const saving = (await read($, saveUntil)) !== null
  const leaned = tipped(verdict.effort, verdict.sure, config.bias)
  const effort = capped(bounded(leaned, helperFloor(config.floor, config.ceiling), config.ceiling), saving)
  return { ...verdict, effort, why: effort !== leaned && EFFORTS.indexOf(leaned) < EFFORTS.indexOf(effort) ? `${verdict.why} (helpers start at medium)` : verdict.why }
}
/** Claims a waiting pick the first time a subagent's id is seen. */
async function helperEffortOf($: EngineInterface, id: string): Promise<Effort | undefined> {
  const known = helperPicks.get(id)
  if (known || helperWaiting.length === 0) return known
  const info = (await $.agent.list().catch(() => [])).find(a => a.id === id)
  if (!info) return undefined
  const match = helperWaiting.find(w => w.description === info.description && w.type === info.type && w.parentId === info.parentId)
  if (!match) return undefined
  helperWaiting = helperWaiting.filter(w => w !== match)
  helperPicks.set(id, match.effort)
  return match.effort
}
async function helperTally($: EngineInterface, usage: Parameters<typeof weighted>[0]) {
  await update($, saved, old => {
    const t = asSpent(old)
    return { ...t, helpers: { ...t.helpers, requests: t.helpers.requests + 1, cost: t.helpers.cost + weighted(usage) } }
  })
}
async function fileTouched($: EngineInterface, path: string, edited: boolean, by: string) {
  const rel = relPath(path, await $.session.root())
  if (!rel) return
  const now = await $.clock.now()
  const known = (await read($, agentFiles)).find(f => f.path === rel)
  let imports: string[] | undefined
  if (!known || edited) imports = importsOf(rel, await $.fs.read(path).then(t => t.slice(0, 512_000), () => ''))
  await update($, agentFiles, list => withTouch(list, rel, edited, by, now, imports))
}
async function agentWaits($: EngineInterface) {
  const list = await read($, agentsState)
  if (!list.length) return
  const next = withWaits(list, await $.clock.now())
  if (next) await update($, agentsState, () => next)
}
async function haikuCompaction($: EngineInterface, messages: Parameters<typeof compactTranscript>[0], instructions?: string): Promise<{ text: string } | { fail: string }> {
  let transcript = compactTranscript(messages)
  if (transcript.length > COMPACT_MAX_CHARS) transcript = compactTranscript(messages, 300, 4000)
  if (transcript.length > COMPACT_MAX_CHARS) return { fail: 'the chat is too long for Haiku' }
  const r = await $.model.complete({
    model: COMPACT_MODEL,
    system: COMPACT_SYSTEM,
    prompt: `${transcript}\n\n---\nWrite the summary now.${instructions?.trim() ? `\nThe user asked the summary to keep or stress: ${instructions.trim()}` : ''}`,
    maxTokens: 16000,
    effort: 'medium',
    timeoutMs: 240_000,
  })
  if (!r.isAnswered) return { fail: 'reason' in r ? String(r.reason) : 'no answer' }
  return r.text.trim().length > 200 ? { text: r.text.trim() } : { fail: 'the summary came back empty' }
}
async function haikuHandoff($: EngineInterface, messages: Parameters<typeof compactTranscript>[0], focus = ''): Promise<string | null> {
  let transcript = compactTranscript(messages)
  if (transcript.length > COMPACT_MAX_CHARS) transcript = compactTranscript(messages, 300, 4000)
  if (transcript.length > COMPACT_MAX_CHARS) return null
  const r = await $.model.complete({
    model: COMPACT_MODEL,
    system: 'You read a conversation between a user and Claude Code, an AI coding agent, and write the handoff the user asks for.',
    prompt: `${transcript}\n\n---\n${withFocus(HANDOFF_PROMPT, focus)}`,
    maxTokens: 4000,
    effort: 'medium',
    timeoutMs: 120_000,
  })
  return r.isAnswered && r.text.trim().length > 100 ? r.text.trim() : null
}
// Hooks
export const register: Register = (on, options) => {
  loadedAt = Date.now()
  firstDrawLogged = false
  drawsTimed = 0
  config = readConfig(options)
  applyTheme()
  pluginOptions = options
  on('session.compact', async ($, e, next) => {
    if (e.agentId !== undefined || config.compactWith !== 'haiku') return next(e)
    // Precomputed summaries would be written by the chat's model and then not used.
    if (e.trigger === 'precompute') return { skip: 'CGP Effort compacts with Haiku when it is time' }
    const messages = Array.isArray(e.messages) && e.messages.length ? e.messages : await $.session.messages().catch(() => [])
    const got = await haikuCompaction($, messages, e.instructions).catch((error: unknown) => ({ fail: String(error).slice(0, 80) }))
    if ('fail' in got) {
      $.ui.toast(`CGP Effort: Haiku could not compact (${got.fail}). The chat's own model does it.`)
      return next(e)
    }
    lastHaikuCompact = Date.now()
    return {
      messages: [
        {
          role: 'user' as const,
          text: `This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation, written by Haiku 5.5 for CGP Effort.\n\n${got.text}\n\nContinue the conversation from where it left off without asking the user any further questions.`,
          toolUses: [],
        },
      ],
    }
  })
  on('session.start', async ($, e, next) => {
    sessionStarted = Date.now()
    // Each chat reads its own compaction window.
    compactWindow = undefined
    // In parallel: one after the other these held the start (and the band) for a second or more.
    const [sid, kept, storedAuto, storedAutoModel, storedPick, setupDone] = await Promise.all([
      $.session.id().catch(() => '?'),
      $.store.get('savedSettings').catch(() => null),
      $.store.get('isAuto').catch(() => null),
      $.store.get('isAutoModel').catch(() => null),
      $.store.get('pick').catch(() => null) as Promise<Pick | null>,
      $.store.get('setupDone').catch(() => null),
    ])
    loadedSession = String(sid).slice(0, 8)
    // Settings the app had no /config row for (see saveSetting) override the ones it passed in.
    if (kept && typeof kept === 'object' && Object.keys(kept).length) {
      config = readConfig({ ...pluginOptions, ...kept })
      applyTheme()
    }
    await Promise.all([
      typeof storedAuto === 'boolean' ? update($, isAuto, () => storedAuto) : null,
      typeof storedAutoModel === 'boolean' ? update($, isAutoModel, () => storedAutoModel) : null,
      storedAuto === false && storedPick && EFFORTS.includes(storedPick.effort) ? update($, pick, () => storedPick).then(() => { pickCarried = true }) : null,
      setupDone !== true ? update($, setupStep, () => 'pick').then(() => update($, setupPending, () => true)) : null,
    ])
    // Makes plain /cgp-effort the mod's own command instead of the command file run as a skill.
    void $.command.register({ name: 'cgp-effort', description: 'CGP Effort: settings, debug, handoff, setup, bench, auto, stats.' }).catch(() => undefined)
    void $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`).then(t => { ownVersion = String(JSON.parse(String(t)).version ?? '') }).catch(() => undefined)
    void afterLoad($).catch(() => undefined)
    void drainSetupSave($).catch(() => undefined)
    startTimers($, 'start')
    // Clears a status entry left by older versions.
    $.ui.status(undefined)
    void $.session.model().then(m => modelIs($, m)).catch(() => undefined)
    renderLog.push(`${new Date().toISOString()} ${loadedSession} session.start (${e.surface ?? '?'}), ready in ${Date.now() - sessionStarted} ms`)
    void writeRenderLog($).catch(() => undefined)
    return next(e)
  })

  // A resumed or forked chat has seen no response here, so the countdown starts from the app's figures.
  on('classic.SessionStart', async ($, e, next) => {
    const result = await next(e)
    const r = e as { source?: string; seconds_since_last_response?: number; prompt_cache_likely_expired?: boolean }
    classicStart = { at: Date.now(), said: `${r.source ?? '?'}, ${r.seconds_since_last_response ?? '?'}s since reply, expired ${r.prompt_cache_likely_expired ?? '?'}` }
    if ((r.source === 'resume' || r.source === 'fork') && typeof r.seconds_since_last_response === 'number' && cacheExpires === 0) {
      const now = await $.clock.now()
      lastResponseAt = now - r.seconds_since_last_response * 1000
      const left = lastResponseAt + CACHE_TTL[cacheTtl]
      cacheExpires = r.prompt_cache_likely_expired || left <= now ? now - 1 : left
      await rememberCache($)
      await checkSwamp($).catch(() => undefined)
      await showCache($).catch(() => undefined)
      // A redraw asked now can land before the band exists, so ask again over the next seconds.
      $.ui.invalidate('ui.render')
      redrawSoon()
    }
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId) await agentEnded($, e.agentId, e.reason)
    if (!e.agentId) await setTurnBusy($, false)
    if (!e.agentId && heldPick) {
      const held = heldPick
      heldPick = null
      if (await autoOn($)) await choose($, held)
    }
    // Its last block carries the warning card (see AssistantMessage).
    if (!e.agentId && e.reason === 'answer') await update($, lastAnswer, () => e.answer.trim())
    if (!e.agentId && turnCost > 0) await update($, lastTurn, () => ({ cost: turnCost, ms: e.durationMs ?? 0 }))
    // A landed handoff card stays under the first reply after it and goes with the next.
    if (!e.agentId) {
      await update($, handoffCard, card => (!card || cardRunning(card.kind) ? card : card.seen ? null : { ...card, seen: true }))
    }
    if (!e.agentId && (await read($, handoffStage)) === 'writing') {
      if (e.reason === 'answer' && e.answer.trim()) handoffText = e.answer
      else {
        await update($, handoffStage, () => null)
        $.ui.toast('CGP Effort: the handoff was not written, nothing was cleared')
      }
    }
    return result
  })

  // Answers commands/cgp-effort.md here, so the file's text never reaches the model; both spellings the app may use.
  on('command.run', async ($, e, next) => {
    if (e.command !== 'cgp-effort' && e.command !== 'cgp-effort:cgp-effort') return next(e)
    const wanted = await read($, suggestion)
    const arg = e.args.trim().toLowerCase()
    if (arg.startsWith('card')) {
      const stage = arg.slice(4).trim() || 'done'
      const stages = ['offer', 'updating', 'done', 'failed']
      if (stage === 'off') {
        await update($, updateCard, () => null)
        return { text: 'The preview card is gone.' }
      }
      if (!stages.includes(stage)) return { text: 'Use /cgp-effort card offer, updating, done, failed or off.' }
      const version = (await installedVersion($)) ?? '1.0.0'
      await update($, updateCard, () => ({
        stage: stage as UpdateCard['stage'], version, note: 'A short release note, as users see it.', at: Date.now(),
        ...(stage === 'failed' ? { detail: 'A made-up failure, for the look of the card.' } : {}),
      }))
      $.ui.invalidate('ui.render')
      return { text: `The update card shows its "${stage}" look (a preview). /cgp-effort card off clears it.` }
    }
    if (arg === 'update') {
      await checkUpdate($).catch(() => undefined)
      const card = await read($, updateCard)
      if (!card || card.stage === 'done') return { text: `CGP Effort ${(await installedVersion($)) ?? ''} is the newest (${lastUpdateCheck}).` }
      void runUpdate($, card)
      return { text: `Updating to ${card.version}…` }
    }
    if (arg === 'agents' || arg === 'agents demo') {
      if (arg === 'agents demo') {
        const now = await $.clock.now()
        await update($, agentsState, () => demoAgents(now))
        await update($, agentFiles, () => demoFiles(now))
        await update($, agentSteps, () => demoSteps())
      }
      await $.ui.open({ id: 'cgp-effort-agents', title: 'Agents' })
      return { text: arg === 'agents demo' ? 'The agent panel shows sample agents (a preview).' : 'The agent panel is open.' }
    }
    if (arg === 'auto') {
      await toggleAutoEffort($)
      if (config.autoEffort === 'off') return { text: 'Auto effort is switched off in Settings (Effort card, or autoEffort in /plugin). The effort is yours.' }
      return { text: (await read($, isAuto)) ? 'Auto on: effort is picked for every prompt.' : 'Auto off: the effort is yours.' }
    }
    if (arg === 'hot') {
      await update($, hotHidden, () => null)
      await $.store.set('hotClosed', null).catch(() => undefined)
      await update($, hot, () => ({ kind: 'five_hour', percent: 82, resetsAt: new Date(Date.now() + 2 * 3600_000).toISOString() }))
      $.ui.invalidate('ui.render')
      return { text: 'The running-hot band is showing now (a test). It goes away at the next check unless a limit really is close.' }
    }
    if (arg === 'down') {
      await update($, judgeDownHidden, () => null)
      await update($, judgeDown, () => 'Jev is out of credits (402)')
      $.ui.invalidate('ui.render')
      return { text: 'The judge-down band is showing now (a test). It goes away once the judge answers again.' }
    }
    if (arg === 'swamp') {
      await update($, swampHiddenAt, () => null)
      await update($, swamped, () => SWAMP_TOKENS)
      $.ui.invalidate('ui.render')
      return { text: 'The swamp band is showing now (a test). It goes away at the next check unless the chat really is swamped.' }
    }
    if (arg === 'save') return { text: await toggleSave($) }
    // handoff [full] [what the next chat is for]: the rest keeps its case and aims the handoff at it.
    const handoffArgs = /^handoff(\s+full)?(?:\s+([\s\S]*))?$/i.exec(e.args.trim())
    if (handoffArgs) {
      const full = Boolean(handoffArgs[1])
      const focus = (handoffArgs[2] ?? '').trim()
      const { after } = await lastHandoffChoice($)
      await startHandoff($, full, after, focus)
      const what = handoffWhat({ kind: full ? 'full' : 'quick', after }, config.handoffSkill)
      return { text: `Writing the ${full ? 'full' : 'quick'} handoff${focus ? ` for: ${focus}` : ''}. ${what.by}. ${what.then}` }
    }
    if (arg.startsWith('probe')) {
      probeLevel = Number(arg.slice(5).trim()) || 0
      await update($, settingsOpen, () => true)
      $.ui.invalidate('ui.render')
      return { text: `Probe ${probeLevel} drawn above the prompt (0 is the real panel). Tell me if you see it.` }
    }
    if (arg === 'debug') {
      const ago = (t: number) => (t ? `${Math.round((Date.now() - t) / 1000)}s ago` : 'never')
      const lastFork = (await $.store.get('lastFork').catch(() => null)) as { at: number; outcome: string } | null
      return {
        text: [
          `session.start ${ago(sessionStarted)}`,
          `app SessionStart: ${classicStart ? `${ago(classicStart.at)} (${classicStart.said})` : 'never'}`,
          `cache: ${cacheExpires === 0 ? 'not started' : `${await cacheMinutes($)} min left`}, shown ${await read($, cacheLeft)}, ttl ${cacheTtl}, last reply ${lastResponseAt ? ago(lastResponseAt) : 'none seen'}, replies seen ${repliesSeen}, forced ${coldForced}`,
          `band asked for ${renderCalls} times, last ${ago(lastRenderAt)}`,
          `band error: ${lastRenderError || 'none'}`,
          `last draw: ${lastRenderBranch || 'none'}`,
          `app sent: ${lastRenderProps || 'nothing'}`,
          `settings open: ${await read($, settingsOpen)}`,
          `setup step: ${await read($, setupStep)}`,
          `handoff: ${await read($, handoffStage)}`,
          `last fork: ${lastFork ? `${lastFork.outcome}, ${ago(lastFork.at)}` : 'none'}`,
          `hidden: ${config.hide.join(',') || 'nothing'}`,
          `model: ${config.modelAuto === 'on' ? `cheaper when it can, now ${routed ?? 'the chat\'s'}` : 'always the chat\'s'}`,
          lastRequest
            ? `last request: app asked ${lastRequest.appModel} at ${lastRequest.appEffort ?? 'none'}, sent ${lastRequest.model} at ${lastRequest.effort ?? 'none'}${lastRequest.model === lastRequest.appModel && lastRequest.effort === lastRequest.appEffort ? ' (unchanged)' : ' (changed by CGP Effort)'}, ${ago(lastRequest.at)}`
            : 'last request: none yet',
          `compact with: ${config.compactWith}${lastHaikuCompact ? `, last by Haiku ${ago(lastHaikuCompact)}` : ''}`,
        ].join(' | ') +
          `
model used: ${lastRequest ? `${lastRequest.model} at ${lastRequest.effort ?? 'none'}` : 'none yet'}`,
      }
    }
    if (arg === 'settings') {
      await openPluginSettings($)
      return { text: 'The CGP Effort settings are open above the prompt.' }
    }
    if (arg === 'setup') {
      await update($, setupStep, () => 'pick')
      $.ui.invalidate('ui.render')
      return { text: 'The CGP Effort setup is open above the prompt.' }
    }
    if (arg === 'bench') {
      const cases = (JSON.parse(await $.fs.read(`${$.plugin.root}/bench/judge-cases.json`)) as { cases: BenchCase[] }).cases
      const answers = await runBench($, cases)
      const report = benchReport(cases, answers)
      const stamp = new Date(await $.clock.now()).toISOString().slice(0, 16).replace(/[:T]/g, '-')
      const out = `cgp-effort-bench-${stamp}`
      await $.fs.write(`${out}.json`, JSON.stringify({ cases: cases.length, answers }, null, 2))
      await $.fs.write(`${out}.md`, report)
      return { text: `${report}

Saved to ${out}.md and .json` }
    }
    if (arg === 'cold') {
      coldForced = true
      cacheExpires = await $.clock.now()
      await update($, cacheLeft, () => 0)
      $.ui.invalidate('ui.render')
      return { text: 'The cache shows as cold now (a test). Compact is in the footer. The next response restarts the countdown.' }
    }
    if (arg === 'stats' || arg === 'saved') {
      const warm = warmUps ? `\nKept the cache warm ${warmUps} time${warmUps === 1 ? '' : 's'}, about ${Math.round(warmCost / 1000)}k weighted tokens.` : ''
      return { text: `Auto, this session:\n${savedText(await read($, saved))}${warm}` }
    }
    if (!wanted) return { text: 'No model suggestion right now.' }
    if (arg === 'switch') {
      $.clock.after(0, () => void switchModel($, wanted))
      return { text: `Switching to ${wanted}. The context reloads.` }
    }
    declined = wanted
    await update($, suggestion, () => null)
    return { text: `Keeping the current model.` }
  })

  on('prompt.submit', async ($, e, next) => {
    await setTurnBusy($, true)
    turnCost = 0
    const card = await read($, handoffCard)
    if (card && (card.kind === 'done' || card.kind === 'copied')) await update($, handoffCard, () => null)
    const byPerson = e.origin.kind === 'composer' || e.origin.kind === 'bridge' || e.origin.kind === 'sdk'
    if (byPerson) lastPromptAt = await $.clock.now().catch(() => Date.now())
    // Runs whether or not Auto is on.
    if (byPerson && !e.text.trim().startsWith('/') && !isFollowUp(e.text)) void checkHandoff($, e.text).catch(() => undefined)
    const wantsEffort = await autoOn($)
    const wantsModel = await read($, isAutoModel)
    // Only skills and custom commands are judged, told what the command does; the app's own and CGP Effort's never are.
    const slash = e.text.trim().startsWith('/')
    const skill = slash && byPerson ? await typedSkill($, e.text) : undefined
    if (!byPerson || (slash && !skill) || (!wantsEffort && !wantsModel)) return next(e)
    const modelId = await $.session.model()
    await modelIs($, modelId)
    if (!cacheSafe(modelId) && keyOf(modelId) !== 'haiku') return next(e)
    const before = await read($, pick)
    // Typed mid-turn it often steers that task: the judge is told, so it can keep the effort.
    const midTurn = e.turnId !== undefined && before !== null
    const said = skill ? `${e.text}

[This is a slash command that runs a skill: ${skill.description || skill.name}. Judge the work the skill will do.]` : e.text
    const shown = midTurn ? withMidTurn(withAttachments(said, e.attachments), before.effort) : withAttachments(said, e.attachments)
    if (wantsEffort && before && before.by !== 'manual' && !e.attachments?.length && !slash && isFollowUp(e.text) && keepsEffort(e.text, await recentContext($).catch(() => ''))) {
      await countPrompt($, before.effort, undefined, 0, 0)
      void proof($, `follow-up "${e.text.trim()}": keeping ${before.effort}`)
      return next(e)
    }
    // A level the person named ("max effort") runs past Min, Max and save mode; no judge is asked.
    const named = wantsEffort && !slash ? namedEffort(e.text) : undefined
    if (named) {
      const inUse = await sessionModel($)
      const applied: Pick = { model: inUse, effort: named, why: 'you asked for it', by: 'named' }
      const running = await read($, pick)
      if (midTurn && running && EFFORTS.indexOf(named) < EFFORTS.indexOf(running.effort)) heldPick = applied
      else {
        heldPick = null
        await choose($, applied)
      }
      if (!midTurn && routed) routed = null
      await countPrompt($, inUse !== 'haiku' ? named : undefined, 'named', 0, 0)
      void proof($, `named level ${named} in "${e.text.slice(0, 50)}": no judge`)
      $.ui.invalidate('ui.render')
      return next(e)
    }

    judgeStartedAt = await $.clock.now().catch(() => Date.now())
    judgeEndedAt = null
    renderLog.push(`${new Date().toISOString()} ${loadedSession} glow: start`)
    drawGlowSteps($, 0, JUDGE_RISE_MS)
    $.ui.invalidate('ui.render')
    await update($, isJudging, () => true)
    try {
      const inUse = await sessionModel($)
      const startedAt = Date.now()
      const { verdict, tokens: judgeTokens } = await judge($, shown, {
        model: inUse,
        effort: (await read($, pick))?.effort ?? 'medium',
        why: '',
        by: 'manual',
      })
      await endJudgeGlow($, 'verdict')
      const ms = Date.now() - startedAt
      await countPrompt($, wantsEffort && inUse !== 'haiku' ? verdict?.effort : undefined, verdict?.by, ms, judgeTokens)
      void proof(
        $,
        verdict
          ? `judged by ${verdict.by} in ${ms} ms: ${verdict.model}/${verdict.effort} (${verdict.why}) for "${e.text.slice(0, 50)}"`
          : `no verdict after ${ms} ms for "${e.text.slice(0, 50)}"`,
      )
      $.ui.invalidate('ui.render')
      if (verdict) {
        // The model is only suggested: switching it reloads the context.
        if (wantsEffort) {
          const saving = (await read($, saveUntil)) !== null
          const leaned = bounded(tipped(verdict.effort, verdict.sure, config.bias), config.floor, config.ceiling)
          const effort = capped(leaned, saving)
          const why = effort !== leaned ? 'save mode' : leaned !== verdict.effort ? 'your settings' : verdict.why
          const applied: Pick = { ...verdict, model: inUse, effort, why }
          // Mid-turn, a lower verdict waits for the turn to end so the running task keeps its effort; a higher one applies.
          const running = await read($, pick)
          if (midTurn && running && EFFORTS.indexOf(effort) < EFFORTS.indexOf(running.effort)) {
            heldPick = applied
            void proof($, `typed mid-turn: ${effort} waits, the running turn keeps ${running.effort}`)
          } else {
            heldPick = null
            await choose($, applied)
          }
        }
        if (!midTurn) {
          let to = wantsEffort && config.modelAuto === 'on' ? routeTo(verdict.model, inUse) : null
          // A redo after a cheaper answer is a miss: the retry and the next few prompts stay on the chat's model.
          if (routed && looksLikeRedo(e.text)) {
            stayUp = REDO_STAY_PROMPTS
            await update($, saved, old => ({ ...asSpent(old), redone: asSpent(old).redone + 1 }))
            void proof($, `redo after ${routed}: the next ${REDO_STAY_PROMPTS} prompts stay on ${inUse}`)
          }
          if (stayUp > 0) {
            stayUp--
            if (to) void proof($, `stays on ${inUse}: a cheaper answer was just redone (${stayUp} more)`)
            to = null
          }
          // A switch to a model whose cache is cold writes the whole chat to it: stay when that costs more than it saves.
          const now = await $.clock.now().catch(() => Date.now())
          if (to && !routeWorth(to, inUse, lastContext?.tokens ?? 0, { to: isWarm(to, now), inUse: !(cacheExpires > 0 && now >= cacheExpires) })) {
            void proof($, `stays on ${inUse}: ${to} has a cold cache, switching would cost more`)
            to = null
          }
          if (to) await update($, saved, old => ({ ...asSpent(old), moved: asSpent(old).moved + 1 }))
          if (to !== routed) {
            routed = to
            void proof($, to ? `this prompt runs on ${to} (the chat is on ${inUse})` : `back on ${inUse}`)
            $.ui.invalidate('ui.render')
          }
        }
        if (wantsModel && verdict.model !== inUse && verdict.model !== declined) {
          await update($, suggestion, () => verdict.model)
          $.ui.toast(`Suggestion: switch to ${verdict.model}? /cgp-effort switch or /cgp-effort keep`)
        } else if (verdict.model === inUse) {
          await update($, suggestion, () => null)
        }
      }
    } finally {
      await endJudgeGlow($, 'end')
      await update($, isJudging, () => false)
    }
    return next(e)
  })

  on('classic.PostModelSwitch', async ($, e, next) => {
    const result = await next(e)
    await modelIs($, e.to_model)
    return result
  })

  on('turn.step', async function* ($, e, next) {
    const send = async function* (request: typeof e) {
      if (e.agentId === undefined) lastRequest = { index: e.index, appModel: e.model, appEffort: e.effort, model: request.model, effort: request.effort, at: Date.now() }
      const answer = yield* next(request)
      // Inside the hook: $ calls after it returns are refused.
      if (e.agentId === undefined && answer?.usage) markWarm(request.model, answer.usage, await $.clock.now().catch(() => Date.now()))
      // A cheaper model's request leaves the chat's cache as it was: only the chat's model restarts the countdown.
      if (e.agentId === undefined && answer?.usage && request.model === e.model) await cacheTouched($, answer.usage).catch(() => undefined)
      if (e.agentId === undefined && answer?.usage) turnCost += weighted(answer.usage)
      if (e.agentId !== undefined && answer?.usage) await agentCost($, e.agentId, weighted(answer.usage)).catch(() => undefined)
      return answer
    }
    if (e.agentId === undefined) await setTurnBusy($, true)
    if (e.agentId === undefined) await modelIs($, e.model)
    if (e.agentId === undefined && typeof e.effort === 'string') {
      const seen = e.effort
      const isFirst = engineEffort === undefined
      const isByPerson = !isFirst && seen !== engineEffort
      engineEffort = seen
      if (isFirst || isByPerson) await update($, appEffort, () => seen)
      // A pick carried from the last chat yields to the app's current effort: the person may have set it before this prompt.
      const takesApp = isFirst && pickCarried && !(await read($, isAuto)) && (await read($, pick))?.effort !== seen
      if (isByPerson || takesApp) {
        await update($, isAuto, () => false)
        await $.store.set('isAuto', false)
        await choose($, { model: await sessionModel($), effort: seen, why: 'your pick in the app', by: 'manual' })
        void proof($, `request ${e.index}: you set effort ${seen} yourself, Auto off`)
        // The app has no event for its effort picker, so say it plainly at the first request after.
        $.ui.toast(`CGP Effort: Auto is off. You picked ${EFFORT_LABELS[seen as Effort] ?? seen}; turn Auto on to hand it back.`)
        return yield* send(e)
      }
    }
    if (e.agentId === undefined && routed && (await autoOn($))) {
      const to = MODELS.find(m => m.key === routed)!.id
      const picked = await read($, pick)
      const effort = picked?.effort ?? e.effort
      void proof($, `request ${e.index}: ${e.model} -> ${to} at ${effort}`)
      const result = yield* send({ ...e, model: to, effort })
      if (picked && picked.by !== 'manual' && result.usage) await tally($, picked.effort, result.usage)
      return result
    }
    if (e.agentId !== undefined && config.helpers === 'on' && config.autoEffort === 'on' && typeof e.effort === 'string' && keyOf(e.model) !== 'haiku') {
      const effort = await helperEffortOf($, e.agentId)
      if (effort) {
        if (e.index === 0) void proof($, `helper ${e.agentId} request 0 (${e.model}): effort ${e.effort} -> ${effort}`)
        const result = yield* send({ ...e, effort })
        if (result.usage) await helperTally($, result.usage).catch(() => undefined)
        return result
      }
    }
    const p = await read($, pick)
    // Haiku takes no effort: decided by the model this request names, never by a stored pick.
    if (!p || keyOf(e.model) === 'haiku' || !cacheSafe(e.model)) return yield* send(e)
    // Auto off: a judge's pick is not the person's, and the mod would never see a change to give way to.
    if (p.by !== 'manual' && !(await autoOn($))) return yield* send(e)
    // Subagents run at the turn's effort, never below medium: a helper's answer goes back unchecked (see helperFloor).
    // One whose definition sets its own effort cannot be told apart, so it follows the turn too.
    if (e.agentId !== undefined) {
      if (p.by === 'manual') return yield* send(e)
      const floor = helperFloor(config.floor, config.ceiling)
      const effort = EFFORTS.indexOf(p.effort) < EFFORTS.indexOf(floor) ? floor : p.effort
      if (e.index === 0) void proof($, `subagent ${e.agentId} (${e.model}): effort ${e.effort ?? 'none'} -> ${effort}, the turn's`)
      return yield* send({ ...e, effort })
    }
    if (e.agentId === undefined) void proof($, `request ${e.index} (${e.model}): effort ${e.effort ?? 'none'} -> ${p.effort}`)
    const result = yield* send({ ...e, effort: p.effort })
    if (e.agentId === undefined && p.by !== 'manual' && result.usage) {
      await tally($, p.effort, result.usage)
      void proof(
        $,
        `response ${e.index} at ${p.effort}: ${result.usage.output_tokens} out, ${result.usage.cache_read_input_tokens ?? 0} cache read, ${result.usage.cache_creation_input_tokens ?? 0} cache write`,
      )
    }
    return result
  })

  // The footer layout: the level is plain Text, since a Button cannot be coloured and the footer draws no tint.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || config.layout === 'default') return next(e)
    const { Box, Text, Button } = themedEls($.ui.resolve(e))
    const v = await snap($)
    const handoffNow = (await read($, handoffStage)) !== null
    const needsSetup = await read($, setupPending)
    const effortNow = effortOf(v, v.modelNow ?? 'sonnet')
    const saving = (await read($, saveUntil)) !== null
    const label = v.judging
      ? 'Deciding…'
      : v.switchedNow
        ? `${EFFORT_LABELS[v.switchedNow.from]} → ${EFFORT_LABELS[v.switchedNow.to]}`
        : effortNow
          ? EFFORT_LABELS[effortNow]
          : 'Auto'
    return (
      <Box flexDirection="row" gap={1} alignItems="center">
        {e.props.modes.length > 0 ? <Text dimColor>{e.props.modes.join(' & ')}</Text> : null}
        {/* The spaces are the hover box's padding: Text has none of its own. */}
        {v.auto && v.pausedNow ? (
          <Text dimColor hover={{ scope: 'effort', backgroundColor: HOVER_BOX }}>
            {' Paused '}
          </Text>
        ) : v.auto ? (
          <Text color={saving ? EMBER : ACCENT} bold hover={{ scope: 'effort', backgroundColor: HOVER_BOX }}>
            {` ${label} `}
          </Text>
        ) : (
          <Text dimColor hover={{ scope: 'effort', backgroundColor: HOVER_BOX }}>
            {' Off '}
          </Text>
        )}
        <Button key="auto" plain dimColor label={v.auto ? ' ● ' : ' ○ '} hover={{ scope: 'power', backgroundColor: HOVER_BOX }} onPress={() => toggleAutoEffort($)} />
        {needsSetup ? (
          <Button
            key="setup"
            plain
            label=" Setup "
            hover={{ scope: 'setup', backgroundColor: HOVER_BOX }}
            onPress={async () => {
              await update($, setupStep, () => 'pick')
              $.ui.invalidate('ui.render')
            }}
          />
        ) : (
          <Button
            key="settings"
            plain
            dimColor
            label=" ⚙︎ "
            hover={{ scope: 'settings', backgroundColor: HOVER_BOX }}
            onPress={async () => {
              if (await read($, settingsOpen)) {
                await update($, settingsDraft, () => ({}))
                await update($, settingsOpen, () => false)
                $.ui.invalidate('ui.render')
              } else await openPluginSettings($)
            }}
          />
        )}
        {config.hide.includes('handoff') ? null : (
          <Button
            key="handoff"
            plain
            dimColor
            label={handoffNow ? ' … ' : ' ⇥ '}
            hover={{ scope: 'handoff', backgroundColor: HOVER_BOX }}
            onPress={async () => ((await read($, handoffPick)) ? closeHandoffBar($) : openHandoffBar($))}
          />
        )}
        {config.hide.includes('timer') ? null : v.cacheNow === 0 ? (
          <Text color={ICE} hover={{ scope: 'cache', backgroundColor: HOVER_BOX }}>{cacheLabel(0)}</Text>
        ) : v.cacheNow === null ? null : cacheColor(v.cacheNow) ? (
          <Text color={cacheColor(v.cacheNow)} hover={{ scope: 'cache', backgroundColor: HOVER_BOX }}>{cacheLabel(v.cacheNow)}</Text>
        ) : (
          <Text dimColor hover={{ scope: 'cache', backgroundColor: HOVER_BOX }}>{cacheLabel(v.cacheNow)}</Text>
        )}
      </Box>
    )
  })

  // Teammates and workflow agents get no record in the agent panel.
  on('agent.spawn', async ($, e, next) => {
    // A fork shares the chat's context and keeps its effort; without a verdict a helper runs at the chat's effort.
    const helper = config.helpers === 'on' && config.autoEffort === 'on' && !e.fork && !e.isTeammate && !e.workflow
      ? await helperEffort($, e.prompt, e.subagentType).catch(() => null)
      : null
    const waiting = helper ? { description: e.description, type: e.subagentType, parentId: e.parentAgentId, effort: helper.effort } : null
    if (waiting) helperWaiting = [...helperWaiting, waiting].slice(-20)
    const result = await next(e)
    if (waiting) {
      helperWaiting = helperWaiting.filter(w => w !== waiting)
      if ('agentId' in result && result.agentId && !helperPicks.has(result.agentId)) helperPicks.set(result.agentId, waiting.effort)
      if ('agentId' in result && result.agentId) {
        await update($, saved, old => {
          const t = asSpent(old)
          return { ...t, helpers: { ...t.helpers, runs: { ...t.helpers.runs, [waiting.effort]: (t.helpers.runs[waiting.effort] ?? 0) + 1 } } }
        }).catch(() => undefined)
        void proof($, `helper ${e.subagentType} "${e.description}": ${waiting.effort} (${helper?.why})`)
      }
    }
    if (e.isTeammate || e.workflow || !('agentId' in result) || !result.agentId) return result
    const id = result.agentId
    const now = await $.clock.now()
    const rec: AgentRec = { id, type: e.fork ? 'fork' : e.subagentType, task: e.description, state: 'running', startedAt: now, model: result.model }
    if (helper) {
      rec.effort = EFFORT_LABELS[helper.effort]
      rec.why = helper.why
    }
    if (e.parentAgentId) rec.parentId = e.parentAgentId
    await update($, agentsState, list => [...list.filter(a => a.id !== id), rec].slice(-40))
    return result
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    const input = e as unknown as Record<string, unknown>
    const touch = touchOf(e.tool, input)
    const isList = e.tool === 'TodoWrite' || e.tool === 'TaskCreate' || e.tool === 'TaskUpdate'
    const known = id !== undefined && (await read($, agentsState)).some(a => a.id === id)
    if (!touch && !known && !(id === undefined && isList)) return next(e)
    if (known && id !== undefined) {
      const now = await $.clock.now()
      const file = touch ? (relPath(touch.path, await $.session.root()) ?? undefined) : undefined
      await agentSet($, id, a => ({ ...a, now: toolLine(e.tool, input), toolSince: now, file }))
    }
    const result = await next(e)
    const ok = !('deny' in result && result.deny) && !result.isError
    if (ok && touch) await fileTouched($, touch.path, touch.edited, id ?? 'main').catch(() => undefined)
    if (ok && id === undefined && isList) {
      if (e.tool === 'TodoWrite') await update($, agentSteps, () => stepsFromTodos(e.todos))
      else if (e.tool === 'TaskCreate') {
        const taskId = (result.result as { task?: { id?: string } } | undefined)?.task?.id
        if (taskId) await update($, agentSteps, steps => withTaskCreated(steps ?? [], taskId, e))
      } else await update($, agentSteps, steps => (steps ? withTaskUpdated(steps, e) : steps))
    }
    if (known && id !== undefined) {
      const steps = ok && e.tool === 'TodoWrite' ? stepsFromTodos(e.todos) : undefined
      await agentSet($, id, a => ({ ...a, toolSince: undefined, file: undefined, state: a.state === 'waiting' ? 'running' : a.state, ...(steps ? { steps } : {}) }))
    }
    return result
  })

  on('ui.render', { component: 'Pane', requestId: 'cgp-effort-agents' }, async ($, e) => {
    const els = themedEls($.ui.resolve(e))
    const agents = await read($, agentsState)
    const open = await read($, agentsOpen)
    const rows = Math.max(12, e.props.scroll.bodyRows)
    return agentsPane(
      {
        ...els,
        rows,
        nowMs: await $.clock.now(),
        title: 'This chat',
        open,
        ringSvg,
        cardArt: { source: DASH_SVG, width: FROST_WIDTH * 2, height: FROST_HEIGHT * 2 },
        onOpen: (id: string) => update($, agentsOpen, cur => (cur === id ? null : id)),
        files: await read($, agentFiles),
        steps: await read($, agentSteps),
        module: await read($, agentsModule),
        onModule: (key: string) => update($, agentsModule, cur => (cur === key ? null : key)),
      },
      agents,
    )
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    if (config.hide.includes('line')) return next(e)
    const { Box, Text } = themedEls($.ui.resolve(e))
    const v = await snap($)
    const effortNow = effortOf(v, v.modelNow ?? 'sonnet')
    const took = Math.max(1, Math.round(e.props.durationMs / 1000))
    return (
      <Box key="turn-line" flexDirection="row" gap={1}>
        <Text dimColor>{`${e.props.word} ${took < 60 ? `${took}s` : `${Math.floor(took / 60)}m ${took % 60}s`}`}</Text>
        <Text color={ACCENT}>{`✦ ${effortNow ? EFFORT_LABELS[effortNow] : 'Auto'}`}</Text>
        {v.cacheNow === null ? null : (
          <Text dimColor={cacheColor(v.cacheNow) === undefined} color={cacheColor(v.cacheNow)}>{`· ${v.cacheNow <= 0 ? 'cache cold' : `cache ${cacheLabel(v.cacheNow)}`}`}</Text>
        )}
      </Box>
    )
  })

  // Counted and guarded for /cgp-effort debug: an error here otherwise only leaves the slot empty.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Setup changes a reload cut off are saved here: the reloaded plugin draws before anything else runs.
    void drainSetupSave($).catch(() => undefined)
    void afterLoad($).catch(() => undefined)
    await restoreCache($).catch(() => undefined)
    renderCalls++
    lastRenderAt = Date.now()
    void refreshAppearance($).catch(() => undefined)
    lastRenderProps = JSON.stringify(e.props).slice(0, 200)
    renderLog.push(`${new Date(lastRenderAt).toISOString()} ${loadedSession} ${lastRenderProps}`)
    if (!firstDrawLogged) {
      firstDrawLogged = true
      renderLog.push(`${new Date().toISOString()} ${loadedSession} first draw asked ${lastRenderAt - loadedAt} ms after load`)
      void writeRenderLog($).catch(() => undefined)
    }
    try {
    if (e.props.hasSurvey) {
      lastRenderBranch = 'stepped aside: the app has a survey in this spot'
      return next(e)
    }
    const asked = await $.store.get('openSettingsAt')
    const askedHere =
      asked && typeof asked === 'object' && (asked as { session?: string }).session === (await $.session.id().catch(() => ''))
        ? (asked as { at: number }).at
        : null
    if (typeof askedHere === 'number') {
      await $.store.set('openSettingsAt', null)
      if (Date.now() - askedHere < 60_000 && !(await read($, settingsOpen))) await update($, settingsOpen, () => true)
    }
    lastRenderBranch = (await read($, settingsOpen)) ? 'drew the settings panel' : 'drew a band or nothing'
    const { Box, Text, Button, Svg, Link } = themedEls($.ui.resolve(e))
    if (await read($, settingsOpen)) {
      // The app drops a tree taller than maxRows whole, without a word: with gaps the panel is 12 rows, without 7.
      const roomy = (typeof e.props.maxRows === 'number' ? e.props.maxRows : 12) >= 12
      const { Input, Select } = themedEls($.ui.resolve(e))
      const opts = (values: readonly string[]) => values.map(value => ({ value, label: value }))
      // Picked from what is installed: a plugin cannot open a file dialog, and a skill is run by its name anyway.
      const skillNames = await read($, installedSkills)
      const hasKey = Boolean(await jevKey($).catch(() => undefined)) || Boolean(await typesafeKeyAnywhere($).catch(() => undefined))
      const checking = await read($, updateCheck)
      // For a plain ✕ button: a dismiss-role button may be taken by the app before onPress runs.
      const close = async () => {
        await update($, settingsDraft, () => ({}))
        await update($, judgeTest, () => null)
        await update($, settingsCard, () => null)
        await update($, settingsOpen, () => false)
        $.ui.invalidate('ui.render')
      }
      const draft = await read($, settingsDraft)
      const tested = await read($, judgeTest)
      const card = await read($, settingsCard)
      const openCard = (to: SettingsCard | null) => async () => {
        await update($, settingsCard, () => to)
        $.ui.invalidate('ui.render')
      }
      const set = (field: keyof SettingsDraft) => async (value: string) => {
        await update($, settingsDraft, d => ({ ...d, [field]: value }))
        $.ui.invalidate('ui.render')
      }
      const shown = {
        bias: draft.bias !== undefined ? Number(draft.bias) : config.bias,
        floor: (draft.floor ?? config.floor) as Effort,
        ceiling: (draft.ceiling ?? config.ceiling) as Effort,
        judge: (draft.judge ?? config.judge) as JudgeConfig['judge'],
        handoffAfter: draft.handoffAfter ?? config.handoffAfter,
        handoffSkill: draft.handoffSkill ?? config.handoffSkill,
        swampAt: draft.swampAt ?? String(config.swampAt),
        layout: draft.layout ?? config.layout,
        compactWith: draft.compactWith ?? config.compactWith,
        handoffButton: draft.handoffButton ?? config.handoffButton,
        keepWarm: draft.keepWarm ?? config.keepWarm,
        autoEffort: draft.autoEffort ?? config.autoEffort,
        modelAuto: draft.modelAuto ?? config.modelAuto,
        helpers: draft.helpers ?? config.helpers,
        appearance: draft.appearance ?? config.appearance,
      }
      const helpersNow = await $.clock.now()
      if (helpersSeen !== undefined && helpersSeen !== shown.helpers) helpersFlipAt = helpersNow
      helpersSeen = shown.helpers
      if (autoEffortSeen !== undefined && autoEffortSeen !== shown.autoEffort) autoEffortFlipAt = helpersNow
      autoEffortSeen = shown.autoEffort
      const autoEffortOn = shown.autoEffort === 'on'
      const sameSet = (a: string, b: string) => a.split(',').filter(Boolean).sort().join() === b.split(',').filter(Boolean).sort().join()
      const dirty = Object.entries(draft).some(([field, value]) =>
        value === undefined ? false
        : field === 'key' ? Boolean(value.trim())
        : field === 'hide' ? !sameSet(value, config.hide.join(','))
        : value !== String(config[field as Exclude<keyof SettingsDraft, 'key' | 'hide'>] ?? ''))
      const hidden = (draft.hide ?? config.hide.join(',')).split(',').filter(Boolean)
      const judgeName = shown.judge === 'haiku' ? 'Haiku' : hasKey || shown.judge === 'jev' ? 'Haiku + Jev' : 'Haiku'
      const summaries: Record<SettingsCard, string> = {
        effort: shown.autoEffort === 'off' ? 'Auto effort off' : `${BIAS_WORDS[shown.bias + 2]} · ${shown.floor} to ${shown.ceiling}${shown.helpers === 'on' ? ' · helpers' : ''}`,
        model: shown.modelAuto === 'on' ? 'Cheaper when it can' : "Always the chat's",
        judge: tested && tested.ok !== null ? `${judgeName} · ${tested.ok ? 'working' : 'failing'}` : judgeName,
        handoff: `${shown.handoffSkill ? `/${shown.handoffSkill}` : 'Built in'} · compact alert at ${shown.swampAt}%`,
        show: `${shown.layout === 'minimal' ? 'Minimal' : 'Dashboard'} · ${3 - ['timer', 'reason', 'motion'].filter(h => hidden.includes(h)).length} of 3 on`,
      }
      // Switches a part off for good; an alert's own ✕ only closes it for now.
      const box = ([part, label]: readonly [Hideable, string]) => {
        const off = hidden.includes(part)
        const after = off ? hidden.filter(h => h !== part) : [...hidden, part]
        return (
          <Button key={`show-box-${part}`} plain dimColor={off} label={`${off ? '☐' : '☑'}︎ ${label}`}
            onPress={() => set('hide')(after.join(','))} />
        )
      }
      const toggles = ([['timer', 'Cache timer'], ['reason', 'Judge line'], ['motion', 'Animations']] as const).map(box)
      const alertToggles = ([['swamp', 'Context alert'], ['hot', 'Running low alert'], ['cold', 'Cold cache alert']] as const).map(box)
      const track: unknown[] = []
      for (const n of [-2, -1, 0, 1, 2]) {
        if (n > -2) track.push(<Text key={`t${n}`} dimColor>─</Text>)
        track.push(<Button key={`bias${n + 2}`} plain label={n === shown.bias ? '◉' : '○'} onPress={() => set('bias')(String(n))} />)
      }
      const term = e.surface === 'terminal'
      const iconKind = { [ICON_EFFORT]: 'effort', [ICON_JUDGE]: 'judge', [ICON_HANDOFF]: 'handoff', [ICON_SHOW]: 'show' } as const
      const row = (key: string, label: string, icon: string, children: unknown[]) => (
        <Box key={key} flexDirection="row" gap={1} alignItems="center">
          <Box width={13} flexShrink={0} flexDirection="row" gap={1} alignItems="center">
            <Box flexShrink={0} width={2} alignItems="center">
              {Svg && !term ? (
                <Svg source={rowIconSvg(iconKind[icon as keyof typeof iconKind], DASH_DIM)} alt={label} width={14} height={14} />
              ) : (
                <Text color={ACCENT}>{icon}</Text>
              )}
            </Box>
            <Text dimColor>{label}</Text>
          </Box>
          <Box flexDirection="row" flexWrap="wrap" gap={1} alignItems="center" flexShrink={1}>
            {children}
          </Box>
        </Box>
      )
      // The terminal's dropdown opens inside the wrapping row, which jumps the layout: a short list is a row of buttons
      // there, the picked one boxed; a long one (the skills) stays a dropdown.
      type Pick = { key: string; label?: string; value: string; options: { value: string; label: string }[]; onSelect: (v: string) => unknown }
      const pick = (p: Pick) => term && p.options.length <= 5 ? (
        <Box key={p.key} width="100%" flexDirection="row" flexWrap="wrap" columnGap={1} alignItems="center">
          {p.label ? <Text key={`${p.key}-label`} dimColor>{p.label}</Text> : null}
          {p.options.map(o => o.value === p.value ? (
            <Button key={`${p.key}-${o.value}`} variant="secondary" label={o.label} onPress={() => p.onSelect(o.value)} />
          ) : (
            <Button key={`${p.key}-${o.value}`} plain dimColor label={o.label} onPress={() => p.onSelect(o.value)} />
          ))}
        </Box>
      ) : (
        <Select key={p.key} label={p.label} value={p.value} options={p.options} onSelect={p.onSelect} />
      )
      const field = (key: string, input: unknown, width: number) => (
        <Box key={key} width={width} flexShrink={1}>
          {input}
        </Box>
      )
      // The header is absolute layers drawn in order (bar and art, title, buttons) over a spacer that keeps its row free.
      if (probeLevel === 1) {
        return (
          <Box key="probe" borderStyle="round" borderColor={BRAND_EDGE} paddingX={1}>
            <Text>CGP Effort probe 1: a bare box</Text>
          </Box>
        )
      }
      const frameOnly = probeLevel === 2
      const bare = probeLevel === 3
      // Desktop keeps title and buttons as absolute layers under the panel; the terminal gets a wrapping row.
      const headRow = (kids: unknown[]) => term
        ? <Box key="settings-head" flexDirection="row" flexWrap="wrap" justifyContent="space-between" columnGap={2}>{kids}</Box>
        : kids
      const bugUrl = ownVersion ? `${REPORT_BUG_URL}?body=${encodeURIComponent(`Version: ${ownVersion}\n\n`)}` : REPORT_BUG_URL
      return (
        <Box key="settings" position="relative" flexDirection="column" gap={roomy && !term ? 1 : 0} paddingX={term ? 1 : 2} overflow="hidden"
          backgroundColor={DASH_BG} borderStyle="round" borderColor={DASH_EDGE}>
          {term ? null : introLayer({ Box, Svg }, 'settings', await introShows($, 'settings'))}
          {!term ? (
            <Box key="settings-bar" position="absolute" top={-1} left={0} right={0} height={3.5} overflow="hidden" backgroundColor={DASH_HEAD}>
              <Box key="settings-bar-mark" position="absolute" top={-2} right={20} marginTop={1}>
                <Svg source={SETTINGS_MARK} alt="CGP Effort mark" width={140} height={140} />
              </Box>
              {/* A one-pixel image stretched across: a Box cannot draw one pixel. */}
              <Box key="settings-rule" position="absolute" bottom={0} left={0} right={0} height={1} alignItems="flex-end">
                <Svg source={`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1" viewBox="0 0 1600 1" preserveAspectRatio="none"><rect width="1600" height="1" fill="${DASH_EDGE}"/></svg>`} alt="rule" width={1600} height={1} />
              </Box>
            </Box>
          ) : null}
          {headRow([
          <Box key="settings-title" {...(term ? { flexShrink: 0 } : { position: 'absolute', top: 0, left: 2, height: 2.5 })} flexDirection="row" alignItems="center" gap={1}>
            {term ? <Text color={ACCENT} bold>✦</Text> : null}
            {Svg && !term ? <Svg source={SETTINGS_TITLE} alt="CGP Effort" width={124} height={28} /> : <Text color={DASH_TEXT} bold>CGP Effort</Text>}
            {ownVersion ? <Text color="#6b6b73">v{ownVersion}</Text> : null}
            {card === null ? (
              <Text dimColor>Settings</Text>
            ) : (
              <Box key="settings-trail" flexDirection="row" alignItems="center" gap={1}>
                <Button key="settings-back" variant="secondary" label="← Back" onPress={openCard(null)} />
                <Text color={DASH_TEXT} bold>{CARDS.find(c => c.id === card)?.title}</Text>
              </Box>
            )}
            {dirty ? <Text dimColor> · unsaved changes</Text> : null}
          </Box>,
          <Box key="settings-actions" {...(term ? { flexShrink: 1, flexWrap: 'wrap', columnGap: 2 } : { position: 'absolute', top: 0, right: 2, height: 2.5, gap: 2 })} flexDirection="row" alignItems="center">
            {checking === 'checking' ? (
              <Text dimColor>Checking…</Text>
            ) : checking === 'newest' ? (
              <Text dimColor>✓ Up to date</Text>
            ) : checking.startsWith('found ') && (!ownVersion || isNewer(checking.slice(6), ownVersion)) ? (
              <Button key="settings-update" variant="primary" label={`Update to ${checking.slice(6)}`} onPress={async () => {
                const card = await read($, updateCard)
                await update($, updateCheck, () => 'idle')
                if (card) void runUpdate($, card)
                await close()
              }} />
            ) : (
              <Button key="settings-check-update" plain dimColor label="Check for updates" onPress={() => void checkUpdateNow($)} />
            )}
            {/* A terminal without link support prints the whole address after the label, so there it copies instead. */}
            {term ? (
              <Button key="settings-bug" plain dimColor label="Report a bug" onPress={async () => {
                const r = await $.ui.copy({ text: bugUrl, surface: e.surface }).catch(() => ({ isCopied: false as const }))
                $.ui.toast(r.isCopied ? `Bug report link copied: ${bugUrl}` : `CGP Effort: report a bug at ${bugUrl}`)
              }} />
            ) : (
              <Text color="#9a9aa3"><Link href={bugUrl} label="Report a bug" /></Text>
            )}
            {dirty ? (
              <Button key="settings-save" variant="primary" hotkey="s" label="Save" onPress={() => saveDraft($)} />
            ) : (
              <Button key="settings-save" variant="secondary" dimColor label="Save" onPress={() => {}} />
            )}
            <Button key="settings-close" plain label="✕" onPress={close} />
          </Box>,
          ])}
          {term ? null : <Box key="settings-spacer" height={roomy ? 2 : 1} />}
          {frameOnly ? null : card === null ? (
            <Box key="settings-cards" flexDirection="row" flexWrap="wrap" columnGap={1} rowGap={term ? 0 : 1}>
              <Box position="absolute" top={0} left={0} />
              {CARDS.map(c => (
                <Box key={`card-${c.id}`} position="relative" flexDirection="column" flexGrow={1} width={0} minWidth={18}
                  paddingX={1} borderStyle="round" borderColor={DASH_EDGE} hover={{ backgroundColor: CARD_HOVER, borderColor: CARD_HOVER_EDGE }}>
                  <Box flexDirection="row" gap={1} alignItems="center">
                    {Svg && !term ? <Svg source={rowIconSvg(c.id, DASH_TEXT)} alt={c.title} width={14} height={14} /> : null}
                    {/* The terminal draws the blank buttons below as spaces over the text: there the title is the button. */}
                    {term ? (
                      <Button key={`settings-card-${c.id}`} plain label={`${c.title} ›`} onPress={openCard(c.id)} />
                    ) : (
                      <Text color={DASH_TEXT} bold hover={{ color: '#ffffff' }}>{c.title}</Text>
                    )}
                  </Box>
                  <Text dimColor wrap="truncate" hover={{ dimColor: false, color: DASH_TEXT }}>{summaries[c.id]}</Text>
                  {/* A button is one line high and centred in its box, so three blank ones spread top to bottom cover the card. */}
                  {term ? null : <Box position="absolute" top={0} bottom={0} left={0} right={0} flexDirection="column" justifyContent="space-between">
                    {/* Unshrinkable in a clipping box: a shrunk button cut its blank label to "\u2026". 800 no-break spaces
                        (~2.6 px each) cover a card alone on its row. */}
                    {['', '-2', '-3'].map(n => (
                      <Box key={`settings-card-box-${c.id}${n}`} flexDirection="row" justifyContent="center" overflow="hidden">
                        <Box flexShrink={0}>
                          <Button key={`settings-card-${c.id}${n}`} plain hover={{ backgroundColor: '#00000000' }} label={'\u00a0'.repeat(800)} onPress={openCard(c.id)} />
                        </Box>
                      </Box>
                    ))}
                  </Box>}
                </Box>
              ))}
            </Box>
          ) : (
            <Box key={`settings-${card}`} flexDirection="column" gap={roomy && !term ? 1 : 0} minHeight={term ? undefined : SETTINGS_BODY_H}>
              {/* An empty absolute child positions the box, so its rows paint and take clicks over the sweep and the art. */}
              <Box position="absolute" top={0} left={0} />
              <Text dimColor wrap="truncate">{CARDS.find(c => c.id === card)?.about}</Text>
              <Box flexDirection="row" flexWrap="wrap" gap={1} alignItems="center">
                {card === 'effort' ? [
            <Box key="settings-auto-effort-row" width="100%" flexDirection="row" alignItems="center" gap={1}>
              {Svg && !term ? (
                <Box key="settings-auto-effort" position="relative" flexDirection="row" alignItems="center" gap={1} paddingX={1}>
                  <Svg source={autoSwitchSvg(autoEffortOn, helpersNow - autoEffortFlipAt)} alt={autoEffortOn ? 'Auto effort on' : 'Auto effort off'} width={26} height={15} />
                  <Text color={autoEffortOn ? DASH_TEXT : DASH_DIM}>Auto effort</Text>
                  <Box position="absolute" top={0} bottom={0} left={0} right={0} flexDirection="row" alignItems="center" justifyContent="center" overflow="hidden">
                    <Box flexShrink={0}>
                      <Button key="settings-auto-effort-switch" plain hover={{ backgroundColor: '#00000000' }} label={'\u00a0'.repeat(48)} onPress={() => set('autoEffort')(autoEffortOn ? 'off' : 'on')} />
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Button key="settings-auto-effort-switch" plain label={`${autoEffortOn ? '◉' : '○'} Auto effort`} onPress={() => set('autoEffort')(autoEffortOn ? 'off' : 'on')} />
              )}
              <Text dimColor wrap="truncate">{autoEffortOn ? 'The judge picks the effort for every prompt' : 'Off for good: the effort stays as you set it'}</Text>
            </Box>,
            <Text key="cheap" dimColor>Cheaper</Text>,
            <Box key="track" flexDirection="row" alignItems="center">
              {track}
            </Box>,
            <Text key="smart" dimColor>Smarter</Text>,
            ...(bare
              ? []
              : [
                  <Box key="gap" width={2} />,
                  pick({ key: 'settings-floor', label: 'Min', value: shown.floor, options: opts(EFFORTS), onSelect: set('floor') }),
                  pick({ key: 'settings-ceiling', label: 'Max', value: shown.ceiling, options: opts(EFFORTS), onSelect: set('ceiling') }),
                  <Box key="settings-helpers-row" width="100%" flexDirection="row" alignItems="center" gap={1}>
                    {Svg && !term ? (
                      <Box key="settings-helpers" position="relative" flexDirection="row" alignItems="center" gap={1} paddingX={1}>
                        <Svg source={autoSwitchSvg(shown.helpers === 'on', helpersNow - helpersFlipAt)} alt={shown.helpers === 'on' ? 'Helpers on' : 'Helpers off'} width={26} height={15} />
                        <Text color={shown.helpers === 'on' ? DASH_TEXT : DASH_DIM}>Helpers</Text>
                        {/* No-break spaces (plain ones collapse to a dot), wider than switch and word, clipped to them. */}
                        <Box position="absolute" top={0} bottom={0} left={0} right={0} flexDirection="row" alignItems="center" justifyContent="center" overflow="hidden">
                          <Box flexShrink={0}>
                            <Button key="settings-helpers-switch" plain hover={{ backgroundColor: '#00000000' }} label={'\u00a0'.repeat(40)} onPress={() => set('helpers')(shown.helpers === 'on' ? 'off' : 'on')} />
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      <Button key="settings-helpers-switch" plain label={`${shown.helpers === 'on' ? '◉' : '○'} Helpers`} onPress={() => set('helpers')(shown.helpers === 'on' ? 'off' : 'on')} />
                    )}
                    <Text dimColor wrap="truncate">{shown.helpers === 'on' ? "The judge picks each subagent's effort, medium or more" : "Subagents run at the chat's effort"}</Text>
                  </Box>,
                ]),
] : card === 'judge' ? (bare ? [] : [
            pick({ key: 'settings-judge-pick', value: shown.judge, options: [{ value: 'auto', label: hasKey ? 'Haiku + Jev' : 'Haiku (Jev if added)' }, { value: 'haiku', label: 'Haiku only' }], onSelect: v => set('judge')(v === 'haiku' ? 'haiku' : 'auto') }),
            ...(shown.judge !== 'haiku'
              ? [field('key-field', <Input key="settings-key" placeholder={hasKey ? 'Key saved. Paste to replace' : 'Paste TypeSafe key'}
                  value={draft.key ?? ''} submitLabel="ok" onInput={set('key')} onSubmit={set('key')} />, 30)]
              : []),
            <Button key="settings-judge-test" variant="secondary" dimColor={tested?.ok === null} label={tested?.ok === null ? 'Testing…' : 'Test'}
              onPress={async () => {
                if (tested?.ok === null) return
                await update($, judgeTest, () => ({ ok: null, text: '' }))
                $.ui.invalidate('ui.render')
                const result = await testJudge($, shown.judge, draft.key ?? '')
                await update($, judgeTest, () => result)
                $.ui.invalidate('ui.render')
              }} />,
            ...(tested && tested.ok !== null
              ? [<Text key="settings-judge-result" color={tested.ok ? '#7fd49b' : '#ff8a80'}>{`${tested.ok ? '✓' : '✗'} ${tested.text}`}</Text>]
              : []),
]) : card === 'model' ? (bare ? [] : MODEL_CHOICES.map(c => (
            <Box key={`model-${c.value}`} flexDirection="column" flexGrow={1} flexShrink={1} minWidth={26}>
              <Box flexDirection="row" gap={1} alignItems="center">
                <Button key={`settings-model-${c.value}`} plain label={`${shown.modelAuto === c.value ? '◉' : '○'} ${c.label}`} onPress={() => set('modelAuto')(c.value)} />
                {c.tag ? <Text key={`model-tag-${c.value}`} color={YELLOW} bold>{`⚠ ${c.tag}`}</Text> : null}
              </Box>
              <Text dimColor wrap="wrap">{c.about}</Text>
            </Box>
          )).concat([
            pick({ key: 'settings-compact-with', label: 'Compact with', value: shown.compactWith, options: [{ value: 'haiku', label: 'Haiku 5.5' }, { value: 'session', label: "Chat's model" }], onSelect: set('compactWith') }),
          ])) : card === 'handoff' ? (bare ? [] : [
            <Select key="settings-skill" label="Handoff skill" value={shown.handoffSkill || '-'}
              options={[
                { value: '-', label: 'CGP Effort (built in)' },
                ...[...new Set([...(shown.handoffSkill ? [shown.handoffSkill] : []), ...skillNames])].map(name => ({ value: name, label: `/${name}` })),
              ]}
              onSelect={v => set('handoffSkill')(v === '-' ? '' : v)} />,
            pick({ key: 'settings-swamp', label: 'Compact alert at', value: shown.swampAt, options: SWAMP_STEPS.map(n => ({ value: String(n), label: `${n}%` })), onSelect: set('swampAt') }),
            pick({ key: 'settings-handoff-button', label: 'Handoff button', value: shown.handoffButton, options: [{ value: 'advised', label: 'When advised' }, { value: 'always', label: 'Always' }], onSelect: set('handoffButton') }),
            pick({ key: 'settings-keep-warm', label: 'Keep cache warm', value: shown.keepWarm, options: [{ value: 'off', label: 'Off' }, { value: '1h', label: '1 h' }, { value: '2h', label: '2 h' }, { value: '3h', label: '3 h' }], onSelect: set('keepWarm') }),
            ...alertToggles,
]) : [
            ...(bare
              ? []
              : [
                  pick({ key: 'settings-layout', label: 'Look', value: shown.layout, options: [{ value: 'default', label: 'Dashboard' }, { value: 'minimal', label: 'Minimal' }], onSelect: set('layout') }),
                  pick({ key: 'settings-appearance', label: 'Appearance', value: shown.appearance, options: [{ value: 'auto', label: 'Match Claude Code' }, { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }], onSelect: set('appearance') }),
                ]),
            ...toggles,
            ...(bare ? [] : [uninstallButton($, themedEls($.ui.resolve(e)))]),
]}
              </Box>
            </Box>
          )}
        </Box>
      )
    }
    if (e.surface !== 'terminal' && (await read($, compactAsk))) {
      const { Input } = themedEls($.ui.resolve(e))
      const go = () => compactCold($, compactNote)
      const nowCompact = await $.clock.now()
      // One redraw once the fade is over, to drop its layer.
      if (nowCompact - compactOpenedAt < COMPACT_FADE_MS) $.clock.after(COMPACT_FADE_MS + 150 - (nowCompact - compactOpenedAt), () => $.ui.invalidate('ui.render'))
      return (
        <Box key="compact-bar" position="relative" flexDirection="row" alignItems="center" paddingX={1} overflow="hidden"
          backgroundColor={BRAND_BG} borderStyle="round" borderColor={BRAND_EDGE}>
          <Box key="compact-art" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={BRAND_SVG} alt="CGP Effort" width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
          </Box>
          {nowCompact - compactOpenedAt < COMPACT_FADE_MS + 100 ? (
            <Box key="compact-fade" position="absolute" top={-1} left={0} right={0} bottom={-1}>
              <Svg source={compactFadeSvg(nowCompact - compactOpenedAt)} alt="" width={1600} height={240} />
            </Box>
          ) : null}
          {introLayer({ Box, Svg }, 'compact', await introShows($, 'compact'))}
          <Box key="compact-words" position="relative" flexShrink={0}>
            {markTitle({ Box, Text, Svg }, 'compact-title', ACCENT, '✦ Compact')}
            <Box key="compact-switch-box" position="relative" flexShrink={0} marginLeft={1}>
              <Box position="absolute" top={0} left={0} />
              <Button key="compact-to-handoff" plain dimColor label="Handoff instead" onPress={async () => { await update($, compactAsk, () => false); await openHandoffBar($) }} />
            </Box>
          </Box>
          <Box key="compact-controls" position="relative" flexGrow={1} flexShrink={1} minWidth={0} flexDirection="row" justifyContent="flex-end" alignItems="center" gap={1}>
            <Box position="absolute" top={0} left={0} />
            {/* A right-anchored window clips off the field's own Enter hint, whatever width the app gives the field.
                It reaches a row above and below: one line tall, it cut off the focus ring. */}
            <Box key="compact-field" position="relative" width={48} minWidth={6} height={1} flexShrink={1}>
              <Box position="absolute" top={-1} bottom={-1} left={0} right={0} overflow="hidden">
                <Box position="absolute" top={0} bottom={0} right={-3} width={60} flexDirection="row" alignItems="center" justifyContent="flex-end" paddingRight={1}>
                  <Input key="compact-note" placeholder="Summary (optional)" submitLabel={'​'}
                      onInput={v => { compactNote = v }} onSubmit={v => { compactNote = v; void go() }} />
                </Box>
              </Box>
            </Box>
            {/* Drawn under a blank button: a Button's label is text only, and ↵ there was a hairline. */}
            <Box key="compact-go-box" position="relative" flexShrink={0} flexDirection="row" alignItems="center">
              <Box width={GO_CELLS} height={1} flexShrink={0} />
              <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
                <Svg source={goPillSvg()} alt="Compact" width={GO_W} height={20} />
              </Box>
              <Box position="absolute" top={0} bottom={0} left={0} right={0} flexDirection="row" alignItems="center" justifyContent="center" gap={1}>
                <Text color="#141416">Compact</Text>
                <Svg source={enterSvg('#141416')} alt="Enter" width={14} height={14} />
              </Box>
              <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
                <Button key="compact-go" plain hover={{ backgroundColor: '#00000000' }} label={' '.repeat(GO_CELLS)} onPress={go} />
              </Box>
            </Box>
            <Box key="compact-close-box" position="relative" flexShrink={0}>
              <Box position="absolute" top={0} left={0} />
              <Button key="compact-close" plain label="✕" hover={{ backgroundColor: CARD_CLOSE_HOVER }} onPress={() => update($, compactAsk, () => false)} />
            </Box>
          </Box>
        </Box>
      )
    }
    const choice = await read($, handoffPick)
    if (choice) {
      const setBar = (change: Partial<HandoffChoice>) => async () => {
        if (change.kind && change.kind !== choice.kind) kindFlipAt = await $.clock.now()
        await update($, handoffPick, () => ({ ...choice, ...change }))
        // No invalidate: the write alone redraws the bar; a full one redraws the art too, which flickers.
      }
      const { Select } = themedEls($.ui.resolve(e))
      const what = handoffWhat(choice, config.handoffSkill)
      // The app draws a hotkey's letter faint on a grey button, so only the terminal gets letters.
      const term = e.surface === 'terminal'
      const kindNow = await $.clock.now()
      const controls = [
        !term && Svg ? (
          <Box key="handoff-kind" position="relative" flexShrink={0} flexDirection="row" alignItems="center">
            <Box width={KIND_CELLS * 2} height={1} flexShrink={0} />
            <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
              <Svg source={kindSwitchSvg(choice.kind, kindNow - kindFlipAt)} alt={choice.kind === 'full' ? 'Full handoff' : 'Quick handoff'} width={KIND_W} height={KIND_H} />
            </Box>
            <Box position="absolute" top={0} bottom={0} left={0} right={0} flexDirection="row" alignItems="center">
              {(['quick', 'full'] as const).map(k => (
                <Box key={`handoff-kind-${k}`} flexGrow={1} width={0} flexDirection="row" alignItems="center" justifyContent="center">
                  <Box flexShrink={0} width={2} alignItems="center"><Svg source={rowIconSvg(k, choice.kind === k ? '#141416' : DASH_DIM)} alt={k === 'quick' ? 'bolt' : 'pen'} width={14} height={14} /></Box>
                  <Text color={choice.kind === k ? '#141416' : DASH_DIM}>{k === 'quick' ? 'Quick' : 'Full'}</Text>
                </Box>
              ))}
            </Box>
            <Box position="absolute" top={0} bottom={0} left={0} right={0} flexDirection="row" alignItems="center">
              {(['quick', 'full'] as const).map(k => (
                <Box key={`handoff-kind-hit-${k}`} flexGrow={1} width={0} justifyContent="center">
                  <Button key={`handoff-${k}`} plain hover={{ backgroundColor: '#00000000' }} label={' '.repeat(KIND_CELLS)} onPress={setBar({ kind: k })} />
                </Box>
              ))}
            </Box>
          </Box>
        ) : null,
        term || !Svg ? (choice.kind === 'quick' ? (
          <Button key="handoff-quick" hotkey={term ? 'q' : undefined} variant="secondary" label="Quick" onPress={setBar({ kind: 'quick' })} />
        ) : (
          <Button key="handoff-quick" hotkey={term ? 'q' : undefined} plain dimColor label="Quick" onPress={setBar({ kind: 'quick' })} />
        )) : null,
        term || !Svg ? (choice.kind === 'full' ? (
          <Button key="handoff-full" hotkey={term ? 'f' : undefined} variant="secondary" label="Full" onPress={setBar({ kind: 'full' })} />
        ) : (
          <Button key="handoff-full" hotkey={term ? 'f' : undefined} plain dimColor label="Full" onPress={setBar({ kind: 'full' })} />
        )) : null,
        <Select key="handoff-after" value={choice.after}
          options={[
            { value: 'continue', label: 'Clear & carry on' },
            { value: 'confirm', label: 'Clear & wait' },
            { value: 'copy', label: 'Keep chat & copy' },
          ]}
          onSelect={v => setBar({ after: v as HandoffAfter })()} />,
        <Button key="handoff-go" variant="primary" autoFocus label="Go" onPress={() => goHandoff($, choice)} />,
        <Button key="handoff-close" plain role="dismiss" label="✕" onPress={() => closeHandoffBar($)} />,
      ]
      const line = e.surface === 'terminal' ? `${what.by}. ${what.then}` : choice.kind === 'full' ? (config.handoffSkill ? `/${config.handoffSkill}` : 'Checks git, saves a file') : 'A few seconds'
      if (e.surface === 'terminal') return terminalPanel($, e, 'handoff-bar', '⇥ Handoff', line, controls)
      return (
        // Still art: an animated one sits in a frame the app rebuilds on every redraw. Controls go in a last absolute
        // layer: the app draws flow content under the absolute art, where it takes no clicks.
        <Box key="handoff-bar" position="relative" flexDirection="row" alignItems="center" paddingX={1} overflow="hidden"
          backgroundColor={BRAND_BG} borderStyle="round" borderColor={BRAND_EDGE}>
          <Box key="handoff-art" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={BRAND_SVG} alt="CGP Effort" width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
          </Box>
          {introLayer({ Box, Svg }, 'handoff', await introShows($, 'handoff'))}
          <Box key="handoff-words" position="relative" flexDirection="row" gap={1} flexShrink={1} minWidth={0}>
            <Text color={ACCENT} bold wrap="truncate">
              ⇥ Handoff
            </Text>
            <Text key="handoff-what" dimColor wrap="truncate">
              {line}
            </Text>
          </Box>
          <Box flexGrow={1} minWidth={48} />
          <Box key="handoff-actions" position="absolute" top={0} right={1} bottom={0} flexDirection="row" gap={1} alignItems="center">
            {!term ? <Button key="handoff-to-compact" plain dimColor label="Compact instead" onPress={async () => { await closeHandoffBar($); await openCompact($, e) }} /> : null}
            {controls}
          </Box>
        </Box>
      )
    }
    // The setup guide; its choices are saved together at Done or ✕ (see setupDraft).
    const step = await read($, setupStep)
    if (step) {
      const { Input, Select } = themedEls($.ui.resolve(e))
      const draft = await read($, setupDraft)
      const shown = setupShown(draft, config)
      const pick = (field: keyof SettingsDraft, value: string) => update($, setupDraft, d => ({ ...d, [field]: value }))
      const go = (to: SetupStep | null) => () => goSetup($, to)
      const back = setupBack(step)
      const counter = setupCounter(step)
      // ✕ closes without picking: until a judge is picked the footer keeps offering "Setup".
      const nav = (forward: unknown) => [
        ...(back ? [<Button key="setup-back" plain dimColor label="Back" onPress={go(back)} />] : []),
        forward,
        <Button key="setup-close" plain role="dismiss" label="✕" onPress={() => closeSetup($)} />,
      ]
      const nextButton = <Button key="setup-next" variant="primary" label="Next" onPress={go(setupNext(step))} />
      // Controls in a last absolute layer: flow content is drawn under the absolute art and takes no clicks
      // (position="relative" does not lift it). `room` is their width in columns.
      const band = (words: unknown, room: number, controls: unknown[]) => e.surface === 'terminal' ? (
        terminalPanel($, e, 'setup', counter ? `✦ CGP Effort setup  ${counter}` : '✦ CGP Effort setup', words, controls)
      ) : (
        <Box key="setup" position="relative" flexDirection="row" alignItems="center" paddingX={1} overflow="hidden"
          backgroundColor={BRAND_BG} borderStyle="round" borderColor={BRAND_EDGE}>
          <Box key="setup-art" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={BRAND_SVG} alt="CGP Effort" width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
          </Box>
          <Box key="setup-words" position="relative" flexDirection="column" flexShrink={1} minWidth={0}>
            <Text color={ACCENT} bold wrap="truncate">
              {counter ? `✦ CGP Effort setup  ${counter}` : '✦ CGP Effort setup'}
            </Text>
            {typeof words === 'string' ? <Text key="setup-what" wrap="truncate">{words}</Text> : words}
          </Box>
          <Box flexGrow={1} minWidth={room} />
          <Box key="setup-actions" position="absolute" top={0} right={1} bottom={0} flexDirection="row" gap={1} alignItems="center">
            {controls}
          </Box>
        </Box>
      )
      if (step === 'pick')
        return band('Haiku judges. Add Jev too?', 62, [
          <Box key="pick-haiku" flexDirection="row" gap={1} alignItems="center">
            <Svg source={CLAUDE_MARK} alt="Claude" width={16} height={16} />
            <Button key="setup-haiku" variant="primary" label="Just Haiku (no key)" onPress={() => pickJudge($, 'haiku')} />
          </Box>,
          <Box key="pick-jev" flexDirection="row" gap={1} alignItems="center">
            <Svg source={TYPESAFE_MARK} alt="TypeSafe" width={12} height={18} />
            <Button key="setup-jev" variant="secondary" label="Add Jev (needs a key)" onPress={() => pickJudge($, 'jev')} />
          </Box>,
          ...nav(
            <Button key="setup-skip" plain dimColor label="Skip" onPress={async () => {
              await markSetupDone($)
              await goSetup($, 'lean')
            }} />,
          ),
        ])
      if (step === 'jev')
        return band('Key from typesafe.ai:', 52, [
          <Box key="key-field" width={30} flexShrink={1}>
            <Input key="setup-key" placeholder="TypeSafe key" value={draft.key ?? ''} submitLabel="Save"
              onInput={(v: string) => pick('key', v)}
              onSubmit={async (v: string) => {
                if (!v.trim()) return
                await update($, setupDraft, d => ({ ...d, key: undefined }))
                await saveJevKey($, v, false)
                await goSetup($, 'lean')
              }} />
          </Box>,
          ...nav(<Button key="setup-skip" plain label="Skip" onPress={go('lean')} />),
        ])
      if (step === 'lean') {
        const lean = shown.bias
        const track: unknown[] = []
        for (const n of [-2, -1, 0, 1, 2]) {
          if (n > -2) {
            const lit = lean > 0 ? n > 0 && n <= lean : lean < 0 ? n <= 0 && n > lean : false
            track.push(lit ? <Text key={`t${n}`} color={ACCENT}>──</Text> : <Text key={`t${n}`} dimColor>──</Text>)
          }
          track.push(<Button key={`setup-bias${n + 2}`} plain label={n === lean ? '◉' : '○'} onPress={() => pick('bias', String(n))} />)
        }
        const [name, does] = LEAN_STOPS[lean + 2]
        const side = (label: string, lit: boolean) =>
          lit ? <Text key={label} color={ACCENT}>{label}</Text> : <Text key={label} dimColor>{label}</Text>
        return band(
          <Box key="setup-what" flexDirection="row" flexShrink={1} minWidth={0}>
            <Text color={ACCENT} bold wrap="truncate">{`${name}: `}</Text>
            <Text wrap="truncate">{does}</Text>
          </Box>,
          62,
          [
            side('Cheaper', lean < 0),
            <Box key="track" flexDirection="row" alignItems="center">
              {track}
            </Box>,
            side('Smarter', lean > 0),
            ...nav(nextButton),
          ],
        )
      }
      if (step === 'handoff') {
        const skillNames = await read($, installedSkills)
        return band('Who writes a Full ⇥ handoff?', 48, [
          <Select key="setup-skill" value={shown.handoffSkill || '-'}
            options={[
              { value: '-', label: 'CGP Effort (built in)' },
              ...[...new Set([...(shown.handoffSkill ? [shown.handoffSkill] : []), ...skillNames])].map(name => ({ value: name, label: `/${name}` })),
            ]}
            onSelect={(v: string) => pick('handoffSkill', v === '-' ? '' : v)} />,
          ...nav(nextButton),
        ])
      }
      if (step === 'look') {
        const mode = shown.appearance
        return band('Dark or light panels?', 56, [
          ...(['auto', 'dark', 'light'] as const).map(value => (
            <Button key={`setup-look-${value}`} plain label={`${mode === value ? '◉' : '○'} ${{ auto: 'Match Claude Code', dark: 'Dark', light: 'Light' }[value]}`} onPress={() => pick('appearance', value)} />
          )),
          ...nav(nextButton),
        ])
      }
      return band('● Auto on, ○ off. ⚙ all settings. Auto pauses on Fable.', 24, [
        ...nav(<Button key="setup-done" variant="primary" autoFocus label="Done" onPress={() => finishSetup($)} />),
      ])
    }
    const downReason = await read($, judgeDown)
    if (downReason && !config.hide.includes('down') && downReason !== (await read($, judgeDownHidden))) {
      if (e.surface === 'terminal')
        return terminalBand($, e, {
          key: 'down', kind: 'down', color: SLATE, bg: SLATE_BG, edge: SLATE_EDGE, title: 'Judge down',
          detail: `${downReason}. Haiku stands in.`,
          buttons: [
            <Button key="down-settings" variant="primary" hotkey="s" label="Settings" onPress={() => openPluginSettings($)} />,
            <Button key="down-close" plain role="dismiss" label="✕" onPress={() => update($, judgeDownHidden, () => downReason)} />,
          ],
        })
      return (
        <Box key="down" position="relative" flexDirection="row" gap={1} alignItems="center" paddingX={1} overflow="hidden"
          backgroundColor={SLATE_BG} borderStyle="round" borderColor={SLATE_EDGE}>
          <Box key="down-art" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={DOWN_SVG} alt="judge down" width={FROST_WIDTH} height={FROST_HEIGHT} />
          </Box>
          {introLayer({ Box, Svg }, 'down', await introShows($, 'down'), '#7d8aa8', '#e6ecf8')}
          <Box flexShrink={0}>
            <Text color={SLATE} bold wrap="truncate">
              ✦ Judge down
            </Text>
          </Box>
          <Text wrap="truncate">{`${downReason}. Haiku stands in.`}</Text>
          <Box flexGrow={1} minWidth={30} />
          <Box key="down-actions" position="absolute" top={0} right={1} bottom={0} flexDirection="row" gap={1} alignItems="center">
            <Button key="down-settings" variant="primary" label="Open settings" onPress={() => openPluginSettings($)} />
            <Button key="down-close" plain role="dismiss" label="✕" onPress={() => update($, judgeDownHidden, () => downReason)} />
          </Box>
        </Box>
      )
    }
    const heat = await read($, hot)
    if (heat && !config.hide.includes('hot') && hotVisible(heat, await hotClosedNow($))) {
      const saving = (await read($, saveUntil)) !== null
      const window = heat.kind === 'five_hour' ? '5h' : 'weekly'
      const resets = resetLabel(heat.resetsAt, await $.clock.now())
      if (e.surface === 'terminal')
        return terminalBand($, e, {
          key: 'hot', kind: 'hot', color: EMBER, bg: EMBER_BG, edge: EMBER_EDGE, title: 'Running hot',
          detail: `${Math.round(heat.percent)}% of your ${window} limit used${resets ? ` · resets ${resets}` : ''}`,
          buttons: [
            <Button key="hot-save" variant="primary" hotkey="s" label={saving ? 'Save mode on' : 'Save mode'}
              onPress={async () => { $.ui.toast(`CGP Effort: ${await toggleSave($)}`) }} />,
            <Button key="hot-close" plain role="dismiss" label="✕" onPress={() => closeHot($, heat)} />,
          ],
        })
      return (
        <Box key="hot" position="relative" flexDirection="row" gap={1} alignItems="center" paddingX={1} overflow="hidden"
          backgroundColor={EMBER_BG} borderStyle="round" borderColor={EMBER_EDGE}>
          <Box key="ember" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={EMBER_SVG} alt="embers" width={FROST_WIDTH} height={FROST_HEIGHT} />
          </Box>
          {introLayer({ Box, Svg }, 'hot', await introShows($, 'hot'), EMBER, '#ffd2a8')}
          <Box flexShrink={0}>
            <Text color={EMBER} bold wrap="truncate">
              ✦ Running hot
            </Text>
          </Box>
          <Text wrap="truncate">{`${Math.round(heat.percent)}% of your ${window} limit used${resets ? ` · resets ${resets}` : ''}`}</Text>
          <Box flexGrow={1} minWidth={30} />
          <Box key="hot-actions" position="absolute" top={0} right={1} bottom={0} flexDirection="row" gap={1} alignItems="center">
            <Button
              key="hot-save"
              variant="primary"
              label={saving ? 'Save mode on' : 'Save mode'}
              onPress={async () => {
                $.ui.toast(`CGP Effort: ${await toggleSave($)}`)
              }}
            />
            <Button key="hot-close" plain role="dismiss" label="✕" onPress={() => closeHot($, heat)} />
          </Box>
        </Box>
      )
    }
    const savedAt = (await $.store.get('settingsSavedAt').catch(() => null)) as number | null
    if (typeof savedAt === 'number') {
      const since = (await $.clock.now().catch(() => Date.now())) - savedAt
      if (since >= 0 && since < SAVED_CARD_MS) {
        $.clock.after(SAVED_CARD_MS - since + 50, () => $.ui.invalidate('ui.render'))
        return savedCardTree($, e)
      }
    }
    const upd = e.surface === 'terminal' ? null : await read($, updateCard)
    if (upd && !(upd.stage === 'done' && (await $.clock.now()) - upd.at >= UPDATED_CARD_MS)) return updateCardTree($, e, upd)
    const compactNow = e.surface === 'terminal' ? null : await compactCard($, !!e.props.isWorking)
    if (compactNow)
      return handoffCardTree($, e, compactNow, undefined,
        !cardRunning(compactNow.kind) ? () => update($, handoffCard, card => (card && !cardRunning(card.kind) ? null : card)) : undefined)
    const compacting = await read($, isCompacting)
    const coldTokens = compacting ? null : await coldWorth($)
    if (coldTokens !== null) {
      const line = `Next message rereads ${kTokens(coldTokens)} tokens at full price.`
      if (e.surface === 'terminal')
        return terminalBand($, e, {
          key: 'cold', kind: 'cold', color: ICE, bg: ICE_BG, edge: ICE_EDGE, title: 'Chat went cold',
          detail: `${line} Hand off or compact first.`,
          buttons: [
            <Button key="cold-hide" plain hotkey="n" label="Not now" onPress={() => update($, isColdHidden, () => true)} />,
            <Button key="cold-compact" hotkey="c" label="Compact" onPress={() => openCompact($, e)} />,
            <Button key="cold-handoff" variant="primary" hotkey="h" label="Handoff" onPress={() => openHandoffBar($)} />,
          ],
        })
      return (
        <Box
          key="cold"
          position="relative"
          flexDirection="row"
          gap={1}
          alignItems="center"
          paddingX={1}
          overflow="hidden"
          backgroundColor={ICE_BG}
          borderStyle="round"
          borderColor={ICE_EDGE}
        >
          {/* Taller than the band and clipped by it, so the frost reaches every edge. */}
          <Box key="frost" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={FROST_SVG} alt="frost" width={FROST_WIDTH} height={FROST_HEIGHT} />
          </Box>
          <Box key="cold-glow" position="absolute" top={0} left={0} right={0} bottom={0}>
            <Svg source={inPhase(coldGlowSvg(), (await $.clock.now()) % COLD_GLOW_MS)} alt="cold glow" width={AUTO_GLOW_W} height={AUTO_GLOW_H} />
          </Box>
          {introLayer({ Box, Svg }, 'cold', await introShows($, 'cold'), ICE, '#cfeeff')}
          <Box flexShrink={0}>
            <Text color={ICE} bold wrap="truncate">
              ✦ Chat went cold
            </Text>
          </Box>
          <Text wrap="truncate">{line}</Text>
          <Box flexGrow={1} minWidth={34} />
          <Box key="cold-actions" position="absolute" top={0} right={1} bottom={0} flexDirection="row" gap={1} alignItems="center">
            <Button key="cold-hide" plain label="Not now" onPress={() => update($, isColdHidden, () => true)} />
            <Button key="cold-compact" variant="secondary" label="Compact" onPress={() => openCompact($, e)} />
            <Button key="cold-handoff" variant="primary" label="Handoff" onPress={() => openHandoffBar($)} />
          </Box>
        </Box>
      )
    }
    const swampTokens = await read($, swamped)
    const hiddenAt = await read($, swampHiddenAt)
    if (swampTokens !== null && !config.hide.includes('swamp') && !turnBusy() && !compacting && (hiddenAt === null || swampTokens >= hiddenAt + SWAMP_REGROW)) {
      const handing = (await read($, handoffStage)) !== null
      if (e.surface === 'terminal')
        return terminalBand($, e, {
          key: 'swamp', kind: 'swamp', color: BOG, bg: BOG_BG, edge: BOG_EDGE, title: 'Chat is getting swamped',
          detail: `${Math.round(swampTokens / 1000)}k tokens${lastContext && lastContext.window ? ` (${lastContext.percent}% of context)` : ''} re-read every message.`,
          buttons: [
            <Button key="swamp-compact" variant="primary" label="Compact" onPress={() => openCompact($, e)} />,
            <Button key="swamp-handoff" label={handing ? 'Handing off…' : 'Handoff'} onPress={() => openHandoffBar($)} />,
            <Button key="swamp-close" plain role="dismiss" label="✕" onPress={() => update($, swampHiddenAt, () => swampTokens)} />,
          ],
        })
      return (
        <Box
          key="swamp"
          position="relative"
          flexDirection="row"
          gap={1}
          alignItems="center"
          paddingX={1}
          overflow="hidden"
          backgroundColor={BOG_BG}
          borderStyle="round"
          borderColor={BOG_EDGE}
        >
          <Box key="bog" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={SWAMP_SVG} alt="swamp" width={FROST_WIDTH} height={FROST_HEIGHT} />
          </Box>
          {introLayer({ Box, Svg }, 'swamp', await introShows($, 'swamp'), '#6f9a4f', '#d6ecc2')}
          <Box flexShrink={0}>
            <Text color={BOG} bold wrap="truncate">
              ✦ Chat is getting swamped
            </Text>
          </Box>
          {lastContext && lastContext.window ? (
            <Box key="swamp-ring" flexShrink={0} flexDirection="row" gap={1} alignItems="center">
              <Svg source={ringSvg(lastContext.percent, BOG)} alt={`${lastContext.percent}% of context`} width={16} height={16} />
              <Text color={BOG}>{`${lastContext.percent}%`}</Text>
            </Box>
          ) : null}
          <Text wrap="truncate">
            {`${Math.round(swampTokens / 1000)}k tokens re-read every message.`}
          </Text>
          <Box flexGrow={1} minWidth={34} />
          <Box key="swamp-actions" position="absolute" top={0} right={1} bottom={0} flexDirection="row" gap={1} alignItems="center">
            <Button key="swamp-compact" variant="primary" label="Compact" onPress={() => openCompact($, e)} />
            <Button key="swamp-handoff" label={handing ? 'Handing off…' : 'Handoff'} onPress={() => openHandoffBar($)} />
            <Button key="swamp-close" plain role="dismiss" label="✕" onPress={() => update($, swampHiddenAt, () => swampTokens)} />
          </Box>
        </Box>
      )
    }
    if (config.layout === 'default') {
      if (e.surface === 'terminal') return dashboardBand($, e)
      const { question } = await effortRows($, e)
      const dash = await dashboardBand($, e)
      return question ? (
        <Box key="dash-col" flexDirection="column">
          {question}
          {dash}
        </Box>
      ) : dash
    }
    // The minimal look draws no dashboard: mark the rest here, so the next band plays its entrance.
    introKind = 'rest'
    const { question, rows } = await effortRows($, e)
    if (e.surface !== 'terminal') return question ?? next(e)
    return rows
    } catch (error) {
      lastRenderError = (error instanceof Error ? error.message : String(error)).slice(0, 300)
      return next(e)
    } finally {
      if (glowReadAt !== null) {
        drawLead = drawLead * 0.7 + Math.min(150, Date.now() - glowReadAt + 16) * 0.3
        glowReadAt = null
      }
      if (drawsTimed < 5) {
        drawsTimed++
        renderLog.push(`${new Date().toISOString()} ${loadedSession} draw took ${Date.now() - lastRenderAt} ms`)
      }
    }
  })
}
