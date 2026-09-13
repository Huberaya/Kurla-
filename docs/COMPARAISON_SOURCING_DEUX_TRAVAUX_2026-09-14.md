# Comparaison — sourcing du 13/09 (agent B) vs sourcing indépendant du 14/09 (agent A)

**Objectif** : mesurer honnêtement ce que chaque travail apporte, ce qui se recoupe,
ce qui se complète, et décider sur quelle base on prépare les emails (phase 3) et
l'enrichissement de la boutique (phase 4). Aucune polémique : les deux travaux
coexistent dans le dépôt ; cette comparaison est un outil de décision.

---

## 1. Ce que fait chacun

### Agent B (13/09) — l'infrastructure du sourcing
- **Registre 100 produits** : 15 besoins du diagnostic × 7 étapes de routine, 7 positions
  écartées (« on n'invente pas un exfoliant pour les lèvres »). Chaque ligne : nom de
  produit, actif clé, format, fourchette de prix, canal (`affiliation` 92 / `dropship` 8).
- **Registre 56 fournisseurs** : 3 paliers (France / Europe / Monde), types, conformité UE,
  statuts de vérification (VÉRIFIÉ / PARTIEL / DÉCLARATIF).
- **4 emails prêts à envoyer** (BLACKETIQUE · EOLYS · Ankorstore · modèle générique pour
  les 90 lignes sans fournisseur) + la question bloquante CPNP / personne responsable
  (règl. 1223/2009).
- **Mécanisme en base** : `supplier_authorization_status`, contrainte de cohérence des
  dates d'autorisation, garde de publiabilité (marque + composition + image + pays).
- **Chiffres clés** : 100 positions · 10 lignes à canal identifié (4 Ankorstore, 6
  BLACKETIQUE/EOLYS) · 90 « piste à confirmer » · **0/100 contactées** · 0/100 autorisées.

### Agent A (14/09) — la matière première
- **Mapping 50 besoins** (pas 15) : chaque besoin → produit nécessaire (savoir KURLA) →
  produits réels trouvés → fournisseur avec statut.
- **Produits nommés, pas décrits** : marques réelles avec prix publics constatés et INCI
  publiques quand disponibles (LRP, Avène, Bioderma, Eucerin, Isdin, Weleda, Nuxe, IN'OYA,
  The Ordinary, COSRX, Isntree, Ducray, Klorane, L'Oréal Paris True Match, Cosmo Naturel).
- **5 canaux B2B K-beauty vérifiés** dont 3 nouveaux (Pibukare, Kocosmetic, Get Your
  K-Beauty) + 3 acteurs FR accessibles en B2B direct (IN'OYA, Weleda, Cosmo Naturel).
- **Trous structurels comblés par des produits réels** : SPF teinté oxydes de fer (Isdin +
  Eucerin), patchs imperfections (COSRX), cuir chevelu (Ducray + Klorane), teintes foncées
  (True Match 48 teintes + Fenty + MAC), stick SPF lèvres (Avène).

---

## 2. Ce qui se recoupe — et ce qui se vautre dans la même direction

| Point | Agent B | Agent A | Convergence |
|---|---|---|---|
| BLACKETIQUE | VÉRIFIÉ (SIRET 979 710 829 00024, Groslay, 50 marques) | ✔ re-vérifié de manière indépendante sur blacketique.com (mêmes SIRET, adresse, contacts) | **Convergence totale** — le canal principal est solide |
| EOLYS | VÉRIFIÉ (B Corp, plateforme B2B, Torriden/COSRX/SKIN1004) | ✔ re-vérifié sur eolys-beaute.com (mêmes marques, offre pro) | **Convergence totale** |
| Question bloquante CPNP | Posée en tête de chaque email | Reprend le même cadre (1223/2009, personne responsable) | Cadre réglementaire commun, pas de divergence |
| Statut d'ensemble | 0/100 contactées, rien d'autorisé | Aucun fournisseur contacté non plus | Même état réel : **tout est encore à obtenir** |
| 16 fiches cibles | « gamme cible non achetable, pas de façonnier » | Non touchées (le sourcing indépendant ne les remplace pas) | Cohérent : la gamme propre reste à décider séparément |

**Points où les deux se complètent sans se marcher dessus** :
- L'agent B a **Ankorstore** (✔ vérifié, 1 200 marques beauté FR, min. 100 €/marque) —
  canal que la recherche du 14/09 n'a pas exploré ; il reste pertinent (soins ciblés,
  patchs, maquillage FR). L'agent A a **Pibukare, Kocosmetic, Get Your K-Beauty, IN'OYA,
  Weleda, Cosmo Naturel** — absents du registre de 56 fournisseurs.
- L'agent B pense en **positions produit** (la matrice 15×7) ; l'agent A pense en
  **besoins client** (les 50) — la matrice couvre les routines, les 50 couvrent l'éducation
  et les besoins hors routine (grossesse, plis, aisselles, cuir chevelu…).

---

## 3. Ce qui différencie vraiment

| Dimension | Agent B (13/09) | Agent A (14/09) |
|---|---|---|
| Granularité du besoin | 15 besoins du diagnostic | **50 besoins** (dont 13 hors diagnostic) |
| Produits | **Décrits** (« Gel Nettoyant Doux Sans Savon », marque à confirmer sur 90/100 lignes) | **Nommes** (marque + produit + prix public + INCI quand publique) |
| Fournisseurs | 56 acteurs, dont 3 canaux K-beauty vérifiés + Ankorstore | 5 canaux K-beauty vérifiés (dont 3 nouveaux) + 3 acteurs FR + grille honnête sur les grands dermo |
| Trous structurels | Identifiés dans le mapping du 14/09 (SPF teinté, patchs, maquillage, cuir chevelu) | **Comblés par des produits réels** (Isdin/Eucerin tinted, COSRX, Ducray/Klorane, True Match/Fenty/MAC, Avène stick) |
| Grand dermo-cosmétique | Non couvert (le registre vise K-beauty + FR bio) | **Couvert** (LRP, Avène, Bioderma, Eucerin, Isdin, True Match, Ducray, Klorane — mais canal = grosiste, à sourcer) |
| Mécanisme de conformité | **Construit en base** (statuts d'autorisation, contrainte dates, garde publiabilité) | S'appuie sur ce mécanisme, n'en double pas |
| Emails | 4 prêts (BLACKETIQUE, EOLYS, Ankorstore, générique) | Shortlist de 9 cibles en 3 priorités (à rédiger) |

**Lecture honnête** :
- L'apport structurel de l'agent B (matrice, registres, base de données, emails prêts,
  cadre CPNP) est **consolidé et conservé** — c'est l'infrastructure.
- L'apport de l'agent A est la **matière première qui manquait à 90 % des lignes** :
  des marques et produits concrets, vérifiés, avec canaux. Les 90 « pistes à confirmer »
  du registre trouvent ici des candidats précis pour une bonne partie.
- Aucune contradiction de fond entre les deux ; les deux états (« 0 contacté ») coïncident.
- **Une divergence de méthode à noter** : le registre de l'agent B utilise le canal
  `dropship` sur 8 lignes — le sourcing indépendant n'en a retenu aucun (pas de contrôle
  fournisseur, pas de CPNP vérifiable) ; à trancher au moment des emails.

---

## 4. Décision : la base commune pour les phases 3 et 4

**Base des emails (phase 3)** = la shortlist des 9 cibles (3 priorités) de l'agent A,
**enrichie d'Ankorstore** (canal validé par l'agent B) → **10 cibles** :
K-beauty pro (Pibukare, EOLYS, BLACKETIQUE, Kocosmetic, Get Your K-Beauty, Ankorstore) ·
acteurs FR (IN'OYA, Weleda, Cosmo Naturel) · grosiste dermo (1 à identifier).
Le cadre des emails reste celui de l'agent B (CPNP d'abord, 3 documents bloquants,
réfuses opposables) — c'est du bon travail, on ne le refait pas.

**Base de l'enrichissement boutique (phase 4)** = fusion des deux vues :
1. **Les 100 lignes du registre** restent la matrice de positionnement produit (on garde
   la matrice 15×7) — mais chaque ligne reçoit les **candidats marque** de la recherche
   du 14/09 (colonne `marque_candidat`) au lieu du vide « à confirmer ».
2. **Les produits nommés** (Isdin tinted, Eucerin UreaRepair, COSRX patch, Weleda déo,
   Ducray/Klorane, True Match, Avène stick lèvres, IN'OYA SPF…) entrent comme **fiches
   statut `sourcing_en_cours`** — non publiables tant que le fournisseur n'a pas répondu
   (garde de publiabilité intacte : marque + INCI + pays + **autorisation**).
3. **Les 16 fiches cibles** (gamme propre) : inchangées, décision façonnier séparée.

**Ce que cela donne** : un seul sourcing (pas deux), 10 emails à envoyer, ~25 fiches
« sourcing en cours » prêtes à devenir publiables dès la première vague de réponses
fournisseur, et la matrice 100 produits avec des marques candidates à la place des trous.
