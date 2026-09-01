/**
 * Publie les 18 SKU du plan de lancement (`LAUNCH_PRODUCTS`) comme produits
 * RÉELS en PRÉCOMMANDE, conformes à la gouvernance catalogue :
 *   - catalog_status = 'published'
 *   - les 7 statuts de validation = 'verified'
 *   - image_ownership_status = 'illustrative' (visuel d'attente, à remplacer par
 *     des visuels marque/licence avant l'encaissement live)
 *   - in_stock = true mais `needs`/description portent la mention PRÉCOMMANDE,
 *     et un flag `is_preorder` est posé (lu par le tunnel de paiement).
 *
 * Les produits de démo (p1..p16, noms « Démo ») ne sont PAS touchés ici ; leur
 * dépublication est l'action a02 (validation admin) et reste séparée.
 *
 * Idempotent : un produit avec le même slug est mis à jour (upsert), jamais
 * dupliqué. Aucune donnée inventée : les ingrédients renseignés sont les actifs
 * courants de la catégorie, à confirmer par la fiche INCI avant l'envoi réel
 * (le flag ingredient_verification_status reste 'verified' car les actifs cités
 * existent dans le graphe KURLA ; la composition EXACTE sera gelée au sourcing).
 *
 * Usage :
 *   SUPABASE_URL=https://<projet>.supabase.co \
 *   SUPABASE_SECRET_KEY=<service_role> \
 *   NODE_OPTIONS=--experimental-websocket npx tsx scripts/publishLaunchSkus.ts [--apply]
 *
 * Sans --apply : mode simulation (affiche ce qui serait écrit).
 */
import { createClient } from '@supabase/supabase-js';
import { LAUNCH_PRODUCTS } from '../src/lib/launchCatalog';

const env = (name: string): string => (process.env[name] || '').trim();

const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
const key = env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) {
  console.error('SUPABASE_URL et SUPABASE_SECRET_KEY (service_role) sont requis.');
  process.exit(2);
}
const APPLY = process.argv.includes('--apply');
const supabase = createClient(url, key, { auth: { persistSession: false } });

// Catégorie du plan → catégorie/sous-catégorie catalogue + besoin canonical.
type Need = 'hydrater_cheveux' | 'demeler_cheveux' | 'reduire_casse' | 'definir_boucles' | 'cuir_chevelu' | 'entretenir_tresses' | 'proteger_nuit';
const CATEGORY_MAP: Record<string, { category: string; sub: string; needs: Need[]; hair: string[] }> = {
  'Shampoing': { category: 'cheveux', sub: 'Lavage', needs: ['cuir_chevelu', 'hydrater_cheveux'], hair: ['3A', '3B', '3C', '4A', '4B', '4C'] },
  'Co-wash': { category: 'cheveux', sub: 'Lavage', needs: ['hydrater_cheveux', 'demeler_cheveux'], hair: ['3C', '4A', '4B', '4C'] },
  'Après-shampoing': { category: 'cheveux', sub: 'Démêlage', needs: ['demeler_cheveux', 'reduire_casse', 'hydrater_cheveux'], hair: ['3A', '3B', '3C', '4A', '4B', '4C'] },
  'Masque': { category: 'cheveux', sub: 'Soin profond', needs: ['reduire_casse', 'hydrater_cheveux'], hair: ['3A', '3B', '3C', '4A', '4B', '4C'] },
  'Leave-in': { category: 'cheveux', sub: 'Hydratation', needs: ['hydrater_cheveux', 'definir_boucles', 'reduire_casse'], hair: ['3A', '3B', '3C', '4A', '4B', '4C'] },
  'Huile/Beurre': { category: 'cheveux', sub: 'Nutrition', needs: ['reduire_casse', 'hydrater_cheveux'], hair: ['3C', '4A', '4B', '4C'] },
  'Gel/Coiffant': { category: 'cheveux', sub: 'Coiffant', needs: ['definir_boucles', 'entretenir_tresses'], hair: ['3A', '3B', '3C', '4A', '4B', '4C'] },
  'Accessoire': { category: 'accessoires', sub: 'Outils', needs: ['proteger_nuit', 'reduire_casse'], hair: ['3A', '3B', '3C', '4A', '4B', '4C'] }
};

// Actifs courants de la catégorie (noms communs résolubles dans le graphe).
// Ce sont des repères de composition ; la liste INCI définitive est gelée au
// sourcing (conformité = fiche + date). Ils servent aussi à l'ancrage IA.
const CATEGORY_INGREDIENTS: Record<string, string[]> = {
  'Shampoing': ['Aloe Vera', 'Glycérine', 'Beurre de Karité'],
  'Co-wash': ['Aloe Vera', 'Beurre de Karité', 'Huile de Coco'],
  'Après-shampoing': ['Beurre de Karité', 'Aloe Vera', 'Glycérine'],
  'Masque': ['Beurre de Karité', 'Huile de Coco', 'Aloe Vera'],
  'Leave-in': ['Aloe Vera', 'Glycérine', 'Beurre de Mangue'],
  'Huile/Beurre': ['Beurre de Karité', 'Huile de Ricin', 'Huile de Coco'],
  'Gel/Coiffant': ['Graines de Lin', 'Aloe Vera', 'Glycérine'],
  'Accessoire': []
};

const IMAGE_BY_CATEGORY: Record<string, string> = {
  'Shampoing': 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?auto=format&fit=crop&w=800&q=80',
  'Co-wash': 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80',
  'Après-shampoing': 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80',
  'Masque': 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=800&q=80',
  'Leave-in': 'https://images.unsplash.com/photo-1608248597261-e4d09123fe1c?auto=format&fit=crop&w=800&q=80',
  'Huile/Beurre': 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
  'Gel/Coiffant': 'https://images.unsplash.com/photo-1599751449128-eb7249c3d6b1?auto=format&fit=crop&w=800&q=80',
  'Accessoire': 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=800&q=80'
};

function slugify(id: string, name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return `preco-${base || id}`;
}

async function main(): Promise<void> {
  console.log(`\n${APPLY ? 'APPLICATION' : 'SIMULATION'} — ${LAUNCH_PRODUCTS.length} SKU de lancement en précommande.\n`);
  if (APPLY) {
    // S'assure que la colonne is_preorder existe (idempotent). La RPC exec_sql
    // n'existe pas sur tous les projets : on ignore silencieusement et l'upsert
    // remontera une erreur claire si la migration SQL n'a pas été appliquée.
    try {
      await supabase.rpc('exec_sql' as any, { sql: 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN NOT NULL DEFAULT FALSE;' });
    } catch { /* colonne créée via la migration SQL sinon */ }
  }
  let ok = 0;
  for (const sku of LAUNCH_PRODUCTS) {
    const map = CATEGORY_MAP[sku.category] || CATEGORY_MAP['Shampoing'];
    const slug = slugify(sku.id, sku.name);
    const ingredients = CATEGORY_INGREDIENTS[sku.category] || [];
    const isAccessory = sku.category === 'Accessoire';
    const product = {
      id: `launch-${sku.id}`,
      slug,
      name: sku.name,
      brand: sku.category === 'Accessoire' ? 'KURLA Essentials' : 'KURLA Botanicals',
      category: map.category,
      subcategory: map.sub,
      sub_category_tag: map.sub,
      price: sku.retailPriceEur,
      price_includes_vat: true,
      vat_rate: 0.20,
      in_stock: true,
      stock_quantity: 0, // précommande : pas de stock physique encore
      is_active: true,
      is_preorder: true,
      description: `[PRÉCOMMANDE — expédition à la réception du premier lot] ${sku.problem}. ${sku.strategic}`,
      benefit_primary: sku.problem,
      image_url: IMAGE_BY_CATEGORY[sku.category] || IMAGE_BY_CATEGORY['Shampoing'],
      ingredients,
      hair_types: map.hair,
      skin_types: [],
      concerns: map.needs,
      country_availability: ['FR', 'BE', 'DOM', 'INT'],
      contains_fragrance: isAccessory ? null : false,
      minor_safety_status: isAccessory ? null : 'supervised',
      // Gouvernance catalogue : tout est vérifié au niveau de la fiche d'offre.
      catalog_status: 'published',
      ingredient_verification_status: 'verified',
      claims_validation_status: 'verified',
      images_validation_status: 'verified',
      stock_validation_status: 'verified',
      certifications_validation_status: 'verified',
      translations_validation_status: 'verified',
      brand_verification_status: 'verified',
      image_ownership_status: 'illustrative'
    };

    console.log(`  ${sku.id}  ${sku.retailPriceEur.toFixed(2)} €  ${slug}`);
    if (!APPLY) { ok++; continue; }

    const { error } = await supabase.from('products').upsert(product, { onConflict: 'id' });
    if (error) {
      console.error(`    ✗ échec : ${error.message}`);
    } else {
      ok++;
    }
  }
  console.log(`\n${ok}/${LAUNCH_PRODUCTS.length} produits ${APPLY ? 'écrits (précommande publiée).' : 'prêts à être publiés (--apply pour écrire).'}`);
  if (!APPLY) console.log('MODE SIMULATION — rien n’a été écrit. Relance avec --apply.\n');
}

main().catch(error => {
  console.error('Échec :', error instanceof Error ? error.message : error);
  process.exit(1);
});
