import { test, expect } from '@playwright/test';

test.describe('Mobile Search, Title Multiline & Event Link Verification', () => {
  test('Event titles in Lista view wrap to multiple lines without truncation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./#lista');
    await page.waitForLoadState('networkidle');

    // Check h3 titles inside event cards
    const titles = page.locator('h3.font-display');
    await expect(titles.first()).toBeVisible();

    // Verify none of the card titles have the 'truncate' class
    const titleCount = await titles.count();
    expect(titleCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(5, titleCount); i++) {
      const el = titles.nth(i);
      const classAttr = await el.getAttribute('class');
      expect(classAttr).not.toContain('truncate');
      expect(classAttr).toContain('break-words');
    }
  });

  test('Event Drawer displays link to external official festival webpage when available in JSON', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./#lista');
    await page.waitForLoadState('networkidle');

    // Click on the first event card to open the drawer
    const firstCard = page.locator('h3.font-display').first();
    await firstCard.click();

    // The drawer should open
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Check for official webpage link
    const externalLink = drawer.locator('a[href*="festadoavante.pcp.pt"]');
    await expect(externalLink).toBeVisible();
    await expect(externalLink).toContainText('Ver página oficial do evento');
    expect(await externalLink.getAttribute('target')).toBe('_blank');
    expect(await externalLink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  test('In mobile view, clicking the search icon reveals the search input and enables searching', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./#grelha');
    await page.waitForLoadState('networkidle');

    // On grelha view on mobile, desktop search is hidden
    const desktopSearch = page.locator('input[placeholder*="Pesquisar artistas, palcos..."]').first();
    await expect(desktopSearch).not.toBeVisible();

    // Click on mobile search button (lupa)
    const mobileSearchBtn = page.locator('button[aria-label="Abrir pesquisa"]');
    await expect(mobileSearchBtn).toBeVisible();
    await mobileSearchBtn.click();

    // Now header search input should be visible and active
    const mobileInput = page.locator('input[aria-label="Pesquisar programação"]');
    await expect(mobileInput).toBeVisible();

    // Type a query that matches specific titles, e.g. "Capicua" or "Pinturas"
    await mobileInput.fill('Pinturas');

    // The view should have switched to Lista and filtered events
    await expect(page.locator('h1')).toContainText('Lista Cronológica');
    const matchedCards = page.locator('h3.font-display');
    const count = await matchedCards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const txt = await matchedCards.nth(i).textContent();
      expect(txt?.toLowerCase()).toContain('pinturas');
    }

    // Direct mobile search bar in Lista view also present and synchronized
    const listaInput = page.locator('input[aria-label="Pesquisar programação na lista"]');
    await expect(listaInput).toBeVisible();
    await expect(listaInput).toHaveValue('Pinturas');
  });
});
