import { test, expect, type Page } from '@playwright/test'

/** Collect console errors during a test. */
function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => {
    errors.push(err.message)
  })
  return errors
}

const EXAMPLES_PATH = '/getting-started/examples.html'

test.describe('Three.js event system', () => {
  test('canvas renders in Test demo', async ({ page }) => {
    test.setTimeout(15_000)
    const errors = trackConsoleErrors(page)

    await page.goto(`${EXAMPLES_PATH}#test`)
    await expect(page.locator('.docs-examples__modal')).toBeVisible({ timeout: 15_000 })

    const canvas = page.locator('.docs-examples__stage canvas')
    await expect(canvas).toBeVisible({ timeout: 15_000 })

    expect(errors).toEqual([])
  })

  test('click events fire without errors', async ({ page }) => {
    test.setTimeout(15_000)
    const errors = trackConsoleErrors(page)

    await page.goto(`${EXAMPLES_PATH}#click-and-hover`)
    await expect(page.locator('.docs-examples__modal')).toBeVisible({ timeout: 15_000 })

    const canvas = page.locator('.docs-examples__stage canvas')
    await expect(canvas).toBeVisible({ timeout: 15_000 })

    // Click the center of the canvas
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)

    // Small delay for event processing
    await page.waitForTimeout(500)

    expect(errors).toEqual([])
  })

  test('hover events do not produce console errors', async ({ page }) => {
    test.setTimeout(15_000)
    const errors = trackConsoleErrors(page)

    await page.goto(`${EXAMPLES_PATH}#click-and-hover`)
    await expect(page.locator('.docs-examples__modal')).toBeVisible({ timeout: 15_000 })

    const canvas = page.locator('.docs-examples__stage canvas')
    await expect(canvas).toBeVisible({ timeout: 15_000 })

    // Hover across the canvas center
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.5)
    await page.waitForTimeout(200)
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5)
    await page.waitForTimeout(200)
    await page.mouse.move(box!.x + box!.width * 0.7, box!.y + box!.height * 0.5)
    await page.waitForTimeout(200)

    expect(errors).toEqual([])
  })

  test('StopPropagation demo loads without errors', async ({ page }) => {
    test.setTimeout(15_000)
    const errors = trackConsoleErrors(page)

    await page.goto(`${EXAMPLES_PATH}#stop-propagation`)
    await expect(page.locator('.docs-examples__modal')).toBeVisible({ timeout: 15_000 })

    const canvas = page.locator('.docs-examples__stage canvas')
    await expect(canvas).toBeVisible({ timeout: 15_000 })

    expect(errors).toEqual([])
  })

  test('demand rendering demo loads', async ({ page }) => {
    test.setTimeout(15_000)
    const errors = trackConsoleErrors(page)

    await page.goto(`${EXAMPLES_PATH}#demand-rendering`)
    await expect(page.locator('.docs-examples__modal')).toBeVisible({ timeout: 15_000 })

    const canvas = page.locator('.docs-examples__stage canvas')
    await expect(canvas).toBeVisible({ timeout: 15_000 })

    expect(errors).toEqual([])
  })

  test('switching demos via dots does not crash', async ({ page }) => {
    test.setTimeout(30_000)
    const errors = trackConsoleErrors(page)

    await page.goto(`${EXAMPLES_PATH}#test`)
    await expect(page.locator('.docs-examples__modal')).toBeVisible({ timeout: 15_000 })

    // Find all dot buttons inside the modal stage
    const dots = page.locator('.docs-examples__modal .docs-examples__stage .docs-examples__dot')
    const dotCount = await dots.count()
    expect(dotCount).toBeGreaterThan(1)

    // Click a few different dots to switch demos
    const indicesToClick = [1, 3, 0]
    for (const idx of indicesToClick) {
      if (idx < dotCount) {
        await dots.nth(idx).click()
        // Wait for the new demo to mount
        await page.waitForTimeout(2_000)
        // Canvas should still be present
        await expect(page.locator('.docs-examples__stage canvas')).toBeVisible({ timeout: 10_000 })
      }
    }

    expect(errors).toEqual([])
  })
})
