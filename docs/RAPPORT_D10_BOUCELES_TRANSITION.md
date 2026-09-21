# D10 — Rapport : le même audit expert appliqué aux bouclés 3B–3C et à la transition défrisée

**Date : 20/09 — consigne : « enchaine » (suite directe du D9 crépu).**
Même discipline que D9 : aucune question sans effet vérifié ; « inconnu » = comportement d'avant,
prouvé bitube par bitube ; aucune question posée hors segment ; bancs + matrice + navigateur avant
livraison. Point de départ : le moteur était patché mais **non vérifié** — tout ce rapport part des
preuves exécutées aujourd'hui, pas des patchs écrits hier.

---

## 1. L'audit — ce qui n'allait pas

### 1.1 Bouclés 3B–3C : la méthode récitée, jamais la réalité

Le questionnaire posait déjà 4 questions de précision… au crépu 4A–4C uniquement. Sur les boucles
3B–3C, le moteur récitait la méthode générale (gel, scrunching, diffuseur doux, carton) — un texte
identique pour la cliente qui diffuse à l'air chaud, celle qui ne jure que par la crème et celle qui
frotte à la serviette. Or c'est **pendant le séchage que la boucle prend sa forme** : la question du
séchage réel et du fixant réel est exactement, pour ce segment, ce que l'élasticité était pour le
crépu — la réponse qui fait bouger le programme.

### 1.2 Transition : « Le choix honnête » demandait un cap sans donnée

`buildTransitionWeekly` servait l'étape « Le choix honnête : fade ou continuité » avec un texte
identique pour la femme dont le défrisage occupe encore 80 % des longueurs et pour celle à qui il
reste 3 cm. La première doit stabiliser la ligne (couper serait paniquer) ; la seconde finit — lui
prescrire la patience n'a plus de sens. La part de fibre traitée restante est la donnée qui
manquait.

### 1.3 La contradiction trouvée au passage (dette du D9)

Profil défrisé + réponse « jamais de chaleur ni de produit » : la logique D9 (« aucun » → on félicite
des longueurs « vierges de chaleur ») se jouait de l'incohérence et servait la ligne. Une texture
défrisée déclarée **contredit** un « aucun » : la physique du segment prime (consigne permanente).

---

## 2. Ce qui a été fait

### 2.1 Trois réponses de plus, chacune avec effet (moteur)

- `curlyDry` — séchage réel : `air` / `diffuse_chaud` / `diffuse_froid` / `serviette` (+ `inconnue`).
- `curlyHold` — fixant réel : `gel` / `mousse` / `creme` / `rien` (+ `inconnue`).
- `transitionStep` — part de longueurs traitées restantes : `majorite` / `minorite` / `quasi_nulle` (+ `inconnue`).

Effets, tous vérifiés dans les rendus (pas seulement dans les drapeaux) :

| Réponse | Effet rendu |
|---|---|
| dry ∨ hold connu (bouclé/crépu au naturel) | nouvelle étape du jour de lavage « **Séchage et finition, calés sur vos habitudes** », composée de 1 ou 2 fragments selon ce qui est déclaré (jamais les deux si une réponse est inconnue) |
| serviette | « …remplacez le frottement… par la presse — t-shirt de coton ou microfibre… Le frottement est votre frizz ; le produit n'y peut rien. » |
| diffuse_chaud | protecteur + « air coupé aux trois quarts du séchage » |
| diffuse_froid | « le bon réflexe — gardez-le » (confirmation, pas répétition) |
| air | « ne plus toucher les mèches une fois le produit posé » |
| gel | « le carton est un moule… une goutte d'huile… on froisse pour casser le film » |
| mousse | « sur cheveu très mouillé — jamais en retouche sur cheveu quasi sec » |
| creme | « si la forme fond, le correctif est un gel au seul jour de coiffage — pas plus de crème partout » |
| rien | « rien n'est imposé ; un essai au seul jour de lavage suffit pour vérifier » |
| inconnue (les deux) | **rien** — pas d'étape, pas de ligne de résumé (compat ascendante prouvée : routine JSON identique à l'avant) |
| majorite | « Le choix honnête » : « …le cap utile n'est pas la coupe, c'est la stabilisation… retouches jamais plus rapprochées que 8 à 10 semaines » |
| minorite | « Le fade est engagé : la ligne recule, la zone fragile recule avec elle… pas avant, elles ne sont pas encore remplacées » |
| quasi_nulle | « le programme quitte le mode réparation… rien à "homogénéiser" chimiquement » |
| chaque réponse | une ligne de résumé dédiée qui dit la décision prise (jamais ce que le cycle ne tient pas) |

### 2.2 Les gardes (leçon D9 : la réponse ne doit JAMAIS fuiter hors segment)

Tout est gardé **dans `flags()`**, à la source — pas dans les builders :

- `curlyDry`/`curlyHold` : texture frisée ou bouclée **et** style naturel **et** pas de locks **et** pas d'enfant
  (la question ne lui est pas posée : une réponse rémanente d'un ancien profil ne doit rien injecter chez lui).
- `transitionStep` : texture défrisée ou style défrisé, et **le cycle transition réellement servi** —
  hors locks, perruque, protectrice, enfant. (Un profil « défrisée + tresses » est un cycle protecteur ;
  le résumé ne doit rien promettre que la routine affichée ne tient pas — règle D9 généralisée.)
- Contradiction 1.3 : défrisé(ée) + `chemicalHeat: 'aucun'` → `chem = ''` : plus de « vierges de
  chaleur », plus d'étape « règle des trois ». Les vraies vierges (jamais touché, pas défrisées) gardent leur ligne.

### 2.3 La page (le tuyau, pas l'usine à gaz)

Le tube serveur→moteur était déjà consolidé au D9 (`buildHairAdvisoryCtx`, unique traduction
réponses→contexte) : **les trois nouveaux champs transitent sans rien patcher côté consommateur** —
la consolidation D9 a directement payé. Côté formulaire :

- les deux questions boucles n'apparaissent que sur `isCurlyNow` (frisée/bouclée, naturel, adulte, hors locks) ;
- `transitionStep` **remplace** `chemicalHeat` en profil défrisé (la texture a déjà répondu « produit » ;
  reposer la question serait du remplissage) ;
- défauts `inconnue` partout : quiconque n'a pas vu la question obtient l'ancien comportement.

### 2.4 Le typage

`src/types.ts` : trois champs optionnels ajoutés aux réponses du diagnostic — le payload ancien,
sans eux, reste valide (compat ascendante contractuelle, pas seulement observée).

---

## 3. Les preuves (exécutées, pas promises)

1. **Nouveau banc** `tests/kurla_diagnostic_boucle_transition.test.ts` — **25/25** :
   F1–F12 bout-en-bout (réponse → ctx → étape exacte → fragment exact → ligne de résumé ; inconnue ≡ avant,
   comparaison JSON) ; E1–E12 gardes (locks/enfant/hors-transition/hors-boucles = rien ; anti-blanchiment :
   aucune liste blanche locale réapparue dans recommendations.ts / diagnosticResult.ts ; builder = seul tuyau).
   Branché dans `package.json` (`test:diagnostic-curly-transition`) et dans la chaîne `npm test`.
2. **Matrice personas** `kurla_diagnostic_personas.test.ts` — **47/47 sur 3 404 profils**, étendue D10 :
   séchage/fixant/transition sont balayés **partout, y compris hors de leur profil** (rémanences volontaires) ;
   invariants : l'étape boucles apparaît ⇔ profil bouclé naturel adulte connu, chaque fragment rendu est
   exactement celui de la réponse (ni plus ni moins), la promesse de transition n'existe que dans le cycle
   transition. Au passage : le jeton de style balayé était `defrie` (inexistant) — corrigé en `defrise`,
   le vrai : la matrice balaie désormais les profils défrisés réels.
3. **Banc D9 rejoué** : 17/17 (F1 adapté : `chemicalHeat` peut être remplacée par `transitionStep`, jamais
   posée à un enfant — le contrat initial est renforcé, pas relâché).
4. **13 bancs voisins** tous verts (hair-advisory 18, advisory peau 11, segments 49 couples, qualité 25,
   guardrail 10, care-kit 9, params 10, adaptive, style-fit, need-coverage, C4, routine-segments 218,
   evolution 11).
5. **tsc 0 · vite build 0**.
6. **Navigateur Playwright à 390px, deux parcours complets** (le seul jugé capable de voir ce que les
   bancs ne voient pas — réponse coupée en route, question posée au mauvais profil, texte qui déborde) :
   - frisée serviette+gel : les 2 questions posées, l'étape « Séchage et finition » rendue avec les deux
     fragments, les 2 lignes de résumé, chaleur/chimie posée (adulte), transition non posée — 11/11 ;
   - défrisée fade engagé : question transition posée **à la place** de chaleur/chimie, fragment « Le fade
     est engagé » + résumé « Transition engagée », aucune règle chaleur inventée, aucune « récompense vierge »,
     questions boucles absentes — 9/9. Les deux : `overflow = 0`, erreurs console = 0.

## 4. Décisions assumées (pour l'audit futur)

- « Le diffuseur chaud n'est pas interdit » : la routine garde l'outil de la cliente et pose ses deux
  gardes. Interdire = perdre la confiance ; cadrer = la garder. (Même logique que le D9 sur le fer.)
- `curlyHold: 'rien'` **sert une étape quand même** : « rien » est une information (la forme se joue au
  séchage), pas une absence — avec un test à faire, pas une prescription subie.
- Enfant exclu **deux fois** (question non posée + garde moteur) : seule défense contre les rémanences
  d'un payload antérieur, le moteur ne faisant pas confiance au formulaire.
- Le résumé itère sur les drapeaux déjà gatés : aucune liste de conditions recopiée (leçon D9 : deux
  listes finissent par diverger).

## 5. Reste ouvert (hors périmètre, noté)

- La question du scrunching (avec/sans) reste non posée : une fois le séchage et le fixant connus,
  son effet marginal est faible et la question coûterait un écran de plus — à réouvrir sur demande client.
- Segments « ondulé 2 » et « perruque sur cheveux naturels » n'ont pas encore eu leur tour d'audit
  question-par-question ; ils sont les prochains candidats naturels de ce programme.
