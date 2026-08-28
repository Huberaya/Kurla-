import { resolveIngredient } from '../lib/ingredientGraph';
import type { JurisdictionRestriction } from '../lib/ingredientGraph';
import {
  assessProductCompliance,
  parseDeclaredIngredient,
  type DeclaredProductIngredient,
  type ProductCompliance,
} from '../lib/jurisdiction';
import { getSupabaseServerClient } from '../lib/supabaseClient';

/**
 * CHANTIER 8.1 — lecture du graphe réglementaire, extraite de `server.ts`
 * (code du chantier 7.7). Trois règles inchangées : l'absence de donnée n'est
 * pas une conformité, une concentration non déclarée n'est pas une infraction,
 * une concentration déclarée au-dessus de la limite interdit la vente.
 */
export interface JurisdictionGraph {
  catalog: Array<{ id: string; inciName: string; inciNameNormalized: string; commonNames: string[] }>;
  restrictions: JurisdictionRestriction[];
  jurisdiction: string;
}

/**
 * Charge le minimum du graphe nécessaire au filtrage réglementaire.
 *
 * `null` quand la base n'est pas configurée : dans ce cas KURLA ne prétend pas
 * connaître le statut d'un ingrédient, il dit qu'il ne peut pas répondre.
 */
export async function loadJurisdictionGraph(jurisdiction: string): Promise<JurisdictionGraph | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const [ingredientResult, restrictionResult] = await Promise.all([
    supabase.from('ingredients').select('id, inci_name, inci_name_normalized, common_names'),
    supabase
      .from('ingredient_jurisdiction_restrictions')
      .select('ingredient_id, jurisdiction, status, limit_percent, reference')
      .eq('jurisdiction', jurisdiction)
  ]);
  if (ingredientResult.error || restrictionResult.error) {
    const message = ingredientResult.error?.message || restrictionResult.error?.message || 'lecture impossible';
    throw new Error(`Graphe réglementaire illisible : ${message}`);
  }

  return {
    jurisdiction,
    catalog: (ingredientResult.data || []).map((row: any) => ({
      id: row.id,
      inciName: row.inci_name,
      inciNameNormalized: row.inci_name_normalized,
      commonNames: row.common_names || []
    })),
    restrictions: (restrictionResult.data || []).map((row: any) => ({
      ingredientId: row.ingredient_id,
      jurisdiction: row.jurisdiction,
      status: row.status,
      limitPercent: row.limit_percent == null ? null : Number(row.limit_percent),
      reference: row.reference ?? undefined
    }))
  };
}

/**
 * Résout des libellés déclarés en entités du graphe.
 *
 * Deux passes, dans cet ordre : le libellé complet, puis le libellé sans son
 * pourcentage (« Acide Salicylique 1.5 % » → « Acide Salicylique »). Ce qui ne
 * correspond à rien reste hors graphe : `resolveIngredient` renvoie `null`
 * plutôt que d'approximer, et l'évaluation déclare le trou.
 */
export function resolveDeclaredIngredients(
  names: string[],
  catalog: JurisdictionGraph['catalog']
): Array<DeclaredProductIngredient & { declaredLabel: string }> {
  const resolved = new Map<string, DeclaredProductIngredient & { declaredLabel: string }>();
  for (const rawName of names) {
    const parsed = parseDeclaredIngredient(rawName);
    const found = resolveIngredient(rawName, catalog as any)
      || (parsed.name !== rawName ? resolveIngredient(parsed.name, catalog as any) : null);
    if (!found || resolved.has(found.id)) continue;
    resolved.set(found.id, {
      ingredientId: found.id,
      declaredConcentrationPercent: parsed.concentrationPercent,
      concentrationSource: parsed.concentrationPercent === null ? undefined : 'declared_name',
      declaredLabel: rawName,
    });
  }
  return [...resolved.values()];
}

/**
 * Résout les ingrédients déclarés d'un produit en entités du graphe.
 *
 * Les concentrations déclarées viennent de `product_ingredients` quand la liaison
 * existe. Sans liaison, la concentration est `null` — et l'évaluation le dit au
 * lieu de la supposer dans la limite.
 */
export async function assessProductComplianceForCountry(
  product: { id: string; ingredients?: unknown; keyIngredients?: unknown },
  country: string,
  graph: JurisdictionGraph
): Promise<{ compliance: ProductCompliance; declaredCount: number; resolvedCount: number }> {
  const supabase = getSupabaseServerClient();
  const names = [
    ...(Array.isArray(product.ingredients) ? (product.ingredients as unknown[]) : []),
    ...(Array.isArray(product.keyIngredients) ? (product.keyIngredients as unknown[]) : [])
  ].filter((name): name is string => typeof name === 'string' && name.trim().length > 0);

  const declaredCount = names.length;
  const resolved = resolveDeclaredIngredients(names, graph.catalog);
  const byId = new Map(resolved.map(entry => [entry.ingredientId, entry]));

  // Une liaison structurée prime toujours sur un pourcentage lu dans le libellé.
  if (supabase && byId.size > 0) {
    const { data: links } = await supabase
      .from('product_ingredients')
      .select('ingredient_id, declared_concentration_percent')
      .eq('product_id', product.id);
    for (const link of links || []) {
      const entry = byId.get(link.ingredient_id);
      if (!entry || link.declared_concentration_percent == null) continue;
      entry.declaredConcentrationPercent = Number(link.declared_concentration_percent);
      entry.concentrationSource = 'linked';
    }
  }

  const compliance = assessProductCompliance({
    ingredients: resolved,
    restrictions: graph.restrictions,
    jurisdiction: graph.jurisdiction
  });

  return { compliance, declaredCount, resolvedCount: byId.size };
}
