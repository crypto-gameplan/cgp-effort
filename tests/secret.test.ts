import { describe, expect, test } from 'claude-code/testing'
import { DOT, editSecret, keyHint, maskOf } from '../hooks/core/secret'

describe('typed key', () => {
  test('the field shows one dot per character, never the key', () => {
    expect(maskOf('tsk_live_abc123')).toBe(DOT.repeat(15))
    expect(maskOf('')).toBe('')
  })

  test('a paste into the empty field becomes the key', () => {
    expect(editSecret('', 'tsk_live_abc123')).toBe('tsk_live_abc123')
  })

  test('typing after the dots adds to the key, deleting removes from its end', () => {
    expect(editSecret('abc', `${DOT.repeat(3)}d`)).toBe('abcd')
    expect(editSecret('abcd', DOT.repeat(2))).toBe('ab')
    expect(editSecret('abcd', '')).toBe('')
  })

  test('a paste over the selected field replaces the key', () => {
    expect(editSecret('old_key', 'new_key')).toBe('new_key')
  })

  test('the saved key is named only by its last four characters', () => {
    expect(keyHint('tsk_live_abcdef1234')).toBe(' · ends in 1234')
    expect(keyHint('short')).toBe('')
    expect(keyHint(undefined)).toBe('')
  })
})
