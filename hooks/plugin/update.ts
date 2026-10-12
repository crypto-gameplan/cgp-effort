// Update checks, updating and uninstalling, and the repository links they use.

// The first press arms Uninstall, a second within this time runs it. Settings stay in settings.json for a reinstall.
export const UNINSTALL_ARM_MS = 4000
export const UNINSTALL_RED = '#ff6b6b'
export function binSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><g fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2.2 3.8H11.8M5.4 3.8V2.4H8.6V3.8M3.4 3.8L4 12H10L10.6 3.8M5.9 6V9.8M8.1 6V9.8"/></g></svg>`
}
export const REPO_URL = 'https://github.com/crypto-gameplan/cgp-effort'
// public.json on main, written only by tools/publish.sh. Read through the API: the raw.githubusercontent.com copy sits
// behind a cache that lagged releases behind.
export const RELEASES_URL = 'https://api.github.com/repos/crypto-gameplan/cgp-effort/contents/public.json?ref=main'
export const WHATS_NEW_URL = `${REPO_URL}/releases`
export const REPORT_BUG_URL = `${REPO_URL}/issues/new`
export const UPDATE_CHECK_MS = 6 * 3600_000
const UPDATE_SNOOZE_MS = 24 * 3600_000
export const UPDATED_CARD_MS = 30_000
export type UpdateCard = { stage: 'offer' | 'updating' | 'done' | 'failed'; version: string; note: string; at: number; detail?: string }
export function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  return false
}
/** The first entry of a release list ordered newest first, or undefined when it does not parse. */
export function latestRelease(text: string): { version: string; note: string } | undefined {
  try {
    const list = JSON.parse(text) as { version?: unknown; note?: unknown }[]
    const top = Array.isArray(list) ? list[0] : undefined
    if (!top || typeof top.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(top.version)) return undefined
    return { version: top.version, note: typeof top.note === 'string' ? top.note : '' }
  } catch {
    return undefined
  }
}
export function updateSnoozed(hidden: { version: string; at: number } | null, version: string, now: number): boolean {
  return !!hidden && hidden.version === version && now - hidden.at < UPDATE_SNOOZE_MS
}
// The repo is public, so HTTPS needs no key; over SSH, git fails for anyone without a GitHub SSH key.
export const GITHUB_OVER_HTTPS = { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'url.https://github.com/crypto-gameplan/.insteadOf', GIT_CONFIG_VALUE_0: 'git@github.com:crypto-gameplan/' }
/** The line of a failed `claude plugin` run that says what went wrong; the last line alone is often a wrapped tail. */
export function updateFailure(output: string): string {
  const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const line = lines.find(l => /^(fatal|error):/i.test(l)) ?? lines.find(l => l.startsWith('✘')) ?? lines.at(-1) ?? ''
  const why = line.replace(/^(fatal|error):\s*/i, '').replace(/^✘\s*/, '')
  return why.length > 160 ? `${why.slice(0, 159)}…` : why
}
/** The command copying the installed version over the running one; undefined when they are the same folder or either
 * is not a plugin cache folder, so a working copy is never overwritten. */
export function syncPlan(running: string, installed: string | undefined): string[] | undefined {
  const norm = (x: string) => x.replace(/[\\/]+$/, '').replaceAll('\\', '/')
  const cached = (x: string) => /\/cache\//.test(norm(x))
  if (!installed || norm(installed) === norm(running) || !cached(installed) || !cached(running)) return undefined
  return /^[A-Za-z]:|\\/.test(running)
    ? ['robocopy', installed, running, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP']
    : ['cp', '-R', `${installed}/.`, running]
}
export const UPDATE_LOADING = 'Installed. Loads as soon as Claude is idle.'
// A plain /reload-plugins holds back changes that would cost the prompt cache (new commands do) and keeps the old code
// running. Update was pressed, so force it.
export const RELOAD_ARGS = '--force'
export const UPDATE_LOAD_WAIT_MS = 15_000

/** Where `claude` may be: on PATH, then where the installers put it. The desktop app keeps the PATH it had at login. */
export function claudeCandidates(home: string | undefined): string[] {
  if (!home) return ['claude']
  const win = /^[A-Za-z]:/.test(home)
  const sep = home.includes('\\') ? '\\' : '/'
  return ['claude', [home.replace(/[\\/]+$/, ''), '.local', 'bin', win ? 'claude.exe' : 'claude'].join(sep)]
}
// The engine's words for a command that could not start, as opposed to one that ran and failed.
export const NOT_STARTED = /ENOENT|not found or is in an unsafe location|failed to start/i
/** What to install when `claude` would not start; undefined for any other error. */
export function noClaudeHint(error: string, home: string | undefined): string | undefined {
  if (!NOT_STARTED.test(error)) return undefined
  const install = home && /^[A-Za-z]:/.test(home) ? 'irm https://claude.ai/install.ps1 | iex' : 'curl -fsSL https://claude.ai/install.sh | bash'
  return `This needs the Claude Code CLI. Install it with ${install}, then reopen the app.`
}
