import React from 'react';
import { ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import { preorderCgvDelay, preorderCgvNotice } from '../lib/preorderPromise';

interface LegalPageProps {
  kind: 'cgv' | 'confidentialite';
}

type Block = string; // paragraphe ; une ligne commençant par '• ' est une puce

interface LegalContent {
  eyebrow: string;
  title: string;
  intro: string;
  notice?: string;
  sections: Array<{ heading: string; blocks: Block[] }>;
  updated: string;
}

// Un paragraphe commençant par « • » est rendu comme une puce.
const isBullet = (b: string) => b.startsWith('• ');

const content: Record<'cgv' | 'confidentialite', LegalContent> = {
  cgv: {
    eyebrow: 'Informations légales',
    title: 'Conditions générales de vente',
    intro:
      "Les présentes conditions générales de vente (CGV) encadrent les précommandes et les ventes réalisées sur KURLA Beauty (kurlabeauty.fr). Elles sont applicables aux clientes et clients consommateurs, principalement pour des livraisons en France métropolitaine, Belgique et DOM-TOM.",
    notice:
      "Phase de pré-lancement : les règles ci-dessous (précommande, délais, rétractation, remboursement) sont définitives. Seules les mentions d'identité légale de la société (forme, SIRET, adresse du siège, hébergeur) seront renseignées à l'immatriculation, avant l'encaissement réel. Tant que le site affiche le mode de paiement « TEST », aucune somme n'est débitée (voir article 2).",
    sections: [
      {
        heading: '1. Éditeur et contact',
        blocks: [
          'Le site kurlabeauty.fr est édité par KURLA Beauty (dénomination sociale, forme juridique, capital, numéro SIRET/RCS et adresse du siège à renseigner à l’immatriculation, avant mise en production réelle).',
          'Contact client : bonjour@kurlabeauty.fr — réponse sous 48 h ouvrées.',
          'Hébergement : Vercel Inc. / Supabase Inc. (coordonnées complètes et adresse de l’hébergeur à reporter dans les mentions légales définitives).',
          'Directeur de la publication : le représentant légal de KURLA Beauty (à désigner à l’immatriculation).'
        ]
      },
      {
        heading: '2. Champ d’application et phase de pré-lancement',
        blocks: [
          'KURLA Beauty est actuellement en phase de pré-lancement : les produits sont proposés en PRÉCOMMANDE afin de valider la demande avant mise en production et approvisionnement du premier lot.',
          '• Tant que le tunnel de paiement fonctionne en mode TEST (fausses cartes bancaires, mention « test »), aucune transaction bancaire réelle n’est réalisée et aucune somme n’est débitée. La validation vaut alors réservation / manifestation d’intérêt, et non vente définitive.',
          '• Au passage en production réelle (paiement encaissé via Stripe en mode live), la commande devient un contrat de vente soumis aux présentes CGV ; la cliente en est informée clairement avant le paiement.',
          'Les présentes CGV sont accessibles à tout moment en bas de page et lors du paiement. Le fait de valider une commande vaut acceptation sans réserve des CGV en vigueur à la date de la commande.'
        ]
      },
      {
        heading: '3. Produits et précommandes',
        blocks: [
          'Les caractéristiques essentielles de chaque produit (composition, contenance, cheveux/peaux cibles, pays d’expédition), son prix TTC et sa disponibilité sont présentés sur la fiche produit avant la commande.',
          '• Une précommande est une réservation d’un produit avant sa disponibilité physique. Le prix affiché au moment de la précommande est garanti pour la cliente, même si le prix évolue ensuite.',
          preorderCgvNotice(),
          'Les photographies et illustrations sont indicatives. Les cosmétiques sont des produits d’hygiène : leur vente est définitive une fois le produit descellé, sous réserve des droits prévus aux articles 6 et 7.'
        ]
      },
      {
        heading: '4. Prix et paiement',
        blocks: [
          'Les prix sont indiqués en euros (€), toutes taxes comprises (TVA incluse au taux français en vigueur, actuellement 20 %). Les frais de livraison sont calculés et affichés avant la validation de la commande.',
          'Le paiement s’effectue par carte bancaire via notre prestataire Stripe. Les données bancaires sont traitées uniquement par Stripe (certification PCI-DSS) ; KURLA Beauty n’a jamais accès au numéro de carte complet.',
          'En mode réel, le montant est encaissé au moment de la confirmation de la commande. La cliente peut toutefois annuler sa précommande et obtenir le remboursement intégral à tout moment avant expédition (article 5), sans justification.',
          'En cas d’erreur de prix manifeste (prix dérisoire résultant d’un bug), KURLA Beauty pourra refuser ou annuler la commande et rembourser toute somme perçue.'
        ]
      },
      {
        heading: '5. Livraison et délais (spécifique précommande)',
        blocks: [
          '• Zones de livraison : France métropolitaine, Belgique, DOM-TOM et international selon les options proposées au paiement. Transporteurs : Colissimo, Mondial Relay et autres transporteurs indiqués selon la destination.',
          preorderCgvDelay(),
          'En cas de retard ou d’indisponibilité rendant la livraison impossible dans le délai annoncé, la cliente en est informée sans délai. Elle peut alors maintenir sa commande ou demander l’annulation et le remboursement intégral des sommes versées, recréditées sous 14 jours sur le moyen de paiement utilisé.',
          'La livraison est réputée effectuée à la remise du colis au transporteur désigné par la cliente (ou à la réception, en cas de perte/avarie). Toute anomalie (colis endommagé, produit manquant) doit être signalée à bonjour@kurlabeauty.fr dans les 72 h suivant la réception.'
        ]
      },
      {
        heading: '6. Droit de rétractation',
        blocks: [
          'Conformément aux articles L. 221-18 et suivants du Code de la consommation, la cliente dispose d’un délai de 14 jours à compter de la RÉCEPTION du produit (et non de la commande) pour se rétracter, sans avoir à motiver sa décision.',
          '• Précommande : avant expédition, la cliente peut en outre annuler sa précommande à tout moment, simplement, et obtenir le remboursement intégral.',
          'Pour exercer ce droit, il suffit d’écrire à bonjour@kurlabeauty.fr en indiquant le numéro de commande (ORD-…). Un accusé de réception est envoyé, puis le remboursement intervient sous 14 jours sur le moyen de paiement d’origine.',
          'Les produits retournés doivent être non utilisés, non descellés et dans leur emballage d’origine. Exception (art. L. 221-28, 5°) : les produits cosmétiques descellés après livraison (pour des raisons d’hygiène et de protection de la santé) ne peuvent pas être repris s’ils ont été ouverts ou entamés.',
          'Les frais de retour sont à la charge de la cliente sauf produit défectueux ou non conforme (article 7). La preuve d’expédition du retour doit être conservée.'
        ]
      },
      {
        heading: '7. Garanties légales et produits défectueux',
        blocks: [
          'KURLA Beauty garantit la conformité des produits (garantie légale de conformité, art. L. 217-4 et s. du Code de la consommation) et contre les vices cachés (art. 1641 et s. du Code civil).',
          'En cas de produit défectueux, endommagé à la livraison ou non conforme, la cliente contacte bonjour@kurlabeauty.fr : échange, remboursement ou avoir, au choix de la cliente dans les conditions légales, avec prise en charge des frais de retour par KURLA Beauty.',
          'Les cosmétiques sont à utiliser selon les précautions d’emploi figurant sur l’emballage. En cas de réaction cutanée, cesser l’usage et consulter un professionnel de santé ; la fiche produit et l’assistant KURLA fournissent des informations cosmétiques générales qui ne remplacent pas un avis médical.'
        ]
      },
      {
        heading: '8. Données personnelles',
        blocks: [
          'Les données collectées (identité, email, adresse, historique de commandes, réponses aux diagnostics) sont traitées pour gérer les commandes, la livraison et le suivi client, conformément à la Politique de confidentialité.',
          'Conformément au RGPD et à la loi Informatique et Libertés, la cliente dispose d’un droit d’accès, de rectification, d’effacement, de limitation et d’opposition, exercable à bonjour@kurlabeauty.fr. KURLA Beauty ne revend aucune donnée personnelle.'
        ]
      },
      {
        heading: '9. Médiation et règlement des litiges',
        blocks: [
          'En cas de litige non résolu avec le service client, la cliente peut recourir gratuitement à un médiateur de la consommation (médiateur référencé à désigner avant la mise en production réelle) dans un délai d’un an à compter de la réclamation écrite.',
          'La Commission européenne met également à disposition une plateforme de règlement en ligne des litiges : https://webgate.ec.europa.eu/odr.',
          'Les présentes CGV sont soumises au droit français. À défaut d’accord amiable, le litige sera porté devant les juridictions françaises compétentes.'
        ]
      }
    ],
    updated: '1er septembre 2026 — version pré-lancement (précommandes).'
  },

  confidentialite: {
    eyebrow: 'Données et confiance',
    title: 'Politique de confidentialité',
    intro:
      'KURLA Beauty s’engage à protéger les données personnelles de ses clientes. Cette politique explique quelles données sont utilisées, pourquoi, pendant combien de temps et comment exercer ses droits.',
    notice:
      'Les coordonnées complètes du responsable de traitement et du délégué à la protection des données (DPO) seront renseignées à l’immatriculation de la société, avant la mise en production réelle.',
    sections: [
      {
        heading: 'Données collectées',
        blocks: [
          'Selon les fonctionnalités utilisées : identité, adresse email, adresse de livraison, historique de commandes, préférences capillaires/cutanées, réponses aux diagnostics, conversations avec l’assistant et, avec votre consentement, contenus (photos) que vous choisissez d’envoyer.'
        ]
      },
      {
        heading: 'Données beauté et photos',
        blocks: [
          'Les réponses relatives aux cheveux, à la peau et aux habitudes, ainsi que les photos éventuelles, sont limitées à ce qui est nécessaire au service, protégées et conservées pour une durée définie. Vous pouvez les supprimer à tout moment depuis votre espace.'
        ]
      },
      {
        heading: 'Utilisation de l’IA',
        blocks: [
          'L’assistant fournit des informations cosmétiques et pédagogiques ; il ne pose pas de diagnostic médical et ne remplace pas un professionnel de santé.',
          'Les conversations ne sont pas cédées à des tiers. KURLA Beauty précisera, avant toute mise en œuvre, si des échanges anonymisés servent à améliorer le service ; aucun entraînement de modèle tiers ne sera réalisé sur vos données identifiables sans consentement explicite.'
        ]
      },
      {
        heading: 'Partage et sous-traitants',
        blocks: [
          '• Hébergement et base de données : Supabase Inc.',
          '• Paiement : Stripe (données bancaires traitées uniquement par Stripe).',
          '• Emails transactionnels : un fournisseur d’envoi d’emails (Resend/SendGrid/Postmark selon la configuration).',
          '• Hébergement du site : Vercel Inc.',
          'Ces prestataires agissent pour le compte de KURLA Beauty et sont soumis à des obligations de confidentialité et de sécurité ; les garanties applicables aux transferts hors Union européenne sont documentées.'
        ]
      },
      {
        heading: 'Vos droits',
        blocks: [
          'Vous pouvez demander l’accès, la rectification, l’export, la limitation ou la suppression de vos données, retirer certains consentements et définir des directives post-mortem, en écrivant à bonjour@kurlabeauty.fr. Une réponse est apportée sous un délai d’un mois. Vous disposez également d’un droit de réclamation auprès de la CNIL (cnil.fr).'
        ]
      },
      {
        heading: 'Sécurité et conservation',
        blocks: [
          'KURLA Beauty met en œuvre des mesures techniques et organisationnelles adaptées (chiffrement, accès restreint, journalisation). Les données sont supprimées ou anonymisées lorsqu’elles ne sont plus nécessaires aux finalités annoncées, et au plus tard à l’expiration des obligations légales de conservation (notamment comptables et fiscales).'
        ]
      }
    ],
    updated: '1er septembre 2026.'
  }
};

export const LegalPage: React.FC<LegalPageProps> = ({ kind }) => {
  const page = content[kind];

  return (
    <main className="min-h-screen pt-32 pb-24 bg-[#FFFDF9] text-[#111111]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <a href="/" className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] font-semibold mb-8 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à l’accueil
        </a>

        <header className="max-w-2xl mb-10">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold">{page.eyebrow}</span>
          <h1 className="mt-2 text-3xl sm:text-5xl font-serif-title font-bold text-[#111111]">{page.title}</h1>
          <p className="mt-4 text-sm sm:text-base text-[#111111]/75 leading-relaxed">{page.intro}</p>
        </header>

        {page.notice && (
          <div className="mb-8 p-5 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] flex items-start gap-3 text-sm">
            {kind === 'cgv' ? (
              <ShieldCheck className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
            )}
            <p className="text-[#111111]/75 leading-relaxed">{page.notice}</p>
          </div>
        )}

        <div className="space-y-4">
          {page.sections.map(section => (
            <section key={section.heading} className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8E1DA] shadow-sm">
              <h2 className="text-lg sm:text-xl font-serif-title font-bold text-[#111111]">{section.heading}</h2>
              <div className="mt-3 space-y-3">
                {section.blocks.map((block, i) =>
                  isBullet(block) ? (
                    <p key={i} className="flex gap-2 text-sm text-[#111111]/75 leading-relaxed">
                      <span className="text-[#C8753D] mt-[2px]">•</span>
                      <span>{block.slice(2)}</span>
                    </p>
                  ) : (
                    <p key={i} className="text-sm text-[#111111]/75 leading-relaxed">{block}</p>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-xs text-[#111111]/50">Dernière mise à jour : {page.updated}</p>
      </div>
    </main>
  );
};
