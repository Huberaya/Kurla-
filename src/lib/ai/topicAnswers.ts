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
];

/**
 * Trouve la meilleure réponse thématique pour une question. Renvoie `null` si
 * aucun thème ne correspond (l’appelant garde alors sa logique de repli générique).
 */
export function matchTopicAnswer(query: string): TopicAnswer | null {
  const q = norm(query);
  if (!q) return null;
  let best: { answer: TopicAnswer; score: number } | null = null;
  for (const topic of TOPIC_ANSWERS) {
    let score = 0;
    for (const kw of topic.keywords) {
      const k = norm(kw);
      if (!k) continue;
      // expression de plusieurs mots
      if (k.includes(' ')) { if (q.includes(k)) score += 3; continue; }
      // mot-clé court : borne de mot ; long : préfixe
      const tokens = q.split(/[^a-z0-9]+/).filter(Boolean);
      if (k.length <= 4) { if (tokens.includes(k)) score += 3; }
      else if (tokens.some(t => t === k || t.startsWith(k))) score += 2;
    }
    if (score > 0 && (!best || score > best.score)) best = { answer: topic, score };
  }
  return best ? best.answer : null;
}
