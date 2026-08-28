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
- [x] **Les bancs conçus pour une base réelle tournent contre l'instance réelle** :
      `npm run test:realdb` vert (4 bancs). La suite unitaire complète, elle, reste en mémoire par
      conception — voir « Liaison des stores » ci-dessous.

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

### Validation contre l'instance réelle : ce qu'elle a révélé

`npm run test:realdb` est désormais vert contre `qzwgsarfdegqtfdnqiql` : pré-vérification, 17
contrôles RLS, cycle de vie atomique du stock, bancs professionnels et paiement de prestation.
Y arriver a exigé de corriger des défauts réels, pas seulement des tests.

**1. Trois migrations étaient enregistrées comme appliquées sans l'avoir été.**
`20260826`, `20260827` et `20260828` figuraient dans `supabase_migrations.schema_migrations`, mais
leurs effets étaient absents : `orders.checkout_idempotency_key` manquait (donc aucune idempotence
de checkout en base), `refunds` n'avait que ses 8 colonnes d'origine sur 15, et les fonctions
`claim_stripe_event`, `mark_stripe_event_error` et `replace_cart` n'existaient pas. Les trois
fichiers sont intégralement idempotents (`IF NOT EXISTS`, `DROP … IF EXISTS` avant chaque
contrainte et politique, `CREATE OR REPLACE`) : ils ont été rejoués.

**2. Rejouer une migration ancienne rétrograde les fonctions.** Les trois fichiers redéfinissent
`reserve_stock_for_order` et `release_stock_for_order`, également redéfinies plus tard par
`20260834` puis `20260839`. Le rejeu de `20260828` a imposé sa version, qui ne lit que
`product_id` et ignore `productId` — d'où `Invalid order stock line`. `20260839` a été rejoué pour
restaurer la définition la plus récente. **Règle : une migration rejouée doit être suivie du rejeu
de toutes celles qui redéfinissent les mêmes objets.**

**3. Un vrai bug SQL dans le cycle de stock.** Les quatre fonctions de `20260839`
(`reserve_stock_for_order`, `release_stock_for_order`, `restore_stock_atomic`,
`transition_order_stock`) ordonnaient leurs lignes par `ORDER BY product_id, variant_id::TEXT`
sous un `GROUP BY 1, 2`. Sous `GROUP BY`, une expression d'`ORDER BY` ne peut pas référencer un
alias de sortie : PostgreSQL résout alors `variant_id` parmi les colonnes d'entrée, qui se limitent
à `value`. Résultat : `42703 column "variant_id" does not exist` dès la première réservation.
**Aucune de ces quatre fonctions n'avait jamais pu s'exécuter.** Corrigé en `ORDER BY 1, 2`
(ordinaux de sortie, même ordre déterministe, donc mêmes verrous `FOR UPDATE` dans le même ordre).
Migration de rattrapage : `20260850000000_fix_stock_lifecycle_ordering.sql`.

**4. Deux bancs dépendaient de données ambiantes ou d'un schéma mémoire.**
`tests/phase7_atomic_stock.integration.test.ts` prenait le premier produit actif du catalogue :
l'instance réelle compte 16 produits et **0 actif**, ce qui est l'état normal d'un catalogue
gouverné (une fiche importée reste en brouillon tant que les contrôles de confiance ne sont pas
confirmés). `tests/chantier_b_professional.test.ts` utilisait l'identifiant littéral
`appt-test-1`, refusé par une colonne UUID. Les deux bancs construisent désormais leur propre
chaîne (produit + inventaire ; comptes → fiche pro → prestation → réservation) et la détruisent.

**5. Un défaut de code réel.** En base, un identifiant hors format n'est pas « introuvable » :
PostgREST répond 400 et `ensureSuccess` transformait l'absence en exception.
`markServicePaymentPaid('inexistant')` levait au lieu de retourner `undefined` — alors que c'est le
chemin d'un webhook Stripe rejoué. Onze points d'accès par identifiant de `professionalStore.ts`
sont maintenant gardés par `isUuid()` et répondent « introuvable » (`undefined`, `[]`, `false`).

**6. Un banc « base réelle » tournait en mémoire.** `test:realdb` enchaînait
`npm run test:chantier-b`, dont le préfixe `KURLA_STORE_MODE=memory` **l'emporte sur
l'environnement hérité**. Le banc annonçait tester la base réelle sans la toucher. Ajout de
`test:chantier-b:realdb` (`KURLA_STORE_MODE=server`), vers lequel `test:realdb` pointe désormais.

### Trois requêtes que le code envoyait et que la base refusait

Rien de tout cela n'est visible à la compilation : les noms de tables, de colonnes et les
imbrications sont des chaînes. Un store en mémoire ne les voit pas non plus, puisqu'il ne connaît
pas le schéma. Les trois défauts suivants ne se révélaient qu'en production, sous forme d'erreurs
SQL remontées par PostgREST.

| Requête | Réponse de la base | Correctif |
|---|---|---|
| `user_archetypes.select('id')` (`intelligenceStore.ts`, comptage des membres d'un archétype) | `42703 column user_archetypes.id does not exist` | La table est clé par `user_id` — l'upsert voisin utilise déjà `onConflict: 'user_id'`. Comptage sur `user_id`. |
| `returns.select('… product_id …')` (`getReturnInsightRecords`) | `42703 column returns.product_id does not exist` | Le panier retourné est dans `items` (jsonb). Un retour multi-produits est éclaté en un enregistrement par produit, faute de quoi il serait attribué à un seul et fausserait le décompte. |
| `reviews(user_archetypes(…))` (`getArchetypeRatingsForProduct`) | `PGRST200` — aucune clé étrangère entre `reviews` et `user_archetypes` | Les deux tables pointent vers `profiles`. Le chemin réel est `reviews → profiles → user_archetypes`. |

Les deux premières cassaient la note par archétype et l'intelligence des retours ; la troisième
cassait la note par archétype dès qu'un avis approuvé existait.

Chacune a été vérifiée **à l'exécution contre la base réelle**, pas seulement recompilée :
`syncUserArchetype` sur un compte neuf, `getReturnInsightRecords` sur trois retours réels dont un
multi-produits (4 enregistrements attendus, 4 obtenus ; filtre par produit conforme ; retour sans
produit identifiable conservé sans attribution), `getArchetypeRatingsForProduct` sur cinq avis
approuvés (un archétype, `publishable=true`, note 4,2).

### Filet ajouté : `test:schema-contract`

Un banc qui rejoue contre la base réelle **chacune des 92 requêtes `select` distinctes** écrites
dans le code (127 sites), extraites à l'exécution depuis `src/` et `server.ts`. Toute requête
refusée fait échouer le banc avec la table, la ligne d'origine et le code d'erreur PostgreSQL.
Intégré à `test:realdb`.

Le banc a été validé par mutation : une colonne inventée le fait bien échouer
(`42703 column reviews.cette_colonne_n_existe_pas does not exist`), et il repasse après
restauration. Un filet qui ne peut pas échouer ne serait pas un filet.

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

## CHANTIER 7 — SEO, SSR & INTERNATIONALISATION 🔶 (en cours)

**Le chantier le plus coûteux, donc à décider tôt.** Aujourd'hui : 1 URL indexable.

Le chantier est subdivisé en sept sous-chantiers, chacun livrable et vérifiable
séparément. L'ordre n'est pas celui de la liste d'origine : le routeur passe en
premier parce que le sitemap, le prérendu et l'i18n se dérivent tous de la même
table de routes. Le faire après aurait obligé à tenir trois listes à jour.

### 7.1 — Routeur déclaratif et métadonnées par page ✅

La cascade de 40 `if (pathname === ...)` de `App.tsx` est remplacée par une table
déclarative. La correspondance de chemin est **partagée** entre le rendu et les
métadonnées : une route ne peut pas exister sans son titre, ni l'inverse.

- `src/lib/routeMeta.ts` — 47 routes : titre, description, indexabilité, canonique,
  fréquence et poids sitemap. **Aucun import React**, pour qu'un script de build
  puisse la lire sans charger l'application.
- `src/lib/routeTable.tsx` — composant et exigence d'authentification par route.
  `auditRouteTable()` détecte toute divergence entre les deux fichiers.
- `src/lib/useDocumentMeta.ts` — titre, description, canonique, robots et Open
  Graph appliqués au document ; `noindex, nofollow` sur les pages privées.
- `src/pages/HomePage.tsx` — la composition d'accueil devient une page comme les
  autres.

Vérification : `tests/chantier_7_routing.test.ts`, les 48 URLs historiques figées
comme fixture, validé par quatre mutations (route supprimée, composant sans
métadonnées, page privée indexable, motif paramétré masquant une route statique).
Une première version prétendait tester la priorité d'ordre : elle ne pouvait pas
échouer, puisque `:param` capture un segment et qu'aucun motif ne se recouvre.
Remplacée par une vraie détection de recouvrement.

Deux bancs existants (`kurla_intelligence`, `chantier_a_wiring`) vérifiaient la
présence d'une chaîne dans `App.tsx`. Ils testent désormais la résolution réelle
via `resolveRoute()` : chercher du texte ne prouvait pas que l'URL menait quelque
part.

### 7.2 — Socle SEO technique ✅

`robots.txt` et `sitemap.xml` sont **générés au build** depuis `routeMeta.ts`, la
même source que le rendu, par `scripts/generateSitemap.ts`. Ajouter une route
publiable met à jour le sitemap sans rien toucher d'autre ; une page privée sort
du sitemap et entre dans les Disallow.

- `sitemap.xml` : les 22 routes publiques statiques, avec `lastmod`, `changefreq`,
  `priority`. Pas d'URL d'entité : en générer vers des pages que rien ne sert
  serait un leurre pour le moteur ; c'est l'objet de 7.4.
- `robots.txt` : `Allow: /` + Disallow minimisés par préfixe (`/account` couvre
  ses sous-routes), `/api/` bloqué, `Sitemap:` pointé.
- `public/og-default.png` : carte Open Graph 1200×630 aux couleurs de la marque.
- `useDocumentMeta.ts` : JSON-LD `Organization` + `WebSite` sur les pages
  indexables ; les types par page (Product, Article) suivront au prérendu.

Vérifié en ligne : `/robots.txt` 200 `text/plain`, `/sitemap.xml` 200
`application/xml` (22 URLs), `/og-default.png` 200 `image/png` — la réécriture
SPA ne les avale pas. `tests/chantier_7_seo.test.ts` validé par mutation (page
privée indexable détectée). Deux mutations sont non détectables par conception et
sont documentées dans le commit : retirer une route (l'attendu est dérivé de la
même table — la complétude est le filet du banc 7.1) et ajouter une règle
redondante (la minimisation la neutralise, c'est elle qu'on teste).

### 7.3 — Prérendu au build (action 8) ✅

`scripts/prerender.ts` écrit, pour chaque route publique statique,
`dist/<chemin>/index.html` : la coquille Vite dont le `<head>` porte déjà les
métadonnées de la route (titre, description, canonique, OG, robots, JSON-LD) et
dont le corps contient une amorce (`<h1>` + description). Un moteur qui n'exécute
pas JavaScript reçoit un titre, une description et un `<h1>` distincts par route —
vérifié en ligne sur le HTML brut de `/`, `/boutique`, `/melanin-skin`,
`/guides/ingredients`, `/diagnostic/cheveux`.

Pourquoi pas un `renderToString` complet : nos pages lisent leurs données dans des
`useEffect` au montage, que `renderToString` n'exécute pas ; un vrai SSR de contenu
exigerait de brancher le build sur Supabase et sur les pages du graphe (7.4). Le
prérendu n'utilise que `routeMeta.ts` (données pures, ni React, ni navigateur).

Piège rencontré et consigné : `buildCommand` est limité à **256 caractères** ;
l'ajout du prérendu faisait 266 et le déploiement passait en ERROR avec un journal
de build vide. La chaîne complète vit désormais dans `scripts/build-vercel.sh`,
`vercel.json` délégant par `buildCommand = bash scripts/build-vercel.sh`.

Bug trouvé par le banc : `JSON.stringify` ne protège pas la balise fermante de
`<script>` dans le bloc JSON-LD ; un titre hostile fermait la balise et injectait
du HTML. Corrigé par `safeJsonLd` (`<` échappé en `\u003c`, JSON valide).

`tests/chantier_7_prerender.test.ts` validé par mutation (amorce supprimée,
canonique supprimé, titre hostile : tous détectés).

### 7.4 — Fiches ingrédient publiques et pages depuis le graphe 🔶 (volet fiche livré)

Le graphe (chantier 2) était créé mais vide : la fiche publique `/ingredient/:id`
ne servait rien et le sitemap ne listait aucune entité.

- Migration `20260851000000_seed_knowledge_graph.sql` : 13 ingrédients INCI réels
  (fonctions, niveau de preuve honnête A/B, `source_kind` consensus/regulatory).
  **Aucune URL ni référence inventée, aucune statistique fabriquée.** Les
  restrictions juridictionnelles sont des faits publics (rétinol 0,3 % UE, acide
  salicylique 2 %, hydroquinone interdite). `ingredient_archetype_outcomes` n'est
  **pas** seedé : ces mesures doivent venir de retours réels, jamais d'une
  invention.
- `scripts/seoEntities.ts` lit les ingrédients vérifiés dans la base (dégradation
  douce : sans credentials, liste vide, le build ne casse jamais).
- `generateSitemap` et `prerender` les incluent : sitemap 22 → 35 URLs, une page
  prérendue par ingrédient. Vérifié en ligne : `/ingredient/glycerin` sert un
  titre/h1/canonique distincts en HTML brut, fiche publique 200.
- Bancs : injection d'entités dans le banc SEO ;
  `tests/chantier_7_ingredients.realdb.test.ts` (branché dans `test:realdb`) exige
  le jeu seedé depuis la base réelle, SKIP sans credentials.

**Reste dans 7.4** : la matrice « ingrédient × problème × texture × ville »
(action 37). Volontairement différée : sans données de retours par ville/problème,
elle produirait des milliers de pages au contenu mince et dupliqué — nuisible au
référencement et contraire au principe « KURLA ne devine pas ». Elle ne devient
pertinente que quand `ingredient_archetype_outcomes` aura de vraies mesures.

### 7.5 — Internationalisation (fr/en) et hreflang ✅

Le site était monolingue : aucune locale, aucun `hreflang`, tout le chrome codé
en dur en français dans les composants.

- `src/lib/i18n.ts` (pur, ni React ni navigateur) : `splitLocale`,
  `localizedPath`, `hreflangAlternates`. Le français reste **non préfixé**, donc
  aucune URL historique ne bouge ; l'anglais passe sous `/en/`. `/england` n'est
  pas pris pour de l'anglais, la query string survit à la localisation.
- `src/lib/translations.ts` : 82 clés (nav, footer, 3 pages). `en` est typé sur
  la structure de `fr` : une clé manquante ou surnuméraire est une **erreur de
  compilation** (TS2741, vérifié par mutation). 9 termes sont volontairement
  identiques (`KURLA Pro`, `Marketplace`, `Phase`…) et listés comme tels dans le
  banc : une traduction paresseuse (copie du français) fait échouer le test.
- `src/lib/I18nProvider.tsx` : la locale vient de l'**URL**, suivie via
  `onRouteChange`. Un état isolé reviendrait au français à chaque rechargement,
  favori partagé ou arrivée directe sur une page prérendue.
- `router.ts` : `navigate()` préserve la locale courante — depuis `/en/`, un lien
  interne nu reste anglais, sinon la langue choisie ne tiendrait pas deux clics.
  `preserveLocale: false` sert à la bascule de langue.
- `routeMeta.ts` / `routeTable.tsx` : `matchRouteMeta` découpe la locale et expose
  `basePath` (clef de la table) + un canonique localisé.

**Règle de publication (`routeTranslations.ts`)** : une URL `/en/…` n'est déclarée
version anglaise (hreflang, sitemap, prérendu) **que si le corps de la page est
réellement traduit**. Sinon elle canonise vers le français : pas de doublon indexé,
pas d'alternate mensonger. Publier `hreflang="en"` vers une page dont le texte est
français serait une déclaration fausse — exactement ce que KURLA s'interdit.

Pages intégralement traduites : `/manifeste`, `/melanin-skin`,
`/protective-styles`. Le corps des 19 autres routes publiques reste français :
elles sont servies sous `/en/` (chrome anglais, canonique français, aucun
hreflang) et seront traduites progressivement — ajouter une page se résume à
écrire ses chaînes dans le dictionnaire et son chemin dans `EN_ROUTE_CONTENT`.

Vérifié en ligne (déploiement `b0357d6`) :
- `/en/manifeste` sert `<html lang="en">`, `<title>The KURLA manifesto</title>`,
  `<h1>` anglais, canonique `/en/manifeste`, `og:locale en_GB`, et les 3
  alternates `fr` / `en` / `x-default`. Idem `/en/melanin-skin` et
  `/en/protective-styles`.
- `/manifeste` (français) déclare la même paire d'alternates : un hreflang posé
  sur une seule des deux versions n'est pas pris en compte de façon fiable.
- `sitemap.xml` : **38 URLs** (22 statiques + 13 ingrédients + 3 anglaises),
  **18 alternates** `xhtml:link`, espace de noms `xmlns:xhtml` déclaré.
- `robots.txt` : **21 Disallow**, dont 10 sous `/en/` — le préfixe `/account` ne
  couvrait pas `/en/account`, l'espace compte anglais aurait fui vers l'index.
- `/boutique` (non traduit) : 0 alternate.

`tests/chantier_7_i18n.test.ts` (branché dans `npm test`) exerce le code livré, y
compris `navigate()` sur un `window` minimal : persistance de la locale, absence
de double préfixe, bascule vers le français, sortie du routeur pour une URL
externe. Validé par mutation (`hasEnglishVersion` forcée à `true`, préservation de
locale désactivée : les deux détectées). Banc SEO étendu : alternates présents sur
une route traduite et absents ailleurs, privé bloqué en fr **et** en.

Non vérifié : aucun écran n'a été rendu dans un navigateur (limitation constante
du chantier) ; le sélecteur FR/EN est donc validé par ses fonctions, pas
visuellement.

### 7.6 — Devises et TVA 🔶 (code livré, migration à appliquer)

La commande ne stockait qu'un `total` TTC. Le taux appliqué, la part de TVA et le
pays de taxation n'étaient nulle part : aucune facture reconstituable, et le taux
français de 20 % s'appliquait implicitement à toute l'Europe alors qu'une vente à
un particulier allemand est taxée à **19 %** (principe de destination, directive
2006/112/CE art. 33, déclaré via l'OSS). `products.vat_rate` et
`price_includes_vat` existaient en base mais n'étaient **jamais lus** au paiement.

**Trois règles appliquées**
1. Le taux dû est celui du **pays de livraison**, pas celui du vendeur.
2. Un prix TTC **ne change pas de montant** : la TVA est déduite du prix
   réellement encaissé (`TVA = TTC × taux / (100 + taux)`), le net obtenu par
   soustraction — donc `net + TVA = TTC` tient exactement, au centime. Un prix
   hors taxe, lui, est majoré de la TVA avant encaissement : un particulier ne
   peut pas être facturé HT.
3. L'auto-liquidation B2B (art. 138/196) n'est accordée **que sur un numéro
   vérifié auprès de VIES**. Un numéro bien formé ne prouve rien.

**Modules** (purs, testables sans HTTP)
- `src/lib/vat.ts` — 8 taux normaux **sourcés et datés** (FR 20, BE 21, LU 17,
  DE 19, ES 21, IT 22, NL 21, PT 23), bornés aux pays de `SHIPPING_OPTIONS` :
  publier un taux pour un pays non desservi laisserait croire qu'on y vend.
  Provenance croisée, dont le briefing EPRS du Parlement européen (janv. 2026).
  Calcul ligne par ligne, port réparti **au prorata** avec reliquat sur la
  dernière ligne, ventilation par taux, formats de numéros de TVA.
- `src/lib/checkoutVat.ts` — `priceCheckoutWithVat()`, **la fonction que la route
  de checkout appelle**. Extraite du handler pour une raison précise : tant
  qu'elle vivait au milieu du HTTP, aucun banc ne pouvait l'exercer.
- `src/lib/currency.ts` — EUR comme devise d'encaissement, formatage localisé
  (`18,90 €` / `€18.90`), tout l'argent en centimes entiers. **Aucune table de
  conversion** : un taux non sourcé serait un fait inventé, et un prix affiché
  qu'on ne peut pas encaisser serait une promesse fausse. `assertSettlementCurrency`
  refuse au lieu d'arrondir.
- `src/lib/viesVerification.ts` — endpoint réel de la Commission, **échec fermé**
  (panne, saturation `MS_MAX_CONCURRENT_REQ`, HTTP ≠ 200, `valid ≠ true` ⇒
  « non vérifié » ⇒ TVA normale). Désactivé par défaut
  (`VIES_VERIFICATION_ENABLED`) : le paiement ne dépend d'aucun service tiers.

**Vérifié en HTTP réel** (sonde jetable : serveur démarré, produit rendu
publiable, POST sur `/api/stripe/create-checkout-session`, livraison en
Allemagne, 2 × 18,90 € + port 8,90 €) :
```
total 46,70 € · vatCountry DE · net 39,24 € · TVA 7,46 € · breakdown [{19 %, 3924, 746}]
ligne : unitCents 1890 (inchangé) · vatRate 19 · vatAmount 6,04 € · lineTotal 37,80 €
port : gross 890 · net 748 · TVA 142 · taux relevé au 2026-08-28
```
`39,24 + 7,46 = 46,70` exactement. Stripe a échoué (clé factice) **après** la
persistance, ce qui a aussi exercé le chemin d'échec : commande passée en
`payment_failed`. La sonde a été supprimée après usage.

`tests/chantier_7_vat.test.ts` (branché dans `npm test`) : taux épinglés et bornés,
identité net + TVA = TTC, taux de destination, port proratisé sans perte,
auto-liquidation refusée sans vérification, VIES en échec fermé sur cinq scénarios
(`fetch` injecté — la fonction réelle est exécutée), devise refusée, et
`priceCheckoutWithVat` appelée directement. Validé par **quatre** mutations
(DE 19→20, vérification ignorée, VIES non fail-closed, double taxation d'un prix
HT : toutes détectées — la dernière a révélé un défaut réel avant livraison).

**Migration appliquée le 2026-08-28** (jeton d'administration fourni depuis) :
`orders` porte ses 6 colonnes (`currency` défaut `'EUR'`, `vat_country`,
`net_amount`, `vat_amount`, `vat_breakdown`, `customer_vat_number`),
`order_items` ses 4, les 4 contraintes sont en place, et **deux signatures** du
RPC coexistent (11 paramètres = relais, 17 paramètres = version étendue,
`EXECUTE` accordé à `service_role`). Un correctif a été nécessaire avant
application : le `COMMENT ON FUNCTION` final, sans liste d'arguments, levait
`42725 function name is not unique` une fois les deux surcharges créées. La
migration est atomique : elle est revenue en arrière toute seule avant d'être
corrigée puis réappliquée.

**Ce qui manque, explicitement**
- ~~Migration non appliquée~~ **LEVÉ.** Elle ajoute `orders.currency` (verrouillé EUR par CHECK), `vat_country`,
  `net_amount`, `vat_amount`, `vat_breakdown`, `customer_vat_number`, les mêmes
  champs par ligne, et étend le RPC de création de commande — **sans supprimer
  l'ancienne signature**, devenue un relais : l'ordre d'application n'a donc
  aucune importance et aucun paiement ne peut être interrompu.
- En attendant, `serverDb` tente la signature étendue, et sur `42883`/`PGRST202`
  retombe sur l'ancienne en journalisant bruyamment. La TVA reste lisible dans
  l'instantané `shipping_address.vat`, écrit dans tous les cas.
- L'encaissement multidevise reste à faire avec Stripe (reporté en fin de
  chantiers) : les RPC de paiement et de remboursement refusent déjà toute devise
  autre qu'EUR en base.

### 7.7 ✅ — Filtrage réglementaire par juridiction

**Le constat de départ.** La chaîne existait déjà et ne servait à rien :
`checkJurisdiction` (`ingredientGraph.ts:271`, pure et testée), la table
`ingredient_jurisdiction_restrictions` (3 lignes seedées : acide salicylique
restreint à 2 %, rétinol à 0,3 %, hydroquinone interdite), la route publique
`POST /api/jurisdiction/assess` et l'affichage des restrictions sur la fiche
ingrédient. **Aucune recommandation, aucune fiche produit et aucun checkout ne
les consultait** : le graphe savait, le commerce ignorait.

**Trois règles, écrites avant le code** (`src/lib/jurisdiction.ts`, 229 lignes) :
1. **L'absence de donnée n'est pas une conformité.** Aucune restriction pour une
   juridiction → verdict `no_data` avec limitation explicite, jamais « conforme ».
2. **Une concentration non déclarée n'est pas une infraction.** Ingrédient
   réglementé, concentration inconnue → avertissement (`withinLimit: null`), pas
   blocage. En revanche, une concentration déclarée **au-dessus** de la limite
   rend le produit non commercialisable : c'est le seul cas, avec l'interdiction,
   où `sellable` passe à `false`.
3. **Chaque verdict cite sa base.** Le champ `reference` vient de la base
   (Règlement (CE) n° 1223/2009, annexes II/III) ; rien n'est reconstitué ici.

**Les 8 pays desservis relèvent d'une seule juridiction** (`EU`) : le droit
cosmétique européen est unifié, huit tables fantaisistes auraient été du décorum.
Un pays non desservi n'a **aucun** verdict — il est refusé, pas évalué.

**Les trois branchements**
- **Recommandations** (`recommendationEngine.ts`) : `'jurisdiction'` rejoint
  `AdjustmentKind`, le contexte porte la juridiction et ses restrictions. Un
  ingrédient interdit exclut le produit (`delta −100`, `rank: null`, raison
  d'exclusion nommant l'ingrédient et citant la base) ; un ingrédient réglementé
  pénalise sans exclure (`delta −12`). Sans donnée : **aucun** ajustement, parce
  qu'une pénalité inventée serait aussi fausse qu'un silence coupable.
- **Fiche produit** : `GET /api/products/:id/compliance?country=XX` (publique,
  sans compte, 60 req/min — on doit pouvoir savoir **avant** d'acheter). Rendu par
  `ProductComplianceBanner.tsx`, avec sélecteur de pays : le visiteur vérifie le
  sien, pas celui du vendeur. Un verdict `sellable: false` désactive « Ajouter au
  panier » **et** le réassort récurrent.
- **Checkout** : la porte est **fermée par défaut**. Ingrédient interdit ou limite
  dépassée dans le pays de livraison → `400 COMPLIANCE_NOT_SELLABLE` avant tout
  appel Stripe. Graphe illisible **ou base inaccessible** → `503`, paiement non
  lancé. Les recommandations, elles, restent ouvertes en cas de graphe illisible
  (ce n'est pas une vente) et le déclarent via `jurisdictionChecked: false`.

**Vérification.** `tests/chantier_7_jurisdiction.test.ts` (dans la chaîne
`npm test` : **81 bancs PASS, exit 0**) appelle les fonctions livrées et le vrai
moteur : les 5 verdicts et leur précédence, la limite inclusive (2 % pour 2 %),
la concentration inconnue, le statut `unknown`, la restriction étrangère
inappllicable en UE, l'exclusion moteur et sa trace. **5 mutations sur 5 tuées**
(`sellable: true` forcé, `withinLimit` jamais faux, `no_data` → `compliant`,
filtre de juridiction supprimé, exclusion moteur retirée).

`tests/chantier_7_jurisdiction.integration.test.ts` (hors chaîne, `npm run
test:chantier-7-jurisdiction-integration`) démarre le vrai serveur, injecte deux
produits publiables et exerce les routes en HTTP. **Il a trouvé un défaut réel
avant livraison** : quand le client Supabase est absent, la porte du checkout
laissait passer la vente (fail-open) alors que le graphe illisible la refusait.
Corrigé — les deux cas renvoient désormais 503. **8 mutations sur 8 tuées** au
total (les cinq premières, puis : pourcentage jamais lu, provenance masquée,
limite devenue exclusive).

**Vérifié sur la base réelle, le 2026-08-28.** Serveur démarré contre l'instance
`qzwgsarfdegqtfdnqiql` avec la clé de service, produit `p13` du catalogue réel
(« Acide Salicylique 1.5% », « Huile d'Arbre à Thé », « Aloe Vera »,
« Allantoïne ») : verdict **`restricted`**, `sellable: true`, `salicylic-acid`
résolu, limite 2 %, déclaré 1,5 %, `withinLimit: true`, référence
« Règlement (CE) n° 1223/2009, annexe III », **1 ingrédient résolu sur 8
déclarés**, limitation de provenance affichée. Produit `p6` (« Niacinamide 4 % »,
« Squalane Végétal »…) : 2 résolus sur 8, aucune restriction applicable →
**`no_data`**, et non « conforme ». Le checkout, sur le même serveur, charge le
graphe réel sans erreur (400 « produit non disponible à la vente » pour une fiche
non publiable, jamais 503).

**Deux trous découverts à cette occasion, et comblés.** Sans eux le filtre aurait
tourné à vide sur le catalogue réel :
1. **Les libellés portent la concentration** (« Acide Salicylique 1.5% »,
   « Niacinamide 4 % ») : `parseDeclaredIngredient` la sépare du nom. Ce n'est pas
   une estimation, c'est la déclaration du marchand — elle reste signalée
   `concentrationSource: 'declared_name'` dans la constatation comme dans la
   limitation (« elle vaut déclaration du marchand, pas analyse de laboratoire »).
   Une liaison `product_ingredients` prime toujours sur elle.
2. **Le graphe ne connaissait que les noms INCI anglais** alors que le catalogue
   est en français : migration `20260861000000_ingredient_common_names_fr.sql`
   (appliquée) ajoute des alias non ambigus — `acide salicylique`,
   `glycérine végétale`, `squalane végétal`, `nicotinamide`, `panthénol`,
   `acide ascorbique`. Aucune entité créée, aucun rapprochement approximatif : la
   vitamine E, le zinc PCA et l'acide tranexamique du catalogue restent hors
   graphe, et l'évaluation le déclare.

**Ce qui manque, explicitement**
- `product_ingredients` (liaison produit ↔ ingrédient avec
  `declared_concentration_percent`) est lue quand elle existe mais reste **vide**
  (0 ligne, vérifié en base) : les concentrations viennent donc du libellé quand il
  en porte un, et l'évaluation le dit au lieu de les présumer dans la limite.
  Renseigner cette table transforme les avertissements restants en verdicts.
- Le graphe couvre **13 ingrédients** ; le catalogue en déclare davantage. Tant
  qu'une entité manque, la fiche répond « statut non évalué » — réponse honnête,
  qui appelle l'extension du graphe plutôt qu'un rapprochement approximatif.
- La résolution nom → ingrédient passe par `resolveIngredient` : un nom de la
  fiche non reconnu reste hors graphe (`X ingrédient(s) non couvert(s)` affiché),
  il n'est jamais deviné.
- Aucun écran n'a été rendu dans un navigateur.

### Restant

_Chantier 7 terminé._


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
| `npm test` (suite complète) | exit 0 — **81 bancs PASS** |
| `tests/chantier_7_jurisdiction.test.ts` | PASS — 5 verdicts et précédence, limite inclusive, concentration inconnue, statut `unknown`, restriction étrangère inapplicable, exclusion moteur tracée, concentration lue dans le libellé + provenance. **8 mutations sur 8 tuées** |
| Chantier 7.7 sur la base réelle | produit `p13` → `restricted`, 1,5 % sous la limite de 2 %, référence citée, 1/8 résolu · `p6` → `no_data` (2/8) · checkout : graphe réel chargé, jamais 503 |
| `tests/chantier_7_jurisdiction.integration.test.ts` (hors chaîne) | PASS en mode sans base : pays non desservi refusé (400), checkout en échec fermé (503), produit conforme non bloqué. **A révélé un fail-open réel, corrigé.** Branche « base réelle » non exécutée ici |
| Vérifications Phase 2 (RLS réelle) | **PASS** contre l'instance réelle `qzwgsarfdegqtfdnqiql` (eu-west-1) : comptes A/B isolés, ressources privées protégées, rôle admin et mise à jour retour hors cache vérifiés |

Le dernier point est le seul passif ouvert. Il ne peut pas être levé ici : il exige une instance Supabase réelle.
