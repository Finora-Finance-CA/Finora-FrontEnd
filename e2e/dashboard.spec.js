// US-56: the dashboard leads with one large figure (what's left this month) at every
// width, with income and expenses side by side under it on a phone and beside it from a
// tablet up; the charts fit their box at every width and their tooltips work on touch.

import { expect, expectNoHorizontalScroll, test } from './support/test.js'

// The tops of the lead figure, income and expenses, in that order.
async function figureTops(page) {
  const lead = await page.locator('.summary-card--lead').boundingBox()
  const parts = await page.locator('.summary-card--part').evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect()))
  return { lead, parts }
}

for (const [width, partsBesideLead] of [
  [375, false],
  [768, true],
  [1280, true],
]) {
  test(`at ${width}px the lead figure comes first, ${partsBesideLead ? 'with' : 'above'} income and expenses, and the charts fit their boxes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/dashboard')
    await expect(page.locator('.summary-card')).toHaveCount(3)
    await expect(page.locator('.recharts-wrapper')).toHaveCount(2)

    const { lead, parts } = await figureTops(page)
    expect(parts).toHaveLength(2)
    // Income and expenses always share a row.
    expect(Math.abs(parts[0].top - parts[1].top)).toBeLessThan(1)
    if (partsBesideLead) expect(parts[0].left).toBeGreaterThan(lead.x + lead.width / 2)
    else expect(parts[0].top).toBeGreaterThanOrEqual(lead.y + lead.height)
    await expectNoHorizontalScroll(page)

    for (const chart of await page.locator('.category-chart, .trend-chart').all()) {
      const box = await chart.boundingBox()
      const svg = await chart.locator('svg.recharts-surface').first().boundingBox()
      expect(svg.width).toBeLessThanOrEqual(box.width + 1)
      expect(svg.x).toBeGreaterThanOrEqual(box.x - 1)
    }
  })
}

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true })

  test('the trend chart’s month labels don’t overlap', async ({ page }) => {
    await page.goto('/dashboard')
    const ticks = page.locator('.trend-chart .recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value')
    await expect(ticks).toHaveCount(6)

    const boxes = await ticks.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect()))
    for (let i = 1; i < boxes.length; i += 1) expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right)
  })

  test('a tap on a bar shows its exact amount', async ({ page }) => {
    await page.goto('/dashboard')
    const bars = page.locator('.trend-chart .recharts-bar-rectangle')
    await expect(bars).toHaveCount(6)

    await bars.last().tap()

    await expect(page.locator('.trend-chart .recharts-tooltip-wrapper')).toContainText('$2,345.55')
    await expect(page.locator('.trend-chart .recharts-tooltip-wrapper')).toContainText('November 2026')
  })
})
