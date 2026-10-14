import fs from 'node:fs';
import { test, expect, openTab, pane } from './fixtures';

test('XP, ascenso, energía e insignias (también con teclado)', async ({ page }) => {
  await openTab(page, 'Progreso RPG');
  const xp50 = pane(page).getByRole('button', { name: '+50 XP (Gran Logro)' });
  await xp50.click();
  await xp50.click();
  await expect(page.getByText('¡SUBIDA DE NIVEL!')).toBeVisible();
  await page.locator('.promotion-overlay').click();

  await pane(page).getByText('Daño (Fallo)').click();
  await expect(pane(page).getByText('90 / 100')).toBeVisible();

  const badge = pane(page).locator('.badge').first();
  await badge.focus();
  await page.keyboard.press('Enter');
  await expect(badge).toHaveAttribute('aria-pressed', 'true');
  await expect(pane(page).getByText('1 / 4 logros')).toBeVisible();
});

test('exporta un respaldo y sobrevive a uno mal formado', async ({ page }, testInfo) => {
  await openTab(page, 'Progreso RPG');
  await pane(page).getByRole('button', { name: '+50 XP (Gran Logro)' }).click();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    pane(page).getByText('Exportar respaldo').click(),
  ]);
  const goodPath = await download.path();
  const backup = JSON.parse(fs.readFileSync(goodPath, 'utf8'));
  expect(backup.state.xp).toBe(50);

  const badPath = testInfo.outputPath('malo.json');
  fs.writeFileSync(badPath, JSON.stringify({ state: { xp: 'mucho', badges: 'x', pickerItems: [1, 'Zoe', null], savedRosters: 5, health: 900 } }));
  await pane(page).locator('#rpg-import-input').setInputFiles(badPath);
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(pane(page).getByText('0 / 4 logros')).toBeVisible();
  await expect(pane(page).getByText('100 / 100')).toBeVisible();

  await page.reload();
  await openTab(page, 'Progreso RPG');
  await pane(page).locator('#rpg-import-input').setInputFiles(goodPath);
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(pane(page).getByText(/XP:\s*50/)).toBeVisible();
});
