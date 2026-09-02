import { defineConfig } from '@playwright/test';

/**
 * SMOKE-TEST UI — chantier P1 de l'audit du 2026-09-02.
 *
 * Le banc `npm test` ne couvre que le serveur et l'API : un écran React qui
 * lève une exception au rendu est invisible pour lui. Ce banc ouvre chaque
 * route publique statique dans un vrai Chromium et échoue à la moindre
 * exception JavaScript ou au moindre écran vide.
 *
 * Cible par défaut : le serveur de build local (`node dist/server.cjs`) en
 * mode mémoire — l'API répond, rien n'est écrit en base. Pour vérifier la
 * prod : `SMOKE_BASE_URL=https://kurlabeauty.vercel.app npm run test:smoke`.
 *
 * Prérequis local : `npm run build` puis navigateurs Playwright installés
 * (`npx playwright install chromium`).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  workers: 4,
  reporter: [['list']],
  use: {
    baseURL: process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3999',
    viewport: { width: 390, height: 844 }, // mobile d'abord, comme le trafic réel
  },
  webServer: process.env.SMOKE_BASE_URL
    ? undefined
    : {
        command: 'node dist/server.cjs',
        url: 'http://127.0.0.1:3999',
        env: { PORT: '3999', KURLA_STORE_MODE: 'memory' },
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
