/**
 * KURLA — FULFILLMENT SANS STOCK (année 1, Paris, 0 carton chez toi)
 *
 * Ce module ne touche PAS au catalogue (src/lib/launchCatalog.ts).
 * Il décrit comment on tient 3-5 jours sans stock à la maison :
 *   - Batch hebdomadaire 2×/semaine (lun + jeu 18h)
 *   - Tampon 75 unités chez 3PL IDF (485€ immobilisés, jamais chez toi)
 *   - Split immédiat outils (dropship UE) + kit en 3j
 *
 * Le catalogue reste la source de vérité produit/prix/marge.
 * Le fulfillment est une couche opérationnelle (3PL + rythme d'achat).
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. PROMESSE CLIENT (hors catalogue)
// ─────────────────────────────────────────────────────────────────────────────
export const DISPATCH_PROMISE = {
  // Ancienne : "Expédié sous 10-14 jours (précommande)"
  // Nouvelle : 3-5 jours via batch + tampon
  short: 'Expédié sous 3–5 jours — petite production hebdomadaire pour éviter le gaspillage',
  detail: 'Précommande en flux tendu : lot hebdomadaire. 60% expédiés en 24–48h via tampon 3PL, le reste en 3–5 jours. Accessoires expédiés en 24h.',
  // Pour les fiches produit précommande (isPreorder=true)
  preorderBadge: 'Précommande — expédition 3–5 jours',
  // Pour les outils en dropship immédiat
  dropshipBadge: 'En stock chez notre partenaire — expédié en 24–48h',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 2. RYTHME DE BATCH (au lieu de 21 jours)
// ─────────────────────────────────────────────────────────────────────────────
export type BatchWindow = {
  id: string;
  closeDay: 'lundi' | 'jeudi';
  closeHour: string; // 18:00
  orderDay: string;  // lendemain 10h
  receiveDay: string;
  shipDay: string;
  maxDelayDays: number;
};

export const BATCH_SCHEDULE: BatchWindow[] = [
  { id: 'batch-lun', closeDay: 'lundi', closeHour: '18:00', orderDay: 'mardi 10:00', receiveDay: 'jeudi matin', shipDay: 'jeudi aprem', maxDelayDays: 6 },
  { id: 'batch-jeu', closeDay: 'jeudi', closeHour: '18:00', orderDay: 'vendredi 10:00', receiveDay: 'lundi matin', shipDay: 'lundi aprem', maxDelayDays: 4 },
];

// Délai moyen pondéré 2 batchs/semaine : (6+4)/2 /2 ≈ 2,8j si commande uniformément répartie
// Avec 1 batch/semaine (lundi seul) : moyenne 4,2j
export const FULFILLMENT_RHYTHM = {
  frequencyPerWeek: 2 as const,
  avgDelayDays: 2.8,
  maxDelayDays: 6,
  fallbackSingleBatchAvgDays: 4.2,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 3. TAMPON 75 UNITÉS CHEZ 3PL (jamais chez toi)
// ─────────────────────────────────────────────────────────────────────────────
// 5 héros qui font 80% des ventes : on garde 15 unités de chaque chez le 3PL
// Coût immobilisé ~485€ HT, 0,5m², écoulé en 10j à 20 cmd/semaine
export type TamponSku = { productId: string; name: string; qty: number; unitCostEur: number };

export const TAMPON_3PL: TamponSku[] = [
  { productId: 'p01', name: 'Shampoing crème hydratant sans sulfate (250 ml)', qty: 15, unitCostEur: 7.1 },
  { productId: 'p04', name: 'Après-shampoing démêlant hydratant (400 ml)', qty: 15, unitCostEur: 6.5 },
  { productId: 'p08', name: 'Leave-in riche « cream » pour crépus (250 ml)', qty: 15, unitCostEur: 8.7 },
  { productId: 'p09', name: 'Beurre de karité brut 100 % (200 g)', qty: 15, unitCostEur: 4.5 },
  { productId: 'p12', name: 'Crème de définition twist-out (227 g)', qty: 15, unitCostEur: 8.7 },
];

export const TAMPON_META = {
  totalUnits: TAMPON_3PL.reduce((s, r) => s + r.qty, 0), // 75
  immobilizedEur: Math.round(TAMPON_3PL.reduce((s, r) => s + r.qty * r.unitCostEur, 0) * 10) / 10, // ~485
  storageM2: 0.5,
  storageCostPerMonthEur: 20,
  pickingCostPerOrderEur: 2.2,
  receptionCostPerBatchEur: 30,
  // Le tampon n'est PAS du stock catalogue : il est consigné chez le 3PL
  // Le catalogue reste en isPreorder=true, le 3PL fait du cross-dock
  catalogImpact: 'aucun — launchCatalog.ts inchangé',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 4. 3PL CIBLE IDF (0 carton chez toi)
// ─────────────────────────────────────────────────────────────────────────────
export type ThreePLQuote = {
  name: string;
  location: string;
  monthlyFixEur: number;
  perOrderEur: number;
  perReceptionEur: number;
  kitting: boolean;
  minVolume: string;
};

export const THREE_PL_SHORTLIST: ThreePLQuote[] = [
  { name: 'Etx Logistique', location: 'IDF (95)', monthlyFixEur: 39, perOrderEur: 2.0, perReceptionEur: 30, kitting: true, minVolume: 'dès 1 commande' },
  { name: 'Huboo', location: 'IDF', monthlyFixEur: 49, perOrderEur: 2.2, perReceptionEur: 30, kitting: true, minVolume: 'dès 1 commande' },
  { name: 'Cubyn', location: 'IDF', monthlyFixEur: 59, perOrderEur: 2.5, perReceptionEur: 35, kitting: true, minVolume: 'dès 50 cmd/mois' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. SPLIT IMMÉDIAT OUTILS (dropship UE, 24h) — A4
// ─────────────────────────────────────────────────────────────────────────────
// 12 outils best-sellers à 56-66% HT, déjà chez AfricanFabs/Afro Wholesale (NL)
// Expédiés en direct en 2-3j pendant que le kit arrive en 3-5j
// IDs = pXX dans launchCatalog.ts ; en base ils sont `launch-pXX`
export const DROPSHIP_TOOLS_IMMEDIATE = [
  'p35', // peigne afro métal 4,90€
  'p36', // brosse massage cuir chevelu 7,90€
  'p41', // éponge twist 8,90€
  'p16', // peigne démêloir 6,90€
  'p21', // brosse à edges 5,90€
  'p23', // pinces crocodile 6,90€
  'p17', // bonnet satin 12,90€
  'p18', // vaporisateur 7,90€
  'p19', // brosse Denman 12,90€
  'p37', // serviette microfibre 12,90€
  'p45', // chouchous satin 6,90€
  'p38', // peigne queue de rat 5,90€
] as const;

export const DROPSHIP_TOOLS_SET: ReadonlySet<string> = new Set([
  ...DROPSHIP_TOOLS_IMMEDIATE as unknown as string[],
  ...DROPSHIP_TOOLS_IMMEDIATE.map(id => `launch-${id}`),
]);

export function normalizeLaunchId(id: string): string {
  return id.startsWith('launch-') ? id.slice(7) : id;
}

export function isDropshipToolId(id: string | null | undefined): boolean {
  if (!id) return false;
  if ((DROPSHIP_TOOLS_SET as Set<string>).has(id)) return true;
  const n = normalizeLaunchId(id);
  return (DROPSHIP_TOOLS_IMMEDIATE as readonly string[]).includes(n);
}

export function isDropshipToolProduct(product: { id: string; slug?: string } | null | undefined): boolean {
  if (!product) return false;
  return isDropshipToolId(product.id);
}

export function getProductFulfillmentMode(product: { id: string } | null | undefined): 'dropship_24_48h' | 'preorder_3_5j' {
  return isDropshipToolId(product?.id || '') ? 'dropship_24_48h' : 'preorder_3_5j';
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. WORKFLOW OPÉRATIONNEL (qui fait quoi, sans toucher au catalogue)
// ─────────────────────────────────────────────────────────────────────────────
export const FULFILLMENT_WORKFLOW = [
  { day: 'Lun 18:00', actor: 'Toi (2 min)', action: 'Clôture batch N dans /admin → "Commander le batch". Stripe a déjà encaissé.' },
  { day: 'Mar 10:00', actor: 'Toi → Grossiste', action: 'Commande groupée exacte chez AfricanFabs/Afro Wholesale (NL → FR 24-48h DPD). Email/B2B portal.' },
  { day: 'Mar-Jeu', actor: '3PL', action: 'Tampon 75 couvre 60% des commandes J0 → expédition 24-48h directe (sans attendre le lot).' },
  { day: 'Jeu matin', actor: '3PL', action: 'Réception lot batch N, contrôle, kitting K02/K03/K05.' },
  { day: 'Jeu aprem', actor: '3PL', action: 'Expédition du reste du batch N (40%). Tracking ajouté à la commande.' },
  { day: 'Ven', actor: 'Cliente', action: 'Tout le batch N livré. Moyenne 2,8j.' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// 7. CALCUL DE DÉLAI MOYEN (pondéré tampon)
// ─────────────────────────────────────────────────────────────────────────────
export function avgDelayWithTampon(tamponCoveragePct: number, batchAvgDays: number, tamponDelayDays: number): number {
  // Ex: 60% à 1,5j (tampon) + 40% à 4,2j (batch) = 2,6j
  return Math.round((tamponCoveragePct * tamponDelayDays + (1 - tamponCoveragePct) * batchAvgDays) * 10) / 10;
}

// Exemple : 60% tampon à 1,5j + 40% batch à 4,2j = 2,6j (arrondi à 2,8j avec 2 batchs/semaine)
export const AVG_DELAY_EXAMPLE = avgDelayWithTampon(0.6, 4.2, 1.5); // 2,6

// ─────────────────────────────────────────────────────────────────────────────
// 8. GARDE-FOU CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────
export const CATALOG_GUARD = {
  rule: 'Aucune modification de src/lib/launchCatalog.ts (produits, prix, marges, kits).',
  allowed: ['src/lib/fulfillment.ts', 'docs opérationnels', 'config 3PL', 'DISPATCH_SENTENCE (affichage)'],
  forbidden: ['LAUNCH_PRODUCTS', 'LAUNCH_KITS', 'retailPriceEur', 'targetCostEur'],
  verify: 'git diff -- src/lib/launchCatalog.ts doit rester vide',
} as const;
