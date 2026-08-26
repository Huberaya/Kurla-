# KURLA BEAUTY - DOCUMENT DE PRÉPARATION AU LANCEMENT (RELEASE READINESS)

> **Statut global :** Pré-production avec backend Supabase validé en environnement de test.  
> **Avertissement de conformité :** Bien que l'ensemble des modules (Phases 1 à 5) soient développés et passent avec succès les suites de tests automatiques et d'intégration, **l'application ne doit pas être déclarée immédiatement prête pour la production commerciale** avant la réalisation des tests réels avec des comptes bancaires Stripe réels, l'activation des providers email/transporteur de production, et la validation juridique obligatoire.

---

## 1. Fonctionnalités Terminées (Phases 1 à 5)

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
| `SUPABASE_URL` | URL de l'instance Supabase | Renseigné en dev | Requis |
| `SUPABASE_ANON_KEY` | Clé publique anonyme Supabase | Renseigné en dev | Requis (Frontend) |
| `SUPABASE_SECRET_KEY` | Clé secrète d'administration Supabase | Renseigné en dev (Côté serveur uniquement) | Requis (Côté serveur - JAMAIS dans le frontend) |
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
   - *Risque* : Risque de ré-créditer du stock plusieurs fois si un administrateur clique à répétition sur le bouton de remboursement.
   - *Contrôle effectué* : L'API d'état bloque les transactions secondaires sur une commande déjà passée en statut `refunded`.

---

## 6. Synthèse des Tests Effectués

L'ensemble des suites de tests automatiques et d'intégration a été exécuté via `npm test` (`tests/supabase.test.ts` et `tests/phase5_operations.test.ts`) et `npm run lint` / `npm run build` :

- **Phase 1 & Phase 2 (BDD, Authentification, RLS & Rôles)** : 6/6 PASS.
  - Validation du schéma de tables et des triggers.
  - Isolement RLS validé entre les comptes utilisateur (Compte A vs Compte B).
  - Interdiction de modification du rôle par le client.
  - Audit des privilèges `SECURITY DEFINER` et `search_path = public` : 0 vulnérabilité détectée.
- **Phase 3 (Panier & Commandes Persistantes)** : 5/5 PASS.
  - Persistance du panier Supabase.
  - Imposition stricte des prix serveur.
  - Rejet des commandes de stock supérieur au stock physique disponible.
- **Phase 4 (Stripe Webhook & Réservation Atomique de Stock)** : 6/6 PASS.
  - Réservation à l'initiation, déduction au paiement `paid`.
  - Libération en cas d'échec de paiement / expiration.
  - Restauration de stock unique sur remboursement.
  - Test d'idempotence des webhooks Stripe via `stripe_events`.
- **Phase 5 (Opérations, Dashboard Commercial, Suivi Colis, Retours & Tickets Support)** : 20/20 PASS.
  - Cycle de vie complet des statuts de commande.
  - Envoi de notifications in-app et logs d'emails transactionnels.
  - Suivi transporteur manuel et génération d'URL de suivi réelles.
  - Flux de demande de retour client et modération admin avec émission de remboursement.
  - Fil de discussion support client avec clôture et isolation inter-utilisateurs.
  - Calcul des métriques financières et opérationnelles à partir de la base de données.
- **Audits Build & Linting** :
  - `npm run lint` (`tsc --noEmit`) : 0 erreur de typage.
  - `npm run build` : Compilation réussie (`dist/server.cjs` et `dist/index.html`).
  - Absence vérifiée des clés secrètes dans `dist/assets`.

---

## 7. Étapes Requis Avant la Mise en Production Commerciale

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

## 8. Éléments Nécessitant une Validation Humaine ou Juridique

1. **Conditions Générales de Vente (CGV) & Politiques de Retour** :
   - Validation du délai légal de rétractation (14 jours en UE) et des conditions d'hygiène applicables aux produits cosmétiques scellés/ouverts.
2. **Conformité RGPD & Politique de Confidentialité** :
   - Information des utilisateurs concernant le traitement de leurs données personnelles (profils capillaires, historiques de commandes).
   - Validation de la bannière d'acceptation et de la conservation des consentements.
3. **Mentions Légales & SIREN / TVA Intracommunautaire** :
   - Saisie des informations légales de l'entreprise (raison sociale, capital social, numéro de TVA intracommunautaire, hébergeur).
4. **Conformité des Produits Cosmétiques & Ingrédients (INCI)** :
   - Validation de la conformité des listes d'ingrédients INCI affichées sur les fiches produits par rapport au dossier d'information produit (DIP) européen.
