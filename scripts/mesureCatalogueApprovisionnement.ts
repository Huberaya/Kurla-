/**
 * RELEVÉ — état réel du catalogue et de l'approvisionnement (lecture seule).
 *
 * Sert à chiffrer une proposition : combien de fiches sont en boutique sans
 * satisfaire les critères, combien sont prêtes à y entrer, combien de
 * candidats dorment dans l'approvisionnement. Aucune écriture : le scan de
 * porte ne fait que proposer, il n'applique rien.
 *
 *   KURLA_STORE_MODE=supabase SUPABASE_URL=… SUPABASE_SECRET_KEY=… \
 *   KURLA_TEST_AUTH_ROLE=admin tsx scripts/mesureCatalogueApprovisionnement.ts
 */
process.env.NODE_ENV = 'test';
process.env.KURLA_TEST_AUTH_ROLE = 'admin';
process.env.KURLA_TEST_AUTH_TOKEN = 'mesure-locale-2026';
process.env.KURLA_TEST_AUTH_USER_ID = '00000000-0000-0000-0000-000000000001';
process.env.KURLA_TEST_NO_SERVER = 'true';

// Le client Supabase exige un WebSocket natif, absent de Node 20 (présent en
// 22+). On fournit l'implémentation avant tout import du client, sinon chaque
// lecture échoue en 500.
import { WebSocket } from 'ws';
if (!(globalThis as any).WebSocket) (globalThis as any).WebSocket = WebSocket;

import http from 'node:http';

const serverModule = await import('../server');

const listener = http.createServer(serverModule.app);
await new Promise<void>((resolve) => listener.listen(0, '127.0.0.1', () => resolve()));
const adresse = listener.address();
const port = typeof adresse === 'object' && adresse ? adresse.port : 0;
const base = `http://127.0.0.1:${port}`;

async function lire(chemin: string, methode: 'GET' | 'POST' = 'GET') {
  const reponse = await fetch(base + chemin, {
    method: methode,
    headers: { Authorization: `Bearer ${process.env.KURLA_TEST_AUTH_TOKEN}` },
  });
  if (!reponse.ok) throw new Error(`${chemin} → ${reponse.status}`);
  return reponse.json();
}

try {
  const produits = await lire('/api/admin/catalog/products');
  const liste: any[] = Array.isArray(produits) ? produits : (produits?.products ?? []);
  const parStatut = new Map<string, number>();
  let fichesTest = 0;
  for (const p of liste) {
    const statut = String(p?.catalogStatus ?? p?.catalog_status ?? 'inconnu');
    parStatut.set(statut, (parStatut.get(statut) ?? 0) + 1);
    if (p?.truth?.isTestListing === true || p?.isTestListing === true || p?.is_test_listing === true) fichesTest += 1;
  }

  const porte = await lire('/api/admin/catalog/gate/scan', 'POST');
  const propositions: any[] = porte?.proposals ?? [];
  const publier = propositions.filter((p) => p.action === 'publish');
  const retirer = propositions.filter((p) => p.action === 'withdraw');

  const derogations = await lire('/api/admin/catalog/derogations').catch(() => null);
  const nbDerogations = Array.isArray(derogations) ? derogations.length : (derogations?.items ?? derogations?.derogations ?? []).length;

  const candidats = await lire('/api/admin/sourcing/candidates').catch(() => null);
  const nbCandidats = Array.isArray(candidats) ? candidats.length : (candidats?.candidates ?? candidats?.items ?? []).length;

  const prospectsBruts = await lire('/api/admin/sourcing/prospects').catch(() => null);
  const listeProspects: any[] = Array.isArray(prospectsBruts) ? prospectsBruts : (prospectsBruts?.prospects ?? prospectsBruts?.items ?? []);
  const consolide = await lire('/api/admin/sourcing/consolidated').catch(() => null);
  const totalConsolide = consolide?.total ?? (Array.isArray(consolide?.rows) ? consolide.rows.length : null);

  console.log('\n=== CATALOGUE ===');
  console.log(`  fiches au total            : ${liste.length}`);
  for (const [statut, n] of [...parStatut].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${statut.padEnd(14)} : ${n}`);
  }
  console.log(`  fiches de test             : ${fichesTest}`);
  console.log(`  dérogations enregistrées   : ${nbDerogations}`);

  console.log('\n=== PORTE (propositions, rien n est appliqué) ===');
  console.log(`  à publier (prêtes)         : ${publier.length}`);
  console.log(`  à retirer (non conformes)  : ${retirer.length}`);
  console.log('\n  exemples de retraits proposés :');
  for (const p of retirer.slice(0, 8)) console.log(`    - ${p.name} — ${p.reason}`);
  if (retirer.length > 8) console.log(`    … et ${retirer.length - 8} autres`);
  console.log('\n  exemples de publications proposées :');
  for (const p of publier.slice(0, 5)) console.log(`    - ${p.name} — ${p.reason}`);


  // Répartition réelle : le croisement statut × état d'aptitude.
  const { evaluateKurlaReady } = await import('../src/lib/kurlaReadyScore');
  const croise = new Map<string, Map<string, number>>();
  const bloquantsFrequents = new Map<string, number>();
  for (const p of liste) {
    const statut = String(p?.catalogStatus ?? p?.catalog_status ?? 'inconnu');
    const r = evaluateKurlaReady(p);
    if (!croise.has(statut)) croise.set(statut, new Map());
    const ligne = croise.get(statut)!;
    ligne.set(r.state, (ligne.get(r.state) ?? 0) + 1);
    for (const b of r.hardBlockers) bloquantsFrequents.set(String(b), (bloquantsFrequents.get(String(b)) ?? 0) + 1);
  }

  console.log('\n=== STATUT x APTITUDE (le croisement qui manquait) ===');
  console.log('  statut       | bloqué | partiel | prêt');
  for (const [statut, ligne] of croise) {
    const b = ligne.get('blocked') ?? 0;
    const pa = ligne.get('partial') ?? 0;
    const pr = ligne.get('ready') ?? 0;
    console.log(`  ${statut.padEnd(12)} | ${String(b).padStart(6)} | ${String(pa).padStart(7)} | ${String(pr).padStart(4)}`);
  }

  console.log('\n=== BLOQUANTS LES PLUS FREQUENTS ===');
  for (const [b, n] of [...bloquantsFrequents].sort((a, b2) => b2[1] - a[1]).slice(0, 10)) {
    console.log(`  ${String(n).padStart(4)} x ${b.slice(0, 90)}`);
  }

  console.log('\n=== APPROVISIONNEMENT ===');

  // Le versant approvisionnement : que sait-on des candidats ?
  const listeCandidats: any[] = Array.isArray(candidats) ? candidats : (candidats?.candidates ?? candidats?.items ?? []);
  if (listeCandidats.length) {
    console.log('\n=== CANDIDATS : ce qu on sait d eux ===');
    const clefs = Object.keys(listeCandidats[0] ?? {});
    console.log('  champs disponibles :', clefs.join(', ').slice(0, 200));
    console.log('  trois exemples :');
    for (const c of listeCandidats.slice(0, 3)) {
      console.log('    ', JSON.stringify({ marque: c.brand, produit: c.product, categorie: c.category, via: c.sourcedVia, prospect: c.prospectId }));
    }
    const parSource = new Map<string, number>();
    for (const c of listeCandidats) {
      const v = String(c?.sourcedVia ?? 'non renseigné');
      parSource.set(v, (parSource.get(v) ?? 0) + 1);
    }
    console.log('  par source (sourcedVia) :');
    for (const [v, n] of [...parSource].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`    ${v.padEnd(40)} : ${n}`);
    const avecProspect = listeCandidats.filter((c) => c?.prospectId).length;
    console.log(`  rattachés à un prospect (fournisseur) : ${avecProspect} / ${listeCandidats.length}`);
    const compteur = (pred: (c: any) => boolean) => listeCandidats.filter(pred).length;
    const nonVide = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '';
    console.log(`  total                     : ${listeCandidats.length}`);
    console.log(`  avec un fournisseur nommé : ${compteur((c) => nonVide(c?.supplierName ?? c?.supplier_name ?? c?.supplier))}`);
    console.log(`  avec un contact           : ${compteur((c) => nonVide(c?.supplierContact ?? c?.contact ?? c?.email))}`);
    console.log(`  avec un prix              : ${compteur((c) => c?.priceEur !== null && c?.priceEur !== undefined && nonVide(c?.price ?? c?.priceEur))}`);
    const parEtat = new Map<string, number>();
    for (const c of listeCandidats) {
      const e = String(c?.status ?? c?.etat ?? c?.state ?? 'sans état');
      parEtat.set(e, (parEtat.get(e) ?? 0) + 1);
    }

    // Les jalons du processus d'achat, tels que le modèle les encode déjà.
    const jalons = ['inciReceived', 'ingredientsMapped', 'sampleValidated', 'visualsReceived', 'go'];
    console.log('\n  jalons d achat des candidats :');
    for (const j of jalons) {
      const oui = listeCandidats.filter((c) => c?.[j] === true).length;
      const non = listeCandidats.filter((c) => c?.[j] === false).length;
      const vide = listeCandidats.length - oui - non;
      console.log(`    ${j.padEnd(20)} oui=${String(oui).padStart(3)} non=${String(non).padStart(3)} non renseigne=${String(vide).padStart(3)}`);
    }
    const complets = listeCandidats.filter((c) => jalons.every((j) => c?.[j] === true));
    console.log(`\n  candidats AU VERT sur les 5 jalons : ${complets.length} / ${listeCandidats.length}`);
    for (const c of complets.slice(0, 10)) console.log(`    - ${c.brand} ${c.product} (marge ${c.marginPct ?? '?'} %, Qté ${c.firstOrderQty ?? '?'})`);

    const avecMarge = listeCandidats.filter((c) => typeof c?.marginPct === 'number');
    if (avecMarge.length) {
      const marges = avecMarge.map((c) => c.marginPct).sort((a, b) => a - b);
      const mediane = marges[Math.floor(marges.length / 2)];
      console.log(`\n  marge : ${avecMarge.length} candidats renseignés, médiane ${mediane} %, min ${marges[0]} %, max ${marges[marges.length - 1]} %`);
      console.log(`  marges négatives ou nulles : ${marges.filter((m) => m <= 0).length}`);
    }
    const avecPrix = listeCandidats.filter((c) => typeof c?.purchasePriceCents === 'number' && c.purchasePriceCents > 0);
    console.log(`  prix d achat renseigné : ${avecPrix.length} / ${listeCandidats.length}`);

    if (parEtat.size) {
      console.log('  par état :');
      for (const [e, n] of [...parEtat].sort((a, b) => b[1] - a[1])) console.log(`    ${e.padEnd(24)} : ${n}`);
    }
  }
  console.log(`  candidats                  : ${nbCandidats}`);
  console.log(`  lignes de la vue consolidée: ${totalConsolide ?? 'non lue'}`);
  const lignes: any[] = Array.isArray(consolide?.rows) ? consolide.rows : [];
  if (lignes.length) {
    console.log('    champs :', Object.keys(lignes[0] ?? {}).join(', ').slice(0, 200));
    const nonVide2 = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '';
    const c = (pred: (l: any) => boolean) => lignes.filter(pred).length;
    console.log(`    avec fournisseur nommé : ${c((l) => nonVide2(l?.supplierName))} / ${lignes.length}`);
    console.log(`    avec contact           : ${c((l) => nonVide2(l?.supplierContact))} / ${lignes.length}`);
    console.log(`    avec prix              : ${c((l) => typeof l?.priceEur === 'number' && l.priceEur > 0)} / ${lignes.length}`);
    console.log(`    e-mail prêt            : ${c((l) => l?.emailState === 'pret')} / ${lignes.length}`);
    const parType = new Map<string, number>();
    for (const l of lignes) parType.set(String(l?.kind), (parType.get(String(l?.kind)) ?? 0) + 1);
    console.log(`    par nature : ${[...parType].map(([k, n]) => k + '=' + n).join(', ')}`);
  }
  console.log(`  prospects (fournisseurs)   : ${listeProspects.length}`);
  if (listeProspects.length) {
    const clefsP = Object.keys(listeProspects[0] ?? {});
    console.log('    champs prospect :', clefsP.join(', ').slice(0, 220));
    const avecContact = listeProspects.filter((p2) => p2?.contact || p2?.email || p2?.contactEmail).length;
    console.log(`    avec un contact renseigné : ${avecContact} / ${listeProspects.length}`);
  }
} finally {
  await new Promise<void>((resolve) => listener.close(() => resolve()));
}
