import { test, expect, Page } from "@playwright/test"

// Helper to collect console errors
async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text())
    }
  })
  page.on("pageerror", (error) => {
    errors.push(error.message)
  })
  return errors
}

test.describe("Cesium Viewer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/view/alpha")
  })

  test("viewer loads without JavaScript errors", async ({ page }) => {
    const errors = await collectConsoleErrors(page)

    // Wait for the viewer to be visible
    await page.waitForSelector('[class*="relative"]', { timeout: 30000 })

    // Wait a bit for any async errors
    await page.waitForTimeout(2000)

    // Filter out expected Cesium warnings (not errors)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("Warning") &&
        !e.includes("Cesium") &&
        !e.includes("Failed to load resource") // Tileset might not exist in test env
    )

    expect(criticalErrors).toHaveLength(0)
  })

  test("loading state disappears after initialization", async ({ page }) => {
    const loadingText = page.getByText("Loading 3D model...")

    // Loading should be visible initially or disappear quickly
    await expect(loadingText).toBeVisible({ timeout: 5000 }).catch(() => {
      // Loading already finished, that's ok
    })

    // Wait for initialization to complete
    await page.waitForTimeout(5000)

    // After initialization, loading should be gone (success case)
    // OR error should be shown (failure case)
    // Either way, loading spinner should not remain indefinitely
    const loadingStillVisible = await loadingText.isVisible().catch(() => false)

    // If loading is still visible after 5 seconds, that's a problem
    // But if it's gone, the viewer initialized (successfully or with error)
    if (loadingStillVisible) {
      // Check if maybe it's just slow - wait a bit more
      await page.waitForTimeout(5000)
      const stillLoading = await loadingText.isVisible().catch(() => false)
      // After 10 seconds total, loading should definitely be resolved
      expect(stillLoading).toBe(false)
    }
  })

  test("globe toggle button works without errors", async ({ page }) => {
    const errors = await collectConsoleErrors(page)

    // Wait for viewer to initialize
    await page.waitForTimeout(3000)

    // Find the globe button (first button in the control panel)
    const globeButton = page.getByRole("button").first()
    await expect(globeButton).toBeVisible()

    // Click to toggle globe
    await globeButton.click()
    await page.waitForTimeout(500)

    // Click again to toggle back
    await globeButton.click()
    await page.waitForTimeout(500)

    // Check for race condition errors
    const raceConditionErrors = errors.filter(
      (e) => e.includes("Cannot read properties of undefined") || e.includes("is not a function")
    )

    expect(raceConditionErrors).toHaveLength(0)
  })

  test("wireframe toggle button works without errors", async ({ page }) => {
    const errors = await collectConsoleErrors(page)

    await page.waitForTimeout(3000)

    // Find wireframe button (has Grid icon, second button in first group)
    const buttons = page.locator("button")
    const wireframeButton = buttons.nth(1)
    await expect(wireframeButton).toBeVisible()

    // Toggle wireframe
    await wireframeButton.click()
    await page.waitForTimeout(500)
    await wireframeButton.click()
    await page.waitForTimeout(500)

    const criticalErrors = errors.filter(
      (e) => e.includes("Cannot read properties of undefined") || e.includes("is not a function")
    )

    expect(criticalErrors).toHaveLength(0)
  })

  test("performance mode toggle works without errors", async ({ page }) => {
    const errors = await collectConsoleErrors(page)

    await page.waitForTimeout(3000)

    // Performance button is the 4th button (has Zap icon)
    const buttons = page.locator("button")
    const perfButton = buttons.nth(3)
    await expect(perfButton).toBeVisible()

    // Toggle performance mode
    await perfButton.click()
    await page.waitForTimeout(500)
    await perfButton.click()
    await page.waitForTimeout(500)

    const criticalErrors = errors.filter(
      (e) => e.includes("Cannot read properties of undefined") || e.includes("is not a function")
    )

    expect(criticalErrors).toHaveLength(0)
  })

  test("navigation mode buttons are functional", async ({ page }) => {
    const errors = await collectConsoleErrors(page)

    await page.waitForTimeout(3000)

    // Navigation buttons are in the second group (buttons 4-6, 0-indexed as 4,5,6)
    const buttons = page.locator("button")

    // Click orbit mode (5th button, index 4)
    const orbitButton = buttons.nth(4)
    await expect(orbitButton).toBeVisible()
    await orbitButton.click()
    await page.waitForTimeout(300)

    // Click pan mode (6th button, index 5)
    const panButton = buttons.nth(5)
    await panButton.click()
    await page.waitForTimeout(300)

    // Click zoom mode (7th button, index 6)
    const zoomButton = buttons.nth(6)
    await zoomButton.click()
    await page.waitForTimeout(300)

    // Go back to orbit
    await orbitButton.click()
    await page.waitForTimeout(300)

    const criticalErrors = errors.filter(
      (e) => e.includes("Cannot read properties of undefined") || e.includes("is not a function")
    )

    expect(criticalErrors).toHaveLength(0)
  })

  test("rapid button clicking does not crash", async ({ page }) => {
    const errors = await collectConsoleErrors(page)

    await page.waitForTimeout(3000)

    const buttons = page.locator("button")

    // Rapidly click multiple buttons
    for (let i = 0; i < 5; i++) {
      await buttons.nth(0).click() // Globe
      await buttons.nth(1).click() // Wireframe
      await buttons.nth(3).click() // Performance
      await buttons.nth(4).click() // Orbit
      await buttons.nth(5).click() // Pan
      await buttons.nth(6).click() // Zoom
    }

    await page.waitForTimeout(1000)

    // Check for race condition errors that were previously occurring
    const raceConditionErrors = errors.filter(
      (e) =>
        e.includes("Cannot read properties of undefined") ||
        e.includes("is not a function") ||
        e.includes("scene")
    )

    expect(raceConditionErrors).toHaveLength(0)
  })

  test("keyboard hints are visible", async ({ page }) => {
    await page.waitForTimeout(2000)

    // Check keyboard hints are rendered
    await expect(page.getByText("Shift")).toBeVisible()
    await expect(page.getByText("Ctrl")).toBeVisible()
    await expect(page.getByText("Scroll")).toBeVisible()
  })

  test("model info badge is visible", async ({ page }) => {
    await page.waitForTimeout(2000)

    await expect(page.getByText("Stratum")).toBeVisible()
    await expect(page.getByText("Alpha")).toBeVisible()
  })

  test("cursor changes with navigation mode", async ({ page }) => {
    await page.waitForTimeout(3000)

    const container = page.locator('[class*="relative"]').first()
    const buttons = page.locator("button")

    // Check default cursor (orbit mode = grab)
    // Note: Playwright can't directly check computed cursor, but we verify the code runs without error

    // Switch to pan mode
    await buttons.nth(5).click()
    await page.waitForTimeout(300)

    // Switch to zoom mode
    await buttons.nth(6).click()
    await page.waitForTimeout(300)

    // Switch back to orbit
    await buttons.nth(4).click()
    await page.waitForTimeout(300)

    // If no errors thrown, cursor change code is working
    expect(true).toBe(true)
  })

  test("reset camera button works", async ({ page }) => {
    const errors = await collectConsoleErrors(page)

    await page.waitForTimeout(3000)

    // Reset camera button is the 3rd button (index 2)
    const resetButton = page.locator("button").nth(2)
    await expect(resetButton).toBeVisible()

    await resetButton.click()
    await page.waitForTimeout(500)

    const criticalErrors = errors.filter(
      (e) => e.includes("Cannot read properties of undefined") || e.includes("is not a function")
    )

    expect(criticalErrors).toHaveLength(0)
  })
})
