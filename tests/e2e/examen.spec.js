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
  // Las opciones vienen barajadas: la tecla depende de dónde cayó "La piel".
  const textos = await pane(page).locator('.exam-options button').allTextContents();
  const lugar = textos.findIndex(t => t.includes('La piel'));
  expect(lugar).toBeGreaterThanOrEqual(0);
  await page.keyboard.press(String(lugar + 1));
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

test.describe('Barajado de respuestas', () => {
  test('viene activado por defecto', async ({ page }) => {
    await openTab(page, 'Examen grupal');
    await expect(pane(page).getByLabel(/Barajar Respuestas/)).toBeChecked();
  });

  test('reparte la respuesta correcta de forma pareja y no la pierde', async ({ page }) => {
    await openTab(page, 'Examen grupal');
    const r = await page.evaluate(async () => {
      const { barajarOpciones } = await import('/src/utils/examShuffle.js');
      const N = 2000;
      const posiciones = [0, 0, 0, 0];
      let perdidas = 0;
      for (let i = 0; i < N; i++) {
        const q = barajarOpciones({ options: ['A', 'B', 'C', 'D'], correctIndex: 0 });
        posiciones[q.correctIndex]++;
        if (q.options[q.correctIndex] !== 'A') perdidas++;
      }
      const anclada = barajarOpciones({ options: ['x', 'y', 'z', 'Todas las anteriores'], correctIndex: 3 });
      const porLetra = barajarOpciones({ options: ['x', 'A y B', 'z', 'w'], correctIndex: 1 });
      return { N, posiciones, perdidas, anclada, porLetra };
    });
    expect(r.perdidas).toBe(0);
    // Con 2000 intentos, cada lugar debería rondar el 25 % (margen amplio contra falsos fallos).
    for (const n of r.posiciones) {
      expect(n / r.N).toBeGreaterThan(0.2);
      expect(n / r.N).toBeLessThan(0.3);
    }
    expect(r.anclada.options[3]).toBe('Todas las anteriores');
    expect(r.anclada.correctIndex).toBe(3);
    expect(r.porLetra.options).toEqual(['x', 'A y B', 'z', 'w']);
  });
});
