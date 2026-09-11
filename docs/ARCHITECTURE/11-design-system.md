# 11 — Design system KURLA

> « Une seule identité KURLA. » — v1 posée le 11/09/2026.
> Source de vérité : `src/index.css` (tokens `@theme`) + `docs/CHARTE_VISUELLE.md`
> (visuels) + ce document (usage).

---

## 1. Palette (tokens `kurla-*` — Tailwind v4 `@theme`)

### Couleurs cœur (charte visuelle — non modifiables sans revue de marque)

| Token | Valeur | Rôle | Usage |
|-------|--------|------|-------|
| `kurla-ink` | `#050403` | Encre | Fonds, texte sur clair |
| `kurla-espresso` | `#1A0F0A` | Brun chaud | Surfaces, cartes |
| `kurla-copper` | `#C8753D` | Cuivre | Accent principal, CTA |
| `kurla-amber` | `#D49A63` | Ambre | Accent secondaire, surlignages |
| `kurla-cream` | `#FFF7EF` | Crème | Texte principal |

### Neutres étendus (mesurés d'après l'usage réel — 9 700 occurrences migrées)

| Token | Valeur | Usage |
|-------|--------|-------|
| `kurla-ivory` | `#FFFDF9` | Fonds de page clairs |
| `kurla-sand` | `#F8F2EC` | Surfaces secondaires claires |
| `kurla-stone` | `#E8E1DA` | Bordures claires, séparateurs |
| `kurla-cocoa` | `#B06330` | Cuivre foncé (hover/actif) |
| `kurla-carbon` | `#111111` | Neutre quasi-noir (sections) |
| `kurla-bark` | `#3A2218` | Bruns profonds (surfaces) |
| `kurla-umber` | `#241C16` | Bruns intermédiaires (cartes) |

### Sémantique

| Token | Valeur | Usage |
|-------|--------|-------|
| `kurla-danger` | `#B91C1C` | Erreurs, bloquant |
| `kurla-success` | `#2E7D5B` | Succès, validé |
| `kurla-warning` | `#D49A63` | Attention, en attente |

### État de la migration

- **12 couleurs cœur** : migrées **à 100 %** dans `src/` + `index.html`
  (~9 700 occurrences de `-[#hex]` → `-[token]`), valeur hex identique (zéro
  changement visuel), suite de tests + build verts.
- **95 couleurs restantes** (long tail : un-occurrences, dégradés, ombres) : à
  mapper vers sémantiques/neutres (R1, P1). Règle nouvelle : **plus aucun hex en
  dur dans le code d'interface** — une couleur nommée ou elle n'existe pas.

## 2. Typographie

| Rôle | Police | Token |
|------|--------|-------|
| Corps | **Inter** (300–700) | `--font-sans` |
| Titres | **Playfair Display** (500–900, italiques) | `--font-serif` / utilitaire `font-serif-title` |

**Corrigé le 11/09** : Inter était chargée par `index.html` mais `--font-sans`
résolvait vers les polices système — la police de marque n'était **pas appliquée**.
Le token pointe maintenant sur Inter ; le chargement est non bloquant
(`preload` + bascule `public/fonts.js`, **sans handler inline** — condition de la
CSP, doc 09).

**Échelle** (usage existant, à normaliser) : microcopy `text-[10px]`/`text-[11px]`,
corps `text-xs`/`text-sm`, titres section `font-serif-title` `text-2xl`–`text-4xl`.

## 3. Composants & patterns

| Famille | Composants de référence | Règle |
|---------|------------------------|-------|
| **Boutons** | `rounded-full` + `bg-kurla-copper` (primaire), `border-kurla-copper/30` (secondaire), hover `bg-kurla-cocoa` | Un primaire par vue ; le cuivre est la CTA |
| **Cards** | `rounded-2xl` + fond `kurla-espresso`/`white` + bordure `kurla-stone` ou `kurla-copper/20` | Les cartes produit passent par `ProductCard`/`BrandImage` |
| **Badges/pastilles** | `rounded-full text-[10px] font-bold` + pastille dorée | « Sans parfum », « Invisible », « Vérifié » — le vocabulaire est contrôlé |
| **Formulaires** | Steppers de diagnostic (barre de progression `kurla-copper→kurla-amber`) | Mobile-first : 1 question = 1 écran |
| **Modales** | `AuthModal`, `CartDrawer`, `SearchModal` (lazy, hors chemin critique) | Le hero peint avant le JS modale |
| **Navigation** | `Navbar` (tabs Cheveux/Peau, Lucide), `Footer` (chrome traduit) | L'identifiant KURLA est le logo + le cuivre |
| **Visuels** | `BrandImage` (banque vérifiée : luminance de peau mesurée, crédits, alt FR/EN, LQIP, ratios CDN) | **Règle de la charte** : un visuel montre une personne que KURLA sert ou une texture qu'elle traite ; aucun visuel IA pour la marque |
| **Mouvement** | `Reveal` (motion), keyframes `kurla-kenburns`/`kurla-halo`/`kurla-reveal` | `prefers-reduced-motion` respecté globalement (règle CSS) |
| **3D** | `Diagnostic3DFloatingCards`, `KURLAPro3DMap` | Chunk séparé ; jamais dans le chemin critique |
| **États** | Chargement (squelette), vide (hub + waitlist — jamais un trou blanc), erreur (message + repli) | L'état vide d'une catégorie pointe vers le hub du besoin |

## 4. Spacing, radius, élévations

Usage dominant (à figer) : radius `rounded-full` (CTA) / `rounded-2xl` (cards),
spacing `p-4`/`p-6`/`gap-2`–`gap-6`, dégradés `from-kurla-copper to-kurla-amber`
(progressions), ombres discrètes + halos `kurla-halo` (ambiance, pas d'élévation
« carte flottante »). Le style KURLA est **plat, chaud, texturé** — la texture
vient des visuels et du grain (`kurla-grade`), pas des ombres.

## 5. Responsive (mobile-first)

- Diagnostics : 1 question/écran ; mode **express** (5 étapes) par défaut sur
  mobile quand le complet (12) est long.
- Boutique : grille adaptative, filtres en accordion mobile, tri persistant.
- Fiche produit : sticky CTA panier, INCI en accordéon, alternatives en swipe.
- Admin : desktop-first assumé (outil interne) — le reste est mobile-first.

## 6. Règles du design system (à maintenir)

1. **Une couleur = un token.** Hex en dur dans `src/**` (hors `src/server`) =
   défaut. Le banc visuel scanne déjà les URLs d'images ; l'extension au scan
   d'hex est la prochaine itération (R1).
2. **Un composant = un fichier, un usage** ; les composants de domaine
   (peau/cheveux) composent les primitvues du socle, ne les recréent pas.
3. **L'accessibilité** : contraste cuivre/encre vérifié sur les CTA ; `alt`
   obligatoires (banc visuel) ; `prefers-reduced-motion` ; focus visibles.
4. **Le vocabulaire** est contrôlé (taxonomie) : « uniformiser » et jamais
   « éclaircir » ; les états de disponibilité sont ceux du catalogue
   (available/preorder/pending_validation/formulation_target/unavailable).
5. **Toute évolution du design system** passe par `src/index.css` (tokens) + ce
   document + la suite de tests — jamais par 40 fichiers à la fois.
