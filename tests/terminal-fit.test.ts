import { describe, expect, test } from 'claude-code/testing'
import { bandFitsOneRow, buttonsWidth } from '../hooks/ui/terminal'

const button = (label: string, plain = false) => ({ type: 'Button', props: { label, plain } })

describe('terminal band width', () => {
  test('filled buttons take their brackets, plain ones only the label, one column between', () => {
    expect(buttonsWidth([button('Auto on'), button('Handoff'), button('Settings', true)])).toBe(11 + 11 + 8 + 2)
    expect(buttonsWidth([])).toBe(0)
    expect(buttonsWidth([{ type: 'Box', props: {} }])).toBe(12)
  })

  test('the dashboard row breaks its buttons onto their own row when the terminal is narrow', () => {
    const title = '✦ Auto · cache 59m · 0% context'
    const buttons = [button('Auto on'), button('Handoff'), button('Settings', true)]
    // The width the Settings label broke at: 63 columns.
    expect(bandFitsOneRow(63, title, buttons)).toBe(false)
    expect(bandFitsOneRow(100, title, buttons)).toBe(true)
    expect(bandFitsOneRow(100, title, buttons, 16)).toBe(true)
    expect(bandFitsOneRow(80, title, buttons, 16)).toBe(false)
    // Unknown width: keep the one-row layout.
    expect(bandFitsOneRow(0, title, buttons)).toBe(true)
  })
})
