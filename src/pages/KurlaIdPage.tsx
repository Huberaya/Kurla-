import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { BeautyProfileEditor } from '../components/BeautyProfileEditor';
import { WhyItMatters } from '../components/account/WhyItMatters';

export const KurlaIdPage: React.FC = () => {
  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <a href="/account" className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] font-semibold mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à mon compte
        </a>

        <WhyItMatters featureId="kurla-id" variant="card" defaultOpen />
        <BeautyProfileEditor focus="all" />
      </div>
    </div>
  );
};
