import type { Express } from 'express';
import type { Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { asyncRoute, rateLimit } from '../http';
import type { AuthenticatedRequest } from '../types';

/**
 * NAVIGATION PAR INGRÉDIENT (Chantier 1 — boucle publique).
 *
 * Le graphe d'ingrédients (identité, fonctions CosIng, restrictions UE,
 * allergènes) et la table de liaison `product_ingredients` sont alimentés en
 * base. Ces routes ouvrent la navigation côté visiteur :
 *
 *   GET /api/ingredients/search?q=…  → ingrédients correspondant au terme
 *                                      (INCI, nom normalisé, nom commun), avec
 *                                      le nombre de produits publiés liés.
 *   GET /api/ingredients/:id/products → produits publiés qui contiennent
 *                                      l'ingrédient (cartes publiques).
 *   GET /api/products/:idOrSlug/ingredients → composition reliée d'un produit
 *                                      (fiches ingrédient triées par rang INCI).
 *
 * Règles :
 *  - On ne lit que des produits **publiés** (`serverDb.getPublicProducts()`),
 *    jamais les fiches démo/non validées.
 *  - On n'expose que des faits déjà en base ; aucune fonction ni lien inventé.
 *  - `products`/`product_ingredients` ne sont pas lisibles par `anon` (RLS) :
 *    la lecture passe par le client serveur (clé service), comme le reste.
 */

/** Carte produit minimale et publique (déjà gouvernée par `toPublicProduct`). */
function productCard(p: any) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand ?? null,
    price: p.price ?? null,
    category: p.category ?? null,
    subcategory: p.subcategory ?? p.subCategoryTag ?? null,
    image: p.imageUrl ?? p.image_url ?? p.image ?? null,
  };
}

/**
 * Charge, pour un ensemble d'ids ingrédient, les produits publiés liés.
 * Retourne { ingredientId: productCard[] }.
 */
async function productsByIngredient(ingredientIds: string[]): Promise<Record<string, any[]>> {
  const ids = Array.from(new Set(ingredientIds.filter(Boolean)));
  const out: Record<string, any[]> = {};
  ids.forEach((id) => (out[id] = []));
  if (ids.length === 0) return out;

  const supabase = getSupabaseServerClient();
  const publicProducts = await serverDb.getPublicProducts();
  const publicById = new Map(publicProducts.map((p: any) => [String(p.id), p]));

  if (supabase) {
    const { data: links, error } = await supabase
      .from('product_ingredients')
      .select('product_id, ingredient_id')
      .in('ingredient_id', ids);
    if (error) throw new Error(`Lecture des liaisons produit-ingrédient impossible : ${error.message}`);
    for (const link of links || []) {
      const product = publicById.get(String(link.product_id));
      if (product) out[link.ingredient_id]?.push(productCard(product));
    }
  }
  // Dédoublonnage des cartes par id produit (une seule carte par produit).
  for (const id of Object.keys(out)) {
    const seen = new Set<string>();
    out[id] = out[id].filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  }
  return out;
}

export function registerIngredientNavRoutes(app: Express): void {
  // ---------------------------------------------------------------- RECHERCHE
  app.get(
    '/api/ingredients/search',
    rateLimit('ingredient-search', 60, 60_000),
    asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
      const q = String(req.query.q ?? '').trim().toLowerCase();
      if (q.length < 2) {
        res.json({ query: q, ingredients: [] });
        return;
      }

      const supabase = getSupabaseServerClient();
      if (!supabase) {
        res.status(503).json({ error: 'Graphe d’ingrédients indisponible.' });
        return;
      }

      // Pré-filtre SQL sur INCI / normalisé (insensible à la casse), puis
      // filtre complémentaire sur les noms communs en JS (tableau text[]).
      const ilike = `%${q.replace(/[%_]/g, ' ')}%`;
      const { data: rows, error } = await supabase
        .from('ingredients')
        .select('id, inci_name, inci_name_normalized, common_names, functions, is_allergen_regulated, verification_status')
        .or(`inci_name.ilike.${ilike},inci_name_normalized.ilike.${ilike}`)
        .limit(60);
      if (error) {
        res.status(500).json({ error: `Recherche impossible : ${error.message}` });
        return;
      }

      const matches = (rows || []).filter((r: any) => {
        const common = Array.isArray(r.common_names) ? r.common_names : [];
        return common.some((n: string) => String(n).toLowerCase().includes(q));
      });
      // Si le pré-filtre INCI n'a rien donné mais que des noms communs peuvent
      // correspondre, élargir (cas des noms français seuls). On récupère un lot.
      let ingredients = matches;
      if (ingredients.length === 0) {
        const { data: broad } = await supabase
          .from('ingredients')
          .select('id, inci_name, inci_name_normalized, common_names, functions, is_allergen_regulated, verification_status')
          .limit(400);
        ingredients = (broad || []).filter((r: any) => {
          const hay = [r.inci_name, r.inci_name_normalized, ...(Array.isArray(r.common_names) ? r.common_names : [])]
            .map((s) => String(s ?? '').toLowerCase());
          return hay.some((s) => s.includes(q));
        });
      }

      const byIngredient = await productsByIngredient(ingredients.map((r: any) => r.id));
      const result = ingredients
        .map((r: any) => ({
          id: r.id,
          inciName: r.inci_name,
          commonNames: Array.isArray(r.common_names) ? r.common_names : [],
          functions: Array.isArray(r.functions) ? r.functions : [],
          isAllergenRegulated: Boolean(r.is_allergen_regulated),
          verificationStatus: r.verification_status ?? 'not_provided',
          productCount: (byIngredient[r.id] || []).length,
        }))
        .sort((a, b) => b.productCount - a.productCount || a.inciName.localeCompare(b.inciName))
        .slice(0, 30);

      res.json({ query: q, ingredients: result });
    })
  );

  // ------------------------------------------------- PRODUITS CONTENANT UN INGR.
  app.get(
    '/api/ingredients/:ingredientId/products',
    rateLimit('ingredient-products', 60, 60_000),
    asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
      const ingredientId = String(req.params.ingredientId || '').trim();
      if (!ingredientId) {
        res.status(400).json({ error: 'Identifiant ingrédient manquant.' });
        return;
      }
      const supabase = getSupabaseServerClient();
      if (!supabase) {
        res.status(503).json({ error: 'Graphe d’ingrédients indisponible.' });
        return;
      }

      const { data: ingredient, error: ingErr } = await supabase
        .from('ingredients')
        .select('id, inci_name, functions, is_allergen_regulated, verification_status')
        .eq('id', ingredientId)
        .maybeSingle();
      if (ingErr) {
        res.status(500).json({ error: `Lecture ingrédient impossible : ${ingErr.message}` });
        return;
      }
      if (!ingredient) {
        res.status(404).json({ error: 'Ingrédient inconnu du graphe KURLA.' });
        return;
      }

      const byIngredient = await productsByIngredient([ingredientId]);
      res.json({
        ingredient: {
          id: ingredient.id,
          inciName: ingredient.inci_name,
          functions: Array.isArray(ingredient.functions) ? ingredient.functions : [],
          isAllergenRegulated: Boolean(ingredient.is_allergen_regulated),
          verificationStatus: ingredient.verification_status ?? 'not_provided',
        },
        products: byIngredient[ingredientId] || [],
        count: (byIngredient[ingredientId] || []).length,
      });
    })
  );

  // ------------------------------------------- COMPOSITION RELIÉE D'UN PRODUIT
  app.get(
    '/api/products/:idOrSlug/ingredients',
    rateLimit('product-ingredients', 60, 60_000),
    asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
      const ref = String(req.params.idOrSlug || '').trim();
      if (!ref) {
        res.status(400).json({ error: 'Produit manquant.' });
        return;
      }
      const supabase = getSupabaseServerClient();
      if (!supabase) {
        res.status(503).json({ error: 'Graphe d’ingrédients indisponible.' });
        return;
      }

      const publicProducts = await serverDb.getPublicProducts();
      const product = publicProducts.find((p: any) => String(p.id) === ref || String(p.slug) === ref);
      if (!product) {
        res.status(404).json({ error: 'Produit non publié ou indisponible.' });
        return;
      }

      const { data: links, error: linkErr } = await supabase
        .from('product_ingredients')
        .select('ingredient_id, inci_rank, declared_role, is_key_ingredient, source')
        .eq('product_id', product.id)
        .order('inci_rank', { ascending: true, nullsFirst: false });
      if (linkErr) {
        res.status(500).json({ error: `Lecture de la composition impossible : ${linkErr.message}` });
        return;
      }

      const ids = (links || []).map((l: any) => l.ingredient_id);
      const { data: ingRows } = ids.length
        ? await supabase
            .from('ingredients')
            .select('id, inci_name, common_names, functions, is_allergen_regulated, is_fragrance, verification_status')
            .in('id', ids)
        : { data: [] };
      const ingById = new Map((ingRows || []).map((r: any) => [r.id, r]));

      const composition = (links || []).map((l: any) => {
        const ing = ingById.get(l.ingredient_id);
        return {
          rank: l.inci_rank ?? null,
          ingredientId: l.ingredient_id,
          inciName: ing?.inci_name ?? null,
          commonNames: ing && Array.isArray(ing.common_names) ? ing.common_names : [],
          functions: ing && Array.isArray(ing.functions) ? ing.functions : [],
          isAllergenRegulated: Boolean(ing?.is_allergen_regulated),
          isFragrance: Boolean(ing?.is_fragrance),
          isKeyIngredient: Boolean(l.is_key_ingredient),
          declaredRole: l.declared_role ?? null,
          source: l.source ?? 'declared',
          resolved: Boolean(ing),
        };
      });

      res.json({
        product: { id: product.id, slug: product.slug, name: product.name },
        composition,
        resolvedCount: composition.filter((c) => c.resolved).length,
        declaredCount: composition.length,
      });
    })
  );
}
