# Plan — affiliation sur les produits de soin (année 1, sans stock)

Décision utilisateur du 12/09/2026 : pas de stock la première année. Le matériel
et les accessoires partiront en **dropship** (liste fournisseur à venir) ; pour
les **produits de soin**, il faut prévoir un plan d'**affiliation**.

Ce document ne décrit que ce qui est vérifié dans le dépôt à la date d'écriture
(HEAD `27a2a8f`). Ce qui ne l'est pas est marqué « à trancher ».

---

## 1. Ce que l'affiliation est ici — et ce qu'elle n'est pas

KURLA **n'est pas le vendeur**. Elle recommande un produit tiers, renvoie vers le
partenaire, et perçoit une commission. Trois conséquences immédiates, qui ne se
négocient pas :

- la fiche **ne passe pas en caisse** : pas de panier, pas de Stripe, pas de
  commande, pas de stock ;
- le droit de rétractation et la garantie légale pèsent sur le **partenaire**,
  pas sur KURLA — la fiche doit le dire, pas le laisser deviner ;
- KURLA ne peut pas promettre un délai d'expédition qu'elle ne maîtrise pas.

Ce n'est donc **pas** une variante du dropship. Le dropship fait de KURLA le
vendeur ; l'affiliation non. Les confondre dans un même champ serait un défaut.

---

## 2. La contrainte qui domine toutes les autres : le conflit d'intérêts

KURLA se vend comme conseiller expert sur les cheveux texturés. Si ses
recommandations rapportent une commission, la promesse de conseil impartial
s'effondre — sauf à isoler strictement les deux.

**Le séparateur existe déjà, et il est gardé.** `NEEDS_HUB` (`src/lib/needsHub.ts`)
est le contenu éditorial des pages « besoins » ; le banc
`tests/kurla_need_depth.test.ts:144` consigne qu'il n'est lu que par
`needTexturePages.ts` et `NeedHubPage.tsx` — **jamais par le moteur**. Le score
`calculateKurlaFit` ne connaît donc rien de l'éditorial.

**Règle à tenir :** l'affiliation vit dans la couche éditoriale, jamais dans le
moteur. Concrètement, trois invariants :

1. `calculateKurlaFit` ne reçoit aucune information d'affiliation — ni présence,
   ni partenaire, ni commission ;
2. l'ordre d'affichage d'une page éditoriale ne dépend d'aucun champ affilié ;
3. un produit KURLA et un produit affilié répondant au même besoin sont
   présentés sur le même pied visuel, la seule différence étant la mention
   obligatoire du §3.

Un banc doit asserter les trois. Sans lui, la dérive est invisible : rien ne
tombe quand une commission se met à influencer un classement.

---

## 3. Obligation légale de disclosure — vérifiée, pas supposée

**Loi n° 2023-451 du 9 juin 2023** sur l'influence commerciale, dans sa rédaction
issue de l'**ordonnance n° 2024-978 du 6 novembre 2024** : dès qu'existe un
intérêt financier, même indirect, la mention est obligatoire —
« Publicité » / « Collaboration commerciale » ou équivalent adapté au format,
**accompagnée du nom de la marque**, et **« Lien affilié »** pour un lien
d'affiliation. L'absence de mention, ou le fait de laisser croire la
recommandation désintéressée alors qu'elle ne l'est pas, constitue une
**pratique commerciale trompeuse par omission** (art. **L.121-3** du Code de la
consommation). Sanctions alourdies depuis 2024 pour les communications en ligne.

Traduction technique : la mention n'est pas un texte éditorial facultatif, c'est
une **donnée obligatoire de la fiche**, dont l'absence doit bloquer la
publication — exactement comme `hasDocumentedExternalPreorder` bloque une
précommande sans SKU.

> À faire valider par un juriste : ce plan cite les textes, il ne les interprète
> pas. Le classement des recommandations (directive Omnibus 2019/2161) et le
> statut de KURLA au regard de la publicité comparative méritent une relecture.

---

## 4. Les règles debout du dépôt que ce plan doit respecter

| Règle | Conséquence sur l'affiliation |
|---|---|
| Pas de donnée utilisateur en avantage commercial (§23, §29) | **Aucun** paramètre de tracking dérivé du profil (type de boucle, porosité, diagnostic) dans les URLs affiliées. Les paramètres autorisés sont l'identifiant de partenaire et, si le programme l'exige, un identifiant de campagne non lié à une personne. |
| Copy no competitor | Recommander un produit tiers n'est pas copier son nom dans une fiche KURLA. **À trancher** : nomme-t-on des marques concurrentes de la gamme KURLA, ou seulement des produits que KURLA ne fabrique pas ? |
| Pas de fait, source ou stat inventé | Chaque fiche affiliée porte une URL réelle et vérifiable. Pas de partenaire plausible, pas de commission estimée. |
| Persona | Pas de diagnostic médical, pas de résultat garanti — y compris sur les fiches de partenaires. |

---

## 5. État mesuré du dépôt

Ce qui existe déjà, et ce qui manque :

| Élément | État |
|---|---|
| `src/lib/fulfillment.ts` | **Existe** : « FULFILLMENT SANS STOCK (année 1, Paris, 0 carton chez toi) », tampon 3PL 75 unités, dropship accessoires. Consommé par 7 fichiers d'UI (`CartDrawer`, `BoutiquePage`, `ProductDetailPage`, `OrderConfirmationPage`, `TamponOrderPanel`, `emailTemplates`, `preorderPromise`). |
| La règle de publiabilité consulte-t-elle cette couche ? | **Non** — 0 occurrence de `fulfillment` dans `catalogTruth.ts` comme dans `preorderEvidence.ts`. C'est la cause technique de la boutique vide. |
| Champ de modèle de fulfilment | **Absent** de la base. Colonnes de sourcing existantes : `source_supplier`, `supplier_id`, `supplier_sku`. |
| `supplier_sku` renseigné | **0 sur 63 produits publiés.** |
| Canal de vente affilié | **Absent** : aucun `affiliateUrl`, `externalCheckout`, `buyUrl` ni `partner_url` dans `src/`. Les seules occurrences d'« affiliate » sont de l'attribution marketing (`attribution.ts`, `businessStrategy.ts`). |
| `CatalogCommercialState` | 7 états : `draft`, `formulation_target`, `pending_validation`, `placeholder`, `preorder`, `available`, `unavailable`. Aucun état affilié. |
| Portes dérivées | `isPubliclyListable` et `isCheckoutEligible` dans `getCatalogTruth` — c'est là que l'affiliation se branche. |

---

## 6. Modèle de données proposé

Une colonne de modèle, quatre champs affiliés :

```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS fulfillment_model TEXT
    NOT NULL DEFAULT 'internal'
    CHECK (fulfillment_model IN ('internal','dropship','three_pl','affiliate')),
  ADD COLUMN IF NOT EXISTS affiliate_partner TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_url TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_commission_disclosed TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_relation_since DATE;
```

`fulfillment_model` est **déclaré**, jamais déduit : le dépôt a déjà payé pour
avoir déduit un fournisseur (`preorderEvidence.ts` s'en défend explicitement).

Règle de cohérence à faire garder par un banc :

- `affiliate` → `affiliate_url` et `affiliate_partner` **obligatoires**, et
  `isCheckoutEligible` **faux** quelle que soit la valeur des autres champs ;
- `dropship` / `three_pl` → `supplier_sku` obligatoire, comme aujourd'hui. Ce
  plan **n'assouplit pas** cette exigence : une commande qu'on ne sait pas
  transmettre au partenaire n'est pas une promesse tenable ;
- `internal` → inchangé.

---

## 7. Parcours technique

1. **DDL** ci-dessus (faisable : jeton de compte Supabase, `verifier-schema.mjs`
   pour contrôler ensuite).
2. **`src/lib/catalogTruth.ts`** — ajouter `'affiliate'` à
   `CatalogCommercialState`, forcer `isCheckoutEligible = false`, ajouter un
   bloqueur nominatif quand l'URL ou le partenaire manque.
3. **`src/lib/preorderEvidence.ts`** — laisser `hasDocumentedExternalPreorder`
   intact ; l'affiliation n'est pas une précommande et ne doit pas passer par
   cette porte.
4. **Normaliseur + écrans admin** — le champ se déclare là où le sourcing se
   déclare déjà : `src/components/ProductSupplierPanel.tsx` et
   `src/components/CatalogAdminPanel.tsx` sont les deux composants qui éditent
   `supplier_sku` et `source_supplier` (vérifié). `BeautyProfileEditor.tsx`
   n'a rien à voir ici : c'est le profil utilisateur, pas la fiche produit.
5. **Surface éditoriale** — `needsHub.ts` autorise, pour une étape de routine,
   soit un `productId` KURLA, soit une référence affiliée. Jamais les deux
   confondus dans le même champ.
6. **Mention obligatoire** — composant unique, rendu sur toute fiche affiliée,
   nommant la marque : « Publicité — lien affilié {partenaire} ».
7. **Bancs** — (a) une fiche affiliée ne peut ni entrer au panier ni être
   commandée ; (b) `calculateKurlaFit` renvoie le même score avec et sans
   données affiliées ; (c) l'absence d'URL ou de partenaire bloque la
   publication ; (d) aucun paramètre d'URL affiliée ne provient du profil.

---

## 8. Ce que ce plan ne change pas

- **Les 16 cibles de formulation** (`peau-ess-001` à `016`) restent la gamme
  KURLA, servies par `/api/peau/gamme` en brouillon. Elles ne sont pas des
  candidates à l'affiliation : ce sont vos futures formules.
- **Les 63 fiches publiées non listables** restent bloquées sur un
  `supplier_sku` absent. L'affiliation ne les débloque pas : elles sont
  destinées au dropship/3PL, et la liste fournisseur n'existe pas encore.
- **Le matériel et les accessoires** restent en dropship. Leur déblocage attend
  la liste de références du partenaire.

---

## 9. Bloqué sur une décision ou une donnée externe

1. **Programmes d'affiliation réels** : quels partenaires, quelles URLs, quelle
   commission. Sans eux, aucune fiche affiliée ne peut être créée — et en
   inventer serait exactement ce que le dépôt s'interdit.
2. **Nommer ou non des marques tierces** concurrentes de la gamme KURLA.
3. **Validation juridique** du §3 (classement, publicité comparative).
