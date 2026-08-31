# Chantier 1 — Graphe de connaissances ingrédients (sources 100 % gratuites)

> État au 2026-08-30. Objectif du plan de lancement : 3 000+ ingrédients et
> 100 % du catalogue relié, **sans payer INCIDB**. Ce document dit ce qui est
> fait, les sources retenues, et ce qui reste.

## Principe directeur
Aucun fait (CAS, fonction, famille, allégation) n'est inscrit sans une source
qui le dise. Une entité non confirmée par une source de référence **n'est pas
créée**. La provenance est tracée ligne par ligne dans `ingredient_provenance`
(tier 1 = source officielle de référence, tier 2 = recoupement).

## Sources gratuites retenues (aucune clé, aucun compte)
| Source | Licence | Rôle | Couverture |
|---|---|---|---|
| **Open Beauty Facts** | ODbL | Fréquence réelle des INCI sur les étiquettes cosmétiques (le « réservoir de demandes ») | 5 800+ tags INCI récoltés |
| **PubChem** (NIH/NLM) | Domaine public | Identité chimique : CID, formule, **CAS** (tier 1) | Substances chimiques uniques |
| **Wikidata** | CC0 | QID + CAS/EC en recoupement (tier 2) | Substances référencées |

Les **polymères, gommes et tensioactifs dérivés** (Dimethicone, Xanthan Gum,
Carbomer, Polyquaternium, Cocamidopropyl Betaine…) n'ont **pas d'entité
chimique unique** dans PubChem/Wikidata sous leur nom INCI : ce sont des
mélanges/familles. Conformément à la règle, ils ne sont pas insérés tant
qu'aucune source de référence ne les confirme. C'est une limite attendue, pas
un bug.

## Ce qui est livré
- `src/lib/ingredientSources.ts` — adaptateurs de sources :
  `fetchObfIngredientFrequency`, `resolvePubchem`, `resolveWikidata`,
  `resolveIngredientIdentity` (consolidé), normalisation des tags OBF,
  canonicité INCI (`water → aqua`), exclusion des fourre-tout (`parfum`,
  `silicones`, `allergenic-fragrances`…). Jamais d'erreur levée.
- `scripts/buildIngredientGraph.ts` — génère une migration SQL idempotente :
  `npm run ingredients:build -- --top N --out <fichier.sql>` (ou `--dry-run`).
  `verified` = CAS PubChem confirmé ; `pending` = entité reconnue sans CAS
  tier 1 ; non résolus = non insérés.
- `supabase/migrations/20260878000000_ingredient_graph_free.sql` — 1er lot.
- `tests/kurla_ingredient_sources.test.ts` — logique pure (PASS).

## Résultat en base (production Supabase)
| Avant | Après |
|---|---|
| 34 ingrédients | **118 ingrédients** |
| — | **100 verified** (CAS source officielle) |
| — | 16 pending, 2 non renseignés |
| — | **108 lignes de provenance** tracées |

Exemples vérifiés (CAS juste) : Aqua 7732-18-5, Glycerin 56-81-5, Citric Acid
77-92-9, Benzyl Alcohol 100-51-6, Allantoin 97-59-6, Arginine 74-79-3,
Linalool 78-70-6, Behentrimonium Chloride 17301-53-0…

## Lot réglementaire — fonctions CosIng + restrictions UE (2026-08-31)
Lot d'enrichissement **fonctionnel et juridictionnel**, 100 % gratuit et tracé
(livré en fichier de migration réutilisable, appliquable dans l'éditeur SQL
Supabase car l'écriture directe nécessite la clé `service_role`, non
disponible hors tableau de bord/Vercel) :
- `src/lib/ingredientRegulatory.ts` — faits par ingrédient : **fonctions
  cosmétiques déclarées CosIng** (vocabulaire FR contrôlé, jamais déduites de
  la chimie), **restrictions UE** (Annexes II interdits / III restreints /
  IV colorants / V conservateurs / VI filtres UV du Règlement (CE) n°1223/2009)
  et **allergènes** de l'annexe III modifiée par le Règlement (UE) 2023/1545.
- `scripts/buildRegulatoryMigration.ts` → `npm run ingredients:regulatory`
  génère `supabase/migrations/20260880000000_ingredient_regulatory.sql`
  (idempotent : `UPDATE ingredients`, `ON CONFLICT` restrictions/provenance).
- Couverture : **125 ingrédients** avec fonctions CosIng (116 des 118 qui en
  manquaient — les 2 résidus `Leaf`/`no1` sont des artefacts OBF sans INCI,
  laissés non étiquetés), **45 restrictions UE**, allergènes tracés. **0 id
  orphelin** (vérifié contre les 231 ingrédients en base).
- Limites numériques certifiées : parabènes 0,4 % (V), benzoate/acide
  benzoïque 0,5 % en acide (V), sorbate de potassium 0,6 % (V),
  phénoxyéthanol 1 % (V), chlorphénésine 0,3 % (V), pyrithione zinc 1 % (V),
  DMDM hydantoïne 0,6 % (V), dioxyde de titane 25 % (IV/VI). Quand la limite
  n'est pas certifiable, elle est laissée `NULL` (aucune valeur inventée).
- Test `npm run test:regulatory` (vocabulaire contrôlé, annexes valides,
  cohérence conservateurs→V / filtres UV→VI) — **PASS**.

> **Pour l'appliquer en production** : ouvrir la base `qzwgsarfdegqtfdnqiql`
> dans Supabase → SQL Editor → coller/exécuter le fichier
> `20260880000000_ingredient_regulatory.sql`. Il est idempotent.

## Ce qui reste (prochaines itérations, toujours gratuit)
1. **Élargir le réservoir** : lancer `ingredients:build --top 300..600`
   (mono-substances supplémentaires, ex. acides aminés, conservateurs, filtres
   solaires UV, minéraux). Chaque lot reste vérifié CAS par PubChem.
2. **Fonctions cosmétiques (réglementaire, gratuit)** : les fonctions ne sont
   PAS déduites de la chimie. À prendre dans CosIng (source UE officielle) via
   son export ou l'écran officiel, puis mapper sur le vocabulaire contrôlé du
   champ `functions`. Aucune fonction inventée.
3. **Restrictions juridictionnelles** : Annexes II/III du Règlement (CE)
   1223/2009 (interdits/restreints UE) → `ingredient_jurisdiction_restrictions`
   + `max_concentration_eu_percent`, `is_allergen_regulated` (26 allergènes
   parfumants déjà repérés par le script).
4. **Botaniques (beurres/huiles/extraits)** : les résoudre via une source
   spécifique (ex. référentiel des matières premières cosmétiques) en tier 2,
   ou les créer en `pending` avec une source produit OBF si jugé recevable —
   décision à confirmer, jamais de CAS inventé.
5. **Relier le catalogue réel** (`product_ingredients`) : se fait au Chantier 2
   quand de vrais produits avec INCI validé existeront ; `linkDeclaredIngredients`
   rapprochera alors les étiquettes des 118 entités.

## Garde-fous
- On ne paie pas, on ne contourne pas de licence ; ODbL (OBF), domaine public
  (PubChem), CC0 (Wikidata) sont explicitement réutilisables avec attribution.
- PubChem/Wikidata sont interrogés avec User-Agent identifiable et débit ménagé.
- Le script est idempotent (`ON CONFLICT`) : relancer un lot ne duplique rien.
