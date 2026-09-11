# 03 — Audit du code : DELETE / MERGE / REFACTOR / KEEP / REBUILD

> Méthode : graphe d'imports complet (outillage `scripts/findDeadCode.mjs`, conservé
> dans le dépôt), revue fichier par fichier des candidats, vérification des
> dépendances avant **chaque** suppression. La suite de 121 bancs est le filet :
> aucun DELETE n'est validé sans suite verte.

---

## 1. DELETE — exécuté dans cette session (7 fichiers)

| Fichier | Raison | Vérification avant suppression |
|---------|--------|--------------------------------|
| `src/components/3d/Hero3DCurlOrb.tsx` | Composant 3D orphelin (0 import) | Graphe d'imports : aucune référence app ni tests |
| `src/components/3d/Routine3DProductStage.tsx` | Composant 3D orphelin (0 import) | Idem |
| `src/components/AiRoutineAnalysis.tsx` | Consommateur obsolète de la connaissance peau ; remplacé par le branchement `SKIN_KNOWLEDGE → diagnosticResult.ts` (le fichier `knowledge/skin.ts` documente l'historique de ce remplacement) | 0 import ; la connaissance qu'il « portait » est servie ailleurs, vérifié |
| `src/lib/knowledge/hair.ts` | Base de connaissance hair statique, 0 import ; le diagnostic hair utilise `kurlaFit`/`needsHub` | 0 import app + tests |
| `src/lib/knowledge/routines.ts` | Presets de routines statiques, 0 import ; remplacés par `routineBuilder` + routines DB | 0 import app + tests |
| `src/lib/sourcingCountryScore.ts` | Scoring pays orphelin : le scoring vit en base (`sourcing_country_strategy`) et le panneau admin lit l'API | 0 import ; le panneau lit `GET /api/admin/sourcing/country-strategy` |
| `src/vite-env.d.ts` — **non supprimé** | Apparaissait « mort » au scanner (fichier de déclarations globales, chargé par le tsconfig, sans import) | Conservé |

**Conservé malgré l'audit 3D** : `three.js` en dépendance — `Diagnostic3DFloatingCards`
et `KURLAPro3DMap` (vivants) l'utilisent. Le chunk `three` reste séparé au build.

## 2. MERGE — exécuté dans cette session

| Objet | Fusion |
|-------|--------|
| `package.json` : `test:need-depth` défini **deux fois** (lignes 132/133) | Doublon supprimé (identique) |
| `package.json` : `vite` en `dependencies` **et** `devDependencies` | Retiré de `dependencies` (outil de build = devDependency) ; warning esbuild levé |
| Les 12 couleurs cœur répétées ~9 700 fois en hexadécimal | Unifiées en tokens `kurla-*` (doc 11) — une valeur, un nom |
| La police Inter, chargée sans être appliquée | `--font-sans` → Inter ; `--font-serif` → Playfair Display (doc 11) |

## 3. MERGE — identifié, à exécuter (P1)

| Duplication | État | Action |
|-------------|------|--------|
| **6 modules de données « vivants par leurs seuls tests »** — `catalogueInci.ts`, `catalogClaims.ts`, `catalogueMatch.ts`, `cosingFunctions.ts`, `ingredientRegulatory.ts`, `kurlaSkinRange.ts` : 0 import depuis l'application, maintenus par leurs bancs | Ce sont des **sources de pipelines** (fichier → script de génération → migration SQL → base), pas des doublons vivants. Mais le code ne peut plus dire « ce qui est en base provient de là » | P1 : documenter chaque fichier comme *source de vérité de migration* (entête + README par pipeline) ; **supprimer ensuite ce qui n'a plus de rôle** (ex. `catalogueMatch.ts`, remplacé par les références par ID — son banc testé le 11/09 ne valide plus qu'un comportement mort) ; **brancher `catalogClaims.ts`** (scan d'allégations) sur le panneau admin — il est prêt, testé, sans consommateur |
| `skinCatalogStore.ts` et `catalogStore.ts` | **Pas un doublon** : vérifié — la couche peau lit le catalogue unique et produit des rapports. Conservé tel quel | — |
| `recommendationEngine` / `kurlaFit` / `skinRecommendation` | **Pas des doublons** : orchestrateur + règles par domaine (doc 05). L'architecture est la bonne | — |
| Panneaux admin opérationnels « Peau C2x » (11 panneaux J0/J3/J7, facturation, go-live…) | Traces des chantiers d'ops ; chacun est testé mais aucun ne sera réutilisé après la vague 1 | P2 : archiver dans un panneau « Ops historiques » ou retirer de la navigation quand la vague 1 est clôturée (décision ops, pas code) |

## 4. REFACTOR — planifié (par ordre de risque)

| # | Cible | Problème | Action | Risque |
|---|-------|----------|--------|--------|
| R1 | Long tail des 95 couleurs restantes (107 hex au total au départ) | ~95 valeurs hex en dur (statuts, ombres, dégradés) | Mapper vers les tokens sémantiques (`kurla-danger`, `kurla-success`…) + les neutres ; la palette cœur est déjà migrée | Faible (mécanique, testé) — P1 |
| R2 | Corps des 66 pages non traduit (i18n) | Framework FR/EN en place, chrome traduit, pages non | Traduire par famille (boutique → diagnostic → compte) via le dictionnaire typé qui bloque les trous | Moyen — P1 (doc 08) |
| R3 | Lecture serveur de la fiche produit | La route unitaire existe (session), mais la lecture serveur charge encore la table avant de filtrer | Requête ciblée `WHERE slug = $1` + projection partagée — **à faire avec la suite intégration réel-DB** (ne pas dupliquer la projection de 120 lignes) | Moyen — P2 (doc 10) |
| R4 | `server.ts` (2 828 lignes) | Composition + routes cœur encore mélangées | Extraire les routes panier/commandes/checkout dans `src/server/routes/` comme les 33 autres domaines | Faible (déplacement testé) — P2 |
| R5 | Cache du catalogue public | 4 requêtes Supabase par `/api/products` sans cache | TTL court + invalidation aux points d'écriture (doc 10, §4) | Moyen — P2 |
| R6 | 11 panneaux ops « Peau C2x » | Accumulation de chantiers | Voir MERGE §3 | Faible — P2 |
| R7 | 25 `console.log` serveur | Mélange logs opérationnels et erreurs | Normaliser en JSON structuré (event, requestId) pour l'ingestion | Faible — P2 |
| R8 | 6 TODO/FIXME restants | Traces de chantiers | Tracer dans la roadmap (aucun critique trouvé à l'inspection) | — |

## 5. KEEP — actif de la plateforme (ne pas toucher)

- **Le découpage du store par domaine** (43 modules, `bindDomain`) : c'est ce qui a
  rendu la consolidation possible ; l'inventaire des 303 méthodes est le contrat.
- **`kurlaFit.ts`** : règles explicites, `score: null` plutôt qu'une note inventée —
  l'actif de confiance de la marque. Le moteur v2 le consomme, ne le remplace pas.
- **Les 7 validations catalogue + `isPublishableProduct`** : la porte de vérité
  produit ; appliquée à la lecture ET à l'écriture (banc B2).
- **Le contrat `diagnosticResult.ts`** : le seul modèle de résultat partagé hair/skin,
  avec disponibilité explicite et jamais de prix fallback.
- **La chaîne RGPD** (export/suppression/consentements photos) : complète et testée.
- **Les pipelines de données réglementaires** (`cosingFunctions`, `ingredientRegulatory`,
  `catalogueInci`, `kurlaSkinRange` + leurs scripts de génération + leurs bancs) :
  ce sont les *provenances* de la base ; les supprimer casserait la traçabilité
  réglementaire. À documenter (MERGE §3), pas à supprimer.
- **Les 4 inventaires de référence** (routes, routes admin, store API, appelants) :
  les garde-fous de coordination multi-intervenants — régénérer + relire le diff.
- **`CHARTE_VISUELLE.md`** : la charte des visuels (mesure de luminance des peaux,
  crédits, alt) — base du design system (doc 11).

## 6. REBUILD — à reconstruire proprement (quand le contexte le permet)

| # | Objet | Pourquoi | Contrainte |
|---|-------|----------|------------|
| B1 | Requête produit unitaire côté base | La route existe, la lecture est encore full-scan | Avec la suite réel-DB (`npm run test:realdb`) — ne pas dupliquer la projection |
| B2 | Catalogue peau 150 refs | Le code est prêt (contrat C1, filtres, moteur, kits, routine) ; ce sont les **preuves** (CPNP/DP, INCI, whitecast testé IV–VI) qui manquent | C'est du sourcing opérationnel (FR+NL vague 1), pas du code (doc 12, P0 business) |
| B3 | Pages pays/langues au-delà FR/EN | Framework i18n prêt (locaux typées, hreflang, URLs préfixées) | Nécessite les traductions du contenu (R2) + décision de marché (doc 08) |
| B4 | Cache/CDN du catalogue public | Charge croissante du shop | P2 (doc 10) |
| B5 | Analytics produit (cohorte de résultats) | Les tables C6 existent (0 ligne) — le lancement France doit les alimenter | Dépend de la traction réelle, jamais de données seedées (règle C6) |

## 7. Dépôt — hygiène vérifiée

- **Secrets** : scan de l'arbre (clés Stripe/Supabase/Gemini/AIza, JWTs) : **aucun
  secret dans le code**. `.env.example` propre (valeurs vides).
- **`dangerouslySetInnerHTML`** : **0 occurrence** — pas de surface d'injection HTML
  dans le front (React échappe par défaut).
- **Licences/dépendances** : `three` conservée (2 composants vivants), `@google/genai`
  et `stripe` isolés dans le chunk `ai-vendor` ; `vite` corrigée (devDependency).
- **Node** : `engines >= 22` respecté en CI/Vercel ; le sandbox local (Node 20) fait
  tourner la suite avec un avertissement Supabase connu (non bloquant).
