// ─────────────────────────────────────────────────────────────────────────────
// KURLA — SYSTÈME OPÉRATIONNEL DE PÉNÉTRATION & D'EXPANSION
// Source de vérité du « Market Penetration & Expansion Command Center ».
//
// Posture : ce n'est pas une stratégie, c'est une MACHINE. Chaque chiffre est
// soit un objectif de pénétration daté/assigné, soit — explicitement — une
// hypothèse à tester avec un seuil de validation et un délai max. Les valeurs
// RÉELLES (ordersPaid, AOV, part kits, réachat) viennent de l'API et ne sont
// jamais inventées ici.
// ─────────────────────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════════════
// 1. PHASES DE PÉNÉTRATION (cycle de vie d'un segment/marché)
// ════════════════════════════════════════════════════════════════════════════
export type PenPhase =
  | 'research'      // RECHERCHE
  | 'test'          // TEST DE PÉNÉTRATION
  | 'validation'    // VALIDATION
  | 'scale'         // APPROFONDISSEMENT (SCALE)
  | 'domination'    // DOMINATION
  | 'expand';       // EXPANSION vers adjacent/marché suivant

export const PEN_PHASE_META: Record<PenPhase, { label: string; color: string; desc: string }> = {
  research:   { label: 'Recherche',        color: 'slate',   desc: 'Segment/marché étudié, non attaqué.' },
  test:       { label: 'Test pénétration', color: 'amber',   desc: 'Offre d’entrée + canaux testés à petit budget.' },
  validation: { label: 'Validation',       color: 'blue',    desc: 'Les critères de pénétration sont mesurés.' },
  scale:      { label: 'Approfondissement', color: 'orange', desc: 'Canaux gagnants renforcés, budget augmenté.' },
  domination: { label: 'Domination',       color: 'emerald', desc: 'Leader reconnu du segment, on défend la part.' },
  expand:     { label: 'Expansion',        color: 'purple',  desc: 'Segment saturé → on attaque l’adjacent suivant.' },
};

// ════════════════════════════════════════════════════════════════════════════
// 2. ESCALIER DE PÉNÉTRATION — 0 → 100 → 1k → 10k → 50k → 100k → 1M
// ════════════════════════════════════════════════════════════════════════════
export type PenRung = {
  id: string;
  clients: number;              // objectif clients cumulés
  rungLabel: string;
  window: string;               // délai cible
  segmentSharePct: number;      // part de marché estimée dans le segment ciblé (hypothèse)
  segmentBasis: string;         // sur quelle taille de segment la part est calculée
  monthlyRevenueEur: number;    // CA mensuel visé en fin de palier
  aovEur: number;               // panier moyen cible
  convVisitToOrderPct: number;  // taux de conversion visite→commande
  repeatRate90dPct: number;     // réachat à 90 j (preuve de rétention)
  maxCacEur: number;            // CAC maximum acceptable
  newClientsPerMonth: number;
  penetrationBudgetEur: number; // budget marketing de pénétration de la phase
  channels: string[];
  contentsPerWeek: number;      // contenus de pénétration / semaine
  creatorsActive: number;       // créateurs actifs dans le segment
  localPartners: number;        // partenaires locaux activés
  team: string;
  features: string[];
  markets: string;
  validationGate: string;       // critère de passage au palier suivant
  failGate: string;             // critère d'échec → pivot
};

export const PEN_LADDER: PenRung[] = [
  {
    id: 'r100', clients: 100, rungLabel: '100 — pénétration initiale du micro-segment',
    window: 'M0–M2 (8 sem.)', segmentSharePct: 0.13, segmentBasis: 'micro-segment S0 ≈ 80 000 femmes 4C 25–40 IdF+Lyon (hypothèse)',
    monthlyRevenueEur: 1500, aovEur: 42, convVisitToOrderPct: 1.0, repeatRate90dPct: 0, maxCacEur: 20,
    newClientsPerMonth: 50, penetrationBudgetEur: 1800,
    channels: ['TikTok organique', 'DM/communautés ciblées', 'Micro-créateurs barter', 'Diagnostic gratuit', 'Réseau direct (fondateur)'],
    contentsPerWeek: 7, creatorsActive: 6, localPartners: 2,
    team: 'Fondateur (tout) + 1 community en freelance',
    features: ['Diagnostic 5 questions', 'Kits K02/K03 en tête de reco', 'Précommande Stripe', 'Parrainage 10/10'],
    markets: 'France · IdF puis Lyon · segment 4C',
    validationGate: '100 commandes payantes + 20 avis + 10 UGC + CAC ≤ 20 € + AOV ≥ 42 €',
    failGate: '< 40 commandes à M2 OU CAC > 35 € OU note < 4,0/5 → pivoter offre/canal/message',
  },
  {
    id: 'r1k', clients: 1000, rungLabel: '1 000 — saturation du segment initial',
    window: 'M3–M6', segmentSharePct: 1.25, segmentBasis: 'micro-segment S0 ≈ 80 000 (4C IdF+Lyon élargi RH/Marseille)',
    monthlyRevenueEur: 9240, aovEur: 46, convVisitToOrderPct: 1.2, repeatRate90dPct: 20, maxCacEur: 15,
    newClientsPerMonth: 225, penetrationBudgetEur: 9000,
    channels: ['TikTok organique + paid test', '4–8 micro-créateurs/mois', 'SEO long-tail', 'Emails segmentés + relance panier', 'Parrainage intra-segment', 'DM automatisés'],
    contentsPerWeek: 7, creatorsActive: 20, localPartners: 5,
    team: 'Fondateur + 1 growth + 1 contenu (freelance)',
    features: ['Relance panier 3 emails', 'Add-ons panier', 'CRM segmenté', 'Codes créateurs UTM', 'KURLA+ post-achat'],
    markets: 'France · toutes zones · segment 4C saturé',
    validationGate: '1 000 clients + 90 cmd/mois + conv ≥ 1,2 % + CAC ≤ 15 € + réachat ≥ 20 % + ROAS ≥ 2 sur 1 créa + marge contributive positive',
    failGate: 'conv < 0,6 % OU CAC > 25 € OU réachat < 10 % à M6 → revoir offre/prix, ne pas étendre',
  },
  {
    id: 'r10k', clients: 10000, rungLabel: '10 000 — segments adjacents + Belgique',
    window: 'M7–M18', segmentSharePct: 0.6, segmentBasis: 'France élargie ≈ 1,6 M femmes bouclées→crépues 18–55 (hypothèse) + BE',
    monthlyRevenueEur: 62000, aovEur: 52, convVisitToOrderPct: 1.6, repeatRate90dPct: 25, maxCacEur: 18,
    newClientsPerMonth: 800, penetrationBudgetEur: 90000,
    channels: ['Paid scaling Meta/TikTok (ROAS > 2,5)', 'Programme ambassadeurs', 'SEO large + YouTube', 'Partenaires salons/coiffeurs', 'Marketplace test', 'Belgique cross-border'],
    contentsPerWeek: 12, creatorsActive: 60, localPartners: 15,
    team: 'Fondateur + growth + contenu + 1 customer care + 1 ops (3PL)',
    features: ['KURLA Pro salons', 'Marque propre karité', 'Programme ambassadeurs', 'Multi-pays BE/LU', 'Abonnements'],
    markets: 'France multi-segments + Belgique/Luxembourg',
    validationGate: '10 000 clients + 620 cmd/mois + CA ~62 k€ + marge nette mensuelle positive + BE ≥ 30 cmd/60 j + réachat ≥ 25 %',
    failGate: 'marge contributive négative 2 mois de suite OU ROAS < 1,5 → couper le paid, revenir organique',
  },
  {
    id: 'r50k', clients: 50000, rungLabel: '50 000 — Europe (UK/DE/NL) + rentabilité',
    window: 'M19–M36', segmentSharePct: 0.9, segmentBasis: 'Europe FR+UK+DE+NL diaspora/texturée ≈ 5,5 M (hypothèse)',
    monthlyRevenueEur: 330000, aovEur: 58, convVisitToOrderPct: 1.8, repeatRate90dPct: 28, maxCacEur: 22,
    newClientsPerMonth: 2200, penetrationBudgetEur: 520000,
    channels: ['Paid multi-pays', 'Créateurs locaux UK/DE', '3PL UK puis DE', 'Distributeurs ciblés', 'Marketplaces', 'B2B salons'],
    contentsPerWeek: 18, creatorsActive: 150, localPartners: 40,
    team: 'Équipe 8–12 (growth, contenu, ops, customer care par langue, country lead UK/DE)',
    features: ['Localisation EN/DE/NL', 'Prix £', 'Stock local 3PL', 'Marketplace tierces', 'KURLA Intelligence'],
    markets: 'France dominée + BE/LU + UK + DE + NL',
    validationGate: '50 000 clients + rentable + 2–3 pays actifs (chacun ≥ seuil test) + LTV/CAC ≥ 3',
    failGate: 'un pays test < seuil après 6 mois et budget test épuisé → retrait de ce pays, recentrage',
  },
  {
    id: 'r100k', clients: 100000, rungLabel: '100 000 — Afrique du Sud + Afrique de l’Ouest',
    window: 'M37–M54', segmentSharePct: 0.5, segmentBasis: 'ZA premium + diaspora UEMOA urbaine ≈ adressable payant ~2 M (hypothèse)',
    monthlyRevenueEur: 640000, aovEur: 60, convVisitToOrderPct: 2.0, repeatRate90dPct: 30, maxCacEur: 20,
    newClientsPerMonth: 2800, penetrationBudgetEur: 900000,
    channels: ['E-commerce premium ZA (3PL)', 'Distributeurs SN/CI', 'Marketplaces Jumia/Konga', 'Mobile money', 'Créateurs locaux', 'Sourcing karité GH intégré'],
    contentsPerWeek: 20, creatorsActive: 120, localPartners: 25,
    team: '12–20 (country leads Afrique, ops import, supply chain karité)',
    features: ['Paiement mobile money', 'Catalogue adapté pouvoir d’achat', 'Logistique distributeur', 'Marque propre Afrique'],
    markets: 'Europe + Afrique du Sud + Sénégal/Côte d’Ivoire (+ sourcing Ghana)',
    validationGate: '100 000 clients + ZA ≥ 50 cmd/90 j + 1 distributeur + 1 marketplace actifs UEMOA + sourcing karité structuré',
    failGate: 'ZA < 20 cmd/90 j après 6 mois OU distributeur sans réappro → geler le pays, garder le sourcing',
  },
  {
    id: 'r1m', clients: 1000000, rungLabel: '1 000 000 — plateforme mondiale + diaspora',
    window: 'M55–M84', segmentSharePct: 1.0, segmentBasis: 'diaspora mondiale + marchés texturés adressables ≈ 80–100 M (hypothèse)',
    monthlyRevenueEur: 7000000, aovEur: 62, convVisitToOrderPct: 2.2, repeatRate90dPct: 32, maxCacEur: 24,
    newClientsPerMonth: 35000, penetrationBudgetEur: 9000000,
    channels: ['Marketplace KURLA ouverte (tiers)', 'B2B données KURLA Intelligence', 'Amérique du Nord diaspora', 'Moyen-Orient', 'Brand/PR global', 'Réseau d’ambassadeurs'],
    contentsPerWeek: 40, creatorsActive: 800, localPartners: 100,
    team: '50+ (org multi-régions, plateforme, data, marketplace)',
    features: ['Marketplace multi-marques', 'API données B2B', 'Apps locales', 'Franchise/3PL global'],
    markets: 'Europe + Afrique + Amérique du Nord + Moyen-Orient + diaspora',
    validationGate: '1 M clients + marketplace ≥ 20 % du GMV + B2B ≥ 10 % du revenu + présent sur 3 continents',
    failGate: 'marketplace non adoptée (< 5 % GMV à 18 mois) → rester marque DTC, ne pas forcer la plateforme',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// 3. SEGMENTS FRANCE (ordre de pénétration)
// ════════════════════════════════════════════════════════════════════════════
export type PenSegment = {
  id: string; rank: number; name: string; micro: boolean;
  problem: string; geography: string; entryOffer: string; entryPrice: string;
  channel: string; targetClients: number; shareBasis: string;
  when: string; validation: string;
};

export const PEN_SEGMENTS_FR: PenSegment[] = [
  { id: 's0', rank: 1, name: 'Femmes cheveux crépus type 4 (4A–4C), 25–40 ans', micro: true,
    problem: 'Hydratation qui ne tient pas, coils secs, manque de routine fiable', geography: 'Île-de-France puis Lyon',
    entryOffer: 'Diagnostic gratuit 5 questions → Kit K03 (69,90 €) / K02 (64,90 €)', entryPrice: '49,90–69,90 €',
    channel: 'TikTok organique + DM communautés + micro-créateurs barter', targetClients: 1000,
    shareBasis: '~80 000 (micro-segment IdF/Lyon)', when: 'M0–M6',
    validation: '1 000 clients, conv ≥ 1,2 %, CAC ≤ 15 €, réachat ≥ 20 %' },
  { id: 's1', rank: 2, name: 'Bouclées 3A–3C & ondulées (25–45 ans)', micro: false,
    problem: 'Définition des boucles, effet cartonné/humidité', geography: 'France entière',
    entryOffer: 'Kit K02 (64,90 €) / K01 entrée (49,90 €)', entryPrice: '49,90–64,90 €',
    channel: 'Paid Meta/TikTok + SEO long-tail + créateurs bouclées', targetClients: 4000,
    shareBasis: '~700 000 bouclées/ondulées acheteuses FR', when: 'M6–M12',
    validation: '3 000 cmd sur le segment, CAC ≤ 18 €, ROAS ≥ 2' },
  { id: 's2', rank: 3, name: 'Coiffures protectrices / locks / vanilles', micro: false,
    problem: 'Entretien des tresses/locs, traction, cuir chevelu', geography: 'France entière',
    entryOffer: 'Kit K05 protectrices (49,90 €) + K08 locs (44,90 €)', entryPrice: '44,90–49,90 €',
    channel: 'Créateurs spécialisés tresses/locs + salons partenaires', targetClients: 2000,
    shareBasis: '~250 000 porteuses de protectrices régulières', when: 'M9–M15',
    validation: '1 500 cmd, 10 salons partenaires actifs' },
  { id: 's3', rank: 4, name: 'Enfants (cheveux texturés, parents 28–45 ans)', micro: false,
    problem: 'Démêlage douloureux, produits doux et sûrs', geography: 'France + Belgique',
    entryOffer: 'Gamme enfant (diagnostic kids) + kits doux', entryPrice: '34,90–54,90 €',
    channel: 'Instagram parents + parentalité + créatrices mères', targetClients: 1500,
    shareBasis: '~300 000 foyers concernés FR', when: 'M12–M18',
    validation: '1 000 cmd, conformité mineurs vérifiée, note ≥ 4,4' },
  { id: 's4', rank: 5, name: 'Hommes texturés (courts, waves, locks, barbe)', micro: false,
    problem: 'Entretien cheveux courts/barbe, manque de repères', geography: 'France entière',
    entryOffer: 'Kit K08/éponge twist (8,90 €) + durag satin + gamme barbe', entryPrice: '8,90–39,90 €',
    channel: 'TikTok/Reels hommes + barbiers partenaires', targetClients: 1500,
    shareBasis: '~400 000 hommes texturés acheteurs', when: 'M14–M20',
    validation: '1 000 cmd, 20 barbiers/salons hommes partenaires' },
];

// ════════════════════════════════════════════════════════════════════════════
// 4. CARTE DE PÉNÉTRATION GÉOGRAPHIQUE — France / Europe / Afrique / Monde
// ════════════════════════════════════════════════════════════════════════════
export type PenMarket = {
  id: string; region: 'France' | 'Europe' | 'Afrique' | 'Monde'; wave: number;
  country: string; phase: PenPhase; entrySegment: string; entryOffer: string;
  price: string; language: string; primaryChannel: string; influence: string;
  localPartners: string; logistics: string; regulation: string;
  budgetEur: number; targetClients: number; validationWindow: string;
  successGate: string; failGate: string; trigger: string;
};

export const PEN_MARKETS: PenMarket[] = [
  // FRANCE
  { id: 'fr-1', region: 'France', wave: 0, country: 'France — IdF + Lyon (4C)', phase: 'test',
    entrySegment: 'Femmes 4C 25–40', entryOffer: 'K03/K02 via diagnostic', price: '64,90–69,90 €', language: 'FR',
    primaryChannel: 'TikTok organique + créateurs barter', influence: '6 nano/micro-créateurs 4C IdF/Lyon',
    localPartners: '2 salons 4C pilotes (code pro)', logistics: 'Fulfilment maison FR (4,90 € / offert ≥ 60 €)',
    regulation: 'CPNP, INCI, conformité cosmétique UE', budgetEur: 1800, targetClients: 100, validationWindow: '8 semaines',
    successGate: '100 cmd + 20 avis + CAC ≤ 20 €', failGate: '< 40 cmd à M2 → pivot', trigger: 'M0' },
  { id: 'fr-2', region: 'France', wave: 0, country: 'France — national (4C saturé)', phase: 'research',
    entrySegment: 'Femmes 4C toutes zones', entryOffer: 'Kits + KURLA+', price: '49,90–89,90 €', language: 'FR',
    primaryChannel: 'Paid + SEO + email', influence: '20 créateurs', localPartners: '5 salons',
    logistics: 'Maison puis 3PL dès 150 cmd/mois', regulation: 'UE', budgetEur: 9000, targetClients: 1000, validationWindow: 'M3–M6',
    successGate: '1 000 clients, conv ≥ 1,2 %, CAC ≤ 15 €', failGate: 'conv < 0,6 % → ne pas étendre', trigger: 'palier 100 validé' },
  { id: 'fr-3', region: 'France', wave: 0, country: 'France — segments adjacents', phase: 'research',
    entrySegment: 'Bouclées/protectrices/kids/hommes', entryOffer: 'K01/K02/K05/K08 + gamme', price: '34,90–69,90 €', language: 'FR',
    primaryChannel: 'Paid par segment + créateurs dédiés', influence: '60 créateurs', localPartners: '15 salons/barbiers',
    logistics: '3PL FR', regulation: 'UE + conformité mineurs (kids)', budgetEur: 90000, targetClients: 9000, validationWindow: 'M7–M18',
    successGate: '10 000 cumulés, marge positive', failGate: 'marge négative 2 mois → couper paid', trigger: 'palier 1 000 validé' },
  // EUROPE
  { id: 'eu-be', region: 'Europe', wave: 1, country: 'Belgique + Luxembourg', phase: 'research',
    entrySegment: 'Diaspora francophone 4C (Bruxelles, Liège, Luxembourg)', entryOffer: 'Kits K02/K03 (mêmes prix €)', price: '64,90–69,90 €', language: 'FR (zéro traduction)',
    primaryChannel: 'TikTok FR-BE + créateurs bruxellois', influence: '4 créateurs BE', localPartners: '2 salons Bruxelles',
    logistics: 'Cross-border depuis FR (6,90 € / offert ≥ 80 €)', regulation: 'UE (mêmes CPNP)', budgetEur: 1500, targetClients: 30, validationWindow: 'test 60 j, M9–M12',
    successGate: '30 cmd / 60 j + CAC ≤ 18 €', failGate: '< 10 cmd/60 j après 1 500 € → retarder, rester FR', trigger: 'France ~1 000 clients + marge positive' },
  { id: 'eu-uk', region: 'Europe', wave: 2, country: 'Royaume-Uni', phase: 'research',
    entrySegment: 'Diaspora afro-caribéenne 4C (Londres, Manchester, Birmingham)', entryOffer: 'Kits localisés £ (+5–10 %)', price: '£58–64', language: 'EN',
    primaryChannel: 'TikTok/Instagram UK + créateurs londoniens', influence: '8 créateurs UK', localPartners: '3 salons Londres',
    logistics: 'Cross-border puis 3PL UK (dédouanement post-Brexit)', regulation: 'UK SCPN (équivalent CPNP hors UE)', budgetEur: 4000, targetClients: 100, validationWindow: 'test 90 j',
    successGate: '100 cmd/90 j + ROAS ≥ 1,8', failGate: '< 30 cmd/90 j → retrait UK', trigger: 'BE validée (≥ 30 cmd) + équipe EN' },
  { id: 'eu-denl', region: 'Europe', wave: 3, country: 'Allemagne puis Pays-Bas', phase: 'research',
    entrySegment: 'Diaspora afro-allemande/néerlandaise (Berlin, Cologne, Amsterdam, Rotterdam)', entryOffer: 'Kits localisés DE', price: '64,90–74,90 €', language: 'DE / NL',
    primaryChannel: 'Instagram/TikTok DE + créateurs locaux', influence: '6 créateurs DE/NL', localPartners: '2 salons',
    logistics: '3PL DE après test cross-border', regulation: 'UE (CPNP), droit conso DE', budgetEur: 5000, targetClients: 80, validationWindow: 'test 90 j chacun',
    successGate: '80 cmd/90 j + marge positive pays', failGate: '< 25 cmd/90 j → geler', trigger: 'UK validée (≥ 100 cmd)' },
  // AFRIQUE
  { id: 'af-gh-src', region: 'Afrique', wave: 1, country: 'Ghana (SOURCING karité, pas de vente d’abord)', phase: 'research',
    entrySegment: 'Supply — karité brut/beurre de karité', entryOffer: 'Matière première marque propre', price: '6–9 €/kg', language: 'EN',
    primaryChannel: '— (achat fournisseurs, coopératives)', influence: '—', localPartners: 'Coopératives karité Ghana/Burkina',
    logistics: 'Import UE, contrôle qualité, GMP', regulation: 'Import cosmétique, traçabilité, CITES si concerné', budgetEur: 3000, targetClients: 0, validationWindow: 'M3 (sourcing)',
    successGate: '1 filière karité fiable + échantillons conformes', failGate: 'qualité/traçabilité non conforme → autre origine', trigger: 'M3 (indépend des ventes)' },
  { id: 'af-za', region: 'Afrique', wave: 2, country: 'Afrique du Sud (Johannesburg, Le Cap, Durban)', phase: 'research',
    entrySegment: 'Classe moyenne/premium 4C urbaine', entryOffer: 'Kits premium alignés prix EU', price: 'R ~ équivalent 60–75 €', language: 'EN',
    primaryChannel: 'E-commerce + Instagram/TikTok ZA + créateurs premium', influence: '6 créateurs ZA', localPartners: '1 3PL + 2 salons premium',
    logistics: '3PL Afrique du Sud (retail mature, e-com 20–25 %)', regulation: 'SAHPRA/regulations cosmétiques ZA, droits douane', budgetEur: 6000, targetClients: 50, validationWindow: 'test 90 j',
    successGate: '50 cmd/90 j via 3PL + AOV ≥ 55 €', failGate: '< 20 cmd/90 j → geler ZA', trigger: 'Europe vague 1–2 rentable + sourcing karité actif' },
  { id: 'af-uo', region: 'Afrique', wave: 2, country: 'Sénégal + Côte d’Ivoire (Dakar, Abidjan)', phase: 'research',
    entrySegment: 'Classe moyenne urbaine + diaspora retour', entryOffer: 'Outils forte marge + petits kits (PAS d’appareils 99–149 € d’abord)', price: '4,90–14,90 € (entrée) / kits 25–40 €', language: 'FR',
    primaryChannel: 'WhatsApp + Instagram + marketplaces (Jumia/EpiCi)', influence: '8 créateurs locaux', localPartners: '1 distributeur + marketplaces',
    logistics: 'Distributeur local + mobile money (Orange/Wave/MTN)', regulation: 'Douanes UEMOA, homologation, étiquetage FR', budgetEur: 4000, targetClients: 60, validationWindow: 'test 120 j',
    successGate: '1 distributeur + 60 cmd via marketplace/distributeur', failGate: 'aucun distributeur à 6 mois → vendre uniquement en ligne diaspora', trigger: 'ZA en test ou validée' },
  { id: 'af-ng', region: 'Afrique', wave: 3, country: 'Nigeria (Lagos, Abuja) — plus tard', phase: 'research',
    entrySegment: 'Jeunes urbaines (mass-market 80–90 %)', entryOffer: 'Petits formats via Jumia/Konga', price: 'entrée 3–12 €', language: 'EN',
    primaryChannel: 'Marketplaces + Instagram + WhatsApp', influence: 'Créateurs nigérians', localPartners: 'Marketplaces Jumia/Konga',
    logistics: 'Marketplace gère la logistique (marché fragmenté)', regulation: 'NAFDAC, douanes, paiement local', budgetEur: 3000, targetClients: 100, validationWindow: 'test 120 j',
    successGate: '100 cmd via marketplace sans stock propre', failGate: 'logistique/paiement bloquants → rester marketplace tiers', trigger: 'UEMOA validée' },
  // MONDE
  { id: 'wd-1', region: 'Monde', wave: 4, country: 'Diaspora mondiale + Amérique du Nord', phase: 'research',
    entrySegment: 'Diaspora afro USA/Canada/Moyen-Orient', entryOffer: 'Marketplace KURLA + kits premium', price: 'prix locaux premium', language: 'EN/AR',
    primaryChannel: 'Marketplace + créateurs diaspora + PR', influence: 'Réseau ambassadeurs global', localPartners: '3PL US/EAU',
    logistics: '3PL régional + marketplace', regulation: 'FDA (US), normes locales', budgetEur: 0, targetClients: 0, validationWindow: 'après 100 k',
    successGate: 'Marketplace ≥ 20 % GMV + B2B ≥ 10 % revenu', failGate: 'marketplace < 5 % → rester DTC', trigger: '100 000 clients + 3 continents' },
];

// ════════════════════════════════════════════════════════════════════════════
// 5. LES 100 PREMIERS CLIENTS — 5 CANAUX = 25+20+20+20+15
// ════════════════════════════════════════════════════════════════════════════
export type PenChannel100 = {
  id: number; name: string; targetClients: number; budgetEur: number; convAssumption: string;
  actions: { qty: string; action: string }[]; script: string; cta: string; measure: string;
};

export const PEN_FIRST100: PenChannel100[] = [
  { id: 1, name: 'TikTok organique ciblé 4C (compte fondateur)', targetClients: 25, budgetEur: 0,
    convAssumption: '25 clients sur ~250 000 vues cumulées (≈ 0,1 cmd/1 000 vues ciblées)',
    actions: [
      { qty: '56 vidéos', action: 'Publier 7 vidéos/sem. pendant 8 sem. (routine 4C, « hydratation qui tient », avant/après kit, wash day, erreurs hydration)' },
      { qty: '8 hooks', action: '8 angles : « j’ai tout essayé », routine pas chère, erreurs qui sèchent, nuit satin, test 7 jours, démêlage, gel, recettes karité' },
      { qty: '1 lien', action: 'Bio : « Fais ton diagnostic gratuit 5 questions » (pas « boutique »)' },
    ],
    script: 'Hook 2 s (« Depuis que je fais ça, mes coils restent hydratés 5 jours ») → problème partagé → démonstration kit K03 → CTA diagnostic.',
    cta: '« Fais ton diagnostic gratuit »', measure: 'vues, profil→lien (taux ≥ 1 %), cmd attribuées TikTok (UTM)' },
  { id: 2, name: 'Micro-créateurs 4C en barter/produit', targetClients: 20, budgetEur: 600,
    convAssumption: '6 créateurs × ~3–4 clients chacun (codes uniques UTM)',
    actions: [
      { qty: '50 créateurs', action: 'Lister 50 nano/micro-créatrices 4C IdF/Lyon (1k–30k ab.), DM personnalisés' },
      { qty: '6 activés', action: 'Envoyer kit gratuit (K03) + code promo créatrice −15 % + UTM' },
      { qty: '2 relances', action: 'Relancer à J7 et J14, fournir 3 idées de vidéo' },
    ],
    script: '« Ton contenu sur les 4C correspond exactement à ce qu’on construit. On t’envoie notre kit nutrition profonde contre une honnête review ? Code −15 % pour ta communauté. »',
    cta: 'code promo créatrice + lien diagnostic', measure: 'cmd par code UTM, vues, UGC reçus (cible 10)' },
  { id: 3, name: 'DM & communautés ciblées (groupes Facebook, Discord, WhatsApp)', targetClients: 20, budgetEur: 0,
    convAssumption: '20 clients sur ~400 conversations qualifiées (≈ 5 %)',
    actions: [
      { qty: '20 groupes', action: 'Rejoindre/activer 20 groupes : coiffure afro IdF/Lyon, mamans tex, naturalistes 4C, tresses' },
      { qty: '400 DM', action: '20 à 25 messages personnalisés/sem. (apporter de la valeur d’abord, jamais de spam)' },
      { qty: '15 réponses', action: 'Répondre aux questions routine avec le diagnostic comme outil, pas comme pub' },
    ],
    script: '« J’ai galéré des années avec l’hydratation de mes 4C. On a fait un diagnostic gratuit de 5 questions qui te donne la routine exacte + le kit adapté. Je peux te le passer ? »',
    cta: 'lien diagnostic personnalisé', measure: 'conversations → clics → cmd ; noter le canal « Communautés/DM »' },
  { id: 4, name: 'Partenariats salons 4C pilotes (IdF/Lyon)', targetClients: 20, budgetEur: 700,
    convAssumption: '2 salons × 10 clients (coiffeuse recommande le kit aux clientes 4C)',
    actions: [
      { qty: '10 salons', action: 'Démarcher 10 salons spécialisés afro/4C IdF puis Lyon (les < 150 salons capables = opportunité)' },
      { qty: '2 partenaires', action: 'Signer 2 pilotes : kit de démonstration offert + commission 10–15 % + code pro' },
      { qty: '1 event', action: '1 journée « wash day » en salon pour faire tester (contenu + UGC)' },
    ],
    script: '« Vos clientes 4C demandent une routine maison entre 2 RDV. On vous fournit le kit à recommander, vous touchez une commission et vos clientes ont un résultat qui tient. »',
    cta: 'code salon + carte diagnostic', measure: 'cmd via code salon, RDV supplémentaires, avis' },
  { id: 5, name: 'Réseau direct du fondateur (lancement, email, waitlist)', targetClients: 15, budgetEur: 500,
    convAssumption: '15 clients sur le réseau proche + liste de lancement (offre −20 % 100 premiers)',
    actions: [
      { qty: '100 contacts', action: 'Message personnel aux 100 contacts du fondateur dans la cible (pas de message de masse)' },
      { qty: 'liste lancement', action: 'Email à la waitlist : « kit −20 % pour les 100 premiers » + parrainage 10/10' },
      { qty: '1 offre', action: 'Offre de pénétration irrésistible : kit −20 % + livraison offerte + garantie 30 j' },
    ],
    script: '« Je lance KURLA, des routines pour cheveux 4C. Tu fais partie des 100 premières : kit −20 % et tu es remboursée si ça ne marche pas. Voici ton diagnostic. »',
    cta: 'offre 100 premiers (−20 %)', measure: 'cmd liste/réseau, taux d’ouverture, parrainages générés' },
  { id: 99, name: 'TOTAL PÉNÉTRATION INITIALE', targetClients: 100, budgetEur: 1800,
    convAssumption: '100 clients = somme des 5 canaux (25+20+20+20+15)', actions: [],
    script: '', cta: '', measure: '100 commandes payantes + 20 avis + 10 UGC + CAC ≤ 20 € + AOV ≥ 42 €' },
];

// ════════════════════════════════════════════════════════════════════════════
// 6. PLAN HEBDOMADAIRE (12 premières semaines) — « quoi faire lundi »
// ════════════════════════════════════════════════════════════════════════════
export type PenWeek = { week: number; phase: string; goal: string; actions: string[]; kpi: string; decision: string };

export const PEN_WEEKLY: PenWeek[] = [
  { week: 1, phase: 'Test', goal: 'Mettre en place la machine', kpi: 'infrastructure prête', decision: 'On lance la production contenu si diagnostic+offre live',
    actions: ['Stripe live + 1er lot kits commandé (prérequis)', 'Optimiser la landing diagnostic (CTA unique « diagnostic gratuit »)', 'Créer les 10 codes UTM (TikTok, créateurs, communautés, salons)', 'Lister 50 créateurs + 10 salons (tableau de suivi)', 'Écrire les 8 hooks TikTok'] },
  { week: 2, phase: 'Test', goal: 'Lancer le contenu + premiers DM', kpi: '7 vidéos publiées, 50 DM', decision: 'On continue si ≥ 1 vidéo dépasse 5k vues',
    actions: ['Publier 7 vidéos TikTok', 'Envoyer 25 DM communautés', 'Contacter 15 créateurs (barter)', 'Poster dans 5 groupes avec valeur', 'Relancer la waitlist (offre 100 premiers)'] },
  { week: 3, phase: 'Test', goal: 'Activer les premiers créateurs', kpi: '3 créateurs qui postent, 1ères commandes', decision: 'On double ce qui ramène des clics',
    actions: ['Expédier 3 kits à des créatrices', 'Publier 7 vidéos dont 1 « test 7 jours »', '25 DM + répondre à TOUS les commentaires', 'Démarcher 5 salons IdF', 'Analyser UTM : quel canal ramène ?'] },
  { week: 4, phase: 'Test', goal: 'Bilan mensuel + itérer', kpi: '~25 commandes cumulées', decision: 'BILAN S1 : garder les 2 canaux > 5 cmd, couper les morts',
    actions: ['Bilan par canal (UTM) : cmd, CAC, vues', 'Publier 7 vidéos', 'Activer le 1er salon pilote', 'Email de réachat aux 1ers clients', 'Collecter avis + UGC (cible 5 avis)'] },
  { week: 5, phase: 'Test', goal: 'Renforcer les canaux gagnants', kpi: 'rythme 10 cmd/sem', decision: 'On passe le salon n°2 si le n°1 convertit',
    actions: ['Doubler la cadence sur le canal n°1', 'Publier 7 vidéos + 1 carrousel éducatif', 'Activer 2 créatrices supplémentaires', '25 DM', 'Proposer parrainage aux clients satisfaits'] },
  { week: 6, phase: 'Test', goal: 'Preuve sociale', kpi: '10 avis, 5 UGC', decision: 'On lance les ads test si ≥ 15 cmd organiques',
    actions: ['Publier les UGC reçus (republier)', 'Lancer 1 micro-campagne paid test (5 €/j sur best organic)', 'Activer le salon n°2 (Lyon)', '7 vidéos', 'Email « réachat −10 % » aux clients à J30'] },
  { week: 7, phase: 'Validation', goal: 'Tester le paid', kpi: 'ROAS de la 1ère créa', decision: 'On garde la créa si ROAS ≥ 1,5',
    actions: ['3 créas UGC en test (petit budget)', '7 vidéos organiques', 'Relancer les paniers abandonnés (automatique)', 'Négocier 3 salons supplémentaires', 'Optimiser la landing (A/B titre)'] },
  { week: 8, phase: 'Validation', goal: 'BILAN DES 100 — palier 1', kpi: '100 commandes, 20 avis, 10 UGC', decision: 'GATE 100 : atteint → on prépare l’échelle ; sinon on pivote (offre/canal/prix)',
    actions: ['Bilan complet : cmd, CAC, AOV, conv, note, UGC', 'Calculer le CAC par canal', 'Documenter le playbook des canaux gagnants', 'Préparer le budget M3–M6', 'Décision GO/NO-GO vers 1 000'] },
  { week: 9, phase: 'Validation', goal: 'Construire la machine reproductible', kpi: 'process documenté', decision: 'On industrialise le top canal',
    actions: ['Transformer le canal gagnant en process (brief créateurs réutilisable)', 'Lancer 4–8 créateurs/mois en continu', 'SEO : publier 2 articles long-tail/sem.', 'Automatiser séquences email (diagnostic, panier, réachat)', 'Mettre KURLA+ en avant post-achat'] },
  { week: 10, phase: 'Validation', goal: 'Scaling paid prudent', kpi: 'ROAS ≥ 2 sur la créa gagnante', decision: 'On augmente le budget si ROAS tenu',
    actions: ['Scaler la/les créa(s) ROAS > 2', 'Recruter 1 contenu freelance (cadence 7→12/sem.)', 'Lancer le programme ambassadeurs (10 premiers)', 'Étendre géo : Marseille, Bordeaux, Lille (ads ciblées)', 'Partenariats : 3 salons supplémentaires'] },
  { week: 11, phase: 'Validation', goal: 'Rétention', kpi: 'réachat 90 j ≥ 15 %', decision: 'On accentue CRM si réachat faible',
    actions: ['Campagne réachat « fin de produit »', 'Nurturing des leads diagnostic non-acheteurs (3 emails)', 'Parrainage cross : rappeler le 10/10 aux clients', 'Analyser LTV par segment', 'Préparer le kit adjacent (bouclées)'] },
  { week: 12, phase: 'Validation', goal: 'BILAN — cap sur 1 000', kpi: '~300 commandes cumulées, CAC ≤ 17 €', decision: 'GATE 1 000 en vue : on confirme budget M4–M6',
    actions: ['Bilan trimestriel complet vs hypothèses', 'Mettre à jour les hypothèses du modèle de pénétration', 'Planifier M4–M6 (ads, créateurs, SEO)', 'Préparer l’ouverture Belgique (étude, créateurs BE)', 'Stabiliser ops (3PL si > 150 cmd/mois)'] },
];

// ════════════════════════════════════════════════════════════════════════════
// 7. CALCULATRICE DE PÉNÉTRATION — équations
// ════════════════════════════════════════════════════════════════════════════
export type PenCalcInput = {
  targetClients: number;
  convVisitToOrderPct: number; // % visites ciblées → commande
  diagCompletionPct: number;   // % des visites qui complètent le diagnostic (aimant)
  cacEur: number;              // coût d'acquisition visé
  aovEur: number;
};

export type PenCalcOutput = {
  targetClients: number;
  targetedVisitors: number;    // trafic ciblé nécessaire
  diagnosticsCompleted: number;
  ordersNeeded: number;
  revenueEur: number;
  penetrationBudgetEur: number;
  cacEur: number;
  aovEur: number;
  monthsAtCurrentPace: number; // si on connaît le rythme (affiché séparément)
};

/**
 * Modèle de pénétration (équations) :
 *   visitors      = targetClients / (conv/100)
 *   diagnostics   = visitors × (diagCompletion/100)   [le diagnostic est l'aimant]
 *   budget        = targetClients × CAC
 *   revenue       = targetClients × AOV
 * Tout chiffre ici est une HYPOTHÈSE tant que le funnel réel n'est pas mesuré.
 */
export function penetrationCalc(input: PenCalcInput): PenCalcOutput {
  const conv = Math.max(input.convVisitToOrderPct, 0.01) / 100;
  const diagRate = Math.min(Math.max(input.diagCompletionPct, 0), 100) / 100;
  const targetedVisitors = Math.round(input.targetClients / conv);
  const diagnosticsCompleted = Math.round(targetedVisitors * diagRate);
  return {
    targetClients: input.targetClients,
    targetedVisitors,
    diagnosticsCompleted,
    ordersNeeded: input.targetClients,
    revenueEur: Math.round(input.targetClients * input.aovEur),
    penetrationBudgetEur: Math.round(input.targetClients * input.cacEur),
    cacEur: input.cacEur,
    aovEur: input.aovEur,
    monthsAtCurrentPace: 0,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 8b. TABLEAU DE BORD DES CANAUX DE PÉNÉTRATION — planifié vs réel
// Les ventes réelles remontent par UTM (data.performance.channels). On mappe ces
// canaux réels aux 5 canaux du plan des 100 premiers, et on décide pour chacun :
// GAGNANT (renforcer/industrialiser) · ACTIF (accélérer) · À LANCER.
// ════════════════════════════════════════════════════════════════════════════
export type PenChannelStatus = 'win' | 'active' | 'launch';
export type PenChannelStat = {
  id: number; name: string; targetClients: number; budgetEur: number;
  realOrders: number; realRevenue: number; attainmentPct: number;
  status: PenChannelStatus; decision: string;
  matchedFrom: string[];
};

// Mots-clés (libellé de canal réel normalisé) → canal de pénétration PEN_FIRST100.
const CHANNEL_KEYWORDS: Record<number, string[]> = {
  1: ['tiktok'],
  2: ['créateur', 'createur', 'creator', 'influence', 'affilie', 'affiliate', 'ugc'],
  3: ['communaute', 'communauté', 'groupe', 'whatsapp', 'dm'],
  4: ['salon', 'coiff', 'partenaire', 'pro', 'barbier'],
  5: ['parrainage', 'referral', 'réseau', 'reseau', 'network'],
};

export function penetrationChannelBoard(
  realChannels: { channel: string; orders: number; revenue: number }[],
): { channels: PenChannelStat[]; otherChannels: { channel: string; orders: number; revenue: number }[] } {
  const norm = (s: string) => s.toLowerCase();
  const matchedReal = new Set<string>();

  const channels: PenChannelStat[] = PEN_FIRST100
    .filter(c => c.id !== 99)
    .map(c => {
      const kws = CHANNEL_KEYWORDS[c.id] || [];
      let realOrders = 0; let realRevenue = 0; const matchedFrom: string[] = [];
      realChannels.forEach(rc => {
        const label = norm(rc.channel);
        if (kws.some(k => label.includes(k))) {
          realOrders += rc.orders; realRevenue += rc.revenue; matchedFrom.push(rc.channel); matchedReal.add(rc.channel);
        }
      });
      const attainmentPct = c.targetClients > 0 ? Math.round((realOrders / c.targetClients) * 100) : 0;
      let status: PenChannelStatus = 'launch';
      let decision: string;
      if (realOrders >= c.targetClients * 0.8) {
        status = 'win';
        decision = 'CANAL GAGNANT : on renforce et on industrialise (budget + process + créateurs en continu). C’est lui qui porte la montée vers 1 000.';
      } else if (realOrders >= 1) {
        status = 'active';
        decision = 'Canal actif mais sous l’objectif : on accélère (cadence, volume de DM/contenu), on itère le message qui convertit.';
      } else {
        status = 'launch';
        decision = 'Aucune vente attribuée : lancer ce canal cette semaine selon le plan (actions quantifiées ci-dessus). Vérifier que les liens portent le bon UTM/code.';
      }
      return { id: c.id, name: c.name, targetClients: c.targetClients, budgetEur: c.budgetEur, realOrders, realRevenue: Math.round(realRevenue), attainmentPct, status, decision, matchedFrom };
    });

  // Canaux réels qui ne relèvent pas du palier 100 (leviers des paliers suivants).
  const otherChannels = realChannels
    .filter(rc => !matchedReal.has(rc.channel) && rc.orders > 0 && !/non attribué|direct/i.test(rc.channel))
    .map(rc => ({ channel: rc.channel, orders: rc.orders, revenue: Math.round(rc.revenue) }));

  return { channels, otherChannels };
}

// ════════════════════════════════════════════════════════════════════════════
// 9. PLAN D'INFLUENCE POUR LA PÉNÉTRATION — par taille de créateur
// Conçu pour pénétrer un segment : on commence nano (crédibilité), on passe
// micro (portée ciblée), on garde macro/experts pour l'amplification/autorité.
// Recrutement CONTINU : à chaque nouveau segment/marché, on relance le pipeline.
// ════════════════════════════════════════════════════════════════════════════
export type PenInfluenceTier = {
  tier: string; followers: string;
  count100: number; count1k: number; count10k: number;
  compensation: string; budgetEach: string; clientsEach: string;
  campaign: string; kpi: string; renew: string; stop: string;
};

export const PEN_INFLUENCE: PenInfluenceTier[] = [
  { tier: 'Nano-créateurs (segment)', followers: '1k–10k', count100: 6, count1k: 20, count10k: 60,
    compensation: 'Produit offert (kit) + code −15 %', budgetEach: '0 € cash (~70 € produit)', clientsEach: '3–5 ventes',
    campaign: 'Honnête review du kit + routine 4C, code UTM unique', kpi: '≥ 3 ventes/code ou ≥ 20k vues',
    renew: '≥ 3 ventes → on renvoie produit + on passe en collaboration récurrente', stop: '0 vente et < 5k vues après 2 contenus → on ne renouvelle pas' },
  { tier: 'Micro-créateurs (segment)', followers: '10k–50k', count100: 0, count1k: 6, count10k: 40,
    compensation: 'Produit + 100–300 €/contenu selon engagement', budgetEach: '150–300 €', clientsEach: '8–15 ventes',
    campaign: 'Vidéo dédiée wash day / avant-après + UGC réutilisable en paid', kpi: 'ROAS ≥ 1,5 ou ≥ 8 ventes',
    renew: 'ROAS ≥ 1,5 → contrat trimestriel + budget paid sur leur contenu', stop: 'ROAS < 1 sur 2 campagnes → stop' },
  { tier: 'Macro-créateurs (amplification)', followers: '50k–300k', count100: 0, count1k: 0, count10k: 6,
    compensation: 'Fee 500–2 000 € + affiliation', budgetEach: '800–2 000 €', clientsEach: '30–80 ventes',
    campaign: 'Lancement de gamme / mise en avant nationale (palier 10k)', kpi: 'ROAS ≥ 2 + notoriété (vues, recherches marque)',
    renew: 'ROAS ≥ 2 sur le lancement → on reconduit au lancement suivant', stop: 'ROAS < 1,5 → retour micro/nano' },
  { tier: 'Experts reconnus (autorité)', followers: 'coiffeurs/visagistes référents', count100: 1, count1k: 3, count10k: 10,
    compensation: 'Partenariat expert (kit pro + commission)', budgetEach: 'produit + 15 % commission', clientsEach: 'crédibilité + 10–20 ventes',
    campaign: 'Co-création de contenu éducatif, validation pro des routines', kpi: 'contenu expert + clics vers diagnostic',
    renew: 'engagement fort + apport de crédibilité → relation long terme', stop: 'pas de résonance auprès du segment → stop' },
  { tier: 'Créateurs UGC (authenticité)', followers: '0–5k (clients)', count100: 10, count1k: 50, count10k: 200,
    compensation: 'Clientes satisfaites : produit/remise contre vidéo', budgetEach: 'bon d’achat 20–40 €', clientsEach: 'contenu publicitaire (pas de vente directe)',
    campaign: 'Vidéo cliente authentique → bibliothèque de créas pour le paid', kpi: '≥ 10 UGC utilisables en paid',
    renew: 'bonne UGC → on en redemande + on les transforme en ambassadrices', stop: 'qualité insuffisante → on remercie' },
];

// Pipeline de recrutement continu (à lancer dans CHAQUE nouveau segment/marché).
export const INFLUENCE_PIPELINE = [
  'Lister 50 créateurs du segment cible (tableau : pseudo, ab., engagement, contact, langue, pays)',
  'DM personnalisés (25/sem.) avec le pitch barter → objectif 20 % de réponse, 30 % d’acceptation',
  'Envoyer le kit + brief créa (3 angles) + code UTM unique',
  'Relance J7/J14, fournir les idées de contenu qui marchent (issues des gagnants)',
  'Mesurer ventes par code → classer GAGNANT/ACTIF/STOP → doubler les gagnants, couper les morts',
  'Transformer les meilleures en ambassadrices (produit continu + commission + avant-premières)',
];

// ════════════════════════════════════════════════════════════════════════════
// 10. PARTENARIATS DE PÉNÉTRATION — accélérateurs par segment et par marché
// ════════════════════════════════════════════════════════════════════════════
export type PenPartner = {
  type: string; where: string; segment: string; jointOffer: string;
  partnerInterest: string; expectedAcq: string; kpi: string; renew: string;
};

export const PEN_PARTNERS: PenPartner[] = [
  { type: 'Salons de coiffure spécialisés 4C', where: 'IdF/Lyon puis national', segment: 'Femmes 4C',
    jointOffer: 'Kit à recommander entre 2 RDV + carte diagnostic + commission 10–15 %', partnerInterest: 'Revenu complémentaire + résultat qui tient entre les RDV (clientes fidèles)',
    expectedAcq: '10 clients/salon sur la durée', kpi: 'ventes via code salon + RDV supplémentaires', renew: '≥ 10 ventes → on approfondit (stock salon, formation)' },
  { type: 'Coiffeurs/barbiers influents', where: 'France puis UK/DE', segment: 'Hommes texturés / 4C',
    jointOffer: 'Gamme hommes + outils (éponge twist, durag) en salon + code', partnerInterest: 'Offre produit à vendre/recommander à leur audience',
    expectedAcq: '15–30 clients/partenaire', kpi: 'ventes code + contenu', renew: 'ROI positif → contrat ambassadeur' },
  { type: 'Écoles de coiffure & beauté', where: 'Grandes villes', segment: 'Pros / future pros',
    jointOffer: 'KURLA Pro : produits pédagogiques + certification routine texturée', partnerInterest: 'Enseigner la diversité capillaire (manque criant : < 150 salons capables)',
    expectedAcq: 'notoriété + future pros prescriptrices', kpi: 'écoles partenaires + élèves formés', renew: '1 promotion formée → on reconduit' },
  { type: 'Associations & communautés (afro, naturalistes)', where: 'IdF/Lyon → national', segment: '4C / naturalistes',
    jointOffer: 'Ateliers wash day gratuits + code communauté + don/reversement', partnerInterest: 'Valeur apportée à leurs membres (éducation capillaire)',
    expectedAcq: '10–20 membres / communauté', kpi: 'participation ateliers + ventes code', renew: 'atelier complet + ventes → récurrence mensuelle' },
  { type: 'Marques complémentaires (soin peau noire, accessoires)', where: 'France/Belgique', segment: 'cross-segment',
    jointOffer: 'Coffrets croisés, bundles, concours communs', partnerInterest: 'Audience partagée, panier enrichi',
    expectedAcq: '20–50 clients / opération', kpi: 'ventes croisées + followers', renew: 'opération rentable → programmation trimestrielle' },
  { type: 'Médias & événements spécialisés', where: 'France, UK, Afrique', segment: 'tous',
    jointOffer: 'Sponsoring/présence salons afro, beauty events, podcasts', partnerInterest: 'Marque sponsore pertinente',
    expectedAcq: 'notoriété + leads locaux', kpi: 'leads + ventes post-event', renew: 'coût/lead < CAC → reconduire' },
  { type: 'Distributeurs locaux (marchés internationaux)', where: 'Sénégal, Côte d’Ivoire, Nigeria', segment: 'classe moyenne urbaine',
    jointOffer: 'Gamme entrée/outils en gros + exclusivité régionale conditionnelle', partnerInterest: 'Marge distributeur + produit tendance',
    expectedAcq: '60+ clients via distributeur/marketplace', kpi: 'récommandes distributeur + ventes marketplace', renew: 'réappro dans les 90 j → on élargit le catalogue' },
  { type: '3PL & marketplaces (logistique pénétration)', where: 'UK, Afrique du Sud, Jumia/Konga', segment: 'nouveaux marchés',
    jointOffer: 'Stock local + vente marketplace sans infrastructure propre', partnerInterest: 'volume de vente pour la marketplace',
    expectedAcq: '50–100 commandes/marché test', kpi: 'commandes pays + délai livraison', renew: '≥ seuil test pays → stock local puis scale' },
];

// ════════════════════════════════════════════════════════════════════════════
// 11. PROFONDEUR DE PÉNÉTRATION — du 1er achat à l'ambassadeur
// Acquérir ne suffit pas : un segment est « possédé » quand les clientes
// reviennent, s'abonnent, recommandent et pénètrent le segment POUR KURLA.
// ════════════════════════════════════════════════════════════════════════════
export type PenDepthStep = {
  step: string; meaning: string; mechanism: string; tool: string; kpi: string; target: string;
};

export const PEN_DEPTH: PenDepthStep[] = [
  { step: '1er achat', meaning: 'Pénétration initiale (kit recommandé post-diagnostic)', mechanism: 'Diagnostic → kit K02/K03 en tête + offre 100 premiers', tool: 'Reco kit + add-ons panier', kpi: 'Taux de conversion visite→commande', target: '≥ 1,2 %' },
  { step: '2e achat', meaning: 'Confirmation que le produit tient la promesse', mechanism: 'Email « fin de produit » + réachat −10 % + relance panier', tool: 'CRM/email segmenté + relance 3 emails', kpi: 'Réachat 90 j', target: '≥ 20 %' },
  { step: 'Routine ancrée', meaning: 'La cliente suit sa routine KURLA (wash day récurrent)', mechanism: 'Routine tracker, rappels, contenu éducatif ciblé 4C', tool: 'Beauty hub + routine tracker + notifications', kpi: 'Activité routine + 3e achat', target: 'LTV ≥ 2× AOV' },
  { step: 'Abonnement (KURLA+)', meaning: 'Pénétration durable, revenu récurrent', mechanism: 'Proposer KURLA+ après la 1ère valeur perçue (post-2e achat)', tool: 'Membership 7,90 €/mois', kpi: 'Taux d’abonnement', target: '10–15 abonnés/1 000 clients' },
  { step: 'Recommandation', meaning: 'Pénétration virale dans le segment', mechanism: 'Parrainage 10/10 € activé après satisfaction', tool: 'Programme de parrainage (livré)', kpi: '% de nouveaux clients par parrainage', target: '15–25 % des nouveaux à M6' },
  { step: 'Ambassadrice', meaning: 'La cliente pénètre le segment pour KURLA', mechanism: 'Meilleures clientes + UGC → ambassadrices (produit continu, commission, avant-premières)', tool: 'Programme ambassadeurs + codes', kpi: 'Nb d’ambassadrices actives + ventes générées', target: '1 ambassadrice/100 clients' },
];

// Mesure de la PROFONDEUR (pas seulement le volume) par segment.
export const PEN_DEPTH_KPIS = [
  'LTV par segment (CA cumulé/cliente) — cible ≥ 3× CAC',
  'Taux de réachat 90 j — cible ≥ 20 % (sinon pénétration superficielle)',
  'Taux de recommandation / % de ventes parrainées — cible 15–25 %',
  'NPS par segment — cible ≥ 50 (preuve d’« amour » du segment)',
  'Part des clientes qui passent 1er → 2e achat — cible ≥ 30 %',
];


export type PenRealMetrics = {
  ordersPaid: number;
  aovEur: number | null;
  kitSharePct: number | null;
  repeatRatePct: number | null;
  cartToOrderPct: number | null;
  paymentsReady: boolean;
};

export type PenAlert = { level: 'green' | 'red' | 'gray'; title: string; detail: string; action?: string };

export function penetrationAlerts(m: PenRealMetrics): PenAlert[] {
  const alerts: PenAlert[] = [];
  const R100 = 100, R1K = 1000;

  if (!m.paymentsReady) {
    alerts.push({ level: 'red', title: 'Stripe pas en live', detail: 'Aucune vente réelle ne peut être encaissée : toute la pénétration est bloquée à l’étape paiement.', action: 'Passer Stripe en LIVE + SIRET cette semaine.' });
  }
  if (m.ordersPaid === 0 && m.paymentsReady) {
    alerts.push({ level: 'red', title: 'Aucune commande payante', detail: 'La machine de pénétration est lancée mais aucune conversion payée n’est constatée.', action: 'Activer les 5 canaux des 100 premiers clients dès cette semaine.' });
  }
  if (m.ordersPaid > 0 && m.ordersPaid < R100) {
    alerts.push({ level: 'green', title: 'Premières ventes réelles', detail: `${m.ordersPaid} commande(s) payante(s) — la preuve produit existe. Objectif immédiat : ${R100}.`, action: 'Exécuter le plan hebdomadaire S2–S8 pour atteindre 100.' });
  }
  if (m.aovEur !== null && m.aovEur < 42 && m.ordersPaid > 0) {
    alerts.push({ level: 'red', title: 'Panier moyen sous la cible', detail: `AOV réel ${Math.round(m.aovEur)} € < 42 € (cible palier 100).`, action: 'Kits K02/K03 en tête de reco + add-ons panier déjà en place : pousser le kit au lieu du produit seul.' });
  } else if (m.aovEur !== null && m.aovEur >= 42) {
    alerts.push({ level: 'green', title: 'Panier moyen au-dessus de la cible', detail: `AOV ${Math.round(m.aovEur)} € ≥ 42 €.`, action: 'Maintenir : kits + add-ons.' });
  }
  if (m.kitSharePct !== null && m.ordersPaid >= 10 && m.kitSharePct < 50) {
    alerts.push({ level: 'red', title: 'Part des kits faible', detail: `${m.kitSharePct} % des commandes contiennent un kit (cible 50 %).`, action: 'Mettre le kit en défaut post-diagnostic et former les créateurs au lien kit.' });
  }
  if (m.repeatRatePct !== null && m.ordersPaid >= 30 && m.repeatRatePct < 20) {
    alerts.push({ level: 'red', title: 'Réachat insuffisant (pénétration superficielle)', detail: `Réachat 90 j ${m.repeatRatePct} % < 20 %.`, action: 'Emails « fin de produit » + parrainage + KURLA+ post-achat.' });
  } else if (m.repeatRatePct !== null && m.repeatRatePct >= 20) {
    alerts.push({ level: 'green', title: 'Rétention validée', detail: `Réachat ${m.repeatRatePct} % ≥ 20 % : la pénétration est profonde.`, action: 'Critère de passage d’échelle satisfait.' });
  }
  if (m.ordersPaid >= R100 && m.ordersPaid < R1K) {
    alerts.push({ level: 'green', title: 'Palier 100 franchi', detail: `${m.ordersPaid} clients payants — prêt à industrialiser vers 1 000.`, action: 'Activer le scaling (ads + créateurs continus + SEO) du plan M3–M6.' });
  }
  if (m.ordersPaid >= R1K) {
    alerts.push({ level: 'green', title: 'Segment initial pénétré', detail: `${m.ordersPaid} clients — prêt à étendre aux segments adjacents.`, action: 'Lancer la Belgique (test 1 500 €) et les segments adjacents.' });
  }
  // Mesures grises = hypothèses à instrumenter
  if (m.cartToOrderPct === null) {
    alerts.push({ level: 'gray', title: 'Conversion non mesurée', detail: 'Le taux visite→commande et le CAC ne sont pas encore instrumentés (GA4/Plausible + UTM).', action: 'Installer analytics + garder les UTM sur tous les liens pour lire le CAC par canal.' });
  }
  return alerts;
}
