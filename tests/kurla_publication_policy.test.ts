/**
 * MODE STRICT — politique de publication (chantier C3, lot 1).
 *
 * La politique est une ligne unique persistée (`publication_policy`), OFF par
 * défaut, armée par un acte explicite daté et nommé. Contrats :
 *   - table ABSENTE (DDL non appliqué) = état nommé, pas une erreur :
 *     `available: false` + raison, et l'armement est refusé (fail-closed) —
 *     on ne peut pas armer un interrupteur dont on ne peut pas lire l'état ;
 *   - armement : `activated_at`/`activated_by` se posent sur le passage à
 *     true (l'historique du dernier armement survit au désarmement) ;
 *   - mode strict ARMÉ : la liste publique ne sert que les fiches dont la
 *     publication-readiness est au vert — les fiches test publiées (le cas
 *     réel « visible mais non conforme ») en sortent, sans être déspubliées ;
 *   - mode strict DÉSARMÉ (état par défaut) : comportement d'avant, à
 *     l'identique — aucune fiche de moins, aucune de plus ;
 *   - le filtre s'applique à la liste ET aux devis de kits (une fiche masquée
 *     de la boutique ne doit pas être vendue dans un kit).
 */
import assert from 'node:assert/strict';
import { serverDb } from '../src/lib/serverDb';
import { readPublicationPolicy, setPublicationPolicy, POLICY_TABLE_MISSING_REASON } from '../src/lib/db/publicationPolicyStore';
import { resetStrictModeCache } from '../src/lib/db/catalogStore';

const CONFORME = 'p-conforme';
const FICHE_TEST = 'p-test-visible';

function produitConforme() {
  return {
    id: CONFORME, slug: 'conforme', title: 'Fiche conforme',
    is_active: true, catalog_status: 'published',
    ingredient_verification_status: 'verified',
    claims_validation_status: 'verified',
    images_validation_status: 'verified',
    stock_validation_status: 'verified',
    certifications_validation_status: 'verified',
    translations_validation_status: 'verified',
    brand_verification_status: 'verified',
    image_ownership_status: 'brand_provided',
    brand: 'KURLA Botanicals',
    ingredients: ['Glycerin', 'Niacinamide'],
    image: 'https://images.example.org/conforme.jpg',
    country_availability: ['FR', 'BE'],
    price: 18.9
  };
}

/** Fiche test publiée : VISIBLE en boutique (porte test séparée) mais NON
 *  CONFORME (vérifications non fournies) — exactement le cas laissé en
 *  boutique pour tester, que le mode strict doit pouvoir masquer. */
function ficheTest() {
  return {
    id: FICHE_TEST, slug: 'fiche-test', title: 'Fiche test non conforme',
    is_active: true, catalog_status: 'published',
    is_test_listing: true,
    ingredient_verification_status: 'not_provided',
    claims_validation_status: 'not_provided',
    images_validation_status: 'pending',
    stock_validation_status: 'not_provided',
    certifications_validation_status: 'not_provided',
    translations_validation_status: 'not_provided',
    brand_verification_status: 'unverified',
    image_ownership_status: 'unverified',
    brand: 'Marque Candidat',
    ingredients: [],
    image: 'https://images.example.org/test.jpg',
    country_availability: [],
    price: 0
  };
}

async function runPublicationPolicyTests(): Promise<void> {
  const ACTOR = { id: 'admin-1', email: 'acheteur@kurla.test' };

  // -------------------------------------------------------------------
  // 1. Table absente (DDL non appliqué) : état nommé, armement refusé.
  // -------------------------------------------------------------------
  serverDb.inMemoryProducts = [produitConforme(), ficheTest()] as never[];
  serverDb.inMemoryPublicationPolicy = null;
  resetStrictModeCache();

  const absent = await readPublicationPolicy(serverDb);
  assert.equal(absent.available, false, 'table absente = état non mesurable, pas une erreur');
  assert.equal(absent.strictMode, false, 'repli OFF (fail-closed)');
  assert.match(absent.reason || '', /publication_policy absente/);
  assert.equal(absent.reason, POLICY_TABLE_MISSING_REASON);

  const refuse = await setPublicationPolicy(serverDb, { strictMode: true }, ACTOR);
  assert.equal(refuse.ok, false, 'on n’arme pas un interrupteur dont on ne peut pas lire l’état');
  assert.match(refuse.reason || '', /publication_policy absente/);
  console.log('✓ table absente : état nommé (raison complète), armement refusé, repli OFF');

  // -------------------------------------------------------------------
  // 2. Politique lisible, OFF par défaut : zéro changement de comportement.
  // -------------------------------------------------------------------
  const now = new Date().toISOString();
  serverDb.inMemoryPublicationPolicy = { id: 1, strict_mode: false, activated_at: null, activated_by: null, note: null, updated_at: now };
  resetStrictModeCache();

  const off = await readPublicationPolicy(serverDb);
  assert.equal(off.available, true);
  assert.equal(off.strictMode, false);
  assert.equal(off.activatedAt, null, 'jamais armé = aucune date inventée');

  const listOff = await serverDb.getPublicProducts({ testListings: true });
  const idsOff = listOff.map((p: any) => p.id);
  assert.ok(idsOff.includes(CONFORME), 'fiche conforme servie');
  assert.ok(idsOff.includes(FICHE_TEST), 'mode OFF : la fiche test reste visible (état actuel respecté)');
  console.log('✓ OFF par défaut : liste publique identique à l’état actuel (fiche test comprise)');

  // -------------------------------------------------------------------
  // 3. Armement : daté, nommé, journalisé ; la boutique se restreint.
  // -------------------------------------------------------------------
  const arm = await setPublicationPolicy(serverDb, { strictMode: true, note: 'armé pour le banc' }, ACTOR);
  assert.equal(arm.ok, true);
  assert.equal(arm.state.strictMode, true);
  assert.ok(arm.state.activatedAt, 'le passage à true est daté');
  assert.equal(arm.state.activatedBy, ACTOR.email, '… et nommé (l’acteur)');
  assert.equal(arm.state.note, 'armé pour le banc');

  resetStrictModeCache(); // le route admin fait pareil après un armement
  const listOn = await serverDb.getPublicProducts({ testListings: true });
  const idsOn = listOn.map((p: any) => p.id);
  assert.ok(idsOn.includes(CONFORME), 'fiche conforme : sert encore en mode strict');
  assert.ok(!idsOn.includes(FICHE_TEST), 'fiche test non conforme : masquée de la liste publique, sans être déspubliée');
  const stillThere = serverDb.inMemoryProducts.find((p: any) => p.id === FICHE_TEST);
  assert.equal(stillThere.catalog_status, 'published', 'le masque est une vue, pas une dépublication');

  // Le catalogue des devis de kits porte le même filtre.
  const { produitsPublics, catalogue } = await serverDb.lireCataloguePublic({ testListings: true });
  assert.ok(!catalogue.some((l: any) => l.id === FICHE_TEST), 'fiche masquée : absente des devis de kits');
  assert.ok(produitsPublics.some((p: any) => p.id === CONFORME));
  console.log('✓ armement : daté + nommé, liste publique et devis de kits restreints aux fiches conformes');

  // -------------------------------------------------------------------
  // 4. Désarmement : retour à l’état actuel ; l’historique de l’armement survit.
  // -------------------------------------------------------------------
  const disarm = await setPublicationPolicy(serverDb, { strictMode: false, note: 'désarmé pour le banc' }, ACTOR);
  assert.equal(disarm.ok, true);
  assert.equal(disarm.state.strictMode, false);
  assert.equal(disarm.state.activatedAt, arm.state.activatedAt, 'l’historique du dernier armement survit au désarmement');
  assert.equal(disarm.state.activatedBy, ACTOR.email);

  resetStrictModeCache();
  const listBack = await serverDb.getPublicProducts({ testListings: true });
  assert.ok(listBack.some((p: any) => p.id === FICHE_TEST), 'désarmé : la fiche test redevient visible');
  console.log('✓ désarmement : retour exact à l’état actuel, historique de l’armement conservé');

  // -------------------------------------------------------------------
  // 5. Cohérence de l’état : lecture après écriture, idempotence du refus.
  // -------------------------------------------------------------------
  const after = await readPublicationPolicy(serverDb);
  assert.equal(after.strictMode, false);
  assert.equal(after.activatedAt, arm.state.activatedAt, 'la lecture fidèle porte l’historique du dernier armement');

  // Défense en profondeur : une valeur de travers n’arme jamais le mode strict.
  const badWrite = await setPublicationPolicy(serverDb, { strictMode: 'oui' as never }, ACTOR);
  assert.equal(badWrite.ok, false);
  assert.match(badWrite.reason || '', /booléen/);
  const afterBad = await readPublicationPolicy(serverDb);
  assert.equal(afterBad.strictMode, false, 'une écriture invalide ne modifie pas l’état');

  const coerced = await setPublicationPolicy(serverDb, { strictMode: false }, ACTOR);
  assert.equal(coerced.ok, true);
  assert.equal(coerced.state.strictMode, false);
  console.log('✓ cohérence : lecture fidèle, écriture invalide rejetée sans effet, double écriture idempotente');
}

runPublicationPolicyTests()
  .then(() => console.log('\n5 blocs de contrôles « Mode strict — politique de publication » validés — fail-closed table absente, OFF par défaut, armement daté/nommé, masque vue (pas dépublication), désarmement fidèle.'))
  .catch((error) => { console.error(error); process.exit(1); });
