# FICHE — Comment placer un outil en dropshipping sur KURLA (0 carton à Paris)

> ✅ **Oui, tu peux le faire seul — sans passer par le dev** — depuis `Admin → Catalogue produits` grâce au toggle `Dropship 24–48h` (ajouté le 2026-09-08). Le dev n'est plus nécessaire sauf pour les 12 outils historiques déjà codés.

**Objectif :** ajouter un outil vendu en **24–48h** depuis notre partenaire UE (AfricanFabs / Afro Wholesale, NL) — sans stock chez toi, sans CPNP, marge 60–66% HT, panier mixte = 1 seul colis via 3PL.

**Règle d'or Année 1 :** `launchCatalog.ts` ne bouge jamais. Les outils dropship sont une *couche fulfillment* (`fulfillment.ts`). Un nouvel outil = 1 fiche produit en admin + 1 ligne dans la liste dropship.

---

## 1. Quand un outil est bon pour KURLA ?

Coche les 5 cases — sinon, passe :

| Critère | OK si | Exemple |
|---|---|---|
| **Usage réel communauté 4C** | Répond à un geste bloquant (démêler, protéger la nuit, définir, entretenir tresses/locs) | Peigne afro → volume racines |
| **Dropship à l'unité** | Fournisseur expédie **1 pièce** sans MOQ 100, picking ≤2,50€/colis, DPD NL→FR 24–48h | AfricanFabs : oui, 2€/colis |
| **Marge HT ≥55%** | `Prix TTC /1,20 – coût HT` / `Prix TTC/1,20` ≥55% | 12,90€ TTC → coût HT max 4,80€ |
| **Pas de CPNP** | Accessoire, pas cosmétique (pas de Règl. 1223/2009) | Bonnet satin : aucun dossier |
| **Photo exploitable** | Fournisseur fournit photo HD sur fond clair + 1 photo en usage | Peigne afro sur cheveux 4C |

**3 outils qui cochent tout (dans tes 12) :**
- `p35` Afro pick métal 4,90€ (coût 1,70€ → 65%)
- `p17` Bonnet satin + taie 12,90€ (4,80€ → 63%)
- `p41` Éponge twist 8,90€ (3,10€ → 65%)

**3 outils à éviter en dropship :**
- Steamer à 42€ HT qui demande SAV électrique → passe en précommande avec tampon
- Kit complet 7 outils à 45€ HT → éclate en unités, sinon marge fausse
- Outil sans photo cheveux texturés → taux de retour élevé

---

## 2. Workflow en 7 étapes (10 min si fournisseur déjà OK)

### Étape 1 — Repérage (2 min)
Tu vois un outil sur AfricanFabs (B2B), Afro Wholesale, ou TikTok Shop. Note :
- Nom fournisseur exact
- Réf fournisseur + EAN si existant
- Prix HT unitaire + grille dégressive (1 / 10 / 50 pcs)
- Stock NL réel + délai annoncé

**Mail type à envoyer (copié depuis Admin > Fournisseurs) :**
> `Hello AfricanFabs, do you dropship this tool per unit to our 3PL near Paris (Etx 95) ? Price HT per unit + picking fee per parcel + lead time NL→FR ? We need 1 unit test, then ~5–20/week. No CPNP needed (non-cosmetic).`

### Étape 2 — Vérif rapide prix/marge (1 min)
Formule : `marge HT = (TTC/1,20 – coût HT) / (TTC/1,20)`
- 7,90€ TTC /1,20 = 6,58€ HT → si coût 2,70€ → marge 59% → OK
- Si coût 3,80€ → marge 42% → KO, baisse le TTC ou négocie

**Grille conseillée :**
- Petit outil impulsif : 4,90–6,90€ TTC
- Outil cœur : 7,90–12,90€ TTC
- Outil premium (diffuseur, microfibre) : 12,90–14,90€ TTC

### Étape 3 — Création fiche en admin (3 min)
`Admin → Catalogue & Stock → Catalogue produits → Créer produit`

| Champ | À remplir | Exemple `p48` |
|---|---|---|
| Nom | Court + bénéfice | Brosse vapeur nano-mist (anti-frisottis, USB-C) |
| Marque | KURLA Essentials | KURLA Essentials |
| Catégorie | **accessoires** | accessoires |
| Sous-catégorie | Outils | Outils |
| Prix TTC | Ton prix boutique | 34,90€ |
| Image | Photo fournisseur HD (fond blanc) + 2e image en usage | `kurla-device.jpg` |
| Description | 2 phrases : problème + geste (voir modèles §3) | “Frisottis entre 2 lavages ? Brume fine 5µm qui réhydrate sans mouiller…” |
| InStock | ☑ oui | oui |
| Statut | **published** | published |

**Ne touche pas** à `stockQuantity` (0) — en dropship, le stock est chez le partenaire.

### Étape 4 — Passage en dropship 24–48h (30 sec) — AUTONOME

**Méthode autonome (recommandée) — sans code, sans moi :**

1. Dans ta fiche `Admin → Catalogue produits` (création ou `Modifier`), coche la case verte :
   `☑ Dropship 24–48h (partenaire UE) — 0 stock chez toi`
   > Elle est dans le bloc `Stock de base / Pays` → juste sous `Pays (FR, BE)`.
2. `Enregistrer` → le produit reçoit le badge `dropship_24_48h` en base.
3. Passe le statut à `published` → la boutique affiche **instantanément** le badge vert `24–48h` (fiche + panier + guide), sans redéploiement Vercel.

**Comment ça marche techniquement (tu n'as pas à le faire) :**
- Coché = `badges: ['dropship_24_48h']` en base → `isDropshipProduct()` renvoie `true` → `TOOL_DISPATCH_SHORT` affiché.
- Décoché = badge retiré → repasse en `Précommande 3–5j` ou `Disponible` selon le stock.

**Méthode historique (pour les 12 outils de base uniquement) :**
- Les 12 (`p35` afro pick, `p17` bonnet, etc.) restent codés dur dans `src/lib/fulfillment.ts → DROPSHIP_TOOLS_IMMEDIATE` pour compatibilité. Tu n'as pas à les toucher.
- Si tu crées un **nouvel outil** avec un ID type `a1b2c3...`, seule la case à cocher suffit. Plus besoin de me donner l'ID.

**Vérif :** après avoir coché, `Admin → Catalogue → Fiches produits` affiche un tag vert `24–48h dropship` à côté du nom.

### Étape 5 — Vérif boutique (1 min)
- `/boutique?cat=accessoires` → ta carte doit afficher **badge vert `24–48h`** + ligne verte `En stock partenaire — expédié en 24–48h` + bouton `Ajouter` (pas `Précommander`)
- `/produit/ta-brosse-vapeur` → même badge
- Ajoute 1 soin (ex: leave-in) + ton outil → panier → **“Panier mixte : outils 24–48h + soins 3–5j — 1 seul colis via 3PL (délai global 3–5j)”**

### Étape 6 — Test commande (optionnel mais conseillé)
Passe une commande test à 1€ (Stripe TEST) avec ton outil seul → vérifie dans `Admin → Commandes` que le statut passe en `paid` → tu envoies manuellement le bon au fournisseur (portail B2B ou email) → DPD suivi → transfert au 3PL si mixte.

### Étape 7 — SAV & réassort
- Retour : via 3PL, jamais chez toi (adresse 3PL sur bon de retour)
- Rupture NL : fiche passe auto en `Indisponible` (tu décoches `InStock` en admin)
- Réassort : aucun — flux tendu, tu recommandes à l'unité

---

## 3. Modèles de fiches — copier-coller

### Exemple 1 — Outil impulsif à forte marge (réel)
**p21 — Brosse à edges + peigne précision (baby hair)**
- **Prix** : 5,90€ TTC (coût 2,00€ HT → 66%)
- **Badge boutique** : vert `24–48h`
- **Description courte (120 car.)** : `Bords et baby hair qui rebiquent ? Brosse douce + peigne fin pour plaquer sans casser. Format voyage, poils naturels.`
- **Pour qui / Quand** : `3A–4C, baby hair, tempes` / `Fin de coiffage, edges, plaquage`
- **3 bénéfices** : `Dessine les baby hair sans traction · Peigne fin pour raies nettes · Petit prix, glisse dans tous les paniers`
- **Erreur à éviter** : `Ne pas appuyer fort sur les tempes — risque de traction.`
- **Cross-sell** : `+ bonnet satin p17 (nuit)`

### Exemple 2 — Outil cœur (réel)
**p17 — Bonnet satin nuit + taie d'oreiller (set)**
- **Prix** : 12,90€ TTC (4,80€ HT → 63%)
- **Description** : `Nuit = 8h de frottement. Satin double face qui garde l'hydratation et la définition. Élastique large qui ne serre pas.`
- **Bénéfices** : `Garde l'hydratation · Évite la casse · Compatible avec tresses, twists, vanilles`
- **Astuce communauté** : `“Dors avec ton twist, pas contre lui — bonnet + taie = combo gagnant.”`
- **Lien guide** : `/outils#bonnet-satin`

### Exemple 3 — Nouvel outil à placer (fictif mais sourçable)
**Brosse vapeur nano-mist 5-en-1 (USB-C) — à créer**
- **Repéré chez** : Afro Wholesale, réf `AW-VAPOR5`, stock NL 240 pcs
- **Coût HT** : 15,00€ (prix boutique 34,90€ TTC → HT 29,08€ → marge 48% → trop juste → **passe à 39,90€ TTC** → HT 33,25€ → marge 55% OK)
- **Fiche à créer** :
  - Nom : `Brosse vapeur nano-mist électrique (anti-frisottis, USB-C)`
  - Catégorie : accessoires / Outils
  - Prix : 39,90€ TTC
  - Description : `Refresh entre 2 lavages sans re-mouiller tout. Brume 5µm + picots souples qui démêlent. Recharge USB-C, 200ml.`
  - Image : `kurla-device.jpg` + photo main avec brosse
  - Badge attendu après étape 4 : vert `24–48h`
- **Mail fournisseur (à copier)** :
  > `Hello, we want to dropship SKU AW-VAPOR5 per unit to our 3PL Etx 95 (FR). Please confirm unit HT 15€ + picking fee + 24–48h DPD lead time. We start with 1 test unit, then 10/week.`
- **Cross-sell boutique** : `Spray refresh p32 + vaporisateur p18`

---

## 4. Checklist avant de publier (à cocher)

- [ ] Fournisseur confirme **dropship à l'unité** + picking + délai NL→FR écrit
- [ ] Prix TTC → marge HT ≥55% (sinon ajuste)
- [ ] Photo HD + photo en usage sur cheveux texturés
- [ ] Fiche créée en **accessoires / Outils**, `InStock ☑`, `published`
- [ ] Case `☑ Dropship 24–48h` **cochée** dans `Admin → Catalogue` (ou ID ajouté à `DROPSHIP_TOOLS_IMMEDIATE` pour les 12 historiques)
- [ ] Badge vert `24–48h` visible en boutique + fiche + panier mixte testé
- [ ] Description : problème + geste + 3 bénéfices + erreur à éviter
- [ ] Lien guide `/outils#...` ajouté si l'outil a une fiche geste

---

## 5. Erreurs qui coûtent (vues en 2025)

- **Mettre un cosmétique en dropship 24–48h** → besoin CPNP/RP → blocage douane. Réservé aux accessoires.
- **Oublier de préciser “livraison directe 3PL”** sur le bon → colis arrive à Paris dans ton appart. Toujours : `Livraison à : [Adresse 3PL]`
- **Prix HT mal calculé sur TTC** → marge affichée 45% mais réelle 30% (TVA oubliée). Toujours diviser TTC par 1,20.
- **Photo générique sans cheveux texturés** → conversion /2. Exige photo 4C.

---

## 6. Où trouver les prochains outils ?

- **AfricanFabs B2B** (NL) → catégorie `Tools & Accessories` → 180 refs, filtre `In stock EU`
- **Afro Wholesale** → `Hair Tools` → meilleurs délais FR
- **TikTok “hair tools 2025”** → repère le viral (ex: peigne LED lumière rouge), vérifie s'il est déjà chez ton grossiste UE avant d'importer Chine (MOQ 500 KO en dropship)

**Besoin d'un template bon de commande fournisseur pour ton premier outil ?** Va dans `Admin → Fournisseurs & sourcing → Tampon 75` : le bloc “Bon de commande” est déjà pré-rempli — remplace juste les 5 lignes héros par ton outil à l'unité.

---

*Fichier source : `src/lib/fulfillment.ts` (liste dropship) + `src/lib/preorderPromise.ts` (promesse 24–48h vs 3–5j). Catalogue `launchCatalog.ts` inchangé.*
