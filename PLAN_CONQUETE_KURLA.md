# KURLA BEAUTY — PLAN DE CONQUÊTE (France → Europe → Afrique → Monde)

> Document **décidé**, pas une liste d'options. Chaque « nous allons » est un engagement d'exécution.
> Les chiffres internes viennent du code (`launchCatalog.ts`, `businessStrategy.ts`) et du Business Control Center.
> Les chiffres de marché sont cités en source. Les montants d'hypothèse sont étiquetés comme tels.
> **Règle d'expansion :** on n'ouvre un marché que sur des *preuves* (voir §27), jamais par ambition.

---

## 1. Diagnostic de notre position actuelle (le KURLA réel, pas imaginé)

**Ce qui existe et fonctionne aujourd'hui :**
- **Catalogue : 54 SKU** (26 soins + 28 outils) **+ 10 kits + 5 routines**, publiés en **précommande**, avec visuels éditoriaux par famille.
- **5 outils IA gratuits au jour 1 :** diagnostic cheveux, transparence/graphe ingrédients (traçable jusqu'aux restrictions réglementaires), générateur de routine, recherche sémantique, Beauty Advisor conversationnel.
- **Personnalisation :** le diagnostic produit un type de cheveu + une routine + une recommandation kit/produit.
- **Paiement :** Stripe intégré (mode **TEST** aujourd'hui ; le passage en **LIVE** est la priorité n°1). 1 commande test payée en base.
- **Logistique :** grille de livraison paramétrée pour **FR, BE, LU, DE, ES, IT, NL, PT + DOM/INT**, en **EUR** (2–6 jours ouvrés).
- **Langues : fr + en.** Devise unique : **EUR**.
- **Données :** profil beauté, diagnostic, panier, commandes, avis ; attribution canal (UTM) **instrumentée** (colonne `orders.attribution`).
- **Business Control Center admin** : plan, ventes réelles (top produits/kits/canaux), KPI, roadmap, actions.
- **Communauté mobilisable :** réseau fondateur + beta-testeuses communautés cheveux texturés (Groupes FB, Discord) pour les 100 premiers clients.

**Forces défendables (le moat) :**
1. Le **graphe d'ingrédients traçable** (personne ne combine diagnostic + preuve ingrédient + achat au même endroit).
2. La **confiance érigée en règle** (diagnostic/transparence gratuits à jamais).
3. Le **diagnostic → routine → kit** qui supprime la paralysie du choix et dirige vers des paniers à plus fort AOV.

**Faiblesses à corriger avant de scaler (honnêteté) :**
- Paiement en TEST (pas d'encaissement réel) ; sourcing non engagé (coûts = *cibles*, pas devis) ; pas de SIRET/livraison réelle.
- Marge soins ~34 % HT en l'état (objectif 45 % après négoce) ; gamme **peau non lancée** (coming soon) ; 1 seule langue déployée à fond (le fr ; l'en existe en structure).
- Trafic ≈ 0 au démarrage ; pas encore de créas organiques validées.

**Conclusion du diagnostic :** on a une **machine prête à vendre et à tout mesurer**, mais pas encore de carburant (trafic) ni de mise à feu (Stripe live + 1er lot). La conquête commence donc par **débloquer l'encaissement et allumer TikTok/SEO**, pas par ouvrir de nouveaux pays.

---

## 2. Analyse des marchés

### 2.1 FRANCE — notre arène
- Les personnes afro-descendantes/métisses représentent **~5 % de la population** (3–3,5 M personnes ; estimation CRAN/Gourévitch), certains chiffrages plus larges évoquent 18–20 % en incluant tous les cheveux bouclés-frisés-crépus ([Le Monde](https://www.lemonde.fr/societe/article/2020/10/18/coiffure-afro-en-finir-avec-l-apartheid-capillaire_6056474_3224.html), [Ministère de la Culture](https://www.culture.gouv.fr/Media/Thematiques/Patrimoine-culturel-immateriel/Files/Fiches-inventaire-du-PCI/Les-techniques-de-coiffure-d-origine-africaine-en-region-parisienne)).
- Le marché des cheveux **bouclés à frisés est estimé ~1,1 Md€** en France ([Le Figaro/Madame](https://madame.lefigaro.fr/beaute/metis-ou-afro-en-france-on-ne-reconnait-pas-la-diversite-de-la-population-200516-113708)).
- Les femmes afro-françaises **dépensent plus** que la moyenne : **~80 €/mois** de budget beauté/cheveux (étude entrepreneur citée par [Maddyness](https://www.maddyness.com/2021/04/30/cosmetique-marche-peaux-noires/)).
- **Sous-équipement massif :** il faudrait **~17 000 salons** capables de traiter le BFC (bouclés-frisés-crépus) ; en Île-de-France, zone où le besoin est le plus fort, **< 150 enseignes** ([Le Monde](https://www.lemonde.fr/societe/article/2020/10/18/coiffure-afro-en-finir-avec-l-apartheid-capillaire_6056474_3224.html)).
- **Zones prioritaires (concentration + pouvoir d'achat + densité digitale) :** ① Île-de-France (Paris, Château-Rouge/Château-d'Eau, banlieues), ② Lyon, ③ Marseille/Aix, ④ Bordeaux/Lille/Toulouse (vague suivante).
- **Problème non résolu :** l'hydratation qui ne tient pas sur cheveu crépu (4C), et l'absence de conseil fiable. C'est exactement notre promesse.

### 2.2 EUROPE — segmentée, pas un bloc
- L'Europe pèse **24–26 % du marché mondial du soin cheveu texturé** ; **UK, France, Allemagne** concentrent ~72 % de la demande régionale ([360researchreports](https://www.360researchreports.com/market-reports/black-hair-care-market-214679), [openPR/Dimension](https://www.openpr.com/news/4500852/europe-black-hair-care-market-to-reach-977-9-million-by-2034-as)). ~41 % des consommateurs européens **achètent des produits importés** car la disponibilité locale reste faible ([Industry Research](https://www.industryresearch.biz/market-reports/black-hair-care-118353)).
- Le marché européen du soin cheveu « black » est projeté à **~978 M$ d'ici 2034**, UK/France/Allemagne en tête ([openPR](https://www.openpr.com/news/4500852/)).

**Classement des pays (notation 1–5 sur 10 critères pondérés : densité cible, e-commerce, pouvoir d'achat, CAC, concurrence faible = mieux, logistique, langue, compatibilité offre, récurrence, réglementation) :**

| Rang | Pays | Score /40 | Pourquoi | Vague |
|---|---|---|---|---|
| 1 | **Belgique + Luxembourg** | 28 | Francophones (zéro traduction), livraison déjà tarifée, diaspora afro dense (Bruxelles), logistique 3–5 j, même cadre UE | **Vague 1** |
| 2 | **Royaume-Uni** | 34 | Plus gros marché mature, e-commerce fort, concurrence forte mais demande énorme ; nécessite **EN + GBP** | Vague 2 (après localisation) |
| 3 | **Allemagne** | 29 | Gros pouvoir d'achat, demande forte, mais langue **DE** + concurrence établie | Vague 2 |
| 4 | **Pays-Bas** | 26 | Très forte diaspora afro (Suriname/Afrikanen), e-commerce excellent, EN largement compris | Vague 2 |
| 5 | **Suisse** | 24 | Pouvoir d'achat très élevé, prix premium acceptés, FR/EN ; hors UE (douane/TVA) | Vague 3 |
| 6 | **Espagne** | 22 | Demande émergente, langue ES, marché plus petit | Vague 3 |
| 7 | **Italie** | 21 | Diaspora grandissante, langue IT | Vague 3 |
| 8 | **Portugal** | 20 | Pont vers lusophone/Afrique, marché mince | Vague 3 |

> Décision : on **n'attaque pas l'Europe par l'Allemagne** (gros mais coûteux et germanophone). On prend d'abord la **Belgique francophone** (même langue, même devise, livraison déjà prête) comme répétition générale à faible risque.

### 2.3 AFRIQUE — pays par pays, pas « l'Afrique »
- Marché cheveux Afrique **~3,5 Md$ en 2025**, CAGR **~7–8 %** ; l'Afrique du Sud pèse **25–30 %** de la valeur régionale, le **Nigeria croît le plus vite (8–12 %/an)**, Ghana/Éthiopie/Côte d'Ivoire 7–10 % ; **Maroc/Égypte plus stables (4–6 %)** ([IndexBox](https://www.indexbox.io/store/africa-hair-skin-care-market-analysis-forecast-size-trends-and-insights/), [Technavio](https://www.technavio.com/report/haircare-market-size-industry-in-africa-analysis), [Mordor](https://www.mordorintelligence.com/industry-reports/africa-cosmeceutical-market)).
- E-commerce : **20–25 % des ventes urbaines** en Afrique du Sud/Kenya d'ici 2035, **10–15 %** au Nigeria ; le **cheveu représente 50–55 % de la dépense** beauté en Afrique subsaharienne ([IndexBox](https://www.indexbox.io/store/africa-hair-skin-care-market-analysis-forecast-size-trends-and-insights/)).
- Le Nigeria est **mass-market à 80–90 %** (prix bas) ; l'**Afrique du Sud a un segment premium de 15–20 %** et un retail mature ([IndexBox](https://www.indexbox.io/store/africa-hair-skin-care-market-analysis-forecast-size-trends-and-insights/)).

| Pays | Demande | Pouvoir d'achat / e-com | Paiement/livraison | Rôle pour KURLA | Modèle d'entrée |
|---|---|---|---|---|---|
| **Sénégal** | Fort, culture cheveu, Dakar digitale | Moyen, mobile money (Wave/Orange) | Mobile money, livraison urbaine | **Tête de pont Afrique de l'Ouest** + lien sourcing karité | **Partenariat distributeur local + marketplace** |
| **Côte d'Ivoire** | Fort, Abidjan hub régional | Moyen+, forte conso beauté | Mobile money, retail dynamique | Hub logistique UEMOA | **Distributeur + marketplace (Jumia/Glovo)** |
| **Ghana** | Fort, **karité natif** | Moyen | Mobile money | **Sourcing + marque propre** (karité) avant tout | Partenariat sourcing + e-commerce limité |
| **Nigeria** | **Énorme** (220 M hab.) | Faible prix unitaire, e-com 10–15 % | Paiement fragmenté, logistique dure | Volume futur, **pas en 1er** (prix/logistique) | Marketplace (Jumia/Konga) + partenaire local, **plus tard** |
| **Afrique du Sud** | Mature, premium 15–20 % | Élevé, e-com 20–25 %, cartes | Cartes + livraison développées | **1er marché e-commerce premium africain** | E-commerce direct via partenaire de fulfilment |
| **Maroc** | Stable, huiles/argan | Moyen, tourisme | Cartes + cash | Sourcing argan, marché niche | Plus tard (partenariat) |

> Décision Afrique : **on ne vend pas d'abord en Afrique.** On y va en **deux temps** : (a) dès la phase France, on utilise **Ghana/Afrique de l'Ouest comme base de sourcing marque propre** (karité, marge 45–55 %) ; (b) la **vente** démarre par l'**Afrique du Sud en e-commerce premium** (cartes + livraison matures) et le **Sénégal/Côte d'Ivoire via distributeur + marketplace + mobile money**, jamais en direct avant d'avoir un partenaire logistique fiable.

---

## 3 & 4. Segmentation multidimensionnelle et classement

| Axe | Segments |
|---|---|
| **Besoin** | ① hydratation/sécheresse 4C ② casse/réparation ③ définition boucles ④ pousse/cuir chevelu ⑤ coiffures protectrices/locs ⑥ entretien hommes ⑦ (plus tard) peau : taches/sensible/SPF |
| **Type de client** | Débutant perdu · Expérimentée · Cherche-une-routine · Budget · Premium · Sensible-ingrédients · Pro (coiffeuse) · Homme |
| **Valeur économique** | Forte fréquence (soins cœur, réachat 6–8 sem) · Panier élevé (kits premium, appareils) · Forte LTV (abonnée + réachat) · Facile à acquérir (TikTok débutante) · Recommandeuse active (communauté) |
| **Maturité** | Problème non résolu → recherche active → prête à acheter → récurrente → ambassadrice |

**Classement des segments par priorité (croisement besoin × valeur × accessibilité) :**

| Priorité | Segment | Besoin | Type | Valeur | Pourquoi lui en premier |
|---|---|---|---|---|---|
| **1 (beachhead)** | **Femme 4C « Aminata »** | Hydratation qui ne tient pas | Cherche-une-routine, prête à payer | AOV kit élevé, réachat fort, recommande | Douleur la plus vive, mal servie (<150 salons en IdF), parfaite pour le diagnostic+kit |
| 2 | Débutante bouclée 3A-3C « Inès » | Ne sait pas par où commencer | Débutant, budget | Acquisition TikTok bon marché | Volume top de funnel, kit ENTRY K01 |
| 3 | Maman vigilante « Camille » | Greenwashing/ingrédients | Sensible-ingrédients | Forte confiance/réachat, abonnée Plus | Arme = transparence ingrédient + SEO |
| 4 | Hommes / grooming & locs | Entretien locs/cheveux courts | Spécialisé | Très peu servi en ligne EU | Kits K08, marge outils élevée |
| 5 | Coiffeuse pro « Fatou » | Outil en fauteuil | Pro | MRR récurrent B2B (49 €/mois) | Phase 4 |
| 6 | Peau (mélanine) | Taches/SPF/sensible | Prête à acheter | Large, mais gamme absente | **Après lancement gamme peau** (coming soon) |

---

## 5. CHOIX DU BEACHHEAD MARKET

> **« Pendant la première phase (M0–M6), KURLA conquiert les femmes aux cheveux crépus/afro de TYPE 4 (4A–4C), âgées de 25 à 40 ans, situées principalement en Île-DE-FRANCE et à Lyon, dont le problème douloureux est "une hydratation qui ne tient pas / des produits qui ne marchent pas", en leur vendant des KITS ROUTINE GUIDÉS (K02 Hydratation 3C/4A à 64,90 € et K03 Nutrition profonde 4B/4C à 69,90 €, avec l'entonnoir K01 à 49,90 € pour les budget), acquis via un DIAGNOSTIC GRATUIT de 5 questions, le carburant étant TIKTOK ORGANIQUE (démos diagnostic + avant/après + décryptage ingrédient) et le SEO long-tail ("routine 4C", "leave-in crépus"). »**

**Justification :** douleur aiguë et chronique (budget ~80 €/mois) · sous-équipement massif (<150 salons en IdF) · CAC organique faible sur TikTok où la cible est native · AOV kit élevé (64,90–69,90 €) et réachat des soins cœur tous les 6–8 sem · LTV forte (réachat + KURLA+ + parrainage dans une communauté intime et prescriptrice) · différenciation maximale (personne ne prouve ingrédient par ingrédient).

---

## 6. Persona principal

**Aminata — « J'ai tout essayé », 26–35 ans, IdF/Lyon, cheveux 4C.**
- **Douleur :** « J'achète des produits qui promettent et qui n'hydratent pas, je ne sais plus qui croire. »
- **Ce qui la décide :** un avant/après qui lui ressemble, une UGC de femme 4C, un diagnostic qui lui dit **précisément** quoi mettre, et la preuve ingrédient.
- **Objection :** méfiance (encore une marque qui promet) et peur du paiement en ligne → on répond par garantie 30 j, transparence, Stripe rassurant.
- **Parcours type :** TikTok → vidéo diagnostic → diagnostic gratuit → résultat « ta routine 4C » → **K03 préselectionné** → panier avec add-on (gel p14 8,90 €, fro pick p35 4,90 €) → achat → email routine → résultat → UGC/parrainage.

---

## 7. Offre d'entrée exacte

- **Produit d'acquisition (aimant) :** le **diagnostic gratuit 5 questions** (0 €) — aucune fonction de confiance payante.
- **Offre de conversion (hero) :** **K03 Nutrition profonde 4B/4C — 69,90 €** (p03 co-wash, p05 masque karité, p08 leave-in riche, p09 karité, p12 crème twist) ; **K02 64,90 €** pour les 3C/4A.
- **Offre de lancement :** **kit −15 % + livraison offerte dès 49 € + 1 mois KURLA+ offert + satisfait-ou-remboursé 30 j.**
- **Cross-sell panier :** add-ons low-cost à marge outils (p35 fro pick 4,90 €, p21 edges 5,90 €, p14 gel 8,90 €) → objectif AOV **42 € → 55 €** avec add-ons.
- **Réachat :** alerte fin de produit (cycle 6–8 sem) avec **réappro −10 %**, email routine.

---

## 8. Positionnement et message

- **Positionnement :** « Le coiffeur-conseil honnête pour les cheveux texturés. »
- **Promesse répétée (le message de conquête) :** **« Arrête d'acheter au hasard. 5 questions, ta routine 4C, des produits qui marchent — et on te montre pourquoi, ingrédient par ingrédient. »**
- **Problème utilisé pour capter :** « Tes cheveux crépus restent secs quoi que tu mettes ? »
- **CTA unique :** **« Fais ton diagnostic gratuit »** (jamais « achète » en premier).
- Ton : vouvoiement côté service, proximité côté contenu (« tu » sur TikTok).

---

## 9. Plan de conquête France (territoires & séquence)

**Ordre territorial :** ① Île-de-France (Paris + banlieues) → ② Lyon → ③ Marseille/Aix → ④ Bordeaux/Lille/Toulouse.
Ciblage géographique des créas/créateurs par ville ; les créateurs franciliens d'abord (densité + UGC accessible).

**Moteur d'acquisition = la boucle :** Contenu TikTok/SEO → problème 4C → diagnostic gratuit → Beauty Profile → routine recommandée → **kit K02/K03** → panier (+add-ons) → achat → email de routine → résultat → **UGC + parrainage 10/10 €** → nouveau contenu.

---

## 10. Paliers de clients (France) — stratégie, budget, KPI, condition de passage

| Palier | Quand | Stratégie | Canaux | Offre | Budget marketing cumulé | KPI de sortie | **Condition de passage** |
|---|---|---|---|---|---|---|---|
| **100 clients** | M0–M2 | Réseau + beta + 1ères ventes créateurs | DM réseau, 10 beta-testeuses, TikTok naissant | Kit −20 % pour les 100 premiers, remboursé si insatisfaction | ~1 500 € | 100 commandes, **20 avis, 10 UGC**, CAC < 20 € | **Témoignages + 1 créa qui convertit** |
| **1 000 clients** | M3–M6 | TikTok organique + 4–8 créateurs/mois + parrainage | TikTok 5–7 vid/sem, SEO 3–4/sem, micro-influenceurs | Kit −15 % + livraison offerte 49 € | ~9 000 € total | **90 cmd/mois, conv. ≥1,2 %, CAC < 15 €, AOV ≥ 42 €** | **Funnel rentable sur 1 canal (ROAS organique positif)** |
| **10 000 clients** | M7–M18 | Paid scaling sur créas validées + SEO massif + lancement Belgique | TikTok/IG Ads (ROAS>2,5), SEO >100k pages, referral | Réachat −10 %, KURLA+, kits premium | ~40–60 k€ | **620 cmd/mois, CA ~28 k€/mois, réachat 90 j ≥ 25 %** | **Marge contributive positive par canal + Belgique ouverte** |
| **50 000 clients** | M19–M36 | Marque propre (karité) + marketplace + Europe scale + Afrique du Sud pilot | Omnicanal, marque, B2B naissant | Gamme élargie, abonnements, fidélité | ~25 k€/mois à plein régime | **CA ~127 k€/mois, rentable, 2–3 pays** | **Rentabilité nette mensuelle stable** |

---

## 11. La machine d'acquisition

**Organique (priorité absolue, coût quasi nul) :**
- **TikTok :** 5–7 vidéos/sem — démo écran du diagnostic, avant/après 4C, « décryptage d'étiquette », wash day, réponse DM en vidéo.
- **SEO :** 3–4 publications/sem — pages ingrédient (karité, ricin, gel de lin, romarin), guides « routine 4C/3C/cheveux secs », FAQ long-tail. Objectif >100k URLs indexées (le graphe ingrédient est un avantage de contenu unique).
- **Instagram :** 4–5 posts/sem (reels recyclés, carrousels éducatifs, témoignages) — confiance 30+.
- **Créateurs :** 4–8 micro-créateurs (2k–50k) par mois en **barter puis affilié 10–15 %**, codes suivis (UTM).
- **Communautés :** groupes Facebook/Discord cheveux texturés, co-création avec beta-testeuses.

**Payante (seulement après validation organique) :**
- Canal : **TikTok Ads puis IG/FB Ads** (lookalikes des acheteurs).
- Audience : femmes 22–45, intérêts cheveux texturés/naturels, similaires aux acheteurs 4C.
- Campagne : vidéo UGC « diagnostic → routine 4C » ; landing = le diagnostic (pas la boutique).
- Offre : kit −15 % + livraison offerte.
- **Budget test : 800 €** sur 3 créas (S10) · **CPA/CAC max acceptable : 18 €** au test, **15 €** en scale.
- **Règle d'échelle :** on n'augmente le budget que si **ROAS > 2,5 ET CAC < LTV/3 (~15 €)**. En dessous : on coupe la créa, on ne double pas.

**Partenariats (gagnant-gagnant explicite) :**
- **Salons spécialisés / coiffeuses (Fatou) :** on leur apporte un outil de diagnostic en fauteuil + fiches clientes + revenu de recommandation (code pro / commission sur les kits de leurs clientes) ; ils nous apportent crédibilité, UGC locale, clientes prêtes à acheter et un canal B2B (KURLA Pro, phase 4).
- **Créateurs :** produits gratuits + commission 10–15 % + code promo dédié ; ils apportent audience ciblée et confiance.
- **Associations/communautés afro :** ateliers routine sponsorisés, dons, visibilité ; elles apportent ancrage culturel et confiance.

---

## 12. Stratégie marketing concrète (message / offre / CTA / canal / format / fréquence / budget / KPI)

| Cible | Message | Offre | CTA | Canal | Format | Fréquence | Budget/mois | KPI |
|---|---|---|---|---|---|---|---|---|
| Aminata 4C | « L'hydratation qui tient ENFIN » | K03 −15 % | Fais ton diagnostic | TikTok | Avant/après + démo diag | 5–7 vid/sem | 150 € (+600 € créateurs) | Vues→diag→ventes |
| Inès débutante | « Par où commencer ? » | K01 49,90 € | Diagnostic gratuit | TikTok/Snap | « GRWM routine 1ère fois » | 3/sem | inclus | Inscriptions diag |
| Camille vigilante | « Ce que ton étiquette cache » | Transparence | Voir la fiche ingrédient | IG + Google/SEO | Carrousel/pédagogie ingrédient | 3–4/sem | 50 € | Pages ingrédient vues |
| Hommes/locs | « Entretiens tes locs toi-même » | K08 44,90 € | Diagnostic barbe/cheveux | TikTok/IG | Tuto sponge/interlocking | 2/sem | inclus | Ventes K08 |

---

## 13. Stratégie de contenu — la machine reproductible (6 piliers)

| Fonction | Pilier | Sujets | Canal | CTA |
|---|---|---|---|---|
| **Attirer** | « Le problème qui te ressemble » | Avant/après 4C, « pourquoi ça reste sec », erreurs courantes | TikTok/Reels | « Tu te reconnais ? Fais le diag » |
| **Éduquer** | « Décryptage » | Un ingrédient par vidéo, décrypte une étiquette, wash day pas à pas | TikTok + SEO | Lien fiche ingrédient |
| **Confiance** | « La preuve » | Témoignages, UGC, sourcing karité, coulisses, nos garanties | IG/Stories | Avis / garantie |
| **Convertir** | « Ta routine » | Résultat diagnostic, présentation K02/K03, démo kit | TikTok/email | « Voir ma routine / Précommander » |
| **Fidéliser** | « On ne te lâche pas » | Email routine, jour J+7/J+30, alerte réappro, résultats | Email/KURLA+ | Réappro −10 % |
| **Recommander** | « Fais tourner » | Parrainage 10/10 €, mise en avant des ambassadrices | DM/communauté | « Parraine une amie » |

**Système reproductible :** 1 journée de tournage/mois produit **20–30 vidéos brutes** → recyclées en 5–7 TikToks + reels + carrousels + posts SEO par semaine. Le calendrier de contenu suit les **6 piliers en rotation fixe** (pas besoin de nouvelles idées chaque jour). Chaque vidéo renvoie au même CTA : le diagnostic.

---

## 14. Stratégie partenariats (récapitulatif exécutable)
- **Phase 1 (France) :** 5 salons partenaires pilotes en IdF/Lyon (code pro + commission), 4–8 créateurs/mois, 2 associations.
- **Phase Europe :** 1 distributeur/diaspora par pays (Belgique d'abord), créateurs locaux.
- **Phase Afrique :** **partenaires de sourcing** (Ghana/Sénégal karité) **avant** la vente ; puis **distributeur/marketplace** pour la vente (Jumia/Glovo en Afrique de l'Ouest, partenaire fulfilment en Afrique du Sud).

---

## 15. Classement des pays européens
Cf. tableau §2.2 : **BE/LU (28) → UK (34, mais après localisation EN/£) → DE (29) → NL (26) → CH (24) → ES (22) → IT (21) → PT (20).**

---

## 16. Expansion européenne en vagues

- **VAGUE 1 — Belgique (+ Luxembourg), M9–M12.** Segment : mêmes personas francophones. Catalogue : identique (déjà traduit FR). Prix : identiques en € (livraison BE déjà tarifée 6,90 €). Canaux : créateurs belges francophones + TikTok FR étendu. Logistique : fulfilment maison depuis la France, 3–5 j. Budget test : **1 500 €**. **KPI de validation : 30 commandes BE en 60 j, CAC < 18 €, marge contributive positive après frais de port.**
- **VAGUE 2 — UK puis Allemagne/Pays-Bas, M13–M20.** Prérequis : localisation **EN** (UK/NL) et **DE** (Allemagne), devise **£ pour l'UK** (sinon € accepté mais conversion à prévoir). UK = plus gros marché (score 34) mais exige EN+£ → on ouvre UK juste après BE dès que l'EN est déployé. Budget test UK : 4 000 € ; DE : 3 000 € ; NL : 2 000 €. KPI : 50 commandes/pays en 90 j, CAC < LTV/3.
- **VAGUE 3 — Suisse, Espagne, Italie, Portugal, M20+.** Localisation ES/IT ; Suisse = prix premium +10–15 % (pouvoir d'achat) et gestion douane/TVA hors UE. N'ouvrir qu'après rentabilité nette FR+BE+UK stable.

---

## 17. Classement des marchés africains
**Pour la VENTE :** ① Afrique du Sud (premium, e-com mature) ② Sénégal ③ Côte d'Ivoire ④ Ghana (sourcing d'abord) ⑤ Nigeria (volume, plus tard) ⑥ Maroc (niche).
**Pour le SOURCING (dès maintenant) :** Ghana + Afrique de l'Ouest (karité) → avantage marge marque propre.

---

## 18. Stratégie Afrique pays par pays (modèle d'entrée choisi)

| Pays | Modèle d'entrée décidé | Pourquoi ce modèle | Offre/prix | Partenaire |
|---|---|---|---|---|
| **Sénégal** | **Marketplace + distributeur local** (Jumia, boutiques Dakar) | Mobile money + livraison urbaine ; pas de logistique propre | Kits entrée/moyen, prix adapté (−10–15 % vs FR sur l'entrée) | Distributeur cosmétique Dakar |
| **Côte d'Ivoire** | **Distributeur + marketplace (Jumia/Glovo)** | Abidjan = hub UEMOA, retail dynamique | Gamme coiffants/outils (forts vendeurs) | Distributeur Abidjan |
| **Ghana** | **Partenariat sourcing (marque propre karité) d'abord** ; vente e-com limitée ensuite | Karité natif = notre héros marge 45–55 % | Karité brut KURLA | Coopérative/exportateur karité |
| **Afrique du Sud** | **E-commerce direct via partenaire de fulfilment** (cartes + livraison matures) | Seul marché premium/e-com prêt | Kits premium + appareils, prix ≈ EU | 3PL Joburg/Le Cap |
| **Nigeria** | **Marketplace (Jumia/Konga) + partenaire local**, plus tard | Volume énorme mais prix bas, logistique/paiement durs | Petit format/prix entrée uniquement | Partenaire Lagos |

> Principe : **vitesse + risque + coût + contrôle**. On ne porte pas la logistique africaine en propre au début ; on s'appuie sur marketplace/3PL/distributeur, et on garde le contrôle de la marque et de la data client.

---

## 19. Catalogue et offres par marché

| Marché | Entrée | Hero | Premium | Réachat |
|---|---|---|---|---|
| France | Diagnostic gratuit + K01 49,90 € | **K02 64,90 / K03 69,90** | K06 89,90 / K10 149,90 | Soins cœur 6–8 sem, −10 % |
| Belgique | idem FR (FR, €) | K02/K03 | idem | idem |
| UK | Diagnostic EN | Kits (tarif £) | K10 | idem |
| Afrique du Sud | Kits premium + appareils | K03/K06 | K10/steamer | Outils (marge) |
| Sénégal/CI | Outils + coiffants + petits kits | Kits entrée K01/K05 | — | Coiffants forts réachat |
| Ghana | (sourcing karité) | Karité marque propre | — | — |

---

## 20. Pricing international
- **France/BE/LU/Zone € :** prix catalogue tels quels (4,90–149,90 €). Marge minimale acceptable : **35 % HT** sur les soins, **45 %** sur les outils.
- **UK :** tarification en **£** avec arrondi psychologique, **+5–10 %** pour absorber conversion/frais ; rester concurrentiel vs retailers UK matures.
- **Suisse :** **+10–15 %** (pouvoir d'achat, positioning premium), gestion TVA/douane.
- **Afrique du Sud :** alignement premium EU (cartes, segment 15–20 % premium).
- **Sénégal/CI/Ghana :** **entrée de gamme adaptée au pouvoir d'achat** : pousser les **outils à forte marge** (4,90–14,90 €) et petits kits (K01/K05), où le coût sourcing est bas même à prix réduit ; éviter d'y vendre les appareils 99–149 € d'abord.
- **Nigeria :** uniquement petits formats/prix via marketplace.
- **Règle :** on ne convertit pas un prix en devise ; on fixe un prix que le marché paie, en garantissant la marge minimale par catégorie.

---

## 21. Plan logistique
- **France/Belgique :** fulfilment **maison** au départ (maîtrise coût/qualité), Colissimo/points relais, livraison offerte dès 49 € (FR) / 80 € (BE), 2–5 jours.
- **Seuil de bascule 3PL :** dès **~150 commandes/mois**, externaliser vers un logisticien (FR puis EU).
- **UK/DE/NL :** 3PL EU avec stock déporté ou cross-border depuis FR selon les volumes (cross-border d'abord, stock local dès que le volume justifie).
- **Afrique du Sud :** partenaire fulfilment local (pas de stock propre au début).
- **Afrique de l'Ouest :** distributeur/marketplace gère la dernière partie ; KURLA fournit en gros.
- **Stock 1er lot :** 4–6 k€ HT focalisé sur les kits (les kits prédisent la demande → stock mort minimisé).

---

## 22. Roadmap mensuelle des 12 premiers mois

| Mois | Marché/segment | Offre | Objectif clients (cumul) | Objectif CA/mois | Budget marketing | Fonctionnalités | Campagnes/partenariats | **Décision en fin de mois** |
|---|---|---|---|---|---|---|---|---|
| **M1** | FR IdF, Aminata 4C | K02/K03 préco | 10 (test) | — | 300 € | Stripe **LIVE**, nettoyage démo, prix de revient | Activer paiement, 10 beta | Paiement réel encaissé ? sinon stop |
| **M2** | FR IdF/Lyon | K02/K03 | **100** | ~1 500 € | 1 500 € | Analytics + attribution UTM actifs, diag 5 questions | 1er lot reçu, 20 demandes de gros | 100 commandes + 20 avis ? on allume TikTok |
| **M3** | FR, tous types 3A-4C | Gamme + kits | 250 | 3 780 € | 1 000 € | Kits en tête de reco | TikTok 5-7/sem, liste lancement | Conv ≥ 0,8 % ? ajuster offre |
| **M4** | FR | Kits + add-ons | 400 | 5 000 € | 1 200 € | Emails panier abandonné | 4–8 créateurs, offres −15 % | 1 créa qui décolle ? |
| **M5** | FR | K02/K03 hero | 600 | 7 000 € | 1 500 € | A/B page reco | Créateurs + UGC | CAC < 15 € ? |
| **M6** | FR | Gamme complète | **1 000** | 9 240 € | 2 000 € | Parrainage 10/10 €, KURLA+ proposé | Preuve sociale, avis | **Funnel rentable ? → oui = on prépare BE** |
| **M7** | FR scale | Kits premium K06/K10 | 1 500 | 12 000 € | 3 000 € | Test paid (3 créas, 800 €) | 1er paid test | ROAS > 2 sur 1 créa ? |
| **M8** | FR scale | Réachat + Plus | 2 200 | 16 000 € | 4 000 € | Alertes réappro | Retargeting panier | Réachat 90 j ≥ 18 % ? |
| **M9** | **FR + Belgique test** | Idem FR | 3 000 | 20 000 € | 4 500 € | **Livraison BE activée marketing** (déjà technique) | 1–2 créateurs belges | **BE : 30 cmd/60 j ?** |
| **M10** | FR + BE | Kits | 3 800 | 24 000 € | 5 000 € | Localisation EN (structure existe) | Doubler canal rentable | BE rentable → continuer |
| **M11** | FR + BE | Gamme + outils | 4 600 | 27 000 € | 5 000 € | SEO massif ingrédients | Partenariats salons (5 pilotes) | Pilote Pro concluant ? |
| **M12** | FR + BE | Bilan | **~5 000–6 000** | 28 500 € | 5 000 € | Dashboard conquête complet | Bilan CAC/LTV par canal | **Rentabilité en vue ? → préparer UK (M13)** |

> Les objectifs CA sont alignés sur la projection financière du plan d'exécution (M3 3,8 k€ → M12 28,5 k€). Les paliers 10k/50k clients dépassent M12 (voir §10).

---

## 23. Roadmap 3 ans

- **An 1 (M0–M12) :** DOMINER le segment 4C en France ; 5 000–6 000 clients ; CA ~28 k€/mois en fin d'année ; Belgique ouverte et validée ; funnel rentable ; marque propre karité sourcée.
- **An 2 (M13–M24) :** UK puis Allemagne/Pays-Bas ; 10 000 → ~9 500 clients actifs ; CA ~127 k€/mois (M24) ; **rentabilité nette mensuelle ~M14** ; KURLA Pro (15 salons) ; marketplace ouverte ; 3–5 produits marque propre ; pilote Afrique du Sud.
- **An 3 (M25–M36) :** Europe scale (CH/ES/IT/PT) ; Afrique : Afrique du Sud en e-com + Sénégal/CI via distributeur/marketplace ; sourcing Ghana structuré ; B2B Intelligence (agrégats) ; 50 000 clients ; plateforme multilingue/multidevise.

---

## 24. Modèle financier de conquête
Reprend le modèle du plan d'exécution, avec les seuils de conquête :
- **M3 :** 90 cmd/mois, AOV 42 €, CA 3 780 €, marge brute ~1 800 €, marketing 700 € → **résultat −1 200 €** (investissement).
- **M6 :** 210 cmd/mois, CA 9 240 €, marge 4 560 €, marketing 3 200 € → **−700 €**.
- **M12 :** 620 cmd/mois, CA 28 500 €, marge 15 060 €, marketing 8 500 € → **+1 860 €**.
- **M24 :** 2 300 cmd/mois, CA 110 000 €, marge 64 500 €, marketing 26 000 € → **+11 000 €**.
- **Seuil de rentabilité :** mensuel ~**M14**, trésorerie cumulative positive ~**M20**.
- **Règle financière de conquête :** on ne débloque le budget d'un nouveau pays que si le précédent dégage une **marge contributive positive** (CA × marge − coût acquisition − frais logistique > 0).

---

## 25. Budget marketing par phase

| Phase | Période | Budget total | Dont organique/contenu | Dont créateurs | Dont paid |
|---|---|---|---|---|---|
| Amorçage (100 clients) | M1–M2 | ~1 800 € | 300 € (banque vidéos) | 1 500 € (barter/kit) | 0 |
| Validation (1 000) | M3–M6 | ~9 000 € | 1 500 € | 4 000 € | 800 € (test S10) |
| Croissance (10 000) | M7–M18 | ~150–200 k€ | 15 % | 25 % | **60 % (scaling ROAS>2,5)** |
| Europe/Scale | M13–M36 | par pays : 1,5 k€ (BE) → 4 k€ (UK) → 3 k€ (DE) tests, puis scaling selon ROAS | | | |
| Afrique | M24+ | pas de paid massif au début ; co-investissement distributeur/marketplace | | | |

---

## 26. KPI de conquête & seuils de décision (🟢 SCALE / 🟠 OPTIMISER / 🔴 ARRÊTER/PIVOTER)

| KPI | 🟢 SCALE | 🟠 OPTIMISER | 🔴 ARRÊTER/PIVOTER |
|---|---|---|---|
| Visite → diagnostic lancé | ≥ 20 % | 10–20 % | < 10 % |
| Diagnostic → achat (conv. visite) | ≥ 1,2 % | 0,5–1,2 % | < 0,5 % |
| Panier → achat | ≥ 40 % | 25–40 % | < 25 % |
| CAC | ≤ 15 € | 15–25 € | > 35 € |
| ROAS (paid) | > 2,5 | 1,5–2,5 | < 1,5 |
| AOV | ≥ 42 € | 30–42 € | < 30 € |
| Réachat 90 j | ≥ 25 % | 15–25 % | < 10 % |
| LTV/CAC | ≥ 3 | 1,5–3 | < 1,5 |
| Marge contributive/pays | positive | neutre | négative après 90 j |
| Délai de récupération CAC | < 90 j | 90–180 j | > 180 j |

---

## 27. Conditions d'expansion (obligatoires — chaque ouverture se mérite)

**On n'ouvre le segment/pays suivant QUE lorsque :**
1. **Segment initial : ≥ 1 000 clients payants** en France.
2. **Réachat 90 j ≥ 20 %** (preuve que le produit rend service).
3. **CAC < 15 € et LTV/CAC ≥ 3** sur le canal principal.
4. **Marge contributive positive** (après coût acquisition + logistique) sur 2 mois consécutifs.
5. **Funnel mesuré de bout en bout** (attribution UTM active, analytics propre).
6. **Logistique validée** (taux de livraison > 97 %, retours < 8 %).
7. **Offre validée** (note moyenne ≥ 4,3/5, ≥ 30 avis).
8. **Stripe live + 1er lot réceptionné + SIRET** (prérequis durables, dès M1).

Tant que ces 8 conditions n'ont pas un « oui », on **reste et on optimise** au lieu de s'étendre.

---

## 28. Plan de contingence (apprendre vite, limiter les pertes)

| Hypothèse | Comment on la teste | Budget max de test | KPI de validation | Signal d'échec | Action |
|---|---|---|---|---|---|
| TikTok organique ramène des acheteuses 4C | 5–7 vid/sem pendant 6 sem | 1 500 € (contenu) | ≥ 100 visites/jour + diag rate ≥ 15 % à M2 | < 20 visites/jour après 6 sem | **Pivoter** : budget vers créateurs/SEO |
| Les kits convertissent mieux que les produits seuls | A/B page reco (kit en tête vs produits) | 0 € (feature) | AOV ≥ 42 €, part kits ≥ 40 % | AOV < 30 € | **Optimiser** l'offre/le prix du kit |
| Les micro-créateurs apportent des ventes à CAC < 15 € | 4–8 collabs avec codes UTM | 2 400 € (4 mois) | ≥ 20 cmd/mois via codes, CAC < 15 € | CAC > 25 € sur 6 collabs | **Arrêter** le paid créateurs, rester sur le barter |
| Le paid scale (ROAS > 2,5) | 3 créas, 800 € test S10 | 800 € puis paliers | ROAS > 2,5 sur ≥ 1 créa | ROAS < 1,5 sur les 3 | **Arrêter le paid**, retour organique |
| La Belgique prend sans traduction | 30 commandes BE en 60 j | 1 500 € | 30 cmd, marge contributive ≥ 0 | < 10 cmd en 90 j | **Optimiser** (créateurs locaux) ou fermer |
| L'Afrique du Sud paie en premium | Test via 3PL, petite campagne | 3 000 € | 50 commandes en 90 j | < 15 commandes | **Pivoter** vers le modèle distributeur |
| Le karité marque propre atteint 45–55 % de marge | Devis sourcing Ghana/CI | coût échantillons | Coût d'achat ≤ 4,5 €/unité | Coût > 6 € | **Retarder** la marque propre |

---

## 29. Les 20 premières actions de la conquête

1. **Activer Stripe LIVE** + vérifier le webhook (M1) — bloquant.
2. **Immatriculation SIRET** (M1) — bloquent.
3. Commander le **1er lot 4–6 k€ focalisé K02/K03/K01** après 3 devis.
4. Envoyer **20 demandes de gros** (tarifs/MOQ) aux 8 marques + AfricanFabs/Afro Wholesale.
5. Vérifier que l'**attribution UTM** remonte bien (colonne `orders.attribution` migrée).
6. Mettre **K02/K03 en tête des recommandations** post-diagnostic.
7. Raccourcir le diagnostic à **5 questions** + hook en home « Fais ton diagnostic ».
8. Tourner **20–30 vidéos brutes** (banque de contenu) en 1 journée.
9. Lancer **TikTok 5–7 vid/sem** (démo diag + avant/après 4C + décryptage).
10. Publier **3–4 contenus SEO/semaine** (pages ingrédient + « routine 4C »).
11. Ouvrir la **liste de lancement** (email) avec offre −15 % → 100–200 emails.
12. Recruter **10 beta-testeuses** réseau pour les 100 premières commandes (K02/K03 −20 %, remboursé si insatisfaction).
13. Contacter **20 micro-créateurs**, signer **4–8 barters/affiliés** avec codes UTM.
14. Mettre en place **emails panier abandonné** (séquence 3).
15. Collecter **avis + UGC** dès les 1res ventes (objectif 20 avis, 10 UGC).
16. Activer le **parrainage 10/10 €** + proposer **KURLA+** post-achat.
17. Lancer le **test paid** (3 créas, 800 €, S10) et couper sous ROAS 1,5.
18. Signer **5 salons pilotes** IdF/Lyon (code pro + commission).
19. Préparer la **Belgique** (créateurs BE, livraison déjà prête) pour M9.
20. Lancer les **devis sourcing karité Ghana/CI** (marque propre, marge 45–55 %).

---

## 30. Tableau de bord de conquête (dans l'admin KURLA)

Intégré au **Business Control Center** (`/admin`), nouvelle vue **« Conquête »** :
- **Réel vs objectifs par palier** : clients cumulés (100 / 1 000 / 10 000 / 50 000), CA/mois vs cible (M3 3,8 k€ → M12 28,5 k€), AOV vs 42 €, réachat vs 20–25 %.
- **Entonnoir réel** : visites → diagnostics → recommandations → paniers → achats → réachats (avec les seuils 🟢/🟠/🔴 du §26).
- **Ventes par canal** (déjà construit : UTM → TikTok/SEO/créateurs/paid/parrainage) avec **CAC et ROAS par canal**.
- **Ventes par territoire/pays** (FR régions puis BE/UK…) à mesure de l'expansion.
- **Conditions d'expansion (§27) en checklist vivante** : les 8 critères passent au vert automatiquement quand les données les atteignent → le dashboard dit explicitement « PRÊT à ouvrir la Belgique » ou « PAS ENCORE : réachat 12 % < 20 % ».
- **Suivi des 20 actions** (§29) avec statut.

> Cette vue lit les mêmes données réelles que le reste du BCC (commandes, `order_items`, `orders.attribution`) ; les objectifs/paliers sont les constantes décidées dans ce document. Aucun chiffre inventé : ce qui n'est pas encore mesurable s'affiche « à instrumenter ».

---

*Sources marché : Le Monde (apartheid capillaire, ~17 000 salons manquants), Ministère de la Culture (démographie afro-descendante), Le Figaro/Madame (marché BFC ~1,1 Md€), Maddyness (~80 €/mois), 360researchreports / Industry Research / openPR-Dimension (Europe ~24–26 %, UK/FR/DE tête, ~978 M$ 2034), IndexBox / Technavio / Mordor (Afrique ~3,5 Md$, Afrique du Sud 25–30 %, Nigeria +8–12 %, e-commerce 10–25 %). Chiffres internes : `launchCatalog.ts`, `businessStrategy.ts`, Business Control Center.*
