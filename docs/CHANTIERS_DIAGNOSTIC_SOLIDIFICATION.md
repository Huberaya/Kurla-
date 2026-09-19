# Diagnostic — programme de solidification (19/09/2026)

> « Le diagnostic est notre innovation, le cœur de la plateforme. Si cette
> partie est bancale, tout le travail tombe à l'eau. » — go fondateur, 19/09.
>
> Ce document est la PROPOSITION (rôle acheteur/fondateur : proposition
> d'abord, exécution ensuite). Chaque chantier est appuyé par un constat
> vérifié dans le code (pas une impression). Ordre à valider avant de lancer.

---

## État des lieux — ce qui tient

- Moteur segmenté `hairAdvisory.ts` : 6 cycles (locks, protectrice, perruque,
  enfant, transition, naturel) différenciés, 31 étapes de focus, leçons
  sourcées, observations J+7/14/30, résumé segmenté, kit produits
  segmenté (`careKit.ts` tient compte de texture/style/focus/porosité/scalp/priorité/fréquence).
- Bancs de structure solides : `kurla_routine_segments` (218 focus × segments,
  invariants qualité), `kurla_hair_advisory` (invariants + vocabulaire
  réservé/medical), `kurla_diagnostic_segments` (49 combos).
- Journal de progression EXISTANT (`ProgressJournalPage`) : signaux
  (davantage de casse, cuir chevelu qui démange, routine trop longue…),
  métriques 1–5 (hydratation, casse, confort, démêlage), produits utilisés.
- Planificateur adaptatif (`adaptiveRoutine.ts`) : tâches par fréquence,
  saisonnalité, routine raccourcie sur signal `routine_too_long`.
- Détection d'évolution à J+30 (`retentionNudges.ts` L4) : 0 push si le profil
  n'a pas bougé, dédoublonnage par diagnostic.

## État des lieux — ce qui ne tient pas (constats vérifiés)

1. **Le résumé recite le formulaire au lieu de diagnostiquer.**
   `buildHairAdvisorySummary` (hairAdvisory.ts:1173) concatène « Votre
   texture est X. Vous portez Y. Votre priorité est Z. » — c'est un écho des
   cases cochées, pas une interprétation. Aucun mot du résumé n'est DÉRIVÉ de
   la combinaison des réponses (ex. porosité forte + lavages fréquents +
   priorité casse → « votre casse vient probablement de là »).
2. **La boucle J+30 est une promesse creuse.** Le nudge L4 dit « vos
   recommandations ont été recalées en conséquence : découvrez ce qui a
   changé » et pointe vers `/account/kurla-id` — mais KurlaIdPage et
   HairIdPage sont des éditeurs de profil (`BeautyProfileEditor`), il n'y a
   AUCUNE recommandation recalée sur ces pages. Les signaux du journal
   alimentent `buildAdaptiveRoutine` (notes de calendrier) mais ne
   RE-EXÉCUTENT jamais le moteur segmenté : la routine (steps/focus) ne
   change jamais entre J+0 et J+30.
3. **Les observations J+7/14/30 sont une impasse.** Affichées sur la page
   résultat, mais il n'existe aucun point d'entrée pour y répondre : le
   journal existe mais n'est pas relié aux questions d'observation du
   diagnostic.
4. **Pas de garde-fou sur la sortie IA.** `recommendations.ts:446` (safeResult)
   vérifie les TYPES (string/array) — pas la qualité : un résumé Gemini
   générique est servi tel quel. Le fallback offline est segmenté et
   qualité-contrôlé, mais le chemin IA n'est validé par aucun invariant
   (pas de mot-clé segment, pas de présence du focus, pas de bannissement du
   générique).
5. **Questions manquantes / réponses sous-exploitées.**
   - Pas de **longueur** (courte/moyenne/longue) : pourtant c'est un
     paramètre majeur (démêlage, rétrécissement, temps, coiffures,
     conservation des pointes).
   - La **fréquence** n'agit que sur une phrase du résumé
     (`frequencyLine`) : la colonne « Entre deux lavages » est identique à
     1×/semaine et 2×/semaine.
   - Pas de **expérience** (débutante au naturel / longue durée) : utile
     pour le niveau de détail et les attentes (pousse, patience).
6. **Pas de protocole d'évaluation du CONTENU.** Les bancs testent la
   structure (nº d'étapes, longueurs, présence du focus, vocabulaire) mais
   rien ne mesure « est-ce que cette réponse sert ce besoin » : c'est le
   test humain qui fait office de qualité. D'où le mode actuel : l'user
   teste → on corrige une ligne → l'user re-teste.

---

## Les chantiers

### D5 — Protocole d'évaluation qualité (INFRASTRUCTURE — premier)

**Pourquoi en premier** : on ne « solidifie » rien sans pouvoir MESURER.
Sans ce protocole, les chantiers D1–D4 ne peuvent pas prouver qu'ils
améliorent le diagnostic.

**Ce qu'on fait**
- 25 profils de référence couvrant tous les segments × besoins ×
  caractéristiques (locks+pousse, tresses+tension, perruque+transpiration,
  transition+mixtes, enfant+démêlage, naturel crépu+bouclé × casse/
  hydratation/definition/porosité forte/faible/fréquence…).
- Pour chacun : une **checklist d'attentes de contenu** (ce qu'une bonne
  réponse DOIT contenir : le cycle annoncé, la préoccupation reprise,
  ≥2 observations DÉRIVÉES de la combinaison des réponses, des étapes qui
  servent la préoccupation, zéro générique, zéro vocabulaire interdit) et
  des contre-attentes (ce qu'elle ne doit PAS contenir).
- Banc automatique (assertions de contenu) + grille de revue humaine
  (5 profils par itération, notés 1–5 sur : pertinence du segment,
  spécificité au besoin, justesse des dérivations, pédagogie, honnêteté).
- Intégration à la chaîne de tests ; tout chantier le fait repasser.

**Acceptation** : 25/25 profils notés ; le protocole détecte un régressif
  volontaire (test de sensibilité) ; intégré à `npm test`.

**LIVRÉ (19/09)** — `tests/kurla_diagnostic_quality.test.ts` + script
`test:diagnostic-quality` dans la chaîne. Baseline mesurée :

- 25/25 profils verts sur la checklist dure (cycle annoncé, préoccupation
  reprise, étape focus additive, zéro générique/médical/réservé, structure).
- **Observations dérivées dans le résumé : minimum 0 ; 9 profils à 0/2,
  8 à 1/2, 8 à 2/2.** C'est le chantier D1 en chiffres : aujourd'hui,
  l'interprétation n'existe que quand un « pont pédagogique » de priorité
  contient un marqueur causal ; sur un profil sans priorité riche (débutante,
  hydratation seule), le résumé est 100 % reprise de cases.
  Après D1, l'assertion « ≥2 dérivées » passe partout.

---

### D1 — Le diagnostic qui interprète (CŒUR)

**Constat n°1** : le résumé recite, il n'interprète pas.

**Ce qu'on fait**
- Une couche d'**observations dérivées** dans le moteur : des règles
  déterministes qui croisent les réponses et produisent 2–4 phrases du
  type « Ce que j'observe sur votre situation » — chaque phrase est
  DÉRIVÉE (jamais une simple reprise) et reste dans le périmètre beauté
  (sourcée ou absente, jamais inventée).
  Exemples de règles : porosité forte + fréquence ≥2×/semaine → le
  relavage accélère la perte d'eau ; priorité casse + focus démêlage +
  fréquence hebdo → les nœuds s'installent entre les lavages ; protectrice
  + scalp démangeaisons → l'isolation concentre les résidus ; transition +
  styles serrés → la ligne de démarcation subit le plus de tension.
- Le résumé devient : **1 phrase de contexte (segment) → 2–4 observations
  dérivées → ce que la routine en déduit → le rythme** — au lieu de
  l'énumération de cases.
- La page résultat gagne une section « Ce que KURLA a compris de votre
  situation » (les observations dérivées, lues par l'utilisateur avant la
  routine) — c'est l'écran qui fait « ah, ça me correspond ».
- ~25–35 règles, chacune tracée vers une connaissance existante de
  `hairScience.ts` (pas de nouvelle science inventée).

**Acceptation** : sur les 25 profils du protocole D5, ≥2 observations
dérivées par réponse, aucune qui soit une reprise d'une case cochée,
revue humaine ≥4/5 sur « spécificité au besoin » ; banc de contenu vert.

**LIVRÉ (19/09)**
- `src/lib/knowledge/diagnosticDerivations.ts` : **31 règles**, chacune
  croise ≥2 champs et cite ses cartes `hairScience` sources (20 cartes citées, clés vérifiées existantes par le banc). Filets structurels pour que
  tout profil reçoive ≥1 dérivation même minimaliste.
- `buildHairAdvisorySummary` : « Ce que KURLA a compris de votre
  situation » inséré après la préoccupation, avant la priorité ; les
  anciennes lignes brutes porosité sont **supprimées** (dédoublonnage —
  les dérivations portent le mot « porosité »), les lignes rythme
  réduites à l'agenda (le fond est dans les dérivations).
- Page résultat : nouvelle section 1c « Ce que KURLA a compris de votre
  situation », calculée **localement** (pas par l'IA) avec « Fondé sur : »
  = titre de la carte science. Le résumé IA peut reformuler, la section
  reste vraie.
- Prompt Gemini (`segmentNote`) : les dérivations sont injectées comme
  grille de lecture — « à reprendre fidèlement, sans les contredire ni en
  inventer d'autres ».
- Banc D5 renforcé en assertions D1 : ≥2 dérivées **exactes** au résumé,
  clés science valides pour chaque règle, test de réactivité (retirer la
  porosité ou le cuir chevelu retire une dérivation — une règle figée est
  une règle morte). Résultat : 25/25, minimum 3 dérivées (cible ≥2).
- Contrôles : tsc 0 erreur ; bancs qualité, hair-advisory, routine-segments,
  diagnostic-segments, care-kit, c4-diagnostic-result, science-hub,
  skin-ux, parcours-peau, retention-nudges, diagnostic-session verts ;
  live POST serveur (2 profils) — bloc dérivé présent (fallback, pas de
  clé IA ici). Corrigé au passage : coquille « pas on en ajoute » dans le
  focus locks douceur → « on n’en ajoute pas ».
- **Reste à faire côté D1** : revue humaine ≥4/5 (à toi de retester —
  c'est le juge) ; l'assertion de style « marqueurs causaux » reste
  rapportée dans le banc mais ne fait plus foi.

---

### D3 — Le garde-fou IA (garantir que le chemin IA ne sert jamais du générique)

**Constat n°4** : la sortie Gemini est servie sans validation de qualité.

**Ce qu'on fait**
- Porte de qualité sur `recommendations.ts` : la sortie IA est validée par
  les MÊMES invariants que le fallback — mot-clé du segment présent, la
  préoccupation déclarée reprise, les actions de la routine moteur
  présentes (l'IA reformule, n'invente pas), zéro phrase générique bannie
  (« routine capillaire structurée à ajuster », listes génériques),
  longueur/structure minimales.
- Non conforme → **fallback déterministe automatique** (la réponse segmentée
  est servie, jamais du générique). L'IA est un réécrivain de la routine
  moteur, pas un auteur autonome.
- Le prompt reçoit le contenu complet de la routine moteur (steps + focus +
  observations) comme vérité de référence à reformuler.

**Acceptation** : banc avec sortie IA mockée générique → le fallback est
servi ; banc avec sortie IA conforme → elle est servie ; tsc vert.

**LIVRÉ (19/09)**
- `src/lib/knowledge/aiGuardrail.ts` : la porte — mêmes invariants que le
  fallback (segment reconnu, préoccupation reprise, dérivations D1 non
  contredites via couverture lexicale ≥35 %, étapes ancrées sur le
  programme moteur, longueurs minimales) + **source unique** des trois
  listes de vocabulaire interdit (les bancs hair-advisory et D5 les
  importent désormais — la porte et les tests ne peuvent plus diverger).
- Route `/api/ai/routine-result` : calculs moteur hoistés AVANT l'appel
  (segment, focus, dérivations, actions, routine) → sers d'une part à la
  note de segment (prompt) et d'autre part de garde ; sortie IA évaluée par
  `validateHairAiOutput` ; rejet → `parsed = null`, bascule déterministe,
  raisons journalisées côté serveur uniquement (jamais affichées). Les
  `warnings` de l'IA sont scannés aussi (un « consultez un dermatologue »
  généré = rejet).
- Nuance validée par le banc : « sans diagnostic médical » (négation,
  disclaimer exigé) n'est PAS un motif de rejet — seule l'affirmation
  médicale l'est. Le fallback passe sa propre porte sur les 7 segments.
- Banc `tests/kurla_ai_guardrail.test.ts` (`test:ai-guardrail`, chaîné) :
  10 contrats — auto-cohérence du déterministe (12 profils), reformulation
  fidèle acceptée, 6 classes de rejet, disclaimer préservé.
- Limite assumée : la porte n'est pas exercée sur un VRAI appel Gemini ici
  (aucune clé dans le bac à sable) ; le branchement route est testé sur la
  fonction de porte + vérifié au live POST (chemin sans clé → déterministe
  servi, source 'fallback', bloc dérivé présent, 8 étapes).

---

### D4 — Les paramètres manquants (longueur, fréquence réelle, expérience)

**Constat n°5** : pas de longueur ; la fréquence n'agit que sur une phrase.

**Ce qu'on fait**
- **Longueur** (courte / moyenne / longue) — nouvelle question du
  formulaire (après le coiffage), et réellement utilisée par le moteur :
  courte → moins de produit, rituel plus court, coiffures adaptées ;
  longue → conservation des pointes, temps de masque, démêlage par
  sections, styles qui préservent.
- **Fréquence** : la colonne « Entre deux lavages » s'adapte (rythme des
  rafraîchissements, fréquence de la brume) et le résumé annonce le rythme
  réel.
- **Expérience** (je débute au naturel / je vis mes cheveux depuis
  longtemps) — ajuste le niveau de détail pédagogique et les attentes
  (pousse/patience, « ce qui change d'abord »).
- Chaque paramètre : option → règle moteur → assertion banc (même segment,
  deux valeurs → routines visiblement différentes).

**Acceptation** : 3 paires de profils (même segment, longueur/fréquence/
expérience différentes) → réponses différenciées vérifiées au banc ;
formulaire sans friction (1 question de plus max par tour).

---

### D2 — La boucle qui boucle (J+7/14/30 → routine réellement recalée)

**Constat n°2 et n°3** : promesse creuse + observations en impasse.

**Ce qu'on fait**
- **Répondre aux observations** : sur la page résultat (et l'espace
  KURLA ID), chaque observation J+7/14/30 devient un point de réponse
  relié au journal existant (signaux + note) — l'utilisateur note ce qu'il
  observe, sans page supplémentaire à inventer.
- **Conversion signaux → réponses du diagnostic** : `more_breakage` →
  priorité casse, `scalp_itchy` → scalp démangeaisons, `product_heavy` →
  porosité/soins légers, etc. (table de conversion traçable).
- **Routine recalée** : à J+30, le moteur segmenté est RE-EXÉCUTÉ avec les
  réponses mises à jour ; une page « Votre profil a évolué » montre
  l'avant/après (les étapes qui ont changé ET pourquoi — chaque change
  cité vers le signal qui l'a causé).
- **Le nudge L4 pointe vers cette page** (plus vers l'éditeur de profil).

**Acceptation** : scénario banc — diagnostic J+0 + journal (davantage de
casse + cuir chevelu qui démange) → à J+30, la routine DIFFÈRE de J+0 sur
les points causaux, et la page d'évolution les nomme ; nudge L4 validé.

---

### D6 — Parité Peau (après solidification Cheveux)

**Constat** : instruction permanente — « Skin doit atteindre le niveau
Hair, jamais dégrader ». `skinAdvisory.ts` existe mais reste en deçà du
niveau atteint côté cheveux (segmentation, dérivations, boucle).

**Ce qu'on fait** : transposer D1 (interprétation), D3 (garde-fou),
D2 (boucle) à la peau avec le contenu peau propre — même architecture,
logique spécialisée.

**Acceptation** : banc peau miroir du banc cheveux vert.

---

## Ordre de exécution proposé

| # | Chantier | Dépend de | Pourquoi cet ordre |
|---|----------|-----------|--------------------|
| 1 | **D5** protocole d'évaluation | rien | on mesure avant de refondre |
| 2 | **D1** interprétation | D5 | le cœur de « réponse précise » |
| 3 | **D3** garde-fou IA | D1 | verrouille la qualité du chemin IA |
| 4 | **D4** paramètres manquants | D5 | enrichit les inputs du moteur |
| 5 | **D2** boucle J+30 | D1, D4 | la recalibration a besoin du moteur enrichi |
| 6 | **D6** parité peau | D1–D4 | la peau hérite de l'architecture validée |

## À valider

1. L'ordre ci-dessus (D5 d'abord pour mesurer, D1 pour le cœur).
2. Ce qui t'a paru **le plus** insatisfaisant dans tes tests — pour
   caler la priorité (réponses qui ne raisonnent pas / boucle J+30 qui ne
   tient pas / profils trop proches les uns des autres / autre).
3. Le périmètre D4 : longueur + fréquence + expérience — ou sous-ensemble.
