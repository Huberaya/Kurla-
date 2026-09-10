/**
 * CHANTIER C-02 — banc de la base de connaissance peau.
 *
 * Ce que ce banc verrouille :
 *
 *  1. **Le profil acnéique existe et il est atteignable.** C'était la lacune :
 *     deux profils seulement, et rien pour les imperfections — alors que c'est
 *     le cas où une peau mélaninée paie le prix le plus durable.
 *
 *  2. **L'ordre de sélection n'est pas arbitraire.** L'acné passe avant les
 *     taches : sur peau mélaninée, une imperfection maltraitée est précisément
 *     ce qui produit les taches. Traiter la conséquence en laissant la cause
 *     condamne la routine à courir après ses propres marques.
 *
 *  3. **Les produits cités existent.** Les deux profils d'origine citaient des
 *     produits absents du catalogue (« Sérum Éclat Niacinamide & Hibiscus »,
 *     « Huile Éclat Visage au Jojoba & Marula »). Personne ne l'a vu pendant
 *     des mois : le code était mort. Maintenant qu'il s'affiche, une référence
 *     inventée serait un mensonge visible — d'où le contrôle.
 *
 *  4. **Aucun terme médical.** Ce sont des règles de soin, pas des avis de
 *     santé. Le vocabulaire engage : « guérir » n'est pas de notre ressort.
 */
import { strict as assert } from 'node:assert';
import { PEAU_KITS } from '../src/lib/peauKits';
import {
  SKIN_KNOWLEDGE,
  pickSkinKnowledgeProfile,
  type SkinKnowledgeAnswers
} from '../src/lib/knowledge/skin';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const CATALOGUE = new Set(PEAU_KITS.flatMap(kit => kit.products.map(product => product.name)));
const MEDICAL_TERMS = ['traitement', 'médicament', 'prescription', 'ordonnance', 'diagnostic', 'pathologie', 'guérir', 'soigner', 'thérapie'];

// ——— 1. Le profil acnéique existe ———
{
  assert.ok(SKIN_KNOWLEDGE['melanin-acne'], 'profil acnéique absent de la base');
  assert.ok(SKIN_KNOWLEDGE['melanin-pigmentation']);
  assert.ok(SKIN_KNOWLEDGE['melanin-dry']);
  ok('trois profils : imperfections, taches, sécheresse — les manques sont comblés');
}

// ——— 2. Une acné déclarée mène au profil acnéique ———
{
  assert.equal(pickSkinKnowledgeProfile({ acne: 'occasionnelle' })?.key, 'melanin-acne');
  assert.equal(pickSkinKnowledgeProfile({ acne: 'reguliere' })?.key, 'melanin-acne');
  ok('acné occasionnelle ou régulière ⇒ profil imperfections');
}

// ——— 3. La préoccupation suffit, même sans le champ acné ———
{
  assert.equal(pickSkinKnowledgeProfile({ skinConcerns: ['imperfections'] })?.key, 'melanin-acne');
  assert.equal(pickSkinKnowledgeProfile({ skinObjectives: ['reduire_imperfections'] })?.key, 'melanin-acne');
  ok('« imperfections » en préoccupation ou en objectif ⇒ profil imperfections');
}

// ——— 4. L’acné passe avant les taches ———
{
  const both = pickSkinKnowledgeProfile({ acne: 'reguliere', skinConcerns: ['taches', 'imperfections'] });
  assert.equal(both?.key, 'melanin-acne');
  ok('acné + taches ⇒ le profil imperfection gagne : la cause avant la conséquence');
}

// ——— 5. Taches sans acné : le profil pigmentation ———
{
  assert.equal(pickSkinKnowledgeProfile({ skinConcerns: ['taches'] })?.key, 'melanin-pigmentation');
  assert.equal(pickSkinKnowledgeProfile({ skinObjectives: ['attenuer_taches'] })?.key, 'melanin-pigmentation');
  assert.equal(pickSkinKnowledgeProfile({ hyperpigmentationTendency: 'frequente' })?.key, 'melanin-pigmentation');
  ok('taches, objectif « atténuer » ou HPI fréquente ⇒ profil taches');
}

// ——— 6. Peau sèche : le profil sécheresse ———
{
  assert.equal(pickSkinKnowledgeProfile({ skinType: 'seche' })?.key, 'melanin-dry');
  assert.equal(pickSkinKnowledgeProfile({ skinType: 'tres_seche' })?.key, 'melanin-dry');
  assert.equal(pickSkinKnowledgeProfile({ hydrationLevel: 'deshydratee' })?.key, 'melanin-dry');
  assert.equal(pickSkinKnowledgeProfile({ skinConcerns: ['secheresse'] })?.key, 'melanin-dry');
  ok('peau sèche, très sèche ou déshydratée ⇒ profil sécheresse');
}

// ——— 7. « Pas d’imperfections » n’est pas une acné ———
{
  const none = pickSkinKnowledgeProfile({ acne: 'aucune', skinConcerns: ['teint_terne'] });
  assert.notEqual(none?.key, 'melanin-acne');
  ok('acné = « aucune » ⇒ pas de profil imperfections imposé');
}

// ——— 8. Rien de déclaré : aucun profil, jamais par défaut ———
{
  assert.equal(pickSkinKnowledgeProfile({}), null);
  assert.equal(pickSkinKnowledgeProfile(null), null);
  assert.equal(pickSkinKnowledgeProfile(undefined), null);
  assert.equal(pickSkinKnowledgeProfile({ acne: 'inconnu', skinConcerns: ['inconnu'] }), null);
  assert.equal(pickSkinKnowledgeProfile({ skinType: 'mixte', skinConcerns: ['grain_irregulier'] }), null);
  ok('sans signal : aucun profil — un profil par défaut serait une invention');
}

// ——— 9. Chaque profil est complet ———
{
  for (const [key, profile] of Object.entries(SKIN_KNOWLEDGE)) {
    assert.ok(profile.name.length > 5, `${key} sans nom`);
    assert.ok(profile.description.length > 40, `${key} sans description`);
    assert.ok(profile.melaninKeyPoints.length >= 3, `${key} : moins de 3 points mélanine`);
    assert.ok(profile.recommendedIngredients.length >= 3, `${key} : moins de 3 actifs conseillés`);
    assert.ok(profile.ingredientsToAvoid.length >= 2, `${key} : moins de 2 choses à éviter`);
    assert.ok(profile.keyProducts.length >= 2, `${key} : moins de 2 produits cités`);
  }
  ok('les trois profils portent description, points mélanine, actifs, évitements et produits');
}

// ——— 10. Les produits cités existent au catalogue ———
{
  for (const [key, profile] of Object.entries(SKIN_KNOWLEDGE)) {
    for (const product of profile.keyProducts) {
      assert.ok(CATALOGUE.has(product), `${key} cite un produit absent du catalogue : « ${product} »`);
    }
  }
  ok(`les ${Object.values(SKIN_KNOWLEDGE).flatMap(p => p.keyProducts).length} références produit existent vraiment dans les kits peau`);
}

// ——— 11. Aucun terme médical ———
{
  for (const [key, profile] of Object.entries(SKIN_KNOWLEDGE)) {
    const text = [
      profile.type, profile.name, profile.description,
      ...profile.melaninKeyPoints,
      ...profile.recommendedIngredients,
      ...profile.ingredientsToAvoid
    ].join(' ').toLowerCase();
    for (const term of MEDICAL_TERMS) {
      assert.ok(!text.includes(term), `${key} emploie un terme médical : « ${term} »`);
    }
  }
  ok('aucun profil ne sort du rôle : ce sont des règles de soin, pas des avis de santé');
}

// ——— 12. Le profil acnéique dit ce qui compte vraiment sur peau mélaninée ———
{
  const acne = SKIN_KNOWLEDGE['melanin-acne'];
  const text = acne.melaninKeyPoints.join(' ').toLowerCase();
  assert.ok(/percer|triturer/.test(text), 'le profil ne déconseille pas de percer');
  assert.ok(/spf/.test(text), 'le profil ne rappelle pas le SPF');
  assert.ok(/marque/.test(acne.description.toLowerCase()), 'la description ne parle pas des marques');
  assert.ok(
    acne.ingredientsToAvoid.some(item => /bha/i.test(item) && /rétinol|retinol/i.test(item)),
    'le profil ne met pas en garde contre la superposition BHA + rétinol'
  );
  ok('le profil imperfections parle de la marque qui reste, pas seulement du bouton');
}

// ——— 13. Sélection stable ———
{
  const answers: SkinKnowledgeAnswers = { acne: 'reguliere', skinConcerns: ['taches'] };
  const a = pickSkinKnowledgeProfile(answers);
  const b = pickSkinKnowledgeProfile(answers);
  assert.equal(a?.key, b?.key);
  assert.deepEqual(a, b);
  ok('deux appels sur les mêmes réponses donnent le même profil');
}

console.log(`\n  ${checks} contrôles passés — base de connaissance peau (C-02)\n`);
