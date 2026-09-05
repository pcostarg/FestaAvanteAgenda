import { test, expect } from '@playwright/test';

test.use({ channel: 'msedge', viewport: { width: 1280, height: 800 } });

test.describe('Grelha View In-Depth Browser Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4173/FestaAvanteAgenda/');
    // Navigate to Grelha view
    const grelhaTab = page.getByRole('button', { name: /grelha/i });
    await grelhaTab.click();
    await page.waitForTimeout(300);
  });

  test('Check Grelha rendering, header and time range', async ({ page }) => {
    // Check heading
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Grelha de Palcos');

    // Check subtitle
    const subtitle = page.locator('p').filter({ hasText: /08h às 02h/i });
    await expect(subtitle).toBeVisible();

    // Check time axis hours (should start at 08:00 and go to 02:00)
    const timeLabels = await page.locator('.sticky.top-0 span.font-mono').allTextContents();
    console.log('Time axis labels count:', timeLabels.length, 'sample:', timeLabels.slice(0, 4), '...', timeLabels.slice(-3));
    expect(timeLabels).toContain('08:00');
    expect(timeLabels).toContain('02:00');
    expect(timeLabels.length).toBe(19);
  });

  test('Check backward scrolling to 08:00', async ({ page }) => {
    const scrollContainer = page.locator('div.overflow-auto').first();
    const initialScrollLeft = await scrollContainer.evaluate((el) => el.scrollLeft);
    console.log('Initial scrollLeft:', initialScrollLeft);

    // Should be able to scroll to 0 (08:00)
    await scrollContainer.evaluate((el) => { el.scrollLeft = 0; });
    const newScrollLeft = await scrollContainer.evaluate((el) => el.scrollLeft);
    expect(newScrollLeft).toBe(0);
  });

  test('Check stages under "Todos", "Palcos Principais", "Espaços Culturais", "Pavilhões Regionais"', async ({ page }) => {
    // Select Saturday where most stages have events
    await page.getByRole('tab', { name: /Sábado 6/i }).click();
    await page.waitForTimeout(200);

    // Get stage names under "Todos"
    const stagesTodos = await page.locator('span.font-display.font-bold.truncate').allTextContents();
    console.log(`Saturday "Todos" stage count: ${stagesTodos.length}`);
    expect(stagesTodos.length).toBe(26);

    // Click "Palcos Principais"
    await page.getByRole('button', { name: /Palcos Principais/i }).click();
    await page.waitForTimeout(200);
    const stagesPrincipais = await page.locator('span.font-display.font-bold.truncate').allTextContents();
    console.log(`Saturday "Principais" stage count: ${stagesPrincipais.length}`);
    expect(stagesPrincipais.length).toBe(9);

    // Click "Espaços Culturais"
    await page.getByRole('button', { name: /Espaços Culturais/i }).click();
    await page.waitForTimeout(200);
    const stagesCulturais = await page.locator('span.font-display.font-bold.truncate').allTextContents();
    console.log(`Saturday "Culturais" stage count: ${stagesCulturais.length}`, stagesCulturais);
    expect(stagesCulturais.length).toBe(5);

    // Click "Pavilhões Regionais"
    await page.getByRole('button', { name: /Pavilhões Regionais/i }).click();
    await page.waitForTimeout(200);
    const stagesRegionais = await page.locator('span.font-display.font-bold.truncate').allTextContents();
    console.log(`Saturday "Regionais" stage count: ${stagesRegionais.length}`, stagesRegionais);
    expect(stagesRegionais.length).toBe(12);
  });

  test('Check multi-lane overlapping events on Saturday for visual collisions', async ({ page }) => {
    await page.getByRole('tab', { name: /Sábado 6/i }).click();
    await page.waitForTimeout(200);

    // Find tracks with multi-lanes badge
    const multiLaneBadges = page.locator('text=/\\d+ pistas/');
    const badgeCount = await multiLaneBadges.count();
    console.log(`Multi-lane stage tracks found on Saturday: ${badgeCount}`);
    expect(badgeCount).toBeGreaterThan(0);

    // Evaluate collision between all event blocks in each track
    const collisions = await page.evaluate(() => {
      const tracks = document.querySelectorAll('div.relative.w-\\[2400px\\]');
      const collisionList: { stage: string; ev1: string; ev2: string; overlapRect: any }[] = [];

      tracks.forEach((track) => {
        const blocks = Array.from(track.querySelectorAll('div[role="button"][aria-label]'));
        if (blocks.length < 2) return;

        for (let i = 0; i < blocks.length; i++) {
          const rectA = blocks[i].getBoundingClientRect();
          const titleA = blocks[i].getAttribute('aria-label') || '';

          for (let j = i + 1; j < blocks.length; j++) {
            const rectB = blocks[j].getBoundingClientRect();
            const titleB = blocks[j].getAttribute('aria-label') || '';

            // Check if bounding rects collide both horizontally and vertically
            const horizontalOverlap = Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left);
            const verticalOverlap = Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top);

            if (horizontalOverlap > 2 && verticalOverlap > 2) {
              collisionList.push({
                stage: track.closest('.flex.border-b')?.querySelector('.font-display')?.textContent || 'Unknown',
                ev1: titleA,
                ev2: titleB,
                overlapRect: { horizontalOverlap, verticalOverlap, rectA, rectB },
              });
            }
          }
        }
      });

      return collisionList;
    });

    console.log(`Collision count on Saturday: ${collisions.length}`);
    expect(collisions.length).toBe(0);
  });

  test('Check visual text clipping in EventBlocks', async ({ page }) => {
    await page.getByRole('tab', { name: /Sábado 6/i }).click();
    await page.waitForTimeout(200);

    // Check if event block content overflows or is clipped awkwardly
    const blockDimensions = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('div[role="button"][aria-label]'));
      let clippedCount = 0;
      let totalBlocks = blocks.length;
      const issues: any[] = [];

      blocks.forEach((block) => {
        const timeEl = block.querySelector('.font-mono');
        const blockRect = block.getBoundingClientRect();

        if (blockRect.height < 40) {
          issues.push({ reason: 'height too small', height: blockRect.height, label: block.getAttribute('aria-label') });
        }

        // Check if timeEl is pushed out of block
        if (timeEl) {
          const timeRect = timeEl.getBoundingClientRect();
          if (timeRect.bottom > blockRect.bottom + 2) {
            clippedCount++;
            issues.push({ reason: 'time row overflow', blockBottom: blockRect.bottom, timeRectBottom: timeRect.bottom, label: block.getAttribute('aria-label') });
          }
        }
      });

      return { totalBlocks, clippedCount, issues };
    });

    console.log(`Blocks evaluated: ${blockDimensions.totalBlocks}, clipped: ${blockDimensions.clippedCount}`);
    if (blockDimensions.issues.length > 0) {
      console.log('Sample issues:', blockDimensions.issues.slice(0, 5));
    }
    expect(blockDimensions.clippedCount).toBe(0);
  });

  test('Check vertical sticky behavior of TimeAxisHeader and stage column', async ({ page }) => {
    await page.getByRole('tab', { name: /Sábado 6/i }).click();
    await page.waitForTimeout(200);

    const scrollContainer = page.locator('div.overflow-auto').first();
    // Scroll down 400px inside the matrix container
    await scrollContainer.evaluate((el) => { el.scrollTop = 400; });
    await page.waitForTimeout(200);

    const stickyResult = await page.evaluate(() => {
      const container = document.querySelector('div.overflow-auto') as HTMLElement;
      const header = document.querySelector('.sticky.top-0') as HTMLElement;
      const stageCols = Array.from(document.querySelectorAll('.sticky.left-0'));

      const containerRect = container.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();

      return {
        headerTop: headerRect.top,
        containerTop: containerRect.top,
        headerIsAtContainerTop: Math.abs(headerRect.top - containerRect.top) < 3,
        stageColsCount: stageCols.length,
      };
    });

    console.log('Sticky 2D matrix verification:', stickyResult);
    expect(stickyResult.headerIsAtContainerTop).toBe(true);
    expect(stickyResult.stageColsCount).toBeGreaterThan(10);
  });
});
