/**
 * CHANTIER 16C — LIBELLÉS ET MOTIFS DES DOCUMENTS DE CONFORMITÉ.
 *
 * Source unique : l'écran d'approvisionnement, le générateur de demande de prix
 * et les fiches de sourcing doivent nommer les mêmes documents de la même
 * façon. Un CPSR appelé « rapport de sécurité » ici et « évaluation CPSR »
 * là-bas finit par devenir deux cases à cocher différentes.
 *
 * Les motifs sont les obligations réelles, pas des préférences internes. Là où
 * une date d'entrée en vigueur s'applique, elle est écrite — un fournisseur qui
 * lit « interdit depuis le 01/01/2026 » ne peut pas répondre « nous verrons ».
 */

export const SUPPLIER_DOCUMENT_LABELS: Record<string, string> = {
  responsible_person: 'Personne Responsable (UE)',
  pif: 'Dossier d’information produit (PIF)',
  cpsr: 'Rapport de sécurité (CPSR)',
  cpnp_notification: 'Notification CPNP',
  spf_iso_24444: 'SPF — ISO 24444',
  uva_iso_24443: 'UVA-PF — ISO 24443',
  oeko_tex: 'OEKO-TEX Standard 100',
  eudr_statement: 'Déclaration EUDR',
  microplastic_free: 'Attestation sans microplastique',
  gmp_iso_22716: 'BPF — ISO 22716',
  certificate_of_analysis: 'Certificat d’analyse',
  other: 'Autre'
};

export const SUPPLIER_DOCUMENT_REASONS: Record<string, string> = {
  responsible_person:
    'Un cosmétique mis sur le marché européen exige une Personne Responsable établie dans l’Union, dont l’adresse figure sur l’étiquette.',
  pif:
    'Le dossier d’information produit doit exister avant la mise sur le marché et être tenu à disposition des autorités.',
  cpsr:
    'Le rapport de sécurité signé par un évaluateur qualifié est la pièce maîtresse du PIF. Sans CPSR, le produit ne peut pas être notifié.',
  cpnp_notification:
    'La notification sur le portail CPNP est obligatoire avant la première mise sur le marché dans l’Union.',
  spf_iso_24444:
    'Un SPF revendiqué se mesure in vivo selon l’ISO 24444. Un indice déclaré sans cette mesure n’est pas défendable.',
  uva_iso_24443:
    'Le facteur de protection UVA se mesure in vitro selon l’ISO 24443, et doit atteindre au moins le tiers du SPF pour porter le logo UVA.',
  oeko_tex:
    'Un textile en contact prolongé avec la peau — a fortiori destiné à un enfant — se justifie par une certification OEKO-TEX Standard 100.',
  eudr_statement:
    'Le règlement UE 2023/1115 impose une diligence raisonnée et la géolocalisation des parcelles pour les matières concernées. Échéances : 30 décembre 2026 pour les grandes et moyennes entreprises, 30 juin 2027 pour les micro et petites.',
  microplastic_free:
    'La loi AGEC interdit les microplastiques dans les cosmétiques rincés au-delà de 0,01 % de la masse depuis le 1er janvier 2026.',
  gmp_iso_22716:
    'Les bonnes pratiques de fabrication cosmétique (ISO 22716) sont le socle attendu d’un façonnier.',
  certificate_of_analysis:
    'Le certificat d’analyse atteste la conformité du lot livré à la spécification.',
  other: 'Document complémentaire demandé au cas par cas.'
};

export function documentLabel(type: string): string {
  return SUPPLIER_DOCUMENT_LABELS[type] || type;
}

export function documentReason(type: string): string {
  return SUPPLIER_DOCUMENT_REASONS[type] || '';
}
