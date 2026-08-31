/**
 * CHANTIER 1, lot 2 — Génère la migration SQL qui applique les fonctions
 * CosIng (vocabulaire contrôlé), les drapeaux d'allergènes réglementés et les
 * restrictions UE (Annexes 1223/2009) aux ingrédients du graphe.
 *
 * Lecture de la vérité terrain : src/lib/cosingFunctions.ts (COSMIC… FACTS).
 * Idempotent (ON CONFLICT / UPDATE). Ne crée aucun ingrédient : seuls les id
 * présents en base reçoivent des fonctions.
 *
 *   npx tsx scripts/buildCosingFunctions.ts --out supabase/migrations/<date>_cosing_functions.sql
 *   (--dry-run pour le résumé sans écrire)
 */
import { writeFileSync } from 'node:fs';
import {
  COSING_FACTS,
  COSMETIC_FUNCTION_VOCABULARY,
  COSING_SOURCE,
  EU_REGULATION_SOURCE,
} from '../src/lib/cosingFunctions';

function sqlQuote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function main() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const outPath = outIndex >= 0 ? args[outIndex + 1] : null;
  const dryRun = args.includes('--dry-run');

  const withFunctions = COSING_FACTS.filter((f) => f.functions.length > 0);
  const allergens = COSING_FACTS.filter((f) => f.regulatedAllergen);
  const restrictions = COSING_FACTS.filter((f) => f.restriction);
  const functionsSet = new Set(COSING_FACTS.flatMap((f) => f.functions));

  const lines: string[] = [];
  lines.push(`-- ============================================================`);
  lines.push(`-- CHANTIER 1, lot 2 — FONCTIONS COSING + RESTRICTIONS UE`);
  lines.push(`-- Généré le ${new Date().toISOString().slice(0, 10)} par scripts/buildCosingFunctions.ts`);
  lines.push(`--`);
  lines.push(`-- Fonctions = vocabulaire contrôlé CosIng (Commission européenne).`);
  lines.push(`-- Restrictions = Règlement (CE) n°1223/2009, Annexes II/III/V/VI.`);
  lines.push(`-- Aucune fonction n'est déduite de la chimie : chaque valeur provient`);
  lines.push(`-- du thésaurus officiel CosIng. Provenance tracée par ingrédient.`);
  lines.push(`-- ============================================================`);
  lines.push(``);
  lines.push(`BEGIN;`);
  lines.push(``);

  // 1) Fonctions CosIng + drapeau allergène.
  lines.push(`-- 1) FONCTIONS COSING (${withFunctions.length} ingrédients) + allergènes réglementés (${allergens.length})`);
  for (const f of withFunctions) {
    const fnArr = `ARRAY[${f.functions.map((x) => sqlQuote(x)).join(', ')}]`;
    const allergen = f.regulatedAllergen ? 'true' : 'false';
    lines.push(
      `UPDATE public.ingredients SET functions = ${fnArr}, is_allergen_regulated = ${allergen}, updated_at = NOW() WHERE id = ${sqlQuote(f.ingredientId)};`
    );
    // Provenance CosIng (tier 1 : source officielle UE).
    lines.push(
      `INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)`
    );
    lines.push(
      `VALUES (${sqlQuote(f.ingredientId)}, ${sqlQuote(`${COSING_SOURCE.label}. Fonctions CosIng : ${f.functions.join(', ')}.`)}, ${sqlQuote(COSING_SOURCE.url)}, CURRENT_DATE, NULL, 1, ${sqlQuote('Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')})`
    );
    lines.push(`ON CONFLICT (ingredient_id, source_url) DO NOTHING;`);
  }
  lines.push(``);

  // 2) Allergènes sans fonction renseignée restent flagués (sécurité).
  const allergensWithoutFn = allergens.filter((f) => f.functions.length === 0);
  if (allergensWithoutFn.length) {
    for (const f of allergensWithoutFn) {
      lines.push(
        `UPDATE public.ingredients SET is_allergen_regulated = true, updated_at = NOW() WHERE id = ${sqlQuote(f.ingredientId)};`
      );
    }
    lines.push(``);
  }

  // 3) Restrictions UE.
  lines.push(`-- 3) RESTRICTIONS UE (${restrictions.length} ingrédients, Règlement 1223/2009)`);
  for (const f of restrictions) {
    if (!f.restriction) continue;
    const r = f.restriction;
    const ref = `${EU_REGULATION_SOURCE.label.split('—')[0].trim()}, Annexe ${r.annex}${r.entry ? ` (${r.entry})` : ''}`;
    lines.push(
      `INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)`
    );
    lines.push(
      `VALUES (${sqlQuote(f.ingredientId)}, 'EU', ${sqlQuote(r.status)}, ${r.limitPercent === null ? 'NULL' : r.limitPercent}, ${sqlQuote(ref)})`
    );
    lines.push(
      `ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;`
    );
    // Métadonnées de restriction dans la note via provenance.
    lines.push(
      `INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)`
    );
    lines.push(
      `VALUES (${sqlQuote(f.ingredientId)}, ${sqlQuote(EU_REGULATION_SOURCE.label)}, ${sqlQuote(EU_REGULATION_SOURCE.url)}, CURRENT_DATE, NULL, 1, ${sqlQuote(`Annexe ${r.annex}${r.entry ? ` (${r.entry})` : ''} — ${r.note}`)})`
    );
    lines.push(`ON CONFLICT (ingredient_id, source_url) DO NOTHING;`);
  }
  lines.push(``);
  lines.push(`COMMIT;`);
  lines.push(``);

  const sql = lines.join('\n');

  console.log(`Résumé lot fonctions/restrictions :`);
  console.log(`  ingrédients avec fonctions CosIng : ${withFunctions.length}`);
  console.log(`  allergènes réglementés flagués    : ${allergens.length}`);
  console.log(`  restrictions UE (Annexes)         : ${restrictions.length}`);
  console.log(`  fonctions distinctes du vocabulaire: ${functionsSet.size}/${COSMETIC_FUNCTION_VOCABULARY.length}`);
  console.log(`  libellés hors vocabulaire contrôlé: ${[...functionsSet].filter((x) => !COSMETIC_FUNCTION_VOCABULARY.includes(x as never)).join(', ') || 'aucun'}`);

  if (dryRun || !outPath) {
    console.log(`\n[${dryRun ? 'dry-run' : 'pas de --out'}] Aucun fichier écrit.`);
    return;
  }
  writeFileSync(outPath, sql, 'utf8');
  console.log(`\nMigration écrite : ${outPath} (${(sql.length / 1024).toFixed(1)} Ko)`);
}

main();
