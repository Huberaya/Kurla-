# D9 — Le questionnaire crépu 4A–4C, audit et refonte (20/09)

Consigne : « prends le temps de regarder la logique des questions pour Crépue
(4A–4C), vérifie si elles permettent un diagnostic précis ; sinon rédige un
questionnaire efficace en expert — c'est le cœur du métier ».

## Audit : ce que le parcours savait déjà faire (gardé)
- Texture nommée avec le shrinkage dans la description ; question focus du
  segment « Crépues au naturel » (hydratation / démêlage / définition /
  longueur) ; porosité racontée behaviorally avec le test du verre d'eau et la
  porte de sortie « je ne sais pas » ; longueur→dosage, cuir chevelu (5 états),
  fréquence, expérience, budget. Le moteur consommait chaque réponse.

## Audit : les quatre manques (condamnés par les faits)
1. **4A/4B/4C confondus** — « très serrée » était une seule réponse ; or le
   démêlage 4C se fait section par section sous l'eau, la définition 4C se fait
   au doigt, et le shrinkage du 4C ne se mesure pas comme le 4A.
2. **Le masque hebdo disait « hydratation, OU force »** — le moteur proposait
   sans trancher. Sans test d'élasticité, il ne PEUVAIT pas trancher.
3. **Largeur du cheveu inconnue** — le poids des produits (huile vs beurre,
   dosage) en dépend ; la porosité seule est un proxy insuffisant.
4. **Passé chaleur/chimie invisible** — un crépu texturisé ou ferré répondait
   « crépu » et recevait le programme de la fibre vierge. La démarcation,
   point faible n°1, n'était jamais nommée par le diagnostic (seulement par le
   segment « défrisée »).

## Le questionnaire (15 questions pour le parcours crépu, contre 11 avant — 3-4 min)
Ordre : texture → coiffage → **focus** (adaptatif) → **[4. Motif crépu :
4A ressorts S / 4B angles Z / 4C très serré / inconnu]** → 5. Longueur →
**6. Élasticité** (ressort / mou qui ne revient pas / casse net / jamais testé)
→ **7. Largeur du cheveu** (fin / moyen / épais / inconnu) →
**8. Passé chaleur & chimie** (jamais / chaleur seule / produit seul / les deux
/ sans réponse) → 9. Priorité → 10. Porosité → 11. Cuir chevelu → 12. Fréquence
→ 13. Expérience → 14. Budget → 15. E-mail (facultatif).

Règles d'orfèvre appliquées :
- **Aucune question sans effet** : chaque réponse change le texte ou le
  programme (motif → méthode de démêlage + ligne résumé + dérivation shrinkage
  propre au 4C ; élasticité → LE masque décidé ; largeur → le scellement ;
  chaleur/chimie → une étape dédiée avec ses trois lois).
- **Jamais de devinette** : « inconnu » = comportement d'avant, prouvé par test
  de compatibilité stricte (réponse absente ≡ réponse inconnue ≡ texte antérieur).
- **Jamais de question déplacée** : motif non posé sur locks formées (le motif
  est consommé par la lock) ; chaleur/chimie jamais posée à un enfant — et si
  la réponse arrive quand même (détournement), le moteur l'ignore (garde flags).
- **Cohérence par cycle** : la phrase « la routine a décidé force d'abord »
  n'apparaît que là où le cycle a un masque à décider (naturel). Sur locks, la
  réponse à l'élasticité molle est l'espacement des retwists + rinçage long ;
  sur tresses/perruque/transition/enfant, le fait est noté sans survente.

## Le défaut d'infrastructure trouvé en route (preuve navigateur)
Le test réel à 390 px a montré que les réponses arrivaient justes au moteur
mais étaient **coupées en production** : la route serveur et la page résultat
entretenaient chacune sa liste blanche de champs. Consolidation : un builder
unique `buildHairAdvisoryCtx()` (moteur), appelé par les deux — verrouillé par
le test E14 qui interdit la recréation d'une liste blanche locale.

## Vérifications
`tsc` 0 · banc D9 `test:diagnostic-crepu` **17/17** (formulaire + moteur +
garde enfant + dérivation 4C + tuyau) · matrice D8 étendue : les 4 nouvelles
réponses balayées sur **3 404 profils**, invariants décision/étapes/cycles
(elle a pris en faute deux incohérences réelles avant livraison : ligne de
définition sur locks, promesse « décidé » sur transition) · 13 bancs
diagnostic/cycle/évolution/kit verts · `vite build` 0 · parcours crépu complet
joué dans Chromium à 390 px : les 4 nouvelles questions aux bonnes positions,
et sur la page résultat « Masque d'hydratation d'abord », « Chaleur : la règle
des trois », « Cheveu fin », « quadriller la tête en sections » — over 0,
aucune erreur console.
