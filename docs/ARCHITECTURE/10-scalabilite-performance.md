# 10 — Performance & scalabilité : 10 k → 10 M d'utilisateurs

> Méthode : identifier ce qui **casse** à chaque palier, pas ce qui serait joli.
> Le socle actuel (monolithe modulaire, Supabase, Vercel) est **le bon** jusqu'à
> une charge précise — la donner, puis le plan de bascule.

---

## 1. État de la performance (vérifié)

| Élément | État | Note |
|---------|------|------|
| Front | Chunks manuels (`vendor`, `supabase`, `three`, `admin`, `ai-vendor`) ; modaux différés ; fonts non bloquantes ; `content-visibility` ; PWA | Solide — le LCP est protégé par construction |
| API | Rate limiting global + par endpoint ; payload borné ; réponses JSON | Solide |
| **Lecture catalogue** | `GET /api/products` = 4 requêtes Supabase **en parallèle** (products + variants + inventory + images) + mapping 120 champs ; **aucun cache** | Le point chaud n°1 (voir §3) |
| **Fiche produit** | **Corrigé le 11/09** : `GET /api/products/:productId` — le front ne charge plus tout le catalogue pour une fiche ; la lecture serveur reste un scan (B1, P2) | Gain immédiat de bande passante |
| Base | RLS (coût constant par requête), index à vérifier sur les colonnes de filtre | Les 83 migrations portent les contraintes d'intégrité |
| IA | Gemini côté serveur, rate limité, JSON structuré | Coût par requête borné ; le fallback déterministe protège la disponibilité |
| Images | Unsplash CDN (art-direction côté CDN, ratios imposés) + bucket Supabase privé (photos) | Bien séparé (décoratif vs privé) |
| Cron | 1 job quotidien Vercel | Suffisant à ce stade |

## 2. Les paliers et ce qui casse

### Palier 1 — 10 000 utilisateurs (désormais)

**Rien ne casse.** 10 k utilisateurs ≈ quelques centaines de requêtes/min de pointe.
Le monolithe Vercel (60 s) + Supabase tenu par la main suffisent avec de la marge.
**Action** : aucune infra ; surveiller (S5) + exécuter le P0 business (catalogue peau).

### Palier 2 — 100 000 utilisateurs (6–12 mois si traction)

**Ce qui casse d'abord** :
1. **`/api/products` sans cache** : chaque visite boutique = 4 requêtes PG. À
   5 k visites boutique/jour de pointe, c'est 20 k requêtes/min de base de données
   pour servir le même catalogue quasi statique. → **R5 : cache TTL** (§4).
2. **La recherche** : le filtering par besoin/actif/phototype est en mémoire après
   scan. À 1 000+ produits : index PostgreSQL (GIN sur les tableaux `needs`/
   `concerns`/`catalog_category_tags`) + éventuellement Meilisearch si la recherche
   floue devient le driver d'acquisition.
3. **Les uploads photos** (journal, Shelf) : taille bornée mais pas encore de
   pipeline de redimensionnement → ajouter des rendus multi-tailles au bucket.
4. **Les jobs** : rappels de routine, alertes stock, réconciliation — un seul cron
   quotidien → découper en jobs par heure de pointe (Vercel Cron multiple ou
   BullMQ si migration vers un worker dédié).

### Palier 3 — 1 million d'utilisateurs (18–30 mois)

**Ce qui casse** :
1. **Le serveur** : un seul monolithe Node ne scale pas en écriture (les buckets
   de rate limiting et les états process — sessions IA, panier anonyme — sont en
   RAM). → Les états transitoires vont en cache partagé (Redis) ; les rate limits
   passent au edge. **Le découpage en services n'est PAS encore justifié** :
   le monolithe modulaire (routes + stores par domaine) est déjà organisé pour un
   extraction propre — on extrait **le plus coûteux** (recherche, IA, images) en
   premier, pas « l'authentification » (anti-pattern classique).
2. **La base** : partitionner `stripe_events`, `notification_logs`, `order_status_history`
   (tables à volume croissant) ; réplica de lecture pour le catalogue admin.
3. **Le catalogue 10 000+ refs** : pagination serveur (E3), requête produit ciblée
   (B1), cache CDN des pages produit (prerender + `s-maxage` courte).
4. **L'observabilité** : APM + alertes (S5) deviennent critiques — les logs JSON
   avec `X-Request-Id` sont déjà prêts pour l'ingestion.

### Palier 4 — 10 millions d'utilisateurs (3 ans)

**Ce qui change** :
1. **Multi-régions** : les marchés CI/SN/DOM justifient un edge de latence
   (Vercel multi-régions ou CDN + functions par région ; la BDD reste à un endroit
   unique — Supabase multi-region ou Postgres+réplication quand la latence
   intercontinentale pèse sur le checkout).
2. **Les services** : recherche, IA (files d'attente + workers), images (pipeline
   asynchrone) sont extraits du monolithe — le découpage par domaine du store rend
   l'extraction mécanisable (un module = un service).
3. **Les données** : rétention par strate (les outcomes bruts à durée limitée,
   les agrégats k-anonymes persistés), architecture de cohorte pour les études
   longitudinales (le moat peau : données IV–VI consenties).
4. **L'IA** : embedding + index vectoriel pour la recherche et la recommandation
   floue ; l'IA reste à son rôle (langage), les règles gardent le verdict.

## 3. Le point chaud n°1 et sa résolution (design validé)

**Lecture du catalogue public** — design du cache (R5, P2) :

```
GET /api/products (et /:productId)
   │
   ├── mode mémoire (tests/dev) : pas de cache (les bancs mutent le catalogue)
   │
   └── mode Supabase (prod) :
        cache process (TTL KURLA_CATALOG_CACHE_TTL_MS, défaut 30 s, 0 = off)
        + invalidation explicite aux points d'écriture admin
          (create/update/delete/import/publish — ~12 fonctions, choke point unique)
        + `Cache-Control: public, max-age=15, stale-while-revalidate=120`
          sur les réponses publiques (le CDN de Vercel fait le reste)
```

**Pourquoi pas un cache long** : la vérité catalogue (publication, stock, prix)
est un fait opérationnel — 30 s + invalidation écriture suffit ; au-delà, c'est le
CDN (pas l'application) qui absorbe le trafic répété.
**Pourquoi pas Redis maintenant** : un seul processus Vercel à la fois ; le cache
process + invalidation écriture couvre le palier 2 ; Redis entre avec l'edge
limiter au palier 3 (les deux voyagent ensemble).

## 4. Règles de performance (gardes à écrire)

1. **Pas de scan full-table pour servir une entité** — la fiche produit unitaire
   est posée (11/09) ; B1 termine le travail côté base (avec la suite réel-DB).
2. **Pas d'état process qui doive survivre** sans plan de migration (les buckets
   de rate limit le peuvent — bornés et purs ; les paniers anonymes vont en
   session/edge au palier 3).
3. **Tout endpoint public = un `Cache-Control` réfléchi** (données stables :
   long ; données utilisateur : `private, no-store`).
4. **Les images : ratio imposé côté CDN** (charte visuelle) — pas de CLS, pas de
   requêtes d'images multiples par viewport.
5. **Les jobs : un cron = un périmètre** ; le périmètre croît avec la charge
   (quotidien → horaire → files), jamais l'inverse.

## 5. Monitoring (doc 22 de la mission)

**En place** : `X-Request-Id` sur toute réponse ; logs JSON des 5xx avec
corrélation ; email health ; cockpit traction (MAU, D30, NPS, diagnostic→achat,
avis vérifiés — `available: false` quand la source est absente).
**À faire** : alertes (S5) sur 429/5xx/latence ; dashboard conversion
(diagnostics → routine → panier → paiement) — les événements analytics existent,
le tableau de bord est un travail d'assemblage (P1).
