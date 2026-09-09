# STRATÉGIE SOURCING SEGMENTÉE PAR PAYS — KURLA 2026-09-10
> Document **décidé** — nous allons exécuter ce plan, pas l’évaluer. Langage : « nous allons commencer par… / notre segment initial sera… »
> Règle d’or : **l’Europe n’est pas un bloc, l’Afrique n’est pas un bloc**. Chaque pays est scoré, chaque modèle d’entrée est nommé, chaque ouverture exige des **preuves chiffrées**.

---
## 0. Pourquoi segmenter le sourcing (pas seulement la vente)

Le sourcing capillaire/peau échoue quand on traite « UE » comme une source unique. Un SPF US sans Personne Responsable UE bloque la mise sur le marché ; un gros NL livre en 48 h ; une marque FR répond en français sous 24 h. Nous allons donc **scorer les pays-fournisseurs**, pas les zones.

Deux familles :
- **Piste A — Revente** (semaines) : acheter-revendre des marques déjà conformes UE.
- **Piste B — Façonnage** (mois) : fabriquer KURLA héros avec un façonnier UE.

---
## 1. Grille de scoring sourcing (10 critères, /40)

| # | Critère | Poids | Mesure |
|---|---------|-------|--------|
| 1 | Conformité UE native (CPNP+RP+étiquetage FR) | /5 | 5=oui d’office, 0=à reconstruire |
| 2 | Délai FR | /5 | 5 ≤3j, 4 ≤5j, 2 ≤10j, 0 >15j/douane |
| 3 | MOQ d’entrée | /4 | 4 ≤12 pcs/réf, 2 ≤48, 0 ≥500 |
| 4 | Langue & réactivité | /4 | 4=FR direct, 2=EN réactif, 0=EN lent |
| 5 | Marge HT atteignable | /4 | 4 ≥45%, 3 ≥34%, 1 <25% |
| 6 | Couverture trous catalogue (hydratation 4C, SPF invisible, kids) | /4 | 4=comble ≥2 trous |
| 7 | Risque douane/TVA | /4 | 4=intra-UE, 0=hors UE sans RP |
| 8 | Visuels + INCI complets fournis | /4 | 4=oui packshot+INCI |
| 9 | Traçabilité matière (karité EUDR si pertinent) | /3 | 3=coopérative traçable |
|10 | Coût échantillon & port | /3 | 3 <20€, 1 >60€ |

Score ≥30 = priorité vague 1. 24–29 = vague 2. <24 = vague 3 ou refus jusqu’à preuve RP.

---
## 2. Matrice décidée — Piste A Revente (sourcing pour vendre tout de suite)

| Rang | Pays-fournisseur | Score /40 | Marques / acteur type | Modèle d’entrée décidé | Vague | Preuves chiffrées exigées avant commande |
|------|------------------|-----------|------------------------|------------------------|-------|-------------------------------------------|
| **1** | **FRANCE** | **34** | Nappy Queen, Activilong, Secrets de Loly, Soarn, Kalia, Carolina B, Musoya (Paris), IN’OYA SUN’OYA | **Revente directe marque — stock léger** (12 pcs/réf, pas de dropship) | **Vague 1 (S1–S2)** | Tarif gros HT + grille dégressive écrite + CPNP + RP UE + INCI + visuels + délai FR ≤5j + franco ≥300€ — **fichier+date** |
| **2** | **PAYS-BAS (Benelux)** | **30** | Afro Wholesale (B&F), AfricanFabs | **Distributeur gros multimarques — stock centralisé** | **Vague 1 (S1)** | Grille gros paliers + MOQ ≤12 + port + délai NL→FR 48–72h + rupture <10% + CPNP/RP par SKU — fichier+date |
| **3** | **ROYAUME-UNI** | **28** | Bouclème, Flora & Curl, Curlsmith, Only Curls | **Distributeur UE agréé OU achat via importateur FR** (pas d’import direct post-Brexit sans RP) | **Vague 2 (S4–S6)** | RP UE attesté + surcoût douane chiffré + délai ≤7j + marge HT ≥34% malgré frais |
| **4** | **ALLEMAGNE** | **26** | Distributeurs capillaires DE (à identifier via marques UK) | **Demi-gros via distributeur DE** | Vague 2 | Même preuves que UK + étiquetage FR déjà fait |
| **5** | **GHANA / AFRIQUE OUEST (matière)** | **26 (sourcing matière, pas revente)** | Coopératives karité | **Partenariat sourcing matière première pour marque propre** (pas de revente directe) | **Vague 1 sourcing / Vente Vague 3** | Diligence EUDR + géoloc parcelles + prix kg rendu UE + MOQ matière 100 kg — fichier+date |
| **6** | **ÉTATS-UNIS** | **18** | Black Girl Sunscreen, Eadem, Shea Moisture (via Dina) | **Import vérifié seulement si RP UE** — sinon **via Dina Afro Shop FR** (intermédiaire UE) | **Vague 3 (ou jamais en direct)** | RP UE + CPNP + SPF ISO24444 + coût douane 12%+TVA 20% chiffré + marge HT ≥34% — sans RP = **refus direct** |

> **Décision : notre vague 1 revente sera FR (7 marques) + NL (2 grossistes).** Le UK/US ne passe qu’après 30 commandes FR à marge positive et RP UE prouvé. Nous n’ouvrirons **aucun pays par ambition**, seulement quand les preuves du tableau sont cochées fichier+date.

### Conditions chiffrées d’ouverture Piste A (gates — toutes doivent être vertes)

| Gate | Seuil Vague 1 (FR/NL) | Seuil Vague 2 (UK) | Mesure |
|------|----------------------|--------------------|--------|
| G1 Tarif gros écrit | oui | oui | PDF devis |
| G2 MOQ ≤12 pcs/réf | oui | oui | devis |
| G3 Délai FR ≤7j | ≤5j FR, ≤3j NL | ≤7j | test échantillon |
| G4 Marge HT ≥34% (cible 45%) | ≥34% | ≥34% après douane | `margin_pct = (TTC/1.20 - achatHT)/ (TTC/1.20)` |
| G5 CPNP+RP+étiquetage FR | oui fichier+date | oui | supplier_documents |
| G6 INCI + visuels | oui | oui | fichier |
| G7 Échantillon validé (texture 4C, SPF 0 trace) | oui | oui | photo + note |
| G8 Franco port chiffré | ≤9€ ou ≥300€ franco | chiffré | devis |

**Si un seul gate rouge → sourcing bloqué sur ce pays.**

---
## 3. Matrice Piste B — Façonnage héros KURLA (délai 8–16 semaines)

| Rang | Pays-façonniers | Score /40 | Acteurs | Modèle décidé | Vague | Engagements chiffrés exigés |
|------|----------------|-----------|---------|---------------|-------|------------------------------|
| **1** | **BULGARIE (UE)** | **32** | Noesis | **Façonnage UE petit MOQ 500 — PIF+CPSR+CPNP fournis** | **Vague 1 RFQ** | ISO22716 oui + PIF/CPSR/CPNP inclus + prix 500/1000/5000 HT rendu FR + délai échantillon ≤3 sem + délai prod ≤8 sem |
| **2** | **FRANCE** | **31** | Lessonia, ABC Texture, Carmel, Hair Liss, CAPIBEAUTY | **Façonnage Made in France — traçabilité karité** | Vague 1 RFQ | ISO22716 + EUDR karité + sans microplastique AGEC + même paliers 500 |
| — | Hors UE | <20 | — | **Refusé** | — | Pas de RP UE maîtrisé |

**Nous allons envoyer les 2 RFQ héros (après-shampoing 250 ml 13–18€ TTC + shampoing clarifiant 250 ml 11–16€) en parallèle à 5 façonniers (Noesis prioritaire) dès S1. Le choix se fera sur le moins cher à 500 pcs qui coche les 7 documents fichier+date.**

### 7 documents obligatoires fichier+date (façonniers — non négociable)

`responsible_person` + `pif` + `cpsr` + `cpnp_notification` + `gmp_iso_22716` + `microplastic_free` + `certificate_of_analysis` (+ `eudr_statement` si karité, `spf_iso_24444`+`uva_iso_24443` si SPF). Une case cochée sans PDF+date = refus.

---
## 4. Séquence décidée (10 semaines — pays par pays)

| Semaine | France (revente directe) | Benelux gros | UK/US | Façonnage |
|---------|--------------------------|--------------|-------|-----------|
| **S1** | **Nous allons envoyer 7 emails FR** (Nappy Queen, Activilong, LSL, Soarn, Kalia, Carolina B, IN’OYA) + Dina Afro Shop — template `email-revente-marque.md` | **2 emails NL** (Afro Wholesale, AfricanFabs) | **Aucun envoi UK/US** | **5 RFQ** (Noesis, Lessonia, Carmel, Hair Liss, CAPIBEAUTY) avec cahiers des charges PDF |
| S2 | Relance J+5, saisir `sourcing_prospects.status` + `wholesale_pricing/moq/lead_time_fr/eu_compliance` | Relance | — | Relance |
| S3–S4 | Échantillons FR → test 4C/SPF + mapping INCI `cosingFunctions` | Échantillons NL | Identifier importateur FR pour Bouclème si besoin | Réception fourchettes 500/1000/5000 |
| S5–S6 | **Commande test ≤12 pcs/réf** chez 2–3 marques FR gagnantes (budget 1 500€) | Commande test 1 grossiste | Décision UK : uniquement si FR marge ≥34% et RP UE prouvé | Choix 1 façonnier, échantillons labo |
| S7–S8 | Mise en ligne pipeline gouvernance (7 validations) + test achat réel | Intégration stock NL | — | Validation formule |
| S9–S10 | **Bêta 100 clientes** avec catalogue FR+NL | Réassort | — | Lancement prod MOQ 500 (héros livrés M4–M5) |

Budget vague 1 : **4–6 k€ HT** focalisé kits (prédit la demande, stock mort minimal) + 300€ échantillons.

---
## 5. Pricing par pays-fournisseur (nous fixons le prix que le marché paie, marge minimale 34% HT soins / 45% outils)

- **FR/NL/BE/LU :** prix catalogue 4,90–69,90€ TTC inchangés.
- **UK import :** +8–12% pour absorber douane/transport si direct — sinon prix FR via Dina.
- **Ghana karité :** coût matière cible ≤4,50€/unité finie pour marge 45–55%.
- **Façonnage :** prix public cible héros ci-dessus ; si devis >6€ HT/unité à 500 pcs → on **repousse** le héros (gate prix).

---
## 6. Garde-fous (nous appliquons, pas nous pourrions)

- **Aucun produit publié avant `supplier_documents.file_url + issued_on` remplis** — le code bloque `catalog_status=published` sinon.
- **Aucun prix/MOQ/délai noté sans PDF** — champ reste `pending`.
- **Double sourcing :** dès qu’un produit a 1 lot, `product_batches` exige un 2e fournisseur qualifié (`hasSecondSource`) — visible dans `BatchAdminPanel`.
- **SPF :** revendication SPF sans `spf_iso_24444` + `uva_iso_24443` UVA ≥1/3 SPF = refus.
- **Rincés :** sans attestation `microplastic_free` AGEC (<0,01%) = refus.

---
## 7. KPI & portes de sortie (chiffrés)

| KPI | 🟢 On poursuit | 🟠 On optimise | 🔴 On arrête le pays |
|-----|----------------|---------------|----------------------|
| Taux réponse à 14j | ≥60% | 30–60% | <30% → relance 1 puis arrêt |
| Délai échantillon | ≤14j | 14–21j | >28j |
| Marge HT réelle | ≥34% | 30–34% | <30% |
| Rupture fournisseur | <10% | 10–20% | >20% |
| Avis ≥4,3/5 (30 avis) | oui | — | non après 90j → déréférencement |

---
## 8. Livrables joints

- `PLAN_SOURCING_HYBRIDE.md` (route hybride décidée)
- `EMAILS_SEGMENTES_PAR_PAYS.md` (6 templates : FR marque, NL grossiste, UK via importateur, US filtré, façonnier UE, coopérative karité)
- `../src/lib/sourcingCountryScore.ts` (scores + gates exécutables)
- `MATRICE_PAYS_SOURCING.csv` (export tableur pour suivi admin)
- RFQ : `vague-1-apres-shampoing-rince.md`, `vague-1-shampoing-clarifiant.md` + 1 nouveau `vague-1-spf-invisible-fluide.md` (à créer phase Peau V2)

*Toutes les données chiffrées internes viennent de `launchCatalog.ts` / `businessStrategy.ts`. Les prix fournisseurs restent `NULL` jusqu’à réception d’un devis réel.*
