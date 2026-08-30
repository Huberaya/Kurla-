# Guide de prise en main — Dashboard administrateur KURLA

Ce guide explique **à quoi sert chaque écran** de l'espace admin, **quand l'utiliser** et **ce que l'on y fait**. Il est écrit pour quelqu'un qui découvre l'outil : aucune connaissance technique n'est supposée.

---

## 1. Comment s'y retrouver

L'administration s'ouvre depuis la page **Admin** (réservée aux comptes de rôle `admin` ou `superadmin`).

La navigation fonctionne sur **deux niveaux** :

1. **Les familles** (gros boutons en haut) regroupent les écrans par métier :
   *Vue d'ensemble · Ventes & Clients · Catalogue & Stock · Approvisionnement · Gestion & Contenu*.
2. **Les sous-onglets** (deuxième ligne) correspondent aux écrans concrets de la famille sélectionnée. Des **pastilles numériques** indiquent le volume à traiter (commandes, retours, tickets).

Cliquer sur une famille ouvre son premier écran. L'écran actif est surligné.

> **Principe de fond :** l'admin ne vous demande jamais d'*inventer* une information. Un tarif, un contact, un stock ou une conformité que vous ne pouvez pas prouver reste **« non renseigné »**. Une conformité (ex. un certificat) s'enregistre avec **un fichier + une date**, jamais avec une simple case cochée. Toutes les actions sensibles sont **réservées aux administrateurs et tracées** dans l'écran *Logs*.

---

## 2. Famille « Vue d'ensemble »

### 📊 Tableau de bord commercial
**Le rôle :** c'est l'écran d'accueil du matin. Il répond à la question *« comment va l'activité en ce moment ? »* à partir des données réelles (commandes payées, remboursements, tickets…).

**Ce que l'on y lit :**
- **Chiffre d'affaires** : somme des commandes réglées, moins les remboursements enregistrés.
- **Panier moyen (AOV)** : montant moyen d'une commande payée.
- **Commandes totales** (+ celle du jour).
- **Tickets support ouverts** : charge client en cours.
- **Remboursements**, **recherches sans résultat** (ce que les clientes cherchent et ne trouvent pas — une mine d'idées catalogue), **taux d'usage de l'IA**, **produits populaires**.
- **Alertes Stock & Inventaire** : produits en stock faible (< 5) et produits en rupture (0).

**Quand l'utiliser :** chaque jour, en premier, pour prioriser la journée (beaucoup de commandes ? des tickets ? du stock à réapprovisionner ?).

---

## 3. Famille « Ventes & Clients »

### 🛍️ Commandes
**Le rôle :** gérer les commandes une par une, de la paiement à la livraison.

**Ce que l'on y fait :**
- Voir chaque commande (n°, client, montant, statut).
- **Faire avancer le statut** (en attente → en préparation → expédiée → livrée…), avec un motif demandé à chaque transition.
- Consulter l'**historique** d'une commande (toutes les étapes, horodatées).

**Quand l'utiliser :** plusieurs fois par jour, pour traiter les nouvelles commandes.

### ↩️ Retours & Remboursements
**Le rôle :** traiter les demandes de retour et suivre les remboursements.

**Ce que l'on y fait :** voir les retours en cours, suivre leur historique, déclencher/suivre un remboursement (la transaction réelle passe par Stripe).

**Quand l'utiliser :** dès qu'une cliente signale un retour, ou pour suivre les remboursements affichés dans la Vue d'ensemble.

### 💬 Support Client
**Le rôle :** la boîte de réponse aux clientes, sous forme de conversations.

**Ce que l'on y fait :**
- Choisir un ticket (objet, catégorie, priorité, statut).
- **Affecter** le ticket à un agent et fixer sa **priorité** (bas → urgent).
- Lire la **conversation complète**, ouvrir les **pièces jointes**, et **répondre officiellement** au nom de KURLA.

**Quand l'utiliser :** tant qu'il reste des tickets ouverts (la pastille de la famille le rappelle).

### 🪪 Certifications Pro
**Le rôle :** examiner les candidatures des professionnels (coiffeurs, etc.) qui veulent un compte Pro.

**Ce que l'on y fait :** consulter chaque dossier, ajouter un commentaire, accepter ou refuser.
⚠️ **Important :** valider une candidature **ne crée pas** automatiquement le compte professionnel ; c'est une étape manuelle séparée.

---

## 4. Famille « Catalogue & Stock »

### 🎛️ Pilotage catalogue
**Le rôle :** répondre à une seule question, produit par produit : **« ce produit peut-il être vendu, et sinon qu'est-ce qui manque ? »**

**Ce que l'on y lit :**
- Des indicateurs synthétiques (combien de produits publiables, bloqués, sans provenance…).
- **« Ce qui bloque, nommé »** : la liste précise des produits qui ne sont pas vendables et la raison (image non conforme, sécurité mineur à vérifier, information manquante…).
- Le détail **produit par produit**, y compris le **coût servi** (coût réel une fois le lot reçu, fret et droits inclus).

**Quand l'utiliser :** avant de mettre des produits en ligne, et chaque fois que l'on veut savoir pourquoi un produit n'apparaît pas sur la boutique. C'est le tableau de bord de la **qualité catalogue**.

### 📦 Catalogue produits
**Le rôle :** créer et éditer les **fiches produits** de la boutique.

**Ce que l'on y fait :**
- Créer une fiche manuelle ou modifier une fiche existante (nom, marque, prix TTC, promotion, stock, images, composition/INCI, avertissements, certifications, description…).
- Gérer les **variantes** (tailles, formats, couleurs/teintes, parfums).
- Renseigner la **sécurité enfants/adolescents** (tranche d'âge, statut de vérification, supervision parentale).
- **Importer en masse** : via un fichier **CSV**, ou via un **flux fournisseur** (JSON collé).
- Déclarer l'**image** et sa provenance (fournie par la marque / sous licence documentée).

⚠️ **Règle de confiance :** un produit importé reste en **brouillon, non publié**, tant que tous les contrôles de confiance ne sont pas confirmés. L'image, la composition et la conformité ne sont jamais complétées automatiquement.

**Quand l'utiliser :** pour ajouter/corriger des produits. Après import, direction *Pilotage catalogue* pour vérifier ce qui reste à corriger.

### 🏷️ Lots & traçabilité
**Le rôle :** enregistrer la **marchandise physique réceptionnée** et savoir d'où vient chaque produit vendu.

**Ce que l'on y fait :**
- **Enregistrer un lot reçu** : référence de lot, fournisseur, quantité reçue, coût unitaire, fret, droits de douane, autres coûts, date de réception.
- Le système en déduit le **coût servi par unité** (le vrai coût de revient).
- **Allouer** des unités d'un lot aux lignes de commande en attente.
- **Tracer** un lot : voir dans quelles commandes il a été envoyé (indispensable en cas de rappel produit).

**Quand l'utiliser :** à chaque livraison de stock. C'est le lien entre l'achat (Approvisionnement) et la vente.

---

## 5. Famille « Approvisionnement »

### 🚚 Fournisseurs & sourcing
Cet écran couvre **toute la démarche d'achat**, de la première prise de contact jusqu'au fournisseur référencé. Il comporte deux grandes zones.

**Zone haute — « Prospection & références » (la démarche commerciale) :**
- **Onglet Contacts** : les marques/façonniers à démarcher. Chaque fiche suit un **statut d'avancement** : *à contacter → email envoyé → relancé → réponse reçue → en négociation → échantillons reçus → accord / refus / sans réponse*. On y enregistre les échanges sans jamais inventer de nom, prix ou délai.
- **Onglet Références à intégrer** : les produits candidats repérés chez les fournisseurs, en attente d'arbitrage avant de devenir de vraies fiches catalogue.

**Zone basse — « Approvisionnement » (le référentiel réel) :**
- Le **référentiel des fournisseurs concrets** : raison sociale, pays, quantité minimum (MOQ), délai, certifications.
- **Déclarer un fournisseur** une fois qu'il est réel.
- Le **classeur de conformité** : chaque document (CPSR, certificats…) s'enregistre avec **son type, son fichier (URL) et sa date** — preuve exigée, jamais une case cochée.

**Quand l'utiliser :** pour construire et suivre le portefeuille d'achat (revente de marques existantes + façonnage des produits KURLA). Un produit sans provenance est signalé ici comme dans *Pilotage catalogue*.

---

## 6. Famille « Gestion & Contenu »

### 🛡️ Gestion quotidienne
C'est le **couteau suisse** de l'administration. Des sous-sections accessibles par les petits onglets internes :

| Sous-section | Rôle |
|---|---|
| **Marques** | Créer / modifier les marques affichées (nom, logo, description). |
| **Catégories** | Gérer les catégories métier et leur `slug` (l'identifiant web). |
| **Paiements** | Voir le statut des transactions Stripe (en attente, réussi, échoué, remboursé…). |
| **Livraisons** | Renseigner transporteur, statut, **numéro de suivi réel**, URL de suivi, tarif et événements d'expédition. Le suivi n'est **jamais** inventé : il est saisi par l'opérateur. |
| **Utilisateurs & rôles** | Attribuer un rôle (client, professionnel, support, éditeur, admin, superadmin). |
| **Articles** | Créer le **contenu éditorial** (articles, vidéos, guides, fiches ingrédient). Un contenu ne peut être **publié** sans auteur, source, niveau de preuve, langue et traduction — sinon il reste en brouillon. |
| **Sources IA** | Gérer les sources de connaissances de l'assistant IA : les valider (en attente / validée / rejetée) avant de les activer. |
| **Avis** | Modérer les avis produits (en attente / approuvé / rejeté). Un avis non rattaché à un achat ne s'affiche pas comme « achat vérifié ». |
| **Coupons** | Créer les codes promo (pourcentage ou montant fixe), dates de validité, limite d'usage, minimum de commande. |
| **Notifications** | Envoyer une **notification in-app ciblée** à un utilisateur et voir l'historique. |
| **Boucle de données** | **Calculer les relances de rétention** (demande de retour après 14 jours d'usage d'un produit, rappel de wash day, retrait d'une coiffure protectrice). Le bouton est **idempotent** : on peut le lancer chaque jour sans créer de doublon. Affiche le nombre d'utilisateurs analysés et de relances créées. Destiné à être appelé par une tâche quotidienne. |
| **Logs** | Le **journal d'audit** : quelle action administrative, par qui, quand. Sert à vérifier et à remonter l'historique. |

---

## 7. Les parcours types (pour démarrer)

**🌅 Le matin — prendre la température**
1. *Vue d'ensemble* → repérer commandes, tickets ouverts, alertes stock.
2. *Ventes & Clients → Commandes* → traiter les nouvelles commandes.
3. *Support Client* → répondre aux tickets ; *Retours* si besoin.

**📦 Quand on reçoit de la marchandise**
1. *Catalogue & Stock → Lots & traçabilité* → enregistrer le lot (quantité, coûts, date).
2. Allouer les unités aux commandes en attente.

**🚀 Avant de mettre des produits en ligne**
1. *Catalogue produits* → créer/importer les fiches.
2. *Pilotage catalogue* → corriger ce qui bloque jusqu'à ce que le produit soit publiable.

**🤝 La démarche d'achat (au long cours)**
1. *Approvisionnement → Contacts* → démarcher et faire avancer les prospects.
2. Une fois un fournisseur réel → le déclarer dans le **référentiel** avec ses **documents de conformité**.
3. *Références à intégrer* → arbitrer les produits à faire entrer au catalogue.

**✍️ Au fil de l'eau**
- Modérer les *Avis*, publier les *Articles*, gérer les *Coupons*, ajuster les *rôles*.
- Lancer la *Boucle de données* (ou la laisser tourner en tâche quotidienne).
- En cas de doute sur une action passée → *Logs*.

---

## 8. Les réflexes qui protègent

- **Rien d'inventé** : un champ que vous ne pouvez pas prouver reste vide / « non renseigné ».
- **Conformité = fichier + date** : jamais une simple case cochée.
- **Brouillon par défaut** : produits et contenus importés ne sont pas publiés tant que les contrôles ne sont pas verts.
- **Suivi et statuts réels** : saisis par l'opérateur, jamais générés automatiquement.
- **Tout est tracé** : les actions sensibles apparaissent dans *Logs* et sont réservées aux administrateurs.
- **Pas de diagnostic médical** : l'IA peut répondre « informations insuffisantes » ; les fonctions de confiance restent gratuites.
