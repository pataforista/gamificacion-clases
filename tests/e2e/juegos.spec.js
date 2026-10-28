import { test, expect, openTab, pane } from './fixtures';

test.describe('Dado', () => {
  test('tirada normal, fórmula con Enter y límite de cantidad', async ({ page }) => {
    await openTab(page, 'Dado');
    const count = pane(page).locator('input[type=number]').first();
    await count.fill('500');
    await expect(count).toHaveValue('20');
    await count.fill('2');
    await pane(page).getByRole('button', { name: 'Tirar' }).click();
    await expect(pane(page).locator('.smallout').first()).toHaveText(/Total: \d+/);

    const formula = pane(page).locator('input[placeholder^="Fórmula"]');
    await formula.fill('2d6+1');
    await formula.press('Enter');
    await expect(pane(page).locator('.smallout').first()).toContainText('2d6+1');
  });
});

test.describe('Ruleta', () => {
  test('gira y muestra al ganador centrado', async ({ page }) => {
    await openTab(page, 'Ruleta');
    await pane(page).getByRole('button', { name: '¡Girar!' }).click();
    const modal = pane(page).getByText('el ganador es').locator('..');
    await expect(modal).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(900);
    const box = await modal.boundingBox();
    const card = await pane(page).locator('.fs-card').boundingBox();
    expect(Math.abs((box.x + box.width / 2) - (card.x + card.width / 2))).toBeLessThan(5);
  });
});

test.describe('Trivia', () => {
  test('el banco de preguntas se conserva y se puede calificar', async ({ page }) => {
    await openTab(page, 'Trivia');
    await pane(page).locator('textarea').fill('¿2+2?|4\n¿Capital de Francia?|París');
    await page.reload();
    await openTab(page, 'Trivia');
    await expect(pane(page).locator('textarea')).toHaveValue(/París/);
    await pane(page).getByRole('button', { name: 'Nueva pregunta' }).click();
    await pane(page).getByRole('button', { name: '✓ Correcto' }).click();
    await expect(pane(page).getByText('✓ 1')).toBeVisible();
  });
});

test.describe('Orden por toque', () => {
  test('asigna turnos a tres dedos', async ({ page }) => {
    await openTab(page, 'Orden por toque');
    await expect(pane(page).locator('.touch-pad')).toBeVisible();
    await page.evaluate(() => {
      const pad = document.querySelector('.module-pane:not([hidden]) .touch-pad');
      const r = pad.getBoundingClientRect();
      [1, 2, 3].forEach((id, i) => pad.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: id, clientX: r.left + 60 + i * 120, clientY: r.top + 80, bubbles: true,
      })));
    });
    await expect(pane(page).locator('.touch-num')).toHaveCount(3, { timeout: 6000 });
    expect((await pane(page).locator('.touch-num').allInnerTexts()).sort()).toEqual(['1', '2', '3']);
  });
});
