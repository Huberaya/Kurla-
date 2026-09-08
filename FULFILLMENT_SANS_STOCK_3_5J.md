# KURLA — Fulfillment sans stock : 3–5 jours, 0 carton chez toi

**Catalogue intact.** Aucun produit, prix ou kit n'a été modifié (`launchCatalog.ts` inchangé).  
Ce plan ne change que le **rythme d'achat** et le **lieu de stockage** (3PL IDF, pas ton appart).

---

## Promesse

**Avant :** « Précommande — 10–14 jours »  
**Maintenant :** **« Expédié sous 3–5 jours — petite production hebdomadaire pour éviter le gaspillage »**

Détail : *« 60% expédiés en 24–48h via notre atelier partenaire, le reste en 3–5 jours. Accessoires en 24h. »*

---

## Schéma (0 stock chez toi)

```
Cliente → Stripe (précommande) → Batch lun+jeu 18h → Commande groupée NL → 3PL IDF
                                   ↓
                    Tampon 75 unités (485€) chez 3PL → 60% part en 24h
                                   ↓
                    Lot batch arrive J+2 → kitting K02/K03 → 40% restant en 3–5j
```

**Toi :** tu cliques "Commander le batch" 2×/semaine (2 min). Tu ne vois jamais le produit.

---

## 1. Batch 2×/semaine (au lieu de 21 jours)

| Clôture | Commande | Réception 3PL | Expédition | Délai max |
|---|---|---|---|---|
| **Lun 18:00** | Mar 10:00 | Jeu matin | Jeu aprem | 6j (sam → ven) |
| **Jeu 18:00** | Ven 10:00 | Lun matin | Lun aprem | 4j (ven → lun) |

**Moyenne : 2,8 jours** (si commande répartie). Avec 1 batch/semaine : 4,2j.

Tu encaisses avant d'acheter. Le 3PL est payé après encaissement.

---

## 2. Tampon 75 unités chez 3PL (le hack)

**5 héros × 15 unités** dormant chez le 3PL, jamais chez toi :

- p01 shampoing crème (15×7,10€ = 106,50€)
- p04 après-shampoing (15×6,50€ = 97,50€)
- p08 leave-in riche (15×8,70€ = 130,50€)
- p09 karité brut (15×4,50€ = 67,50€)
- p12 crème twist (15×8,70€ = 130,50€)

**Total : 75 unités = 532,50€ TTC / 485€ HT + 20€/mois de stockage (0,5m²).**  
Écoulé en 10 jours à 20 cmd/semaine. Aucun risque.

> Catalogue inchangé : ce tampon est **consigné chez le 3PL**, pas un `inStock=true` dans le catalogue. Le catalogue reste en `isPreorder=true`.

---

## 3. 3PL IDF — 0 carton chez toi

**Short-list à contacter (email type en annexe) :**

- **Etx Logistique (95)** — 39€/mois + 2,00€/cmd + 30€/réception, kitting OK, dès 1 cmd
- **Huboo** — 49€/mois + 2,20€/cmd, kitting OK
- **Cubyn** — 59€/mois + 2,50€/cmd

Demande : *« 75 unités en tampon + 2 réceptions/semaine + kitting K02/K03/K05 + expédition »*

---

## 4. Workflow qui ne touche pas au catalogue

| Jour | Qui | Action (2 min pour toi) |
|---|---|---|
| Lun 18:00 | Toi | Clic "Commander batch N" dans /admin |
| Mar 10:00 | Toi → Grossiste | Email groupé AfricanFabs/Afro Wholesale (NL→FR DPD 24-48h) |
| Mar-Jeu | 3PL | Expédie 60% sur tampon en 24–48h |
| Jeu matin | 3PL | Réception lot batch, contrôle, kitting |
| Jeu aprem | 3PL | Expédie 40% restant, tracking auto |
| Ven | Cliente | Tout le batch N livré |

---

## 5. Mails fournisseurs (copier-coller)

**Objet : Dropship + kitting UE — KURLA Beauty (précommande hebdomadaire)**

> Bonjour,
> Nous lançons KURLA (diagnostic cheveux texturés + kits). Année 1 sans stock à Paris : nous fonctionnons en **précommande groupée 2×/semaine**.
> Faites-vous :
> 1) **Dropship à l'unité** vers FR pour nos 12 outils (prix gros + picking) ?
> 2) **Livraison groupée hebdomadaire** vers notre 3PL IDF (2×/semaine, ~20 unités/commande) pour nos 5 héros cosmétiques ?
> 3) **Kitting** K02/K03 chez vous ou via notre 3PL ?
> Pouvez-vous nous transmettre grille gros, MOQ et CPNP/personne responsable UE pour p01/p04/p08/p09/p12 ?
> Merci,
> KURLA

Envoyer à : `info@africanfabs.com` / `support@afrowholesale.eu`

---

## 6. Vérification catalogue intact

```bash
git diff -- src/lib/launchCatalog.ts
# doit retourner vide
```

`src/lib/fulfillment.ts` porte seul la promesse 3–5j et le tampon.

---

## 7. Décision

On démarre en **2 batchs/semaine + tampon 75** → 2,8j de délai moyen, catalogue intact, 0 carton chez toi.

Prochaine étape : j'envoie les 2 mails fournisseurs + demande de devis 3PL dès ton GO.
