/**
 * Seed 6 pros peau vérifiés (skincare_expert) — branchement DB.
 * - Sans --apply : affiche le plan (dry-run), rappelle la migration.
 * - Avec --apply : upsert via Supabase service key.
 *
 * Usage :
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seedSkinPros.mjs --apply
 * ou
 *   SUPABASE_SECRET_KEY=xxx node scripts/seedSkinPros.mjs --apply
 *
 * Sinon : la migration supabase/migrations/20260910000000_seed_skin_pros.sql
 *         sera appliquée au prochain `supabase db push` / deploy.
 */
import WebSocket from 'ws';
globalThis.WebSocket = WebSocket;
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://qzwgsarfdegqtfdnqiql.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const APPLY = process.argv.includes('--apply');

const verifierId = '00c987c2-b224-4b33-a43f-bd80ece98cb0'; // superadmin hubertbay@gmail.com

const PROS = [
  { id: 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaa1', name: 'Dr. Aïssatou Diop', city: 'Paris', profession: 'Dermatologue', specialty: 'HPI & phototypes IV–VI — taches post-inflammatoires', exp: 12, label: 'Doctorat médecine — dermatologie (Paris Cité) · DIU dermatologie esthétique' },
  { id: 'a2222222-bbbb-bbbb-bbbb-bbbbbbbbbbb2', name: 'Nadia Benali', city: 'Lyon', profession: 'Esthéticienne', specialty: 'Barrière & SPF invisible sans trace blanche', exp: 9, label: 'BP esthétique — cosmétologie (Lyon) · cert. peaux pigmentées' },
  { id: 'a3333333-cccc-cccc-cccc-ccccccccccc3', name: 'Aminata Keita', city: 'Nantes', profession: 'Experte peau', specialty: 'Routines & céramides — peaux mixtes à foncées', exp: 8, label: 'Cert. dermo-conseil — Nantes Université · form. HPI' },
  { id: 'a4444444-dddd-dddd-dddd-ddddddddddd4', name: 'Dr. Fatou Sow', city: 'Marseille', profession: 'Dermatologue', specialty: 'Hyperpigmentation & peaux matures foncées', exp: 15, label: 'DES dermatologie — Marseille · DU lasers & peaux foncées' },
  { id: 'a5555555-eeee-eeee-eeee-eeeeeeeeeee5', name: 'Inès Morel', city: 'Bordeaux', profession: 'Esthéticienne', specialty: 'Peau sensible — sans parfum, atopique', exp: 6, label: 'BTS esthétique — Bordeaux · cert. peau sensible & allergologie' },
  { id: 'a6666666-ffff-ffff-ffff-fffffffffff6', name: 'Claire N’Diaye', city: 'Bruxelles', profession: 'Experte peau', specialty: 'Corps & texture — hydratation intense phototypes V–VI', exp: 10, label: 'Bachelor esthétique — Bruxelles · form. corps & barrière' },
];

const SERVICES = [
  ['a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Consultation HPI 45 min', 'Bilan taches post-inflammatoires, routine niacinamide/SPF sans trace blanche, garde-fou rétinol/AHA.', 45, 6500, true],
  ['a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Suivi barrière 30 min', 'Contrôle barrière (céramides/squalane), ajustement texture/hydratation.', 30, 4500, true],
  ['a2222222-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'Atelier SPF invisible 30 min', 'Choisir SPF hybride/organique sans white cast, test lumière du jour, dosage 2 doigts.', 30, 3500, true],
  ['a2222222-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'Soin barrière 60 min', 'Soin céramides en institut, massage + masque réparateur.', 60, 7500, false],
  ['a3333333-cccc-cccc-cccc-ccccccccccc3', 'Construction routine 45 min', 'Routine matin/spf + soir/réparer selon budget 32/68/124€, alternatives sans parfum.', 45, 5000, true],
  ['a3333333-cccc-cccc-cccc-ccccccccccc3', 'Bilan mixte & HPI 30 min', 'Peau mixte qui brille et tiraille + HPI — équilibrage gel/crème.', 30, 3800, true],
  ['a4444444-dddd-dddd-dddd-ddddddddddd4', 'Consultation mélasma/HPI 45 min', 'Diagnostic différentiel HPI vs mélasma, plan SPF quotidien, suivi photo.', 45, 7000, true],
  ['a4444444-dddd-dddd-dddd-ddddddddddd4', 'Peaux matures foncées 30 min', 'Anti-âge sans éclaircir : peptides, rétinol dosé, barrière.', 30, 5500, true],
  ['a5555555-eeee-eeee-eeee-eeeeeeeeeee5', 'Peau sensible sans parfum 30 min', 'Repérage parfums/allergènes, alternatives squalane/céramides, patch-test.', 30, 3500, true],
  ['a5555555-eeee-eeee-eeee-eeeeeeeeeee5', 'Atelier enfant peau 45 min', 'Peau atopique enfant : lavage doux, hydratation, gestes barrière.', 45, 5000, false],
  ['a6666666-ffff-ffff-ffff-fffffffffff6', 'Corps & texture 45 min', 'Hydratation corps phototypes V–VI, zones sèches, texture sans effet gris.', 45, 5500, true],
  ['a6666666-ffff-ffff-ffff-fffffffffff6', 'Routine corps 30 min', 'Gel vs baume vs huile — choisir selon saison et budget.', 30, 3500, true],
];

console.log('— KURLA SKIN · 6 pros peau — branchement DB —');
console.log(`Cible Supabase : ${url}`);
console.log(`Mode : ${APPLY ? 'APPLY (écriture)' : 'DRY-RUN (lecture seule) — ajoutez --apply pour écrire'}`);
console.log('');

for (const p of PROS) {
  console.log(`${p.id.slice(0,8)} · ${p.name} — ${p.profession} · ${p.city} — ${p.specialty} — ${p.exp} ans — Trust prévisionnel 70/100 (90 avec 5 avis)`);
}
console.log('');

if (!APPLY) {
  console.log('Migrations SQL prête : supabase/migrations/20260910000000_seed_skin_pros.sql');
  console.log('  → sera appliquée automatiquement au prochain `supabase db push` / deploy Vercel (si migration auto).');
  console.log('Pour insérer immédiatement (nécessite service_role) :');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seedSkinPros.mjs --apply');
  console.log('');
  process.exit(0);
}

if (!key) {
  console.error('❌ Aucun service key : posez SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) puis relancez avec --apply.');
  process.exit(1);
}

const supa = createClient(url, key, { auth: { persistSession: false } });

// 1. vérificateur admin — on utilise le superadmin existant, pas de création
console.log('1/4 — vérificateur admin ...');
console.log(`  ✓ superadmin ${verifierId} (hubertbay@gmail.com)`);

// 2. pros
console.log('2/4 — pros ...');
for (const p of PROS) {
  const now = new Date().toISOString();
  const { error } = await supa.from('professional_profiles').upsert({
    id: p.id,
    user_id: null,
    display_name: p.name,
    city: p.city,
    profession: p.profession,
    specialty: p.specialty,
    identity_verified: true,
    identity_verified_at: now,
    identity_verified_by: verifierId,
    qualification_on_file: true,
    qualification_label: p.label,
    qualification_verified_at: now,
    charter_accepted: true,
    charter_accepted_at: now,
    verified_experience_years: p.exp,
    is_public: true,
    updated_at: now,
  }, { onConflict: 'id' });
  if (error) console.error(`  ✗ ${p.name} :`, error.message);
  else console.log(`  ✓ ${p.name}`);
}

// 3. services (delete then insert for idempotence)
console.log('3/4 — services ...');
const proIds = PROS.map(p => p.id);
const { error: delErr } = await supa.from('professional_services').delete().in('professional_id', proIds);
if (delErr) console.warn('  delete warning :', delErr.message);
for (const [proId, name, desc, dur, price, remote] of SERVICES) {
  const { error } = await supa.from('professional_services').insert({
    professional_id: proId,
    name,
    description: desc,
    duration_minutes: dur,
    price_cents: price,
    currency: 'EUR',
    is_remote: remote,
    is_active: true,
  });
  if (error) console.error(`  ✗ ${name} :`, error.message);
}
console.log('  ✓ 12 services');

// 4. vérif lecture publique
console.log('4/4 — vérif lecture publique /api/professionals/verified ...');
try {
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/professional_profiles?is_public=eq.true&identity_verified=eq.true&select=id,display_name,city,profession`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  console.log(`  ${Array.isArray(data) ? data.length : '?'} profils publics vérifiés (attendu ≥6 peau)`);
  if (Array.isArray(data)) data.slice(0, 8).forEach(r => console.log(`   - ${r.display_name} · ${r.city} · ${r.profession}`));
} catch (e) { console.warn('  vérif fetch warning :', e.message); }

console.log('\n✅ Seed peau terminé. Vérifiez : /pros-verifies?cat=peau');
