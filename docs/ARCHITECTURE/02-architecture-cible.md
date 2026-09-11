# 02 — Architecture cible : KURLA Beauty, une plateforme

> Objectif : KURLA n'est ni « KURLA Hair + KURLA Skin + des fonctionnalités à côté »,
> ni une moyenne des deux. C'est **une plateforme de beauté personnalisée** dont
> chaque domaine métier (cheveux, peau…) est une spécialisation au-dessus d'un socle
> commun. **HAIR = niveau de référence** ; la règle est de porter SKIN à ce niveau,
> jamais l'inverse.

---

## 1. Le principe structurant

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        KURLA BEAUTY (1 plateforme)                      │
├─────────────────────────────────────────────────────────────────────────┤
│  DOMAINES MÉTIER (spécialisations)                                      │
│  ┌──────────┐ ┌────────── ┌─────────┐ ┌───────────┐ ┌───────────────┐ │
│  │ KURLA    │ │ KURLA    │ │ KURLA   │ │ KURLA     │ │ KURLA Business│ │
│  │ Hair     │ │ Skin     │ │ Kids/   │ │ Experts   │ │ (marketplace, │ │
│  │          │ │          │ │ Famille │ │ (pros)    │ │  marques, B2B)│ │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ └─────┬─────┘ └──────┬────────┘ │
│  ┌────┴────────────┴────────────┴────────────┴──────────────┴─────────┐ │
│  │        KURLA AI — couche d'intelligence partagée                    │ │
│  │  règles explicites par domaine + IA de langage + apprentissage      │ │
│  └──────────────────────────────┬──────────────────────────────────────┘ │
│  ┌──────────────────────────────┴──────────────────────────────────────┐ │
│  │     KURLA BEAUTY INTELLIGENCE — le profil qui relie tout            │ │
│  │  USER → BEAUTY PROFILE → DIAGNOSTICS → GOALS → PRODUCTS →           │ │
│  │  INGREDIENTS → ROUTINES → PURCHASES → FEEDBACK → RECOMMENDATION     │ │
│  └──────────────────────────────┬──────────────────────────────────────┘ │
│  ┌──────────────────────────────┴──────────────────────────────────────┐ │
│  │     SOCLE PLATEFORME (indifférent au domaine)                       │ │
│  │  comptes · catalogue · panier · commandes · paiement · notifications │
│  │  recherche · SEO · i18n · sécurité · RGPD · admin · observabilité    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
─────────────────────────────────────────────────────────────────────────┘
```

**Ce qui est commun (socle)** : compte, profil, IA, catalogue, produits, ingrédients,
recommandations (moteur), routines (framework), historique, analytics, panier,
commandes, paiement, notifications, admin, SEO, i18n, sécurité.

**Ce qui reste spécifique (domaine)** : questions de diagnostic, logique capillaire /
cutanée, paramètres de scoring, modèles de connaissance, routines par domaine,
vocabulaire.

## 2. Les neuf domaines de la plateforme

| Domaine | État actuel | Cible |
|---------|-------------|-------|
| **KURLA Hair** | Pôle de référence (78/100) : diagnostic 8 étapes, boutique, routines, shelf, journal, protective styles, kids, hommes | **Préserver intact** ; devenir le modèle de pattern pour les autres pôles |
| **KURLA Skin** | 42→60/100 : diagnostic 12/5, moteur explicable, routine M/S/H, journal+observance, 3 produits live | Atteindre la parité de **substance** (catalogue réel, filtres complets) — le code est prêt, c'est la donnée qui manque (doc 12) |
| **KURLA Profile** | KURLA ID : `beauty_profiles` unique, historique, confiance par champ, photos consenties, export/suppression RGPD | Standard : tout nouveau champ de profil passe par `normalizeBeautyProfile` + migration + test de confiance |
| **KURLA AI** | Assistant Gemini serveur, catalogue contraint, triage médical, JSON validé, revue humaine | Garder l'IA au rôle de **langage**, les règles au rôle de **verdict** (doc 05) ; ajouter l'explication systématique |
| **KURLA Shop** | Boutique unifiée (cheveux/peau/accessoires/kits/hommes/enfants), filtres, search, comparateur, SEO produits | Catalogue 10 000+ refs : requêtes ciblées, cache CDN, pagination serveur (doc 10) |
| **KURLA Routines** | Builder + adaptatif + routines peau + conflits réels (Shelf) | Une routine = un objet vivant : état, feedback, évolution, réassort — déjà le cas pour cheveux ; étendre à peau |
| **KURLA Experts** | Pros vérifiés + Trust Score + booking + pros peau (6 live) | Spécialités peau (dermato, HPI/SPF) avec critères de confiance peau distincts (doc 12, P1) |
| **KURLA Community** | UGC, avis/questions modérés, communauté | Contenu peau dédié (UGC, guides) — P2 ; la modération est déjà en place |
| **KURLA Business** | Marketplace (contrats, factures, tests), créateurs, B2B (sourcing, RFQ, stratégie pays, texture gap) | Ouvertures par vague (FR/NL/BG d'abord) — la gouvernance 7 validations est la porte d'entrée |

## 3. Le profil beauté : cœur de la plateforme

**Un seul profil par utilisateur** (`beauty_profiles.profile`), structure :

```
BeautyProfile
├── hair   { texture (3A–4C), porosity, density, thickness, length, fiberState,
│            dryness, breakage, elasticity, scalpConcerns[], protectiveStyles,
│            zones (scalp/lengths/ends), … }            ← 19 champs
├── skin   { skinType, hydrationLevel, skinConcerns[17], skinObjectives[12],
│            toneDepth, undertone, phototype (+consent), hyperpigmentationTendency,
│            sensitivity, sensitivities[], currentRoutine, budget, preferences,
│            ageRange, journal[50] }                     ← 15 champs stabilisés
├── goals, habits, usedProducts (Shelf), declaredReactions (outcomes),
├── diagnostics (historique daté), recommendations (traçées), purchases,
└── confidence par champ (calculateProfileConfidence) + versioning
```

**Règles de la SSOT profil** (verrouillées par bancs) :

1. Aucun second profil : le diagnostic cheveux ET le diagnostic peau écrivent dans le
   même enregistrement via `PUT /api/beauty-profile`.
2. Jamais de valeur inventée : un champ inconnu reste `unknown` (littéral `UNKNOWN`),
   la confiance descend, rien n'est déduit (ex. : le phototype n'est jamais déduit de
   la carnation — banc C5).
3. Chaque écriture produit un instantané historique (évolutions comparables).
4. Le profil est exportable/supprimable en un geste (RGPD), y compris photos,
   journal, observance.

## 4. La boucle Beauty Intelligence

Le cycle que la plateforme doit faire tourner (déjà câblé, à compléter par la donnée) :

```
USER
 → BEAUTY PROFILE (diagnostic + Shelf + journal + achats)
 → DIAGNOSTICS (contrat partagé, traceable)
 → GOALS (priorités calculées, jamais imposées)
 → PRODUCTS (catalogue vérifié, disponibilité explicite)
 → INGREDIENTS (graphe : incompatibilités, réglementaire, provenance)
 → ROUTINES (matin/soir/hebdo, conflits sur l'usage réel)
 → PURCHASES (panier→checkout→commande, prix serveur, stock atomique)
 → FEEDBACK (outcomes, journal, observance, avis)
 → AI RECOMMENDATION (moteur rule-based + IA de langage, chaque score expliqué)
 → PERSONALIZATION (le profil s'enrichit → la boucle tourne)
```

**Responsable & RGPD** : l'apprentissage se fait sur les **observations de
l'utilisateur lui-même** (ses produits, ses abandons, ses ressentis) — pas sur des
agrégats qui ré-identifient ; publication k-anonyme par archétype seulement
(banc `kurla_intelligence`) ; le feedback **réordonne** les recommandations, il ne
s'autorise jamais à contourner une règle de sécurité (doc 05, §4).

## 5. Règles d'architecture (non négociables)

1. **Un socle, des spécialisations** : aucun domaine ne recrée le socle (pas de
   second panier, second profil, second catalogue). Si une brique peau a besoin d'une
   fonction du socle, elle l'appelle — jamais elle ne la recopie.
2. **Le serveur est l'autorité** : prix, stock, publiabilité, rôles, vérifications —
   le front ne fait qu'interroger. Un champ que le client peut influencer n'est jamais
   une décision métier.
3. **Jamais de valeur inventée** : une donnée absente est affichée « inconnu » ou
   masquée, jamais complétée par une moyenne, un défaut ou une IA. C'est la règle qui
   fait la confiance KURLA (mesurée dans l'audit : c'est elle qui fait la
   différence avec les concurrents).
4. **Tout ce qui est persisté est gouverné** : table + RLS + migration versionnée +
   test. Un module de domaine = fonctions pures + binding + inventaire.
5. **Toute règle de sécurité est un banc** : les guards sont testés négativement
   (falsification de headers, tokens invalides, élévation de rôle, prix falsifiés).
6. **L'IA formule, les règles décident** : doc 05.
7. **La croissance par configuration** : pays, langues, devises, taux de TVA,
   juridictions = données (tableaux/graphe), pas de code branché à un pays (doc 08).

## 6. Ce que cette architecture n'est PAS

- **Pas** une monorepo microservices aujourd'hui : un serveur Express monolithique
  modulaire (routes + stores par domaine) tient 10× mieux la charge actuelle qu'une
  distribution prématurée. La doc 10 donne le point de bascule et le plan.
- **Pas** un ERP : les briques « opérations » (sourcing, lots, facturation) servent
  le commerce sans stock de KURLA ; elles restent dans le même dépôt mais n'entrent
  pas dans le parcours client.
- **Pas** une moyenne Hair/Skin : quand les deux diffèrent, c'est Hair qui donne le
  standard d'exigence (traceabilité, explicabilité, absence d'invention) — Skin est
  déjà aligné sur ce standard ; l'écart restant est de substance (catalogue), pas
  d'architecture.
