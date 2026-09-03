// Pourquoi chaque outil de l'espace personnel existe, et ce que la personne y gagne.
//
// Règle d'écriture : aucune promesse chiffrée inventée. Quand un bénéfice est
// mesurable (score de confiance du profil, nombre de produits, échéance du wash
// day), il est calculé depuis les vraies données de la personne, pas écrit ici.
// Ce fichier ne contient que des explications — jamais de chiffres inventés.

export interface FeatureValue {
  id: string;
  /** Nom affiché de l'outil. */
  name: string;
  /** Destination. */
  href: string;
  /** Une phrase qui dit ce que c'est, en une seule lecture. */
  promesse: string;
  /** Le problème réel que l'outil règle. C'est le paragraphe le plus lu. */
  pourquoi: string;
  /** Ce que la personne gagne, concrètement. Trois points maximum. */
  gains: string[];
  /** Comment ça marche, sans magie et sans promesse exagérée. */
  mecanisme: string;
  /** Temps honnête pour en tirer le premier bénéfice. */
  effort: string;
  /** Libellé du bouton. */
  cta: string;
}

export const FEATURE_VALUE: FeatureValue[] = [
  {
    id: 'kurla-id',
    name: 'Mon KURLA ID',
    href: '/account/kurla-id',
    promesse: 'La seule fiche qui décrit vraiment tes cheveux et ta peau.',
    pourquoi:
      'La plupart des routines échouent parce qu’elles sont copiées sur quelqu’un d’autre. Ta texture, ta porosité, ton cuir chevelu, la dureté de ton eau et ton budget : ce sont ces cinq éléments qui décident si un produit marche sur toi. Sans eux, KURLA ne peut te donner que des conseils généraux — et un conseil général, sur cheveux texturés, ne sert à rien.',
    gains: [
      'Des recommandations calées sur ta texture et ta porosité, pas sur un cheveu moyen.',
      'KURLA AI répond avec ton profil en tête : chaque champ connu rend la réponse plus juste.',
      'Un dossier exportable, à montrer à un coiffeur ou à un dermatologue.',
    ],
    mecanisme:
      'Chaque champ que tu remplis augmente le score de confiance de ton profil. Ce score est transmis à l’assistant : profil vide = réponse prudente et générale, profil complet = réponse contextualisée. Tes données restent tiennes : exportables et supprimables à tout moment.',
    effort: '4 min',
    cta: 'Compléter mon KURLA ID',
  },
  {
    id: 'shelf',
    name: 'Mon étagère',
    href: '/account/shelf',
    promesse: 'L’inventaire de ce que tu as déjà — pour que KURLA puisse te dire de ne pas racheter.',
    pourquoi:
      'Le vrai gaspillage n’est pas d’acheter un mauvais produit : c’est d’en avoir quatre d’ouverts en même temps, sans plus savoir lequel fait quoi, ni lequel terminer avant d’en ouvrir un cinquième.',
    gains: [
      'Un verdict d’achat honnête, y compris quand la réponse est « tu n’as rien à acheter ».',
      'Le surplus rendu visible : trois leave-in entamés, tu le vois immédiatement.',
      'Quand tu abandonnes un produit, KURLA te demande pourquoi — ce motif est la seule donnée qui évite de refaire la même erreur.',
    ],
    mecanisme:
      'Tu scannes un code-barres ou saisis le produit. KURLA regarde ensuite ce qui manque réellement à chaque étape de ta routine, et te dit quoi finir avant de racheter. L’abandon d’un produit exige un motif : c’est ce motif qui rend l’historique exploitable.',
    effort: '2 min par produit',
    cta: 'Remplir mon étagère',
  },
  {
    id: 'wash-day',
    name: 'Mon Wash Day',
    href: '/account/wash-day',
    promesse: 'Le bon soin, le bon jour — pas « un jour, quand j’aurai le temps ».',
    pourquoi:
      'Un soin profond fait trop souvent abîme la fibre. Fait trop rarement, il ne sert à rien. L’écart entre les deux, c’est ton rythme — et personne ne peut le deviner à ta place.',
    gains: [
      'Une échéance claire : prochain lavage, prochain soin profond, prochaine protéine.',
      'Des tâches dimensionnées au temps dont tu disposes vraiment (10 minutes, pas une heure).',
      'Une alerte si tu portes des tresses ou des vanilles depuis trop longtemps : c’est là que la traction abîme les edges.',
    ],
    mecanisme:
      'Tu indiques ton intervalle habituel et tes minutes disponibles par jour. KURLA en déduit un plan quotidien et te prévient quand une échéance est dépassée, ou quand un soin revient trop souvent pour être sain.',
    effort: '1 min',
    cta: 'Régler mon rythme',
  },
  {
    id: 'progression',
    name: 'Mon suivi',
    href: '/account/progression',
    promesse: 'La preuve, par toi-même, que ça marche.',
    pourquoi:
      'Sans trace, tu juges sur une impression du matin — et une mauvaise journée te fait tout arrêter. Une note posée au même endroit, trois semaines de suite, ne ment pas.',
    gains: [
      'Tu vois ce qui a marché, au lieu de le supposer.',
      'Tu arrêtes de racheter ce qui n’a rien changé.',
      'Tes observations, anonymisées, nourrissent la note de ton archétype : tu évites aux autres de se tromper comme toi.',
    ],
    mecanisme:
      'Tu notes un signal (mieux hydraté, moins de casse, définition améliorée…) à quelques jours d’intervalle. Une note d’archétype n’est publiée qu’à partir d’un nombre suffisant d’observations ; en dessous, elle reste masquée — volontairement.',
    effort: '30 s par observation',
    cta: 'Noter une observation',
  },
  {
    id: 'diagnostic',
    name: 'Mon diagnostic',
    href: '/diagnostic/cheveux',
    promesse: 'Cinq questions, une routine, zéro invention.',
    pourquoi:
      'Tu n’as pas besoin de plus de produits. Tu as besoin de savoir lesquels, dans quel ordre, et à quelle fréquence. C’est exactement la seule chose que le diagnostic produit.',
    gains: [
      'Une séquence ordonnée : laver, conditionner, sceller, protéger — pas une liste de produits.',
      'Des recommandations recalculées contre le catalogue réel : un produit indisponible n’est jamais proposé.',
      'Un résultat qui alimente ton KURLA ID, donc tout le reste de l’espace.',
    ],
    mecanisme:
      'Les réponses sont confrontées au catalogue disponible au moment où tu les donnes. Si un produit manque ou n’est plus en stock, il ne sort pas dans la routine.',
    effort: '3 min',
    cta: 'Faire mon diagnostic',
  },
  {
    id: 'assistant',
    name: 'Mon assistant KURLA',
    href: '/assistant-beaute',
    promesse: 'Une réponse qui cite ses sources et avoue ses limites.',
    pourquoi:
      'Sur les cheveux texturés, l’internet donne dix réponses contradictoires par question. Une réponse qui ne dit pas d’où elle vient ne vaut pas mieux qu’une opinion.',
    gains: [
      'Une réponse courte d’abord, le détail ensuite — tu décides jusqu’où lire.',
      'Un avis médical n’est jamais simulé : si ta question relève d’un médecin, KURLA te le dit et s’arrête là.',
      'Chaque réponse peut être signalée et demandée en revue humaine.',
    ],
    mecanisme:
      'L’assistant croise ton profil, ta question, les sources validées de la base de connaissances et le catalogue disponible. Ce n’est pas un professionnel de santé et c’est indiqué à chaque point d’entrée.',
    effort: '30 s',
    cta: 'Poser une question',
  },
];

export const FEATURE_VALUE_BY_ID: Record<string, FeatureValue> = Object.fromEntries(
  FEATURE_VALUE.map((feature) => [feature.id, feature]),
);
