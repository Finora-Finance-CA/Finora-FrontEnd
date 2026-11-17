// US-56: the dashboard's cards stack on a phone, sit two across on a tablet and three on
// a desktop; the charts fit their box at every width and their tooltips work on touch.

import { expect, expectNoHorizontalScroll, test } from './support/test.js'

// How many summary cards share the first row.
async function cardsInFirstRow(page) {
  const boxes = await page.locator('.summary-card').evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().top))
  return boxes.filter((top) => Math.abs(top - boxes[0]) < 1).length
}

for (const [width, columns] of [
  [375, 1],
  [768, 2],
  [1280, 3],
]) {
  test(`at ${width}px the summary cards are ${columns} across, and the charts fit their boxes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/dashboard')
    await expect(page.locator('.summary-card')).toHaveCount(3)
    await expect(page.locator('.recharts-wrapper')).toHaveCount(2)

    expect(await cardsInFirstRow(page)).toBe(columns)
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
