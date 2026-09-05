import { test, expect } from '@playwright/test';

test.use({ channel: 'msedge', viewport: { width: 1280, height: 800 } });

test.describe('State, Scroll & Context Retention Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4173/FestaAvanteAgenda/');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.waitForTimeout(400);
  });

  test('Default day is "today" (Saturday, Sábado 6), not Friday', async ({ page }) => {
    const satTab = page.getByRole('tab', { name: /Sábado 6/i }).first();
    await expect(satTab).toBeVisible();
    await expect(satTab).toHaveAttribute('aria-selected', 'true');

    const friTab = page.getByRole('tab', { name: /Sexta 5/i }).first();
    await expect(friTab).toHaveAttribute('aria-selected', 'false');
  });

  test('Day selection is remembered when switching between menu screens', async ({ page }) => {
    const domTabGrelha = page.getByRole('tab', { name: /Domingo 7/i }).first();
    await domTabGrelha.click();
    await page.waitForTimeout(300);
    await expect(domTabGrelha).toHaveAttribute('aria-selected', 'true');

    const listaTab = page.locator('nav[role="tablist"] button[role="tab"]').filter({ hasText: /Lista/i }).first();
    await listaTab.click();
    await page.waitForTimeout(300);

    const domTabLista = page.getByRole('tab', { name: /Domingo 7/i }).first();
    await expect(domTabLista).toBeVisible();
    await expect(domTabLista).toHaveAttribute('aria-selected', 'true');

    const sabTabLista = page.getByRole('tab', { name: /Sábado 6/i }).first();
    await sabTabLista.click();
    await page.waitForTimeout(300);
    await expect(sabTabLista).toHaveAttribute('aria-selected', 'true');

    const horarioTab = page.locator('nav[role="tablist"] button[role="tab"]').filter({ hasText: /O Meu Horário/i }).first();
    await horarioTab.click();
    await page.waitForTimeout(300);

    const sabTabHorario = page.getByRole('tab', { name: /Sábado 6/i }).first();
    await expect(sabTabHorario).toBeVisible();
    await expect(sabTabHorario).toHaveAttribute('aria-selected', 'true');

    const grelhaTab = page.locator('nav[role="tablist"] button[role="tab"]').filter({ hasText: /Grelha/i }).first();
    await grelhaTab.click();
    await page.waitForTimeout(300);

    const sabTabGrelha = page.getByRole('tab', { name: /Sábado 6/i }).first();
    await expect(sabTabGrelha).toHaveAttribute('aria-selected', 'true');
  });

  test('Grid scroll position is preserved when switching views and returning', async ({ page }) => {
    const grelhaTab = page.locator('nav[role="tablist"] button[role="tab"]').filter({ hasText: /Grelha/i }).first();
    await grelhaTab.click();
    await page.waitForTimeout(300);

    const scrollContainer = page.locator('div.overflow-auto').first();
    await expect(scrollContainer).toBeVisible();

    await scrollContainer.evaluate((el) => {
      el.scrollLeft = 1200;
      el.scrollTop = 100;
      el.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(200);

    const beforeSwitchScroll = await scrollContainer.evaluate((el) => ({
      left: el.scrollLeft,
      top: el.scrollTop,
    }));
    expect(beforeSwitchScroll.left).toBe(1200);

    const listaTab = page.locator('nav[role="tablist"] button[role="tab"]').filter({ hasText: /Lista/i }).first();
    await listaTab.click();
    await page.waitForTimeout(300);

    await grelhaTab.click();
    await page.waitForTimeout(300);

    const afterSwitchScroll = await scrollContainer.evaluate((el) => ({
      left: el.scrollLeft,
      top: el.scrollTop,
    }));
    expect(afterSwitchScroll.left).toBe(1200);
    expect(afterSwitchScroll.top).toBe(100);
  });

  test('Closing EventDrawer preserves scroll position, day, and context without jump', async ({ page }) => {
    const grelhaTab = page.locator('nav[role="tablist"] button[role="tab"]').filter({ hasText: /Grelha/i }).first();
    await grelhaTab.click();
    await page.waitForTimeout(300);

    const scrollContainer = page.locator('div.overflow-auto').first();

    await scrollContainer.evaluate((el) => {
      el.scrollLeft = 800;
      el.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(200);

    const firstBlock = page.locator('.relative.w-\\[2400px\\] div[role="button"][aria-label]').first();
    await firstBlock.click();
    await page.waitForTimeout(300);

    const drawer = page.locator('div[role="dialog"]');
    await expect(drawer).toBeVisible();

    const closeBtn = drawer.locator('button[aria-label*="Fechar"], button:has(svg)').first();
    await closeBtn.click();
    await page.waitForTimeout(300);

    await expect(drawer).toBeHidden();

    const currentScrollLeft = await scrollContainer.evaluate((el) => el.scrollLeft);
    expect(currentScrollLeft).toBe(800);

    const satTab = page.getByRole('tab', { name: /Sábado 6/i }).first();
    await expect(satTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Stepping back (browser back button) when EventDrawer is open closes drawer and preserves scroll and view', async ({ page }) => {
    const grelhaTab = page.locator('nav[role="tablist"] button[role="tab"]').filter({ hasText: /Grelha/i }).first();
    await grelhaTab.click();
    await page.waitForTimeout(300);

    const scrollContainer = page.locator('div.overflow-auto').first();
    await scrollContainer.evaluate((el) => {
      el.scrollLeft = 600;
      el.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(200);

    const firstBlock = page.locator('.relative.w-\\[2400px\\] div[role="button"][aria-label]').first();
    await firstBlock.click();
    await page.waitForTimeout(300);

    const drawer = page.locator('div[role="dialog"]');
    await expect(drawer).toBeVisible();

    await page.goBack();
    await page.waitForTimeout(300);

    await expect(drawer).toBeHidden();

    const heading = page.locator('h1');
    await expect(heading).toHaveText('Grelha de Palcos');

    const satTab = page.getByRole('tab', { name: /Sábado 6/i }).first();
    await expect(satTab).toHaveAttribute('aria-selected', 'true');

    const scrollLeft = await scrollContainer.evaluate((el) => el.scrollLeft);
    expect(scrollLeft).toBe(600);
  });
});