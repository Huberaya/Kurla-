# AUDIT UTILISATEUR — KURLA BEAUTY (16/09/2026)
**Méthode : parcours réel de la boutique en prod (mesures curl sur kurlabeauty.vercel.app) + état réel du dashboard vérifié par structure et données. Limite honnête : sans identifiants admin je n'ai pas pu cliquer dans le dashboard — les parcours admin sont évalués sur leur structure réelle, leurs données réelles et leurs bancs, et je le signale à chaque fois.**

---

## 1. SYNTHÈSE — « QU'EST-CE QUI A CHANGÉ DEPUIS LA DERNIÈRE VERSION ? »

**Côté admin/sourcing : tout a changé.** KURLA est passée d'un catalogue où les fiches de test étaient noyées sans badge à un système complet : score de conformité par fiche, porte de publication avec journal, dérogations datées, 250+121 références d'approvisionnement unifiées avec e-mails prêts, sources multi-fournisseurs par modèle, marge calculée, routage des commandes figé au paiement (« qui expédie »), recherche globale, éditeur de besoins.

**Côté client : presque rien n'a changé — et c'est le finding principal de cet audit.** Mesuré ce jour : la boutique publique sert **63 produits, tous cheveux/accessoires/kits — 0 produit peau achetable**, et **0/63 produits exposent leurs besoins dans la liste publique**. Le nouveau système a considérablement amélioré l'arrière-boutique ; la vitrine n'en profite pas encore.

## 2. COMPARAISON AVANT / APRÈS

| Élément | Avant | Maintenant (mesuré) | Amélioration ? |
|---|---|---|---|
| Catalogue (admin) | ~110 cartes uniformes, fiches test invisibles/noyées, aucun état de conformité visible | Pastille « KURLA Ready N/100 » + ligne « ⛔ Bloque la vente : … » par fiche, filtres prêt/bloqué/test | ✅ réelle |
| Approvisionnement | 3 tables disjointes, aucune vue d'ensemble | 1 vue unifiée (produits+candidats+250 positions), pipeline 6 états, KPI, alertes (9 types) | ✅ réelle |
| Produits | Création 100 % manuelle, recopie | Fiche créée depuis le candidat en 1 clic, pré-remplie de données réelles, liée par clé | ✅ réelle |
| Fournisseurs | 16 fiches éparses, 9 sans e-mail | Inchangé côté données ; alerte « fournisseur sans contact » + e-mails prêts générés | 🟡 partielle |
| Validation | Critères codés mais invisibles, aucune trace de décision | Score visible, workflow 8 étapes avec transitions légales + refus motivé + journal | ✅ réelle (mais **pas de boutons UI pour le workflow** — API seulement) |
| Publication | Manuelle, sans contrôle | Porte : scan → propositions publier/retirer → apply journalisé ; dérogations datées | ✅ réelle |
| Dropshipping | Concept dans des docs | Modèle de données + routage + marge ; **mais 0 source saisie = 0 produit réellement routable** | 🟡 architecture prête, vide |
| Affiliation | Néant | Modèle + commission + lien obligatoire ; pas de suivi clics/conversions (aucun programme réel) | 🟡 squelette honnête |
| 3PL | Devis théoriques | Modèle + routage « logisticien nommé » ; aucun 3PL réel connecté | 🟡 squelette honnête |
| Commandes | Statuts tracés, aucune notion d'exécutant | Route figée au paiement + panel « qui expédie » + 39 commandes historiques « à router » visibles | ✅ réelle |
| Fulfillment | Modes dropship/préco codés, responsabilité floue | Responsabilité nommée par ligne de commande ; bloquée avec motif si pas de source | ✅ réelle (dépend de la saisie des sources) |
| Filtres (admin) | Statut basique | + modèle d'appro, alertes, états pipeline, test/sourcing | ✅ réelle |
| Organisation par besoin | Taxonomie 15 besoins côté boutique, édition impossible | Éditeur admin 15 besoins peau ; **côté client : 0/63 produits exposent leurs besoins en liste** | 🟡 moitié faite |
| Automatisation | Aucune | Porte (mode proposition), routage auto au paiement, alertes calculées ; pas de cron, pas d'envoi d'e-mails auto | 🟡 amorcée |
| Dashboard | Onglets empilés sans boussole | Pilotage appro + recherche globale + panels dédiés ; **7+ panels empilés dans l'onglet sourcing = surcharge** | ✅ réelle mais perfectible |

## 3. PARCOURS ADMIN — « j'ai identifié un nouveau produit » (10 étapes)

1. **Ajouter le produit** : ✅ fluide — il entre comme candidat/position en appro, pas directement au catalogue (bon réflexe imposé).
2. **Associer le fournisseur** : ✅ dropdown des 16 enregistrés dans le panel Sources.
3. **Contact fournisseur** : 🟠 le contact vit dans la fiche fournisseur, pas dans le formulaire de source — il faut ouvrir un autre panel. 9 fournisseurs sur 16 n'ont pas d'e-mail.
4. **Modèle d'approvisionnement** : ✅ clair — dropdown 4 modèles, lien affilié obligatoire en affiliation (refusé sinon).
5. **Critères KURLA** : ✅ le score et les blocages s'affichent sur la fiche catalogue.
6. **Valider** : 🔴 **le workflow 8 étapes n'a pas de boutons** — les transitions passent par l'API (`/workflow/transition`) mais aucun écran ne les expose. En l'état, l'admin « valide » implicitement en complétant la fiche.
7. **Ajout au catalogue** : ✅ 1 clic « + Créer la fiche » depuis le candidat (draft, données réelles).
8. **Besoins** : ✅ éditeur dédié — mais **peau uniquement** (les besoins cheveux ne sont pas éditables).
9. **Publier** : 🟡 scan de porte → « Appliquer » par fiche. Pas de publication en masse, pas de planification.
10. **Retrouver** : ✅ recherche globale (avec le « pourquoi » du résultat).

**Bilan du parcours** : 7/10 étapes fluides ; le maillon faible est l'étape 6 (pas d'UI) et la dispersion (5 panels différents pour un seul produit).

## 4. TEST CATALOGUE — « puis-je gérer des centaines de produits ? »

- **Quels produits vendons-nous ?** ✅ panel Ops + catalogue (63 publics mesurés).
- **Besoin « hyperpigmentation » ?** 🟠 admin : oui si les fiches sont étiquetées (recherche lexicale — « taches » ≠ « hyperpigmentation »). Client : **non** — les besoins ne sont pas exposés dans la liste publique.
- **Produits de tel fournisseur ?** ✅ filtre/fournisseur dans le panel + recherche globale.
- **En dropshipping / affiliés / 3PL ?** ✅ filtre par modèle dans le panel Ops — mais tout est à 0 tant que les sources ne sont pas saisies.
- **Validés mais non publiés ?** ✅ alerte dédiée « approuvé mais non publié ».
- **Archivés/rupture ?** 🟡 statuts visibles, pas de filtre « rupture fournisseur » côté catalogue (l'alerte existe côté Ops).
- **Verdict** : gérable à 138 fiches, oui. À 1 000 : la liste scrollable sans pagination ni tri deviendra pénible.

## 5. TEST APPROVISIONNEMENT (responsable sourcing)

Identifiés ✅ (250+121+63 dans une vue). Qui fournit ✅. Contacter ✅ (e-mails prêts à copier, 7/16 fournisseurs avec adresse). Modèle ✅. Critères ✅ (score). Prêt à ajouter ✅ (bouton). Pourquoi bloqué ✅ (motifs nommés). **Manquant** : pas d'écran pour saisir le résultat d'un appel/e-mail fournisseur (le statut « contacté » du pipeline n'est alimenté par rien d'autre que le code candidat).

## 6. TEST SYSTÈME D'ACHAT (décision rapide)

Le panel Ops répond en une ligne par produit : coût total, marge (ou commission), responsable d'expédition, délai, manquants. **La décision est possible… dès qu'une source est saisie.** Aujourd'hui, sur 63+ fiches, 0 source → la colonne marge est vide partout. L'outil est bon ; il attend sa donnée.

## 7. TEST DES 4 MODÈLES

Distincts dans les données, le routage, les filtres et les libellés ✅. En pratique aujourd'hui : **un seul modèle est réellement vécu par les clientes — la précommande/dropship cheveux existant** (badges « 24–48h dropship » mesurés sur la boutique). L'affiliation et le 3PL sont des cases vides honnêtes.

## 8-10. TEST CÔTÉ CLIENT (mesuré en prod)

- **Première visite** : H1 « Vos cheveux bouclés, frisés & crépus ont enfin leur maison » — la valeur est immédiate **pour les cheveux**. La promesse peau (« Votre peau, comprise. Pas diagnostiquée. » sur /peau) est forte… mais **l'étagère peau est vide** : 0 produit peau achetable mesuré. Risque de déception réel.
- **« Je cherche hydratation »** : ✅ la recherche client comprend l'intention (mesuré : « hydratation » → besoin `hydrater_cheveux`) et retourne des produits.
- **« Je cherche pour l'hyperpigmentation »** : 🔴 la page /peau parle de taches (8 mentions) mais aucun produit derrière ; /besoins → **404**.
- **« Je ne sais pas quoi acheter »** : ✅ /diagnostic existe (200) et le parcours guidé est la force historique de KURLA.
- **Fiche produit** : ✅ honnête (précommande et délai légal affichés en clair sur la fiche mesurée) ; 🟡 pas de label de livraison structuré visible sur cette fiche.
- **Regroupement par besoins** : 🔴 côté client, les besoins ne sont pas exposés dans la liste publique (0/63) — le travail d'étiquetage admin ne se voit pas encore en boutique.

## 11-12. UX & PREMIÈRE VISITE — notes de friction

Simplicité admin : bonne par panel, mauvaise en empilement (7+ panels dans l'onglet sourcing, pas de sous-navigation). Clarté : les motifs nommés partout (« ⛔ Bloque : CPNP expiré ») sont excellents. Confiance client : les mentions légales/précommande honnêtes rassurent ; l'étagère peau vide décrédibilise la promesse peau. Mobile : les panels admin utilisent des grilles flex (correct), non testé en conditions réelles.

## 13. FRICTIONS (classées)

1. 🔴 **Étagère peau vide en public** — la promesse /peau n'a aucun produit derrière → déception, perte de confiance. *Solution : passer les fiches test conformes par la porte, ou retirer la promesse le temps du sourcing.*
2. 🔴 **Besoins invisibles côté client** (0/63 en liste) — l'organisation par besoin n'existe pas pour l'acheteuse. *Solution : exposer `concerns/needs` dans la projection publique + filtres besoins en boutique.*
3. 🔴 **Workflow 8 étapes sans UI** — la traçabilité existe en base, personne ne peut s'en servir sans API. *Solution : boutons de transition + historique dans la fiche.*
4. 🟠 **0 source saisie** — le routeur, la marge, les modèles : tout attend cette saisie manuelle (138 fiches). *Solution : saisir le top 20-30 via le panel (données du registre sourcing déjà disponibles).*
5. 🟠 **Besoins cheveux non éditables** dans l'éditeur (15 codes peau seulement).
6. 🟠 **42 dérogations à renouveler une par une** le 15/10. *Solution : renouvellement en masse.*
7. 🟠 **Onglet sourcing surchargé** (7+ panels empilés). *Solution : sous-onglets.*
8. 🟡 **Recherche lexicale** : « taches » ≠ « hyperpigmentation » côté admin.
9. 🟡 **Pas de cron** : scan de porte et récap dérogations sont manuels.
10. 🟡 **/besoins et /shop en 404** ; pagination/tri absents des listes admin.

## 14. CE QUI A CHANGÉ (réellement)

- **Admin** : score + blocages par fiche, porte journalisée, dérogations datées, recherche globale, éditeur de besoins.
- **Approvisionnement** : vue unifiée 434 références, pipeline, alertes, e-mails prêts, sources multi-modèles, marge.
- **Catalogue** : liaison candidat→fiche par clé, publication contrôlée.
- **Commande/fulfillment** : route figée au paiement, « qui expédie » nommé, historique « à router » visible.
- **Client** : rien de visible encore (honnête).

## 15. CE QUI N'A PAS CHANGÉ

L'étagère peau vide ; les 9 fournisseurs sans e-mail ; l'absence de stock réel (modèle sans stock assumé en année 1) ; la dépendance à la saisie manuelle des données fournisseurs ; le fait que Stripe encaisse des précommandes dont l'exécution reste manuelle.

## 16. AMÉLIORÉ MAIS INSUFFISANT

Filtrage par besoin (admin oui, client non) ; sources (modèle complet, données vides) ; workflow (moteur + trace, pas d'écran) ; automatisation (portes manuelles, pas de cron) ; affiliation (squelette conforme, zéro programme réel — volontaire).

## 17. NOTES GLOBALES (honnêtes, justifiées)

| Axe | Note | Pourquoi |
|---|---|---|
| UX client | 62/100 | Cheveux cohérent + diagnostic fort ; promesse peau sans étagère, /besoins 404 |
| UX admin | 71/100 | Chaque panel est clair ; l'empilement et l'absence de sous-navigation pèsent |
| Approvisionnement | 78/100 | La vue la plus aboutie ; manque la saisie des retours fournisseurs |
| Catalogue | 66/100 | Score+blocages excellents ; pas de pagination/tri, besoins non exposés en public |
| Fournisseurs | 70/100 | Fiches+documents+alertes ; 9/16 sans contact, pas de portail |
| Commandes | 64/100 | Statuts tracés + routes ; 39 commandes à router, exécution encore manuelle |
| Fulfillment | 58/100 | Routeur juste mais 0 source saisie = 100 % bloqué aujourd'hui |
| Recherche | 72/100 | Globale admin + intention client ; lexicale, pas sémantique |
| Organisation par besoins | 55/100 | Taxonomie solide, édition peau seulement, invisible en boutique |
| Automatisation | 60/100 | Portes + routage auto au paiement ; pas de cron, e-mails manuels |
| Scalabilité | 75/100 | Modèle de données prêt multi-sources/multi-pays ; UI à paginer |

## 18. LES 10 AMÉLIORATIONS PRIORITAIRES

| # | Problème | Solution | Bénéfice | Priorité | Complexité |
|---|---|---|---|---|---|
| 1 | Étagère peau vide | Passer par la porte les fiches test conformes (ou masquer la promesse) | Cohérence promesse/étagère | 🔴 | S |
| 2 | Besoins invisibles en boutique | Exposer concerns dans la projection publique + filtres besoins | Navigation par besoin réelle | 🔴 | S-M |
| 3 | Workflow sans UI | Boutons de transition + historique dans la fiche 360 | Traçabilité utilisable | 🔴 | M |
| 4 | 0 source saisie | Saisir le top 20-30 (registre sourcing déjà là) | Marge + routage réels | 🔴 | S (métier) |
| 5 | Besoins cheveux non éditables | Ajouter la taxonomie cheveux à l'éditeur | §12 complet | 🟠 | S |
| 6 | 42 dérogations à renouveler une à une | Renouvellement en masse | Éviter 42 retraits le 15/10 | 🟠 | S |
| 7 | Onglet sourcing surchargé | Sous-onglets (Pilotage / Références / Fournisseurs / E-mails) | Lisibilité | 🟠 | S-M |
| 8 | Pas de cron | Scan porte + récap dérogations hebdo automatiques | Zéro oubli | 🟡 | M |
| 9 | Recherche lexicale | Synonymes de besoins (taches↔hyperpigmentation) | Recherche qui comprend | 🟡 | S-M |
| 10 | Listes sans pagination + /besoins 404 | Pagination/tri admin ; route /besoins | Passage à l'échelle | 🟡 | S |

## 19. VERDICT

**Le système opérationnel derrière KURLA existe enfin et il est solide** — traçable, banc-vert (8 bancs), sans donnée inventée, sans fausse intégration. **Mais sa valeur ne se voit pas encore : ni dans la boutique (étagère peau vide, besoins non exposés), ni dans le routage (0 source saisie).** Les trois gestes qui transforment l'essai ne sont pas du code : publier les fiches conformes, étiqueter les besoins, saisir les sources du top 30. Le code, lui, est prêt à suivre (améliorations 2, 3, 5, 6).
