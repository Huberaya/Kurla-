/**
 * CHANTIER « RAYONS VIDES » — le rayon demandé ne doit plus se perdre en route.
 *
 * Deux défauts réels, constatés en production le 2026-09-03 :
 *
 *  1. Quatre liens internes pointaient vers `/boutique?category=…` alors que la
 *     page lit `?cat=`. Le paramètre était ignoré sans erreur : la visiteuse qui
 *     cliquait « voir les accessoires » depuis /outils, ou « découvrir les
 *     soins peau » depuis /melanin-skin, atterrissait sur les 64 produits non
 *     filtrés. L'un de ces liens utilisait même `?category=skincare`, une valeur
 *     qui n'a jamais existé dans le catalogue.
 *
 *  2. Trois rayons — peau, hommes, enfants — sont annoncés par la home et par
 *     une page marketing complète, sans qu'aucun produit n'y soit publié. La
 *     home affichait « Disponible en précommande » sur la carte grooming :
 *     c'était faux, il y a zéro produit hommes.
 *
 * Ce banc verrouille les deux : le paramètre d'URL est unique et validé, et
 * tout rayon annoncé doit soit avoir des produits, soit assumer l'attente.
 */
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEFAULT_SHOP_CATEGORY,
  EMPTY_SHOP_CATEGORIES,
  SHOP_CATEGORIES,
  SHOP_CATEGORY_PARAM,
  SHOP_CATEGORY_PARAM_ALIAS,
  isShopCategory,
  normalizeWaitlistSource,
  readShopCategory,
  shopCategoryHref,
  waitlistSourceForCategory,
  DEFAULT_WAITLIST_SOURCE,
  WAITLIST_SOURCES
} from '../src/lib/shopCategories';

/** Tous les fichiers source TypeScript/TSX de `src/`, parcourus une seule fois. */
const files: string[] = [];
{
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(full)) files.push(full);
    }
  };
  walk(join(process.cwd(), 'src'));
}

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

// ——— 1. Lecture du paramètre d'URL ———
{
  assert.equal(readShopCategory(new URLSearchParams('cat=kits')), 'kits');
  assert.equal(readShopCategory('?cat=accessoires'), 'accessoires');
  // L'alias reste accepté : des liens ?category= ont déjà été partagés.
  assert.equal(readShopCategory('?category=kits'), 'kits', 'l’alias ?category= doit encore être lu');
  // Valeur inconnue → « tous », jamais un rayon vide silencieux.
  assert.equal(readShopCategory('?cat=skincare'), DEFAULT_SHOP_CATEGORY);
  assert.equal(readShopCategory('?cat='), DEFAULT_SHOP_CATEGORY);
  assert.equal(readShopCategory(''), DEFAULT_SHOP_CATEGORY);
  assert.equal(readShopCategory('?cat=<script>'), DEFAULT_SHOP_CATEGORY);
  // Le paramètre canonique prime sur l'alias.
  assert.equal(readShopCategory('?cat=peau&category=kits'), 'peau');
  ok('paramètre de rayon : canonique, alias toléré, valeur inconnue ramenée à « tous »');
}

// ——— 2. Construction des liens ———
{
  assert.equal(shopCategoryHref('tous'), '/boutique', '« tous » ne doit pas traîner de paramètre');
  for (const category of SHOP_CATEGORIES) {
    if (category === 'tous') continue;
    const href = shopCategoryHref(category);
    assert.ok(href.startsWith('/boutique?'), href);
    assert.ok(href.includes(`${SHOP_CATEGORY_PARAM}=`), href);
    assert.equal(readShopCategory(href.slice(href.indexOf('?'))), category, `aller-retour cassé pour ${category}`);
  }
  assert.equal(new Set(SHOP_CATEGORIES).size, SHOP_CATEGORIES.length, 'catégorie déclarée deux fois');
  assert.equal(SHOP_CATEGORY_PARAM, 'cat');
  assert.equal(SHOP_CATEGORY_PARAM_ALIAS, 'category');
  assert.ok(isShopCategory('peau') && !isShopCategory('skincare'));
  ok(`${SHOP_CATEGORIES.length} catégories déclarées, liens construits et relus sans perte`);
}

// ——— 3. Sources de liste d'attente ———
{
  for (const source of WAITLIST_SOURCES) {
    assert.equal(normalizeWaitlistSource(source), source);
  }
  assert.equal(normalizeWaitlistSource('categorie_cheveux'), DEFAULT_WAITLIST_SOURCE, 'un rayon non vide n’a pas de source d’attente');
  assert.equal(normalizeWaitlistSource(''), DEFAULT_WAITLIST_SOURCE);
  assert.equal(normalizeWaitlistSource(undefined), DEFAULT_WAITLIST_SOURCE);
  assert.equal(normalizeWaitlistSource({ malicious: true }), DEFAULT_WAITLIST_SOURCE);
  assert.equal(normalizeWaitlistSource('  categorie_peau  '), 'categorie_peau', 'les espaces sont ignorés');
  assert.equal(normalizeWaitlistSource('CATEGORIE_PEAU'), DEFAULT_WAITLIST_SOURCE, 'la liste est fermée, pas insensible à la casse');

  // Chaque source que l'interface peut produire doit être acceptée par le serveur.
  for (const category of EMPTY_SHOP_CATEGORIES) {
    const source = waitlistSourceForCategory(category);
    assert.ok(source, `rayon vide sans source d'attente : ${category}`);
    assert.ok(WAITLIST_SOURCES.includes(source!), `source non acceptée par le serveur : ${source}`);
    assert.equal(normalizeWaitlistSource(source), source);
  }
  for (const category of SHOP_CATEGORIES) {
    if (EMPTY_SHOP_CATEGORIES.includes(category)) continue;
    assert.equal(waitlistSourceForCategory(category), null, `${category} n’est pas un rayon vide`);
  }
  ok(`${WAITLIST_SOURCES.length} sources d'attente fermées, cohérentes avec les rayons vides`);
}

// ——— 4. Aucun lien interne ne doit employer le mauvais paramètre ———
{
  const badParam: string[] = [];
  const badValue: string[] = [];
  let boutiqueLinks = 0;

  /**
   * Les commentaires sont retirés avant le balayage : ce chantier documente
   * l'ancien lien défectueux (`?category=skincare`) dans les en-têtes de
   * `shopCategories.ts` et `CategoryWaitlist.tsx`, et un commentaire ne doit
   * pas être compté comme un lien produit.
   */
  const stripComments = (text: string): string =>
    text
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1 ');

  for (const file of files) {
    const text = stripComments(readFileSync(file, 'utf-8'));
    // Un lien codé en dur ne doit jamais employer l'alias : il est toléré en
    // lecture pour les liens déjà partagés, pas produit par le code.
    const aliasLinks = text.match(/\/boutique\?category=/g);
    if (aliasLinks) badParam.push(`${file.replace(process.cwd(), '.')} (${aliasLinks.length})`);

    for (const match of text.matchAll(/\/boutique\?(?:cat|category)=([A-Za-z0-9_-]+)/g)) {
      boutiqueLinks += 1;
      if (!isShopCategory(match[1])) badValue.push(`${file.replace(process.cwd(), '.')} → ${match[1]}`);
    }
  }

  assert.deepEqual(badParam, [], `liens internes avec le mauvais paramètre : ${badParam.join(', ')}`);
  assert.deepEqual(badValue, [], `liens vers un rayon inexistant : ${badValue.join(', ')}`);
  assert.ok(boutiqueLinks > 0, 'aucun lien de rayon trouvé : le balayage est cassé');
  ok(`${boutiqueLinks} lien(s) de rayon vérifiés : bon paramètre, rayon déclaré`);
}

// ——— 5. Les rayons annoncés sont pris en charge ———
{
  const boutique = readFileSync(join(process.cwd(), 'src', 'pages', 'BoutiquePage.tsx'), 'utf-8');
  const hubStart = boutique.indexOf('EMPTY_CATEGORY_HUB');
  assert.ok(hubStart > 0, 'EMPTY_CATEGORY_HUB a disparu de BoutiquePage');

  for (const category of EMPTY_SHOP_CATEGORIES) {
    assert.ok(
      new RegExp(`\\n\\s{2}${category}:\\s*\\{`).test(boutique.slice(hubStart)),
      `rayon vide sans hub d'attente dans BoutiquePage : ${category}`
    );
  }

  // La lecture du paramètre doit passer par le helper, pas par un get() brut
  // qu'un correctif local réintroduirait.
  assert.ok(
    boutique.includes('readShopCategory('),
    'BoutiquePage ne lit plus le rayon via readShopCategory — le paramètre risque de se reperdre'
  );
  assert.doesNotMatch(
    boutique,
    /\.get\('cat'\)/,
    'lecture directe de « cat » dans BoutiquePage : passer par readShopCategory'
  );

  // Chaque rayon vide affiché doit proposer la capture d'intention.
  assert.ok(boutique.includes('CategoryWaitlist'), 'le hub de rayon vide n’affiche plus d’alerte');

  for (const page of ['MelaninSkinPage', 'MenGroomingPage', 'KidsModulePage']) {
    const source = readFileSync(join(process.cwd(), 'src', 'pages', `${page}.tsx`), 'utf-8');
    assert.ok(
      source.includes('CategoryWaitlist'),
      `${page} met en avant une audience sans proposer d'alerte d'arrivée`
    );
    assert.ok(
      /categorie_(peau|hommes|enfants)/.test(source),
      `${page} : source d'attente non identifiable`
    );
  }
  ok('rayons vides : hub + alerte sur la boutique et les trois pages d’audience');

  // ——— 6. Les libellés d'alerte ne portent pas d'article ———
  //
  // Le composant écrit « dès que les {label} seront disponibles ». Un libellé
  // commençant par un article donnait « les premiers produits les produits
  // grooming seront disponibles » — une phrase cassée, en production, sur la
  // page la plus visible du parcours. Le libellé est donc un groupe nominal nu.
  const withArticle: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf-8');
    for (const match of text.matchAll(/(?:waitlistLabel|label)="([^"]+)"/g)) {
      if (/^(le|la|les|l'|l’|un|une|des|du|de la)\s/i.test(match[1])) {
        withArticle.push(`${file.replace(process.cwd(), '.')} → « ${match[1]} »`);
      }
    }
    for (const match of text.matchAll(/waitlistLabel:\s*'([^']+)'/g)) {
      if (/^(le|la|les|l'|l’|un|une|des|du|de la)\s/i.test(match[1])) {
        withArticle.push(`${file.replace(process.cwd(), '.')} → « ${match[1]} »`);
      }
    }
  }
  assert.deepEqual(
    withArticle,
    [],
    `libellé d'alerte commençant par un article (la phrase fournit déjà l'article) : ${withArticle.join(' ; ')}`
  );
  ok('libellés d’alerte sans article : la phrase reste grammaticale');
}

console.log(`\nCHANTIER RAYONS VIDES — ${checks} contrôles passés.\n`);
