/**
 * CHANTIER 1 — Génère le graphe d'ingrédients à partir de sources gratuites.
 *
 * Pipeline (aucune clé payante) :
 *   1. Open Beauty Facts (ODbL)   → fréquence réelle des INCI sur étiquettes.
 *   2. PubChem (domaine public)   → CID, formule, CAS.
 *   3. Wikidata (CC0)             → QID, CAS/EC en recoupement.
 *
 * On ne résout QUE les N ingrédients les plus fréquents (les plus utiles aux
 * clientes). Le script génère un fichier SQL idempotent (ON CONFLICT) qui :
 *   - crée/met à jour les entités `ingredients` (verified si CAS confirmé,
 *     pending sinon — jamais d'affirmation sans source) ;
 *   - inscrit chaque source dans `ingredient_provenance` (tier 1 PubChem,
 *     tier 2 Wikidata/OBF).
 *
 * Usage :
 *   npx tsx scripts/buildIngredientGraph.ts --top 150 --out supabase/migrations/20260878000000_ingredient_graph_free.sql
 *   (--dry-run pour ne rien écrire et voir le résumé)
 */
import { writeFileSync } from 'node:fs';
import {
  fetchObfIngredientFrequency,
  resolveIngredientIdentity,
  canonicalInciKey,
  displayInciLabel,
} from '../src/lib/ingredientSources';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function sqlQuote(v: string | undefined | null): string {
  if (v == null) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
  const args = process.argv.slice(2);
  const topIndex = args.indexOf('--top');
  const top = topIndex >= 0 ? Number(args[topIndex + 1]) : 150;
  const outIndex = args.indexOf('--out');
  const outPath = outIndex >= 0 ? args[outIndex + 1] : null;
  const dryRun = args.includes('--dry-run');

  console.log(`[1/3] Open Beauty Facts — collecte des INCI les plus fréquents…`);
  const freqRaw = await fetchObfIngredientFrequency({ pageSize: 100, pages: 4 });
  // Fusion des synonymes canoniques (aqua/water…) : on regroupe les comptes.
  const merged = new Map<string, { key: string; label: string; count: number }>();
  for (const f of freqRaw) {
    const canon = canonicalInciKey(f.key);
    const existing = merged.get(canon);
    if (existing) existing.count += f.count;
    else merged.set(canon, { key: canon, label: displayInciLabel(canon, f.label), count: f.count });
  }
  const freq = Array.from(merged.values()).sort((a, b) => b.count - a.count);
  console.log(`    ${freqRaw.length} tags → ${freq.length} INCI canoniques. On garde le top ${top}.`);

  const targets = freq.slice(0, top);

  interface Resolved {
    key: string; label: string; count: number;
    identity: Awaited<ReturnType<typeof resolveIngredientIdentity>>;
  }
  const resolved: Resolved[] = [];
  let confirmedCount = 0;

  console.log(`[2/3] Résolution d'identité (PubChem → Wikidata), débit ménagé…`);
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const identity = await resolveIngredientIdentity(t.label);
    if (identity.confirmed) confirmedCount += 1;
    resolved.push({ key: t.key, label: t.label, count: t.count, identity });
    if ((i + 1) % 10 === 0) console.log(`    ${i + 1}/${targets.length}… (confirmés: ${confirmedCount})`);
    await sleep(350); // politesse vis-à-vis de PubChem/Wikidata
  }

  // Statuts : verified = source tier 1 avec CAS (identité chimique certaine).
  const verified = resolved.filter(r => r.identity.sources.some(s => s.tier === 1 && s.cas));
  const pending = resolved.filter(r => r.identity.confirmed && !r.identity.sources.some(s => s.tier === 1 && s.cas));
  const unresolved = resolved.filter(r => !r.identity.confirmed);

  console.log(`[3/3] Génération SQL…`);
  const lines: string[] = [];
  lines.push(`-- ============================================================`);
  lines.push(`-- CHANTIER 1 — GRAPHE D'INGRÉDIENTS (sources 100 % gratuites)`);
  lines.push(`-- Généré le ${new Date().toISOString().slice(0, 10)} par scripts/buildIngredientGraph.ts`);
  lines.push(`--`);
  lines.push(`-- Sources : Open Beauty Facts (ODbL, fréquence des INCI sur étiquettes),`);
  lines.push(`-- PubChem (NIH/NLM, domaine public : CID/formule/CAS), Wikidata (CC0).`);
  lines.push(`-- Aucune fonction cosmétique ni allégation n'est inventée : le graphe`);
  lines.push(`-- porte l'identité (INCI, CAS, CID) et la provenance. Les fonctions`);
  lines.push(`-- viendront d'un vocabulaire réglementaire (CosIng) dans un second lot.`);
  lines.push(`--`);
  lines.push(`-- verified = entité chimique confirmée par PubChem (tier 1) avec CAS.`);
  lines.push(`-- pending  = entité reconnue (Wikidata) sans CAS tier 1, à confirmer.`);
  lines.push(`-- Les INCI non résolus (mélanges botaniques) ne sont pas insérés.`);
  lines.push(`-- ============================================================`);
  lines.push(``);

  // 1) Entités ingredients
  lines.push(`-- ${verified.length} ingrédients vérifiés (CAS PubChem)`);
  for (const r of [...verified, ...pending]) {
    const id = canonicalInciKey(r.key);
    const inci = displayInciLabel(canonicalInciKey(r.key), r.label);
    const norm = id;
    const cas = r.identity.casNumber;
    const status = r.identity.sources.some(s => s.tier === 1 && s.cas) ? 'verified' : 'pending';
    lines.push(
      `INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)`
    );
    lines.push(
      `VALUES (${sqlQuote(id)}, ${sqlQuote(inci)}, ${sqlQuote(norm)}, '{}', '{}', NULL, NULL, ${isLikelyAllergen(inci) ? 'true' : 'false'}, ${sqlQuote(status)}, NOW())`
    );
    lines.push(
      `ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();`
    );
    // 2) Provenance
    for (const s of r.identity.sources) {
      const label = `${s.label}. Présent sur ${r.count} produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).`;
      lines.push(
        `INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)`
      );
      lines.push(
        `VALUES (${sqlQuote(id)}, ${sqlQuote(label)}, ${sqlQuote(s.url)}, CURRENT_DATE, ${cas ? sqlQuote(cas) : 'NULL'}, ${s.tier}, ${sqlQuote(s.note)})`
      );
      lines.push(`ON CONFLICT (ingredient_id, source_url) DO NOTHING;`);
    }
  }
  lines.push(``);
  lines.push(`-- ${unresolved.length} INCI non résolus en entité chimique (mélanges/extraits) :`);
  lines.push(`-- ${unresolved.slice(0, 40).map(u => u.label).join(', ')}${unresolved.length > 40 ? '…' : ''}`);

  const sql = lines.join('\n') + '\n';

  console.log('');
  console.log(`Résumé :`);
  console.log(`  INCI candidats (top ${top}) : ${resolved.length}`);
  console.log(`  ✔ verified (CAS PubChem)   : ${verified.length}`);
  console.log(`  ◔ pending (Wikidata seul)  : ${pending.length}`);
  console.log(`  ✗ non résolus (non insérés): ${unresolved.length}`);

  if (dryRun) {
    console.log(`\n[dry-run] Aucun fichier écrit.`);
    return;
  }
  if (!outPath) {
    console.log(`\nAucun --out fourni ; SQL non écrit (--dry-run implicite).`);
    return;
  }
  writeFileSync(outPath, sql, 'utf8');
  console.log(`\nMigration écrite : ${outPath} (${(sql.length / 1024).toFixed(1)} Ko)`);
}

/** Allergène parfumant réglementé (annexe III) — repérage conservateur par nom. */
function isLikelyAllergen(inci: string): boolean {
  const n = inci.toLowerCase();
  return [
    'linalool', 'limonene', 'citronellol', 'geraniol', 'eugenol', 'coumarin',
    'citral', 'cinnamal', 'cinnamyl alcohol', 'benzyl alcohol', 'benzyl salicylate',
    'benzyl benzoate', 'hexyl cinnamal', 'alpha-isomethyl ionone', 'butylphenyl methylpropional',
    'hydroxycitronellal', 'farnesol', 'anise alcohol', 'amyl cinnamal', 'lyral',
  ].some(a => n.includes(a));
}

main().catch(err => {
  console.error('Échec de la génération du graphe :', err);
  process.exit(1);
});
