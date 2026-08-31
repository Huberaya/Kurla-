/**
 * Réponses cosmétiques déterministes et fiables par thème.
 *
 * Rôle : quand l'IA générative (Gemini) n'est pas disponible — pas de clé,
 * modèle injoignable, timeout — l'assistante doit quand même RÉPONDRE à la
 * question avec un contenu cosmétique exact, et non une phrase générique.
 * Ces contenus sont du conseil beauté non médical, alignés sur la base de
 * connaissances KURLA, et orientent vers le diagnostic/le catalogue.
 *
 * Chaque entrée : mots-clés de déclenchement (racines), une réponse courte,
 * une explication, des étapes concrètes et des besoins produits associés.
 */

export type TopicAnswer = {
  id: string;
  keywords: string[];
  shortAnswer: string;
  explanation: string;
  steps: string[];
  productNeeds?: string[];   // besoins produits (alignés sur le moteur de reco)
  tool?: { name: string; description: string };
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Mots discriminants forts : quand ils apparaissent, ils lèvent l'ambiguïté
 * entre deux thèmes (ex. « ma fille » → enfant, même si « crépus » est présent).
 * Poids élevé pour gagner face à un thème cosmétique générique.
 */
const STRONG_DISCRIMINATORS: Record<string, number> = {
  enfant: 6, enfants: 6, fille: 6, fils: 6, bebe: 6, 'bébé': 6, 'ma fille': 8, 'mon enfant': 8,
  grossesse: 6, enceinte: 6, allaite: 6, allaitement: 6,
  transition: 5, defrisee: 5, 'défrisée': 5, repousse: 4,
  bouton: 4, acne: 4, acné: 4, imperfection: 4,
  tache: 4, hyperpigment: 4, pigmentation: 4,
  spf: 5, solaire: 4, soleil: 3,
  porosit: 5, verre: 4,
};

export const TOPIC_ANSWERS: TopicAnswer[] = [
  {
    id: 'hydratation-crepus-sec',
    keywords: ['hydrat', 'sec', 'sech', 'dessèch', 'dessech', 'crepu', 'crepus', '4c', '4b', 'soif', 'reche', 'rêche', 'paille'],
    shortAnswer: 'Pour des cheveux crépus très secs, la clé est le duo hydratation (à base d’eau) puis scellement (beurre/huile), en trois étapes régulières.',
    explanation: 'Les cheveux très crépus (4B/4C) ont une forte porosité naturelle et les huiles naturelles du cuir chevelu remontent mal le long des spirales : l’hydratation s’évapore vite. On hydrate d’abord avec un produit à base d’eau (leave-in), puis on « scelle » avec un beurre ou une huile pour retenir l’eau.',
    steps: [
      'Lavez avec un shampoing doux sans sulfate ou un co-wash (1 fois/semaine environ).',
      'Appliquez un masque nutritif (karité) sous chaleur douce 1 fois par semaine.',
      'Sur cheveux humides, déposez un leave-in riche à base d’eau.',
      'Scellez avec du beurre de karité ou une huile (ricin, mélange nourricier).',
      'Ré-hydratez au quotidien avec un vaporisateur d’eau + un peu de leave-in (refresh).'
    ],
    productNeeds: ['hydrater_cheveux', 'nutrition', 'demeler_cheveux'],
    tool: { name: 'Diagnostic cheveux', description: 'Identifie ta porosité et ta routine exacte en 5 questions.' }
  },
  {
    id: 'definition-boucles',
    keywords: ['defin', 'boucle', 'boucl', '3a', '3b', '3c', 'ondul', 'fris', 'frisottis', 'frisotis', 'wash and go', 'wash&go', 'gel', 'trac', 'definition'],
    shortAnswer: 'Pour définir tes boucles sans effet carton, applique un leave-in puis un gel de définition sur cheveux bien mouillés, et laisse sécher sans toucher.',
    explanation: 'La définition vient de l’hydratation + d’un produit de tenue appliqués sur cheveux saturés d’eau. Un gel à base de lin ou de plantes définit sans dessécher ; on évite de toucher les boucles pendant le séchage pour ne pas créer de frisottis.',
    steps: [
      'Sur cheveux lavés et encore MOUILLÉS, applique un leave-in hydratant par sections.',
      'Ajoute un gel de lin ou une crème de définition (méthode « praying hands » ou « shingling »).',
      'Scrunch doucement pour faire remonter la boucle.',
      'Laisse sécher à l’air ou au diffuseur, sans manipuler.',
      'Une fois sec, « casse » le cast du gel avec un peu d’huile pour un fini souple.'
    ],
    productNeeds: ['definir_boucles', 'hydrater_cheveux'],
    tool: { name: 'Diagnostic cheveux', description: 'Trouve le produit de définition adapté à ton type de boucle.' }
  },
  {
    id: 'casse-demelage',
    keywords: ['casse', 'cass', 'demel', 'démêl', 'noeud', 'nœud', 'fourche', 'fourchu', 'pointes', 'cassant', 'elastic', 'elastique'],
    shortAnswer: 'Pour réduire la casse, démêle toujours sur cheveux humides avec un après-shampoing ou un leave-in glissant, en commençant par les pointes.',
    explanation: 'La casse arrive surtout au démêlage à sec et en forçant depuis la racine. Un produit qui apporte de la « glisse », un peigne à dents larges et le bon sens de brossage réduisent fortement la casque. Les fourches sont malheureusement à couper, pas à « réparer ».',
    steps: [
      'Démêle sous la douche avec l’après-shampoing, ou après-shampoing + leave-in.',
      'Commence par les POINTES, puis remonte progressivement vers la racine.',
      'Utilise un peigne à dents larges ou tes doigts, jamais une brosse dure à sec.',
      'Hydrate et scelle les pointes régulièrement ; coupe les fourches.',
      'Un soin protéiné occasionnel peut renforcer une fibre abîmée (sans en abuser).'
    ],
    productNeeds: ['reduire_casse', 'demeler_cheveux', 'hydrater_cheveux'],
    tool: { name: 'Diagnostic cheveux', description: 'Évalue l’état de ta fibre et ta routine anti-casse.' }
  },
  {
    id: 'pousse',
    keywords: ['pousse', 'pouss', 'croiss', 'longueur', 'grandir', 'ricin', 'stimuler', 'clou de girofle', 'densit'],
    shortAnswer: 'La pousse dépend surtout d’un cuir chevelu sain et de la rétention de longueur : on hydrate, on évite la casse et on masse, plutôt que de chercher un produit miracle.',
    explanation: 'Le cheveu pousse en moyenne 1 cm par mois ; ce qui fait la longueur, c’est de NE PAS casser. L’huile de ricin et les massages du cuir chevelu favorisent la circulation et l’hydratation, mais aucun produit ne garantit une pousse accélérée.',
    steps: [
      'Masse le cuir chevelu quelques minutes, 2-3 fois par semaine (avec ou sans huile).',
      'Soigne le cuir chevelu : hydrate, évite les produits trop occlusifs, clarifie de temps en temps.',
      'Protège les longueurs : hydratation + scellement pour retenir la longueur.',
      'Dors avec un bonnet satin et manipule doucement.',
      'Adopte une alimentation variée et une bonne hydratation interne.'
    ],
    productNeeds: ['reduire_casse', 'cuir_chevelu', 'hydrater_cheveux'],
    tool: { name: 'Diagnostic cheveux', description: 'Identifie si ton frein de longueur est la casse, le cuir chevelu ou l’hydratation.' }
  },
  {
    id: 'porosite',
    keywords: ['porosit', 'verre d eau', 'test du verre', 'absorb', 'ecaille', 'cuticule'],
    shortAnswer: 'La porosité décrit comment ton cheveu absorbe et retient l’eau. On la détermine avec le test du verre d’eau : le cheveu coule (forte), flotte (faible) ou reste au milieu (moyenne).',
    explanation: 'Porosité forte = écailles ouvertes, boit l’eau mais la perd vite (besoin de beurres/huiles riches). Porosité faible = écailles serrées, l’eau pénètre mal (besoin de soins légers et de chaleur douce). Porosité moyenne = équilibrée.',
    steps: [
      'Prends un cheveu propre et sec, dépose-le dans un verre d’eau claire.',
      'Il coule au fond → porosité FORTE : mise sur les beurres et huiles pour sceller.',
      'Il flotte en surface → porosité FAIBLE : soins légers, chaleur douce pour faire pénétrer.',
      'Il reste au milieu → porosité MOYENNE : routine équilibrée.',
      'Tu peux aussi répondre « Je ne sais pas » au diagnostic, KURLA s’adapte.'
    ],
    productNeeds: ['hydrater_cheveux'],
    tool: { name: 'Diagnostic cheveux', description: 'Le diagnostic te guide avec le visuel du test du verre d’eau.' }
  },
  {
    id: 'cuir-chevelu',
    keywords: ['cuir chevelu', 'demange', 'démang', 'gratt', 'pellicul', 'tiraill', 'irrit', 'sensible', 'demangeaison', 'démangeaison'],
    shortAnswer: 'Des démangeaisons sous tresses ou un cuir chevelu sec viennent souvent d’un manque d’hydratation et de traction : on hydrate le cuir chevelu et on desserre les coiffures trop serrées.',
    explanation: 'Sous coiffures protectrices, le cuir chevelu peut s’assécher et tirailler. Des sprays hydratants légers, un nettoyage régulier (ou une lotion nettoyante) et des coiffures non tirantes soulagent. Une rougeur, des croûtes, du pus ou une douleur persistante relèvent d’un avis professionnel.',
    steps: [
      'Hydrate le cuir chevelu avec un sérum ou une brume légère, sans trop alourdir.',
      'Ne serre pas excessivement les tresses ; desserre si ça tire durablement.',
      'Nettoie le cuir chevelu régulièrement (shampoing ciblé ou mousse nettoyante).',
      'Évite les gels alcoolisés qui dessèchent.',
      'En cas de rougeur, croûtes, pus ou douleur qui persiste, consulte un dermatologue.'
    ],
    productNeeds: ['cuir_chevelu', 'entretenir_tresses'],
    tool: { name: 'Diagnostic cheveux', description: 'Cible le besoin cuir chevelu dans ta routine.' }
  },
  {
    id: 'coiffures-protectrices',
    keywords: ['tresse', 'tress', 'braid', 'braids', 'vanille', 'vanill', 'twist', 'twists', 'tissage', 'wig', 'perruque', 'lock', 'locks', 'vanilles'],
    shortAnswer: 'Les coiffures protectrices protègent tes longueurs à condition d’entretenir tes cheveux en dessous : hydratation, cuir chevelu soigné et pas de traction.',
    explanation: 'Tresses, vanilles, twists et locks protègent des manipulations quotidiennes, mais négliger les cheveux en dessous casse le bénéfice. On hydrate, on soigne le cuir chevelu et on garde les coiffures un temps raisonnable (6-8 semaines max).',
    steps: [
      'Avant la coiffure : lave, fais un masque et hydrate bien tes cheveux.',
      'Pendant : vaporise un mélange eau + leave-in sur longueurs et cuir chevelu 2-3 fois/semaine.',
      'Masse et hydrate le cuir chevelu avec un sérum léger.',
      'Ne garde pas la coiffure au-delà de 6-8 semaines ; ne tire pas trop fort.',
      'À la dépose : démêle et lave en douceur, fais une pause hydratante.'
    ],
    productNeeds: ['entretenir_tresses', 'entretenir_locks', 'cuir_chevelu'],
    tool: { name: 'Diagnostic coiffure protectrice', description: 'Une routine dédiée existe pour les braids, twists et locks.' }
  },
  {
    id: 'ingredient-transparence',
    keywords: ['ingredient', 'ingrédient', 'composit', 'sulfate', 'paraben', 'parabène', 'silicone', 'naturel', 'sain', 'toxiqu', 'interdit', 'reglement'],
    shortAnswer: 'Chez KURLA, chaque ingrédient est expliqué : sa fonction et son statut réglementaire européen, pour que tu choisisses en connaissance de cause plutôt que sur la peur.',
    explanation: 'Le marketing « sans sulfate / sans paraben » ne suffit pas à dire si un produit te convient. KURLA s’appuie sur un graphe d’ingrédients traçable : fonction cosmétique et restrictions réglementaires (règlement CE 1223/2009), sans inventer de danger ni de bénéfice.',
    steps: [
      'Ouvre la fiche d’un ingrédient depuis la recherche « Ingrédients ».',
      'Lis sa fonction (nettoyant, émollient, etc.) et son statut réglementaire.',
      'Vérifie les restrictions d’usage le cas échéant.',
      'Croise avec ton type de cheveu et ta porosité dans le diagnostic.',
      'En cas de doute sur une réaction, demande un avis professionnel.'
    ],
    tool: { name: 'Recherche d’ingrédients', description: 'Explore la base transparente des ingrédients cosmétiques.' }
  },
  {
    id: 'routine-debutant',
    keywords: ['debute', 'début', 'commenc', 'par ou', 'routine', 'ne sais pas', 'perdu', 'premiere', 'première', 'wash day', 'washday', 'base'],
    shortAnswer: 'Pour débuter, tiens une routine simple en 4 gestes : laver, hydrater, sceller, coiffer/protéger. La régularité vaut mieux que la pile de produits.',
    explanation: 'On commence par une routine minimale et constante plutôt que dix produits d’un coup. Une fois les bases tenues sur plusieurs semaines, on ajuste selon les résultats. Le diagnostic KURLA te donne la version adaptée à TON cheveu.',
    steps: [
      'Lave (shampoing doux ou co-wash) une fois par semaine environ.',
      'Hydrate avec un après-shampoing ou un masque.',
      'Applique un leave-in sur cheveux humides, puis scelle avec beurre/huile.',
      'Coiffe (gel/crème de définition) et protège la nuit avec un satin.',
      'Observe 3-4 semaines, puis n’ajuste qu’un produit à la fois.'
    ],
    productNeeds: ['hydrater_cheveux', 'demeler_cheveux'],
    tool: { name: 'Diagnostic cheveux', description: 'Obtiens ta routine personnalisée en 5 questions guidées.' }
  },
  {
    id: 'cowash-lavage',
    keywords: ['co-wash', 'cowash', 'apres shampoing', 'après-shampoing', 'laver', 'lavage', 'shampoing', 'shampooing', 'build up', 'build-up', 'accumulation', 'clarifiant', 'cuir gras', 'gras'],
    shortAnswer: 'Le co-wash (laver avec un après-shampoing) convient aux cheveux très secs, mais il faut clarifier de temps en temps pour éviter l’accumulation (build-up) sur le cuir chevelu.',
    explanation: 'Le co-wash nettoie en douceur sans sulfate et préserve l’hydratation, mais il ne retire pas complètement les résidus. Un shampoing clarifiant ou à base de tensioactifs doux, utilisé toutes les 2-4 semaines, évite que le cuir chevelu ne s’encrasse (démangeaisons, ternité).',
    steps: [
      'Alterne co-wash (hydratation) et shampoing doux/clarifiant (nettoyage profond).',
      'Masse bien le cuir chevelu pendant le lavage, pas seulement les longueurs.',
      'Clarifie environ toutes les 2-4 semaines, ou dès que les produits « accrochent » moins.',
      'Après un clarifiant, réhydrate davantage (masque + leave-in).',
      'Adapte la fréquence à ton cuir chevelu (gras = lavages plus fréquents).'
    ],
    productNeeds: ['hydrater_cheveux', 'cuir_chevelu'],
    tool: { name: 'Diagnostic cheveux', description: 'Indique si ton cuir chevelu est plutôt sec ou gras.' }
  },
  {
    id: 'transition-defrisage',
    keywords: ['transition', 'defris', 'défris', 'defrise', 'défrise', 'repousse', 'naturel', 'deux textures', 'chimique', 'lissage', 'basané'],
    shortAnswer: 'En transition défrisée, tu gères deux textures : hydrate et démêle avec douceur, protège les longueurs sensibilisées et évite la casse à la jonction.',
    explanation: 'La repousse naturelle et les pointes défrisées n’ont ni la même porosité ni la même résistance. La casse se concentre souvent à la ligne de démarcation. On hydrate intensément, on manipule doucement et on privilégie les coiffures protectrices pendant la transition.',
    steps: [
      'Traite les deux zones séparément : plus de nutrition sur les pointes défrisées.',
      'Démêle toujours sur cheveux humides avec un produit glissant.',
      'Hydrate et scelle régulièrement ; fais des soins protéinés modérés.',
      'Privilégie les coiffures protectrices et le satin la nuit.',
      'Coupe progressivement les pointes au fur et à mesure, sans précipitation.'
    ],
    productNeeds: ['reduire_casse', 'hydrater_cheveux', 'demeler_cheveux'],
    tool: { name: 'Diagnostic cheveux', description: 'Sélectionne « En transition / défrisée » pour une routine adaptée.' }
  },
  {
    id: 'coloration',
    keywords: ['couleur', 'coloration', 'color', 'teinture', 'decolor', 'décolor', 'meche', 'mèche', 'henne', 'coloré', 'colore'],
    shortAnswer: 'La coloration (surtout la décoloration) rend le cheveu plus poreux et fragile : on renforce l’hydratation et les soins protéinés, et on évite de superposer les agressions.',
    explanation: 'Les colorations ouvrent les écailles et peuvent dessécher, augmenter la porosité et la casse. Une routine plus nourrissante, un espacement des couleurs et une protection thermique limitent les dégâts. Un test d’allergie 48 h avant teinture reste indispensable (consigne du fabricant).',
    steps: [
      'Espace les colorations et ne décolore pas sur cheveux déjà très abîmés.',
      'Renforce avec des masques nutritifs et un soin protéiné occasionnel.',
      'Hydrate et scelle davantage (porosité augmentée).',
      'Limite la chaleur et utilise une protection thermique.',
      'En cas de brûlure, démangeaison forte du cuir chevelu ou gonflement, consulte.'
    ],
    productNeeds: ['reduire_casse', 'hydrater_cheveux'],
    tool: { name: 'Diagnostic cheveux', description: 'Un profil à jour affine les conseils après une coloration.' }
  },
  {
    id: 'enfants',
    keywords: ['enfant', 'enfants', 'fille', 'fils', 'petit', 'petite', 'bébé', 'bebe', 'bebes', 'bébés', 'ma fille', 'mon fils', 'mon enfant', 'démelage enfant', 'demelage enfant', 'crépus enfant', 'cheveux enfant', 'cheveux de ma', 'pleure', 'douleur enfant'],
    shortAnswer: 'Pour les enfants, la priorité est la douceur : démêlage sans tiraillement, produits légers et sans agressivité, et routine courte pour ne pas les dégouter.',
    explanation: 'Les cheveux texturés des enfants se cassent surtout au brossage à sec. Un après-shampoing ou leave-in très glissant, un peigne à dents larges, des gestes doux (des pointes vers la racine) et des coiffures protectrices pas trop serrées évitent douleur et casse.',
    steps: [
      'Démêle sur cheveux humides avec un leave-in ou après-shampoing glissant.',
      'Commence par les pointes et remonte doucement avec un peigne large.',
      'Utilise des textures légères (crèmes, leave-in) ; évite les gels durs.',
      'Ne serre pas excessivement les coiffures (traction = casse au contour).',
      'Protège la nuit avec un bonnet satin ou une taie satinée.'
    ],
    productNeeds: ['demeler_cheveux', 'hydrater_cheveux'],
    tool: { name: 'Diagnostic enfant', description: 'Un diagnostic dédié existe pour les cheveux des enfants.' }
  },
  {
    id: 'cheveux-fins-volume',
    keywords: ['fin', 'fins', 'clairsem', 'volume', 'plat', 'aplati', 'lourd', 'alourdi', 'densit'],
    shortAnswer: 'Les cheveux fins ont besoin de légèreté : des produits fluides en petite quantité, du volume à la racine, et éviter les beurres trop lourds qui aplatissent.',
    explanation: 'Un cheveu fin est facilement alourdi par les textures épaisses. On privilégie les leave-in légers et les mousses, on applique les beurres/huiles surtout sur les pointes, et on apporte du volume au séchage. La casse se gère par la douceur, pas par l’épaisseur des produits.',
    steps: [
      'Choisis des textures légères (lait, mousse, leave-in fluide).',
      'Applique beurres et huiles seulement sur les pointes, en petite quantité.',
      'Diffuse la tête en bas pour du volume sans tirer.',
      'Démêle doucement : les cheveux fins cassent plus vite.',
      'Un soin protéiné léger peut renforcer sans alourdir.'
    ],
    productNeeds: ['definir_boucles', 'reduire_casse'],
    tool: { name: 'Diagnostic cheveux', description: 'Renseigne ta densité pour des recommandations adaptées.' }
  },
  // ── PEAU ──
  {
    id: 'peau-seche-hydratation',
    keywords: ['peau sèche', 'peau seche', 'déshydrat', 'deshydrat', 'tiraille', 'sécheresse peau', 'secheresse peau', 'hydrater peau', 'peau qui pele', 'pèle'],
    shortAnswer: 'Pour une peau sèche ou déshydratée : nettoyage doux non desséchant, puis hydratant (acide hyaluronique/glycérine) et émollient pour sceller, matin et soir.',
    explanation: 'La sécheresse vient d’un manque de lipides, la déshydratation d’un manque d’eau — souvent les deux. Un nettoyage trop agressif aggrave le problème. On mise sur un nettoyant doux, un sérum hydratant et une crème riche qui scelle l’eau, sans jamais négliger le SPF le jour.',
    steps: [
      'Nettoie avec un produit doux, sans savon agressif ni eau trop chaude.',
      'Applique un sérum hydratant (glycérine, acide hyaluronique) sur peau humide.',
      'Scelle avec une crème riche (céramides, beurres, huiles).',
      'Mets un SPF hydratant le jour, même en ville.',
      'Si tiraillements, rougeurs ou plaques persistent, consulte un dermatologue.'
    ],
    productNeeds: ['hydrater_peau'],
    tool: { name: 'Diagnostic peau', description: 'Identifie ton type de peau et tes priorités.' }
  },
  {
    id: 'peau-acne',
    keywords: ['acné', 'acne', 'bouton', 'imperfection', 'point noir', 'point noir', 'gras peau', 'peau grasse', 'brillance', 'pimple'],
    shortAnswer: 'Pour les imperfections : nettoyage doux matin et soir, un actif progressif (type niacinamide ou peroxyde de benzoyle, ou acide salicylique), hydratation légère et SPF. Ne pas décaper.',
    explanation: 'Trop nettoyer ou trop agresser stimule la production de sébum et empire les boutons. On introduit UN actif à la fois, à faible fréquence, et on hydrate toujours. Les cas douloureux, kystiques ou persistants relèvent d’un dermatologue.',
    steps: [
      'Nettoie deux fois par jour avec un nettoyant doux, sans frotter.',
      'Introduis un actif (niacinamide, acide salicylique ou peroxyde de benzoyle) 2-3 fois/semaine.',
      'Hydrate avec une crème légère non comédogène.',
      'Applique un SPF chaque matin (les actifs photosensibilisent).',
      'Ne perce pas les boutons ; consulte un dermato si c’est douloureux ou étendu.'
    ],
    productNeeds: ['imperfections_acne'],
    tool: { name: 'Diagnostic peau', description: 'Cible tes imperfections et ta sensibilité.' }
  },
  {
    id: 'peau-taches-pigmentation',
    keywords: ['tache', 'hyperpigment', 'marque', 'cicatrice bouton', 'teint', 'uniformiser', 'éclat', 'eclat', 'mélanine', 'melanine', 'dark spot'],
    shortAnswer: 'Les taches post-inflammatoires (marques de boutons, zones plus foncées) s’estompent surtout avec une protection solaire quotidienne et un actif éclaircissant progressif.',
    explanation: 'Sur les peaux mélanisées, l’inflammation laisse souvent des marques. Le facteur n°1 est le soleil : sans SPF quotidien, les taches se renforcent. Des actifs comme la vitamine C, le niacinamide ou certaines molécules dépigmentantes aident, mais le résultat est progressif et toute irritation aggrave les marques.',
    steps: [
      'Applique un SPF large spectre CHAQUE jour, même nuageux, et renouvelle.',
      'Ajoute un actif éclaircissant (vitamine C le matin, niacinamide) progressivement.',
      'Ne multiplie pas les actifs agressifs : l’irritation crée de nouvelles taches.',
      'Soigne d’abord l’acné/inflammation à l’origine des marques.',
      'Un dermatologue peut proposer un traitement adapté aux peaux mates à foncées.'
    ],
    productNeeds: ['taches_hyperpigmentation', 'protection_solaire'],
    tool: { name: 'Diagnostic peau', description: 'Évalue ta tendance aux marques post-inflammatoires.' }
  },
  {
    id: 'peau-spf',
    keywords: ['spf', 'solaire', 'soleil', 'protection', 'uv', 'coup de soleil', 'crème solaire', 'sun'],
    shortAnswer: 'Le SPF se porte chaque jour, en quantité suffisante, et se renouvelle : c’est le soin anti-âge et anti-taches le plus efficace, y compris pour les peaux noires.',
    explanation: 'Une peau foncée ne « brûle » pas toujours visiblement, mais les UV accélèrent le vieillissement et surtout l’hyperpigmentation. Un SPF 30-50 large spectre, appliqué généreusement et renouvelé (notamment après transpiration), est indispensable, en particulier si tu utilises des actifs (vitamine C, rétinoïdes, AHA).',
    steps: [
      'Choisis un SPF 30 à 50, large spectre (UVA/UVB).',
      'Applique-le généreusement chaque matin, sur l’ensemble du visage et du cou.',
      'Renouvelle toutes les 2 h en extérieur, après transpiration ou essuyage.',
      'Ne compte pas seulement sur le SPF intégré à ton soin de jour.',
      'Renforce la protection si tu utilises des actifs photosensibilisants.'
    ],
    productNeeds: ['protection_solaire'],
    tool: { name: 'Diagnostic peau', description: 'Vérifie ton usage réel du SPF.' }
  },
  {
    id: 'peau-sensible',
    keywords: ['peau sensible', 'sensibilité', 'réaction', 'rougeur', 'irritation peau', 'allergie cosmétique', 'picote', 'brûle peau', 'eczéma'],
    shortAnswer: 'Pour une peau sensible, on simplifie : peu de produits, formules minimalistes, introduction d’un nouveau produit à la fois, et on arrête tout ce qui irrite durablement.',
    explanation: 'Multiplier les actifs et les senteurs augmente les réactions. Une routine courte et minimaliste (nettoyant doux, hydratant, SPF) répare la barrière cutanée. Une rougeur, un gonflement, des vésicules ou une gêne qui persiste nécessitent un avis médical, pas un nouveau cosmétique.',
    steps: [
      'Réduis la routine à l’essentiel : nettoyant doux + hydratant + SPF.',
      'Évite alcool, parfums et superposition d’actifs pendant la phase d’irritation.',
      'Introduis un nouveau produit seul, sur une zone, pendant quelques jours.',
      'Arrête immédiatement un produit qui provoque une réaction franche.',
      'Consulte un dermatologue en cas de gonflement, suintement, eczéma ou persistance.'
    ],
    productNeeds: ['peau_sensible', 'hydrater_peau'],
    tool: { name: 'Diagnostic peau', description: 'Repère ta sensibilité et ta tolérance aux actifs.' }
  },
];

/** Décrit si une question relève bien du périmètre beauté KURLA. */
export function isBeautyScoped(query: string): boolean {
  const q = norm(query);
  const beautyHints = [
    'cheveu', 'crépu', 'crepu', 'boucle', 'boucl', 'frisé', 'frise', 'ondul', 'coiff', 'shampoing', 'shampooing',
    'apres', 'après', 'masque', 'leave-in', 'leave in', 'gel', 'huile', 'beurre', 'karite', 'ricin', 'tresse',
    'braid', 'twist', 'vanille', 'lock', 'tissage', 'wig', 'perruque', 'co-wash', 'cowash', 'démêl', 'demel',
    'porosit', 'cuir chevelu', 'scalp', 'démang', 'demang', 'pellicul', 'pousse', 'casse', 'fourche', 'hydrat',
    'routine', 'co-wash', 'lissage', 'defris', 'défris', 'transition', 'naturel', 'satin', 'peigne', 'brosse',
    'peau', 'bouton', 'acné', 'acne', 'imperfection', 'tache', 'pigment', 'spf', 'solaire', 'soleil', 'crème',
    'serum', 'sérum', 'hydratant', 'déshydrat', 'deshydrat', 'tiraille', 'rougeur', 'sensible', 'éclat', 'eclat',
    'cosmétique', 'cosmetique', 'ingrédient', 'ingredient', 'soin', 'visage', 'beauté', 'beaute', 'maquillage'
  ];
  return beautyHints.some(hint => {
    const h = norm(hint);
    if (h.includes(' ')) return q.includes(h);
    const tokens = q.split(/[^a-z0-9]+/).filter(Boolean);
    return h.length <= 4 ? tokens.includes(h) : tokens.some(t => t === h || t.startsWith(h));
  });
}

/**
 * Trouve la meilleure réponse thématique pour une question. Renvoie `null` si
 * aucun thème ne correspond (l’appelant garde alors sa logique de repli générique).
 */
export function matchTopicAnswer(query: string): TopicAnswer | null {
  const q = norm(query);
  if (!q) return null;
  const tokens = q.split(/[^a-z0-9]+/).filter(Boolean);
  let best: { answer: TopicAnswer; score: number } | null = null;
  for (const topic of TOPIC_ANSWERS) {
    const shortKw: string[] = [];
    const longKw: string[] = [];
    const phraseKw: string[] = [];
    for (const kw of topic.keywords) {
      const k = norm(kw);
      if (!k) continue;
      if (k.includes(' ')) phraseKw.push(k);
      else if (k.length <= 4) shortKw.push(k);
      else longKw.push(k);
    }
    // Expressions de plusieurs mots (fort poids) : ex. « ma fille », « cuir chevelu ».
    let score = 0;
    const matchedPhraseTokens = new Set<string>();
    for (const phrase of phraseKw) {
      if (q.includes(phrase)) {
        score += 6;
        phrase.split(' ').forEach(t => { if (tokens.includes(t)) matchedPhraseTokens.add(t); });
      }
    }
    // Chaque jeton de la question ne compte qu’UNE fois par thème : on prend la
    // meilleure correspondance (mot court exact > préfixe long), pour éviter que
    // deux variantes d’un même mot (« crepu » + « crepus ») doublent le score.
    for (const tok of tokens) {
      if (matchedPhraseTokens.has(tok)) continue;
      if (shortKw.includes(tok)) { score += 5; continue; }
      if (longKw.some(k => tok === k || tok.startsWith(k))) { score += 3; }
    }
    // Bonus discriminants forts propres à ce thème (le terme doit être dans les
    // mots-clés du thème pour compter : pas de bonus saupoudré sur tous les thèmes).
    for (const [term, weight] of Object.entries(STRONG_DISCRIMINATORS)) {
      const t = norm(term);
      const relevant = [...shortKw, ...longKw].includes(t) || phraseKw.includes(t);
      if (!relevant) continue;
      if (t.includes(' ')) { if (q.includes(t)) score += weight; }
      else if (tokens.some(tok => tok === t || tok.startsWith(t))) score += weight;
    }
    if (score > 0 && (!best || score > best.score)) best = { answer: topic, score };
  }
  return best ? best.answer : null;
}
