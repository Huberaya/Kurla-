# KURLA BEAUTY — The Global Personal Beauty Intelligence Platform

> **Une personne** crée son profil → analyse ses cheveux et sa peau → comprend ses
> besoins → reçoit des recommandations **explicables** → construit ses routines →
> achète → suit ses résultats → re-reçoit des recommandations → reste dans l'écosystème.

Plateforme de beauté personnalisée pour les **cheveux texturés 3A–4C** et les
**peaux riches en mélanine** : diagnostic, intelligence de profil, catalogue vérifié,
routines dynamiques, pros certifiés — FR d'abord, Europe et diaspora ensuite.

---

## L'architecture en une page

**Une plateforme, un socle, des spécialisations.** Pas « KURLA Hair + KURLA Skin +
du code à côté » :

- **1 compte, 1 profil** (`beauty_profiles`) — le diagnostic cheveux et le
  diagnostic peau y écrivent ; historique daté, confiance par champ, RGPD complet.
- **1 catalogue** (`products`) — 7 validations de publication, trust score,
  couche peau = rapport de readiness, pas un second catalogue.
- **1 contrat de diagnostic** (`src/lib/diagnosticResult.ts`) — disponibilité
  explicite, prix jamais fallback, `generatedWithAI` toujours affiché.
- **1 moteur de recommandation** (`recommendationEngine.ts`) — règles explicites
  par domaine (`kurlaFit` cheveux, `skinRecommendation` peau), chaque score
  expliqué ; l'IA (Gemini, serveur uniquement) **formule, les règles décident**.
- **1 design system** — tokens `kurla-*` (couleurs de la charte, Inter + Playfair),
  voir `docs/ARCHITECTURE/11-design-system.md`.

**Documentation technique (source de vérité) : [`docs/ARCHITECTURE/`](./docs/ARCHITECTURE/00-README.md)**
— architecture actuelle et cible, audit code, matrice Hair/Skin, IA, données,
e-commerce, international, sécurité/RGPD, scalabilité, design system, roadmap.

## Démarrer

```bash
npm install
cp .env.example .env        # renseigner Supabase + Stripe + Gemini (serveur)
npm run dev                 # Vite + serveur Express (tsx server.ts)
npm test                    # 119 bancs (mode mémoire) + lint — ~4 min
npm run build               # production : vite + sitemap + prerender + esbuild
```

Mode mémoire (`KURLA_STORE_MODE=memory`, défaut des tests) : aucune infrastructure
requise. Mode réel (`KURLA_STORE_MODE=server`) : `SUPABASE_URL` +
`SUPABASE_SECRET_KEY` + `STRIPE_SECRET_KEY` + `GEMINI_API_KEY` (jamais côté client).

Intégrations base réelle (avant tout déploiement) :

```bash
npm run test:realdb         # preflight + intégrations + contrats de schéma
```

## Structure

| Dossier | Contenu |
|---------|---------|
| `server.ts` | Composition Express (2 828 lignes) : middlewares + routes cœur + 33 modules de routes |
| `src/pages/` | 66 pages (lazy), `src/lib/routeTable.tsx` = source de vérité des routes |
| `src/components/` | UI : génériques, panels admin, 3d, diagnostic, product |
| `src/lib/db/` | **43 stores par domaine** (fonctions pures, `bindDomain`) — 303 méthodes inventoriées |
| `src/server/` | Routes API par domaine, auth, http (rate limit, CSP), IA, paiements, compliance, SEO |
| `src/services/` | Clients API du front |
| `supabase/migrations/` | 83 migrations, 123 tables, RLS, fonctions `SECURITY DEFINER` |
| `tests/` | 121 bancs + inventaires de référence (routes, store, routes admin) |
| `scripts/` | Builds, seeds, générateurs de migrations, outillage (dont `findDeadCode.mjs`) |
| `docs/` | Architecture consolidée + chantiers + contrats peau |

## Les règles du dépôt (à tenir)

1. **Jamais de `push --force`** — `fetch` puis `rebase` (voir `COORDINATION.md`).
2. **Aucun secret dans le dépôt** — vérifié à chaque commit.
3. **Aucune donnée inventée** — une donnée réglementaire est sourcée ou absente.
4. **Ajouter une route ou une méthode de store** → régénérer les inventaires
   (`KURLA_UPDATE_FIXTURE=1 npx tsx tests/<banc>.test.ts`) et **relire le diff**.
5. **Nouvelle table de données utilisateur** → ajout à l'export/suppression RGPD
   + test.
6. **Plus d'hex en dur dans le code d'interface** — tokens `kurla-*` (design system).

## Documents historiques (racine)

Les `AUDIT_*.md`, `PLAN_*.md`, `BILAN*.md` de la racine sont les traces des
chantiers précédents (agents domaines + plateforme). Ils restent valables comme
historique ; pour l'état actuel, **`docs/ARCHITECTURE/` prime** (synthèse :
[`docs/ARCHITECTURE/13-etat-final.md`](./docs/ARCHITECTURE/13-etat-final.md)).
