# 08 — Architecture internationale : France → monde

> Objectif de la mission : **des systèmes configurables, pas des solutions
> spécifiques à un pays.** État vérifié : la base est posée (juridictions, TVA,
> locales, marchés) ; le contenu et les catalogues locaux sont les chantiers.

---

## 1. Ce qui est déjà international (code)

| Système | État | Détail |
|---------|------|--------|
| **Locales** | FR (défaut, URL nue) + EN (préfixée `/en/…`) | `i18n.ts` : `splitLocale`, `localizedPath`, `hreflangAlternates` (+ `x-default`) ; URLs historiques préservées (le FR n'est jamais préfixé) |
| **Dictionnaires typés** | `translations.ts` : `en: typeof fr` | Le compilateur refuse une clé absente d'une des deux locales — pas de trou de traduction possible sans erreur de build |
| **Traduction de routes** | `routeTranslations.ts` + 40 URLs indexables traduites | Banc `chantier-7-i18n` |
| **Juridictions** | `jurisdiction.ts` + graphe de compliance par juridiction | Restrictions d'ingrédients par pays, appliquées aux recommandations ET au checkout (porte fail-closed) |
| **TVA** | `vat.ts` (taux par pays, reverse charge), `checkoutVat.ts`, VIES B2B | Bancs `chantier-7-vat`, `vat-rate` ; un seul format de TVA (correction B-05) |
| **Marchés** | Taxonomie `market` : FR/BE/CH/CA/CI/SN/DOM/AFR/INT | `countryAvailability` par produit — un produit est disponible où il est légal et sourcé |
| **Sourcing par pays** | `sourcing_country_strategy` (8 pays scorés /40), vagues d'ouverture | L'ouverture d'un marché est une **décision data** (score + 8 gates), pas un flag |
| **Paiement** | Stripe (multi-pays natif) | Monnaie de règlement = devise de la juridiction |
| **CSP/headers** | Indépendants du pays | — |

## 2. L'ordre d'ouverture (décision business, tenue)

**Règle d'or du plan P0** : on n'ouvre pas l'Europe en bloc. Vague 1 = **FR + NL
(+ BG en fallback sourcing)** jusqu'à preuves chiffrées ; GB/US/RP fermés.
Cet ordre est codé en données (vagues 1/2/3 dans `sourcing_country_strategy`),
modifiable sans code.

1. **France** (marché d'ancrage, cohorte de lancement instrumentée)
2. **Europe** : BE, CH, puis NL/DE/ES — TVA + juridictions déjà configurées ;
   il manque la traduction des pages et la disponibilité produit locale.
3. **Afrique francophone / Caraïbe** : CI, SN, DOM (déjà dans la taxonomie des
   marchés) — logistique (délais, douane) et paiement local d'abord.
4. **Diaspora mondiale** : les pages locales + le catalogue diaspora font le reste.

## 3. Ce qui manque par couche (classé)

| Couche | Manque | Classe | Action |
|--------|--------|:------:|--------|
| **Langues** | Corps des 66 pages non traduit (FR/EN) | **P1** | Traduire par famille via le dictionnaire typé (IA en production assistée, validation humaine — doc 05 §5) ; 10 langues = config, pas de code |
| **Langues** | Locales au-delà EN (ES/PT/DE…) | P2 | Le framework accepte l'ajout d'une locale (`LOCALES` + dictionnaire typé) — le coût est le contenu, pas l'ingénierie |
| **Devises** | Affichage multi-devises | P2 | Le calcul est en EUR HT + TVA pays ; l'affichage local est cosmétique (E4) |
| **Taxes** | Taux des pays non EU (CA, CI, SN…) | P2 | `vatRateForCountry` est un tableau — extension par données |
| **Paiements** | Méthodes locales (Mobile Money CI/SN, etc.) | P1 (avant l'Afrique) | Stripe supporte une partie ; le reste = agrégateur local **après** la vague 1 |
| **Livraison** | Couverture et délais par marché | P1 (ops) | `countryFulfillment` + options de livraison configurables ; agrégateur (Sendcloud/Boxtal) |
| **Disponibilité** | Catalogue local par pays | P0 (données) | `countryAvailability` existe — c'est le **sourcing** qui alimente (B2) : un pays s'ouvre quand ses refs sont prouvées |
| **Réglementaire** | Règlements non-UE (COSMED, FDA…) | P1 | Le graphe de juridiction est extensible ; chaque règle = migration + test |
| **SEO** | Pages pays + `hreflang` multi-locales | P2 | `hreflangAlternates` est générique — le sitemap pages-pays suit les locales publiées |
| **Support** | Langue du support, fuseaux | P2 | Tickets déjà en place ; le routage par langue est config |

## 4. Architecture cible d'un « marché »

Un marché = **un jeu de données**, pas du code :

```
market (taxonomie)
├── country / locale / devise d'affichage
├── jurisdiction (règles, restrictions, TVA, reverse charge)
├── availability (quels produits y sont légaux + sourcés)
├── fulfillment (options, délais, seuils de gratuité)
├── payment (méthodes actives)
└── content (traductions publiées, pages locales)
```

**Test d'ouverture d'un marché** (définition de fait, à banquer) :
1. `GET /api/products` filtre par pays sans paramètre spécial (déjà le cas).
2. Le checkout calcule TVA + restrictions du pays (déjà le cas).
3. La locale du marché est complète (dictionnaire typé → le compilateur dit oui).
4. La disponibilité produit couvre ≥ N besoins par pôle (données).
5. Un banc `market-<CODE>` passe.

Quand ces cinq conditions sont remplies, **ouvrir un marché ne contient plus
aucune ligne de code** — c'est l'objectif de la mission (« ne développe pas des
solutions spécifiques impossibles à maintenir »).

## 5. Pièges évités (décisions déjà prises à tenir)

- **FR = locale nue** : jamais rétro-cédera (URLs référencées, SEO).
- **La devise de règlement suit la juridiction**, pas le navigateur (pas de
  conversion client-side, pas de surprise de prix).
- **L'ouverture est par vague, prouvée** : score pays + 8 gates (fichier+date) —
  un marché « ouvert » sans refs prouvées est un mensonge de catalogue.
- **Le contenu médical/réglementaire est localisé avec soin** : « uniformiser »
  n'est jamais « éclaircir » (garde-fou éditorial testé).
