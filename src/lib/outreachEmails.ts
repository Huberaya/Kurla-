/**
 * EMAILS D'APPROCHE PRÊTS À ENVOYER — toutes les phases d'achat.
 *
 * Chaque phase du bureau des achats a son modèle, rédigé et prêt à copier.
 * Les destinataires pointent vers des prospects RÉELS (ids du seed).
 * Un email de marque sans adresse publique publiée se passe par le
 * **formulaire de contact du site** : aucune adresse n'est inventée.
 *
 * Tokens à remplacer une fois (signature) : [VOTRE NOM], [EMAIL], [TEL].
 * Tokens par message : [FOURNISSEUR], [MARQUES].
 */

export interface OutreachEmail {
  phaseId: string;
  label: string;
  /** 'email' = adresse publique connue ; 'form' = passer par le formulaire du site. */
  channel: 'email' | 'form';
  subject: string;
  body: string;
  /** Prospects concernés (ids réels du seed). */
  prospectIds: string[];
}

const SIGNATURE = `Merci par avance,
[VOTRE NOM]
KURLA — kurlabeauty.vercel.app
[EMAIL] · [TÉL]`;

const CONFORMITE_REVENTE = `5. Les documents de conformité disponibles (INCI, notification CPNP,
   Personne Responsable UE) pour les cosmétiques revendus.`;

export const OUTREACH_EMAILS: OutreachEmail[] = [
  // ---------------------------------------------------------------- PHASE 1
  {
    phaseId: 'phase-grossistes',
    label: 'Email grossiste multimarques',
    channel: 'email',
    prospectIds: ['c23', 'c15', 'c22'],
    subject: 'Demande de compte revendeur / tarifs de gros — KURLA (boutique FR, cheveux texturés)',
    body: `Bonjour,

Je suis [VOTRE NOM], fondateur de KURLA, une boutique en ligne française
spécialisée dans les soins pour cheveux afro, crépus, bouclés et les peaux
riches en mélanine. Nous constituons notre offre d'ouverture et recherchons un
partenaire grossiste capable de nous fournir plusieurs marques et les
accessoires en une seule commande.

Votre catalogue (produits capillaires ainsi que bonnets satin, taies, peignes
et outils de démêlage) correspond exactement à notre cible. Pourriez-vous nous
communiquer :

1. Les conditions d'ouverture d'un compte professionnel et la grille de tarifs
   de gros (dégressivité par volume) ;
2. Le minimum de commande (MOQ) et les frais et délais de livraison vers la
   France ;
3. La liste des marques et références disponibles au tarif grossiste, et la
   gamme accessoires ;
4. La gestion des ruptures et la fréquence de réapprovisionnement ;
${CONFORMITE_REVENTE}

Nous souhaitons démarrer par une commande d'essai raisonnable (échantillons +
références phares) pour valider la qualité du service, avant d'augmenter les
volumes avec notre lancement.

Disponible pour un échange rapide par email ou téléphone.

${SIGNATURE}`,
  },
  // ---------------------------------------------------------------- PHASE 2
  {
    phaseId: 'phase-marques-fr',
    label: 'Email revente — marque française',
    channel: 'form',
    prospectIds: ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07'],
    subject: 'Demande de compte revendeur — KURLA (cheveux crépus & bouclés, France)',
    body: `Bonjour,

Je suis [VOTRE NOM], fondateur de KURLA, une boutique en ligne française
dédiée aux cheveux afro, crépus, bouclés et aux peaux riches en mélanine. Vos
produits [FOURNISSEUR] sont très attendus par notre communauté et nous
souhaitons vous référencer dès notre ouverture.

Pourriez-vous nous indiquer :

1. Les conditions d'un compte revendeur / professionnel et votre tarif de gros
   (grille dégressive) ;
2. Le minimum de première commande et les frais/délais de livraison en France ;
3. Les références et gammes disponibles au tarif pro (y compris la gamme
   enfant, le cas échéant) ;
4. La possibilité d'échantillons, de visuels autorisés et d'argumentaires pour
   nos fiches produits ;
${CONFORMITE_REVENTE}

Nous commençons par une commande d'essai avant de monter en volume et nous
serions ravis de mettre en avant votre marque auprès de nos clientes.

Bien cordialement,
${SIGNATURE}`,
  },
  // ---------------------------------------------------------------- PHASE 3
  {
    phaseId: 'phase-marques-eu',
    label: 'Email revente — marque UE (coiffage)',
    channel: 'form',
    prospectIds: ['c08', 'c09', 'c10', 'c11'],
    subject: 'Wholesale / stockist enquiry — KURLA (France, textured hair)',
    body: `Hello,

I'm [VOTRE NOM], founder of KURLA, a French online store dedicated to curly,
coily and afro-textured hair and to melanin-rich skin. Your styling range
(gels, mousses, defining creams) is exactly what our customers look for, and
we would love to stock [FOURNISSEUR] from launch.

Could you please share:

1. Your wholesale / stockist terms and price list (volume tiers) ;
2. Minimum order quantity and shipping cost/lead time to France (and the EU) ;
3. The references available at wholesale price ;
4. Whether samples, approved product imagery and marketing copy are provided ;
5. The compliance documents available (INCI, CPNP notification, EU Responsible
   Person) for the products resold.

We plan to start with a trial order before scaling up, and we would be glad to
feature your brand prominently.

Best regards,
${SIGNATURE}`,
  },
  // ---------------------------------------------------------------- PHASE 4
  {
    phaseId: 'phase-solaire-peau',
    label: 'Email solaire / soin taches (peaux mélanisées)',
    channel: 'form',
    prospectIds: ['c12', 'c14', 'c13'],
    subject: 'Partenariat revente — soin solaire sans trace & anti-taches (peaux noires et métisses)',
    body: `Bonjour,

Je suis [VOTRE NOM], fondateur de KURLA, une boutique en ligne française
spécialisée dans les cheveux texturés et les peaux riches en mélanine. Votre
soin [FOURNISSEUR] répond à un besoin que nous jugeons prioritaire : une
protection solaire efficace SANS trace blanche et le soin des taches sur
peaux noires et métisses — un segment encore mal servi en France.

Nous souhaitons vous référencer et vous mettre en avant. Pourriez-vous nous
préciser :

1. Les conditions de distribution / revente en France et dans l'UE et le tarif
   de gros ;
2. Le statut d'importation UE (le produit américain peut nécessiter un
   représentant / importateur UE) et la Personne Responsable ;
3. Le minimum de commande, les frais et délais de livraison ;
4. La documentation produit : SPF et allégations documentés, INCI, conformité
   (CPNP, étiquetage UE) ;
5. Les échantillons et visuels autorisés.

Nous commençons par une commande d'essai avant d'augmenter les volumes.

Bien cordialement,
${SIGNATURE}`,
  },
  // ---------------------------------------------------------------- PHASE 5
  {
    phaseId: 'phase-accessoires',
    label: 'Email accessoires satin premium (revente / co-branding)',
    channel: 'form',
    prospectIds: ['c24', 'c25'],
    subject: 'Référencement / co-branding — bonnets satin premium — KURLA',
    body: `Bonjour,

Je suis [VOTRE NOM], fondateur de KURLA, une boutique en ligne française pour
cheveux bouclés, crépus et afro. Vos accessoires en satin [FOURNISSEUR] —
qualité et fabrication soignée — correspondent exactement à ce que nous
souhaitons proposer à nos clientes pour protéger leur hydratation et leurs
coiffures la nuit.

Nous envisageons deux voies et serions heureux d'en discuter :

1. La revente de vos références (tarif gros / revendeur, minimum par couleur,
   stock et délais) ;
2. Un éventuel co-branding / coloris KURLA, et son seuil de personnalisation.

Pourriez-vous nous communiquer vos tarifs, minimums, délais, la possibilité
d'échantillons et les visuels autorisés ?

Nous démarrons par une commande d'essai avant de monter en volume.

Bien cordialement,
${SIGNATURE}`,
  },
  // ---------------------------------------------------------------- PHASE 6
  {
    phaseId: 'phase-faconnage',
    label: 'Appel d’offres façonnage (marque KURLA)',
    channel: 'form',
    prospectIds: ['c18', 'c16', 'c17', 'c19', 'c20', 'c21'],
    subject: 'Appel d’offres — fabrication marque propre KURLA (soins capillaires)',
    body: `Bonjour,

Je suis [VOTRE NOM], fondateur de KURLA, marque et plateforme beauté
spécialisée dans les cheveux texturés (types 3A à 4C) et les peaux riches en
mélanine. Nous développons notre première gamme de soins capillaires et
recherchons un façonnier capable de nous accompagner jusqu'au produit fini
notifié.

Notre première vague porte sur deux produits :

1. un après-shampoing rincé haute nutrition (cheveux 4A-4C) ;
2. un shampoing clarifiant (résidus de coiffage / eau dure, cuir chevelu
   texturé).

Notre cahier des charges (joint en PDF) précise la cible, la texture, les
orientations de formulation, le contenant et le dossier réglementaire exigé :
Personne Responsable UE, PIF, CPSR signé par un évaluateur qualifié,
notification CPNP, ISO 22716 (GMP), tests (stabilité, challenge, tolérance),
et attestation sans microplastique pour le rincé (conformité AGEC 2026).

Merci de nous faire parvenir :

- une fourchette de prix de revient unitaire à 500 / 1 000 / 5 000 pièces ;
- les MOQ et le délai de développement + production ;
- vos formules standards les plus proches (mise sur le marché rapide) et
  l'option sur-mesure ;
- les prestations réglementaires que vous assurez (ou sous-traitez) ;
- la possibilité d'échantillons de laboratoire avant tout engagement.

Au plaisir d'échanger et de recevoir vos échantillons.

Bien cordialement,
${SIGNATURE}`,
  },
];

/** Adresse email publique vérifiée par prospect (sinon : formulaire du site). */
export const KNOWN_PROSPECT_EMAILS: Record<string, string> = {
  c22: 'info@africanfabs.com',
  c23: 'support@afrowholesale.eu',
};

export function emailForPhase(phaseId: string): OutreachEmail | undefined {
  return OUTREACH_EMAILS.find((e) => e.phaseId === phaseId);
}
