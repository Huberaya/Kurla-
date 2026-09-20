# Propositions de chantiers — faire de KURLA le meilleur diagnostic cheveux au monde

**Date** : 20/09 · **Objet** : propositions (pas d'exécution) · **Décisions attendues** : ordre, arbitrages de périmètre.

---

## 0. Ce que « meilleur au monde » veut dire, concrètement

Un slogan ne se défend pas. Voici les cinq claims que KURLA peut tenir **et prouver** — c'est notre
étoile polaire, et chaque chantier ci-dessous sert au moins une de ces lignes :

| # | Claim | Comment on la prouve aujourd'hui | Où est le trou |
|---|---|---|---|
| 1 | **Jamais générique** : deux profils différents reçoivent deux routines différentes | bancs + matrice 3 389 profils | ✅ tenu |
| 2 | **Le seul qui se souvient** : le diagnostic sait ce que vous avez déjà fait, et recale | journal D2 existe, mais pas de « V2 » | ❌ **chantier C1** |
| 3 | **Le seul qui dit ce qu'il ne sait pas** : limites, confiance, signaux d'orientation | red flags dans le moteur, invisibles côté client | ❌ **C11** |
| 4 | **Le seul qui croise peau et cheveux** : la lisière, la nuque, le rinçage | deux moteurs séparés, jamais croisés | ❌ **C6** |
| 5 | **Vérifiable** : chaque conseil est traçable à une source, testé par un banc | rapports D9–D14 | ✅ tenu |

Claims 1 et 5 sont acquises. **Les claims 2, 3 et 4 sont le terrain où personne ne joue** — et
c'est là que se trouve le titre.

---

## 1. Où est le marché en 2026 (et ce qu'il ne faut pas copier)

| Acteur | Ce qu'ils font | Chiffres avancés | Source |
|---|---|---|---|
| **Haut.AI** | selfie + questionnaire court, **6 métriques visibles** (courbure, densité, volume, frizz, couleur, uniformité), 19 préoccupations, < 1 min, B2B | lancé commercialement en 2026 | [1](https://www.prnewswire.com/news-releases/hautai-launches-ai-powered-hair-analysis-for-beauty-brands-worldwide-302865372.html) |
| **Tangent AI** | selfie + quiz guidé, catalogue marchand | **88 % de complétion** avec selfie ; +45 % AOV (Bondi Boost), +28 % (Moroccanoil) | [2](https://www.tangent.ai/best-ai-hair-analysis-apps) |
| **Perfect Corp** | quiz photo, jusqu'à 10 motifs de boucle | classification « objective » revendiquée | [8](https://www.perfectcorp.com/business/blog/hair/hair-chart) |
| **Prose / Function of Beauty** | quiz → formule sur mesure | la référence grand public | [6](https://www.ringly.io/discover/best-haircare-brands) |
| **MyHair.ai / MDhair** | photo du cuir chevelu, score, suivi de densité, dermato à distance | le marché de la chute | [5](https://www.myhair.ai/blog/top-hair-analysis-apps-6) |
| **Freudly** | quiz de **87 questions** | le contre-modèle « long » | [7](https://freudly.ai/tests/curl-type-quiz/) |

**Lecture** : le marché court après deux choses — la **photo** (tout le monde la fait) et la
**rapidité** (1 minute). Personne ne travaille la **profondeur temporelle**, la **vérité
scientifique** ou le **croisé peau/cheveux**. C'est notre angle.

Deux signaux faibles à ne pas ignorer :

- **La porosité est en train de devenir un repoussoir chez les gens sérieux.** CurlsBot documente
  que la « porosité internet » regroupe des phénomènes sans rapport (test du verre, test du
  spray, test d'élasticité mesurent des choses différentes), que le test du flotteur est
  invalidé, et que **le motif, l'épaisseur du cheveu, la densité et la formulation comptent
  davantage** que la porosité pour les décisions de soin [3](https://www.curlsbot.com/blog/hair-porosity-explained).
- **La classification A/B/C est attaquée** : une revue systématique 2025 (citée par plusieurs
  quiz concurrents) note que les sous-types A/B/C sont appliqués de façon inconsistante et que
  la courbure se mesure mieux qu'elle ne s'évalue à l'œil
  [4](https://tool.teamzlab.com/grooming/hair-type-quiz/). Nous venons justement d'ajouter
  2A/2B/2C au D14 : **ce chantier rend la question de la fiabilité de l'auto-déclaration
  stratégique** (voir C9).

---

## 2. Les chantiers

Effort : **XS** (< 1 séance) · **S** (1 séance) · **M** (2–3 séances) · **L** (≥ 4 séances).
Chaque chantier porte son critère d'acceptation **testable** (banc / matrice / Playwright), dans
notre discipline habituelle.

---

### C1 — Le diagnostic qui se souvient : la V2 recalée par l'observation ❗ *le chantier n°1*

**Constat.** Aujourd'hui, revenir faire un diagnostic = tout recommencer de zéro. Le journal D2
existe, mais la page résultat ne sait pas que vous avez un historique. C'est le plus gros écart
entre KURLA et « un quiz ».

**Proposition.** Un **diagnostic V2** qui ne repose que 3–5 questions — celles qui ont bougé —
et qui **explique la différence** :
« Depuis avril, vous avez déclaré des longueurs défrisées à 60 % ; elles sont aujourd'hui à 20 %.
Deux conséquences : la démarcation n'est plus votre point de contrôle, et le soin de force
devient inutile sur les deux tiers de la tête. »

**Ce que ça change.** La routine n'est plus un instantané, c'est une trajectoire. C'est aussi le
seul actif que personne ne peut copier en branchant une API de vision.

**Effet de bord très concret** : la V2 est le meilleur moment pour capter l'e-mail et pour
déclencher le bon produit — donc une conversion meilleure que la V1, pas pire.

**Acceptation.** Banc : « une V2 avec une seule réponse modifiée produit exactement une
différence expliquée, et le reste à l'identique » ; matrice : aucun profil V2 ne rend une phrase
du type « comme la dernière fois » sans contenu. Effort **M** (dépend de D2 consolidé).

---

### C2 — La densité : la variable manquante

**Constat.** Nous demandons la **largeur** du cheveu (fin/moyen/épais) mais jamais la **densité**
(nombre de cheveux). Or les deux se confondent dans la tête des clientes — et se contredisent
souvent : *cheveu fin + très dense* et *cheveu épais + clairsemé* donnent des routines
opposées. Tous les concurrents sérieux citent la densité parmi les 4–5 variables de base
[2](https://www.tangent.ai/best-ai-hair-analysis-apps) [7](https://freudly.ai/tests/curl-type-quiz/).

**Proposition.** Une question observable, sans jargon : « quand vous faites une raie, vous voyez
… » (le cuir chevelu largement / un peu / pas du tout) + la circonférence de queue de cheval.
Effets rendus : **dosage**, **nombre de sections**, **temps de séchage attendu**, attentes de
volume, et le piège déminé (« vos cheveux sont fins mais nombreux : le volume ne viendra pas
d'un produit qui gaine »).

**Acceptation.** Banc : le croisement {fin × dense} ≠ {fin × clairsemé} sur au moins 3 lignes de
routine ; matrice balayée avec rémanences ; Playwright 390 px. Effort **S–M**.

---

### C3 — L'eau et l'air : eau dure + humidité

**Constat.** Deux variables qui changent tout le quotidien, et qui ne sont **jamais** demandées.
Ce sont pourtant des FAQ massives et documentées :
« hard water » revient en boucle sur r/curlyhair et r/HaircareScience — chélation vs
clarification (EDTA, vinaigre), cadence mensuelle, « mes cheveux n'étaient plus les mêmes depuis
que j'ai déménagé » [2](https://www.reddit.com/r/curlyhair/comments/tpjcwx/hard_water_what_do_you_all_do/)
[4](https://www.reddit.com/r/HaircareScience/comments/10e1rly/hard_water/) ; et le lien
humidité/glycérine est décrit par les utilisatrices elles-mêmes
[5](https://www.reddit.com/r/curlyhair/comments/189x1w9/help_with_living_with_hard_water/).
Notre propre moteur cite déjà « l'eau calcaire » dans cinq routines sans jamais la demander —
c'est un aveu.

**Proposition.** Deux questions : **dureté de l'eau** (dépôt calcaire visible / cheveux qui
« accrochent » / filtre de douche) et **comportement par temps humide** (les ondes gonflent,
s'allongent, ou ne bougent pas). Effets : cadence de chélation réelle (et son garde-fou : jamais
hebdomadaire par défaut), et le conseil humectants — glycérine — qui devient conditionnel au
climat au lieu d'être un dogme.

**Garde-fou.** On **demande**, on ne géolocalise pas (règle : pas de solution pays-spécifique).

**Acceptation.** Banc : eau dure → ligne de chélation avec sa cadence et son contre-garde ;
temps humide → conseil humectants inversé selon la réponse ; 0 conseil « clarifiez chaque
semaine » par défaut. Effort **S–M**.

---

### C4 — Le temps réel du jour de lavage

**Constat.** Nous demandons le budget en euros, pas le **temps**. Une routine de 90 minutes
n'est pas une routine : c'est un vœu pieux. Aucun concurrent ne le demande.

**Proposition.** « Combien de temps pouvez-vous réellement consacrer à votre jour de lavage ? »
(< 20 min / 20–45 min / une heure ou plus, tranquille). Effet : une **variante courte** de la
routine — les mêmes gestes, mais l'ordre et le nombre de sections changent, et l'étape
optionnelle est marquée comme telle au lieu d'être glissée en fin de liste.

**Acceptation.** Banc : le profil « < 20 min » produit une routine dont la somme des gestes est
compatible, sans supprimer un geste utile (interdit de supprimer le démêlage) ; Playwright.
Effort **S**. **Rapport valeur/effort probablement le meilleur du lot.**

---

### C5 — L'honnêteté sur la porosité (chantier scientifique)

**Constat.** La porosité pilote aujourd'hui une branche entière de notre moteur. Or la
littérature grand public sérieuse montre que « la porosité » recouvre au moins trois choses
sans rapport, que les tests maison se contredisent, et que **motif, épaisseur et densité
priment** sur elle dans les décisions de produit
[3](https://www.curlsbot.com/blog/hair-porosity-explained). Nous risquons d'être **précis sur
une variable qui n'explique pas grand-chose** — le pire défaut pour un diagnostic.

**Proposition.** Ne pas supprimer la question : **la recadrer**. Passer de « quel est votre type
de porosité » à **« comment vos cheveux se comportent-ils »** (vitesse de mouillage / de
séchage, dépôts, produit qui reste en surface), et distinguer explicitement la **porosité de
dommage** (longueurs sensibilisées — démarcation) du comportement natif. Puis **dire au client
ce que ça décide et ce que ça ne décide pas**.

**Pourquoi c'est un avantage compétitif et pas une régression.** Être la seule plateforme à
écrire « ce test que vous avez vu partout ne mesure pas ce qu'on vous dit » est un actif de
confiance énorme, et ça nous protège de nos propres erreurs.

**Acceptation.** Banc : aucune phrase de routine ne justifie un choix **uniquement** par la
porosité (toujours croisée avec motif/largeur/densité) ; matrice ; une carte science dédiée.
Effort **M** (touche au cœur du moteur — à faire après C2).

---

### C6 — Le croisé peau ↔ cheveux : la lisière, la nuque, le rinçage

**Constat.** KURLA a **deux** diagnostics (peau et cheveux) qui ne se parlent jamais. Or le
problème le plus fréquent et le moins servi est à la frontière : boutons sur le front, les
tempes, la nuque, le dos — causés par les produits capillaires et par l'ordre de rinçage. Aucun
acteur du marché ne peut le traiter : il faut posséder les deux moteurs.

**Proposition.** Un croisement explicite : si la priorité peau touche le front/tempes/nuque et
que le cycle cheveux utilise des produits occlusifs ou un coiffage plaqué, alors **la routine
cheveux change** (ordre de rinçage, protection de la lisière la nuit, décalage des soins), et
réciproquement la routine peau mentionne la cause capillaire.

**C'est la claim n°4** — la seule que ni Haut.AI, ni Prose, ni un quiz Shopify ne peut imiter.

**Acceptation.** Banc croisé : N couples {profil peau × profil cheveux} avec au moins une
dérivée par couple, jamais une simple juxtaposition des deux routines ; invariant : la peau
n'est jamais rabaissée au profit du cheveux (règle permanente). Effort **M**.

---

### C7 — La chute : le périmètre beauté, pas la médecine

**Constat.** C'est le premier motif de recherche capillaire et le marché le plus financé
(Vegamour, MDhair, MyHair.ai [5](https://www.myhair.ai/blog/top-hair-analysis-apps-6)
[6](https://www.ringly.io/discover/best-haircare-brands)). KURLA n'en parle qu'en négatif
(« plaques, douleur, chutes localisées = avis professionnel », déjà dans le moteur).

**Proposition.** Un **chantier de périmètre** d'abord : distinguer ce qui est du ressort d'une
routine (casse au démêlage, chute saisonnière, traction de coiffage serré, post-partum
*exprimé en observation, jamais en statut*) de ce qui ne l'est pas — puis traiter le premier
avec la même rigueur que le reste. Le garde-fou RGPD reste absolu : on stocke une
**observation**, jamais un statut de santé.

**Effet attendu.** Énorme en acquisition. Risque : le plus élevé du lot — d'où la nécessité
d'un cadrage écrit avant la moindre ligne de code. Effort **L** (cadrage **S**).

---

### C8 — Ce que vous avez déjà : produits en stock + ingrédients refusés

**Constat.** Le diagnostic recommande une routine sans savoir ce qu'il y a déjà dans la salle de
bain. Résultat : on jette, on rachète, et la cliente culpabilise.

**Proposition.** Une étape courte et facultative : « qu'avez-vous déjà ? » (types de produits,
pas des marques) + « y a-t-il des ingrédients que vous évitez ? » (silicones, sulfates, parfum,
allergènes déclarés). Effet : la routine **s'appuie** sur l'existant, ne remplace que le
nécessaire, et les recommandations produits respectent les refus.

**Bénéfice business direct** : alimente la phase ② comparaison et la phase ④ boutique avec une
préférence réelle, déclarée, réutilisable.

**Acceptation.** Banc : une routine construite sur un stock déclaré cite au moins un produit
conservé, et ne recommande jamais un produit contenant un ingrédient refusé. Effort **M**.

---

### C9 — La photo : utile, pas magique

**Constat.** Le marché entier y va (Haut.AI, Tangent, Perfect Corp [1](https://www.prnewswire.com/news-releases/hautai-launches-ai-powered-hair-analysis-for-beauty-brands-worldwide-302865372.html)
[2](https://www.tangent.ai/best-ai-hair-analysis-apps) [8](https://www.perfectcorp.com/business/blog/hair/hair-chart)),
avec des arguments de complétion solides (88 %). Mais : nos propres sous-types A/B/C reposent
sur une auto-déclaration que la littérature dit peu fiable
[4](https://tool.teamzlab.com/grooming/hair-type-quiz/), et une boîte noire à 6 métriques
n'explique rien — donc ne correspond pas à nos claims 1 et 5.

**Proposition, en deux temps.**
1. **Sans IA du tout (S)** : la photo sert à **vous comparer vous-même** — capture guidée
   (même lumière, même distance, mêmes repères), rangée côte à côte à J0 / J+30 / J+90, stockée
   chez la cliente. C'est le **C1 qui devient visible**. Précieux, et personne ne le fait
   correctement.
2. **Ensuite seulement (M–L)** : une **aide à la reconnaissance du motif** qui *propose* une
   réponse que la cliente confirme (« il me semble voir un S net à mi-longueurs — c'est ça ? »).
   La photo **ne décide jamais seule** ; le moteur reste la source. Conforme à notre règle
   « rule-based vs IA décidé au cas par cas ».

**Garde-fous** : consentement explicite, stockage minimal, rien ne quitte l'appareil sans
action, aucune donnée biométrique inférée ; et l'on affiche les limites (lumière, produit dans
le cheveu, motifs mixtes — très courants).

**Effort** : 1 = **S**, 2 = **M–L**. **Recommandation : faire 1, attendre avant 2.**

---

### C10 — Les segments non couverts : hommes, barbe, chute post-partum, greffe/aloipécie

**Constat.** Le parcours actuel couvre : crépu 4A–C, bouclé/frisé, ondulé 2A–C, locks,
perruque/tissage, protectrice, transition, enfant. Manquent : **hommes** (parcours dédié, pas
une variante), **barbe** (peau + poil, croisement naturel avec C6), et la **chute** (C7).

**Proposition.** Un cadrage de marché avant tout code : volume de recherche, panier, concurrence.
Le chantier n'est lancé que si l'arbitrage est favorable.

**Effort** : cadrage **S**, exécution **M** par segment.

---

### C11 — « Ce que ce diagnostic ne peut pas dire » (quick win)

**Constat.** Le moteur contient déjà des red flags excellents (plaques, douleur, chutes
localisées → avis professionnel) : ils sont **invisibles côté client**, ou noyés en fin de
paragraphe.

**Proposition.** Un bloc court, en haut de résultat, qui affiche : ce que KURLA a **déduit** vs
ce que vous avez **déclaré**, le **degré de confiance** (une réponse « je ne sais pas » doit se
voir), et **les trois signaux** qui doivent faire consulter. Contre-intuitif : c'est ce qui
fait le plus pour la confiance — et c'est la claim n°3.

**Effort XS. À faire dans la première vague, quoi qu'on décide du reste.**

---

## 3. Ordre recommandé

**Vague 1 — la confiance et l'adhérence (≈ 2–3 séances)**
1. **C11** — les limites affichées (XS)
2. **C4** — le temps du jour de lavage (S)
3. **C3** — eau dure + humidité (S–M)

Trois chantiers à fort effet visible, faible risque, qui ne touchent pas au cœur du moteur.

**Vague 2 — la profondeur (≈ 3–4 séances)**
4. **C2** — la densité (S–M)
5. **C5** — l'honnêteté sur la porosité (M) — *après C2, car la densité est un des appuis du recadrage*
6. **C6** — le croisé peau ↔ cheveux (M) ← **notre claim la plus inimitable**

**Vague 3 — l'avance décisive (≈ 4+ séances)**
7. **C1** — le diagnostic V2 qui se souvient (M) ← **le vrai fossé**
8. **C8** — l'existant et les ingrédients refusés (M)
9. **C9-1** — la photo de progression, sans IA (S)

**En cadrage permanent** : C7 (chute) et C10 (segments) — arbitrage écrit avant toute ligne de code.

---

## 4. Ce que je ne ferais pas

- **Copier la boîte noire à 6 métriques** (Haut.AI). Elle ne sait pas expliquer : incompatible
  avec nos claims 1 et 5, et elle nous rend dépendants d'un fournisseur pour notre cœur de
  métier.
- **Le quiz de 87 questions.** La longueur n'est pas la profondeur ; la profondeur, c'est
  l'effet de chaque réponse.
- **La photo décisionnelle** (« l'IA dit que vous êtes 3B ») : l'auto-déclaration assistée, oui ;
  la vérité par algorithme, non — surtout sur cheveux texturés, où l'entraînement des modèles
  est notoirement pauvre.
- **Géolocaliser le climat ou la dureté de l'eau** : on demande. (Règle permanente : pas de
  solution pays-spécifique.)
- **Toucher à la porosité avant d'avoir la densité** : on retirerait un appui avant d'avoir posé
  l'autre.

---

## 5. Décisions que j'attends de toi

1. **L'ordre** : valides-tu la vague 1 telle quelle (C11 → C4 → C3) ?
2. **C5 (porosité)** : es-tu prêt à ce qu'on dise publiquement que le test du verre ne mesure
   rien ? C'est le chantier le plus clivant — et le plus défendable.
3. **C7 (chute)** : veux-tu qu'on ouvre ce marché, avec le périmètre « observation beauté /
   orientation professionnelle » ? C'est le plus gros en acquisition, le plus risqué en
   conformité.
4. **C9 (photo)** : veux-tu la version « progression sans IA » dès la vague 3, ou attendre ?

**Je ne commence rien sans ton accord sur l'ordre.**
