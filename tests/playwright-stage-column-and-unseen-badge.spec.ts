import { test, expect } from '@playwright/test';

test.describe('Stage Column & Unseen Badge Verification', () => {
  test('Sticky stage column stays visible and readable when scrolling horizontally in Grelha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:4173/FestaAvanteAgenda/#grelha');
    await page.waitForLoadState('networkidle');

    const scrollContainer = page.locator('div.overflow-auto').first();
    await expect(scrollContainer).toBeVisible();

    // Scroll 800px horizontally to the right
    await scrollContainer.evaluate((el) => { el.scrollLeft = 800; });
    await page.waitForTimeout(200);

    // Verify stage labels remain visible and within the viewport
    const stageLabel = page.locator('span.font-display.font-bold').filter({ hasText: /Palco 25 de Abril/i }).first();
    await expect(stageLabel).toBeVisible();

    // Verify stage label is not truncated and allows multi-line wrapping
    const classAttr = await stageLabel.getAttribute('class');
    expect(classAttr).not.toContain('truncate');
    expect(classAttr).toContain('break-words');
  });

  test('BottomNav & Header badge displays ONLY count of saved events NOT yet marked as seen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:4173/FestaAvanteAgenda/#lista');
    await page.waitForLoadState('networkidle');

    // Clear schedule in localStorage first
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(300);

    // Bookmark 3 events
    const starButtons = page.locator('button[aria-label*="Guardar"]').all();
    const starList = await starButtons;
    expect(starList.length).toBeGreaterThanOrEqual(3);

    await starList[0].click();
    await starList[1].click();
    await starList[2].click();
    await page.waitForTimeout(300);

    // Bottom navigation badge should show 3
    const bottomNav = page.locator('nav[aria-label="Navegação inferior móvel"]');
    const badge = bottomNav.locator('span').filter({ hasText: '3' }).first();
    await expect(badge).toBeVisible();

    // Mark the first event as seen ("já vi")
    const seenButtons = page.locator('button[aria-label*="já vi"], button[aria-label*="visto"]').all();
    const seenList = await seenButtons;
    await seenList[0].click();
    await page.waitForTimeout(300);

    // Now unseenSavedCount should be 2 (3 favorited - 1 seen = 2)
    const badgeUpdated = bottomNav.locator('span').filter({ hasText: '2' }).first();
    await expect(badgeUpdated).toBeVisible();

    // Navigate to O Meu Horário using bottomNav
    const horarioTab = bottomNav.locator('button[role="tab"]').filter({ hasText: /O Meu Horário/i });
    await horarioTab.click();
    await page.waitForTimeout(300);

    // Verify badge still shows 2
    await expect(bottomNav.locator('span').filter({ hasText: '2' }).first()).toBeVisible();
  });
});
