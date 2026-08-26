import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

interface LegalPageProps {
  kind: 'cgv' | 'confidentialite';
}

const content = {
  cgv: {
    eyebrow: 'Informations légales',
    title: 'Conditions générales de vente',
    intro: 'Cette page présente les règles applicables aux achats réalisés sur KURLA Beauty. Elle doit être relue et complétée avec les informations juridiques définitives de KURLA Beauty avant toute ouverture commerciale.',
    sections: [
      ['Éditeur et contact', 'KURLA Beauty SAS — informations de société, adresse, email du service client et numéro d’immatriculation à compléter avant la mise en production.'],
      ['Produits et disponibilité', 'Les produits, leurs caractéristiques essentielles, leur prix TTC, leur disponibilité et les éventuelles restrictions par pays doivent être présentés avant la validation de la commande.'],
      ['Commande et paiement', 'La commande est confirmée après validation du paiement par notre prestataire de paiement. Les prix affichés sont ceux applicables au moment de la commande.'],
      ['Livraison', 'Le pays de livraison, les frais, le transporteur et le délai estimé doivent être affichés avant le paiement. Les délais peuvent varier selon la destination et la disponibilité.'],
      ['Rétractation et retours', 'Les modalités de rétractation, les exceptions applicables aux produits cosmétiques ouverts et la procédure de retour doivent être précisées pour chaque marché desservi.'],
      ['Médiation et litiges', 'Les coordonnées du service client, du médiateur compétent et les règles applicables doivent être complétées avant le lancement commercial.'],
    ]
  },
  confidentialite: {
    eyebrow: 'Données et confiance',
    title: 'Politique de confidentialité',
    intro: 'KURLA Beauty doit expliquer de manière claire quelles données sont utilisées, pourquoi, pendant combien de temps et comment exercer ses droits. Cette version constitue une structure de transparence à compléter avec les informations définitives du responsable de traitement.',
    sections: [
      ['Données collectées', 'Selon les fonctionnalités utilisées : identité, email, téléphone, commandes, préférences, réponses aux diagnostics, conversations avec l’assistant et contenus envoyés avec votre consentement.'],
      ['Données beauté et photos', 'Les réponses relatives aux cheveux, à la peau, aux habitudes et les photos éventuelles doivent être limitées à ce qui est nécessaire, protégées et conservées pendant une durée définie.'],
      ['Utilisation de l’IA', 'L’assistant fournit des informations cosmétiques et ne remplace pas un professionnel de santé. KURLA doit préciser si les conversations servent à améliorer le service ou à entraîner un modèle.'],
      ['Partage et sous-traitants', 'Les prestataires d’hébergement, paiement, email, analytique et IA doivent être identifiés, avec les garanties applicables aux transferts internationaux.'],
      ['Vos droits', 'Vous pouvez demander l’accès, la rectification, l’export, la limitation ou la suppression de vos données, ainsi que retirer certains consentements. Les coordonnées et modalités de demande doivent être complétées.'],
      ['Sécurité et conservation', 'KURLA met en place des mesures de sécurité adaptées et supprime ou anonymise les données lorsqu’elles ne sont plus nécessaires à la finalité annoncée.'],
    ]
  }
} as const;

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

        <div className="mb-8 p-5 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] flex items-start gap-3 text-sm">
          <ShieldCheck className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
          <p className="text-[#111111]/75 leading-relaxed">
            <strong className="text-[#111111]">Document à finaliser avant production.</strong> Cette page évite un lien légal vide, mais ne constitue pas un avis juridique et doit être validée par KURLA Beauty et ses conseils.
          </p>
        </div>

        <div className="space-y-4">
          {page.sections.map(([title, text]) => (
            <section key={title} className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8E1DA] shadow-sm">
              <h2 className="text-lg sm:text-xl font-serif-title font-bold text-[#111111]">{title}</h2>
              <p className="mt-2 text-sm text-[#111111]/75 leading-relaxed">{text}</p>
            </section>
          ))}
        </div>

        <p className="mt-8 text-xs text-[#111111]/50">Dernière mise à jour : 26 août 2026 — version de préparation produit.</p>
      </div>
    </main>
  );
};
