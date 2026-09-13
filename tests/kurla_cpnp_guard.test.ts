import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { cpnpEvidenceOf, getCatalogTruth, isCatalogPubliclyListable } from '../src/lib/catalogTruth';

/**
 * Le garde CPNP — il ne peut plus être inerte.
 *
 * Constat mesuré le 13/09/2026 : `catalogTruth.ts` testait `cpnp_ready`, un
 * champ qu'**aucune colonne de `products` ne portait** (vérifié dans
 * `information_schema`) et que **rien n'écrivait** (grep sur `src/` et
 * `supabase/`). `undefined === false` est toujours faux : le blocage ne s'est
 * donc **jamais** déclenché. Un contrôle écrit qui ne peut jamais bloquer est
 * pire qu'un contrôle absent — il donne l'impression d'être couvert.
 *
 * Ce banc verrouille le remplacement. Le garde lit maintenant la preuve réelle
 * dans `supplier_documents` (`document_type = 'cpnp_notification'`), hydraté
 * par `catalogStore.getProducts`.
 *
 * Trois états, **un seul bloque** :
 *   - `notified` : pièce enregistrée, non expirée
 *   - `expired`  : pièce enregistrée mais périmée → **bloque**
 *   - `unknown`  : aucune pièce → **ne bloque pas**
 *
 * `unknown` ne bloque pas, et ce n'est pas une complaisance : un distributeur
 * qui revend des produits déjà mis sur le marché UE ne dépose pas lui-même le
 * CPNP (règl. 1223/2009 art. 4.3). Les 24 marques tierces du catalogue sont
 * dans ce cas. Bloquer sur `unknown` viderait la boutique sans fondement
 * juridique — et la couche `sourcing readiness` signale déjà l'écart
 * (« CPNP+RP+CPSR manquants », `catalogStore.ts`).
 */

const fixture = (extra: Record<string, unknown> = {}) => ({
  id: 'shampoing-hydratant',
  slug: 'shampoing-hydratant',
  name: 'Shampoing hydratant',
  category: 'cheveux',
  subcategory: 'Lavage',
  brand: 'Cantu',
  price: 12.9,
  image_url: 'https://example.com/shampoing.jpg',
  ingredients: ['Aqua', 'Butyrospermum Parkii Butter'],
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
  source_supplier: 'BLACKETIQUE SASU (grossiste, stock France)',
  supplier_id: 'sup-blacketique',
  supplier_sku: '',
  ...extra
});

// ── 1. Le garde n'est plus du code mort ─────────────────────────────────────
const chemin = fileURLToPath(new URL('../src/lib/catalogTruth.ts', import.meta.url));
const source = readFileSync(chemin, 'utf8');
assert.equal(
  /requiresCosmeticCompliance\(product\)\s*&&\s*readCatalogField\(product, 'cpnp_ready'\) === false/.test(source),
  false,
  'REGRESSION : le garde est revenu à sa forme inerte (cpnp_ready seul). '
  + 'Ce champ n’a aucune colonne en base : le blocage ne peut pas se déclencher.'
);
// Le garde doit lire l'ÉTAT de la preuve, pas un booléen sans colonne. On teste
// la fonction de garde elle-même plutôt qu'une forme littérale, pour ne pas
// casser à chaque factorisation — tout en restant sensible au retour du bug.
const blocGarde = source.slice(source.indexOf('function hasCpnpBlock'), source.indexOf('function hasMinimalCatalogProof'));
assert.ok(blocGarde.length > 0, 'la fonction de garde CPNP a disparu du module');
assert.match(blocGarde, /state === 'expired'/,
  'REGRESSION : le garde CPNP ne lit plus l’état de la preuve. Sans cela il ne peut pas bloquer.');
assert.match(blocGarde, /requiresCosmeticCompliance\(product\)/,
  'le garde doit rester réservé aux produits cosmétiques : un accessoire n’est pas concerné');

// ── 2. `unknown` ne bloque pas — sinon la boutique se vide ──────────────────
const sansPreuve = fixture();
assert.equal(cpnpEvidenceOf(sansPreuve).state, 'unknown');
assert.equal(isCatalogPubliclyListable(sansPreuve), true,
  'Aucune pièce CPNP enregistrée ne doit PAS dépublier la fiche : les 24 marques '
  + 'tierces du catalogue sont revendues depuis un stock déjà sur le marché UE, '
  + 'où le CPNP a été déposé par un autre. L’écart est rapporté, pas sanctionné.');
assert.equal(getCatalogTruth(sansPreuve).blockers.some(texte => /CPNP/i.test(texte)), false);

// ── 3. `notified` laisse passer et expose la référence ──────────────────────
const notifie = fixture({ cpnpNotified: true, cpnpReference: 'CPNP-2026-0041872' });
const preuveNotifie = cpnpEvidenceOf(notifie);
assert.equal(preuveNotifie.state, 'notified');
assert.equal(preuveNotifie.reference, 'CPNP-2026-0041872');
assert.equal(isCatalogPubliclyListable(notifie), true);

// ── 4. `expired` BLOQUE — c'est le cœur du correctif ────────────────────────
const perime = fixture({ cpnpNotified: false, cpnpReference: 'CPNP-2019-0003311' });
assert.equal(cpnpEvidenceOf(perime).state, 'expired');
assert.equal(isCatalogPubliclyListable(perime), false,
  'Une notification CPNP expirée est une non-conformité établie PAR UNE PIÈCE. '
  + 'C’est le seul cas où le garde doit bloquer, et c’est celui qui ne fonctionnait jamais.');
const veritePerime = getCatalogTruth(perime);
assert.equal(veritePerime.isPubliclyListable, false);
assert.equal(veritePerime.isCheckoutEligible, false);
assert.equal(veritePerime.proofState, 'incomplete');
assert.equal(veritePerime.blockers.some(texte => /CPNP expirée/.test(texte)), true,
  'le blocage doit être expliqué, pas seulement subi');

// ── 5. La voie historique `cpnp_ready === false` bloque toujours ────────────
assert.equal(isCatalogPubliclyListable(fixture({ cpnp_ready: false })), false,
  'compatibilité : un appelant qui marque explicitement cpnp_ready=false reste bloqué');

// ── 6. Un accessoire n'est jamais concerné par le CPNP ──────────────────────
const accessoire = fixture({ category: 'accessoires', subcategory: 'Outils', cpnpNotified: false });
assert.equal(isCatalogPubliclyListable(accessoire), true,
  'un peigne n’est pas un produit cosmétique : une notification CPNP expirée '
  + 'ne doit pas le dépublier');

// ── 7. Une valeur non booléenne ne fait pas basculer l'état ─────────────────
for (const valeur of ['true', 1, 0, null, undefined, '']) {
  assert.equal(cpnpEvidenceOf(fixture({ cpnpNotified: valeur })).state, 'unknown',
    `cpnpNotified=${JSON.stringify(valeur)} doit rester « unknown », pas devenir une preuve`);
}

// ── 8. Le rapport de vérité expose la preuve ────────────────────────────────
assert.deepEqual(getCatalogTruth(notifie).cpnpEvidence, { state: 'notified', reference: 'CPNP-2026-0041872' });
assert.deepEqual(getCatalogTruth(sansPreuve).cpnpEvidence, { state: 'unknown', reference: null });

console.log('[PASS] Garde CPNP : 8 contrats verrouillés (plus de code mort, unknown ne bloque pas, '
  + 'notified passe avec sa référence, expired bloque et s’explique, cpnp_ready historique conservé, '
  + 'accessoires exclus, valeurs non booléennes ignorées, preuve exposée).');
