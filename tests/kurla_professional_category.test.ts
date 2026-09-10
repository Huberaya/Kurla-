/**
 * Banc du filtre « pro peau » de l'annuaire KURLA.
 *
 * Ce que ce banc verrouille :
 *
 *  1. **Le filtre ne repose plus sur un champ fantôme.** `profile.category`
 *     était lu par deux pages sans exister nulle part — ni dans la table
 *     `professional_profiles`, ni dans la candidature, ni dans la réponse
 *     API. La condition ne devenait jamais vraie. Ce banc exige que les six
 *     pros peau seedés soient reconnus, champs textuels seuls s'il le faut.
 *
 *  2. **Le repli est assumé, pas subi.** Sans `category`, la profession et la
 *     spécialité déclarées prennent le relais. On mesure ce que ça donne
 *     vraiment (5 pros sur 6) au lieu de le supposer : c'est la mesure qui
 *     justifie la migration 20260911000000, pas une intuition.
 *
 *  3. **Le filtre peau n'absorbe pas tout l'annuaire.** Un pro du cheveu ne
 *     doit pas remonter dans un filtre intitulé « peau ».
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { isSkinProfessional, SKINCARE_EXPERT } from '../src/lib/professionalCategory';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

/**
 * Les six professionnels peau seedés par 20260910000000_seed_skin_pros.sql,
 * tels qu'ils existent en base : profession et spécialité réelles, pas
 * idéalisées. C'est cette donnée qui a révélé le bug.
 */
const SEEDED_SKIN_PROS = [
  { id: 'P1', profession: 'Dermatologue', specialty: 'HPI & phototypes IV–VI — taches post-inflammatoires' },
  { id: 'P2', profession: 'Esthéticienne', specialty: 'Barrière & SPF invisible sans trace blanche' },
  { id: 'P3', profession: 'Experte peau', specialty: 'Routines & céramides — peaux mixtes à foncées' },
  { id: 'P4', profession: 'Dermatologue', specialty: 'Hyperpigmentation & peaux matures foncées' },
  { id: 'P5', profession: 'Esthéticienne', specialty: 'Peau sensible — sans parfum, atopique' },
  { id: 'P6', profession: 'Experte peau', specialty: 'Corps & texture — hydratation intense phototypes V–VI' }
];

const withoutCategory = SEEDED_SKIN_PROS.map(p => ({ ...p, category: null }));
const withCategory = SEEDED_SKIN_PROS.map(p => ({ ...p, category: SKINCARE_EXPERT }));

// ——— 1. `category` fait foi quand elle est renseignée ———
{
  assert.equal(isSkinProfessional({ category: SKINCARE_EXPERT, profession: 'Coiffeuse', specialty: null }), true);
  ok('category = skincare_expert ⇒ pro peau, quelle que soit la profession déclarée');
}

// ——— 2. Les six pros seedés sont tous reconnus une fois la catégorie portée ———
{
  const reconnus = withCategory.filter(isSkinProfessional).map(p => p.id);
  assert.deepEqual(reconnus, ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
  ok('les 6 pros peau seedés sont reconnus (avant : 4 sur 6, par coïncidence textuelle)');
}

// ——— 3. Sans `category`, le repli texte est mesuré et assumé ———
{
  const reconnus = withoutCategory.filter(isSkinProfessional).map(p => p.id);
  assert.deepEqual(reconnus, ['P1', 'P3', 'P4', 'P5', 'P6']);
  assert.equal(
    withoutCategory.filter(p => !isSkinProfessional(p)).map(p => p.id).join(','),
    'P2'
  );
  ok('sans category : 5 pros sur 6 — P2 (esthéticienne « SPF invisible ») n’est reconnue que par la migration');
}

// ——— 4. Le repli identifie un dermatologue par sa profession ———
{
  assert.equal(isSkinProfessional({ profession: 'Dermatologue', specialty: null, category: null }), true);
  assert.equal(isSkinProfessional({ profession: 'Dermatologue', specialty: 'greffe capillaire', category: null }), true);
  ok('profession = dermatologue ⇒ pro peau, même sans spécialité peau explicite');
}

// ——— 5. Un pro du cheveu n’entre pas dans le filtre peau ———
{
  const coiffeur = { category: 'braider', profession: 'Coiffeuse', specialty: 'Tresses & vanilles' };
  assert.equal(isSkinProfessional(coiffeur), false);
  assert.equal(isSkinProfessional({ category: 'barber', profession: 'Barbier', specialty: 'Dégradé & taille de barbe' }), false);
  ok('un pro cheveux (braider, barber) ne remonte pas dans le filtre peau');
}

// ——— 6. Casse et espaces : la saisie humaine n’est pas normalisée ———
{
  assert.equal(isSkinProfessional({ profession: '  DERMATOLOGUE  ', specialty: null }), true);
  assert.equal(isSkinProfessional({ profession: 'Experte PEAU', specialty: null }), true);
  ok('casse et espaces indifférents — «   DERMATOLOGUE  » est reconnu');
}

// ——— 7. Profil vide : jamais supposé pro peau ———
{
  assert.equal(isSkinProfessional(null), false);
  assert.equal(isSkinProfessional(undefined), false);
  assert.equal(isSkinProfessional({}), false);
  assert.equal(isSkinProfessional({ category: null, profession: null, specialty: null }), false);
  ok('profil absent ou vide ⇒ non pro peau, aucune supposition');
}

// ——— 8. Catégorie inconnue : on retombe sur le texte, pas sur un refus ———
{
  assert.equal(isSkinProfessional({ category: '', profession: 'Experte peau', specialty: null }), true);
  assert.equal(isSkinProfessional({ category: 'maquilleur', profession: 'Maquilleur', specialty: 'Teint & matière' }), false);
  ok('category vide ou hors nomenclature ⇒ repli sur la profession, sans bloquer l’enregistrement');
}

// ——— 9. Le rattrapage SQL couvre bien les six identifiants ———
{
  const sql = readFileSync(new URL('../supabase/migrations/20260911000000_professional_category.sql', import.meta.url), 'utf8');
  const ids = [
    'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'a2222222-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'a3333333-cccc-cccc-cccc-ccccccccccc3',
    'a4444444-dddd-dddd-dddd-ddddddddddd4',
    'a5555555-eeee-eeee-eeee-eeeeeeeeeee5',
    'a6666666-ffff-ffff-ffff-fffffffffff6'
  ];
  for (const id of ids) assert.ok(sql.includes(id), `identifiant absent du rattrapage : ${id}`);
  assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS category'));
  ok('la migration porte les 6 identifiants et ajoute la colonne de façon rejouable');
}

// ——— 10. Les deux pages partagent le même prédicat ———
{
  // Deux conditions écrites séparément, c'est exactement la panne d'origine :
  // le compteur et la liste se contredisaient. On vérifie qu'aucune page
  // n'a réécrit son propre filtre au lieu d'appeler le module.
  for (const page of ['src/pages/ProfessionalDirectoryPage.tsx', 'src/pages/SkinLandingPage.tsx']) {
    const source = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.ok(source.includes('isSkinProfessional'), `${page} n'appelle pas le prédicat partagé`);
    assert.ok(!source.includes(".includes('skin')"), `${page} a réécrit le filtre en ligne`);
  }
  ok('annuaire et page d’accueil peau appellent le même prédicat — plus de compteur qui ment');
}

console.log(`\n  ${checks} contrôles passés — filtre pro peau\n`);
