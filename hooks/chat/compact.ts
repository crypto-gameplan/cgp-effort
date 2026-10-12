// Compaction by Haiku instead of the chat model: model, prompt, transcript text and the fade-out image.
import { BOG_BG } from '../core/palette'
import { inPhase } from '../ui/kit'

export const COMPACT_FADE_MS = 450
/** The swamp band's colour over the compact bar, fading out, so the band seems to turn from green to violet. */
export function compactFadeSvg(elapsedMs: number): string {
  return inPhase(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="240" viewBox="0 0 1600 240" preserveAspectRatio="none"><style>.f{animation:f ${COMPACT_FADE_MS / 1000}s ease-out forwards}@keyframes f{from{opacity:1}to{opacity:0}}</style><rect class="f" width="1600" height="240" fill="${BOG_BG}"/></svg>`, elapsedMs)
}
// Claude Code compacts with the chat's own model and has no setting for another, so session.compact is answered
// here with the much cheaper Haiku. On any failure Claude Code's own compaction runs.
export const COMPACT_MODEL = 'claude-haiku-5-5'
/** The transcript's most text sent to Haiku: about 600k tokens, inside its window with room for the summary. */
export const COMPACT_MAX_CHARS = 2_400_000
export const COMPACT_SYSTEM = `You compact a conversation between a user and Claude Code, an AI coding agent, so the work can continue
in a fresh context that holds only your summary. Whoever reads it next knows nothing else about the conversation.

Write a detailed summary with these sections:
1. Primary request and intent: everything the user asked for, in detail, including changes of mind.
2. Key technical concepts: technologies, frameworks, constraints and decisions.
3. Files and code: every file read, created or edited, why it matters, and the important snippets or signatures.
4. Errors and fixes: what went wrong, how it was fixed, and any feedback the user gave about it.
5. Problem solving: what was solved and what is still being worked out.
6. All user messages: every message the user wrote that is not a tool result, briefly and in order.
7. Pending tasks: what the user asked for that is not done.
8. Current work: exactly what was being done right before this summary, with file names and code. The last few
messages come nearly uncut: carry the code and errors from them over in full, since the next step builds on them.
9. Next step: the next step, only if it follows directly from the user's latest request, quoting that request.

Be precise: keep names, paths, numbers, commands and error messages exact. Leave out pleasantries.
Reply with the summary only.`
// The last messages go nearly whole: the work in progress lives in their tool calls and results.
export const COMPACT_TAIL = 6
const COMPACT_TAIL_CHARS = 20_000
export function compactTranscript(messages: readonly { role: string; text: string; toolUses?: readonly { tool: string; input: unknown; text?: string }[]; toolResults?: readonly { text?: string }[] }[], toolChars = 2000, tailChars = COMPACT_TAIL_CHARS): string {
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)} …[${s.length - n} more characters]` : s)
  const tailFrom = messages.length - COMPACT_TAIL
  return messages
    .map((m, i) => {
      const inTail = i >= tailFrom
      const inputChars = inTail ? tailChars : 400
      const resultChars = inTail ? tailChars : toolChars
      const lines = [`${m.role === 'user' ? 'USER' : 'CLAUDE'}: ${m.text}`.trimEnd()]
      for (const t of m.toolUses ?? []) {
        lines.push(`  [${t.tool} ${cut(JSON.stringify(t.input ?? {}), inputChars)}]`)
        if (t.text) lines.push(`  → ${cut(t.text, resultChars)}`)
      }
      if (!m.toolUses?.length) for (const r of m.toolResults ?? []) if (r.text) lines.push(`  → ${cut(r.text, resultChars)}`)
      return lines.join('\n')
    })
    .join('\n\n')
}
