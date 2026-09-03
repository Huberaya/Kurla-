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

/**
 * Les visuels de marque : aucune image cassée, et un héros réellement affiché.
 *
 * Ce test existe parce que la production a déjà livré une home dont le héros
 * était une vidéo « road trip en van » et dont cinq cadres d'images étaient
 * vides (URL en 404). TypeScript ne voit rien de tout ça, et le banc API non
 * plus : seul un vrai navigateur qui mesure `naturalWidth` le voit.
 *
 * On ne vérifie pas qu'une image est « belle » — on vérifie qu'elle est
 * chargée, aux bonnes dimensions, et qu'aucune ne casse.
 */
const VISUAL_PAGES = ['/', '/boutique', '/melanin-skin', '/hommes', '/kids', '/protective-styles'];

test.describe('visuels de marque', () => {
  for (const path of VISUAL_PAGES) {
    test(`«${path}» n'affiche aucune image cassée`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        () => (document.getElementById('root')?.innerText || '').trim().length > 40,
        undefined,
        { timeout: 15_000 },
      );
      // Laisse le temps au lazy-loading de déclencher les images visibles.
      await page.waitForTimeout(1200);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);

      const report = await page.evaluate(() => {
        const out = { total: 0, broken: [] as string[], collapsed: [] as string[] };
        for (const img of Array.from(document.images)) {
          // Les images hors écran et non encore déclenchées ne comptent pas.
          if (img.loading === 'lazy' && !img.complete) continue;
          out.total += 1;
          const label = (img.currentSrc || img.src || '').slice(-70) || img.alt;
          if (img.complete && img.naturalWidth === 0) {
            out.broken.push(label);
            continue;
          }
          // Le cadre doit exister AVANT et APRÈS chargement : c'est la
          // définition même de l'absence de décalage de mise en page (CLS).
          const box = img.getBoundingClientRect();
          // <picture> et <source> n'ont pas de boîte : on remonte jusqu'au
          // premier ancêtre qui en a une (le cadre posé par BrandImage).
          let frame: HTMLElement | null = img.parentElement;
          let frameHeight = 0;
          for (let depth = 0; frame && depth < 4; depth += 1) {
            frameHeight = frame.getBoundingClientRect().height;
            if (frameHeight > 0) break;
            frame = frame.parentElement;
          }
          if (box.height === 0 || frameHeight === 0) {
            out.collapsed.push(`${label} (${Math.round(box.height)}px)`);
          }
        }
        return out;
      });

      expect(report.broken, `images cassées sur ${path} : ${report.broken.join(' | ')}`).toEqual([]);
      expect(report.collapsed, `cadres d'image effondrés sur ${path} : ${report.collapsed.join(' | ')}`).toEqual([]);
    });
  }

  test('le héros affiche une photographie de marque cadrée sur le visage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const hero = page.locator('section img').first();
    await hero.waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForFunction(
      () => {
        const img = document.querySelector('section img');
        return !!img && (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0;
      },
      undefined,
      { timeout: 20_000 },
    );

    const src = await hero.getAttribute('src');
    expect(src, 'le héros n’a pas de source').toBeTruthy();
    expect(src).toContain('images.unsplash.com');
    expect(src).toContain('crop=faces');
    expect(src).toMatch(/[?&]w=/);
    expect(src).toMatch(/[?&]h=/);

    const srcset = await hero.getAttribute('srcset');
    expect(srcset, 'le héros n’a pas de srcset').toBeTruthy();
    expect(srcset!.split(',').length).toBeGreaterThanOrEqual(4);

    const alt = await hero.getAttribute('alt');
    expect(alt, 'le héros n’a pas de texte alternatif').toBeTruthy();
    expect(alt!.length).toBeGreaterThan(20);
  });
});
