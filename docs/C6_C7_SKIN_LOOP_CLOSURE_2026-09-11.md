# C6 / C7 — boucle peau : journal, Shelf et compatibilité

**Date :** 11 septembre 2026  
**État :** socle produit et persistance livrés ; aucune observation utilisateur ni photo de démonstration créée.

## C6 — Journal, photos, outcomes et observance

- Journal peau persistant dans `skin_journal_entries` : date, ressenti 1–5, préoccupations, note privée, jalon J+0/J+7/J+30/hebdo et lien photo optionnel.
- Observance persistante dans `skin_observance_days` : matin et soir par jour civil.
- Routes authentifiées :
  - `GET/POST /api/skin/journal`
  - `DELETE /api/skin/journal/:entryId`
  - `GET /api/skin/observance`
  - `PUT /api/skin/observance/:day`
- Les photos authentifiées du journal sont envoyées au bucket privé déjà encadré par l’AIPD, avec consentement serveur préalable et URL signée temporaire.
- Le journal authentifié ne réinjecte plus de base64 dans `beauty_profiles.profile`. Le `localStorage` reste seulement un repli anonyme local.
- Un outcome peut désormais porter sur un article libre du Shelf via `shelf_item_id`. Il ne fabrique aucun `product_id` catalogue et ne contribue pas à un agrégat ingrédient sans cible produit/ingrédient réelle.
- L’export et la suppression RGPD incluent le journal et l’observance.

## C7 — Shelf, scan INCI et compatibilité

- Le Shelf propose la caméra `BarcodeDetector` quand le navigateur le supporte, avec saisie manuelle de repli.
- Le scan Open Beauty Facts conserve la source déclarée et transmet les tags INCI au serveur.
- La résolution serveur rattache uniquement les libellés réellement présents dans le graphe `ingredients` ; les libellés inconnus restent comptés dans `inci_unresolved_count`.
- Le Shelf conserve :
  - `ingredient_ids` rattachés au graphe ;
  - `inci_names` déclarés par la source ;
  - `inci_source` ;
  - `inci_unresolved_count`.
- Une composition totalement inconnue reste non évaluée.
- Une composition partielle peut afficher les conflits connus, mais l’interface signale explicitement qu’une absence d’alerte ne signifie pas absence de risque.
- Les règles d’incompatibilité existantes continuent d’afficher la gravité, le niveau de preuve, l’explication et un geste concret.

## Contrôle Supabase après migration

Les nouvelles colonnes `user_products.ingredient_ids`, `inci_names`, `inci_source` et `inci_unresolved_count`, ainsi que les tables `skin_journal_entries` et `skin_observance_days`, sont présentes sur la base distante.

Données observées au contrôle :

- Shelf : 0 ligne ;
- outcomes : 0 ligne ;
- photos : 0 ligne ;
- journal peau : 0 ligne ;
- observance : 0 ligne ;
- graphe : 231 ingrédients, 36 liaisons produit–ingrédient et 44 incompatibilités déclarées.

Aucune donnée utilisateur n’a été semée pour faire progresser artificiellement C6 ou C7.
