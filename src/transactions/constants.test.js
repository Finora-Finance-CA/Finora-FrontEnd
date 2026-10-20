import { describe, expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_COLORS } from './constants'

// WCAG 2 relative luminance and contrast ratio for #rrggbb colours.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

describe('CATEGORY_COLORS', () => {
  it('has a colour for every category, and nothing else', () => {
    expect(Object.keys(CATEGORY_COLORS)).toEqual([...CATEGORIES])
  })

  describe.each(CATEGORIES)('%s', (category) => {
    it.each(['light', 'dark'])('has text that is at least 4.5:1 against its background in %s mode', (mode) => {
      const { text, background } = CATEGORY_COLORS[category][mode]
      expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('gives every category a different background in each mode', () => {
    for (const mode of ['light', 'dark']) {
      const backgrounds = CATEGORIES.map((category) => CATEGORY_COLORS[category][mode].background)
      expect(new Set(backgrounds).size).toBe(CATEGORIES.length)
    }
  })
})

describe('contrast', () => {
  it('matches known WCAG ratios', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
  })
})
