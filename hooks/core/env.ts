// Debug logs (proof, render) and the type of a once-per-session environment variable lookup.

// Every verdict, /effort and request effort, written to CGP_EFFORT_LOG, or to %TEMP%/cgp-effort-proof.log when the
// mod is loaded from a dev-mods folder. Off otherwise.
/** CGP_EFFORT_LOG only names a cgp-effort*.log file, so a project's settings cannot point the log at another file. */
export const safeLogPath = (path: string | undefined) => (path && /(^|[\\/])cgp-effort[^\\/]*\.log$/.test(path) ? path : undefined)
export const proofLines: string[] = []
// An environment variable cannot change during a session, so each is asked for once and the promise kept.
export type EnvAsk = Promise<string | undefined> | undefined
// The last 300 band requests from the app, written each second to ~/.claude/cgp-effort-render-<chat>.log: shows how
// often the app really redraws the band, which tests cannot.
export const renderLog: string[] = []
