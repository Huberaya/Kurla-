# Audit complet KURLA Beauty

**Date :** 26 août 2026  
**Dépôt audité :** `Huberaya/Kurla-`  
**Commit observé :** `6009ea1 — Complete operations and production hardening`  
**Périmètre :** application React/Vite, serveur Express, Supabase, Stripe, IA, boutique, comptes clients, espace Pro, administration, communauté et contenus éditoriaux.

> Audit réalisé à partir de la lecture du code source, de l’inventaire des routes et appels API, de tests HTTP locaux et des suites automatisées disponibles. La revue pixel-perfect dans un navigateur, les tests sur appareils physiques, la validation avec un vrai projet Supabase, un vrai compte Stripe et un fournisseur email de production restent à exécuter.

---

## 1. Synthèse exécutive

### Verdict

KURLA possède une **base produit riche et différenciante** : positionnement beauté afro/multiculturelle, diagnostic cheveux/peau, recommandation IA, catalogue, routines, communauté, annuaire de professionnels, commandes, support, retours et console opérationnelle. Le dépôt est nettement plus avancé qu’un simple prototype visuel : les prix sont recalculés côté serveur, le stock est réservé avant checkout, les statuts de commande sont historisés et les tests de sécurité locaux sont présents.

Cependant, la plateforme n’est pas encore prête à être présentée comme un **commerce opérationnel de niveau mondial**. Elle mélange actuellement trois niveaux de réalité :

1. des données métier réellement persistées ou prévues pour l’être ;
2. des données de démonstration affichées comme si elles étaient réelles ;
3. des interfaces très abouties visuellement mais dont les actions ne déclenchent pas encore de processus métier.

Le principal risque n’est donc pas l’absence d’idées, mais la **discordance entre la promesse et l’exécution** : un client peut voir une réservation confirmée alors qu’aucun paiement ni rendez-vous n’a été créé, un compte peut afficher des commandes sans disposer d’un parcours de livraison complet, et un administrateur peut voir des candidatures fictives avec des boutons de certification sans action backend.

### Niveau de maturité estimé

| Domaine | Évaluation | Commentaire |
|---|---:|---|
| Positionnement / proposition de valeur | 8/10 | Territoire clair, culturellement pertinent et différenciant. |
| Richesse fonctionnelle visible | 8/10 | Beaucoup de modules, parfois trop tôt exposés. |
| UX de parcours critiques | 5/10 | Les entrées sont nombreuses, mais plusieurs boucles ne sont pas fermées. |
| Commerce réel | 5/10 | Bonne base serveur ; checkout, livraison et invités restent incomplets. |
| Compte client | 4/10 | API présentes, mais contrats UI/API incohérents et données en partie locales. |
| Espace Pro | 2/10 | Annuaire mocké, candidature locale, dashboard statique. |
| Administration | 5/10 | Commandes/SAV réels en partie ; certifications Pro encore statiques. |
| Direction artistique | 7/10 | Signature sombre, cuivre, éditoriale ; cohérence et lisibilité à consolider. |
| Accessibilité | 4/10 | Bases présentes mais modales, focus, contrastes et annonces insuffisants. |
| Robustesse production | 5/10 | Tests locaux sérieux ; Supabase/Stripe/email réels non validés. |
| SEO / acquisition | 3/10 | SPA sans 404 dédiée, métadonnées très limitées, contenu peu indexable. |

### Go / no-go

- **Démo interne ou landing de pré-lancement : GO**, à condition d’indiquer clairement le mode bêta et les contenus illustratifs.
- **Ouverture commerciale publique avec encaissement réel : NO-GO** tant que le checkout invité, les adresses de livraison, le retour Stripe, les emails, la persistance Pro et la validation Supabase réelle ne sont pas verrouillés.
- **Communication de scores, avis, certifications ou réservations comme preuves réelles : NO-GO** tant que leur provenance n’est pas reliée à des données vérifiables.

---

## 2. Ce qui est déjà solide

### Produit et marque

- Positionnement spécifique : cheveux texturés, peaux riches en mélanine, familles, hommes, protective styles et professionnels.
- Ton de marque chaleureux, valorisant et non stigmatisant.
- Bonne articulation entre contenu, diagnostic, recommandation, produit et accompagnement humain.
- Présence d’un disclaimer non médical et d’une orientation vers un professionnel de santé pour certains signaux d’alerte.
- Promesse de charte Pro intéressante : respect de la fibre, absence de jugement, hygiène et réduction de la tension.

### Technique

- Le serveur ignore le prix envoyé par le client et recalcule le montant à partir du catalogue serveur (`server.ts`, endpoint Stripe).
- La quantité et le stock sont contrôlés côté serveur.
- Le stock est réservé à la création de commande puis libéré en cas d’échec/expiration du paiement.
- Les événements Stripe disposent d’une logique d’idempotence et d’une protection contre le double déstockage.
- Les transitions de statuts de commande sont contrôlées et historisées.
- Les APIs privées récentes reposent sur le token Supabase vérifié et non sur un simple `x-user-id` ou `x-admin-key`.
- Les tests locaux couvrent l’autorisation négative, les headers de sécurité, la taille des requêtes, le panier, les prix, le stock, les webhooks, les retours, les tickets et les métriques.

### Tests observés

`npm run build` passe. `npm test` passe pour les suites locales disponibles. Les tests réels Supabase sont explicitement **sautés** sans credentials : 0/17 contrôles Phase 2 exécutés contre une vraie instance. Le serveur local répond correctement à `/api/health`, mais indique :

- Supabase serveur non configuré ;
- Stripe non configuré ;
- Gemini non activé ;
- 16 produits provenant du mode fallback.

Le build signale également un bundle frontend minifié d’environ **1,56 MB**, ainsi que trois avertissements `import.meta` avec la sortie serveur CommonJS.

---

## 3. Critiques bloquantes avant exploitation commerciale

### B1 — Le checkout accepte un invité avec une fausse adresse email par défaut

`CartDrawer.tsx` envoie `client@kurla-beauty.com` si l’utilisateur n’est pas connecté. Le serveur accepte cette adresse si Stripe est configuré. Conséquences : reçu inaccessible au client, commande impossible à rattacher à un compte, support plus difficile et non-conformité potentielle sur l’information client.

**Décision recommandée :** demander l’email réel avant redirection Stripe, ou imposer la création/connexion de compte. Ne jamais injecter une adresse fictive.

### B2 — Retour Stripe vers un compte protégé, sans parcours invité cohérent

`server.ts` configure le `success_url` vers `/account?...`. Or `/account` est protégé. Un invité ayant payé peut être renvoyé vers une page de connexion sans accès lisible à sa commande. Il n’existe pas de page de confirmation publique vérifiant la session Stripe côté serveur.

**Décision recommandée :** créer `/commande/confirmation` avec récupération serveur de la session, affichage limité et sécurisé de la commande, puis proposer la création de compte ou l’association à un compte existant.

### B3 — La réservation de consultation est une simulation trompeuse

`ConsultationBookingModal.tsx` génère localement une URL aléatoire `https://meet.kurla.beauty/...`, affiche « Réservation confirmée », « Payé » et annonce l’envoi d’un email/Google Calendar, sans appel API, paiement, création d’agenda, disponibilité réelle, attribution Pro ou email.

**Décision recommandée :** soit afficher explicitement « prototype / demande d’intérêt », soit implémenter un vrai flux : disponibilité serveur, réservation atomique, paiement, confirmation, calendrier, visio et annulation.

### B4 — La candidature KURLA Pro n’est jamais soumise

`ProApplicationPage.tsx` met uniquement `submitted` à `true` dans l’état React. Aucune candidature n’est enregistrée, aucun email n’est envoyé, aucun statut n’est visible à l’admin.

**Décision recommandée :** table `professional_applications`, endpoint protégé/anti-spam, upload de justificatifs/portfolio, statut `submitted / under_review / approved / rejected`, audit et notifications.

### B5 — Le dashboard Pro est entièrement statique

`ProDashboardPage.tsx` affiche « Studio Kadiatou », des rendez-vous, 12 RDV, 4.9/5, 38 avis et « 100% conforme » sans charger l’identité du Pro connecté ni une API métier. Les boutons « Ajouter une prestation » et « Gérer » n’ont pas d’action.

**Décision recommandée :** masquer ce dashboard jusqu’à la persistance réelle, ou le labelliser « aperçu bêta » très visiblement.

### B6 — L’administration affiche des candidatures fictives et des boutons inactifs

L’onglet certifications Pro de `AdminDashboardPage.tsx` utilise deux objets écrits en dur. Les boutons « Valider & Certifier » et « Refuser » n’ont aucun handler.

**Décision recommandée :** remplacer par la table et l’API des candidatures, avec permissions, motif de refus, journal d’audit et notification au professionnel.

### B7 — Données réelles et données de démo sont mélangées silencieusement

`productService.ts` retombe sur `MOCK_PRODUCTS` si Supabase ou l’API échoue, sans remonter d’erreur à l’utilisateur. En production, une base vide ou indisponible peut donc afficher 16 produits de démonstration. De plus, la réponse backend est signalée `source: 'supabase'` lorsqu’elle vient en réalité du store serveur/fallback.

**Décision recommandée :** trois modes explicites (`production`, `staging`, `demo`), fail-closed en production, bannière de mode démo hors production et monitoring de la source affichée.

---

## 4. Architecture de l’information et navigation

### Constats

- Le routage est un routeur maison dans `src/App.tsx`, basé sur `window.location.pathname`.
- Les liens internes sont principalement des balises `<a>` : chaque navigation peut recharger l’application et perdre l’état UI.
- `Navbar` possède un prop `currentPath`, mais `App` ne lui transmet pas le chemin courant : l’état actif du menu est susceptible d’être erroné.
- Les routes `/cgv` et `/confidentialite` ne sont pas déclarées dans le routeur applicatif. Le serveur renvoie bien l’HTML SPA, puis l’application retombe sur la home pour un chemin inconnu. Ce n’est pas une page légale.
- Il n’existe pas de vraie page 404 ni de stratégie pour les slugs inconnus. `ArticleDetailPage`, `RoutineDetailPage` et `ProProfilePage` retombent sur le premier élément mocké au lieu d’indiquer que le contenu n’existe pas.
- Les paramètres de requête semblent sous-exploités : `/boutique?category=...` et `/professionnels?city=...` ne sont pas intégrés de façon visible au filtrage initial.
- L’architecture expose beaucoup de destinations parallèles : boutique, routines, diagnostics, KURLA ID, cheveux, peau, enfant, hommes, protective styles, journal, communauté, assistant, outils, ingrédients et espace Pro. L’utilisateur peut comprendre le territoire, mais pas toujours le prochain meilleur choix.

### Architecture recommandée

Navigation primaire limitée à cinq entrées :

1. **Comprendre ma routine** — diagnostic, KURLA ID, suivi ;
2. **Acheter** — boutique, routines, favoris ;
3. **Trouver un expert** — annuaire, visio, réservation ;
4. **Apprendre** — journal, guides, communauté ;
5. **Mon espace** — compte, commandes, préférences.

Le Pro et l’Admin doivent être des espaces séparés, non concurrents dans la navigation grand public.

Créer une couche de routes dédiée avec :

- routes déclaratives ;
- navigation SPA accessible ;
- conservation du scroll si pertinent ;
- 404 métier ;
- redirections des anciens slugs ;
- parsing centralisé des query params ;
- title/meta par route ;
- garde de navigation pour les formulaires non sauvegardés.

---

## 5. Audit des parcours utilisateurs

## 5.1 Acquisition et page d’accueil

### Points positifs

- La home raconte un univers complet au lieu de présenter uniquement un catalogue.
- Les sections diagnostic, produits, communauté, enfants/hommes, routines, professionnels et journal couvrent plusieurs motivations.
- Le storytelling « beauté texturée enfin comprise » est mémorisable.

### Frictions

- Trop de propositions de valeur au même niveau : diagnostic, IA, produits, communauté, visio, Pro, waitlist. La home risque de ressembler à une vitrine de roadmap plutôt qu’à un produit focalisé.
- L’appel principal devrait répondre à une question unique : « Quelle est la prochaine action utile pour moi ? »
- La waitlist affiche une promesse d’accès bêta et de code -15 % mais son stockage/consentement backend n’est pas démontré.
- Certaines affirmations comme « certifié », « officiel », « vérifié » ou « supervisé » ne sont pas systématiquement reliées à une preuve ou à un modèle de gouvernance.

### Recommandation

Segmenter dès le premier écran :

- **Je veux comprendre mes besoins** → diagnostic ;
- **Je veux acheter maintenant** → boutique ;
- **Je veux un expert** → annuaire ;
- **Je veux apprendre** → journal/guides.

Ajouter une preuve concrète : nombre d’utilisateurs, avis réellement collectés, experts actifs, produits disponibles et pays desservis — uniquement si vérifiable.

## 5.2 Diagnostic cheveux / peau

### Risques UX et métier

- Les réponses sont envoyées à l’IA avec email et données de beauté sans parcours de consentement détaillé clairement visible.
- Les erreurs HTTP ne semblent pas toujours distinguées d’un résultat IA de secours.
- Le produit peut donner l’impression d’un diagnostic médical malgré le disclaimer non médical.
- Les résultats doivent distinguer : observation déclarative, hypothèse cosmétique, recommandation, signal d’alerte et limite de confiance.
- Le changement d’email ou l’abandon à mi-chemin doivent être traités sans perdre la saisie, mais sans conserver indéfiniment des données sensibles dans le navigateur.
- Il manque une politique claire de conservation/suppression des résultats et un accès « supprimer mes données ».

### Recommandation de résultat

Afficher un résultat en quatre blocs :

1. **Ce que tu nous as dit** ;
2. **Ce que cela peut impliquer côté routine** ;
3. **Ce que nous recommandons pendant 2 à 4 semaines** ;
4. **Quand consulter un professionnel de santé**.

L’IA ne doit jamais présenter une causalité médicale ou un score de précision non mesuré. Chaque recommandation doit pointer vers une fiche produit, un ingrédient, une étape de routine et une justification compréhensible.

## 5.3 Assistant IA

### Solide

- Endpoint dédié, réponses structurées, garde-fous sur plusieurs termes d’urgence et disclaimer.
- Présence d’une notion de revue humaine (`requiresHumanReview`).

### À corriger

- Le fallback fournit une réponse utile mais peut être confondu avec une réponse Gemini réellement générée.
- `server.ts` valide les `productHandles` contre `MOCK_PRODUCTS`, pas contre un catalogue de production complet : un produit réellement publié dans Supabase peut être supprimé de la recommandation.
- Les réponses ne semblent pas persister de façon utilisateur, malgré la promesse de sauvegarde/favoris.
- L’assistant doit limiter les données personnelles envoyées, journaliser les versions de prompt et permettre le signalement d’une réponse.
- Le coût, la latence, le rate limit par utilisateur et le suivi des erreurs IA doivent être monitorés.

## 5.4 Boutique et fiche produit

### Points positifs

- Catalogue, filtres, produits en promotion, routines et fiche détaillée structurés.
- Prix serveur et stock contrôlés au checkout.
- Présence d’INCI, ingrédients clés, mode d’emploi, cible et contre-indications cosmétiques.

### Défauts

- Dans `BoutiquePage.tsx`, l’état `onlyCompatible` existe mais n’est pas appliqué dans `filteredProducts`.
- Le score « KURLA Fit » est calculé à partir de l’index du produit (`92 + idx % 7`) et non à partir du diagnostic ou du profil. C’est un risque de confiance et de conformité marketing.
- `ProductDetailPage.tsx` affiche « En stock » sans dépendre clairement de `product.inStock`.
- Les avis et notes « vérifiés » ne sont pas reliés à un modèle d’avis identifiable dans l’interface auditée.
- La hiérarchie produit est parfois technique ou interne : affichage de « Source Principal public.products », de mentions Supabase, de « Photo officielle » ou de « Bêta » sur une expérience client.
- La grille produit ne semble pas gérer les variantes comme une vraie décision d’achat : format, poids, teinte, parfum, quantité et SKU doivent être séparés du produit parent.
- Le fallback Supabase peut servir des champs pauvres ou des valeurs par défaut. `mapSupabaseToProduct` crée notamment des badges, note, nombre d’avis et valeurs par défaut sans signaler leur provenance.
- Les images Unsplash génériques et les visuels dits officiels doivent être remplacés par des photos propriétaires ou des assets dont les droits, alt et provenance sont gérés.

### Recommandation

Une fiche produit de niveau premium doit contenir :

- bénéfice principal en une phrase ;
- pour qui / pour qui non ;
- texture et sensorialité ;
- taille, rendement et durée d’usage ;
- ingrédients avec rôle et allergènes/parfum ;
- INCI complet avec date de mise à jour ;
- preuve de compatibilité issue du profil, expliquée ;
- stock réel et délai de livraison par pays ;
- avis vérifiés et photos UGC avec consentement ;
- politique de retour adaptée aux cosmétiques ouverts ;
- questions/réponses.

## 5.5 Panier, paiement et commande

### Ce qui fonctionne

- Le serveur revalide les produits, prix et stock.
- La réservation de stock et les événements Stripe ont une base solide.
- Une clé d’idempotence est supportée par l’API.

### Problèmes

- Le frontend n’envoie pas de clé d’idempotence de checkout. Un timeout puis une nouvelle tentative peut créer plusieurs commandes/session selon le moment d’échec.
- Le panier est toujours synchronisé sous `anonymousId` dans `App.tsx`. Le composant `App` est en dehors du contexte `AuthProvider` lorsqu’il gère son état : aucune fusion explicite panier invité → panier authentifié n’est visible.
- Le panier anonyme n’est pas lié à l’utilisateur au login et peut perdre des articles ou les laisser dans un panier séparé.
- Aucun formulaire d’adresse de livraison n’est visible dans le panier ; `newOrder` n’inclut pas l’adresse. Les taxes, frais, méthode de livraison, pays et estimation de date ne sont pas modélisés dans le parcours.
- Le montant affiché comme sous-total peut être interprété comme total à payer, alors que les frais de livraison/taxes ne sont pas présentés.
- Le checkout ne gère que `card` côté Stripe dans le code audité ; il faudra décider si Apple Pay, Google Pay, Bancontact, PayPal ou autres moyens sont nécessaires selon les pays.
- Le retour Stripe affiche un succès de commande sans vérifier que la session est payée et sans polling du statut webhook.
- L’annulation renvoie vers `/boutique?canceled=true`, mais l’état `canceled` n’est pas clairement exploité en UI.
- Les images envoyées à Stripe proviennent parfois d’URLs externes et non d’assets garantis.

### Parcours cible

1. panier ;
2. email ou compte ;
3. adresse/pays ;
4. livraison et taxes calculées ;
5. récapitulatif légal ;
6. clé d’idempotence générée côté client et réutilisée lors d’un retry ;
7. Stripe ;
8. page de confirmation publique vérifiée serveur ;
9. webhook ;
10. email transactionnel ;
11. suivi depuis le compte.

## 5.6 Compte client

### Défauts confirmés

- `CustomerAccountPage.tsx` attend `n.isRead`, alors que le serveur renvoie `read`. Le compteur non lu et l’état visuel des notifications sont donc incohérents.
- Le serveur renvoie des préférences `emailNotifications`, `transactionalEmails`, `marketingEmails`, `inAppNotifications`, alors que l’UI utilise `emailOrderUpdates`, `emailPromotions`, `emailSupportReplies`, `inAppAlerts`. Le formulaire ne lit ni n’enregistre correctement les préférences métier.
- Les appels API n’ont pas de stratégie commune : erreurs HTTP, retry, loading par section, empty state et notification sont incomplets.
- `loadUserData()` est lancé sur les changements de `user` et `profile`, y compris dans des phases où l’authentification n’est pas encore stabilisée.
- Les expéditions sont chargées une par une pour chaque commande, sans batch ni gestion d’erreur visible.
- La demande de retour construit automatiquement une ligne de retour pour tous les articles avec leur quantité complète. L’utilisateur ne peut pas choisir les articles/quantités et le serveur devra refuser les demandes dupliquées ou hors quantité.
- Le compte contient des formulations techniques destinées au développeur, par exemple « profil public.profiles mis à jour dans Supabase ».
- Les sous-pages KURLA ID, favoris, suivi et journal sont principalement locales/statique : les tâches, notes, favoris et entrées ne survivent pas à un changement d’appareil et ne semblent pas alimenter le modèle serveur.

### Recommandation

Créer un SDK frontend typé commun avec :

- `ApiError` normalisée ;
- états `idle/loading/success/empty/error` par ressource ;
- invalidation après mutation ;
- mapping unique snake_case → camelCase ;
- cache et abort controller ;
- messages utilisateur distincts des erreurs développeur.

## 5.7 Communauté, UGC et éditorial

- `MOCK_ARTICLES`, `MOCK_PROS` et plusieurs images de démonstration sont utilisés directement dans l’expérience.
- Les contenus UGC doivent avoir statut de modération, consentement, date, auteur affichable, retrait et droit à l’image.
- Les promesses de communauté ne doivent pas laisser croire qu’une communauté active existe si le contenu n’est pas réellement alimenté.
- Les articles doivent avoir auteur, date, sources, relecture, mise à jour et niveau de preuve lorsque le sujet touche peau, cuir chevelu, ingrédients ou enfants.
- Ajouter recherche réelle, tags, pages d’auteur, canonical, partage et données structurées Article.

## 5.8 Professionnels

- L’annuaire est mocké dans `ProfessionalsPage.tsx` et `ProProfilePage.tsx`.
- Il manque disponibilité réelle, zone de déplacement, prix/prestations, politique d’annulation, preuve de certification, assurance/statut, langues, avis authentifiés, géolocalisation consentie et signalement.
- La carte 3D doit avoir une alternative accessible et légère sous forme de liste/filtre ; elle ne doit pas être le seul moyen de trouver un Pro.
- Une réservation ne peut pas être présentée comme confirmée tant que la capacité, l’identité du Pro et le paiement ne sont pas enregistrés.

## 5.9 Administration

### Solide

- Métriques serveur, commandes, retours, remboursements, historique des statuts, tickets et permissions sont déjà structurés.
- La séparation admin/superadmin et les contrôles serveur constituent une bonne base.

### À renforcer

- `loadData` termine sur le dernier fetch et peut afficher « loading terminé » alors que les autres requêtes sont encore en cours.
- Les réponses non-2xx sont souvent transformées en JSON sans branche `!res.ok` explicite.
- Les erreurs sont affichées via `alert()`, ce qui est mauvais pour la continuité opérationnelle et l’accessibilité.
- Les transitions de statut sont proposées directement par un select sans confirmation adaptée, motif obligatoire ni visibilité sur les effets stock/email.
- Le remboursement depuis la liste de commandes ne force pas systématiquement une justification et une clé d’idempotence frontend.
- L’onglet Pro est encore fictif comme décrit en B6.
- Aucun outil de gestion du catalogue, des images, des catégories, des INCI, des prix, des stocks, des traductions, des commandes d’achat ou des fournisseurs n’est visible.
- Il manque journal d’activité global, rôles plus fins, export, recherche, pagination et séparation PII/operational data.

---

## 6. Direction artistique, UI et graphisme

### Identité actuelle

La combinaison fond brun-noir (`#050403`), crème (`#FFFDF9`), cuivre (`#C8753D`, `#D49A63`), serif de titre et cartes arrondies crée une signature premium, chaleureuse et éditoriale. Elle est cohérente avec un positionnement de soin, d’expertise et de beauté texturée.

### Risques de cohérence

- Les pages alternent brutalement entre clair et sombre. Le changement est esthétique mais pas toujours signifié comme un thème ; la navigation, le footer, le fond global et les composants peuvent donner une impression de produits assemblés.
- Les interfaces utilisent beaucoup de cartes, bordures et ombres. La hiérarchie visuelle se dilue lorsque tout est présenté comme un bloc premium.
- L’usage récurrent de cuivre pour les CTA, badges, statuts et décoration limite la distinction entre action, information et certification.
- Des textes très petits (`text-[10px]`, `text-[11px]`, `text-xs`) sont fréquents dans des zones essentielles : prix, statut, support, compte et filtres.
- Les titres et labels sont parfois en capitales avec tracking élevé, ce qui réduit la lecture rapide sur mobile.
- Les labels techniques « public.products », « Supabase », « KURLA Fit Score », « IA supervisée », « Photo officielle » doivent sortir de l’expérience client ou être reformulés.
- Les émojis servent de pictogrammes à côté des icônes Lucide ; le mélange peut paraître moins haut de gamme et n’est pas toujours cohérent avec l’accessibilité.

### Images

- Les images Unsplash sont utiles pour prototyper mais insuffisantes pour une marque commerciale : elles ne prouvent ni le produit, ni sa texture, ni le résultat, et leur disponibilité peut varier.
- Une galerie produit doit distinguer explicitement photo produit, texture, usage, résultat, taille et lifestyle. L’étiquette « officiel » doit être réservée à une image contrôlée par la marque.
- Prévoir crops responsives, WebP/AVIF, `width`/`height`, `loading="lazy"` hors LCP, placeholder, alt text éditorial et stratégie de droits.
- Le contenu UGC doit être identifié comme tel, avec consentement et date.

### Système de design recommandé

Formaliser des tokens :

- couleurs de surface, texte, accent, succès, alerte, erreur ;
- ratio de contraste minimum documenté ;
- échelle typographique 12/14/16/20/24/32/48 ;
- rayon, ombre et densité par niveau ;
- composants Button, Badge, Card, Input, Modal, Toast, EmptyState, Skeleton, Tabs, Table, Drawer ;
- variantes light/dark contrôlées par composant ;
- états hover, focus-visible, disabled, loading, error et success.

Le produit gagnerait à utiliser le cuivre comme accent rare et à réserver des couleurs dédiées aux statuts fonctionnels.

---

## 7. Responsive, accessibilité et expérience réelle

### Risques à tester en priorité

- Navbar et drawer panier sur petits écrans, notamment avec clavier virtuel et contenu long.
- Modal de recherche, authentification, réservation, retour et création de ticket sur 320–375 px.
- Tables Admin sur mobile : l’overflow horizontal doit préserver la compréhension des colonnes et des actions.
- Carte 3D sur appareils peu puissants : performance, autonomie, motion sickness et alternative liste.
- Images hautes et vidéos de hero : poids, LCP et données mobiles.

### Défauts d’accessibilité observables dans le code

- Modales sans `role="dialog"`, `aria-modal`, titre lié, focus trap, retour du focus et fermeture Échap visibles dans plusieurs composants.
- Boutons d’icône, fermeture, navigation calendrier et menus avec aria-labels incomplets ou absents.
- Peu de `focus-visible:ring` explicites ; plusieurs inputs utilisent `focus:outline-none` sans anneau de remplacement clair.
- Messages d’action et erreurs non annoncés avec `aria-live`.
- Contrastes probablement insuffisants pour plusieurs textes à opacité 40–60 % sur fond sombre ; audit WCAG automatisé et manuel indispensable.
- Cartes cliquables implémentées avec `div onClick` dans la réservation et le suivi, sans équivalent clavier/sémantique bouton.
- Pas de lien « aller au contenu » visible dans l’inventaire audité.
- États de chargement et états vides pas uniformisés.
- `alt` parfois générique (« Progression ») au lieu de décrire la photo ou d’indiquer qu’elle est décorative.
- Pas de preuve d’un parcours complet au clavier pour les widgets 3D et les listes filtrées.

### Cible minimale

WCAG 2.2 AA sur les parcours : home, diagnostic, boutique, checkout, compte, réservation et support. Ajouter tests axe/Playwright, navigation clavier, zoom 200 %, mode contraste forcé, lecteur d’écran et `prefers-reduced-motion`.

---

## 8. Technique, contrats et intégrations

### Architecture

- Le routeur maison est acceptable pour une maquette mais devient coûteux avec plus de 40 routes/pages. Passer à un routeur maintenu ou isoler clairement le routeur actuel avec tables de routes, loaders et erreurs.
- L’application importe beaucoup de modules dans le bundle initial ; le warning Vite indique un bundle frontend d’environ 1,56 MB. Lazy-load des espaces Admin, Pro, diagnostics avancés, 3D et éditeur.
- Le build serveur CommonJS avec `import.meta.env` produit des warnings et mérite une décision d’architecture : variables serveur via `process.env`, frontend Vite séparé, ou bundle ESM cohérent.
- Les appels fetch sont dispersés dans les pages. Un client API typé réduira les divergences.

### Contrats à corriger

1. **Notification** : `read` serveur vs `isRead` UI.
2. **Préférences** : `emailNotifications / marketingEmails / inAppNotifications` serveur vs quatre noms UI incompatibles.
3. **Produits** : schéma complet attendu par `BoutiquePage` vs mapping Supabase avec defaults/fallback.
4. **Commande** : guest email fictif, retour `/account` protégé, absence d’adresse et de livraison.
5. **Pro** : aucune ressource persistée malgré un parcours UI complet.
6. **Booking** : aucune API de réservation malgré confirmation et prétendu email.
7. **Query params** : liens avec `?category`, `?city` ou `?canceled` sans contrat d’état visible.
8. **Sources de données** : fallback présenté comme source Supabase.

### Supabase

- Les politiques RLS et fonctions sensibles passent des simulations locales, mais cela ne remplace pas deux comptes JWT réels.
- À valider en intégration : création de profil à l’inscription, rôle par défaut, impossibilité de modifier son rôle, lecture isolée des commandes/notifications/tickets, panier et fusion.
- Les `Promise.allSettled` des tables liées au catalogue transforment une erreur brands/categories/images/variants/inventory en réponse partiellement vide. Il faut distinguer « relation vide » de « relation en erreur » et produire une alerte observabilité.
- `getProductBySlugOrIdFromSupabase` construit un filtre `.or(...)` avec une valeur de route non normalisée. Valider strictement le slug ou utiliser des appels `.eq()` séparés.
- Définir migrations, seed de démo séparé, contraintes, index, triggers, RLS et procédure de purge PII.

### Stripe

- Tester réel : création session, succès, annulation, paiement échoué, paiement asynchrone, webhook signé, événement dupliqué, expiration, remboursement partiel/total.
- Configurer `VITE_APP_URL` en production et vérifier que les URLs ne tombent jamais sur localhost.
- Vérifier qu’aucun email, prix, stock ou statut ne dépend d’un champ client non authentifié.
- Ajouter clé d’idempotence persistante et écran de récupération après retour interrompu.

### Email

`emailService.ts` fail-closed en production si le provider console est actif, ce qui est sain. Il faut toutefois valider un vrai fournisseur, les domaines SPF/DKIM/DMARC, les templates, les langues, les retries, les logs sans PII excessive et les liens de désinscription marketing.

### Observabilité

Ajouter :

- Sentry ou équivalent pour frontend/backend ;
- métriques checkout, webhook, stock, IA, emails et réservations ;
- logs structurés avec request ID déjà amorcé ;
- alertes sur taux d’erreur, session Stripe orpheline, stock réservé trop longtemps, email non envoyé ;
- dashboard uptime et runbooks d’incident.

---

## 9. Sécurité, confidentialité et conformité

### Données à considérer comme personnelles ou sensibles

- email, téléphone, nom, pays, âge approximatif ;
- type de cheveux, texture, densité, cuir chevelu, sensibilité et type de peau ;
- photos de progression, UGC, messages support ;
- historique d’achat, retours, préférences marketing ;
- demandes de conseils pouvant évoquer allergie, brûlure, alopécie ou autre problème de santé.

La plateforme doit traiter ces données avec minimisation, finalité, durée de conservation, accès, export et suppression documentés. La simple phrase « non médical » ne dispense pas de cadrer le traitement des données ni les risques de ré-identification.

### Obligations produit à rendre visibles

- pages `/cgv` et `/confidentialite` réellement routées, complètes et accessibles depuis le footer ;
- mentions légales, identité de l’éditeur, contact et médiation ;
- prix TTC, livraison, délai, droit de rétractation et exceptions cosmétiques ;
- consentement distinct pour diagnostic/IA, marketing, photos UGC et email transactionnel ;
- politique de conservation et bouton de suppression/export ;
- registre des sous-traitants et transferts hors UE si applicables ;
- âge minimal/consentement parental pour le module enfant ;
- procédure de retrait de contenu et signalement ;
- wording clair : recommandation cosmétique ≠ diagnostic médical, Pro ≠ professionnel de santé.

### Sécurité applicative

- Vérifier les secrets et variables d’environnement dans CI ; aucune clé serveur dans le bundle.
- Restreindre les redirections et URLs externes ; la validation d’URL du checkout est actuellement permissive avec `startsWith('http')` côté client, même si le serveur est l’autorité.
- Ajouter CSRF si cookies/session utilisés à l’avenir, CSP adaptée, validation MIME/taille pour uploads, anti-abus sur inscription, waitlist, diagnostic, support et réservation.
- Protéger contre l’énumération de comptes, le spam de tickets et l’exfiltration par logs.
- Tester la suppression d’un compte avec commande, tickets, retours, notifications et données IA.

---

## 10. Backlog priorisé

### Bloquant — avant argent réel ou promesse publique

| ID | Action | Preuve d’acceptation |
|---|---|---|
| B-01 | Supprimer l’email guest fictif | Un invité saisit et confirme son vrai email ; aucune commande n’utilise une adresse KURLA par défaut. |
| B-02 | Créer confirmation de commande vérifiée | Un retour Stripe est vérifié serveur ; payé/en attente/échoué sont distincts. |
| B-03 | Ajouter adresse, pays, livraison, taxes et total | Le total final et les obligations de livraison sont visibles avant paiement. |
| B-04 | Générer et réutiliser une idempotency key frontend | Double clic/retry ne crée ni double session ni double commande. |
| B-05 | Brancher Stripe webhook réel | Paiement, échec, expiration et remboursement sont testés avec événements signés. |
| B-06 | Remplacer la réservation visio simulée | Une réservation crée un enregistrement, vérifie une disponibilité et déclenche une confirmation réelle ; sinon wording prototype. |
| B-07 | Persister candidature et certification Pro | Une candidature créée est visible à l’admin et son statut est audité/notifié. |
| B-08 | Supprimer le fallback de démonstration en production | Une panne catalogue affiche une erreur exploitable, jamais des produits fictifs. |
| B-09 | Rendre CGV/confidentialité accessibles | Les routes affichent leurs documents réels et sont liées depuis chaque tunnel. |
| B-10 | Valider Supabase réel avec JWT | Les 17 contrôles Phase 2 passent contre un projet configuré. |

### P0 — confiance, conversion et qualité de service

| ID | Action |
|---|---|
| P0-01 | Corriger le contrat `read` / `isRead`. |
| P0-02 | Unifier les préférences de notifications et respecter les préférences marketing. |
| P0-03 | Implémenter/fonder le filtre « compatible avec mon KURLA ID ». |
| P0-04 | Remplacer le score KURLA Fit artificiel par un calcul explicable ou le supprimer. |
| P0-05 | Rendre le stock produit conditionnel à `inStock` et afficher la quantité/délai vérifiés. |
| P0-06 | Créer un client API typé avec erreurs, retry et loading/empty/error states. |
| P0-07 | Ajouter 404, slugs inconnus, routes légales et query params centralisés. |
| P0-08 | Fusionner panier invité et panier utilisateur à la connexion. |
| P0-09 | Remplacer les images Unsplash produit par assets contrôlés et droits documentés. |
| P0-10 | Ajouter consentements IA, photo, marketing et conservation/suppression. |
| P0-11 | Afficher un badge clair « démo/bêta » partout où les données ne sont pas réelles. |
| P0-12 | Ajouter logs et alertes Stripe, email, stock, IA et erreurs frontend. |
| P0-13 | Ajouter focus management, aria-live, focus-visible et clavier sur toutes les modales. |
| P0-14 | Réduire les textes techniques dans l’interface client. |
| P0-15 | Remplacer les `alert()` Admin par toast/dialogue accessible et journalisé. |

### P1 — MVP commercial durable

| ID | Action |
|---|---|
| P1-01 | Vraies variantes, SKU, prix, inventaire et images par variante. |
| P1-02 | Vraies reviews vérifiées et questions/réponses produit. |
| P1-03 | Retours par ligne/quantité avec éligibilité et statut lisible. |
| P1-04 | Page de suivi colis, transporteurs, pays et emails localisés. |
| P1-05 | Persistance KURLA ID, routines, journal, favoris et résultats IA. |
| P1-06 | Recherche indexée produit/article/Pro, pagination et facettes. |
| P1-07 | CMS éditorial avec auteur, sources, dates et workflow de relecture. |
| P1-08 | Système Pro : profil, prestations, tarifs, disponibilité, booking, avis et payout. |
| P1-09 | Modération UGC et consentement rétractable. |
| P1-10 | Back-office catalogue, contenu, utilisateurs, rôles et audit complet. |
| P1-11 | Tests E2E Playwright des parcours critiques. |
| P1-12 | Découpage bundle et lazy loading des espaces lourds. |

### P2 — amélioration structurante

- Routeur déclaratif et data loaders.
- Internationalisation FR/EN puis marchés prioritaires.
- Multi-devise, TVA et moyens de paiement locaux.
- Liste Pro accessible alternative à la carte 3D.
- Système de design publié et Storybook.
- Rappels de routine avec timezone, notifications et calendrier.
- Export de données et suppression self-service.
- Programme fidélité, abonnements et réassort.
- Tests de charge API et chaos tests webhook.
- Centre de statut public et pages d’incident.

### Premium / world-class

- Profil beauté vivant avec consentement : changements de texture perçus, saisonnalité, historique de tests et préférences sensorielles.
- Recommandation hybride combinant règles explicables, données catalogue, retours utilisateurs et IA supervisée.
- Recherche visuelle de texture et journal photo avec comparaison contrôlée, sans promesse de résultat médical.
- Moteur de compatibilité ingrédients/contraintes avec allergènes, parfum, grossesse/allaitement uniquement avec wording prudent et sources.
- Marketplace Pro avec réservation, acompte, annulation, avis authentifiés, matching géographique et qualité.
- Localisation internationale pilotée par disponibilité produit, livraison, réglementation, langue et habitudes capillaires.
- Programme d’éducation certifiée pour Pros avec formation, renouvellement et preuve publique.
- Recommandations de routine adaptatives basées sur les retours « ça a marché / ça n’a pas marché ».
- Trust center public : provenance des images, méthodologie des scores, modération, charte et sécurité.

---

## 11. Roadmap proposée

### Phase 0 — 0 à 2 semaines : sécuriser la vérité produit

1. Décider ce qui est réellement vendu et ce qui est seulement bêta.
2. Ajouter un mode `DEMO` visible et supprimer tout fallback silencieux en production.
3. Corriger routes légales, 404, sources, labels techniques et données fictives affichées.
4. Fermer le parcours checkout : email réel, adresse, livraison, confirmation serveur et idempotence.
5. Exécuter intégration Supabase réelle avec deux comptes et RLS.
6. Corriger les contrats notifications/préférences.
7. Remplacer la réservation visio par une demande non payante clairement étiquetée si le backend n’est pas prêt.

### Phase 1 — 2 à 6 semaines : MVP commercial

1. Catalogue production avec assets, variantes, prix, stock et INCI validés.
2. Stripe live/test complet avec webhook, emails et suivi de commande.
3. Compte client fiable : commandes, retours par ligne, tickets et préférences.
4. Consentement et gestion des données de diagnostic/IA.
5. Tests E2E mobile et desktop sur les parcours acquisition → diagnostic → recommandation → achat.
6. Monitoring, alertes, runbooks et support opérable.

### Phase 2 — 6 à 12 semaines : différenciation KURLA

1. KURLA ID persistant et explicable.
2. Routine adaptative, journal et favoris multi-appareils.
3. Reviews vérifiées, UGC modéré et contenu éditorial fiable.
4. Système Pro persistant : candidature, certification, profil, calendrier et réservation.
5. Back-office catalogue et certification.
6. Performance bundle, images, SEO et accessibilité WCAG AA.

### Phase 3 — 3 à 6 mois : niveau international

1. FR/EN, devises, TVA, transporteurs et moyens de paiement par marché.
2. Catalogue multi-pays et restrictions réglementaires.
3. Place de marché Pro multi-villes avec qualité et assurance.
4. Trust center, transparence IA et gouvernance de données.
5. Recommandation personnalisée mesurée par rétention, satisfaction, conversion et taux de retour — jamais par un score décoratif.

---

## 12. KPIs à mettre en place

### Activation

- taux diagnostic commencé → terminé ;
- délai jusqu’à la première recommandation utile ;
- création de KURLA ID ;
- taux de première routine ajoutée ;
- taux d’opt-in correctement consenti.

### Commerce

- conversion fiche produit → panier ;
- panier → checkout ;
- checkout → paiement confirmé ;
- taux d’échec Stripe ;
- AOV, marge, coût de livraison, taux de retour ;
- disponibilité et commandes annulées pour stock.

### Confiance / qualité

- taux d’erreur API ;
- webhook traité dans les délais ;
- email délivré ;
- tickets résolus au premier contact ;
- avis vérifiés ;
- taux de recommandation IA signalée/rectifiée ;
- suppression/export de données traité dans le délai prévu.

### Pro

- candidature → validation ;
- temps de revue ;
- profil vu → demande ;
- réservation honorée, annulation, no-show ;
- satisfaction client et respect de la charte.

---

## 13. Checklist de validation avant annonce publique

- [ ] Un invité peut payer avec son vrai email et retrouver sa commande.
- [ ] Les frais, taxes, livraison, délais et retours sont visibles avant paiement.
- [ ] Une session Stripe réussie n’est confirmée qu’après vérification serveur/webhook.
- [ ] Aucune image, review, certification, réservation ou statistique fictive n’est présentée comme réelle.
- [ ] Supabase réel, RLS réel et deux rôles admin sont testés.
- [ ] Les données de diagnostic, photos et IA disposent d’un consentement, d’une durée et d’une suppression.
- [ ] `/cgv`, `/confidentialite`, mentions légales et médiation fonctionnent.
- [ ] Le catalogue vide ou indisponible n’affiche pas les mocks en production.
- [ ] Les notifications et préférences ont un contrat unique et testé.
- [ ] Les parcours mobile, clavier, lecteur d’écran et zoom sont validés.
- [ ] Les pages inconnues renvoient une vraie 404.
- [ ] Les erreurs sont compréhensibles par le client et observables par l’équipe.
- [ ] Le support sait traiter une commande en attente webhook, un paiement échoué, un retour, un remboursement et une commande invité.
- [ ] Les Pros et leurs certifications sont persistés, vérifiables et administrables.

---

## Conclusion

KURLA a le potentiel d’une **marque-produit spécialisée**, pas seulement d’une boutique : le diagnostic, la routine, le contenu, les experts et la communauté peuvent créer une boucle de confiance difficile à copier. Pour atteindre un standard mondial, il faut maintenant réduire la largeur fonctionnelle visible, choisir un MVP honnête et rendre chaque promesse vérifiable.

La priorité n’est pas d’ajouter davantage de modules. Elle est de transformer les écrans déjà présents en **boucles complètes, persistantes et fiables** : comprendre → recommander → acheter → recevoir → observer → ajuster, avec un humain disponible lorsque l’IA ou le sujet l’exige.

**Ordre d’exécution recommandé : vérité des données → paiement/livraison → compte/support → conformité → Pro réel → personnalisation avancée → internationalisation.**
