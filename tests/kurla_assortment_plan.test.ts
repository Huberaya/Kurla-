/**
 * CHANTIER 2 (achats) — Plan d'assortiment.
 *
 * Vérifie l'intégrité et la cohérence du plan « responsable achats » :
 *  - chaque besoin est complet (produits à commander, contact, route) ;
 *  - les prospects référencés existent réellement dans le seed (aucun
 *    fournisseur inventé) ;
 *  - un besoin sans prospect est explicitement marqué `supplierGap` ;
 *  - les filtres par domaine couvrent bien cheveux, peau, enfant et outils ;
 *  - les besoins cheveux clés (hydrater, réduire la casse, cuir chevelu) sont présents.
 */
import assert from 'node:assert';
import {
  ASSORTMENT_NEEDS,
  ASSORTMENT_DOMAINS,
  ASSORTMENT_PROSPECT_IDS,
} from '../src/lib/assortmentPlan';
import { DEFAULT_PROSPECTS } from '../src/lib/prospectSeed';

function main() {
  const seedIds = new Set(DEFAULT_PROSPECTS.map((p) => p.id));

  // 1) Tous les prospects référencés par le plan existent dans le seed.
  for (const id of ASSORTMENT_PROSPECT_IDS) {
    assert.ok(seedIds.has(id), `Le plan référence un prospect inexistant : ${id}`);
  }

  // 2) Chaque besoin est complet et cohérent.
  for (const need of ASSORTMENT_NEEDS) {
    assert.ok(need.concern.length > 3, `${need.id} : libellé de besoin manquant`);
    assert.ok(need.productTypes.length >= 1, `${need.id} : au moins un produit à commander`);
    assert.ok(need.why.length > 10, `${need.id} : justification experte manquante`);
    assert.ok(['essential', 'important', 'later'].includes(need.priority), `${need.id} : priorité invalide`);
    assert.ok(['A', 'B', 'A+B'].includes(need.routeHint), `${need.id} : route d'achat invalide`);

    const hasProspects = need.prospectIds.length > 0;
    if (hasProspects) {
      // Chaque prospect listé existe.
      for (const pid of need.prospectIds) {
        assert.ok(seedIds.has(pid), `${need.id} : prospect inexistant ${pid}`);
      }
    } else {
      // Aucun prospect => le besoin doit être marqué comme sourcing à ouvrir.
      assert.ok(need.supplierGap === true, `${need.id} : sans prospect mais non marqué supplierGap`);
    }
  }

  // 3) Les quatre domaines sont couverts.
  const coveredDomains = new Set(ASSORTMENT_NEEDS.map((n) => n.domain));
  for (const d of ASSORTMENT_DOMAINS) {
    assert.ok(coveredDomains.has(d.id), `Domaine non couvert : ${d.id}`);
  }

  // 4) Les besoins cheveux attendus (filtres demandés) existent.
  const hairConcerns = ASSORTMENT_NEEDS.filter((n) => n.domain === 'hair').map((n) => n.concern);
  for (const expected of ['hydrater', 'casse', 'cuir chevelu']) {
    assert.ok(
      hairConcerns.some((c) => c.toLocaleLowerCase('fr-FR').includes(expected)),
      `Besoin cheveux manquant : ${expected}`
    );
  }

  // 5) Le solaire sans trace (différenciateur peaux mélanisées) est présent et pourvu.
  const sunscreen = ASSORTMENT_NEEDS.find((n) => n.id === 'skin-sunscreen');
  assert.ok(sunscreen && sunscreen.prospectIds.length > 0, 'Le besoin solaire doit avoir au moins un fournisseur');

  const gaps = ASSORTMENT_NEEDS.filter((n) => n.supplierGap).map((n) => n.concern);
  console.log(
    `[PASS] Plan d'assortiment : ${ASSORTMENT_NEEDS.length} besoins, ${ASSORTMENT_PROSPECT_IDS.length} fournisseurs réels référencés, ${gaps.length} sourcing à ouvrir (${gaps.join(' / ')}). Aucun prospect inventé.`
  );
}

main();
