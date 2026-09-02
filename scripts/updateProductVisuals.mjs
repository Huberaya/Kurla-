// Upload des visuels éditoriaux par famille dans le Storage Supabase, puis
// mapping fin de chaque SKU launch-* vers le visuel adapté.
// Usage: SUPABASE_SECRET_KEY=... node scripts/updateProductVisuals.mjs [--apply]
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.SUPABASE_URL || 'https://qzwgsarfdegqtfdnqiql.supabase.co';
const key = process.env.SUPABASE_SECRET_KEY || '';
const APPLY = process.argv.includes('--apply');
const supa = createClient(url, key, { auth: { persistSession: false } });

const BUCKET = 'product-images';
const BASE = `${url}/storage/v1/object/public/${BUCKET}`;

// visuel -> fichier local
const VISUALS = {
  care: 'kurla-care.jpg',
  mask: 'kurla-mask.jpg',
  leavein: 'kurla-leavein.jpg',
  oil: 'kurla-oil.jpg',
  styling: 'kurla-styling.jpg',
  accessory: 'kurla-accessory.jpg',
  satin: 'kurla-satin.jpg',
  rollers: 'kurla-rollers.jpg',
  men: 'kurla-men.jpg',
  device: 'kurla-device.jpg',
};

// id SKU (sans le préfixe launch-) -> clé visuel
const PRODUCT_VISUAL = {
  // Soins lavants
  p01: 'care', p02: 'care', p03: 'care', p04: 'care', p54: 'care',
  // Masques / soin profond
  p05: 'mask', p06: 'mask', p33: 'mask', p52: 'mask',
  // Leave-in / brumes
  p07: 'leavein', p08: 'leavein', p32: 'leavein', p34: 'leavein', p51: 'leavein',
  // Huiles / beurre / sérums
  p09: 'oil', p10: 'oil', p11: 'oil', p28: 'oil', p31: 'oil', p53: 'oil',
  // Coiffants / gels / mousses
  p12: 'styling', p13: 'styling', p14: 'styling', p15: 'styling', p29: 'styling', p30: 'styling',
  // Peignes / brosses / flacons / pinces (outils de base)
  p16: 'accessory', p18: 'accessory', p19: 'accessory', p20: 'accessory',
  p21: 'accessory', p23: 'accessory', p26: 'accessory', p35: 'accessory',
  p36: 'accessory', p37: 'accessory', p38: 'accessory', p42: 'accessory',
  // Protection nuit / satin
  p17: 'satin', p24: 'satin', p25: 'satin', p27: 'satin', p45: 'satin',
  // Boucles sans chaleur / rods / threading
  p22: 'rollers', p39: 'rollers', p40: 'rollers', p50: 'rollers',
  // Hommes / grooming
  p41: 'men', p46: 'men',
  // Appareils & innovations
  p43: 'device', p44: 'device', p47: 'device', p48: 'device', p49: 'device',
  // Kits
  k01: 'care', k02: 'care', k03: 'mask', k04: 'mask', k05: 'styling',
  k06: 'mask', k07: 'accessory', k08: 'men', k09: 'rollers', k10: 'device',
};

async function main() {
  // 1) Upload des visuels
  console.log(`\n${APPLY ? 'APPLICATION' : 'SIMULATION'} — upload des visuels.\n`);
  for (const [key, file] of Object.entries(VISUALS)) {
    const local = join(__dirname, '..', 'visuals', file);
    const buf = await readFile(local);
    console.log(`  upload ${file.padEnd(22)} (${(buf.length / 1024).toFixed(0)} Ko) -> ${BUCKET}/${file}`);
    if (APPLY) {
      const { error } = await supa.storage.from(BUCKET).upload(file, buf, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600',
      });
      if (error) console.error('   ✗', error.message);
    }
  }

  // 2) Mapping produits -> image_url
  const { data: products, error } = await supa.from('products').select('id').ilike('id', 'launch-%');
  if (error) throw error;
  console.log(`\n${products.length} produits launch-* à mapper.\n`);
  let ok = 0;
  for (const p of products) {
    const sku = p.id.replace('launch-', '');
    const visual = PRODUCT_VISUAL[sku];
    if (!visual) { console.log(`  (sans mapping) ${p.id}`); continue; }
    const imageUrl = `${BASE}/${VISUALS[visual]}`;
    console.log(`  ${p.id.padEnd(12)} -> ${VISUALS[visual]}`);
    if (APPLY) {
      const { error: e2 } = await supa.from('products').update({ image_url: imageUrl, updated_at: new Date().toISOString() }).eq('id', p.id);
      if (e2) console.error('   ✗', p.id, e2.message); else ok++;
    }
  }
  console.log(`\n${APPLY ? `${ok} images mises à jour.` : '--apply pour écrire.'}`);
}
main().catch(e => { console.error(e); process.exit(1); });
