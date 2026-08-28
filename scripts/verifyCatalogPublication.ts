/**
 * CHANTIER 14 — PASSAGE DE VÉRIFICATION DU CATALOGUE.
 *
 * Pourquoi un script et pas un bouton : la publication exige sept vérifications
 * (`claims`, `stock`, `certifications`, `translations`, `ingredients`,
 * `images`, `brand`). Quatre d'entre elles se décident **à partir de ce qui est
 * écrit en base** et peuvent donc être vérifiées de façon reproductible ; les
 * trois autres sont des attestations humaines. Ce script fait exactement la
 * première moitié, et dit explicitement qu'il ne fait pas la seconde.
 *
 * Usage :
 *   SUPABASE_URL=… SUPABASE_SECRET_KEY=… npx tsx scripts/verifyCatalogPublication.ts          # lecture seule
 *   … npx tsx scripts/verifyCatalogPublication.ts --apply                                     # enregistre les événements
 *   … npx tsx scripts/verifyCatalogPublication.ts --apply --only=p1,p9                        # périmètre restreint
 *
 * Chaque vérification enregistrée porte une note qui décrit la méthode. Un
 * statut de conformité sans méthode est inutilisable six mois plus tard, quand
 * plus personne ne sait ce que le mot « vérifié » couvrait.
 */
import { getSupabaseServerClient } from '../src/lib/supabaseClient';
import { serverDb } from '../src/lib/serverDb';
import { recordCatalogValidation } from '../src/lib/db/catalogStore';
import { getProductIngredientLinks } from '../src/lib/db/ingredientLinkStore';
import { scanCatalogClaims, describeClaimScan, foldForClaimSearch } from '../src/lib/catalogClaims';
import { parseDeclaredIngredient } from '../src/lib/jurisdiction';

type Verdict = 'passed' | 'failed' | 'pending';

interface CheckOutcome {
  checkType: 'claims' | 'stock' | 'certifications' | 'translations' | 'ingredients';
  status: Verdict;
  note: string;
}

const AUTOMATABLE_NOTE = 'Contrôle automatique (chantier 14) — ';

/** Les traductions éventuelles porteraient un suffixe de locale sur la colonne. */
const LOCALE_SUFFIX = /_(en|es|de|it|nl|pt|be|lu)$/i;

function checkClaims(row: Record<string, unknown>): CheckOutcome {
  const scan = scanCatalogClaims(row);
  return {
    checkType: 'claims',
    status: scan.clean ? 'passed' : 'failed',
    note: AUTOMATABLE_NOTE + describeClaimScan(scan)
  };
}

function checkStock(row: Record<string, unknown>): CheckOutcome {
  const inStock = row.in_stock;
  const quantity = row.stock_quantity;
  if (typeof inStock !== 'boolean') {
    return { checkType: 'stock', status: 'failed', note: `${AUTOMATABLE_NOTE}disponibilité absente : la colonne in_stock n’est pas un booléen (valeur : ${JSON.stringify(inStock) ?? 'null'}).` };
  }
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
    return { checkType: 'stock', status: 'failed', note: `${AUTOMATABLE_NOTE}quantité inexploitable : stock_quantity = ${JSON.stringify(quantity) ?? 'null'}.` };
  }
  if (inStock && quantity <= 0) {
    return { checkType: 'stock', status: 'failed', note: `${AUTOMATABLE_NOTE}incohérence : annoncé disponible avec stock_quantity = ${quantity}.` };
  }
  if (!inStock && quantity > 0) {
    return { checkType: 'stock', status: 'pending', note: `${AUTOMATABLE_NOTE}incohérence à trancher : annoncé indisponible avec stock_quantity = ${quantity}.` };
  }
  return { checkType: 'stock', status: 'passed', note: `${AUTOMATABLE_NOTE}cohérence disponibilité/quantité vérifiée sur les valeurs en base (in_stock = ${inStock}, stock_quantity = ${quantity}). Contrôle de cohérence, non un inventaire physique.` };
}

function checkCertifications(row: Record<string, unknown>): CheckOutcome {
  const raw = row.certifications;
  const entries: unknown[] = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === 'object' ? Object.entries(raw as Record<string, unknown>).filter(([, value]) => value !== null && value !== '' && value !== false) : []);
  if (entries.length === 0) {
    return { checkType: 'certifications', status: 'passed', note: `${AUTOMATABLE_NOTE}aucune certification revendiquée sur la fiche : il n’y a rien à justifier. Si une certification est ajoutée, ce contrôle repasse en attente.` };
  }
  const names = entries.slice(0, 5).map(entry => (typeof entry === 'string' ? entry : JSON.stringify(entry))).join(' ; ');
  return { checkType: 'certifications', status: 'pending', note: `${AUTOMATABLE_NOTE}${entries.length} certification(s) revendiquée(s) : ${names}. Les certificats correspondants ne sont pas rattachés à la fiche.` };
}

function checkTranslations(row: Record<string, unknown>): CheckOutcome {
  const translated = Object.keys(row).filter(key => LOCALE_SUFFIX.test(key));
  if (translated.length === 0) {
    return { checkType: 'translations', status: 'passed', note: `${AUTOMATABLE_NOTE}fiche monolingue : aucune colonne traduite dans le schéma (contrôle sur les ${Object.keys(row).length} colonnes de la ligne). Rien à relire ; une fiche multilingue repasserait ce contrôle en attente.` };
  }
  return { checkType: 'translations', status: 'pending', note: `${AUTOMATABLE_NOTE}${translated.length} colonne(s) traduite(s) détectée(s) : ${translated.slice(0, 6).join(', ')}. Relecture humaine requise.` };
}

/**
 * Composition : chaque mention déclarée doit correspondre à une entité
 * rattachée. La comparaison porte sur le nom débarrassé de sa concentration
 * (« Niacinamide 5 % » → « Niacinamide »), comme le fait le lieur — et contre
 * l'INCI **et** les noms usuels de l'entité (« Beurre de Karité » →
 * Butyrospermum Parkii Butter).
 */
function checkIngredients(declared: string[], linkedNames: string[]): CheckOutcome {
  if (declared.length === 0) {
    return { checkType: 'ingredients', status: 'failed', note: `${AUTOMATABLE_NOTE}aucune composition déclarée sur la fiche.` };
  }
  /**
   * Le pliage neutralise casse, diacritiques **et** apostrophes. Sans lui,
   * « Huile d’Argan » (apostrophe typographique, U+2019) ne rencontrait pas
   * « huile d'argan » du référentiel et le produit était déclaré incomplet à
   * tort — un faux négatif dans un contrôle de conformité bloque une
   * publication légitime, ce n'est pas anodin.
   */
  const foldName = foldForClaimSearch;
  const haystack = new Set(linkedNames.map(foldName));
  const resolves = (mention: string) => {
    const parsed = foldName(parseDeclaredIngredient(mention).name);
    return haystack.has(parsed) || haystack.has(foldName(mention));
  };
  const unresolved = declared.filter(mention => !resolves(mention));
  if (unresolved.length === 0) {
    return { checkType: 'ingredients', status: 'passed', note: `${AUTOMATABLE_NOTE}les ${declared.length} mentions déclarées sont toutes rattachées au référentiel d’ingrédients. Contrôle de rattachement, non une analyse de formule ni une lecture d’étiquette.` };
  }
  return {
    checkType: 'ingredients',
    status: 'failed',
    note: `${AUTOMATABLE_NOTE}${unresolved.length} mention(s) déclarée(s) sans entité dans le référentiel : ${unresolved.slice(0, 6).join(' ; ')}. À créer dans le référentiel ou à corriger dans la fiche — jamais deviné.`
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const onlyArg = args.find(arg => arg.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map(id => id.trim()).filter(Boolean) : null;
  /**
   * `--checks=` restreint les contrôles exécutés. Utile en reprise : après avoir
   * complété le référentiel, seul le contrôle de composition a changé de
   * verdict, et réécrire les 64 autres événements brouillerait un journal qui
   * est censé dater chaque vérification.
   */
  const checksArg = args.find(arg => arg.startsWith('--checks='));
  const onlyChecks = checksArg ? checksArg.slice('--checks='.length).split(',').map(name => name.trim()).filter(Boolean) : null;

  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error('Base réelle indisponible : ce script lit et écrit le catalogue, il ne tourne pas sur le repli mémoire.');

  const { data, error } = await supabase.from('products').select('*').order('id');
  if (error) throw new Error(`Lecture du catalogue impossible : ${error.message}`);
  const rows = (data || []) as Array<Record<string, unknown>>;
  const selected = only ? rows.filter(row => only.includes(String(row.id))) : rows;
  if (selected.length === 0) throw new Error('Aucun produit dans le périmètre demandé.');

  console.log(`${apply ? 'ENREGISTREMENT' : 'LECTURE SEULE'} — ${selected.length} produit(s) sur ${rows.length} en base.\n`);
  const totals: Record<Verdict, number> = { passed: 0, failed: 0, pending: 0 };
  const perCheck: Record<string, Record<Verdict, number>> = {};

  for (const row of selected) {
    const productId = String(row.id);
    const declared = Array.isArray(row.ingredients) ? (row.ingredients as unknown[]).filter((v): v is string => typeof v === 'string' && v.trim() !== '') : [];
    const links = await getProductIngredientLinks(serverDb as never, productId);
    const linkedNames: string[] = [];
    for (const link of links) {
      const { data: ingredientRow } = await supabase.from('ingredients').select('inci_name, common_names').eq('id', link.ingredientId).maybeSingle();
      if (!ingredientRow) continue;
      linkedNames.push(String(ingredientRow.inci_name || ''));
      for (const common of (Array.isArray(ingredientRow.common_names) ? ingredientRow.common_names : []) as unknown[]) {
        if (typeof common === 'string') linkedNames.push(common);
      }
    }
    const outcomes: CheckOutcome[] = ([
      checkClaims(row),
      checkStock(row),
      checkCertifications(row),
      checkTranslations(row),
      checkIngredients(declared, linkedNames)
    ]).filter(outcome => !onlyChecks || onlyChecks.includes(outcome.checkType));

    console.log(`${productId} — ${String(row.name || '')}`);
    for (const outcome of outcomes) {
      totals[outcome.status] += 1;
      perCheck[outcome.checkType] = perCheck[outcome.checkType] || { passed: 0, failed: 0, pending: 0 };
      perCheck[outcome.checkType][outcome.status] += 1;
      console.log(`   [${outcome.status.toUpperCase().padEnd(7)}] ${outcome.checkType} — ${outcome.note.replace(AUTOMATABLE_NOTE, '')}`);
      if (apply) {
        await recordCatalogValidation(serverDb as never, null, productId, outcome.checkType, outcome.status, undefined, outcome.note);
      }
    }
  }

  console.log('\n--- TOTAUX ---');
  for (const [check, counts] of Object.entries(perCheck)) {
    console.log(`  ${check.padEnd(15)} réussi=${counts.passed}  échec=${counts.failed}  en attente=${counts.pending}`);
  }
  console.log(`  TOTAL           réussi=${totals.passed}  échec=${totals.failed}  en attente=${totals.pending}`);
  console.log('\nNon couverts par ce script (attestations humaines, aucune trace automatique possible) :');
  console.log('  · images  — revue effective des visuels par un humain');
  console.log('  · brand   — autorisation de la marque d’utiliser son nom et ses actifs');
  console.log('  · droits sur les visuels (image_ownership_status) — pièce justificative des droits');
  if (!apply) console.log('\n(dry-run : rien n’a été écrit. Ajouter --apply pour enregistrer les événements.)');
}

main().catch(error => {
  console.error('ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
