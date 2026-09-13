/**
 * CONTRÔLE DES DONNÉES — la dérive silencieuse
 * ============================================
 *
 * Pourquoi ce module, mesuré le 13/09/2026 :
 *
 *   · le schéma est vérifié par `scripts/verifier-schema.mjs`, **à la main** ;
 *   · les endpoints sont sondés toutes les quinze minutes ;
 *   · mais **rien ne surveille le contenu** entre deux déploiements.
 *
 * Et c'est précisément là que les pannes ont eu lieu :
 *
 *   · 16 fiches repassées en `draft` : `/api/peau/gamme` est restée vide
 *     plusieurs jours, sans qu'aucun déploiement ne change ;
 *   · une règle exigeant le SKU fournisseur a vidé la boutique : 63 produits
 *     en base, **0 servi**. La sonde a fini par le voir, mais parce qu'un
 *     humain l'a lancée.
 *
 * La sonde d'endpoints attrape un vide **total**. Elle ne voit pas 63 → 40,
 * ni un prix tombé à zéro, ni une fiche publiée mais inactive. Ce module
 * énonce des invariants et les vérifie.
 *
 * Trois états, jamais deux : `ok`, `anomalie`, et `non_verifiable` — ce
 * dernier n'est **pas** un succès. Une vérification qu'on n'a pas pu faire
 * n'est pas une vérification réussie.
 */

/** En deçà de cette fraction du maximum connu, une baisse est une anomalie. */
export const TOLERANCE_BAISSE = 0.10;

export const ETATS = { ok: 'ok', anomalie: 'anomalie', non_verifiable: 'non_verifiable' };

/**
 * Compare une valeur au maximum déjà observé.
 *
 * Le maximum ne décroît jamais : une lente érosion (63 → 55 → 48) passerait
 * sous le radar si l'on ne comparait qu'à l'observation précédente.
 */
export function comparerAuMaximum(valeur, maximum, tolerance = TOLERANCE_BAISSE) {
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
    return { etat: ETATS.non_verifiable, detail: 'valeur non numérique' };
  }
  if (typeof maximum !== 'number' || !Number.isFinite(maximum) || maximum <= 0) {
    // Premier passage : rien à comparer. Ce n'est ni bien ni mal, c'est inconnu.
    return { etat: ETATS.ok, detail: 'aucun maximum de référence — référence écrite' };
  }
  if (valeur === 0) {
    return { etat: ETATS.anomalie, detail: `tombé à 0 (maximum connu ${maximum})` };
  }
  const plancher = maximum * (1 - tolerance);
  if (valeur < plancher) {
    return { etat: ETATS.anomalie, detail: `${valeur} contre ${maximum} déjà observé (plancher ${Math.ceil(plancher)})` };
  }
  return { etat: ETATS.ok, detail: `${valeur} (maximum connu ${maximum})` };
}

/**
 * Les invariants, dans l'ordre où ils sont énoncés.
 *
 * Chacun porte la raison pour laquelle il existe : un contrôle dont on a
 * oublié la justification finit par être désactivé.
 */
export const INVARIANTS = [
  {
    id: 'produits_publies',
    libelle: 'produits publiés et actifs',
    pourquoi: 'une règle mal appliquée a déjà vidé la boutique entière (12/09/2026)',
    baisse: true
  },
  {
    id: 'produits_servis',
    libelle: 'produits réellement servis par /api/products',
    pourquoi: 'le catalogue peut exister en base sans sortir : c’est exactement la panne du 12/09',
    baisse: true
  },
  {
    id: 'gamme_peau',
    libelle: 'fiches de la gamme peau visibles',
    pourquoi: '16 fiches sont restées invisibles plusieurs jours sans qu’aucun déploiement ne change',
    baisse: true
  },
  {
    id: 'prix_manquant',
    libelle: 'produits publiés sans prix renseigné',
    pourquoi: 'un prix nul rend la fiche invendable et fausse le chiffre d’affaires',
    attendu: 0
  },
  {
    id: 'source_manquante',
    libelle: 'produits publiés sans fournisseur déclaré',
    pourquoi: 'la truth layer exige une source ; sans elle, la fiche ne doit pas être en vitrine',
    attendu: 0
  },
  {
    id: 'publies_inactifs',
    libelle: 'produits publiés mais inactifs',
    pourquoi: 'publié et inactif : la fiche sort de la vitrine sans que rien ne le dise',
    attendu: 0
  },
  {
    id: 'updated_at_manquant',
    libelle: 'produits sans date de mise à jour',
    pourquoi: 'aucun trigger ne la maintient : une écriture qui l’oublie fausse le SEO et les caches',
    attendu: 0
  }
];

/** Chaque invariant déclaré doit être évalué — un oubli est une régression. */
export function invariantsNonEvalues(mesures) {
  return INVARIANTS.filter((invariant) => !(invariant.id in mesures)).map((i) => i.id);
}

/**
 * Évalue une mesure selon la règle de son invariant.
 *
 * `mesure` vaut `{ valeur: number | null }` — `null` quand la lecture a
 * échoué. C'est volontaire : `0` et « je n'ai pas pu lire » ne doivent
 * jamais se confondre.
 */
export function evaluer(invariant, mesure, maximum, tolerance = TOLERANCE_BAISSE) {
  if (!mesure || typeof mesure.valeur !== 'number' || !Number.isFinite(mesure.valeur)) {
    return { etat: ETATS.non_verifiable, detail: mesure?.erreur ?? 'lecture impossible' };
  }
  const valeur = mesure.valeur;
  if ('attendu' in invariant) {
    return valeur === invariant.attendu
      ? { etat: ETATS.ok, detail: `${valeur} (attendu ${invariant.attendu})` }
      : { etat: ETATS.anomalie, detail: `${valeur}, attendu ${invariant.attendu}` };
  }
  return comparerAuMaximum(valeur, maximum, tolerance);
}

/**
 * Nouvelle référence : le maximum ne décroît jamais, la dernière valeur oui.
 */
export function nouvelleReference(reference, id, valeur) {
  const precedent = reference?.[id] ?? {};
  return {
    ...(reference ?? {}),
    [id]: {
      dernier: valeur,
      maximum: Math.max(typeof precedent.maximum === 'number' ? precedent.maximum : 0, valeur),
      vuLe: new Date().toISOString()
    }
  };
}

/** Une anomalie, ou une vérification impossible, font échouer le contrôle. */
export function bilan(resultats) {
  const anomalies = resultats.filter((r) => r.etat === ETATS.anomalie);
  const nonVerifiables = resultats.filter((r) => r.etat === ETATS.non_verifiable);
  return {
    total: resultats.length,
    ok: resultats.length - anomalies.length - nonVerifiables.length,
    anomalies,
    nonVerifiables,
    bloquant: anomalies.length > 0 || nonVerifiables.length > 0
  };
}
