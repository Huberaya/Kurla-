/**
 * B2 — KITTING K02 / K03 FIGÉ CHEZ 3PL
 *
 * Le kitting n'est pas un « lot promo » : c'est un assemblage physique
 * (carton + picking + insertion + étiquette) confié au 3PL ou au grossiste.
 * Sans contenu exact, carton et coût figés, chaque commande est une surprise
 * opérationnelle (mauvais SKU, carton trop petit, coût oublié).
 *
 * Source de vérité :
 *  - contenu exact = LAUNCH_KITS (launchCatalog.ts) — NE JAMAIS DUPLIQUER,
 *  - specs kitting = ci-dessous, validées avec le 3PL et comparées au grossiste.
 *
 * Tant que le sourcing n'a pas rattaché les vrais SKU catalogue (launch-pXX),
 * les IDs pXX du plan restent la référence contractuelle avec le 3PL.
 */

import { LAUNCH_PRODUCTS } from './launchCatalog';

export type KittingSpec = {
  kitId: string; // k02, k03 (canonique, sans tiret)
  launchKitId: string; // launch-kXX magnétique catalogue
  name: string;
  /** Contenu exact SKU × quantité (toujours 1 de chaque, sauf mention) */
  components: Array<{ launchProductId: string; qty: number; name: string; format: string }>;
  /** Carton */
  carton: {
    dimensionsCm: string; // L×l×H
    weightKg: number; // poids brut estimé kit emballé
    cartonRef: string; // référence carton 3PL
    calage: string;
  };
  /** Coûts HT — ce que le 3PL facture, pas un objectif */
  costing: {
    kittingFeeEur: number; // picking + assemblage + fermeture carton (par kit)
    cartonCostEur: number; // carton + calage
    etiquetteTransportEur: number; // étiquette + insertion bordereau
    totalHandlingEur: number; // somme
    /** Alternative grossiste : s'il assemble à l'origine */
    grossisteAlternative: {
      available: boolean;
      feeEur: number | null; // facturé par le grossiste pour assembler
      moqKits: number | null; // MOQ spécifique kit
      leadTimeDays: number | null;
      note: string;
    };
  };
  /** Temps */
  timing: {
    prepSecondsPerKit: number; // temps 3PL mesuré
    dailyCapacityKits: number; // kits / jour / opérateur
  };
  status: 'figé' | 'à valider' | 'brouillon';
  validatedAt: string | null;
  validatedBy: string | null;
  notes: string;
};

function productName(id: string): string {
  return LAUNCH_PRODUCTS.find(p => p.id === id)?.name || id;
}
function productFormat(id: string): string {
  const n = productName(id);
  // extrait le format entre parenthèses
  const m = n.match(/\(([^)]+)\)/);
  return m ? m[1] : '';
}

export const KITTING_SPECS: KittingSpec[] = [
  {
    kitId: 'k02',
    launchKitId: 'launch-k02',
    name: 'KIT 02 — Hydratation & définition (3C/4A)',
    components: [
      { launchProductId: 'p01', qty: 1, name: productName('p01'), format: productFormat('p01') },
      { launchProductId: 'p04', qty: 1, name: productName('p04'), format: productFormat('p04') },
      { launchProductId: 'p08', qty: 1, name: productName('p08'), format: productFormat('p08') },
      { launchProductId: 'p13', qty: 1, name: productName('p13'), format: productFormat('p13') },
      { launchProductId: 'p11', qty: 1, name: productName('p11'), format: productFormat('p11') },
    ],
    carton: {
      dimensionsCm: '30 × 20 × 15',
      weightKg: 1.45,
      cartonRef: 'C30-3PL (simple cannelure, 32 lb)',
      calage: 'Kraft froissé + 1 cale carton (flacons verre)',
    },
    costing: {
      kittingFeeEur: 1.50,
      cartonCostEur: 0.52,
      etiquetteTransportEur: 0.18,
      totalHandlingEur: 2.20,
      grossisteAlternative: {
        available: true,
        feeEur: 0.85,
        moqKits: 100,
        leadTimeDays: 12,
        note: 'Grossiste assemble à l’entrepôt d’origine (AfricanFabs / Afro Wholesale) : 0,85 €/kit, MOQ 100 kits. Économie 1,35 €/kit mais +12 j de délai et pas de réassort à la demande.',
      },
    },
    timing: {
      prepSecondsPerKit: 95,
      dailyCapacityKits: 280,
    },
    status: 'figé',
    validatedAt: '2026-09-08',
    validatedBy: '3PL IDF (devis comparé n°3)',
    notes: 'Kit central — star des reco. 5 flacons (250–400 ml + 100 ml). Carton testé : ne pas descendre en C28, les 400 ml forcent la hauteur.',
  },
  {
    kitId: 'k03',
    launchKitId: 'launch-k03',
    name: 'KIT 03 — Nutrition profonde crépue (4B/4C)',
    components: [
      { launchProductId: 'p03', qty: 1, name: productName('p03'), format: productFormat('p03') },
      { launchProductId: 'p05', qty: 1, name: productName('p05'), format: productFormat('p05') },
      { launchProductId: 'p08', qty: 1, name: productName('p08'), format: productFormat('p08') },
      { launchProductId: 'p09', qty: 1, name: productName('p09'), format: productFormat('p09') },
      { launchProductId: 'p12', qty: 1, name: productName('p12'), format: productFormat('p12') },
    ],
    carton: {
      dimensionsCm: '32 × 22 × 16',
      weightKg: 1.62,
      cartonRef: 'C32-3PL (simple cannelure, 32 lb)',
      calage: 'Kraft + cloison carton (pot verre 340 g)',
    },
    costing: {
      kittingFeeEur: 1.60,
      cartonCostEur: 0.58,
      etiquetteTransportEur: 0.18,
      totalHandlingEur: 2.36,
      grossisteAlternative: {
        available: true,
        feeEur: 0.90,
        moqKits: 100,
        leadTimeDays: 14,
        note: 'Même alternative grossiste : 0,90 €/kit (pot verre plus fragile). Économie 1,46 €/kit mais stock bloqué en une fois et pas de split par canal.',
      },
    },
    timing: {
      prepSecondsPerKit: 105,
      dailyCapacityKits: 250,
    },
    status: 'figé',
    validatedAt: '2026-09-08',
    validatedBy: '3PL IDF (devis comparé n°3)',
    notes: 'Kit 4C — pots lourds (340 g + 227 g). Cloison obligatoire pour ne pas écraser le pot karité. Poids volumétrique Colissimo : 2 kg → tarif lettre-colis non applicable, prévoir étiquette 2 kg.',
  },
];

export function getKittingSpec(kitId: string): KittingSpec | undefined {
  const norm = kitId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return KITTING_SPECS.find(k => k.kitId === norm || k.launchKitId === kitId);
}

/** Comparatif 3PL vs grossiste pour un volume donné */
export function compareKittingEconomics(kitId: string, qty: number): {
  kitId: string;
  qty: number;
  tplTotal: number;
  grossisteTotal: number | null;
  savingGrossiste: number | null;
  recommendation: string;
} | null {
  const spec = getKittingSpec(kitId);
  if (!spec) return null;
  const tplTotal = Math.round(spec.costing.totalHandlingEur * qty * 100) / 100;
  const g = spec.costing.grossisteAlternative;
  if (!g.available || g.feeEur == null) {
    return { kitId, qty, tplTotal, grossisteTotal: null, savingGrossiste: null, recommendation: '3PL obligatoire — grossiste ne kitte pas ce kit.' };
  }
  // Le grossiste facture fee + carton (même carton) + étiquette
  const grossisteUnit = g.feeEur + spec.costing.cartonCostEur + spec.costing.etiquetteTransportEur;
  const grossisteTotal = Math.round(grossisteUnit * qty * 100) / 100;
  const saving = Math.round((tplTotal - grossisteTotal) * 100) / 100;
  const recommendation =
    qty < (g.moqKits || 100)
      ? `3PL recommandé (< ${g.moqKits} kits) : le grossiste exige ${g.moqKits} kits mini. Surcoût 3PL : ${(tplTotal - grossisteTotal).toFixed(2)} € assumé pour garder le flux à la demande.`
      : saving > 0
        ? `Grossiste moins cher de ${saving.toFixed(2)} € sur ${qty} kits, mais +${g.leadTimeDays} j et stock bloqué. Choisir grossiste uniquement pour un réassort planifié, 3PL pour le flux quotidien.`
        : `3PL compétitif : écart ${saving.toFixed(2)} € — garder 3PL pour la flexibilité.`;
  return { kitId, qty, tplTotal, grossisteTotal, savingGrossiste: saving, recommendation };
}

/** Résumé opérationnel pour l'expédition : ce que le 3PL doit recevoir */
export function kittingPickList(kitId: string): string {
  const spec = getKittingSpec(kitId);
  if (!spec) return 'Kit inconnu.';
  return [
    `${spec.name} — ${spec.status.toUpperCase()} ${spec.validatedAt ? `(${spec.validatedAt})` : ''}`,
    `Carton ${spec.carton.cartonRef} — ${spec.carton.dimensionsCm} — ${spec.carton.weightKg} kg — ${spec.carton.calage}`,
    `Kitting ${spec.costing.kittingFeeEur.toFixed(2)} € + carton ${spec.costing.cartonCostEur.toFixed(2)} € + étiquette ${spec.costing.etiquetteTransportEur.toFixed(2)} € = ${spec.costing.totalHandlingEur.toFixed(2)} € HT / kit`,
    `Temps ${spec.timing.prepSecondsPerKit}s / kit — capacité ${spec.timing.dailyCapacityKits} kits/j/opérateur`,
    ...spec.components.map(c => `  • ${c.qty}× ${c.launchProductId} — ${c.name}`),
    spec.costing.grossisteAlternative.available
      ? `Alternative grossiste : ${spec.costing.grossisteAlternative.feeEur?.toFixed(2)} €/kit, MOQ ${spec.costing.grossisteAlternative.moqKits}, ${spec.costing.grossisteAlternative.note}`
      : 'Alternative grossiste : non disponible',
  ].join('\n');
}
