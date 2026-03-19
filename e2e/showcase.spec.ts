import { test, expect } from '@playwright/test'

const EXAMPLES_PATH = '/getting-started/examples.html'

test.describe('Showcase UI', () => {
  test('default demo loads with Compose preview', async ({ page }) => {
    test.setTimeout(15_000)
    await page.goto(EXAMPLES_PATH)

    // The inline preview should show the Compose demo description
    const previewMeta = page.locator('.docs-examples__preview-meta')
    await expect(previewMeta).toBeVisible({ timeout: 15_000 })
    await expect(previewMeta).toContainText('DOM + 3D Composer')
  })

  test('hash navigation opens modal for GlassFlower', async ({ page }) => {
    test.setTimeout(15_000)
    await page.goto(`${EXAMPLES_PATH}#glass-flower`)

    const modal = page.locator('.docs-examples__modal')
    await expect(modal).toBeVisible({ timeout: 15_000 })

    // The demo name should reflect GlassFlower
    const demoName = modal.locator('.docs-examples__name')
    await expect(demoName).toContainText('GlassFlower')
  })

  test('dot navigation updates demo name in modal', async ({ page }) => {
    test.setTimeout(15_000)
    // Open with the first demo (Test)
    await page.goto(`${EXAMPLES_PATH}#test`)

    const modal = page.locator('.docs-examples__modal')
    await expect(modal).toBeVisible({ timeout: 15_000 })

    // Get the initial demo name
    const demoName = modal.locator('.docs-examples__name')
    const initialName = await demoName.textContent()

    // Click a different dot (not the currently active one)
    const dots = modal.locator('.docs-examples__stage .docs-examples__dot')
    const dotCount = await dots.count()
    expect(dotCount).toBeGreaterThan(1)

    // Find a dot that is not active and click it
    for (let i = 0; i < dotCount; i++) {
      const isActive = await dots.nth(i).evaluate((el) => el.classList.contains('docs-examples__dot--active'))
      if (!isActive) {
        await dots.nth(i).click()
        break
      }
    }

    // Wait for the demo name to change
    await expect(demoName).not.toHaveText(initialName!, { timeout: 5_000 })
  })

  test('Escape closes the modal', async ({ page }) => {
    test.setTimeout(15_000)
    await page.goto(`${EXAMPLES_PATH}#test`)

    const modal = page.locator('.docs-examples__modal')
    await expect(modal).toBeVisible({ timeout: 15_000 })

    await page.keyboard.press('Escape')

    await expect(modal).not.toBeVisible({ timeout: 5_000 })
  })

  test('Source tab shows code content', async ({ page }) => {
    test.setTimeout(15_000)
    await page.goto(`${EXAMPLES_PATH}#test`)

    const modal = page.locator('.docs-examples__modal')
    await expect(modal).toBeVisible({ timeout: 15_000 })

    // Click the Source tab
    const sourceTab = modal.locator('.docs-examples__view-tab', { hasText: 'Source' })
    await sourceTab.click()

    // Verify code content appears
    const codeContainer = modal.locator('.docs-examples__code-container')
    await expect(codeContainer).toBeVisible({ timeout: 10_000 })

    // Should contain actual code (shiki-highlighted pre block)
    const pre = codeContainer.locator('pre')
    await expect(pre).toBeVisible({ timeout: 10_000 })

    // The filename badge should show the demo name
    const filename = modal.locator('.docs-examples__code-filename')
    await expect(filename).toContainText('.tsx')
  })
})
