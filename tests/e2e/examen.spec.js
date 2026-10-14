import { test, expect, openTab, pane, audioLog, clearAudio } from './fixtures';

const startExam = async (page, { extraQuestion = false, duration } = {}) => {
  await openTab(page, 'Examen grupal');
  if (duration) await pane(page).locator('input[type=range]').fill(String(duration));
  await pane(page).getByText('Diseñar Examen (Editor)').click();
  if (extraQuestion) {
    await pane(page).getByText('Añadir Pregunta').click();
    await pane(page).locator('input[placeholder="Escribe la pregunta aquí..."]').nth(1).fill('Segunda pregunta');
  }
  await pane(page).getByText('Guardar y Jugar').click();
  await expect(pane(page).getByText('¡Elige tu personaje!')).toBeVisible();
};

test('todos los avatares cargan y son únicos', async ({ page }) => {
  await startExam(page);
  const result = await page.evaluate(async () => {
    const { ALL_SPRITES } = await import('/src/utils/sprites.js');
    const bad = [];
    await Promise.all(ALL_SPRITES.filter(s => s.startsWith('/')).map(src => new Promise((res) => {
      const im = new Image();
      im.onload = res;
      im.onerror = () => { bad.push(src); res(); };
      im.src = src;
    })));
    return { total: ALL_SPRITES.length, unique: new Set(ALL_SPRITES).size, bad };
  });
  expect(result.bad).toEqual([]);
  expect(result.unique).toBe(result.total);
});

test('partida completa: avatares, apuesta final y respuesta con teclado', async ({ page }) => {
  await startExam(page);
  await pane(page).getByRole('button', { name: /^Mazmorra/ }).click();
  for (let i = 0; i < 4; i++) await pane(page).locator('button[aria-pressed]').nth(i).click();
  await pane(page).getByText('¡Comenzar Examen!').click();
  await expect(pane(page).getByText('LA GRAN FINAL')).toBeVisible();
  await pane(page).getByText('Confirmar Apuesta y Ver Pregunta').click();
  await expect(pane(page).getByText('PREGUNTA AL AIRE')).toBeVisible();
  await page.keyboard.press('3');
  await expect(pane(page).getByText('Respuesta correcta: La piel')).toBeVisible({ timeout: 8000 });
});

test('tiempo agotado pasa al rebote con un solo zumbido', async ({ page }) => {
  await startExam(page, { extraQuestion: true, duration: 5 });
  await pane(page).getByRole('button', { name: /^Médicos/ }).click();
  const avatars = pane(page).locator('button[aria-pressed]');
  await avatars.nth(0).click();
  await avatars.nth(1).click();
  await pane(page).getByRole('button', { name: 'Anterior' }).click();
  await pane(page).getByRole('button', { name: 'Siguiente' }).click();
  await avatars.nth(2).click();
  await avatars.nth(3).click();
  await pane(page).getByText('¡Comenzar Examen!').click();
  await expect(pane(page).getByText('PREGUNTA AL AIRE')).toBeVisible();

  await clearAudio(page);
  await expect(pane(page).getByText(/Pasando al rebote/)).toBeVisible({ timeout: 12_000 });
  expect((await audioLog(page)).filter(x => x === 'play:sfx-buzzer.mp3').length).toBe(1);

  await expect(pane(page).getByText(/ROBO DE PUNTOS/)).toBeVisible();
  await clearAudio(page);
  await expect(pane(page).getByText('Respuesta correcta')).toBeVisible({ timeout: 15_000 });
  expect((await audioLog(page)).filter(x => x === 'play:sfx-buzzer.mp3').length).toBe(1);
  await expect(pane(page).getByText('+15s')).toHaveCount(0);
});
