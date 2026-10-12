// A key typed into a field the person can see: the field shows only dots, the key itself stays in the plugin's
// memory. The engine's Input has no password mode, but the plugin draws the field's text, so it draws dots.

export const DOT = '•'

/** What the field shows for `secret`: one dot per character. */
export const maskOf = (secret: string): string => DOT.repeat([...secret].length)

/**
 * The key after an edit, from the field's new text. The field held dots for the old key; typing or pasting adds
 * plain characters after them, and deleting removes dots. A paste over the whole field (no dots left) replaces it.
 */
export function editSecret(prev: string, shown: string): string {
  const chars = [...shown]
  let dots = 0
  while (dots < chars.length && chars[dots] === DOT) dots++
  const added = chars.slice(dots).filter(ch => ch !== DOT).join('')
  return [...prev].slice(0, dots).join('') + added
}

/** A hint that tells keys apart without showing one: its last four characters. */
export const keyHint = (key: string | undefined): string => {
  const chars = [...(key ?? '').trim()]
  return chars.length >= 8 ? ` · ends in ${chars.slice(-4).join('')}` : ''
}
