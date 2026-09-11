# KURLA BEAUTY — Architecture consolidée

> **Date :** 11 septembre 2026
> **Rôle :** Lead Architect / CTO — mission de consolidation technique
> **Méthode :** comprendre → auditer → consolider → normaliser → corriger → intégrer
> **Règle absolue respectée :** aucune réécriture à zéro, aucun travail existant détruit, aucune application créée à côté.

---

## Comment lire ce dossier

Ce dossier est la **source de vérité technique** de la plateforme. Les documents
d'audit historiques (racine du dépôt : `AUDIT_*.md`, `PLAN_*.md`, `docs/*.md`) restent
valables comme traces historiques ; quand ils entrent en contradiction avec ce dossier,
**ce dossier prime** — il reflète l'état réel du code au 11/09/2026, vérifié banc par banc.

| # | Document | Contenu |
|---|----------|---------|
| 01 | [architecture-actuelle.md](./01-architecture-actuelle.md) | Ce qui existe réellement, vérifié dans le code |
| 02 | [architecture-cible.md](./02-architecture-cible.md) | KURLA Beauty : une plateforme, neuf domaines, un profil |
| 03 | [audit-code.md](./03-audit-code.md) | Audit code complet : DELETE / MERGE / REFACTOR / KEEP / REBUILD |
| 04 | [matrice-hair-skin.md](./04-matrice-hair-skin.md) | Matrice des fonctionnalités Hair / Skin / Commun |
| 05 | [ia-architecture.md](./05-ia-architecture.md) | Ce qui est rule-based, IA, hybride — et pourquoi |
| 06 | [donnees-architecture.md](./06-donnees-architecture.md) | Single Source of Truth, Beauty Profile, modèle de données |
| 07 | [ecommerce-architecture.md](./07-ecommerce-architecture.md) | Parcours e-commerce de bout en bout |
| 08 | [international-architecture.md](./08-international-architecture.md) | France → Europe → monde : systèmes configurables |
| 09 | [securite-gdpr.md](./09-securite-gdpr.md) | Sécurité + RGPD, vulnérabilités corrigées |
| 10 | [scalabilite-performance.md](./10-scalabilite-performance.md) | 10 k → 10 M d'utilisateurs : ce qui casse, ce qui tient |
| 11 | [design-system.md](./11-design-system.md) | Design system KURLA : tokens, typographie, migration |
| 12 | [roadmap-technique.md](./12-roadmap-technique.md) | Phases 1→7, priorités P0/P1/P2/P3, vision 3 ans |
| 13 | [etat-final.md](./13-etat-final.md) | Ce qui a été consolidé dans cette session + état final |

**Plan d'exécution (chantiers G/P/L/I/S, critères d'acceptation, jalons M1–M5) :**
[`PLAN_CHANTIERS_PLATEFORME_SOLID_2026-09-11.md`](../../PLAN_CHANTIERS_PLATEFORME_SOLID_2026-09-11.md)

---

## Synthèse exécutive (5 minutes)

### Ce que l'audit a trouvé

Le dépôt n'est **pas** l'assemblage de projets que la mission craignait : les agents
précédents ont déjà opéré une première consolidation (store monolithe de 6 240 lignes
découpé par domaine en 43 modules, catalogue unique avec couche de rapport peau, profil
beauté unique, moteur de recommandation v2 partagé, 83 migrations, 121 bancs de tests).
L'audit a vérifié chaque affirmation dans le code — pas dans les documents.

Ce qui restait réel :

1. **Aucun design system** : 107 couleurs hexadécimales dispersées, 5 couleurs cœur
   répétées ~9 000 fois en dur, police Inter chargée mais jamais appliquée.
2. **Code mort** : 7 modules sans aucun import (dont 2 composants 3D, 2 bases de
   connaissance orphelines, 1 scoring orphelin, 1 composant obsolète).
3. **Défaut de performance e-commerce** : ouvrir une fiche produit chargeait **tout le
   catalogue** (produits + variantes + images + devis kits) pour en extraire un.
4. **Aucune Content-Security-Policy** ; un handler inline dans `index.html`.
5. **package.json** : 2 clés dupliquées (dont `vite` présent à la fois en
   dependencies et devDependencies).
6. **6 modules de données « vivants par leurs seuls tests »** : pipelines de données
   réglementaires ou de staging catalogue jamais branchés sur l'application.
7. **i18n partielle** : framework FR/EN solide (dictionnaire typé, le compilateur
   verrouille la parité des clés) mais corps de pages non traduit.
8. **Aucune documentation d'architecture consolidée** : la connaissance était dispersée
   dans ~30 documents historiques de chantiers.

### Ce qui a été fait dans cette session (code réel, testé)

- **Design system KURLA** : 15 tokens de marque (couleurs + polices) dans `@theme`
  Tailwind v4 ; migration des 12 couleurs cœur sur tout `src/` (~9 700 occurrences) ;
  **Inter est enfin appliqué** (corrigé : `--font-sans` pointait sur les polices système).
- **Code mort supprimé** : 7 fichiers (vérification du graphe d'imports avant chaque
  suppression ; outillage `scripts/findDeadCode.mjs` conservé).
- **Route `GET /api/products/:productId`** : fiche produit unitaire, projection
  identique à la liste (verrouillé par test), client mis à jour ; inventaires de
  référence régénérés et revus.
- **Sécurité** : CSP Report-Only en production (script-src sans `'unsafe-inline'` —
  le dernier handler inline a été déplacé dans `public/fonts.js`), test de durcissement
  étendu pour la verrouiller.
- **package.json** : duplicités supprimées.
- **121 bancs de tests** : suite complète verte, `tsc` strict propre, build OK.

### L'essentiel de l'état final

- **1 plateforme** : 298 routes API, 303 méthodes de store par domaine, 83 migrations,
  123 tables, 66 pages, 1 profil utilisateur unique (`beauty_profiles`), 1 catalogue
  unique (`products`), 1 contrat de résultat de diagnostic partagé (`diagnosticResult.ts`),
  1 moteur de recommandation orchestrateur (`recommendationEngine.ts`) alimenté par des
  règles explicites par domaine (`kurlaFit` cheveux, `skinRecommendation` peau).
- **Hair = référence, préservé** : aucun parcours cheveux n'a été régressé (suite verte).
- **Skin au même standard de plateforme** (pas encore de catalogue : 3 produits peau
  live vs 15 besoins — le goulot est opérationnel/sourcing, pas technique : voir 12).

Le détail, chiffres et preuves à l'appui, est dans les documents 01 à 13.
