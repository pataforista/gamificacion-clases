import { test, expect, openTab, pane, audioLog, clearAudio } from './fixtures';

test.describe('Clase en vivo', () => {
  test('código rojo inicia la música una sola vez', async ({ page }) => {
    await clearAudio(page);
    await pane(page).getByRole('button', { name: '15 s' }).click();
    await page.waitForTimeout(1500);
    const log = await audioLog(page);
    expect(log.filter(x => x.startsWith('play:musica-pensando')).length).toBe(1);
    await page.getByText('Cerrar Temporizador').click();
  });

  test('sorteo rápido y dados rápidos', async ({ page }) => {
    await pane(page).getByRole('button', { name: /Sortear ahora/ }).click();
    await expect(pane(page).locator('.win-text')).toBeVisible({ timeout: 5000 });
    await pane(page).getByRole('button', { name: 'd20', exact: true }).click();
    await expect(pane(page).locator('.card', { hasText: 'Dados rápidos' })).toContainText('1d20');
  });
});

test.describe('Sorteo', () => {
  test('se puede escribir la lista con Enter, guardarla, limpiarla y cargarla', async ({ page }) => {
    await openTab(page, 'Sorteo');
    const ta = pane(page).locator('textarea').first();
    await ta.fill('Ana');
    await ta.press('End');
    await ta.press('Enter');
    await expect(ta).toHaveValue('Ana\n');
    await ta.pressSequentially('Luis');
    await ta.press('Enter');
    await ta.pressSequentially('Eva');
    await expect(ta).toHaveValue('Ana\nLuis\nEva');

    await pane(page).getByText('Elegir alumno').click();
    await expect(pane(page).locator('.out').first()).toHaveText(/Ana|Luis|Eva/);

    await pane(page).locator('input[placeholder^="Nombre de la lista"]').fill('2A');
    await pane(page).getByRole('button', { name: 'Guardar actual' }).click();
    await expect(pane(page).getByText('3 alumno(s)')).toBeVisible();

    await pane(page).getByRole('button', { name: 'Limpiar todo' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(ta).toHaveValue('');

    await pane(page).getByRole('button', { name: 'Cargar', exact: true }).click();
    await expect(ta).toHaveValue('Ana\nLuis\nEva');
  });
});

test.describe('Equipos', () => {
  test('genera equipos y limita la cantidad a 10', async ({ page }) => {
    await openTab(page, 'Equipos');
    await pane(page).getByRole('button', { name: 'Generar' }).click();
    await expect(pane(page).getByText(/^Equipo [12]$/)).toHaveCount(2);
    await pane(page).locator('input[type=number]').fill('99');
    await expect(pane(page).locator('input[type=number]')).toHaveValue('10');
  });
});

test.describe('Control de flujo', () => {
  test('la música del código rojo no entra en bucle y se apaga al cerrar', async ({ page }) => {
    await openTab(page, 'Control de flujo');
    await pane(page).getByRole('button', { name: 'Apagada' }).click();
    await clearAudio(page);
    await pane(page).getByRole('button', { name: 'Iniciar', exact: true }).click();
    await page.waitForTimeout(1500);
    let log = await audioLog(page);
    expect(log.filter(x => x.startsWith('play:musica')).length).toBe(1);
    expect(log.length).toBeLessThan(6);

    await clearAudio(page);
    await page.getByText('Cerrar Temporizador').click();
    await page.waitForTimeout(800);
    log = await audioLog(page);
    expect(log.some(x => x.startsWith('play:musica'))).toBeFalsy();

    await pane(page).getByText('Asignar Líder').click();
    await expect(pane(page).locator('.card', { hasText: 'Líder del día' }).locator('.out')).not.toHaveText('Sin asignar');
  });
});
