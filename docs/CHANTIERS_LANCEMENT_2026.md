# KURLA — CHANTIERS POST-AUDIT (remplir · valider · lancer · apprendre)

> Base : `KURLA_ANALYSE_STRATEGIQUE_2026-08-30.md`. État au 30/08/2026 : code
> ~85 % complet, **réservoir de données vide, aucun paiement réel, 0 utilisateur**.
> Règle directrice des 90 jours : **aucune nouvelle fonctionnalité hors liste**.
> Toute idée nouvelle va dans un carnet, jamais dans le code.
>
> Légende charge : XS < 1 j · S = quelques jours · M = 2-4 sem · L = 4-8 sem.

---

## CHANTIER 0 — MISE EN PRODUCTION RÉELLE  (bloquant · S1-S3)
**Objectif : qu'un inconnu paie un vrai produit et reçoive un vrai email.**

- [ ] Appliquer **toutes** les migrations sur la vraie base Supabase.
- [ ] Tests RLS réels avec 2 comptes JWT + 1 admin (`npm run test:realdb`).
- [ ] **Stripe live** : webhook signé, paiement réel de 1 €, remboursement réel.
- [ ] **Email réel** (Resend/SendGrid) + domaine `kurla-beauty.com` authentifié SPF/DKIM/DMARC.
- [ ] Zéro produit « (Démo) » en production ; fallback catalogue **fail-closed**.
- [ ] Observabilité : Sentry + métriques d'entonnoir + alertes (webhook orphelin, email non envoyé, erreur IA).
- [ ] Validation juridique : CGV, confidentialité, AI Act art. 50(2) (marquage contenus IA), AIPD photo, consentements.
- [ ] Réglages Supabase (fait ✅) : « Confirm email » désactivé, Site/Redirect URLs.

**Fini quand :** un paiement réel aboutit, l'email arrive, et une erreur provoque une alerte.

---

## CHANTIER 1 — REMPLIR LE GRAPHE DE CONNAISSANCES  (bloquant · S1-S4)
**Objectif : 3 000+ ingrédients et 100 % du catalogue relié.**

- [ ] Acheter **INCIDB Full** (~99 $, ODbL) : 44 816 INCI, fonctions CosIng, allergènes, CAS.
- [ ] Importer **Open Beauty Facts** (ODbL, gratuit) pour produits + codes-barres + INCI.
- [ ] Script de réconciliation INCI → entités `ingredients` / `product_ingredients`.
- [ ] Enrichir à la main les **~150 actifs clés** (niveau de preuve A-D, sources HAS/ANSM/CosIng).
- [ ] Vérifier `ingredient_jurisdiction_restrictions` (UE/UK/US) et peupler ~50 règles d'`ingredient_incompatibilities`.
- [ ] Supprimer les artefacts (`data/*.json`, `migrations/001_init.json`).

**Fini quand :** une fiche produit affiche son vrai INCI relié au graphe ; une recherche par ingrédient répond.

---

## CHANTIER 2 — CATALOGUE RÉEL & SOURCING  (bloquant · S1-S6)
**Objectif : ≥ 150 vrais produits achetables.**

- [ ] Finaliser le sourcing RFQ en cours (shampoing clarifiant, après-shampoing, façonnier soins).
- [ ] Fiches complètes : photos propriétaires, INCI validés contre DIP, variantes/SKU/stock réel, prix TTC.
- [ ] Passer les produits par le pipeline de gouvernance (7 statuts de validation) avant publication.
- [ ] Frais de livraison, délais par pays, politique de retour cosmétiques affichés avant paiement.

**Fini quand :** 150 produits réels achetables, zéro « (Démo) », stock et délais réels.

---

## CHANTIER 3 — ALLUMER LA BOUCLE DE DONNÉES (le MOAT)  (S3-S7)
**Objectif : que le moteur apprenne de vrais utilisateurs.**

- [ ] **Scan code-barres du Shelf** (BarcodeDetector + API Open Beauty Facts) + onboarding « photographie ton étagère ».
- [ ] Déclencheurs de la boucle : notification **feedback J+14** (« ça fait 2 semaines, résultat ? »), rappels **wash-day** et **âge de coiffure protectrice**.
- [ ] Réassort prédictif branché sur les notifications (les tables existent déjà).
- [ ] **Eval set de 50 cas experts** (profil × produits attendus) pour mesurer la qualité des recommandations avant exposition.
- [ ] Vérifier que `outcome_observations` modifie réellement une recommandation.

**Fini quand :** scanner un vrai code-barres remplit un Shelf ; un feedback change une reco affichée.

---

## CHANTIER 4 — DÉGRAISSER & RECENTRER L'INTERFACE  (S1-S2)
**Objectif : un parcours critique irréprochable, 5 entrées de navigation.**

- [ ] **Geler/masquer** les modules en avance : espace marques (contrats/factures/tests), créateurs payants, KURLA+ payant, Texture Gap public → en liste d'attente.
- [ ] Navigation en **5 entrées** : Comprendre ma routine · Acheter · Trouver un expert · Apprendre · Mon espace.
- [ ] Transformer tout écran « données insuffisantes » en invitation/contribution ou le retirer du menu.
- [ ] Lazy-loading (admin, pro, 3D) ; 3D seulement sur la home desktop ; perf mobile et bundle.
- [ ] Retirer le wording technique résiduel côté client ; WCAG AA sur les 4 parcours critiques.

**Fini quand :** diagnostic → Shelf → routine → boutique → checkout est fluide de bout en bout sur mobile.

---

## CHANTIER 5 — CONFIANCE VISIBLE & CONTENU SEO  (S4-S10)
**Objectif : montrer le travail, être trouvé.**

- [ ] Afficher le **Trust Score produit** public (les 7 validations déjà en base) sur la fiche.
- [ ] Publier **50 fiches ingrédient** depuis le graphe (fonction, preuve, sources) — socle SEO.
- [ ] Pages problème × texture (ex. « cheveux 4C secs ») générées depuis la taxonomie.
- [ ] Transparence IA comme identité : « pourquoi cette reco », niveau de preuve, « champ inconnu non pris en compte ».

**Fini quand :** une fiche ingrédient et une fiche produit sont indexées et partageables (Open Graph).

---

## CHANTIER 6 — LANCEMENT FRANCE & TRACTION  (S5-S10)
**Objectif : les premiers vrais utilisateurs et la première vraie donnée.**

- [ ] Lancement fermé : waitlist → **300 testeurs**, puis ouverture.
- [ ] **10 entretiens utilisateurs / semaine** pendant 2 mois.
- [ ] Partenariat **10 locticiennes** (Salon OS gratuit, co-signature de routines).
- [ ] Tableau de bord hebdo : rétention D30, conversion diagnostic→achat, taux de retour, NPS.
- [ ] Objectifs chiffrés : **1 000 MAU, 300 Shelf remplis, 1 000 observations de résultat, D30 ≥ 25 %.**

**Fini quand :** les premières notes par archétype s'affichent (k ≥ 30) et les premiers avis vérifiés existent.

---

## APRÈS (Niveaux 3-5, NE PAS commencer avant)
Diagnostic photo encadré (AIPD, aide beauté) · recherche visuelle produit · intelligence saisonnière/climat · cartes-résultats partageables · « Routine Garantie » · réactivation KURLA+ si demande · marketplace pros généralisée · espace marques/Texture Gap payants · **Afrique francophone & Outre-mer** (WhatsApp, Mobile Money) puis UK/US · API monétisée.

## GELÉ VOLONTAIREMENT (ne pas développer)
Virtual try-on maquillage · réseau social / fil d'actualité · marque propre · diagnostic médical par photo · **toute nouvelle fonctionnalité pendant 90 jours**.

---

### Séquence en un coup d'œil
```
S1-S2 :  Chantier 0 (go-live)  +  Chantier 4 (dégraissage)  +  juridique
S1-S4 :  Chantier 1 (graphe)   ║  Chantier 2 (catalogue réel)   (parallèles)
S3-S7 :  Chantier 3 (boucle de données / scan Shelf)
S4-S10:  Chantier 5 (confiance + SEO)
S5-S10:  Chantier 6 (lancement France · 300 testeurs · 10 pros)
```
