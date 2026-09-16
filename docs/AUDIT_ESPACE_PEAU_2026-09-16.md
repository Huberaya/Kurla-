# Audit de l'espace de travail Peau — 16/09/2026

Trois lectures : **fondateur** (qu'est-ce que je vends, sous quelle marque),
**utilisateur** (qu'est-ce qu'on me montre), **responsable d'achat** (qu'est-ce
que je peux réellement commander).

Tout ce qui suit est **mesuré** sur la base et sur la production
(`https://kurlabeauty.vercel.app`), pas estimé. Ce qui est déduit d'un nom est
dit comme tel. Rien n'a été modifié : ce document dit **quoi retirer**, il ne
le fait pas.

---

## 1. Ce que voit le client : aucun produit de peau

| | |
|---|---|
| Fiches dans l'espace peau | **70** |
| … publiées | 50 |
| … **réellement servies par l'API boutique** | **10** |
| … dont produits de soin de la peau | **0** |
| … dont **kits capillaires** | **10** |

Les 10 fiches que voit un visiteur de l'espace peau sont, dans leur intégralité,
des kits pour cheveux bouclés, crépus, locksés :

```
Sélection KURLA    Kit — Premiers pas bouclés (3A/3B)        49,90 €
                   Kit — Hydratation & définition (3C/4A)    64,90 €
                   Kit — Nutrition profonde crépue (4B/4C)   69,90 €
                   Kit — Réparation & pousse (cheveux abîmés) 74,90 €
                   Kit — Coiffures protectrices (twist/tresses) 49,90 €
                   Kit — Routine complète 4C (toute la ligne) 89,90 €
KURLA Botanicals   Kit — Boucles sans chaleur (heatless)      39,90 €
                   Kit — Entretien locs, vanilles & cheveux courts 44,90 €
                   Kit — Outils wash day essentiels           49,90 €
                   Kit — Soin profond premium (vapeur & scalp care) 149,90 €
```

**Cause exacte.** `isProductInWorkspace` (dans `src/server/workspaceScope.ts`)
range dans « peau » toute catégorie parmi `peau, skin, skincare, kits` ou
commençant par `kit-peau`. Les 10 kits portent la catégorie `kits` : ils
basculent donc **tous** dans l'espace peau, quel que soit leur contenu — et
disparaissent de l'espace cheveux, auquel ils appartiennent. Il n'y a aucun kit
côté cheveux : les 10 y sont manquants.

Le contenu « capillaire » de ces kits n'est pas inscrit dans un champ : il se
lit dans les noms (types de boucles 3A à 4C, twist/tresses, locks, wash day,
soin du cuir chevelu) et dans leur origine — les identifiants `launch-k01` à
`launch-k10` appartiennent à la même série que les `launch-p…`, qui sont bien
des marques capillaires (As I Am, Aunt Jackie's, ApHogee).

> **Lecture fondateur.** Votre espace peau vend des kits pour cheveux. Ce
> n'est pas un désordre cosmétique : c'est la seule chose que le client y voit.
> **Lecture utilisateur.** Je viens chercher un soin du visage, on me propose
> un kit wash day.

---

## 2. Les 70 fiches : quatre populations qui n'ont rien à faire ensemble

| Population | Nb | Statut | Verdict |
|---|---:|---|---|
| Votre gamme peau (`peau-ess-001` à `016`) | 16 | **brouillon**, aucun fournisseur | le seul vrai catalogue peau — invisible |
| Kits capillaires (`launch-k01`…`k10`) | 10 | publiés, **servis** | **mal rangés** : ce sont des fiches cheveux |
| Fiches de démonstration (`p6`, `p10`, `p14`, `p15`) | 4 | brouillon | à retirer, elles portent des prix de vente |
| Fiches de test de marques tierces | 40 | publiées mais **jamais servies** | ce sont des **candidats sourcing**, pas des produits |

**Les 40 fiches tierces** (The Ordinary 10, La Roche-Posay 7, Torriden 5,
COSRX 3, Eucerin 2, Isdin 2, Beauty of Joseon 2, Weleda 2, Avène 1, Bioderma 1,
Cosmo Naturel 1, IN'OYA 1, Isntree 1, The INKEY List 1, L'Oréal Paris 1) sont
publiées **et invisibles**. Elles encombrent le catalogue sans rien vendre.
Parmi elles, **11 n'ont aucun fournisseur** (les 10 The Ordinary et l'Isntree).

> **Lecture responsable d'achat.** Sur 70 fiches, 40 sont des candidats qu'on
> n'a pas encore sourcés, 16 sont votre gamme qui n'existe pas encore
> industriellement, 10 sont des kits cheveux, et 4 sont des démos. **Il ne reste
> rien à acheter.**

---

## 3. Les onglets : 22 onglets, 45 panneaux, deux tableaux de bord parallèles

| Famille | Onglets |
|---|---|
| Vue d'ensemble Skin | Tableau de bord commercial · 🚀 Growth Command Center · Business Control Center |
| Ventes & Clients | Commandes · Retours & Remboursements · Support Client · Professionnels peau & Hair |
| Catalogue Skin & Stock | Pipeline · Pilotage catalogue · Catalogue produits · Lots & traçabilité · Guide dropship |
| Approvisionnement Skin | Demande précommandes · **Fournisseurs & sourcing** |
| Appro par étapes *(nouveau)* | 1 · Qui me fournit · 2 · Négocier · 3 · Acheter & marges · 4 · Recevoir |
| Gestion & Contenu | Gestion quotidienne |
| **Gouvernance Skin** | Vue d'ensemble peau · Gates C1/C5 · Fiches peau |

### Trois doublons supprimés pendant l'audit, deux subsistent

Le 16/09, pendant que cet audit s'écrivait, « Kits & lots », « Preuves &
fournisseurs » et « Demande peau » ont été supprimés : ils remontaient
exactement les mêmes panneaux que « Lots & traçabilité », « Fournisseurs &
sourcing » et « Demande précommandes ». La famille « Gouvernance Skin » est
passée de 6 onglets à 3, et le dashboard de 25 à 22 onglets. Les chiffres de ce
document ont été repris après cette suppression.

Il reste deux doublons, mesurés après :

| Onglet générique | Onglet skin | Panneaux en commun |
|---|---|---|
| Pilotage catalogue | Vue d'ensemble peau | Gates cockpit peau |
| Catalogue produits | Fiches peau | Catalogue produits, Publication peau |

La famille « Gouvernance Skin » ne porte plus qu'un contenu vraiment unique :
**Gates C1/C5**, et ce contenu est lui-même un empilement de 8 panneaux issus
d'anciens chantiers (C21, C24, C25, C26, C27, C28, facturation, QA).

### Un écran de 18 panneaux

L'onglet **Fournisseurs & sourcing** empile **18 panneaux**. La barre de saut
du dashboard est plafonnée à 8 sections (`MAX_SECTIONS = 8` dans
`AdminSectionNav.tsx`) : les dix panneaux suivants ne sont **pas atteignables
par la navigation**. L'onglet « Appro par étapes » existe précisément pour
répartir ces mêmes panneaux en 4 écrans — mais les deux coexistent, personne
n'a tranché. Le code le dit lui-même : *« Rien n'est supprimé tant que la
comparaison n'est pas tranchée. »*

Les écrans les plus chargés : Gestion quotidienne (8 sections, au plafond),
Catalogue produits (6), Lots (5), Copilote (5), Guide dropship (7).

---

## 4. Les doublons

### Un doublon strict — à deux prix différents

```
The Ordinary — Hyaluronic Acid 2% + B5
   fond-to-003   10,12 €   publié, test, sans fournisseur
   fond-to-004   17,49 €   publié, test, sans fournisseur
```

Le même sérum, deux fiches, **7,37 € d'écart**. Il n'est pas servi aujourd'hui ;
il le deviendrait dès que la règle de mise en vente changerait.

### Les doublons fonctionnels : un assortissement, pas une gamme

Un même actif est décliné en trois, quatre ou cinq fiches, souvent entre votre
marque et les marques tierces :

| Actif / fonction | Votre gamme | En marques tierces | Total |
|---|---|---:|---:|
| Acide hyaluronique | Gel AH | The Ordinary ×2, LRP Hyalu B5 ×2 | 5 |
| BHA / exfoliants | Soin local BHA, Exfoliant AHA/BHA | COSRX, Isntree, The Ordinary | 5 |
| SPF | SPF 50 fluide, SPF 50+ teinté, Sérum SPF (démo) | Avène, LRP, Eucerin, Isdin ×2 | 8 |
| Rétinol | Rétinol doux 0,3 % | LRP B3, The Ordinary 1 % | 3 |
| Acide azélaïque | Sérum 10 % | The Ordinary, The INKEY List | 3 |
| Niacinamide | Sérum 5 % | Sérum démo, The Ordinary | 3 |
| Vitamine C | Sérum 10 % | LRP C12 | 2 |
| Céramides | Crème, Crème riche, Baume lèvres | The Ordinary ×2 | 5 |
| Stick lèvres SPF | — | Avène, La Roche-Posay | 2 |

Chez un revendeur, trois marques d'acide azélaïque est une offre. Chez une
marque qui lance **sa** gamme, c'est une hésitation : votre sérum azélaïque
concerne exactement la même cliente que le The Ordinary et le The INKEY List
déjà en base.

### Les fiches à 0 €

Cinq Torriden et un Beauty of Joseon sont publiés à **0 €**. Ils ne sont pas
servis aujourd'hui — le risque de commande gratuite n'est donc pas ouvert —
mais ce sont six fiches publiées avec un prix nul, prêtes à réapparaître au
premier changement de règle.

---

## 5. La liste de retrait

Dix actions, dans cet ordre. Les quatre premières touchent au catalogue, les
six suivantes à l'écran.

### A. Sortir les 10 kits capillaires de l'espace peau — *déplacer, pas supprimer*
`launch-k01` … `launch-k10`. Corriger `isProductInWorkspace` pour qu'un kit
suive le workspace de son contenu, et non la catégorie `kits` appliquée
aveuglément.
**Attention à l'ordre** : ce sont les 10 seules fiches servies de l'espace peau.
Les retirer sans rien publier à la place laisse une boutique **vide**. Voir §7.

### B. Retirer les 4 fiches de démonstration
`p6` (Sérum SPF 50+ Peau Mélaninée, 22,90 €), `p10` (Sérum Niacinamide, 29,90 €),
`p14` (Eadem Milk Marvel, 62 €), `p15` (Black Girl Sunscreen SPF 30, 24,90 €).
Elles portent la mention « (Démo) » et des prix de vente réels. Une démo qui
ressemble à un produit fini finit par être vendue.

### C. Supprimer le doublon — une seule fiche « Hyaluronic Acid 2% + B5 »
Garder `fond-to-003` (10,12 €) ou `fond-to-004` (17,49 €) après avoir établi
lequel est le bon prix. Deux prix pour un même produit est une erreur
commerciale, pas une variante.

### D. Dépublier les 6 fiches à 0 €
`peau-test-torriden-*` (5) et `peau-test-boj-tonique-riz` (1). Un prix nul
n'est pas « prix à définir » : c'est un produit payable zéro euro.

### E. Sortir les 40 fiches tierces du catalogue
Elles sont publiées, invisibles, et pour 11 d'entre elles sans fournisseur. Ce
sont des **candidats à sourcer**, pas des produits : le champ
`source_candidate_id` existe pour ça. Les dépublier (ou les basculer en
candidats) rend le catalogue lisible — 70 fiches deviennent 30, dont 16
réellement vôtres.

### F. Supprimer les deux onglets doublons restants
« Vue d'ensemble peau » et « Fiches peau » doublonnent « Pilotage catalogue » et
« Catalogue produits ». Conserver « Gates C1/C5 ». **−2 onglets.**

### G. Adopter « Appro par étapes » et supprimer l'ancien
Remplacer « Demande précommandes » + « Fournisseurs & sourcing » (18 panneaux,
dont 10 inatteignables) par les 4 onglets déjà construits. **−2 onglets, et un
écran qui redevient navigable.**

### H. Sortir le Guide dropship du catalogue
C'est de la documentation (7 sections) au milieu des écrans de travail. À
déplacer vers une aide, pas à supprimer.

### I. Interroger les 8 panneaux de chantier (C21, C24, C25, C26, C27, C28, facturation, QA)
Je ne propose pas de les supprimer d'office : ce sont des écrans construits
chantier par chantier, et je n'ai pas mesuré qui les utilise. Mais **six
d'entre eux portent un numéro de chantier dans leur nom** — c'est le signe
qu'ils ont été livrés pour une échéance, pas qu'ils servent au quotidien.
Question à trancher par l'usage, pas par principe.

### J. Trancher entre trois tableaux de bord
« Tableau de bord commercial », « Growth Command Center » et « Business
Control Center » cohabitent dans la même famille. Trois tableaux de bord,
c'est l'absence de tableau de bord.

**Bilan écran, compte exact.** 22 onglets aujourd'hui (après la suppression de
3 doublons le 16/09).
−2 (Vue d'ensemble peau, Fiches peau) −2 (Approvisionnement v1) −1 (Guide
dropship) −2 (ne garder qu'un tableau de bord sur trois) = **15 onglets**.

Côté panneaux : 45 aujourd'hui. Le guide et deux tableaux de bord sortent
(−3) → **42**. Si l'on retire aussi les six écrans de chantier C21–C28 (§ I),
on tombe à **36**. L'essentiel n'est pas le compte : c'est qu'aucun écran ne
dépasse 8 sections et redevienne navigable.

---

## 6. Ce que je ne propose pas de retirer

- **Votre gamme peau (16 fiches).** Elle est en brouillon et sans fournisseur,
  mais c'est le seul véritable catalogue peau du projet. Elle ne se retire pas,
  elle se débloque.
- **Les 40 fiches tierces en tant qu'information.** Elles sont le fruit de la
  campagne de sourcing du 14/09. Je propose de les sortir du catalogue, pas de
  les effacer : la question « peut-on vendre cette marque » reste ouverte, et
  pour The Ordinary la réponse est probablement non.
- **Les fiches de test en tant que démarche.** Mesurer le marché avec des
  fiches jetables est sain. Ce qui ne l'est pas, c'est de les laisser publiées
  dans le catalogue au même titre que des produits.

---

## 7. Par quoi commencer

Le piège de ce chantier est l'ordre. Retirer les kits en premier **viderait la
boutique peau** : ils sont les seuls servis.

1. **Débloquer la gamme.** Les 16 fiches `peau-ess` n'ont ni fournisseur ni
   façonnier. Oomylab (Quimper, ISO 22716, peaux noires) et Phytodia (Illkirch,
   lots dès 2 kg) sont identifiés et sourcés — il manque un devis comparé.
   Sans cela, l'espace peau n'a rien à vendre, quel que soit le ménage fait.
2. **Retirer ce qui ment** (B, C, D) : 4 démos, 1 doublon, 6 fiches à 0 €.
   Sans risque, sans effet de bord, immédiat.
3. **Sortir les 40 candidats du catalogue** (E).
4. **Déplacer les kits** (A) — une fois la gamme publiable.
5. **Nettoyer l'écran** (F à J).

> **Lecture fondateur.** Une seule chose vous manque pour que cet espace ait un
> sens : un façonnier. Le reste du ménage est nécessaire mais ne vend rien.

---

## 8. Comment ces chiffres ont été obtenus

- Base : `products`, lecture directe (REST Supabase), 138 produits,
  répartition par catégorie (`peau` 60, `kits` 10 → espace peau = 70).
- Boutique : `GET https://kurlabeauty.vercel.app/api/products` → 63 produits
  servis, croisés avec les identifiants de l'espace peau → **10 servis**.
- Onglets : lecture de `navGroups` dans `src/pages/AdminDashboardPage.tsx`
  (6 familles, 22 onglets au moment de la publication — trois doublons ont été
  supprimés dans l'intervalle) et extraction ligne à ligne des panneaux montés
  par onglet (45 panneaux distincts).
- Sections : comptage des `<h2>`/`<h3>` par fichier de panneau ; plafond de
  navigation confirmé à `MAX_SECTIONS = 8` dans `AdminSectionNav.tsx`.

**Non vérifié, et dit comme tel** : le contenu réel des kits (aucun champ ne le
décrit en base — la qualification capillaire vient des noms et de la série
d'identifiants `launch-*`) ; et l'usage quotidien des panneaux de chantier C21
à C28, qui relève de votre arbitrage.

---

## 9. Ce qui a été appliqué le 16/09/2026

Suite au go, les lettres **C**, **D** et **E** ont été exécutées — celles qui ne
vident pas la vitrine. Aucune fiche n'a été supprimée.

### Le statut « publié » dit maintenant vrai

| | avant | après |
|---|---:|---:|
| Fiches publiées dans l'espace peau | 50 | **10** |
| … servies en boutique | 10 | **10** *(inchangé)* |
| Publiées sans fournisseur (tout catalogue) | 11 | **0** |
| Doublons publiés | 1 | **0** |
| Fiches publiées à 0 € | 6 | **0** |

Les 40 candidates de test de marques tierces sont passées en brouillon —
**exactement** comme le fait l'action `withdraw` de la porte de publication
(`catalog_status = 'draft'`, `is_active = false`). Elles restent au catalogue
admin et dans les écrans d'approvisionnement, qui ne filtrent pas sur le statut
publié.

### Le doublon

`fond-to-004` (17,49 €) retirée, `fond-to-003` (10,12 €) conservée. Règle
appliquée : face à deux fiches identiques dont aucune n'est sourcée, **le doute
profite à la cliente** — on garde la moins chère. La fiche retirée n'est pas
supprimée mais passée `unavailable`, ce qui la sort de l'approvisionnement.

### Deux invariants ajoutés au contrôle nocturne

Le contrôle énonçait huit invariants ; aucun ne portait sur la provenance
réelle ni sur les doublons. D'où les deux aveuglements ci-dessus.

1. **« produits publiés sans fournisseur rattaché »** — lit `supplier_id`, et
   non le champ libre `source_supplier` comme le faisait l'invariant voisin,
   qui affichait 0 le jour où 36 fiches publiées n'avaient aucune provenance ;
2. **« doublons publiés (même marque et même nom) »** — compte le surplus,
   c'est-à-dire le nombre de fiches à retirer.

Contrôle complet relancé après écriture : **9 invariants, 9 ok, 0 anomalie.**
L'incident nocturne ouvert le matin (6 fiches publiées à 0 €) est donc clos par
la donnée, et non contourné.

### Ce que l'écriture a révélé

La vitrine sert les fiches **`in_stock = true`**. Les 40 candidates étaient
publiées mais **toutes épuisées** (dont 24 en précommande), sans fournisseur
pour 11 d'entre elles : elles n'étaient pas « mal servies », elles étaient
invendables. « Publié » voulait dire « prêt à vendre » là que rien ne pouvait
l'être.

Il reste **2 fiches cheveux** dans ce cas (Klorane `src-klorane-001`, Ducray
`src-ducray-001`) : publiées, en rupture, donc non servies. Elles sortent du
périmètre de cet audit (espace peau) et, contrairement aux 40, elles ont bien
un fournisseur rattaché — c'est un état de stock, pas un mensonge de statut.

### Journalisation et annulation

- `catalog_gate_journal` : 40 lignes, `action = withdraw`, `mode = apply`,
  raison nominative par fiche (candidate non sourcée, ou doublon).
- `docs/RETRAIT_VITRINE_PEAU_2026-09-16_annulation.sql` : remet les 40 fiches
  publiées et actives en une requête.
- Script : `scripts/retireCandidatsVitrinePeau.ts` — simulation par défaut,
  arrêt si l'une des fiches visées était réellement servie, arrêt si la
  population n'est plus exactement 40.

### Non fait, et pourquoi

- **A (déplacer les 10 kits)** : ce sont les seules fiches servies. Les retirer
  maintenant laisserait une boutique peau vide. Attend que la gamme soit
  publiable.
- **B (supprimer les 4 démos)** : elles sont en brouillon, donc invisibles ; la
  suppression est destructive et je l'ai déjà refusée une fois pour `p15`.
  À décider.
- **F à J (l'écran)** : chantier suivant.

---

## 10. Appliqué le 16/09 au soir — la lettre F, et au-delà

Le fondateur a tranché après lecture : **la configuration attendue dans l'espace
peau est celle de l'espace cheveux**, ni plus ni moins. Les lettres F à J
deviennent donc sans objet — il ne s'agit plus d'élaguer l'espace peau, mais de
le rendre **identique** à l'espace cheveux.

**Retiré :** la famille « Gouvernance Skin » (3 onglets) et les panneaux
propres à peau injectés dans les onglets partagés — écart demande/stock,
publication des fiches peau, coût servi des kits, cockpit Gates, cahier
d'actifs, suivi des mails J0, contrôle whitecast.

**Résultat :** 6 familles, 19 onglets, identiques. Les deux espaces ne
diffèrent plus que par le libellé (Skin / Hair) et par le filtre de données.

**Les trois écrans de gouvernance catalogue** — porte de publication,
dérogations datées, gates de phase de test — n'étaient montés que dans l'onglet
« Fiches peau ». Ils ont été **déplacés**, pas supprimés : ils vivent désormais
dans l'onglet partagé « Catalogue produits », visibles dans les deux espaces.
Un cosmétique cheveux est soumis au même Règlement 1223/2009 qu'un cosmétique
peau ; cette gouvernance n'est pas l'affaire d'un seul espace. Mesuré après
coup : **aucune route d'administration ne tombe à zéro appelant.**

**Garde-fou :** `tests/parite_espaces.test.ts`, chaîné dans `npm test`. Il
échoue si un panneau, un onglet ou une famille redevient propre à un espace.

**Aveuglement corrigé au passage :** l'inventaire des routes d'administration
comptait comme « appelée » toute route présente dans un fichier de `src/`,
**monté ou non**. Il parcourt désormais le graphe des importations depuis les
points d'entrée et nomme les fichiers morts : **13 fichiers inatteints**
appellent encore l'administration. Limite à connaître : il raisonne sur les
importations, pas sur l'arbre de rendu — les blocs `skin_*` conservés importent
encore des panneaux peau qui passent pour atteints sans être rendus par aucun
onglet offert.

**Défaut qui demeure, commun aux deux espaces :** l'onglet « Fournisseurs &
sourcing » empile **27 sections** alors que la barre de saut s'arrête à 8 ; les
19 dernières sont inatteignables. C'est aujourd'hui le principal défaut de
navigation du dashboard, et il concerne peau et cheveux également.
