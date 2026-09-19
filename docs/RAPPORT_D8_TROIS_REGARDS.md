# D8 — Le test des trois regards (19–20/09)

Consigne : « des dizaines de tests pour s'assurer que les réponses sont correctes »,
joués sous trois rôles — utilisatrice, spécialiste cheveux crépus, expert coiffage afro.

## Ce qui a été livré
- **Banc permanent `tests/kurla_diagnostic_personas.test.ts`** (`npm run test:diagnostic-personas`,
  chaîné dans `npm test`) : 47 tests nommés + balayage déterministe de **3 404 profils**
  (49 couples texture × style × priorité × porosité × cuir chevelu × fréquence, échantillon
  reproductible) contre les invariants des trois regards : zéro peigne affirmé là où le segment
  l'interdit (regex négation-aware), zéro doublon, vocabulaire banni importé de `aiGuardrail`,
  LCO en ordre L→C→O sur cheveu humide, pousse jamais « accélérée », J+30 adapté par cycle,
  lisibilité (action ≤ 70 caractères, pourquoi ≥ 40), plancher d'étapes adapté au segment
  (5 pour le naturel ondulé volontairement court, 6 ailleurs).
- **2 vrais défauts moteur trouvés par le balayage, corrigés et verrouillés :**
  1. **Enfant + locks** : la priorité « démêlage » faisait basculer le wash day vers le cycle
     enfant avec peigne, et la dérivation `kid_methode` prescrivait « démêler des pointes vers la
     racine » à un enfant. Corrigé : la physique locks prime toute priorité — étape
     « Conditionner sans défaire les locks » inconditionnelle, expect « Aucun peigne ne remplacera
     jamais la main », et nouvelle dérivation `kid_methode_locks` (cuir chevelu du bout des doigts,
     patience > outil).
  2. **Kit matériel (découverte navigateur)** : `buildHairKit` ajoutait « Peigne à dents larges
     (démêloir) » **à tous les profils, y compris locks** — la couche kit était hors de la garde.
     Corrigé : détection `isLocked` depuis le PROFIL (pas depuis des formules d'étapes périmées) ;
     sur locks, l'outil devient « Crochet fin — les poils qui dépassent, rien d'autre » ; les
     segments qui démêlent légitimement (naturel, tresses) gardent le peigne — test K1 vérifie
     les deux sens.
- Un faux positif de sonde (casse de casse `Aucun`) et deux attentes de test sur-calibrées
  (retwist hors cycle locks, « à tester » sur porosité inconnue) ont été corrigés côté test,
  pas côté moteur : le moteur était juste.

## Vérifications
`tsc` 0 · bancs D8 47/47 (3 404 profils) · hair-advisory 18 · care-kit 9 blocs · diagnostic-quality ·
profile-evolution 11/11 · skin 12/12 · `vite build` 0 · preuve navigateur Playwright 390 px :
`over = 0`, « démêloir » absent de toute la page, crochet présent, cycle locks + conditionneur
sans démêlage affichés (`scripts/d8_mobile_kid_locks.mjs`).
