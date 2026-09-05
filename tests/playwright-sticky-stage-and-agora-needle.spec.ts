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
    // Pin time to festival Saturday afternoon (15:30) so AGORA needle is guaranteed active
    await page.clock.setFixedTime(new Date('2025-09-06T15:30:00'));

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('http://localhost:4173/FestaAvanteAgenda/#grelha');
    await page.waitForLoadState('networkidle');

    // Select Saturday tab
    await page.getByRole('tab', { name: /Sábado 6/i }).click();
    await page.waitForTimeout(200);

    const scrollContainer = page.locator('div.overflow-auto').first();
    await expect(scrollContainer).toBeVisible();

    // Verify needle overlay and badge are strictly visible
    const needleLine = page.locator('.bg-live-indicator.shadow-live-glow.w-0\\.5');
    await expect(needleLine).toBeVisible();

    const badge = page.locator('.bg-live-indicator').filter({ hasText: 'AGORA' }).first();
    await expect(badge).toBeVisible();

    // Verify needle line spans down to the bottom of the last track
    const lineBox = await needleLine.boundingBox();
    const allTracks = page.locator('.divide-y > div');
    const lastTrack = allTracks.last();
    const lastTrackBox = await lastTrack.boundingBox();

    expect(lineBox).toBeTruthy();
    expect(lastTrackBox).toBeTruthy();

    const lineBottom = lineBox!.y + lineBox!.height;
    const lastTrackBottom = lastTrackBox!.y + lastTrackBox!.height;

    // The needle line must reach down to the bottom of the last track (within 5px margin)
    expect(Math.abs(lineBottom - lastTrackBottom)).toBeLessThanOrEqual(5);

    // Scroll down vertically and verify line is still visible and badge is sticky in ruler
    await scrollContainer.evaluate((el) => { el.scrollTop = 500; });
    await page.waitForTimeout(150);

    await expect(badge).toBeVisible();
    const badgeBox = await badge.boundingBox();
    const containerBox = await scrollContainer.boundingBox();

    // Badge stays pinned near the top of the visible scroller
    expect(badgeBox!.y).toBeGreaterThanOrEqual(containerBox!.y);
    expect(badgeBox!.y).toBeLessThanOrEqual(containerBox!.y + 50);
  });

  test('AGORA needle and badge do not visually bleed over sticky stage column when scrolled horizontally', async ({ page }) => {
    // Pin time to festival Saturday afternoon (15:30)
    await page.clock.setFixedTime(new Date('2025-09-06T15:30:00'));

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('http://localhost:4173/FestaAvanteAgenda/#grelha');
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /Sábado 6/i }).click();
    await page.waitForTimeout(200);

    const scrollContainer = page.locator('div.overflow-auto').first();
    const needleLine = page.locator('.bg-live-indicator.shadow-live-glow.w-0\\.5');
    await expect(needleLine).toBeVisible();

    const needleBox = await needleLine.boundingBox();
    const containerBox = await scrollContainer.boundingBox();
    expect(needleBox).toBeTruthy();
    expect(containerBox).toBeTruthy();

    // The sticky stage column is on the left
    const stageHeaderCell = page.locator('.sticky.top-0 .sticky.left-0').first();
    const stageHeaderBox = await stageHeaderCell.boundingBox();
    expect(stageHeaderBox).toBeTruthy();
    const stickyColumnWidth = stageHeaderBox!.width;

    const currentScrollLeft = await scrollContainer.evaluate((el) => el.scrollLeft);
    // Absolute position of needle inside scroll content:
    const needleContentX = (needleBox!.x - containerBox!.x) + currentScrollLeft;

    // Scroll so that the needle is at 40px inside the container (behind the 160px sticky column)
    const targetScroll = needleContentX - 40;
    await scrollContainer.evaluate((el, s) => { el.scrollLeft = s; }, targetScroll);
    await page.waitForTimeout(200);

    // Verify sticky stage header and labels remain properly visible
    await expect(stageHeaderCell).toBeVisible();
    const stageLabel = page.locator('span.font-display.font-bold').filter({ hasText: /Palco 25 de Abril/i }).first();
    await expect(stageLabel).toBeVisible();

    // Check z-index stacking: Stage column has z-20, needle line has z-10, corner cell has z-40
    const stageTrackSticky = page.locator('.sticky.left-0.bg-surface').first();
    const zIndex = await stageTrackSticky.evaluate((el) => window.getComputedStyle(el).zIndex);
    expect(parseInt(zIndex, 10)).toBeGreaterThanOrEqual(20);
  });
});
