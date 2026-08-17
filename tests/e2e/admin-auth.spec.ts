import { expect, test } from '@playwright/test'

test('anonymous visitors are redirected from admin', async ({ page }) => {
  await page.goto('/admin/projects')
  await expect(page).toHaveURL(/\/admin\/login/)
})
