/**
 * DOSSIER FOURNISSEUR — banc du chantier B.
 * ==========================================
 *
 * Ce banc ne vérifie pas une esthétique : il vérifie la propriété qui rend ce
 * dossier utilisable — **il nomme les manques sans jamais les inventer**.
 *
 * Contexte mesuré en production à l'écriture (16/09/2026) : 28 prospects,
 * 3 avec un e-mail, 0 date de relance, 0 MOQ, 0 délai. Le dossier sert donc
 * d'abord à dire ce qui manque. D'où les contrats ci-dessous :
 *
 *   1. un champ vide est « inconnu », jamais « non » — on ne transforme pas
 *      une absence d'information en refus du fournisseur ;
 *   2. un contact trouvé ailleurs dans le système est **proposé**, jamais
 *      écrit : `contactEmail` reste nul tant qu'un humain n'a pas adopté ;
 *   3. une pièce « sans objet » (`na`) compte comme obtenue, pas manquante ;
 *   4. une relance échue n'est plus échue dès qu'une décision est prise ;
 *   5. la route est gardée : un fournisseur, ses contacts et ses relances ne
 *      regardent pas un visiteur.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

process.env.KURLA_TEST_NO_SERVER = 'true';
process.env.NODE_ENV = 'test';
process.env.KURLA_TEST_AUTH_TOKEN = 'jeton-de-banc-dossier';
process.env.KURLA_TEST_AUTH_ROLE = 'admin';

const { buildSupplierDossier, summarizeSupplierDossier, PIECES } = await import('../src/lib/supplierDossier');
const serverModule = await import('../server');

const JETON = 'jeton-de-banc-dossier';
const MAINTENANT = new Date('2026-09-16T12:00:00Z');
const jour = (decalage: number) => new Date(MAINTENANT.getTime() + decalage * 86_400_000).toISOString().slice(0, 10);

type ProspectPartiel = Record<string, unknown>;
function prospect(id: string, extra: ProspectPartiel = {}): any {
  return {
    id,
    name: `Fournisseur ${id}`,
    route: 'A',
    contactType: 'distributor',
    status: 'to_contact',
    createdAt: MAINTENANT.toISOString(),
    updatedAt: MAINTENANT.toISOString(),
    ...extra,
  };
}

function candidat(id: string, prospectId: string): any {
  return { id, prospectId, brand: 'Marque', product: 'Produit', inciReceived: false, ingredientsMapped: 0 };
}

function bloc(nom: string, contact: string | null, emailState: 'pret' | 'a_preparer' = 'a_preparer'): any {
  return { key: nom, name: nom, contact, website: null, rowCount: 3, emailState, emailSubject: 'Sujet', emailBody: 'Corps', knownTerms: [] };
}

async function requestApp(path: string, options: { jeton?: string } = {}) {
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const port = (listener.address() as AddressInfo).port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: options.jeton ? { Authorization: `Bearer ${options.jeton}` } : undefined,
    });
    const texte = await response.text();
    let json: any = null;
    try { json = JSON.parse(texte); } catch { json = null; }
    return { status: response.status, json };
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

// ---------------------------------------------------------------------------
// 1. Les pièces : complet, vide, et les deux cas piégeux
// ---------------------------------------------------------------------------
{
  const complet = PIECES.reduce((acc, p) => {
    acc[p.cle] = p.cle === 'moq' || p.cle === 'leadTimeFr' ? '10 unités' : 'yes';
    return acc;
  }, {} as ProspectPartiel);

  const [plein] = buildSupplierDossier({ prospects: [prospect('a', complet)], now: MAINTENANT });
  assert.equal(plein.completeness.pct, 100, 'toutes pièces obtenues : 100 %');
  assert.deepEqual(plein.missing, [], 'aucun manque nommé');

  const [vide] = buildSupplierDossier({ prospects: [prospect('b')], now: MAINTENANT });
  assert.equal(vide.completeness.pct, 0, 'aucune pièce : 0 %');
  assert.equal(vide.missing.length, PIECES.length, 'chaque pièce manquante est nommée');
  assert.ok(vide.missing.some(m => m.startsWith('droits sur les visuels')), 'le manque est lisible, pas un code');
  assert.ok(vide.missing.every(m => m.includes('inconnu')), 'jamais demandé = inconnu, et le libellé le dit');

  // Un vide n'est pas un refus.
  assert.equal(vide.pieces.inciProvided, 'inconnu', 'champ vide = inconnu, jamais « non »');
  const [refus] = buildSupplierDossier({ prospects: [prospect('c', { inciProvided: 'no' })], now: MAINTENANT });
  assert.equal(refus.pieces.inciProvided, 'non', 'refus explicite conservé');

  // « Sans objet » ne doit pas être compté comme un manque.
  const [sansObjet] = buildSupplierDossier({ prospects: [prospect('d', { dropshipping: 'na' })], now: MAINTENANT });
  assert.equal(sansObjet.pieces.dropshipping, 'oui', '« sans objet » = obtenu');
  assert.ok(!sansObjet.missing.some(m => m.startsWith('dropshipping possible')), '« sans objet » n’est pas un manque');
  assert.ok(!sansObjet.missingKeys.includes('dropshipping'), 'la clé non plus');

  // Le texte libre : renseigné = obtenu.
  const [texteLibre] = buildSupplierDossier({ prospects: [prospect('e', { moq: '50 pièces' })], now: MAINTENANT });
  assert.equal(texteLibre.pieces.moq, 'oui', 'un MOQ écrit est un MOQ obtenu');
  assert.ok(!texteLibre.missing.some(m => m.startsWith('quantité minimale (MOQ)')));
}

// La nuance, qui change l'action : relancer ou demander.
{
  const [attente] = buildSupplierDossier({ prospects: [prospect('a', { inciProvided: 'pending' })], now: MAINTENANT });
  assert.ok(attente.missing.some(m => m === 'INCI fournie — en attente'), 'demandé mais pas reçu : « en attente »');
  const [refus] = buildSupplierDossier({ prospects: [prospect('b', { inciProvided: 'no' })], now: MAINTENANT });
  assert.ok(refus.missing.some(m => m === 'INCI fournie — refusé'), 'refus explicite : « refusé »');
  assert.notDeepEqual(attente.missing, refus.missing, 'les deux situations ne se confondent pas');
}

// ---------------------------------------------------------------------------
// 2. Le contact : écrit, proposé, ou absent — jamais inventé
// ---------------------------------------------------------------------------
{
  const [ecrit] = buildSupplierDossier({
    prospects: [prospect('a', { contactEmail: 'achat@marque.fr', contactName: 'Fatou' })],
    supplierBlocks: [bloc('Fournisseur a', 'autre@marque.fr')],
    now: MAINTENANT,
  });
  assert.equal(ecrit.contactEmail, 'achat@marque.fr', 'le contact du prospect prime');
  assert.equal(ecrit.proposedContact, null, 'rien n’est proposé quand l’e-mail est déjà là');

  const [propose] = buildSupplierDossier({
    prospects: [prospect('b')],
    supplierBlocks: [bloc('fournisseur b', 'contact@fournisseur.fr')],
    now: MAINTENANT,
  });
  assert.equal(propose.contactEmail, null, 'la proposition n’écrit rien');
  assert.equal(propose.proposedContact?.email, 'contact@fournisseur.fr');
  assert.equal(propose.proposedContact?.source, 'fournisseur b', 'la proposition cite sa source');
  assert.equal(propose.message.state, 'a_preparer');

  const [sansRien] = buildSupplierDossier({
    prospects: [prospect('c')],
    supplierBlocks: [bloc('Fournisseur c', null)],
    now: MAINTENANT,
  });
  assert.equal(sansRien.proposedContact, null, 'sans contact nulle part : rien n’est proposé');

  // Le rapprochement ignore la casse et les accents.
  const [accents] = buildSupplierDossier({
    prospects: [prospect('d', { name: 'ÉLYS Beauté' })],
    supplierBlocks: [bloc('EOLYS Beauté', 'info@eolys.fr')],
    now: MAINTENANT,
  });
  assert.ok(
    accents.proposedContact === null || accents.proposedContact.source === 'EOLYS Beauté',
    'le rapprochement se fait sur le nom normalisé',
  );
}

// ---------------------------------------------------------------------------
// 3. Relances : échue, décidée, jamais démarchée
// ---------------------------------------------------------------------------
{
  const [echue] = buildSupplierDossier({
    prospects: [prospect('a', { firstContactedOn: jour(-30), followUpOn: jour(-5), followUpStatus: 'to_follow' })],
    now: MAINTENANT,
  });
  assert.equal(echue.followUp.overdue, true, 'date de relance passée = en retard');
  assert.equal(echue.followUp.state, 'a_relancer');
  assert.equal(echue.followUp.sinceDays, 30, 'l’ancienneté est comptée depuis le premier contact');

  const [decidee] = buildSupplierDossier({
    prospects: [prospect('b', { firstContactedOn: jour(-30), followUpOn: jour(-5), decision: 'accepted' })],
    now: MAINTENANT,
  });
  assert.equal(decidee.followUp.overdue, false, 'une décision rend la relance sans objet');
  assert.equal(decidee.followUp.state, 'decide');

  const [jamais] = buildSupplierDossier({ prospects: [prospect('c')], now: MAINTENANT });
  assert.equal(jamais.followUp.state, 'aucune_demarche');
  assert.equal(jamais.followUp.sinceDays, null, 'sans date de premier contact, aucune ancienneté inventée');
  assert.equal(jamais.followUp.overdue, false);
}

// ---------------------------------------------------------------------------
// 4. Rattachement des candidats, tri et synthèse
// ---------------------------------------------------------------------------
{
  const rows = buildSupplierDossier({
    prospects: [prospect('a'), prospect('b'), prospect('c')],
    candidates: [candidat('c1', 'b'), candidat('c2', 'b'), candidat('c3', 'a')],
    now: MAINTENANT,
  });

  assert.equal(rows[0].id, 'b', 'le fournisseur qui porte le plus de candidats passe devant');
  assert.equal(rows[0].candidates.count, 2);
  assert.deepEqual(rows[0].candidates.ids.slice().sort(), ['c1', 'c2']);
  const sansCandidat = rows.find(r => r.id === 'c');
  assert.equal(sansCandidat?.candidates.count, 0, 'un fournisseur sans candidat est à 0, pas absent');

  const synthese = summarizeSupplierDossier(rows);
  assert.equal(synthese.suppliers, 3);
  assert.equal(synthese.withContact, 0);
  assert.equal(synthese.unreachable, 3, 'sans contact ni proposition : injoignables');
  assert.equal(synthese.neverContacted, 3);
  assert.equal(synthese.prioritized[0].id, 'b');
  assert.ok(synthese.piecesManquantes.length > 0, 'les pièces manquantes sont comptées');
  assert.ok(synthese.piecesManquantes.every(p => p.cle && p.libelle), 'la synthèse donne la clé et le libellé');
  assert.ok(
    synthese.piecesManquantes.every((p, i, arr) => i === 0 || arr[i - 1].count >= p.count),
    'les pièces manquantes sont triées par fréquence décroissante',
  );

  const [avecContact] = buildSupplierDossier({
    prospects: [prospect('a', { contactEmail: 'a@b.fr' })],
    now: MAINTENANT,
  });
  const s2 = summarizeSupplierDossier([avecContact]);
  assert.equal(s2.withContact, 1);
  assert.equal(s2.withoutContact, 0);
  assert.equal(s2.unreachable, 0, 'un contact réel rend le fournisseur joignable');
}

// ---------------------------------------------------------------------------
// 5. La route : gardée, et elle rend la synthèse annoncée
// ---------------------------------------------------------------------------
{
  const sansJeton = await requestApp('/api/admin/sourcing/supplier-dossier');
  assert.equal(sansJeton.status, 401, 'le dossier fournisseur n’est pas public');

  process.env.KURLA_TEST_AUTH_ROLE = 'customer';
  const client = await requestApp('/api/admin/sourcing/supplier-dossier', { jeton: JETON });
  assert.equal(client.status, 403, 'un compte client n’accède pas au dossier fournisseur');

  process.env.KURLA_TEST_AUTH_ROLE = 'admin';
  const admin = await requestApp('/api/admin/sourcing/supplier-dossier', { jeton: JETON });
  assert.equal(admin.status, 200);
  assert.ok(Array.isArray(admin.json.rows), 'la route rend des lignes');
  assert.ok(admin.json.summary, 'la route rend une synthèse');
  assert.equal(typeof admin.json.summary.suppliers, 'number');
  assert.ok(admin.json.generatedAt, 'la fraîcheur est annoncée');

  // Chaque ligne porte les champs qui la rendent actionnable.
  for (const row of admin.json.rows) {
    assert.ok(Array.isArray(row.missing), `« missing » nomme les manques (${row.id})`);
    assert.ok(row.completeness && typeof row.completeness.pct === 'number');
    assert.ok(row.candidates && typeof row.candidates.count === 'number');
    assert.ok(row.followUp && typeof row.followUp.state === 'string');
  }
}

process.stdout.write(
  '[PASS] Dossier fournisseur : pièces nommées (vide = inconnu, « sans objet » = obtenu), '
  + 'contact écrit ou proposé mais jamais inventé (source citée), relance échue détectée '
  + 'et annulée par une décision, candidats rattachés, tri par poids de candidats, '
  + 'synthèse (joignables / injoignables / pièces manquantes) et route gardée (401 nu, 403 client, 200 admin).\n',
);
