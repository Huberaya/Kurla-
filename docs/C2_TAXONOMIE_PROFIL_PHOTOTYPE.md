# C2 — Taxonomie, profil et phototype v2

## Contrat

Les dimensions suivantes ne sont jamais fusionnées :

- type de peau ;
- préoccupations ;
- objectifs ;
- profondeur de carnation (`toneDepth`) ;
- sous-ton (`undertone`) ;
- phototype Fitzpatrick I–VI ;
- contexte ;
- préférences sensorielles.

`toneDepth` décrit une perception de profondeur de ton. Le phototype décrit une réaction déclarée au soleil. Le second ne peut jamais être déduit du premier.

## Source et version

- taxonomies et termes : `kurla_taxonomies` / `kurla_taxonomy_terms` ;
- miroir contrôlé : `src/lib/taxonomyReference.ts` ;
- version profil/catalogue : `2026-09-18.c2` ;
- colonnes catalogue dédiées : `skin_types`, `skin_concerns`, `skin_objectives`, `skin_texture_code`, `skin_finish_code`, `skin_supported_phototypes`.

## Règles appliquées

- les codes skin type / concerns / objectives sont normalisés vers le terme canonique ;
- les synonymes sont résolus, les valeurs inventées deviennent `inconnu` dans un profil utilisateur ;
- un produit avec des codes hors vocabulaire est refusé à l’écriture ;
- `skin_concerns` est distinct de `concerns`/`needs`, conservé pour les besoins génériques et historiques ;
- profil partiel accepté : les dimensions inconnues restent explicites ;
- textures et finis filtrés par codes contrôlés ; une fiche sans code ne passe pas le filtre ;
- aucun classement de phototype depuis une teinte, une carnation ou une origine supposée.

## Phototype

Le phototype est conservé uniquement avec consentement explicite. Les implications de recommandation IV–VI ne s’activent que si un phototype valide est effectivement présent.

## État de validation

La porte C2 est couverte par `tests/kurla_c2_taxonomy_profile.test.ts`, complétée par les tests de phototype et de taxonomie existants.
