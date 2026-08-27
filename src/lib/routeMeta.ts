/**
 * Table de métadonnées des routes — données pures, sans aucun import React.
 *
 * Cette séparation est délibérée : un script exécuté au build (sitemap,
 * prérendu, audit d'indexabilité) doit pouvoir lire la structure du site sans
 * charger les composants ni le DOM. Si ce fichier importait React, chaque
 * outil de build embarquerait toute l'application.
 *
 * L'ordre du tableau est significatif : la première correspondance gagne,
 * exactement comme l'ancienne cascade de `if (pathname === ...)`. Les routes
 * statiques doivent donc précéder les routes paramétrées qui les généralisent
 * (`/routines` avant `/routines/:slug`).
 */

export type ChangeFrequency = 'always' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RouteMeta {
  /** Motif de chemin. `:nom` capture un segment, ex. `/produit/:slug`. */
  path: string;
  title: string;
  description: string;
  /**
   * `false` pour tout ce qui ne doit pas être référencé : espace compte,
   * tableaux de bord, pages transactionnelles. Une page non indexable porte
   * `noindex` et n'apparaît pas dans le sitemap.
   */
  indexable: boolean;
  /** Chemins secondaires servant la même page. Le canonique reste `path`. */
  aliases?: string[];
  changefreq?: ChangeFrequency;
  /** Poids sitemap, 0 à 1. */
  priority?: number;
}

export const ROUTE_META: RouteMeta[] = [
  // ── Accueil ────────────────────────────────────────────────────────────────
  {
    path: '/',
    title: 'KURLA Beauty — La beauté texturée, enfin comprise.',
    description:
      'Plateforme européenne dédiée aux cheveux texturés, peaux riches en mélanine et beauté afro/multiculturelle. Diagnostic gratuit, routines personnalisées et professionnels certifiés.',
    indexable: true,
    changefreq: 'weekly',
    priority: 1,
  },

  // ── Diagnostics (publics, point d'entrée du parcours) ──────────────────────
  {
    path: '/diagnostic/cheveux',
    title: 'Diagnostic cheveux texturés gratuit | KURLA',
    description:
      'Identifiez votre type de boucle, votre porosité et votre densité. Un diagnostic cheveux pensé pour les textures 3A à 4C, sans jargon et sans promesse de résultat garanti.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.9,
  },
  {
    path: '/diagnostic/peau',
    title: 'Diagnostic peau riche en mélanine | KURLA',
    description:
      'Comprenez les besoins de votre peau : barrière cutanée, hyperpigmentation post-inflammatoire, protection solaire adaptée aux phototypes foncés.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.9,
  },
  {
    path: '/diagnostic/enfant',
    title: 'Diagnostic cheveux enfant | KURLA',
    description:
      'Routine capillaire douce pour enfants aux cheveux texturés : démêlage sans douleur, hydratation, coiffures protectrices adaptées à l’âge.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    path: '/diagnostic/protective-style',
    title: 'Quelle coiffure protectrice pour vous ? | KURLA',
    description:
      'Trouvez la coiffure protectrice adaptée à votre texture, à votre densité et à votre rythme. Tension, durée et entretien expliqués avant de choisir.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    // Résultat de diagnostic : contenu propre à une session, non référençable.
    path: '/diagnostic/resultat/:resultId',
    title: 'Votre résultat de diagnostic | KURLA',
    description: 'Résultat personnalisé de votre diagnostic cheveux ou peau.',
    indexable: false,
  },

  // ── Assistant & modules de contenu ─────────────────────────────────────────
  {
    path: '/assistant-beaute',
    title: 'Assistant beauté cheveux texturés et peau mélaninée | KURLA',
    description:
      'Un assistant spécialisé en cheveux texturés, cuir chevelu et peaux riches en mélanine. Il recommande des catégories d’ingrédients, jamais de diagnostic médical.',
    indexable: true,
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    path: '/kids',
    title: 'Cheveux texturés enfant : le guide | KURLA',
    description:
      'Routine capillaire enfant, démêlage, coiffures protectrices et produits doux. Un module pensé avec les parents.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    path: '/protective-styles',
    title: 'Coiffures protectrices : durées, tensions, entretien | KURLA',
    description:
      'Tresses, twists, vanilles, perruques : ce que chaque coiffure protectrice coûte réellement à vos cheveux, et combien de temps la garder.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.7,
  },

  {
    path: '/melanin-skin',
    title: 'Peaux riches en mélanine : le guide | KURLA',
    description:
      'Hyperpigmentation post-inflammatoire, photoprotection, barrière cutanée. Ce que la littérature dit réellement pour les phototypes IV à VI.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    path: '/hommes',
    title: 'Barbe, cuir chevelu et soins pour hommes | KURLA',
    description:
      'Soins de la barbe texturée, rasage et poils incarnés, entretien du cuir chevelu. Des routines courtes et tenables.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/outils',
    title: 'Outils beauté gratuits | KURLA',
    description:
      'Calculateurs et guides pratiques : coût réel d’une routine, dilution, fréquence de lavage, lecture d’une liste INCI.',
    indexable: true,
    aliases: ['/guides/outils'],
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/guides/ingredients',
    title: 'Guide des ingrédients cosmétiques | KURLA',
    description:
      'Humectants, émollients, occlusifs, tensioactifs : ce que fait chaque famille d’ingrédients, et pour quelle texture.',
    indexable: true,
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    path: '/community',
    title: 'Communauté KURLA | KURLA',
    description:
      'Retours d’expérience vérifiés sur les produits, classés par archétype capillaire et cutané.',
    indexable: true,
    changefreq: 'daily',
    priority: 0.5,
  },
  {
    path: '/manifeste',
    title: 'Le manifeste KURLA',
    description:
      'Neutralité vis-à-vis des marques, preuve par ingrédient, refus du diagnostic médical. Ce à quoi KURLA s’engage, et ce qu’elle refuse.',
    indexable: true,
    changefreq: 'yearly',
    priority: 0.5,
  },
  {
    path: '/journal',
    title: 'Journal KURLA — articles beauté texturée',
    description:
      'Articles sourcés sur les cheveux texturés, le cuir chevelu et les peaux riches en mélanine.',
    indexable: true,
    changefreq: 'daily',
    priority: 0.7,
  },
  {
    path: '/journal/:slug',
    title: 'Article | Journal KURLA',
    description: 'Article du journal KURLA sur la beauté texturée.',
    indexable: true,
    changefreq: 'yearly',
    priority: 0.6,
  },

  // ── Boutique & catalogue ───────────────────────────────────────────────────
  {
    path: '/boutique',
    title: 'Boutique cheveux texturés et peau mélaninée | KURLA',
    description:
      'Catalogue neutre : chaque produit est évalué sur sa composition, pas sur sa marque. Filtrez par texture, besoin et budget.',
    indexable: true,
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    path: '/produit/:slug',
    title: 'Fiche produit | KURLA',
    description: 'Composition vérifiée, avis par archétype et coût réel d’usage.',
    indexable: true,
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    path: '/ingredient/:ingredientId',
    title: 'Fiche ingrédient | KURLA',
    description:
      'Ce que fait cet ingrédient, pour quelles textures, et ce que les retours d’usage mesurés montrent.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.8,
  },

  {
    path: '/routines',
    title: 'Routines capillaires et soins | KURLA',
    description:
      'Routines complètes par texture et par besoin, avec leur coût réel et leur durée.',
    indexable: true,
    changefreq: 'weekly',
    priority: 0.7,
  },
  {
    path: '/routines/:slug',
    title: 'Routine | KURLA',
    description: 'Détail d’une routine : étapes, fréquence, produits et coût réel.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.6,
  },

  {
    // Transactionnel : l'URL contient un identifiant de session de paiement.
    path: '/commande/confirmation',
    title: 'Confirmation de commande | KURLA',
    description: 'Confirmation de votre commande.',
    indexable: false,
  },

  // ── Professionnels ─────────────────────────────────────────────────────────
  {
    path: '/pros-verifies',
    title: 'Professionnels vérifiés | KURLA',
    description:
      'Annuaire des professionnels de la beauté texturée dont le dossier a été vérifié.',
    indexable: true,
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    path: '/professionnels',
    title: 'Devenir professionnel partenaire | KURLA',
    description:
      'Rejoignez le réseau KURLA : ce que la vérification exige, et ce que la plateforme vous apporte.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    path: '/professionnels/rejoindre',
    title: 'Candidature professionnel | KURLA',
    description: 'Déposez votre dossier de vérification professionnelle.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.5,
  },
  {
    path: '/professionnels/profil/:slug',
    title: 'Profil professionnel | KURLA',
    description: 'Profil public d’un professionnel vérifié : spécialités, avis et disponibilité.',
    indexable: true,
    changefreq: 'weekly',
    priority: 0.6,
  },
  {
    path: '/pro/dashboard',
    title: 'Espace professionnel | KURLA',
    description: 'Tableau de bord du professionnel certifié.',
    indexable: false,
  },
  {
    path: '/admin',
    title: 'Administration | KURLA',
    description: 'Console d’administration.',
    indexable: false,
  },

  // ── Espace compte (non indexable par nature) ───────────────────────────────
  {
    path: '/account',
    title: 'Mon compte | KURLA',
    description: 'Votre compte KURLA.',
    indexable: false,
  },
  {
    path: '/account/kurla-id',
    title: 'KURLA ID | KURLA',
    description: 'Votre identité beauté consolidée.',
    indexable: false,
  },
  {
    path: '/account/hair-id',
    title: 'Hair ID | KURLA',
    description: 'Votre profil capillaire détaillé.',
    indexable: false,
  },
  {
    path: '/account/skin-id',
    title: 'Skin ID | KURLA',
    description: 'Votre profil cutané détaillé.',
    indexable: false,
  },
  {
    path: '/account/routine-id',
    title: 'Routine ID | KURLA',
    description: 'Votre routine adaptative.',
    indexable: false,
  },
  {
    path: '/account/routine-tracker',
    title: 'Suivi de routine | KURLA',
    description: 'Suivi de l’observance de votre routine.',
    indexable: false,
  },
  {
    path: '/account/progress',
    title: 'Journal de progression | KURLA',
    description: 'L’évolution de vos cheveux et de votre peau dans le temps.',
    indexable: false,
  },
  {
    path: '/account/shelf',
    title: 'Mon étagère | KURLA',
    description: 'Les produits que vous utilisez, leur verdict et leur réapprovisionnement.',
    indexable: false,
  },
  {
    path: '/account/wash-day',
    title: 'Mon wash day | KURLA',
    description: 'Votre protocole de lavage, étape par étape.',
    indexable: false,
  },
  {
    path: '/account/protective-timeline',
    title: 'Timeline de coiffures protectrices | KURLA',
    description: 'Historique et planification de vos coiffures protectrices.',
    indexable: false,
  },
  {
    path: '/account/saved',
    title: 'Mes favoris | KURLA',
    description: 'Produits et articles enregistrés.',
    indexable: false,
  },
  {
    path: '/recherche',
    title: 'Recherche | KURLA',
    description: 'Recherche par besoin, texture ou ingrédient.',
    indexable: false,
  },
  {
    path: '/routine-builder',
    title: 'Constructeur de routine | KURLA',
    description: 'Composez votre routine étape par étape.',
    indexable: false,
  },
  {
    path: '/cout-routine',
    title: 'Coût de routine | KURLA',
    description: 'Comparateur de coût réel entre deux routines.',
    indexable: false,
  },
  {
    path: '/mes-reservations',
    title: 'Mes réservations | KURLA',
    description: 'Vos rendez-vous et leurs paiements.',
    indexable: false,
  },
  {
    path: '/famille',
    title: 'Espace famille | KURLA',
    description: 'Profils partagés de votre foyer.',
    indexable: false,
  },

  // ── Pages légales ──────────────────────────────────────────────────────────
  {
    path: '/cgv',
    title: 'Conditions générales de vente | KURLA',
    description: 'Conditions générales de vente de KURLA Beauty.',
    indexable: true,
    changefreq: 'yearly',
    priority: 0.3,
  },
  {
    path: '/confidentialite',
    title: 'Politique de confidentialité | KURLA',
    description: 'Traitement des données personnelles, base légale, durée de conservation et vos droits RGPD.',
    indexable: true,
    changefreq: 'yearly',
    priority: 0.3,
  },
];

/** Motif compilé une seule fois, au chargement du module. */
interface CompiledRoute {
  meta: RouteMeta;
  /** Motif exact ou alias compilé. */
  regex: RegExp;
  /** Noms des paramètres, dans l'ordre d'apparition. */
  paramNames: string[];
  /** `path` du canonique, même quand c'est un alias qui a correspondu. */
  canonical: string;
}

/**
 * Compile un motif de chemin en expression régulière.
 *
 * Exposé pour les bancs de test : un test qui réécrirait sa propre compilation
 * vérifierait sa copie du code, pas le code livré.
 */
export function compilePathPattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const escaped = pattern
    .split('/')
    .map(segment => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^${escaped}$`), paramNames };
}

const COMPILED: CompiledRoute[] = ROUTE_META.flatMap(meta => {
  const canonical = meta.path;
  const patterns = [meta.path, ...(meta.aliases || [])];
  return patterns.map(pattern => {
    const { regex, paramNames } = compilePathPattern(pattern);
    return { meta, regex, paramNames, canonical };
  });
});

export interface RouteMetaMatch {
  meta: RouteMeta;
  /** Valeurs capturées, ex. `{ slug: 'masque-karite' }`. */
  params: Record<string, string>;
  /** Chemin canonique : celui à déclarer dans `<link rel="canonical">`. */
  canonicalPath: string;
  /** Vrai quand la correspondance vient d'un alias et non du chemin principal. */
  isAlias: boolean;
}

/**
 * Résout un pathname en métadonnées. Retourne `null` si aucune route ne
 * correspond : l'appelant décide alors du traitement (page 404).
 */
export function matchRouteMeta(pathname: string): RouteMetaMatch | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  for (const route of COMPILED) {
    const found = route.regex.exec(normalized);
    if (!found) continue;
    const params: Record<string, string> = {};
    route.paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(found[index + 1]);
    });
    return {
      meta: route.meta,
      params,
      canonicalPath: route.canonical,
      isAlias: route.canonical !== normalized,
    };
  }
  return null;
}

/** Routes publiables dans un sitemap, alias inclus. */
export function indexableRoutes(): RouteMeta[] {
  return ROUTE_META.filter(route => route.indexable);
}
