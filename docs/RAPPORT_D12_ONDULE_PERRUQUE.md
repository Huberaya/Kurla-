# D12 — Rapport : ondulé 2 rendu posable, perruque dotée de ses deux questions

**Date : 20/09 — suite du programme « le diagnostic est le cœur » (D9 crépu → D10 bouclés+transition → D11 locks → D12 ondulé+perruque).**
Même discipline : une question = un effet vérifié dans le rendu ; inconnu = comportement d'avant
prouvé au JSON près ; jamais de question hors cycle ; bancs + matrice + navigateur avant livraison.

---

## 1. L'audit — deux trouvailles, de gravités très différentes

### 1.1 Ondulé 2 : le segment n'existait PAS
En préparant l'audit question par question, le grep a été sans appel : le jeton `ondee`/`ondulee`
n'existait **nulle part dans src** — pas dans `HairTexture`, pas dans le formulaire, pas dans le
moteur, pas dans les segments. La matrice personas balayait un 'ondee'… qui ne correspondait à rien
(deuxième fois après `defrie` au D11 : les balayages inventés cachent les trous). Une cliente à
vagues se voyait donc offering : « Frisée / Bouclée (3B-3C) » (→ routine trop riche pour elle) ou
« je ne sais pas ». Les sources sont formelles : le type 2 est de la famille des boucles mais sa
faute n°1 est la crème héritée du 3 — « wavy hair is often mistaken for straight hair and styled
like it, which is exactly why it underperforms ».

### 1.2 Perruque : le cycle existait, la réalité de la pose non
Le cycle perruque (D7) savait parler au dessous (raie, tempes, respiration entre poses) mais ne
posait **aucune question sur la pose elle-même** — alors que les deux questions reines de la
communauté sont « avec quoi tu la tiens ? » et « tu la gardes combien de temps ? ». Le moteur ne
pouvait donc rien caler : ni le plafond de six semaines, ni le solvant à la dépose, ni la vérification
des signes d'intolérance, ni la nuance glueless (le plus sûr — à confirmer, pas à soupçonner).

## 2. Le web — les questions réellement posées (sources en §6)

**Ondulé** : sous-types 2A/2B/2C (léger→dense) ; lavage « quand la racine alourdit, pas au calendrier »
(rythme 1–4 jours selon sous-type) ; produits légers sur cheveu trempé, mousse > crème ; le poids
des beurres/huiles comme ennemi n°1 ; « mon dessin fond dans la journée » = dosage, pas nature.
**Perruque** : colle 2–6 semaines MAXIMAL (dépose conseillée à 7–14 jours) ; adhésifs = premiers
responsables des alopicie de traction du contour et des dermatites de contact (test patch 24 h avant
première pose recommandée) ; tape = résidu à dissoudre avant de frotter ; glueless = le plus sûr pour
les tempes, mais l'élastique use le contour s'il est trop serré ; odeur/démangeaison/brûlure sous une
pose = dépose immédiate, pas un linge propre de plus.

## 3. Ce qui a été fait

### 3.1 Ondulée (2A–2C) : une texture posable avec sa physique
- Nouveau jeton `ondulee` de bout en bout : types, carte du formulaire (avec visuel SVG dédié —
  ondes amples —, miroir affiché du profil, mapping des labels côté compte beauté au passage —
  `bouclee` n'y figurait pas non plus, il y est), table de segments (naturel ondulé → segment
  « boucles au naturel », locks → cycle locks), dérivations et hairScience (la famille des boucles :
  observations forme/frisottis l'inclusent désormais).
- Règle du segment dans le cycle naturel : à la place de « Hydrater puis sceller (LCO) », une étape
  « **Hydrater léger — la règle des ondes** » (leave-in dos noisette, mousse/gel aérien sur cheveu
  trempé, pas d'huile en racine) ; le rythme de lavage du 2 ajouté au shampoing (« le calendrier cède
  à la racine ») ; la leçon LCO lui est **refusée** (elle contredirait sa règle) ; porosité faible
  garde sa propre branche « Soins légers » qui dit la même physique — la matrice accepte l'une OU
  l'autre, jamais la LCO.
- Les deux réponses du D10 (séchage, fixant) lui sont désormais posées — même gate (naturel, adulte,
  hors locks) : c'est exactement là que les vagues se jouent.

### 3.2 Perruque : deux réponses, huit effets
- `wigBond` (colle / adhésif double-face / sans adhésif / inconnu) : clause dédiée à la **dépose**
  hebdo (solvant « jamais à l'arraché » + test cutané 24 h pour la colle ; dissolution du résidu
  AVANT de frotter pour la tape ; « le contour se contrôle quand même » pour le glueless) + append du
  soir : sous colle/tape, les signes (démangeaison persistante, brûlure, odeur) **interrompent** la
  portée.
- `wigWear` (chaque jour / ~une semaine / 2–4 semaines / au-delà sans dépose / inconnu) : sur
  l'étape « respirer entre deux poses » — dépose immédiate + repos si portée continue (« six semaines
  est un plafond, pas un objectif »), contrôle à mi-parcours si 2–4 semaines, confirmations ciblées
  des deux formats sains.
- Une ligne de résumé par réponse connue ; rien sinon.

### 3.3 Les gardes (dont une trouvée par la matrice, pas par l'homme)
- Perruque = cycle perruque seulement : **locks sous perruque → questions non posées, effets ignorés**
  (priorité D5 « locks toujours locks »), et la garde n'existe pas qu'à la page — flags() l'ignore à la
  source.
- **L'enfant sous perruque** (priorité démêlage, style wig) : cycle enfant → la routine adhésif
  n'existe pas. La matrice a pris le résumé en flagrant délit de promesse (« Rythme de pose… » servi
  à un enfant en cycle enfant) — la garde `!demelage_enfant` a été ajoutée aux deux flags et au gate
  de page, dans le même élan que les leçons D9/D10. C'est la 3ᵉ fois que le balayage attrape une
  promesse hors cycle ; il a raison d'exister.
- Valeurs hors whitelist → blanc ; rémanences croisées (ondulée portant des réponses locks/transition
  d'un ancien profil → ignorées ; faux jeton 'ondee' d'un payload ancien → comportement générique,
  prouvé).
- Le tuyau unique du D9 absorbe les deux clés sans toucher aux consommateurs (vérifié : aucune liste
  blanche locale n'est réapparue).

## 4. Preuves (exécutées)
1. Banc `tests/kurla_diagnostic_ondule_perruque.test.ts` **32/32** (branché dans `npm test`) : effets
   rendus des deux segments, LCO jamais servie à l'ondulée, leçon refusée, plafond rendu, garde locks
   ET enfant, compat inconnu ≡ absent au JSON près, faux jeton ancien tombé bien, gates de page.
2. Matrice personas : jeton `ondulee` réel dans le balayage (le faux 'ondee' retiré), rémanences
   perruque balayées **sur les 3 428 profils** — invariants clause ⇔ cycle+réponse (8 réponses),
   règle des ondes ⇔ cycle ondulé sans LCO jamais. **47/47**.
3. Banc segments : le balayage est passé de 49 à **56 couples** (texture × style) — un segment unique
   par couple, ondulee compris. **PASS**.
4. Régressions : bancs D9 17/17, D10 OK, D11 OK (les siens passent inchangés), 18 bancs voisins verts
   dont wig-fit et texture-gap, tsc 0, vite build 0.
5. Playwright 390px, 3 parcours — **29/29** : ondulée (carte vue, questions boucles posées, règle des
   ondes rendue, aucune LCO, résumé conforme ; 1 échec au 1ᵉʳ run venait d'une ancre de script trop
   courte — corrigée, pas le produit) ; perruque colle+continue (les 2 questions, solvant, patch,
   plafond, signes du soir, résumé) ; locks sous perruque (questions perruque JAMAIS posées, cycle
   locks + freeform rendus, aucune clause adhésif). over=0, erreurs console=0 partout.

## 5. Décisions assumées
- L'ondulée **reçoit les réponses boucles du D10** plutôt qu'un troisième questionnaire : mêmes
  questions, mêmes fragments — c'est la physique du séchage, pas une coiffure. Sa différence (légèreté)
  est portée par sa propre étape d'hydratation.
- Ondulée + porosité faible : la branche « Soins légers, bien placés » gagne sur « règle des ondes »
  — les deux disent la même loi (« en moins, pas en plus ») ; enchaîner les deux serait du remplissage.
- La colle n'est pas diabolisée : ses deux gardes (plafond + solvant) sont données comme ce qui la
  rend tenable. « Chaque méthode a son plafond de sécurité, et la routine le pose. »
- Le glueless est **confirmé** (« le choix le plus sûr pour les tempes ») avec quand même la
  vérification contour : récompenser sans relâcher la garde.

## 6. Sources (20/09)
- themestizamuse.com — “Wavy Hair Routine for 2A/2B/2C” (rythmes, stylers, « styled like straight hair »).
- reddit r/Wavyhair « fine 2a waves » + r/curlyhair wavy routines (mousse > crème, trop de produits =
  dessin fondu, low-poo fréquent).
- wigshumanhair.com — glue vs tape vs grip vs combs (durées, risque contour, « glue = special occasions »).
- eathealthy365.com — “Wig Glue Explained” (dépose 7–14 jours, glueless non obligatoire).
- wellyhub.com — “How Long Do You Keep a Glued Wig On” (plafond 6 semaines, traction, solvant).
- forumine.com — threads durée de pose (« never wear a lace wig more than 6 weeks »).
- ehwap.com — “safe extended use” (patch test, ne jamais arracher la lace encollée, signes d'alerte).

## 7. Reste ouvert
- Sous-types 2A/2B/2C non demandés : les sources les distinguent surtout par la densité/porosité déjà
  couvertes — à ouvrir si les retours clients le demandent.
- Fréquence de lavage réelle sous perruque (dessous vs perruque elle-même) : le cycle la traite en
  prose ; une question « lavage du dessous » serait la prochaine candidate si le journal d'évolution
  la réclame.
- Le compte beauté stockait « bouclée » pour frisée comme pour bouclée — corrigé au passage (ondulée
  a son label) ; à surveiller côté filtres de produits (ils groupent par familles, pas par libellés).
