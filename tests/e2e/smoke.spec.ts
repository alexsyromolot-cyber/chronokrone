import { expect, test, type Page } from '@playwright/test';

/** Zugriff auf den Test-Hook aus main.ts. */
async function game<T>(page: Page, fn: string): Promise<T> {
  return page.evaluate(`(() => { const g = window.__chronokrone; return (${fn}); })()`) as Promise<T>;
}

/** Erste Schlacht vorspulen und das Ergebnisfenster schließen: Wir stehen im Dorf. */
async function toVillage(page: Page): Promise<void> {
  await game(page, 'g.loop.fastForward(120)');
  await game(page, `g.run({ type: 'dismissResult' })`);
  await expect(page.locator('#village')).toBeVisible();
}

async function openRoom(page: Page, room: string): Promise<void> {
  await page.locator(`[data-room-tab="${room}"]`).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
});

test('Erste Schlacht, Ergebnis, Dorf, Bauen, Speichern und Laden', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // Kein Intro: Die erste Schlacht läuft sofort, nur die Arena ist sichtbar.
  await expect(page.locator('#stage canvas')).toBeVisible();
  await expect(page.locator('#battle-hud')).toContainText('Welle');
  await expect(page.locator('#village')).toBeHidden();
  await page.screenshot({ path: 'test-results/01-arena.png' });

  // Ein Alien anklicken (Koordinaten aus dem Spielzustand berechnet).
  await game(page, 'g.loop.fastForward(12)');
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

  // Bis zum Ende der (absichtlich verlorenen) ersten Schlacht: Ergebnisfenster, das man wegklicken muss.
  await game(page, 'g.loop.fastForward(120)');
  expect(await game(page, 'g.state.lastBattle.result')).toBe('lost');
  await expect(page.locator('.result-modal')).toContainText('Die Mauer ist gefallen');
  await page.screenshot({ path: 'test-results/02-ergebnis.png' });
  await page.getByRole('button', { name: 'Ins Dorf zurückkehren' }).click();
  await expect(page.locator('#castle')).toBeVisible();
  await expect(page.locator('#arena')).toBeHidden();

  // Holzfällerhütte auf das freie Waldfeld bauen – über die echte Oberfläche.
  await page.locator('.tile[data-select="2,3"]').click();
  await page
    .locator('.option', { hasText: 'Holzfällerhütte' })
    .getByRole('button', { name: 'Bauen' })
    .click();
  expect(await game(page, `g.state.tiles.find(t => t.x === 2 && t.y === 3).building`)).toBe('lumberHut');
  await page.screenshot({ path: 'test-results/03-dorf-bauplatz.png' });

  // Die Kaserne ist ein eigener Raum.
  await openRoom(page, 'kaserne');
  await expect(page.locator('#units')).toBeVisible();
  await expect(page.locator('#castle')).toBeHidden();

  // Verlauf des Erzählers: Klick auf die Figur.
  // Die Figur wippt (nie „stabil“ für Playwright) – die Sprechblase öffnet den Verlauf genauso.
  await page.locator('.narrator .bubble').click();
  await expect(page.locator('#log-body')).toContainText('Das war zu erwarten');
  await page.keyboard.press('Escape');

  // Speichern per Taste S, neu laden, Gebäude ist noch da.
  await page.keyboard.press('s');
  await expect(page.locator('#toasts')).toContainText('Gespeichert');
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  expect(await game(page, `g.state.tiles.find(t => t.x === 2 && t.y === 3).building`)).toBe('lumberHut');
  await expect(page.locator('.narrator .bubble')).toContainText('Willkommen zurück');

  expect(errors).toEqual([]);
});

test('Zur Mauer: Tor-Übergang in die Arena und zurück', async ({ page }) => {
  await toVillage(page);
  await page.locator('#start-battle').click();
  await expect(page.locator('#gate')).toHaveClass(/closing|opening/);
  await expect(page.locator('#arena')).toBeVisible();
  await expect(page.locator('#battle-hud')).toContainText('Beute');
  await game(page, `g.run({ type: 'retreat' })`);
  await expect(page.locator('.result-modal')).toContainText('Rückzug');
});

test('Zeitsprung: Dialog, Feier, Epoche 2 mit Chronik', async ({ page }) => {
  await toVillage(page);
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
  await openRoom(page, 'werkstatt');
  await page.locator('[data-jump]').click();
  await expect(page.locator('.modal')).toContainText('Zeitsprung');
  await page.getByRole('button', { name: 'Springen' }).click();
  await expect(page.locator('.modal-backdrop.celebrate')).toBeVisible();
  await expect(page.locator('.modal')).toContainText('Dampf & Zahnrad');
  await page.screenshot({ path: 'test-results/04-sprung.png' });
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  expect(await game(page, 'g.state.epoch')).toBe(2);
  await expect(page.locator('#epoch-label')).toContainText('Epoche 2');
  await openRoom(page, 'chronik');
  await expect(page.locator('#chronicle')).toBeVisible();
  await page.screenshot({ path: 'test-results/05-chronik-turm.png' });
});

test('Hofbefehle: Regel zusammenklicken, Countdown im Dorf, dann zur Mauer', async ({ page }) => {
  await toVillage(page);
  await game(page, `(() => { g.state.unlocked.orders = true; g.state.unlocked.recruit = true; })()`);
  await openRoom(page, 'thronsaal');
  await page.locator('[data-order-btn="add"]').click();
  await expect(page.locator('.rule')).toHaveCount(1);
  // Aktion umstellen und wieder zurück – über die echten Auswahllisten.
  await page.locator('select[data-order="0.action.kind"]').selectOption('notify');
  expect(await game(page, 'g.state.orders.rules[0].action.kind')).toBe('notify');
  await page.locator('select[data-order="0.action.kind"]').selectOption('startBattle');
  // Der Schreiber-Mönch ruft zur Mauer: erst ein sichtbarer Countdown, keine Schlacht im Hintergrund.
  await game(page, 'g.loop.fastForward(2)');
  expect(await game(page, '!!g.state.battle')).toBe(false);
  await expect(page.locator('#countdown')).toContainText('Aufbruch in');
  await expect(page.locator('#orders-log')).toContainText('Regel 1 ausgeführt');
  await page.screenshot({ path: 'test-results/06-hofbefehl-countdown.png' });
  await game(page, 'g.loop.fastForward(11)');
  expect(await game(page, '!!g.state.battle')).toBe(true);
  await expect(page.locator('#arena')).toBeVisible();
});

test('Ereignis pausiert das Spiel; Drohne anklicken', async ({ page }) => {
  await toVillage(page);
  await game(
    page,
    `(() => { g.state.events.active = { id: 'bard', expiresAt: g.state.time, params: {} }; })()`,
  );
  await expect(page.locator('.event-modal')).toContainText('Spiel pausiert');
  const t0 = await game<number>(page, 'g.state.time');
  await game(page, 'g.loop.fastForward(30)');
  expect(await game<number>(page, 'g.state.time')).toBe(t0);
  await page.screenshot({ path: 'test-results/07-ereignis.png' });
  await page.getByRole('button', { name: /Verjagen/ }).click();
  expect(await game(page, 'g.state.events.active')).toBeNull();
  await expect(page.locator('.narrator .bubble')).toContainText('Verjagt');

  // Drohne fliegt über das Schlachtfeld – also zur Mauer.
  await page.locator('#start-battle').click();
  await expect(page.locator('#arena')).toBeVisible();
  await page.waitForTimeout(1500);
  await game(page, `(() => { g.state.events.drone = { left: 7.9, lane: 0 }; })()`);
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

test('Rückblick nach langer Pause mit Ausgeruht-Bonus', async ({ page }) => {
  await toVillage(page);
  // Speichern und so tun, als sei das zwei Stunden her.
  await game(page, 'g.save()');
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('chronokrone.save')!);
    raw.state.session.lastSeenAt -= 2 * 3600 * 1000;
    localStorage.setItem('chronokrone.save', JSON.stringify(raw));
    // Beim Neuladen nicht erneut speichern, sonst wäre die Pause weg.
    const restore = () => localStorage.setItem('chronokrone.save', JSON.stringify(raw));
    window.addEventListener('pagehide', restore);
    document.addEventListener('visibilitychange', restore);
  });
  await page.reload();
  await expect(page.locator('.modal-backdrop.recap')).toBeVisible();
  await expect(page.locator('.recap-table')).toContainText('Aliens besiegt');
  await page.waitForTimeout(1700);
  await page.screenshot({ path: 'test-results/08-rueckblick.png' });
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.locator('#start-battle').click();
  await expect(page.locator('.rested')).toContainText('Ausgeruht');
});

test('Einstellungen: per Taste öffnen, Schriftgröße, Ton aus, Sprache', async ({ page }) => {
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('o');
  await expect(page.locator('#settings')).toBeVisible();
  await page.locator('[data-setting="fontScale"]').fill('1.2');
  expect(await game(page, 'g.state.settings.fontScale')).toBe(1.2);
  await page.locator('#settings [data-setting="reducedMotion"]').check();
  expect(await game(page, 'g.state.settings.reducedMotion')).toBe(true);
  await page.locator('#settings').screenshot({ path: 'test-results/09-einstellungen.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings')).toBeHidden();
  await page.keyboard.press('m');
  expect(await game(page, 'g.state.settings.sfxVolume')).toBe(0);
  await page.keyboard.press('o');
  await page.locator('[data-setting="locale"]').selectOption('en');
  await expect(page.locator('h1')).toHaveText('Chronocrown');
});

test('Sprache lässt sich umschalten', async ({ page }) => {
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('h1')).toHaveText('Chronocrown');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#battle-hud')).toContainText('Wave');
});

test('Nach 15 Minuten Spielzeit: Räume sehen ordentlich aus', async ({ page }) => {
  await game(
    page,
    `(() => {
      g.loop.fastForward(120);
      g.run({ type: 'dismissResult' });
      for (const k of ['gold','wood','stone']) g.state.resources[k] = g.state.resources[k].add(150);
      g.run({ type: 'build', x: 2, y: 3, building: 'lumberHut' });
      g.run({ type: 'recruit', classId: 'woodcutter' });
      g.run({ type: 'clearTile', x: 2, y: 2 });
      g.run({ type: 'build', x: 2, y: 2, building: 'lumberHut' });
      g.state.skillPoints.peasant = 2; g.state.stats.skillPointsEarned = 2;
    })()`,
  );
  await expect(page.locator('#village')).toBeVisible();
  await openRoom(page, 'uebung');
  await expect(page.locator('#skills')).toBeVisible();
  await page.screenshot({ path: 'test-results/10-uebungsplatz.png' });
  await openRoom(page, 'kaserne');
  await page.screenshot({ path: 'test-results/11-kaserne.png' });
});
