/**
 * APPLIQUE le lot réglementaire (migration 20260883) via PostgREST avec la clé
 * secrète SUPABASE_SECRET_KEY (data plane). Reproduit fidèlement la logique SQL :
 *  - fonctions : comblement de trou UNIQUEMENT (ingrédients sans fonction) ;
 *  - drapeau allergène : posé à true pour les allergènes réglementés ;
 *  - restrictions UE : UPSERT sur (ingredient_id, jurisdiction) ;
 *  - provenance : insert en ignore-doublon sur (ingredient_id, source_url).
 *
 * Idempotent. Usage :
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... tsx scripts/applyRegulatoryRest.ts
 *   (--dry-run pour simuler)
 */
import { INGREDIENT_REGULATORY } from '../src/lib/ingredientRegulatory';

const SURL = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SECRET_KEY ?? '';
const DRY = process.argv.includes('--dry-run');

function H(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...extra };
}
async function rest<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SURL}/rest/v1/${path}`, {
    ...init,
    headers: { ...H(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`REST ${init?.method ?? 'GET'} ${path} -> ${res.status}: ${body.slice(0, 500)}`);
  }
  const ct = res.headers.get('content-type') ?? '';
  return (ct.includes('json') ? ((await res.json()) as T) : ((await res.text()) as unknown as T));
}

async function main() {
  if (!SURL || !KEY) throw new Error('SUPABASE_URL et SUPABASE_SECRET_KEY requis.');

  // 1) État courant : fonctions existantes + restrictions existantes.
  const ings = await rest<any[]>(
    `ingredients?select=id,functions,is_allergen_regulated&limit=500`,
    { headers: { Range: '0-500' } }
  );
  const byId = new Map(ings.map((i) => [i.id, i]));

  const facts = INGREDIENT_REGULATORY;
  let nFunc = 0, nAllerg = 0, nRestrUp = 0, nRestrSkip = 0, nProv = 0, nOrphan = 0;

  for (const f of facts) {
    const cur = byId.get(f.id);
    if (!cur) { nOrphan++; continue; }

    // --- Fonctions : comblement de trou uniquement ---
    const hasFunc = Array.isArray(cur.functions) && cur.functions.length > 0;
    if (f.functions.length && !hasFunc) {
      nFunc++;
      if (!DRY) {
        await rest(`ingredients?id=eq.${f.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ functions: f.functions }),
        });
      }
    }

    // --- Drapeau allergène (true uniquement) ---
    if (f.allergen === true && cur.is_allergen_regulated !== true) {
      nAllerg++;
      if (!DRY) {
        await rest(`ingredients?id=eq.${f.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ is_allergen_regulated: true }),
        });
      }
    }

    // --- Restriction UE : UPSERT ---
    if (f.restriction) {
      const r = f.restriction;
      const row = {
        ingredient_id: f.id,
        jurisdiction: 'EU',
        status: r.status,
        limit_percent: r.limitPercent ?? null,
        reference: `Annexe ${r.annex} · ${r.reference}${r.note ? ` — ${r.note}` : ''}`,
      };
      nRestrUp++;
      if (!DRY) {
        await rest(`ingredient_jurisdiction_restrictions?on_conflict=ingredient_id,jurisdiction`, {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(row),
        });
      }
    }

    // --- Provenance : insert ignore-doublon ---
    const provParts: string[] = [];
    if (f.functions.length) provParts.push(`fonctions CosIng déclarées (${f.functions.join(', ')})`);
    if (f.restriction) provParts.push(`statut annexe ${f.restriction.annex} (${f.restriction.status})`);
    if (f.allergen) provParts.push(`allergène à étiquetage (annexe III / Règlement UE 2023/1545)`);
    if (provParts.length) {
      const srcUrl = f.restriction
        ? 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra'
        : 'https://ec.europa.eu/growth/tools-databases/cosing/';
      const label = `CosIng (Commission UE) + Règlement (CE) n°1223/2009 : ${provParts.join(' ; ')}.`;
      nProv++;
      if (!DRY) {
        await rest(`ingredient_provenance?on_conflict=ingredient_id,source_url`, {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify({
            ingredient_id: f.id,
            source_label: label,
            source_url: srcUrl,
            retrieved_at: new Date().toISOString().slice(0, 10),
            cas_number: null,
            evidence_tier: 2,
            note: 'Lot réglementaire/fonctions CosIng (20260883)',
          }),
        });
      }
    }
  }

  console.log(
    `${DRY ? '[DRY-RUN] ' : ''}Lot réglementaire appliqué : ` +
      `${nFunc} fonctions comblées, ${nAllerg} allergènes flagués, ${nRestrUp} restrictions UPSERT, ` +
      `${nProv} provenances, ${nOrphan} orphelins.`
  );
}

main().catch((e) => { console.error('ERREUR', e); process.exit(1); });
