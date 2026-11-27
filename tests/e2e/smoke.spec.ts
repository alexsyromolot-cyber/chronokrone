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

test('Zeitsprung: Dialog, Feier, Epoche 2 mit Chronik', async ({ page }) => {
  await game(page, 'g.loop.fastForward(120)');
  await game(
    page,
    `(() => {
      const s = g.state;
      s.unlocked.timeMachine = true;
      s.timeMachineAt = s.time;
      s.siegeLevel = 5;
    })()`,
  );
  await page.waitForTimeout(400);
  await page.locator('[data-jump]').click();
  await expect(page.locator('.modal')).toContainText('Zeitsprung');
  await page.getByRole('button', { name: 'Springen' }).click();
  await expect(page.locator('.modal-backdrop.celebrate')).toBeVisible();
  await expect(page.locator('.modal')).toContainText('Dampf & Zahnrad');
  await page.screenshot({ path: 'test-results/04-sprung.png' });
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  expect(await game(page, 'g.state.epoch')).toBe(2);
  await expect(page.locator('#epoch-label')).toContainText('Epoche 2');
  await expect(page.locator('#chronicle')).toBeVisible();
  await page.screenshot({ path: 'test-results/05-epoche2.png', fullPage: true });
});

test('Hofbefehle: Regel zusammenklicken und automatisch ausführen lassen', async ({ page }) => {
  await game(page, 'g.loop.fastForward(120)');
  await game(page, `(() => { g.state.unlocked.orders = true; g.state.unlocked.recruit = true; })()`);
  await page.locator('[data-order-btn="add"]').click();
  await expect(page.locator('.rule')).toHaveCount(1);
  // Aktion umstellen und wieder zurück – über die echten Auswahllisten.
  await page.locator('select[data-order="0.action.kind"]').selectOption('notify');
  expect(await game(page, 'g.state.orders.rules[0].action.kind')).toBe('notify');
  await page.locator('select[data-order="0.action.kind"]').selectOption('startBattle');
  // Der Schreiber-Mönch startet die Schlacht selbst.
  await game(page, 'g.loop.fastForward(2)');
  expect(await game(page, '!!g.state.battle')).toBe(true);
  await page.waitForTimeout(300);
  await expect(page.locator('#orders-log')).toContainText('Regel 1 ausgeführt');
  await page.locator('#orders').screenshot({ path: 'test-results/06-hofbefehle.png' });
});

test('Ereignis beantworten und Drohne anklicken', async ({ page }) => {
  await game(page, 'g.loop.fastForward(120)');
  await game(
    page,
    `(() => {
      g.state.events.active = { id: 'bard', expiresAt: g.state.time + 60, params: {} };
      g.state.events.drone = { left: 7.9, lane: 0 };
    })()`,
  );
  await expect(page.locator('#event')).toBeVisible();
  await page.screenshot({ path: 'test-results/07-ereignis.png' });
  await page.getByRole('button', { name: /Verjagen/ }).click();
  expect(await game(page, 'g.state.events.active')).toBeNull();
  await expect(page.locator('#log-body')).toContainText('Verjagt');
  // Drohne: Position aus der Szene, dann ins Canvas klicken.
  await page.waitForTimeout(100);
  const caught = await game<boolean>(
    page,
    `(() => {
      const c = document.querySelector('#stage canvas').getBoundingClientRect();
      const left = g.state.events.drone.left, progress = 1 - left / 8;
      const x = c.left + (330 - progress * 360 + 7) / 320 * c.width, y = c.top + (24 + 5) / 180 * c.height;
      document.querySelector('#stage canvas').dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }));
      return g.state.stats.dronesCaught === 1;
    })()`,
  );
  expect(caught).toBe(true);
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
