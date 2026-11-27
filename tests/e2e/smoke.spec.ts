import { expect, test, type Page } from '@playwright/test';

/** Zugriff auf den Test-Hook aus main.ts. */
async function game<T>(page: Page, fn: string): Promise<T> {
  return page.evaluate(`(() => { const g = window.__chronokrone; return (${fn}); })()`) as Promise<T>;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
});

test('Erste Schlacht, Burg, Bauen, Speichern und Laden', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // Kein Intro: Die erste Schlacht läuft sofort, nur die Schlacht ist sichtbar.
  await expect(page.locator('#stage canvas')).toBeVisible();
  await expect(page.locator('#battle-hud')).toContainText('Welle');
  await expect(page.locator('#castle')).toBeHidden();
  await page.screenshot({ path: 'test-results/01-erste-schlacht.png' });

  // Ein Alien anklicken (Koordinaten aus dem Spielzustand berechnet).
  await game(page, 'g.loop.fastForward(12)');
  // Einen Frame abwarten, damit die Szene die neuen Positionen gezeichnet hat.
  await page.waitForTimeout(150);
  const clicked = await game<boolean>(
    page,
    `(() => {
      const e = g.state.battle.enemies[0]; if (!e) return false;
      const c = document.querySelector('#stage canvas').getBoundingClientRect();
      const x = c.left + (e.x + 7) / 320 * c.width, y = c.top + (141 - e.lane * 7) / 180 * c.height;
      document.querySelector('#stage canvas').dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }));
      return g.state.stats.clicks === 1;
    })()`,
  );
  expect(clicked).toBe(true);

  // Bis zum Ende der (absichtlich verlorenen) ersten Schlacht vorspulen.
  await game(page, 'g.loop.fastForward(120)');
  expect(await game(page, 'g.state.lastBattle.result')).toBe('lost');
  await expect(page.locator('#castle')).toBeVisible();
  await expect(page.locator('#log-body')).toContainText('Das war zu erwarten');

  // Holzfällerhütte auf das freie Waldfeld bauen – über die echte Oberfläche.
  await page.locator('.tile[data-select="2,3"]').click();
  await page
    .locator('.option', { hasText: 'Holzfällerhütte' })
    .getByRole('button', { name: 'Bauen' })
    .click();
  expect(await game(page, `g.state.tiles.find(t => t.x === 2 && t.y === 3).building`)).toBe('lumberHut');
  await expect(page.locator('#units')).toBeVisible();
  await page.screenshot({ path: 'test-results/02-burg.png', fullPage: true });

  // Speichern per Taste S, neu laden, Gebäude ist noch da.
  await page.keyboard.press('s');
  await expect(page.locator('#toast')).toContainText('Gespeichert');
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  expect(await game(page, `g.state.tiles.find(t => t.x === 2 && t.y === 3).building`)).toBe('lumberHut');
  await expect(page.locator('#log-body')).toContainText('Willkommen zurück');

  expect(errors).toEqual([]);
});

test('Sprache lässt sich umschalten', async ({ page }) => {
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('h1')).toHaveText('Chronocrown');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#battle h2')).toHaveText('Defence');
});

test('Nach 15 Minuten Spielzeit mit voller Burg sieht alles ordentlich aus', async ({ page }) => {
  // Zustand für den Screenshot: Debug-Werte setzen statt 15 Minuten zu spielen.
  await game(
    page,
    `(() => {
      g.loop.fastForward(120);
      for (const k of ['gold','wood','stone']) g.state.resources[k] = g.state.resources[k].add(150);
      g.run({ type: 'build', x: 2, y: 3, building: 'lumberHut' });
      g.run({ type: 'recruit', classId: 'woodcutter' });
      g.run({ type: 'clearTile', x: 2, y: 2 });
      g.run({ type: 'build', x: 2, y: 2, building: 'lumberHut' });
      g.state.skillPoints.peasant = 2; g.state.stats.skillPointsEarned = 2;
      g.run({ type: 'startBattle' });
      g.loop.fastForward(25);
    })()`,
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/03-mitte.png', fullPage: true });
  await expect(page.locator('#skills')).toBeVisible();
});
