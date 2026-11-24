// US-55: adding, listing, searching and filtering transactions on a phone.

import { expect, expectNoHorizontalScroll, test } from './support/test.js'

for (const width of [375, 320]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true })

    test('adds an expense from the full-screen drawer, and it shows first in the list', async ({ page, backend }) => {
      await page.goto('/transactions')
      await page.getByRole('button', { name: 'Add transaction' }).tap()

      const drawer = page.getByRole('dialog', { name: 'Add expense' })
      await expect(drawer).toBeVisible()
      await expect(drawer.getByLabel('Amount ($)')).toBeFocused()
      await drawer.getByLabel('Amount ($)').fill('18.75')
      await drawer.getByLabel('Category').selectOption('Food')
      await drawer.getByLabel('Description (optional)').fill('Coffee beans')
      await expectNoHorizontalScroll(page)
      await drawer.getByRole('button', { name: 'Save expense' }).tap()

      await expect(drawer).toBeHidden()
      await expect(page.locator('[data-live-region]')).toContainText('Expense of $18.75 added.')
      const firstRow = page.getByRole('table', { name: 'Transaction history' }).getByRole('row').nth(1)
      await expect(firstRow).toContainText('Coffee beans')
      await expect(firstRow).toContainText('$18.75')
      expect(backend.transactions.some((item) => item.description === 'Coffee beans' && item.amount_cents === 1875)).toBe(true)
      await expectNoHorizontalScroll(page)
    })

    test('shows each transaction as a card with its actions in reach', async ({ page }) => {
      await page.goto('/transactions')
      const row = page.getByRole('row', { name: /Car repair/ })
      await expect(row).toBeVisible()

      await row.getByRole('button', { name: /^Actions for Car repair/ }).tap()

      await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible()
      await page.getByRole('menuitem', { name: 'Edit' }).tap()
      const drawer = page.getByRole('dialog', { name: 'Edit expense' })
      await expect(drawer).toBeVisible()
      await expect(drawer.getByLabel('Amount ($)')).toHaveValue('98.00')
    })

    test('searches, and filters from the filters sheet', async ({ page }) => {
      await page.goto('/transactions')
      await expect(page.getByRole('row', { name: /Car repair/ })).toBeVisible()

      await page.getByRole('searchbox').fill('groceries')
      await expect(page).toHaveURL(/q=groceries/)
      await expect(page.getByRole('row', { name: /Car repair/ })).toBeHidden()
      await expect(page.getByRole('row', { name: /Groceries/ }).first()).toBeVisible()

      await page.getByRole('button', { name: /^Filters/ }).tap()
      const sheet = page.getByRole('dialog', { name: 'Filters' })
      await expect(sheet).toBeVisible()
      await expectNoHorizontalScroll(page)
      // Filters apply at once, through the URL, so the box is ticked once the page updates.
      await sheet.getByRole('checkbox', { name: 'Food' }).click()
      await expect(sheet.getByRole('checkbox', { name: 'Food' })).toBeChecked()
      await sheet.getByRole('button', { name: /^(Show|Done|Apply)/ }).tap()

      await expect(page).toHaveURL(/category=Food/)
      await expect(page.getByText(/that match your search and filters/)).toBeVisible()
      await expectNoHorizontalScroll(page)
    })
  })
}
