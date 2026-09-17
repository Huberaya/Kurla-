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
    libelle: 'produits publiés sans source déclarée (champ libre)',
    pourquoi: 'la truth layer exige une source ; sans elle, la fiche ne doit pas être en vitrine',
    attendu: 0
  },
  {
    // AJOUTÉ LE 16/09/2026. L'invariant ci-dessus ne lisait que le champ
    // libre `source_supplier` : il affichait 0 le jour où 36 fiches
    // publiées n'avaient aucun `supplier_id`. La provenance réelle est la
    // fiche fournisseur rattachée, pas le texte qu'on a bien voulu écrire.
    id: 'provenance_manquante',
    libelle: 'produits publiés sans fournisseur rattaché',
    pourquoi: 'une fiche en vitrine dont on ignore le fournisseur ne peut être ni achetée ni tracée',
    attendu: 0
  },
  {
    // AJOUTÉ LE 16/09/2026, après la découverte du même sérum publié deux
    // fois à 10,12 € et 17,49 €. Rien ne comptait les doublons.
    id: 'doublons_publies',
    libelle: 'doublons publiés (même marque et même nom)',
    pourquoi: 'deux fiches pour un même produit, c’est deux prix possibles et une cliente qui ne peut pas choisir',
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
  },
  {
    // AJOUTÉ LE 16/09/2026. J'allais réécrire `source_supplier` pour
    // l'aligner sur le fournisseur lié : 79 fiches sur 111 portent un texte
    // qui ne correspond pas. La mesure a arrêté le geste — ce champ n'est pas
    // un nom, c'est la provenance déclarée, et la couche de vérité y lit des
    // marqueurs de sécurité : « formulation interne », « illustration ».
    //
    // 16 fiches portent « KURLA Skincare — formulation interne
    // (précommande) ». Aucune n'est publiée, aucune n'est servie : c'est ce
    // marqueur qui les en empêche. L'écraser permettrait de présenter comme
    // existant un produit jamais fabriqué.
    //
    // Ce compte ne doit JAMAIS baisser. Une baisse signifie qu'un marqueur a
    // été détruit — et c'est invisible partout ailleurs.
    id: 'marqueurs_securite',
    libelle: 'fiches protégées par un marqueur de sécurité',
    pourquoi: '« formulation interne » et « illustration » empêchent de présenter un projet ou un visuel comme un produit réel ; ce compte ne doit jamais baisser',
    baisse: true
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

/**
 * Replie un nom pour le comparer : casse, accents et ponctuation ne doivent
 * pas faire passer deux écritures du même produit pour deux produits.
 */
export function replierNom(valeur) {
  return String(valeur ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Nombre de fiches **en trop** dans le catalogue publié.
 *
 * On compte le surplus, pas les groupes : un groupe de 3, c'est 2 fiches à
 * retirer, et c'est ce chiffre-là qui est actionnable. Zéro signifie
 * « aucun doublon » — ce que l'invariant exige.
 */
export function surplusDoublons(lignes) {
  if (!Array.isArray(lignes)) return null;
  const groupes = new Map();
  for (const ligne of lignes) {
    const cle = `${replierNom(ligne?.brand)}|${replierNom(ligne?.name)}`;
    const liste = groupes.get(cle) ?? [];
    liste.push(ligne);
    groupes.set(cle, liste);
  }
  let surplus = 0;
  for (const liste of groupes.values()) if (liste.length > 1) surplus += liste.length - 1;
  return surplus;
}
