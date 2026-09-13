# 50 besoins peau — produits recommandés & fournisseurs (travail profond, 14/09/2026)

**Mission** : pour chacun des 50 besoins de `BESOINS_PEAU_50_2026-09-13.md`, identifier
(a) le produit que KURLA recommande — issu du code (kits, profils de connaissance,
cartes moyens, vocabulaire officiel des 15 actifs) — et (b) le fournisseur — issu
exclusivement du dossier de sourcing (`docs/sourcing/`, travail du 13/09/2026).

**Règle tenue** : sourcée ou absente, jamais inventée. Un fournisseur n'est cité
que s'il figure dans les registres du dossier sourcing, avec son statut réel de
vérification. « Piste à confirmer » n'est pas un fournisseur.

---

## 0. La photographie d'ensemble — avant les 50 besoins

### 0.1 Les produits côté KURLA (ce que le code recommande)

Deux couches de produits existent dans le code :

**Couche 1 — la gamme cible (16 fiches en base, servies par `/api/peau/gamme`)**
Les 7 produits des kits en font partie. Ce sont des **formulations cibles** :
documentées V-VI safe, servies en boutique, **mais sans fabricant, sans INCI validé,
sans CPNP** — pas achetable en l'état (le façonnier n'est pas retenu).

| Produit (nom exact du code) | Prix kit | Rôle |
|---|---|---|
| Nettoyant doux sans parfum | 12,90 € | Nettoyant matin & soir |
| Crème céramides + squalane | 16,90 € | Crème barrière |
| SPF 50 invisible fluide | 19,90 € | SPF matin (sans voile blanc) |
| Sérum niacinamide 5% | 15,90 € | Sérum HPI (matin) |
| Gel acide hyaluronique | 14,90 € | Hydratation profonde |
| Exfoliant AHA/BHA 1×/sem | 17,90 € | Hebdo — grain & taches |
| Baume lèvres céramides | 8,90 € | Lèvres sèches |

Les 3 kits les regroupent : Essentielle (3 soins, 49,70 €) · Équilibrée (5 soins,
62 €) · Experte (7 soins, 84,90 €).

**Couche 2 — les produits cités dans les cartes moyens** (sans fiche) : patch
anti-bouton, écran teinté (oxydes de fer), bâtonnet SPF 15+ lèvres, patch occlusif
(picking), déodorant sans alcool, acide azélaïque, urée 10–20 %, acide lactique 10 %.
Ce sont des **types de produits recommandés**, pas des fiches — le registre de 100
produits en est l'équivalent sourcable (partie 1).

### 0.2 Les 100 produits du registre (ce qu'on peut sourcer)

`REGISTRE_100_PRODUITS_PEAU_2026-09-13.csv` : 100 positions produits = 15 besoins du
diagnostic (`skinTaxonomy.ts`) × 7 étapes de routine, moins 7 positions sans produit
pertinent (on n'invente pas un exfoliant pour les lèvres). Chaque ligne porte : nom,
actif clé, format, fourchette de prix, canal, statut.

**Statut réel du sourcing (aucune complaisance)** :

| Statut | Nombre | Détail |
|---|---|---|
| Canal identifié & vérifié | **10 lignes** | PEAU-091→100 : Ankorstore (4) + BLACKETIQUE/EOLYS (6) |
| Piste à confirmer (voir dossier §2) | 90 lignes | aucune marque vérifiée sur la ligne |
| Contacté | **0 / 100** | `statut_autorisation = not_contacted` partout |
| Autorisation obtenue | **0 / 100** | aucun email envoyé (pas de boîte mail, pas de mandat) |
| Sur le site | 0 / 100 | la boutique reste à ses produits actuels ; les 16 fiches cibles = gamme non achetable |

Les 4 emails de contact sont **prêts à envoyer** (`EMAILS_SOURCING_PEAU_2026-09-13.md`),
aucun n'a été envoyé : Email 1 BLACKETIQUE (6 refs K-beauty + CPNP) · Email 2 EOLYS ·
Email 3 Ankorstore (25 soins ciblés) · **Email 4 = modèle générique pour les 90 lignes
sans fournisseur**. La question bloquante avant tout tarif : le produit est-il déjà mis
sur le marché UE par un importateur (CPNP + personne responsable) — sinon KURLA
deviendrait personne responsable (règl. 1223/2009).

### 0.3 Le lexique des statuts utilisé dans ce document

- **`✔ VÉRIFIÉ`** — fournisseur vérifié sur sources croisées (BLACKETIQUE, EOLYS, Ankorstore).
- **`◐ PARTIEL`** — existence vérifiée, conditions non vérifiées (Activilong, Les Secrets de Loly).
- **`· DÉCLARATIF`** — repéré (Europages etc.), non vérifié au registre (grossistes UE).
- **`⬜ À SOURCER`** — pas de fournisseur identifié sur la ligne → email 4 générique.
- **`◦ CIBLE`** — produit = fiche cible KURLA (gamme non achetable, pas de façonnier retenu).
- **`— AUCUN PRODUIT`** — le besoin est de l'éducation ou d'un geste : aucun produit n'y répond honnêtement.

---

## 1. Le parc de fournisseurs (extrait des registres du 13/09/2026)

56 acteurs sont dans `REGISTRE_FOURNISSEURS_2026-09-13.csv`. Seuls ceux utiles aux
besoins peau sont cités ici, avec leur statut réel.

### 1.1 Canaux vérifiés — les seuls où un produit a déjà un « fournisseur »

| Fournisseur | Pays / type | Statut | Pertinence peau |
|---|---|---|---|
| **BLACKETIQUE SASU** — 3 rue Magnier Bédu B12, 95410 Groslay · SIRET 979 710 829 00024 · 01 84 80 62 40 · info@blacketique.com | FR · importateur/distributeur B2B K-beauty, stock France, 50 marques | ✔ VÉRIFIÉ (site + page haircare ; écart 35 vs 50 marques à trancher, non recoupé RCS) | **Canal principal** : sérums, hydratants, SPF, masques (6 lignes PEAU-092→099) |
| **EOLYS Beauté** — B Corp depuis 10/2022 | FR · distributeur cosmétiques coréens, page « devenir revendeur » | ✔ VÉRIFIÉ | Whamisa, **Torriden** (acide hyaluronique), **SKIN1004** (centella), **COSRX** (sensibles/imperfections), Beauty of Joseon, Biodance — correspondance directe hydrater/sensible/cicatrices/imperfections |
| **Ankorstore** | FR · 20 000+ marques, dont 1 200 beauté françaises ; min. 100 €/marque, franco 300 €, paiement 60 j | ✔ VÉRIFIÉ (sources croisées) | Soins ciblés : contour yeux, lèvres, zones localisées (4 lignes PEAU-091/095/096/100) |

### 1.2 Marques françaises — existence vérifiée, conditions non vérifiées

| Marque | Statut | Pertinence |
|---|---|---|
| Activilong (lab. Yannick Cheffre, Paris, 1983, fabriqué en France) | ◐ PARTIEL | Nettoyants corps/sensible (canal `marques_fr`) |
| Les Secrets de Loly (Kelly Massol, Paris, 2009, >96 % origine naturelle) | ◐ PARTIEL | Lèvres, corps (revente via Colorful Black — mais revendeurs = détail, page 404) |

### 1.3 Grossistes UE repérés — déclaratifs (Europages, non vérifiés)

SOCADE (Aubervilliers, 1989) · Chery Cosmetique (Évry, 2003) · Fabro Cosmetic (Paris) ·
Asters Cosmétique (Paris, 2003) · BM Cosme (Paris, 2011) · + NL/BE/IT/PT/ES/DE/LU
(B. Futurist, Exotic City, HQ Cosmetics, Dancohr, Calcagni, Fuuta-Shop, Contiments,
Afro-Gemeos, Top Beauty, AfroPassion, Purfet, Chierici). Statut : · DÉCLARATIF —
à ne citer qu'avec ce statut.

### 1.4 Façonneurs marque blanche (pour la gamme cible) — aucun retenu

FR : LissCreation · MY.LAB/STARTEC · Carmel Cosmetics Labs · Remanence · Dom Labs ·
Eurotel. UE : Cosmetic Lab (LV, 3000+ formules) · Galvagni (DE) · Individual
(DE) · Trat (DE, petites séries) · Szaidel (DE) · Skinovators (DE, 400+ formules) ·
Nortempresa (PT) · Cosmetics Margo (CZ). Statut : ⬜ aucun retenu — les 16 fiches
cibles n'ont ni fabricant, ni INCI validé, ni CPNP.

### 1.5 Dropship — option de dernier recours, pas de CPNP vérifié

Naturare · Balqis (FR) · BigBuy · Octopia · Nova Engel (ES) · Cosmetix Club.
Statut : · DÉCLARATIF, dropship = pas de contrôle fournisseur.

---

## 2. Les 50 besoins, un par un

Format : **KURLA** = ce que le code recommande · **Registre** = positions sourcables
(`refs` = lignes du registre 100 produits, avec actif et fourchette) · **Fournisseur** =
statut réel · **Trou** = ce qui manque honnêtement.

### Thème A — Comprendre sa peau (1–8)

#### #1 — Déterminer le type de peau (8 types)
- **KURLA** : — AUCUN PRODUIT — c'est le diagnostic lui-même (8 types au diagnostic).
- **Fournisseur** : n/a. La sortie du type pilote les kits (Excellente → Essentielle/Équilibrée/Experte).

#### #2 — Distinguer sécheresse (peau) et déhydratation (eau)
- **KURLA** : Gel acide hyaluronique (kit) pour l'eau ; Crème céramides + squalane (kit) pour les lipides. Les deux couches sont distinctes dans les kits.
- **Registre** : PEAU-024 sérum HA multi-poids (12–20 €) · PEAU-042 crème légère non comédogène (12–19 €) · PEAU-058 masque hydratant repulpant (12–19 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).

#### #3 — Évaluer le niveau d'hydratation
- **KURLA** : Gel acide hyaluronique (kit) — « même une peau grasse peut être déshydratée » (profil grasse).
- **Registre** : PEAU-024 (HA) · PEAU-044 gel oil-free (11–18 €) · PEAU-056 brume hydratante (8–14 €) · PEAU-063 masque en tissu HA, lot 5 (7–12 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).

#### #4 — Évaluer le niveau de sensibilité
- **KURLA** : Nettoyant doux sans parfum (kit) — le parfum est le 1ᵉ allergène cosmétique (carte savoirs).
- **Registre** : PEAU-002 eau micellaire apaisante sans parfum (8–14 €) · PEAU-031 sérum apaisant haute tolérance, allantoïne (13–20 €) · PEAU-047 crème apaisante (14–22 €) · PEAU-059 masque apaisant (12–19 €).
- **Fournisseur** : ⬜ À SOURCER (email 4). ÉOLYS/COSRX est la piste naturelle pour la sensibilité (canal vérifié) mais aucune ligne du registre ne l'a encore reliée à un besoin sensible — c'est le travail de l'Email 2.

#### #5 — Déterminer le phototype + expliquer ses limites
- **KURLA** : — AUCUN PRODUIT — éducation (carte savoirs) ; le débouché produit est le SPF (besoin #30).

#### #6 — Déterminer la profondeur de ton et le sous-ton
- **KURLA** : — AUCUN PRODUIT — le diagnostic pose le sous-ton ; le débouché produit est le maquillage teinte (besoin #47).

#### #7 — Évaluer la force de la barrière cutanée
- **KURLA** : Crème céramides + squalane (kit) + objectif « renforcer la barrière » (carte savoirs, pas de question dédiée — le ⚠️ du dossier, jugé couvert par les objectifs).
- **Registre** : PEAU-009 crème nettoyante hydratante céramides (10–16 €) · PEAU-025 sérum céramides NP (14–22 €) · PEAU-045 crème barrière céramides (15–24 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).

#### #8 — Profilage saisonnier (hiver vs été)
- **KURLA** : — AUCUN PRODUIT dédié — la carte « le corps change, la routine suit » (vague de fin) dit : hiver = texture plus riche, été = SPF en quantité ; le SPF et le nettoyant doux ne changent jamais.
- **Registre** : PEAU-043 crème riche peaux sèches, karité (14–22 €) · PEAU-077 huile corps amande douce (12–19 €) · PEAU-057 huile visage nourrissante (14–22 €) · PEAU-099 SPF 50 sans parfum (BE).
- **Fournisseur** : PEAU-099 → ✔ VÉRIFIÉ (BLACKETIQUE/EOLYS, email 1) ; le reste ⬜ À SOURCER (email 4).

### Thème B — Taches & pigmentation, priorité n°1 peau mélaninée (9–18)

#### #9 — Taches post-boutons (HPI)
- **KURLA** : Sérum niacinamide 5% (kit, matin) + SPF 30+ quotidien + patch anti-bouton (type cité carte moyens) ; azélaïque en ciblé ; « la régularité fait la différence, pas l'intensité ».
- **Registre** : PEAU-020 sérum niacinamide 5% (12–19 €) · PEAU-028 sérum anti-taches post-imperfections, acide tranexamique (15–24 €) · PEAU-021 acide azélaïque 10 % (14–22 €) · PEAU-037 soin localisé imperfections, salicylique (9–15 €).
- **Fournisseur** : ⬜ À SOURCER (email 4). Niacinamide/azélaïque = cœur du canal Ankorstore (email 3).
- **Trou** : le **patch anti-bouton occlusif** n'existe dans le registre que pour le contour des yeux (PEAU-064 caféine) — un patch imperfections est à ajouter au registre.

#### #10 — Taches solaires
- **KURLA** : SPF 50 invisible fluide (kit) — « l'écran 30+ (le seul anti-âge documenté) ».
- **Registre** : PEAU-099 SPF 50 sans parfum (BE) · PEAU-093 crème de jour SPF 30 (BE) · PEAU-095 stick SPF 50 zones sensibles (AN).
- **Fournisseur** : ✔ VÉRIFIÉ — les 3 lignes ont un canal vérifié (BLACKETIQUE/EOLYS email 1, Ankorstore email 3). **C'est le besoin le mieux pourvu du registre.**

#### #11 — Teint irrégulier
- **KURLA** : profil « pigmentation » — Nettoyant doux + Gel HA + Exfoliant AHA/BHA 1×/sem + SPF (keyProducts du profil).
- **Registre** : PEAU-020 niacinamide · PEAU-033 sérum éclat uniformité, extrait de réglisse (14–22 €) · PEAU-013 exfoliant AHA 7 % (14–22 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).

#### #12 — Teint terne, fatigué
- **KURLA** : objectif « éclat » — vitamine C le matin (carte prévention), niacinamide.
- **Registre** : PEAU-022 sérum vitamine C stabilisée 10 % (15–24 €) · PEAU-061 masque éclat vitaminé (13–20 €) · PEAU-063 masque en tissu lot 5 (7–12 €) · PEAU-092 sérum antioxydant sous SPF, tocophérol (BE).
- **Fournisseur** : PEAU-092 → ✔ VÉRIFIÉ (BLACKETIQUE/EOLYS) ; le reste ⬜ (email 4).

#### #13 — Taches par frottement et pression (différenciateur KURLA)
- **KURLA** : carte savoirs frottement (mélanine de protection) ; Exfoliant AHA/BHA 1×/sem (kit) pour le grain ; gestes : tamponner, téléphone/col moins contre la peau.
- **Registre** : PEAU-013 AHA 7 % (14–22 €) · PEAU-019 pads BHA, lot 30 (13–20 €) · PEAU-008 poudre enzymatique douce (14–22 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).

#### #14 — Assombrissement immédiat du soleil (IPD)
- **KURLA** : — AUCUN PRODUIT — savoir (l'IPD ne protège de rien) ; le geste est le SPF (→ #30).

#### #15 — Lumière visible et hyperpigmentation
- **KURLA** : carte savoirs (preuve RCT : l'écran teinté bat l'écran invisible, 15 % de différence mesurée en 8 semaines, PubMed 24313385) → le produit attendu est un **SPF teinté à oxydes de fer**.
- **Registre** : **⚠ TROU STRUCTUREL** — aucun SPF teinté / oxydes de fer dans les 100 positions (PEAU-099 est un SPF 50 classique). Les lignes SPF du registre (PEAU-091→095) ne couvrent pas ce besoin.
- **Fournisseur** : n/a en l'état. À ajouter au registre : « SPF teinté 30–50 à oxydes de fer, teintes foncées » — canal naturel BLACKETIQUE/EOLYS (K-beauty = forte culture du tinted SPF) ou marques FR via Ankorstore.

#### #16 — Taches hormonales (masque de grossesse / mélasma)
- **KURLA** : azélaïque ou niacinamide + SPF quotidien + écran teinté (cartes hormones) ; jamais d'acide concentré, jamais de dérivé de vitamine A sur un pattern en cours ; le soleil d'abord.
- **Registre** : PEAU-021 azélaïque 10 % (14–22 €) · PEAU-020 niacinamide 5 % · PEAU-093 crème de jour SPF 30 (BE).
- **Fournisseur** : PEAU-093 → ✔ VÉRIFIÉ (BE) ; azélaïque/niacinamide ⬜ (email 4).
- **Trou** : même que #15 — l'écran teinté manque.

#### #17 — Assombrissement des plis (cou, aisselles, cuisses)
- **KURLA** : carte moyens (vague 5) : sécher à fond, vêtements amples, déodorant sans alcool, gommage doux cadencé ; Exfoliant AHA/BHA 1×/sem (kit) sur zones sèches.
- **Registre** : PEAU-036 lait corps uniformisant niacinamide (13–20 €) · PEAU-016 gommage corps sucre & huile (11–18 €) · PEAU-079 gel douche doux sans sulfates (7–12 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).
- **Trou** : aucun produit « plis » dédié (lotion corps à azélaïque/niacinamide ciblée) — PEAU-036 s'en rapproche.

#### #18 — Cernes (sombres / fatigués)
- **KURLA** : carte moyens (vague de fin) — 3 familles, test d'étirement ; caféine = effet temporaire ; structurel = anatomie, aucun produit ne corrige.
- **Registre** : **le mieux pourvu après SPF** — PEAU-030 sérum contour caféine (13–21 €) · PEAU-068 crème contour caféine (13–21 €) · PEAU-069 gel contour frais (12–19 €) · PEAU-072 masque yeux de nuit, céramides (13–20 €) · PEAU-064 patchs contour caféine, lot 30 (10–16 €).
- **Fournisseur** : ⬜ À SOURCER (email 4) — mais ce pôle est précisément le « 25 soins ciblés » de l'**Email 3 Ankorstore** (canal ✔ VÉRIFIÉ) : c'est là que le contour des yeux doit se sourcer en premier.

### Thème C — Imperfections (19–23)

#### #19 — Boutons occasionnels
- **KURLA** : profil « imperfections » — BHA 2 % (Exfoliant AHA/BHA 1×/sem du kit, en ciblé) + SPF + Nettoyant doux ; azélaïque comme actif ciblé.
- **Registre** : PEAU-096 nettoyant acide salicylique (AN) · PEAU-014 exfoliant BHA 2 % (14–22 €) · PEAU-021 azélaïque 10 %.
- **Fournisseur** : PEAU-096 → ✔ VÉRIFIÉ (Ankorstore, email 3) ; PEAU-014/021 ⬜ (email 4).
- **Note** : pendant la grossesse, ce besoin bascule sur azélaïque + BHA en rinçage ≤ 2 % (→ #50).

#### #20 — Imperfections récurrentes
- **KURLA** : BHA 2 % (0,5–1 % si sensible) + azélaïque + pas d'extraction DIY (carte moyens).
- **Registre** : PEAU-014 BHA 2 % · PEAU-021 azélaïque 10 % · PEAU-037 soin localisé salicylique (9–15 €) · PEAU-007 gel nettoyant purifiant sans sulfates, zinc PCA (9–15 €).
- **Fournisseur** : ⬜ À SOURCER (email 4). Piste EOLYS/COSRX (peaux à tendance acnéique — canal ✔) à activer par l'Email 2.

#### #21 — Points noirs (oxydation ≠ saleté)
- **KURLA** : 2 % salicylique, pas d'extraction (carte moyens) ; le Spatule Comédon du registre est **contre-indiqué par la carte** (extraction DIY = facteur d'aggravation).
- **Registre** : PEAU-014 BHA 2 % (14–22 €) · PEAU-019 pads BHA lot 30 (13–20 €) · PEAU-060 masque argile blanche purifiant (10–16 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).
- **Note** : PEAU-088 (spatule comédon inox) est dans le registre mais **contradictoire avec le savoir KURLA** — à retirer du registre ou à repositionner « usage par professionnel », sinon le site se contredit avec sa propre carte moyens.

#### #22 — Picking / s'arracher les boutons (facteur modifiable n°1 de la HPI)
- **KURLA** : carte moyens (vague de fin) — « le produit ne gagne pas contre le geste » ; **patch occlusif** comme protection physique avant tout actif.
- **Registre** : **⚠ TROU STRUCTUREL** — aucun patch occlusif anti-boutons dans les 100 positions.
- **Fournisseur** : n/a. À ajouter au registre : « Patchs hydrocolloïdes imperfections (lot 50–100) » — type accessible via Ankorstore (soins ciblés, canal ✔) ou grossistes FR. C'est le petit produit à plus fort signal « on voit ce que les autres ne voient pas » du besoin n°22.

#### #23 — Peau brillante, sébum en excès
- **KURLA** : profil « grasse » (4ᵉ profil, vague de fin) — ni décaper ni sauter l'hydratation ; salicylique 2 % ; keyProducts : Nettoyant doux + Sérum niacinamide 5% + Exfoliant AHA/BHA + SPF invisible.
- **Registre** : PEAU-032 sérum régulateur de brillance, zinc PCA (13–20 €) · PEAU-046 fluide matifiant niacinamide (13–20 €) · PEAU-044 gel oil-free HA (11–18 €) · PEAU-006 mousse purifiante niacinamide (9–15 €) · PEAU-060 masque argile (10–16 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).
- **Note** : c'est le besoin « entièrement vide » le plus coûteux du diagnostic (déjà signalé dans le dossier 100 produits : une cliente « peau grasse » ne trouvait rien).

### Thème D — Hydratation & confort (24–29)

#### #24 — Hydrater en profondeur (règle des minutes)
- **KURLA** : Gel acide hyaluronique (kit) appliqué sur peau humide, dans les 3 minutes après la douche (carte savoirs).
- **Registre** : PEAU-024 sérum HA multi-poids (12–20 €) · PEAU-097 hydratant HA (BE) · PEAU-058 masque repulpant (12–19 €).
- **Fournisseur** : PEAU-097 → ✔ VÉRIFIÉ (BLACKETIQUE/EOLYS, email 1) — Torriden = correspondance naturelle ; le reste ⬜.

#### #25 — Réparer une barrière abîmée
- **KURLA** : Crème céramides + squalane (kit) ; carte moyens sécheresse : céramides + 3 minutes post-douche, pas de gommage pendant la réparation.
- **Registre** : PEAU-045 crème barrière céramides (15–24 €) · PEAU-025 sérum céramides NP (14–22 €) · PEAU-009 crème nettoyante céramides (10–16 €) · PEAU-072 masque yeux de nuit céramides (13–20 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).

#### #26 — Apaiser une peau réactive
- **KURLA** : carte moyens sensibilité — allantoïne/centella type apaisant, rien de plus d'actif ; le parfum d'abord.
- **Registre** : PEAU-031 sérum apaisant allantoïne (13–20 €) · PEAU-047 crème apaisante (14–22 €) · PEAU-059 masque apaisant (12–19 €) · PEAU-100 soin panthénol apaisant (AN) · PEAU-098 masque centella (BE).
- **Fournisseur** : PEAU-100 → ✔ VÉRIFIÉ (Ankorstore, email 3) ; PEAU-098 → ✔ (BLACKETIQUE/EOLYS) ; le reste ⬜. **Deux canaux vérifiés sur ce besoin.**

#### #27 — Rougeurs
- **KURLA** : azélaïque (actif cité) + SPF ; ne jamais sur-exfolier.
- **Registre** : PEAU-021 azélaïque 10 % (14–22 €) · PEAU-098 masque centella (BE).
- **Fournisseur** : PEAU-098 → ✔ (BE) ; PEAU-021 ⬜ (email 4).

#### #28 — Réactions au parfum (30–45 % des réactions)
- **KURLA** : « sans parfum » ≠ « sans allergène » (carte savoirs) ; Nettoyant doux sans parfum (kit) = le socle.
- **Registre** : PEAU-001 gel nettoyant doux sans savon (8–14 €) · PEAU-002 micellaire sans parfum (8–14 €) · PEAU-081 lait corps apaisant sans parfum (11–18 €) · PEAU-099 SPF 50 sans parfum (BE).
- **Fournisseur** : PEAU-099 → ✔ (BE) ; le reste ⬜ (email 4).

#### #29 — Climat : eau calcaire, vent froid, hiver
- **KURLA** : base de connaissance (eau calcaire européenne) + geste des 3 minutes post-douche.
- **Registre** : PEAU-079 gel douche doux sans sulfates (7–12 €) · PEAU-080 savon surgras karité (5–9 €) · PEAU-043 crème riche karité (14–22 €) · PEAU-077 huile corps amande douce (12–19 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).

### Thème E — Protection solaire (30–33)

#### #30 — SPF 30–50 quotidien à fini invisible (le besoin n°1 peau mélaninée)
- **KURLA** : SPF 50 invisible fluide (kit) — « sans voile blanc/gris, la référence des phototypes IV–VI » (carte savoirs).
- **Registre** : PEAU-099 SPF 50 sans parfum (BE) · PEAU-093 crème de jour SPF 30 (BE) · PEAU-095 stick SPF 50 zones sensibles (AN) · PEAU-092 sérum antioxydant sous SPF (BE).
- **Fournisseur** : ✔ VÉRIFIÉ sur les 4 lignes (BLACKETIQUE/EOLYS + Ankorstore). **Le SPF est le seul besoin avec 4 lignes à canal vérifié** — il doit être le premier référencé.
- **Trou** : la promesse « fini invisible sur phototype VI » doit être validée produit par produit (test échantillon) — le canal existe, l'adaptation tonale reste à prouver par référence.

#### #31 — SPF en hiver / ciel couvert (+ le SPF du maquillage ne suffit pas)
- **KURLA** : carte saisonnier (vague de fin) — « l'UVA ne fait pas de pause de saison » ; le SPF n'est jamais mis de côté.
- **Registre** : PEAU-099 (BE) · PEAU-093 (BE) — idem #30.
- **Fournisseur** : ✔ VÉRIFIÉ (BE).

#### #32 — La protection intégrée (SPF 10–13) n'est pas un écran
- **KURLA** : — AUCUN PRODUIT — savoir (la crème de jour à SPF intégré 10–13 n'est pas un écran) ; le débouché est le SPF dédié (→ #30).

#### #33 — La quantité et la réapplication
- **KURLA** : carte quantité SPF (vague 4) : 2 mg/cm² ≈ une bande de 2 doigts pour le visage, moitié de dose → SPF 30 ≈ 5–10 ; réapplication toutes les 2 h en extérieur ; les oublis classiques (cou, oreilles, dessus des mains).
- **Registre** : PEAU-095 stick SPF 50 zones sensibles (AN) = le format réapplication par excellence.
- **Fournisseur** : PEAU-095 → ✔ VÉRIFIÉ (Ankorstore, email 3) ; c'est le **seul besoin où le produit du savoir existe déjà à canal vérifié**.

### Thème F — Anti-âge (34–38)

#### #34 — Rides et ridules
- **KURLA** : objectif prévention — vitamine C le matin (carte prévention) ; dérivés de la vitamine A le soir, progressivement, et seulement si la barrière le supporte.
- **Registre** : PEAU-022 vitamine C stabilisée 10 % (15–24 €) · PEAU-023 sérum rétinol 0,3 % usage progressif (16–26 €) · PEAU-026 sérum peptides fermeté (18–28 €) · PEAU-062 masque de nuit peptides (15–24 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).
- **Note** : PEAU-023 rétinol = le produit qu'on **retire** pour #50 (grossesse) — le stocker n'a de sens qu'avec la carte grossesse déjà livrée, qui dit quoi faire de lui.

#### #35 — Fermeté, élasticité
- **KURLA** : préoccupation (pas de carte dédiée) — peptides dans le vocabulaire des 15 actifs.
- **Registre** : PEAU-026 peptides fermeté (18–28 €) · PEAU-062 masque de nuit peptides (15–24 €) · PEAU-070 sérum cils/sourcils peptides (14–22 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).

#### #36 — Vieillissement tardif de la peau mélaninée (rides plus tard, pigment plus tôt)
- **KURLA** : carte savoirs (pôle « Vieillissement & repères ») — l'ordre : pigment d'abord, ride ensuite.
- **Registre** : PEAU-022 vitamine C · PEAU-020 niacinamide · PEAU-099 SPF (BE).
- **Fournisseur** : PEAU-099 → ✔ (BE) ; le reste ⬜.

#### #37 — Prévention active (vitamine C matin, dérivés vitamine A du soir)
- **KURLA** : carte prévention (vague de fin) — les 15 actifs dans l'ordre : SPF n°1, antioxydant le matin, exfoliation cadencée, dérivés de la vitamine A le soir seulement si la barrière le supporte, les acides ne se superposent pas.
- **Registre** : PEAU-022 (vit C) · PEAU-023 (rétinol) · PEAU-035 bakuchiol 16–25 € · PEAU-013 AHA 7 % · PEAU-099 SPF (BE).
- **Fournisseur** : PEAU-099 → ✔ (BE) ; le reste ⬜ (email 4).

#### #38 — Cou et décolleté : les zones oubliées
- **KURLA** : carte teinte + carte SPF quantité — « la frontière visage/cou » ; le cou prend la même routine et le même SPF que le visage (carte frottement : « le cou = la zone la plus oubliée »).
- **Registre** : PEAU-048 lait corps hydratant 24 h (11–18 €) · PEAU-077 huile corps (12–19 €) · PEAU-067 masque corps nourrissant (12–19 €) + SPF (PEAU-099/093).
- **Fournisseur** : PEAU-099/093 → ✔ (BE) ; les laits corps ⬜ (email 4).
- **Note** : pas de « soin cou/décolleté » dédié au registre — la réponse KURLA est justement la bonne (mêmes produits que le visage, étendus), aucun produit à inventer.

### Thème G — Spécifique cheveu bouclé / peau mélaninée (39–44)

#### #39 — Poils incarnés et irritation post-rasage
- **KURLA** : pôle rasage (vague 3 cheveux + transposition peau) — eau chaude + lame dans le sens, pas de gommage sec, ~12 semaines d'arrêt pour amélioration ; carte moyens poils incarnés (livrée).
- **Registre** : PEAU-039 soin poils incarnés corps, acide glycolique (12–19 €) · PEAU-082 soin apaisant zones rasées, allantoïne (10–16 €) · PEAU-016 gommage corps doux (11–18 €) — + côté **cheveux** : le matériel de rasage (tondeuse/lame) est dans le pôle barbe du registre cheveux.
- **Fournisseur** : ⬜ À SOURCER (email 4).

#### #40 — Peau « grain de poulet » (coudes, bras, fesses)
- **KURLA** : carte savoirs + moyens (vague 3) — bouchon de kératine, pas de la saleté ; acide lactique 10 % (−66 % mesuré en 12 sem) ou salicylique 5 %, urée 10–20 % ; 3 minutes post-douche.
- **Registre** : PEAU-039 (glycolique, 12–19 €) · PEAU-049 beurre corps karité (13–21 €) · PEAU-078 crème corps riche zones sèches (12–19 €) · PEAU-016 gommage corps (11–18 €).
- **Fournisseur** : ⬜ À SOURCER (email 4).
- **Note** : aucune ligne n'a l'urée 10–20 % en corps ciblé — PEAU-041 (crème pieds à l'urée) existe ; une « crème corps urée 10–20 % » serait la ligne exacte du besoin.

#### #41 — Corps sec et rêche (coudes, genoux, mollets)
- **KURLA** : carte moyens sécheresse corps (vague 3) — la règle des 3 minutes ; crème riche + huile.
- **Registre** : PEAU-048 lait corps 24 h (11–18 €) · PEAU-077 huile corps amande douce (12–19 €) · PEAU-049 beurre karité (13–21 €) · PEAU-067 masque corps (12–19 €) · PEAU-052 crème mains (7–12 €) · PEAU-053 crème pieds (7–12 €).
- **Fournisseur** : ⬜ À SOURCER (email 4). Le karité est la matière première de la cible — SENIMPEX (FR, importateur karité/huiles africaines, DÉCLARATIF) est le fournisseur de **matière** si la gamme propre avance.

#### #42 — Aisselles : transpiration, frottement, assombrissement
- **KURLA** : carte frottement (vague 5) — sécher à fond, vêtements amples, **déodorant sans alcool** ; limitation honnête (assombrissement soudain/épaissi → professionnel de santé, sans nommer).
- **Registre** : PEAU-083 déodorant doux sans sels d'aluminium, pierre d'alun (8–13 €) · PEAU-013 AHA 7 % (usage ciblé doux).
- **Fournisseur** : ⬜ À SOURCER (email 4).
- **Note** : la carte KURLA demande « sans alcool » — la ligne PEAU-083 est « sans sels d'aluminium » (alun), c'est différent : la reformulation « sans alcool » de la ligne est un point de RFQ à préciser dans l'email 4.

#### #43 — Lèvres : sécheresse, assombrissement par les habitudes
- **KURLA** : Baume lèvres céramides (kit) + carte lèvres (vague 5) — enzymes de la salive, cycle lèche/pèle/marque, **bâtonnet SPF 15+** pour les lèvres marquées.
- **Registre** : PEAU-050 baume réparateur karité (6–10 €) · PEAU-075 masque lèvres céramides (8–13 €) · PEAU-076 stick nourrissant (5–9 €) · PEAU-073 baume teinté karité (7–12 €) · PEAU-074 huile lèvres jojoba (8–13 €) · PEAU-051 masque de nuit céramides (8–13 €).
- **Fournisseur** : ⬜ À SOURCER (email 4) — pôle « soins ciblés » → Ankorstore (email 3, canal ✔) est la voie.
- **Trou** : **aucun bâtonnet SPF lèvres** dans le registre (PEAU-095 stick SPF 50 zones sensibles s'en rapproche mais n'est pas formulé lèvres). Ligne à ajouter : « Stick lèvres SPF 15+ teinte ».

#### #44 — Cuir chevelu (pellicules, irritation, démangeaisons)
- **KURLA** : côté **cheveux** (recoupement affiché sur la page peau) — le diagnostic cheveux porte ce champ.
- **Registre peau** : aucun produit cuir chevelu. **Registre cheveux** : `REGISTRE_CHEVEUX_2026-09-13.csv` est une liste de **fournisseurs** (31), pas de produits — aucun anti-pelliculaire/soin cuir chevelu n'est référencé des deux côtés.
- **Fournisseur** : ⚠ **TROU STRUCTUREL transverse** — à traiter dans le pôle cheveux : « shampoing cuir chevelu (kétone douce / pyrithione type grand public) » n'existe dans aucun registre.

### Thème H — Maquillage (45–47)

#### #45 — Démaquiller sans frotter (biphase, temps de pose)
- **KURLA** : cartes maquillage (vague 4) — le film longue tenue est soluble dans l'huile, temps de pose, pas de frottement.
- **Registre** : PEAU-071 démaquillant yeux biphasé doux, jojoba (9–15 €) · PEAU-004 huile nettoyante démaquillante jojoba (12–19 €) · PEAU-011 lingettes réutilisables lot 8 (8–14 €, dropship) · PEAU-091 huile démaquillante SPF waterproof (AN).
- **Fournisseur** : PEAU-091 → ✔ VÉRIFIÉ (Ankorstore, email 3) ; le reste ⬜ (email 4).

#### #46 — Maquillage non comédogène
- **KURLA** : carte maquillage (vague 4) — le label « non-clog » n'a pas de définition officielle (allégation fabricant) ; « qui bouche les pores » dans le vocabulaire KURLA.
- **Registre** : PEAU-042 crème légère non comédogène (12–19 €) — mais **⚠ TROU STRUCTUREL maquillage** : aucun fond de teint / base / poudre dans les 100 positions (la 15-taxonomie n'a pas de besoin « maquillage »).
- **Fournisseur** : PEAU-042 ⬜ (email 4) ; le maquillage lui-même : ⬜ hors registre — canal naturel Ankorstore (1 200 marques beauté FR) ou BLACKETIQUE (maquillage K-beauty parmi ses 50 marques — à demander dans l'Email 1).

#### #47 — Trouver sa teinte de fond de teint en teint foncé
- **KURLA** : carte teinte (vague de fin) — frontière visage/cou, lumière naturelle, sous-ton d'abord ; la question sous-ton est déjà au diagnostic.
- **Registre** : **⚠ TROU STRUCTUREL** — aucune base de teint teinte (ni même d'échantillonnage teintes foncées) dans les 100 positions. C'est pourtant le pont vers l'achat n°2 de la cible.
- **Fournisseur** : à sourcer hors registre. Piste : marques FR teintes (Ankorstore) + K-beauty (BLACKETIQUE) — RFQ à rédiger : « bases de teint, nuances foncées 8+, sans alcool, INCI, CPNP ».

### Thème I — Routine & actifs (48–50)

#### #48 — Routine simple 3 gestes (nettoyer / hydrater / protéger)
- **KURLA** : Kit Peau Essentielle (Nettoyant doux sans parfum + Crème céramides + SPF 50 invisible, 49,70 €) — « le 80/20 peau ».
- **Registre** : les 3 équivalents sourcables = PEAU-001 (8–14 €) · PEAU-043/042 (12–22 €) · PEAU-099 (BE).
- **Fournisseur** : PEAU-099 → ✔ (BE) ; les 2 autres ⬜ (email 4).
- **Note** : la gamme cible elle-même (◦ CIBLE) n'a pas de façonnier — tant que le sourcing affiliation n'arrive pas, le kit reste non achetable.

#### #49 — Introduire un actif à la fois + combinaisons sûres
- **KURLA** : les 15 actifs du vocabulaire, règle d'or (carte prévention) — un seul actif nouveau, acides jamais superposés.
- **Registre** : le pôle « par ingrédient » existe à 5 lignes — PEAU-096 nettoyant salicylique (AN) · PEAU-097 hydratant HA (BE) · PEAU-098 masque centella (BE) · PEAU-099 SPF 50 (BE) · PEAU-100 soin panthénol (AN).
- **Fournisseur** : ✔ VÉRIFIÉ sur les 5/5 lignes (Ankorstore + BLACKETIQUE/EOLYS). **Deuxième pôle entièrement à canal vérifié** — idéal comme vitrine « par actif » dès que les emails 1/3 arrivent.

#### #50 — Peau enceinte / allaitement
- **KURLA** : carte grossesse (livrée 14/09) — **— AUCUN PRODUIT dédié —** : le besoin est éducatif (ce qu'on met de côté, ce qui reste, à qui demander). RGPD : pas de question au diagnostic.
- **Registre** : la carte pointe directement 3 lignes — PEAU-023 rétinol 0,3 % = **à écarter** pendant la période · PEAU-035 bakuchiol = l'alternative douce documentée · PEAU-098 masque centella (BE) + PEAU-099 SPF (BE) = ce qui reste.
- **Fournisseur** : PEAU-098/099 → ✔ (BE) ; PEAU-023/035 ⬜ (email 4).
- **Note** : référencer le rétinol (PEAU-023) n'a de sens qu'avec la carte grossesse déjà en prod, qui dit quoi en faire — c'est un exemple de savoir qui conditionne le sourcing.

---

## 3. Table de synthèse — les 50 besoins d'un coup d'œil

L = produit de la gamme cible (kit, ◦) · B = produit cité par les cartes moyens (type) · n = nombre de lignes du registre liées · statut du meilleur fournisseur.

| # | Besoin | Recommandation KURLA | Registre (n lignes) | Fournisseur (statut réel) |
|---|--------|----------------------|--------------------|---------------------------|
| 1 | Type de peau (8 types) | — le diagnostic lui-même | — | — |
| 2 | Sécheresse ≠ déshydratation | L HA gel + L crème céramides | 3 (PEAU-024/042/058) | ⬜ à sourcer (email 4) |
| 3 | Niveau d'hydratation | L HA gel | 4 (PEAU-024/044/056/063) | ⬜ à sourcer (email 4) |
| 4 | Sensibilité | L nettoyant doux sans parfum | 4 (PEAU-002/031/047/059) | ⬜ — piste EOLYS/COSRX (email 2) |
| 5 | Phototype + ses limites | — éducation (→ #30) | — | — |
| 6 | Teint / sous-ton | — diagnostic (→ #47) | — | — |
| 7 | Barrière cutanée | L crème céramides | 3 (PEAU-009/025/045) | ⬜ à sourcer (email 4) |
| 8 | Saisonnier | riche en hiver, SPF jamais en pause | 4 (PEAU-043/057/077/099) | ✔ PEAU-099 (BE, email 1) |
| 9 | Taches HPI | L niacinamide 5% + SPF + patch anti-bouton | 4 (PEAU-020/021/028/037) | ⬜ — + **trou : patch anti-bouton** |
| 10 | Taches solaires | L SPF 50 invisible | 3 (PEAU-093/095/099) | ✔ 3/3 vérifiées (BE + AN) |
| 11 | Teint irrégulier | profil pigmentation (4 L) | 3 (PEAU-013/020/033) | ⬜ à sourcer (email 4) |
| 12 | Teint terne | vitamine C matin | 4 (PEAU-022/061/063/092) | ✔ PEAU-092 (BE) |
| 13 | Taches par frottement | L exfoliant AHA/BHA + gestes | 3 (PEAU-008/013/019) | ⬜ à sourcer (email 4) |
| 14 | IPD | — savoir (→ #30) | — | — |
| 15 | Lumière visible | écran teinté (oxydes de fer) | **0 — TROU STRUCTUREL** | à sourcer hors registre (K-beauty) |
| 16 | Mélasma / masque de grossesse | azélaïque/niacinamide + écran teinté | 3 (PEAU-020/021/093) | ✔ PEAU-093 (BE) + trou teinté |
| 17 | Assombrissement plis | L exfoliant + sécher + amples | 3 (PEAU-016/036/079) | ⬜ à sourcer (email 4) |
| 18 | Cernes | 3 familles + caféine (temporaire) | 5 (PEAU-030/064/068/069/072) | ⬜ — pôle de l'Email 3 (Ankorstore ✔) |
| 19 | Boutons occasionnels | L exfoliant BHA 2 % | 3 (PEAU-014/021/096) | ✔ PEAU-096 (AN, email 3) |
| 20 | Imperfections récurrentes | BHA 2 % + azélaïque | 4 (PEAU-007/014/021/037) | ⬜ — piste EOLYS/COSRX (email 2) |
| 21 | Points noirs | BHA 2 %, zéro extraction | 3 (PEAU-014/019/060) | ⬜ —  PEAU-088 (spatule) contradictoire |
| 22 | Picking | patch occlusif (protection physique) | **0 — TROU STRUCTUREL** | à sourcer (Ankorstore ✔) |
| 23 | Sébum / grasse | profil grasse (4 L) | 5 (PEAU-006/032/044/046/060) | ⬜ à sourcer (email 4) |
| 24 | Règle des minutes | L HA gel sur peau humide | 3 (PEAU-024/058/097) | ✔ PEAU-097 (BE, Torriden) |
| 25 | Barrière abîmée | L crème céramides | 4 (PEAU-009/025/045/072) | ⬜ à sourcer (email 4) |
| 26 | Peau réactive | allantoïne/centella, rien de plus | 5 (PEAU-031/047/059/098/100) | ✔ 2/5 vérifiées (AN + BE) |
| 27 | Rougeurs | azélaïque + SPF | 2 (PEAU-021/098) | ✔ PEAU-098 (BE) |
| 28 | Réactions au parfum | L sans parfum (≠ sans allergène) | 4 (PEAU-001/002/081/099) | ✔ PEAU-099 (BE) |
| 29 | Climat / eau calcaire | 3 minutes post-douche | 4 (PEAU-043/077/079/080) | ⬜ à sourcer (email 4) |
| 30 | SPF 30–50 fini invisible | L SPF 50 invisible fluide | 4 (PEAU-092/093/095/099) | ✔ 4/4 vérifiées (BE + AN) |
| 31 | SPF hiver / maquillage ≠ écran | SPF jamais en pause | 2 (PEAU-093/099) | ✔ (BE) |
| 32 | SPF intégré 10–13 ≠ écran | — savoir (→ #30) | — | — |
| 33 | Quantité / réapplication | 2 mg/cm² + réappli 2 h | 1 (PEAU-095 stick) | ✔ (AN, email 3) |
| 34 | Rides / ridules | vit C matin, vit A soir si barrière OK | 4 (PEAU-022/023/026/062) | ⬜ à sourcer (email 4) |
| 35 | Fermeté / élasticité | peptides | 3 (PEAU-026/062/070) | ⬜ à sourcer (email 4) |
| 36 | Vieillissement mélaniné | pigment d'abord, ride ensuite | 3 (PEAU-020/022/099) | ✔ PEAU-099 (BE) |
| 37 | Prévention active | 15 actifs dans l'ordre | 5 (PEAU-013/022/023/035/099) | ✔ PEAU-099 (BE) |
| 38 | Cou / décolleté | mêmes produits, étendus + SPF | 5 (PEAU-048/067/077/093/099) | ✔ SPF (BE) |
| 39 | Poils incarnés / post-rasage | eau chaude, sens de la pousse, 12 sem | 3 (PEAU-016/039/082) + pôle barbe (cheveux) | ⬜ à sourcer (email 4) |
| 40 | Grain de poulet | lactique 10 % / urée 10–20 % | 4 (PEAU-016/039/049/078) | ⬜ — trou : crème corps urée |
| 41 | Corps sec et rêche | 3 minutes + crème riche / huile | 6 (PEAU-048/049/052/053/067/077) | ⬜ (karité : SENIMPEX, DÉCLARATIF) |
| 42 | Aisselles | déodorant **sans alcool** + amples | 2 (PEAU-013/083) | ⬜ — ⚠ PEAU-083 sans alun ≠ sans alcool (RFQ) |
| 43 | Lèvres | L baume céramides + bâtonnet SPF 15+ | 6 (PEAU-050/051/073/074/075/076) | ⬜ — pôle Email 3 (AN) + trou : stick SPF lèvres |
| 44 | Cuir chevelu | pôle cheveux (recoupement) | **0 — TROU STRUCTUREL transverse** | aucun registre ne le couvre |
| 45 | Démaquiller sans frotter | huile + temps de pose | 4 (PEAU-004/011/071/091) | ✔ PEAU-091 (AN) |
| 46 | Maquillage non comédogène | label = allégation, pas de norme | 1 (PEAU-042) + **TROU maquillage** | ⬜ (AN + K-beauty) |
| 47 | Teinte fond de teint foncé | sous-ton, frontière, lumière naturelle | **0 — TROU STRUCTUREL maquillage** | RFQ teintes foncées (AN + BE) |
| 48 | Routine 3 gestes | L kit Essentielle 3 soins | 3 (PEAU-001/042-043/099) | ✔ PEAU-099 (BE) · kit = ◦ CIBLE |
| 49 | Un actif à la fois | 15 actifs, règle d'or | 5 (PEAU-096→100) | ✔ 5/5 vérifiées (AN + BE) |
| 50 | Grossesse / allaitement | — éducation (jamais catégorique) | 4 pointés (PEAU-023 écarté · 035 alternative · 098/099 ce qui reste) | ✔ PEAU-098/099 (BE) |

**Lecture en bloc** :
- **5 besoins sans produit** (1, 5, 6, 14, 32) — éducation et gestes ; c'est volontaire, pas un trou. (#50 est aussi éducatif, mais il pointe 4 lignes du registre : ce qu'on écarte, l'alternative, ce qui reste.)
- **19 besoins ont au moins une ligne à canal vérifié** (8, 10, 12, 16, 19, 24, 26, 27, 28, 30, 31, 33, 36, 37, 38, 45, 48, 49, 50) — le SPF et le pôle « par actif » sont les mieux armés.
- **26 besoins restent ⬜** (dont 5 trous structurels : #15/16 SPF teinté, #22 patch, #44 cuir chevelu, #46/47 maquillage) — le reste est couvert par les emails 4 (90 lignes) et 2 (EOLYS : sensibilité, imperfections, cicatrices).

---

## 4. Les trous structurels (à ajouter au registre, dans l'ordre)

1. **SPF teinté à oxydes de fer, teintes foncées** (#15, #16, #30) — le savoir KURLA (preuve RCT) exige ce produit ; il n'existe dans aucun registre. Canal naturel : BLACKETIQUE/EOLYS (K-beauty = culture du tinted SPF) — l'ajouter à l'Email 1.
2. **Patchs hydrocolloïdes imperfections** (#9, #22) — le savoir KURLA (facteur modifiable n°1) en fait un produit de protocole ; seul un patch contour yeux existe. Canal : Ankorstore (soins ciblés).
3. **Maquillage : bases de teint teintes foncées 8+** (#46, #47) — le pont vers l'achat n°2 de la cible n'est pas dans les 100 positions (la taxonomie des 15 besoins n'a pas de besoin maquillage). RFQ : nuances foncées, sans alcool, INCI, CPNP — Ankorstore (1 200 marques FR) + BLACKETIQUE.
4. **Cuir chevelu** (#44) — aucun des deux registres ne le couvre ; à ouvrir dans le pôle cheveux.
5. **Secondaires** : stick lèvres SPF 15+ teinte (#43) · crème corps urée 10–20 % (#40) · déodorant reformulé « sans alcool » (PEAU-083, #42).

Et une **incohérence à corriger** : PEAU-088 (spatule comédon inox) est dans le registre alors que la carte moyens #21 dit « pas d'extraction DIY » — soit la ligne est retirée, soit elle est repositionnée « usage par professionnel ».

**Lignes du registre sans besoin des 50** (extension hors périmètre, à garder mais à ne pas mélanger au mapping) : hommes (PEAU-010/038/054/066) · enfant (PEAU-055) · konjac (PEAU-012) · masque exfoliant doux (PEAU-065) · huile de massage (PEAU-084) · accessoires (PEAU-085/086/087/089/090).

---

## 5. Plan d'action qui découle de ce mapping

1. **Envoyer les 4 emails** (prêts, jamais envoyés — pas de boîte mail, pas de mandat) :
   - **Email 1 BLACKETIQUE** (6 refs K-beauty + CPNP) → débloque #8, #10, #12, #16, #24, #26, #27, #28, #30, #31, #36, #37, #38, #48, #49, #50 **+ le SPF teinté (trou n°1, à ajouter à l'email)**.
   - **Email 2 EOLYS** (Torriden/SKIN1004/COSRX) → débloque #4, #20 (sensibilité, imperfections) + renforce #24, #26, #27.
   - **Email 3 Ankorstore** (25 soins ciblés) → débloque #18, #22 (patch à ajouter), #33, #43, #45, #46/47 (maquillage à ajouter à l'email) + renforce #19, #26.
   - **Email 4 générique** (90 lignes) → les 25 besoins restants.
2. **À chaque réponse** : les 3 documents bloquants (CPNP + personne responsable UE + INCI + DDM/PAO) avant toute fiche — sinon pas de fiche, jamais d'inventaire.
3. **Tant que rien n'est contacté** : la boutique reste sur les produits actuels ; les 16 fiches cibles (dont les 7 des kits) restent « gamme cible non achetable » — c'est l'état honnête, affiché comme tel.

---

## 6. Ce que ce document ne dit pas (pour ne pas promettre ce qui n'existe pas)

- **Aucun prix fournisseur** : uniquement les fourchettes de positionnement du registre (« à négocier » pour les 10 lignes canaux vérifiés).
- **Aucun MOQ affirmé** : seuls les minimums publiés par les plateformes (Ankorstore 100 €/marque, franco 300 €).
- **Aucun produit référencé** : ce document est un mapping, pas un import.
- **Aucun fournisseur contacté ni autorisé** : `not_contacted` ×100 en base, c'est l'état réel au 14/09/2026.
- **Les 56 fournisseurs du registre** n'ont pas été re-vérifiés ici : leurs statuts (VÉRIFIÉ / PARTIEL / DÉCLARATIF) sont repris tels quels du dossier du 13/09/2026.
