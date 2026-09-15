/**
 * « À FAIRE AUJOURD'HUI » (dashboard admin — chantier 17/09, phase 1).
 *
 * La file d'actions de l'acheteur est dérivée par `buildActionQueue`, fonction
 * pure sans DOM ni réseau. Contrats :
 *   - 3 familles : unblock (fiche publiée mais non listable), lot (demande ferme
 *     sans lot enregistré), rfq (besoin encore `to_source`) ;
 *   - RIEN n'est inventé : chaque action référence un identifiant réel lu
 *     dans les endpoints (publication-readiness, sourcing/items, preorder-demand,
 *     batches) ;
 *   - priorité commerciale : unblock → lot → rfq ;
 *   - chaque action porte son onglet cible et, le cas échéant, le contexte à
 *     présélectionner (focusProductId / focusLabel) ;
 *   - plafonné à 12 lignes lues, compteurs complets + hiddenCount honnête ;
 *   - robuste : sources absentes/vides → file vide, jamais de plantage.
 */
import { strict as assert } from 'node:assert';
import { buildActionQueue, QUEUE_MAX_ROWS, type QueueInputs } from '../src/components/AdminActionQueue';

/* 1. Vide / sources absentes → zéro action, zéro compteur, pas de plantage. */
{
  const empty = buildActionQueue({});
  assert.deepEqual(empty.counters, { unblock: 0, lot: 0, rfq: 0 });
  assert.equal(empty.actions.length, 0);
  assert.equal(empty.hiddenCount, 0);

  const nulls = buildActionQueue({
    readiness: null, items: null, demandProducts: null, batchProductIds: null
  });
  assert.deepEqual(nulls.counters, { unblock: 0, lot: 0, rfq: 0 });
  assert.equal(nulls.actions.length, 0);

  const empties = buildActionQueue({
    readiness: { publishedButNotListableProducts: [] },
    items: [], demandProducts: [], batchProductIds: []
  });
  assert.equal(empties.actions.length, 0, 'sources vides → file vide (état honnête)');
  console.log('✓ vide & sources absentes : file vide, compteurs à zéro, pas de plantage');
}

/* 2. Unblock : fiche publiée mais non listable → action catalog + focus. */
{
  const result = buildActionQueue({
    readiness: {
      publishedButNotListableProducts: [
        { productId: 'p1', title: 'Sérum Niacinamide 4C', missing: ['CPNP+RP+CPSR manquants', 'visuel non autorisé'] },
        { productId: 'p2', title: 'Masque Kératine', missing: [] }
      ]
    }
  });
  assert.equal(result.counters.unblock, 2);
  const [first, second] = result.actions;
  assert.equal(first.kind, 'unblock');
  assert.equal(first.tab, 'catalog');
  assert.equal(first.focusProductId, 'p1');
  assert.equal(first.focusLabel, 'Sérum Niacinamide 4C');
  assert.equal(first.detail, 'CPNP+RP+CPSR manquants', 'premier manquement affiché');
  assert.equal(second.detail, 'manquement non nommé', 'manque vide → libellé honnête, jamais inventé');
  console.log('✓ unblock : cible, focus catalogue, premier manquement nommé');
}

/* 3. RFQ : seul `to_source` est actionnable (in_rfq/awarded/abandoned exclus). */
{
  const result = buildActionQueue({
    items: [
      { id: 'i1', title: 'Crème mains karité', wave: '1', status: 'to_source', requiredDocuments: ['CPNP', 'pers. responsable UE', 'INCI'] },
      { id: 'i2', title: 'Huile coco pressée à froid', wave: '2', status: 'in_rfq' },
      { id: 'i3', title: 'Gant soie', wave: '1', status: 'awarded' },
      { id: 'i4', title: 'Spray définition', wave: '3', status: 'abandoned' }
    ]
  });
  assert.equal(result.counters.rfq, 1, 'seul to_source compte');
  const action = result.actions.find(a => a.kind === 'rfq');
  assert.ok(action, 'une action rfq présente');
  assert.equal(action!.context, 'Crème mains karité');
  assert.equal(action!.tab, 'suppliers');
  assert.ok(action!.detail.includes('Vague 1'), 'vague affichée');
  assert.ok(action!.detail.includes('3 documents requis'), 'documents requis nommés');
  assert.equal(action!.focusProductId, undefined, 'la RFQ mène au sourcing sans focus produit');
  console.log('✓ rfq : filtre to_source, vague + documents requis, cible sourcing');
}

/* 4. Lot : demande ferme sans lot = action ; avec lot, ou sans demande = rien. */
{
  const result = buildActionQueue({
    demandProducts: [
      { productId: 'd1', name: 'Kit Démêlage', isKit: true, qtyFirm: 12 },
      { productId: 'd2', name: 'Shampoing doux', qtyFirm: 3 },
      { productId: 'd3', name: 'Masque profond', qtyFirm: 7 },
      { productId: 'd4', name: 'Gommage', qtyFirm: 0 },
      { productId: 'd5', name: 'Sérum cils', qtyFirm: -1 },
      { productId: 'd6', name: 'Roll-on menthe', qtyFirm: 1 }
    ],
    batchProductIds: ['d2']
  });
  assert.equal(result.counters.lot, 3, 'd1, d3 et d6 seulement (d2 a un lot, d4/d5 sans demande)');
  const actions = result.actions.filter(a => a.kind === 'lot');
  assert.deepEqual(actions.map(a => a.focusProductId), ['d1', 'd3', 'd6']);
  assert.equal(actions[0].tab, 'batches');
  assert.ok(actions[0].detail.includes('12 unités fermes'), 'quantité + pluriel');
  assert.ok(actions[2].detail.includes('1 unité ferme'), 'singulier géré');
  assert.ok(actions.every(a => a.detail.includes('sans lot enregistré')));
  console.log('✓ lot : demande ferme sans lot uniquement, quantités exactes (singulier/pluriel), focus formulaire');
}

/* 5. Priorité : unblock d'abord, puis lot, enfin rfq. */
{
  const result = buildActionQueue({
    readiness: { publishedButNotListableProducts: [{ productId: 'p1', title: 'Fiche A', missing: ['x'] }] },
    items: [{ id: 'i1', title: 'Besoin B', wave: '1', status: 'to_source' }],
    demandProducts: [{ productId: 'd1', name: 'Produit C', qtyFirm: 1 }],
    batchProductIds: []
  });
  assert.deepEqual(result.actions.map(a => a.kind), ['unblock', 'lot', 'rfq'], 'ordre commercial → physique → sourcing');
  console.log('✓ priorité : unblock → lot → rfq');
}

/* 6. Plafond de lisibilité : 12 lignes, compteurs complets, hiddenCount honnête. */
{
  const many = Array.from({ length: 15 }, (_, i) => ({ productId: `p${i}`, title: `Fiche ${i}`, missing: ['m'] }));
  const result = buildActionQueue({ readiness: { publishedButNotListableProducts: many } });
  assert.equal(result.counters.unblock, 15, 'compteur complet malgré le plafonnement');
  assert.equal(result.actions.length, QUEUE_MAX_ROWS, 'file plafonnée à 12 lignes');
  assert.equal(result.hiddenCount, 3, 'excédent nommé, jamais masqué');
  console.log('✓ plafond : 12 lignes lues, compteurs complets, excédent nommé');
}

/* 7. Idempotence des clés : deux appels → mêmes clés stables (scrollspy/UI). */
{
  const input: QueueInputs = {
    readiness: { publishedButNotListableProducts: [{ productId: 'p1', title: 'Fiche', missing: [] }] },
    items: [{ id: 'i1', title: 'Besoin', wave: '1', status: 'to_source' }]
  };
  const a = buildActionQueue(input);
  const b = buildActionQueue(input);
  assert.deepEqual(a.actions.map(x => x.key), b.actions.map(x => x.key), 'clés stables entre lectures');
  console.log('✓ clés stables entre relectures');
}

console.log('\n7 blocs de contrôles « À faire aujourd\'hui » validés — dérivation, cibles, priorités, bornes, stabilité.');
