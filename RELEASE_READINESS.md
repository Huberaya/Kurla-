# KURLA BEAUTY - DOCUMENT DE PRÉPARATION AU LANCEMENT (RELEASE READINESS)

> **Statut global :** Chantiers 1 à 6 implémentés au niveau du code et des tests locaux ; intégration Supabase/Stripe réelle encore à exécuter. L'application reste en pré-production.
> **Avertissement de conformité :** Les tests locaux ne suffisent pas à déclarer l'application prête pour la production commerciale. Les tests réels Supabase A/B, les migrations réelles, la rotation des secrets exposés, la validation Stripe, l'activation des providers de production et la validation juridique restent obligatoires.

---

## 1. Fonctionnalités Terminées (Chantiers 1 à 6)

### Backend & Persistance (Supabase)
- **Modèle de données relationnel complet** : Tables Supabase configurées (`profiles`, `products`, `orders`, `order_items`, `carts`, `cart_items`, `payments`, `inventory`, `stripe_events`, `shipping_shipments`, `user_notifications`, `notification_preferences`, `return_requests`, `customer_support_tickets`, `customer_support_messages`, `order_status_history`).
- **Sécurisation RLS (Row Level Security)** : Isolement strict des profils utilisateur (`auth.uid() = id`), des commandes (`auth.uid() = user_id`), des paniers, notifications et tickets support.
- **Fonctions SQL sécurisées (`SECURITY DEFINER`)** : `public.is_admin()` et `public.get_current_user_role()` sécurisées avec `SET search_path = public` et restriction d'exécution pour contrer toute élévation de privilèges.
- **Empêchement de modification de rôle par le client** : La politique `WITH CHECK` interdit à un utilisateur standard de modifier son rôle en `admin`.

### Catalogue Produit & Prix Côté Serveur
- **Vérification autoritaire des prix** : Calcul et imposition des prix issus de la base de données Supabase au moment de la création de la commande (rejet strict de tout prix falsifié envoyé par le client).
- **Gestion atomique des stocks** :
  - Réservation temporaire de la quantité lors de l'initiation de la commande (`payment_pending_webhook`).
  - Déduction définitive du stock physique au paiement confirmé (`paid`).
  - Libération automatique du stock réservé en cas d'échec de paiement ou d'expiration de session Stripe (`payment_failed`).
  - Restauration automatique et unique du stock en cas de remboursement validé (`refunded`).

### Webhooks Stripe & Idempotence
- **Support des Webhooks Stripe** : Route `/api/stripe/webhook` traitant les événements `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed` et `charge.refunded`.
- **Table d'Idempotence `stripe_events`** : Enregistrement et vérification de chaque ID d'événement Stripe pour empêcher tout double traitement de commande ou de déstockage.

### Operations, Suivi Colis & Support Client
- **Espace Client Rôle `Customer`** : Vue d'historique de commandes, suivi transporteur en temps réel, demande de retour produit, messagerie avec le support, gestion des préférences de notification et profil capillaire.
- **Tableau de Bord Administrateur (`/admin`)** :
  - Suivi des métriques commerciales réelles directement issues de Supabase (chiffre d'affaires, panier moyen, total commandes, état des stocks).
  - Gestion du cycle de vie des commandes (`pending` -> `processing` -> `packed` -> `shipped` -> `delivered` / `refunded`).
  - Saisie obligatoire par l'administrateur du vrai transporteur et du vrai numéro de suivi pour la génération d'URL de suivi légitimes.
  - Modération et validation des demandes de retours clients avec déclenchement automatique de remboursement Stripe test.
  - Support client intégré avec fil de conversation bidirectionnel et mise à jour des statuts de ticket (`open` -> `in_progress` -> `resolved`).

### Performance & Accessibilité Frontend
- **Interface Réactive & Mobile-First** : Adaptée aux smartphones, tablettes et ordinateurs.
- **Accessibilité & Mouvement Réduit** : Prise en charge de la directive CSS `@media (prefers-reduced-motion: reduce)` désactivant les animations pour les utilisateurs ayant configuré la préférence de réduction de mouvement.

---

## 2. Fonctionnalités en Mode Développement (Stubs & Fallbacks)

1. **Fournisseur d'Emails (`EMAIL_PROVIDER=console`)** :
   - Les notifications transactionnelles sont actuellement écrites dans la console serveur sous l'étiquette `[EMAIL PROVIDER: CONSOLE] MODE DÉVELOPPEMENT`.
2. **Fournisseur de Transport (`SHIPPING_PROVIDER=manual`)** :
   - Pas d'intégration directe avec les API d'étiquetage Colissimo / Chronopost en arrière-plan. L'administrateur doit saisir manuellement le nom du transporteur et le numéro de suivi réel.
3. **Moteur Stripe (Mode Test)** :
   - Intégration fonctionnelle en mode test Stripe (`sk_test_...` / `pk_test_...`). Les paiements ne sont pas prélevés sur des cartes bancaires réelles.
4. **Données de Démonstration Produit** :
   - Les produits de la boutique sont initialisés à partir d'un catalogue d'illustration (tagués comme `(Démo)` / `Visuals illustrative`).

---

## 3. Variables d'Environnement Manquantes / Requises pour la Production

| Variable | Usage | Statut Actuel | Statut Production Requis |
|---|---|---|---|
| `PORT` | Port d'écoute du serveur Cloud Run | Par défaut `3000` (`process.env.PORT \|\| 3000`) | Géré automatiquement par Cloud Run |
| `NODE_ENV` | Mode d'exécution | `development` / `production` | Définir sur `production` |
| `SUPABASE_URL` | URL de l'instance Supabase | À renseigner dans l'environnement | Requis |
| `SUPABASE_ANON_KEY` | Clé publique anonyme Supabase | À renseigner dans l'environnement | Requis (Frontend) |
| `SUPABASE_SECRET_KEY` | Clé secrète d'administration Supabase | Non présente dans ce clone (volontairement) | Requis côté serveur ; le démarrage production échoue sans elle |
| `STRIPE_SECRET_KEY` | Clé API secrète Stripe | Clé de test (`sk_test_...`) | Clé de production (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature des webhooks Stripe | Optionnel en dev test (`STRIPE_WEBHOOK_ENABLED=false`) | Requis avec `STRIPE_WEBHOOK_ENABLED=true` |
| `STRIPE_WEBHOOK_ENABLED` | Activation de la vérification stricte | `false` ou simulation | Définir sur `true` |
| `GEMINI_API_KEY` | Assistant IA Beauté KURLA | Renseigné en dev (Côté serveur uniquement) | Requis (Côté serveur - JAMAIS dans le frontend) |
| `EMAIL_PROVIDER` | Service d'envoi d'emails transactionnels | `console` | `sendgrid`, `resend` ou `postmark` |
| `EMAIL_PROVIDER_API_KEY` | Clé API du service email | Non renseigné | Requis pour le provider choisi |
| `EMAIL_FROM` | Adresse d'expédition des emails | `no-reply@kurla-beauty.com` | Requis avec domaine vérifié (DKIM/SPF) |
| `SHIPPING_PROVIDER` | Service d'expédition transporteur | `manual` | API Colissimo / Boxtal / Sendcloud |

---

## 4. Services Externes Nécessaires au Déploiement

1. **Supabase Cloud Project** (Base de données PostgreSQL + Supabase Auth).
2. **Compte Stripe Produit Validé** (Accès aux clés de production `sk_live_...` et activation du Webhook Endpoint).
3. **Fournisseur d'Emailing Transactionnel** (Compte Resend, SendGrid ou Postmark avec domaines d'envoi validés SPF/DKIM/DMARC pour `kurla-beauty.com`).
4. **Google Cloud Run** pour l'hébergement du conteneur Node.js / Express.
5. **Transporteur / Agrégateur de livraison** (Accès compte professionnel La Poste Colissimo / Mondial Relay).

---

## 5. Risques Identifiés

1. **Sécurité des Clés API (Passage en Production)** :
   - *Risque* : Exposition accidentelle d'une clé privée (`SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `GEMINI_API_KEY`) si elle venait à être préfixée par `VITE_`.
   - *Contrôle effectué* : L'audit de build a confirmé qu'aucune clé secrète ne réside dans le bundle statique `dist/assets/`.
2. **Non-déclenchement des Webhooks Stripe** :
   - *Risque* : Si l'URL du Webhook Stripe n'est pas configurée correctement dans le dashboard Stripe de production, les commandes resteront en statut `payment_pending_webhook` et le stock ne sera pas déduit définitivement.
3. **Nom de domaine Email non authentifié** :
   - *Risque* : Si `EMAIL_PROVIDER` est activé sans enregistrements DNS SPF/DKIM appropriés, les emails de confirmation iront dans les spams des clients.
4. **Remboursements Doubles** :
   - *Contrôle implémenté* : les remboursements Stripe utilisent une clé d’idempotence, un identifiant Stripe unique et une fonction PostgreSQL atomique (`finalize_refund`).
   - *Restauration du stock* : elle est appliquée une seule fois par ligne de remboursement, avec suivi `stock_restored` et prise en charge des remboursements partiels.
   - *Validation restante* : exécuter le flux sur un compte Stripe test et vérifier les webhooks réels après application de la migration.

---

## 6. Synthèse des Tests Effectués

Les vérifications locales ont été exécutées via `npm test`, `npm run lint` et `npm run build`. Les tests HTTP négatifs sont dans `tests/authorization.test.ts`. Le test d'intégration Supabase réel est séparé et se lance avec `npm run test:integration` lorsqu'un projet de test et ses secrets sont fournis :

- **Phase 1 & Phase 2 (BDD, Authentification, RLS & Rôles)** : vérifications locales de structure et simulations disponibles. La validation Supabase réelle A/B est explicitement séparée et reste à exécuter.
- **Autorisation HTTP négative** : tests ajoutés et exécutés ; les headers identitaires/admin forgés et les tokens invalides ne donnent pas accès aux routes privées.
- **Chantier 3 — Panier & Commandes Persistantes** : panier normalisé et validé côté serveur, remplacement atomique via `replace_cart`, RLS stricte sur `carts`/`cart_items`, réservation de stock sous verrous PostgreSQL, déduplication des lignes et idempotence du checkout.
- **Phase 3** : contrôles locaux réussis ; la persistance Supabase réelle dépend de l'application de `20260828000000_cart_order_integrity.sql` et d'un projet configuré.
- **Phase 4** : 7/7 contrôles locaux réussis sur les webhooks Stripe, les transitions tardives, l’idempotence et le stock.
- **Chantier 5 — opérations métier et administration** : 24/24 contrôles locaux réussis ; UUID opérationnels compatibles avec Supabase, expédition unique par commande, retours liés au propriétaire et aux quantités commandées, isolation support/notifications, et métriques basées sur une seule source avec revenu net après remboursements.
- **Chantier 6 — durcissement production** : tests locaux dédiés réussis ; en-têtes de sécurité, corrélation `X-Request-Id`, limites de payload, rate limiting API, CORS explicite, erreurs publiques sans détails internes, arrêt gracieux, configuration de démarrage stricte et fournisseurs email/Stripe avec timeouts bornés.
- **Chantier 2 — remboursements** : l’appel `stripe.refunds.create` utilise une clé d’idempotence ; la migration `20260827000000_refund_integrity.sql` ajoute le ledger, les contraintes d’unicité, la restauration atomique du stock et la réservation atomique des webhooks.
- **Migrations** : les migrations explicites `20260826000000_harden_existing_schema.sql`, `20260827000000_refund_integrity.sql`, `20260828000000_cart_order_integrity.sql` et `20260829000000_operations_integrity.sql` sont contrôlées statiquement par la suite locale. Elles doivent encore être appliquées sur la base réelle.
- **Audits Build & Linting** :
  - `npm run lint` (`tsc --noEmit`) : 0 erreur de typage.
  - `npm run build` : compilation réussie (`dist/server.cjs` et `dist/index.html`).
  - le runtime de production doit être Node.js 22+ (requis par la version actuelle de `@supabase/supabase-js`) ; l'avertissement `import.meta` du bundle CommonJS et la taille du bundle restent à traiter séparément.

---

## 7. Suivi du chantier 1 — identité et permissions

Les contrôles locaux du chantier 1 sont réalisés ; les validations externes ci-dessous restent ouvertes et seront reprises dans la liste finale de sortie :

- [x] Les routes privées vérifient un access token Supabase avec `auth.getUser(token)`.
- [x] Les headers `x-user-id`, `x-user-email` et `x-admin-key` ne sont pas utilisés pour autoriser une requête.
- [x] Le rôle administrateur est lu depuis `public.profiles` côté serveur.
- [x] Les contrôles de propriété couvrent commandes, expéditions, retours, tickets, messages et notifications.
- [x] Les mots de passe et clés admin codés en dur ont été supprimés du code courant.
- [x] Le démarrage en `NODE_ENV=production` est bloqué sans `SUPABASE_URL` et clé secrète serveur.
- [x] Une migration d'évolution explicite existe : `supabase/migrations/20260826000000_harden_existing_schema.sql`.
- [x] Les écritures critiques refusent désormais les erreurs Supabase au lieu de retourner un succès simulé.
- [x] Les tests HTTP négatifs locaux sont exécutés via `npm run test:authorization`.
- [ ] Les migrations doivent être appliquées et vérifiées sur le projet Supabase réel.
- [ ] Le test réel avec deux comptes Supabase, deux JWT et un compte admin doit réussir via `npm run test:integration`.
- [ ] Les anciennes clés éventuellement exposées doivent être révoquées et remplacées dans Supabase, GitHub et l'hébergeur.

### Chantier 2 — Remboursements et idempotence

- [x] L’appel de remboursement réel passe par le SDK Stripe côté serveur.
- [x] Une clé d’idempotence est transmise à Stripe et conservée dans le ledger.
- [x] Les remboursements partiels sont limités aux quantités de la demande de retour.
- [x] La restauration du stock est atomique côté PostgreSQL et protégée contre les doubles traitements.
- [x] Les événements Stripe sont réclamés atomiquement avant toute mutation métier.
- [ ] Le flux doit être exécuté avec un compte Stripe test et un projet Supabase réellement migré.

### Chantier 3 — Panier et commandes persistantes

- [x] Les lignes de panier sont normalisées, regroupées et validées côté serveur.
- [x] Un seul panier canonique est conservé par utilisateur ou identifiant invité.
- [x] Le remplacement du panier est atomique via `replace_cart`.
- [x] Les politiques RLS des paniers et lignes de panier sont strictes.
- [x] La réservation de stock de commande est réalisée sous verrous PostgreSQL.
- [x] La création du checkout accepte une clé d’idempotence et réutilise une session existante.
- [x] Les paiements initiaux ne sont plus dupliqués lors d’une mise à jour de session.
- [ ] Appliquer la migration et vérifier les scénarios de concurrence sur une base Supabase réelle.

### Chantier 4 — Paiements Stripe et webhooks

- [x] Les montants et devises reçus dans les événements de paiement sont vérifiés strictement.
- [x] Un événement de paiement déjà traité ou en cours ne peut pas déduire le stock une seconde fois.
- [x] Les confirmations multiples d’un même paiement n’ajoutent pas de lignes de paiement en double.
- [x] Une expiration ou un échec tardif ne peut pas annuler une commande déjà payée.
- [x] Les événements incompatibles sont rejetés et enregistrés comme erreurs retryables.
- [ ] Vérifier les signatures, statuts et retries avec de vrais événements Stripe test.

### Chantier 5 — Opérations métier et administration

- [x] Les IDs générés pour notifications, historique, retours, tickets, messages et expéditions sont des UUID valides.
- [x] Une migration déduplique les expéditions existantes, conserve leurs événements de suivi et impose l’unicité de `shipments.order_id`.
- [x] La mise à jour d’un retour admin relit la ligne Supabase même si elle n’est pas présente dans le cache mémoire.
- [x] Les caches mémoire sont alimentés après confirmation des écritures Supabase pour les opérations couvertes.
- [x] Les retours vérifient le propriétaire de la commande, son statut, les lignes commandées et les quantités déjà demandées.
- [x] Les routes client/admin conservent l’isolation des commandes, retours, expéditions, notifications et tickets support.
- [x] Les métriques admin utilisent exclusivement la source configurée et exposent le revenu brut et net après remboursements confirmés.
- [x] Les tests locaux Phase 5 couvrent 24 scénarios.
- [ ] Appliquer `20260829000000_operations_integrity.sql` et rejouer les tests avec Supabase réel.

### Chantier 6 — Durcissement production

- [x] Les réponses n’exposent plus le fingerprint Express et incluent des en-têtes de sécurité essentiels.
- [x] Les requêtes disposent d’un identifiant de corrélation `X-Request-Id` ; les erreurs serveur sont journalisées en JSON sans être renvoyées au client.
- [x] Les payloads JSON et webhooks ont des limites explicites ; les JSON invalides renvoient HTTP 400 et les payloads trop volumineux HTTP 413.
- [x] Les API, le checkout et les endpoints IA disposent d’un rate limit borné ; un rate limit partagé edge reste requis en multi-instance.
- [x] Le CORS est fermé par défaut et n’autorise que la liste `CORS_ORIGIN` explicitement configurée.
- [x] Le serveur refuse la configuration production sans Supabase, Stripe/webhook, URL HTTPS et fournisseur email réel.
- [x] `EMAIL_PROVIDER=console` est refusé en production ; Resend, SendGrid et Postmark sont implémentés avec timeout.
- [x] Stripe utilise un timeout réseau et un nombre de retries bornés ; l’arrêt SIGTERM/SIGINT est gracieux.
- [x] Les tests dédiés de durcissement couvrent les headers, IDs de requête, limites, rate limit et fermeture email.
- [ ] Vérifier la configuration et le rate limiting partagé sur l’infrastructure réelle.

Le code ne peut pas révoquer une clé dans un compte Supabase ou un hébergeur externe. Cette action doit être effectuée par le propriétaire des comptes avant la mise en production.

## 8. Étapes Requises Avant la Mise en Production Commerciale

1. **Configuration du Compte Stripe de Production** :
   - Passer le compte Stripe en mode Live.
   - Copier les clés `sk_live_...` et `pk_live_...` dans les variables d'environnement de production.
   - Déclarer le Webhook Endpoint officiel `https://<DOMAINE_PRODUCTION>/api/stripe/webhook` dans le tableau de bord Stripe avec les événements `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`.
   - Passer `STRIPE_WEBHOOK_ENABLED=true` et renseigner `STRIPE_WEBHOOK_SECRET`.
2. **Configuration du Fournisseur d'Email (Resend / SendGrid / Postmark)** :
   - Choisir et configurer le compte email transactionnel.
   - Activer `EMAIL_PROVIDER=resend` (ou provider choisi) et définir `EMAIL_PROVIDER_API_KEY`.
   - Valider le domaine d'envoi (`kurla-beauty.com`) avec les clés DKIM/SPF/DMARC.
3. **Tests Réels de Bout en Bout (Live End-to-End Test)** :
   - Effectuer une vraie commande avec une vraie carte bancaire sur le domaine de production (montant réel 1 € par exemple).
   - Vérifier la réception effective de l'email de confirmation dans la boîte de réception du client.
   - Exécuter un vrai remboursement depuis le tableau de bord administrateur et vérifier le re-crédit sur la carte bancaire.
4. **Configuration du Nom de Domaine & SSL** :
   - Configurer le domaine DNS officiel vers Cloud Run avec certificat SSL/TLS valide.

---

## 9. Éléments Nécessitant une Validation Humaine ou Juridique

1. **Conditions Générales de Vente (CGV) & Politiques de Retour** :
   - Validation du délai légal de rétractation (14 jours en UE) et des conditions d'hygiène applicables aux produits cosmétiques scellés/ouverts.
2. **Conformité RGPD & Politique de Confidentialité** :
   - Information des utilisateurs concernant le traitement de leurs données personnelles (profils capillaires, historiques de commandes).
   - Validation de la bannière d'acceptation et de la conservation des consentements.
3. **Mentions Légales & SIREN / TVA Intracommunautaire** :
   - Saisie des informations légales de l'entreprise (raison sociale, capital social, numéro de TVA intracommunautaire, hébergeur).
4. **Conformité des Produits Cosmétiques & Ingrédients (INCI)** :
   - Validation de la conformité des listes d'ingrédients INCI affichées sur les fiches produits par rapport au dossier d'information produit (DIP) européen.
