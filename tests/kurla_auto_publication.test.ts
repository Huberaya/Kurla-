import assert from 'node:assert/strict';

import {
  AUTO_PUBLISH_EXCLUSION_LABELS,
  AUTO_PUBLISH_STAGES,
  evaluateAutoPublishGate,
  isKitProduct,
  isManualPublishOnly,
  isTestListingProduct,
  planAutoPublication,
  planAutoPublishRollback,
  type AutoPublishReadinessRow
} from '../src/lib/autoPublication';
import { SALES_CRITERIA_VERSION } from '../src/lib/salesCriteria';
import { serverDb } from '../src/lib/serverDb';
import {
  readPublicationPolicy,
  recordAutoPublishBatch,
  setAutoPublishPaused,
  setAutoPublishStage
} from '../src/lib/db/publicationPolicyStore';
import { buildActionQueue } from '../src/components/AdminActionQueue';

/**
 * BANC — AUTO-PUBLICATION (chantier E, lot 3).
 *
 * Acceptation du chantier : « un banc prouve qu'aucune fiche non conforme
 * n'est auto-publiée (tous les cas de bord), l'audit est complet, la pause
 * et le rollback fonctionnent. »
 *
 *  BLOC 1 — LOI DE LA MACHINE : batterie de cas de bord. La propriété
 *          critique est testée dans les deux sens : l'ensemble éligible est
 *          exact, ET aucune fiche non conforme n'y figure.
 *  BLOC 2 — EXCLUSIONS NOMMÉES : test / kit / publication manuelle, avec
 *          leur raison — jamais d'écartement silencieux.
 *  BLOC 3 — PORTE : illisible / migration absente / pause / éteinte = refus
 *          nommé ; watch et active = admis.
 *  BLOC 4 — ROLLBACK : seule la vague toujours publiée repart en draft.
 *  BLOC 5 — STORE (mémoire) : stage, pause, consigne de vague — état
 *          persisté lisible, audit structuré, fail-closed quand la migration
 *          est absente.
 *  BLOC 6 — FILE « À FAIRE AUJOURD'HUI » : la vague publiée devient une ligne
 *          « à vérifier » ; sans vague, le comportement d'avant est inchangé.
 */

const NOW = '2026-09-17T12:00:00.000Z';
const ACTOR = { id: 'admin-banc', email: 'banc@kurla.test' };

function conformRow(id: string, title: string): AutoPublishReadinessRow {
  return { productId: id, title, catalogStatus: 'draft', ready: true, missing: [] };
}

async function main(): Promise<void> {
  // ————————————————— BLOC 1 — la loi de la machine —————————————————
  const products: any[] = [
    { id: 'ok1', title: 'Shampoing Doux', category: 'Cheveux' },
    { id: 'ok2', title: 'Masque Nourrissant', category: 'Cheveux' },
    { id: 'ko1', title: 'Sérum sans photo', category: 'Peau' },
    { id: 'ko2', title: 'Huile prix absent', category: 'Cheveux' },
    { id: 'pub1', title: 'Déjà en boutique', category: 'Cheveux' },
    { id: 'test1', title: 'Fiche test', category: 'Cheveux', is_test_listing: true },
    { id: 'launch-k02', title: 'Kit Lisseur', category: 'Cheveux' },
    { id: 'man1', title: 'Fiche manuelle', category: 'Peau', manual_publish_only: true },
    { id: 'illisible', title: 'Absent du rapport', category: 'Cheveux' }
  ];

  const readiness: AutoPublishReadinessRow[] = [
    conformRow('ok1', 'Shampoing Doux'),
    conformRow('ok2', 'Masque Nourrissant'),
    { productId: 'ko1', title: 'Sérum sans photo', catalogStatus: 'draft', ready: false, missing: ['aucun visuel exploitable'] },
    { productId: 'ko2', title: 'Huile prix absent', catalogStatus: 'draft', ready: false, missing: ['prix TTC absent ou invalide', 'taux de TVA absent', 'format/contenance absent', 'fournisseur absent'] },
    { productId: 'pub1', title: 'Déjà en boutique', catalogStatus: 'published', ready: true, missing: [] },
    conformRow('test1', 'Fiche test'),
    conformRow('launch-k02', 'Kit Lisseur'),
    conformRow('man1', 'Fiche manuelle')
    // « illisible » : volontairement ABSENT du rapport de readiness.
  ];

  const plan = planAutoPublication(products, readiness, { trigger: 'manuel', evaluatedAt: NOW });

  // Éligibilité EXACTE : seules les deux fiches draft au vert, sans exclusion.
  assert.deepEqual(plan.eligible.map(e => e.productId).sort(), ['ok1', 'ok2'],
    'éligibles = les fiches draft tous critères au vert, rien d’autre');

  // PROPRIÉTÉ CRITIQUE (sens défensif) : aucune fiche non conforme n'est éligible.
  const eligibles = new Set(plan.eligible.map(e => e.productId));
  for (const row of readiness) {
    if (!row.ready || row.missing.length > 0) {
      assert.ok(!eligibles.has(row.productId),
        `LA NON-CONFORME « ${row.title} » ne doit jamais être auto-publiée`);
    }
  }
  for (const product of products) {
    if (isTestListingProduct(product) || isKitProduct(product) || isManualPublishOnly(product)) {
      assert.ok(!eligibles.has(String(product.id)),
        `l’exclusion « ${String(product.title)} » est absolue, même fiche au vert`);
    }
  }
  assert.ok(!eligibles.has('pub1'), 'une fiche déjà publiée n’est jamais « republiée »');
  assert.ok(!eligibles.has('illisible'), 'readiness illisible = non publié (fail-closed)');

  // Chaque fiche non éligible a une raison NOMMÉE (jamais d'écartement silencieux).
  assert.equal(plan.excluded.length, products.length - plan.eligible.length, 'tout le reste est compté et nommé');
  const raisonParId = new Map(plan.excluded.map(x => [x.productId, x.reason]));
  assert.equal(raisonParId.get('ko1'), 'non_conforme');
  assert.equal(raisonParId.get('ko2'), 'non_conforme');
  assert.equal(raisonParId.get('pub1'), 'deja_publiee');
  assert.equal(raisonParId.get('test1'), 'fiche_test');
  assert.equal(raisonParId.get('launch-k02'), 'kit');
  assert.equal(raisonParId.get('man1'), 'publication_manuelle');
  assert.equal(raisonParId.get('illisible'), 'non_conforme');
  for (const exclusion of plan.excluded) {
    assert.ok(exclusion.detail.trim() !== '', `motif détaillé présent : ${exclusion.productId}`);
    assert.ok(Object.values(AUTO_PUBLISH_EXCLUSION_LABELS).includes(AUTO_PUBLISH_EXCLUSION_LABELS[exclusion.reason]),
      `raison labellisée : ${exclusion.reason}`);
  }
  const ko2 = plan.excluded.find(x => x.productId === 'ko2')!;
  assert.ok(ko2.detail.includes('prix TTC absent ou invalide'), 'le premier manquement est cité');
  assert.ok(ko2.detail.includes('+1 autre'), 'les manquements supplémentaires sont comptés, pas déballés');

  // ———————— BLOC 1b — L'AUDIT EST COMPLET (les champs que la route consigne) ————————
  assert.equal(plan.batchId, `ap-${NOW.replace(/[:.]/g, '-')}`, 'id de vague déterministe');
  assert.equal(plan.criteriaVersion, SALES_CRITERIA_VERSION, 'la version de la carte est inscrite à la vague');
  assert.equal(plan.trigger, 'manuel', 'le déclencheur est nommé');
  assert.equal(plan.evaluatedAt, NOW, 'la date est posée');
  for (const eligible of plan.eligible) {
    assert.ok(eligible.productId.trim() !== '' && eligible.title.trim() !== '', 'chaque décision porte produit + nom (audit)');
  }

  // ————————————————— BLOC 2 — détection des exclusions —————————————————
  assert.equal(isKitProduct({ id: 'launch-k02' }), true, 'id « launch-k… » = kit');
  assert.equal(isKitProduct({ id: 'P3', category: 'kits' }), true, 'catégorie kits = kit');
  assert.equal(isKitProduct({ id: 'P4', category: 'Cheveux' }), false, 'un SKU n’est pas un kit');
  assert.equal(isTestListingProduct({ is_test_listing: true }), true);
  assert.equal(isTestListingProduct({ isTestListing: true }), true, 'les deux orthographes sont lues');
  assert.equal(isTestListingProduct({ is_test_listing: false }), false);
  assert.equal(isManualPublishOnly({ manual_publish_only: true }), true);
  assert.equal(isManualPublishOnly({ manualPublishOnly: true }), true);
  assert.equal(isManualPublishOnly({}), false, 'sans drapeau : pas d’exclusion inventée');

  // ————————————————— BLOC 3 — la porte de la machine —————————————————
  const gateBase = { available: true, autoPublishAvailable: true, stage: 'active' as const, pausedAt: null };
  assert.deepEqual(evaluateAutoPublishGate(gateBase), { allowed: true, httpStatus: 200 }, 'active, sans pause : admis');
  assert.equal(evaluateAutoPublishGate({ ...gateBase, stage: 'watch' }).allowed, true, 'watch : admis (ne publie rien)');
  assert.equal(evaluateAutoPublishGate({ ...gateBase, stage: 'off' }).allowed, false, 'éteinte : refus');
  assert.match(evaluateAutoPublishGate({ ...gateBase, stage: 'off' }).error || '', /éteinte/);
  assert.equal(evaluateAutoPublishGate({ ...gateBase, pausedAt: NOW }).allowed, false, 'en pause : refus');
  assert.match(evaluateAutoPublishGate({ ...gateBase, pausedAt: NOW }).detail || '', /pause posée le/);
  assert.equal(evaluateAutoPublishGate({ available: true, autoPublishAvailable: false, stage: 'active', pausedAt: null }).allowed, false, 'migration absente : refus');
  assert.match(evaluateAutoPublishGate({ available: true, autoPublishAvailable: false, stage: 'active', pausedAt: null }).detail || '', /20261004000000_auto_publication/);
  const gateIllisible = evaluateAutoPublishGate({ available: false, autoPublishAvailable: false, stage: 'off', pausedAt: null, reason: 'table absente' });
  assert.equal(gateIllisible.allowed, false, 'politique illisible : refus');
  assert.match(gateIllisible.detail || '', /table absente/);
  assert.deepEqual(AUTO_PUBLISH_STAGES, ['off', 'watch', 'active'], 'l’ordre des stages est figé');

  // ————————————————— BLOC 4 — le rollback —————————————————
  const afterRun: any[] = [
    { id: 'ok1', title: 'Shampoing Doux', catalog_status: 'published' },
    { id: 'ok2', title: 'Masque Nourrissant', catalog_status: 'published' },
    { id: 'horsVague', title: 'Publiée à la main', catalog_status: 'published' }
  ];
  const rollback = planAutoPublishRollback(afterRun, ['ok1', 'ok2', 'manquante']);
  assert.deepEqual(rollback.map(a => a.productId).sort(), ['ok1', 'ok2'], 'seules les fiches de la vague');
  assert.ok(rollback.every(a => a.from === 'published' && a.to === 'draft'), 'published → draft, nommé');
  assert.ok(!rollback.some(a => a.productId === 'horsVague'), 'une publication manuelle n’est pas touchée');
  assert.ok(!rollback.some(a => a.productId === 'manquante'), 'une fiche absente du catalogue n’invente pas d’action');

  // La vague déjà dépubliée (admin ou rollback précédent) n’est pas rejouée.
  const dejaRejoue: any[] = [
    { id: 'ok1', title: 'Shampoing Doux', catalog_status: 'draft' },
    { id: 'ok2', title: 'Masque Nourrissant', catalog_status: 'published' }
  ];
  const rollback2 = planAutoPublishRollback(dejaRejoue, ['ok1', 'ok2']);
  assert.deepEqual(rollback2.map(a => a.productId), ['ok2'], 'idempotence : on ne dépublie pas deux fois');

  // ————————————————— BLOC 5 — le store (mémoire, fail-closed) —————————————————
  // Migration absente : la machine est off, et l’état est nommé, pas une erreur.
  serverDb.inMemoryPublicationPolicy = { id: 1, strict_mode: false, activated_at: null, activated_by: null, note: null, updated_at: NOW };
  const avantMigration = await readPublicationPolicy(serverDb);
  assert.equal(avantMigration.available, true, 'la table (mémoire) est lue');
  assert.equal(avantMigration.autoPublishAvailable, false, 'colonnes E absentes = état nommé');
  assert.equal(avantMigration.autoPublishStage, 'off', 'repli off (fail-closed)');
  const refusStage = await setAutoPublishStage(serverDb, { stage: 'active' }, ACTOR);
  assert.equal(refusStage.ok, false, 'on n’arme pas la machine sans ses colonnes');
  assert.match(refusStage.reason || '', /20261004000000_auto_publication/);
  const refusPause = await setAutoPublishPaused(serverDb, { paused: true }, ACTOR);
  assert.equal(refusPause.ok, false, 'la pause exige aussi les colonnes');

  // Migration appliquée : la machine s’arme, se pause, consigne sa vague.
  serverDb.inMemoryPublicationPolicy = {
    id: 1, strict_mode: false, activated_at: null, activated_by: null, note: null, updated_at: NOW,
    auto_publish_stage: 'off', auto_publish_paused_at: null, auto_publish_paused_by: null
  };
  assert.equal((await readPublicationPolicy(serverDb)).autoPublishAvailable, true, 'colonnes présentes = machine pilotable');

  const stageInvalide = await setAutoPublishStage(serverDb, { stage: 'full_auto' as any }, ACTOR);
  assert.equal(stageInvalide.ok, false, 'un stage inventé est refusé');

  const armementWatch = await setAutoPublishStage(serverDb, { stage: 'watch', note: 'banc : surveillance' }, ACTOR);
  assert.equal(armementWatch.ok, true);
  assert.equal(armementWatch.state.autoPublishStage, 'watch', 'watch armé, persisté');
  assert.equal(armementWatch.state.note, 'banc : surveillance', 'la note est conservée');
  assert.ok(armementWatch.audit && typeof armementWatch.audit === 'object', 'l’armement retourne son audit');
  assert.equal(armementWatch.state.strictMode, false, 'la machine ne touche PAS au mode strict (C3)');

  const armementActive = await setAutoPublishStage(serverDb, { stage: 'active' }, ACTOR);
  assert.equal(armementActive.state.autoPublishStage, 'active');

  const pause = await setAutoPublishPaused(serverDb, { paused: true, note: 'avant le lot' }, ACTOR);
  assert.equal(pause.ok, true);
  assert.ok(pause.state.autoPublishPausedAt, 'la pause est datée');
  assert.equal(pause.state.autoPublishPausedBy, ACTOR.email, '… et nommée (l’acteur)');
  assert.equal(pause.state.autoPublishStage, 'active', 'la pause ne réarme pas la machine (stage inchangé)');

  const vague = { batchId: 'ap-banc', at: NOW, productIds: ['ok1', 'ok2'] };
  const consigne = await recordAutoPublishBatch(serverDb, vague);
  assert.equal(consigne.ok, true);
  assert.deepEqual(consigne.state.autoPublishLastBatch, vague, 'la dernière vague est lisible telle quelle');

  const reprise = await setAutoPublishPaused(serverDb, { paused: false }, ACTOR);
  assert.equal(reprise.state.autoPublishPausedAt, null, 'reprendre = effacer la pause');
  assert.equal(reprise.state.autoPublishStage, 'active', '… sans toucher au stage');
  assert.equal(reprise.state.autoPublishLastBatch?.batchId, 'ap-banc', 'la vague survit à la reprise');

  // Nettoyage : la mémoire ne garde pas d’état de banc.
  serverDb.inMemoryPublicationPolicy = null;

  // ————————————————— BLOC 6 — la file « À faire aujourd'hui » —————————————————
  const baseQueue = {
    readiness: { publishedButNotListableProducts: [{ productId: 'x1', title: 'Fiche visible non listable', missing: ['aucun visuel exploitable'] }] },
    items: null,
    demandProducts: null,
    batchProductIds: null
  };
  const sansVague = buildActionQueue(baseQueue, new Date(NOW));
  assert.equal(sansVague.counters.unblock, 1, 'avant : une seule ligne de déverrouillage');
  assert.ok(!sansVague.actions.some(a => a.title === 'Auto-publié'), 'sans vague : pas de ligne inventée');

  const avecVague = buildActionQueue({
    ...baseQueue,
    autoPublished: { count: 3, at: NOW, batchId: 'ap-banc' }
  }, new Date(NOW));
  assert.equal(avecVague.counters.unblock, 2, 'la vague ajoutée compte dans la file');
  const ligne = avecVague.actions.find(a => a.title === 'Auto-publié');
  assert.ok(ligne, 'la ligne « Auto-publié » est présente');
  assert.ok(ligne!.context.includes('3 fiches auto-publiées') && ligne!.context.includes('à vérifier'), 'elle dit ce qu’il y a à vérifier');
  assert.equal(avecVague.actions[0].title, 'Auto-publié', 'la vérification la plus fraîche prend la tête de la file');
  assert.equal(ligne!.tab, 'catalog', 'elle mène au catalogue');

  assert.equal(buildActionQueue({ ...baseQueue, autoPublished: { count: 0, at: NOW, batchId: 'ap-0' } }, new Date(NOW)).counters.unblock, 1, 'vague vide = pas de ligne');

  console.log('[PASS] Auto-publication (chantier E) : aucune fiche non conforme n’est éligible (cas de bord figés), exclusions nommées, porte fail-closed, rollback idempotent, pause datée, audit complet, file « à vérifier ».');
}

main().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
