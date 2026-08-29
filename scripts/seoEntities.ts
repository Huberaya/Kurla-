/**
 * CHANTIER 7.4 — URLs d'entités pour le sitemap et le prérendu.
 *
 * Lit les entités publiables (aujourd'hui : ingrédients vérifiés) directement
 * dans la base, afin que le sitemap et les pages prérendues reflètent ce qui
 * existe réellement plutôt qu'une liste tenue à la main.
 *
 * Dégradation gracieuse : sans credentials Supabase (build local sans env) ou si
 * la lecture échoue, on renvoie une liste vide et on le journalise. Le build ne
 * doit JAMAIS échouer parce qu'une entité manque : un sitemap sans ingrédients
 * reste un sitemap valide.
 */

export interface EntityPage {
  path: string;
  title: string;
  description: string;
}

function env(name: string): string | undefined {
  return (process.env[name] || '').trim() || undefined;
}

export async function fetchIngredientPages(): Promise<EntityPage[]> {
  const url = (env('SUPABASE_URL') || env('VITE_SUPABASE_URL') || '').replace(/\/+$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  if (!url || !key) {
    console.log('[SEO] Pas de credentials Supabase : URLs ingrédient omises du sitemap/prérendu.');
    return [];
  }
  try {
    const res = await fetch(
      `${url}/rest/v1/ingredients?select=id,inci_name,description&verification_status=eq.verified&order=id`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = (await res.json()) as Array<{ id: string; inci_name: string; description?: string | null }>;
    return rows.map(row => ({
      path: `/ingredient/${encodeURIComponent(row.id)}`,
      title: `${row.inci_name} : fiche ingrédient | KURLA`,
      description: (row.description || `Ce que fait ${row.inci_name}, pour quelles textures et quels besoins.`).slice(0, 300),
    }));
  } catch (error) {
    console.log('[SEO] Lecture des ingrédients impossible, omises :', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * CHANTIER 13 — fiches produit. Corrigé le 29/08/2026.
 *
 * Les 16 produits du catalogue n'étaient ni prérendus ni présents dans le
 * sitemap : `/produit/:slug` n'existe dans `ROUTE_META` que comme motif, donc
 * aucune URL réelle n'était publiée. Ce sont pourtant les pages commerciales
 * principales.
 *
 * **Pourquoi la première version ne produisait rien.** Elle interrogeait
 * `products?status=eq.published`. Or la table `products` n'a **aucune colonne
 * `status`** — 19 colonnes dans `20260804000000_init_kurla_schema.sql`, et
 * aucune migration n'en ajoute ; la publication écrite au chantier 14 porte sur
 * `catalog_status`. PostgREST renvoyait donc une erreur, avalée par le `catch`,
 * et la fonction retournait une liste vide. Le sitemap de production avait
 * 45 URLs et **0 fiche produit** — mesuré.
 *
 * **Pourquoi le correctif ne consiste pas à écrire `catalog_status`.** La règle
 * de publiabilité (`isPublishableProduct`, `src/lib/db/internal.ts`) exige neuf
 * conditions au-delà du statut : vérifications ingrédients, allégations,
 * visuels, stock, certifications, traductions, marque, propriété des visuels,
 * composition, pays. Filtrer sur le seul statut annoncerait des fiches que le
 * catalogue ne sert pas — une page morte dans le sitemap.
 *
 * La fonction appelle donc **le même chemin de code que le site**
 * (`getPublicProducts`, celui de `GET /api/products`). Le sitemap ne peut plus
 * diverger de ce qui est réellement servi, parce qu'il ne recalcule plus rien.
 */

/**
 * Transformation pure d'un produit public en page de sitemap.
 *
 * Exposée séparément pour être testable sans credentials : c'est elle qui décide
 * du chemin et du texte, et c'est elle que le banc vérifie.
 */
export function productPagesFrom(products: any[]): EntityPage[] {
  return (products || [])
    .filter(product => typeof product?.slug === 'string' && product.slug.trim() !== '')
    .map(product => ({
      path: `/produit/${encodeURIComponent(product.slug)}`,
      title: `${product.name || product.slug} | KURLA Beauty`,
      description: String(
        product.description
        || `${product.name || product.slug} : composition, texture et besoins couverts, évalués sans parti pris de marque.`
      ).slice(0, 300)
    }));
}

export async function fetchProductPages(): Promise<EntityPage[]> {
  const url = (env('SUPABASE_URL') || env('VITE_SUPABASE_URL') || '').replace(/\/+$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  if (!url || !key) {
    console.log('[SEO] Pas de credentials Supabase : URLs produit omises du sitemap/prérendu.');
    return [];
  }
  try {
    // Import dynamique : sans base, l'initialisation ne doit pas casser le build.
    const { serverDb } = await import('../src/lib/serverDb');
    const products = await serverDb.getPublicProducts();
    const pages = productPagesFrom(products);
    console.log(`[SEO] ${pages.length} fiche(s) produit publiables retenue(s) pour le sitemap.`);
    return pages;
  } catch (error) {
    console.log('[SEO] Lecture des produits impossible, omises :', error instanceof Error ? error.message : String(error));
    return [];
  }
}
