# Vague 1 — C11 (limites affichées), C4 (temps du jour de lavage), C3 (eau et air)

**Date** : 20/09 · **Agent** : diagnostic · **Statut** : livré, vérifié, poussé.
**Programme** : `docs/PROPOSITION_CHANTIERS_DIAGNOSTIC_MONDIAL_2026-09.md` (vague 1 sur 3).

## 0. Le chantier le plus important n'était pas une question

En parcourant la vague 1 en conditions réelles (Playwright), un bug grave est apparu,
sans rapport avec les trois chantiers prévus : **le résumé du moteur n'était pas celui
que voyait la cliente.**

La route `/api/ai/routine-result` construisait son texte de triage médical ainsi :

```ts
const answerText = JSON.stringify(answersForAi);   // ← les ids techniques
const triage = medicalTriage(answerText);
```

Le détecteur d'urgence travaille par **racines** (`respir`, `gonfle`, `saigne`,
`hémorrag`…). Or les réponses d'un questionnaire sont des identifiants : ma nouvelle
réponse `humidity: 'gonfle'` (« mes cheveux gonflent par temps humide ») a été lue
comme un œdème. Résultat : **fausse alerte « signes potentiellement urgents, appelez le
15 »**, et — plus grave encore — le message d'urgence **remplaçait tout le résumé du
diagnostic** (`summary: result?.summary || buildHairAdvisorySummary(...)`).

Autrement dit : une cliente qui répondait « mes cheveux gonflent quand il pleut »
perdait l'intégralité de son interprétation personnalisée au profit d'un message
d'urgence absurde. Le défaut préexistait ; une réponse honnête l'a révélé.

**Correctif** — `pickFreeTextForTriage()` (dans `src/lib/ai/guardrails.ts`) : le triage
ne porte plus que sur du **texte libre** (au moins deux mots, 20 caractères minimum).
Un identifiant n'exprime rien de l'état de santé de la personne ; seule une phrase
qu'elle a écrite le peut.

| Entrée | Avant | Après |
|---|---|---|
| `{ humidity: 'gonfle', water: 'calcaire' }` | urgence « appelez le 15 » | aucun triage |
| `{ notes: 'ma gorge gonfle et je narrive plus a respirer' }` | urgence | **urgence** (filet de sécurité intact) |

Le filet reste entier : c'est le bruit qui disparaît, pas la sécurité.

---

## 1. C11 — « Ce que ce diagnostic ne peut pas dire »

Le diagnostic contenait déjà deux sections honnêtes (§2 « certain », §2b « inconnu »)
et des signaux d'orientation, mais ces derniers étaient **noyés dans les paragraphes**
du moteur. Il manquait la seule chose qui fait la différence : **le dire en face**.

Nouveau bloc §2c, en haut de la page résultat, avec trois contenus :

1. **Une confiance calculée**, pas un texte fixe. Combien de réponses manquent,
   **et lesquelles** : un manque sur la texture ou la priorité pèse plus que deux
   manques secondaires. Trois niveaux — *Profil complet* / *Profil solide, à affiner* /
   *Profil à affiner* — avec les champs manquants nommés (« porosité, expérience… »).
   La question adaptative de segment (`focus`) ne compte pas : quand le segment ne la
   déclenche pas, elle n'est pas posée — ce n'est pas un manque.
2. **Les trois signaux** qui relèvent d'un avis professionnel, les mêmes pour tout le
   monde : plaques ou chute localisée, cuir chevelu qui brûle ou suinte, démangeaison
   ou odeur qui résiste à trois lavages doux. Version peau distincte (lésion qui change,
   rougeur qui s'étend, tache hormonale) — un copier-collet des signaux cheveux sur la
   peau est désormais impossible : c'est vérifié par assertion.
3. **Le périmètre** : « ni diagnostic médical, ni remplacement d'un avis professionnel. »

## 2. C4 — Le temps du jour de lavage

**La question que personne ne pose** : combien de temps avez-vous, réellement ? Nous
demandions le budget en euros, pas le temps. Une routine de 90 minutes n'est pas une
routine, c'est un vœu pieux.

Le sujet est massif et documenté : sur r/Naturalhair, un wash day va de 20 minutes à
plusieurs heures, et les témoignages convergent sur un point contre-intuitif —
**c'est la fréquence qui raccourcit le jour de lavage, pas la vitesse**.

| Réponse | Ce que la routine fait |
|---|---|
| **< 20 min** | Le temps se gagne **avant** le démêlage : deux sections, pas de pinces, une passe par mèche. Le masque se confond avec le conditionneur — cinq minutes sous serviette chaude valent mieux que trente repoussées à la semaine suivante. |
| **20–45 min** | Le format de la plupart des routines : quatre sections, démêlage pendant que l'après-shampoing pose. |
| **1 h ou plus** | Le temps va au pré-démêlage de la veille et au temps de pose — pas à un produit de plus. |

**Le croisement qui valait la question** : `< 20 min` **et** lavages espacés. Les deux
réponses se contredisent, et le moteur le dit : un lavage hebdomadaire démêle un cheveu
qui n'a pas eu le temps de se nouer, donc **la fréquence fera gagner plus de minutes
qu'une méthode plus rapide**. Quelqu'un qui lave déjà chaque semaine ne reçoit pas
cette leçon.

**Aucun geste utile n'est supprimé** : le démêlage et le masque restent, réorganisés.
Et sur locks, la variante parle **séchage et rinçage** — jamais de démêlage (garde D9,
vérifié par la matrice : le mot est proscrit sur ce segment).

## 3. C3 — L'eau et l'air

Deux variables qui changent le quotidien et qui n'étaient jamais demandées, alors que
notre propre moteur citait déjà « l'eau calcaire » dans cinq routines sans la demander.

**L'eau.** Calcaire → un **chélateur** (EDTA, acide phytique ou citrique sur l'étiquette),
une fois par mois, **jamais toutes les semaines**, suivi d'un soin hydratant ; le signal
qui ne trompe pas, c'est un produit qui « ne fait plus rien » alors que la routine n'a
pas changé. Eau douce → confirmation, et la cause est ailleurs si le cheveu pèse.
La clause est portée par l'étape « laver » (présente dans tous les cycles), avec un
complément opérationnel sur le nettoyage profond quand il existe — **sinon une eau
calcaire sur cuir chevelu normal n'aurait eu aucun effet** : réponse décorative.

**L'air.** La glycérine attire l'eau de l'air : utile par temps tempéré, elle fait
gonfler par forte humidité et assèche en air très sec. La question porte sur
l'observation (« quand l'air change, que font vos cheveux ? »), pas sur un point de
rosée que personne ne connaît. Nuance assumée pour le crépu : un cheveu très sec
tolère souvent la glycérine plus longtemps — l'observation tranche, pas la règle.

---

## 4. Fichiers touchés

- `src/types.ts`, `src/lib/knowledge/hairAdvisory.ts` — 3 jetons, `flags()`, 4 aides
  (`washTimeDetangle`, `washTimeMask`, `waterWash`, `waterDeep`, `humidityHow`),
  7 injections et 4 lignes de résumé.
- `src/pages/DiagnosticHairPage.tsx` — 3 cartes de question (après la fréquence).
- `src/lib/diagnosticResult.ts` + `src/pages/DiagnosticResultPage.tsx` — confiance
  calculée, signaux d'orientation, périmètre (bloc §2c).
- `src/lib/ai/guardrails.ts` + `src/server/routes/recommendations.ts` — correctif du
  faux triage d'urgence.

## 5. Preuves

| Vérification | Résultat |
|---|---|
| Nouveau banc `kurla_diagnostic_vague1.test.ts` (chaîné dans `npm test`) | **54/54** |
| Matrice personas | **47/47** sur **3 442 profils** (3 réponses balayées partout) |
| Banc concision résultat | **OK** (+2 profils, 0 texte tronqué) |
| Suite `npm test` complète | bancs verts, **0 `npm ERR`** |
| `npm run lint` (tsc) | **0 erreur** (40 s) |
| `npm run build` | **OK** |
| Playwright 390 px (2 parcours : réponses pleines / garde « je ne sais pas ») | **19/19** — over=0, console=0 |

**Captures** : `docs/vague1_temps_eau_air.png`, `docs/vague1_garde_inconnus.png`.

## 6. Sources (20/09)

Temps du jour de lavage :

- <https://www.reddit.com/r/Naturalhair/comments/1imcyb3/is_your_wash_day_taking_all_day/> — « le meilleur moyen de garder un wash day court, c'est de laver plus souvent » ; technique des deux sections ; de 20 min à 10 h.
- <https://www.reddit.com/r/Naturalhair/comments/1jc6eqq/is_3_hours_a_long_time_to_take_washing_and/> — « je suis descendue à 30 minutes » ; le pré-démêlage et l'état du cheveu font la durée.
- <https://www.reddit.com/r/Naturalhair/comments/128txin/how_long_does_your_complete_hair_routine/> — la distribution réelle des durées (1 h à 4 h+).
- <https://www.reddit.com/r/Naturalhair/comments/a74bz7/wash_day/> — « j'ai réduit 2 heures à 45 minutes en faisant tout sous la douche ».

Eau calcaire :

- <https://www.reddit.com/r/curlyhair/comments/tpjcwx/hard_water_what_do_you_all_do/> — chélation vs clarification, EDTA, rinçage vinaigre, cadence mensuelle.
- <https://www.reddit.com/r/HaircareScience/comments/10e1rly/hard_water/> — « mes cheveux n'étaient plus les mêmes depuis que j'ai déménagé ».
- <https://www.frizzlife.com/blogs/guide/hard-water-hair-treatment-effective-solutions-for-hair-care> — chélateurs (EDTA, acide phytique, citrique), clarifier 1 à 4 fois par mois selon le type, curlier/coily moins souvent.
- <https://www.ouidad.com/blogs/curl-talk/clarifying-shampoo-tips> — calcaire et clarification, formules pensées pour les textures bouclées.

Humidité et humectants :

- <https://www.reddit.com/r/curlyhair/comments/hbxt8o/glycerin_and_dew_pointhumidity/> — point de rosée 40–60 °F : la glycérine convient ; en dehors, elle frise ou assèche.
- <https://curlsandblossoms.blogspot.com/2012/10/curly-care-seasonal-changes-dew-points.html> — tableau par point de rosée, humectants filmogènes (miel, aloé, agave) vs glycérine.
- <https://curlynikki.com/2012/07/should-i-use-glycerin-in-hot-humid.html> — l'exception qui fonde notre nuance : les cheveux très secs peuvent tolérer la glycérine même par forte humidité.
- <https://www.curlytools.com/en/blogs/krullend-haar/glycerine-haarproducten> — polymères PVP/VA pour la tenue à point de rosée élevé.

## 7. Reste

- **Vague 2** (validée par toi, à lancer) : C2 densité → C5 honnêteté sur la porosité → C6 croisé peau ↔ cheveux.
- Le **résumé écrasé** par `result.summary` reste un sujet de fond : aujourd'hui, dès
  que la couche IA produit un résumé, l'interprétation du moteur disparaît au lieu de
  le compléter. À traiter dans le chantier D3 (garde-fou IA).
