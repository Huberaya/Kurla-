#!/usr/bin/env node
/**
 * SONDE DE PRODUCTION — débusquer les silences.
 * ============================================
 *
 * Pourquoi ce fichier existe :
 *
 * Un endpoint qui casse renvoie du 500 et tout le monde le voit. Un
 * endpoint qui répond **200 avec un tableau vide** ne renvoie rien : pas
 * d'erreur, pas d'alerte, une page blanche. Mesuré deux fois sur
 * `/api/peau/gamme` :
 *
 *   - un filtre trop strict (publishedOnly appliqué là où il ne fallait
 *     pas) ramenait 0 fiche sur 16 présentes, sans erreur ;
 *   - seize fiches repassées en `catalog_status = 'draft'` ont vidé la
 *     route du jour au lendemain, toujours sans erreur.
 *
 * Les bancs ne peuvent pas voir ces pannes : ils tournent en mémoire, avec
 * leurs propres jeux d'essai. Cette sonde interroge la vraie production.
 *
 * Emploi :
 *
 *   KURLA_PROD_URL=https://kurlabeauty.vercel.app node scripts/probe-production.mjs
 *   node scripts/probe-production.mjs --url https://… --strict
 *
 *   --strict  un silence compte comme un échec (code de sortie 1)
 *
 * Codes de sortie : 0 rien d'anormal · 1 anomalie (erreur, ou silence en
 * mode strict) · 2 URL absente.
 *
 * Ajouter un endpoint : compléter `ENDPOINTS`. Les marqueurs `:productId`
 * sont remplacés par un identifiant réel lu au moment du sondage.
 */

const args = process.argv.slice(2);
const indice = (nom) => args.indexOf(nom);
const url = process.env.KURLA_PROD_URL || (indice('--url') >= 0 ? args[indice('--url') + 1] : '');
const strict = args.includes('--strict');

if (!url) {
  console.error('URL manquante : KURLA_PROD_URL=https://… node scripts/probe-production.mjs');
  process.exit(2);
}

const base = url.replace(/\/+$/, '');

// Endpoints publics en lecture. Ceux qui exigent un identifiant utilisent
// les marqueurs :productId / :slug, résolus plus bas.
const ENDPOINTS = [
  '/api/health',
  '/api/products',
  '/api/peau/gamme',
  '/api/professionals',
  '/api/supabase/status',
  '/api/stripe/status',
  '/api/products/:productId/trust',
  '/api/products/:productId/verification',
  '/api/cart',
  '/api/notifications',
  '/api/orders',
  '/api/professional/me',
  '/api/support/tickets',
  '/api/shipping/addresses',
  '/api/notification-preferences',
];

// Ces routes ne doivent JAMAIS répondre à vide : un vide y est une panne,
// pas une absence de données. Réglé sur l'incident du 11/09/2026.
const CRITIQUES = ['/api/products', '/api/peau/gamme', '/api/health'];

// À l'inverse, un vide est l'état normal de celles-ci : un visiteur qui
// n'a pas encore de panier n'est pas une anomalie. Les nommer évite de
// prendre un état attendu pour une panne — et réciproquement.
const VIDES_ATTENDUS = ['/api/cart', '/api/notifications', '/api/orders'];

const DELAI_MS = 15000;

async function sonder({ modele, chemin }) {
  const cible = `${base}${chemin}`;
  const debut = Date.now();
  try {
    const reponse = await fetch(cible, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(DELAI_MS),
    });
    const corps = await reponse.text();
    const duree = Date.now() - debut;
    let json = null;
    try { json = JSON.parse(corps); } catch { /* HTML ou texte : pas un JSON */ }

    // Un endpoint protégé qui refuse proprement n'est pas une anomalie.
    if (reponse.status === 401 || reponse.status === 403) {
      return { modele, chemin, statut: reponse.status, classe: 'protégé', duree };
    }
    if (reponse.status === 404 || reponse.status === 400) {
      return { modele, chemin, statut: reponse.status, classe: 'paramètre requis', duree };
    }
    if (reponse.status >= 500) {
      return { modele, chemin, statut: reponse.status, classe: 'erreur serveur', duree };
    }

    if (json === null ? corps.trim().length === 0 : estVide(json)) {
      // Le gabarit, jamais le chemin résolu : `/api/products` est critique,
      // `/api/products/:productId/trust` ne l'est pas — les comparer par
      // préfixe rendait critique tout ce qui commence comme elles.
      if (CRITIQUES.includes(modele)) {
        return { modele, chemin, statut: reponse.status, classe: 'silence critique', duree };
      }
      if (VIDES_ATTENDUS.includes(modele)) {
        return { modele, chemin, statut: reponse.status, classe: 'vide attendu', duree };
      }
      return {
        modele, chemin, statut: reponse.status,
        classe: json !== null && expliqueSonVide(json) ? 'vide expliqué' : 'silence',
        duree,
      };
    }
    return { modele, chemin, statut: reponse.status, classe: 'ok', taille: tailleDe(json), duree };
  } catch (erreur) {
    const duree = Date.now() - debut;
    const classe = erreur?.name === 'TimeoutError' ? 'délai dépassé' : 'réseau';
    return { modele, chemin, statut: 0, classe, duree, detail: erreur?.message ?? String(erreur) };
  }
}

/**
 * Un 200 peut être vide de bien des façons : `[]`, `{ fiches: [] }`,
 * `{ count: 0 }`… On les reconnaît toutes, sinon le silence passe.
 */
function estVide(json) {
  if (Array.isArray(json)) return json.length === 0;
  if (json === null || json === undefined) return true;
  if (typeof json !== 'object') return String(json).trim() === '';
  if ('count' in json && Number(json.count) === 0) return true;
  const cles = Object.keys(json);
  if (cles.length === 0) return true;
  // Un objet qui ne porte que des compteurs à zéro est vide lui aussi.
  const porteuses = cles.filter((cle) => Array.isArray(json[cle]));
  if (porteuses.length > 0) return porteuses.every((cle) => json[cle].length === 0);
  return cles.every((cle) => Number(json[cle]) === 0);
}

/**
 * Un vide expliqué n'est pas un silence : `/api/professionals` répond
 * « aucun professionnel vérifié n'a encore été approuvé » plutôt qu'un
 * tableau vide. C'est la règle que cette sonde encourage — tout endpoint
 * qui peut légitimement être vide doit dire pourquoi.
 */
function expliqueSonVide(json) {
  if (!json || typeof json !== 'object') return false;
  const CLES = ['note', 'message', 'reason', 'raison', 'motif', 'limitation', 'explanation', 'unavailable', 'indisponible'];
  return Object.keys(json).some((cle) => CLES.includes(cle.toLowerCase()) && String(json[cle]).trim().length > 0);
}

function tailleDe(json) {
  if (Array.isArray(json)) return `${json.length} élément(s)`;
  if (json && typeof json === 'object') {
    if ('count' in json) return `count=${json.count}`;
    const liste = Object.keys(json).find((cle) => Array.isArray(json[cle]));
    if (liste) return `${liste}=${json[liste].length}`;
  }
  return 'données';
}

async function resoudreMarqueurs() {
  // Un identifiant réel, lu au moment du sondage : coder un identifiant en
  // dur ferait sonder une fiche qui peut disparaître, et le vide qui en
  // résulterait serait pris pour une panne.
  try {
    const reponse = await fetch(`${base}/api/products`, { signal: AbortSignal.timeout(DELAI_MS) });
    if (!reponse.ok) return { productId: '' };
    const json = await reponse.json();
    const liste = Array.isArray(json) ? json : (json.products ?? json.produits ?? []);
    const premier = liste[0];
    return { productId: premier ? (premier.slug ?? premier.id ?? '') : '' };
  } catch {
    return { productId: '' };
  }
}

const { productId } = await resoudreMarqueurs();
const cibles = ENDPOINTS.map((modele) => ({
  modele,
  chemin: modele.replace(':productId', productId || 'produit-inconnu'),
}));

console.log(`Sonde de production — ${base}`);
console.log(`${cibles.length} endpoints · identifiant produit : ${productId || 'non résolu'}\n`);

const resultats = [];
// Par petits paquets : sonder 15 routes d'un coup, c'est se faire limiter
// le débit par l'hébergeur et lire des 429 déguisés en pannes.
const TAILLE = 4;
for (let i = 0; i < cibles.length; i += TAILLE) {
  const lot = cibles.slice(i, i + TAILLE);
  resultats.push(...await Promise.all(lot.map(sonder)));
}

const parClasse = {};
for (const r of resultats) (parClasse[r.classe] ??= []).push(r);

const MARQUES = {
  ok: '  ok  ',
  'silence critique': 'VIDE !',
  silence: 'VIDE  ',
  'vide expliqué': 'vide ·',
  'vide attendu': 'vide  ',
};

for (const r of resultats) {
  const marque = MARQUES[r.classe] ?? ' --   ';
  const detail = r.classe === 'ok' ? r.taille : (r.detail ?? `statut ${r.statut}`);
  console.log(`${marque} ${String(r.statut).padStart(3)}  ${r.chemin.padEnd(46)} ${detail}`);
}

const silences = [...(parClasse.silence ?? []), ...(parClasse['silence critique'] ?? [])];
const expliques = parClasse['vide expliqué'] ?? [];
const erreurs = [
  ...(parClasse['erreur serveur'] ?? []),
  ...(parClasse['délai dépassé'] ?? []),
  ...(parClasse.réseau ?? []),
];

console.log('\n— bilan —');
console.log(`  ${resultats.filter((r) => r.classe === 'ok').length} ok`);
console.log(`  ${silences.length} silence(s) (200 à vide, non expliqué)`);
console.log(`  ${expliques.length} vide(s) expliqué(s)`);
console.log(`  ${erreurs.length} erreur(s)`);
console.log(`  ${(parClasse['protégé'] ?? []).length + (parClasse['paramètre requis'] ?? []).length} protégé(s) ou à paramètre`);

if (silences.length > 0) {
  console.log('\nUn silence n’est pas une preuve d’absence : avant de corriger,');
  console.log('vérifier si la base contient bien les données attendues.');
}

const bloquant = erreurs.length > 0
  || silences.some((s) => s.classe === 'silence critique')
  || (strict && silences.length > 0);
process.exit(bloquant ? 1 : 0);
