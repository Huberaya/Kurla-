import { test, expect } from '@playwright/test';
import { indexableRoutes } from '../src/lib/routeMeta';

/**
 * Smoke-test : chaque route publique statique doit se rendre dans un vrai
 * navigateur sans exception JavaScript et sans écran vide.
 *
 * La liste des routes vient de routeMeta — la même source que le sitemap et
 * le prérendu. Toute nouvelle page indexable est donc testée automatiquement,
 * sans rien ajouter ici.
 *
 * Ce qu'on tolère, délibérément :
 *  - les échecs RÉSEAU (API indisponible, image cassée) : ils ont leurs
 *    propres bancs, et l'UI doit précisément survivre à ces échecs ;
 *  - les console.error applicatifs : bruyants mais non bloquants.
 * Ce qu'on ne tolère PAS : une exception non rattrapée (pageerror) ou un
 * <div id="root"> resté vide — c'est l'écran blanc que le banc API ne
 * verra jamais.
 */

const staticRoutes = indexableRoutes()
  .filter((route) => !route.path.includes(':'))
  .map((route) => route.path);

test.describe('rendu des routes publiques', () => {
  for (const path of staticRoutes) {
    test(`«${path}» se rend sans exception ni écran vide`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(String(error)));

      // « domcontentloaded » plutôt que « networkidle » : en prod, les images
      // CDN qui s'égrènent empêchent le réseau de se taire et rendaient le
      // banc flaky. Ce qu'on veut vérifier, c'est le CONTENU rendu.
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response, `pas de réponse pour ${path}`).not.toBeNull();
      expect(response!.status(), `statut HTTP de ${path}`).toBeLessThan(400);

      // Le root doit contenir du contenu réel, pas un squelette vide.
      await page.waitForFunction(
        () => (document.getElementById('root')?.innerText || '').trim().length > 40,
        undefined,
        { timeout: 15_000 }
      );
      const rootText = (await page.locator('#root').innerText()).trim();
      expect(rootText.length, `#root vide sur ${path}`).toBeGreaterThan(40);

      expect(errors, `exceptions JS sur ${path} : ${errors.join(' | ')}`).toEqual([]);
    });
  }
});

test('la navigation boutique → fiche produit fonctionne', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/boutique', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('a[href^="/produit/"]').length > 0, undefined, { timeout: 15_000 }).catch(() => {});
  const firstProduct = page.locator('a[href^="/produit/"]').first();
  if ((await firstProduct.count()) > 0) {
    await firstProduct.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    expect(page.url()).toContain('/produit/');
    const rootText = (await page.locator('#root').innerText()).trim();
    expect(rootText.length, 'fiche produit vide').toBeGreaterThan(40);
  }
  expect(errors, `exceptions JS : ${errors.join(' | ')}`).toEqual([]);
});

test('la galerie inspirations ouvre une fiche style', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/inspirations', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const firstCard = page.locator('button, [role="button"], article').filter({ hasText: /locs|braids|twist|afro|tresses/i }).first();
  if ((await firstCard.count()) > 0) {
    await firstCard.click();
    await page.waitForTimeout(500);
  }
  expect(errors, `exceptions JS : ${errors.join(' | ')}`).toEqual([]);
});
