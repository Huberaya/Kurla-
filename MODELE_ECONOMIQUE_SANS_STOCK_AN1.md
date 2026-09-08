# KURLA — Année 1 sans stock à Paris : modèles économiques & trajectoire

**Contrainte posée :** 0 stock chez vous la première année. Appartement parisien = impossible de stocker, préparer, expédier.  
**Question :** comment encaisser, construire la marque et prouver le marché sans avancer 4-6 000 € de lot et sans remplir le salon de cartons ?

> Ce document complète le catalogue (54 SKU + 10 kits) et le Command Center. Il ne remplace pas la stratégie : il propose **le chemin financier et opérationnel qui rend l'année 1 tenable sans stock.**

---

## 1. Ce que dit ton catalogue aujourd'hui

Tu as **54 produits** décidés, pas 5 :

| Bloc | Exemples | Prix TTC | Coût HT cible | Marge réelle HT* | Contrainte |
|---|---|---|---|---|---|
| **Cœur cosmétique** (p01-p15, p28-p34, p51-p54) — 22 SKU | Shampoings, masques, leave-in, huiles | 8,90-19,90 € | 4,5-10,9 € | **~30-34 %** (pas 45 %) | **Réglementaire forte** : CPNP, Personne Responsable UE, étiquetage FR. Impossible de vendre un cosmétique acheté hors UE sans ce dossier. |
| **Outils & accessoires** (p16-p27, p35-p50) — 32 SKU | Peigne afro 4,90 €, éponge twist 8,90 €, bonnet satin 12,90 €, steamer 99,90 €, brosse vapeur 34,90 € | 4,90-149,90 € | 1,7-42 € | **~56-66 %** | **Quasi aucune contrainte** cosmétique. Stockage simple, MOQ 100-300, envoi lettre/colis. |
| **10 kits** | K02 64,90 € (5 produits), K03 69,90 €, K06 89,90 € … | 39,90-149,90 € | — | 28-38 % HT réel | Assemblage = kitting. Sans stock, il faut un endroit qui assemble. |

\* Correction audit 09/02 : TVA 20 % déduite. Un produit annoncé « 45 % » est à 34 % HT réel. Seuls les outils tiennent 60 %+.

**Deux natures de produits = deux logistiques possibles.** C'est la clé de l'année sans stock.

---

## 2. Pourquoi « pas de stock à Paris » change tout (mais ne bloque pas)

| Si tu stockes chez toi | Si tu ne stockes pas |
|---|---|
| Avance 4-6 k€, 80-120 kg de cartons, préparation le soir, retours dans l'entrée, risque invendus | 0 € d'avance stock, 0 carton, mais tu dois **déléguer** : le produit dort chez quelqu'un d'autre qui l'expédie à ta place |
| Marge 34 % HT (cosmétique) / 62 % (outils) | Marge plus faible si tu laisses la logistique à un tiers (dropship +15-25 % de frais, 3PL ~2-3 €/commande + stockage) |
| Livraison 48h, contrôle total | Livraison 3-10 jours selon modèle, contrôle partiel |
| Besoin SIRET + Stripe live immédiat | Besoin SIRET + Stripe live **quand même** (tu encaisses), mais tu achètes **après** avoir encaissé (précommande) |

**La question n'est pas « avec ou sans stock », c'est « qui porte le stock à ta place la première année ».**

---

## 3. 5 modèles viables — chiffrés sur 100 commandes (panier 52 € TTC, ton AOV cible M3)

Hypothèse commune : 100 commandes = 5 200 € TTC encaissés. Frais fixes KURLA (domaine, Supabase, 1 freelance contenu) ~400 €/mois.

### Modèle A — Curateur affilié (tu ne vends pas, tu recommandes)

**Mécanique :** Le diagnostic recommande un produit, tu rediriges vers le fournisseur (Amazon, AfricanFabs, Afro Wholesale, fabricant) avec ton lien affilié. Tu ne touches ni stock ni paiement. Le fournisseur encaisse, expédie, gère le SAV.

- **Flux financier :** 0 € d'achat. Tu touches une commission affiliée 8-15 % (Amazon 3-7 %, grossiste afro 10-15 % si négocié). Sur 100 commandes à 52 € : **416-780 €** de revenu, pas 5 200 €.
- **Trésorerie :** Besoin 0 €. Rentable dès la 1ère vente.
- **Avantages :** Zéro risque, zéro SAV logistique, zéro conformité (le fournisseur est responsable), tu valides la demande sans parler à un grossiste.
- **Inconvénients majeurs :** Tu ne connais pas tes clientes (pas d'emails d'acheteuses, pas de data), tu ne construis pas KURLA (le colis n'est pas KURLA), marge divisée par 3, tu dépends du prix/stock du tiers. Impossible de faire des kits (un kit = 5 fournisseurs différents).
- **Réglementaire :** Aucune — tu n'es pas metteur sur le marché.
- **Verdict :** **Parfait pour tester 30 jours**, catastrophique pour construire une marque.

### Modèle B — Dropshipping via grossiste UE (le grossiste expédie à ta place)

**Mécanique :** Tu encaisses 52 € sur Stripe (comme aujourd'hui). À chaque commande, une requête automatique (ou email) part chez ton grossiste UE (ex. AfricanFabs NL, Afro Wholesale NL, un distributeur Cantu/Shea Moisture FR). Il prépare le colis en neutre ou avec ton insert et l'expédie au client. Tu ne vois jamais le produit.

- **Flux financier (exemple 100 cmd) :**
  - Encaissé : 5 200 € TTC = 4 333 € HT
  - Achat grossiste (prix gros, pas prix cible KURLA) : ~28 € HT/produit moyen → 2 800 € HT
  - Frais dropship : +3-4 €/colis (picking + sur-emballage) → 350 €
  - Livraison (facturée au client 4,90 €, offerte dès 60 €) : coût réel 5,50-7 € → ~600 €
  - **Marge brute HT : ~580 € (13 %)** — vs 34 % si tu avais acheté le lot toi-même. Les outils sauvent : un peigne afro dropshippé à 1,70 € revendu 4,90 € = 55 % HT.
- **Trésorerie :** Besoin 0 € de stock, mais besoin de **payer le grossiste à J+1** (tu as déjà encaissé Stripe à J+2-7, cash neutre si tu ne rembourses pas avant).
- **Avantages :** Vrai acte d'achat KURLA, tu gardes la donnée client, tu peux faire des kits si le grossiste sait faire du kitting (rare, mais AfricanFabs le propose sur devis), 0 carton chez toi, livraison 2-4 jours depuis NL/FR.
- **Inconvénients :** Marge écrasée, dépendance totale (rupture chez lui = rupture chez toi), peu de grossistes acceptent le dropship à l'unité sur cosmétiques afro (à vérifier), pas de contrôle qualité, SAV compliqué (retour chez lui). Si le fournisseur est hors UE, **illégal** pour les cosmétiques (pas de Personne Responsable).
- **Condition sine qua non :** Fournisseur **UE avec CPNP + Personne Responsable**. AfricanFabs (NL) et Afro Wholesale (NL) sont les deux seuls identifiés comme conformes. Aucun dropship AliExpress sur les p01-p15.

### Modèle C — Précommande groupée + 3PL à la demande (tu encaisses d'abord, tu achètes ensuite)

**C'est le modèle déjà codé chez toi** (`isPreorder=true`, `PREORDER_MAX_PER_ITEM=500`, page « Expédié sous 10-14 jours »).

**Mécanique :** Tu ouvres une fenêtre de précommandes de 14-21 jours. Tu encaisses (Stripe). À la clôture, tu commandes **exactement** les quantités prévendues chez tes grossistes (2-3 fournisseurs), tu fais livrer le lot chez un 3PL (pas chez toi) qui kitte et expédie. La cliente sait qu'elle précommande (délai annoncé).

- **Flux financier (100 cmd) :**
  - Encaissé : 5 200 € TTC = 4 333 € HT
  - Achat au plus juste (prix cible KURLA, car tu commandes groupé) : 2 450 € HT (mieux que B car volume)
  - 3PL : réception 30 € + stockage 15 jours ~20 € + picking 2,20 €/cmd (220 €) + colis/carton 0,80 € (80 €) → 350 €
  - Livraison : 600 € (idem)
  - **Marge brute HT : ~930 € (21 %)** — mieux que B de +350 €, car tu négocies mieux et tu ne paies pas le surcoût dropship à l'unité.
- **Trésorerie :** **Positive** : tu encaisses 5 200 € avant de décaisser 2 450 € d'achat. Tu peux même encaisser 2 fenêtres d'avance. Besoin 0 € si tu respectes la promesse de délai. Seul impératif : ne pas dépenser l'encaissement avant d'avoir acheté.
- **Avantages :** Marge la plus proche du modèle avec stock, zéro invendu (tu n'achètes que ce qui est vendu), zéro carton chez toi, kits possibles (le 3PL assemble K02/K03), tu gardes la marque (colis KURLA). C'est le seul modèle qui permet de vendre des kits 5 produits sans stock.
- **Inconvénients :** Délai client 7-14 jours (à assumer), 2-3 semaines de stress fournisseur, 3PL à gérer (mais un seul interlocuteur). Si une précommande est annulée, tu rembourses (provision 2 %).
- **Réglementaire :** Tu es metteur sur le marché, mais tu passes par des grossistes UE déjà conformes → tu récupères leurs CPNP. Pas de fabrication.

### Modèle D — Micro-stock chez 3PL (tu achètes un petit lot, mais il dort chez un pro, pas chez toi)

**Mécanique :** Tu achètes un **micro-lot** de 2 000-3 500 € (pas 6 000 €) : uniquement les best-sellers outils + 2 kits héros (K02/K03). Tu le fais livrer directement chez un 3PL parisien/IDF (Bigblue, Cubyn, Etx Logistique, Huboo). Il stocke, prépare, expédie. Tu ne touches jamais la marchandise.

- **Flux financier (100 cmd, lot initial 3 000 €) :**
  - Investissement initial : 3 000 € HT (sortie de trésorerie M0)
  - Sur 100 cmd : achat déjà payé (0 € suppl.), 3PL (stockage 40 €/mois pour 2m² + picking 2,20 €/cmd) → 260 € + livraison 600 € → **Marge HT ~1 470 € (34 %)** — la meilleure des 4, car tu as acheté au prix cible.
  - Mais il faut écouler 60-70 % du lot pour rentrer dans tes frais. Si tu vends 30 commandes seulement, tu as 2 000 € de stock dormant.
- **Trésorerie :** Besoin 3 k€ M0. Rentable à partir de ~55 commandes (seuil où la marge couvre l'avance).
- **Avantages :** Livraison 24-48h, expérience premium, SAV simple, kits maîtrisés, pas de délai client.
- **Inconvénients :** Avance de cash, risque invendu (même petit), il faut choisir les bons SKU du premier coup. À Paris, un 3PL facture 39-59 €/mois pour <5m² + 1,90-2,50 €/préparation. C'est 80-120 €/mois fixes même sans vente.
- **Idéal quand :** Tu as prouvé 30-50 précommandes sur les mêmes produits (donc tu sais quoi acheter).

### Modèle E — Digital & service d'abord (l'année 1 ne vend presque pas de physique)

**Mécanique :** Tu monétises ce que tu as déjà et qui ne demande aucun stock : **KURLA+ (7,90 €/mois), diagnostic, affiliation, contenu.** Le physique est en affiliation ou précommande ultra-ciblée (seulement outils). Objectif : 15-40 abonnés KURLA+ + 30-50 affiliations outils/mois = 300-500 €/mois récurrents pour financer le futur lot.

- **Flux financier :** 30 abonnés × 7,90 € = 237 € MRR + 40 outils affiliés à 12 € panier × 12 % = 58 € → ~300 €/mois. Pas de logistique.
- **Avantages :** 0 €, 0 risque, tu construis l'audience et la data, tu prouves la confiance.
- **Inconvénients :** Ne valide pas la capacité à vendre des kits cosmétiques (le cœur de ta marge future). Croissance lente.

---

## 4. Comparatif — la note de Paris

| Critère (poids pour toi) | A Affilié | B Dropship UE | **C Précommande 3PL** | D Micro-stock 3PL | E Digital |
|---|---|---|---|---|---|
| **Besoin cash M0** | 0 € | 0 € | 0 € | 2-3,5 k€ | 0 € |
| **Besoin place chez toi** | 0 | 0 | 0 | 0 | 0 |
| **Marge HT sur 100 cmd à 52 €** | 8-15 %* | 13 % | **21 %** | **34 %** mais avec avance | 85 % sur abonnement |
| **Contrôle marque / colis KURLA** | ❌ | ⚠️ neutre | ✅ | ✅✅ | ✅ (mais pas de colis) |
| **Kits 5 produits possibles ?** | ❌ | ⚠️ rare | ✅ | ✅ | ❌ |
| **Délai client** | 2-4 j (tiers) | 2-4 j | **7-14 j annoncés** | 24-48h | instantané |
| **Risque invendu** | 0 | 0 | 0 | **Moyen** | 0 |
| **Charge opérationnelle / semaine** | 2h | 4h + SAV | **5h (1 commande groupée)** | 3h | 6h (contenu) |
| **Conformité cosmétique** | OK (tu ne vends pas) | **À risque si hors UE** | ✅ (via grossiste UE) | ✅ | OK |
| **Scalable à 1 000 cmd/mois ?** | Non (tu restes affilié) | Non (marge s'effondre) | Oui (devient D) | **Oui** | Non |

\* Affilié : % sur TTC, pas marge HT.

**Lecture :** Avec ta contrainte « pas un carton chez moi », **C est le seul modèle qui te donne une vraie marge, des kits, une marque, et zéro avance.**

---

## 5. Trajectoire recommandée — année 1 hybride sans stock

> Nous allons **démarrer sans stock, finir l'année avec un micro-stock externalisé qui s'est payé tout seul.**

### Phase 1 — M0-M3 : Précommande + Dropship outils (0 € de stock, 0 carton)

**Nous choisissons :**
- **Cosmétiques (p01-p15) : 100 % précommande groupée (Modèle C).** Nous ouvrons une fenêtre de 21 jours, nous encaissons, nous commandons le lot exact, 3PL kitte et expédie. Promesse tenue : « Précommande — expédié sous 10-14 jours. Tu fais partie des 100 premières. »
- **Outils (p16-p50) : Dropship UE à l'unité (Modèle B) pour les best-sellers à forte marge.** Le peigne afro (p35 4,90 €), l'éponge twist (p41 8,90 €), la brosse massage (p36 7,90 €) sont déjà chez AfricanFabs/Afro Wholesale. Nous les proposons en add-on immédiat (livraison 3-4 jours) pendant que la cliente attend son kit. Cela finance le cash et fait monter le panier sans complexité kits.
- **Kits :** Seuls K02/K03/K05 en précommande (3 kits, pas 10). Moins d'incertitude, moins de références à commander.

**Chiffres M0-M3 :**
- Objectif : 100 commandes précommandées (ton palier 100) + 40 outils dropshippés en add-on
- Encaissé : ~6 000 € TTC
- Décaissé achat groupé : ~2 450 € HT (payé après encaissement)
- 3PL : ~350 €, livraison ~700 €, dropship outils ~160 € de frais
- **Marge nette phase 1 : ~950 € HT** — pas de salaire fondateur, mais trésorerie positive et 0 stock dormant.

**Ce que nous mettons en place techniquement :**
- Garder `isPreorder=true` sur les 22 cosmétiques. Afficher un bandeau clair « Précommande » + date d'expédition glissante (ex. « Prochaine expédition : 15 septembre »).
- Activer le 3PL le moins cher qui fait du kitting à l'unité : **Etx Logistique (IDF) ou Huboo** (dès 39 €/mois, 2 €/préparation, pas de volume mini). Nous leur envoyons le lot groupé, ils assemblent les kits.
- Négocier avec AfricanFabs & Afro Wholesale un **tarif dropship outil** (prix gros + 2,50 € de picking). Un email suffit : « Avez-vous un programme dropship/B2B à l'unité pour la France ? »

### Phase 2 — M4-M6 : Validation → micro-stock 3PL qui se finance

**Déclencheur :** Si tu as écoulé **≥ 60 précommandes** sur les mêmes 8 SKU (p01, p04, p08, p09, p12, p35, p36, p41), tu sais quoi acheter sans te tromper.

**Nous basculons :** Tu investis **50 % de la marge de phase 1 (~500 €) + 1 500 € de trésorerie** pour constituer un micro-stock de **2 000 € HT** chez le même 3PL : les 8 SKU qui tournent + les 3 kits. Dès lors, les commandes passent en **24-48h** (tu coupes le délai précommande). Tu gardes la précommande uniquement pour les longs formats (steamer p47, etc.).

**Chiffres M4-M6 :**
- Objectif : 300 commandes (tu sors du palier 100 vers 1 000)
- Stock 2 000 € amorti sur 300 cmd = 6,60 €/cmd
- 3PL : 120 € fixes + 660 € picking + 1 800 € livraison
- **Marge HT : ~32 %** — tu retrouves la marge cible, sans avoir eu 6 000 € à sortir au jour 1.

### Phase 3 — M7-M12 : Scale externalisé

**Nous restons sans stock chez toi**, mais le stock est désormais **chez le 3PL**. Dès 150 commandes/mois (ton seuil 3PL), tu passes en contrat 3PL classique (stock permanent, réassort mensuel). Tu élargis aux kits K06/K08 et aux outils premium (steamer, brosse vapeur) en précommande uniquement.

**À 12 mois :** 0 carton chez toi, 1 micro-entrepôt externalisé de 3-4 m² à 89 €/mois, 6 SKU cœur en stock, le reste en flux tendu. Trésorerie : tu as financé le stock avec les précommandes, pas avec ton loyer parisien.

---

## 6. Modèle financier corrigé « sans stock »

| Poste (sur 100 cmd à 52 € TTC) | Avec stock initial 6 k€ (plan initial) | **Sans stock — Phase 1 (C+B)** | Sans stock — Phase 2 (micro-stock 3PL) |
|---|---|---|---|
| CA HT | 4 333 € | 4 333 € | 4 333 € |
| Achat produits HT | 2 450 € | 2 450 € (groupé) | 2 450 € (micro-stock) |
| Frais 3PL/dropship | 120 € (maison) | 510 € (350+160) | 380 € |
| Livraison | 600 € | 700 € | 600 € |
| **Marge brute HT** | **1 160 € (27 %)** | **670 € (15 %)** * | **900 € (21 %) → 1 470 € (34 %) dès lot amorti |
| Trésorerie M0 | **-6 000 €** | **0 €** | **-2 000 €** (financé par phase 1) |

\* 15 % en phase 1 car mix dropship outils ; remonte à 21 % sans les outils dropshippés.

**En clair :** Tu perds 8-10 points de marge la première fenêtre, tu gagnes 6 000 € de trésorerie et 0 risque. Dès que le micro-stock est amorti (M4), tu retrouves la marge cible sans avoir dormi à côté des cartons.

---

## 7. Ce que nous faisons les 4 prochaines semaines

| Semaine | Action | Livrable | Coût |
|---|---|---|---|
| **S1** | Contacter AfricanFabs & Afro Wholesale : demander grille gros + « faites-vous du dropshipping / kitting à l'unité vers FR ? » + CPNP. En parallèle, demander devis 3PL (Etx, Huboo, Cubyn) : « 1 lot groupé 100 kits K02/K03 à kitter et expédier, puis micro-stock 2m² ». | 3 devis comparés | 0 € |
| **S1** | Basculer les 22 cosmétiques en `isPreorder=true` avec date d'expédition glissante + bandeau précommande. Garder les 12 outils best-sellers en `isPreorder=false` (dropship). | Catalogue conforme « sans stock » | 0 € |
| **S2** | Ouvrir la **1ère fenêtre de précommande 21 jours** : « 100 premières — Kit K02/K03 à -20 % + livraison offerte, expédition semaine du 15/09 ». Pousser via TikTok/DM/salons (ton plan 100 premiers). | 30 précommandes objectif | Budget 600 € (créatrices barter) |
| **S3** | Clore la fenêtre à 40-50 précommandes, commander le lot exact, livrer chez 3PL, kitting, expédition. Mesurer : délai réel, coût 3PL réel, casse/retours. | 1ère expédition traçée | Décaissé après encaissement |
| **S4** | Bilan : si ≥ 30 livrées sans incident et marge > 18 %, **valider le passage en micro-stock 2 000 €** pour M4. Sinon, rester en précommande une fenêtre de plus. | Décision GO/STAY | 0 € |

**Règle non négociable :** Nous n'achetons rien avant d'avoir encaissé. Le stock se finance par les clientes, pas par ton loyer.

---

## 8. Décision à prendre

**Notre recommandation est tranchée :**

> **Nous démarrons en Modèle C (précommande groupée + 3PL kitting) pour les cosmétiques + Modèle B (dropship UE) pour les 12 outils à forte marge. Nous ne montons un micro-stock chez 3PL qu'après 60 précommandes validées.**

C'est le seul montage qui respecte tes trois contraintes : **pas de stock à la maison, pas d'avance de 6 000 €, pas d'illégalité cosmétique.**

**Alternative si tu refuses le délai client de 10-14 jours :** Modèle D direct (micro-stock 2 000 € chez 3PL dès M1). Mais il faut alors sortir 2 000 € cash et accepter le risque invendu.

Dis-moi : **précommande assumée (recommandé) ou micro-stock immédiat ?** Je te prépare ensuite la mise à jour du catalogue (`isPreorder`), les emails fournisseurs et le paramétrage 3PL en 48h.
