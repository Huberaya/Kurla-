export const AI_GUARDRAILS = {
  disclaimer: 'Disclaimer KURLA Beauty : Les conseils fournis par KURLA Beauty sont exclusivement à des fins de soin cosmétique et d’hygiène capillaire/cutanée non médicale. Ils ne constituent pas un avis médical, un diagnostic dermatologique ni une ordonnance. En cas de lésions cutanées, de perte de cheveux brutale, de brûlures du cuir chevelu ou d’allergies graves, veuillez consulter immédiatement un médecin ou un dermatologue certifié.',
  forbiddenTerms: ['guérir', 'traiter', 'médicament', 'ordonnance', 'maladie', 'éliminer définitivement', 'solution miracle'],
  medicalFlagsKeywords: ['plaie', 'brûlure', 'saignement', 'pus', 'croûte', 'chute soudaine', 'pelade', 'eczéma grave', 'psoriasis sévère', 'allergie vive', 'gonflement'],

  checkForMedicalFlags(query: string): boolean {
    const q = query.toLowerCase();
    return this.medicalFlagsKeywords.some(keyword => q.includes(keyword));
  },

  getMedicalRedirectMessage(): string {
    return `⚠️ **Recommandation de Prudence** : Votre question fait référence à des symptômes ou sensations qui nécessitent l'évaluation directe d'un professionnel de santé (dermatologue ou médecin). KURLA Beauty fournit uniquement des conseils d'entretien cosmétique. Nous vous conseillons de ne pas appliquer de produit gras ou irritant sur une zone lésée et de consulter un spécialiste.`;
  }
};
