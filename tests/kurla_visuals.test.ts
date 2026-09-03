/**
 * CHANTIER VISUELS — garde-fous de la banque d'images de marque.
 *
 * Le défaut réel couvert ici n'est pas théorique : avant ce chantier, la page
 * d'accueil affichait une vidéo « road trip en van » en plein écran et cinq
 * visuels décoraient le site avec des URL mortes (404). Ces deux régressions
 * étaient invisibles pour TypeScript et pour les tests d'API.
 *
 * Ce test verrouille donc quatre choses :
 *
 * 1. Aucun composant n'a le droit d'écrire une URL image en dur : sinon on
 *    reparte vers des visuels non vérifiés et cassables sans alerte.
 * 2. Chaque visuel de la banque porte un texte alternatif français réel, un
 *    crédit photographe et un LQIP. Un visuel sans alt est un visuel invisible
 *    pour les lecteurs d'écran et pour Google Images.
 * 3. L'URL générée impose un ratio (w ET h) et un cadrage sur le visage : c'est
 *    ce qui garantit zéro décalage de mise en page et un sujet jamais coupé.
 * 4. Le héros pointe bien vers la banque, pas vers une URL externe quelconque.
 */
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { BRAND_IMAGES } from '../src/data/brandImages';
import { brandImageSrc, brandImageSrcSet } from '../src/components/BrandImage';
import { TEXTURE_GALLERY, HERO_IMAGE } from '../src/data/images';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(full)) out.push(full);
  }
  return out;
}

// ——— 1. Aucune URL d'image codée en dur dans le code d'interface ———
{
  const files = walk(join(process.cwd(), 'src'));
  const offenders: string[] = [];
  for (const file of files) {
    // BrandImage.tsx construit les URL : c'est le seul endroit autorisé.
    if (file.endsWith('BrandImage.tsx')) continue;
    const src = readFileSync(file, 'utf-8');
    src.split('\n').forEach((line, i) => {
      if (/https?:\/\/(images\.unsplash\.com|assets\.mixkit\.co|plus\.unsplash\.com)/.test(line)) {
        offenders.push(`${file.replace(process.cwd(), '.')}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `URL d'image codée en dur — passer par BrandImage + BRAND_IMAGES :\n  ${offenders.join('\n  ')}`,
  );
  ok(`${files.length} fichiers d'interface scannés : 0 URL d'image en dur`);
}

// ——— 2. Chaque visuel est documenté, crédité et doté d'un LQIP ———
{
  const entries = Object.entries(BRAND_IMAGES) as Array<[string, any]>;
  assert.ok(entries.length >= 15, `Banque trop réduite : ${entries.length} visuels`);

  for (const [key, img] of entries) {
    assert.equal(typeof img.photoId, 'string', `${key} : photoId manquant`);
    assert.match(img.photoId, /^photo-[0-9]{10,14}-[0-9a-z]{10,14}$/, `${key} : photoId invalide`);

    assert.ok(img.alt && img.alt.length >= 20, `${key} : texte alternatif français absent ou trop court`);
    assert.ok(img.altEn && img.altEn.length >= 15, `${key} : texte alternatif anglais absent`);
    assert.notEqual(img.alt, img.altEn, `${key} : l'alt FR est identique à l'alt EN`);

    assert.ok(img.credit?.author, `${key} : photographe non crédité`);
    assert.match(img.credit.url, /^https:\/\//, `${key} : URL de crédit invalide`);

    assert.match(img.color, /^#[0-9A-F]{6}$/, `${key} : couleur dominante invalide`);
    assert.ok(img.lqip.startsWith('data:image/jpeg;base64,'), `${key} : LQIP absent`);
    assert.ok(img.lqip.length < 4000, `${key} : LQIP trop lourd (${img.lqip.length} caractères)`);

    assert.ok(img.ratio > 0.3 && img.ratio < 4, `${key} : ratio source aberrant`);
    assert.ok(['deep', 'dark', 'texture'].includes(img.tone), `${key} : tonalité non conforme (${img.tone})`);
  }

  const ids = entries.map(([, i]) => i.photoId);
  assert.equal(new Set(ids).size, ids.length, 'Deux visuels partagent la même photo source');

  ok(`${entries.length} visuels : alt FR/EN, crédit, couleur, LQIP et tonalité conformes`);
}

// ——— 3. L'URL générée impose le ratio et le cadrage visage ———
{
  const img = (BRAND_IMAGES as any).afroPortrait;
  const url = brandImageSrc(img, 800, 4 / 5);
  assert.match(url, /^https:\/\/images\.unsplash\.com\/photo-/, 'URL non construite sur le CDN Unsplash');
  assert.ok(url.includes('w=800'), 'largeur absente de l’URL');
  assert.ok(url.includes('h=1000'), 'hauteur absente : le ratio ne serait pas imposé');
  assert.ok(url.includes('fit=crop'), 'fit=crop absent : l’image serait déformée');
  assert.ok(url.includes('crop=faces'), 'crop=faces absent : le sujet pourrait être coupé');
  assert.ok(url.includes('auto=format'), 'auto=format absent : pas de WebP/AVIF');

  const srcset = brandImageSrcSet(img, 4 / 5);
  assert.ok(srcset.split(',').length >= 4, 'srcset trop pauvre pour être utile');
  assert.ok(/ 2000w$/.test(srcset.trim()), 'srcset sans grand format');

  ok('URL : ratio imposé (w+h), crop=faces, auto=format, srcset 400→2000');
}

// ——— 4. Le héros et la galerie de textures viennent bien de la banque ———
{
  const ids = new Set(Object.values(BRAND_IMAGES as Record<string, any>).map((i: any) => i.photoId));
  assert.ok(ids.has(HERO_IMAGE.photoId), 'Le héros n’utilise pas un visuel de la banque');
  ok('héros rattaché à la banque de marque');

  assert.equal(TEXTURE_GALLERY.length, 8, 'La galerie de textures doit comporter 8 entrées');
  for (const item of TEXTURE_GALLERY) {
    assert.ok(ids.has(item.image.photoId), `Galerie : « ${item.title} » hors banque`);
    assert.ok(item.image.alt.length >= 20, `Galerie : « ${item.title} » sans alt exploitable`);
  }
  const galleryIds = TEXTURE_GALLERY.map((i) => i.image.photoId);
  assert.equal(new Set(galleryIds).size, galleryIds.length, 'Galerie : deux cartes partagent la même photo');
  ok('galerie de textures : 8 visuels distincts, tous issus de la banque');
}

// ——— 5. Aucune image locale dans src/ : tout passe par la banque ———
// Une image stockée dans le dépôt est une image qu'on ne peut pas vérifier,
// qu'on ne peut pas recadrer côté CDN et qui alourdit le clone. On a déjà
// retrouvé 11 Mo de visuels générés, importés puis abandonnés : ce garde-fou
// empêche que ça recommence.
{
  const dir = join(process.cwd(), 'src', 'assets');
  const found: string[] = [];
  if (existsSync(dir)) {
    const stack = [dir];
    while (stack.length) {
      const current = stack.pop()!;
      for (const entry of readdirSync(current)) {
        const full = join(current, entry);
        if (statSync(full).isDirectory()) stack.push(full);
        else if (/\.(jpe?g|png|webp|avif|gif|svg)$/i.test(full)) found.push(full.replace(process.cwd(), '.'));
      }
    }
  }
  assert.deepEqual(found, [], `Images locales dans src/ : ${found.join(', ')}`);
  ok('src/ ne contient aucune image locale : 100% des visuels passent par la banque');
}

console.log(`\nCHANTIER VISUELS — ${checks} contrôles passés.\n`);
