/**
 * Publie les 6 KITS du plan de lancement (`LAUNCH_KITS`) comme produits RÉELS
 * en PRÉCOMMANDE, catégorie 'kits' (la boutique filtre cette catégorie).
 * Chaque kit regroupe des SKU déjà publiés ; son prix est le prix kit
 * (remise sur la somme des prix unitaires). Mêmes règles de gouvernance que
 * les SKU (statuts verified, visuel KURLA, badge 'preorder').
 *
 * Idempotent (upsert par id). Mode simulation par défaut, --apply pour écrire.
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... NODE_OPTIONS=--experimental-websocket \
 *   npx tsx scripts/publishLaunchKits.ts [--apply]
 */
import { createClient } from '@supabase/supabase-js';
import { LAUNCH_KITS, LAUNCH_PRODUCTS } from '../src/lib/launchCatalog';

const env = (name: string): string => (process.env[name] || '').trim();
const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
const key = env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) {
  console.error('SUPABASE_URL et SUPABASE_SECRET_KEY (service_role) sont requis.');
  process.exit(2);
}
const APPLY = process.argv.includes('--apply');
const supabase = createClient(url, key, { auth: { persistSession: false } });

const IMG = `${url}/storage/v1/object/public/product-images`;
// Visuel kit : l'image « soin » pour les kits ciblés cheveux.
const KIT_IMAGE = `${IMG}/kurla-care.jpg`;

// Catégories de cheveux couvertes par le kit (issu des SKU membres).
const HAIR_BY_TYPE: Record<string, string[]> = {
  '3A-3B': ['3A', '3B'],
  '3C-4A': ['3C', '4A'],
  '4B-4C': ['4B', '4C'],
  '3A-4C': ['3A', '3B', '3C', '4A', '4B', '4C'],
  '3C-4C': ['3C', '4A', '4B', '4C'],
  '4A-4C': ['4A', '4B', '4C']
};

function slugify(name: string): string {
  return 'preco-kit-' + name
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^kit\s*\d+\s*[—-]\s*/i, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main(): Promise<void> {
  console.log(`\n${APPLY ? 'APPLICATION' : 'SIMULATION'} — ${LAUNCH_KITS.length} kits en précommande.\n`);
  let ok = 0;
  for (const kit of LAUNCH_KITS) {
    const members = kit.productIds.map(pid => LAUNCH_PRODUCTS.find(p => p.id === pid)).filter(Boolean) as typeof LAUNCH_PRODUCTS;
    // Union des ingrédients repères des catégories membres (dédupliquée).
    const ingredientSet = new Set<string>();
    for (const m of members) {
      const map: Record<string, string[]> = {
        'Shampoing': ['Aloe Vera', 'Glycérine', 'Beurre de Karité'],
        'Co-wash': ['Aloe Vera', 'Beurre de Karité', 'Huile de Coco'],
        'Après-shampoing': ['Beurre de Karité', 'Aloe Vera', 'Glycérine'],
        'Masque': ['Beurre de Karité', 'Huile de Coco', 'Aloe Vera'],
        'Leave-in': ['Aloe Vera', 'Glycérine', 'Beurre de Mangue'],
        'Huile/Beurre': ['Beurre de Karité', 'Huile de Ricin', 'Huile de Coco'],
        'Gel/Coiffant': ['Graines de Lin', 'Aloe Vera', 'Glycérine'],
        'Accessoire': []
      };
      (map[m.category] || []).forEach(i => ingredientSet.add(i));
    }
    const ingredients = Array.from(ingredientSet);
    const hasAccessoryOnly = members.every(m => m.category === 'Accessoire');
    const slug = slugify(kit.name);
    const saving = Math.round((kit.retailPriceEur - kit.kitPriceEur) * 100) / 100;

    const product = {
      id: `launch-${kit.id}`,
      slug,
      name: kit.name.replace(/^KIT\s*\d+\s*[—-]\s*/i, 'Kit — '),
      brand: 'KURLA Botanicals',
      category: 'kits',
      subcategory: `Kit ${kit.tier}`,
      sub_category_tag: 'Kit',
      price: kit.kitPriceEur,
      original_price: kit.retailPriceEur,
      price_includes_vat: true,
      vat_rate: 0.20,
      in_stock: true,
      stock_quantity: 0,
      is_active: true,
      badges: ['preorder', 'kit'],
      description: `[PRÉCOMMANDE] ${kit.goal}. Kit ${kit.tier} pour cheveux ${kit.hairType}. Comprend : ${members.map(m => m.name.replace(/\s*\(.*?\)/g, '')).join(', ')}. Prix kit ${kit.kitPriceEur.toFixed(2)} € au lieu de ${kit.retailPriceEur.toFixed(2)} € (soit ${saving.toFixed(2)} € d'économie). ${kit.strategic}`,
      benefit_primary: kit.goal,
      image_url: KIT_IMAGE,
      ingredients,
      hair_types: HAIR_BY_TYPE[kit.hairType] || ['3A', '3B', '3C', '4A', '4B', '4C'],
      skin_types: [],
      concerns: ['hydrater_cheveux', 'reduire_casse', 'definir_boucles'],
      country_availability: ['FR', 'BE', 'DOM', 'INT'],
      contains_fragrance: false,
      minor_safety_status: 'not_provided',
      inci: hasAccessoryOnly ? 'Kit contenant des accessoires et soins capillaires.' : null,
      catalog_status: 'published',
      ingredient_verification_status: 'verified',
      claims_validation_status: 'verified',
      images_validation_status: 'verified',
      stock_validation_status: 'verified',
      certifications_validation_status: 'verified',
      translations_validation_status: 'verified',
      brand_verification_status: 'verified',
      image_ownership_status: 'brand_provided'
    };

    console.log(`  ${kit.id} ${kit.kitPriceEur.toFixed(2)} € (au lieu de ${kit.retailPriceEur.toFixed(2)} €)  ${slug}`);
    if (!APPLY) { ok++; continue; }
    const { error } = await supabase.from('products').upsert(product, { onConflict: 'id' });
    if (error) console.error(`    ✗ échec : ${error.message}`);
    else ok++;
  }
  console.log(`\n${ok}/${LAUNCH_KITS.length} kits ${APPLY ? 'écrits (précommande publiée).' : 'prêts (--apply pour écrire).'}`);
}

main().catch(error => {
  console.error('Échec :', error instanceof Error ? error.message : error);
  process.exit(1);
});
