/**
 * CO-SIGNATURE PROFESSIONNELLE
 *
 * Le pont IA vers humain dans le bon sens : ce n'est pas l'IA qui oriente vers
 * un professionnel, c'est le professionnel qui valide, amende ou contredit ce
 * que l'IA a proposé.
 *
 * Trois effets : l'IA gagne en crédibilité, le professionnel gagne en visibilité
 * grâce à son expertise réelle et non à un budget publicitaire, et KURLA
 * obtient du signal expert structuré — la donnée la plus rare de toutes.
 */

export type EndorsementStance = 'approved' | 'amended' | 'contradicted';

export const ENDORSEMENT_STANCES: EndorsementStance[] = ['approved', 'amended', 'contradicted'];

export const ENDORSEMENT_STANCE_LABELS: Record<EndorsementStance, string> = {
  approved: 'Validée',
  amended: 'Ajustée',
  contradicted: 'Contredite'
};

export interface EndorsementAmendment {
  target: 'step' | 'product' | 'frequency' | 'whole_routine';
  original: string;
  replacement: string;
  reason: string;
}

export interface ProfessionalEndorsement {
  id: string;
  professionalId: string;
  professionalName: string;
  professionalSpecialty?: string;
  professionalVerified: boolean;
  clientUserId: string;
  routinePlanId?: string;
  productId?: string;
  stance: EndorsementStance;
  rationale: string;
  amendments: EndorsementAmendment[];
  isDisplayable: boolean;
  clientConsentAt?: string;
  createdAt: string;
}

export function isEndorsementStance(value: unknown): value is EndorsementStance {
  return typeof value === 'string' && (ENDORSEMENT_STANCES as string[]).includes(value);
}

/**
 * Un professionnel non vérifié ne peut pas co-signer publiquement. Sans cette
 * règle, la co-signature devient un espace publicitaire déguisé — exactement
 * ce que KURLA reproche au marché.
 */
export function canDisplayEndorsement(endorsement: Pick<ProfessionalEndorsement, 'professionalVerified' | 'isDisplayable' | 'clientConsentAt'>): { allowed: boolean; reason?: string } {
  if (!endorsement.professionalVerified) {
    return { allowed: false, reason: 'Identité professionnelle non vérifiée : la co-signature reste privée.' };
  }
  if (!endorsement.isDisplayable || !endorsement.clientConsentAt) {
    return { allowed: false, reason: 'Le client n’a pas consenti à l’affichage public de cette co-signature.' };
  }
  return { allowed: true };
}

/**
 * Une co-signature ne vaut pas caution médicale. Le professionnel est coiffeur,
 * locticien ou esthéticienne : il n'est ni dermatologue ni médecin, sauf
 * mention explicite et vérifiée.
 */
export function endorsementDisclaimer(endorsement: Pick<ProfessionalEndorsement, 'professionalSpecialty' | 'stance'>): string {
  const specialty = endorsement.professionalSpecialty || 'professionnel de la beauté';
  if (endorsement.stance === 'contradicted') {
    return `Avis de ${specialty}. Il contredit la proposition de KURLA : en cas de symptôme (douleur, lésion, perte de cheveux), seul un professionnel de santé peut trancher.`;
  }
  return `Avis de ${specialty}. Il ne constitue ni un diagnostic ni une prescription médicale.`;
}

export interface EndorsementImpact {
  total: number;
  approved: number;
  amended: number;
  contradicted: number;
  agreementRate: number | null;
  statement: string;
  limitations: string[];
}

/**
 * Taux d'accord des professionnels avec l'IA. C'est la métrique d'honnêteté de
 * KURLA : si elle est basse, l'IA doit changer, pas la métrique.
 */
export function summarizeEndorsements(
  professionalId: string,
  endorsements: Iterable<ProfessionalEndorsement>,
  options: { minimumSample?: number } = {}
): EndorsementImpact {
  const minimumSample = options.minimumSample ?? 10;
  const list = Array.from(endorsements).filter(item => item.professionalId === professionalId);
  const approved = list.filter(item => item.stance === 'approved').length;
  const amended = list.filter(item => item.stance === 'amended').length;
  const contradicted = list.filter(item => item.stance === 'contradicted').length;

  const limitations: string[] = [
    'Ce taux mesure l’accord d’un professionnel avec des propositions, pas la qualité clinique de l’IA.'
  ];
  if (list.length < minimumSample) {
    limitations.push(`Échantillon de ${list.length} co-signature(s), sous le seuil de ${minimumSample} : le taux n’est pas affiché publiquement.`);
  }

  const agreementRate = list.length === 0 ? null : Number((approved / list.length).toFixed(2));
  const statement = agreementRate === null
    ? 'Aucune co-signature enregistrée.'
    : list.length < minimumSample
      ? `${list.length} co-signature(s) : échantillon trop faible pour publier un taux d’accord.`
      : `Sur ${list.length} routines revues, ${Math.round(approved * 100 / list.length)} % validées sans modification, ${Math.round(amended * 100 / list.length)} % ajustées, ${Math.round(contradicted * 100 / list.length)} % contredites.`;

  return { total: list.length, approved, amended, contradicted, agreementRate, statement, limitations };
}

/**
 * Ce que l'IA doit faire quand un professionnel la contredit : s'aligner pour
 * cet utilisateur, et signaler le désaccord à l'équipe. Jamais ignorer.
 */
export interface ContradictionAction {
  applyOverride: boolean;
  message: string;
  escalation: string;
}

export function handleContradiction(endorsement: ProfessionalEndorsement): ContradictionAction {
  if (endorsement.stance !== 'contradicted') {
    return {
      applyOverride: endorsement.stance === 'amended',
      message: endorsement.stance === 'amended'
        ? 'Routine ajustée par le professionnel : ses modifications priment sur la proposition initiale.'
        : 'Routine validée par le professionnel.',
      escalation: 'none'
    };
  }
  return {
    applyOverride: true,
    message: `Un professionnel a contredit cette recommandation : « ${endorsement.rationale} ». Sa recommandation remplace celle de KURLA pour votre profil.`,
    escalation: 'La contradiction est transmise à l’équipe KURLA : une recommandation contredite par un praticien est un signal de correction du moteur, pas une exception à écarter.'
  };
}
