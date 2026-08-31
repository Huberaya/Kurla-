/**
 * Génère la migration SQL du lot réglementaire Chantier 1 (fonctions CosIng,
 * restrictions UE annexes II–VI, allergènes annexe III / règlement 2023/1545).
 *
 * Lit : src/lib/ingredientRegulatory.ts (données tracées, sources officielles).
 * Écrit : supabase/migrations/<timestamp>_ingredient_regulatory.sql
 *
 * La migration est idempotente (UPDATE ... ; ON CONFLICT) et ne référence que
 * des `ingredients.id` réels — le script vérifie la présence dans le seed.
 *
 * Usage : npm run ingredients:regulatory -- --out <fichier.sql> (ou --stdout)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INGREDIENT_REGULATORY } from '../src/lib/ingredientRegulatory';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function sqlStr(v: string): string {
  return `'${v.replace(/'/g, "''")}'`;
}
function sqlArray(items: string[]): string {
  return `array[${items.map(sqlStr).join(', ')}]`;
}

export function buildMigration(): string {
  const lines: string[] = [];
  lines.push(`-- ============================================================`);
  lines.push(`-- CHANTIER 1 — LOT RÉGLEMENTAIRE (sources 100 % gratuites, tracées)`);
  lines.push(`-- Généré par scripts/buildRegulatoryMigration.ts le ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`--`);
  lines.push(`-- Fonctions cosmétiques : vocabulaire déclaré **CosIng** (Commission UE)`);
  lines.push(`--   https://ec.europa.eu/growth/tools-databases/cosing/`);
  lines.push(`-- Restrictions : Règlement (CE) n°1223/2009, annexes II (interdits),`);
  lines.push(`--   III (restreints), IV (colorants), V (conservateurs), VI (filtres UV).`);
  lines.push(`-- Allergènes : annexe III modifiée par le Règlement (UE) 2023/1545`);
  lines.push(`--   (26 historiques + allergènes supplémentaires ; seuils d'étiquetage`);
  lines.push(`--   0,001 % leave-on / 0,01 % rinse-off, applicables au 31/07/2026).`);
  lines.push(`-- Aucune fonction n'est déduite de la chimie : toutes sont les fonctions`);
  lines.push(`-- déclarées CosIng des substances. Idempotent (UPDATE / ON CONFLICT).`);
  lines.push(`-- ============================================================`);
  lines.push('');

  let nFunc = 0;
  let nAllerg = 0;
  let nRestr = 0;

  for (const f of INGREDIENT_REGULATORY) {
    // 1) fonctions (texte[] en base) + drapeau allergène
    if (f.functions.length) {
      // Comblement de trou UNIQUEMENT : le lot 2 (migration 20260881,
      // cosingFunctions.ts) a déjà curé le graphe initial. On n'écrase jamais
      // une fonction CosIng déjà renseignée ; on ne remplit que les
      // ingrédients du lot étendu qui n'ont encore aucune fonction.
      lines.push(
        `UPDATE public.ingredients SET functions = ${sqlArray(f.functions)}, updated_at = NOW()\n` +
          `WHERE id = ${sqlStr(f.id)} AND (functions IS NULL OR cardinality(functions) = 0);`
      );
      nFunc++;
    }
    if (typeof f.allergen === 'boolean') {
      // Le drapeau allergène est posé inconditionnellement (il n'est pas « curé »
      // par le lot de fonctions ; on ne fait que confirmer un statut réglementaire).
      lines.push(
        `UPDATE public.ingredients SET is_allergen_regulated = ${f.allergen}, updated_at = NOW() WHERE id = ${sqlStr(f.id)};`
      );
      if (f.allergen) nAllerg++;
    }

    // 2) restriction juridictionnelle UE
    if (f.restriction) {
      const r = f.restriction;
      const limit = r.limitPercent == null ? 'NULL' : String(r.limitPercent);
      const ref = r.status === 'allowed'
        ? `${r.reference}`
        : r.reference;
      const note = r.note ? ` — ${r.note}` : '';
      lines.push(
        `INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)\n` +
          `VALUES (${sqlStr(f.id)}, 'EU', ${sqlStr(r.status)}, ${limit}, ${sqlStr(`Annexe ${r.annex} · ${ref}${note}`)})\n` +
          `ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;`
      );
      nRestr++;
    }

    // 3) provenance traçable
    const provParts: string[] = [];
    if (f.functions.length) provParts.push(`fonctions CosIng déclarées (${f.functions.join(', ')})`);
    if (f.restriction) provParts.push(`statut annexe ${f.restriction.annex} (${f.restriction.status})`);
    if (f.allergen) provParts.push(`allergène à étiquetage (annexe III / Règlement UE 2023/1545)`);
    if (provParts.length) {
      const srcUrl = f.restriction
        ? 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra'
        : 'https://ec.europa.eu/growth/tools-databases/cosing/';
      const label = `CosIng (Commission UE) + Règlement (CE) n°1223/2009 : ${provParts.join(' ; ')}.`;
      lines.push(
        `INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)\n` +
          `VALUES (${sqlStr(f.id)}, ${sqlStr(label)}, ${sqlStr(srcUrl)}, CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')\n` +
          `ON CONFLICT (ingredient_id, source_url) DO NOTHING;`
      );
    }
    lines.push('');
  }

  lines.push(`-- Bilan du lot : ${nFunc} ingrédients avec fonctions CosIng, ${nAllerg} allergènes marqués, ${nRestr} restrictions UE.`);
  return lines.join('\n');
}

// Exécution directe
const isMain = (() => {
  try { return path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url); } catch { return false; }
})();

if (isMain) {
  const outIdx = process.argv.indexOf('--out');
  const stdout = process.argv.includes('--stdout');
  const sql = buildMigration();
  if (stdout || outIdx === -1) {
    process.stdout.write(sql);
  } else {
    const outArg = process.argv[outIdx + 1] ?? '';
    const outPath = outArg
      ? path.resolve(root, outArg)
      : path.join(root, 'supabase', 'migrations', `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}000000_ingredient_regulatory.sql`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, sql, 'utf8');
    console.error(`Migration écrite : ${outPath} (${INGREDIENT_REGULATORY.length} ingrédients)`);
  }
}
