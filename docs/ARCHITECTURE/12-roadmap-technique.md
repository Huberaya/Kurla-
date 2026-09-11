# 12 — Roadmap technique & priorités

> « Construire ce qui est nécessaire maintenant, en préparant ce qui sera
> nécessaire demain. » — la roadmap tient en une règle : **le code est prêt,
> la donnée et les preuves sont le chemin.**
>
> **Plan d'exécution détaillé (chantiers, critères d'acceptation, jalons) :**
> `PLAN_CHANTIERS_PLATEFORME_SOLID_2026-09-11.md` à la racine du dépôt.

---

## 1. Priorités P0 / P1 / P2 / P3

### P0 — BLOQUANT (empêche KURLA de vendre / d'être crédible)

| # | Item | Type | Dépendance |
|---|------|:----:|------------|
| P0-1 | **Catalogue peau 40 refs (vague 1)** : sourcing FR+NL, 7 validations (CPNP/DP, INCI, whitecast testé IV–VI, DDM, MOQ…), ingestion → 12/15 besoins couverts | **Business/ops** (le code est prêt : contrat C1, filtres, moteur, kits, routine) | Fournisseurs, échantillons |
| P0-2 | **Go-live paiement** : Stripe live + webhooks vérifiés sur l'environnement réel (test:realdb complet) | Ops | Compte Stripe live |
| P0-3 | **Emails transactionnels live** : provider + domaine SPF/DKIM/DMARC (console refusé en prod, verrouillé) | Ops | Domaine |
| P0-4 | **Parcours Fatou vert** : diagnostic peau → routine → panier → kit → commande test → suivi, sans dead-end (les 5 chantiers P0 peau C0–C4 sont livrés ; ce qu'il reste est la donnée P0-1) | Produit | P0-1 |
| P0-5 | **Secrets & rotation** : service role, Stripe, CRON_SECRET (S3) | Ops | — |

### P1 — ESSENTIEL (la plateforme tienne sa promesse au-delà du lancement)

| # | Item | Type |
|---|------|:----:|
| P1-1 | **Filtres peau complets UI** (actif/phototype/texture/fini) — code prêt, brancher quand les refs P0-1 arrivent | Code (petit) |
| P1-2 | **Cross-sell explicites** (E1) : « complète votre routine » calculé par le moteur | Code |
| P1-3 | **Traduction EN du corps des pages** (famille boutique → diagnostic → compte) via le dictionnaire typé (IA assistée + validation) | Contenu |
| P1-4 | **Pros peau spécialisés** (dermato/esthéticienne) + critères de confiance peau distincts | Ops |
| P1-5 | **Alertes monitoring** (S5) + dashboard de conversion (diagnostic→routine→panier→paiement) | Code (petit) |
| P1-6 | **Brancher `catalogClaims.ts`** (scan d'allégations) sur l'admin — prêt, testé, orphelin | Code (petit) |
| P1-7 | **Registre des traitements + DPA sous-traitants** (G1, G2) | Juridique |
| P1-8 | **Livraison** : agrégateur (Sendcloud/Boxtal) pour les étiquettes auto | Ops |

### P2 — SCALE (100 k → 1 M utilisateurs)

| # | Item | Type |
|---|------|:----:|
| P2-1 | **Cache catalogue** (R5, design doc 10 §3) + `Cache-Control` CDN | Code |
| P2-2 | **Requête produit ciblée en base** (B1) + index GIN sur les colonnes de filtre | Code (avec suite réel-DB) |
| P2-3 | **CSP mode imposé** (S1) après revue des rapports | Code (petit) |
| P2-4 | **Edge rate limiting** (S2) + états transitoires partagés si multi-instances | Infra |
| P2-5 | **Pagination serveur boutique** (E3) à 1 000+ refs | Code |
| P2-6 | **Pages pays + locales au-delà EN** (B3) quand les marchés s'ouvrent | Contenu + config |
| P2-7 | **Bundles dynamiques** (E2), retours self-service (E6) | Code |
| P2-8 | **Long tail couleurs** (R1) + scan d'hex dans le banc visuel | Code (petit) |
| P2-9 | **Partitionnement des tables à volume** (stripe_events, logs) | Base |
| P2-10 | **Archivage des panneaux ops C2x** (R6) après clôture vague 1 | Code (petit) |

### P3 — FUTUR (le moat, après la traction)

| # | Item | Note |
|---|------|------|
| P3-1 | Études longitudinales peau IV–VI (données consenties, cohortes, validation externe publiée — y compris les résultats défavorables) | Le moat scientifique (audit stratégique 10/09) |
| P3-2 | Recherche sémantique (embeddings) en second ressort des règles | Hybride, doc 05 §5 |
| P3-3 | Vision photo (aide déclarée, consentement, jamais un diagnostic) | AIPD renforcé |
| P3-4 | Marketplace pro (paiement de service, souscription de routines co-signées) | Après la preuve de valeur pro |
| P3-5 | Multi-régions + extraction des services les plus coûteux (recherche, IA, images) | Doc 10 §2 palier 4 |

---

## 2. Les 7 phases de consolidation (mission)

| Phase | Contenu | État |
|-------|---------|:----:|
| **1 — Consolidation** | Nettoyage, unification, suppression des doublons | **Terminée (11/09)** : design system tokens + migration palette, 7 modules morts supprimés, package.json corrigé, route produit unitaire, CSP, doc d'architecture (ce dossier). Les doublons historiques (store monolithe, double catalogue, double profil) avaient déjà été consolidés par les agents précédents — vérifié, pas recréés |
| **2 — Stabilisation** | Tests, fiabilité, intégrations réelles | En cours : 121 bancs verts en mode mémoire ; **reste** : `test:realdb` complet (preflight + intégrations + contrats de schéma) sur projet de test avant chaque déploiement + P0-2/P0-3 |
| **3 — Unification Hair + Skin** | Plateforme commune | **Terminée au niveau de l'architecture** (1 profil, 1 catalogue, 1 contrat de diagnostic, 1 moteur de reco, 1 design system) ; **reste** : la parité de substance = P0-1 (données) + P1-1 (filtres) |
| **4 — Beauty Intelligence** | IA + personnalisation | **Socle livré** (feedback→moteur, k-anonymat, explication) ; reste : l'alimentation par la traction réelle (B5) — jamais de données seedées |
| **5 — E-commerce scale** | Conversion + catalogue | **Socle livré** ; reste : P1-1/P1-2 (cross-sell), P2-5 (pagination), le catalogue (P0-1) |
| **6 — International** | Multi-pays/langues/devises | **Socle livré** (juridictions, TVA, i18n, marchés) ; reste : P1-3 (traductions), les vagues d'ouverture par données |
| **7 — Scale mondial** | Millions d'utilisateurs | **Plan posé** (doc 10) : P2-1…P2-9 au palier 100 k–1 M ; P3-5 au palier 10 M |

## 3. « Qu'est-ce qui empêcherait KURLA d'être mondiale avec 1 M d'utilisateurs demain ? »

Réponse honnête, classée :

1. **Le catalogue** (P0-1 → B2) : 3 produits peau live est un frein **produit**
   avant d'être un frein technique. 1 M d'utilisateurs sur 67 produits =
   abandon. **C'est le P0 n°1, et il est opérationnel, pas technique.**
2. **La preuve** (P3-1) : aucune validation de performance sur phototypes IV–VI —
   le frein à la **confiance** mondiale. Le plan existe (tests SPF/whitecast,
   cohortes consenties, publication des résultats).
3. **Le contenu multilingue** (P1-3 → B3) : 2 locales, 3 routes traduites — le frein
   à l'**acquisition** hors FR.
4. **La logistique** (P1-8, vagues) : le frein à l'expérience **Afrique/diaspora**
   (délais, douane, paiement local).
5. **L'infra** : à 1 M, le P2-1…P2-9 tient — **ce n'est pas le frein** ; c'est
   pour cela qu'il est classé P2 et non P0/P1.
6. **La marketplace/professionnels** : frein au **B2B** — P3, après la preuve C-end.

## 4. Vision technique 3 ans (100 k → 1 M → 10 M)

```
ANNÉE 1 — LA PREUVE (→ 100 k)
  Monolithe modulaire Vercel + Supabase (inchangé)
  + cache catalogue + monitoring + EN
  + catalogue 500 refs (FR/NL/BE) + go-live + cohorte France
  Moat accumulé : données consenties, routines suivies, outcomes.

ANNÉE 2 — L'ÉCART (→ 1 M)
  + marchés EU + CI/SN/DOM (logistique + paiement local)
  + recherche sémantique + cross-sell + bundles
  + études longitudinales publiées (phototypes IV–VI)
  Infra : edge limiter, index, partitionnage, workers IA/recherche.
  Moat : la seule base de données longitudinales peau mélaninée consentie.

ANNÉE 3 — LA RÉFÉRENCE (→ 10 M)
  + multi-régions, services extraits (recherche, IA, images)
  + marketplace pro + communauté
  + API publique versionnée (déjà v1 : scoring + catalogue)
  Infra : réplication de lecture, CDN multi-régions, architecture de cohorte.
  Position : la plateforme de référence pour comprendre, choisir et suivre
  une routine adaptée aux peaux et cheveux que l'industrie a ignorés.
```

**Ne pas sur-engineer aujourd'hui** : aucune brique du plan n'exige un
microservice, un data lake ou un ML pipeline en année 1. Le découpage par
domaine du code (stores + routes + inventaires) rend chaque bascule future
mécanique — c'est la préparation, sans le coût.
