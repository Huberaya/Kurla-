# Rapport D13 — Concision des réponses du diagnostic (« Plus »)

Date : 20/09/2026 · Périmètre : page RÉSULTAT du diagnostic (peau + cheveux), présentation uniquement.

## 1. Le problème posé

Retour utilisateur : « les réponses sont très longues ». Une étape de routine
faisait défiler 3 blocs de texte dense avant que le client n'atteigne l'étape
suivante. Le fond (moteur D9–D12) est bon ; c'est la **présentation** qui
noyait l'essentiel.

## 2. La règle retenue

- **La première phrase se suffit à elle-même** : sur chaque texte long, le
  lead affiché est la première phrase complète (frontière `. ! ? …` +
  majuscule ou « ), jamais un tronçon.
- **Rien n'est coupé, rien n'est réécrit** : le reste est derrière un bouton
  « Plus » / « Moins ». Propriété testée : `normaliser(lead + ' ' + rest) ==
  normaliser(texte original)` sur TOUS les textes du moteur (334 textes sur
  10 profils balayés, 241 dépliables, 0 perte).
- Une phrase unique trop longue se coupe à la dernière incise « ; » ou « — »
  dans la fenêtre ; sans frontière propre, on garde le texte entier plutôt
  que de trancher une phrase.
- Sous 140 caractères, pas de bouton ; expansion seulement si le bloc caché
  fait ≥ 55 caractères.
- Lead accepté ≤ 215 caractères (~2 lignes sur mobile) — « concis » veut dire
  lisible d'un coup d'œil, pas télégraphique.

## 3. Où ça s'applique (page résultat)

| Zone | Dispositif |
|---|---|
| Étapes de routine (matin / soir / semaine, peau + cheveux) | `StepBody` : action + 1ʳᵉ phrase du « comment » en vedette ; « Comment (suite) », « Pourquoi », « À attendre » derrière Plus |
| Résumé (« Votre profil ») | `LeadBlock` |
| §4 « pourquoi, étape par étape » | `LeadBlock` par réponse |
| Leçons du diagnostic | `LeadBlock` |
| Kit (matériels & essentiels, pourquoi) | `LeadBlock` |

Bouton = libellé texte « Plus / Moins » + chevron, `aria-expanded` +
`aria-controls` (accessible au clavier, annoncé par les lecteurs d'écran).

## 4. Code touché

- `src/components/ui/MoreLess.tsx` (nouveau) : `splitLead()` pur + `LeadBlock`.
- `src/pages/DiagnosticResultPage.tsx` : `StepBody` local (colonnes routine),
  `LeadBlock` sur résumé / §4 / leçons / kit.
- `src/lib/knowledge/hairAdvisory.ts` : **aucune modification** — le moteur
  ne change pas d'un octet ; la concision est 100 % présentation.
- Bonus relevé sur la capture client : faute d'orthographe visible
  « Faites glisser pour feuiller » → « Faites glisser pour feuilleter »
  (`DiagnosticResultPage.tsx`).

## 5. Vérifications

- **Banc `tests/kurla_resultat_concision.test.ts` : 19/19** (frontières
  phrase, « », majuscules accentuées, décimales, sans-perte sur balayage
  moteur, seuils d'expansion, câblage page, interdiction de coupure dure).
- **Suite complète `npm test` : verte** (19 bancs métier + lint tsc en fin de
  chaîne, 0 « ÉCHECS », 0 npm ERR).
- **tsc --noEmit : 0** (exécuté après tous les changements de câblage ; le
  seul edit postérieur est une chaîne littérale de libellé).
- **Playwright 390 px, parcours frisée + serviette + gel + chimie +
  définition : 12/12** — lead visible, suite absente du DOM par défaut, clic
  Plus → contenu moteur complet, Plus→Moins, plus aucun repli possible = 0,
  texte intégral reconstitué après expansion (15 802 → 26 071 caractères),
  débordement horizontal 0, console 0 erreur.
- Captures : `docs/d13_resultat_replie.png`, `docs/d13_resultat_deplie.png`.

## 6. Limites assumées (pas de sur-ingénierie)

- Les cartes-question du formulaire ne sont pas repliées (elles sont déjà
  courtes ; le retour visait les réponses).
- Pas de préférence persistée « tout déplier » — si l'usage le demande, ce
  sera un ticket.
- Le seuil de 55 caractères qui déclenche le bouton est empirique, réglable
  en un endroit (`MoreLess.tsx`).
- Note d'environnement : la sandbox de dev (2 Go) a saturé à plusieurs
  reprises sous (tsc + npm test + build) simultanés ; les vérifications ont
  été réexécutées une par une au calme. Le rebuild `dist` incluant la
  correction « feuilleter » a été tenté en arrière-plan ; à défaut de
  re-sortie, le commit contient la source, `dist` n'est pas versionné.
