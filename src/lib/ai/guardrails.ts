/**
 * GARDE-FOUS MÉDICAUX — source unique de vérité.
 *
 * Avant cette refonte, il existait deux listes de mots-clés divergentes :
 * `AI_GUARDRAILS.medicalFlagsKeywords` (jamais appelée) et une liste locale
 * dans `medicalTriage()` côté serveur, en correspondance par phrases exactes.
 * Résultat : « j'ai la gorge qui gonfle » ou « je n'arrive plus à respirer »
 * ne déclenchaient rien, car aucune de ces chaînes n'était présente.
 *
 * La correspondance passe désormais par des racines, et il n'y a plus qu'une
 * seule liste, ici.
 */

export const AI_GUARDRAILS = {
  disclaimer: 'Disclaimer KURLA Beauty : Les conseils fournis par KURLA Beauty sont exclusivement à des fins de soin cosmétique et d’hygiène capillaire/cutanée non médicale. Ils ne constituent pas un avis médical, un diagnostic dermatologique ni une ordonnance. En cas de lésions cutanées, de perte de cheveux brutale, de brûlures du cuir chevelu ou d’allergies graves, veuillez consulter immédiatement un médecin ou un dermatologue certifié.',

  forbiddenTerms: ['guérir', 'traiter', 'médicament', 'ordonnance', 'maladie', 'éliminer définitivement', 'solution miracle'],

  /**
   * Racines d'urgence. On cherche la racine, pas la phrase : « je n'arrive plus
   * à respirer », « difficulté respiratoire » et « trouble de la respiration »
   * doivent tous déclencher le même niveau d'alerte.
   */
  emergencyStems: [
    'respir',            // respirer, respiration, respiratoire,呼吸困难
    'gonfle',            // gonflement, gonfle, gonflée
    'oedeme', 'œdème', 'edeme',
    'anaphyla',          // anaphylaxie, anaphylactique
    'brulure chimique', 'brûlure chimique', 'chemical burn',
    'saigne',            // saigne, saignement, saignement abondant
    'hemorrag', 'hémorrag',
    'cloque', 'ampoule',
    'engourdissement', 'paralys',
    'yeux', 'vision', 'oeil', 'œil',
    'inconscien', 'malaise', 'vertige intense',
    'fievre elevee', 'fièvre élevée'
  ],

  /** Racines nécessitant un avis professionnel, sans urgence immédiate. */
  reviewStems: [
    'plaie', 'pus', 'croute', 'croûte', 'ulcer', 'ulcère',
    'chute soudaine', 'chute massive', 'chute de cheveux rapide', 'pelade', 'alopécie', 'alopecie',
    'perte de cheveux', 'perd mes cheveux', 'perd ses cheveux',
    'cheveux qui tombent', 'tombent par poignee', 'tombe par poignee', 'par poignees',
    'eczema', 'eczéma', 'psoriasis', 'dermatite', 'lichén', 'lichen',
    'infection', 'fievre', 'fièvre',
    'douleur intense', 'douleur severe', 'douleur sévère',
    'lesion', 'lésion', 'nævus', 'naevus', 'grain de beauté qui change',
    'allergi', 'réaction allergique', 'reaction allergique',
    'cicatric', 'cicatrisation',
    'diagnostic', 'prescription', 'ordonnance',
    'enceinte', 'grossesse', 'allaite', 'allaitement'
  ],

  normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  },

  matchesStems(value: string, stems: string[]): string[] {
    const normalized = this.normalize(value);
    return stems.filter(stem => normalized.includes(this.normalize(stem)));
  },

  /**
   * Évaluation unique, utilisée par le serveur pour toutes les routes IA.
   * Retourne les racines trouvées : le message peut citer ce qui a déclenché
   * l'alerte, ce qui rend le triage vérifiable plutôt que magique.
   */
  triage(query: string): { emergency: boolean; review: boolean; message: string; matched: string[] } {
    const emergencyMatched = this.matchesStems(query, this.emergencyStems);
    const reviewMatched = this.matchesStems(query, this.reviewStems);
    const emergency = emergencyMatched.length > 0;
    const review = emergency || reviewMatched.length > 0;
    const message = emergency
      ? 'Des signes potentiellement urgents sont décrits. Appelez immédiatement le 15 ou le 112 en France, ou le numéro d’urgence local, et n’appliquez aucun nouveau cosmétique sur la zone concernée.'
      : review
        ? 'Votre description mérite un avis professionnel. KURLA ne pose pas de diagnostic et ne remplace pas un médecin, un dermatologue ou un pharmacien.'
        : '';
    return { emergency, review, message, matched: [...emergencyMatched, ...reviewMatched] };
  },

  // Compatibilité ascendante : l'ancien nom reste utilisable, mais délègue.
  medicalFlagsKeywords: [
    'plaie', 'brûlure', 'saignement', 'pus', 'croûte', 'chute soudaine', 'pelade',
    'eczéma grave', 'psoriasis sévère', 'allergie vive', 'gonflement'
  ],

  checkForMedicalFlags(query: string): boolean {
    return this.triage(query).review;
  },

  getMedicalRedirectMessage(): string {
    return `⚠️ **Recommandation de Prudence** : Votre question fait référence à des symptômes ou sensations qui nécessitent l'évaluation directe d'un professionnel de santé (dermatologue ou médecin). KURLA Beauty fournit uniquement des conseils d'entretien cosmétique. Nous vous conseillons de ne pas appliquer de produit gras ou irritant sur une zone lésée et de consulter un spécialiste.`;
  }
};

/**
 * Article 50(1) du règlement (UE) 2024/1689, applicable depuis le 2 août 2026.
 * L'utilisateur doit être informé qu'il interagit avec un système d'IA, de
 * façon perceptible dans l'interaction elle-même — pas dans les CGU, pas via un
 * libellé ambigu. Sanction encourue : 15 M€ ou 3 % du CA mondial.
 *
 * Ces chaînes sont la seule source autorisée pour cette divulgation.
 */
export const AI_TRANSPARENCY = {
  /** Affichée en tête de toute interaction avec l'assistant. */
  disclosure: 'Vous échangez avec KURLA AI, un assistant d’intelligence artificielle. Ce n’est pas un humain, et ce n’est pas un professionnel de santé.',

  /** Rappel discret sous chaque réponse générée. */
  responseMarker: 'Réponse générée par une intelligence artificielle.',

  /**
   * Article 50(4) : un texte généré par IA publié sur un sujet d’intérêt
   * public doit être signalé, sauf contrôle éditorial humain documenté avec un
   * responsable nommément identifié. Cette exemption doit rester la voie par
   * défaut du CMS, pas une option.
   */
  editorialExemptionNote: 'Contenu relu et validé par la rédaction KURLA. Responsable éditorial identifié pour chaque publication.',

  aiGeneratedContentLabel: 'Contenu généré par IA, relu par la rédaction.'
} as const;

export function formatAiDisclosure(): string {
  return `${AI_TRANSPARENCY.disclosure} ${AI_GUARDRAILS.disclaimer}`;
}
