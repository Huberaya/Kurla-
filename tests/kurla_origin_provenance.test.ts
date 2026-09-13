import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { getCatalogTruth, isCatalogPubliclyListable, originProvenanceOf } from '../src/lib/catalogTruth';

/**
 * Provenance du pays d'origine — l'inconnu est explicite, jamais inventé.
 *
 * Constat mesuré le 13/09/2026 (SQL direct, projet `qzwgsarfdegqtfdnqiql`) :
 * `origin_country` est NULL sur les **96 fiches**, dont les 63 publiées, alors
 * que le champ est affiché au public dans `ProductDetailPage`. Aucune valeur
 * n'a été inventée pour combler le vide : on a rendu le vide lisible.
 *
 * Ce banc verrouille trois décisions, dont la première est une décision de
 * NE PAS faire :
 *
 *  1. **La provenance ne barre pas la publication.** `origin_country_status`
 *     n'est volontairement PAS dans `VERIFIED_FIELDS`. Ce tableau alimente
 *     `hasPendingEvidence` → `hasMinimalCatalogProof` → `isCatalogPubliclyListable`.
 *     L'y ajouter dépublierait les 63 fiches d'un coup — pour un champ qui
 *     n'est pas une obligation d'un distributeur revendant des produits déjà
 *     mis sur le marché UE (règl. 1223/2009 art. 2e).
 *
 *  2. **Un fait non sourcé n'est jamais marqué vérifié.** `verified` sans pièce
 *     retombe en `declared`. La base l'impose aussi (contrainte
 *     `products_origin_verified_requires_source`, testée par contrôle négatif
 *     le 13/09/2026 : violation 23514).
 *
 *  3. **On ne déduit jamais un pays de la nationalité d'une marque.** Un soin
 *     Cantu ou Mielle vient d'une marque américaine ; son lieu de fabrication
 *     se lit sur l'étiquette ou dans le PIF, pas sur le siège de la marque.
 */

const fixture = (extra: Record<string, unknown> = {}) => ({
  id: 'peigne-afro-metal',
  slug: 'peigne-afro-metal',
  name: 'Peigne afro métal (fro pick)',
  category: 'accessoires',
  brand: 'KURLA',
  price: 4.9,
  image_url: 'https://example.com/peigne.jpg',
  ingredients: ['Acier inoxydable'],
  country_availability: ['FR', 'BE'],
  is_active: true,
  catalog_status: 'published',
  is_preorder: true,
  badges: [],
  ingredient_verification_status: 'verified',
  claims_validation_status: 'verified',
  images_validation_status: 'verified',
  stock_validation_status: 'verified',
  certifications_validation_status: 'verified',
  translations_validation_status: 'verified',
  brand_verification_status: 'verified',
  image_ownership_status: 'licensed',
  source_supplier: 'Distristar (grossiste marques afro US, Bobigny) — achat-revente',
  supplier_id: 'sup-distristar',
  supplier_sku: '',
  ...extra
});

// ── 1. L'inconnu ne bloque rien ─────────────────────────────────────────────
const sansOrigine = fixture();
const provenanceVide = originProvenanceOf(sansOrigine);
assert.equal(provenanceVide.country, null, 'pays inconnu → null, pas une chaîne vide ni un pays deviné');
assert.equal(provenanceVide.status, 'not_provided', 'absence de statut → not_provided, jamais un faux verified');

assert.equal(isCatalogPubliclyListable(sansOrigine), true,
  'DÉCISION : un pays d’origine inconnu ne doit PAS dépublier la fiche. '
  + 'Les 63 produits publiés ont tous origin_country NULL ; bloquer ici viderait la boutique '
  + 'pour un champ qui n’est pas exigé d’un distributeur (règl. 1223/2009 art. 2e).');

const veriteVide = getCatalogTruth(sansOrigine);
assert.deepEqual(veriteVide.originProvenance, { country: null, status: 'not_provided', source: null },
  'le rapport de vérité expose l’écart au lieu de le masquer');
assert.equal(veriteVide.isPubliclyListable, true);
assert.equal(veriteVide.blockers.some(texte => /origine/i.test(texte)), false,
  'la provenance ne doit jamais entrer dans `blockers` : c’est un écart de sourcing, pas une faute de conformité');

// ── 2. Garde statique : le champ n'a pas été ajouté au tableau bloquant ─────
const cheminVerite = fileURLToPath(new URL('../src/lib/catalogTruth.ts', import.meta.url));
const source = readFileSync(cheminVerite, 'utf8');
const blocVerifies = source.slice(source.indexOf('const VERIFIED_FIELDS'), source.indexOf('] as const'));
assert.equal(blocVerifies.includes('origin_country_status'), false,
  'REGRESSION : origin_country_status a été ajouté à VERIFIED_FIELDS. '
  + 'Cela rend le pays d’origine bloquant et dépublie les 63 fiches. Voir l’en-tête de ce banc.');
assert.equal(blocVerifies.includes('origin_country'), false,
  'REGRESSION : aucun champ origin_country ne doit figurer dans VERIFIED_FIELDS');

// ── 3. Un fait non sourcé n'est jamais « vérifié » ──────────────────────────
const verifiedSansSource = originProvenanceOf(fixture({
  origin_country: 'États-Unis',
  origin_country_status: 'verified',
  origin_country_source: '   '
}));
assert.equal(verifiedSansSource.status, 'declared',
  '`verified` sans pièce qui le source retombe en `declared` : on sous-déclare la confiance '
  + 'plutôt que de laisser passer un fait non tracé');
assert.equal(verifiedSansSource.country, 'États-Unis', 'le pays déclaré est conservé, seul le niveau de confiance baisse');
assert.equal(verifiedSansSource.source, null, 'une source blanche n’est pas une source');

const verifiedSourcé = originProvenanceOf(fixture({
  origin_country: 'France',
  origin_country_status: 'verified',
  origin_country_source: 'étiquette du lot 2026-04 + PIF fournisseur'
}));
assert.equal(verifiedSourcé.status, 'verified', 'un fait sourcé reste vérifié');
assert.equal(verifiedSourcé.source, 'étiquette du lot 2026-04 + PIF fournisseur');

// ── 4. Un statut inconnu ne passe pas ───────────────────────────────────────
for (const statutBidon of ['vérifié', 'VERIFIED', 'ok', 42, null, undefined]) {
  const lu = originProvenanceOf(fixture({ origin_country_status: statutBidon }));
  assert.equal(lu.status, 'not_provided',
    `statut non reconnu (${JSON.stringify(statutBidon)}) → not_provided, aligné sur la contrainte de base`);
}

// ── 5. La chaîne déclarée → vérifiée est lisible de bout en bout ────────────
const declaree = getCatalogTruth(fixture({ origin_country: 'Chine', origin_country_status: 'declared' }));
assert.equal(declaree.originProvenance.status, 'declared');
assert.equal(declaree.isPubliclyListable, true,
  'une origine simplement déclarée reste publiable : le niveau de confiance est affiché, pas sanctionné');

const verifiee = getCatalogTruth(fixture({
  origin_country: 'Chine',
  origin_country_status: 'verified',
  origin_country_source: 'certificat d’origine du transitaire, dossier 2026-09'
}));
assert.equal(verifiee.originProvenance.status, 'verified');
assert.equal(verifiee.originProvenance.country, 'Chine');

console.log('[PASS] Provenance du pays d’origine : 5 contrats verrouillés '
  + '(l’inconnu ne bloque pas, VERIFIED_FIELDS intact, verified exige une source, '
  + 'statut inconnu rejeté, chaîne declared→verified lisible).');
