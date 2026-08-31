/**
 * CHANTIER 1, lot 2 — Génère la migration SQL des incompatibilités de
 * formulation/routine (table public.ingredient_incompatibilities).
 *
 * Source de vérité : src/lib/ingredientIncompatibilities.ts.
 * La table a une contrainte d'unicité sur (ingredient_a, ingredient_b) avec
 * ingredient_a < ingredient_b n'étant pas imposé : on normalise l'ordre
 * (tri alphabétique) pour garantir l'idempotence, et on utilise ON CONFLICT.
 *
 *   npx tsx scripts/buildIncompatibilities.ts --out supabase/migrations/<date>_incompatibilities.sql
 */
import { writeFileSync } from 'node:fs';
import { INGREDIENT_INCOMPATIBILITIES } from '../src/lib/ingredientIncompatibilities';

function sqlQuote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function main() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const outPath = outIndex >= 0 ? args[outIndex + 1] : null;
  const dryRun = args.includes('--dry-run');

  const lines: string[] = [];
  lines.push(`-- ============================================================`);
  lines.push(`-- CHANTIER 1, lot 2 — INCOMPATIBILITÉS DE FORMULATION / ROUTINE`);
  lines.push(`-- Généré le ${new Date().toISOString().slice(0, 10)} par scripts/buildIncompatibilities.ts`);
  lines.push(`--`);
  lines.push(`-- Interactions reconnues de formulation/tolérance (consensus`);
  lines.push(`-- formulationniste, SCCS pour les conservateurs/allergènes).`);
  lines.push(`-- Ce ne sont PAS des conseils médicaux : des règles de`);
  lines.push(`-- superposition de soins grand public. Niveau de preuve prudent.`);
  lines.push(`-- Idempotent (ON CONFLICT sur la paire d'ingrédients).`);
  lines.push(`-- ============================================================`);
  lines.push(``);
  lines.push(`BEGIN;`);
  lines.push(``);

  let written = 0;
  const seen = new Set<string>();
  for (const r of INGREDIENT_INCOMPATIBILITIES) {
    const [a, b] = [r.ingredientA, r.ingredientB].sort();
    const key = `${a}|${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    written += 1;
    lines.push(
      `INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)`
    );
    lines.push(
      `VALUES (${sqlQuote(a)}, ${sqlQuote(b)}, ${sqlQuote(r.severity)}, ${sqlQuote(`${r.explanation} [Source : ${r.source}]`)}, ${sqlQuote(r.evidenceLevel)})`
    );
    lines.push(
      `ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;`
    );
  }
  lines.push(``);
  lines.push(`COMMIT;`);
  lines.push(``);

  const sql = lines.join('\n');
  const bySev = { avoid: 0, caution: 0, space_out: 0 } as Record<string, number>;
  for (const r of INGREDIENT_INCOMPATIBILITIES) bySev[r.severity] += 1;
  console.log(`Résumé incompatibilités :`);
  console.log(`  règles écrites : ${written}`);
  console.log(`  avoid ${bySev.avoid} · caution ${bySev.caution} · space_out ${bySev.space_out}`);

  if (dryRun || !outPath) {
    console.log(`\n[${dryRun ? 'dry-run' : 'pas de --out'}] Aucun fichier écrit.`);
    return;
  }
  writeFileSync(outPath, sql, 'utf8');
  console.log(`\nMigration écrite : ${outPath} (${(sql.length / 1024).toFixed(1)} Ko)`);
}

main();
