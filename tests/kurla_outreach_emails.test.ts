/**
 * EMAILS D'APPROCHE — intégrité.
 * Chaque phase du bureau des achats doit avoir un email prêt, avec un objet,
 * un corps non vide, des prospects réels, et les demandes critiques (MOQ,
 * conformité). Aucun fournisseur inventé.
 */
import assert from 'node:assert';
import { OUTREACH_EMAILS, KNOWN_PROSPECT_EMAILS, contactActionForProspect } from '../src/lib/outreachEmails';
import { PURCHASING_PHASES } from '../src/lib/purchasingDesk';
import { DEFAULT_PROSPECTS } from '../src/lib/prospectSeed';

function main() {
  const seedIds = new Set(DEFAULT_PROSPECTS.map((p) => p.id));
  const phaseIds = new Set(PURCHASING_PHASES.map((p) => p.id));

  // 1) Chaque phase d'achat a exactement un email.
  for (const phase of PURCHASING_PHASES) {
    const tpl = OUTREACH_EMAILS.find((e) => e.phaseId === phase.id);
    assert.ok(tpl, `Phase sans email : ${phase.id}`);
    assert.ok(tpl!.subject.length > 5, `${phase.id}: objet manquant`);
    assert.ok(tpl!.body.length > 100, `${phase.id}: corps trop court`);
    assert.ok(tpl!.prospectIds.length >= 1, `${phase.id}: aucun destinataire`);
    for (const pid of tpl!.prospectIds) {
      assert.ok(seedIds.has(pid), `${phase.id}: prospect inexistant ${pid}`);
    }
  }
  // Tous les emails pointent vers une phase existante.
  for (const tpl of OUTREACH_EMAILS) {
    assert.ok(phaseIds.has(tpl.phaseId), `Email orphelin : ${tpl.phaseId}`);
  }

  // 2) Les emails renseignent bien la demande critique (MOQ et conformité).
  const retail = OUTREACH_EMAILS.filter((e) => e.phaseId !== 'phase-faconnage');
  for (const tpl of retail) {
    assert.ok(/minimum|MOQ|gros/i.test(tpl.body), `${tpl.phaseId}: demande de MOQ/tarif manquante`);
  }
  const fap = OUTREACH_EMAILS.find((e) => e.phaseId === 'phase-faconnage')!;
  assert.ok(/CPSR|CPNP|PIF|ISO 22716/i.test(fap.body), 'façonnage : conformité réglementaire manquante');

  // 3) Les adresses email connues correspondent à des prospects réels.
  for (const pid of Object.keys(KNOWN_PROSPECT_EMAILS)) {
    assert.ok(seedIds.has(pid), `email connu pour un prospect inexistant : ${pid}`);
    assert.ok(/@/.test(KNOWN_PROSPECT_EMAILS[pid]), `email invalide pour ${pid}`);
  }

  // 4) Action de contact directe par fournisseur (le bouton « Envoyer l'email »).
  // Email public connu → mailto pré-rempli avec sujet + corps.
  const mailto = contactActionForProspect('c23', 'Afro Wholesale');
  assert.ok(mailto && mailto.kind === 'email', 'c23 devrait ouvrir un email');
  if (mailto?.kind === 'email') {
    assert.ok(mailto.href.startsWith('mailto:support@afrowholesale.eu?subject='), 'mailto: destinataire incorrect');
    assert.ok(mailto.href.includes('subject=') && decodeURIComponent(mailto.href.split('body=')[1]).length > 100,
      'mailto: sujet/corps manquants');
    // Le nom du fournisseur est injecté dans le corps.
    assert.ok(!decodeURIComponent(mailto.href).includes('[FOURNISSEUR]'), 'token [FOURNISSEUR] non remplacé');
  }
  // Pas d'email public → formulaire du site (jamais d'adresse inventée).
  const form = contactActionForProspect('c24', 'Curly Nights');
  assert.ok(form && form.kind === 'form' && form.href.startsWith('https://'), 'c24 devrait pointer vers le formulaire site');
  // Un prospect inconnu ne plante pas.
  assert.strictEqual(contactActionForProspect('cXX', 'Inconnu'), null);

  console.log(
    `[PASS] Emails d'approche : ${OUTREACH_EMAILS.length} phases couvertes, destinataires réels, demandes MOQ/conformité présentes. Bouton contact : email pré-rempli ou formulaire site. Aucun fournisseur inventé.`
  );
}

main();
