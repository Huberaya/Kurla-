# D14 — Sous-motif ondulé (2A/2B/2C) et lavage du dessous sous perruque

**Date** : 20/09 · **Agent** : diagnostic · **Statut** : livré, vérifié, poussé.

## 1. Pourquoi ce chantier

Le programme des segments du cœur était clos au D12. Restaient trois points notés
« hors diagnostic » dans les rapports D11 et D12 :

1. **Sous-types 2A/2B/2C non demandés** (D12 §7) — ouverts ici, parce que la question est
   la plus posée des communautés de l'ondulé ;
2. **Fréquence de lavage du dessous sous perruque** (D12 §7) — le cycle en parlait en prose
   sans jamais la poser ;
3. **Arbitrage « avant-locks »** (D11 §6) — *reste ouvert*, voir §7 : ce n'est pas une
   question, c'est un parcours produit.

Règle appliquée comme aux D9–D12 : une question nouvelle doit répondre à une **FAQ réellement
posée par la communauté du segment**, et **chaque réponse doit changer quelque chose dans la
routine** (une réponse sans effet rendu ne se pose pas).

## 2. Ondulé — le sous-motif (2A / 2B / 2C)

**Question posée** (après le style, miroir exact du motif 4A/4B/4C du crépu) :
« À quelle hauteur vos ondes se dessinent-elles le mieux ? »
Le test est rappelé dans la note de la carte : cheveux lavés, séchés à l'air, sans brossage ni
produit — on regarde **où** le S apparaît, pas s'il est beau.

Ce que les sources disent, et ce que le moteur en fait :

| Réponse | Ce que les sources établissent | Effet rendu par KURLA |
|---|---|---|
| **2A** | Vagues souples, racines quasi droites, motifs « qui s'écrasent dans la journée » ; les produits pour boucles sont « trop lourds pour du 2A ». | Clause ajoutée à l'étape « Hydrater léger » : **le poids avant tout** — mousse ou spray seuls, posés près de la racine, aucune crème sur les longueurs. |
| **2B** | S nets dès les mi-longueurs, frizz à surveiller ; c'est le cas d'école de la règle des ondes. | Confirmation seule : « la règle des ondes est exactement la sienne », surveillance aux longueurs. |
| **2C** | Vagues profondes, racines incluses, parfois des anneaux ; « se traite souvent comme les boucles ». | Clause de **maintien assumé** : scrunching au gel, « carton » du séchage, casse à l'eau — « léger » ne veut pas dire « sans tenue ». |

Deux gardes-fous de langage, volontaires :

- **Le LCO n'est toujours jamais servi à une ondulée**, quel que soit le sous-motif
  (physique du segment, héritage du D12) — vérifié par assertion `U3`, `A5`.
- Les sources rappellent que le type d'onde est « un point de départ, pas un diagnostic
  strict » et que beaucoup portent **plusieurs motifs** : d'où la carte
  « Je ne sais pas / ça dépend des jours » qui rend le comportement moyen, sans deviner.

**Trouvaille de cohérence (la plus utile du chantier)** : la clause de sous-motif ne se
promet que là où la branche « ondes » est réellement servie. Deux croisements la
court-circuitent — porosité faible (branche « Soins légers, bien placés » du D12) et style
non naturel (twists, tresses : l'ondulée n'est plus en wash & go). Le résumé ne prétend donc
jamais une décision que la routine affichée ne tient pas : l'invariant est posé dans
`flags()` **et** vérifié sur les 3 389 profils de la matrice.

## 3. Perruque — le lavage du dessous

**Question posée** (après la durée de portée) :
« Votre cheveu naturel, sous la perruque, vous le lavez quand ? »
La note distingue explicitement l'entretien de la perruque de celui du dessous : les sources
traitent les deux à part (« washing under a wig » d'un côté, 6–8 ports / 2–3 semaines pour la
coiffe de l'autre).

| Réponse | Effet rendu |
|---|---|
| **À chaque dépose** | Confirmation : « le rythme est pris » — shampooing doux sur la raie seule, le séchage complet avant la repose prime sur l'horaire. |
| **Tous les quinze jours** | Tient tant que la portée ne dépasse pas deux semaines : au-delà, **c'est la dépose qui avance, pas le lavage qui attend** ; eau fraîche à l'applicateur entre deux. |
| **Moins d'une fois par mois** | La routine **recale** le lavage à chaque dépose et l'eau à l'applicateur entre deux ; odeur ou démangeaison = ordre de dépose immédiate, pas un motif de parfum. |

**Le croisement qui valait la question** : `dessous rare` × `dépose quotidienne`. Les deux
réponses se contredisent — une perruque qui sort chaque soir ne peut pas reposer sur un
dessous lavé au mois. Le moteur tranche par la physique (« le lavage se reprend à la dépose,
point ») au lieu de réciter un intervalle. C'est le même invariant de cohérence de segment
qu'aux D10–D12 : **le résumé ne promet que ce que le cycle affiché tient**.

## 4. Fichiers touchés

- `src/types.ts` — deux jetons : `wigWash`, `wavyPattern`.
- `src/lib/knowledge/hairAdvisory.ts` — `flags()` (gardes identiques à `wigBond`/`wigWear`
  pour le dessous ; miroir de `pattern` pour le sous-motif), clauses dans l'étape
  « Hydrater léger » et dans « Nettoyage profond occasionnel », lignes de résumé dédiées.
- `src/pages/DiagnosticHairPage.tsx` — deux cartes de question, gates `isWavyNow` /
  `wigWash` ajouté au bloc perruque (`['wigBond','wigWear','wigWash']`).
- **Aucun patch consommateur** : le tuyau unique du D9 a suffi (2 clés de plus).

## 5. Preuves

| Vérification | Résultat |
|---|---|
| Banc ondulé + perruque (`kurla_diagnostic_ondule_perruque.test.ts`) | **53/53** (32 du D12 + 21 du D14 : U1–U11, V1–V10) |
| Matrice personas (`kurla_diagnostic_personas.test.ts`) | **47/47** sur **3 389 profils** (rémanences 2A/2C et lavage du dessous balayées partout) |
| Banc concision résultat (`kurla_resultat_concision.test.ts`) | **OK** — 2 profils D14 ajoutés au balayage sans-perte, 0 texte tronqué |
| Suite `npm test` complète | **verte** (EXIT=0, 0 `npm ERR`, lint tsc final inclus) |
| `tsc --noEmit` | **0 erreur** |
| `npm run build` | **OK** |
| Playwright 390 px (3 parcours : ondulée 2C, perruque dessous rare, frisée garde) | **20/20** — over=0, console=0 |

Le moteur D13 (concisions, « Plus ») est intact : les nouveaux textes passent par le même
`LeadBlock`, et le banc sans-perte les couvre.

**Captures** : `docs/d14_ondulee_2c.png`, `docs/d14_perruque_dessous.png`,
`docs/d14_frisee_garde.png` (390 px @2x, écran de résultat).

## 6. Sources consultées (20/09)

Sous-motif ondulé :

- <https://controlledchaoshair.com/blogs/curly-hair-news/types-of-wavy-hair> — 2A/2B/2C : où
  commence la vague, poids du produit, « starting point not a strict diagnosis ».
- <https://www.bouncecurl.com/blogs/news/2a-vs-2b-vs-2c> — tableau comparatif : 2A s'écrase et
  se plat, 2B frizz + poids, 2C frizz + sécheresse + nœuds ; plusieurs motifs par tête.
- <https://smytten.com/blogs/haircare/7-essential-tips-for-understanding-wavy-hair-types> —
  FAQ « How do I know if I'm 2A, 2B or 2C » ; « les produits boucles conviennent au 2C, trop
  lourds pour un 2A ».
- <https://istanbulvita.com/article/type-2-wavy-hair-guide-2a-2b-and-2c-textures-534314> —
  définition augmente de 2A à 2C, besoins en hydratation et en tenue avec elle.
- <https://www.reddit.com/r/malehairadvice/comments/1txsxl0/is_my_hair_1c_2a_or_2b_or_something_else_and_some/> —
  la formulation terrain de la question, et « ne jamais brosser à sec : c'est ce qui transforme
  les 2A–2B en frizz ».

Lavage du dessous sous perruque :

- <https://www.reddit.com/r/Wigs/comments/1eckohb/washing_tips/> — lavage de la coiffe
  (tous les 2 semaines de port) ; ne pas mouiller le dessus du bonnet.
- <https://www.reddit.com/r/Wigs/comments/1srzhiy/how_often_do_you_wash_your_human_hair_wig/> —
  porteuses : 2 semaines à 6–8 semaines selon le port ; « vous pouvez savoir quand ça doit être
  lavé ».
- <https://www.reddit.com/r/Haircare/comments/1acltaj/ultimate_wig_care_guide/> — « lavage toutes
  les 1–2 semaines pour les perruques très portées » et cap+lace compris.
- <https://www.nadula.com/blog/how-to-wash-human-hair-wigs-and-how-often/> — 2–3 semaines en port
  fréquent, sueur/sébum sur le bonnet.
- <https://www.reddit.com/r/Naturalhair/comments/1j6xblk/how_often_do_you_wash_your_hair/> et
  <https://www.reddit.com/r/Naturalhair/comments/1dq29vh/how_often_are_we_really_supposed_to_wash_our_hair/> —
  le rythme du cheveu naturel sous coiffure protectrice : 1 à 2 semaines pour la majorité,
  jamais « quand ça se voit ».

## 7. Reste ouvert

- **Arbitrage « avant-locks »** (D11 §6) : « je veux porter les locks » avant le passage à
  l'acte est un besoin de **préparation** (méthode de démarrage selon la texture). Ce n'est
  pas une question de plus : c'est un mini-parcours produit, à décider côté produit.
- Poids/diamètre des locks (D11 §6) : toujours noté, non réclamé à ce jour.
