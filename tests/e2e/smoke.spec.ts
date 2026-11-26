import { expect, test } from '@playwright/test';

test('Spiel lädt, Logik tickt, Canvas ist da', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('h1')).toHaveText('Chronokrone');
  await expect(page.locator('#stage canvas')).toBeVisible();

  // Der Tick-Zähler muss steigen – sonst läuft der Game-Loop nicht.
  const ticks = page.locator('#ticks');
  const first = (await ticks.textContent()) ?? '';
  await expect(ticks).not.toHaveText(first, { timeout: 3000 });

  expect(errors).toEqual([]);
});

test('Sprache lässt sich umschalten', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('h1')).toHaveText('Chronocrown');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
