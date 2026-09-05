import { test, expect } from '@playwright/test';

test.describe('Grelha Sticky Column & AGORA Needle Verification', () => {
  test('Sticky stage column stays sticky and visible all the way to 02:00 (past 12h, 16h, 20h, etc)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:4173/FestaAvanteAgenda/#grelha');
    await page.waitForLoadState('networkidle');

    // Wait for the grid scroll container to be ready
    const scrollContainer = page.locator('div.overflow-auto').first();
    await expect(scrollContainer).toBeVisible();

    const stageLabel = page.locator('span.font-display.font-bold').filter({ hasText: /Palco 25 de Abril/i }).first();
    const headerPalco = page.locator('.sticky.top-0').locator('span').filter({ hasText: /Palco/i }).first();

    const containerBox = await scrollContainer.boundingBox();
    expect(containerBox).toBeTruthy();

    // Test a progression of horizontal scroll positions from 08:00 to 02:00
    const scrollOffsets = [0, 400, 600, 1000, 1500, 2000, 2400];

    for (const scrollLeft of scrollOffsets) {
      await scrollContainer.evaluate((el, s) => { el.scrollLeft = s; }, scrollLeft);
      await page.waitForTimeout(100);

      const stageBox = await stageLabel.boundingBox();
      const headerBox = await headerPalco.boundingBox();

      // The sticky column and header cell must remain anchored at the left edge of the scroller
      // (within a small pixel margin of the container left edge)
      expect(stageBox).toBeTruthy();
      expect(headerBox).toBeTruthy();

      expect(stageBox!.x).toBeGreaterThanOrEqual((containerBox!.x) - 5);
      expect(stageBox!.x).toBeLessThanOrEqual((containerBox!.x) + 20);

      expect(headerBox!.x).toBeGreaterThanOrEqual((containerBox!.x) - 5);
      expect(headerBox!.x).toBeLessThanOrEqual((containerBox!.x) + 20);
    }
  });

  test('AGORA needle line spans all stage tracks to the very bottom', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('http://localhost:4173/FestaAvanteAgenda/#grelha');
    await page.waitForLoadState('networkidle');

    // Select Saturday (where AGORA needle is active in festival dates or when mock time runs)
    await page.getByRole('tab', { name: /Sábado 6/i }).click();
    await page.waitForTimeout(200);

    const scrollContainer = page.locator('div.overflow-auto').first();
    await expect(scrollContainer).toBeVisible();

    // Verify needle overlay height matches total tracks height
    const needleLine = page.locator('.bg-live-indicator.shadow-live-glow.w-0\\.5');
    const isNeedleVisible = await needleLine.isVisible().catch(() => false);

    if (isNeedleVisible) {
      const lineBox = await needleLine.boundingBox();
      const allTracks = page.locator('.divide-y > div');
      const lastTrack = allTracks.last();
      const lastTrackBox = await lastTrack.boundingBox();

      expect(lineBox).toBeTruthy();
      expect(lastTrackBox).toBeTruthy();

      const lineBottom = lineBox!.y + lineBox!.height;
      const lastTrackBottom = lastTrackBox!.y + lastTrackBox!.height;

      // The needle line must reach down to the bottom of the last track
      expect(Math.abs(lineBottom - lastTrackBottom)).toBeLessThanOrEqual(5);

      // Scroll down vertically and verify line is still visible and badge is sticky
      await scrollContainer.evaluate((el) => { el.scrollTop = 500; });
      await page.waitForTimeout(150);

      const badge = page.locator('.bg-live-indicator').filter({ hasText: 'AGORA' }).first();
      await expect(badge).toBeVisible();
      const badgeBox = await badge.boundingBox();
      const containerBox = await scrollContainer.boundingBox();

      // Badge stays pinned near the top of the visible scroller
      expect(badgeBox!.y).toBeGreaterThanOrEqual(containerBox!.y);
      expect(badgeBox!.y).toBeLessThanOrEqual(containerBox!.y + 50);
    }
  });
});
