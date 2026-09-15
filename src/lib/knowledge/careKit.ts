/**
 * KIT DE SOIN — matériel & produits indispensables (cheveux et peau).
 *
 * Ce que la personne doit « repartir avec » à la fin du diagnostic :
 *   1. sa fiche technique (les seuls champs qu'elle a déclarés — jamais de déduction),
 *   2. le matériel nécessaire (chaque outil est justifié par une étape de la
 *      routine générée — pas d'outil décoratif),
 *   3. la liste des produits indispensables par phase, et — seulement quand une
 *      référence KURLA est publiée dans le catalogue — le lien vers cette
 *      référence. Sinon : le type de produit reste la règle, sans inventer
 *      de marque ni de prix.
 *
 * Contrat : déterminisme total (mêmes réponses → même kit), aucune donnée
 * inventée, et chaque `product` référencé existe dans le catalogue transmis.
 * Assuré par le banc `kurla_care_kit`.
 */
import type { Product } from '../../types';
import type { HairAdvisoryContext } from './hairAdvisory';
import type { SkinAdvisoryContext } from './skinAdvisory';
import type { DiagnosticProfileField } from '../diagnosticResult';
import type { SkinKnowledgeProfile } from './skin';

/**
 * Forme structurelle de la routine générée (les couches conseil produisent
 * des `how` obligatoires, le modèle de résultat les porte en optionnels :
 * le kit ne lit que `action`, donc une forme commune plus lâche).
 */
interface KitRoutineStep {
  label: string;
  action: string;
  why: string;
  how?: string;
  expect?: string;
}
type KitRoutine = { morning: KitRoutineStep[]; evening: KitRoutineStep[]; weekly: KitRoutineStep[] };

export interface KitMaterial {
  name: string;
  why: string;
  /** Référence KURLA publiée, si elle existe dans le catalogue — jamais inventée. */
  product?: { name: string; slug: string };
}

export interface KitEssential {
  /** Phase de la routine à laquelle le produit est indispensable. */
  phase: string;
  /** Le TYPE de produit (la règle), pas une marque imposée. */
  type: string;
  why: string;
  /** Référence KURLA publiée, si elle existe dans le catalogue — jamais inventée. */
  product?: { name: string; slug: string };
  /** Marquage « non négociable » (ex. SPF). */
  nonNegotiable?: boolean;
}

export interface CareKit {
  isSkin: boolean;
  /** Fiche technique : les seuls champs déclarés, dans l'ordre du profil. */
  profileLines: string[];
  materials: KitMaterial[];
  /** Note honnête sur le matériel (ex. peau : aucun matériel spécial). */
  materialNote?: string;
  essentials: KitEssential[];
}

/* ------------------------------------------------------------------ */
/* Matching catalogue — jamais d'invention                             */
/* ------------------------------------------------------------------ */

function productRank(product: Product): number {
  if (product.availabilityState === 'available' && product.inStock) return 0;
  if (product.availabilityState === 'preorder') return 1;
  return 2;
}

/**
 * Première référence PUBLIÉE du catalogue dont le NOM correspond au type
 * recherché (le nom uniquement : un `routineStep` descriptif comme
 * « shampoo brush » ne doit pas faire matcher un shampoing). Aucune
 * correspondance → undefined : le type reste affiché seul, on n'invente ni
 * marque, ni prix, ni disponibilité.
 */
function pickProduct(
  products: Product[],
  re: RegExp,
  categories?: Product['category'][],
  not?: RegExp
): { name: string; slug: string } | undefined {
  const matches = products.filter(product =>
    product.slug &&
    !product.testListing &&
    (!categories || categories.includes(product.category)) &&
    re.test(product.name) &&
    !(not && not.test(product.name))
  );
  if (matches.length === 0) return undefined;
  // Tri stable par état commercial : le déterminisme est préservé car la liste
  // d'entrée est elle-même déterministe (catalogue publié, ordre serveur).
  const best = [...matches].sort((a, b) => productRank(a) - productRank(b))[0];
  return { name: best.name, slug: best.slug };
}

/* ------------------------------------------------------------------ */
/* Fiche technique — uniquement les champs déclarés                    */
/* ------------------------------------------------------------------ */

function profileLines(fields: DiagnosticProfileField[], keys: string[], isSkin: boolean): string[] {
  const lines = fields
    .filter(field => keys.includes(field.key) && field.known)
    .map(field => `${field.label} : ${field.value}`);
  if (isSkin && lines.length === 0) {
    // Aucune donnée déclarée : on ne devine rien — la routine minimale
    // (nettoyant + hydratant + SPF) reste valable, la fiche le dit.
    lines.push('Profil non renseigné : la routine de base (nettoyant doux + hydratant + SPF) reste valable.');
  }
  return lines;
}

/* ------------------------------------------------------------------ */
/* Cheveux                                                             */
/* ------------------------------------------------------------------ */

const HAIR_PROFILE_KEYS = ['texture', 'porosity', 'scalp', 'priority', 'frequency'];

export function buildHairKit(
  ctx: HairAdvisoryContext,
  routine: KitRoutine,
  products: Product[],
  fields: DiagnosticProfileField[]
): CareKit {
  const all = [...routine.morning, ...routine.evening, ...routine.weekly];
  const actionOf = (re: RegExp) => all.some(step => re.test(step.action));
  const hasScalp = actionOf(/^Cuir chevelu/);
  const hasClarify = actionOf(/Nettoyage profond/);
  const hasRefresh = actionOf(/Rafraîchir sans relaver/);
  const isLco = actionOf(/LCO/);
  const isLowPorosity = actionOf(/Soins légers/);
  const isWaterOnly = actionOf(/à l’eau/);
  const isLocked = isWaterOnly || actionOf(/le travail de la lock/);

  const materials: KitMaterial[] = [
    {
      name: 'Peigne à dents larges (démêloir)',
      why: 'Le démêlage se fait humide, des pointes vers la racine : c’est à sec, sous tension, que la fibre casse le plus.',
      product: pickProduct(products, /dents larges|démêloir|demeloir/i, ['accessoires']),
    },
    {
      name: 'Serviette microfibre (ou t-shirt 100 % coton)',
      why: 'Le séchage sans friction : moins de frottement, moins de frisottis et moins de casse aux extrémités.',
      product: pickProduct(products, /microfibre/i, ['accessoires']),
    },
    {
      name: 'Flacon vaporisateur (brume d’eau)',
      why: 'Le cheveu texturé vit à l’eau : la brume est l’outil de l’hydratation entre deux lavages et du rafraîchissement.',
      product: pickProduct(products, /vaporisateur/i, ['accessoires']),
    },
  ];
  if (hasScalp) {
    materials.push({
      name: 'Flacon applicateur à embout précis',
      why: 'Le soin du cuir chevelu s’applique goutte à goutte, sans couler sur les longueurs : les deux ne se mélangent pas.',
      product: pickProduct(products, /applicateur/i, ['accessoires']),
    });
  }
  materials.push({
    name: 'Bonnet satin + taie d’oreiller',
    why: 'La nuit en satin garde l’hydratation en place et limite la friction du coton — le geste le moins coûteux de toute la routine.',
    product: pickProduct(products, /bonnet satin|taie/i, ['accessoires']),
  });

  const essentials: KitEssential[] = [
    {
      phase: 'Jour de lavage',
      type: 'Shampoing doux sans sulfate (ou co-wash)',
      why: 'Nettoie sans décaper : le lavage est l’étape où l’hydratation repart de zéro.',
      product: pickProduct(products, /shampoing|shampoo|cleansing|co.?wash/i, ['cheveux'], /antipelliculaire|clarif|clarit|clarity|purif|gommage|brosse/i),
    },
    {
      phase: 'Jour de lavage',
      type: 'Conditionneur hydratant',
      why: 'Prépare le démêlage : sur cheveu mouillé et glissant, chaque nœud cède sans traction.',
      product: pickProduct(products, /conditioner|conditionneur|après-shampoing|apres-shampoing|co.?wash/i, ['cheveux'], /leave-in|leave in|detangler|knot today/i),
    },
  ];

  if (isLco) {
    essentials.push(
      {
        phase: 'Jour de lavage',
        type: 'Leave-in hydratant (le « L » du LCO)',
        why: 'La première couche : l’hydratation à base d’eau, sur cheveu essoré et humide.',
        product: pickProduct(products, /leave-in|leave in|detangler|knot today|moisture milk/i, ['cheveux']),
      },
      {
        phase: 'Jour de lavage',
        type: 'Beurre ou huile scellante (le « O » du LCO)',
        why: 'Scelle l’hydratation pour qu’elle ne s’évapore pas : la différence entre « ça tient le jour même » et « ça tient la semaine ».',
        product: pickProduct(products, /karité|karite|shea butter|ricin|castor|huile|oil/i, ['cheveux'], /masque|brosse|peigne|flacon|vaporisateur|spray|gel|mousse|perm|bigoudis|threading|steam|diffuseur|vinaigre|argan oil|rinse|rinçage|kit|conditioner|conditionneur|leave-in|leave in|detangler/i),
      }
    );
  } else if (isLowPorosity) {
    essentials.push({
      phase: 'Jour de lavage',
      type: 'Leave-in léger à base d’eau (ou gel léger)',
      why: 'Porosité faible : des textures légères qui pénètrent — si le cheveu pèse ou colle, c’est trop, pas en plus.',
      product: pickProduct(products, /leave-in|leave in|custard|smoothie|mousse/i, ['cheveux']),
    });
  }
  // Cas locks : l’hydratation passe par l’eau et le conditionneur léger déjà
  // listés — pas de beurre ni d’huile ajoutés (dépôts).

  if (!isLocked) {
    essentials.push({
      phase: 'Jour de lavage',
      type: 'Coiffant : gel, custard ou mousse (tenue selon la coiffure)',
      why: 'La coiffure protège quand elle ne tire pas : la tenue se choisit sur la coiffure usuelle, pas sur la force maximum.',
      product: pickProduct(products, /gel|custard|mousse|twisting|styling|curling/i, ['cheveux'], /kit|spray|thermo|heat protect|oil spray/i),
    });
  }

  if (hasScalp) {
    essentials.push({
      phase: 'Jour de lavage',
      type: 'Soin ciblé cuir chevelu (texture légère, à base d’eau)',
      why: 'Le cuir chevelu ne veut que du léger : les beurres et huiles épais y pèsent et obstruent, sans rien apporter.',
      product: pickProduct(products, /scalp|cuir chevelu|romarin|rosemary/i, ['cheveux'], /brosse|peigne|flacon|vaporisateur|masque|kit|spray thermo/i),
    });
  }

  if (hasRefresh) {
    essentials.push({
      phase: 'Entre deux lavages',
      type: 'Spray rafraîchissant (eau + leave-in)',
      why: 'Redonne de la définition sans relaver — le lavage est le geste le plus desséchant de la routine, on le réserve au jour de lavage.',
      product: pickProduct(products, /refresh|revitalizer|comeback|refreshing/i, ['cheveux']),
    });
  }

  essentials.push({
    phase: 'Chaque semaine',
    type: 'Masque profond (hydratant — ou protéiné si la fibre casse)',
    why: 'Le soin en profondeur que le quotidien ne fait pas : on rince, le masque n’est pas un leave-in.',
    product: pickProduct(products, /masque|mask|deep treatment|treatment|protein|strengthen/i, ['cheveux'], /brosse|peigne|flacon|vaporisateur|spray|kit|gommage/i),
  });

  if (ctx.priority === 'casse') {
    essentials.push({
      phase: 'Chaque semaine (en alternance)',
      type: 'Soin protéiné / reconstructeur de liens',
      why: 'La fibre cassante a besoin de force, en alternance avec l’hydratation : trop de protéines rend le cheveu rêche.',
      product: pickProduct(products, /protein|reconstruct|two-step|lien/i, ['cheveux']),
    });
  }

  if (hasClarify) {
    essentials.push({
      phase: 'Occasionnel (≈ 1×/mois)',
      type: 'Nettoyage profond (shampoing clarifiant ou rinçage vinaigre)',
      why: 'Retire les résidus installés : c’est un geste correcteur, pas un rythme — s’il faut clarifier chaque semaine, la cause est en amont.',
      product: pickProduct(products, /clarif|purif|vinaigre|clarifying/i, ['cheveux']),
    });
  }

  return {
    isSkin: false,
    profileLines: profileLines(fields, HAIR_PROFILE_KEYS, false),
    materials,
    essentials,
  };
}

/* ------------------------------------------------------------------ */
/* Peau                                                                */
/* ------------------------------------------------------------------ */

const SKIN_PROFILE_KEYS = ['skinType', 'phototype', 'skinConcerns', 'skinObjectives', 'sensitivity'];

export function buildSkinKit(
  ctx: SkinAdvisoryContext,
  routine: KitRoutine,
  products: Product[],
  fields: DiagnosticProfileField[],
  knowledgeProfile: SkinKnowledgeProfile | null
): CareKit {
  const all = [...routine.morning, ...routine.evening, ...routine.weekly];
  const hasTargetStep = all.some(step => /ciblé|cibled|Actif ciblé/.test(step.action));
  const hasExfoliation = all.some(step => /^Exfoliation/.test(step.action));
  const hasSpf = routine.morning.some(step => /SPF/.test(step.action));

  // Matériel : la vérité est qu'une routine peau n'en demande pas.
  const materials: KitMaterial[] = [
    {
      name: 'Mains propres',
      why: 'L’unique « outil » réellement nécessaire : les actifs s’appliquent aux doigts, sur peau propre, sans vaisselle de produits à stériliser.',
    },
  ];

  const essentials: KitEssential[] = [
    {
      phase: 'Matin + soir',
      type: 'Nettoyant doux',
      why: 'La base de toute la routine : retire les résidus sans décaper la barrière. Le matin un passage suffit, le soir il retient le SPF.',
      product: pickProduct(products, /nettoy|cleansing|cleanser|surfact|gel de toilette|lavage|micellaire/i, ['peau']),
    },
  ];

  if (hasTargetStep) {
    essentials.push({
      phase: ctx.skinConcerns?.includes('taches') || ctx.skinObjectives?.includes('attenuer_taches')
        ? 'Matin (et/ou soir)'
        : 'Soir',
      type: 'Sérum ciblé (l’actif de votre préoccupation déclarée)',
      why: 'Travaille la cause, pas le symptôme : une fréquence progressive, un seul actif nouveau à la fois.',
      product: pickProduct(products, /serum|sérum|niacin|azela|bakuchiol|hyaluronic|acide hyaluronique/i, ['peau']),
    });
  }

  if (hasSpf) {
    essentials.push({
      phase: 'Matin — tous les jours',
      type: 'SPF 30+ sans trace blanche',
      why: 'Le geste non négociable, même par temps couvert : les UV foncent les taches existantes et ternissent le teint. « Invisible » n’est promis que si un test whitecast le prouve sur peau foncée.',
      product: pickProduct(products, /spf|solaire|sunscreen|uv/i, ['peau']),
      nonNegotiable: true,
    });
  }

  essentials.push({
    phase: 'Soir',
    type: 'Crème hydratante (barrière)',
    why: 'Terminer par ce qui retient : l’hydratation s’évapore, la barrière la scelle. Texture selon le besoin — gel/lotion si brillance, crème/baume si sécheresse.',
    product: pickProduct(products, /creme|crème|barrier|ceramide|céramide|baume|hydratant/i, ['peau'], /rince|rinçage|vinaigre|acv|nettoy|exfol|bha|aha|gel de toilette/i),
  });

  if (hasExfoliation) {
    essentials.push({
      phase: '1×/semaine (soir)',
      type: 'Exfoliation douce (chimique, à base d’acides)',
      why: 'Renouvellement de surface à fréquence limitée : elle aide le grain à se réguler sans frotter. Plus n’est pas mieux.',
      product: pickProduct(products, /exfol|gommage|aha|bha|acide glycol|acide lacto/i, ['peau'], /creme|crème|nettoy/i),
    });
  }

  const materialNote = knowledgeProfile
    ? `Une routine peau ne demande aucun matériel spécial — la régularité compte plus que l’équipement. (Profil : ${knowledgeProfile.name}.)`
    : 'Une routine peau ne demande aucun matériel spécial — la régularité compte plus que l’équipement.';

  return {
    isSkin: true,
    profileLines: profileLines(fields, SKIN_PROFILE_KEYS, true),
    materials,
    materialNote,
    essentials,
  };
}
