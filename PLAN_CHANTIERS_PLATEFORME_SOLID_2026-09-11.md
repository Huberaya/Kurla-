# PLAN DE CHANTIERS — KURLA : ARRIVER À UNE PLATEFORME SOLIDE QUI TIENT SES PROMESSES

> **Date :** 11 septembre 2026 · **Owner :** Lead Architect + ops
> **Base :** état réel du 11/09 (121 bancs verts, `docs/ARCHITECTURE/` source de vérité)
> **Règle du plan :** le code est le chemin le plus court — le goulot est la donnée,
> les preuves et les marchés. Chaque chantier a des **critères d'acceptation
> vérifiables** (banc, mesure HTTP, ou fait observable). Aucun chantier ne finit
> sur un « à peu près ».
> **Notation :** G = Go-live · P = Peau substance · L = Boucle · I = International · S = Scale

---

## 0. Définition de fait : « une plateforme solide qui tient ses promesses »

KURLA fait **six promesses** à la cliente. La plateforme est solide quand les six
parcours de vérification ci-dessous sont **verts en production** — pas en test.
C'est la définition de fait du « terminé » pour ce plan :

| # | Promesse | Parcours de vérification (à exécuter en prod, documenté) |
|---|----------|----------------------------------------------------------|
| T1 | « Comprend mes cheveux » | Diagnostic hair 8 étapes → résultat traceable → kit → panier → **achat réel** → suivi colis → réassort suggéré |
| T2 | « Comprend ma peau » | Parcours **Fatou** (28 ans, mixte sensible, phototype V, HPI, ≤28€, sans parfum) : diagnostic peau → routine → kit → achat → journal J+7 |
| T3 | « Ne m'invente rien » | Audit d'écran : tout champ inconnu affiché « inconnu » ; 0 prix fallback ; 0 date inventée ; `generatedWithAI` visible partout où l'IA écrit |
| T4 | « Je paie honnêtement » | Checkout réel : TVA du pays appliquée, coupon validé, stock déduit, remboursement réel testé (aller/retour) |
| T5 | « Mes données sont à moi » | Export RGPD complet (profil + historique + photos + journal + Shelf + outcomes) + suppression en un geste + photo rétractable |
| T6 | « Je peux me fier à l'équipe » | Alerte < 1 h sur 5xx/429/échec webhook ; runbook incident ; backup A/B testé ; `test:realdb` vert avant chaque déploiement |

**Le plan existe pour rendre les six parcours verts.** Tout le reste est de l'hygiène.

---

## 1. Phase G — GO-LIVE : la plateforme peut être achetée pour de vrai

> **Objectif :** M1 = « on peut acheter, payer, recevoir, se faire rembourser,
> et nous savoir quand ça casse ». **Durée : 3 semaines** (le code est prêt ;
> c'est du branchement réel + preuve).

| # | Chantier | Détail | Critères d'acceptation (DONE) | J dev | J ops |
|---|----------|--------|--------------------------------|:-----:|:-----:|
| **G1** | Base réelle intégrée | Exécuter `npm run test:realdb` (preflight + intégrations + contrats de schéma) sur le projet prod ; migration 83/83 appliquées ; RLS A/B (2 comptes, tentative d'accès croisé) | 6 bancs réel-DB verts contre la base prod ; 0 migration en retard ; capture d'écran du rapport A/B en `docs/` | 2 | 1 |
| **G2** | Stripe LIVE | Clés `sk_live`/`pk_live` ; endpoint webhook déclaré + `STRIPE_WEBHOOK_ENABLED=true` ; test aller/retour : paiement réel (1€) → `paid` → stock déduit → remboursement réel → stock restauré une fois | T4 vert : la commande de test a vécu le cycle complet en base (preuves : `stripe_events`, `order_status_history`, stock avant/après) ; le webhook tardif est idempotent (2ᵉ delivery ignorée) | 2 | 2 |
| **G3** | Emails LIVE | Provider (Resend ou SendGrid) + domaine `kurla-beauty.com` : SPF + DKIM + DMARC ; provider réel dans l'env prod (le console est **refusé** en production — verrouillé par banc) | Les 4 emails transactionnels (confirmation, expédition, retour accepté, rappel routine) reçoivent dans une boîte test ; score deliverability > 95 ; aucun email en console | 1 | 1 |
| **G4** | Durcissement prod | Revue des rapports CSP (2 semaines de report-only minimum) → bascule **mode imposé** ; alertes (429/5xx/échec webhook/stock bas) vers canal d'équipe ; runbook incident (qui fait quoi, ordre, rollback) ; backup Supabase testé (restauration sur base vierge) | CSP imposée sans violation bloquante (log des exceptions assumées) ; alerte reçue sur un 5xx provoqué en staging ; runbook < 1 page testé ; backup restauré (preuve horodatée) | 2 | 2 |
| **G5** | Lancement France (cohorte) | La cohorte `france-2026` existe déjà (instrumentation C6) : waitlist → invitation → 300 testeurs → entretiens → NPS. **Ne rien seed.** | Le cockpit `/api/admin/launch/traction` affiche des lignes réelles (≥ 30 testeurs activés à M1+4 sem) ; `available: false` disparu | 0 | 14 (temporel) |

**Gate M1 (fin semaine 3) :** T1, T4, T5, T6 verts en production. La boutique
vend réellement. **Si G2 ou G3 échoue, M1 glisse — on ne lance pas à moitié.**

---

## 2. Phase P — LA SUBSTANCE PEAU : le pôle n'est plus une coquille

> **Objectif :** M2 = la promesse T2 est vraie : 12/15 besoins peau renvoie des
> produits, le parcours Fatou est vert de bout en bout en prod.
> **C'est le chantier le plus long du plan (8 semaines) et il est borné par
> l'opérationnel** — le code est prêt (contrat C1, filtres, moteur, kits, routine).

| # | Chantier | Détail | Critères d'acceptation (DONE) | J dev | J ops | Statut |
|---|----------|--------|--------------------------------|:-----:|:-----:|:-------:|
| **P1** | Sourcing vague 1 (FR + NL) | Les 11 emails S1 sont prêts (`S1_EMAILS`), les scores pays sont en base (FR 34 / NL 30 / BG 32). Exécuter : 3 marques FR (IN'OYA, Activilong, NappyQueen lab) + Afro Wholesale NL ; grille des 7 validations (CPNP/DP fichier+date, INCI complet, allégation « uniformise » jamais « éclaircit », SPF ISO 24444, sans parfum vérifié, DDM > 12 mois, MOQ ≤ 24) ; **10 SPF testés whitecast sur phototypes IV–VI** (photo + note faible/modéré/élevé) | 40 refs avec les 7 validations complètes ; galerie whitecast 10 photos validée ; 0 ref sans fichier+date | 2 | 18 | À venir |
| **P2** | Ingestion 40 refs + QA catalogue | Pipeline existant (`product_import` + 7 validations + `product_ingredients` + `product_needs_correction` + `inventory` stock 0/précommande). INCI → graphe ingrédients (les 36 liaisons actuelles passent à 40+) | 40 SKU `published` ; **chaque besoin peau renvoie ≥ 3 résultats** (12/15 besoins) ; `sitemap.xml` produits peau > 0 ; banc C1 vert en base | 3 | 5 | À venir |
| **P3** | Filtres peau complets (UI) | Le code est prêt : `skinTaxonomy` (15 needs, 8 actifs, phototype I–VI, texture, fini) + `scoreSkinProduct` (scoring explicable). Brancher les 4 filtres manquants dans `BoutiquePage` (actif, phototype, texture, fini) + suggestions `SearchModal` peau | « niacinamide sans parfum fini mat ≤ 28€ » renvoie des résultats avec raisons affichées ; le filtre phototype V–VI déclassee un SPF minéral whitecast élevé (banc) | 3 | 1 | **LIVRÉ** — banc 12/12 vert (raisons affichées, whitecast V–VI, budget ; 2 bugs moteur corrigés) |
| **P4** | Kits KPEAU commercialisables | Les kits KPEAU-01..03 existent (SKU, pricing bundle, composants par ID). Quand les composants sont acceptés par P1 : passage `formulation_target → published` (le verrou le refuse tant que les preuves manquent — le garder) | Kit Essentielle 49,70€ achetable ; le devis kits se réconcilie côté serveur (banc C3.3 en base) ; AOV peau mesuré ≥ 40€ sur la cohorte | 1 | 3 | À venir |
| **P5** | Professionnels peau spécialisés | 2–3 pros peau vérifiés (dermato/esthéticienne) ; critères de confiance **peau distincts** (diplôme + RP + photo SPF invisible sur phototype foncé) — un coiffeur 70 ≠ dermato 70 ; filtre `skin_specialty` dans l'annuaire | `GET /api/professionals/verified?cat=peau` renvoie ≥ 2 pros avec score peau justifié ; l'annuaire distingue coiffure/peau | 2 | 10 | À venir |

**Gate M2 (fin semaine 10) :** T2 vert en prod (parcours Fatou complet) ;
`/peau` n'a plus de dead-end sur les 12 besoins principaux. **Le goulot est P1 :
chaque semaine sans fournisseur qui répond, M2 glisse d'une semaine. Le code
n'attend que les preuves.**

---

## 3. Phase L — LA BOUCLE : la plateforme qui retient (et qui le prouve)

> **Objectif :** M3 = la boucle diagnostic → achat → suivi → **nouvelle
> recommandation** tourne et se mesure. C'est ici que KURLA devient autre chose
> qu'une boutique : une intelligence qui s'améliore avec chaque cliente.
> **Durée : 4 semaines, démarrable dès M1** (ne dépend pas de P).

| # | Chantier | Détail | Critères d'acceptation (DONE) | Statut |
|---|----------|--------|--------------------------------|:-------:|
| **L1** | Cross-sell « complète votre routine » | Le moteur a déjà les données (`needs`/`routineStep`/complémentarité). Afficher sur fiche + panier : 3 produits qui **complètent la routine déclarée** (pas un carrousel générique), avec la raison | Sur un panier 1 produit, la section affiche ≥ 1 complément avec justification lisible ; 0 produit du panier déjà possédé (Shelf) recommandé | **LIVRÉ** — banc 18/18 vert (route + fiche + panier, Shelf exclus, raisons) |
| **L2** | Réassort / réachat | Le Shelf détecte les produits ouverts. Ajouter : « il est temps de réappro » → ajout panier en 1 geste + historique de réassort dans le profil | Parcours : produit ouvert 28 j → notification → ajout panier ; le réassort apparaît dans l'historique | **LIVRÉ** — banc 12/12 vert (cycle 28 j, notifications dédupliquées, historique) |
| **L3** | Dashboard de conversion | Les événements analytics existent (view_item_list, addToCart, beginCheckout) + cockpit traction C6. Assembler : **diagnostic → routine → panier → paiement** avec taux d'abandon par étape, séparable hair/peau | L'admin voit 4 étapes × 2 pôles avec % ; une chute de -20% sur une étape est visible sans requêter la base | **LIVRÉ** — route GET /api/admin/conversion-funnel (4 étapes × 3 vues, 30 j glissants, flag ≤ −20 %), panneau admin onglet commercial, banc 15/15 vert ; sources réelles (beauty_profiles, routine_plans, carts/cart_items, orders/order_items) — les événements GA4/Plausible ne sont pas persistés et ne servent pas de source |
| **L4** | Re-recommandation après feedback | La boucle existe (outcomes + abandons → poids réordonnés). Ajouter le **déclencheur** : à J+30 d'un diagnostic, une nouvelle recommandation si le profil a évolué (journal, outcomes, routine suivie) — et l'afficher comme évolution, pas comme spam | Une cliente qui a suivi sa routine + 1 outcome reçoit à J+30 une recommandation marquée « évolution » avec la raison ; 0 push si le profil n'a pas changé | À venir |

**Gate M3 (fin semaine 14) :** le dashboard L3 en place ; D30 de la cohorte
mesurable (objectif C6 : ≥ 25% à M1+8 sem) ; L1/L2 testés sur 20 clientelles
réelles de la cohorte.

---

## 4. Phase I — INTERNATIONAL : l'Europe, puis la diaspora

> **Objectif :** M4 = BE/CH ouverts + EN complet ; M5 = CI/SN/DOM préparés.
> **Règle d'or (tenue) :** on n'ouvre pas l'Europe en bloc — un marché s'ouvre
> quand ses 5 conditions (doc 08 §4) sont remplies, et ouvrir un marché
> **ne contient plus de code**.

| # | Chantier | Détail | Critères d'acceptation (DONE) |
|---|----------|--------|--------------------------------|
| **I1** | EN complet (corps des pages) | Le framework est typé (le compilateur bloque les trous). Traduire par famille : boutique/fiche → diagnostic → compte → contenu. IA en production assistée → validation humaine → dictionnaire | `npm run test:chantier-7-i18n` vert sur les nouvelles locales ; 0 clé FR-only dans les 20 pages du parcours T1/T2 ; spot-check 5 pages EN par une native speaker |
| **I2** | Ouverture BE + CH | La TVA est déjà configurée (taux, reverse charge). Ouvrir = données : `countryAvailability` des refs, page pays, livraison, paiement (IBAN/BANCOMAT selon marché) | Les 5 conditions doc 08 §4 remplies par marché ; un achat BE avec TVA 21% et un achat CH avec TVA 8,1% en test réel ; sitemap page-pays |
| **I3** | Logistique multi-marchés | Agrégateur (Sendcloud ou Boxtal) : étiquettes auto, suivi réel, délais par marché, seuils de gratuité configurables | Un colis BE/CH étiqueté + suivi réel sans saisie manuelle admin ; délais affichés = délais contractualisés |
| **I4** | Afrique francophone (CI/SN/DOM) | **Démarrer seulement après M4** : paiement local (Mobile Money via Stripe ou agrégateur), douane/délais, catalogue local (les refs des marchés CI/SN/DOM existent déjà dans la taxonomie) | 1 achat test avec paiement local ; délai affiché réaliste ; `countryAvailability` alimenté pour les 3 marchés |
| **I5** | SEO pays + langues | `hreflangAlternates` est générique ; générer les pages pays (FR/BE/CH/EN…) + sitemap international + données structurées par marché | Les pages-pays indexées (Search Console) ; `hreflang` valide (validator) ; 1 requête « routine peau sensible [pays] » rankée sur une page KURLA |

**Gate M4 (fin semaine 20) :** 2 marchés EU ouverts avec achats réels ; EN
complet sur les parcours T1/T2. **I4 est déclenché par le signal, pas par le
calendrier** : ≥ 5% du trafic Afrique + 1 fournisseur local identifié.

---

## 5. Phase S — SCALE : tenir la charge sans se casser

> **Objectif :** la plateforme passe 10 k → 100 k → 1 M sans réarchitecture
> panique. **Déclenchement par signal, pas par date** — chaque chantier porte
> son signal de départ. Les designs sont validés (doc 10) : c'est de l'exécution.

| # | Chantier | Signal de démarrage | Critères d'acceptation (DONE) |
|---|----------|--------------------|--------------------------------|
| **S1** | Cache catalogue + CDN | `/api/products` > 30% des requêtes API ou 1 000+ produits | Cache process TTL 30 s + invalidation aux ~12 points d'écriture + `Cache-Control: public, max-age=15, stale-while-revalidate=120` ; le bench : 2 appels consécutifs, le 2ᵉ sans requête PG (log) |
| **S2** | Requête produit ciblée en base | 1 000+ produits | `WHERE slug = $1` + projection partagée (pas de duplication des 120 lignes) ; `test:realdb` vert ; p95 fiche produit < 200 ms |
| **S3** | Pagination/trie serveur boutique | 1 000+ produits | `?page=&sort=` serveur ; page 1 = même ordre que le tri client actuel (banc de régression) |
| **S4** | CSP imposée + edge limiter | Multi-instances ou violation CSP récurrente | CSP non report-only sans regression UI ; rate limit partagé au edge (Vercel/WAF) + test de burst |
| **S5** | Long tail couleurs (95 hex) | Toujours (hygiène) | 0 hex en dur dans `src/` (hors server) ; le banc visuel scanne l'hex comme il scanne les URLs d'images |
| **S6** | Hygiène finale | Toujours | `catalogClaims` branché admin (scan d'allégations) ; `catalogueMatch` + son banc retirés (remplacé par les références par ID) ; 11 panneaux ops C2x archivés (après clôture vague 1) ; 6 TODOs tracés ou clos |
| **S7** | Partitionnage tables à volume | `stripe_events` > 1 M lignes ou 1 M commandes | Partition par mois + `test:realdb` vert + requêtes de réconciliation sans régression |
| **S8** | RGPD juridique | Avant M4 (données multi-pays) | Registre des traitements (le code est documenté dans doc 09 — l'assembler) ; DPA signés (Supabase, Stripe, Gemini, email) ; rétentions par table publiées |

**Gate S (continu) :** à chaque palier mesuré (100 k MAU), le doc 10 §2 est
ré-exécuté : ce qui casse au palier suivant est planifié **avant** d'y arriver.

---

## 6. Séquence & jalons

```
S1   S2   S3   S4   S5   S6   S7   S8   S9   S10  S11  S12  S13  S14  S15  S16-S20
G:   G1-G4 (code réel) ────────── G5 (cohorte, temporel) ────────────────
P:   P1 sourcing (emails J+2) ─────────────────────── P2 ingest ─ P3/P4/P5
L:                L1-L4 (dès M1) ────────────────────────────────────────
I:   I1 EN (parallèle) ───────────────────────────────────── I2/I3 I5
I:                                                  I4 (signal, pas date)
S:   S5/S6 (hygiène, quand un dev est libre) ─── S1/S2/S3 (signal charge)
                                                             S8 (avant M4)

M1 (S3)   : GO-LIVE — T1/T4/T5/T6 verts en prod. On vend pour de vrai.
M2 (S10)  : LA PEAU EST VIVANTE — 40 refs, 12/15 besoins, T2 vert, AOV peau ≥ 40€.
M3 (S14)  : LA BOUCLE TOURNE ET SE MESURE — dashboard conversion, D30 ≥ 25%, réassort.
M4 (S20)  : L'EUROPE S'OUVRE — BE/CH + EN complet + I5 ; S8 RGPD signé.
M5 (S6+)  : AFRIQUE PRÊTE — CI/SN/DOM sur signal.
```

**Règle de capacité :** 1 dev full-time + 1 ops. Les chantiers dev se
chaînent G → L → I1 → S ; les chantiers ops (P1, G5, P5) tournent en parallèle
— **c'est eux qui font glisser les jalons, pas le code.**

---

## 7. Anti-scope (ce que ce plan refuse de faire)

1. **Pas de microservices, pas de data lake, pas de ML pipeline** — le monolithe
   modulaire tient jusqu'au signal S4/S7 (doc 10). Extraire avant = dette.
2. **Pas d'analyse photo IA** (P3 de la roadmap) — le moat est la donnée
   consentie et la prudence, pas la caméra. Revisiter après M3.
3. **Pas d'ouverture de marché sans refs prouvées** — un marché « ouvert » à
   zéro produit est un mensonge de catalogue (règle des vagues, tenue).
4. **Pas de seed de données** pour faire progresser un cockpit — zéro ligne
   inventée (règle C6, tenue par les bancs).
5. **Pas de refactor pour refactorer** — le découpage du store est déjà l'architecture
   cible ; le réorganiser serait de la dette.

## 8. Risques du plan (et qui les porte)

| Risque | Probabilité | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Fournisseurs peau qui ne répondent pas / échantillons longs | **Élevée** | M2 glisse (1 sem/1) | BG en fallback (32/40) ; 2 fournisseurs par vague ; relances J+7 tracées (cahier C1) |
| Compte Stripe live refusé / long | Faible | M1 glisse | Prévalider le compte dès maintenant (J1 du plan, en parallèle de G1) |
| Domaines email non validés (SPF/DKIM) | Moyenne | G3 glisse | Ouvrir le provider J1 et pousser le DNS la même semaine |
| Traduction EN de qualité (ton mélanine) | Moyenne | I1 rallongé | Validation native speaker ; le ton est le produit — ne pas presser |
| Un dev = point de défaillance | Certain | Tout glisse | La doc (14 docs) + les bancs (121) + les inventaires sont le relais : n'importe qui reprend en 1 jour, c'est l'architecture du dépôt |

## 9. Le succès mesuré en un an

| Indicateur | M1 | M2 | M3 | M4 | 12 mois |
|------------|----|----|----|----|---------|
| Achats réels/jour | 1 | 10 | 25 | 50 | 200 |
| Produits peau live | 3 | 40+ | 60 | 100 | 250 |
| D30 (cohorte) | — | 15% | 25% | 30% | 35% |
| AOV peau | — | 40€ | 45€ | 50€ | 55€ |
| Marchés | FR | FR | FR+BE/CH | FR+BE/CH+EN | +CI/SN/DOM |
| 5xx/mois (prod) | < 10 | < 10 | < 10 | < 10 | < 50 (charge) |

**Si ces lignes se remplissent, KURLA tient ses promesses.** Le plan est fini.
Exécuter G1 demain.
