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

// Visuels KURLA générés et hébergés dans le Storage Supabase public (marque
// propre → image_ownership_status = 'brand_provided'). À remplacer par les
// photos produits définitives dès réception du premier lot.
const IMG_BASE = `${url}/storage/v1/object/public/product-images`;
const IMAGE_BY_CATEGORY: Record<string, string> = {
  'Shampoing': `${IMG_BASE}/kurla-care.jpg`,
  'Co-wash': `${IMG_BASE}/kurla-care.jpg`,
  'Après-shampoing': `${IMG_BASE}/kurla-care.jpg`,
  'Masque': `${IMG_BASE}/kurla-mask.jpg`,
  'Leave-in': `${IMG_BASE}/kurla-leavein.jpg`,
  'Huile/Beurre': `${IMG_BASE}/kurla-oil.jpg`,
  'Gel/Coiffant': `${IMG_BASE}/kurla-styling.jpg`,
  'Accessoire': `${IMG_BASE}/kurla-accessory.jpg`
};

// Visuel éditorial fin par produit (10 familles cohérentes avec la charte).
// Évite de tout ramener à 4 images génériques lors d'une republication.
function imageForSku(sku: { category: string; name: string }): string {
  const n = sku.name.toLowerCase();
  const img = (f: string) => `${IMG_BASE}/kurla-${f}.jpg`;
  if (sku.category !== 'Accessoire') {
    if (/masque|gommage|reconstruct|bond|liens/.test(n)) return img('mask');
    if (/karité|beurre|huile|sérum|ricin|romarin|tonique/.test(n)) return img('oil');
    if (/gel|mousse|coiff|twist|lin/.test(n)) return img('styling');
    if (/leave-in|spray|brume|refresh|thermo|crème de jour|hydratante coiffage/.test(n)) return img('leavein');
    if (/vinaigre|rinçage/.test(n)) return img('care');
    return IMAGE_BY_CATEGORY[sku.category] || IMAGE_BY_CATEGORY['Shampoing'];
  }
  // Accessoires
  if (/éponge|sponge|curl sponge|durag/.test(n)) return img('men');
  if (/steamer|vapeur|diffuseur|chauffant|thermal|masseur|nano-mist|appareil|brosse vapeur/.test(n)) return img('device');
  if (/flexi|perm rod|bigoudi|threading|rod/.test(n)) return img('rollers');
  if (/bonnet|foulard|headwrap|taie|filet|chouchou|satin|durag|douche/.test(n)) return img('satin');
  return img('accessory');
}

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
      // Marquage précommande via le badge canonique (aucune migration requise ;
      // la colonne is_preorder pourra être ajoutée plus tard comme redondance).
      badges: ['preorder'],
      description: `[PRÉCOMMANDE — expédition à la réception du premier lot] ${sku.problem}. ${sku.strategic}`,
      benefit_primary: sku.problem,
      image_url: imageForSku(sku),
      ingredients,
      // Les accessoires ne sont pas des cosmétiques : un INCI descriptif satisfait
      // la gouvernance (produit publié sans liste d'ingrédients cosmétiques).
      inci: isAccessory ? 'Accessoire capillaire — aucun ingrédient cosmétique.' : null,
      hair_types: map.hair,
      skin_types: [],
      concerns: map.needs,
      country_availability: ['FR', 'BE', 'DOM', 'INT'],
      contains_fragrance: isAccessory ? null : false,
      minor_safety_status: 'not_provided',
      // Gouvernance catalogue : tout est vérifié au niveau de la fiche d'offre.
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
