/**
 * KURLA SKIN — Routine adaptative V1 (C3)
 * Matin 6 / Soir 8 / Hebdo 3 adaptés phototype + sensibilité + HPI + saison
 * Règles : phototype V–VI → SPF invisible obligatoire, sensible → sans parfum + céramides, HPI → niacinamide matin.
 * Incompatibilités temps-réel : rétinol×AHA même soir bloqué (voir skinRecommendation).
 */

import { BeautyProfile, UNKNOWN } from './beautyProfile';
import { Product } from '../types';
import { peauKitForBudget, peauKitForSkinType } from './peauKits';
import { scoreSkinProduct } from './skinRecommendation';

export type RoutineTier = 'Essentielle' | 'Équilibrée' | 'Experte';
export type RoutineMoment = 'matin' | 'soir' | 'hebdo';

export type RoutineStepSpec = {
  moment: RoutineMoment;
  order: number;
  label: string; // ex: Nettoyant, Sérum niacinamide
  keyword: string; // pour findForStep
  family: string; // routineFamily
  required: boolean;
  why: string; // explication courte
  incompatibilityGroup?: string; // rétinol / aha / bha pour bloquer
};

const MATIN_6: RoutineStepSpec[] = [
  { moment: 'matin', order: 1, label: 'Nettoyant doux', keyword: 'nettoyant', family: 'nettoyant', required: true, why: 'Matin : débarrasse sébum nuit sans dessécher' },
  { moment: 'matin', order: 2, label: 'Tonique / Essence (optionnel)', keyword: 'tonique', family: 'tonique', required: false, why: 'Prépare la peau, pH' },
  { moment: 'matin', order: 3, label: 'Sérum (niacinamide si HPI)', keyword: 'niacinamide', family: 'serum', required: true, why: 'Uniformise (HPI), priorité peaux mélaninées' },
  { moment: 'matin', order: 4, label: 'Gel hydratant / acide hyaluronique', keyword: 'hyaluronique', family: 'serum', required: true, why: 'Hydratation sans lourdeur' },
  { moment: 'matin', order: 5, label: 'Crème barrière (céramides)', keyword: 'céramides', family: 'hydratant', required: true, why: 'Scelle eau + lipides' },
  { moment: 'matin', order: 6, label: 'SPF 50 invisible', keyword: 'spf', family: 'spf', required: true, why: 'Phototype V–VI : hybride/organique sans trace blanche' },
];

const SOIR_8: RoutineStepSpec[] = [
  { moment: 'soir', order: 1, label: 'Huile / baume démaquillant', keyword: 'démaquillant', family: 'nettoyant', required: false, why: 'Si maquillage/SPF tenace' },
  { moment: 'soir', order: 2, label: 'Nettoyant doux', keyword: 'nettoyant', family: 'nettoyant', required: true, why: 'Soir : nettoie pollution/SPF' },
  { moment: 'soir', order: 3, label: 'Tonique', keyword: 'tonique', family: 'tonique', required: false, why: 'Rafraîchit' },
  { moment: 'soir', order: 4, label: 'Sérum 1 — niacinamide ou vitamine C', keyword: 'niacinamide', family: 'serum', required: true, why: 'HPI : niacinamide soir A / vit C soir B' },
  { moment: 'soir', order: 5, label: 'Sérum 2 — rétinol (2×/sem, pas avec AHA)', keyword: 'retinol', family: 'serum', required: false, why: 'Anti-âge — jamais même soir que AHA/BHA', incompatibilityGroup: 'retinol' },
  { moment: 'soir', order: 6, label: 'Contour des yeux', keyword: 'contour', family: 'yeux', required: false, why: 'Cernes/poches si besoin' },
  { moment: 'soir', order: 7, label: 'Crème riche / baume', keyword: 'céramides', family: 'hydratant', required: true, why: 'Répare nuit' },
  { moment: 'soir', order: 8, label: 'Baume lèvres / corps si sec', keyword: 'baume', family: 'huile', required: false, why: 'Confort' },
];

const HEBDO_3: RoutineStepSpec[] = [
  { moment: 'hebdo', order: 1, label: 'Exfoliant AHA/BHA 1×/sem', keyword: 'exfoliant', family: 'exfoliant', required: true, why: 'Grain & taches — pas le même soir que rétinol', incompatibilityGroup: 'aha' },
  { moment: 'hebdo', order: 2, label: 'Masque barrière / hydratant 1×/sem', keyword: 'masque', family: 'masque', required: false, why: 'Coup de pouce hydratation' },
  { moment: 'hebdo', order: 3, label: 'Gommage lèvres / corps doux', keyword: 'gommage', family: 'exfoliant', required: false, why: 'Optionnel' },
];

const ALL_STEPS = [...MATIN_6, ...SOIR_8, ...HEBDO_3];

export type BuiltSkinRoutine = {
  tier: RoutineTier;
  kitId: string;
  steps: Array<RoutineStepSpec & { product?: Product; alternative?: Product; alert?: string; price: number }>;
  totalPrice: number;
  economyVsSeparate: number;
  incompatibilities: string[];
};

function isKnown(v: string | undefined): boolean { return !!v && v !== UNKNOWN && v !== '' && v !== 'inconnu'; }

function pickProduct(keyword: string, family: string, pool: Product[], ctx: { budgetMax?: number; preferSansParfum?: boolean; preferInvisible?: boolean }): Product | undefined {
  // petit scoring via skinRecommendation (budget + préférences) pour 1 step
  const scored = pool
    .map(p => {
      const { score } = scoreSkinProduct(p, { activeFilters: { actif: keyword.includes('niacinamide') ? 'niacinamide' : keyword.includes('retinol') ? 'retinol' : undefined, budgetMax: ctx.budgetMax, sansParfum: ctx.preferSansParfum, spfInvisible: ctx.preferInvisible } });
      const hay = `${p.name} ${p.description} ${(p as any).inci||''} ${(p.keyIngredients||[]).join(' ')}`.toLowerCase();
      let s = score;
      if (hay.includes(keyword.toLowerCase())) s += 6;
      if ((p as any).routineStep && (p as any).routineStep.toLowerCase().includes(family)) s += 4;
      return { p, s };
    })
    .sort((a,b)=> b.s - a.s);
  return scored[0]?.p;
}

export function buildSkinRoutine(profile: BeautyProfile | undefined, pool: Product[], opts?: { tier?: RoutineTier }): BuiltSkinRoutine {
  const skin = profile?.skin;
  const budget = skin?.budget as string | undefined;
  const skinType = skin?.skinType as string | undefined;
  const sensitivity = skin?.sensitivity as string | undefined;
  const phototype = skin?.toneDepth as string | undefined; // clair/interm/fonce/tres_fonce → map V–VI
  const toneDepth = skin?.toneDepth;
  const hasHPI = skin?.hyperpigmentationTendency === 'frequente' || (skin?.skinConcerns||[]).some(c=>/taches|hyperpigmentation|teint_terne/i.test(c));

  // Tier choisi : opts.tier > budget > skinType
  let tier: RoutineTier = opts?.tier || 'Essentielle';
  if (!opts?.tier) {
    if (budget === 'confortable' || budget === 'premium') tier = 'Experte';
    else if (budget === 'moyen') tier = 'Équilibrée';
    else if (skinType === 'mature') tier = 'Experte';
  }

  const kit = (tier === 'Experte' ? peauKitForBudget('premium') : tier === 'Équilibrée' ? peauKitForBudget('moyen') : peauKitForBudget('petit'));
  const budgetMax = tier === 'Experte' ? 45 : tier === 'Équilibrée' ? 28 : 14;
  const preferSansParfum = sensitivity === 'elevee' || (skin?.sensitivities||[]).includes('parfum') || (skin?.preferences||[]).includes('sans parfum');
  const preferInvisible = toneDepth === 'fonce' || toneDepth === 'tres_fonce' || phototype === 'fonce' || phototype === 'tres_fonce';

  // Sélection steps selon tier
  let stepsSpecs: RoutineStepSpec[] = [];
  if (tier === 'Essentielle') stepsSpecs = [MATIN_6[0], MATIN_6[4], MATIN_6[5], SOIR_8[1], SOIR_8[6]]; // 5 steps = KPEAU-01 + soir nettoyant
  else if (tier === 'Équilibrée') stepsSpecs = [...MATIN_6.slice(0,6), SOIR_8[1], SOIR_8[3], SOIR_8[6]]; // 9 steps
  else stepsSpecs = [...MATIN_6, ...SOIR_8.filter(s=> s.required || s.keyword==='retinol'), ...HEBDO_3.slice(0,1)]; // complet

  // Phototype V–VI → SPF invisible obligatoire (remplace SPF générique)
  const phototypeVI = preferInvisible;
  // HPI → boost niacinamide matin (déjà dans MATIN_6[2])

  const built: BuiltSkinRoutine['steps'] = [];
  let total = 0;
  const incompatibilities: string[] = [];

  for (const spec of stepsSpecs) {
    const product = pickProduct(spec.keyword, spec.family, pool, { budgetMax, preferSansParfum, preferInvisible: spec.family==='spf' ? phototypeVI : undefined });
    const price = product ? Number(product.price) || 0 : 0;
    total += price;
    let alert: string | undefined;
    // Rétinol × AHA même soir → alerte
    if (spec.incompatibilityGroup === 'retinol' && stepsSpecs.some(s=> s.incompatibilityGroup==='aha')) {
      alert = 'Rétinol et AHA/BHA même soir = irritation. Alternez : soir A (rétinol), soir B (exfoliant).';
      if (!incompatibilities.includes('rétinol × AHA')) incompatibilities.push('rétinol × AHA — alternez');
    }
    // SPF phototype foncé → alerte whitecast
    if (spec.family==='spf' && phototypeVI && product) {
      const hay = `${product.name} ${product.description}`.toLowerCase();
      if (/minéral|mineral|titanium|zinc/i.test(hay) && !/invisible|hybride|organique/i.test(hay)) {
        alert = 'SPF minéral pur → trace blanche possible sur phototype V–VI. Préférez invisible hybride.';
      }
    }
    built.push({ ...spec, product, price, alert });
  }

  // Si sensible → s'assurer sans parfum (sinon alerte)
  if (preferSansParfum) {
    for (const s of built) {
      if (s.product && (s.product as any).containsFragrance) {
        s.alert = (s.alert ? s.alert + ' · ' : '') + 'Sans parfum recommandé (peau sensible).';
      }
    }
  }

  const economy = 0; // calculé côté peauKits si kit complet, sinon 0

  return { tier, kitId: kit.id, steps: built, totalPrice: Math.round(total*100)/100, economyVsSeparate: economy, incompatibilities };
}

export const SKIN_ROUTINE_TIERS: Record<RoutineTier, { steps: number; price: string; desc: string }> = {
  Essentielle: { steps: 5, price: '49,70€', desc: '3 soins + 2 soir — la base barrière + SPF invisible' },
  Équilibrée: { steps: 9, price: '62€', desc: '5 soins — HPI + hydratation' },
  Experte: { steps: 12, price: '84,90€', desc: '7 soins + hebdo — grain & taches' },
};
