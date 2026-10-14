import { test as base, expect } from '@playwright/test';

// Cada prueba arranca con:
// - el audio simulado: se registra qué pide reproducir/pausar la app en
//   window.__audio (sin sonido real, que en CI no existe);
// - un registro de errores de página/consola que debe quedar vacío.
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    await page.addInitScript(() => {
      window.__audio = [];
      // `paused` se simula para que la app vea la pista "sonando" y llame a
      // pause() al detenerla, igual que con audio real.
      Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
        configurable: true,
        get() { return !this.__playing; },
      });
      HTMLMediaElement.prototype.play = function () {
        this.__playing = true;
        window.__audio.push('play:' + decodeURIComponent((this.src || '').split('/').pop()));
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {
        this.__playing = false;
        window.__audio.push('pause');
      };
    });
    await page.goto('/');
    await use(page);
    expect(errors, 'errores en la página').toEqual([]);
  },
});

export { expect };

export const openTab = async (page, name) => {
  await page.locator('.tab', { hasText: name }).first().click();
  // El módulo visible es el único .module-pane sin [hidden].
  await expect(page.locator('.module-pane:not([hidden])')).toHaveCount(1);
};

export const pane = (page) => page.locator('.module-pane:not([hidden])');

export const audioLog = (page) => page.evaluate(() => window.__audio.slice());
export const clearAudio = (page) => page.evaluate(() => { window.__audio.length = 0; });
