#!/usr/bin/env node
/**
 * CONTRÔLE DES DONNÉES DE PRODUCTION — la dérive entre deux déploiements.
 * ======================================================================
 *
 * La sonde d'endpoints attrape une route vide ou cassée. Elle ne voit ni
 * « 63 produits → 40 », ni un prix tombé à zéro, ni une fiche publiée mais
 * inactive. Ce programme énonce des invariants et les vérifie contre la
 * base et l'API publique.
 *
 * Emploi :
 *
 *   SUPABASE_URL=https://… SUPABASE_SECRET_KEY=… \
 *   KURLA_PROD_URL=https://… node scripts/verifier-donnees.mjs
 *
 *   --reference <fichier>  référence des maximums connus
 *                          (défaut .kurla-donnees-production.json)
 *   --sans-api             ne pas interroger l'API publique (base seule)
 *
 * Codes de sortie : 0 rien d'anormal · 1 anomalie ou vérification impossible ·
 * 2 accès à la base non fourni.
 *
 * Sur `--reference` : le fichier n'est pas dans le dépôt (gitignored, comme
 * l'état du schéma). En intégration continue, il est conservé par le cache de
 * l'action ; sans lui, le premier passage écrit la référence et ne conclut
 * rien — on ne compare pas à ce qu'on n'a pas.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

import {
  ETATS,
  INVARIANTS,
  bilan,
  evaluer,
  invariantsNonEvalues,
  nouvelleReference,
  surplusDoublons
} from './lib/donnees.mjs';

const args = process.argv.slice(2);
const valeur = (nom, defaut) => {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] !== undefined ? String(args[i + 1]) : defaut;
};

const urlBase = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const cle = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const prodUrl = (process.env.KURLA_PROD_URL || '').replace(/\/+$/, '');
const sansApi = args.includes('--sans-api');
const fichierReference = valeur('--reference', '.kurla-donnees-production.json');

if (!urlBase || !cle) {
  console.error('Accès à la base non fourni.');
  console.error('  SUPABASE_URL=https://… SUPABASE_SECRET_KEY=… node scripts/verifier-donnees.mjs');
  console.error('\nLes données ne sont donc PAS vérifiées : ne pas conclure de ce silence');
  console.error('qu’elles sont conformes.');
  process.exit(2);
}

const entetes = { apikey: cle, Authorization: `Bearer ${cle}` };

/** Compte les lignes. `count=exact` + `head` : PostgreSQL compte, rien ne voyage. */
async function compter(chemin) {
  try {
    const reponse = await fetch(`${urlBase}/rest/v1/${chemin}`, {
      headers: { ...entetes, Prefer: 'count=exact' }
    });
    if (!reponse.ok) {
      return { valeur: null, erreur: `HTTP ${reponse.status} sur ${chemin}` };
    }
    const total = (reponse.headers.get('content-range') || '').split('/')[1];
    const nombre = Number(total);
    await reponse.text();
    return Number.isFinite(nombre) ? { valeur: nombre } : { valeur: null, erreur: `compte illisible (${total})` };
  } catch (erreur) {
    return { valeur: null, erreur: erreur?.message || String(erreur) };
  }
}

/** Lit un compte servi par l'API publique — ce que voit réellement un visiteur. */
async function compterParApi(chemin) {
  if (sansApi) return { valeur: null, erreur: 'API non interrogée (--sans-api)' };
  if (!prodUrl) return { valeur: null, erreur: 'KURLA_PROD_URL absente' };
  try {
    const reponse = await fetch(`${prodUrl}${chemin}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    if (!reponse.ok) return { valeur: null, erreur: `HTTP ${reponse.status} sur ${chemin}` };
    const json = await reponse.json();
    const nombre = typeof json?.count === 'number'
      ? json.count
      : Array.isArray(json?.fiches) ? json.fiches.length
        : Array.isArray(json?.products) ? json.products.length
          : null;
    return nombre === null ? { valeur: null, erreur: `compte absent de la réponse ${chemin}` } : { valeur: nombre };
  } catch (erreur) {
    return { valeur: null, erreur: erreur?.message || String(erreur) };
  }
}

const PUBLIES = 'products?select=id&catalog_status=eq.published&is_active=eq.true';
/** Même population, avec de quoi comparer les noms : le doublon ne se voit pas sur un identifiant. */
const PUBLIES_NOMS = 'products?select=id,name,brand&catalog_status=eq.published&is_active=eq.true';

/**
 * Compte les fiches publiées **en trop** : mêmes marque et nom, plusieurs fois.
 * Une lecture qui échoue rend `null`, jamais 0 — on ne confond pas « aucun
 * doublon » avec « je n'ai pas pu regarder ».
 */
async function compterDoublonsPublies() {
  try {
    const reponse = await fetch(`${urlBase}/rest/v1/${PUBLIES_NOMS}`, { headers: entetes });
    if (!reponse.ok) return { valeur: null, erreur: `HTTP ${reponse.status} sur les fiches publiées` };
    const lignes = await reponse.json();
    if (!Array.isArray(lignes)) return { valeur: null, erreur: 'réponse inattendue (tableau attendu)' };
    const surplus = surplusDoublons(lignes);
    return surplus === null ? { valeur: null, erreur: 'comptage impossible' } : { valeur: surplus };
  } catch (erreur) {
    return { valeur: null, erreur: erreur?.message || String(erreur) };
  }
}

/**
 * Compte les fiches dont la provenance déclarée porte un marqueur de sécurité.
 *
 * Ces marqueurs sont lus par la couche de vérité (`isFormulationTarget`,
 * `hasPlaceholderMarker`) pour ne jamais présenter un projet de formulation ou
 * un visuel d'illustration comme un produit existant. Le compte ne doit pas
 * baisser : une baisse signifie qu'un marqueur a été écrasé par un nom de
 * fournisseur, et rien d'autre ne le verrait.
 */
async function compterMarqueursSecurite() {
  try {
    const reponse = await fetch(`${urlBase}/rest/v1/products?select=id,source_supplier`, { headers: entetes });
    if (!reponse.ok) return { valeur: null, erreur: `HTTP ${reponse.status} sur les provenances` };
    const lignes = await reponse.json();
    if (!Array.isArray(lignes)) return { valeur: null, erreur: 'réponse inattendue (tableau attendu)' };
    const valeur = lignes.filter((l) => /formulation|illustration/i.test(String(l.source_supplier || ''))).length;
    return { valeur };
  } catch (erreur) {
    return { valeur: null, erreur: erreur?.message || String(erreur) };
  }
}

console.log(`Contrôle des données — ${new URL(urlBase).host}${prodUrl ? ` · ${prodUrl}` : ' (base seule)'}`);

const [
  produitsPublies,
  prixNul,
  prixNulOuNul,
  sansSource,
  sourceVide,
  sansFournisseurId,
  doublonsPublies,
  publiesInactifs,
  sansMiseAJour,
  produitsServis,
  gammePeau
] = await Promise.all([
  compter(`${PUBLIES}&limit=1`),
  compter(`${PUBLIES}&price=is.null&limit=1`),
  compter(`${PUBLIES}&price=lte.0&limit=1`),
  compter(`${PUBLIES}&source_supplier=is.null&limit=1`),
  compter(`${PUBLIES}&source_supplier=eq.&limit=1`),
  compter(`${PUBLIES}&supplier_id=is.null&limit=1`),
  compterDoublonsPublies(),
  compter('products?select=id&catalog_status=eq.published&is_active=eq.false&limit=1'),
  compter('products?select=id&updated_at=is.null&limit=1'),
  compterParApi('/api/products'),
  compterParApi('/api/peau/gamme')
]);

/** Deux lectures partielles se combinent ; si l'une a échoué, la somme aussi. */
function somme(...mesures) {
  if (mesures.some((m) => m.valeur === null)) {
    return { valeur: null, erreur: mesures.map((m) => m.erreur).filter(Boolean).join(' · ') };
  }
  return { valeur: mesures.reduce((total, m) => total + m.valeur, 0) };
}

const mesures = {
  produits_publies: produitsPublies,
  produits_servis: produitsServis,
  gamme_peau: gammePeau,
  prix_manquant: somme(prixNul, prixNulOuNul),
  source_manquante: somme(sansSource, sourceVide),
  provenance_manquante: sansFournisseurId,
  doublons_publies: doublonsPublies,
  publies_inactifs: publiesInactifs,
  updated_at_manquant: sansMiseAJour,
  marqueurs_securite: await compterMarqueursSecurite()
};

const manquants = invariantsNonEvalues(mesures);
if (manquants.length > 0) {
  console.error(`Invariant(s) déclaré(s) mais jamais mesuré(s) : ${manquants.join(', ')}`);
  process.exit(1);
}

let reference = {};
if (existsSync(fichierReference)) {
  try {
    reference = JSON.parse(readFileSync(fichierReference, 'utf8'));
  } catch {
    // Un fichier illisible se traite comme une absence : on repart de rien
    // plutôt que d'échouer sur le fichier censé aider.
    console.error(`Référence illisible (${fichierReference}) : repartie de zéro.`);
    reference = {};
  }
}

const MARQUES = { ok: '  ok  ', anomalie: 'ANOMAL', non_verifiable: 'INCONN' };
const resultats = [];

for (const invariant of INVARIANTS) {
  const mesure = mesures[invariant.id];
  const verdict = evaluer(invariant, mesure, reference[invariant.id]?.maximum);
  resultats.push({ id: invariant.id, ...verdict });
  const nombre = mesure.valeur === null ? '—' : String(mesure.valeur);
  console.log(`${MARQUES[verdict.etat] ?? ' --   '} ${invariant.libelle.padEnd(48)} ${nombre.padStart(6)}  ${verdict.detail}`);
  if (verdict.etat !== ETATS.ok) console.log(`         ↳ pourquoi : ${invariant.pourquoi}`);
  if (mesure.valeur !== null && Number.isFinite(mesure.valeur)) {
    reference = nouvelleReference(reference, invariant.id, mesure.valeur);
  }
}

writeFileSync(fichierReference, `${JSON.stringify(reference, null, 2)}\n`);

const compte = bilan(resultats);
console.log(`\n  ${compte.ok} ok · ${compte.anomalies.length} anomalie(s) · ${compte.nonVerifiables.length} impossible(s) à vérifier`);
console.log(`  référence : ${fichierReference}`);

if (compte.anomalies.length > 0) {
  console.log('\nUne baisse n’est pas une preuve de panne, mais c’est une question à poser :');
  console.log('vérifier si le changement est voulu avant de corriger quoi que ce soit.');
}
if (compte.nonVerifiables.length > 0) {
  console.log('\nCe qui n’a pas pu être lu n’est pas conforme : c’est inconnu.');
}

process.exit(compte.bloquant ? 1 : 0);
