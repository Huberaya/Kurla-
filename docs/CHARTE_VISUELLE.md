# Charte visuelle KURLA — visuels de marque

Version 1 · septembre 2026 · `docs/CHARTE_VISUELLE.md`

Ce document décrit **comment KURLA choisit, cadre et affiche ses photographies**.
Il est normatif : tout ajout de visuel doit s'y conformer et passer
`npm run test:visuals`.

---

## 1. Le constat qui a déclenché ce chantier

KURLA s'adresse aux personnes afro-descendantes et métisses, aux cheveux
texturés 3A–4C et aux peaux riches en mélanine. L'interface, elle, ne le
montrait pas. Constat établi en production, preuves à l'appui :

| # | Défaut | Preuve |
|---|--------|--------|
| 1 | **Le héros de la page d'accueil était une vidéo de road trip.** `assets.mixkit.co/videos/41582/41582-720.mp4` correspond à la page Mixkit « *Road trip as a couple aboard a van* » — un couple en fourgon, des arbres, des montagnes. Rien à voir avec des cheveux texturés. | [page Mixkit](https://mixkit.co/free-stock-video/road-trip-as-a-couple-aboard-a-van-41582/) |
| 2 | **5 URL d'images renvoyaient 404**, donc des cadres vides sur la page d'accueil : `photo-1608248597261-e4d09123fe1c`, `photo-1512290900678-ebaa85d56b00`, `photo-1608248540480-17637841852d`, `photo-1584297091622-af8964893796`, `photo-1590159763121-7c9ff3121ef0`. | test HTTP direct |
| 3 | **La photo « coiffeur·e afro » (`STYLIST_IMAGE`) montrait une peau claire.** Mesure automatique : luminance de peau médiane **209** sur 255 (les peaux mélaninées retenues sont entre 42 et 116). | `scripts/` + détection de visage OpenCV |
| 4 | **Une seule photo servait 14 fois**, une autre 12 fois : monotonie visuelle sur toute la home. | scan du code |
| 5 | **Aucune art-direction** : `object-center` partout, donc des visages coupés ; pas de `srcset` ; pas de dimensions ; pas de placeholder, donc des trous noirs au chargement ; textes alternatifs en anglais sur un site français. | lecture du code |

### Méthode de vérification

Plutôt que de se fier aux descriptions des banques d'images (souvent fausses ou
trop vagues), chaque visuel candidat est **mesuré** :

1. téléchargement de l'image ;
2. détection de visage (4 cascades Haar, vote croisé, seuil de confiance) ;
3. mesure de la **luminance médiane des pixels de peau** à l'intérieur du visage ;
4. classement : `deep` (< 88), `dark` (< 122), `medium` (< 158), `light` (≥ 158).

Seuls les visuels `deep` ou `dark` sont retenus pour représenter des personnes.
Les visuels `light` sont écartés — c'est ainsi que l'ancienne photo
« coiffeuse afro » a été disqualifiée.

---

## 2. La règle

> **Un visuel KURLA montre une personne que KURLA sert, ou une texture que
> KURLA traite. Sinon il n'entre pas sur le site.**

Corollaires :

- **Aucune image générée par IA** dans les visuels de marque. Une cliente doit
  pouvoir se reconnaître ; un rendu IA la trompe.
- **Aucune photo de produit retouchée** : la boutique utilise exclusivement les
  visuels fournisseurs. La banque de marque ne sert qu'à la décoration et à
  l'ambiance — elle n'affirme jamais « voici le produit que vous recevrez ».
- **Un crédit par photo.** Le nom du photographe et l'URL d'origine sont
  conservés dans `src/data/brandImages.ts`.
- **Un texte alternatif en français, descriptif, qui dit ce que la photo montre
  réellement.** Pas « beauty », pas « image1 ».

---

## 3. Palette

| Rôle | Valeur | Usage |
|------|--------|-------|
| Encre | `#050403` | fonds, texte sur clair |
| Brun chaud | `#1A0F0A` | surfaces, cartes |
| Cuivre | `#C8753D` | accent principal, CTA |
| Ambre | `#D49A63` | accent secondaire, surlignages |
| Crème | `#FFF7EF` | texte principal |

**Le voile chaud** (`.kurla-grade`, `mix-blend-mode: soft-light`) est appliqué
aux visuels plein écran. Il harmonise des photos prises par des photographes
différents et les rattache à la palette. Il est **interdit** sur les cartes qui
portent déjà un dégradé de lisibilité, sous peine d'écraser les contrastes.

---

## 4. Ratios et cadrage

Le ratio est **imposé côté CDN**, jamais laissé au hasard du `object-fit` :

```
https://images.unsplash.com/{photoId}
  ?auto=format        # WebP / AVIF selon le navigateur
  &fit=crop           # jamais de déformation
  &crop=faces,entropy # le visage d'abord, sinon la zone la plus informative
  &w=800&h=1000       # le ratio est décidé avant même le téléchargement
  &q=78
```

Conséquences : zéro décalage de mise en page (CLS), sujet jamais coupé, et le
navigateur ne télécharge pas un 6000 px pour l'afficher en 320 px.

Ratios par usage :

| Usage | Ratio |
|-------|-------|
| Héros plein écran | 16/10 |
| Carte portrait (galerie textures, besoins, catégories boutique) | 4/5 |
| Bandeau 16/9 (espaces Hommes / Kids) | 16/9 |
| Visuel d'article / dossier | 16/11 |

---

## 5. Le composant `BrandImage`

`src/components/BrandImage.tsx` remplace tout `<img>` décoratif. Il garantit :

1. **Le cadre ne bouge jamais** — `aspect-ratio` + couleur dominante en fond +
   LQIP flouté en `base64` affiché pendant le chargement.
2. **Le sujet est cadré** — `crop=faces` côté CDN.
3. **Le chargement est adapté** — `srcset` 400 → 2000, `sizes` obligatoire,
   `loading="lazy"` + `decoding="async"`, sauf `priority` sur le héros.
4. **Une image cassée n'existe plus** — en cas d'échec réseau, on affiche un
   dégradé de marque, jamais le pictogramme « image rompue » du navigateur.

```tsx
<BrandImage
  image={BRAND_IMAGES.afroPortrait}
  ratio={4 / 5}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
  className="group-hover:scale-105 transition-transform duration-700"
  fill
/>
```

---

## 6. La banque

20 visuels, dans `src/data/brandImages.ts` (généré, ne pas éditer à la main).

| Clé | Sujet | Tonalité | Photographe |
|-----|-------|----------|-------------|
| `afroStudio` | Femme afro, lèvres glossy, mains levées **(héros)** | deep | Good Faces |
| `afroPortrait` | Femme afro, regard franc | deep | Good Faces |
| `afroSquare` | Femme afro, épaules nues, lumière naturelle | dark | Jessica Felicio |
| `afroRed` | Femme afro sur fond rouge | dark | LOLA AZIZADA |
| `afroSunglasses` | Femme en lunettes de soleil, extérieur | deep | Justin Essah |
| `braidsProfile` | Profil, queue-de-cheval tressée | deep | Jessica Felicio |
| `braidsYellow` | Tresses tirées en arrière | dark | Gama. Films |
| `braidsWall` | Femme devant un mur blanc | deep | Leighann Blackwood |
| `locsGlasses` | Locks et lunettes cerclées | dark | Baptista Ime James |
| `textureCurls` | Gros plan boucles serrées | texture | Liana S |
| `manCrewNeck` | Homme en col rond noir | dark | Jassir Jonis |
| `manSmile` | Homme souriant, lumière naturelle | deep | Elizeu Dias |
| `manStudio` | Homme barbu, studio | deep | Pacha Shot's |
| `childNature` | Petite fille en extérieur | deep | Zach Lucero |
| `skincareTowel` | Serviette + masque crème | dark | Kaeme |
| `skincareLotion` | Application d'une crème | deep | Leighann Blackwood |
| `beautyLips` | Rouge à lèvres, peau éclatante | dark | Jean Jacobs |
| `salonStyling` | Coiffeuse et cliente | dark | Lindsay Cash |
| `salonClient` | Cliente en salon | dark | Giorgio Trovato |
| `washDay` | Moment de soin | deep | Unsplash |

---

## 7. Ajouter un visuel

1. Choisir une photo **réelle** (Unsplash, licence usage commercial, hotlinking
   autorisé) dont la description annonce explicitement une personne noire /
   métisse, des cheveux texturés, des tresses, des locks ou une peau mélaninée.
2. **La mesurer** : détection de visage + luminance de peau. Rejeter tout
   résultat `light`.
3. Ajouter la ligne dans `IMAGES` (`scripts/buildBrandVisuals.py`) avec un alt
   FR descriptif, un alt EN, le photographe et l'URL de la page d'origine.
4. Relancer `python3 scripts/buildBrandVisuals.py`.
5. Vérifier `npm run test:visuals`.

---

## 8. Ce qu'on ne fait plus

- ❌ Une URL d'image écrite en dur dans un composant (le test échoue).
- ❌ Une vidéo de banque non vérifiée en héros — 3,5 Mo téléchargés avant
  l'affichage du titre, pour un sujet hors marque.
- ❌ `object-center` sur un portrait : le front passe sous le menton.
- ❌ Un texte alternatif en anglais sur une page française.
- ❌ Réutiliser la même photo sur dix emplacements.

---

## 9. Licences

Tous les visuels décoratifs sont sous **licence Unsplash** : usage commercial
autorisé, pas d'attribution obligatoire (mais nous la conservons par respect et
par traçabilité). Les photographies ne sont pas exclusives : une autre marque
peut utiliser la même image.

**Avant toute campagne payante**, il faudra passer à des visuels propres —
shooting ou banque payante à cession de droits. C'est un chantier distinct,
budgété à part.

Les photographies de la galerie `/inspirations` suivent une règle différente,
documentée sur la page elle-même : ce sont des images trouvées sur le web,
utilisées comme inspirations et créditées, sans licence libre.
