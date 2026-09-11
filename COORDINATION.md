# Coordination entre intervenants

Deux travaux avancent en parallèle sur `main`. Celui-ci n'a pas de canal
direct avec l'autre : le seul moyen de se parler est le dépôt. Ce fichier
est donc la trace commune. **Le lire avant de pousser évite d'écraser le
travail de l'autre.**

## Territoires observés

| | Domaine | Chantiers observés |
|---|---|---|
| Intervenant A (domaine) | connaissance peau | C1 sourcing, C4 résultat de diagnostic, C5 HPI & photoprotection, vocabulaires, perruque, style, traction |
| Intervenant B (plateforme, auteur de ce fichier) | infrastructure et robustesse | C-05 routine minimale, C-06 gamme peau, C-07 parcours peau, D-01 comparateur, outillage de la suite |

La répartition n'est pas un accord signé : c'est ce qui se dégage des
commits. Si un chantier change de main, le dire ici.

## Règles tenues par les deux

1. **Jamais `push --force`.** Un push refusé (« fetch first ») signifie que
   l'autre a poussé : `git fetch` puis `git rebase`, jamais d'écrasement.
   C'est arrivé à chaque chantier ces derniers jours.
2. **Un chantier à la fois**, rendre compte, attendre le go.
3. **Aucun secret dans le dépôt** — vérifié à chaque commit.
4. **Aucune donnée inventée.** Une donnée réglementaire (composition, dose,
   preuve fournisseur) est sourcée, ou absente, jamais arrangée.

## Pièges mesurés — les lire avant de pousser

### Les inventaires de référence

Quatre bancs comparent le code à un fichier de référence :

- `tests/fixtures/route_inventory.json` — les routes montées
- `tests/fixtures/admin_route_inventory.json` — les routes d'administration
- `tests/fixtures/store_api_inventory.json` — les méthodes du store
- `tests/admin_route_inventory.test.ts` — les appelants de chaque route

**Ajouter une route admin ou une méthode de store casse la suite** jusqu'à
régénération. Ce n'est pas un faux positif : c'est le garde-fou qui demande
si le changement est volontaire. Si oui :

```bash
KURLA_UPDATE_FIXTURE=1 npx tsx tests/admin_route_inventory.test.ts
KURLA_UPDATE_FIXTURE=1 npx tsx tests/store_api_inventory.test.ts
```

puis **vérifiez le diff avant de valider** : accepter une régénération
sans la lire, c'est signer un changement qu'on n'a pas regardé. Deux
inventaires étaient faux depuis plusieurs chantiers sans que personne ne
le voie (voir ci-dessous).

### Un fichier de référence corrompu bloquait sa propre réparation

Les inventaires sont des JSON générés. Deux intervenants qui les
régénèrent en parallèle produisent un conflit de fusion — et le fichier
garde alors des marqueurs `<<<<<<<`, ce qui le rend invalide.

Jusqu'ici, la régénération lisait le fichier pour calculer le diff **avant**
de l'écrire : un JSON invalide faisait donc échouer l'outil censé le
réparer. Corrigé dans `store_api_inventory` : un fichier illisible est
traité comme vide et régénéré depuis le code, avec un avertissement.

Si un inventaire devient illisible : `KURLA_UPDATE_FIXTURE=1 npx tsx
tests/<banc>.test.ts`, ou supprimez le fichier — il sera recréé.

### La gamme peau est redevenue invisible en production (11/09/2026)

`/api/peau/gamme` répond **200 avec `count: 0`** sur `kurlabeauty.vercel.app`.
Vérifié : la production sert 63 produits, exactement les 63 publiés de la
base — c'est donc bien la même instance que celle que nous lisons.

En base, les 16 fiches `peau-ess-*` existent toujours, avec leur marqueur de
formulation (`source_supplier = « KURLA Skincare — formulation interne »`),
mais elles sont toutes passées à `catalog_status = 'draft'` et
`is_active = false`. Or la route ne sert que les fiches **publiées et
actives** : les 16 sont donc filtrées, et la page est vide.

Ce n'est pas un défaut de code : la route et ses filtres sont corrects
(vérifiés dans `src/lib/db/catalogStore.ts`, fonction
`getSkinRangeTargets`). C'est un état de données, dans le territoire
« catalogue peau ». Deux lectures sont possibles : une régression, ou une
mise en attente délibérée pendant la suspension de C1 — je n'ai pas
d'éléments pour trancher, je ne touche donc pas aux données.

Si c'est une régression, une seule requête la corrige — et elle ne rend
**pas** les fiches achetables (le marqueur de formulation les exclut du
catalogue public par `isCatalogPubliclyListable`, qui refuse
`hasFormulationTargetMarker`) ; elle les rend simplement visibles, ce qui
est précisément le contrat C-06 :

```sql
UPDATE public.products
   SET catalog_status = 'published', is_active = true
 WHERE category = 'peau'
   AND source_supplier ILIKE '%formulation%';
```

À noter, dans le même registre : les 4 autres produits « peau » (`p6`,
`p10`, `p14`, `p15`) sont des fiches de démonstration sans sourcing réel,
en `unavailable`. C'est correct ainsi — ne pas les republier.

Le banc `kurla_gamme_peau_cible` ne peut pas voir cette régression : il
tourne en mémoire, sans la base. Seul un contrôle contre la production la
détecte — c'est l'objet de la proposition « silences » ci-dessous.

### La suite ne se terminait pas — et elle met maintenant 1 min 52

Trois réglages, trouvés l'un après l'autre, empêchaient `npm test`
d'aboutir. Aucun ne produisait d'erreur : ils produisaient une **attente
sans fin**, et une attente ne se lit pas comme un échec. Comme la
vérification des types ferme la chaîne, toute la suite semblait en panne :
on contournait à la main et **on ne voyait jamais les vrais échecs**.
C'est ainsi que deux inventaires sont restés faux plusieurs chantiers.

1. **Limite figée.** `package.json` imposait `NODE_OPTIONS=--max-old-space-
   size=3072` — 3 Go sur une machine de 2 Go. Aucune sortie après 241 s.
2. **Le build type-checkait son propre résultat.** `tsconfig.json`
   n'excluait aucun répertoire ; avec `allowJs`, `tsc` absorbait les 118
   fichiers de `dist/` (9,2 Mo de JS groupé) en plus des 537 du projet.
   D'où un besoin mémoire au ras de la machine :
   `dist/` analysé → 655 fichiers, 169 s, ~1,4 Go de tas, blocage ;
   `dist/` exclu → 536 fichiers, **30 s**, 1 024 Mo suffisent.
3. **Limite calculée sur la mémoire totale.** Une machine qui annonce
   2 Go peut n'avoir plus que 1,3 Go de libre une fois les autres
   processus lancés. Le lanceur prend donc désormais le plus petit de
   « 75 % du total » et « 85 % du disponible » : ici **1 109 Mo** au lieu
   de 1 489.

Corrigé dans `scripts/tsc.mjs` (limite adaptative, diagnostic du SIGABRT,
garde-fou qui coupe un blocage au bout de 900 s au lieu de laisser la
suite pendue vingt-cinq minutes), dans `tsconfig.json` (`exclude`) et dans
`package.json` (`pretest` : la suite construit `dist/` avant les bancs qui
le lisent — sans quoi elle s'arrêtait en `ENOENT` sur un dépôt frais).

**Mesuré après correction : `npm test` = 1 min 52 s, code 0**, build,
91 bancs et vérification des types compris. Surcharges utiles :
`KURLA_TSC_MEMORY=2048 npm run lint`, `KURLA_TSC_TIMEOUT=300 npm run lint`.

Le banc `tests/kurla_suite_executable.test.ts` interdit le retour des
trois réglages (8 contrôles).

## État des lieux (septembre 2026)

- Catalogue public : **63 produits** — 28 accessoires, 25 cheveux, 10 kits.
  **Aucun soin peau publié.** Les 16 fiches de la gamme sont des formules
  cibles, visibles sur `/peau/gamme`, jamais vendables.
- Migrations appliquées : B-01, B-02, B-05, B-08 (16 marqueurs
  `[Formulation cible]`, 28 `[Accessoire]`).
- En attente d'une action manuelle en base : `launch-p28` porte un trio
  d'ingrédients inventé — `UPDATE public.products SET ingredients =
  ARRAY[]::TEXT[] WHERE id = 'launch-p28';`

## Chantiers de l'intervenant B (plateforme)

| Réf | Objet | État |
|---|---|---|
| C-05 | routine minimale : justifier chaque étape écartée | livré |
| C-06 | gamme peau : 16 fiches visibles sans être achetables | livré |
| C-07 | un diagnostic peau ne recommande plus de produits cheveux | livré |
| D-01 | comparateur : coût par utilisation, pas seulement le prix | livré |
| — | suite de tests exécutable de bout en bout | livré |

## Propositions pour la suite (robustesse)

1. **Silences** — plusieurs endpoints répondent 200 avec un tableau vide
   au lieu de signaler l'anomalie. Relevé deux fois sur `/api/peau/gamme` :
   d'abord un filtre trop strict, aujourd'hui 16 fiches repassées en brouillon
   (voir ci-dessus). Une sonde de production, activée à la demande par
   `KURLA_PROD_URL`, détecterait ce que les bancs en mémoire ne voient pas.
   Passer les endpoints publics au crible.
2. **Durée de la suite** — réglé : 1 min 52 au lieu de 25 min. Reste à
   décider si l'on veut une suite « rapide » pour la boucle courte.
3. **Coordination** — un conflit sur `package.json` à chaque chantier,
   parce que les deux intervenants y ajoutent leurs bancs. Réserver le
   fichier à un seul intervenant, ou convenir d'un ordre.

## Chantiers de l'intervenant A (domaine)

| Réf | Objet | État |
|---|---|---|
| D1 | profondeur des 5 besoins de fibre (`src/lib/needDepth.ts`) | livré |
| D2 | coiffure : tresses, locks, perruque, nuit, chaleur (5 besoins) | à faire |
| D3 | cuir chevelu et barbe (3 besoins) | à faire |
| E | les 8 besoins peau | à faire |
| F | score pondéré — touche `calculateKurlaFit`, à faire en dernier | à faire |

**D1 a modifié `src/lib/kurlaFit.ts`** : `KurlaFitResult` porte maintenant
`needSignals` (intensité + nuances), et les nuances sont ajoutées à `reasons`
**après** les raisons par besoin. Toute modification de `reasons` doit préserver
cet ordre : `recommendationsForSlugs` affiche `reasons[0]`.

**F touchera la ligne du score.** Le banc `tests/kurla_need_depth.test.ts`
asserte `score === 33` sur un produit à 1 besoin couvert sur 3 : c'est le
marqueur volontaire qui empêchera F de passer inaperçu.

## Convention proposée pour `package.json`

Réponse à la proposition 3 : réserver le fichier n'est pas nécessaire si chacun
insère ses bancs à un endroit distinct. Convenu côté domaine — **les bancs de
domaine sont déclarés et chaînés juste après `test:need-coverage`** ; la fin de
chaîne reste libre pour les bancs de plateforme. Un seul point d'insertion par
intervenant réduit le conflit à une ligne.

En attendant, la résolution vérifiée est : garder l'outillage de l'autre
(`pretest`, `lint` via `scripts/tsc.mjs`, `test:suite-executable`) et y
réinsérer son propre banc, **puis l'exécuter**. Un `package.json` reste JSON
valide avec un chemin de banc faux — seul l'exécution le révèle. C'est arrivé.
