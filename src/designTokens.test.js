import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Read from disk: Vitest's CSS handling empties a ?raw import of a stylesheet.
const here = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, 'index.css'), 'utf8')

// Reads the colour tokens from index.css (light from :root, dark from the
// prefers-color-scheme block) and checks every text pairing the app uses meets WCAG AA,
// so a token change that breaks contrast fails here.

function tokens(block) {
  const values = {}
  for (const [, name, value] of block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)) values[name] = value.toLowerCase()
  return values
}

const darkStart = css.indexOf('@media (prefers-color-scheme: dark)')
const light = tokens(css.slice(0, darkStart))
const dark = { ...light, ...tokens(css.slice(darkStart, css.indexOf('@media (prefers-reduced-motion'))) }

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

// [foreground, background, minimum]: text needs 4.5:1; control edges and bar fills 3:1.
const PAIRS = [
  ['text', 'bg', 4.5],
  ['text', 'surface', 4.5],
  ['text-muted', 'bg', 4.5],
  ['text-muted', 'surface', 4.5],
  ['text-muted', 'surface-2', 4.5],
  ['accent-text', 'bg', 4.5],
  ['accent-text', 'surface', 4.5],
  ['accent-text', 'accent-tint', 4.5],
  ['on-accent', 'accent', 4.5],
  ['negative', 'bg', 4.5],
  ['negative', 'surface', 4.5],
  ['negative', 'negative-bg', 4.5],
  ['warning-text', 'surface', 4.5],
  ['warning-text', 'warning-bg', 4.5],
  ['on-danger', 'danger', 4.5],
  ['border-field', 'bg', 3],
  ['border-field', 'surface', 3],
  ['accent', 'surface-3', 3],
  ['warning', 'surface-3', 3],
  ['negative', 'surface-3', 3],
]

describe('contrast', () => {
  it('matches known WCAG ratios', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
  })
})

describe.each([
  ['light', light],
  ['dark', dark],
])('%s design tokens', (_mode, palette) => {
  it.each(PAIRS)('--%s on --%s is at least %s:1', (foreground, background, minimum) => {
    expect(palette[foreground], `--${foreground}`).toMatch(/^#/)
    expect(palette[background], `--${background}`).toMatch(/^#/)
    expect(contrast(palette[foreground], palette[background])).toBeGreaterThanOrEqual(minimum)
  })
})

describe('the palette', () => {
  it('uses the ledger green accent and IBM Plex Sans', () => {
    expect(light.accent).toBe('#1e6b4e')
    expect(dark.accent).toBe('#4fb58a')
    expect(css).toMatch(/--font-sans:\s*'IBM Plex Sans'/)
  })

  it('never uses pure black for the dark page', () => {
    expect(dark.bg).not.toBe('#000000')
  })
})
