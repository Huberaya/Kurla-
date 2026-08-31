/**
 * STRATÉGIE DE MISE EN ŒUVRE DU MODÈLE ÉCONOMIQUE — référence exécutable.
 *
 * Source : modèle économique défini à l'audit (`docs/KURLA_STRATEGIE_REFERENCE_MONDIALE.md`,
 * §I « Le modèle économique » et §J « Roadmap 0 → référence mondiale »).
 * Ce module transforme ce modèle en une feuille de route ordonnée, des lignes
 * de revenu avec des objectifs d'économie unitaire, et des KPI mesurables.
 *
 * Règles gardées de l'audit :
 *  - Les fonctions qui créent la confiance (diagnostic, profil, transparence
 *    ingrédients, export/suppression) restent GRATUITES. On monétise le confort
 *    et la profondeur, jamais l'accès à l'honnêteté.
 *  - On ne monétise pas la donnée (ligne 5) avant d'avoir la confiance (lignes 1-4).
 *  - Les revenus futurs ne sont JAMAIS inventés dans le code : ce module ne
 *    contient que des OBJECTIFS (cibles) ; les valeurs RÉELLES viennent de la
 *    base via l'endpoint `/api/admin/strategy/cockpit`.
 */

export type RevenueLineId = 'retail' | 'services' | 'kurla_plus' | 'kurla_pro' | 'intel_b2b';

export interface RevenueLine {
  id: RevenueLineId;
  order: number;
  label: string;
  mechanic: string;
  /** Niveau de roadmap qui l'active (1-5). */
  fromLevel: number;
  margin: 'Moyenne' | 'Bonne' | 'Très bonne' | 'Excellente';
  /** Condition de déclenchement, telle que posée à l'audit. */
  condition: string;
  /** Indicateur de revenu à mesurer une fois la ligne active. */
  metricLabel: string;
}

export const REVENUE_LINES: RevenueLine[] = [
  {
    id: 'retail',
    order: 1,
    label: 'Retail / marketplace produits',
    mechanic: "Achat-revente (route A hybride) puis commission marketplace 15-30 %. Lancement sur le catalogue vérifié et l'approvisionnement en cours.",
    fromLevel: 1,
    margin: 'Moyenne',
    condition: 'Catalogue vérifié, prix de revient réel et paiement en ligne opérationnels.',
    metricLabel: 'marge brute produits (€)',
  },
  {
    id: 'services',
    order: 2,
    label: 'Services professionnels',
    mechanic: 'Commission 15-25 % sur les prestations réservées et payées via la plateforme.',
    fromLevel: 4,
    margin: 'Bonne',
    condition: 'Réseau de professionnels vérifiés (Trust Score), réservation + paiement de prestation.',
    metricLabel: 'commission prestations (€)',
  },
  {
    id: 'kurla_plus',
    order: 3,
    label: 'Abonnement KURLA+',
    mechanic: '5-9 €/mois : suivi avancé, consultations IA illimitées, alertes, accès experts. Vend du confort, pas de l\'honnêteté.',
    fromLevel: 3,
    margin: 'Très bonne',
    condition: 'Le dossier utilisateur doit valoir quelque chose (Shelf actif, boucle de recommandation).',
    metricLabel: 'MRR KURLA+ (€/mois)',
  },
  {
    id: 'kurla_pro',
    order: 4,
    label: 'Abonnement KURLA Pro',
    mechanic: '29-99 €/mois : dossiers clients partagés, co-signature, outils salon.',
    fromLevel: 4,
    margin: 'Très bonne',
    condition: 'Réseau de pros vérifiés actif et espace pro utilisé.',
    metricLabel: 'MRR KURLA Pro (€/mois)',
  },
  {
    id: 'intel_b2b',
    order: 5,
    label: 'KURLA Intelligence (B2B)',
    mechanic: 'Données agrégées k-anonymes, Texture Gap Report, API de scoring. Marge sans coût marginal.',
    fromLevel: 4,
    margin: 'Excellente',
    condition: 'Le MOAT : une base d\'usages et de résultats suffisante, jamais de donnée personnelle revendue.',
    metricLabel: 'revenu B2B / contrats (€)',
  },
];

export interface StrategyPhase {
  level: number;
  id: string;
  title: string;
  horizon: string;
  goal: string;
  /** Critère de sortie quantifiable (repris de l'audit, rendu mesurable). */
  exitCriteria: string;
  /** Jalons livrables. `done` est recalculé par l'endpoint depuis la base. */
  milestones: { id: string; label: string; source?: string }[];
}

export const STRATEGY_PHASES: StrategyPhase[] = [
  {
    level: 1,
    id: 'foundation',
    title: 'Fondation — produit irréprochable',
    horizon: '0-4 mois',
    goal: 'Lever les impossibilités : confiance, conformité, catalogue et graphe réels, prêts à encaisser.',
    exitCriteria: 'Fiche produit et fiche ingrédient indexables ; graphe ≥ 200 ingrédients ; zéro donnée fictive bloquante ; paiement en ligne testé.',
    milestones: [
      { id: 'ingredient_graph', label: 'Graphe d’ingrédients + vocabulaires contrôlés (fonctions CosIng, restrictions UE, allergènes)', source: 'ingredients' },
      { id: 'ingredient_nav', label: 'Recherche par ingrédient + fiches indexables (boucle produit ⇄ ingrédient)', source: 'ingredient_nav' },
      { id: 'sourcing_pipeline', label: 'Pipeline d’approvisionnement réel (fournisseurs, phases, emails) en place', source: 'sourcing' },
      { id: 'catalog_verified', label: 'Catalogue publié vérifiable (gouvernance par contrôle)', source: 'catalog' },
      { id: 'payments_live', label: 'Paiement Stripe live + webhook + commande réellement encaissable', source: 'payments' },
      { id: 'demo_purged', label: 'Produits « Démo » retirés / remplacés par de vraies références', source: 'demo' },
    ],
  },
  {
    level: 2,
    id: 'personalization',
    title: 'Personnalisation — le dossier devient réel',
    horizon: '4-10 mois',
    goal: 'Que le dossier utilisateur apporte une valeur que l’on pourra monétiser (KURLA+).',
    exitCriteria: '≥ 30 % des actifs ont un Shelf ; la boucle de recommandation modifie ≥ 1 conseil par actif/mois ; notes par archétype.',
    milestones: [
      { id: 'shelf', label: 'KURLA Shelf (scan/inventaire des produits utilisés)' },
      { id: 'outcome_loop', label: 'Boucle d’apprentissage branchée (outcome_observations → recommandations)' },
      { id: 'archetypes', label: 'Archétypes + cohortes k-anonymes et notes par archétype' },
      { id: 'washday', label: 'Wash Day OS + timeline coiffure protectrice' },
      { id: 'routine_to_cart', label: 'Routine Builder → panier (conversion conseil → achat)' },
    ],
  },
  {
    level: 3,
    id: 'intelligence',
    title: 'Intelligence — le moteur devient un avantage',
    horizon: '10-18 mois',
    goal: 'Échelle SEO + profondeur qui justifie un abonnement. Activation de KURLA+.',
    exitCriteria: '≥ 100 000 URLs ingrédients indexées ; KURLA+ > 3 % de conversion des actifs ; 2ᵉ marché linguistique ouvert.',
    milestones: [
      { id: 'ingredient_seo_scale', label: 'Pages ingrédients générées à grande échelle (SEO)' },
      { id: 'kurla_plus', label: 'Abonnement KURLA+ (5-9 €/mois) lancé', source: 'subscription_plus' },
      { id: 'loyalty', label: 'Programme de fidélité récompensant les comportements non marchands' },
      { id: 'i18n', label: 'i18n + devises + TVA + filtrage réglementaire par juridiction' },
      { id: 'barcode', label: 'Scan code-barres / recherche visuelle' },
    ],
  },
  {
    level: 4,
    id: 'ecosystem',
    title: 'Écosystème — le réseau se referme',
    horizon: '18-30 mois',
    goal: 'Activer les services pros, KURLA Pro et la première offre B2B.',
    exitCriteria: '≥ 500 pros vérifiés actifs ; B2B > 10 % du revenu ; ≥ 1 contrat marque signé.',
    milestones: [
      { id: 'trust_score', label: 'Trust Score pros (identité, diplôme, vérification)' },
      { id: 'booking_payment', label: 'Réservation + paiement de prestation', source: 'appointments' },
      { id: 'kurla_pro', label: 'Abonnement KURLA Pro (29-99 €/mois) + espace pro', source: 'subscription_pro' },
      { id: 'creators', label: 'Programme experts/créateurs rémunéré au résultat' },
      { id: 'b2b_report', label: 'KURLA Intelligence B2B : Texture Gap Report', source: 'b2b' },
    ],
  },
  {
    level: 5,
    id: 'platform',
    title: 'Plateforme globale',
    horizon: '30 mois +',
    goal: 'Infrastructure de référence : données, API, expansion internationale.',
    exitCriteria: 'API de scoring commercialisée ; présence multi-marchés ; la donnée devient le levier de valorisation principal.',
    milestones: [
      { id: 'scoring_api', label: 'API de scoring KURLA Intelligence commercialisée' },
      { id: 'mobile', label: 'Applications mobiles natives' },
      { id: 'multi_market', label: 'Expansion multi-marchés (langues, juridictions, devises)' },
    ],
  },
];

export interface KpiDef {
  id: string;
  /** Ligne de revenu / thème rattaché. */
  phase: number;
  theme: string;
  label: string;
  /** Unité d'affichage. */
  unit: 'count' | 'euro' | 'percent' | 'ratio';
  /** Cible d'objectif (quand elle est définie par l'audit) ; sinon null. */
  target: number | null;
  /** Sens : vrai = on veut maximiser. */
  higherIsBetter: boolean;
  /** Comment la valeur réelle est obtenue (clé calculée par l'endpoint). */
  measureKey: string;
  description: string;
}

export const STRATEGY_KPIS: KpiDef[] = [
  // ── Fondation / readiness ────────────────────────────────────────────────
  { id: 'kpi_ingredients', phase: 1, theme: 'Fondation', label: 'Ingrédients documentés (graphe)', unit: 'count', target: 2000, higherIsBetter: true, measureKey: 'ingredients', description: 'Profondeur du référentiel qui fonde la transparence et le SEO.' },
  { id: 'kpi_ingredients_func', phase: 1, theme: 'Fondation', label: 'Ingrédients avec fonctions CosIng', unit: 'count', target: null, higherIsBetter: true, measureKey: 'ingredientsWithFunctions', description: 'Ingrédients reliés à une fonction déclarée (pas de déduction chimique).' },
  { id: 'kpi_restrictions', phase: 1, theme: 'Fondation', label: 'Restrictions UE renseignées', unit: 'count', target: null, higherIsBetter: true, measureKey: 'restrictions', description: 'Annexes II-VI du Règlement 1223/2009 tracées.' },
  { id: 'kpi_products_published', phase: 1, theme: 'Fondation', label: 'Produits publiés et vérifiés', unit: 'count', target: null, higherIsBetter: true, measureKey: 'productsPublished', description: 'Catalogue effectivement vendable (hors fiches démo).' },
  { id: 'kpi_payment_ready', phase: 1, theme: 'Fondation', label: 'Paiement en ligne opérationnel', unit: 'ratio', target: 1, higherIsBetter: true, measureKey: 'paymentsReady', description: '0/1 : Stripe live + webhook fonctionnels.' },

  // ── Acquisition / activation ─────────────────────────────────────────────
  { id: 'kpi_visitors', phase: 1, theme: 'Acquisition', label: 'Visiteurs uniques / mois', unit: 'count', target: null, higherIsBetter: true, measureKey: 'visitors', description: 'Trafic organique + direct (à brancher analytics).' },
  { id: 'kpi_members', phase: 2, theme: 'Acquisition', label: 'Membres inscrits', unit: 'count', target: null, higherIsBetter: true, measureKey: 'members', description: 'Comptes créés (le réservoir de la donnée).' },
  { id: 'kpi_active', phase: 2, theme: 'Activation', label: 'Utilisateurs actifs / mois', unit: 'count', target: null, higherIsBetter: true, measureKey: 'activeUsers', description: 'Au moins une action métier dans le mois.' },
  { id: 'kpi_shelf_rate', phase: 2, theme: 'Activation', label: 'Taux de Shelf chez les actifs', unit: 'percent', target: 30, higherIsBetter: true, measureKey: 'shelfRate', description: 'Cible d’audit : ≥ 30 % des actifs ont un Shelf.' },

  // ── Revenu : retail ──────────────────────────────────────────────────────
  { id: 'kpi_orders', phase: 1, theme: 'Revenu · Retail', label: 'Commandes payées', unit: 'count', target: null, higherIsBetter: true, measureKey: 'orders', description: 'Commandes réellement encaissées.' },
  { id: 'kpi_gmv', phase: 1, theme: 'Revenu · Retail', label: 'GMV produits (€)', unit: 'euro', target: null, higherIsBetter: true, measureKey: 'gmv', description: 'Volume de marchandise vendu.' },
  { id: 'kpi_margin', phase: 1, theme: 'Revenu · Retail', label: 'Marge brute produits (€)', unit: 'euro', target: null, higherIsBetter: true, measureKey: 'productMargin', description: 'GMV − coût d’achat réel (nécessite prix de revient).' },
  { id: 'kpi_aov', phase: 1, theme: 'Revenu · Retail', label: 'Panier moyen (€)', unit: 'euro', target: null, higherIsBetter: true, measureKey: 'aov', description: 'GMV / nombre de commandes.' },
  { id: 'kpi_conv', phase: 1, theme: 'Revenu · Retail', label: 'Taux de conversion visite → commande', unit: 'percent', target: 2, higherIsBetter: true, measureKey: 'conversionRate', description: 'Cible e-commerce ~2 % une fois le trafic branché.' },

  // ── Revenu : abonnements ─────────────────────────────────────────────────
  { id: 'kpi_plus_subs', phase: 3, theme: 'Revenu · KURLA+', label: 'Abonnés KURLA+', unit: 'count', target: null, higherIsBetter: true, measureKey: 'plusSubscribers', description: 'Abonnements 5-9 €/mois actifs.' },
  { id: 'kpi_plus_mrr', phase: 3, theme: 'Revenu · KURLA+', label: 'MRR KURLA+ (€/mois)', unit: 'euro', target: null, higherIsBetter: true, measureKey: 'plusMrr', description: 'Revenu récurrent mensuel de la ligne 3.' },
  { id: 'kpi_plus_conv', phase: 3, theme: 'Revenu · KURLA+', label: 'Conversion actifs → KURLA+', unit: 'percent', target: 3, higherIsBetter: true, measureKey: 'plusConversion', description: 'Cible d’audit : > 3 %.' },
  { id: 'kpi_pro_subs', phase: 4, theme: 'Revenu · KURLA Pro', label: 'Pros abonnés KURLA Pro', unit: 'count', target: null, higherIsBetter: true, measureKey: 'proSubscribers', description: 'Abonnements 29-99 €/mois.' },
  { id: 'kpi_pro_mrr', phase: 4, theme: 'Revenu · KURLA Pro', label: 'MRR KURLA Pro (€/mois)', unit: 'euro', target: null, higherIsBetter: true, measureKey: 'proMrr', description: 'Revenu récurrent mensuel de la ligne 4.' },

  // ── Revenu : services & B2B ──────────────────────────────────────────────
  { id: 'kpi_appointments', phase: 4, theme: 'Revenu · Services', label: 'Prestations réservées', unit: 'count', target: null, higherIsBetter: true, measureKey: 'appointments', description: 'Réservations pros payées via la plateforme.' },
  { id: 'kpi_verified_pros', phase: 4, theme: 'Revenu · Services', label: 'Pros vérifiés actifs', unit: 'count', target: 500, higherIsBetter: true, measureKey: 'verifiedPros', description: 'Cible d’audit : ≥ 500.' },
  { id: 'kpi_b2b', phase: 4, theme: 'Revenu · B2B', label: 'Contrats / revenu B2B', unit: 'euro', target: null, higherIsBetter: true, measureKey: 'b2bRevenue', description: 'Texture Gap Report / API (données agrégées uniquement).' },
];

/** Ligne rouge de l'audit, rappelée dans le cockpit. */
export const STRATEGY_GUARDRAILS: string[] = [
  'Diagnostic, profil, explication des recommandations, transparence ingrédient, export et suppression restent GRATUITS.',
  'L’abonnement vend du confort et de la profondeur, jamais l’accès à l’honnêteté.',
  'Aucune revente de données personnelles : le B2B ne porte que sur des agrégats k-anonymes.',
  'On ne monétise pas la donnée (ligne 5) avant d’avoir la confiance créée par les lignes 1 à 4.',
  'Les revenus affichés sont les revenus RÉELS mesurés ; les cibles sont des objectifs, jamais des chiffres constatés.',
];

export function kpiById(id: string): KpiDef | undefined {
  return STRATEGY_KPIS.find((k) => k.id === id);
}
