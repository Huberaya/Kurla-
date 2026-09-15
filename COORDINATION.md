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

**ARRÊTER — décision arbitrée, appliquée trois fois.** `d0d6115` proposait
de considérer la source et le fournisseur comme suffisants, et le SKU comme
une simple alerte. `2777034`, puis `872d27a`, ont restauré l'exigence des
trois champs au nom du contrat de livraison. **Le porteur du projet a tranché
le 12/09/2026 en faveur de la première position, et l'a confirmé après le
premier retour en arrière.** Ce n'est plus un sujet technique ouvert : c'est
une décision de gestion prise, deux fois.

À celle ou celui qui serait tenté de rebasculer : avant de le faire, relire
la mesure ci-dessous et en référer au porteur du projet. Un troisième retour
unilatéral remettrait la boutique à zéro produit pour la troisième fois, sans
que personne ne l'ait décidé.

Mesuré en production, trois fois, à chaque retour en arrière :

- `0 produit publié sur 63` ne porte de `supplier_sku`, alors que
  `supplier_id` et `source_supplier` sont renseignés sur les 63 ;
- `/api/products` répond `count: 0` en 200, sans erreur — la boutique ne
  vend plus rien et rien ne le signale comme une panne ;
- **les fiches produit passent en 404** : le résolveur SEO cherche une entité
  publiable et n'en trouve aucune. Vérifié : dès que le catalogue redevient
  publiable, `/produit/<slug>` répond 200. Le routage n'a jamais été en
  cause — j'ai perdu du temps à le croire, faute d'avoir vérifié que le
  commit servi avait changé sous mes pieds.

Les deux positions s'accordaient sur l'essentiel : aucun SKU ne doit être
inventé, et la donnée reste réclamée. Elles ne diffèrent que sur le canal —
blocage de la mise en ligne, ou alerte de collecte. C'est un choix de
gestion, pas un désaccord technique.

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
| — | phase de test : 26 fiches `src-*` en boutique mode test + 4 gardes-fous admin (① autorisation ② INCI ③ CPNP+PR UE ④ visuel) + bouton Dépublier | livré |
| — | sourcing de fond : 50 besoins × 5 produits à prix accessibles (250 lignes, **242 prix constatés** — 2ᵉ passe 15/09) + 2 K-beauty B2B repérés + vue croisée des 2 registres | livré |

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

### Le résultat du diagnostic peau porte maintenant un conseil complet (13/09/2026)

Constat qui a déclenché le chantier : la routine du résultat était identique
pour tous les profils, ses justifications étaient génériques (voire
placeholder), et la base de connaissance `knowledge/skin` n'était exploitée
que par un bloc statique — un profil sans profil de connaissance reconnu ne
recevait rien.

Nouveau module : **`src/lib/knowledge/skinAdvisory.ts`** (couche « conseil »),
branché dans `src/lib/diagnosticResult.ts` et rendu par
`src/pages/DiagnosticResultPage.tsx` :

- **Routine contextuelle** — chaque étape porte *pourquoi* (mécanisme lié au
  besoin déclaré), *comment* (usage concret) et *à attendre* (horizon honnête,
  zéro promesse). Elle s'adapte au type, à l'hydratation, à la sensibilité et
  aux préoccupations (grasse ≠ sèche ≠ sensible ; HPI ≠ imperfections).
- **Leçons** — 1 à 3 modules pédagogiques sélectionnés sur les préoccupations
  (HPI, imperfections, hydratation, tolérance, SPF ISO 24444, exfoliation,
  éclat, prévention, barrière, entretien), chacun avec sa source.
- **Observations suivies** — J+7 / J+14 / J+30, questions concrètes et
  spécifiques au thème principal ; la note de la boucle annonce la
  réévaluation J+30 (L4) exactement comme elle se déclenche.
- **Résumé personnalisé** — composé des réponses déclarées uniquement ;
  inconnu = inconnu (jamais de déduction) ; un résumé IA, s'il existe, n'est
  jamais écrasé.

**Contrat verrouillé par le banc `tests/kurla_diagnostic_advisory.test.ts`**
(chainé en fin de suite, zone plateforme) : richesse, adaptation au
contexte, leçons sourcées, observations, résumé honnête, formulation,
déterminisme. Si vous enrichissez `knowledge/skin` (HPI, sécheresse,
imperfections), le plus court est d'ajouter le contenu dans `SKIN_LESSONS`
/ la routine de `skinAdvisory.ts` plutôt que dans un bloc statique : le banc
garde la surface cohérente.

**À ne pas casser** : le conseil ne redit aucune phrase réservée (styleFit,
needsHub médical, `SKIN_INCOMPATIBILITIES` — la liste est dans le banc) et
n'emploie aucun vocabulaire médical. (Le parcours cheveux, qui était resté
sans conseil, a reçu le même traitement le 13/09 — voir section ci-dessous.)

### Le résultat du diagnostic cheveux porte maintenant un conseil complet (13/09/2026)

Même chantier, même standard, côté cheveux — le niveau référence de la
plateforme, qui portait jusqu’ici la routine la plus sommaire (3 étapes
génériques, justification placeholder « Étape issue du résultat calculé »).
Le module peau sert de miroir ; rien n’a été dégradé d’un pôle pour
s’aligner sur l’autre.

Nouveau module : **`src/lib/knowledge/hairAdvisory.ts`** (couche « conseil »
cheveux), branché dans `src/lib/diagnosticResult.ts` et rendu par la même
`DiagnosticResultPage.tsx` (les titres de colonnes routine sont désormais
portés par le modèle : « Matin / Soir » en peau, « Jour de lavage / Entre
deux lavages / À faire chaque semaine » en cheveux) :

- **Routine contextuelle** — *pourquoi / comment / à attendre* sur chaque
  étape, adaptée à la texture, la coiffure usuelle, la priorité, la porosité
  et le cuir chevelu (LCO et scellement sur cheveu texturé, textures légères
  sur porosité faible, cycle eau/retwist sur locks, entretien aqueux sous
  tresses et perruque, rituel enfant, zéro tension sur la priorité pousse).
- **Leçons** — 1 à 3 modules pédagogiques sélectionnés sur les priorités
  (fibre & casse, cuir chevelu, locks, perruques, protectrices, enfant,
  pousse, définition, porosité, LCO, entretien), chacun sourcé sur la base
  KURLA Cheveux. La leçon « pousse » est volontairement anti-commercial :
  aucun produit n’accélère la pousse — c’est ce qui fait confiance.
- **Observations suivies** — J+7 / J+14 / J+30 spécifiques au thème
  principal (démêlage, cuir chevelu, locks, protectrice, perruque, enfant,
  pousse, définition, général).
- **Résumé personnalisé** — composé des réponses déclarées uniquement ;
  inconnu = inconnu ; un résumé IA, s’il existe, n’est jamais écrasé.
- **Boucle L4** — la note de réévaluation J+30 est désormais **commune aux
  deux pôles** : `src/lib/knowledge/advisoryLoop.ts` (source unique,
  réexportée par `skinAdvisory.ts`). Ne pas dupliquer ce texte.

**Contrat verrouillé par le banc `tests/kurla_hair_advisory.test.ts`** (15
checks, chaîné juste après `test:diagnostic-advisory` en fin de suite) :
richesse, adaptation au contexte, leçons sourcées, observations, résumé
honnête, formulation, séparation des pôles, déterminisme. Le banc peau
(`kurla_diagnostic_advisory`) a été mis à jour en conséquence : son test «
cheveux inchangé » est devenu un test de **séparation des deux pôles**
(chaque pôle porte son advisory, sans contamination).

**À ne pas casser** : le conseil ne redit aucune phrase réservée aux
modules style/cuir chevelu (styleFit, needsHub — « texture fluide », « seule
zone réellement accessible », « occlusif de la formule », « retirez la
perruque la nuit », « lavage clarifiant régulier »), n’emploie aucun
vocabulaire médical (la liste est dans les deux bancs), et le champ
« Cuir chevelu » du profil affiché utilise le vocabulaire du diagnostic
(`HAIR_SCALP_VALUES` dans `hairAdvisory.ts`).
### Correction (13/09/2026) : la page résultat affichait les réponses PEAU sur un diagnostic CHEVEUX

Signalé par le porteur : « quand je fais le diagnostic cheveux, j’ai les
réponses d’un diagnostic de la peau ».

**Cause** (pré-existante, révélée par l’usage du chemin cheveux) : les deux
diagnostics écrivent des clés différentes — peau :
`kurla_diagnostic_answers_skin` (sessionStorage) + `kurla_skin_answers`
(**localStorage, persistant** — c’est le profil du parcours peau, consommé
par la routine, l’assistant, la boutique) ; cheveux : `kurla_diagnostic_answers`
(sessionStorage). La page résultat lisait la clé peau **en premier** : dès
qu’un diagnostic peau avait été fait, le localStorage peau masquait les
réponses fraîches du diagnostic cheveux dans le même onglet.

**Correctif** : couche `src/lib/diagnosticSession.ts` —
- chaque page de diagnostic écrit un marqueur `kurla_diagnostic_latest`
  (`'skin'` | `'hair'`) à la soumission (`markLatestDiagnostic`) ;
- `readDiagnosticSession()` : le marqueur choisit le pôle, le contenu des
  réponses vérifie le pôle affiché (garde-fou : un fallback croisé ne peut
  jamais faire afficher la peau sur du contenu cheveux), le résultat reste
  le dernier généré (clé commune), secours explicite si absent/illisible ;
- sans marqueur (session ancienne) : comportement hérité conservé.

Aucune clé existante n’a été renommée ni vidée ; le localStorage peau
(parcours peau) reste intact. Contrat verrouillé par le banc
`tests/kurla_diagnostic_session.test.ts` (6 checks, chaîné après
`test:hair-advisory`).

**Écart de parcours signalé ici, corrigé le 13/09/2026** : le retour
« Modifier mes réponses » pré-remplit désormais les réponses des deux pôles
— voir section « Pré-remplissage aligné » ci-dessous.

### Un incident ne réveillait personne (chantier du 13/09/2026)

Trois mesures, prises avant d'écrire une ligne :

1. **Le signal s'arrêtait au tableau de bord.** La sonde tournait toutes les
   15 minutes (`production-monitor.yml`), le rendu des pages toutes les 6
   heures (`rendu-pages.yml`) — tous deux échouaient correctement, et c'est
   tout. Personne n'était prévenu : une panne de nuit se découvrait le
   matin, en ouvrant GitHub par hasard.
2. **`/api/health` annonçait `orderCount: 0` avec 39 commandes en base.** La
   valeur venait du cache du processus (`getStatusSummary()` →
   `inMemoryOrders.length`), pas de la base.
3. **`monitoring.configured: false`.** Sentry n'étant pas configuré,
   `captureServerException` s'arrêtait sur un `return` : une erreur serveur
   sortait dans la sortie standard du conteneur et disparaissait avec lui.

Ce qui a été fait :

- **`scripts/lib/alerte.mjs` + `scripts/alerter.mjs`** — deux destinations,
  dans cet ordre : `ALERT_WEBHOOK_URL` (POST JSON, temps réel), sinon une
  **issue GitHub** ouverte avec le jeton déjà présent dans chaque exécution
  (`permissions: issues: write`) et notifiée par courriel. Aucune des deux
  disponible → **échec 3**, pas un succès : une alerte qui n'est pas partie
  ne doit pas rassurer.
- **Dédoublonnage par empreinte** — une panne qui dure six heures produit
  vingt-quatre exécutions ; sans empreinte, vingt-quatre issues. Avec : une
  seule issue, commentée à chaque récidive.
- **Branché sur les trois workflows**, avec la permission `issues: write`
  (sans elle, l'API répond 403 et le signal meurt dans le journal).
- **`src/lib/db/incidentStore.ts`** — le repli d'erreurs : quand Sentry est
  absent, l'incident est écrit dans `audit_logs` (table existante, aucune
  migration à appliquer). Borné : une empreinte par (message, méthode,
  chemin), dix minutes de carence, quarante écritures par processus.
- **`/api/health` honnête** — `commandes: { compte, source }` lu en base ;
  **un compte non lu est `null`, jamais `0`** ; `monitoring.destination` dit
  où vont les erreurs ; `monitoring.incidents24h` rend le nombre d'erreurs
  sondable. `getStatusSummary()` s'appelle maintenant
  `produitsEnMemoire` / `commandesEnMemoire` : le nom dit d'où vient le
  chiffre (un test de `supabase.test.ts` a été mis à jour en conséquence).
- **Banc `tests/kurla_alerte_incident.test.ts`** — 27 vérifications, chaîné
  dans `npm test` (zone plateforme, après `test:dependances`).

**Piège découvert — à lire avant d'ajouter un module de domaine :**
`bindDomain` recopie **toutes** les entrées d'un module sur le store. Une
constante exportée devient donc une « méthode » de l'API publique, avec
l'arité de la longueur de sa chaîne : `ACTION_INCIDENT` était apparu dans
l'inventaire comme `ACTION_INCIDENT/14`. **Ne pas exporter de constante
depuis `src/lib/db/*Store.ts`** — la garder locale au module.

**Reste à faire, et je n'ai pas la main** : `SENTRY_DSN` (compte Sentry) et
`ALERT_WEBHOOK_URL` (un secret de dépôt, optionnel — l'issue GitHub suffit
à défaut). Sans eux, le repli `journal_audit` s'applique : c'est un journal
daté et interrogeable, pas un agrégateur d'erreurs.

## Provenance du pays d'origine — migration appliquée (13/09/2026)

`supabase/migrations/20260924000000_origin_provenance.sql`, appliquée sur
`qzwgsarfdegqtfdnqiql` via Management API (8 instructions, toutes vérifiées).

Deux colonnes sur `public.products` :

- `origin_country_status TEXT NOT NULL DEFAULT 'not_provided'`
  — `verified` | `declared` | `pending` | `not_provided`
- `origin_country_source TEXT` — la pièce qui source le fait

Trois contraintes, **testées par contrôle négatif** (chacune a réellement
refusé une écriture, violation 23514) :

- `products_origin_country_status_check` — statut hors liste refusé
- `products_origin_country_requires_status` — un pays sans statut refusé
- `products_origin_verified_requires_source` — `verified` sans source refusé

⚠️ **Piège à ne pas reproduire** : ne pas ajouter `origin_country_status` à
`VERIFIED_FIELDS` dans `src/lib/catalogTruth.ts`. Ce tableau alimente
`hasPendingEvidence` → `hasMinimalCatalogProof` → `isCatalogPubliclyListable`.
Comme `origin_country` est NULL sur les **96 fiches**, l'ajouter dépublie les
63 produits publiés d'un coup. `tests/kurla_origin_provenance.test.ts` le
verrouille par une assertion comportementale (ligne 69) et une garde statique.

État mesuré après migration : 96 fiches à `not_provided`, 0 avec un pays.
**Aucune valeur de pays n'a été inventée.**

### 17 bancs n'étaient exécutés par personne (chantier du 13/09/2026)

Le mal du banc de rendu n'était pas local, il était systémique. `e2e/smoke.spec.ts`
avait 48 tests complets et aucune action ne le lançait : on l'a découvert des
semaines plus tard. En cherchant la même chose côté bancs, mesure du 13/09/2026 :

| | |
|---|---|
| fichiers `tests/*.test.ts` | 141 |
| **jamais atteints par aucune commande** | **17** |
| dont lanceur déclaré mais non chaîné | 12 (`test:cosing`, `test:incompat`, `test:regulatory`, `test:ingredient-nav`, `test:ingredient-sources`, `test:outreach`, `test:purchasing`, `test:prospects`, `test:retention-nudges`, `test:retention-run`, `test:assortiment`, `test:barcode`) |
| dont aucun lanceur du tout | 5 (`kurla_c4_diagnostic_result`, `kurla_c4_skin_journey`, `kurla_c4_skin_shelf`, `kurla_personal_space`, `push_notifications`) |

**Tous passaient.** Aucun n'était cassé : ils étaient absents. C'est le pire
des deux, parce qu'un banc cassé se signale et qu'un banc absent donne la
même impression de couverture qu'un banc vert.

Trois états, et un seul acceptable pour chacun :

1. **exécuté** — atteint, transitivement, par une porte d'entrée de
   `package.json` ;
2. **module** — nommé `*.test.ts` mais importé ailleurs : 4 fichiers
   (`phase3_cart_orders`, `phase4_webhook_stock`, `rls_two_users`,
   `supabase_auth`, tous importés par `tests/supabase.test.ts`). Le nom est
   un piège de lecture ; la liste est fermée et vérifiée ;
3. **base réelle** — 6 bancs qui exigent une base vivante et ne tournent
   qu'à la demande (`npm run test:realdb`).

**Banc `tests/kurla_bancs_orphelins.test.ts`** (chaîné dans `npm test`) : il
échoue si un fichier `*.test.ts` n'entre dans aucun des trois cas, si un
lanceur `test:*` n'est jamais appelé, ou si la liste des modules s'allonge
sans qu'on l'assume.

**Et la suite tourne maintenant toute seule** : nouveau travail
`suite-complete` dans `production-safety.yml` — `npm test` complet sur chaque
push, plus une exécution par nuit (`0 3 * * *`) pour voir ce qui bouge sans
qu'un push ne l'apporte. Le dépôt est public, les minutes sont gratuites :
rien ne justifiait de garder 130 bancs à la main. En échec, l'alerte du
chantier précédent ouvre son issue.

**Piège de mesure, à ne pas refaire** : lancer un banc avec `npx tsx` au lieu
du binaire du projet (`./node_modules/.bin/tsx`, ou `npm run test:xxx`).
`npx` a résolu un autre `tsx`, hors du projet, et cinq bancs ont « échoué »
en `ERR_MODULE_NOT_FOUND` — une panne d'outil prise pour une panne de code.
Relancés avec le bon binaire : tous verts.

## Garde CPNP réparé (13/09/2026)

`catalogTruth.ts` testait `cpnp_ready` — **colonne inexistante** dans
`products` (vérifié dans `information_schema`), et **rien ne l'écrivait**.
`undefined === false` est toujours faux : le blocage ne s'est **jamais**
déclenché.

⚠️ **Correction d'une affirmation répétée** : seul le *blocage* était mort.
La couche de reporting fonctionnait déjà — `catalogStore.ts` signale
« CPNP+RP+CPSR manquants » via `evaluateCatalogSourcingReadiness`.

Le mécanisme de preuve **existait déjà** et n'a pas été doublé :
`supplier_documents` accepte `cpnp_notification`, `responsible_person`, `pif`,
`cpsr`, avec la contrainte `supplier_document_needs_proof`
(**`file_url` ET `issued_on` obligatoires** — pas de document sans pièce).
Il contenait **0 ligne**.

Le garde lit maintenant cette preuve, hydratée par `getProducts` :

| État | Effet |
|---|---|
| `notified` — pièce enregistrée, non expirée | passe, référence exposée |
| `expired` — pièce enregistrée mais périmée | **BLOQUE**, avec message |
| `unknown` — aucune pièce | **ne bloque pas** |

`unknown` ne bloque pas volontairement : un distributeur revendant des produits
déjà sur le marché UE ne dépose pas le CPNP (art. 4.3). Les 24 marques tierces
sont dans ce cas ; bloquer viderait la boutique sans fondement.

`tests/kurla_cpnp_guard.test.ts` — 8 contrats. Contrôle négatif : réinjecter le
garde inerte fait tomber le banc (exit 1).
### Pré-remplissage aligné : « Modifier mes réponses » recharge vos réponses (13/09/2026)

Consigne du porteur : aligner le diagnostic cheveux sur le comportement du
diagnostic peau. **Précision honnête** : le diagnostic peau ne pré-remplissait
pas non plus son formulaire (le localStorage peau sert de *profil* pour la
routine, l’assistant et la boutique — pas de pré-remplissage). Le
comportement « même » a donc été établi des deux côtés : **au retour sur le
diagnostic, les réponses précédentes sont pré-remplies, pour la peau comme
pour les cheveux.**

Implémentation (dans `src/lib/diagnosticSession.ts`, banc partagé) :
- source du pré-remplissage : la clé de session du pôle (dernier diagnostic
  dans l’onglet), sinon la clé persistante du pôle — `kurla_diagnostic_answers`
  / `kurla_hair_answers` (cheveux, nouvelle clé écrite au submit) et
  `kurla_diagnostic_answers_skin` / `kurla_skin_answers` (peau, existante) ;
- `mergeStoredAnswers(défauts, brut)` : ne reprend que les clés qui existent
  dans les défauts du formulaire, avec contrôle de type (string / string[]).
  Clé inconnue, JSON corrompu ou type inversé → écartée, défaut conservé. Le
  payload stocké étant produit par le formulaire lui-même, chaque valeur est
  par construction une option du formulaire — aucun vocabulaire dupliqué ;
- les deux pages initialisent leur état par
  `mergeStoredAnswers(DÉFAUTS, readStoredPrefill(pôle))` ;
- le phototype (peau) n’est pas restauré : son consentement est réaffiché à
  chaque diagnostic, volontairement.

Contract verrouillé dans `tests/kurla_diagnostic_session.test.ts`
(6 checks session + 4 checks pré-remplissage : peau puis cheveux, priorité
session > persistant, garde-fous clé/type/JSON corrompu, payload peau
string + string[]).


## Taxonomie élargie : 2 départements → 10 (13/09/2026)

Mesure avant correctif : le site ne déclarait que `cheveux` et `peau`, alors
que la base portait déjà **6** départements. **Trois verrous codés en dur**
interdisaient le reste :

| Fichier | Verrou |
|---|---|
| `catalogStore.ts` | normalisation limitée à « peau » / « cheveu » |
| `catalogStore.ts` | rejet explicite — « Utilisez cheveux ou peau » |
| `cosmeticCompliance.ts` + `catalogTruth.ts` | `['cheveux','peau']` en dur |

⚠️ **Les deux listes `['cheveux','peau']` devaient rester synchronisées.** En
ajouter un département dans l'une sans l'autre aurait classé un produit
cosmétique comme non cosmétique — donc **hors garde CPNP** — sans qu'aucun
banc ne tombe. C'est le vrai risque de ce chantier, pas la largeur.

**Source unique** : `CATALOG_DEPARTMENTS` dans `catalogManagement.ts`, avec un
drapeau `cosmetic` par département et `COSMETIC_DEPARTMENTS` dérivé. Les trois
verrous lisent maintenant cette source. Plus aucune liste en dur (garde
statique dans le banc).

10 départements, 56 sous-catégories, aucun doublon, aucun département vide :

- **cosmétiques** (soumis au CPNP) : cheveux, peau, maquillage, parfum,
  hygiene, ongles
- **non cosmétiques** : accessoires, kits — *exclus du CPNP* ; enfants,
  hommes — *transverses, c'est la sous-catégorie qui décide*

⚠️ **Piège mesuré** : rattacher `accessoires` à `COSMETIC_DEPARTMENTS`
imposerait un dossier CPNP à un peigne. Oublier `maquillage` laisserait
passer un cosmétique sans contrôle. **Les deux erreurs sont verrouillées** par
`tests/kurla_taxonomie_departements.test.ts`, avec contrôle négatif dans les
deux sens.

`normalizeDepartment()` reconnaît les libellés saisis (« Hygiène »,
« Kit Complet », « Rasage & Barbe »). Faux positif corrigé : le motif `men`
matchait dans « électroménager » → désormais mot entier uniquement.

**Rien en base n'a été migré.** Les catégories existantes continuent de
fonctionner ; les nouveaux départements sont disponibles à l'écriture.

⚠️ `as const` sur `CATALOG_DEPARTMENTS` rend le type de `slug` strict : une
liste de comparaison doit être typée `string[]`, sinon `npm run lint` échoue
(alors que `npm test` passe — le lint est une étape distincte de la chaîne).

### Le compteur de débit était le même pour toute la planète (13/09/2026)

Mesuré en production avant de coder :

  · 21 requêtes vers `/api/coupons/validate` (limite annoncée 20/min) sous une
    même adresse déclarée → 1 seul 429, le 21ᵉ. Le compteur fonctionnait ;
  · puis **une** requête avec une adresse déclarée différente → **encore 429**.

La clé n'était donc pas celle du visiteur. `TRUST_PROXY` valant `false`,
`requestAddress()` renvoyait `req.ip`, c'est-à-dire l'adresse du proxy Vercel
: **un seul seau pour tous les visiteurs**. Conséquences réelles : 300
requêtes/min pour l'ensemble du trafic sur `/api`, et 20/min sur la création
de session de paiement — une seule machine peut bloquer tous les paiements du
site, une minute à la fois.

Correction (`src/server/http.ts`, `adresseClient()`), avec l'ordre suivant :

  1. **`x-real-ip`** — posé par la plateforme, jamais par le client ;
  2. sinon la **dernière** entrée de `x-forwarded-for` — celle que notre
     proxy a vue. Croire la première, c'est permettre à n'importe qui de
     changer de seau en falsifiant un en-tête ;
  3. sinon la socket, en le **nommant** (`source: 'socket'`) : derrière un
     proxy, ce repli est partagé.

`/api/health` rapporte `limitation: { cle, source, partagee, seaux }` : si
`source` vaut `socket` en production, la correction ne s'applique pas, et
cela se voit sans refaire la mesure.

**Ce qui reste, et que je ne peux pas faire** : le compteur est **local au
processus**. Multi-instance, chaque instance compte pour soi — la limite
réelle est « limite × nombre d'instances ». Le partager exige un compteur
externe (Redis type Upstash, ou le pare-feu de l'hébergeur). Aucune table
utilisable n'existe en base pour en tenir lieu, et je n'ai pas les droits
`CREATE TABLE` : `partagee: false` le dit au lieu de le laisser croire.

Banc `tests/kurla_limitation_adresse.test.ts` (12 vérifications, chaîné) :
ordre des sources, falsification sans effet, deux visiteurs deux seaux
malgré la même socket, purge des seaux expirés, et `/api/health` qui rend la
clé visible.

## Paliers de prix triables (13/09/2026)

Le tri « € Prix croissant » existait déjà. Ce qui manquait : répondre à
**« je n'ai que 10 € »**.

Un filtre budget existait (`skinBudget`), mais il était **enfermé dans
`if (skinContextActive)`** de `BoutiquePage` — donc invisible dès qu'on
regardait les accessoires ou les cheveux. Or 28 des 63 produits publiés sont
des accessoires à partir de 4,90 € : c'était précisément là que le filtre
manquait le plus.

**`src/lib/priceBands.ts`** — 5 paliers en **plafonds inclusifs**
(10 / 20 / 35 / 60 € / tous), dérivés du prix et jamais stockés : une colonne
`price_tier` deviendrait fausse dès la première modification de prix.

Branché dans `BoutiquePage` **hors du bloc peau**, avec la boucle complète :
état → filtre → URL (`?prix=prix_10`, valeur validée) → réinitialisation.

⚠️ **Ne pas confondre avec `skinBudget`** : `moins_40` / `40_70` / `70_100`
sont des **budgets mensuels du profil beauté** (`beautyProfile.ts`),
réutilisés comme plafonds produit via `SKIN_BUDGET_CAPS` (14/28/45 €). Les
identifiants de `priceBands` sont volontairement différents (`prix_…`) pour
qu'aucune collision ne soit possible. `skinBudget` est laissé en place.

### Deux bugs réels trouvés en testant

1. **`Number(null)` vaut 0.** Un produit **sans prix** passait donc le filtre
   « Moins de 10 € » et s'affichait comme un produit à 0 €. Corrigé : `null`,
   `undefined` et chaîne vide sont rejetés **avant** `Number()`.
2. **Une garde statique qui passait à vide.** Le fichier contient **8**
   occurrences de `}, [` ; la garde cherchait depuis la première (position
   13621) alors que le vrai bloc de dépendances est à 28107. Elle matchait
   `priceBand,` sur la ligne de **déclaration** de l'état. Le contrôle
   négatif — retirer la dépendance du `useMemo` — **ne faisait pas tomber le
   banc**. Corrigé en ancrant sur la ligne réelle des dépendances.

`tests/kurla_paliers_prix.test.ts` — 7 contrats, 3 contrôles négatifs
vérifiés (filtre remis dans le bloc peau, garde-fou prix absent retiré,
dépendance `useMemo` retirée).

Les seuils suivent la distribution **mesurée** du catalogue publié :
< 8 € 16 % · 8-12 € 21 % · 12-20 € 43 % · 20-35 € 3 % · 35-60 € 8 % · ≥ 60 € 10 %.

---

---

## 13/09/2026 (2ᵉ passage) — Base de savoirs « ouvrir les yeux » (cheveux + peau)

**Consigne** : fouille des connaissances mondiales (recherches, publications,
thèses) sur les chevelures et peaux noires/métisses/mélaninées ; analyse des
concurrents et adoption de leurs modèles d'analyse (jamais leurs contenus) ;
but : l'utilisateur ne reçoit pas seulement des réponses — on lui ouvre les
yeux sur ce dont il ne pense pas, et on lui donne les moyens de prendre soin
de **ses cheveux, de sa peau et des problèmes de sa peau**.

**Fait** (tout vert, suite complète + lint) :

1. **Fouille sourcée** — `docs/RECHERCHE_SCIENCE_CHEVEUX_2026-09-13.md`
   (428 lignes, 2 pièces : cheveux 7 sections + peau S1–S7) ;
   `docs/ANALYSE_CONCURRENCE_CHEVEUX_2026-09-13.md` (acteurs cheveux + pôle
   peau). Règle tenue : **sourcée ou absente, jamais inventée** — chaque
   chiffre cité a sa publication.
2. **2 modules de savoirs** — `src/lib/knowledge/hairScience.ts`
   (13 cartes : fibre, eau, environnement, coiffures, savoirs) et
   `src/lib/knowledge/skinScience.ts` (10 cartes : soleil, taches, barrière,
   sensibilité, savoirs). Chaque carte : fait + mécanisme + source + niveau
   de confiance (recherche / institution / communauté / expertise).
3. **« Ouvrir les yeux » dans les résultats** — section 2d
   « Ce que la science dit de votre cheveu/peau — 3 choses à savoir » dans
   `DiagnosticResultPage`, alimentée par `pickHairScienceInsights()` /
   `pickSkinScienceInsights()` (déterministes, contextuels sur le profil :
   casse, cuir chevelu, HPI, SPF, sensibilité, sécheresse… ; 2–3 faits,
   jamais de doublon ; ≥ 2 sur profil vierge).
4. **2 pages publiques** — `/cheveux/science` + `/peau/science`
   (`HairSciencePage`, `SkinSciencePage`), indexables, groupées par thème,
   avec note de méthode. Miroir exact des deux pôles.

**Contrats verrouillés par le banc `tests/kurla_science_hub.test.ts`
(13 checks, dans la chaîne avant lint)** :

- chaque carte complète et sourcée (corps + source non vides, confiance et
  thème connus) ;
- 0 mot médical dans les 23 cartes (corps et sources) ;
- corps des cartes **peau** : ni « cancer », ni « traitement », ni
  « dermatologues », ni « xérose » (les noms d'institutions cités en source
  restent propres) ;
- aucune des 12 phrases réservées aux autres modules ;
- thèmes sans orphelin / fantôme ; clés uniques ;
- pickers déterministes, bornés (2–3), sans doublon, contextuels (le besoin
  principal d'abord), ≥ 2 faits sur profil vierge ;
- wiring : `DiagnosticResultModel.scienceInsights` présent côté peau et
  côté cheveux.

**Pièges mesurés** :

- les pickers lisent le **vocabulaire officiel** des diagnostics (valeurs de
  `contextFlags` de `skinAdvisory.ts` et `HairAdvisoryContext`) :
  `teint_non_uniforme` (pas `teint_irregulier`), `sensibilite`/`sensible`
  (pas `parfum`), `spfUsage !== 'quotidien'`. Un libellé inventé côté picker
  ne ferait jamais match — le banc vérifie les chemins contextuels.
- le banc de prérendu compte les routes statiques : **+2** ici (33 → 35),
  la liste est commentée par chantier — l'ajouter au compteur et aux
  commentaires, pas au hasard.
- le titre de source « Traction Alopecia » contient un mot médical :
  reformulé en langage courant (la source reste identifiable par
  auteurs/année/journal). Même règle que le corps des cartes.
- « Skin Cancer Foundation » est une institution : **zéro mention cancer
  côté peau** — la source est citée sans ce nom (Kaidbey 1979 / Photoaging
  in Skin of Color suffisent).

**Ce qui n'a pas changé** : `recommendations.ts`, les phrases réservées,
l'advisory des deux pôles, la session/préfill, le catalogue et les
départements (travail de l'autre intervenant, intouché).

### 3ᵉ vague — « les moyens » : protocoles par problème déclaré

Consigne : « aller encore plus loin dans nos recommandations… donner les
moyens pour prendre soin de sa peau et **les problèmes de sa peau** ».
La 2ᵉ vague disait « pourquoi » (les faits) ; cette vague dit
« quoi faire, quoi éviter, quand s'attendre à quoi » — pour chaque
problème déclaré au diagnostic.

**Fait** :

- `docs/RECHERCHE_SCIENCE_CHEVEUX_2026-09-13.md` : **Pièce 3** (116 lignes)
  — croissance (5 mm/mois origine africaine, EJD 2016), massage (Koyama
  2016, +8 % sur 24 semaines), chaleur (seuil 185 °C / 220 °C, étude
  Journal of Cosmetology & Trichology + PubMed 21635854), taches (picking =
  facteur aggravant n°1, sur-exfoliation = facteur déclenchant, niacinamide /
  azélaïque), points noirs (oxydation, 2 % salicylique, extraction DIY
  contre-indiquée), eau chaude (> 40 °C = perte d'eau mesurée), patch test
  (24–48 h, un produit à la fois).
- `src/lib/knowledge/problemCards.ts` : **8 cartes « moyens »** (4 peau :
  taches, imperfections, sécheresse, sensibilité · 4 cheveux : casse, cuir
  chevelu, tension/coiffures, pousse) — FAIT sourcé / FAIRE (3–4) / ÉVITER
  (2–3) / S'ATTENDRE (délai honnête).
- Section **2e** du résultat : « Vos problèmes — les moyens : faire,
  éviter, s'attendre » (1 à 2 cartes, par problème déclaré).
- Banc `kurla_science_hub` : 13 → **17 checks** (protocoles complets,
  vocabulaire, pickers, wiring 2 pôles).

**Règle tenue, et c'est la nouveauté du verrou** : **pas de problème
déclaré, pas de carte** (`inconnu = inconnu` — le banc vérifie que le
profil vierge reçoit 0 carte, pas 2 inventées). C'est l'inverse de ce que
font les quiz concurrents : ils vendent un protocole à tout le monde ;
KURLA n'en donne que pour ce qui est déclaré.

**Pièges mesurés** :

- le champ `do` est un mot-clé TS/JS : les protocoles s'appellent
  `faire` / `eviter` / `attendre` (français, donc lisible aussi).
- « acné » → « boutons » dans les corps de cartes (vocabulaire du site) ;
  « pimple patch » → « patch anti-bouton » ; les sources peuvent garder le
  titre original des publications.
- la carte pousse dit ce que la physique dit : 5 mm/mois, aucun produit ne
  change ce chiffre — le levier honnête est la rétention (casse). C'est
  aussi la meilleure différenciation face aux « produits pousse » du marché.
- les délais « s'attendre » sont calés sur les durées mesurées (mois à
  années pour les taches, semaines pour la barrière, 2–3 mois pour la
  rétention) — jamais de promesse d'effet (garde existante des leçons).

### 4ᵉ vague — « les moyens » rendus publics + découverte

Constat : les protocoles (cartes moyens) n'existaient que **dans le
résultat du diagnostic** — un visiteur qui n'avait pas encore passé le
diagnostic ne pouvait ni les lire ni les juger. Or la consigne est
« donner les moyens de prendre soin de sa peau et de ses problèmes » à
**l'utilisateur du site**, pas seulement au client du diagnostic.

**Fait** :

- `src/components/ProblemCardsSection.tsx` — section « Les moyens : un
  protocole par problème » (thème clair, cartes faire/éviter/s'attendre +
  source + badge confiance + CTA diagnostic). **Un seul composant, deux
  surfaces** (page publique = les 4 protocoles du pôle ; résultat = ceux
  du profil déclaré, inconnu = inconnu) : zéro contenu dupliqué.
- `/cheveux/science` et `/peau/science` : la section « moyens » s'insère
  entre les savoirs et la note de méthode.
- **Découverte** : le footer (colonne Plateforme) gagne « Savoirs Cheveux »
  + « Savoirs Peau » (`footer.scienceHair` / `footer.scienceSkin`, FR + EN —
  la traduction est du chrome de navigation, pas du corps de page : la
  règle hreflang de chantier 7.5 n'est pas touchée).

**Ce qui n'a pas changé** : aucun nouveau fait (les protocoles sont ceux de
la 3ᵉ vague, déjà bancés), aucune nouvelle route (compteur de prérendu
inchangé), rien dans le moteur.

### 5ᵉ vague — 4 pôles creusés : enfants, barbe/hommes, défrisage, locks

Consigne : « 5ᵉ vague de fouille sur un pôle précis » — 4 chantiers
demandés : **enfants, barbe/hommes, cheveux défrisés/chimiques, locks**.

**Fait** :

- `docs/RECHERCHE_SCIENCE_CHEVEUX_2026-09-13.md` : **Pièce 4** (124 lignes)
  — enfants (revue traction **Pediatric Dermatology 2021** : rotation 1:1,
  « teach children to communicate », défriser les enfants = à envisager
  d'éviter ; scalp enfant plus fin ; pellicules = rare chez le jeune enfant,
  coussette avant 12 mois) · barbe (fibre DHT opposée au crâne ; **PFB
  NIH 2019** : multi-lames coupe sous la surface, sec = pointe biseautée,
  contre-grain = +risque, arrêt = ~12 semaines ; sébum fixe à la racine ;
  grain + 4–6 semaines) · défrisage (**JAMA Dermatology Reviews 2024** :
  disulfures → lanthionine, lye vs no-lye = dépôts de calcium ; étude 2019
  P=0,046/0,023/0,020 ; **8–12 semaines + ≈ 2,5 cm de repousse**, max
  4–6 applications/an, ligne de démarcation) · locks (matting = feutrage
  cuticulaire mesuré ; ≈ 100 cheveux/jour emprisonnés ; timeline budding →
  teen → mature 12–24 mois ; **résidus = pièce close**, detox 3–6 mois,
  séchage complet ; **shrinkage 10–30 %** mesuré).
- `hairScience.ts` : 13 → **30 cartes savoirs**, 5 → **9 thèmes**
  (+ enfants 5, barbe 4, défrisage 4, locks 4) — la page `/cheveux/science`
  les affiche sans aucun changement de code.
- `problemCards.ts` : 8 → **12 cartes moyens** (+ enfant, barbe, défrisage,
  locks).
- **Wiring diagnostics** : le picker détecte maintenant les 3 pôles
  déclarables — `style: enfant` / `demelage_enfant` → enfant,
  `texture: defrisee` → défrisage, `texture: locksee` / `style: locks` →
  locks (les locks remplacent la carte tension comme fait « ouvrir les
  yeux » ; la carte tension reste pour braids/twists).
- **Barbe : surface publique uniquement** — le diagnostic cheveux n'a pas
  de champ barbe ; la carte moyen barbe s'affiche sur la page publique,
  pas dans un résultat (inconnu = inconnu).
- Banc `kurla_science_hub` : 17 → **18 checks** (30 cartes, 12 moyens,
  4 pôles détectés par les pickers).

**Pièges mesurés** :

- insertion Python des cartes : l'ancrage avant `HAIR_SCIENCE_THEMES`
  place les cartes **hors du tableau** (`];` déjà passé) — vérifier
  `cartes dans le tableau == cartes totales` après toute insertion
  d'un lot ; une erreur de regex de correction a fait disparaître la
  ligne `export const HAIR_SCIENCE_THEMES` (rétablie, vérifiée au banc).
- **recyclage sandbox 12× et 13×** en pleine vague 5 (ce turn) : `.node22`
  **et** le tarball `/tmp` supprimés ; `node_modules` à 0. Repli validé :
  **node système v20.20.2 tient toute la chaîne** (lint + suite 154 ✓ ce
  matin), donc plus besoin du tarball si le réseau Node est indispo.
- le `hasTension` du picker moyen ne doit plus matcher `locks` (les locks
  ont leur carte ; sinon un locks+braids prendrait tension au lieu de
  locks — ordre du `wanted` : enfant/défrisage/locks **avant** tension).

## Réorganisation de la page de réponse du diagnostic (2026-09-13)
- Consigne : la routine en premier, ensuite « Pourquoi cette routine ? », puis le reste.
- Nouvel ordre des sections (ids d'ancres inchangés) : **1** routine → **2** Pourquoi cette routine ? (titre « Pourquoi chaque étape ? » renommé) → **3** profil déclaré → **3b** profil peau mélaninée → **4/4b** certain/inconnu → **5** comprendre (phrase « routine ci-dessous » → « routine en tête de page ») → **6** science → **7** moyens → **8** priorités → **9** produits → **10** suivi.
- Piège vécu : déplacer un bloc par suppressions successives d'offsets calculés avant la 1ʳ suppression = offsets périmés, bloc dupliqué + section voisine tronquée. Solution sûre : 1 passage d'assemblage (retirer les blocs → réinsérer au bon endroit → renuméroter en UN seul re.sub avec une map, pas de remplacements en chaîne).

### Rien ne surveillait le contenu (chantier du 13/09/2026)

Le schéma était vérifié **à la main** (`scripts/verifier-schema.mjs`), les
endpoints l'étaient toutes les quinze minutes — et **le contenu, par rien**.
C'est pourtant là que les deux pannes les plus coûteuses sont arrivées :

  · 16 fiches repassées en `draft` → `/api/peau/gamme` vide pendant plusieurs
    jours, sans qu'aucun déploiement ne change ;
  · une règle exigeant le SKU fournisseur → 63 produits en base, **0 servi**.

La sonde attrape un vide total. Elle ne voit ni « 63 → 40 », ni un prix tombé
à zéro, ni une fiche publiée mais inactive.

**`scripts/lib/donnees.mjs` + `scripts/verifier-donnees.mjs`** — sept
invariants, chacun portant la raison pour laquelle il existe (un contrôle
dont on a oublié la justification finit par être désactivé) :

  produits publiés et actifs · produits réellement servis par /api/products ·
  fiches de la gamme peau visibles · produits publiés sans prix · sans
  fournisseur déclaré · publiés mais inactifs · sans date de mise à jour.

Deux règles, qui sont toute la valeur du contrôle :

  1. **la baisse se voit**, y compris lente : la comparaison se fait au
     **maximum connu**, jamais à l'observation précédente. 63 → 60 → 57 → 54
     passerait inaperçu marche par marche (≈ 5 %), le cumul (14 %) est vu.
     Le maximum ne décroît jamais ;
  2. **ce qui n'a pas pu être lu n'est pas conforme** : `non_verifiable`
     existe, il n'est jamais compté parmi les succès et il fait échouer le
     contrôle. `0` est un compte, `null` est une absence de compte.

**Nouvelle action `donnees-schema.yml`** — une fois par nuit (`0 4 * * *`) :
schéma puis données, avec l'alerte du premier chantier en cas d'échec. La
référence des maximums vit dans le cache de l'action (`actions/cache`) ; sans
elle, chaque exécution repartirait de zéro et ne verrait jamais de baisse.

**Le dépôt n'avait AUCUN secret configuré.** `SUPABASE_URL` et
`SUPABASE_SECRET_KEY` étaient référencés par le travail `real-supabase` de
`production-safety.yml` sans jamais avoir été créés : ce travail n'aurait
rien pu vérifier. Les deux secrets ont été ajoutés par l'API (valeurs
chiffrées côté GitHub, jamais dans le dépôt). **À revoir côté porteur** : les
supprimer ou les faire tourner si cette configuration ne convient pas.
`VITE_SUPABASE_PUBLISHABLE_KEY`, réclamé par `real-supabase`, reste manquant —
je n'ai pas cette valeur.

Banc `tests/kurla_controle_donnees.test.ts` (16 vérifications, chaîné).## Précision d'ordre — profil + certain/inconnu AVANT la routine (2026-09-13)
- Consigne : « dans la logique votre profil déclaré et la section (4 et 4b) doivent venir avant la routine ».
- Ordre définitif : **1** profil déclaré → **1b** profil peau mélaninée → **2/2b** certain/inconnu → **3** routine → **4** Pourquoi cette routine ? → **5** comprendre (phrase « routine en tête de page » → « routine ci-dessus ») → **6** science → **7** moyens → **8** priorités → **9** produits → **10** suivi. Ids d'ancres inchangés.
- Piège : l'assertion de propreté de couture doit être bornée à la zone éditée — le fichier contient des `\n\n\n` préexistants légitimes (entre priorités/produits/suivi), une assertion globale faussement positive.

Banc `tests/kurla_controle_donnees.test.ts` (16 vérifications, chaîné).

## Canaux sans stock et autorisation fournisseur (13/09/2026)

**Migration `20260925000000_sourcing_channels_authorization.sql` APPLIQUÉE en
base** — 14 instructions, une par appel Management API, toutes vérifiées.

### Les trois verrous levés

1. **`suppliers.supplier_type`** n'acceptait que contract_manufacturer,
   textile, tool, raw_material, packaging, laboratory, brand, distributor,
   unknown. **Les trois modèles d'année 1 étaient impossibles à déclarer.**
   Ajoutés : `dropship`, `affiliation`, `third_party_logistics`.

2. **`products.fulfillment_channel`** (nouveau, défaut `not_set`) — un même
   catalogue mélange quatre réalités logistiques. Sans ce champ on ne sait
   pas si un produit part de chez nous, d'un tiers, ou n'est qu'un lien
   affilié.

3. **Suivi d'autorisation par produit** (n'existait nulle part — vérifié dans
   `information_schema`) : `supplier_authorization_status`
   (`not_contacted|contacted|authorized|refused|not_applicable`),
   `supplier_contacted_on`, `supplier_authorization_note`.

### Trois contraintes, testées négativement en base

| Contrainte | Effet vérifié |
|---|---|
| `products_supplier_authorization_status_check` | `23514` sur `'peut_etre'` |
| `products_authorization_date_coherence` | `23514` sur `authorized` **sans date** |
| `products_channel_requires_supplier` | `23514` sur `dropship` **sans fournisseur** |

Cas légitimes acceptés : `authorized` **avec** date, `dropship` **avec**
fournisseur. Fiche témoin `launch-p02` remise à zéro après test.

⚠️ **L'affiliation n'exige PAS de fournisseur** : un lien affilié pointe vers
un marchand, pas vers un livreur.

### Ce qui n'a PAS été doublé

`sourcing_prospects` portait déjà `dropshipping`, `inci_provided`,
`eu_compliance`, `visuals_granted`, `decision` — mais **au niveau du
prospect**, et ses **25 lignes sont toutes à `to_contact`** avec ces champs à
NULL. `sourcing_product_candidates` (21 lignes) a `governance_status`,
`inci_received`, `visuals_received`, `sample_validated`. La migration ajoute
l'état **par produit**, qui manquait ; elle ne recrée pas ces tables.

### Aucun effet sur la boutique

96 fiches → `fulfillment_channel='not_set'`,
`supplier_authorization_status='not_contacted'`. **63 publiées avant, 63
après.** La porte de publiabilité n'est pas touchée : l'autorisation est un
suivi alertable, pas un blocage automatique.

`tests/kurla_canaux_sans_stock.test.ts` — 8 contrats.

⚠️ **Piège de banc** : `'dropship',` apparaît dans **deux** contraintes.
Une assertion `sql.includes("'dropship'")` globale restait verte quand on le
retirait de l'une des deux. Corrigé en isolant chaque bloc de contrainte,
avec contrôle négatif dans les deux sens.## Vague 1 peau — poils incarnés (besoin n°39, 13/09/2026)
- Sources : PIÈCE 5 de `docs/RECHERCHE_SCIENCE_CHEVEUX_2026-09-13.md` (NIH 2019 PMC6585396 + AAD déjà acquis P4.2, + CDA 2026, Healthgrades/AAD, GoodRx 2024, Blueribbonderm 2026, ingrowns.com 2026).
- Livré : 2 cartes savoirs thème `rasage` (`sci_skin_rasage_mecanisme`, `sci_skin_rasage_arret` — ~12 semaines d'arrêt) · 1 carte moyen `prob_skin_poils_incarnes` · préoccupation `poils_incarnes` posée au diagnostic (option « Poils incarnés / irritations du rasage — visage, cou, aisselles ») · labels profil pour les préoccupations sans label (rougeurs, points noirs, cernes…) · 12 cartes savoirs peau / 13 cartes moyens · banc science_hub 19 checks.
- Detections : `concerns.includes('poils_incarnes')` — la branche passer en tête de file du picker savoirs (besoin déclaré d'abord), et après imperfections côté moyens (pigmentation garde la priorité documentée).
- Pièges : `folliculite`/`dermatologue`/`rétino` sont dans MEDICAL_RE (corps ET sources) — jamais « pseudofolliculite » dans une carte ; `follicule` (sans le suffixe) passe.
- `docs/BESOINS_PEAU_50_2026-09-13.md` = le backlog (31 ✅ / 6 ⚠️ / 13 🆕) ; n°39 fait, suite conseillée : 16 → 40+41 → 45+46 → 33.
## Vague 2 peau — taches hormonales / mélasme (besoin n°16, 13/09/2026)
- Sources : PIÈCE 6 de `docs/RECHERCHE_SCIENCE_CHEVEUX_2026-09-13.md` — RCT double-aveugle 68 patientes (PubMed 24313385, 2014 : écran UV+VL +15 % MASI vs UV seul), Polena 2025 (RCT été), GoodRx 2025/StatPearls 2023, Baliña & Graupe (azélaïque 20 % ≈ hydroquinone 4 %), AAD (écran teinté aux oxydes de fer).
- Livré : 2 cartes savoirs thème `hormones` (`sci_skin_melasme_mecanisme` — hormones = réactivité, pas création de pigment ; `sci_skin_melasme_lumiere` — SPF teinté mesuré) · 1 carte moyen `prob_skin_taches_hormonales` · préoccupation `taches_hormonales` (« Taches récentes ou qui varient (cycle, grossesse, soleil) ») · 14 cartes savoirs peau / 14 cartes moyens · banc 20 checks.
- **Décision RGPD (à connaître)** : la détection est une préoccupation déclarée sur le *pattern de taches* — KURLA ne stocke jamais un statut de grossesse, aucune question médicale. Le label cite « cycle, grossesse, soleil » comme exemples de déclencheurs pour la reconnaissance ; la donnée stockée est le pattern, pas le statut.
- Priorités picker : taches (HPI) garde la tête (priorité documentée), puis imperfections, poils incarnés, taches hormonales, sécheresse, sensibilité — borné à 2 cartes ; les savoirs mélasme passent en tête de file du picker science quand le pattern est déclaré.
- Vocabulaire : « mélasme » apparaît une fois, nommé et expliqué (même usage qu'« hyperpigmentation post-inflammatoire » dans la carte HPI) ; zéro « traitement », zéro « dermatologue » (corps et sources).
- Suite du backlog : 40+41 (pôle corps) → 45+46 (maquillage) → 33 (quantité SPF).
## Vague 3 peau — pôle corps : grain de poulet + sécheresse (besoins n°40–41, 13/09/2026)
- Sources : PIÈCE 7 de `docs/RECHERCHE_SCIENCE_CHEVEUX_2026-09-13.md` — comparaison contrôlée lactique 10 % ≈ −66 % vs salicylique 5 % ≈ −52 % (12 sem, DermApproved 2026), urée 10–20 % double action, gommage = aggravant, fenêtre post-douche « three-minute rule » mesurable (Dr Sheth's 2026), délais squames 1–2 sem / zones rugueuses 4–8 sem.
- Livré : 2 cartes savoirs thème `corps` (`sci_skin_corps_grain` — bouchon de kératine, pas de la saleté ; `sci_skin_corps_minutes` — moins de sébum que le visage, règle des 3 minutes) · 2 cartes moyens (`prob_skin_grain_de_poulet`, `prob_skin_secheresse_corps`) · 2 préoccupations au diagnostic (« Petits boutons rugueux (bras, cuisses, fesses) », « Corps sec et rêche (coudes, genoux, mollets) ») · 16 cartes savoirs peau / 16 cartes moyens · banc 21 checks.
- Vocabulaire : « kératose » et « eczéma » sont dans MEDICAL_RE → « grain de poulet » + mécanisme kératine / « peaux réactives » ; zéro rétinoïde (banni) → protocole 100 % grand public (acides doux, urée, céramides, timing post-douche).
- Priorités picker (peau, borné à 2) : taches → imperfections → poils incarnés → taches hormonales → grain de poulet → corps sec → sécheresse visage → sensibilité.
- Suite du backlog : 45+46 (maquillage) → 33 (quantité SPF) → les 6 partiels (victimes rapides).
## Vague 4 peau — maquillage + quantité SPF (besoins n°45–46 + n°33, 13/09/2026)
- Sources : PIÈCE 8 (maquillage : solubilité lipidique du film — Quench Botanics 2026 ; label sans définition officielle — SELF 2019 avec porte-parole FDA, Medical News Today 2023 ; patch test 4–6 sem — VerywellHealth 2026) + PIÈCE 9 (SPF : 2 mg/cm², moitié de dose → SPF 30 ≈ 5–10 — skn.coach 2026 ; réappli 2 h AAD).
- Livré : 3 cartes savoirs (`sci_skin_spf_quantite` thème soleil ; `sci_skin_maquillage_demaquillage` + `sci_skin_maquillage_pores` thème `maquillage`) · 1 carte moyen `prob_skin_maquillage` · préoccupation `port_maquillage` (« Je porte du maquillage (quotidien ou souvent) ») · 19 cartes savoirs peau / 17 cartes moyens · banc 22 checks.
- Piège vécu : la source « Skin&Me (2024, dermatologue consultant) » a déclenché MEDICAL_RE (`dermatologue`) — les sources des cartes passent aussi la regex.
- Règle du picker quantité SPF : glissée en fin de file **seulement si `wanted.length < 3`** quand le SPF est non quotidien — elle ne déplace jamais un besoin déclaré (profil SPF+taches garde ses 3 cartes habituelles).
- Vocabulaire : « comédogène » banni (motif `comedo`) → « qui bouche les pores » / « non-clog » ; le label est présenté comme allégation du fabricant (pas de définition ni test officiels).
- Suite du backlog : 6 ⚠️ partiels (victimes rapides : barrière, cernes, picking, sébum, prévention, teinte) → 17+42+43 (trio frottement) → 48… déjà fait ; 8 (saisonnier) → 50 (grossesse, en dernier).
## Vague 5 peau — frottement & assombrissements : plis, aisselles, lèvres (besoins n°17–42–43, 13/09/2026)
- Sources : PIÈCE 10 de `docs/RECHERCHE_SCIENCE_CHEVEUX_2026-09-13.md` — frottement = stimulation mélanine (réaction de protection), « pas de l'hygiène » (4 sources concordantes), aisselle = 8–12 sem (skinaa 2026), SPF cou = zone la plus oubliée, déodorant sans alcool, vêtements amples ; lèvres = enzymes digestives de la salive abîment la barrière (kolorshairandskin 2026), cycle lèche/pèle/marque, bâtonnet SPF 15+, test 4–6 sem.
- Livré : 2 cartes savoirs thème `frottement` (`sci_skin_frottement_plis`, `sci_skin_leveres_habitudes`) · 2 cartes moyens (`prob_skin_assombrissement_plis`, `prob_skin_leveres`) · 2 préoccupations (« Assombrissement des plis (cou, aisselles, cuisses) », « Lèvres qui se gercent ou foncent ») · 21 cartes savoirs peau / 19 cartes moyens · banc 23 checks.
- **Limite honnête (décision éditoriale)** : l'assombrissement plis soudain/épaissi/non réactif peut avoir une cause interne (les sources nomment acanthosis nigricans / glycémie) → la carte moyens le dit une fois, sans nommer le motif, sans alerter : « en parler à un professionnel de santé ». Jamais de diagnostic, jamais de rassurance à la place.
- Piège évité : le cwd de l'append doc — vérifié après chaque `cat >>` (tail + wc -l) : un append silencieux raté laisse croire que la pièce existe.


## Chaîne de sourcing peau chargée en base (13/09/2026)

Les 100 produits peau ne sont plus seulement dans un CSV : ils sont en base,
rattachés à un fournisseur, avec un email préparé. **Aucune modification de
code** — uniquement des données.

### Ce qui a été créé

| Table | Avant | Après |
|---|---|---|
| `suppliers` | 8 | **10** — `sup-blacketique-sas`, `sup-eolys-beaute`, canal `affiliation` |
| `sourcing_prospects` | 25 | **28** — `prosp-blacketique`, `prosp-eolys`, `prosp-ankorstore` |
| `sourcing_items` | 3 | **7** — 4 besoins `wave='vague-peau-1'`, statut `in_rfq` |
| `rfqs` | 1 | **5** — 4 emails en `draft` avec leur corps dans `content` |
| `sourcing_product_candidates` | 21 | **121** — les 100 produits du registre, `governance_status='blocked'` |

⚠️ **Première utilisation réelle de la migration `20260925000000`** : le canal
`affiliation` était impossible à déclarer avant. Contrôle négatif refait :
`supplier_type='telepathie'` toujours bloqué `23514`.

### Le mécanisme réutilisé, pas recréé

Le pipeline existait déjà : `blocked → waiting_inci → in_progress → ready →
published` (`CANDIDATE_GOVERNANCE` dans `src/lib/prospectSeed.ts`). Les 21
candidats du chantier cheveux l'utilisaient déjà, tous `blocked`.

Les 100 produits peau y entrent **au même état `blocked`**, avec
`inci_received=false` et `visuals_received=false`. C'est cohérent : aucune
marque n'est vérifiée pour ces lignes.

⚠️ **`required_documents` est un tableau de CODES** (`responsible_person`,
`cpnp_notification`, `certificate_of_analysis`), pas du texte libre. Piège
rencontré : y écrire une phrase produit `22P02 malformed array literal`.

⚠️ **`json.dumps` ne produit pas des littéraux SQL** : les guillemets doubles
sont lus comme des identifiants de colonne (`42703`). Utiliser des
simple-quotes avec doublement des apostrophes.

### Les 4 emails sont dans le dashboard admin

Visibles via `GET /api/admin/sourcing/items?wave=vague-peau-1`, qui calcule
`rfqCount` et `sentCount`. État actuel : **4 demandes, 0 envoyée**.
L'envoi se fait par `POST /api/admin/sourcing/rfqs/:rfqId/send` →
`markRfqSent`. Les contraintes `rfq_sent_needs_date` et
`rfq_sent_needs_supplier` interdisent de marquer « envoyé » sans date ni
fournisseur.

⚠️ **Ces endpoints enregistrent l'envoi, ils n'envoient rien** : il n'y a pas
de boîte mail. L'envoi réel reste manuel.

### La boutique n'a pas bougé

**63 produits publiés avant, 63 après.** Aucune fiche produit n'a été créée.

Le garde de publiabilité (`hasMinimalCatalogProof`) exige **une marque, une
composition, une image et un pays de livraison**. Pour 90 des 100 produits,
aucun de ces quatre champs n'est disponible honnêtement. Créer ces fiches
aurait reproduit les 16 fiches « (Démo) ».

Le passage en boutique se fera **au fil des réponses fournisseur**, en faisant
passer chaque candidat de `blocked` à `published`.
## Vague de fin peau — cernes, picking, grasse, prévention, teinte, saisonnier (besoins n°18–22–23–37–47–8, 13/09/2026)
- Sources : PIÈCE 11 de `docs/RECHERCHE_SCIENCE_CHEVEUX_2026-09-13.md` — cernes = 3 familles pigmentaire/vasculaire/structurelle + tests d'étirement (DermApproved 2026, « cream can only address pigment or thin skin, not anatomy ») ; pigmentation sous-oculaire plus fréquente en peaux foncées, souvent familiale (Wederm 2026) ; picking = facteur aggravant n°1 modifiable de l'acné (Asian Acne Board 2016, PubMed 26813513 — P2 existant, pas de nouvelle recherche) ; profil grasse = sébum en excès ≠ déshydratation (base profils existante) ; prévention/teinte/saisonnier = réordonnances des savoirs déjà présents (15 actifs, SPF n°1, TEWL hiver, UVA constant).
- Livré : 3 cartes savoirs (`sci_skin_prevention` thème savoirs, `sci_skin_teinte` thème maquillage, `sci_skin_saisonnier` thème barrière) · 2 cartes moyens (`prob_skin_cernes` — les 3 familles + le test + la limite honnête structurelle, `prob_skin_picking` — l'habitude est le moteur, patch occlusif, « le produit ne gagne pas contre le geste ») · 4ᵉ profil de connaissance `melanin-oily` (branché sur le type « grasse », après pigmentation, avant sec) · préoccupation `picking` (« Je perce ou tripote (boutons, peau) ») + label · 24 cartes savoirs peau / 21 cartes moyens / 4 profils / 23 préoccupations · bancs 24 + 13 checks.
- n°7 (barrière) : **pas de numéro livré** — les objectifs « hydrater / renforcer la barrière » déclenchent déjà la carte `sci_skin_barriere` existante ; noté pour mémoire, considéré couvert.
- **Limite honnête (décision éditoriale)** : cernes structurels = anatomie (sillon lacrymal) qu'aucun produit ne corrige — la carte le dit d'emblée au lieu de vendre du contour ; la caféine est présentée comme un effet temporaire.
- Détail picker : le profil « grasse » n'efface jamais les priorités taches/imperfections (testé : grasse + taches → profil pigmentation) ; `prevention` glissée sur l'objectif prévenir, `teinte` sur le maquillage, `saisonnier` avec la sécheresse.
- **50 besoins peau : vagues 1–5 + vague de fin livrées. Il reste le n°50 (grossesse), à traiter en dernier, par prudence** — jamais d'affirmation catégorique, des signaux, des recommandations de prudence et l'invitation à parler à un professionnel de santé.


## Parité cheveux / peau atteinte dans la chaîne de sourcing (13/09/2026)

Constat de départ, mesuré : **la partie cheveux était moins avancée que la
peau**, pas plus. 3 `sourcing_items` dont 2 encore `to_source`, **1 seul RFQ**
(sans `supplier_id` ni `channel`), 21 candidats `blocked`.

Ce qui valait la peine d'être repris des cheveux, c'est **la rigueur du RFQ** :
`vague-1-apres-shampoing-rince` faisait 4 420 caractères et citait six cadres
réglementaires que les 4 emails peau n'avaient pas.

### Les 4 emails peau ont été réécrits sur ce modèle

**~1 500 → 5 500-5 800 caractères chacun**, en 6 sections comme le RFQ
cheveux. Ajoutés :

- **7 documents justifiés un par un** : Personne Responsable UE, CPNP, PIF,
  CPSR, INCI, DDM/PAO, certificat d'analyse — chacun avec son « pourquoi ».
- **Un tableau de réponse structuré** : prix, MOQ, franco, délai, échelons,
  paiement, lieu de stockage, marques disponibles.
- **Six cadres réglementaires** qui manquaient :
  - `ISO 24444` — toute revendication SPF doit être mesurée
  - `ISO 24443` — logo UVA, au moins le tiers du SPF
  - **loi AGEC** — microplastiques interdits au-delà de 0,01 % dans les
    formules rincées depuis le 1er janvier 2026
  - **règlement UE 2023/1115 (EUDR)** — diligence raisonnée et
    géolocalisation des parcelles
  - interdits : hydroquinone, mercure, corticoïdes, allégation éclaircissante
  - **contrefaçon** : marque de luxe à prix très écarté du prix public = non
    référencée
- La mention **« un devis partiel est acceptable, nous ne complétons rien à
  votre place »**, reprise du RFQ cheveux.

Vérifié par script : **4/4 emails COMPLETS**, 6/6 sections, 11/11 exigences
réglementaires présentes.

### Parité mesurée après coup

| | Cheveux | Peau |
|---|---|---|
| `sourcing_items` | 3 (dont **2 `to_source`**) | **4 (0 `to_source`)** |
| `rfqs` préparés | 1 | **4** |
| — avec `supplier_id` | 0 | **2** |
| — avec `channel` | 0 | **4** |
| candidats produits | 21 | **100** |
| longueur moyenne d'email | 4 420 | **5 680** |
| fiches publiées en boutique | **25** | **0** |

**La peau dépasse les cheveux partout sauf sur le dernier point** : les 25
fiches cheveux publiées viennent du sourcing historique (Distristar), pas de
cette chaîne.

⚠️ **Rappel sur ces 25 fiches** : elles déclarent « Distristar (Bobigny) »,
société qui existe (17-19 rue Eugène Hénaff 93000, 01 48 91 04 64), mais sa
vitrine met en avant Red One, X-Pression, Dark and Lovely, TCB — **pas nos
marques**. Et `supplier_documents` contient **0 ligne** : aucune pièce ne
prouve la relation. C'est le point de crédibilité ouvert sur les cheveux.

### La boutique n'a toujours pas bougé

**63 produits publiés, avant comme après.** Aucune fiche créée. Les 100
candidats peau restent à `governance_status='blocked'`, avec
`inci_received=false` et `visuals_received=false` — état cohérent, aucune
marque n'étant vérifiée pour ces lignes.

Aucune modification de code dans ce chantier : uniquement des données.## N°50 peau — grossesse & allaitement (livré 2026-09-13)
- Sources : PIÈCE 12 de `docs/RECHERCHE_SCIENCE_CHEVEUX_2026-09-13.md` — ACOG (précaution dérivés de la vitamine A, du projet de conception à la fin de l'allaitement) ; AAD (via Parents.com 2024, experte AAD : « abundance of caution ») ; Murase et al. 2017 (azélaïque, glycolique, vitamine C documentés) ; revue des données d'usage posé (DermMythBuster 2025 : « pas de dommage prouvé » ≠ « sécurité prouvée » ; réassurance en cas d'exposition sans le savoir) ; getskinscore/mumgerie 2026 (salicylique : rinçage ≤ 2 % accepté, gommages concentrés et leave-on > 2 % à écarter).
- Livré : 1 carte savoirs `sci_skin_grossesse` (confiance institution) + 11ᵉ thème `grossesse` (section dédiée sur /peau/science, auto-parcours) · 25 cartes savoirs peau / 21 moyens / 4 profils · banc 25 checks (dont : zéro formulation catégorique, référence au professionnel présente, source ≥ 40 car.).
- **Décision RGPD (garde-fou du dossier des 50 besoins)** : pas de question de diagnostic sur l'état de grossesse — donnée sensible, et elle ne modifie aucune autre recommandation détectable : le besoin est éducatif et la carte est publique. Pas de carte moyens : le « protocole » est la carte elle-même (écarter la vitamine A et les gommages concentrés, garder le gros de la routine + le SPF, le reste va à la sage-femme / médecin / pharmacien).
- **Garde-fous tenus** : jamais « interdit », jamais « totalement sûr » ; « on met de côté » / « reste dans les bornes acceptées » ; réassurance documentée en cas d'exposition sans le savoir (pas de panique, on arrête, on en parle) ; le SPF n'est jamais mis de côté.
- **50 besoins peau : TOUS LIVRÉS** (vagues 1–5 + vague de fin + n°50). Le dossier `BESOINS_PEAU_50` est clos.
## Mapping 50 besoins → produits & fournisseurs (livré 2026-09-14)
- **Document** : `docs/MAPPING_50_BESOINS_PRODUITS_FOURNISSEURS_2026-09-14.md` — pour chacun des 50 besoins : produit recommandé KURLA (code : kits/profils/cartes) + positions du registre 100 produits + fournisseur avec statut réel de vérification.
- **Chiffres durs** : 50 besoins = 5 sans produit (éducation) + 19 avec au moins une ligne à canal vérifié + 26 à sourcer (dont 5 trous structurels : SPF teinté oxydes de fer #15/16, patchs hydrocolloïdes imperfections #22, cuir chevelu #44, maquillage teintes foncées #46/47). 100 lignes du registre : 10 canaux vérifiés (AN×4, BE×6), 90 pistes, 0/100 contactées.
- **Point d'attention transmis** : PEAU-088 (spatule comédon) est dans le registre mais contradictoire avec la carte moyens « pas d'extraction DIY » — à retirer ou repositionner « usage par professionnel ».
- Docs-only : aucun code touché.
## Consigne 4 phases — sourcing & boutique (livré 2026-09-14)
- **Phase 1 — travail de fond INDÉPENDANT** : `docs/SOURCING_INDEPENDANT_50_BESOINS_2026-09-14.md` — 50 besoins × produits réels × fournisseurs (recherche web propre, statuts de vérification honnêtes : confirmé / à confirmer / à identifier, prix publics constatés).
- **Phase 2 — comparaison avec le travail du 2ᵉ agent** : `docs/COMPARAISON_SOURCING_DEUX_TRAVAUX_2026-09-14.md` — B = infrastructure (registre 100 lignes, 56 fournisseurs, cahier des charges, 4 emails) ; A = matière (produits nommés, prix, INCI teinté Isdin = CI 77491/77492/77499, contacts B2B). Convergences : BLACKETIQUE, EOLYS, CPNP d'abord, 0/100 contacté. §4 = décisions retenues pour les phases 3-4.
- **Phase 3 — préparation des emails (RÉDIGÉS, AUCUN ENVOYÉ)** : `docs/EMAILS_SOURCING_PHASE3_2026-09-14.md` — 10 emails prêts (Pibukare, EOLYS, BLACKETIQUE, Kocosmetic, GetYourKBeauty [à confirmer], Ankorstore, IN'OYA, Weleda, Cosmo Naturel, grosiste dermo 14 réf/8 groupes) + bloc CPNP/PR-UE à d'abord (1223/2009) + conditions commerciales + 3 refus opposables + signature. **Bloqué sur : boîte mail KURLA + mandat + SIREN — rien n'est parti.** Suivi prévu via `supplier_authorization_status` (not_contacted → contacted → authorized/refused).
- **Phase 4 — enrichissement boutique (DONNÉES, ZÉRO CODE)** : `docs/ENRICHISSEMENT_BOUTIQUE_PHASE4_2026-09-14.md` + CSV latéral `docs/sourcing/MARQUES_CANDIDATES_100_PRODUITS_2026-09-14.csv`.
  - **26 fiches `src-*` créées en base** : `catalog_status='draft'` + `is_active=false` → **jamais publiquement listables** (garde `isCatalogPubliclyListable` : published exigé). Prix publics constatés uniquement (colonne NOT NULL respectée, 5,79–91,19 €). Statuts de vérification honnêtes (`not_provided` : INCI, allégations, autorisation). `source_supplier = « Candidat — [marque] »`, note de sourcing = email préparé.
  - **Aucune migration** : `draft` = statut existant. Les 16 fiches cibles `peau-ess-*` inchangées. Aucune ligne `suppliers` créée (table vide, pas de fournisseur fictif).
  - **CSV additif** indexé sur les refs PEAU-001..100 du 2ᵉ agent (registre non réécrit) : 46 mappings, 35/100 refs avec candidat à prix constaté, 65 refs sans candidate (pas de prix constaté → rien inventé).
  - **Garanties vérifiées** : `published` = 63 avant/après ; probe prod : `/api/products` count=63, `/api/peau/gamme` count=16, 0 erreur.
  - **Rien n'est publiable sans** : autorisation fournisseur + INCI + CPNP/pers. responsable UE + visuel (checklist §5 du doc).
  - **Visibilité boutique (demande utilisateur, 14/09)** : route publique `/api/produits/avenir` + section « Bientôt disponible — sourcing en cours » dans /boutique (cartes marque + prix public constaté non engageant + bouton Non vendable). Les fiches y sont lisibles **sans être vendables** : pas de panier, pas de prix de vente, garde de publiabilité intacte ; elles sortent de la section d'elles-mêmes à la publication. Fixtures d'inventaire régénérées, suite 156 PASS.
- **En attente de prix (pas de fiche)** : CeraVe Crème hydratante, CeraVe Crème Yeux, Eucerin Anti-Pigment Correcteur, Avène Cicalfate+, COSRX Snail 96 Mucin.

Aucune modification de code dans ce chantier : uniquement des données.
## Mise en boutique de TEST avec visuels fournisseurs (14/09/2026)

Demande de l'exploitant : « mise en boutique avec des images issues des
fournisseurs, nécessaires pour faire des tests ; l'envoi des emails viendra en
deuxième position ». Sans contractualisation, aucune preuve n'existe (prix pro
masqué derrière connexion revendeur, droits visuels non cédés, INCI non
vérifiée) : publier ces fiches dans la boutique réelle serait un mensonge.

### Mécanisme : porte test séparée (migration 20260926000000, APPLIQUÉE)

- `products.is_test_listing` (booléen, défaut false) + `test_listing_note`.
- `catalogTruth.ts` : `isTestListingProduct` + `isTestListableProduct`
  (drapeau + active + published + marque + visuel http). La porte réelle
  `isCatalogPubliclyListable` est INCHANGÉE et n'est jamais satisfaite par une
  fiche test — même le banc la sabote en « conforme », elle reste exclue.
- `catalogStore.getProducts({ includeTestListings })` : sans le drapeau les
  fiches test sont exclues ; avec, elles s'ajoutent via leur seule porte.
- API : `GET /api/products?test=1` et `GET /api/products/:id?test=1`.
  Client : `?test=1` active un drapeau sessionStorage ; bannière « MODE TEST »
  dans App.tsx ; badge ambre + « Prix à contractualiser » sur les cartes et
  fiches ; CTA « Fiche test — non achetable ». Checkout inchangé :
  `isCheckoutEligibleProduct` reste faux (pas de stock, preuves incomplètes).
- Prix : `price` NOT NULL conservé (protège le catalogue réel) ; les fiches
  test portent 0 en base, traduit en `price: null` par `toPublicProduct`.

### Données : 6 fiches test EOLYS (insérées, vérifié count=6)

Visuel, INCI complète, EAN repris de la page publique d'EOLYS Beauté le
14/09/2026 : Torriden Dive-In sérum 50 ml, crème 100 ml, mousse 150 ml,
Balanceful gel 200 ml, Balanceful disques 60 pcs, Beauty of Joseon tonique riz
150 ml. Deux fiches portent la Personne Responsable UE publiée par le
fournisseur (AK Biocosmetics GmbH AT ; Cosmetrade S.L. ES) — preuve que ces
références sont déjà mises sur le marché UE. Statuts honnêtes : tous
`pending`/`unverified`, `supplier_authorization_status='not_contacted'`,
`fulfillment_channel='not_set'`.

### Écart avec la phase 4 de l'autre agent (44e9b73)

Ses 26 fiches `src-*` sont `draft` + `is_active=false` et **sans visuel** :
utiles au pipeline, invisibles en boutique. La vague test ci-dessus est la
seule réponse à « voir des fiches avec images fournisseurs pour tester ».
Les deux coexistent sans se chevaucher (préfixes `src-` vs `peau-test-`).

### Banc

`tests/kurla_vague_test_images.test.ts` (`test:vague-test-images`, chaîné) :
porte réelle jamais satisfaite par une fiche test (y compris sabotée
conforme), exclusion sans mode test, inclusion avec, brouillon jamais exposé,
projection `price: null`, checkout impossible. Suite complète exit 0
(157 [PASS], lint inclus).

## Visuels officiels des 26 fiches — mission images (livré 2026-09-14)

Demande de l'exploitant : « le prochain travail c'est de mettre les images,
chaque produit dispose d'une image présente sur la plateforme de l'entreprise…
le visuel est hyper important ». Commits `506f527`, `be241a8`, `9172901`
(+ alignement des brouillons fournisseurs `b5e6c36`).

### Livré

- **25/26 packshots** téléchargés depuis les plateformes officielles des
  marques (LRP FR/ES, Eucerin, Avène, Bioderma, Ducray, Klorane, IN'OYA,
  L'Oréal, ISDIN, Weleda, COSRX, The Ordinary, INKEY, ISNTREE) →
  `public/images/sourcing/<id>.jpg` (≤ 1000 px, ≤ ~90 Ko, 960 Ko au total).
- **Affichage boutique** : champ `image` ajouté à la projection
  `getComingSoonProducts` (catalogStore.ts) + bloc visuel `object-contain`
  dans `SectionAvenir` (BoutiquePage.tsx). 25 visuels en prod vérifiés
  (200, 404 propre pour id inconnu), route `/api/produits/avenir` : 25 images
  + 1 null.
- **cosmo-001 — pas d'image officielle** : « Lait Corps Nourrissant Karité
  Amande douce 500 ml » (EAN 3489940049503) **absent de cosmonaturel.fr**
  (vérifié 14/09 : recherches karité/lait/EAN, sondage d'identifiants,
  sitemaps). `image_url = NULL` → la carte affiche « Visuel officiel en
  attente du référencement fournisseur ». Le produit existe chez des
  distributeurs (penntybio 10,75 € réf. NCO4950) — à confirmer auprès de la
  marque (demande ajoutée à l'email 9).
- **Statut de propriété honnête** : 25 fiches `image_ownership_status=
  'unverified'` + `images_validation_status='pending'` + `source_note` par
  produit (plateforme + date) ; cosmo-001 `not_provided` + ligne d'audit
  `product_images.image_type='placeholder'`.
- Garanties : non vendable intact (26 drafts, garde de publiabilité fermée),
  publiés inchangés par l'opération, suite 157 PASS / 0 FAIL (fixture
  `store_api_inventory` régénérée : +`comingSoonImage/0`, 329 méthodes).

### Pièges à lire

1. **L'état hérité du template était fictif (corrigé)** — les 26 fiches
   avaient hérité `verified`/`brand_provided` + placeholder Unsplash
   (template `peau-ess-003`). Aucune marque n'a fourni ni validé de visuel :
   l'état est `unverified`/`pending`. **Ne pas « réparer » en remontant à
   `verified`** — le passage à `verified` attend l'accord écrit de la marque
   (point 9 du bloc commun des emails, `b5e6c36`).
2. **La règle « bientôt disponible » n'est pas la règle « publié »** : la
   projection n'utilise que `comingSoonImage()` — uniquement
   `/images/sourcing/…`, jamais d'URL placeholder/illustration (y compris via
   la galerie `product_images`). **Ne pas appliquer
   `hasTrustedImageOwnership`/`hasPlaceholderMarker` à cette section** :
   l'ownership d'une fiche sourcing est `unverified` par définition, et ces
   gardes masqueraient les 25 packshots. Les deux règles coexistent :
   catalogue publié = image de confiance ; section avenir = packshots servis
   par KURLA, jamais d'image usurpée.
3. **Bioderma — identification corrigée** : le produit officiel est la
   **Créaline Huile Micellaire 150 ml** (PDP `bioderma.fr/p/crealine-huile-micellaire`),
   pas « Sensibio Huile Micellaire 500 ml » (n'existe pas ; Sensibio = eaux
   micellaires). Fiche (nom, slug `src-bio-001-crealine-huile-micellaire`,
   prix constaté 24,15 € 14/09), emails et CSV latéral corrigés. **Pièce
   jointe au piège** : la galerie d'une PDP Bioderma contient des produits
   conseillés — vérifier le nom de gamme **sur l'image** avant validation
   (un candidat « Créaline Défensive » a été écarté).
4. **lrp-006** : plateforme FR = version 4,7 g (p6756), plateforme ES =
   version 9 ml — même gamme ; packshot ES retenu, question de format ajoutée
   à l'email dermo.
5. **Les pages Bioderma sont des shells JS** (AEM + Adobe Commerce) :
   slugs produits non devinables, `/graphql` et `/rest/V1` = 403, sitemap =
   contenu seul — web_search + lecture de la PDP obligatoires.

### L'absence de composition se lit comme « non cosmétique » (14/09/2026)

Chantier : phase de test, garde-fou ③ (CPNP + personne responsable UE).

`requiresCpnp` (cosmeticCompliance.ts) classe un produit SANS composition
connue comme non cosmétique — l'heuristique `isAccessoryProduct` renvoie vrai
quand ni INCI ni ingrédients ne sont connus. Conséquence silencieuse :
`evaluateCosmeticCompliance` renvoie alors `requiresCpnp: false, compliant:
true`. Pour une porte de VENTE c'est cohérent (on ne vend pas ce qu'on ne
peut pas identifier), mais pour un GARDE-FOU c'est un trou : une fiche cosmétique
dont l'INCI n'est pas encore reçue aurait été affichée « CPNP au vert ».
`evaluateTestPhaseGates` (testPhaseGates.ts) applique donc la règle
fail-closed : catégorie non accessoire/kit + composition inconnue → CPNP
requis, garde au rouge, nominativement. Si d'autres gardes réutilisent
`requiresCpnp` sur des fiches incomplètes, même vigilance.

### Vitesse du site : le temps serveur, pas le poids (14/09/2026)

Chantier : « améliorer la vitesse du site ». Diagnostic **mesuré** sur la
production, pas supposé.

**Le poids n'était pas le problème.** Tout est déjà servi en Brotli, et c'est
le seul chiffre qui compte pour le réseau : HTML 297 Ko → **31 Ko** transférés,
CSS 162 Ko → 21 Ko, JS 106 Ko → 31 Ko. Tailler ou découper des bundles
n'aurait rien changé de perceptible. Le problème était le **temps serveur** :

| Mesure (14/09/2026, à chaud) | Avant |
|---|---|
| `/` | 0,21 s |
| `/produit/…` | 0,08 s |
| **`/api/products`** | **0,67 à 0,99 s** |
| `/api/health` | 0,45 s |

Deux causes, deux correctifs :

1. **`getProducts` enchaînait cinq `await` séquentiels** (products, variantes,
   stock, images, preuves CPNP) — cinq allers-retours l'un après l'autre, à
   ~0,26 s pièce, alors qu'aucune de ces lectures ne dépend d'une autre : les
   variantes, le stock, les images et les preuves sont rattachés aux produits
   **après** coup, en mémoire. Passés en `Promise.all`. Les erreurs restent
   contrôlées une par une, dans le même ordre : le premier échec fait toujours
   échouer la lecture du catalogue.

2. **`/api/products` chargeait le catalogue deux fois** — `getPublicProducts`
   pour la liste, `getProducts` pour les devis de kits : dix lectures. Une
   seule désormais, via `lireCataloguePublic()`.

S'y ajoute un en-tête `Cache-Control: public, s-maxage=60,
stale-while-revalidate=300` : le catalogue change quelques fois par jour, pas
à chaque seconde.

#### Ce que cette route partage maintenant — à connaître avant d'y toucher

`/api/products` sert la liste publique **et** les devis de kits depuis une
seule lecture, y compris en mode test `?test=1`. Trois règles, verrouillées
par `tests/kurla_vitesse_catalogue.test.ts` (banc d'équivalence : la
projection servie doit rester **identique** aux deux lectures d'avant) :

1. hors mode test, aucune fiche test n'est servie ;
2. **une fiche test n'entre jamais dans le catalogue qui chiffre les devis de
   kits**, même en mode test — elle n'a pas de prix KURLA. Le retrait se fait
   en mémoire (la requête lit déjà toutes les fiches actives) : il ne coûte
   aucune lecture ;
3. une réponse de mode test n'est **jamais** mise en cache (chemin de revue
   interne, pas une réponse publique).

**Conséquence à garder en tête** : le stock affiché par la boutique peut
avoir jusqu'à une minute de retard. Ce n'est pas une approximation de plus :
le paiement réserve le stock **sous verrou côté base** et ne lit jamais cette
réponse.

#### Correctif collatéral — `scripts/tsc.mjs` (14/09/2026)

La vérification des types, qui ferme la suite, a commencé à mourir d'épuisement
mémoire (1146 Mo insuffisants) après les 27 commits de la phase de test : le
projet a grossi. La cause était dans mon propre outil : il dimensionnait le
tas sur `os.freemem()` (1 123 Mo « libres ») alors que la machine annonçait
**1 417 Mo disponibles** — le cache de fichiers est rendu par le noyau sur
demande. Le nouvel essai était ensuite refusé faute de marge, donc un seul
essai avait lieu. Il lit désormais `MemAvailable` de `/proc/meminfo`
(1260 Mo → vérification verte).

#### Reste mesuré, non engagé

- `/api/health` à 0,45 s : même cause (lectures séquentielles), pas traité —
  ce n'est pas une route visitée par les visiteurs.
- Dimensions `width`/`height` manquantes sur 34 `<img>` (13 seulement
  renseignées) : gain de mise en page réel mais non mesuré, donc non retenu.

### Emprunt sur un banc qui n'est pas le mien (14/09/2026)

Le commit `968172d`/`fe86950` ajoute `/diagnostic`, point d'entrée unifié du
parcours, déclaré `indexable: true` et **priorité 1** dans `routeMeta.ts` —
donc une 36ᵉ route statique prérendue. Le banc du sitemap
(`chantier_7_seo.test.ts`) recalcule sa liste et est resté vert ; le banc du
prérendu, lui, fige le compte dans le code et a rougi : *« Attendu 35 routes
statiques, obtenu 36 »*.

J'ai passé le compte à 36 et ajouté l'assertion nominative sur `/diagnostic`
(`tests/chantier_7_prerender.test.ts`). **Ce n'est pas mon domaine** : si
cette page ne doit finalement pas être indexée, c'est `routeMeta.ts` qu'il
faut changer, pas le compte — le banc suivra.

#### Mesures après déploiement (14/09/2026, ~22 h, `b9d5a75`)

| | Avant | Après |
|---|---|---|
| `/api/products`, cache contourné (MISS) | 0,67 à 0,99 s | 0,480 · 0,511 · 0,568 · 0,509 s |
| `/api/products`, servi par le CDN (HIT) | — | 0,063 · 0,064 · 0,068 · 0,119 · 0,171 s |
| `/` | 0,21 s | 0,246 · 0,121 · 0,068 s |
| `/api/health` | 0,45 s | 0,477 · 0,434 · 0,371 s (inchangé, non traité) |

Le cas qui compte pour un visiteur est la ligne « HIT » : le catalogue est
servi en 60 millisecondes au lieu de 800. Le temps serveur pur, lui, passe
d'environ 0,83 s à environ 0,52 s.

**Invariants vérifiés sur la production**, pas seulement sur les bancs :

- `count = 63` hors mode test — exactement le chiffre d'avant, aucun produit
  perdu ni ajouté ;
- `skinKits` **strictement identiques** dans les deux modes (3 devis) : les
  32 fiches test du mode test n'entrent jamais dans un devis de kit ;
- les 32 fiches supplémentaires du mode test sont toutes marquées
  `testListing: true`, et **aucune** ne figure dans la liste publique ;
- `?test=1` répond `x-vercel-cache: MISS` à chaque appel : jamais mis en
  cache, comme prévu.

À noter : Vercel retire `s-maxage` et `stale-while-revalidate` de la réponse
envoyée au client (le visiteur voit `cache-control: public`) — ce sont des
directives de CDN. Leur effet se lit dans `x-vercel-cache: HIT`.

**CI verte sur `b9d5a75`**, y compris le job « Suite complète » — qui était
**rouge** sur `ddb997f`, avant mon push, pour la raison du paragraphe
précédent (35 routes au lieu de 36).

## Sourcing de fond — RFQ par canal + recoupement RCS Kocosmetic (livré 2026-09-15)
- **Pack RFQ** : `docs/sourcing/RFQ_SOURCING_FOND_2026-09-15.md` — 4 nouvelles RFQ prêtes à envoyer (DECIEM/The Ordinary 10 réf · Qudo Beauty RO 18 réf K-beauty · Groupe L'Oréal 5 réf teintes profondes · IDC Institute/Aquarius ES corps/bain) + récap des canaux existants (phase 3 emails 1–10) + ordre d'envoi en 3 vagues. **0 email envoyé** (boîte + mandat + SIREN).
- **Recoupement RCS 15/09** : Kocosmetic = **BizDistribution SASU, RCS Créteil B 911 096 642, capital 50 000 €, SIRET siège 911 096 642 00028** (l'ancien …00010 d'Igny est fermé — note « Vérifié » de l'Email 4 phase 3 corrigée) → Email 4 débloqué. Get Your K-Beauty : aucune raison sociale trouvée dans les registres publics → reste « à confirmer ».
- Docs-only : aucun code touché ; les 2 registres et les 4 gardes-fous inchangés.

## Sourcing de fond — 2ᵉ passe de vérification prix + vue croisée (livré 2026-09-15)
- **2ᵉ passe** : 33 des 41 lignes « à vérifier » du 14/09 re-vérifiées sur revendeurs FR (laroche-posay.fr, redcare, boticinal, primor, idealo, amazon.fr, flaconi, holyskin, pibukare, easypara, pharmazon, kalista-parfums, ohfeliz, foliecosmetic, E.Leclerc, koreanqueens, boozyshop, e-parapharmacie, parapromos, nocibe) — statut « vérifié le 15/09/2026 — <source> ».
- **Chiffres** : **242/250 prix constatés** (contre 209) · 8 lignes sans prix (6 Torriden `peau-test-*` = couche test volontairement non listée, 1 LRP Keralys DS Gentle sans prix FR trouvé, 1 SKIN1004 Sun Stick 23 $ US seul) · min **2,48 €** · médiane **12,25 €** · **50/50 besoins ont au moins un produit sous 25 €** (45/50 le 14/09).
- **Vue croisée avant RFQ** : `docs/sourcing/VUE_CROISEE_2_REGISTRES_SOURCING_FOND_2026-09-15.md` — confronte le registre A (50 besoins × 5, `717f757` + cette passe) au registre B (15 besoins du diagnostic × 5, `ddb997f`) besoin par besoin : meilleur prix de chaque registre, canaux (DECIEM pro, Qudo Beauty RO, IDC/Aquarius ES, Ankorstore), 4 points d'harmonisation (TO officiel vs revendeur, tonique glycolique prix UK, canaux grandes marques, 0 email envoyé).
- **Zéro impact sur le travail parallèle** : registre B en lecture seule ; fiches `src-*` mode test et 4 gardes-fous inchangés. Docs-only : aucun code touché.
- **3ᵉ passe (15/09)** : #15 — Odacité Mineral Drops (52 €, premium) remplacé par **LRP Anthelios XL teinté dès 9,50 €** (oxydes de fer, teintes foncées) ; #44 — Keralys DS Gentle (4 tentatives sans prix FR) remplacé par **Uriage DS Hair 8,99 €** (boticinal, en stock) ; tonique glycolique TO : prix UK converti en FR (**13,15–14,59 €** redcare, vue croisée §3.2). **243/250 prix constatés, 7 lignes restantes, max ramené à 31,99 €.**
- **Variantes de circulation (15/09)** : `docs/sourcing/SOURCING_FOND_50_BESOINS_5_PRODUITS_2026-09-14.xlsx` (3 feuilles : 250 lignes filtrables + fournisseurs + stats/honnêteté) et `docs/sourcing/SOURCING_FOND_5_PRODUITS_PAR_BESOIN_2026-09-14.pdf` (9 pages, à imprimer/circuler) — générés depuis le CSV de référence, aucune donnée ajoutée.

## Sourcing de fond chargé au catalogue (14/09/2026)

Registre `REGISTRE_SOURCING_FOND_75_PRODUITS_2026-09-14.csv` (15 besoins × 5,
68 prix publics constatés, 7 slots ouverts) chargé en base selon la
mécanique du mode test (migration 20260926000000) :

- Couverture : 26 `src-*` + 6 `peau-test-*` existants + **10 nouvelles
  `fond-*`** (TO NMF+HA, NMF+PhytoCeramides, HA 30/60 ml, Retinol 1 %,
  Glycolic 7 %, Caffeine, Multi-Peptide+HA ; COSRX Snail 96 ; BOJ Glow
  Serum) = tous les produits identifiés du registre présents au catalogue.
- `fond-cosrx-snail` et `fond-boj-glow` portent un packshot public holyskin
  (200 vérifié) → visibles en mode test. Prix publics constatés en base
  (16,99/16,90 €) mais la projection publique reste `price: null` pour TOUTE
  fiche test : un prix constaté n'est pas un prix de vente ; le testNote
  porte le prix et sa source.
- Les 8 `fond-to-*` n'ont PAS de visuel (theordinary.com instable le
  14/09) : elles existent au catalogue (admin, gouvernance) mais ne sont pas
  test-listables (`isTestListableProduct` exige un visuel). Aucun visuel
  généré n'a été posé sur ces produits réels — proposé à l'exploitant :
  téléchargement via un autre miroir OU placeholder généré ÉTIQUETÉ comme
  tel.
- IDC Institute : aucune fiche créée — la ligne du registre est une gamme
  (0,98–4,40 €) sans référence exacte identifiée ; créer une fiche sans
  produit précis serait inventer.
- Mesuré en production : 63 fiches sans `?test=1` ; 97 avec (34 test
  visibles). Boutique réelle inchangée.
## Sourcing de fond 50 besoins × 5 produits — migration Supabase (livré 2026-09-15)

Consigne 15/09 : « je veux que le fichier soit poussé sur Github **et migré sur
supabase** ». Le registre (250 positions) est migré dans la **base de
production** `qzwgsarfdegqtfdnqiql` en s'alignant sur le schéma sourcing
EXISTANT (chantier 16) — pas de structure parallèle.

**DDL** — `supabase/migrations/20260927000000_sourcing_fond_positions.sql`,
appliquée via Management API (8 instructions, toutes vérifiées) :

- Nouvelle table `public.sourcing_fond_positions` : les 250 lignes du registre
  (1 rang = 1 produit). Colonnes : `sourcing_item_id` (FK → `sourcing_items`,
  ON DELETE CASCADE), `rang` (1-5, CHECK), `marque`, `produit`, `format`,
  `prix_constate_cents` (integer, **nullable** — NULL = « à vérifier », jamais
  une valeur supposée), `statut_prix` (statut complet daté + source),
  `fournisseur_canal`. PK `(sourcing_item_id, rang)`.
- RLS activé + 3 policies `is_admin()` (SELECT / INSERT / UPDATE) — même
  mécanisme que `suppliers` / `sourcing_items` du chantier 16 : le service role
  bypass, l'anon n'a aucun accès (fail-closed).
- `prix_constate_cents` NULLABLE : cohérent avec la discipline du chantier 16C
  « la plateforme n'invente ni un prix, ni un statut ». Les 7 lignes sans prix
  observé restent `NULL` + `statut_prix = 'à vérifier …'`.

**DML** — script de migration daté 15/09/2026 (`.tmp-imgs/migrate-fond50.mts`,
service role, **idempotent**, dry-run par défaut, `--apply` pour écrire).
`fond50.json` est généré depuis le CSV maître `docs/sourcing/SOURCING_FOND_50_BESOINS_5_PRODUITS_2026-09-14.csv`
(0 donnée ré-saisie).

Ce que le script écrit, et pourquoi :

- **50 besoins → `sourcing_items`** : ids `fond-50-n01` … `fond-50-n50`, wave
  `fond-2026-09-14`, status `to_source`, `required_documents` =
  `cpnp_notification` + `responsible_person` + `pif` (les 3 pièces bloquantes du
  plan de sourcing). Rationale = la consigne client d'origine.
- **6 fournisseurs → `suppliers`** : Kocosmetic/BizDistribution (`pending` —
  identité RCS recoupée 15/09), Get Your K-Beauty (`not_provided` — raison
  sociale à confirmer), Qudo Beauty (RO), Aquarius Cosmetic SLU (ES, marque IDC),
  Ankorstore, DECIEM (groupe The Ordinary). **Réutilisés sans écraser** :
  `sup-blacketique-sas` et `sup-eolys-beaute` (déjà créés par le chantier 16).
  « Grandes marques FR (distributeur à désigner) » : **aucune ligne** — entité
  non identifiée, ne pas inventer ; le canal reste porté par
  `fournisseur_canal` des positions.
- **250 positions → `sourcing_fond_positions`** : upsert sur `(sourcing_item_id,
  rang)`, 243 prix en centimes + 7 NULL « à vérifier ».

**Mesuré en production après `--apply`** (re-vérifié après une 2ᵉ exécution :
0 changement, idempotence confirmée) :

- `suppliers` = 16 (10 existants + 6 nouveaux).
- `sourcing_items` = 57 (7 existants `vague-1`/`peau-*` + 50 `fond-50-nXX`).
- `sourcing_fond_positions` = 250.
- Prix : n = 243, min 2,48 €, médiane 12,25 €, max 31,99 € — **identique au
  document maître** (aucune dérive de transcription).

**RFQ** — aucune `rfqs` / `rfq_responses` insérée : les 5 packs de
`docs/sourcing/RFQ_SOURCING_FOND_2026-09-15.md` peuvent brancher
`rfqs.sourcing_item_id` sur les ids `fond-50-nXX` à l'envoi. L'envoi reste
bloqué sur le mandat utilisateur (boîte + mandat + SIREN) : **0 email envoyé**,
comme avant.

**Zéro impact sur le travail parallèle** : les 10 fiches `fond-*` du catalogue
(commit `c3043e8`/`12d4f9f`), les 7 `sourcing_items` existants, les 10
`suppliers` existants et les 4 gardes-fous du dashboard sont intacts.

### Santé légère : `/api/health` ne charge plus le catalogue (14/09/2026)

Deuxième passe du chantier vitesse. `/api/health` répondait en 0,45 s, et
**ce n'était pas** le défaut du premier coup : les trois lectures étaient déjà
en `Promise.all`. La cause était `getProducts()` — cinq tables lues et les 96
produits mappés un par un avec variantes, images, stock et preuves CPNP —
**pour en afficher le nombre**.

La route est la plus sondée du site : la sonde l'appelle toutes les quinze
minutes, et `verifier-deploiement.mjs` attend sa réponse avant de sonder quoi
que ce soit d'autre. Un indicateur de santé qui coûte un chargement complet du
catalogue finit par ressembler à une charge de trafic.

`compterProduitsActifs()` demande désormais le compte à PostgreSQL
(`head: true` + `count: 'exact'`, aucune ligne ramenée). Il vit dans
`incidentStore.ts` et non dans `catalogStore.ts` pour la même raison que
`compterCommandes` : c'est un compteur de santé, et un import direct entre
deux modules de domaine créerait un cycle.

**Incohérence trouvée au passage** : la branche mémoire de `getProducts` ne
filtrait pas `is_active`, contrairement à la branche base. Le même champ
`productsCount` avait donc deux vérités — « produits » en mémoire, « produits
actifs » en production. Aligné sur la règle de la base.

**Contrat** : `productsCount` est conservé (nombre ou `null`), et `produits`
expose désormais le compte **et** sa source, comme `commandes` le fait déjà.
Règle inchangée, c'est celle du module : un compte non lu est `null`, jamais
`0`.

**Banc** `tests/kurla_sante_legere.test.ts` — la preuve que la route ne lit
plus le catalogue n'est pas une relecture de code : `serverDb.getProducts` est
remplacé par une fonction qui échoue, et `/api/health` doit répondre 200 quand
même. Si le chargement complet revient un jour, le banc rougit.

#### Mesures après déploiement (15/09/2026, 00 h 50, `a8ae022`)

`/api/health`, 15 mesures à chaud : **min 0,265 s · médiane 0,338 s · max
0,477 s**. Avant : 0,371 · 0,434 · 0,477 s — trois mesures seulement, à
prendre pour ce qu'elles valent.

Le gain est réel mais **modeste**, et l'explication est instructive : le
chargement du catalogue n'était pas tout. La route fait encore trois
allers-retours vers la base (produits, commandes, incidents), en parallèle —
donc un seul aller-retour en temps mur, soit ~0,26 s mesuré depuis
l'extérieur. Le plancher est un aller-retour, et on l'atteint.

**Conséquence, et elle n'est pas négociable : ne jamais mettre `/api/health`
en cache.** Un indicateur de santé qui répond de mémoire ne surveille plus
rien, il rassure. C'est exactement le défaut que `compterCommandes`
corrigeait le 13/09 : un `orderCount: 0` venu du cache du processus alors que
la base comptait 39 commandes.

Le champ a changé de forme sans changer de nom : `productsCount` reste un
nombre (ou `null`), et `produits` expose désormais le compte **et** sa source.
Vérifié en production : `produits = {compte: 106, source: 'base'}` — 106
produits actifs, contre 96 avant l'arrivée des dix fiches `fond-*`.

## 2026-09-14 — Vue sourcing consolidée (Agent Arena)
- Ajout : `src/lib/sourcingConsolidated.ts` (helper pur), `GET /api/admin/sourcing/consolidated` (lecture seule, requireAdmin), `SourcingConsolidatedPanel.tsx` monté dans l'onglet sourcing SKIN avant SourcingProspectsPanel.
- Vue = produits publiables (hors `unavailable`) + tous les candidats sourcing, avec prix (catalogue/constaté, sinon « à obtenir »), fournisseur, contact, e-mail prêt (RFQ existant servi tel quel, sinon généré depuis les seules données réelles ; conditions publiques constatées rappelées).
- Banc : `tests/kurla_sourcing_consolidated.test.ts` (chaîné dans `npm test` après test:prospects). Merge `a8ae022`+`419d978` résolu en gardant `test:sante-legere` ET `test:sourcing-consolidated`.
- Aucun envoi automatique : copier/mailto restent des actes humains (mandat 16C).
## Navigation : deux diagnostics nommés (Diagnostic Cheveux / Diagnostic Peau) (15/09/2026)

Consigne : « je veux qu'il ait une page diagnostic cheveux et une page diagnostic
peau. la page peau sera maintenant renommée en diagnostic peau et la page
diagnostic en diagnostic cheveux et ne contiendra que le diagnostic cheveux ».

**Ce qui change** :

- **Nav principale** (Navbar.tsx) : l'entrée « Diagnostic » devient
  **« Diagnostic Cheveux »** → `/diagnostic/cheveux` ; l'entrée « Peau » devient
  **« Diagnostic Peau »** → `/peau/diagnostic`. Libellés i18n
  (`nav.diagHair`/`nav.diagSkin`, fr + en, parité de clés vérifiée par le banc
  chantier 7.5 — 90 clés). État actif : cheveux sur toute la famille
  `/diagnostic*` (hors `/diagnostic/peau`), peau sur tout `/peau*`.
- **`/diagnostic` sert désormais directement le diagnostic cheveux**
  (routeTable : même rendu que `/diagnostic/cheveux`, qui reste l'URL canonique
  du pied de page / SEO). L'ancienne page de choix (`DiagnosticHubPage.tsx`,
  2 cartes cheveux/peau) est **supprimée** — elle n'était référencée que par la
  routeTable. `routeMeta` de `/diagnostic` aligné sur le titre diagnostic
  cheveux.
- **Le pôle peau (`/peau`) n'est pas supprimé** : le nav n'y pointe plus, mais la
  page reste accessible (pied de page `/peau/science`, « Pôle peau » dans la
  recherche, boutique, fiches peau, annuaire pro) et tout le pôle (routine,
  comparer, science, journal) est joint depuis le diagnostic peau.
- **Zéro perte d'accès aux autres diagnostics** : enfant (`/kids` →
  `/diagnostic/enfant`) et coiffures protectrices (`/protective-styles` →
  `/diagnostic/protective-style`) gardent leur CTA dans leur module de nav.
- **Non médical inchangé** : les disclaimers des pages de diagnostic sont
  intacts ; aucune donnée, aucun produit, aucun flux API touchés (317 routes
  API de l'inventaire identiques).

**Vérifié** : `npm run lint` (tsc) propre · build complet OK (110 pages
prérendues) · bancs verts : chantier-7-i18n (90 clés), c4-diagnostic-result,
parcours-peau, route-inventory (317 routes), growth-funnel, chantier-7-prerender,
chantier-7-seo, seo-dynamic, sitemap-products, diagnostic-session,
hair-advisory (15 checks), diagnostic-advisory (11 contrats) · HTML prérendu :
`/diagnostic` = H1 « Trouvez votre routine cheveux », nav « Diagnostic Cheveux
/ Diagnostic Peau » SSR'de, aucun résidu « Choisissez votre diagnostic » dans
le dist.

**Limite connue (pré-existante, pas régressée)** : le prérendu chantier 7.3 rend
le corps React avec la locale par défaut (fr) même sur les 3 routes EN — avant
ce changement les libellés de nav étaient identiques fr/en donc l'écart était
invisible. Côté client (hydratation), la nav est bien « Hair Diagnostic / Skin
Diagnostic » sur `/en/*`. À traiter par son chantier i18n, pas ici.

## Fin de diagnostic : kit de soin à emporter (fiche technique + matériel + produits indispensables) (15/09/2026)

Consigne : « au niveau du diagnostic, je veux que tu mettes également l'accès sur
les produits qu'il faut utiliser. Quand une personne demande sa routine, à la
fin cette personne doit repartir avec les informations techniques et une liste
de matériels et produits nécessaires et indispensables dans la routine et le
soin de la peau ou des cheveux ».

**Nouvelle section « 9b — Votre kit de soin — à emporter avec vous »** sur la
page de résultat (`DiagnosticResultPage.tsx`), après « Produits réels », avant
le suivi. Trois blocs :

1. **Votre fiche technique** : les seuls champs que la personne a déclarés
   (cheveux : texture, porosité, cuir chevelu, priorité, fréquence — peau :
   type, phototype si consenti, préoccupations, objectifs, sensibilité). Zéro
   déduction : rien déclaré → fiche vide (cheveux) ou ligne honnête (peau).
2. **Matériel nécessaire** : chaque outil est justifié par une étape de la
   routine générée (démêloir ↔ démêlage, microfibre ↔ séchage, vaporisateur ↔
   hydratation à l'eau, applicateur ↔ étape scalp — seulement si déclenchée,
   satin ↔ nuit en satin). Peau : la vérité — « mains propres » + note
   « aucun matériel spécial », rien d'inventé.
3. **Produits indispensables, par phase** : le TYPE de produit fait règle
   (shampoing doux, conditionneur, leave-in, scellant, coiffant, masque,
   clarifiant — nettoyant, sérum ciblé, SPF 30+ « non négociable », crème
   barrière, exfoliation conditionnelle). Quand une référence KURLA est
   publiée, elle est liée vers sa fiche ; sinon, mention honnête « aucune
   référence KURLA publiée — aucune marque n'est imposée ».

**Implémentation** :

- Nouvelle couche connaissance `src/lib/knowledge/careKit.ts` (déterministe,
  pure) : `buildHairKit` / `buildSkinKit`, branchées sur `buildDiagnosticResultModel`
  (`model.kit`). Le kit ne lit que `action` des étapes (forme `KitRoutine`
  commun aux deux pôles).
- **Matching anti-invention** : `pickProduct` teste le NOM uniquement (un
  `routineStep` descriptif « shampoo brush » ne fait pas matcher un shampoing),
  filtre par CATÉGORIE (cheveux / accessoires / peau) et par exclusions
  ciblées (le shampoing doux ne capte pas le clarifiant, le scellant ne capte
  pas le conditionneur « Shea Butter », le coiffant ne capte pas les kits…).
  Aucune référence hors catalogue, aucun prix, aucune marque : catalogue vide
  → la liste des types reste complète, sans liens.
- **Contextuel** : locks → pas de coiffant ni de scellant (dépôts) ; cuir
  chevelu normal → pas d'applicateur ; exfoliation peau seulement si la
  routine la contient (grain + tolérance + pas de focus barrière) ; SPF
  marqué « Non négociable ».

**Vérifié** : tsc propre · banc `test:care-kit` (9 blocs, dans la chaîne npm
test) · c4-diagnostic-result / hair-advisory / diagnostic-advisory /
diagnostic-session verts · build complet OK · matching validé sur le VRAI
catalogue servi (63 références) : kit cheveux = Cantu sulfate-free +
conditionneur Cantu + Knot Today + karité brut + Twisting Butter + Mielle
Rosemary Mint + Comeback Revitalizer + masque SheaMoisture + Clean Rinse
clarifiant ; kit peau (catalogue peau en phase test) = types sans liens,
zéro faux-amis.

### Copilote — les chiffres de la plateforme, sans en inventer un seul (15/09/2026)

Demandé : un copilote dans le tableau de bord d'administration, **troisième
porte** à côté de KURLA Hair et KURLA Skin, donnant « combien de personnes ont
cliqué sur le site, combien ont créé un compte ».

Deux choix arrêtés avec Hubert avant d'écrire une ligne : **panneau de
métriques déterministe** (pas d'assistant conversationnel — Gemini est
pourtant actif en production, mais un tableau de bord qui calcule ne dépend
d'aucun modèle), et **dire ce qui est à zéro en expliquant pourquoi** plutôt
que de masquer les indicateurs vides.

**Ce que la production dit, mesuré le 15/09/2026** — et c'est la seule
matière du copilote :

| | |
|---|---|
| Pages vues | 846 |
| Diagnostics démarrés / terminés | 20 / 16 |
| Inscriptions suivies | **0** |
| Ajouts au panier, passages en caisse, achats | **0** |
| Commandes en base | 39, dont **1 seule réglée** (38 en attente de webhook) |
| Comptes | 2 — ceux du fondateur |

Le tuyau d'événements, lui, fonctionne : éprouvé à la main, un `add_to_cart`
envoyé à `/api/events/funnel` arrive bien en base (puis effacé). Les zéros
sont donc **vrais** : le site a du trafic et de l'engagement sur le
diagnostic, mais aucune conversion commerciale. Le copilote le dit.

**Architecture** : `src/lib/db/copiloteStore.ts` (`lirePoulsPlateforme`),
`GET /api/admin/copilote`, `src/components/CopilotePanel.tsx`, troisième porte
et onglet dédié dans `AdminDashboardPage`. Périodes 7 / 30 / 90 jours / 1 an.

**La règle, et elle n'est pas négociable** : jamais un 0 à la place d'un
chiffre non lu. Trois états par indicateur — `mesure`, `aucun` (zéro réel,
avec une lecture qui dit ce que ce zéro signifie) et `non_mesurable`
(`valeur: null`). Les commandes `payment_pending_webhook` ne comptent jamais
comme des ventes : une session Stripe ouverte n'est pas un achat.

**Deux trouvailles en route :**

1. **L'inventaire des routes admin perdait 4 routes.** Le banc du chantier 15A
   applique son expression **ligne par ligne** : toute route enregistrée sur
   plusieurs lignes (`app.get(` seul sur la sienne) lui échappait. Quatre
   routes étaient donc hors contrôle — `conversion-funnel`,
   `launch/traction`, `strategy/cockpit` et la mienne — alors que ce banc est
   précisément celui qui vérifie que **la garde précède l'effet**. Elles
   étaient toutes correctement gardées, mais personne ne le vérifiait.
   Collecteur corrigé : **75 → 79 routes, 0 sans garde.**
2. Un défaut attrapé par le banc, pas par relecture : la lecture « 1 commande
   réglée sur 3 » n'était jamais produite, parce qu'elle lisait
   `valeur('reglees')` sur un identifiant d'indicateur qui n'existe pas — et
   obtenait donc toujours 0.

#### Copilote — mesure en production (15/09/2026, 00h06 UTC)

Exécuté contre la base de production réelle (jamais en mémoire), par le vrai
gestionnaire de route, sans créer le moindre compte :

    GET /api/admin/copilote?jours=30 -> HTTP 200
    Pages vues 858 · sessions 711 · diagnostics 16 terminés sur 22 démarrés
    comptes créés 0 (état « aucun », expliqué) · comptes existants 2
    ajouts au panier 0 · passages en caisse 0 · achats confirmés 0
    commandes en base 39, dont 1 réellement réglée · produits actifs 106
    incidents 24 h : 0

La phrase « 1 commande(s) réglée(s) sur 39 » apparaît bien : c'était le défaut
attrapé au banc, invisible à la relecture.

Deux précautions à connaître avant de mesurer quoi que ce soit soi-même :

- Le bac à sable tourne sous **Node 20**, la production exige **Node 22**
  (`engines`). Sous Node 20, le client Supabase échoue à la construction :
  « native WebSocket not found ». Ce n'est pas un défaut de l'application.
  Contournement local : `(globalThis as any).WebSocket ??= require('ws').WebSocket`.
- Sans jeton, la route répond **401** — c'est la preuve qu'elle est déployée et
  gardée. Elle a été vérifiée telle quelle sur `kurlabeauty.vercel.app`.

#### À l'attention du pôle navigation : l'intégration continue était rouge

Les deux commits précédents (`ed7b2da`, `48bd6f3`) faisaient échouer les deux
chantiers d'intégration continue. Causes, corrigées dans `f9e9642` :

1. **Photo d'inventaire des routes non régénérée.** Toute route ajoutée doit
   être déclarée dans `tests/fixtures/route_inventory.json`. La régénérer :
   `KURLA_UPDATE_FIXTURE=1 npx tsx tests/route_inventory.test.ts` (idem pour
   `tests/admin_route_inventory.test.ts`). Sans quoi la suite casse chez tout
   le monde, y compris en intégration continue.
2. **Deux routes au même titre.** `/diagnostic` et `/diagnostic/cheveux`
   servent le même écran depuis la suppression de la page de choix, et
   portaient le même titre ; le banc du routeur déclaratif le refuse à juste
   titre (signal de métadonnées restées à l'état de gabarit).

   Corrigé en donnant à `/diagnostic` un titre et une description propres.

   **Je n'ai pas tranché le fond, qui vous revient :** deux URL indexables
   publient aujourd'hui le même écran (`/diagnostic` poids 1,
   `/diagnostic/cheveux` poids 0.9). Le remède propre est une balise canonical
   ou une redirection de `/diagnostic/cheveux` vers `/diagnostic` — le routeur
   déclaratif (`src/lib/routeTable.tsx`, interface `RouteEntry`) ne sait faire
   ni l'un ni l'autre. J'ai laissé la question ouverte et commentée dans
   `src/lib/routeMeta.ts`, en gardant `/diagnostic` indexable : c'est l'URL la
   plus liée du site (bouton d'appel de la barre de navigation, hero,
   prévisualisation, retour depuis un résultat).
## Dashboard admin : navigation par sections (barre de saut + scrollspy) (15/09/2026)

Consigne : « dans le dashboard admin, rends la navigation plus intéressante et
plus fluide — dans catalogue → pilotage catalogue, il faut scroller longtemps
pour aller d'une section à l'autre. C'est la même chose pour toutes les pages. »

**Ce qui change** (tous les onglets du dashboard, hair et skin, sans refonte
des panels) :

- Nouvelle barre de saut **collante** (sous la barre de nav du site) qui se
  construit automatiquement depuis les `<h2>/<h3>` du panel actif : chaque
  section devient une chip cliquable → **saut fluide** (smooth scroll,
  `prefers-reduced-motion` respecté, atterrissage sous la barre via
  `scroll-margin-top`).
- **Scrollspy** : la section lue est surlignée pendant la lecture ; la barre
  prend une ombre quand elle est en butée (sentinelle IntersectionObserver).
- **Progression de lecture** de la page (liseré cuivre) + **bouton flottant
  retour en haut** (apparaît après 600 px).
- Seuil : moins de 3 sections détectées → la barre disparaît (pas de bruit sur
  les onglets courts). Re-scan automatique : changement d'onglet +
  MutationObserver débouncé (contenu asynchrone des panels). Ids de sections
  stables par libellé (hash) → le scrollspy survive aux re-scans.

**Fichiers** : `src/components/AdminSectionNav.tsx` (composant ; la fonction
pure `collectSections` est exportée et testée sans DOM) ·
`src/pages/AdminDashboardPage.tsx` (branchement : ref du conteneur + barre
insérée sous les onglets) · `tests/kurla_admin_section_nav.test.ts`
(`test:admin-section-nav`, dans la chaîne npm test).

**Vérifié** : tsc propre · banc `admin-section-nav` (4 blocs : détection,
stabilité des ids, visibilité/dédup/plafond 8) · bancs admin verts
(admin_dashboard, kurla_admin_role_guard) · Vite transforme le composant (200)
· /admin servi (200).

**Note pour l'agent « vue sourcing consolidée » (37a9376)** : le banc
`admin_route_inventory` est **rouge en production** (la surface d'admin a
changé sans mise à jour de l'inventaire de référence — pré-existant, vérifié
sans le WIP de cette entrée ; à trancher volontairement dans votre chantier).

## Dashboard admin : « À faire aujourd'hui » — file d'actions de l'acheteur (17/09/2026)

Consigne : « tu es l'acheteur et le fondateur : étudie le dashboard admin, surtout
catalogue et approvisionnement, pour un espace de travail agréable. Fais une
proposition, on va attaquer. » → proposition validée en **lot Phase 1 + Phase 4**
(document : `docs/PROPOSITION_ESPACE_TRAVAIL_ACHETEUR_CATALOGUE_APPRO_2026-09-15.md`,
phases 2 et 3 à suivre).

**Ce qui change** (onglet « Pilotage catalogue », les 2 workspaces, en tête de page) :

- Nouvelle section **« À faire aujourd'hui »** : 3 compteurs cliquables
  (fiches à débloquer · lots à traiter · RFQ à envoyer) + une **file priorisée**
  (commercial → physique → sourcing), chaque ligne = action + contexte + bouton
  **« Y aller »** qui mène au bon onglet **contexte présélectionné** :
  - *Débloquer* → Catalogue produits, filtre prérempli sur la fiche (publiée mais
    non listable — premier manquement nommé) ;
  - *Lot à traiter* → Lots & traçabilité, produit présélectionné dans le
    formulaire « Enregistrer un lot reçu » (demande ferme sans lot = trou de
    traçabilité) ;
  - *RFQ à envoyer* → Fournisseurs & sourcing (besoin encore `to_source`, vague
    et documents requis affichés).
- **Zéro donnée inventée** : tout est dérivé en lecture des endpoints existants
  (`publication-readiness`, `sourcing/items`, `preorder-demand`, `batches`),
  scopés par workspace. Source indisponible → file affichée **partielle** et
  l'indisponibilité est nommée. File vide → état « rien à faire » honnête.
  Plafond de lisibilité 12 lignes, compteurs complets, excédent nommé.
- **Phase 4 (soubassement)** : audit des titres — tous les panels catalogue +
  approvisionnement ont déjà des `<h2>/<h3>` réels (la nav par sections les
  couvre déjà à 100 %) ; la liste « Ce qui bloque, nommé » du cockpit passe à
  des **statuts colorés** (puce rouge + badge compteur).

**Fichiers** : `src/components/AdminActionQueue.tsx` (NEUF ; `buildActionQueue`
pure exportée) · `src/pages/AdminDashboardPage.tsx` (section de la file en tête
du cockpit + `queueNav` : tab + focus) · `CatalogAdminPanel.tsx` (props
`focusProductId`/`focusLabel` → filtre) · `BatchAdminPanel.tsx` (mêmes props →
présélection du formulaire de lot) · `OperationsCockpitPanel.tsx` (statuts
colorés) · `tests/kurla_admin_action_queue.test.ts` (`test:admin-action-queue`,
7 blocs, dans la chaîne npm test) · `tests/fixtures/admin_route_inventory.json`
(**mise à jour volontaire** du fixture — diff vérifié : +4 appelants = le nouvel
écran `AdminActionQueue.tsx` sur les routes existantes, aucun autre changement)
· `docs/PROPOSITION_ESPACE_TRAVAIL_ACHETEUR_CATALOGUE_APPRO_2026-09-15.md`.

**Vérifié** : tsc propre · banc `admin-action-queue` 7 blocs verts ·
`admin_route_inventory` PASS après régénération du fixture (diff contrôlé :
uniquement le nouvel écran + décalages de lignes dans les fichiers modifiés) ·
bancs admin_dashboard / kurla_operations_cockpit / kurla_batches /
kurla_admin_role_guard verts · les 4 endpoints de la file existants et gardés
(401 sans session) · Vite transform 200 · /admin 200.

**Note** : la note « inventaire rouge pré-existant » de l'entrée du 15/09 est
désormais caduque (corrigée en `36cedfd` par le travail parallèle, puis fixture
refigé par cette entrée avec diff vérifié). **Prochain lot** : phases 2 (fiche
produit 3 colonnes + actions groupées) puis 3 (découpage approvisionnement en
3 sous-onglets + objet « proposition d'achat ») — ne pas commencer sans GO.

## Dashboard admin : fiche produit 3 colonnes + actions groupées, approvisionnement découpé, proposition d'achat (17/09/2026)

Suite de la proposition « espace de travail acheteur » (`docs/PROPOSITION_ESPACE_TRAVAIL_ACHETEUR_CATALOGUE_APPRO_2026-09-15.md`) —
**phases 2 et 3 livrées** (la phase 1 « À faire aujourd'hui » était déjà poussée).

**Phase 2 — Catalogue produits devient un espace de travail** (`CatalogAdminPanel`) :
- **Recherche globale** : nom, marque, slug **+ INCI + ingrédients** ; compteur
  « vues/total » sur le titre.
- **Filtres rapides** (comptés sur les données réelles, jamais supposés) :
  Prêtes · Bloquées · Sans fournisseur · Test/sourcing — cumulables avec la
  recherche.
- **Actions groupées** : sélection multiple (cases par fiche, « Sélectionner la
  vue ») → barre d'actions : **rattacher un fournisseur** (PATCH partiel
  `{ supplierId }` par fiche — le store merge avec l'existant, vérifié dans
  `normalizeCatalogProductInput` ; les refus sont nommés un à un, jamais
  masqués) + **export CSV** de la sélection (RFC4180).
- **Vue 360** par fiche : une carte en 3 colonnes — *Commercial* (statut, état
  de publication, manques nommés, INCI repliable) · *Approvisionnement*
  (fournisseur, vérification, MOQ, délai, lots reçus avec coûts) · *Demande*
  (fermes, attente, à couvrir kits déroulés). Données lues sur
  `batches?productId=` + `preorder-demand` à l'ouverture.

**Phase 3 — Approvisionnement découpé + objet d'achat** :
- « Fournisseurs & sourcing » : **11 panels empilés → 3 sous-onglets** :
  *Fournisseurs* (référentiel + rattachement produits) · *Sourcing & RFQ*
  (proposition d'achat, cahier peau, tracking mails, vue consolidée, prospects,
  matrice pays) · *Logistique* (tampon A3 3PL, contacts & messages prêts,
  kitting, lot whitecast peau + **carte de renvoi vers Lots & traçabilité** —
  l'écran dédié reste dans la famille Catalogue, lien explicite). La barre de
  sections re-scanne par sous-onglet (pageKey dédié).
- **Nouvelle « Proposition d'achat — premier lot »** (`PurchaseProposalPanel`,
  tête du sous-onglet Sourcing & RFQ) : pour chaque référence à couvrir —
  demande (fermes+attente+kits) − stock = **à commander** (bornée à 0, « couvert »
  sinon), fournisseur + MOQ + délai, **coût unitaire = coût réel du dernier lot
  reçu** (sinon « à obtenir » — jamais d'estimation inventée), pièces
  manquantes lues sur l'état de publication, total estimé **complet ou
  « estimation partielle » nommé**, export CSV.

**Fichiers** : `src/components/PurchaseProposalPanel.tsx` (NEUF ; `buildPurchaseProposal`
+ `purchaseProposalToCsv` pures exportées) · `src/components/CatalogAdminPanel.tsx`
(filtres rapides, sélection, rattachement groupé, export CSV, vue 360 ; `buildProduct360`
+ `productsSelectionToCsv` pures exportées) · `src/pages/AdminDashboardPage.tsx`
(sous-onglets `supplierSub`, PurchaseProposalPanel branché, pageKey de la nav
sections) · `tests/kurla_purchase_proposal.test.ts` (7 blocs) ·
`tests/kurla_catalog_workbench.test.ts` (4 blocs) — `test:purchase-proposal` et
`test:catalog-workbench` dans la chaîne npm test · `tests/fixtures/admin_route_inventory.json`
(**mise à jour volontaire** — diff contrôlé : uniquement les nouveaux écrans comme
appelants des routes existantes + décalages de lignes dans `CatalogAdminPanel`).

**Vérifié** : tsc propre · bancs `purchase-proposal` (7) et `catalog-workbench` (4)
verts · `admin_route_inventory` PASS après régénération (diff = 2 nouveaux écrans,
aucune route ajoutée/retirée, aucun appelant perdu) · bancs admin_dashboard /
operations-cockpit / batches / catalog verts · dev server relancé (store Supabase
OK, `NODE_OPTIONS=--experimental-websocket`) · /admin 200 · les 3 nouveaux
composants transformés par Vite (200).

**Note** : l'écran « Lots & traçabilité » n'a **pas** été déplacé (décision :
renvoi explicite depuis Logistique) — la file « À faire aujourd'hui » et la
barre de sections pointent toujours vers le même onglet. Prochain chantier
possible (non demandé) : deep-link « Sourcing & RFQ » depuis la file quand une
RFQ est en retard de relance.

## Dashboard admin : relance RFQ J+3 dans la file « À faire aujourd'hui » (17/09/2026)

Suite du chantier « espace de travail acheteur » — la file d'actions passe de 3
à **4 familles** : **unblock → lot → relance → rfq** (le suivi des demandes
envoyées arrive avant le nouveau sourcing, qui est le plus long).

**Ce qui change** :

- **Nouvelle famille « RFQ à relancer »** (pastille bleue, 4ᵉ compteur) : un
  besoin en consultation (`in_rfq`) dont la **plus ancienne demande envoyée sans
  réponse** dépasse **J+3** (`RELANCE_AFTER_DAYS = 3`, exporté). Le détail
  affiche le délai exact : « 1 demande envoyée, sans réponse depuis 5 j ».
  Un besoin déjà en relance n'est pas double-compté en « à envoyer » ; un
  besoin `awarded` ou `to_source` n'y entre pas.
- **Deep link affiné** : les actions « suppliers » (relance + RFQ à envoyer)
  mènent directement sur le sous-onglet **Sourcing & RFQ** (pas le
  référentiel).
- **Mesure, pas supposition** : la route `GET /api/admin/sourcing/items`
  agrège désormais `sentAwaitingCount` + `oldestAwaitingSentOn` (RFQ `sent`
  avec date d'envoi — une « sent » sans `sentOn` ne peut pas être datée et
  n'entre pas dans le délai). Changement **additif** : aucun consommateur
  existant cassé (vérifié par les bancs sourcing/consolidated/cockpit).
- Message « Rien à faire » mis à jour (« aucune RFQ n'est sans réponse au-delà
  de J+3 »).

**Fichiers** : `src/server/routes/sourcing.ts` (agrégats de relance) ·
`src/components/AdminActionQueue.tsx` (famille `relance`, `buildActionQueue`
accepte `now` injectable pour figer les délais) · `src/pages/AdminDashboardPage.tsx`
(under-link Sourcing & RFQ) · `tests/kurla_admin_action_queue.test.ts`
(nouveau bloc 5 : seuil exact J+3, in_rfq uniquement, date injectable ; bloc
priorité à 4 familles — **8 blocs au total**).

**Vérifié** : tsc propre · banc `admin-action-queue` 8 blocs verts (dont seuil
pile : 3 j → relance, 3 j − 1 s → non) · bancs `kurla_sourcing`,
`sourcing-consolidated`, `operations-cockpit`, `admin_dashboard`,
`admin_route_inventory` verts · dev server relancé (store Supabase OK) · /admin
et le composant transformés (200).

**Note** : le **contenu** de la relance (e-mail court) reste un acte humain —
la file indique *quoi relancer et depuis quand*, l'envoi passe par les
e-mails prêts de la vue consolidée (mailto/copier), conformément au principe
« rien n'est envoyé depuis la plateforme ».

#### Mobile : le téléchargeait trois fois, et chargeait l'administration (15/09/2026)

Chantier « rendre le site plus responsive », mesuré avant de toucher au code.
Banc de mesure : Chrome mobile, iPhone (390×844), processeur ralenti 4×,
réseau « 4G lente » (1,6 Mbit/s, 150 ms d'aller-retour) — le profil de
référence de Lighthouse.

**Avant :** premier contenu peint à 1 079 ms, mais **1 486 ms de blocage**
(13 tâches longues) et **3 074 Ko décodés** au total, dont **1 813 Ko de
JavaScript**. Deux causes, mesurées :

1. **L'administration était préchargée sur toutes les pages.** `index.html`
   portait `<link rel="modulepreload">` vers le morceau `admin` : **945 Ko
   décodés (229 Ko compressés)** téléchargés et analysés sur la page
   d'accueil, y compris par des téléphones qui n'ouvriront jamais
   l'administration. La cause n'était pas un oubli de `lazy()` — la page
   l'est déjà — mais le découpage manuel dans `vite.config.ts` : forcer ces
   modules dans un morceau nommé y attirait le code partagé avec l'entrée,
   ce qui le transformait en dépendance statique. Le regroupement « admin »
   est retiré ; l'administration reste un morceau à part, chargé à la
   demande (820 Ko, plus personne ne les paie s'il ne va pas sur /admin).
2. **`GET /api/products` partait trois fois** sur la page d'accueil : le
   panier, la recherche et l'aperçu boutique appellent chacun `useProducts()`,
   et le hook déclenchait sa propre requête — trois fois 159 Ko décodés,
   soit 477 Ko de JSON à analyser, pour un catalogue identique au même
   instant. Le vol est désormais partagé (`cataloguePublicPartage`) : une
   requête, tous les appelants branchés dessus.

**Rien n'est mis en cache** : la donnée n'est pas conservée au-delà du vol,
donc la boutique ne peut pas afficher un catalogue périmé. « Rafraîchir »
reste un ordre et relance une lecture. Banc : `tests/kurla_catalogue_partage.test.ts`.

Vérifié aussi, et **déjà correct** — ne pas « corriger » : les polices Google
sont chargées de façon non bloquante (`preload as=style` + bascule par
`public/fonts.js`), la feuille de style n'existe que dans un `<noscript>`, et
la page est prérendue (2 551 mots présents dans le HTML, donc visibles avant
toute exécution de JavaScript). Aucun dépassement horizontal.

#### Mobile : mesure d'après, et ce qu'il reste (15/09/2026)

Même banc, trois passages pour tenir compte de la variance (les mesures
réseau variant d'un essai à l'autre, les octets sont la preuve stable ; les
temps sont donnés en médiane).

| | avant | après |
|---|---|---|
| Octets décodés, accueil | 3 074 Ko | **2 050 Ko** |
| dont JavaScript | 1 813 Ko | **953 Ko** |
| dont appels réseau | 528 Ko | 372 Ko |
| `GET /api/products` | 3 appels | 2 appels |
| DOMContentLoaded | 3 498 ms | **2 258 ms** |
| LCP (plus grand contenu) | 1 980 ms | 1 636 ms |
| Blocage (TBT) | 1 486 ms | ~1 350 ms |

Le téléchargement a fondu de moitié ; **le blocage du processeur, lui, n'a
quasiment pas bougé**. Ce n'est donc pas le morceau « admin » qui rendait
l'accueil lent à l'usage — c'est le coût d'hydratation de la page elle-même.

Pages intérieures, mesurées de la même façon : `/boutique` LCP 3 163 ms avec
597 ms de blocage, `/diagnostic` LCP 915 ms avec 234 ms. **Aucune page n'est
invisible** : le premier contenu est peint en moins d'une seconde partout et
2 524 mots sont présents dans le HTML dès le premier octet (prérendu). Aucun
débordement horizontal. L'accueil est la seule page lourde.

**Restent ouverts, par ordre d'effet attendu — à l'attention du pôle
interface.** Je ne les ai pas engagés seuls : ce sont des composants
d'écran, pas de l'infrastructure.

1. **Deux appels au catalogue au lieu d'un.** Le second part ~3 secondes
   après le premier : une section de l'accueil se monte une fois le vol
   terminé. Le partage ne peut rien y faire sans mise en cache, et je n'ai
   pas voulu introduire de fraîcheur sans accord — un catalogue périmé est
   pire qu'un appel de trop.
2. **La bibliothèque d'animations `motion` est dans le morceau partagé** :
   elle est donc analysée et démarrée sur toutes les pages, y compris celles
   qui n'animent rien.
3. **82 Ko de SVG en ligne** dans le HTML prérendu de l'accueil, pour un
   corps de 291 Ko : plus le DOM est gros, plus l'hydratation coûte.
4. Les tâches longues de l'accueil : 462 ms, 410 ms, 331 ms. Le navigateur
   n'a pas voulu en dire l'origine ; il faudrait une trace d'exécution pour
   nommer précisément le responsable.

#### Mobile, second passage : animations isolées, extras différés, catalogue réutilisé (15/09/2026)

Trois corrections, décidées après un profil d'exécution de l'accueil sur
téléphone (et non à l'instinct) :

1. **Les animations ne sont plus dans le morceau partagé.** `motion`
   se retrouvait dans `vendor`, donc téléchargé, analysé et démarré sur
   **toutes** les pages — y compris celles qui n'animent rien. Il a son
   propre morceau : **123,7 Ko** sortis de `vendor`, qui passe de 392,5 à
   **269 Ko**. Vérifié : le morceau n'est pas devenu une dépendance
   statique (c'est le piège qui avait transformé l'administration en
   préchargement).
2. **Les tiroirs et fenêtres globales se montent au premier temps mort du
   navigateur.** Panier, recherche, assistant et rappel de panier étaient
   en chargement différé, mais se montaient pendant l'hydratation : leur
   JavaScript s'analysait, leurs effets tournaient et le panier relançait un
   téléchargement du catalogue — en pleine mise en route de la page, donc
   en concurrence avec elle. Ils passent après. Le délai est borné à 4 s,
   avec repli sur une temporisation pour les navigateurs sans
   `requestIdleCallback` (Safari). Le panneau de récupération de mot de
   passe reste monté sans attendre : un lien reçu par courriel doit
   s'ouvrir tout de suite.
3. **Le catalogue est réutilisé pendant trente secondes.** Sans cela, la
   section de l'accueil qui se monte trois secondes après la fin du premier
   vol relançait une requête pour un catalogue déjà en mémoire : « partager
   le vol » ne servait qu'aux appelants strictement simultanés.

   **Le risque est connu et assumé :** un visiteur peut voir un catalogue
   vieux de trente secondes au plus. Aucun prix ni aucun stock n'en
   dépendent — ils sont recalculés côté serveur au panier et à la commande.
   « Rafraîchir » court-circuite la fraîcheur, ainsi que la sortie de
   session. Banc mis à jour : `tests/kurla_catalogue_partage.test.ts`.

#### Mobile :bilan mesuré après les deux passages (15/09/2026)

Accueil, médiane de trois passages, iPhone 390×844, processeur ralenti 4×,
réseau 4G lente :

| | avant | après |
|---|---|---|
| Octets décodés | 3 074 Ko | **1 903 Ko** |
| dont JavaScript | 1 813 Ko | **953 Ko** |
| dont appels réseau | 528 Ko | **217 Ko** |
| `GET /api/products` | 3 appels | **1 appel** |
| DOMContentLoaded | 3 498 ms | **1 747 ms** |
| Premier contenu peint | 1 079 ms | 892 ms |
| Blocage total | 1 486 ms | 1 331 ms |
| **dont pendant la mise en route** (avant 2 s) | ~1 486 ms | **~743 ms** |

Le point qui compte : le blocage **pendant la mise en route** a été divisé
par deux, même si le total bouge peu. Le reste du travail existe toujours —
c'est le panier, la recherche et l'assistant — mais il se fait après que la
page est utilisable, au lieu de lui passer devant.

Pages intérieures, médiane de trois passages :

- `/diagnostic` : 1 227 Ko (JS 720 Ko), premier contenu à 872 ms, **197 ms
  de blocage**.
- `/boutique` : 1 343 Ko (JS 803 Ko), premier contenu à 837 ms, **773 ms de
  blocage** — c'est la deuxième page la plus lourde, après l'accueil.

**Honnêteté sur les mesures :** les octets et le nombre d'appels sont
reproductibles au Ko près ; les temps, eux, varient d'un passage à l'autre
(jusqu'à 2 secondes d'écart sur le LCP de `/boutique`). Les temps des pages
intérieures « avant » ne reposaient que sur un passage : je ne les compare
donc pas, seul l'allègement (JavaScript 927 → 803 Ko sur `/boutique`,
844 → 720 Ko sur `/diagnostic`) est établi.

**Ce qui reste, et c'est le fond du sujet :** l'accueil bloque encore
~743 ms au démarrage. Ce n'est plus un problème de téléchargement — la page
reçoit deux fois moins de données — c'est le coût d'hydratation d'un DOM de
290 Ko contenant **82 Ko de SVG en ligne**, animé par `motion`. Réduire
cela demande de reprendre les sections d'écran elles-mêmes : ce n'est plus
de l'infrastructure, et je ne l'engage pas seul.

Piste chiffrée pour qui voudra continuer : le morceau `supabase` (206 Ko)
est chargé sur `/boutique` pour l'authentification, alors que la session n'est
nécessaire qu'après le premier affichage. Le rendre paresseux allégerait
cette page d'autant — sous réserve que rien n'attende la session au montage.
