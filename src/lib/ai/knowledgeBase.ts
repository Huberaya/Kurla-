export interface KnowledgeCard {
  id: string;
  title: string;
  domains: string[];
  content: string;
  sourceLabel: string;
  status: 'internal_review_pending' | 'validated';
}

// This is deliberately versioned as an internal knowledge layer. Until each
// card is reviewed by the named specialists, the assistant must display that
// status instead of presenting it as a clinical guideline.
export const KURLA_KNOWLEDGE_BASE: KnowledgeCard[] = [
  {
    id: 'hair-porosity-fibre',
    title: 'Porosité, sécheresse et état de la fibre',
    domains: ['hair', 'porosity', 'dryness', 'breakage'],
    content: 'La porosité, la sécheresse, l’état de la fibre et la casse sont des dimensions distinctes. Une routine doit tenir compte de la capacité à retenir l’eau et de la fragilité observée, sans promettre une pousse ou une réparation garantie.',
    sourceLabel: 'KURLA Science · fiche fibre capillaire v1',
    status: 'internal_review_pending'
  },
  {
    id: 'hair-zones-scalp-lengths',
    title: 'Cuir chevelu, longueurs et pointes',
    domains: ['hair', 'scalp', 'zones'],
    content: 'Le cuir chevelu et les longueurs ne se traitent pas comme une seule zone. Un cuir chevelu gras peut coexister avec des longueurs sèches ; les conseils doivent donc séparer nettoyage, confort du cuir chevelu et protection des pointes.',
    sourceLabel: 'KURLA Science · fiche zones capillaires v1',
    status: 'internal_review_pending'
  },
  {
    id: 'hair-protective-styles',
    title: 'Styles protecteurs et traction',
    domains: ['hair', 'cheveux', 'braids', 'tresses', 'locks', 'wig', 'perruque', 'traction'],
    content: 'Les tresses, locks, twists et perruques demandent une routine d’entretien adaptée. Une douleur, une inflammation ou une traction persistante doit conduire à desserrer ou retirer le style et à demander un avis professionnel.',
    sourceLabel: 'KURLA Experts Textures · fiche styles protecteurs v1',
    status: 'internal_review_pending'
  },
  {
    id: 'skin-melanin-inflammation',
    title: 'Mélanine, inflammation et pigmentation',
    domains: ['skin', 'peau', 'melanin', 'mélanine', 'pigmentation', 'taches', 'marques', 'sensitivity', 'sensibilité'],
    content: 'La profondeur de carnation ne suffit pas à décrire une peau. La sensibilité, l’inflammation, la tendance aux marques post-inflammatoires, l’hydratation et l’environnement doivent être considérées ensemble.',
    sourceLabel: 'KURLA Skin of Color · fiche pigmentation v1',
    status: 'internal_review_pending'
  },
  {
    id: 'skin-spf',
    title: 'Photoprotection et peaux mélaninées',
    domains: ['skin', 'peau', 'spf', 'solaire', 'sun', 'pigmentation'],
    content: 'L’exposition solaire et l’usage réel d’un SPF sont des facteurs à prendre en compte lorsqu’une personne cherche à prévenir l’aggravation de marques. La recommandation doit rester cosmétique et ne pas promettre l’effacement d’une pigmentation.',
    sourceLabel: 'KURLA Skin of Color · fiche photoprotection v1',
    status: 'internal_review_pending'
  },
  {
    id: 'safety-medical-triage',
    title: 'Limites cosmétiques et orientation médicale',
    domains: ['safety', 'sécurité', 'medical', 'médical', 'scalp', 'cuir chevelu', 'skin', 'peau', 'urgence', 'brûlure', 'lésion'],
    content: 'Une gêne respiratoire, un gonflement du visage ou de la gorge, une brûlure importante, un saignement, du pus, une douleur intense ou une perte soudaine de cheveux nécessitent une orientation médicale. L’assistant ne pose pas de diagnostic.',
    sourceLabel: 'KURLA Safety · protocole de triage v1',
    status: 'internal_review_pending'
  },
  {
    id: 'cosmetic-formulation-basics',
    title: 'Formules, tolérance et associations',
    domains: ['skin', 'peau', 'hair', 'cheveux', 'ingredients', 'ingrédients', 'actifs', 'association', 'safety', 'sécurité'],
    content: 'Les associations d’actifs et la tolérance individuelle doivent être abordées avec prudence. En cas d’historique de réaction, proposer un test local prudent et une introduction progressive plutôt qu’une accumulation d’actifs.',
    sourceLabel: 'KURLA Formulation · fiche tolérance v1',
    status: 'internal_review_pending'
  },
  {
    id: 'children-gentle-care',
    title: 'Enfants et soin doux',
    domains: ['children', 'enfant', 'kids', 'hair', 'cheveux', 'skin', 'peau', 'safety', 'sécurité'],
    content: 'Pour les enfants, privilégier des gestes doux, des formules adaptées à l’âge et l’avis d’un professionnel en cas de symptôme persistant. Aucune recommandation ne doit être présentée comme un traitement médical.',
    sourceLabel: 'KURLA Kids · fiche soin doux v1',
    status: 'internal_review_pending'
  }
];

export function selectKnowledgeCards(query: string, domains: string[] = []): KnowledgeCard[] {
  const terms = `${query} ${domains.join(' ')}`.toLowerCase();
  return KURLA_KNOWLEDGE_BASE
    .map(card => ({ card, relevance: card.domains.reduce((score, domain) => score + (terms.includes(domain) ? 2 : 0), 0) }))
    .sort((a, b) => b.relevance - a.relevance)
    .filter(item => item.relevance > 0 || item.card.id === 'safety-medical-triage')
    .slice(0, 5)
    .map(item => item.card);
}

export function formatKnowledgeContext(cards: KnowledgeCard[]): string {
  return cards.map(card => `[${card.id}] ${card.title}: ${card.content}`).join('\n');
}
