# C1 — rapport de clôture sourcing et acceptation des premiers SKU

**Date du contrôle :** 11 septembre 2026  
**Marché contrôlé :** France métropolitaine  
**Périmètre héros :** `peau-ess-001`, `peau-ess-002`, `peau-ess-003`  
**Décision :** sourcing qualifié, mais **aucun SKU accepté** et C1 n'est pas commercialement franchi.

## 1. Décision opérationnelle

KURLA n'a pas de stock propre en première année. Les trois voies restent séparées :

- **Affiliation :** test de recommandation avec checkout du marchand affilié ; jamais présenté comme stock ou checkout KURLA.
- **Dropshipping :** seulement après validation de chaque SKU, du fournisseur, de l'expédition France, des retours, de l'authenticité, de l'INCI, de la conformité et de la responsabilité des claims.
- **3PL :** seulement après demande démontrée ou contrainte fournisseur de mise en stock ; lots, PAO/DDM, retours et kits doivent être opérables.

Une URL, une page catalogue ou une affirmation commerciale reste une **piste de sourcing**. Elle ne vaut pas dossier produit.

## 2. État constaté dans la base distante

Contrôle read-only effectué avant la migration C1 :

| Objet | Constat | Décision |
|---|---:|---|
| Fournisseurs référencés | 8 | tous `verification_status = not_provided` ; candidats uniquement |
| Documents fournisseur | 0 | aucun dossier disponible pour accepter un SKU |
| Candidats produit sourcing | 21 | tous `governance_status = blocked` |
| Prospects sourcing | 25 | pistes de contact, pas fournisseurs acceptés |
| Produits héros C1 | 3 | `source_supplier` = formulation interne ; aucun `supplier_sku` externe |
| Héros `ready_to_buy` | 0 | porte d'acceptation non franchie |

Les lignes peau à provenance interne avaient un état historique `published`/précommande qui pouvait prêter à confusion, malgré une quantité nulle et une provenance interne. La migration `20260919000000_c1_block_unproven_skin_targets.sql` ramène ces cibles, dont les trois héros, explicitement en brouillon inactif, sans stock validé ni rattachement fournisseur. Elle ne crée aucune preuve et ne transforme aucune cible en produit réel.

## 3. Qualification des canaux et fournisseurs

Les sources suivantes ont été retenues comme **canaux de demande ou pistes**, jamais comme validations :

| Piste | Rôle envisagé | Preuve encore requise |
|---|---|---|
| BigBuy | dropshipping UE, shortlist cosmétique | SKU, stock/expiry, expédition et retours FR, INCI, RP UE, CPSR/PIF/CPNP, GMP, claims, images |
| BTSWholesaler | dropshipping/wholesale beauté UE | autorisation de revente, dossier par SKU, stock, retours, flux commande |
| Qudo Beauty | wholesale / futur 3PL | conditions pro, marques autorisées, documents par SKU, MOQ, stock et expédition FR |
| Korean Skincare Supply | wholesale / futur 3PL | MOQ, CPNP/RP, INCI et preuves par SKU, lots/PAO, conditions FR |
| FLEX Health & Beauty | 3PL après validation de la demande | devis, réception, lots, DDM/PAO, retours, préparation de kits |
| In’oya | contact direct / sourcing ciblé | canal professionnel, offre SKU, claims autorisés, dossier réglementaire |
| Ametis Cosmetics | contact direct / sourcing ciblé | conditions professionnelles, RP UE, INCI, CPSR/PIF/CPNP, GMP, claims |

Les fournisseurs historiques `KURLA — Assemblage interne des kits` et `KURLA — Fiches de démonstration` ne sont pas des fournisseurs produits et ne peuvent pas satisfaire C1.

## 4. Dossier demandé pour chaque SKU candidat

Aucune acceptation ne sera saisie avant réception, rattachement et contrôle du dossier correspondant au **SKU fournisseur exact** :

1. raison sociale, pays, type de relation et contrat ou autorisation de revente ;
2. SKU fournisseur, format, prix TTC, TVA, délai et disponibilité réelle en France ;
3. INCI final, visibilité INCI et échantillon si nécessaire ;
4. Personne Responsable UE, CPSR/PIF et notification CPNP lorsque cosmétique ;
5. fabrication/GMP, lot, DDM ou PAO, traçabilité et rappel ;
6. claims autorisés et preuves associées ;
7. image fournie ou licence d'utilisation, avec statut de validation ;
8. politique de retours, authenticité et responsabilité de l'expédition ;
9. pour un SPF : SPF/UVA, white cast vérifié sur phototypes IV–VI et sous-tons si teinté.

Les documents sans fichier, date, portée ou rattachement au SKU sont incomplets. Une simple URL ne remplit aucun de ces champs.

## 5. Porte de sortie C1

Le rapport serveur `GET /api/admin/catalog/skin-readiness` reste la source de décision. Il doit afficher, pour chaque héros :

- `formulation_target` ou `blocked` tant qu'aucun dossier externe n'est contrôlé ;
- `preorder_verified` uniquement pour une précommande externe documentée, séparée du stock ;
- `ready_to_buy` uniquement lorsque sourcing, pays FR, stock, métadonnées, claims, images et truth layer checkout sont tous vérifiés.

La cible de 3 à 5 SKU n'est pas remplie : **0/3 héros accepté**. Aucun checkout KURLA, kit ou publication ne doit contourner cette porte.

## 6. Prochaine action fournisseur

Envoyer les demandes de dossier aux pistes P1 de la matrice existante. À réception, créer une fiche par SKU fournisseur, joindre les preuves originales, exécuter le rapport C1, puis accepter au maximum les 3 à 5 références réellement documentées et achetables en France. En l'absence de réponse exploitable, conserver la piste comme candidate et ne pas la promouvoir.
