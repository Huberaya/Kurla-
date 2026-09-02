# AUDIT COMPLET KURLA — 2 septembre 2026

**Dépôt audité :** `Huberaya/Kurla-` — commit `b0c26a3` (2026-09-02, « Vrais visuels boutique… 64 SKU »)
**Méthode :** clone du dépôt, installation, exécution réelle du serveur (mode mémoire, sans Supabase/Stripe/Gemini), tests HTTP des API, exécution de la suite complète (114 bancs), `tsc --noEmit`, build de production, lecture du code (302 fichiers src, 270 routes API), comparaison catalogue ↔ stratégie.
**Nature de l'audit :** exigeant et sans complaisance, comme demandé. Les corrections réalisables ont été **appliquées directement dans le code** (§13).

> ⚠️ Limite de périmètre : l'instance Supabase de production, le compte Stripe et la clé Gemini ne sont pas accessibles depuis cet environnement. Tout ce qui dépend de ces services a été audité par le code, les tests et le comportement dégradé réel constaté.

---

## 1. AUDIT GLOBAL — synthèse

| Domaine | Constat |
|---|---|
| **Architecture** | React 19 + Vite + Express + Supabase + Stripe. 270 routes API, stores par domaine, mode mémoire pour les tests. Solide et bien découpée pour un fondateur solo. |
| **Backend** | Prix recalculés côté serveur, stock atomique (réservation → déduction → libération), webhooks Stripe idempotents, TVA par pays (27 taux), auto-liquidation B2B (VIES), machine à états commandes. **Niveau nettement au-dessus de la moyenne des MVP.** |
| **Base de données** | RLS strictes, `SECURITY DEFINER` protégés, contrat de schéma testé. MAIS : **0/17 contrôles d'intégration Supabase réels exécutés** (aucune credential dans le repo — normal, mais la validation réelle reste à faire). |
| **Frontend/UX** | Direction artistique cohérente (sombre/cuivre), mobile-first, `prefers-reduced-motion`, PWA (manifest + SW). Bundle principal 570 KB + admin 342 KB en lazy-load : acceptable. |
| **Catalogue** | **VIDE sans Supabase** (`productsCount: 0` constaté). Les 64 SKU (54 produits + 10 kits) n'existent que dans l'instance Supabase, **tous en PRÉCOMMANDE**, avec des marques *cibles* de sourcing non confirmées et des coûts *objectifs* non négociés. |
| **IA** | Sans `GEMINI_API_KEY`, l'assistant répond en mode gabarit (constaté en live) : réponse structurée honnête, triage médical, sources citées — mais `usefulProducts: []` car catalogue vide. Avec Gemini : contexte catalogue + profil + graphe ingrédients + mémoire consentie. |
| **Paiement** | Stripe **mode test uniquement**. Checkout invité corrigé depuis l'audit du 26/08 (email réel exigé, page `/commande/confirmation` publique sécurisée par session id). |
| **Emails** | `EMAIL_PROVIDER=console` : **aucun email réel n'est envoyé** (confirmations, relances, récupération). Resend/Sendgrid/Postmark supportés mais non configurés. |
| **Admin** | Dashboard riche (CA, commandes, stocks, retours, SAV, cockpit ops/stratégie/sourcing). MAIS : marge calculée TTC (corrigé), CAC absent (corrigé), **22/57 routes admin sans aucun écran appelant** (surface morte). |
| **Analytics** | GA4/Plausible branchables mais **le funnel n'était pas instrumenté** (3 événements seulement). Corrigé : 12 événements couvrant diagnostic → panier → achat. |
| **SEO** | Prérendu de 26 routes statiques, sitemap + robots générés, hreflang fr/en, 404 avec `noindex`. Bon socle. Pages produits/ingrédients dans le sitemap **seulement si Supabase peuplé au build**. |
| **i18n / international** | 2 locales (fr/en, 84 clés), **EUR uniquement** (refus explicite et honnête de convertir), livraison **8 pays UE**. « Plateforme mondiale » : on en est loin, et c'est assumé dans le code. |
| **Sécurité** | Headers, rate limiting, body limits, JWT Supabase vérifié serveur, anti-élévation de rôle, tests d'autorisation négative. Bon niveau. |
| **Qualité** | `tsc` sans erreur, build OK, **114 bancs de tests PASS** (après réparation de 4 bancs cassés livrés dans le repo — voir §13). |

---

## 2. AUDIT PAR RAPPORT À L'OBJECTIF (notes /100)

**Objectif : plateforme mondiale de référence beauté cheveux texturés / peaux mélaninées.**
**Réponse honnête : la plateforme actuelle ne peut PAS encore atteindre cet objectif — non pas à cause de la technique, mais parce qu'elle n'a ni stock, ni fournisseur confirmé, ni encaissement réel, ni trafic, ni la rentabilité unitaire prouvée.**

| Domaine | Note | Justification |
|---|---:|---|
| Produit (plateforme) | **72** | Périmètre fonctionnel impressionnant et cohérent (diagnostic, routines, graphe ingrédients, KURLA ID, communauté, pros). Pénalisé par : catalogue 100 % précommande, modules Pro/consultation encore minces. |
| UX | **68** | Parcours principaux clairs, DA forte, mobile OK. Frictions : diagnostic 8 étapes (le plan exige 5), boutique = cul-de-sac si catalogue vide (corrigé), beaucoup de modules exposés avant d'être utiles. |
| IA | **62** | Architecture sérieuse (guardrails, triage médical, sources, consentement mémoire, AI Act 50(4)). MAIS : sans clé Gemini c'est un gabarit ; la valeur différenciante réelle dépend du remplissage du graphe ingrédients et du catalogue. Pas encore un avantage concurrentiel démontré. |
| Catalogue | **35** | 54 produits + 10 kits + 5 routines bien pensés SUR LE PAPIER. Zéro produit livrable : tout est en précommande, marques cibles non contactées/confirmées, coûts non négociés, conformité UE « à vérifier » par SKU. |
| Personnalisation | **70** | KURLA Fit explicable, profils riches, recommandation hybride testée, relances rétention ciblées. Solide — mais ne vaut que si des produits existent. |
| E-commerce | **58** | Mécanique excellente (prix serveur, stock atomique, TVA, retours, suivi). Bloqué par : Stripe test, emails console, logistique manuelle, aucun produit en stock. |
| Marketing | **30** | Aucun canal actif constaté : pas de pixel configuré, funnel non instrumenté (corrigé), pas de séquences email réelles, contenu TikTok/SEO produit = 0 page produit indexée. Le *plan* marketing (20 actions) est bon ; **l'exécution est à 2/20 actions**. |
| Acquisition | **25** | Waitlist + parrainage codés, mais zéro trafic, zéro créateur signé, zéro contenu publié. Le moteur existe, le carburant n'y est pas. |
| Conversion | **55** | Checkout invité propre, kits bien merchandisés, frais de port explicites. Pénalisé : tout est « précommande » (tue la conversion), pas d'avis clients réels, pas de preuve sociale. |
| Fidélisation | **65** | Loyauté 5 niveaux testée, KURLA+ implémenté (7 € HT/mois), relances J+14/wash-day, alertes réappro prévues Phase 2. Bon socle, non éprouvé. |
| Business model | **40** | **Erreur structurelle détectée et corrigée : marges calculées sur le TTC (45 % affiché = 34 % réel HT ; kits cœur 26-33 %).** Les 3 scénarios financiers à 1 000 visiteurs sont TOUS déficitaires (−554 à −734 €/mois). Le modèle n'est viable qu'avec renégociation des coûts d'achat, AOV > 55 € ou CAC < 8 €. |
| Technologie | **80** | Le point fort du projet : typage strict, 114 bancs, inventaires de routes figés, idempotence, RLS, honnêteté des données (« aucun fait inventé »). Réserves : Node 22 exigé, stores fichiers `data/*.json` hors Supabase, 4 bancs livrés cassés (réparés). |
| Dashboard | **66** | KPI réels (CA, panier moyen, réachat, LTV proxy, marge corrigée, CAC ajouté). Manquent : cohortes de rétention, entonnoir de conversion visualisé, CA par canal, 22 routes admin sans écran. |
| Scalabilité | **60** | Vercel + Supabase + Stripe scalent techniquement. Goulots réels : fulfillment maison, conformité produit manuelle par SKU, un seul opérateur humain. |
| Différenciation | **75** | Le positionnement (transparence ingrédients réglementaire + diagnostic + kits texturés en UE) est réellement différenciant. Personne ne le verra tant qu'il n'y a ni produits ni trafic. |

**Score global pondéré : 55/100** — excellent squelette, quasi-absence de chair commerciale.

---

## 3. AUDIT DU CATALOGUE

### Chiffres constatés (source : `src/lib/launchCatalog.ts` + scripts de publication)
- **54 produits** (pas 18 comme le plan le décide) : Shampoing 4, Co-wash 1, Après-shampoing 1, Masques 3, Leave-in 5, Huiles/Beurres 6, Gels/Coiffants 6, **Accessoires 28** (dont 4 appareils).
- **10 kits** (le plan en décide 6) : 2 ENTRY, 5 CORE, 3 PREMIUM — 39,90 € à 149,90 €.
- **5 routines** (conforme au plan).
- **5/11 outils IA actifs au lancement** (diagnostic, ingrédients, générateur routine, recherche, Beauty Advisor) — conforme.
- **Prix** : 4,90 € à 99,90 € (steamer). Cohérents avec le marché.
- **Marques** : AUCUNE confirmée. `brandTarget` = cibles de négociation (Cantu, Shea Moisture, As I Am, Mielle, Camille Rose, Kinky-Curly, Aunt Jackie's, Aphogee…) + « Private label KURLA » sur 10 SKU et « Accessoire/Device KURLA » sur 32.
- **Marges** : les 45/55/63-67 % affichés étaient calculés **sur le prix TTC** → réel HT : soins **34 %**, karité 45 %, accessoires **56-60 %**, kits cœur **26-35 %** (k01 27 %, k02 26 %, k03 32 %). **Corrigé dans le code.**

### Incohérences catalogue ↔ stratégie (à trancher)
1. **« On lance avec 18 SKU, pas 50 ni 100 »** (justification écrite : trésorerie 4-6 k€, choix non paralysant) **↔ 54 SKU publiés**. Le premier lot de 4-6 k€ ne peut pas couvrir 54 références : soit on assume 54 en précommande pure (risque : délais et déceptions), soit on revient aux 18 SKU du plan pour le premier stock physique. **Décision requise.**
2. **6 kits décidés ↔ 10 kits publiés.** k07-k10 (outils, locs, heatless, steamer) sont pertinents et à meilleure marge que k01-k06 — mais ils contredisent le document de décision. Mettre le plan à jour, pas l'inverse silencieusement.
3. **Kits ENTRY/CORE sous-margés** : k01 (27 % HT) et k02 (26 % HT) sont les kits « stars des recommandations »… et les moins rentables. Avec un CAC de 14 €, **vendre un k02 à 64,90 € rapporte 14,28 € de marge → ~0 € après acquisition**. Options : réduire la remise kit, renégocier les coûts, ou pousser systématiquement un accessoire haute marge (p17, p36) dans chaque kit.
4. **Produits pertinents** : le cœur soins 3A-4C est bien construit (lavage/soin/hydratation/scellement/coiffage couvrent toutes les routines). Les accessoires sont à forte marge et culturellement justes (durag, headwrap, threading, locs).
5. **Produits discutables** : 28 accessoires sur 54 SKU au jour 1, c'est un ratio de bazar, pas de marque de soins ; le steamer à 99,90 € (coût cible 42 €) impose SAV, garantie légale 2 ans et conformité CE appareil électrique — charge disproportionnée au lancement.
6. **Produits manquants** : rien pour peaux mélaninées (SPF sans trace blanche, hyperpigmentation) alors que la promesse d'accueil et le diagnostic peau existent — **la moitié de la promesse de marque n'a aucun produit** ; rien enfants (page Kids existe) ; pas d'échantillons/formats découverte pour réduire le risque du premier achat.

---

## 4. AUDIT DU PARCOURS CLIENT

| Étape | Constat | Frictions |
|---|---|---|
| ARRIVÉE | Home claire, promesse forte, hero soigné. | Peu de preuve sociale réelle (pas d'avis clients vérifiés — normal, zéro vente). |
| DÉCOUVERTE | Sections besoin/textures/routines bien pensées. | Beaucoup de portes d'entrée : risque de dispersion avant le diagnostic. |
| INSCRIPTION | Supabase Auth, récupération mot de passe testée, erreurs traduites. | RAS majeur. Checkout possible en invité (bien). |
| DIAGNOSTIC | Gratuit, non médical, visuels dédiés. | **8 étapes au lieu des 5 décidées (action a08 non faite)** : chaque étape en trop coûte ~10-20 % de complétion. |
| PROFIL | KURLA ID riche, explicable, suppression possible. | Longueur du profil complet ; heureusement optionnel. |
| RECOMMANDATION | Moteur hybride testé, KURLA Fit avec preuves. | **Sans catalogue publié, la reco est vide** (constaté en live : `usefulProducts: []`). |
| PRODUIT | Fiches complètes : variantes, INCI cliquable, conformité pays, avis/questions. | Tout est « [PRÉCOMMANDE] » : message anxiogène sans date de livraison ferme. |
| KIT | Économie affichée, contenu détaillé, cibles claires. | Prix barré = somme des unités : légal si les unités sont réellement vendues à ce prix — OK ici. |
| PANIER | Email invité exigé (corrigé depuis audit 26/08), TVA par pays, frais de port avant paiement. | RAS majeur. |
| PAIEMENT | Stripe Checkout, idempotence, réservation stock, retour `/commande/confirmation` public sécurisé. | **Mode test : aucun euro encaissable aujourd'hui.** |
| APRÈS-VENTE | Suivi colis, retours 30 j, SAV à tickets, notifications. | **Emails en console : le client ne reçoit RIEN en réalité.** Transporteur saisi à la main. |
| RÉACHAT | Relances J+14/wash-day (cron), parrainage, KURLA+, alertes réappro (phase 2). | Cron dépend de `CRON_SECRET` sur Vercel ; boucle non éprouvée en réel. |

---

## 5. AUDIT DE L'IA (testée en réel, mode dégradé)

Cas testés en live : « produits pour 4C très secs avec casse », diagnostic cheveux complet, requêtes invalides, session sans consentement.

**Ce qui est bon (vérifié) :**
- Refus propre des entrées invalides (400 avec message clair), rate limiting 30/min.
- Triage médical : les signaux d'alerte redirigent vers un professionnel, sans diagnostic.
- Sources citées avec statut honnête (`internal_review_pending` — pas de fausse autorité).
- Mémoire conversationnelle **uniquement avec consentement + compte** (RGPD-correct), sessions isolées (testé).
- Contraintes « sans X »/allergies filtrent réellement le catalogue ; budget du profil respecté ; AI Act 50(4) banc dédié.
- Disclaimer non médical systématique.

**Ce qui limite l'avantage concurrentiel :**
- Sans `GEMINI_API_KEY`, c'est un **gabarit statique** — utile mais pas « waouh ». La prod doit avoir la clé + monitoring de coût/latence.
- La recommandation produit de l'IA est vide si le catalogue l'est : **l'IA ne vaut que ce que vaut le catalogue.**
- La base de connaissance interne est en attente de revue (statut affiché) : il faut la faire valider par un(e) pro cheveux texturés pour transformer l'honnêteté en autorité.

**Verdict IA : architecture au-dessus du marché, valeur utilisateur encore théorique. Elle deviendra un avantage concurrentiel quand (1) Gemini est actif en prod, (2) le graphe ingrédients est peuplé et revu, (3) le catalogue permet des recommandations achetables.**

---

## 6. AUDIT BUSINESS

**Comment gagner le premier euro demain ?** Aujourd'hui : **impossible.** Stripe en test, catalogue en précommande sans fournisseur confirmé, emails en console. Le premier euro exige exactement : Stripe live + 1 lot physique de stock (même 15 kits) + emails réels + 10 clientes du réseau direct (le plan « 10 premiers clients » du repo est bon et à 0 €).

**1 € → 1 000 €** : 15-25 commandes. Réseau direct + beta-testeuses + offre -20 % remboursée si insatisfaite. Manque : stock, Stripe live, emails. Rien d'autre.

**1 000 € → 10 000 €** : ~200 commandes. TikTok organique 5-7 vidéos/sem + 4-8 micro-créateurs en barter + parrainage. Manque : banque de contenu (a10), créateurs signés (a15), séquence panier abandonné par EMAIL réel (a16 — la version actuelle est un bandeau client-only), avis clients affichés.

**10 000 € → 100 000 €** : SEO produits/ingrédients (le socle technique existe, il faut du contenu + produits indexés), paid sur créas UGC validées (ROAS > 2,5), réachat automatisé. Manque : pages produit indexées, pixel + funnel mesuré (corrigé côté code), trésorerie de stock (~15-20 k€), 3PL vers 150 commandes/mois.

**100 000 € → 1 M€** : marque propre karité (marge 45-55 % réelle), KURLA+ à l'échelle, marketplace commissionnée, expansion BE/DE. Manque : personne responsable UE + dossiers PIF pour la marque propre, équipe (1-2 personnes ops/contenu), levée ou autofinancement du BFR.

**⚠️ Le problème n°1 découvert par cet audit : l'unit economics était surestimée par l'erreur TVA.**
Scénario central corrigé (1 000 visiteurs, conv. 1,3 %, AOV 42 € TTC, marge HT réelle 34 %, CAC 14 €) : **marge 155 € − acquisition 182 € − fixes 700 € + MRR 60 € = −667 €/mois.** Même l'ambitieux est à −554 €. Trois leviers, à actionner ensemble : (1) coûts d'achat ≤ 46 % du prix TTC (négociation grossiste), (2) AOV ≥ 55 € (kit + accessoire haute marge systématique), (3) CAC ≤ 8 € (organique/parrainage d'abord, paid seulement après ROAS prouvé).

---

## 7. AUDIT MARKETING

**« Si je découvre KURLA sur TikTok ou Google aujourd'hui, ai-je une raison immédiate de m'inscrire ou d'acheter ? »**
**M'inscrire : oui** — le diagnostic gratuit est un vrai hook, la landing est crédible, la waitlist capte l'email. **Acheter : non** — tout est en précommande sans date, aucun avis, aucune preuve, et (dans l'état des services) aucun email de confirmation ne partirait.

- **Proposition de valeur** : claire et différenciante (transparence réglementaire + diagnostic + kits texturés UE). 8/10.
- **Branding** : cohérent, éditorial, non stigmatisant. 8/10.
- **SEO** : socle technique bon (prérendu, sitemap, hreflang, 404 noindex) mais **~29 URLs indexables seulement** ; les pages produits/ingrédients — le vrai réservoir SEO — dépendent de la publication du catalogue. 4/10.
- **Réseaux sociaux / influence / UGC** : tout est planifié (a10-a19), rien n'est exécuté. 1/10.
- **Email** : templates transactionnels codés, provider non branché ; **aucune séquence marketing** (bienvenue post-diagnostic, panier abandonné serveur, post-achat J+14). 2/10.
- **Referral** : parrainage 10/10 € codé côté plan, à activer. 3/10.
- **Mesure** : funnel désormais instrumenté (correctif de cet audit) ; il reste à poser `VITE_GA_MEASUREMENT_ID` ou `VITE_PLAUSIBLE_DOMAIN` en prod. 5/10.

---

## 8. AUDIT DU DASHBOARD ADMIN

**Présent et réel** : CA net/brut (test/live séparés), commandes + cycle de vie, panier moyen, stocks/ruptures, retours + remboursements Stripe, SAV, waitlist, inscrits, recherches sans résultat, produits populaires, usage IA, marge estimée, taux de réachat, LTV proxy, cockpits ops/stratégie/sourcing/achats, gestion lots/DLUO, publication catalogue avec gate de conformité.

**Corrigé par cet audit** : marge estimée calculée sur le TTC (la TVA comptée comme marge) → désormais sur le net ; **CAC** absent → champ de saisie des dépenses d'acquisition + calcul CAC = dépenses/clients uniques + alerte visuelle si CAC > LTV/3.

**Manque encore (P2)** : cohortes de rétention (M+1/M+2/M+3), entonnoir visualisé (visites → diag → panier → achat — les événements existent maintenant, il faut les afficher), CA par canal d'acquisition (UTM), export comptable, vue « part des kits dans les ventes » (KPI a09 du plan). **22 routes admin sur 57 n'ont aucun écran appelant** : de l'API morte à câbler ou à supprimer.

---

## 9. AUDIT TECHNIQUE

**Vérifié en exécution réelle :**
- `tsc --noEmit` : 0 erreur. Build prod : OK. Suite complète : **114 PASS / 0 FAIL** (après réparations ci-dessous).
- **4 bancs de test livrés CASSÉS dans le repo** (réparés par cet audit) : `route_inventory` (10 routes non enregistrées), `admin_route_inventory` (1 route), `chantier_7_prerender` (26e route `/ingredients` non déclarée), `store_api_inventory` (`savePreorderOrder`). Autrement dit : **le filet de sécurité anti-régression était troué au moment du commit « 64 SKU ».**
- API : santé, produits, IA, panier testés en live ; 404 JSON sur routes API inconnues ; rate limiting et body limits vérifiés par bancs.
- Sécurité : autorisation négative testée (headers forgés refusés), anti-élévation de rôle, webhooks signés + idempotents, secrets absents du repo.
- **Points durs restants** : `engines >= 22` (l'environnement 20 fonctionne avec warnings — risque de dérive) ; stores fichiers `data/orders.json`/`idempotency.json` utilisés en fallback local (inertes sur Vercel, mais à ne jamais laisser devenir le chemin réel) ; 3 warnings `import.meta` en build CJS serveur (le fallback env côté client est vide en CJS — sans impact vu l'injection Vite, à nettoyer) ; bundle admin 342 KB (lazy, acceptable) ; **tests d'intégration Supabase réels : 0/17 exécutés** ; pas de monitoring d'erreurs production (Sentry ou équivalent).

---

## 10. PRÉPARATION AU LANCEMENT

# 🔴 NON — KURLA n'est pas prête pour un lancement commercial.

*(Elle est prête pour un pré-lancement : waitlist + diagnostic + contenu, en affichant le statut précommande honnêtement.)*

**BLOQUEURS ABSOLUS (aucun contournement possible) :**
1. **Aucun produit livrable** : 64/64 SKU en précommande, 0 fournisseur confirmé, 0 stock, conformité UE non validée par SKU (le gate existe, les dossiers non).
2. **Stripe en mode test** : aucun encaissement réel possible.
3. **Emails en mode console** : confirmations, suivis et récupérations de compte ne partent pas.
4. **Validation Supabase réelle non exécutée** (0/17 contrôles d'intégration) : lancer sans, c'est découvrir les RLS en production.
5. **Unit economics négative** dans les 3 scénarios du propre plan de KURLA (après correction TVA) : lancer sans renégocier les coûts ou restructurer les prix, c'est financer chaque commande.

---

## 11. GAP ANALYSIS

| Domaine | État actuel | Objectif | Écart | Priorité |
|---|---|---|---|---|
| Approvisionnement | 0 fournisseur confirmé, coûts « cibles » | 18 SKU en stock, 3 devis comparés | Total | **P0** |
| Encaissement | Stripe test | Stripe live + webhook signé prod | Config + KYC Stripe | **P0** |
| Emails | Console | Resend/Postmark + domaine SPF/DKIM | Config + templates déjà codés | **P0** |
| Base de données | Bancs mémoire OK, réel non validé | 17/17 contrôles réels PASS | Exécution `npm run test:realdb` | **P0** |
| Rentabilité unitaire | Marge HT 26-34 % sur kits cœur, CAC cible 14 € | Marge ≥ 45 % HT ou CAC ≤ 8 € | Négociation achat / pricing | **P0** |
| Conformité produit | Gate codé, dossiers vides | Fiche INCI + Règl. 1223/2009 par SKU vendu | Travail réglementaire par SKU | **P0/P1** |
| Catalogue vs plan | 54 SKU / 10 kits publiés vs 18/6 décidés | Un seul document de vérité | Arbitrage fondateur | **P1** |
| Diagnostic | 8 étapes | 5 questions (décision a08) | Refonte légère | **P1** |
| Funnel mesuré | Événements posés (cet audit), provider absent | GA4/Plausible actif + entonnoir dans l'admin | Poser 1 variable d'env + écran | **P1** |
| Contenu/acquisition | 0 vidéo, 0 créateur, 0 article | 10 vidéos, 4-8 créateurs, 20 pages SEO | Production de contenu | **P1** |
| Avis / preuve sociale | 0 | 20 avis + 10 UGC (plan a17) | Premières ventes réelles | **P1** |
| Offre peau/enfants | 0 produit | Couvrir la promesse mélanine + kids | Sourcing vague 2 | **P2** |
| Admin | 22 routes sans écran, pas de cohortes | Cockpit complet | Dev incrémental | **P2** |
| International | fr/en, EUR, 8 pays | Multi-devise, plus de pays | Gros chantier | **P3** |
| Espace Pro / marketplace | Structure codée, offre vide | KURLA Pro 49 €/mois, commissions | Après traction B2C | **P3** |

---

## 12. PLAN CORRECTIF

### P0 — BLOQUANT (avant tout encaissement)
| # | Problème | Impact | Solution | Difficulté | Dépendances | Résultat attendu |
|---|---|---|---|---|---|---|
| P0-1 | Aucun fournisseur confirmé | Aucune vente livrable | Envoyer les 20 demandes de gros (emails prêts dans `docs/sourcing/`), comparer 3 devis, commander lot 4-6 k€ centré sur k02/k03 | Moyenne (externe) | Trésorerie | 18 SKU en stock réel |
| P0-2 | Stripe test | 0 € encaissable | Activer compte live, clés + webhook prod, 1 commande réelle de bout en bout | Faible | KYC Stripe | 1er paiement réel |
| P0-3 | Emails console | Client aveugle post-achat | `EMAIL_PROVIDER=resend` + domaine vérifié SPF/DKIM | Faible | Domaine | Emails transactionnels réels |
| P0-4 | Supabase réel non validé | Risque RLS/stock en prod | Exécuter `npm run test:realdb` (17 contrôles) sur l'instance de prod | Faible | Credentials | 17/17 PASS |
| P0-5 | Marges TTC fausses | Décisions à perte | **CORRIGÉ (code)** + renégocier coûts ≤ 46 % du prix TTC | — / Moyenne | P0-1 | Marge HT réelle ≥ 40-45 % |
| P0-6 | Conformité UE par SKU vendu | Risque légal (Règl. 1223/2009) | Dossier INCI + vérification pour les 18 SKU du lot 1 uniquement | Moyenne | P0-1 | 18 SKU publiables légalement |

### P1 — CRITIQUE (avant la croissance)
- Funnel : poser `VITE_PLAUSIBLE_DOMAIN` (ou GA4) — les événements sont désormais en place (**corrigé**) ; ajouter l'entonnoir à l'admin.
- Diagnostic 8 → 5 questions (décision a08) ; hook diagnostic en tête de home.
- Réconcilier plan (18/6) ↔ catalogue (54/10) : un document de vérité.
- Séquence email : bienvenue post-diagnostic, panier abandonné serveur (l'actuel est client-only), post-achat J+14.
- Banque de contenu : 10 vidéos démo, 4-8 micro-créateurs signés.
- Baselines de tests : **corrigé** (4 bancs réparés) + règle : jamais de commit avec bancs rouges.
- Monitoring erreurs prod (Sentry) + alerte serveur.

### P2 — IMPORTANT (après lancement)
- Cohortes rétention + CA par canal (UTM) dans l'admin ; part des kits dans les ventes (KPI a09).
- Câbler ou supprimer les 22 routes admin orphelines.
- Offre peaux mélaninées (SPF, hyperpigmentation) + enfants : la promesse d'accueil l'exige.
- Avis vérifiés visibles + UGC ; alertes réappro (outil t07).
- Réduire la remise des kits k01/k02 ou y intégrer un accessoire haute marge.

### P3 — FUTUR (scale)
- Multi-devise (GBP, USD, CHF) + zones de livraison élargies ; locales supplémentaires.
- KURLA Pro (diagnostic en fauteuil, 49 €/mois) et marketplace commissionnée.
- Marque propre karité (PIF, personne responsable UE) ; 3PL dès 150 commandes/mois ; analyse photo (t11) après AIPD.

---

## 13. CORRECTIONS APPLIQUÉES DIRECTEMENT (cet audit)

| # | Fichier(s) | Correction | Vérification |
|---|---|---|---|
| 1 | `tests/fixtures/route_inventory.json`, `admin_route_inventory.json` | Baselines régénérées (10 + 1 routes non enregistrées) — 2 bancs réparés | PASS |
| 2 | `tests/chantier_7_prerender.test.ts` | 26e route statique `/ingredients` documentée + assertion dédiée — banc réparé | PASS |
| 3 | `tests/fixtures/store_api_inventory.json` | `savePreorderOrder/1` enregistré — banc réparé | PASS |
| 4 | `src/lib/launchCatalog.ts` | **Marges recalculées sur le prix HT** (produits et kits) + scénarios financiers corrigés (revenu net de TVA) avec notes honnêtes (« le scénario central reste déficitaire à 1 000 visiteurs ») | tsc + bancs PASS |
| 5 | `src/lib/db/adminStore.ts` | Marge estimée du dashboard calculée sur `netAmount` (HT) au lieu du TTC ; port ramené au HT | Banc admin-dashboard PASS |
| 6 | `src/pages/AdminDashboardPage.tsx` | **KPI CAC ajouté** : saisie des dépenses d'acquisition, CAC = dépenses/clients uniques, alerte rouge si CAC > LTV/3 | tsc PASS |
| 7 | `src/lib/analytics.ts` + `App.tsx`, `ProductDetailPage`, `DiagnosticHair/SkinPage`, `AiAssistantWidget` | **Funnel instrumenté** (action a07 du plan) : `view_item`, `add_to_cart`, `remove_from_cart`, `view_item_list`, `diagnostic_start/complete`, `ai_assistant_message`, `search`, `select_promotion` — câblés aux points réels du parcours | tsc + build PASS |
| 8 | `src/pages/BoutiquePage.tsx`, `WaitlistSection.tsx` | **Boutique vide ≠ cul-de-sac** : état dédié « La boutique ouvre très bientôt » → CTA diagnostic + liste de lancement (ancre `#waitlist` ajoutée) au lieu de « Voir tout le catalogue (0) » | tsc + build PASS |
| 9 | `src/lib/businessStrategy.ts` | Incohérence prix KURLA+ corrigée (7,90 € vs 7 € HT/8,40 € TTC implémentés) + hypothèse de marge 45 % remplacée par la réalité (34 % HT, objectif 45 % après renégociation) | Banc membership PASS |
| 10 | `src/components/LaunchPlanSection.tsx` | Note de marge du plan de lancement corrigée (marge HT réelle, cible de renégociation ~46 % du TTC) | Build PASS |

**Validation finale : `npm test` → 114 PASS / 0 FAIL · `tsc --noEmit` → 0 erreur · build prod → OK.**

Non corrigés ici car nécessitant vos accès ou vos décisions : activation Stripe live, provider email, clé Gemini, exécution des tests Supabase réels, sourcing fournisseurs, arbitrage 18 vs 54 SKU, refonte du diagnostic en 5 questions (décision produit à valider avant de toucher au parcours).

---

## 14. NOUVELLE ROADMAP

### AVANT LANCEMENT (bloquant)
Stripe live + webhook · emails réels (Resend + SPF/DKIM) · `test:realdb` 17/17 · 20 demandes de gros envoyées, 3 devis, commande lot 1 (4-6 k€, kits k02/k03 prioritaires) · dossiers conformité des 18 SKU du lot · pixel analytics posé (les événements sont prêts) · arbitrage 18/54 SKU · 10 beta-testeuses réseau (10 commandes réelles + avis).

### 30 JOURS
Diagnostic 5 questions · TikTok 5-7 vidéos/sem (banque a10) · offre de lancement −15 % + livraison offerte dès 49 € · séquence email bienvenue + panier abandonné serveur · 20 avis + 10 UGC publiés · Sentry en prod.

### 60 JOURS
4-8 micro-créateurs (barter/affilié) · parrainage 10/10 € actif · entonnoir visualisé dans l'admin + CA par canal · réassort data-driven (best-sellers du lot 1) · KURLA+ proposé post-achat.

### 90 JOURS
Test paid sur 3 créas UGC (couper si ROAS < 2) · SEO : 20 pages ingrédients/routines rédigées et revues · bilan CAC/LTV par canal → doubler le canal rentable · objectif 100-150 commandes cumulées, CAC < 15 €.

### 6 MOIS
1 000 clientes · 3PL si ≥ 150 commandes/mois · vague 2 catalogue (peau mélaninée + enfants) selon la demande mesurée (texture-gap + recherches sans résultat) · lancement marque propre karité (PIF, personne responsable UE) · cohortes de rétention pilotées.

### 12 MOIS
Expansion BE/LU puis DE (la TVA et les zones de livraison sont déjà codées) · locale supplémentaire si trafic le justifie · KURLA Pro (diagnostic en fauteuil 49 €/mois) · marketplace tierce commissionnée · décision multi-devise · levée éventuelle sur métriques réelles (rétention, CAC/LTV, marge).

---

## 15. VERDICT FINAL

### SCORE KURLA ACTUEL
**55/100** — technique 80, commerce réel 25.

### SCORE APRÈS CORRECTIONS PRIORITAIRES (P0 exécutés)
**78/100** — le reste est de l'exécution marketing et du volume.

### NOMBRE DE BLOQUEURS
**5** (stock/fournisseurs · Stripe live · emails · validation Supabase réelle · unit economics).

### NOMBRE DE PROBLÈMES CRITIQUES (P1)
**7** (funnel provider, diagnostic 8 étapes, plan↔catalogue, séquences email, contenu/créateurs, preuve sociale, monitoring).

### NOMBRE D'AMÉLIORATIONS IMPORTANTES (P2)
**8** (cohortes, routes admin mortes, offre peau/enfants, avis, marges kits, réappro, entonnoir admin, part des kits).

### PRÊT À LANCER ?
# 🔴 NON pour l'encaissement commercial — 🟠 PRESQUE pour un pré-lancement (waitlist + diagnostic + contenu), à condition d'afficher honnêtement le statut précommande.

### LES 10 ACTIONS LES PLUS IMPORTANTES MAINTENANT
1. **Envoyer aujourd'hui les 20 demandes de tarifs grossistes** (les emails sont déjà rédigés dans `docs/sourcing/`) — tout le reste attend derrière.
2. **Activer Stripe live** et passer une vraie commande de bout en bout (paiement → email → suivi → remboursement test).
3. **Brancher un provider email réel** (Resend) avec domaine vérifié — les templates existent déjà.
4. **Exécuter `npm run test:realdb`** contre l'instance Supabase de production : 17/17 exigé.
5. **Renégocier les coûts d'achat à ≤ 46 % du prix TTC** (ou remonter les prix kits) : avec les coûts cibles actuels, chaque commande k02 est ~blanche après acquisition.
6. **Trancher 18 vs 54 SKU** pour le premier stock physique et mettre le document de décision à jour.
7. **Poser `VITE_PLAUSIBLE_DOMAIN` (ou GA4)** en production : le funnel est instrumenté depuis cet audit, il ne manque que le collecteur.
8. **Constituer les dossiers de conformité (Règl. 1223/2009)** des 18 SKU du lot 1 — le gate de publication les exige déjà.
9. **Réduire le diagnostic à 5 questions** et le mettre en hook principal de la home (votre propre décision a08).
10. **Recruter 10 beta-testeuses dans le réseau direct** (offre −20 % remboursée si insatisfaite) : 10 commandes réelles, 10 avis, 10 UGC — la preuve sociale qui manque à tout le reste.

---

**Pourquoi KURLA pourrait échouer :** pas par la technique — elle est au-dessus du marché. KURLA échouerait en (1) vendant à marge réelle quasi nulle sans le voir (corrigé), (2) restant une vitrine précommande sans stock qui brûle sa crédibilité, (3) attendant que le trafic vienne seul. **Comment l'éviter :** exécuter les 5 P0 en 3-4 semaines, lancer petit (18 SKU, 10 clientes réseau), mesurer tout (c'est maintenant possible), et ne scaler l'acquisition qu'une fois CAC < marge/commande prouvé.

---

## ADDENDUM (même jour) — BUG BLOQUANT CONNEXION/INSCRIPTION ET PANIER

**Signalement utilisateur : « la page de connexion/inscription ne s'affiche pas ». Confirmé et corrigé.**

| # | Fichier | Bug | Gravité |
|---|---|---|---|
| 11 | `src/components/AuthModal.tsx` | `if (!isOpen) return null;` placé **avant** le hook `useEffect` du cooldown de renvoi d'email. Violation des règles des hooks React : à l'ouverture de la modale, le nombre de hooks change entre deux rendus → React 19 lève « Rendered more hooks than during the previous render » → **écran blanc au clic sur « Se connecter »**, dans la Navbar ET sur toutes les pages protégées (compte, admin, KURLA ID…). Corrigé : hooks remontés avant le retour anticipé + réinitialisation propre du mode (login/signup/forgot) à chaque réouverture. | **P0** |
| 12 | `src/components/CartDrawer.tsx` | Même pattern : `if (!isOpen) return null;` suivi de `useI18n()` et `React.useMemo` (aperçu TVA). **Le panier plantait à l'ouverture — donc dès le premier ajout au panier** (l'ajout ouvre le tiroir). Corrigé : tous les hooks déclarés avant le retour conditionnel. | **P0** |

Balayage systématique du reste du code (retour anticipé suivi d'un hook) : **aucune autre occurrence** (1 faux positif vérifié dans `BatchAdminPanel`, le retour étant dans une fonction utilitaire).

Validation après correctifs : `tsc` 0 erreur · build OK · **114 bancs PASS / 0 FAIL**.

> Leçon pour la suite : ces deux crashs n'étaient couverts par AUCUN banc (les tests actuels sont serveur/API). Ajouter au chantier P1 un smoke-test UI (Playwright) qui ouvre réellement : modale d'authentification, panier, checkout, diagnostic — sur chaque commit.
