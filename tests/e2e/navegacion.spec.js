import { test, expect, openTab, pane, audioLog, clearAudio } from './fixtures';

const TABS = ['Clase en vivo', 'Control de flujo', 'Sorteo', 'Equipos', 'Mecánicas', 'Progreso RPG',
  'Examen grupal', 'Trivia', 'Ruleta', 'Bingo', 'Dado', 'Orden por toque', 'Ayuda'];

test('todas las pestañas cargan sin errores', async ({ page }) => {
  for (const name of TABS) {
    await openTab(page, name);
    await expect(pane(page).locator('h2').first()).toBeVisible();
  }
});

test('el selector de tema cambia la clase del documento', async ({ page }) => {
  await page.getByLabel('Tema visual').selectOption('theme-noche');
  await expect(page.locator('body')).toHaveClass(/theme-noche/);
  await page.reload();
  await expect(page.locator('body')).toHaveClass(/theme-noche/);
});

test('Esc cierra un cuadro de diálogo', async ({ page }) => {
  await openTab(page, 'Sorteo');
  await pane(page).getByRole('button', { name: 'Limpiar todo' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  // En una confirmación el foco inicial está en "Cancelar".
  await expect(page.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(pane(page).locator('textarea').first()).not.toHaveValue('');
});

test('cambiar de pestaña no borra el progreso de Bingo ni de Equipos', async ({ page }) => {
  await openTab(page, 'Bingo');
  await pane(page).getByRole('button', { name: /Sacar número/ }).click();
  await expect(pane(page).getByText(/^1 de 30 números sacados/)).toBeVisible();

  await openTab(page, 'Equipos');
  await pane(page).getByRole('button', { name: 'Generar' }).click();
  const before = await pane(page).locator('li').allInnerTexts();

  await openTab(page, 'Ruleta');
  await openTab(page, 'Bingo');
  await expect(pane(page).getByText(/^1 de 30 números sacados/)).toBeVisible();
  await openTab(page, 'Equipos');
  expect(await pane(page).locator('li').allInnerTexts()).toEqual(before);
});

test('el examen conserva la partida, pausa el reloj y no responde con teclas desde otra pestaña', async ({ page }) => {
  await openTab(page, 'Examen grupal');
  await pane(page).locator('input[type=range]').fill('5'); // reloj de 5 s
  await pane(page).getByText('Diseñar examen').click();
  await pane(page).getByText('Añadir Pregunta').click();
  await pane(page).locator('input[placeholder="Escribe la pregunta aquí..."]').nth(1).fill('Segunda');
  await pane(page).getByText('Guardar y Jugar').click();
  for (let i = 0; i < 4; i++) await pane(page).locator('button[aria-pressed]').nth(i).click();
  await pane(page).getByText('¡Comenzar Examen!').click();
  await expect(pane(page).getByText('PREGUNTA AL AIRE')).toBeVisible();

  await clearAudio(page);
  await openTab(page, 'Ruleta');
  expect((await audioLog(page)).includes('pause')).toBeTruthy(); // música apagada
  // Las teclas 1-4 responden el examen sólo cuando está a la vista.
  await page.keyboard.press('3');
  // Con el reloj corriendo, en 7 s se habría agotado el tiempo (5 s).
  await page.waitForTimeout(7000);

  await openTab(page, 'Examen grupal');
  await expect(pane(page).getByText('PREGUNTA AL AIRE')).toBeVisible();
  await expect(pane(page).getByText('Pregunta 1 / 2')).toBeVisible();
  await expect(pane(page).locator('.exam-option:disabled')).toHaveCount(0);
  expect((await audioLog(page)).some(x => x.startsWith('play:'))).toBeTruthy(); // vuelve la música
});
