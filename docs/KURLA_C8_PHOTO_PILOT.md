# C8 — pilote d’analyse photo cosmétique

Statut : **implémenté comme pilote borné, non validé cliniquement**.

## Périmètre

Le pilote est accessible uniquement via l’image privée déjà rattachée au profil beauté :

```text
POST /api/beauty-profile/photos/:photoId/analyze
JSON : { "phototype": "I" | "II" | "III" | "IV" | "V" | "VI", "lighting": "daylight_even" | "indoor_even" }
```

Il réutilise le consentement photo actif et les règles de l’AIPD photo (`AIPD-KURLA-PHOTO-v1`). Il ne lit ni le catalogue, ni les marques, ni les données B2B. La finalité est strictement une observation cosmétique expérimentale de la peau visible.

L’observation autorisée est limitée à : texture visible, sécheresse visible, rougeur visible, variation de pigmentation visible et brillance visible. La sortie n’est jamais un diagnostic, une détection de pathologie, une mesure clinique, une reconnaissance d’identité ou une inférence de phototype. En cas de douleur, d’évolution rapide ou d’inquiétude rapportée, elle recommande uniquement l’avis d’un professionnel de santé, sans nommer de pathologie.

## Refus serveur

Avant tout appel IA, le serveur vérifie :

- présence d’un contenu photo privé accessible ;
- consentement photo encore actif ;
- phototype I–VI déclaré dans C5 avec le consentement phototype actif, jamais inféré ; la valeur envoyée à l’analyse doit correspondre à cette valeur serveur ;
- éclairage déclaré régulier (`daylight_even` ou `indoor_even`) ;
- JPEG ou PNG décodable pour le pilote ; WebP reste stockable mais est refusé par le contrôle d’analyse tant qu’un décodeur indépendant n’est pas branché ;
- 5 Mo maximum ;
- dimensions entre 640 × 640 et 8 000 × 8 000 pixels ;
- luminance, dynamique et détail suffisants pour le contrôle qualité.

Une image refusée ne déclenche aucun provider et produit une trace `quality_rejected` ou `metadata_rejected`. Une photo privée inaccessible ne déclenche aucune analyse : `PHOTO_BYTES_UNAVAILABLE`.

Le pilote est limité à une analyse par photo et trois analyses par membre sur trente jours. Ces limites sont des garde-fous d’expérimentation, pas une mesure de performance.

## Provider et absence de simulation

Le provider actuellement prévu est Gemini, via `GEMINI_API_KEY` et `GEMINI_MODEL`. Sans credential, le serveur persiste `provider_unconfigured` puis répond `AI_NOT_CONFIGURED` avec HTTP 503. Aucun texte de remplacement ne constitue un résultat IA.

Une erreur du provider ou un JSON inutilisable produit `provider_failed` et aucune sortie n’est présentée.

## Provenance persistée

`photo_ai_analyses` conserve avec chaque tentative :

- identifiant de la photo source et utilisateur ;
- SHA-256 exact des octets d’entrée ;
- date de création et de fin éventuelle ;
- provider et modèle ;
- `C8-photo-pilot-prompt-v1` ;
- `C8-photo-pilot-rules-v1` ;
- `C8-photo-pilot-response-schema-v1` ;
- `C8-photo-quality-gate-v1` ;
- phototype et éclairage déclarés, ainsi que leur source ;
- qualité mesurée et statut ;
- sortie ou code d’erreur.

La suppression d’une photo supprime sa provenance en base grâce à la relation `ON DELETE CASCADE`. Le mode mémoire supprime également les octets éphémères et les traces associées. La suppression du profil ou la purge de rétention suit le même principe.

## Validation indépendante par strates

Le protocole est `C8-photo-pilot-validation-v1`. La matrice prévue est la combinaison indépendante des six phototypes déclarés et des deux éclairages acceptés :

| Phototype | Jour régulier | Intérieur régulier |
|---|---:|---:|
| I | non mesuré | non mesuré |
| II | non mesuré | non mesuré |
| III | non mesuré | non mesuré |
| IV | non mesuré | non mesuré |
| V | non mesuré | non mesuré |
| VI | non mesuré | non mesuré |

Aucun échantillon, score de justesse, vérité terrain ou résultat de représentativité n’est inventé dans le code. Chaque résultat expose `pilot_stratified_not_validated` tant qu’un protocole de revue humaine indépendant, avec des images et annotations documentées, n’a pas été exécuté pour chacune des douze strates. Le phototype déclaré sert uniquement à la stratification et n’est jamais déduit de l’image.

## Tests

- `tests/kurla_c8_photo_pilot.test.ts` couvre le contrôle dimensions/luminance/détail, les formats, les métadonnées, les versions, la provenance persistée et le filtrage du langage médical.
- `tests/kurla_photo_aipd.test.ts` conserve les tests de consentement, rétention et purge.
- `npm run lint` doit rester vert.

Les tests ne fabriquent pas de réponse IA et ne valident pas une performance du provider.
