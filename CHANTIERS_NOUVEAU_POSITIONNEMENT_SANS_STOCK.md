# CHANTIERS — Nouveau positionnement Année 1 SANS STOCK

**Positionnement verrouillé :** 0 carton à Paris · Précommande assumée **« Expédié sous 3–5 jours — petite production hebdomadaire »** · 2 batchs/semaine (lun+jeu 18h → moyenne 2,8j / max 6j) · Tampon 75 unités chez 3PL IDF (5 héros ×15 = 532,50€ TTC / 0,5m²) · Catalogue `launchCatalog.ts` **INCHANGÉ**.
**Fichiers source :** `src/lib/fulfillment.ts` · `FULFILLMENT_SANS_STOCK_3_5J.md` · `MODELE_ECONOMIQUE_SANS_STOCK_AN1.md` · `MAILS_CONTACT_FOURNISSEURS_3PL.md` · `src/components/FulfillmentContactPanel.tsx` (dans Admin > Fournisseurs & sourcing).

---

## Déjà fait (à ne pas refaire)

| Fait | Fichier |
| :--- | :--- |
| Modèle fulfillment codifié (DISPATCH_PROMISE, BATCH_SCHEDULE, TAMPON_3PL 75u, 3PL short-list, CATALOG_GUARD) | `src/lib/fulfillment.ts` |
| 3 mails prêts à envoyer (AfricanFabs, Afro Wholesale, 3PL IDF) | `MAILS_CONTACT_FOURNISSEURS_3PL.md` |
| Panneau admin prêt à envoyer (Copier + mailto + Marquer envoyé) | `FulfillmentContactPanel.tsx` dans `AdminDashboardPage.tsx` onglet Fournisseurs |

---

## 14 chantiers à faire — dans l'ordre d'exécution réel

### BLOC A — SOURCING & LOGISTIQUE (bloquant — sans ça, on ne vend pas)

**A1 — Envoyer les 3 mails et obtenir 1 OUI**
- Action: Admin > Fournisseurs → renseigner email/tél → Ouvrir dans ton mail → Envoyer 3 mails → Marquer envoyé
- Attendu: réponse avec (a) prix HT grossiste, (b) dropship outils oui/non + coût pick, (c) délai NL→IDF, (d) CPNP+RP oui/non, (e) kitting oui/non
- Destinataires: `info@africanfabs.com` + `support@afrowholesale.eu` + 3PL (Etx 95 / Huboo / Cubyn)
- P0 — J0 — 30 min

**A2 — Choisir et contractualiser le 3PL IDF**
- Action: comparer devis sur 75u tampon + 2 réceptions/semaine + kitting K02/K03 + pick&pack ~20 cmd/sem
- Cibles chiffrées: stockage 0,5–2m² ~20€/mois, réception ~30€, prépa 2–2,50€/cmd, transport Colissimo ~6–7€
- Short-list: Etx Logistique (39€/mois+2€/cmd) / Huboo (49€+2,20€) / Cubyn (59€+2,50€)
- Livrable: contrat + adresse de livraison 3PL + accès stock
- P0 — dès réponse A1 — dépend de A1

**A3 — Commander le tampon 75 unités (0 carton chez toi)**
- Action: commander 15× p01 (shampooing 250ml 7,10€) + 15× p04 (après-shampoing 400ml 6,50€) + 15× p08 (leave-in 4C 250ml 8,70€) + 15× p09 (karité brut 200g 4,50€) + 15× p12 (twist cream 227g 8,70€) = **532,50€ TTC / ~485€ HT**
- Livraison: DIRECT chez 3PL, jamais à Paris
- Effet: 60% des commandes expédiées en 24–48h via tampon → moyenne flux tombe de 4,2j à **2,6j**
- P0 — dès A2 signé — dépend de A2

**A4 — Activer les 12 outils en dropship immédiat**
- Liste: afro pick, Detangler/Denman, edge brush, clips croco, bonnet satin, brume, sponge twist, scalp massager silicone, peigne queue, diffuseur, flexi rods, serviette microfibre
- Sans tampon: expédition outil depuis grossiste NL → 3PL → client (ou direct si grossiste expédie)
- Marge outils: 56–66% HT (vs cosmétiques 30–34% HT) — compense la faible marge cosmétique
- P1 — parallèle à A3

### BLOC B — PRODUIT, CONFORMITÉ & CATALOGUE (garde-fou)

**B1 — Vérifier CPNP + Responsible Person UE avant toute vente cosmétique**
- Action: exiger pour les 5 héros les PDF CPNP + attestation RP. Sans doc → on ne vend pas le SKU (on bascule sur autre SKU du grossiste qui a la doc)
- Contrainte: Règlement 1223/2009 — pas de vente cosmétique sans RP UE identifié sur l'étiquette
- Livrable: dossier dans `SupplierAdminPanel` avec doc + date de vérif
- P0 — bloque la mise en vente — dépend de A1

**B2 — Figer le kitting K02/K03 chez 3PL**
- K02 et K03 = 5 produits héros assemblés à la demande. Fiche kitting: contenu exact (SKU + quantité), carton, coût kitting, temps
- Alternative: si grossiste fait le kitting → on compare coût vs 3PL
- P1 — dépend de A2 + A3

**B3 — Garde-fou catalogue intact**
- `launchCatalog.ts` ne bouge pas (54 SKU + 10 kits). Vérif avant chaque push: `git diff -- src/lib/launchCatalog.ts` vide
- Flux 3PL ne modifie jamais le catalogue (seulement fulfillment.ts)
- P0 — continu

### BLOC C — TECH & OPS (ce que le client voit)

**C1 — Basculer la boutique en mode PRÉCOMMANDE 3–5j**
- À faire: remplacer partout « En stock / Ajouter au panier » par « Précommande — Expédié sous 3–5 jours » + badge « Petite production hebdomadaire (lun & jeu) »
- Pages: fiche produit, panier, checkout, email de confirmation
- Source texte: `DISPATCH_PROMISE.short` et `BATCH_SCHEDULE` dans `fulfillment.ts`
- P0 — 1 dev — dépend de rien (peut partir en parallèle)

**C2 — C1 suite checkout & emails transactionnels**
- Checkout: mention « commande groupée, expédition au prochain batch (mardi ou vendredi) »
- Email auto après commande: « Merci — ta commande part au batch de [date] — suivi à réception 3PL »
- si délai >5j → email auto + option remboursement (précommande = droit de rétractation renforcé)
- P0

**C3 — Stripe rester en TEST jusqu'à A1+B1 validés**
- Ne passer en LIVE qu'après 1 grossiste OK + CPNP OK + 3PL OK
- En TEST: on encaisse en précommande test, on ne débite pas de vrai client
- P0

**C4 — Admin — suivi ops flux tendu**
- Déjà fait: panneau d'envoi. Reste à ajouter:
  - Compteur tampon 75 (stock 3PL par SKU, alerte <5)
  - Prochain batch (date/heure) + liste commandes à grouper
  - Délai réel moyen (calcul auto depuis BATCH_SCHEDULE)
- P1 — après A2/A3

### BLOC D — FINANCE, RISQUE & SÉCURITÉ

**D1 — Modèle financier corrigé sans stock (base 100 cmd à 52€ TTC)**
- Déjà chiffré dans `MODELE_ECONOMIQUE_SANS_STOCK_AN1.md`: comparer 5 modèles A→E
- Hybride retenu: **M0-M3 précommande groupée (C) + dropship outils (B) → M4-M6 micro-stock 3PL (D)**
- Marge réelle cosm 30–34% HT + outils 56–66% → marge mixte ~44% si 40% outils dans panier
- Cash M0: **~532€ tampon + 20€/mois** vs 3 000–5 000€ si stock Paris — risque invendu divisé par 6
- P0 — à valider avec toi avant A3

**D2 — SAV / retours / litiges précommande**
- Procédure: retard >5j → info + nouveau délai ou remboursement immédiat. Retour: via 3PL, pas chez toi.
- P1

**D3 — Sécurité — révoquer les secrets exposés**
- PAT `ghp_*** (révoquer)` (utilisé pour pushes 9eef55f→368cce4) + ancien `ghp_*** (révoqué)` + `sb_secret_…` + `vcp_…`
- Action: GitHub → Settings → Developer settings → Personal access tokens → Revoke + Vercel/Supabase régénérer
- P0 — 2 min — à faire aujourd'hui

---

## Ordre recommandé (ton planning si tu veux démarrer demain)

```
J0 (aujourd'hui) : A1 → D3 → C1 (en parallèle)
J+1 à J+3        : relance si pas de réponse A1
Dès 1 OUI (J+2→J+5) : A2 (signature 3PL) → A3 (commande tampon 75 → livre chez 3PL)
Dès CPNP OK (B1)   : C2 + C3 LIVE → on ouvre 1 vrai précommande test E2E
S+2                : A4 + B2 + C4 → flux complet
```

**Test E2E final (chantier D4 implicite):** 1 commande précommande réelle → batch lun/jeu → réception 3PL → kitting → expédition client en 3–5j → suivi délai réel.

---

## Ce qu'on ne fait PAS en Année 1

- Pas de stock à Paris (0m²), pas de modification `launchCatalog.ts`, pas d'import Chine MOQ 1000, pas d'ouverture Afrique/Europe avant preuve France.

Veux-tu que je te le mette aussi **en tableau de pilotage dans l'admin** (onglet Fournisseurs, sous le panneau d'envoi) avec cases à cocher + dates + dépendances — ou on attaque direct **A1 (envoi des 3 mails)** ?
