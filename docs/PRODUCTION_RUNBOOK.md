# KURLA — runbook production P0

Ce document décrit les contrôles qui doivent être exécutés avant, pendant et après une mise en production. Les valeurs de secrets ne doivent jamais être écrites dans le dépôt, les logs ou une issue.

## 1. Garde-fous de livraison

La CI `.github/workflows/production-safety.yml` est bloquante sur `main` et les pull requests :

- Node.js 22 ;
- dépendances verrouillées (`npm ci`) ;
- TypeScript (`npm run lint`) ;
- inventaires de routes critiques ;
- tests Growth Control Center et funnel ;
- build Vercel (`npm run build`) ;
- après un push sur `main`, vérification de l'alias `https://kurlabeauty.vercel.app` avec le SHA GitHub attendu.

Déploiement manuel contrôlé :

```bash
export KURLA_PROD_URL=https://kurlabeauty.vercel.app
node scripts/verifier-deploiement.mjs --url "$KURLA_PROD_URL" --sha "$GIT_SHA" --attente 240
```

La commande ne retourne `0` qu'après confirmation du commit par `/api/health`, puis sondage des endpoints critiques. Un `READY` Vercel seul ne constitue pas un succès.

## 2. Observabilité et erreurs

Le serveur conserve un `requestId` dans `X-Request-Id`, les logs structurés et la réponse d'erreur. Sentry est intégré de façon optionnelle et sans données personnelles par défaut :

- serveur : `SENTRY_DSN`, `SENTRY_ENVIRONMENT` ;
- navigateur : `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_RELEASE`.

Configurer les DSN dans le gestionnaire de variables Vercel, jamais dans `.env`, Git ou une commande enregistrée. Créer au minimum les alertes suivantes dans le fournisseur :

1. une alerte immédiate sur les erreurs serveur non résolues ;
2. une alerte sur une hausse anormale des erreurs par release ;
3. une alerte sur absence de signal ou health check non `200`.

Le DSN n'est pas une clé secrète d'accès à l'application, mais il doit tout de même rester géré par l'environnement. `sendDefaultPii` est désactivé et aucun token ou contenu de requête n'est ajouté aux événements.

En complément, `.github/workflows/production-monitor.yml` exécute la sonde stricte toutes les 15 minutes. Un endpoint critique en erreur, ou un silence non expliqué, fait échouer le workflow et déclenche les notifications GitHub configurées pour le dépôt.

## 3. Health check et sonde

`GET /api/health` doit répondre `200` en production et expose l'état des dépendances critiques, le nombre de produits, le SHA servi et l'identifiant de déploiement. Toute modification qui rend le store, l'URL HTTPS de l'application ou le fournisseur email réel indisponible doit empêcher le démarrage production ou dégrader le health check en erreur.

Sonde complète :

```bash
node scripts/probe-production.mjs --url https://kurlabeauty.vercel.app
```

Un état vide explicitement expliqué n'est pas un silence. Les tests de funnel doivent utiliser un identifiant marqué smoke, vérifier la persistance, puis supprimer la donnée immédiatement ; aucune donnée de test ne doit rester dans les métriques.

## 4. Incident et rollback

1. Capturer l'heure, le SHA déployé, l'URL, le `requestId` et l'erreur Sentry/log ; ne pas copier de token ni de donnée client.
2. Arrêter toute campagne ou fonctionnalité concernée si une promesse client, un paiement ou une donnée personnelle est en risque.
3. Vérifier `/api/health`, puis `scripts/probe-production.mjs`.
4. Revenir dans Vercel au dernier déploiement connu sain, ou redéployer le commit sain explicitement :

```bash
python3 scripts/deploy.py --commit <sha-sain>
node scripts/verifier-deploiement.mjs --url https://kurlabeauty.vercel.app --sha <sha-sain> --attente 240
```

5. Vérifier à nouveau les endpoints publics, les routes protégées avec un compte de test contrôlé et l'absence de nouvelles erreurs.
6. Préserver les logs et l'incident pour la post-mortem ; corriger dans une branche, faire passer la CI, puis redéployer.

## 5. Sauvegarde et restauration Supabase

La sauvegarde de production doit être activée dans le projet Supabase (rétention adaptée au plan et, si disponible, PITR). Le propriétaire du projet vérifie mensuellement que la sauvegarde la plus récente est présente et trimestriellement qu'une restauration réussit dans un projet de staging isolé.

Export manuel ponctuel, uniquement depuis une machine contrôlée et jamais dans le dépôt :

```bash
# SUPABASE_DB_URL est injectée temporairement par le gestionnaire de secrets.
# Ne pas l'afficher, ne pas la mettre dans .env, et protéger le fichier produit.
umask 077
pg_dump --format=custom --no-owner --no-acl "$SUPABASE_DB_URL" \
  --file="/tmp/kurla-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_restore --list /tmp/kurla-<timestamp>.dump > /tmp/kurla-<timestamp>.manifest
```

Procédure de test : restaurer le dump dans un projet Supabase de staging, appliquer uniquement les migrations attendues, lancer `npm run test:realdb` avec les secrets de staging, puis supprimer le projet/fichier temporaire selon la politique de rétention. Ne jamais restaurer directement en production avant validation et approbation explicites.

Une restauration n'est déclarée réussie que si : connexion/authentification, lecture catalogue, isolation RLS, routes commande/support et migrations passent les tests réels.

## 6. Tests Supabase réels

Ils sont séparés des tests mémoire et créent uniquement des utilisateurs/objets temporaires qu'ils nettoient :

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
export VITE_SUPABASE_PUBLISHABLE_KEY=...
npm run test:realdb
```

Les valeurs sont des variables shell éphémères ou des secrets CI. En cas d'échec de nettoyage, supprimer immédiatement les utilisateurs et objets identifiés par le préfixe d'intégration et documenter l'incident ; ne pas annoncer la suite verte.

## 7. Rotation des credentials

Après toute exposition ou utilisation historique non maîtrisée :

1. révoquer et recréer le token GitHub personnel ;
2. révoquer/recréer les clés Supabase service role et publishable/anon selon la politique Supabase ;
3. renouveler les secrets Stripe, email, IA, Vercel et Sentry concernés ;
4. mettre les nouvelles valeurs uniquement dans Vercel/GitHub Secrets ;
5. redéployer, exécuter la vérification SHA + sonde + tests réels staging ;
6. confirmer que les anciennes valeurs ne sont plus acceptées et inspecter les logs pour détecter un usage résiduel.

La rotation est une action du propriétaire des comptes : ce dépôt ne contient aucune valeur de credential et ne peut pas révoquer les anciennes clés à sa place.
