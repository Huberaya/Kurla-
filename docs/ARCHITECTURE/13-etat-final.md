# 13 — État final du projet (11/09/2026, fin de session de consolidation)

> Ce document liste **ce qui a réellement changé dans le code** pendant la
> consolidation, comment c'est vérifié, et l'état final mesuré.

---

## 1. Changements de code (tous testés)

### 1.1 Design system KURLA (nouveau)

- `src/index.css` : bloc `@theme` — 15 tokens de marque
  (5 couleurs cœur de la charte + 7 neutres mesurés + 3 sémantiques +
  `--font-sans` Inter + `--font-serif` Playfair Display) ; scrollbar en `var()`.
- **Migration des 12 couleurs cœur** : ~9 700 occurrences de `-[#hex]` remplacées
  par les tokens (`bg-kurla-copper`, `text-kurla-cream`…) sur l'intégralité de
  `src/` + `index.html`. Valeurs hex identiques → **zéro changement visuel**.
- **Correction réelle** : `--font-sans` pointait vers les polices système alors
  qu'Inter était chargée — la police de marque est enfin appliquée.
- `index.html` : le handler inline `onload` du preload font est déplacé dans
  `public/fonts.js` (dépendance de la CSP).

### 1.2 Performance e-commerce (nouveau)

- `GET /api/products/:productId` : route fiche produit unitaire (rate limit
  120 req/min), projection **identique** à la liste (même `toPublicProduct` +
  `isPublishableProduct`), 404 JSON métier.
- `src/lib/db/catalogStore.ts` : `getPublicProductByIdOrSlug` (réutilise le
  pipeline liste — pas de duplication de la projection de 120 lignes).
- `src/lib/serverDb.ts` : méthode déclarée + binding automatique.
- `src/services/productService.ts` : `getProductBySlugOrIdFromSupabase` utilise
  la route unitaire — **une fiche produit n'entraîne plus tout le catalogue**.
- Inventaires de référence régénérés **et revus** : 298 routes (+1),
  303 méthodes store (+1) — diffs minimaux, conformément au protocole
  `COORDINATION.md`.

### 1.3 Sécurité (nouveau)

- `src/server/http.ts` : `contentSecurityPolicy()` + header
  **`Content-Security-Policy-Report-Only`** en production. `script-src` **sans**
  `'unsafe-inline'` ; domaine Plausible validé comme hostname (pas de
  concaténation aveugle).
- `tests/production_hardening.test.ts` : vérifications CSP ajoutées
  (présence en prod, absence de `unsafe-inline` dans `script-src`,
  `default-src 'self'`).

### 1.4 Code mort supprimé (7 fichiers)

`Hero3DCurlOrb.tsx`, `Routine3DProductStage.tsx` (3D orphelines),
`AiRoutineAnalysis.tsx` (consommateur obsolète remplacé par le branchement
connaissance→diagnostic), `knowledge/hair.ts`, `knowledge/routines.ts`
(bases statiques orphelines), `sourcingCountryScore.ts` (scoring migré en base).
Chaque suppression : vérification du graphe d'imports (`scripts/findDeadCode.mjs`,
conservé) + suite verte.

### 1.5 Hygiène

- `package.json` : `test:need-depth` dédoublonné ; `vite` retirée des
  dependencies (devDependency) ; nouveau banc `test:product-single` ajouté à la suite.
- `tests/kurla_visuals.test.ts` : le scan d'URL d'images s'applique au code
  d'interface (`src/server/` exclu — il référence des origines de politique CSP,
  pas des visuels ; le rendu serveur reste couvert par le contrôle 4).

### 1.6 Documentation (nouveau)

- `docs/ARCHITECTURE/` : 14 documents (00–13) — source de vérité technique.
- `README.md` : point d'entrée du dépôt (nouveau).

## 2. Vérification

| Banc | Résultat |
|------|:--------:|
| Suite complète `npm test` (119 bancs mémoire + lint) | ✅ **verte** (exit 0) |
| TypeScript strict (`tsc`) | ✅ propre (0 erreur ; le warning package.json est levé) |
| Build (vite + esbuild + sitemap + prerender) | ✅ OK |
| Bancs ciblés : `product_single_fetch` (4), `production_hardening` (CSP), `kurla_visuals` (6) | ✅ |
| Inventaires : routes (298), store (303), routes admin, appelants | ✅ régénérés + revus |
| Scan secrets (Stripe/Supabase/Gemini/JWT) | ✅ 0 secret dans l'arbre |
| `dangerouslySetInnerHTML` | ✅ 0 occurrence |

**Ce qui n'a pas été touché** : aucun parcours cheveux, aucun flux de paiement,
aucune migration de base, aucun schéma de données. Les 83 migrations et les 123
tables sont inchangés.

## 3. État final mesuré

| Indicateur | Valeur |
|------------|:------:|
| Plateformes/monos | **1** (1 compte, 1 profil, 1 catalogue, 1 contrat diagnostic, 1 moteur de reco) |
| Routes API | 298 |
| Méthodes de store (par domaine) | 303 |
| Migrations / tables | 83 / 123 |
| Pages | 66 |
| Bancs de tests | 121 (119 en suite + 2 intégrations réel-DB) |
| Design system | 15 tokens marque, palette cœur migrée 100 % |
| Couleur hex restantes | 95 (long tail — R1, P1) |
| Locales | FR + EN (chrome) — corps de pages P1-3 |
| Produits live | 67 (26 cheveux + 28 accessoires + 10 kits + 3 peau) |
| IA | Gemini 3.5 flash, serveur uniquement, 2 points d'appel, rôle verrouillé |

## 4. Risques ouverts (honnetement déclarés)

1. **Le test:realdb doit être exécuté sur un projet Supabase de test** avant
   chaque déploiement (la suite mémoire verrouille la sémantique, pas la base).
2. **La CSP est en Report-Only** : bascule en mode imposé après revue des
   violations (S1, P2).
3. **Le long tail de 95 couleurs** n'est pas encore tokenisé (R1) — l'interdiction
   de l'hex en dur est posée par la règle du design system, pas encore par le
   banc visuel (extension prévue).
4. **La traduction EN des corps de pages** est le plus gros trou de contenu
   (P1-3) — le framework la rend mécanique mais le volume existe.
5. **Le goulot n°1 reste opérationnel** : 40 refs peau prouvées (P0-1) — aucun
   changement de code ne le remplace.

## 5. Comment vérifier que tout tient

```bash
npm install
npm test          # 119 bancs mémoire + lint (≈ 4 min)
npm run build     # vite + sitemap + prerender + esbuild
# Intégrations réel-DB (requiert un projet de test + secrets) :
npm run test:realdb
# Code mort (outillage conservé) :
node scripts/findDeadCode.mjs
```
