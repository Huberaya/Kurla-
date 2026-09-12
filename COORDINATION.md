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
`is_active = false`. **Toujours le cas au 12/09/2026**, après application des
migrations : les deux sujets sont indépendants. Or la route ne sert que les fiches **publiées et
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

### Panne de production du 11/09/2026 — dépendances non déclarées

**Toute l'API est tombée en 500** : `Cannot find module 'web-push'`. La page
d'accueil continuait de répondre 200 — la panne était invisible au premier
coup d'œil, et aucun banc ne la voyait.

`src/lib/pushDelivery.ts` importait `web-push`, absent de `package.json`.
Jamais installé à la construction, introuvable au chargement du bundle ; et
comme l'import était en tête de module, **le serveur entier refusait de
démarrer**. `/api/health`, `/api/products`, le panier, tout était hors
service pour un module de notification push.

Le sondage a révélé le même défaut, latent, sur `jpeg-js` et `pngjs` :
importés par `src/lib/photoPilot.ts`, atteint depuis
`src/server/routes/beautyProfile.ts`, jamais déclarés. Ils ne fonctionnaient
que par accident de hoisting — c'est-à-dire jusqu'au prochain changement
d'arbre de dépendances.

Localement, rien n'apparaissait : types vérifiés, bancs verts. Seule la
production, dont l'installation part de `package.json`, trahissait le
manque. **Règle à retenir : tout nouvel import doit être déclaré.** Le banc
`kurla_dependances_declares` l'applique désormais aux 551 fichiers du projet
et est chaîné dans `npm test` — il aurait vu les trois paquets manquants
avant la mise en ligne.

Corrigé : les trois paquets déclarés, `playwright` passé en dépendance de
développement, et `pushDelivery.ts` qui charge `web-push` à la demande dans
un `try/catch` — un service annexe ne doit pas pouvoir empêcher le serveur
de démarrer. Production rétablie, mesuré : plus aucun 500.

### Les silences ont maintenant une sonde

`scripts/probe-production.mjs` interroge les endpoints publics d'une
production et classe chaque réponse : erreur franche (5xx, réseau), silence
(200 à vide **non expliqué**), vide expliqué, vide attendu, protégé.

La règle qu'elle porte : **un endpoint qui peut légitimement être vide doit
énoncer pourquoi.** `/api/professionals` le faisait déjà ;
`/api/peau/gamme` et `/api/products/:id/trust` sont alignés. Un endpoint
critique (`/api/products`, `/api/peau/gamme`, `/api/health`) reste une
anomalie même vidé expliqué : énoncer le vide rend la panne lisible, cela
ne doit pas la faire passer.

Emploi : `KURLA_PROD_URL=https://… node scripts/probe-production.mjs`
(code 1 si anomalie). Les bancs tournant en mémoire ne peuvent pas voir ces
pannes ; seule une sonde contre la production le peut.

Dernier passage (11/09/2026) : 5 ok · 1 silence critique (`/api/peau/gamme`,
les 16 fiches en brouillon — voir ci-dessus) · 2 vides expliqués · 1 vide
attendu · 0 erreur.

### Les mises en ligne se vérifient maintenant

`deploy.py` s'arrêtait sur « READY » et rendait la main. Le 11/09/2026, la
production a été annoncée en ligne alors que **toute l'API répondait 500** :
la page d'accueil continuait de répondre 200, les bancs étaient verts, et
personne n'a rien vu avant une sonde manuelle une heure plus tard.

Un déploiement qu'on ne vérifie pas n'est pas un déploiement. `deploy.py`
termine désormais par `scripts/verifier-deploiement.mjs`, **dont le code de
sortie devient celui de la mise en ligne** :

1. il attend que l'alias serve **le commit attendu** — `/api/health` expose
   maintenant son `commit` et son `deployment`, ce qui permet de prouver
   quelle version répond (mesuré : `VERCEL_GIT_COMMIT_SHA` est bien
   disponible à l'exécution). Sans cela on sonde l'ancien build en croyant
   valider le nouveau ;
2. il sonde les endpoints publics, avec la logique factorisée dans
   `scripts/lib/sonde.mjs`, partagée avec `probe-production.mjs` pour
   qu'elles ne divergent pas ;
3. il compare à `.kurla-etat-production.json` et **ne bloque que sur les
   régressions**. Une anomalie antérieure au déploiement (les 16 fiches
   peau en brouillon) est signalée, elle ne le fait pas échouer : sinon
   l'alarme finirait par ne plus être écoutée. Une régression ne réécrit
   pas l'état de référence — elle ne doit pas devenir la norme.

Trois chemins testés : sain (0), régression détectée (1), propagation non
confirmée (2).

### Une clé JSON en double passe inaperçue

`{"a": 1, "a": 2}` est un JSON **valide** : le parseur garde la dernière
occurrence et ne dit rien. D'où une conséquence pratique relevée sur ce
dépôt : toute assertion du type « cette clé existe dans les scripts » passait
à côté d'un doublon — seul esbuild le signalait, en warning noyé dans la
sortie du build.

Le banc des dépendances analyse donc désormais le texte de `package.json` et
signale toute clé répétée **au sein d'un même objet** (deux objets frères
peuvent légitimement porter la même clé). Le détecteur s'auto-vérifie —
doublon simple, doublon imbriqué, chaîne contenant accolades et deux-points,
clés homonymes dans deux objets — pour ne pas pouvoir se taire indéfiniment.

### Désaccord à trancher : un vide expliqué reste-t-il une anomalie ?

Le commit `5536585` a fait primer l'explication sur la règle « critique » :
un endpoint critique qui répond vide **en expliquant pourquoi** était
classé « vide expliqué », donc non anomalie. L'intention est juste — éviter
un faux incident de production — mais l'effet de bord ne l'est pas.

Un vide expliqué n'étant plus une anomalie, il sortait aussi de la
**surveillance** : passer de « 16 fiches visibles » à « 0 fiche » devenait
indétectable, puisque « vide expliqué » n'est pas compté comme régression.
C'est exactement la panne subie le 11/09/2026.

J'ai donc restauré la règle critique (commit à venir) en conservant le
bénéfice du commit : l'explication est désormais **affichée** dans la sonde
(« Aucune fiche de formulation n'est publiée pour le moment… »), donc le
vide reste parfaitement lisible.

Le faux incident que craignait `5536585` est traité ailleurs, et plus
solidement : `verifier-deploiement.mjs` compare à un état de référence et
**ne bloque que sur les écarts nouveaux**. Une anomalie déjà constatée est
signalée sans faire échouer la mise en ligne.

Si l'intention était plutôt de retirer `/api/peau/gamme` de la liste
critique — parce qu'une gamme vide serait un état acceptable — alors il
faut le dire explicitement et retirer la route de `CRITIQUES`, plutôt que
de neutraliser la règle pour toutes les routes critiques.

### Migrations appliquées le 12/09/2026 — schéma conforme

Les deux migrations en attente ont été appliquées côté base. Vérifié :
**133 objets présents, 0 manquant, 0 incertain**, plus aucune fonction RPC
absente. Le code déployé et la base sont d'accord.

Les deux tables concernées répondent :

| Table | Migration | Requêtée par |
|---|---|---|
| `push_subscriptions` | `20260921000001_web_push_subscriptions.sql` | `src/lib/db/pushSubscriptionStore.ts` |
| `photo_ai_analyses` | `20260921000002_photo_ai_pilot.sql` | `src/lib/db/photoAnalysisStore.ts` |

Le fichier « à appliquer en un geste » a été retiré : il reprenait à
l'identique les deux migrations, qui restent la source. `verifier-schema.mjs`
est désormais le moyen de le vérifier, à chaque mise en ligne.

Le rappel reste utile : PostgREST n'exécute pas de DDL, donc aucune
migration ne peut être appliquée depuis le code ni depuis ce dépôt. Toute
migration suppose un mot de passe de base ou un jeton de compte Supabase.

### Ce que l'accès Supabase permet, mesuré le 12/09/2026

Question tranchée par l'épreuve, pas par supposition :

| Opération | Possible ? | Comment |
|---|---|---|
| Lire (REST) | **oui** | `GET /rest/v1/…` |
| Modifier des lignes (DML) | **oui** | `PATCH /rest/v1/products?id=eq.…` → 200 |
| Créer une table, appliquer une migration (DDL) | **non** | aucune voie : voir ci-dessus |

Les écritures étant possibles, les corrections de **données** peuvent être
faites depuis ici. Les **migrations**, jamais : elles restent à la main.

### launch-p28 corrigé — et sept produits au même régime

`launch-p28` (Tropic Isle Living, huile de pousse) affichait trois
ingrédients génériques inventés — « Beurre de Karité, Huile de Ricin, Huile
de Coco » — alors que sa fiche dit déjà « Composition non sourçable, retiré
de la vente ». Corrigé : `ingredients = []` et
`ingredient_verification_status = 'not_provided'`.

Ce statut n'est pas anodin : il alimente le **Trust Score public** comme
contrôle décisif « Composition vérifiée » (`src/lib/catalogTrustScore.ts`).
Un produit sans composition sourcée affichait donc une vérification
qu'il n'a pas.

**Le cas n'est pas isolé.** Huit produits, tous retirés de la vente,
affichent des ingrédients sans INCI sourcé tout en s'annonçant « verified » :

`p2`, `p4`, `p5`, `p9`, `p10`, `p11`, `p13` et `launch-p28` (corrigé).

Les sept autres ont été corrigées depuis (p2, p4, p5, p9, p10, p11, p13) :
même remède, appliqué en une seule opération. **Aucun produit ne s'annonce
plus « vérifié » sans composition sourcée.** La répartition le confirmait :
`verified` s'accompagne normalement d'un INCI (66 cas sur 74), les huit
étaient bien l'anomalie.

**Restent 8 produits affichant des ingrédients sans INCI** — mais le cas
n'est plus le même, et je m'y suis arrêté :

- **3 accessoires** (p7, p8, p16) : « 100 % Soie de Mûrier », « Satin de
  Soie… ». C'est une *matière*, pas une composition cosmétique. Légitime.
- **5 cosmétiques** (p1, p3, p6, p12, p15) : fiches de démonstration
  retirées de la vente, dont le statut est **déjà `not_provided`** — elles
  ne font donc aucune fausse allégation. Leur tort est d'afficher une
  composition non sourcée, rien de plus.

Je ne les ai pas vidées. p15 (« Black Girl Sunscreen SPF 30 ») est un vrai
produit de marque dont la liste est peut-être **exacte, simplement non
sourcée** : effacer une donnée peut-être vraie est pire que la laisser
honnêtement étiquetée. La décision (sourcer ces cinq fiches, ou les vider)
appartient au catalogue.

À noter aussi : `products.updated_at` n'est pas mis à jour automatiquement
(après ma correction, il est resté au 02/09). Aucune modification de fiche
n'est donc datée, ce qui rend l'audit impossible. Il faudrait un trigger —
donc une migration, donc à la main.

### Panne du 12/09/2026 — le catalogue entier masqué par une règle sans données

**Symptôme.** `/api/products` renvoyait `{"products":[],"count":0}` en 200 :
la boutique ne servait plus rien, sans erreur, alors que la base comptait 63
produits publiés. `/api/health` annonçait 64 produits. Rien ne signalait de
panne.

**Cause.** `3b68ac3` (industrialisation de la couche de vérité) exige
désormais un `supplier_sku` pour toute précommande externe
(`hasDocumentedExternalPreorder`). Or **0 produit publié sur 63 porte ce
champ**, alors que `supplier_id` et `source_supplier` sont renseignés sur les
63. Comme les 63 portent le badge « preorder », tous étaient exclus d'un coup.

**Proposition concurrente non retenue.** `d0d6115` a proposé de considérer la
source et le fournisseur comme suffisants et de transformer le SKU en simple
alerte. Cette modification est incompatible avec le contrat de livraison et
la contrainte explicite « aucune précommande sans source externe, fournisseur
et SKU ». `2777034` restaure donc le blocage des trois champs manquants, sans
compléter ni déduire de donnée.

**État réel vérifié.** L'audit Supabase lecture seule du 12/09/2026 confirme
96 fiches, 63 publiées, **0 publiable**, 0 prête à acheter et 126 constats
bloquants (63 publiées non listables + 63 sourcing incomplet). Aucun SKU réel
n'est présent dans `docs/sourcing/C1_HERO_DOSSIER_COLLECTE.csv` : les inventer
serait une fabrication. La boutique vide est donc un fail-closed explicite,
mais le déploiement ne peut pas être déclaré accepté tant qu'un arbitrage
métier n'a pas fourni les preuves ou rétrogradé les statuts administratifs.

**Leçon, et elle vaut pour nous deux.** Tous les bancs passent avec des
fixtures complètes ; ils ne remplacent pas l'audit des données de production.
La sonde doit rester active et signaler le vide critique, même si la cause est
un blocage de vérité légitime. Une mise en ligne ne peut être acceptée qu'après
résolution des constats réels.

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
| — | panne de production : dépendances non déclarées | livré |
| — | sonde anti-silences + banc « dépendances déclarées » | livré |
| — | déploiement auto-vérifié (commit servi, régressions) | livré |
| — | détection des clés JSON déclarées deux fois | livré |

## Propositions pour la suite (robustesse)

1. **Silences** — outillé : `scripts/probe-production.mjs` classe les
   réponses et exige qu'un vide soit énoncé. La mise en ligne se vérifie
   désormais d'elle-même. Reste le cas d'une dégradation **entre** deux
   déploiements (données modifiées à la main, service tiers en panne) :
   un cron Vercel qui lance la sonde toutes les heures le couvrirait.
   Le silence restant est un problème de données, pas de code : les 16
   fiches peau en brouillon.
2. **Durée de la suite** — réglé : 1 min 52 au lieu de 25 min. Reste à
   décider si l'on veut une suite « rapide » pour la boucle courte.
3. **Coordination** — un conflit sur `package.json` à chaque chantier,
   parce que les deux intervenants y ajoutent leurs bancs. Réserver le
   fichier à un seul intervenant, ou convenir d'un ordre.
4. **Dépendances** — déclarer systématiquement ce que l'on importe. La
   panne du 11/09/2026 vient de trois paquets utilisés sans être déclarés ;
   le banc `kurla_dependances_declares` l'interdit désormais.

## Chantiers de l'intervenant A (domaine)

| Réf | Objet | État |
|---|---|---|
| D1 | profondeur des 5 besoins de fibre (`src/lib/needDepth.ts`) | livré |
| D2 | coiffure : tresses, locks, perruque, nuit, chaleur (5 besoins) | livré |
| D3 | cuir chevelu et barbe (3 besoins) | livré |
| E | les 8 besoins peau | livré |
| F | score pondéré — touche `calculateKurlaFit` | livré |

**D1 a modifié `src/lib/kurlaFit.ts`** : `KurlaFitResult` porte maintenant
`needSignals` (intensité + nuances), et les nuances sont ajoutées à `reasons`
**après** les raisons par besoin. Toute modification de `reasons` doit préserver
cet ordre : `recommendationsForSlugs` affiche `reasons[0]`.

**D2 a modifié `src/lib/needDepth.ts` et ajouté `limitations` sur `NeedSignal`**
(propagé sur `Recommendation.needLimitations` et `fitLimitations`). D2 ne redit
**rien** de `styleFit.ts` : le banc `tests/kurla_need_depth.test.ts` fait tomber
la suite si une chaîne de D2 contient une formulation réservée à `styleFit`
(`texture fluide`, `seule zone réellement accessible`, `occlusif de la formule`,
`retirez la perruque la nuit`, `lavage clarifiant régulier`). **E a ajouté `skinRecommendation.ts` aux modules réservés** : les quatre règles de
`SKIN_INCOMPATIBILITIES` (rétinol×AHA, rétinol×BHA, rétinol×vitamine C, AHA×BHA)
sont dans la liste du banc. E dit « retirer les actifs » ou « un seul à la fois »,
jamais « ne pas mélanger X et Y ». **Si `SKIN_INCOMPATIBILITIES` change, la liste
est à revoir.**

**Si `styleFit.ts` ou `needsHub.ts`
est modifié, cette liste est à revoir.** D3 a ajouté à la liste réservée les trois
formulations médicales de `needsHub.ts` (`consultez un dermatologue`,
`avis dermatologique`, `doivent être montrés à un dermatologue`) : `NEEDS_HUB`
n'alimente que les pages éditoriales, jamais le moteur, mais KURLA ne doit pas
tenir deux fois le même discours médical.

**F est livré.** `calculateKurlaFit` calcule maintenant
`100 × Σ poids(couverts) / Σ poids(déclarés)`, où le poids d'un besoin couvert
est son intensité mesurée et celui d'un besoin non couvert le poids de
référence (50). **Deux contrats à ne pas casser :** une couverture complète vaut
100 (asserté par `beauty_profile.test.ts` et `public_api.test.ts`), et couvrir
un besoin de plus ne fait jamais baisser le score. Toute modification du score
doit conserver les deux.

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

### Une dépendance importée mais jamais déclarée bloque toute la suite

`src/lib/photoPilot.ts` importe `jpeg-js` et `pngjs`, `src/lib/pushDelivery.ts`
importe `web-push`. Aucune des trois n'était dans `package.json`. Sur un dépôt
frais, `npm install` ne peut pas les apporter : la suite mourait au **2ᵉ banc**
(`test:authorization`) en `ERR_MODULE_NOT_FOUND`, sans atteindre un seul banc de
domaine. Corrigé dans `3eb6873` — les trois sont déclarées.

**Règle à retenir : un import n'est pas une déclaration.** Vérifier après tout
nouvel import externe :

```bash
node -e "const d=require('./package.json');const s=new Set([...Object.keys(d.dependencies||{}),...Object.keys(d.devDependencies||{})]);console.log([...s].length+' déclarées')"
```

ou plus simplement : `rm -rf node_modules && npm install && npm test`. C'est le
seul contrôle qui voit ce défaut — sur une machine où le paquet est déjà présent
dans le cache, rien ne le signale.

**Corrigé en parallèle des deux côtés.** Les mêmes trois paquets ont été
déclarés indépendamment ici et dans `b98a1ca`, aux mêmes versions
(`jpeg-js ^0.4.4`, `pngjs ^7.0.0`, `web-push ^3.6.7`), et `playwright` — qui
n'était pas déclaré en `4adb3f4` — l'est désormais en `devDependencies`. La
convergence des deux diagnostics est le meilleur signe que le défaut était réel.

`@types/pngjs` et `@types/web-push` ont été ajoutés ici puis **retirés** :
`tsc --noEmit` passe sans eux (mesuré, exit 0, 0 ligne d'erreur). Les garder
aurait été une divergence sans bénéfice.

**Doublon `vite`, corrigé depuis** : il figurait à la fois dans `dependencies` et
dans `devDependencies`, à la même version `^6.2.3`. Il ne reste plus qu'en
`devDependencies`, avec `@vitejs/plugin-react`. La note précédente jugeait le
bénéfice insuffisant pour y toucher après un rebase ; elle avait tort sur un
point, et c'est le seul qui compte : le déplacement est **sûr**, et ce n'est pas
une hypothèse. `scripts/build-vercel.sh` appelle déjà `esbuild`, `tsx`,
`typescript`, `autoprefixer` et `tailwindcss`, qui étaient **déjà** en
`devDependencies` — donc les devDependencies sont bien installées au build
Vercel. Vérifié : `npm install` frais réinstalle les deux, `npm run build` sort 0.

### Une clé dupliquée dans `package.json` ne se voit pas

`test:need-depth` était déclaré deux fois. Un JSON à clé dupliquée **reste
valide** — le parseur garde la dernière — donc toute assertion du type
`'test:need-depth' in scripts` passait. Seul esbuild signalait le doublon, en
warning, noyé dans la sortie du build. C'est en lisant le début du log de build
que le doublon est apparu, pas en validant le JSON.

### Le chantier des trois constats ouverts — clos

Trois constats rapportés à la fin de F sont traités. Détail dans
`docs/KURLA_PLAN_COUVERTURE.md` §4G. Ce qui touche **vos** territoires :

**1. `hair.wigFiber` existe.** `WIG_FIBER_OPTIONS` (`synthetique`,
`cheveux_humains`, `mixte`, `sans_perruque`, `inconnu`). En JSONB, donc aucune
migration. Si un de vos modules parle de chaleur sur perruque, lisez ce champ
plutôt que de réécrire l'interdiction.

**2. Ne retirez pas de champ de `BeautyProfileEditor.tsx`.** Le défaut mesuré :
le moteur lisait `hair.frizz`, `hair.facialHair`, `skin.skinType` et
`skin.skinConcerns`, l'éditeur ne les rendait pas. Un champ absent vaut
« inconnu », donc aucune nuance, donc **aucun test ne tombe** — invisible à
l'exécution. Une garde dans `tests/kurla_need_depth.test.ts` fait maintenant
tomber la suite si un champ lu par `needDepth.ts` n'est pas déclarable.

**3. Le contrat de statut des routes de paiement : 503, jamais 400.** Le
checkout principal répondait 400 alors que `server.ts` annonce « chaque route de
paiement répond 503 ». Aligné. Si vous ajoutez une route de paiement et que le
client Stripe est `null`, répondez **503** avec `code: 'PAYMENT_NOT_CONFIGURED'`
— `tests/kurla_stripe_no_key.test.ts` le vérifie statiquement sur toutes les
branches `if (!stripe…)`. Exception : la branche `if (!sig || !stripe)` du
webhook reste à 400, une signature absente est bien la faute de l'appelant.

**4. Un contrat annoncé peut ne pas être asserté.**
`tests/kurla_brand_invoice.test.ts` annonce « sans configuration de paiement, la
route dit 503 » mais n'appelle ses routes qu'en non-authentifié : il n'asserte
que des 401, la branche 503 ne s'exécute jamais. Le contrat est désormais
vérifié par le nouveau banc. Règle générale : **un en-tête de banc ne prouve
rien, seul le code de sortie fait foi** — et un `[PASS]` imprimé peut coexister
avec `exit 1` si quelque chose échoue après (ici : `server.ts` s'auto-écoute sur
le port 3000, d'où `KURLA_TEST_NO_SERVER=true` dans tout banc qui ouvre son
propre écouteur).

**Stripe n'est pas « à faire ».** L'intégration est écrite et anti-simulation. Ce
qui manque est une clé réelle, que seul le propriétaire du compte peut produire.
Jusque-là les routes refusent explicitement et `PeauC26FinalPanel` affiche
FR82/BE76 en TEST — ce qui est la vérité, pas un oubli.

### La gamme peau était vide à cause d'une contradiction entre deux exigences

Mesuré le 12/09/2026 : `/api/peau/gamme` répondait `count=0` en production — le
seul silence critique de la sonde. Ce n'était pas une donnée manquante.

Deux exigences se contredisaient :

- `getSkinRangeTargets` exigeait `catalog_status = 'published'` **et**
  `is_active <> false` — des états de **mise sur le marché** ;
- `scripts/generate-skin-range-sql.ts` pose les fiches en `draft` et inactives,
  et `tests/kurla_catalog_truth.test.ts` l'exige explicitement (« la gamme
  interne doit être générée en brouillon », « doit être inactive »).

Une formule cible n'est pas sur le marché. Lui demander un état commercial pour
pouvoir être lue la condamnait à ne jamais être servie. Il y avait aussi une
contradiction interne : `getProducts(store, { includeInactive: true })` va
chercher les lignes inactives, puis le filtre `isActive !== false` les rejetait
aussitôt.

**Correctif porté sur la route, pas sur les données** — aucun statut n'est
basculé, `kurla_catalog_truth` reste vert. `getSkinRangeTargets` ne filtre plus
que sur l'identité (`estFicheCiblePeau`). C'est suffisant et c'est ce qui
protège : le marqueur de formulation cible qu'exige `estFicheCiblePeau` est
celui que `hasMinimalCatalogProof` rejette (`catalogTruth.ts:161`), donc ces
fiches ne peuvent pas devenir achetables par ce chemin.

**Si vous touchez à `getSkinRangeTargets` ou à `hasMinimalCatalogProof`, lisez
`tests/kurla_gamme_peau_sql.test.ts`** : il rejoue le SQL généré dans les
prédicats de l'application, et sert une cible en brouillon via le store mémoire.
Contrôle négatif effectué dans les deux sens — remettre les filtres commerciaux
fait tomber la suite, et remettre `'draft'` en `'published'` dans le générateur
aussi.

**Aucune action en base n'a été nécessaire.** Mesuré après déploiement de
`28f0097` : `/api/peau/gamme` renvoie `count=16`, sonde `exit 0` et `0 silence`,
et le catalogue achetable reste à 63 produits dont **0** `peau-*`. Les 13 fiches
existaient donc déjà en base, en brouillon — il ne manquait que la route.

`supabase/a-appliquer/gamme-peau.sql` est commité à titre de référence
reproductible (la donnée vit en TypeScript, le SQL en découle), **mais il ne
faut pas le jouer pour rendre la gamme visible** : les 13 lignes existent, et le
`ON CONFLICT DO UPDATE` écraserait toute correction faite à la main depuis.

### La sonde tourne en cron — et le plan Hobby a fixé la cadence

`GET /api/cron/sonde` est en ligne (protégé par `CRON_SECRET`, déjà configurée :
la route répond 401 et non 503). Elle réutilise `scripts/lib/sonde.mjs`, la même
bibliothèque que la sonde à la main — pas une seconde lecture qui divergerait.

**Le signal est le statut HTTP, pas une ligne de journal.** Un silence ou une
erreur fait répondre 500, donc Vercel classe l'invocation en échec. C'est la
leçon du 11/09/2026 : les notifications push échouaient dans un `.catch` qui se
contentait de logger. Aucun tiers n'est requis — ni email, ni webhook, ni table.
Une alerte par email exigerait une adresse destinataire qui n'existe dans aucune
configuration actuelle ; l'inventer aurait créé un silence de plus.

**Cadence : quotidienne, et c'est mesuré, pas supposé.** `0 * * * *` a été poussé
(`c3c4cb0`) et le déploiement n'a **pas** abouti — production restée sur
`3825ff6` plus de 8 minutes alors que les déploiements passent en ~75 s, et la
route répondait 404. Limite du plan Hobby : une expression qui s'exécute plus
d'une fois par jour fait échouer le déploiement
(vercel.com/docs/cron-jobs/usage-and-pricing). Repassé à `0 8 * * *`, à l'écart
de la rétention (07:00) ; `674949e` s'est déployé en 75 s.

**Ne repoussez pas `0 * * * *` sans être passé en Pro.** La route, elle, accepte
n'importe quelle cadence : pour l'horaire, soit Pro + `0 * * * *`, soit un
planificateur externe pointé sur ce chemin avec
`Authorization: Bearer <CRON_SECRET>`. Aucun changement de code dans les deux cas.

**Si vous ajoutez une route**, `tests/route_inventory.test.ts` tombe : c'est
voulu. Régénération consciente par `KURLA_UPDATE_FIXTURE=1`, qui affiche ce qui
est ajouté et retiré.
