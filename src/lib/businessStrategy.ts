/**
 * KURLA BEAUTY — PLAN D'ENTREPRISE DÉCIDÉ (source de vérité du Business Control Center).
 *
 * Ce module n'est pas une liste d'options : c'est la stratégie CHOISIE. Chaque chiffre
 * de prix/marge/projection est une hypothèse assumée, explicite, que le réel viendra
 * corriger. Les valeurs MESURÉES en base viennent de l'endpoint /api/admin/strategy/cockpit
 * et ne sont jamais confondues avec ces objectifs.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. CE QUE KURLA VEND — OFFRES & GRILLE TARIFAIRE
// ─────────────────────────────────────────────────────────────────────────────

export type Offer = {
  id: string;
  name: string;
  category: 'retail' | 'kit' | 'subscription' | 'pro' | 'b2b' | 'free';
  content: string;
  target: string;
  priceEur: number;
  priceNote?: string;
  costEur: number | null;       // coût unitaire estimé (null = non encore connu, jamais inventé)
  marginPct: number | null;     // marge brute estimée
  recurrence: 'none' | 'subscribe' | 'monthly' | 'annual';
  salesStrategy: string;
};

export const OFFERS: Offer[] = [
  {
    id: 'diagnostic', category: 'free',
    name: 'Diagnostic cheveux + Profil + Transparence ingrédients',
    content: 'Diagnostic IA gratuit du type de cheveu, routine recommandée, explication de chaque ingrédient, alertes restriction, export/suppression des données.',
    target: 'Tous', priceEur: 0, costEur: null, marginPct: null, recurrence: 'none',
    salesStrategy: 'Aimant à leads : aucune fonction de confiance n’est jamais payante. C’est le moteur d’acquisition et de confiance.',
  },
  {
    id: 'retail-shampoing', category: 'retail',
    name: 'Produits capillaires texturés (shampoings, soins, leave-in, gels)',
    content: 'Sélection curée de produits adaptés aux cheveux bouclés/crépus/afro, traités par ingrédient et notés transparence.',
    target: 'Tous les personas', priceEur: 14.9, priceNote: 'fourchette 9,90–34,90 €',
    costEur: 8.2, marginPct: 34, recurrence: 'subscribe',
    salesStrategy: 'Achat-révente (marge HT réelle ~34 % avec les coûts cibles actuels ; 45 % exige de renégocier l’achat à ~46 % du prix TTC) puis marketplace (commission 15-30 %). Réachat cyclique 6-8 sem.',
  },
  {
    id: 'kit-routine', category: 'kit',
    name: 'Kits routine « Ma Routine » (3-4 produits par type de cheveu)',
    content: 'Kit 3A/3B (ondulé-bouclé), 3C/4A (bouclé-crépu), 4B/4C (crépu-afro) : shampoing + masque + leave-in + gel/huile.',
    target: 'Nouveaux clients, choix simplifié', priceEur: 64.9, priceNote: '3 paliers 49,90 / 64,90 / 89,90 €',
    costEur: 35.7, marginPct: 45, recurrence: 'subscribe',
    salesStrategy: 'Produit de démarrage : panier moyen plus élevé, choix guidé par le diagnostic. Mise en avant n°1 sur la reco.',
  },
  {
    id: 'kurla-plus', category: 'subscription',
    name: 'KURLA+ (confort, pas l’honnêteté)',
    content: 'Historique illimité de routine, suivi des résultats, alertes de fin de produit & réappro, assistant dossier, comparaisons approfondies, -10 % sur le réappro.',
    target: 'Utilisateurs actifs qui veulent tenir leur routine', priceEur: 8.4, priceNote: '7 € HT/mois (8,40 € TTC FR) ou 70 € HT/an (2 mois offerts) — aligné sur le plan KURLA+ réellement implémenté',
    costEur: 0.6, marginPct: 92, recurrence: 'monthly',
    salesStrategy: 'Vendu APRÈS la première valeur (post-reco / post-achat), jamais sur la confiance. Cible 5 % des clients.',
  },
  {
    id: 'kurla-pro', category: 'pro',
    name: 'KURLA Pro (professionnels & salons)',
    content: 'Diagnostic client en fauteuil, base ingrédients pro, fiches routine clientes, prise de rendez-vous, tableau de bord salon.',
    target: 'Coiffeurs spécialisés cheveux texturés', priceEur: 49, priceNote: '49 €/mois ou 490 €/an',
    costEur: 4, marginPct: 92, recurrence: 'monthly',
    salesStrategy: 'Vente directe B2B aux salons (démo en salon), ambassadeurs pros. Phase 4.',
  },
  {
    id: 'b2b-intel', category: 'b2b',
    name: 'KURLA Intelligence (données agrégées k-anonymes)',
    content: 'Texture Gap Report (tendances/attentes par type de cheveu), API de scoring ingrédient, études de marché marques.',
    target: 'Marques capillaires, laboratoires, distributeurs', priceEur: 1900, priceNote: 'Rapport 4 900 €/an · API 1 900 €/mois',
    costEur: 120, marginPct: 90, recurrence: 'annual',
    salesStrategy: 'Uniquement sur agrégats k-anonymes, une fois la confiance installée. Phase 5-6. Levier de valorisation.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. CIBLE — PERSONAS
// ─────────────────────────────────────────────────────────────────────────────

export type Persona = {
  id: string; name: string; age: string; location: string; hair: string;
  budget: string; platforms: string[]; need: string; pain: string;
  whyUse: string; whyPay: string; triggers: string; objection: string; priority: number;
};

export const PERSONAS: Persona[] = [
  {
    id: 'aminata', name: 'Aminata — « J’ai tout essayé »', age: '26-35', location: 'Île-de-France, Lyon', hair: 'Type 4C / afro',
    budget: 'Moyen+ (prête à payer pour du qui-marche)', platforms: ['TikTok', 'Instagram', 'YouTube'],
    need: 'Une routine qui finit par marcher, sans devoir chercher 6 mois.',
    pain: 'Produits qui ne hydratent pas, promesses non tenues, avis contradictoires.',
    whyUse: 'Le diagnostic lui dit précisément quoi mettre sur SON cheveu, avec la preuve ingrédient.',
    whyPay: 'Elle paie pour le kit qui règle le problème et pour le suivi qui l’empêche de régresser.',
    triggers: 'Avant/après convaincants, UGC qui lui ressemble, « routine 4C ».',
    objection: 'Encore une marque qui promet ; méfiance sur le paiement en ligne.', priority: 1,
  },
  {
    id: 'camille', name: 'Camille — « Maman vigilante »', age: '31-42', location: 'France urbaine', hair: 'Type 3A/3B',
    budget: 'Moyen, acheteuse raisonnée', platforms: ['Instagram', 'Google', 'Pinterest'],
    need: 'Des produits sains, transparents, sans cochonnerie pour elle et ses enfants.',
    pain: 'Greenwashing, ingrédients incompréhensibles, peur des substances réglementées.',
    whyUse: 'La transparence ingrédient (restrictions, fonctions) répond exactement à son angoisse.',
    whyPay: 'Elle paie la tranquillité : un kit vérifié et un abonnement qui l’alerte.',
    triggers: 'Contenu pédagogique ingrédients, alertes restriction, label confiance.',
    objection: 'Prix un peu élevé ; veut comprendre avant d’acheter.', priority: 2,
  },
  {
    id: 'ines', name: 'Inès — « Curieuse, budget serré »', age: '20-27', location: 'Grandes villes', hair: 'Type 3C/4A',
    budget: 'Serré, sensible aux promos et au parrainage', platforms: ['TikTok', 'Snapchat', 'Instagram'],
    need: 'Démarrer une vraie routine sans se ruiner, être guidée pas à pas.',
    pain: 'Ne sait pas par où commencer, noyée sous le contenu.',
    whyUse: 'Le diagnostic gratuit + contenu court lui donne un point de départ clair.',
    whyPay: 'Elle paie le petit kit d’entrée puis revient via réduction/parrainage.',
    triggers: 'TikTok « get ready with me », codes promo, parrainage 10 €.',
    objection: 'Budget ; tente d’abord par le gratuit.', priority: 3,
  },
  {
    id: 'fatou', name: 'Fatou — « Coiffeuse pro »', age: '30-50', location: 'Salons urbains', hair: 'Pro (tous types)',
    budget: 'Investissement professionnel', platforms: ['Instagram', 'WhatsApp', 'Bouche-à-oreille'],
    need: 'Gagner du temps en diagnostic, fidéliser sa clientèle texturée, crédibilité.',
    pain: 'Conseil à refaire pour chaque cliente, manque d’outil structuré.',
    whyUse: 'KURLA Pro lui donne un outil de diagnostic en fauteuil et des fiches clientes.',
    whyPay: 'Elle paie un abonnement pro qui fait gagner du temps et valorise son salon.',
    triggers: 'Démo en salon, résultats clientes, confrères équipés.',
    objection: 'Temps de prise en main, coût mensuel.', priority: 4,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. POSITIONNEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const POSITIONING = {
  oneLiner: 'Le coiffeur-conseil honnête pour les cheveux texturés.',
  promise: 'On te dit la vérité sur chaque ingrédient et on te trouve LA routine qui marche — sans greenwashing.',
  valueProp: 'Un diagnostic gratuit et personnalisé + une transparence ingrédient totale, qui débouchent sur les bons produits, achetés au même endroit.',
  coreMessage: 'Arrête de deviner. KURLA lit tes cheveux, décrypte les étiquettes et te donne ta routine.',
  differentiation: 'Aucun acteur ne combine (1) un diagnostic cheveu texturé personnalisé, (2) une base ingrédients traçable jusqu’aux restrictions réglementaires, et (3) la possibilité d’acheter la routine recommandée. Sephora est généraliste sans conseil ciblé ; Amazon n’offre ni confiance ni conseil ; Instagram/TikTok déversent du bruit sans preuve ; la boutique spécialisée est chère et fermée la nuit.',
  reasonToBelieve: 'Graphe d’ingrédients traçable (données réglementaires), diagnostic qui cite ses sources, et la confiance érigée en règle : les fonctions qui protègent ne sont jamais payantes.',
  whyKURLA: 'Pour un résultat garanti par la preuve, pas par l’influence : on te montre pourquoi un produit convient à TES cheveux, ingrédient par ingrédient.',
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. ACQUISITION — CANAUX CLASSÉS
// ─────────────────────────────────────────────────────────────────────────────

export type Channel = {
  rank: number; id: string; name: string; role: string; why: string; target: string;
  message: string; contentType: string; frequency: string; budgetEurMonth: number;
  kpi: string; objective: string; expected: string;
};

export const CHANNELS: Channel[] = [
  {
    rank: 1, id: 'tiktok', name: 'TikTok organique + UGC', role: 'Découverte → diagnostic',
    why: 'Les cheveux texturés explosent sur TikTok ; portée organique gratuite ; la démo du diagnostic est un hook naturel ; c’est là qu’est la cible 18-35.',
    target: 'Aminata, Inès', message: '« Arrête d’acheter au hasard : fais le diagnostic et vois ta routine. »',
    contentType: 'Démos diagnostic, avant/après, « décryptage étiquette », routine par type, UGC clientes.',
    frequency: '5-7 vidéos/semaine', budgetEurMonth: 150, kpi: 'Vues → clics profil → visites diagnostic',
    objective: 'Trafic et notoriété à coût quasi nul', expected: '100-300 visites/jour d’ici 90 j',
  },
  {
    rank: 2, id: 'seo', name: 'SEO contenu (ingrédients + routines)', role: 'Intention d’achat → conversion',
    why: 'Long-tail cumulatif et gratuit (« routine 4C », « leave-in crépus », ingrédients) ; le graphe ingrédients est un avantage de contenu unique ; intention d’achat forte.',
    target: 'Camille, Aminata', message: 'Réponses précises et tracées aux questions cheveux/ingrédients.',
    contentType: 'Pages ingrédient, guides routines par type, comparatifs, FAQ.',
    frequency: '3-4 publications/semaine', budgetEurMonth: 0, kpi: 'URLs indexées, position, clics organiques',
    objective: 'Trafic récurrent qui convertit', expected: '>100k URLs indexées (Niv.3), trafic organique majoritaire à 12 mois',
  },
  {
    rank: 3, id: 'instagram', name: 'Instagram (réutilisation + communauté)', role: 'Confiance → fidélité',
    why: 'Recyclage du contenu TikTok, DM et communauté, preuve sociale, lien direct pour les 30+.',
    target: 'Camille, Fatou', message: 'Preuve sociale, pédagogie ingrédient, coulisses.',
    contentType: 'Reels recyclés, carrousels éducatifs, témoignages, stories.',
    frequency: '4-5 posts/semaine + stories', budgetEurMonth: 50, kpi: 'Engagement, DM, clics lien',
    objective: 'Nourrir la confiance et le réachat', expected: 'Communauté engagée, taux de sauvegarde élevé',
  },
  {
    rank: 4, id: 'creators', name: 'Créateurs / micro-influenceurs cheveux texturés', role: 'Découverte crédible → achat',
    why: 'Micro-créateurs (2k-50k) sur les cheveux texturés ont une audience ultra-ciblée et un taux de confiance élevé ; barter puis affiliate 10-15 %.',
    target: 'Aminata, Inès', message: '« J’ai testé le diagnostic, voici ma routine. »',
    contentType: 'UGC sponsorisé, codes créateurs, revue honnête.',
    frequency: '4-8 collaborations/mois', budgetEurMonth: 600, kpi: 'Ventes par code, CAC affilié',
    objective: 'Premières ventes mesurables à CAC maîtrisé', expected: '20-40 commandes/mois via codes à M3',
  },
  {
    rank: 5, id: 'referral', name: 'Parrainage & ambassadeurs', role: 'Fidélité → croissance',
    why: 'Les clientes satisfaites recommandent dans ce domaine intime ; coût d’acquisition très faible.',
    target: 'Tous', message: '10 € pour toi, 10 € pour ta filleule.',
    contentType: 'Programme de parrainage intégré au compte, récompenses fidélité.',
    frequency: 'Toujours actif', budgetEurMonth: 200, kpi: 'Taux de parrainage, nouveaux clients référés',
    objective: 'Croissance auto-entretenue', expected: '15-25 % des nouveaux clients par parrainage à M6',
  },
  {
    rank: 6, id: 'paid', name: 'Publicité payante (TikTok/IG Ads)', role: 'Scaling — seulement après validation',
    why: 'On ne paie pour scaler qu’une fois la conversion organique prouvée (sinon on brûle du cash).',
    target: 'Lookalikes des acheteurs', message: 'Le diagnostic gratuit en hook, puis le kit.',
    contentType: 'Vidéo UGC publicitaire, retargeting panier.',
    frequency: 'Campagnes pilotées', budgetEurMonth: 1000, kpi: 'CAC, ROAS, CPA achat',
    objective: 'Accélérer un funnel déjà rentable', expected: 'ROAS > 2,5 avant d’augmenter le budget',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. FUNNEL DE VENTE (taux cibles)
// ─────────────────────────────────────────────────────────────────────────────

export type FunnelStep = { id: string; step: string; targetRate: string; dropCauses: string; fix: string };

export const FUNNEL: FunnelStep[] = [
  { id: 'visit', step: 'Visite (diagnostic/contenu)', targetRate: '100 %', dropCauses: 'Trafic non qualifié, accueil peu clair.', fix: 'Hook diagnostic au-dessus de la ligne de flottaison.' },
  { id: 'signup', step: 'Inscription / lancement du diagnostic', targetRate: '18-25 % des visiteurs', dropCauses: 'Formulaire trop long, peur de l’inscription.', fix: 'Diagnostic sans inscription d’abord, email demandé à la remise du résultat.' },
  { id: 'profile', step: 'Profil complété jusqu’au résultat', targetRate: '70 % des lancés', dropCauses: 'Trop de questions, abandon en cours.', fix: '5 questions max, progression visible, résultat immédiat.' },
  { id: 'reco', step: 'Recommandation affichée', targetRate: '95 % des profils', dropCauses: 'Manque de produits correspondants au catalogue.', fix: 'Toujours renvoyer au moins un kit + un produit éligible.' },
  { id: 'cart', step: 'Ajout panier', targetRate: '12-18 % des recommandations', dropCauses: 'Prix, manque de confiance, trop de choix.', fix: 'Kit préselectionné, preuve ingrédient, avis, paiement rassurant.' },
  { id: 'purchase', step: 'Achat', targetRate: '35-45 % des paniers', dropCauses: 'Paiement échoué/absent, frais de port surprises.', fix: 'Stripe live, frais de port explicites tôt, rappel panier.' },
  { id: 'repeat', step: 'Réachat à 90 jours', targetRate: '30 % des acheteurs', dropCauses: 'Oubli, pas de relance, rupture.', fix: 'Alerte fin de produit, réappro -10 %, email routine.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. PLAN DES 90 PREMIERS JOURS
// ─────────────────────────────────────────────────────────────────────────────

export type Week = { week: number; phase: 'J1-30' | 'J31-60' | 'J61-90'; focus: string; actions: string[]; budget: number; kpi: string; expected: string };

export const PLAN_90: Week[] = [
  { week: 1, phase: 'J1-30', focus: 'Débloquer l’encaissement & nettoyer', actions: ['Activer Stripe live + webhook', 'Retirer les produits Démo', 'Renseigner prix de revient réels'], budget: 0, kpi: 'Paiement encaissable, catalogue propre', expected: 'Une commande test payée en réel' },
  { week: 2, phase: 'J1-30', focus: 'Catalogue & kits', actions: ['Publier 12-20 produits réels', 'Constituer 3 kits par type de cheveu', 'Relancer prospects sourcing (prix/MOQ réels)'], budget: 1500, kpi: '≥ 12 produits, 3 kits', expected: 'Catalogue couvrant une routine complète' },
  { week: 3, phase: 'J1-30', focus: 'Tracking & diagnostic', actions: ['Installer analytics + événements (diag/reco/panier/achat)', 'Raccourcir le diagnostic à 5 questions', 'Hook diagnostic en home'], budget: 0, kpi: 'Entonnoir mesuré de bout en bout', expected: 'Chaque étape du funnel visible dans l’admin' },
  { week: 4, phase: 'J1-30', focus: 'Pré-lancement', actions: ['Compte TikTok/IG recadrés', '10 vidéos de démonstration en banque', 'Page de collecte emails + offre de lancement'], budget: 200, kpi: 'Emails collectés, contenu prêt', expected: '100-200 inscrits à la liste de lancement' },
  { week: 5, phase: 'J31-60', focus: 'Lancement TikTok', actions: ['5-7 vidéos/semaine', '3 posts SEO routines/semaine', 'Lancer l’offre de lancement (kit -15 % + diag)'], budget: 300, kpi: 'Vues, visites diagnostic, 1ères ventes', expected: '30-60 commandes' },
  { week: 6, phase: 'J31-60', focus: 'Créateurs', actions: ['Contacter 20 micro-créateurs cheveux texturés', '4-8 barter/codes affiliés', 'Mettre en place codes + suivi des ventes'], budget: 600, kpi: 'Ventes par code créateur', expected: '10-20 commandes via créateurs' },
  { week: 7, phase: 'J31-60', focus: 'Conversion', actions: ['A/B la page recommandation/kit', 'Emails panier abandonné', 'Rassurer paiement/livraison'], budget: 0, kpi: 'Taux panier→achat', expected: 'Achat ≥ 35 % des paniers' },
  { week: 8, phase: 'J31-60', focus: 'Preuve sociale', actions: ['Collecter avis + UGC des 1ers clients', 'Publier les avant/après', 'Répondre à tous les DM/commentaires'], budget: 100, kpi: 'Avis collectés, UGC', expected: '20+ avis, 10+ UGC' },
  { week: 9, phase: 'J61-90', focus: 'Rétention', actions: ['Emails de réachat/fin de produit', 'Programme de parrainage 10/10 €', 'Proposer KURLA+ après la 1ère valeur'], budget: 200, kpi: 'Réachat, parrainage, abonnés Plus', expected: '1ers réachats et 10-15 abonnés Plus' },
  { week: 10, phase: 'J61-90', focus: 'Acquisition payante test', actions: ['Tester 3 créas UGC en paid (petit budget)', 'Retargeting panier', 'Couper ce qui ne convertit pas'], budget: 800, kpi: 'CAC, ROAS', expected: 'Identifier 1 créa rentable (ROAS > 2)' },
  { week: 11, phase: 'J61-90', focus: 'SEO & routines', actions: ['Étoffer pages ingrédients/routines', 'Internel linking boutique↔ingrédients', 'Optimiser les pages qui convertissent'], budget: 0, kpi: 'URLs indexées, trafic organique', expected: 'Trafic organique en hausse mesurable' },
  { week: 12, phase: 'J61-90', focus: 'Bilan & décision scale', actions: ['Analyser CAC/LTV par canal', 'Doubler le canal rentable', 'Préparer le mois 4 (réassort stock)'], budget: 300, kpi: 'CAC < LTV/3, marge par produit', expected: 'Un moteur d’acquisition rentable identifié' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. KPI BUSINESS (valeur actuelle mesurée par l'endpoint ; cible/échéance/alerte ici)
// ─────────────────────────────────────────────────────────────────────────────

export type KpiDef = {
  id: string; category: 'Acquisition' | 'Activation' | 'Conversion' | 'Rétention' | 'Finance' | 'Produit';
  label: string; unit: 'count' | 'euro' | 'percent' | 'ratio' | 'days';
  measureKey: string | null;
  target3m: number | null; target12m: number | null;
  alertBelow?: number; alertAbove?: number;
  deadline: string; description: string;
};

export const STRATEGY_KPIS: KpiDef[] = [
  { id: 'visitors', category: 'Acquisition', label: 'Visiteurs uniques / mois', unit: 'count', measureKey: 'visitors', target3m: 8000, target12m: 60000, alertBelow: 2000, deadline: 'M3 / M12', description: 'Trafic total tous canaux.' },
  { id: 'cac', category: 'Acquisition', label: 'Coût d’acquisition client (CAC)', unit: 'euro', measureKey: null, target3m: 15, target12m: 22, alertAbove: 35, deadline: 'M3 / M12', description: 'Dépenses acquisition / nouveaux clients. Doit rester < LTV/3.' },
  { id: 'costPerSignup', category: 'Acquisition', label: 'Coût par inscription diagnostic', unit: 'euro', measureKey: null, target3m: 1.5, target12m: 2, alertAbove: 5, deadline: 'M3', description: 'Dépenses / nouveaux profils diagnostic.' },
  { id: 'signups', category: 'Activation', label: 'Diagnostics complétés / mois', unit: 'count', measureKey: 'activeUsers', target3m: 1400, target12m: 10000, alertBelow: 300, deadline: 'M3 / M12', description: 'Profils ayant reçu une recommandation.' },
  { id: 'diagRate', category: 'Activation', label: 'Visite → diagnostic lancé', unit: 'percent', measureKey: null, target3m: 20, target12m: 25, alertBelow: 10, deadline: 'M3', description: 'Premier taux d’activation du funnel.' },
  { id: 'conversionRate', category: 'Conversion', label: 'Visite → achat', unit: 'percent', measureKey: 'conversionRate', target3m: 1.2, target12m: 2.2, alertBelow: 0.5, deadline: 'M3 / M12', description: 'Conversion e-commerce globale.' },
  { id: 'orders', category: 'Conversion', label: 'Commandes payées / mois', unit: 'count', measureKey: 'orders', target3m: 90, target12m: 620, alertBelow: 30, deadline: 'M3 / M12', description: 'Commandes réellement encaissées.' },
  { id: 'aov', category: 'Conversion', label: 'Panier moyen (AOV)', unit: 'euro', measureKey: 'aov', target3m: 42, target12m: 46, alertBelow: 30, deadline: 'M3 / M12', description: 'Piloté par les kits.' },
  { id: 'cartAbandon', category: 'Conversion', label: 'Abandon de panier', unit: 'percent', measureKey: null, target3m: 60, target12m: 55, alertAbove: 75, deadline: 'M6', description: 'Plus il est bas, mieux c’est.' },
  { id: 'gmv', category: 'Finance', label: 'Chiffre d’affaires produits / mois', unit: 'euro', measureKey: 'gmv', target3m: 3780, target12m: 28500, alertBelow: 1500, deadline: 'M3 / M12', description: 'CA encaissé hors abonnements.' },
  { id: 'mrr', category: 'Finance', label: 'Revenu récurrent (MRR)', unit: 'euro', measureKey: null, target3m: 120, target12m: 2600, alertBelow: 0, deadline: 'M3 / M12', description: 'KURLA+ + Pro (mensualisé).' },
  { id: 'productMargin', category: 'Finance', label: 'Marge brute produits', unit: 'percent', measureKey: 'productMargin', target3m: 45, target12m: 45, alertBelow: 35, deadline: 'M3', description: 'Nécessite les prix de revient réels.' },
  { id: 'repeat', category: 'Rétention', label: 'Réachat à 90 jours', unit: 'percent', measureKey: null, target3m: 18, target12m: 30, alertBelow: 10, deadline: 'M6 / M12', description: 'Clients ayant racheté dans les 90 j.' },
  { id: 'churn', category: 'Rétention', label: 'Churn KURLA+ (mensuel)', unit: 'percent', measureKey: null, target3m: 8, target12m: 6, alertAbove: 12, deadline: 'M6', description: 'Plus il est bas, mieux c’est.' },
  { id: 'ltv', category: 'Rétention', label: 'LTV client (12 mois)', unit: 'euro', measureKey: null, target3m: 70, target12m: 110, alertBelow: 45, deadline: 'M6 / M12', description: 'Valeur cumulée moyenne.' },
  { id: 'plusSubscribers', category: 'Rétention', label: 'Abonnés KURLA+', unit: 'count', measureKey: 'plusSubscribers', target3m: 15, target12m: 240, alertBelow: 0, deadline: 'M3 / M12', description: 'Confort payant, vendu après la valeur.' },
  { id: 'plusConversion', category: 'Conversion', label: 'Client → KURLA+', unit: 'percent', measureKey: 'plusConversion', target3m: 4, target12m: 5, alertBelow: 2, deadline: 'M6', description: 'Taux d’abonnement des acheteurs.' },
  { id: 'proSubscribers', category: 'Rétention', label: 'Salons KURLA Pro', unit: 'count', measureKey: 'proSubscribers', target3m: 0, target12m: 15, alertBelow: 0, deadline: 'M12', description: 'Phase 4.' },
  { id: 'ingredients', category: 'Produit', label: 'Ingrédients du graphe', unit: 'count', measureKey: 'ingredients', target3m: 1000, target12m: 2000, alertBelow: 300, deadline: 'M3 / Niv.3', description: 'Moteur SEO + confiance.' },
  { id: 'productsPublished', category: 'Produit', label: 'Produits publiés', unit: 'count', measureKey: 'productsPublished', target3m: 20, target12m: 80, alertBelow: 12, deadline: 'M3', description: 'Catalogue réel et vérifié.' },
  { id: 'paymentsReady', category: 'Finance', label: 'Paiement en production', unit: 'ratio', measureKey: 'paymentsReady', target3m: 1, target12m: 1, deadline: 'Semaine 1', description: 'Stripe live + webhook.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 8. PROJECTION FINANCIÈRE (hypothèses explicites ; le réel s'affiche à côté)
// ─────────────────────────────────────────────────────────────────────────────

export type FinanceHorizon = {
  label: string; month: number;
  clientsCumul: number; ordersPerMonth: number; aov: number;
  productRevenue: number; mrr: number; totalRevenue: number;
  grossMargin: number; marketing: number; tech: number; fixedAndTeam: number; launchInvest: number;
  netResult: number;
};

export const FINANCE_ASSUMPTIONS = [
  'AOV 42 € au démarrage (kit-driven) → 48 € à 24 mois.',
  'Marge brute produits : ~34 % HT avec les coûts d’achat cibles actuels (45 % affiché historiquement incluait la TVA à tort) ; objectif 45 % HT après renégociation. MRR ~90 % de marge.',
  'Réachat 90 j : 18 % à M3 → 30 % à M12.',
  'KURLA+ 7 € HT/mois (8,40 € TTC FR), 5 % des clients s’abonnent ; KURLA Pro 49 €/mois à partir de M9.',
  'CAC organique/barter ~8-15 € au début ; mix paid ~22 € à partir de M6.',
  'Fondateur non rémunéré jusqu’à M12 ; 1 support à temps partiel à M9, 2 ETP à M24.',
  'Stock initial et création de contenu = investissement de lancement one-off.',
];

export const FINANCE_PROJECTION: FinanceHorizon[] = [
  { label: 'M3 (lancement)', month: 3, clientsCumul: 250, ordersPerMonth: 90, aov: 42, productRevenue: 3780, mrr: 119, totalRevenue: 3900, grossMargin: 1800, marketing: 700, tech: 300, fixedAndTeam: 400, launchInvest: 1600, netResult: -1200 },
  { label: 'M6 (validation)', month: 6, clientsCumul: 700, ordersPerMonth: 210, aov: 44, productRevenue: 9240, mrr: 474, totalRevenue: 9700, grossMargin: 4560, marketing: 3200, tech: 500, fixedAndTeam: 700, launchInvest: 800, netResult: -700 },
  { label: 'M12 (croissance)', month: 12, clientsCumul: 2400, ordersPerMonth: 620, aov: 46, productRevenue: 28500, mrr: 2630, totalRevenue: 31100, grossMargin: 15060, marketing: 8500, tech: 1200, fixedAndTeam: 3500, launchInvest: 0, netResult: 1860 },
  { label: 'M24 (scale)', month: 24, clientsCumul: 9500, ordersPerMonth: 2300, aov: 48, productRevenue: 110000, mrr: 17600, totalRevenue: 127600, grossMargin: 64500, marketing: 26000, tech: 3500, fixedAndTeam: 24000, launchInvest: 0, netResult: 11000 },
];

export const BREAKEVEN = {
  monthly: 'Mois 14 — rentabilité mensuelle atteinte (marge brute ≥ dépenses courantes).',
  cumulative: 'Mois 20 environ — trésorerie repassée durablement positive après l’investissement de lancement.',
  rule: 'Échelle : on n’augmente le budget pub que lorsque ROAS > 2,5 et CAC < LTV/3.',
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. ROADMAP 6 PHASES (jalons auto = vérifiés sur les mesures ; les autres = tâches suivies)
// ─────────────────────────────────────────────────────────────────────────────

export type Milestone = { id: string; label: string; auto?: { key: string; gte?: number; lte?: number; eq?: number } };
export type StrategyPhase = {
  level: number; id: string; title: string; window: string;
  goal: string; kpi: string; deadline: string; expected: string;
  milestones: Milestone[];
};

export const STRATEGY_PHASES: StrategyPhase[] = [
  {
    level: 1, id: 'lancement', title: 'PHASE 1 — LANCEMENT', window: 'Semaines 1-4',
    goal: 'Rendre le produit encaissable et recommandable : paiement live, catalogue réel, funnel mesuré.',
    kpi: '1ère commande payée réelle ; entonnoir mesuré.', deadline: 'Fin S4',
    expected: 'Une machine prête à vendre et à tout mesurer.',
    milestones: [
      { id: 'payments_live', label: 'Stripe live + webhook opérationnels', auto: { key: 'paymentsReady', eq: 1 } },
      { id: 'first_paid_order', label: 'Première commande payée en réel', auto: { key: 'orders', gte: 1 } },
      { id: 'demo_purged', label: 'Produits « Démo » retirés du catalogue public' },
      { id: 'catalog_ready', label: '12-20 produits réels + 3 kits', auto: { key: 'productsPublished', gte: 12 } },
      { id: 'tracking', label: 'Analytics + événements funnel installés' },
    ],
  },
  {
    level: 2, id: 'validation', title: 'PHASE 2 — VALIDATION', window: 'Semaines 5-12',
    goal: 'Prouver que le funnel convertit et qu’un canal d’acquisition est rentable.',
    kpi: '90 commandes/mois, conversion > 1,2 %, CAC < 15 €.', deadline: 'Fin S12 (M3)',
    expected: 'Un moteur d’acquisition rentable identifié, 1ers réachats.',
    milestones: [
      { id: 'tiktok_running', label: 'TikTok organique 5-7 vidéos/semaine lancé' },
      { id: 'creators', label: '4-8 collaborations créateurs/mois' },
      { id: 'orders_90', label: 'Atteindre 90 commandes/mois', auto: { key: 'orders', gte: 90 } },
      { id: 'mrr_seed', label: '10-15 abonnés KURLA+', auto: { key: 'plusSubscribers', gte: 10 } },
      { id: 'referral', label: 'Programme de parrainage actif' },
    ],
  },
  {
    level: 3, id: 'croissance', title: 'PHASE 3 — CROISSANCE', window: 'Mois 4-9',
    goal: 'Doubler le canal rentable, lancer le paid qui scale, épaisser le SEO.',
    kpi: 'CA 28 k€/mois, 2 400 clients, MRR 2,6 k€.', deadline: 'M12',
    expected: 'Acquisition qui scale sans perdre la rentabilité.',
    milestones: [
      { id: 'paid_scaling', label: 'Paid scaling avec ROAS > 2,5' },
      { id: 'seo_index', label: 'Graphe ingrédients ≥ 2000 (SEO)' , auto: { key: 'ingredients', gte: 2000 } },
      { id: 'orders_620', label: '620 commandes/mois', auto: { key: 'orders', gte: 620 } },
      { id: 'repeat_30', label: 'Réachat 90 j ≥ 30 %' },
      { id: 'pro_pilot', label: 'Pilote KURLA Pro dans 3-5 salons' },
    ],
  },
  {
    level: 4, id: 'rentabilite', title: 'PHASE 4 — RENTABILITÉ', window: 'Mois 10-16',
    goal: 'Atteindre puis sécuriser la rentabilité mensuelle.',
    kpi: 'Résultat net mensuel positif ; CAC < LTV/3.', deadline: 'M14',
    expected: 'Entreprise qui gagne de l’argent chaque mois.',
    milestones: [
      { id: 'breakeven', label: 'Seuil de rentabilité mensuelle franchi' },
      { id: 'margins', label: 'Marge par produit suivie et pilotée' },
      { id: 'pro_15', label: '15 salons KURLA Pro', auto: { key: 'proSubscribers', gte: 15 } },
      { id: 'retention', label: 'Churn maîtrisé (< 6 %) et LTV > 110 €' },
    ],
  },
  {
    level: 5, id: 'scale', title: 'PHASE 5 — SCALE', window: 'Mois 17-30',
    goal: 'Étendre le catalogue, la marque propre et l’équipe ; automatiser.',
    kpi: 'CA 127 k€/mois, 9 500 clients, équipe structurée.', deadline: 'M24',
    expected: 'Marque forte et opération industrialisée.',
    milestones: [
      { id: 'ownbrand', label: '3-5 produits héros marque propre KURLA' },
      { id: 'marketplace', label: 'Marketplace ouverte à des marques tierces' },
      { id: 'team', label: 'Équipe 2+ ETP (acquisition, support, ops)' },
      { id: 'b2b_pilot', label: '1ers contrats KURLA Intelligence (agrégats)' },
    ],
  },
  {
    level: 6, id: 'international', title: 'PHASE 6 — INTERNATIONAL', window: 'Mois 30+',
    goal: 'Répliquer le modèle en Europe puis dans les marchés diaspora/globaux.',
    kpi: '2-3 pays actifs, B2B > 10 % du revenu.', deadline: 'M30+',
    expected: 'Plateforme beauté texturée de référence en Europe.',
    milestones: [
      { id: 'country_2', label: 'Lancement 2e pays (BE/UK/DE)' },
      { id: 'i18n', label: 'Contenu ingrédient et routines localisés' },
      { id: 'b2b_growth', label: 'B2B Intelligence > 10 % du revenu' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 10. GARDE-FOUS (lignes rouges)
// ─────────────────────────────────────────────────────────────────────────────

export const STRATEGY_GUARDRAILS = [
  'Diagnostic, profil, explication des conseils et transparence ingrédient restent GRATUITS à jamais.',
  'L’abonnement vend du confort et du suivi, jamais l’accès à l’honnêteté.',
  'Jamais de revente de données personnelles : le B2B = agrégats k-anonymes uniquement.',
  'Aucun chiffre (contact, prix, MOQ, délai, revenu) n’est inventé : le réel affiché vient de la base ; le reste est une hypothèse assumée et étiquetée.',
  'On ne paie pour scaler (ads) qu’une fois la conversion organique prouvée (ROAS > 2,5).',
];

export function kpiById(id: string): KpiDef | undefined {
  return STRATEGY_KPIS.find((k) => k.id === id);
}
