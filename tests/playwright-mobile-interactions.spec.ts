import { test, expect } from '@playwright/test';

test.use({ channel: 'msedge', viewport: { width: 375, height: 667 }, isMobile: true });

test.describe('Mobile Viewport & Interaction Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4173/FestaAvanteAgenda/');
    // Navigate to Grelha
    const grelhaBtn = page.getByRole('button', { name: /grelha/i }).first();
    await grelhaBtn.click();
    await page.waitForTimeout(300);
  });

  test('Mobile: Grelha view layout & touch scrolling elements', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Grelha de Palcos');

    // Filter buttons should wrap neatly without horizontal overflow on body
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowInnerWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(windowInnerWidth + 2);

    // Matrix scroll container exists and is scrollable
    const scrollContainer = page.locator('div.overflow-auto').first();
    await expect(scrollContainer).toBeVisible();

    const scrollWidth = await scrollContainer.evaluate((el) => el.scrollWidth);
    expect(scrollWidth).toBeGreaterThan(2400);
  });

  test('Mobile: Clicking an event opens the EventDrawer', async ({ page }) => {
    // Select Saturday
    await page.getByRole('tab', { name: /Sábado 6/i }).click();
    await page.waitForTimeout(300);

    // Find first real event block in tracks
    const firstBlock = page.locator('.relative.w-\\[2400px\\] div[role="button"][aria-label]').first();
    const eventLabel = await firstBlock.getAttribute('aria-label');
    console.log('Clicking event block:', eventLabel);

    await firstBlock.click();
    await page.waitForTimeout(300);

    // Drawer should appear
    const drawer = page.locator('div[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Close button dismisses drawer
    const closeBtn = drawer.locator('button[aria-label*="Fechar"], button:has(svg)').first();
    await closeBtn.click();
    await page.waitForTimeout(200);

    // Drawer should no longer be visible
    await expect(drawer).toBeHidden();
  });

  test('Mobile: Toggling favorite does not trigger event drawer', async ({ page }) => {
    await page.getByRole('tab', { name: /Sábado 6/i }).click();
    await page.waitForTimeout(300);

    const firstBlock = page.locator('.relative.w-\\[2400px\\] div[role="button"][aria-label]').first();
    const starBtn = firstBlock.locator('button[aria-label*="favoritos"]');
    await expect(starBtn).toBeVisible();

    await starBtn.click();
    await page.waitForTimeout(200);

    // Drawer should NOT be open
    const drawer = page.locator('div[role="dialog"]');
    await expect(drawer).toBeHidden();
  });

  test('Mobile: Auto-scroll stability during clock ticks', async ({ page }) => {
    const scrollContainer = page.locator('div.overflow-auto').first();

    // User scrolls to 1200px
    await scrollContainer.evaluate((el) => { el.scrollLeft = 1200; });
    await page.waitForTimeout(200);

    const pos1 = await scrollContainer.evaluate((el) => el.scrollLeft);
    expect(pos1).toBe(1200);

    // Simulate clock progression / re-render
    await page.evaluate(() => {
      // Trigger a harmless resize or storage event to test scroll stability
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForTimeout(300);

    const pos2 = await scrollContainer.evaluate((el) => el.scrollLeft);
    // Position should NOT have jumped back
    expect(pos2).toBe(1200);
  });
});
