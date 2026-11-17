// US-55: on a phone the navigation collapses into a menu button, which says whether it's
// open, closes on Escape and when a page is chosen, and puts focus back where it was.

import { expect, test } from './support/test.js'

test.describe('at phone width', () => {
  test.use({ viewport: { width: 375, height: 800 }, hasTouch: true })

  test('shows a menu button instead of the sidebar', async ({ page }) => {
    await page.goto('/transactions')

    const toggle = page.getByRole('button', { name: 'Open menu' })
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(page.locator('.app-shell__sidebar')).toBeHidden()
  })

  test('opens the menu, marked open, with the current page shown', async ({ page }) => {
    await page.goto('/transactions')
    const toggle = page.getByRole('button', { name: 'Open menu' })

    await toggle.click()

    const menu = page.getByRole('dialog', { name: 'Menu' })
    await expect(menu).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(menu.getByRole('link', { name: 'Transactions' })).toHaveAttribute('aria-current', 'page')
    // Focus moves into the menu (its first control, Close), so keyboard users start there.
    await expect(menu.getByRole('button', { name: 'Close' })).toBeFocused()
  })

  test('closes on Escape and puts focus back on the menu button', async ({ page }) => {
    await page.goto('/transactions')
    const toggle = page.getByRole('button', { name: 'Open menu' })
    await toggle.click()
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toBeFocused()
  })

  test('closes when a page is chosen, and opens that page', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByRole('button', { name: 'Open menu' }).click()

    await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'Budgets' }).tap()

    await expect(page).toHaveURL(/\/budgets/)
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Budgets', level: 1 })).toBeVisible()
  })

  test('closes when the backdrop is tapped', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()

    await page.mouse.click(360, 400)

    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden()
  })

  test('keeps Tab inside the open menu', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const menu = page.getByRole('dialog', { name: 'Menu' })

    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab')
      expect(await menu.evaluate((element) => element.contains(document.activeElement))).toBe(true)
    }
  })
})

test.describe('at desktop width', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('shows the sidebar and no menu button', async ({ page }) => {
    await page.goto('/transactions')

    await expect(page.locator('.app-shell__sidebar').getByRole('navigation', { name: 'Main' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden()
  })
})
