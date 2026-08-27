# KURLA — DÉCOUPAGE EN 8 CHANTIERS

> **Date :** 27 août 2026 · **Base :** commit `d72faee` + travaux en cours
> **Règle de découpage :** chaque chantier est livrable seul, testable seul, et ne dépend que des chantiers de rang inférieur.
> **Statut légende :** ✅ livré et testé · 🔶 en cours · ⬜ à faire
>
> **Avancement :** chantiers 1 à 5 livrés · écrans Shelf & Wash Day OS livrés · **chantier A livré** · chantiers 6 à 8 à faire
>
> **⚠️ Complété le 27 août 2026 par [`KURLA_PLAN_COUVERTURE.md`](./KURLA_PLAN_COUVERTURE.md)**, qui garantit la traçabilité des 20 actions, des 50 fonctionnalités et des innovations. Ce document de couverture **insère un nouveau chantier A (« Fermer les trous ») avant l'ancien chantier 6**, parce que cinq briques testées ne sont branchées sur aucune API ni aucun écran.
>
> **Correspondance :** chantiers 1–5 → « Déjà livré » · chantier 6 → **B** · chantier 7 → **C** (SEO/SSR) + **D** (international) · chantier 8 → **E** (rétention) + **F** (B2B) + **G** (architecture). Le chantier **A** est nouveau.

---

## CHANTIER 1 — CONFORMITÉ & INTÉGRITÉ ✅

**Objectif :** supprimer les risques immédiats avant d'ajouter quoi que ce soit.

| Action | Ce qui a été fait | Fichier |
|---|---|---|
| 1 | Disclosure IA conforme à l'article 50(1) du règlement (UE) 2024/1689, applicable depuis le 2 août 2026 : bandeau explicite dans l'UI, marquage sous chaque réponse, champ `aiDisclosure` renvoyé par l'API, endpoint `/api/ai/disclosure` | `guardrails.ts`, `server.ts`, `AiBeautyAssistantPage.tsx` |
| 2 | Suppression de `MOCK_PROS` du parcours public. Nouveau endpoint `GET /api/professionals` qui ne renvoie que les candidatures approuvées, sans email ni téléphone. État vide honnête plutôt que faux profils | `ProfessionalsPage.tsx`, `serverDb.ts`, `server.ts` |
| 3 | Suppression du « Soin Detox Bicarbonate/Vinaigre » vendu par un pro `verified: true` · « Sérums éclaircissants » → « Sérums anti-taches et unifiants » | `mockData.ts`, `HairSkinSection.tsx` |
| 17 | Triage médical unifié. Les deux listes divergentes sont remplacées par une correspondance **par racines** dans `AI_GUARDRAILS.triage()`. Le test prouve que « je n'arrive plus à respirer » et « j'ai la gorge qui gonfle » déclenchent désormais l'urgence — ce n'était pas le cas avant | `guardrails.ts`, `server.ts` |

**Deux vrais bugs trouvés par les tests pendant ce chantier :**
- « mes cheveux tombent par poignées » ne déclenchait aucune alerte → racines `cheveux qui tombent`, `par poignees` ajoutées.
- L'annuaire affichait de faux avis à 4,98 sur des personnes inexistantes.

---

## CHANTIER 2 — FONDATION DU GRAPHE DE CONNAISSANCES ✅

**Objectif :** lever l'impossibilité n°1. Les ingrédients cessent d'être des `TEXT[]` libres.

Migration `20260845000000_kurla_intelligence_foundation.sql` — 14 nouvelles tables :

| Groupe | Tables | Rôle |
|---|---|---|
| Graphe | `ingredients`, `product_ingredients`, `ingredient_evidence`, `ingredient_incompatibilities`, `ingredient_jurisdiction_restrictions` | L'ingrédient devient une entité avec rang INCI, fonction, niveau de preuve A-D, incompatibilités et statut par juridiction |
| Taxonomie | `kurla_taxonomies`, `kurla_taxonomy_terms` | Vocabulaire contrôlé, remplace les `TEXT[]` libres |
| Archétypes | `archetypes`, `user_archetypes` | Cohortes avec seuil de k-anonymité |
| Données utilisateur | `user_products` (Shelf), `outcome_observations`, `protective_style_episodes` | Le dossier réel |
| Agrégats | `ingredient_archetype_outcomes` | **Le MOAT** : efficacité par ingrédient × archétype × climat |
| Confiance | `professional_endorsements` | Co-signature |

**Garde-fous encodés dans le schéma, pas seulement dans le code :**
- un agrégat n'est publiable que si `observation_count >= k_anonymity_threshold` ;
- une observation partagée ne peut pas conserver de note libre (`is_consent_shared = FALSE OR note IS NULL`) ;
- un abandon exige un motif (`status <> 'abandoned' OR abandonment_reason IS NOT NULL`) ;
- une co-signature publique exige le consentement horodaté du client ;
- RLS activée sur les 14 tables, les observations individuelles ne sont jamais lisibles par un tiers.

---

## CHANTIER 3 — COUCHE D'INTELLIGENCE (LOGIQUE PURE) ✅

**Objectif :** les sept briques différenciantes, en TypeScript pur donc testable sans Supabase.

| Module | Lignes | Ce qu'il fait |
|---|---|---|
| `ingredientGraph.ts` | 260 | Normalisation INCI, résolution d'entité, meilleure preuve **transposable** (une preuve obtenue sur peau claire est rétrogradée, jamais présentée comme équivalente), détection de conflit, filtrage par juridiction, doublons fonctionnels |
| `archetype.ts` | 210 | Dérivation en 6 bandes, confiance proportionnelle aux champs connus, garde-fou k-anonymité, repli progressif qui ne relâche jamais la texture |
| `shelf.ts` | 250 | **KURLA Shelf** : couverture fonctionnelle, lacunes, surplus, verdict d'achat capable de dire « vous n'avez rien à acheter », motifs d'abandon, ingrédients à écarter (≥ 2 occurrences), réassort prédictif |
| `washDay.ts` | 250 | **Wash Day OS** : routine par cycle et non AM/PM, pré-poo conditionnel, soin protéiné à fréquence propre, tâches quotidiennes minimales, chaque tâche porte sa raison |
| `protectiveStyle.ts` | 220 | **Timeline protectrice** : âge × tension, signaux d'escalation, historique cumulé, protocole de récupération sans promesse de repousse |
| `outcomeEvidence.ts` | 250 | **Le MOAT** : agrégation avec filtre de consentement, seuil k, lecture qui dit « je ne sais pas encore », note par archétype |
| `returnInsight.ts` | 150 | **Intelligence des retours** : motifs informatifs vs logistiques, concentration par archétype, alerte catalogue |
| `proEndorsement.ts` | 160 | **Co-signature** : règles d'affichage, taux d'accord IA/pro avec seuil d'échantillon, une contradiction prime sur l'IA et remonte comme signal de correction |

**Tests :** `tests/kurla_intelligence.test.ts` — ~120 assertions, toutes vertes.

---

## CHANTIER 4 — PERSISTANCE & API ✅

**Objectif :** exposer la couche d'intelligence. Volontairement dans un store séparé, pas dans `serverDb.ts` (6 124 lignes).

`src/lib/intelligenceStore.ts` — contrat identique au reste du projet : Supabase quand configuré, mémoire explicite sinon — jamais un mode à moitié autorisé.

**Endpoints ajoutés :**

| Endpoint | Usage |
|---|---|
| `GET/POST/PATCH/DELETE /api/shelf` | Inventaire personnel |
| `POST /api/shelf/verdict` | Verdict d'achat + lacunes + surplus + ingrédients à écarter |
| `GET /api/me/archetype` | Archétype courant + état de la cohorte |
| `POST /api/outcomes` | Observation de résultat (la boucle d'apprentissage) |
| `GET /api/outcomes` | Historique |
| `GET /api/ingredients/:id/evidence` | Efficacité par archétype, ou « je ne sais pas encore » |
| `GET/POST /api/protective-styles` | Timeline + évaluation de risque + historique |
| `POST /api/protective-styles/:id/signals` | Signal + protocole de récupération |
| `POST /api/protective-styles/:id/close` | Clôture |

**Validations encodées côté serveur, pas côté client :**
- un article sans produit ni libellé est refusé ;
- un abandon sans motif est refusé ;
- un signal hors taxonomie est refusé ;
- la valence est **dérivée** du signal, jamais fournie par le client ;
- une observation partagée avec note libre est refusée ;
- un pourcentage hors borne est borné, pas accepté tel quel.

---

## CHANTIER 5 — MOTEUR DE RECOMMANDATION v2 ✅

**Objectif :** brancher la boucle. C'est ce qui transforme la collecte de données en intelligence.

| Module | Ce qu'il fait |
|---|---|
| `recommendationEngine.ts` | Moteur **hybride** : les règles explicables de `calculateKurlaFit` sont conservées en surface, les pondérations apprises depuis `outcome_observations` s'appliquent en dessous. Chaque ajustement porte un `delta`, une raison et l'`evidenceId` de l'observation qui l'a provoqué |
| `semanticSearch.ts` | Parseur d'intention nommée (besoins, textures, carnations, étapes, catégories, budget, sans-parfum) avec liste `unresolved` : ce qui n'est pas compris est signalé, jamais deviné |
| `routineBuilder.ts` | Routine par étapes justifiées, étape déjà couverte non vendue, étape non pourvue déclarée plutôt que remplie au hasard, substitution d'un maillon sans reconstruire l'ensemble |

**Règles encodées :**
- un produit possédé et encore utilisable **n'est pas recommandé** ; il redevient recommandable sous 20 % restant ;
- une troisième étape identique ouverte est pénalisée, pas proposée en tête ;
- un ingrédient écarté d'après les abandons exclut le produit ;
- une pondération apprise ne s'applique qu'à partir de **2 observations** — une seule est du bruit ;
- une pondération apprise **réordonne, elle n'autorise pas** : elle ne lève jamais une exclusion de sécurité ;
- un rendement non déclaré produit `monthlyCost: null` avec limitation explicite, jamais un coût inventé ;
- les conflits sont détectés dans le panier recommandé, pas seulement dans une formule.

**Endpoints :** `POST /api/recommendations` (avec `learning[]` citant les observations sources), `GET /api/search`, `POST /api/routine-builder`.

**Critère de sortie — atteint et testé :** `tests/recommendation_engine.test.ts` prouve que deux retours défavorables sur la glycérine font passer le produit karité devant, et que `explainLearning()` cite les `obs-1` / `obs-2` responsables. Le même test prouve qu'**une seule** observation ne modifie rien.

---

## ÉCRANS — SHELF & WASH DAY OS ✅

**Objectif :** sans interface, les chantiers 2 à 5 ne collectent aucune donnée réelle et le MOAT ne démarre pas. C'était le goulot.

| Écran | Route | Ce qu'il fait |
|---|---|---|
| `ShelfPage.tsx` | `/account/shelf` | Inventaire groupé par étape, verdict d'achat mis en avant **même quand il dit « tu n'as rien à acheter »**, surplus affiché plutôt que masqué, abandon à motif obligatoire, modale d'observation qui ouvre la boucle d'apprentissage, motifs d'abandon agrégés |
| `WashDayPage.tsx` | `/account/wash-day` | Compte à rebours du cycle, étapes numérotées avec leur raison, adaptations expliquées, quotidien volontairement minimal, timeline de coiffure protectrice avec signaux déclarables, configuration du cycle (soin protéiné désactivable) |

**Nouveaux endpoints :** `GET/PUT /api/wash-day`, `POST /api/wash-day/mark-done`.
**Nouvelle migration :** `20260846000000_wash_day_cycle.sql` (RLS activée, `protein_every_n_wash_days` nullable — `NULL` signifie « désactivé », pas « inconnu »).
**Service client :** `src/services/intelligenceService.ts`.
**Navigation :** les deux écrans sont accessibles depuis le menu compte, desktop et mobile.

**Partis pris d'interface, pas décoratifs :**
- le motif d'abandon est `required` dans le formulaire : sans lui, l'information est perdue ;
- le consentement au partage des observations est une case séparée, avec le texte exact de ce qu'il change ;
- un wash day « en retard » n'est pas affiché comme un échec, avec l'explication ;
- chaque tâche affiche sa raison, sinon la routine ne sera pas suivie.

**Vérification en conditions réelles** (serveur démarré sur `0.0.0.0:3000`) :

| Contrôle | Résultat |
|---|---|
| `GET /account/shelf`, `/account/wash-day` | 200 |
| `GET /api/ai/disclosure` | disclosure IA complète |
| `GET /api/professionals` | `{"professionals":[],"total":0}` — annuaire vide honnête, plus de faux profils |
| `POST /api/recommendations`, `/api/routine-builder`, `/api/shelf`, `/api/outcomes`, `/api/protective-styles`, `PUT /api/wash-day` sans token | **401** sur les six |

**Un point préexistant repéré au passage :** le catch-all SPA renvoie `index.html` en 200 pour toute route `GET /api/*` inconnue (`GET /api/zzz-inexistant` → 200 HTML). Ce n'est pas une faille d'autorisation — toutes les routes réelles vérifient le token — mais un client qui se trompe de méthode reçoit du HTML au lieu d'un 404 JSON. À traiter dans le chantier 8.

---

## CHANTIER A — FERMER LES TROUS ✅

> **Inséré après coup.** Le plan initial en 8 chantiers ne prévoyait pas cette étape.
> Un audit a montré que cinq fonctions pures étaient testées mais **appelées par
> rien** : `computeArchetypeRating`, `evaluateReplenishment`, `checkJurisdiction`,
> `summarizeReturnInsights`, `handleContradiction`. Elles donnaient un faux
> sentiment d'avancement. Ce chantier les branche toutes.

| Tâche | Fonctionnalité | Fichier |
|---|---|---|
| Note par archétype branchée | 9 / action 12 | `intelligenceStore.getArchetypeRatingsForProduct`, `GET /api/products/:id/archetype-ratings` |
| Réassort prédictif branché + notifications | 16 / action 19 | `intelligenceStore.evaluateShelfReplenishment`, `GET /api/shelf/replenishment` |
| Intelligence des retours branchée | 17 | `recordReturnInsight`, `POST /api/returns/:id/insight`, `GET /api/admin/return-insights/:id` |
| Filtrage par juridiction branché | 21 | `assessJurisdiction`, `POST /api/jurisdiction/assess` |
| Co-signature professionnelle branchée | 24 / action 20 | `createEndorsement`, `applyProfessionalJudgement`, 4 routes |
| **Export RGPD en 1 clic** | 43 / action 9 | `GET /api/me/data` |
| **Suppression RGPD en 1 clic** | 43 / action 9 | `DELETE /api/account` |
| Écran de recherche sémantique | 13 | `src/pages/SmartSearchPage.tsx`, route `/recherche` |
| Écran Routine Builder + conflits affichés | 15, 14 | `src/pages/RoutineBuilderPage.tsx`, route `/routine-builder` |
| Humidité et événements transmis au wash day | 36 | `server.ts` — `humidityPercent` + `events` |
| Purge des données fictives | 5 / action 2 | 4 fichiers corrigés |
| Vocabulaires contrôlés alimentés | 2 / action 6 | migration `20260847000000_kurla_taxonomy_terms.sql` |

### Décisions d'interface prises dans ce chantier

- **La suppression exige `{ "confirm": "SUPPRIMER" }`** et déclare ce qui est conservé (commandes, factures) avec la raison légale, plutôt que de laisser croire que tout disparaît.
- **Un avis d'utilisateur sans archétype déclaré n'est rattaché à aucun archétype.** KURLA ne devine pas la texture d'un avisant. Le chemin Supabase applique la même règle par jointure.
- **Le motif de retour est obligatoire** et contraint au vocabulaire `RETURN_INSIGHT_REASONS` : un retour non motivé n'est pas exploitable.
- **Le consentement au partage d'un retour n'est jamais présumé** (`shared === true` explicite).
- **Un professionnel non vérifié ne peut pas co-signer publiquement** : sinon l'espace devient publicitaire.
- **Ce que le parseur de recherche n'a pas compris est affiché**, jamais ignoré en silence.
- **Les conflits d'ingrédients sont affichés avant le panier**, pas après l'achat.
- **Un mur UGC vide est un actif** : plutôt que de remplacer les quatre témoignages inventés par d'autres, la section déclare son état.

### Purge des données fictives — ce qui a été corrigé, et ce qui ne devait pas l'être

L'audit initial comptait « 14 fichiers sur `mockData` ». **C'était trompeur** : 10 d'entre eux n'importent que des URLs d'images Unsplash (`HERO_IMAGE`, `TEXTURE_GALLERY`…), qui ne sont pas des données fictives. Les purger aurait été une erreur.

| Fichier | Contenu réel | Action |
|---|---|---|
| `UgcWallSection.tsx` | 4 témoignages inventés (noms, villes, likes) | Réécrit — section vide assumée |
| `ProProfilePage.tsx` | Profil inventé + adresse réelle à Paris + note 4,95/38 avis + 2 avis clients codés en dur | Réécrit sur l'annuaire réel |
| `KurlaProSection.tsx` | Grille de 4 pros fictifs avec notes | Branchée sur `/api/professionals` |
| `ConsultationBookingModal.tsx` | **Réservation de professionnels inexistants** | Branché sur `/api/professionals` |
| 10 autres fichiers | URLs d'images uniquement | **Conservés** — pas des données fictives |

Le cas le plus grave était le modal de réservation : il engageait l'utilisateur dans un rendez-vous avec quelqu'un qui n'existe pas.

### Migration des vocabulaires

Les tables `kurla_taxonomies` et `kurla_taxonomy_terms` existaient depuis `20260845` avec **zéro ligne**. La migration `20260847` les remplit avec les valeurs réellement utilisées dans `kurlaFit.ts`, `semanticSearch.ts` et `shelf.ts` — **aucun terme inventé**.

Deux décisions de gouvernance :
- `cuir_chevelu` et `apaiser_cuir_chevelu` désignent le même besoin. Les deux codes sont conservés pour ne rien casser, mais la synonymie est **rendue explicite** par `parent_term_id` plutôt que masquée.
- `'other'` est **exclu** du vocabulaire des étapes : une taxonomie avec une case « autre » libre redevient une chaîne libre.
- Un garde-fou SQL fait **échouer la migration** si une taxonomie reste sans terme actif.

### Vérification

| Vérification | Résultat |
|---|---|
| `tsc --noEmit` | **exit 0** |
| `npm test` (suite complète) | **exit 0** |
| `tests/chantier_a_wiring.test.ts` | **PASS** — branché dans `npm test` via `test:chantier-a` |
| Les 7 routes protégées, sans token | **401** sur les sept, méthode explicite à chaque fois |
| Les 5 routes publiques | **200** avec JSON réel, pas le HTML du catch-all |
| `POST /api/jurisdiction/assess` sans juridiction | **400** |
| `/recherche`, `/routine-builder` | **200** |
| Preuve de délégation | Le store est comparé à l'appel direct de chaque fonction pure : mêmes résultats, donc pas de copie |

Le test vérifie le **branchement**, pas la logique pure (déjà testée ailleurs). Chaque assertion passe par `intelligenceStore`, le vrai chemin de production.

### Passifs ouverts, déclarés

- ~~**0/17 vérifications RLS** — aucune instance Supabase réelle ici.~~
  **LEVÉ** : `npm run test:integration` passe contre l'instance réelle (projet `qzwgsarfdegqtfdnqiql`, eu-west-1).
- **Aucune vérification visuelle/navigateur** des deux nouveaux écrans : vérifiés par compilation, tests de câblage et HTTP 200, pas par rendu.
- **`GET /api/*` sur route inconnue renvoie encore du HTML 200** — vérifié ce jour (`content-type: text/html`). Catch-all SPA, pas une faille d'autorisation. Corrigé en chantier G.
- ~~**La migration `20260847` n'a pas été exécutée** contre une base réelle.~~
  **LEVÉ** : appliquée, enregistrée dans `supabase_migrations.schema_migrations`.

---

## CHANTIER B — CONFIANCE, PROS & ÉCOSYSTÈME ✅ (livré et vérifié contre la base réelle)

**Critère de sortie visé :** au moins un professionnel vérifié, réservable et payable, capable de
co-signer ; une page ingrédient publique et indexable.

**Le second est atteint et vérifié. Le premier est livré dans le code mais pas démontré** : la
chaîne réservation → paiement → co-signature existe de bout en bout, mais aucune clé Stripe ni
instance Supabase n'est configurée ici, donc aucun professionnel réel n'a pu être vérifié, réservé
ni payé. Le critère est satisfait structurellement, pas empiriquement.

### Livré

**Logique pure** (aucune dépendance Supabase, testée unitairement) :

- `src/lib/professionalTrust.ts` — Trust Score. Poids sommant à 100 : identité vérifiée 30 ·
  qualification au dossier 25 · charte signée 15 · avis issus de prestations réelles 20 · accord
  avec les recommandations de l'IA 10. Seuils : `MINIMUM_REVIEWS_FOR_RATING = 5`,
  `MINIMUM_ENDORSEMENTS_FOR_RATE = 10`. En dessous, la valeur est `null` et la raison de suppression
  est retournée — jamais 0. `publishable` dépend de l'identité seule (condition d'entrée, pas une
  composante) : on peut être vérifié sans avis, l'inverse jamais. Chaque composante est restituée
  avec son état et une phrase lisible, y compris celles qui manquent.
- `src/lib/routineEconomics.ts` — simulateur de coût annuel et comparateur. Rendement non déclaré →
  `null` + limitation, jamais une estimation ; un total partiel est annoncé comme partiel
  (« Au moins X € ») et non comme un total. Le comparateur porte sur le coût et le temps, les deux
  seules dimensions comparables sans juger de l'efficacité.

**Persistance** : `src/lib/professionalStore.ts` (singleton, Supabase sinon mémoire) et
`supabase/migrations/20260848000000_professional_trust_booking.sql` — 6 tables, 1 vue, RLS.
`professional_profiles` est distinct de `professional_applications` : une candidature est de
l'historique, un profil est un état courant. `service_payments` est distinct de `payments` parce que
`payments.order_id` est `NOT NULL REFERENCES orders` — le rendre nullable aurait affaibli tous les
paiements produits existants. `professional_reviews` porte `UNIQUE (appointment_id)` et
`service_delivered` : seuls les avis rattachés à une prestation effectuée comptent, ce qui est la
seule façon d'empêcher une moyenne achetable. `client_dossier_shares` énumère des périmètres
(`scope_beauty_profile|shelf|outcomes|protective_styles`) — « tout le dossier » n'existe pas.

**13 routes** : annuaire vérifié public · Trust Score détaillé · prestations · réservation ·
statut de réservation · avis · partage de dossier (accorder / lister / révoquer) · accès pro au
dossier consenti · vérification d'identité (admin) · fiche ingrédient publique · simulation de coût ·
comparaison de routines.

**3 écrans** : `IngredientCardPage.tsx` (publique, sans authentification, donc indexable),
`ProfessionalDirectoryPage.tsx`, `CostSimulatorPage.tsx`. Routes `/ingredient/:id` et
`/pros-verifies` publiques, `/cout-routine` protégée ; liens ajoutés à la navigation.

**Test** : `tests/chantier_b_professional.test.ts` — 14 blocs, câblé dans `npm test`.

### Correction importante faite dans ce chantier

Les interfaces client et deux écrans avaient d'abord été écrits contre **une API inventée**. `tsc`
passait à 0 parce que `request<T>()` fait confiance à l'annotation : des types cohérents mais faux
des deux côtés compilent parfaitement, et les écrans auraient affiché `undefined` en production.
Corrigé en **important les types réels** des modules purs (`import type`, effacé à la compilation,
donc aucun runtime Node dans le bundle). Toute dérive future est désormais une erreur de
compilation, plus un bug silencieux. C'est le test unitaire qui a révélé l'écart, pas le
compilateur.

### Complété après le premier rapport

Le premier rapport de ce chantier déclarait le paiement et la co-signature non livrés. Ils le sont
désormais :

- **Paiement de prestation** — `ServicePayment` + 4 méthodes dans `professionalStore.ts`, 3 routes
  (`POST /api/appointments/:id/checkout`, `POST /api/service-payments/:id/confirm`,
  `GET /api/appointments/:id/payments`), écran `MyAppointmentsPage.tsx` sur `/mes-reservations`.
  **Session de Checkout et non PaymentIntent** : le projet n'embarque ni `@stripe/stripe-js` ni
  `@stripe/react-stripe-js`, donc un `client_secret` aurait été inutilisable côté client. On suit le
  pattern du checkout produit (redirection hébergée) plutôt que d'inventer une intégration Elements
  impossible à terminer. Le statut de paiement est **relu chez Stripe** avant confirmation : le
  retour `?paid=1` n'est jamais traité comme une preuve.
- **Co-signature dans l'UI** — `GET /api/me/endorsements` + panneau `EndorsementPanel` dans
  `RoutineBuilderPage.tsx`. Une co-signature non affichable (pro non vérifié ou consentement absent)
  n'est pas montrée et la raison est dite ; une contradiction est mise en avant, pas noyée.

**Test étendu** : 6 blocs supplémentaires sur le chemin mémoire du paiement — montant invalide
refusé, idempotence par clé (un rejeu ne crée pas un second paiement), retrouver par PaymentIntent,
confirmation idempotente (`paidAt` non re-daté), paiement inconnu → `undefined` sans exception, deux
prestations distinctes séparées.

### Compléments livrés après coup

- [x] **Note par archétype sur la fiche produit** (`ArchetypeRatingsPanel`) : la route et la fonction
      cliente existaient déjà, seule la surface manquait. Les cohortes sous le seuil de k-anonymat
      sont annoncées comme masquées, jamais moyennées.
- [x] **Vérification publique de la fiche** (`GET /api/products/:id/verification` +
      `ProductVerificationPanel`). Voir la limite ci-dessous : elle est structurellement constante.
- [x] **Intelligence des retours dans l'admin catalogue** (`CatalogAdminPanel`) : bouton par fiche,
      raisons dominantes, cohortes concernées, signalement catalogue et limites affichés ensemble.
- [x] **Badge de transparence IA** (`AiDisclosureBadge`, fonctionnalité 44) : ajouté au widget
      d'assistance flottant, qui était un point d'interaction générative sans disclosure — écart
      au regard de l'article 50(1), applicable depuis le 2 août 2026.
- [x] **Timeline de coiffure protectrice** (`/account/protective-timeline`) : écran dédié, relié aux
      routes existantes, avec signaux d'escalade orientant vers un professionnel.
- [x] **Espace professionnel sur données réelles** (`/api/professional/me` + `ProDashboardPage`
      réécrit) : la page affichait un studio inventé, une note « 4,9/5 sur 38 avis vérifiés » et trois
      clientes fictives. Contenu fabriqué supprimé, pas maquillé.
- [x] **Lecteur de dossier côté pro** : route `GET /api/professional/dossier-shares` + ouverture du
      dossier dans le périmètre consenti, champ par champ.

### Non livré, assumé

- [ ] **Paiement jamais exercé contre Stripe** : aucune clé sur cet environnement. La branche 503
      est vérifiée par sonde HTTP ; le chemin nominal ne l'est pas.
- [ ] **Suite unitaire complète contre une base réelle** : elle n'a pas vocation à exister telle
      quelle. Voir « Liaison des stores » ci-dessous.

### Limites assumées des compléments

- **La vérification publique est constante par construction.** `isPublishableProduct` exige déjà les
  7 statuts à `verified` pour qu'une fiche soit visible. Toute fiche publique affiche donc 7/7. Ce
  n'est pas un bug : le badge est une garantie, pas une note variable. Il ne deviendra discriminant
  que si le gate de publication est assoupli.
- **La « note de confiance produit » n'a pas été transformée en score chiffré.** Le code porte une
  règle explicite : les décisions de gouvernance ne sont pas renvoyées comme métadonnées client.
  Publier un score dérivé de ces statuts l'aurait contredite. Seuls des booléens par contrôle sont
  exposés — ni statut brut, ni note interne, ni URL de preuve, ni identité du validateur.

### Liaison des stores : cause racine du « suite unitaire non verte »

Le problème n'était pas les trois identifiants en dur, c'était la **liaison implicite** : la présence
de `SUPABASE_URL` + d'une clé secrète basculait tous les stores sur la base réelle. `npm test` passait
donc sur une machine et échouait sur une autre.

`KURLA_STORE_MODE` rend le choix explicite (`memory` / `server` / `auto`) et couvre le client public
autant que le store serveur. Tous les bancs unitaires forcent `memory` ; `tests/store_binding.test.ts`
verrouille le comportement. `npm run test:realdb` enchaîne les bancs réellement conçus pour une base
réelle, précédés d'une pré-vérification qui refuse de tourner en silence sur le repli mémoire.

### Passifs ouverts, déclarés

- ~~**La migration `20260848` n'a pas été exécutée** contre une base réelle.~~
      **LEVÉ** : les 6 tables existent, la vue `professional_dossier_access` est en
      `security_invoker=true`.
- ~~**0/17 vérifications RLS** toujours.~~ **LEVÉ** : `test:integration` PASS contre l'instance
      réelle — comptes A/B isolés, ressources privées protégées, rôle admin vérifié.
- **Aucune vérification visuelle/navigateur** des écrans : vérifiés par compilation, test unitaire et
      HTTP, pas par rendu.
- **Déploiement non vérifié sur Vercel** : `api/index.ts` + `vercel.json` sont en place et le handler
      est vérifié localement derrière un `http.Server`, mais la sémantique de réécriture propre à
      Vercel n'a pas pu être exercée ici.

---

## CHANTIER 7 — SEO, SSR & INTERNATIONALISATION ⬜

**Le chantier le plus coûteux, donc à décider tôt.** Aujourd'hui : 1 URL indexable.

- [ ] Rendu serveur ou prérendu (action 8)
- [ ] Vrai routeur à la place de la cascade de `if (pathname === ...)`
- [ ] Métadonnées par page, sitemap, robots, hreflang, Open Graph
- [ ] Pages générées depuis le graphe : ingrédient × problème × texture × ville (action 37)
- [ ] Fiches ingrédient publiques
- [ ] i18n + devises + TVA
- [ ] Filtrage réglementaire par juridiction via `ingredient_jurisdiction_restrictions`

---

## CHANTIER 8 — ARCHITECTURE, RÉTENTION & B2B ⬜

- [ ] Découpage de `server.ts` (2 875 lignes) et `serverDb.ts` (6 124 lignes) par domaine (actions 18, 45)
- [x] ~~Tests Supabase réels A/B : 17 vérifications Phase 2 à 0 exécution~~ **LEVÉ** (action 46)
- [ ] Loyalty par progression + récompense des comportements non-marchands (scan, avis, feedback)
- [ ] Beauty Journey : narration de l'évolution
- [ ] Abonnement KURLA+
- [ ] KURLA Intelligence B2B : Texture Gap Report, agrégats uniquement
- [ ] Application mobile

---

## CE QUI RESTE HORS PÉRIMÈTRE, VOLONTAIREMENT

- **Virtual try-on maquillage** : hors cœur de métier, coût élevé, aucun avantage.
- **Réseau social** : la communauté doit rester un sous-produit de la donnée (cohortes k-anonymes), pas un fil d'actualité.
- **Marque propre** : pas avant d'avoir établi la neutralité comme actif. C'est le conflit d'intérêt structurel de Proven.
- **Diagnostic médical par photo** : ni techniquement fiable, ni juridiquement tenable. Aide beauté uniquement.

---

## ÉTAT DE VÉRIFICATION

| Vérification | Résultat |
|---|---|
| `tsc --noEmit` | exit 0 |
| `tests/kurla_intelligence.test.ts` | PASS — ~120 assertions |
| `tests/recommendation_engine.test.ts` | PASS — moteur v2, recherche sémantique, routine builder |
| `tests/chantier_a_wiring.test.ts` | PASS — les cinq branchements, RGPD, écrans, purge, vocabulaires |
| `tests/chantier_b_professional.test.ts` | PASS — 14 blocs : Trust Score (poids, seuils, null assumé), économie de routine (rendement absent, total partiel, comparateur) |
| `tests/chantier_b_professional.test.ts` — bloc paiement | PASS — 6 blocs sur le chemin mémoire : montant invalide refusé, idempotence par clé, retrouver par intent, confirmation idempotente (`paidAt` non re-daté), inconnu → `undefined`, deux prestations séparées |
| Serveur démarré, routes testées en HTTP réel | pages 200 · 7 endpoints protégés 401 · 5 endpoints publics 200 JSON |
| Serveur relancé sur le code du chantier B, 14 routes sondées | 8 protégées → 401 · `/api/professionals/verified` 200 · identifiant inconnu → 404 (corrigé depuis un 500) · fiche ingrédient sans base → 503 assumé |
| Comparateur vérifié de bout en bout via HTTP | « Premium revient moins cher à l'année, écart de 108.48 € » — 156.48 € contre 48 € |
| 4 routes paiement/co-signature sondées | 401 sans token |
| 5 pages après câblage | `/mes-reservations`, `/pros-verifies`, `/cout-routine`, `/ingredient/glycerin`, `/routine-builder` → 200 |
| `npm test` (suite complète) | exit 0 |
| Vérifications Phase 2 (RLS réelle) | **PASS** contre l'instance réelle `qzwgsarfdegqtfdnqiql` (eu-west-1) : comptes A/B isolés, ressources privées protégées, rôle admin et mise à jour retour hors cache vérifiés |

Le dernier point est le seul passif ouvert. Il ne peut pas être levé ici : il exige une instance Supabase réelle.
