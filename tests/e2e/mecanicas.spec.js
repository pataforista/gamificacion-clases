import { test, expect, openTab, pane } from './fixtures';

const sortear = (page) => pane(page).getByRole('button', { name: /Sortear mecánica|Otra mecánica/ }).click();
const nombreActual = async (page) => (await pane(page).getByTestId('resultado').locator('h3').textContent()).trim();

test.describe('Mecánicas (uso privado del docente)', () => {
  test('sortea en texto, sin lienzo ni animación', async ({ page }) => {
    await openTab(page, 'Mecánicas');
    await expect(pane(page).locator('canvas')).toHaveCount(0);
    await sortear(page);
    const res = pane(page).getByTestId('resultado');
    await expect(res).toBeVisible();
    await expect(res.locator('h3')).not.toBeEmpty();
  });

  test('el nivel cambia la consigna y se conserva al recargar', async ({ page }) => {
    await openTab(page, 'Mecánicas');
    await pane(page).getByRole('button', { name: 'Pregrado' }).click();
    await expect(pane(page).getByRole('button', { name: 'Pregrado' })).toHaveAttribute('aria-pressed', 'true');
    await sortear(page);
    // El resultado siempre muestra el tiempo asignado.
    await expect(pane(page).getByTestId('resultado')).toContainText(/\d:\d\d/);
    await page.reload();
    await openTab(page, 'Mecánicas');
    await expect(pane(page).getByRole('button', { name: 'Pregrado' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('12 sorteos seguidos no repiten mecánica', async ({ page }) => {
    await openTab(page, 'Mecánicas');
    const vistos = new Set();
    for (let i = 0; i < 12; i++) {
      await sortear(page);
      vistos.add(await nombreActual(page));
    }
    expect(vistos.size).toBe(12);
  });

  test('desactivar una categoría excluye sus mecánicas', async ({ page }) => {
    await openTab(page, 'Mecánicas');
    await pane(page).locator('summary', { hasText: 'Configuración' }).click();
    await pane(page).getByLabel('Análisis crítico').uncheck();
    await expect(pane(page).getByText('9 mecánica(s) en el sorteo')).toBeVisible();
    const criticas = ['Abogado del Diablo', 'Lo Omitido', 'Teoría vs. Trinchera'];
    for (let i = 0; i < 9; i++) {
      await sortear(page);
      expect(criticas).not.toContain(await nombreActual(page));
    }
  });

  test('sin categorías avisa en vez de fallar', async ({ page }) => {
    await openTab(page, 'Mecánicas');
    await pane(page).locator('summary', { hasText: 'Configuración' }).click();
    for (const c of ['Análisis crítico', 'Traducción y síntesis', 'Simulación y roles', 'Interrogación y debate']) {
      await pane(page).getByLabel(c).uncheck();
    }
    await sortear(page);
    await expect(pane(page).getByText('Activa al menos una categoría')).toBeVisible();
  });

  test('¿Quién?, cronómetro y registro de la sesión', async ({ page }) => {
    await openTab(page, 'Mecánicas');
    await sortear(page);
    await pane(page).getByRole('button', { name: '¿Quién?' }).click();
    await expect(pane(page).getByText(/Participa: /)).toBeVisible();
    await pane(page).getByRole('button', { name: 'Iniciar tiempo' }).click();
    await expect(pane(page).getByTestId('cronometro')).toBeVisible();
    await pane(page).getByRole('button', { name: 'Hecho' }).click();
    await expect(pane(page).getByTestId('resultado')).toHaveCount(0);
    await expect(pane(page).locator('summary', { hasText: 'Registro de la sesión (1)' })).toBeVisible();
  });

  test('un estado guardado malformado se corrige al cargar', async ({ page }) => {
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('quickrand_state') || '{}');
      s.mecanicas = { nivel: 'otro', categorias: 'x', extras: ['zzz'], pensarAntes: 'sí' };
      localStorage.setItem('quickrand_state', JSON.stringify(s));
    });
    await page.reload();
    await openTab(page, 'Mecánicas');
    await expect(pane(page).getByRole('button', { name: 'Posgrado' })).toHaveAttribute('aria-pressed', 'true');
    await sortear(page);
    await expect(pane(page).getByTestId('resultado')).toBeVisible();
  });
});
