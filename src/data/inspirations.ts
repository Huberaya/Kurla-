/**
 * GALERIE D'INSPIRATIONS COIFFURES.
 *
 * Chaque entrée décrit un style réel (tresses, locs, twists, coupes, afro…)
 * pour un public donné (femme, homme, enfant), avec :
 *  - un visuel hébergé sur notre storage (voir note de licence ci-dessous) ;
 *  - la réalité d'entretien du style (durée de pose, tenue, gestes de nuit) ;
 *  - les produits/outils KURLA réellement utiles pour CE style (slugs boutique) ;
 *  - une question prête à poser à l'assistante IA.
 *
 * LICENCE DES VISUELS : photos d'inspiration collectées sur le web public
 * (éditoriaux coiffure, banques d'images, blogs spécialisés). Les droits ne
 * sont pas tous licenciés — décision assumée par l'équipe en attendant des
 * shootings propres ou des photos de clientes avec accord. Ne pas utiliser
 * ces visuels en publicité payante.
 */

export type InspirationPublic = 'femme' | 'homme' | 'enfant';

export type InspirationStyle =
  | 'tresses'
  | 'locs'
  | 'twists'
  | 'coupes'
  | 'afro'
  | 'protectif';

export type Inspiration = {
  id: string;
  title: string;
  publics: InspirationPublic[];
  styles: InspirationStyle[];
  image: string;
  /** Ce que c'est + pour qui ça marche. */
  description: string;
  /** Temps de pose typique en salon (fourchette honnête). */
  poseTime: string;
  /** Combien de temps le style se porte. */
  wearTime: string;
  /** Gestes d'entretien concrets, issus des pratiques de la communauté. */
  care: string[];
  /** Slugs boutique des produits/outils utiles pour CE style. */
  productSlugs: string[];
  /** Question pré-remplie pour l'assistante IA. */
  aiQuestion: string;
};

const IMG = 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/inspirations';

export const INSPIRATION_STYLE_LABELS: Record<InspirationStyle, string> = {
  tresses: 'Tresses & braids',
  locs: 'Locs',
  twists: 'Twists & vanilles',
  coupes: 'Coupes & dégradés',
  afro: 'Afro & boucles libres',
  protectif: 'Styles protecteurs',
};

export const INSPIRATION_PUBLIC_LABELS: Record<InspirationPublic, string> = {
  femme: 'Femmes',
  homme: 'Hommes',
  enfant: 'Enfants',
};

export const INSPIRATIONS: Inspiration[] = [
  // ——— FEMMES ———
  {
    id: 'insp-afro-washngo',
    title: 'Afro libre — wash and go',
    publics: ['femme'],
    styles: ['afro'],
    image: `${IMG}/insp-afro-washngo.jpg`,
    description:
      'Le cheveu naturel porté tel quel, boucles définies à la crème ou au gel de lin. Le style le plus rapide au quotidien — et le plus exigeant en hydratation.',
    poseTime: '30–60 min chez soi',
    wearTime: '3–5 jours entre deux refresh',
    care: [
      'Refresh matin : brume d’eau + leave-in léger, froisser sans casser la boucle.',
      'Nuit : pineapple (haut chignon lâche) + bonnet satin, jamais cheveux écrasés à nu.',
      'Relancer la définition tous les 3–4 jours plutôt que recoiffer à sec.',
    ],
    productSlugs: [
      'preco-gel-de-lin-definition-sans-croutage',
      'preco-leave-in-creme-hydratante-legere',
      'preco-flacon-vaporisateur-brume-continue',
      'preco-bonnet-satin-nuit-taie-d-oreiller',
    ],
    aiQuestion: 'Comment réussir et faire durer un wash and go sur cheveux crépus ?',
  },
  {
    id: 'insp-high-puff',
    title: 'High puff',
    publics: ['femme'],
    styles: ['afro', 'protectif'],
    image: `${IMG}/insp-high-puff.jpg`,
    description:
      'L’afro rassemblé en couronne haute avec un chouchou satin ou un foulard. Chic en 5 minutes, protège les pointes, parfait entre deux styles.',
    poseTime: '5–10 min chez soi',
    wearTime: 'À refaire chaque jour sans tension',
    care: [
      'Ne jamais tirer les tempes : le puff se pose lâche, l’élastique satin fait le reste.',
      'Hydrater les contours (edges) avant de lisser au gel léger + brosse à edges.',
      'Défaire chaque soir — un puff dormi tendu casse la couronne.',
    ],
    productSlugs: [
      'preco-chouchous-satin-spirales-sans-casse',
      'preco-gel-de-tenue-forte-edge-twist',
      'preco-brosse-a-edges-peigne-de-precision',
      'preco-foulard-headwrap-satin-premium',
    ],
    aiQuestion: 'Comment faire un high puff sans me casser les tempes ni les edges ?',
  },
  {
    id: 'insp-twa-color',
    title: 'Coupe courte — TWA & big chop',
    publics: ['femme'],
    styles: ['coupes'],
    image: `${IMG}/insp-twa-color.jpg`,
    description:
      'Le teeny weeny afro, souvent après un big chop, éventuellement coloré. Libérateur, facile à vivre — la couleur demande un soin renforcé.',
    poseTime: '30–60 min en salon (coupe)',
    wearTime: 'Retouche toutes les 4–6 semaines',
    care: [
      'Hydratation quotidienne en spray : le cheveu court se déshydrate vite.',
      'Si coloré : masque nourrissant hebdomadaire, la décoloration fragilise le 4C.',
      'Bonnet satin la nuit même sur cheveux très courts.',
    ],
    productSlugs: [
      'preco-spray-refresh-quotidien-hydratation',
      'preco-masque-profond-nutrition-beurre-de-karite',
      'preco-bonnet-satin-nuit-taie-d-oreiller',
    ],
    aiQuestion: 'Je viens de faire un big chop : quelle routine simple pour mon TWA ?',
  },
  {
    id: 'insp-box-braids-milong',
    title: 'Box braids mi-longues',
    publics: ['femme'],
    styles: ['tresses', 'protectif'],
    image: `${IMG}/insp-box-braids-milong.jpg`,
    description:
      'Les tresses carrées classiques, longueur épaules. Le style protecteur le plus polyvalent : bureau, sport, soirée.',
    poseTime: '4–6 h en salon',
    wearTime: '6–8 semaines maximum',
    care: [
      'Cuir chevelu : huile légère ou eau de romarin au flacon applicateur, 2–3 fois/semaine.',
      'Nuit : foulard ou bonnet satin XL pour éviter les frisottis sur les lignes.',
      'Ne pas dépasser 8 semaines : la repousse non hydratée casse à la racine.',
    ],
    productSlugs: [
      'preco-eau-de-romarin-tonique-pousse-cuir-chevelu',
      'preco-flacon-applicateur-embout-precis',
      'preco-foulard-headwrap-satin-premium',
      'preco-kit-coiffures-protectrices',
    ],
    aiQuestion: 'Comment entretenir mes box braids et mon cuir chevelu pendant 6 semaines ?',
  },
  {
    id: 'insp-box-braids-color',
    title: 'Box braids colorées',
    publics: ['femme'],
    styles: ['tresses', 'protectif'],
    image: `${IMG}/insp-box-braids-color.jpg`,
    description:
      'Bordeaux, cuivré, ombré : la couleur vient des mèches ajoutées, zéro décoloration de vos cheveux. L’audace sans le dommage.',
    poseTime: '4–6 h en salon',
    wearTime: '6–8 semaines',
    care: [
      'Mêmes gestes que des box braids classiques : le synthétique coloré ne change rien au cuir chevelu.',
      'Rincer le cuir chevelu à l’eau + shampoing dilué en flacon applicateur toutes les 2 semaines.',
      'Éviter l’eau très chaude qui ternit les mèches colorées.',
    ],
    productSlugs: [
      'preco-shampoing-creme-hydratant-sans-sulfate',
      'preco-flacon-applicateur-embout-precis',
      'preco-bonnet-de-douche-reutilisable-double-satin',
    ],
    aiQuestion: 'Comment laver mon cuir chevelu sous des box braids sans les abîmer ?',
  },
  {
    id: 'insp-knotless-boho',
    title: 'Knotless braids bohème',
    publics: ['femme'],
    styles: ['tresses', 'protectif'],
    image: `${IMG}/insp-knotless-boho.jpg`,
    description:
      'Tresses sans nœud à la racine — moins de tension, plus de confort — avec des mèches bouclées laissées libres pour l’effet boho.',
    poseTime: '5–7 h en salon',
    wearTime: '6–8 semaines',
    care: [
      'La racine sans nœud tire moins : idéal si vous avez déjà eu des douleurs ou une alopécie de traction.',
      'Les mèches bouclées libres se rafraîchissent à la brume + mousse légère.',
      'Filet ou bonnet XL la nuit pour ne pas emmêler les boucles libres.',
    ],
    productSlugs: [
      'preco-mousse-coiffante-legere-definition',
      'preco-flacon-vaporisateur-brume-continue',
      'preco-filet-de-protection-tresses-vanilles',
    ],
    aiQuestion: 'Knotless ou box braids classiques : que choisir pour des tempes fragiles ?',
  },
  {
    id: 'insp-lemonade-braids',
    title: 'Lemonade braids',
    publics: ['femme'],
    styles: ['tresses', 'protectif'],
    image: `${IMG}/insp-lemonade-braids.jpg`,
    description:
      'Nattes collées balayées sur un côté, pointes bouclées. Un tracé graphique qui met le profil en valeur.',
    poseTime: '3–5 h en salon',
    wearTime: '3–4 semaines (le tracé se voit vite repousser)',
    care: [
      'Contours nets = mousse fixante souple sur les lignes après la nuit.',
      'Le côté plaqué frotte l’oreiller : taie satin indispensable.',
      'Gratter le cuir chevelu avec les doigts, jamais les ongles entre les rangées.',
    ],
    productSlugs: [
      'preco-mousse-coiffante-twist-lock-tenue-souple',
      'preco-bonnet-satin-nuit-taie-d-oreiller',
      'preco-gel-de-tenue-forte-edge-twist',
    ],
    aiQuestion: 'Comment garder mes lemonade braids nettes plus de 3 semaines ?',
  },
  {
    id: 'insp-fulani-perles',
    title: 'Tresses peules (fulani) & perles',
    publics: ['femme'],
    styles: ['tresses', 'protectif'],
    image: `${IMG}/insp-fulani-perles.jpg`,
    description:
      'Nattes collées à l’avant, tresses libres perlées autour — l’héritage peul porté moderne. Les perles se choisissent bois, doré ou transparent.',
    poseTime: '4–6 h en salon',
    wearTime: '4–6 semaines',
    care: [
      'Les perles pèsent : éviter d’en charger les tresses fines de contour.',
      'Dormir avec un foulard noué au-dessus des perles pour ne pas les écraser.',
      'Sérum léger sur les longueurs pour garder la brillance des tresses.',
    ],
    productSlugs: [
      'preco-serum-huiles-nourricieres-multi-usages',
      'preco-foulard-headwrap-satin-premium',
    ],
    aiQuestion: 'Tresses fulani avec perles : quel entretien et quel poids éviter ?',
  },
  {
    id: 'insp-cornrows-chignon',
    title: 'Nattes collées — chignon bas',
    publics: ['femme'],
    styles: ['tresses', 'protectif'],
    image: `${IMG}/insp-cornrows-chignon.jpg`,
    description:
      'Cornrows ramenées en chignon tressé sur la nuque. Élégant, dégagé, tient sans mèches ajoutées — 100 % vos cheveux.',
    poseTime: '2–3 h en salon',
    wearTime: '2–3 semaines',
    care: [
      'Sans rajouts, le style se refait plus souvent mais sollicite moins la racine.',
      'Hydrater les rangées au spray léger : cheveu 100 % naturel = soif plus rapide.',
      'Le chignon se couvre d’un bonnet la nuit sans le défaire.',
    ],
    productSlugs: [
      'preco-spray-refresh-quotidien-hydratation',
      'preco-bonnet-satin-nuit-taie-d-oreiller',
    ],
    aiQuestion: 'Combien de temps garder des nattes collées sans rajouts ?',
  },
  {
    id: 'insp-twists-updo',
    title: 'Twists — chignon haut',
    publics: ['femme'],
    styles: ['twists', 'protectif'],
    image: `${IMG}/insp-twists-updo.jpg`,
    description:
      'Vanilles (twists deux brins) rassemblées en chignon sculpté. Le style cérémonie par excellence : mariage, gala, grandes occasions.',
    poseTime: '3–5 h en salon',
    wearTime: '4–6 semaines (le chignon se remonte à volonté)',
    care: [
      'Les twists se déroulent plus vite que des tresses : mousse fixante douce sur les repousses.',
      'Varier la position du chignon pour ne pas fatiguer toujours la même zone.',
      'Huiler le cuir chevelu exposé au centre des sections.',
    ],
    productSlugs: [
      'preco-mousse-coiffante-twist-lock-tenue-souple',
      'preco-serum-huiles-nourricieres-multi-usages',
    ],
    aiQuestion: 'Comment faire tenir un chignon de twists pour un évènement ?',
  },
  {
    id: 'insp-passion-twists',
    title: 'Passion twists',
    publics: ['femme'],
    styles: ['twists', 'protectif'],
    image: `${IMG}/insp-passion-twists.jpg`,
    description:
      'Twists bouclés à l’aspect « eau » — plus doux et plus léger que des braids, effet volume immédiat. Se porte lâché ou en demi-queue.',
    poseTime: '3–5 h en salon (souvent au crochet)',
    wearTime: '4–6 semaines',
    care: [
      'Éviter de trop manipuler : le bouclé du passion twist se détend vite.',
      'Brume hydratante légère 2 fois/semaine, pas de crème lourde qui charge.',
      'Bonnet satin XL — le frottement défait le bouclé plus vite que sur des braids.',
    ],
    productSlugs: [
      'preco-flacon-vaporisateur-brume-continue',
      'preco-bonnet-satin-nuit-taie-d-oreiller',
      'preco-filet-de-protection-tresses-vanilles',
    ],
    aiQuestion: 'Passion twists : comment garder l’effet bouclé plus longtemps ?',
  },
  {
    id: 'insp-bantu-knots',
    title: 'Bantu knots',
    publics: ['femme'],
    styles: ['protectif', 'afro'],
    image: `${IMG}/insp-bantu-knots.jpg`,
    description:
      'Petits chignons torsadés répartis sur la tête — un style à part entière ET une technique heatless : défaits, ils donnent le bantu knot-out.',
    poseTime: '1–2 h chez soi',
    wearTime: '1–2 semaines en knots, puis knot-out',
    care: [
      'Poser sur cheveu à peine humide + crème : trop mouillé, ça ne sèche jamais au centre.',
      'Deux styles en un : porter les knots, puis dérouler pour des boucles sculptées.',
      'Couvrir d’un filet la nuit sans écraser les nœuds.',
    ],
    productSlugs: [
      'preco-creme-de-definition-twist-out-braid-out',
      'preco-filet-de-protection-tresses-vanilles',
      'preco-kit-boucles-sans-chaleur',
    ],
    aiQuestion: 'Comment réussir des bantu knots qui sèchent bien et un beau knot-out ?',
  },
  {
    id: 'insp-locs-femme',
    title: 'Locs longues',
    publics: ['femme'],
    styles: ['locs'],
    image: `${IMG}/insp-locs-femme.jpg`,
    description:
      'Des années de patience portées en couronne. Les locs matures se coiffent, s’attachent, se perlent — un engagement, pas une coiffure.',
    poseTime: 'Retwist : 1–2 h toutes les 4–8 semaines',
    wearTime: 'Permanent',
    care: [
      'Racines : retwist ou interlocking selon votre méthode — jamais trop serré.',
      'Shampoing clarifiant sans résidu : les dépôts s’incrustent dans la fibre loquée.',
      'Nuit : bonnet ou taie satin, et huile légère sur les longueurs sèches.',
    ],
    productSlugs: [
      'preco-shampoing-purifiant-clarifiant',
      'preco-outil-interlocking-aiguille-d-entretien-des-locs',
      'preco-kit-entretien-locs-vanilles-cheveux-courts',
    ],
    aiQuestion: 'Quelle routine complète pour entretenir mes locs sans résidus ?',
  },
  {
    id: 'insp-butterfly-locs',
    title: 'Butterfly locs',
    publics: ['femme'],
    styles: ['locs', 'protectif'],
    image: `${IMG}/insp-butterfly-locs.jpg`,
    description:
      'Des faux locs volontairement « déstructurés », à l’aspect papillon. Tout le look locs sans l’engagement : ils se posent et se retirent comme des braids.',
    poseTime: '4–6 h en salon',
    wearTime: '4–6 semaines',
    care: [
      'Ne pas trop lisser : l’effet vient justement des boucles qui s’échappent.',
      'Cuir chevelu à l’eau de romarin ou huile légère au flacon applicateur, 2 fois/semaine.',
      'Bonnet satin XL ou filet la nuit — le frottement use la texture papillon.',
    ],
    productSlugs: [
      'preco-eau-de-romarin-tonique-pousse-cuir-chevelu',
      'preco-flacon-applicateur-embout-precis',
      'preco-filet-de-protection-tresses-vanilles',
    ],
    aiQuestion: 'Butterfly locs ou vraies locs : quelles différences d’entretien et d’engagement ?',
  },
  {
    id: 'insp-goddess-braids',
    title: 'Goddess braids — chignon tressé',
    publics: ['femme'],
    styles: ['tresses', 'protectif'],
    image: `${IMG}/insp-goddess-braids.jpg`,
    description:
      'Grosses nattes collées sculptées en chignon haut. Moins de tresses, plus de relief : la pose est plus rapide que des box braids et l’effet est spectaculaire.',
    poseTime: '2–4 h en salon',
    wearTime: '2–4 semaines',
    care: [
      'Les grosses sections tirent moins par point d’ancrage, mais pèsent : chignon posé lâche.',
      'Mousse fixante souple sur les rangées pour maîtriser les repousses sans croûte.',
      'Foulard satin noué autour du chignon la nuit, sans l’écraser.',
    ],
    productSlugs: [
      'preco-mousse-coiffante-twist-lock-tenue-souple',
      'preco-foulard-headwrap-satin-premium',
      'preco-gel-de-tenue-forte-edge-twist',
    ],
    aiQuestion: 'Goddess braids : combien de temps les garder et comment tenir les repousses ?',
  },
  {
    id: 'insp-flat-twists',
    title: 'Flat twists',
    publics: ['femme'],
    styles: ['twists', 'protectif'],
    image: `${IMG}/insp-flat-twists.jpg`,
    description:
      'Des vanilles plaquées au cuir chevelu, comme des cornrows en deux brins. Plus rapides à faire soi-même que des nattes collées — et défaits, ils donnent un twist-out sculpté.',
    poseTime: '1–2 h chez soi',
    wearTime: '1–2 semaines, puis twist-out',
    care: [
      'Se font sur cheveu humide + crème coiffante : c’est LE style maison par excellence.',
      'Deux styles en un : porter plaqué, puis dérouler pour un twist-out à vagues larges.',
      'Bonnet satin obligatoire — les flat twists frisottent vite à nu.',
    ],
    productSlugs: [
      'preco-creme-de-definition-twist-out-braid-out',
      'preco-peigne-a-queue-de-rat-metal',
      'preco-bonnet-satin-nuit-taie-d-oreiller',
    ],
    aiQuestion: 'Comment réussir mes flat twists moi-même et obtenir un beau twist-out ?',
  },
  {
    id: 'insp-crochet-braids',
    title: 'Crochet braids bouclés',
    publics: ['femme'],
    styles: ['protectif', 'afro'],
    image: `${IMG}/insp-crochet-braids.jpg`,
    description:
      'Des mèches bouclées fixées au crochet sur une base de nattes collées. Le volume XXL en 2 heures, vos cheveux entièrement protégés dessous.',
    poseTime: '2–3 h en salon (le plus rapide des styles à rajouts)',
    wearTime: '4–6 semaines',
    care: [
      'Vos cheveux nattés dessous restent VIVANTS : les hydrater en spray à travers la base chaque semaine.',
      'Démêler les mèches bouclées aux doigts uniquement, jamais à la brosse.',
      'Bonnet satin XL la nuit, boucles rassemblées en pineapple lâche.',
    ],
    productSlugs: [
      'preco-spray-refresh-quotidien-hydratation',
      'preco-flacon-applicateur-embout-precis',
      'preco-bonnet-satin-nuit-taie-d-oreiller',
    ],
    aiQuestion: 'Crochet braids : comment entretenir mes cheveux nattés en dessous ?',
  },
  // ——— HOMMES ———
  {
    id: 'insp-h-waves',
    title: 'Waves 360 + dégradé',
    publics: ['homme'],
    styles: ['coupes'],
    image: `${IMG}/insp-h-waves.jpg`,
    description:
      'Les vagues sculptées à la brosse sur coupe courte, contour au rasoir. La discipline quotidienne du brossage fait tout.',
    poseTime: 'Coupe 30–45 min chez le barber',
    wearTime: 'Contour toutes les 1–2 semaines',
    care: [
      'Brosser matin et soir dans le sens du grain, 5–10 min — c’est le brossage qui fait la vague.',
      'Durag chaque nuit, sans exception : une nuit à nu défait une semaine de travail.',
      'Crème hydratante légère, pas de graisse épaisse qui étouffe.',
    ],
    productSlugs: [
      'preco-durag-satin',
      'preco-creme-de-jour-hydratante-coiffage',
    ],
    aiQuestion: 'Comment obtenir des waves 360 bien définies et en combien de temps ?',
  },
  {
    id: 'insp-h-fade-barbe',
    title: 'Coupe rasée + barbe dessinée',
    publics: ['homme'],
    styles: ['coupes'],
    image: `${IMG}/insp-h-fade-barbe.jpg`,
    description:
      'Bald fade net et barbe pleine sculptée : le duo le plus demandé en barbershop. L’entretien se déplace du crâne vers la barbe.',
    poseTime: '30–45 min chez le barber',
    wearTime: 'Retouche hebdomadaire pour rester net',
    care: [
      'Le crâne rasé se soigne : hydrater après chaque rasage pour éviter les poils incarnés.',
      'La barbe crépue se traite comme un cheveu 4C : huile + brossage quotidien.',
      'Contour maison possible en semaine avec un peigne de précision.',
    ],
    productSlugs: [
      'preco-serum-huiles-nourricieres-multi-usages',
      'preco-brosse-a-edges-peigne-de-precision',
    ],
    aiQuestion: 'Comment éviter les poils incarnés avec un crâne rasé et entretenir ma barbe crépue ?',
  },
  {
    id: 'insp-h-twists',
    title: 'Twists mi-longs',
    publics: ['homme'],
    styles: ['twists', 'protectif'],
    image: `${IMG}/insp-h-twists.jpg`,
    description:
      'Vanilles deux brins sur cheveux mi-longs, portées libres. Le style protecteur masculin qui laisse pousser sans y penser.',
    poseTime: '1–2 h (salon ou maison)',
    wearTime: '2–4 semaines',
    care: [
      'Refaire les contours toutes les semaines, le reste tient.',
      'Hydrater en spray puis sceller à l’huile légère — les pointes d’abord.',
      'Durag ou bonnet la nuit pour éviter les frisottis.',
    ],
    productSlugs: [
      'preco-spray-refresh-quotidien-hydratation',
      'preco-huile-de-ricin-noire-jamaicaine-pure',
      'preco-durag-satin',
    ],
    aiQuestion: 'Comment faire pousser mes cheveux avec des twists en tant qu’homme ?',
  },
  {
    id: 'insp-h-twists-undercut',
    title: 'Twists + undercut',
    publics: ['homme'],
    styles: ['twists', 'coupes'],
    image: `${IMG}/insp-h-twists-undercut.jpg`,
    description:
      'Le dessus en twists ou coils définis à l’éponge, les côtés rasés court. Volume contrôlé, entretien minimal.',
    poseTime: '45–90 min chez le barber',
    wearTime: 'Dégradé à rafraîchir toutes les 2–3 semaines',
    care: [
      'Éponge à twists sur cheveu humide + crème pour relancer les coils en 5 min.',
      'Les côtés courts se lavent normalement, le dessus s’hydrate comme un afro.',
      'Ne pas dormir sans bonnet : les coils s’aplatissent en une nuit.',
    ],
    productSlugs: [
      'preco-eponge-twist-curl-sponge',
      'preco-creme-de-definition-twist-out-braid-out',
      'preco-bonnet-satin-nuit-taie-d-oreiller',
    ],
    aiQuestion: 'Comment entretenir des twists courts faits à l’éponge ?',
  },
  {
    id: 'insp-h-cornrows-bun',
    title: 'Cornrows graphiques + man bun',
    publics: ['homme'],
    styles: ['tresses', 'protectif'],
    image: `${IMG}/insp-h-cornrows-bun.jpg`,
    description:
      'Nattes collées à motifs géométriques ramenées en chignon. Le tressage masculin assumé, précis, qui tient le sport.',
    poseTime: '2–3 h en salon',
    wearTime: '2–3 semaines',
    care: [
      'Après le sport : sécher le cuir chevelu au sèche-cheveux air frais, ne pas laisser macérer.',
      'Mousse légère sur les rangées pour recoller les frisottis sans résidu.',
      'Durag pour dormir et garder les lignes nettes.',
    ],
    productSlugs: [
      'preco-mousse-coiffante-legere-definition',
      'preco-durag-satin',
    ],
    aiQuestion: 'Je fais du sport avec des cornrows : comment gérer la transpiration ?',
  },
  {
    id: 'insp-h-locs-updo',
    title: 'Locs homme — attachées',
    publics: ['homme'],
    styles: ['locs'],
    image: `${IMG}/insp-h-locs-updo.jpg`,
    description:
      'Locs mûres relevées en pineapple ou demi-queue. Pratique au travail, protecteur pour les pointes, imposant assumé.',
    poseTime: 'Retwist : 1–2 h toutes les 4–8 semaines',
    wearTime: 'Permanent',
    care: [
      'Attacher sans tension : un élastique satin large, jamais de caoutchouc.',
      'Racines à l’aiguille (interlocking) ou au gel de retwist selon la méthode choisie.',
      'Cuir chevelu massé à l’huile légère 2 fois/semaine.',
    ],
    productSlugs: [
      'preco-outil-interlocking-aiguille-d-entretien-des-locs',
      'preco-chouchous-satin-spirales-sans-casse',
      'preco-eau-de-romarin-tonique-pousse-cuir-chevelu',
    ],
    aiQuestion: 'Retwist ou interlocking pour mes locs : comment choisir ?',
  },
  // ——— ENFANTS ———
  {
    id: 'insp-e-fille-nattes',
    title: 'Tresses & perles — petite fille',
    publics: ['enfant'],
    styles: ['tresses', 'protectif'],
    image: `${IMG}/insp-e-fille-perles.jpg`,
    description:
      'Nattes collées finies en perles légères : la coiffure d’école qui tient la semaine et fait briller les yeux. La règle d’or reste la douceur.',
    poseTime: '45–90 min (maison)',
    wearTime: '1–2 semaines maximum chez l’enfant',
    care: [
      'JAMAIS serré : le cuir chevelu d’un enfant marque à vie (alopécie de traction).',
      'Barrettes légères en bout de natte, pas de perles lourdes avant 6–7 ans.',
      'Démêler la veille au bain avec après-shampoing, jamais à sec le matin.',
    ],
    productSlugs: [
      'preco-apres-shampoing-demelant-hydratant',
      'preco-peigne-demeloir-a-dents-larges',
      'preco-brosse-demelante-flexible-dents-picots',
    ],
    aiQuestion: 'Comment tresser ma fille sans lui faire mal et sans abîmer ses tempes ?',
  },
  {
    id: 'insp-e-couettes-perles',
    title: 'Couettes bulles & perles',
    publics: ['enfant'],
    styles: ['protectif', 'afro'],
    image: `${IMG}/insp-e-couettes-perles.jpg`,
    description:
      'Sections en couettes « bulles » (élastiques espacés) avec perles colorées. Zéro tresse serrée, tout en douceur — le style week-end préféré des filles.',
    poseTime: '20–40 min (maison)',
    wearTime: '3–7 jours',
    care: [
      'Élastiques recouverts de tissu uniquement, retirés sans tirer (les couper au besoin).',
      'Hydrater chaque section en spray avant de reformer les bulles.',
      'Bonnet satin enfant la nuit — l’habitude se prend tôt.',
    ],
    productSlugs: [
      'preco-spray-refresh-quotidien-hydratation',
      'preco-chouchous-satin-spirales-sans-casse',
      'preco-bonnet-satin-nuit-taie-d-oreiller',
    ],
    aiQuestion: 'Quelles coiffures sans tension pour une petite fille aux cheveux crépus ?',
  },
  {
    id: 'insp-e-ado-afro',
    title: 'Afro libre — ado',
    publics: ['enfant'],
    styles: ['afro'],
    image: `${IMG}/insp-e-ado-afro.jpg`,
    description:
      'L’afro porté naturel à l’adolescence : l’âge où l’on apprend SA routine. Boucles définies ou volume libre, c’est son choix — notre rôle est de donner les bons gestes.',
    poseTime: '15–30 min le matin',
    wearTime: 'Quotidien',
    care: [
      'Routine simple à 3 produits max : l’ado ne suivra pas un rituel de 8 étapes.',
      'Démêlage sous la douche avec après-shampoing, aux doigts puis peigne large.',
      'Taie d’oreiller satin si le bonnet ne tient pas la nuit.',
    ],
    productSlugs: [
      'preco-leave-in-creme-hydratante-legere',
      'preco-peigne-demeloir-a-dents-larges',
      'preco-bonnet-satin-nuit-taie-d-oreiller',
    ],
    aiQuestion: 'Quelle routine capillaire simple pour un ado qui découvre son afro ?',
  },
  {
    id: 'insp-e-garcon-afro',
    title: 'Afro boucles — petit garçon',
    publics: ['enfant'],
    styles: ['afro', 'coupes'],
    image: `${IMG}/insp-e-garcon-afro.jpg`,
    description:
      'Les boucles laissées libres, juste égalisées. Le style le plus sain pour un jeune enfant : pas de traction, pas de produit fixant.',
    poseTime: 'Coupe d’égalisation : 20 min',
    wearTime: 'Quotidien',
    care: [
      'Un leave-in doux et de l’eau : le cuir chevelu d’un enfant ne supporte pas les produits d’adulte.',
      'Démêler aux doigts d’abord, au peigne large ensuite, uniquement sur cheveu humide.',
      'Attention aux frottements de bonnet d’hiver : doubler de satin si besoin.',
    ],
    productSlugs: [
      'preco-apres-shampoing-demelant-hydratant',
      'preco-peigne-demeloir-a-dents-larges',
    ],
    aiQuestion: 'Quels produits sont adaptés aux cheveux bouclés d’un enfant de 4 ans ?',
  },
  {
    id: 'insp-e-garcon-fade',
    title: 'Dégradé boucles — garçon',
    publics: ['enfant'],
    styles: ['coupes'],
    image: `${IMG}/insp-e-garcon-fade.jpg`,
    description:
      'Taper fade doux avec les boucles gardées sur le dessus. La première « vraie coupe » de barber, à partir de 3–4 ans quand l’enfant tient assis.',
    poseTime: '20–30 min chez le barber',
    wearTime: 'Retouche toutes les 3–4 semaines',
    care: [
      'Choisir un barber habitué aux enfants : tondeuse douce, pas de rasoir sur peau jeune.',
      'Les boucles du dessus s’hydratent en spray, sans gel fixant à cet âge.',
      'Vérifier le cuir chevelu à chaque coupe : c’est le bon moment pour repérer teigne ou eczéma.',
    ],
    productSlugs: [
      'preco-spray-refresh-quotidien-hydratation',
    ],
    aiQuestion: 'À partir de quel âge emmener mon fils chez le barber et quels soins après la coupe ?',
  },
];

export const INSPIRATION_BY_ID = new Map(INSPIRATIONS.map(item => [item.id, item]));
