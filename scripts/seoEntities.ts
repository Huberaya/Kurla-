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
 * CHANTIER 13 — fiches produit.
 *
 * Les 16 produits du catalogue n'étaient ni prérendus ni présents dans le
 * sitemap : `/produit/:slug` n'existe dans `ROUTE_META` que comme motif, donc
 * aucune URL réelle n'était publiée. Ce sont pourtant les pages commerciales
 * principales.
 *
 * Seuls les produits **publiés** sont exposés — publier dans le sitemap une fiche
 * que le catalogue ne sert pas serait annoncer une page morte.
 */
export async function fetchProductPages(): Promise<EntityPage[]> {
  const url = (env('SUPABASE_URL') || env('VITE_SUPABASE_URL') || '').replace(/\/+$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  if (!url || !key) {
    console.log('[SEO] Pas de credentials Supabase : URLs produit omises du sitemap/prérendu.');
    return [];
  }
  try {
    const res = await fetch(
      `${url}/rest/v1/products?select=id,slug,name,description,status&status=eq.published&order=slug`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = (await res.json()) as Array<{ id: string; slug: string | null; name: string; description?: string | null }>;
    return rows
      .filter(row => Boolean(row.slug))
      .map(row => ({
        path: `/produit/${encodeURIComponent(row.slug as string)}`,
        title: `${row.name} | KURLA Beauty`,
        description: (row.description || `${row.name} : composition, texture et besoins couverts, évalués sans parti pris de marque.`).slice(0, 300)
      }));
  } catch (error) {
    console.log('[SEO] Lecture des produits impossible, omises :', error instanceof Error ? error.message : String(error));
    return [];
  }
}
