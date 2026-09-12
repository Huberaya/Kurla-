/**
 * Cœur de la sonde de production, partagé par les deux outils :
 *
 *   scripts/probe-production.mjs     sonde à la main, pour un diagnostic
 *   scripts/verifier-deploiement.mjs sonde après chaque mise en ligne
 *
 * Les bancs tournent en mémoire : ils ne peuvent pas voir une production
 * tombée. Cette sonde l'interroge, et classe chaque réponse.
 */

export const ENDPOINTS = [
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
export const CRITIQUES = ['/api/products', '/api/peau/gamme', '/api/health'];

// À l'inverse, un vide est l'état normal de celles-ci : un visiteur qui
// n'a pas encore de panier n'est pas une anomalie.
export const VIDES_ATTENDUS = ['/api/cart', '/api/notifications', '/api/orders'];

export const DELAI_MS = 15000;

/**
 * Un 200 peut être vide de bien des façons : `[]`, `{ fiches: [] }`,
 * `{ count: 0 }`… On les reconnaît toutes, sinon le silence passe.
 */
export function estVide(json) {
  if (Array.isArray(json)) return json.length === 0;
  if (json === null || json === undefined) return true;
  if (typeof json !== 'object') return String(json).trim() === '';
  if ('count' in json && Number(json.count) === 0) return true;
  const cles = Object.keys(json);
  if (cles.length === 0) return true;
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
export function expliqueSonVide(json) {
  if (!json || typeof json !== 'object') return false;
  const CLES = ['note', 'message', 'reason', 'raison', 'motif', 'limitation', 'explanation', 'unavailable', 'indisponible'];
  return Object.keys(json).some((cle) => CLES.includes(cle.toLowerCase()) && String(json[cle]).trim().length > 0);
}

export function tailleDe(json) {
  if (Array.isArray(json)) return `${json.length} élément(s)`;
  if (json && typeof json === 'object') {
    if ('count' in json) return `count=${json.count}`;
    const liste = Object.keys(json).find((cle) => Array.isArray(json[cle]));
    if (liste) return `${liste}=${json[liste].length}`;
  }
  return 'données';
}

export async function sonder(base, { modele, chemin }, delaiMs = DELAI_MS) {
  const cible = `${base}${chemin}`;
  const debut = Date.now();
  try {
    const reponse = await fetch(cible, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(delaiMs),
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
      return { modele, chemin, statut: reponse.status, classe: 'erreur serveur', duree, extrait: corps.slice(0, 200) };
    }

    if (json === null ? corps.trim().length === 0 : estVide(json)) {
      const explique = json !== null && expliqueSonVide(json);
      // L'explication est conservée pour être affichée : un vide énoncé se
      // lit, on sait pourquoi la route ne renvoie rien.
      const note = json && typeof json === 'object'
        ? String(json.note ?? json.message ?? json.motif ?? json.raison ?? '').slice(0, 90)
        : '';

      // Le gabarit, jamais le chemin résolu : `/api/products` est critique,
      // `/api/products/:productId/trust` ne l'est pas — les comparer par
      // préfixe rendait critique tout ce qui commence comme elles.
      //
      // Un endpoint critique vide reste une anomalie **même expliqué**.
      // L'explication a failli primer (commit 5536585, dans l'intention
      // louable d'éviter un faux incident) : mais un vide expliqué n'étant
      // plus une anomalie, il sortait aussi de la surveillance, et la
      // régression « 16 fiches visibles → 0 fiches » n'était plus détectée.
      // C'est exactement la panne déjà subie le 11/09/2026.
      //
      // Le faux incident que craignait ce commit est traité ailleurs, et
      // mieux : `verifier-deploiement.mjs` compare à un état de référence
      // et ne bloque que sur les écarts nouveaux.
      if (CRITIQUES.includes(modele)) {
        return { modele, chemin, statut: reponse.status, classe: 'silence critique', explique, note, duree };
      }
      if (explique) {
        return { modele, chemin, statut: reponse.status, classe: 'vide expliqué', note, duree };
      }
      if (VIDES_ATTENDUS.includes(modele)) {
        return { modele, chemin, statut: reponse.status, classe: 'vide attendu', duree };
      }
      return { modele, chemin, statut: reponse.status, classe: 'silence', duree };
    }
    return { modele, chemin, statut: reponse.status, classe: 'ok', taille: tailleDe(json), duree };
  } catch (erreur) {
    const duree = Date.now() - debut;
    const classe = erreur?.name === 'TimeoutError' ? 'délai dépassé' : 'réseau';
    return { modele, chemin, statut: 0, classe, duree, detail: erreur?.message ?? String(erreur) };
  }
}

async function resoudreIdentifiant(base, delaiMs) {
  // Un identifiant réel, lu au moment du sondage : coder un identifiant en
  // dur ferait sonder une fiche qui peut disparaître, et le vide qui en
  // résulterait serait pris pour une panne.
  try {
    const reponse = await fetch(`${base}/api/products`, { signal: AbortSignal.timeout(delaiMs) });
    if (!reponse.ok) return '';
    const json = await reponse.json();
    const liste = Array.isArray(json) ? json : (json.products ?? json.produits ?? []);
    const premier = liste[0];
    return premier ? (premier.slug ?? premier.id ?? '') : '';
  } catch {
    return '';
  }
}

export async function sonderTout(base, options = {}) {
  const { delaiMs = DELAI_MS, endpoints = ENDPOINTS, concurrence = 4, journal = () => {} } = options;
  const productId = await resoudreIdentifiant(base, delaiMs);
  const cibles = endpoints.map((modele) => ({
    modele,
    chemin: modele.replace(':productId', productId || 'produit-inconnu'),
  }));

  const resultats = [];
  // Par petits paquets : sonder 15 routes d'un coup, c'est se faire limiter
  // le débit par l'hébergeur et lire des 429 déguisés en pannes.
  for (let i = 0; i < cibles.length; i += concurrence) {
    const lot = cibles.slice(i, i + concurrence);
    resultats.push(...await Promise.all(lot.map((c) => sonder(base, c, delaiMs))));
    journal(resultats.length, cibles.length);
  }

  const groupe = (classe) => resultats.filter((r) => r.classe === classe);
  return {
    resultats,
    productId,
    ok: groupe('ok'),
    silences: [...groupe('silence'), ...groupe('silence critique')],
    expliques: groupe('vide expliqué'),
    attendus: groupe('vide attendu'),
    proteges: [...groupe('protégé'), ...groupe('paramètre requis')],
    erreurs: [...groupe('erreur serveur'), ...groupe('délai dépassé'), ...groupe('réseau')],
  };
}

/** Le détail affiché pour une ligne de résultat. */
export function detailDe(resultat) {
  if (resultat.classe === 'ok') return resultat.taille ?? '';
  if (resultat.note) return `« ${resultat.note} »`;
  return resultat.detail ?? resultat.extrait ?? `statut ${resultat.statut}`;
}

export const MARQUES = {
  ok: '  ok  ',
  'silence critique': 'VIDE !',
  silence: 'VIDE  ',
  'vide expliqué': 'vide ·',
  'vide attendu': 'vide  ',
};

/** Un résumé tient sur une ligne : « 5 ok · 1 silence · 0 erreur ». */
export function resumer(bilan) {
  return [
    `${bilan.ok.length} ok`,
    `${bilan.silences.length} silence(s)`,
    `${bilan.expliques.length} vide(s) expliqué(s)`,
    `${bilan.attendus.length} vide(s) attendu(s)`,
    `${bilan.erreurs.length} erreur(s)`,
    `${bilan.proteges.length} protégé(s)`,
  ].join(' · ');
}
