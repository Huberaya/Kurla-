/**
 * Seed des 5 ROUTINES de lancement (tables `routines` + `routine_items`).
 * Chaque étape pointe vers un produit publié launch-pXX ; une routine n'est
 * lisible publiquement que si toutes ses étapes ont un produit existant
 * (cf. contentStore.getRoutines). Idempotent (merge sur id).
 *
 * Usage : SUPABASE_SECRET_KEY=… node scripts/seedRoutines.mjs [--apply]
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
const url = process.env.SUPABASE_URL || 'https://qzwgsarfdegqtfdnqiql.supabase.co';
const key = process.env.SUPABASE_SECRET_KEY || '';
const APPLY = process.argv.includes('--apply');
const supa = createClient(url, key, { auth: { persistSession: false } });

const ROUTINES = [
  ['r01','routine-cheveux-secs-deshydrates','Routine cheveux secs / déshydratés',
   '3C–4C, cheveux rêches, manque d’hydratation. Hydrater en profondeur et sceller.',
   'Hydratation 72 h, souplesse, moins de casse au démêlage','~20 min (lavage) · 5 min/jour','1 à 2 lavages/semaine',
   [['Laver','Shampoing crème sans sulfate, moussez sur cuir chevelu.','p01'],
    ['Démêler','Après-shampoing, peigne à dents larges sous la douche.','p04'],
    ['Soin hebdo','Masque nutritif beurre de karité, poser 20-30 min.','p05'],
    ['Hydrater sans rinçage','Leave-in riche sur cheveux humides.','p08'],
    ['Sceller','Beurre de karité brut pour enfermer l’hydratation.','p09']]],
  ['r02','routine-definition-boucles-3a-3b','Routine définition boucles (3A/3B/3C)',
   'Boucles dessinées, sans effet carton ni frisottis.',
   'Boucles rebondies et définies, sans croûtage','~25 min le jour de lavage','1 à 2 lavages/semaine',
   [['Laver','Shampoing crème hydratant sans sulfate.','p01'],
    ['Hydrater (leave-in)','Leave-in crème légère sur cheveux détrempés.','p07'],
    ['Définir (gel de lin)','Gel de lin en scrunching, tenue souple.','p13'],
    ['Brillance','Sérum huiles nourricières sur pointes.','p11']]],
  ['r03','routine-crepus-4c-nutrition','Routine cheveux crépus 4C (nutrition)',
   '4B/4C très secs : nourrir, hydrater et protéger.',
   'Nutrition profonde, rétention de longueur','~30 min le jour de lavage','1 lavage/semaine',
   [['Co-wash','Nettoyer en douceur sans shampoing agressif.','p03'],
    ['Masque nutritif','Masque karité, source de nutrition intense.','p05'],
    ['Leave-in riche','Crème « cream » sur cheveux humides.','p08'],
    ['Beurre de karité','Sceller l’hydratation.','p09'],
    ['Coiffage','Crème de définition twist-out / braid-out.','p12']]],
  ['r04','routine-reparation-pousse','Routine réparation / pousse',
   'Cheveux cassants, fourches, chute : reconstruire et stimuler.',
   'Fibre renforcée, moins de fourches et de casse','~30 min le jour de lavage','Clarifier 1x/2 semaines',
   [['Clarifier','Shampoing purifiant une fois toutes les deux semaines.','p02'],
    ['Masque protéiné','Reconstruire la fibre abîmée.','p06'],
    ['Ricin (racines)','Huile de ricin noire jamaïcaine en massage du cuir chevelu.','p10'],
    ['Leave-in','Leave-in crème légère au quotidien.','p07']]],
  ['r05','routine-refresh-coiffure','Routine refresh / entretien coiffure',
   'Tous types, entre deux lavages : raviver hydratation et définition.',
   'Coiffures qui tiennent plus longtemps','5 min/jour','Quotidien les jours sans lavage',
   [['Vaporiser','Eau + leave-in dilué en brume continue.','p18'],
    ['Ré-hydrater','Leave-in riche en petites touches.','p08'],
    ['Redéfinir / tenir','Gel de tenue forte edge & twist.','p14'],
    ['Protéger la nuit','Bonnet satin + taie, anti-frottements.','p17']]],
];

const now = new Date().toISOString();
const { data: products } = await supa.from('products').select('id,price').ilike('id','launch-p%');
const price = Object.fromEntries((products||[]).map(p => [p.id, Number(p.price)]));

for (const [id,slug,title,subtitle,benefit,duration,frequency,steps] of ROUTINES){
  const total = Math.round(steps.reduce((s,[,,pid]) => s + (price[`launch-${pid}`]||0), 0) * 100)/100;
  console.log(`${id} ${title} — ${total.toFixed(2)} € (${steps.length} étapes)`);
  if (!APPLY) continue;
  await supa.from('routines').upsert({
    id, slug, title, subtitle, category:'cheveux', benefit, duration, frequency,
    price: total, original_price: null, image_url: null,
    image_ownership_status:'brand_provided', images_validation_status:'verified',
    status:'published', updated_at: now
  }, { onConflict:'id' });
  await supa.from('routine_items').delete().eq('routine_id', id);
  await supa.from('routine_items').insert(steps.map(([t,d,pid],i) => ({
    id: randomUUID(), routine_id:id, product_id:`launch-${pid}`, variant_id:null,
    step_number:i+1, title:t, description:d, quantity:1
  })));
}
console.log(APPLY ? '\nÉcrit.' : '\n--apply pour écrire.');
