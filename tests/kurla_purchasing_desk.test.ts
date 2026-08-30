/**
 * BUREAU DES ACHATS — intégrité du plan d'action.
 * Vérifie que les phases d'achat sont ordonnées, référencent des prospects
 * réels (jamais inventés) et portent une checklist de demande.
 */
import assert from 'node:assert';
import { PURCHASING_PHASES, RFQ_CHECKLIST_RETAIL, RFQ_CHECKLIST_PRIVATE_LABEL } from '../src/lib/purchasingDesk';
import { DEFAULT_PROSPECTS } from '../src/lib/prospectSeed';

function main() {
  const seedIds = new Set(DEFAULT_PROSPECTS.map((p) => p.id));

  // 1) Les phases sont ordonnées de 1 à N sans trou.
  const orders = PURCHASING_PHASES.map((p) => p.order).sort((a, b) => a - b);
  assert.deepStrictEqual(orders, orders.map((_, i) => i + 1), 'les phases doivent être ordonnées 1..N');

  // 2) Chaque phase est complète et pointe vers des prospects réels.
  const allPhaseProspects = new Set<string>();
  for (const phase of PURCHASING_PHASES) {
    assert.ok(phase.title.length > 3, `${phase.id}: titre manquant`);
    assert.ok(phase.objective.length > 10, `${phase.id}: objectif manquant`);
    assert.ok(phase.askFor.length >= 3, `${phase.id}: checklist de demande trop courte`);
    assert.ok(phase.doneWhen.length > 10, `${phase.id}: critère de fin manquant`);
    assert.ok(phase.prospectIds.length >= 1, `${phase.id}: aucun fournisseur`);
    for (const pid of phase.prospectIds) {
      assert.ok(seedIds.has(pid), `${phase.id}: prospect inexistant ${pid}`);
      allPhaseProspects.add(pid);
    }
  }

  // 3) Les deux routes d'achat sont présentes (revente + façonnage).
  const routes = new Set(PURCHASING_PHASES.map((p) => p.route));
  assert.ok(routes.has('A'), 'la route revente doit exister');
  assert.ok(routes.has('B'), 'la route façonnage doit exister');

  // 4) Les checklists couvrent les informations critiques (MOQ, délais, conformité).
  assert.ok(RFQ_CHECKLIST_RETAIL.some((x) => /MOQ|minimum/i.test(x)), 'checklist revente : MOQ demandée');
  assert.ok(RFQ_CHECKLIST_RETAIL.some((x) => /délai/i.test(x)), 'checklist revente : délai demandé');
  assert.ok(RFQ_CHECKLIST_PRIVATE_LABEL.some((x) => /CPSR|CPNP|PIF/i.test(x)), 'checklist façonnage : conformité demandée');

  // 5) La phase immédiate (1) est bien l'ouverture des comptes grossistes.
  assert.ok(/grossiste/i.test(PURCHASING_PHASES[0].title), 'la phase 1 doit ouvrir les comptes grossistes');

  console.log(
    `[PASS] Bureau des achats : ${PURCHASING_PHASES.length} phases ordonnées, ${allPhaseProspects.size} fournisseurs réels mobilisés, checklists revente/façonnage complètes (MOQ, délais, conformité). Aucun prospect inventé.`
  );
}

main();
