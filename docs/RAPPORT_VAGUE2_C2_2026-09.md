# Vague 2 · C2 — la densité (la variable manquante)

**Date** : 21/09 · **Statut** : livré, vérifié.
**Programme** : `docs/PROPOSITION_CHANTIERS_DIAGNOSTIC_MONDIAL_2026-09.md` (vague 2/3).

## Pourquoi cette question valait la peine d'être posée

Nous demandions la **largeur** d'un cheveu (fin/moyen/épais) mais jamais la
**densité** (combien il y en a). Les deux se confondent dans la tête des
clientes — et se contredisent souvent :

- **fin + dense** : plein de volume si on ne l'écrase pas, mais un beurre
  épais l'aplatit en deux heures → la cliente achète « épaississant » et
  s'étonne que ça ne marche pas.
- **épais + clairsemé** : chaque mèche est solide, mais il y en a peu →
  la cliente achète « volume » quand le problème est la coupe, pas le produit.

Tous les acteurs sérieux (Haut.AI, Tangent.ai revue, Carol's Daughter, Verb,
GK Hair, Freudly quiz) citent la densité parmi les 4–5 variables de base.
Nous ne la demandions pas. Difficile, dans ces conditions, de prétendre au
meilleur diagnostic du monde.

## La question

> « Quand vous faites une raie bien nette à la lumière, vous voyez... »
>
> · Mon cuir chevelu, bien visible — peu dense
> · Un peu de cuir chevelu — densité moyenne
> · Je ne vois pas le cuir chevelu — très dense
> · Je ne sais pas

Pourquoi cette formulation et pas le test de la queue-de-cheval en cm
(« < 2 pouces = clairsemée ») ? Parce que le test du centimètre ne fonctionne
pas sur cheveux crépus et frisés (le shrinkage comprime le diamètre), sur
cheveux courts, sur coiffures protectrices, sur locks, sur perruque. Une
question **observable** (« que voyez-vous à la raie ? ») marche sur tout le
monde, sans mètre ruban, sans jugement.

## Ce que la réponse change dans la routine (7 points d'injection)

La densité n'est pas une ligne dans le résumé. C'est une série de clauses
contextuelles qui changent ce que la routine dit de faire :

| Segment | Dense | Clairsemé |
|---|---|---|
| Naturel (démêlage) | **6 à 8 sections** (pas 4), produit par section | 2 à 4 sections, traction réduite |
| Naturel (dosage LCO) | noisette **par section** (pas pour toute la tête) | rien en racine, éviter les zones visibles |
| Combinaison piège fin+dense | « le volume ne viendra jamais d'un beurre qui couche : il vient de légèreté posée en couches » | — |
| Combinaison piège épais+clairsemé | — | « l'hydratation riche garde son sens mais elle ne créera pas de densité ; la coupe fera plus que le produit » |
| Bouclés au naturel (séchage) | comptez **2× plus de temps de séchage** | séchage rapide, ne pas continuer à chauffer un cheveu déjà sec |
| Locks | rinçage **zone par zone** en écartant les locks | retwist léger, sans tirer |
| Coiffure protectrice (avant + pendant) | sections avant pose + brume raie par raie sous la coiffure | main légère, éviter les zones où le cuir chevelu se voit |
| Perruque (soin du dessous) | brume raie par raie | produit brillant proscrit sur les zones visibles |
| Transition (démarcation) | sections et dosage adaptés au conditionnement par zone | traction réduite |

Le garde le plus important : la densité est **universelle** (tout le monde a
un cuir chevelu qui se voit ou pas — locks, enfant, perruque y compris),
mais la **clause rendue** change avec le cycle. Jamais de « 6 sections »
sur locks : la matrice (3 458 profils) a précisément attrapé cette erreur
à la première passe et la formulation a été réécrite en clauses dédiées.

## Fichiers touchés

- `src/types.ts` — `density?: 'clairsemee'|'moyenne'|'dense'|'inconnue'`.
- `src/lib/knowledge/hairAdvisory.ts` — `HAIR_DENSITY_VALUES`, flag `density`,
  5 aides (`densitySections`, `densityDose`, `densityDry`, `densityLocks`,
  `densityScalp`), 7 points d'injection, ligne de résumé.
- `src/lib/diagnosticResult.ts` — densité dans `profileFields` (compte dans la
  confiance §2c).
- `src/pages/DiagnosticHairPage.tsx` — carte de question après la largeur,
  défaut `inconnue`, `stepIds` mis à jour.
- `tests/kurla_diagnostic_vague2.test.ts` (nouveau, 17 assertions) ;
  `tests/kurla_diagnostic_personas.test.ts` étendu (tirage v12) ;
  `tests/kurla_diagnostic_vague1.test.ts` fixtures mises à jour ;
  `package.json` script `test:diagnostic-vague2` chaîné dans `npm test`.

## Preuves

| Vérification | Résultat |
|---|---|
| Nouveau banc `kurla_diagnostic_vague2` | **17/17** |
| Matrice personas (3 458 profils) | **47/47** |
| Banc vague 1 (après mise à jour des fixtures) | **OK** |
| Bancs crépu / bouclés-transition / locks / ondulé-perruque / concision | **tous verts** |
| `npm run lint` (tsc) | **0 erreur** |
| `npm run build` | **OK** (187 ms) |
| Playwright 390 px — parcours A fin+dense + B « je ne sais pas » | **12/12** — over=0, console=0 |

**Capture** : `docs/vague2_c2_densite.png`.

## Sources (21/09)

- Carol's Daughter — « What Is Hair Density and How Can You Measure It ? » :
  test de la raie + circonférence de queue-de-cheval (< 2″ = faible, 2–3″ =
  moyenne, 4″+ = forte) ; dosage et sections par niveau.
  <https://carolsdaughter.com/blogs/beauty-blog/what-is-hair-density-and-how-can-you-measure-it>
- GK Hair — « Thick vs Thin Hair Guide » : distinction densité/épaisseur,
  tableau des 4 combinaisons (fin+dense / épais+clairsemé / …) et conséquences
  produit (fin+dense = légers, racine lift ; épais+clairsemé = coupes franches).
  <https://www.gkhair.com/blogs/all-blog-posts/thin-vs-thick-hair>
- Verb Products — « what is hair density? » : dosage, temps de séchage,
  comment éviter l'accumulation sur cheveu dense.
  <https://www.verbproducts.com/blogs/verb-word/hair-density>
- RevAir — « Hair Density 101 » : dense = tangles + sections ; clairsemé =
  légèreté racinaire. <https://myrevair.com/blogs/news/hair-density-101>
- r/Naturalhair « washing in sections » (1kz4t0j, o8h0c0v, 1o00s8a) : le
  nombre de sections dépend explicitement de la densité (4 à 8–10 selon),
  y compris sur cheveux fins mais denses.
- Ethique — « Fine Hair vs Thin Hair » : la confusion « fin = clairsemé » et
  ses conséquences d'achat. <https://ethique.com/blogs/hair/thick-vs-thin-hair-guide>

## Reste (vague 2)

- **C5** — honnêteté sur la porosité (recadrage : comportement observé,
  pas test du verre ; porosité de dommage séparée ; aucune phrase justifiant
  un choix **uniquement** par la porosité).
- **C6** — croisé peau ↔ cheveux (lisière, tempes, nuque, ordre de rinçage).
