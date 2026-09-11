# 09 — Architecture sécurité & RGPD

> Audit complet effectué le 11/09/2026. Base : le dépôt est **déjà durci**
> (chantier 6) ; cette session y a ajouté la CSP et corrigé deux défauts
> d'hygiène. Détail des corrections dans la doc 13.

---

## 1. Sécurité — état vérifié

### 1.1 Authentification & autorisation

| Contrôle | État | Preuve |
|----------|:----:|--------|
| Identité **uniquement** par jeton Supabase vérifié serveur | ✅ | `src/server/auth.ts` — les en-têtes `x-user-id`/`x-user-email` (fournis par le client) sont délibérément ignorés ; bancs négatifs `authorization.test.ts` (headers forgés, tokens invalides → 401) |
| Rôles (admin, superadmin, support, brand, professional, customer) | ✅ | Guards `requireAdmin`/`requireSupport`/`requireBrand` ; inventaire des routes admin + test de garde de rôle |
| Anti auto-élévation | ✅ | RLS `WITH CHECK` : un client ne peut pas écrire `role='admin'` ; fonctions SQL `SECURITY DEFINER` avec `search_path` verrouillé |
| Cloisonnement des rôles | ✅ | `brand` = ses tests uniquement (ni profils, ni commandes, ni catalogue) ; `getOwnedOrder` : une commande n'est lisible que par son propriétaire (ou admin) |

### 1.2 API & transport

| Contrôle | État | Preuve |
|----------|:----:|--------|
| Rate limiting global `/api` (300 req/min/IP) + par endpoint (IA 30, assistant 30, routine 20, questions/avis 60, admin retention 10…) | ✅ | `http.ts` (borné, avec purge) ; banc `production_hardening` (429 vérifié) |
| Anti-spoofing IP | ✅ | `trust proxy` **off** par défaut, activé seulement si `TRUST_PROXY=true` (documenté : derrière proxy connu) |
| Limite de payload (100 ko JSON, 2 Mo feeds catalogue, 256 ko webhook) | ✅ | Banc (413 vérifié) |
| Erreurs sans fuite | ✅ | `safeApiError` : détail technique hors production uniquement ; 5xx loggés en JSON avec `X-Request-Id` |
| Headers de sécurité | ✅ | `nosniff`, `SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, HSTS (prod), `x-powered-by` désactivé |
| **CSP (ajoutée le 11/09)** | ✅ | **Report-Only en production** : `script-src` **sans** `'unsafe-inline'` (le dernier handler inline a été déplacé dans `public/fonts.js`), `default-src 'self'`, `frame-ancestors 'self'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests` ; domaine Plausible validé comme hostname avant insertion ; **test de durcissement étendu** pour verrouiller l'absence de `unsafe-inline` dans `script-src`. Bascule en mode imposé = après revue des rapports (P2) |
| CORS | ✅ (par design) | Application servie **même origine** (le serveur sert le front + l'API) ; `CORS_ORIGIN` est une variable réservée aux déploiements split — **documentée comme telle** (écart entre `.env.example` et code comblé par la doc) |
| Webhook Stripe | ✅ | Signature stricte (`constructEvent`) quand activé ; secret manquant = erreur explicite ; **claim atomique** avant traitement (anti double livraison) ; idempotence `stripe_events` |
| Cron | ✅ | `CRON_SECRET` : absent = 503 (fail-closed), faux = 401 |
| XSS | ✅ | **0 occurrence** de `dangerouslySetInnerHTML` ; React échappe par défaut ; CSP en surveillance |
| Injection | ✅ | Supabase ORM (paramétré) + Express `strict: true` ; aucun SQL interpolé (les 3 fonctions `SECURITY DEFINER` sont en migration versionnée) |
| Secrets | ✅ | Scan de l'arbre : aucun secret dans le code ; `.env.example` à valeurs vides ; clé Gemini **serveur uniquement** (audit de bundle) |

### 1.3 Paiements

- Prix recalculés côté serveur au checkout (falsification refusée).
- Stock atomique + idempotence + remboursements par ligne (`finalize_refund`).
- Activation d'abonnement exige paiement confirmé **et montant identique** à l'annoncé.
- Mode test Stripe en pré-prod ; le passage live est un chantier ops (doc 12).

### 1.4 À faire (classé)

| # | Item | Classe |
|---|------|:------:|
| S1 | Passer la CSP en mode imposé après revue des violations (2–4 semaines de report-only + rapport) | P2 |
| S2 | Rate limiting **partagé au edge** (Vercel/WAF) pour les déploiements multi-instances — le limiteur process-local est documenté comme fallback | P2 |
| S3 | Rotation périodique des secrets (Supabase service role, Stripe, CRON_SECRET) + revue d'accès | P1 (ops) |
| S4 | `CORS_ORIGIN` : soit implémenter (déploiement split future), soit retirer de `.env.example` — décision P2 | P2 |
| S5 | Monitoring des 429 + des 5xx (alertes) — l'observabilité existe, les alertes manquent | P1 |

## 2. RGPD — état vérifié

### 2.1 Principes (tous testés — banc `kurla_privacy` + AIPD + AI Act)

| Principe | Implémentation |
|----------|----------------|
| **Minimisation** | Le profil ne stocke que ce que l'utilisateur déclare ; champ inconnu = `unknown` (jamais de déduction) ; la cohorte de lancement référence les participants de manière minimisée ; NPS sans commentaire libre |
| **Consentement** | Photos **uniquement** après consentement explicite, versionné et rétractable (AIPD — AI Act, photos du journal) ; le phototype est recueilli **avec consentement** (banc C5) ; pas de tracking tiers sans configuration |
| **Transparence** | `/api/ai/disclosure` (ce que l'IA est/n'est pas), `AI_DISCLAIMER` constant, `PrivacyPage`, `generatedWithAI` toujours affiché, sources citées |
| **Portabilité** | Export complet (profil, historique, photos, journal peau, observance, Shelf, outcomes) — `DELETE/GET /api/privacy` |
| **Droit à l'effacement** | Suppression RGPD en un geste, **toutes tables** (ajout d'une table de données utilisateur = ajout à l'export + test) |
| **Sécurité des données** | RLS, jetons, bucket photos privé + URLs signées temporaires, pas de base64 réinjecté dans le profil (C6) |
| **Limitation** | Agrégats publiés **uniquement** via archétypes k-anonymes ; les observations individuelles ne contribuent à aucun agrégat sans cible réelle (C6) |
| **AI Act** | CMS de classification des usages IA + disclosure (banc `kurla_ai_act_cms`) ; triage médical avant toute génération IA |

### 2.2 Séparation des données (règle de la plateforme)

1. **Individuel** (profil, Shelf, outcomes, journal, photos) : privé, exportable,
   supprimable — alimente le moteur **de ce seul utilisateur**.
2. **Agrégé** (archétypes, trust scores, métriques de lancement) : k-anonyme,
   jamais ré-identifiable, `available: false` quand la source est absente
   (zéro inventé).
3. **Opérationnel** (fournisseurs, lots, facturation) : ne contient aucune donnée
   client au-delà du nécessaire (commandes).

### 2.3 RGPD — à faire

| # | Item | Classe |
|---|------|:------:|
| G1 | Registre des traitements à jour (le code est prêt : chaque flux est documenté ici) | P1 (juridique) |
| G2 | DPA avec les sous-traitants (Supabase, Stripe, Gemini, email, analytics) | P1 (juridique) |
| G3 | Praz de rétention par table (documenter les durées) | P2 |
| G4 | En cas d'analyse photo IA future (P3) : avis + renforcement AIPD | P3 |
