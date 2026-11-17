// US-55, US-56: every page at phone, tablet and desktop widths. No page may scroll
// sideways, inputs are 16px or larger (so phones don't zoom in on focus), and every
// control can be tapped (44px). A full-page screenshot of each page at each width is
// saved to e2e-screenshots/<width>/ (gitignored) for review.

import { expect, expectNoHorizontalScroll, test } from './support/test.js'

export const WIDTHS = [320, 375, 768, 1280]
const PHONE_WIDTHS = new Set([320, 375])

const SIGNED_IN_PAGES = [
  { name: 'transactions', path: '/transactions', ready: (page) => page.getByRole('cell', { name: /Freelance design work/ }).first() },
  { name: 'dashboard', path: '/dashboard', ready: (page) => page.locator('.recharts-wrapper').nth(1) },
  { name: 'summary', path: '/summary', ready: (page) => page.getByText('Total income') },
  { name: 'budgets', path: '/budgets', ready: (page) => page.getByText('$352.40 of $400.00') },
  { name: 'goals', path: '/goals', ready: (page) => page.getByRole('heading', { name: 'Trip to Japan' }) },
]

const SIGNED_OUT_PAGES = [
  { name: 'login', path: '/login', ready: (page) => page.getByRole('heading', { name: 'Log in' }) },
  { name: 'register', path: '/register', ready: (page) => page.getByRole('heading', { name: 'Create your account' }) },
]

function viewportFor(width) {
  return { width, height: width < 768 ? 800 : 900 }
}

// Whole pages are captured top to bottom; open layers (drawers, sheets, the menu) as the
// screen shows them.
async function screenshot(page, width, name, { fullPage = true } = {}) {
  await page.screenshot({ path: `e2e-screenshots/${width}/${name}.png`, fullPage, animations: 'disabled' })
}

// Visible inputs and selects with a font smaller than 16px.
async function smallInputs(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]), select, textarea')]
      .filter((element) => element.offsetParent !== null)
      .filter((element) => parseFloat(getComputedStyle(element).fontSize) < 16)
      .map((element) => element.name || element.id || element.outerHTML.slice(0, 60))
  )
}

// Visible controls whose tap area, counting an enlarged ::before, is under 44px tall or
// wide. Links inside a sentence are left out, as WCAG allows for inline links.
async function smallTapTargets(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('button, a[href], input, select, [role="menuitem"], summary')]
      .filter((element) => element.offsetParent !== null && !element.closest('[aria-hidden="true"]'))
      .filter((element) => !(element.tagName === 'A' && element.closest('p, li > p, .alert__body')))
      .filter((element) => !['checkbox', 'radio', 'hidden'].includes(element.type))
      .map((element) => {
        const box = element.getBoundingClientRect()
        const before = getComputedStyle(element, '::before')
        const hasHitArea = before.content !== 'none' && before.position === 'absolute'
        const extendY = hasHitArea ? -(parseFloat(before.top) || 0) - (parseFloat(before.bottom) || 0) : 0
        const extendX = hasHitArea ? -(parseFloat(before.left) || 0) - (parseFloat(before.right) || 0) : 0
        return { label: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 40) || element.name, height: box.height + extendY, width: box.width + extendX }
      })
      .filter(({ height, width }) => height < 44 || width < 44)
      .map(({ label, height, width }) => `${label} (${Math.round(width)}x${Math.round(height)})`)
  )
}

async function checkPage(page, { name, path, ready }, width) {
  await page.setViewportSize(viewportFor(width))
  await page.goto(path)
  await expect(ready(page)).toBeVisible()
  // First, so there's a picture to look at even when a check below fails.
  await screenshot(page, width, name)

  await expectNoHorizontalScroll(page)
  if (PHONE_WIDTHS.has(width)) {
    expect(await smallInputs(page), 'inputs under 16px').toEqual([])
    expect(await smallTapTargets(page), 'tap targets under 44px').toEqual([])
  }
}

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    for (const pageInfo of SIGNED_IN_PAGES) {
      test(`${pageInfo.name} fits with no sideways scrolling`, async ({ page }) => {
        await checkPage(page, pageInfo, width)
      })
    }

    test.describe('signed out', () => {
      test.use({ signedIn: false })
      for (const pageInfo of SIGNED_OUT_PAGES) {
        test(`${pageInfo.name} fits with no sideways scrolling`, async ({ page }) => {
          await checkPage(page, pageInfo, width)
        })
      }
    })
  })
}

test.describe('open layers at phone width', () => {
  test.use({ viewport: { width: 375, height: 800 }, hasTouch: true })

  test('the add transaction drawer fills the screen and fits', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByRole('button', { name: 'Add transaction' }).click()
    const drawer = page.getByRole('dialog', { name: 'Add expense' })
    await expect(drawer).toBeVisible()

    const box = await drawer.boundingBox()
    expect(Math.round(box.width)).toBe(375)
    expect(Math.round(box.height)).toBe(800)
    await expectNoHorizontalScroll(page)
    expect(await smallInputs(page)).toEqual([])
    await screenshot(page, 375, 'transactions-add-drawer', { fullPage: false })
  })

  test('the filters sheet fits', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByRole('button', { name: /^Filters/ }).click()
    await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()

    await expectNoHorizontalScroll(page)
    await screenshot(page, 375, 'transactions-filters-sheet', { fullPage: false })
  })

  test('the menu fits', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()

    await expectNoHorizontalScroll(page)
    await screenshot(page, 375, 'menu-open', { fullPage: false })
  })
})
