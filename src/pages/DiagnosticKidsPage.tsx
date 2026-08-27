import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Baby, Heart, LockKeyhole, ShieldCheck } from 'lucide-react';
import { navigate } from '../lib/router';

export const DiagnosticKidsPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [age, setAge] = useState('child');
  const [painLevel, setPainLevel] = useState('pleure');
  const [timeAvailable, setTimeAvailable] = useState('20min');
  const [parentalConsent, setParentalConsent] = useState(false);

  const goTo = (nextStep: number) => setStep(nextStep);
  const finish = () => {
    if (!parentalConsent) return;
    // The prototype result route carries no child-identifying data. A future
    // account flow will persist only the age band after the guardian consent.
    navigate('/diagnostic/resultat/kids-latest');
  };

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2"><div className="flex justify-between text-xs text-[#C8753D] font-bold uppercase tracking-wider"><span>Diagnostic KURLA Kids · Étape {step} / 4</span><span>{Math.round((step / 4) * 100)}%</span></div><div className="w-full h-2 rounded-full bg-[#E8E1DA] overflow-hidden"><div className="h-full bg-[#C8753D] transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} /></div></div>

        <div className="p-8 sm:p-12 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] shadow-sm">
          {step === 1 && <div className="space-y-6"><span className="text-xs uppercase font-bold text-[#C8753D] block">1. Tranche d’âge</span><h2 className="text-2xl font-serif-title font-bold">Pour quelle tranche d’âge préparez-vous une routine ?</h2><p className="text-xs text-[#111111]/60">KURLA ne demande pas de date de naissance exacte. Choisissez seulement la tranche utile pour filtrer les produits documentés.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[{ id: 'baby', title: 'Bébé · 0 à 2 ans', desc: 'Priorité à la douceur et à la supervision' }, { id: 'child', title: 'Enfant · 3 à 11 ans', desc: 'Démêlage et routines adaptées' }, { id: 'teen', title: 'Adolescent · 12 à 17 ans', desc: 'Autonomie progressive et peau' }].map(item => <button key={item.id} onClick={() => { setAge(item.id); goTo(2); }} className={`p-4 rounded-2xl border text-left transition-all ${age === item.id ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#FFFDF9] border-[#E8E1DA] text-[#111111]'}`}><div className="font-bold text-sm mb-1">{item.title}</div><div className="text-xs opacity-80">{item.desc}</div></button>)}</div></div>}

          {step === 2 && <div className="space-y-6"><span className="text-xs uppercase font-bold text-[#C8753D] block">2. Confort</span><h2 className="text-2xl font-serif-title font-bold">Comment se passe le démêlage actuellement ?</h2><div className="grid grid-cols-1 gap-3">{[{ id: 'pleure', title: 'Très difficile : pleurs, cris ou douleur', desc: 'Le geste doit être interrompu et adapté' }, { id: 'moyen', title: 'Moyen : impatience ou inconfort', desc: 'Besoin d’une routine plus courte' }, { id: 'facile', title: 'Facile : moment agréable', desc: 'Recherche d’un entretien simple' }].map(item => <button key={item.id} onClick={() => { setPainLevel(item.id); goTo(3); }} className={`p-4 rounded-2xl border text-left transition-all ${painLevel === item.id ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#FFFDF9] border-[#E8E1DA] text-[#111111]'}`}><div className="font-bold text-sm mb-1">{item.title}</div><div className="text-xs opacity-80">{item.desc}</div></button>)}</div><button className="text-xs text-[#C8753D] flex items-center gap-1" onClick={() => goTo(1)}><ArrowLeft className="w-3.5 h-3.5" /> Modifier l’âge</button></div>}

          {step === 3 && <div className="space-y-6"><span className="text-xs uppercase font-bold text-[#C8753D] block">3. Temps disponible</span><h2 className="text-2xl font-serif-title font-bold">Combien de temps souhaitez-vous consacrer au soin par semaine ?</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[{ id: '20min', title: '20 minutes maximum', desc: 'Routine courte et réaliste' }, { id: '40min', title: '40 minutes', desc: 'Soin complet avec temps partagé' }].map(item => <button key={item.id} onClick={() => { setTimeAvailable(item.id); goTo(4); }} className={`p-4 rounded-2xl border text-left transition-all ${timeAvailable === item.id ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#FFFDF9] border-[#E8E1DA] text-[#111111]'}`}><div className="font-bold text-sm mb-1">{item.title}</div><div className="text-xs opacity-80">{item.desc}</div></button>)}</div></div>}

          {step === 4 && <div className="space-y-6"><span className="text-xs uppercase font-bold text-[#C8753D] block">4. Autorisation parentale</span><h2 className="text-2xl font-serif-title font-bold">Avant de voir les recommandations Kids</h2><div className="p-5 rounded-2xl bg-white border border-[#E8E1DA] space-y-3 text-sm"><div className="flex gap-3"><ShieldCheck className="w-5 h-5 text-[#C8753D] shrink-0" /><p>Les suggestions seront limitées aux produits avec âge recommandé et sécurité mineur documentés. Les actifs réservés aux adultes restent exclus.</p></div><div className="flex gap-3"><LockKeyhole className="w-5 h-5 text-[#C8753D] shrink-0" /><p>Ce diagnostic ne demande ni nom complet, ni date de naissance exacte, ni photo. Les données d’un mineur ne sont pas partagées avec des tiers.</p></div></div><label className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900"><input type="checkbox" checked={parentalConsent} onChange={event => setParentalConsent(event.target.checked)} className="mt-0.5" /><span>Je suis le parent ou représentant légal et j’autorise KURLA à utiliser cette tranche d’âge et ces réponses pour afficher une routine cosmétique adaptée. Je peux retirer cette autorisation dans l’espace Famille.</span></label><button onClick={finish} disabled={!parentalConsent} className="w-full py-3.5 rounded-full bg-[#C8753D] text-white text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-2">Voir le résultat <ArrowRight className="w-4 h-4" /></button><button className="text-xs text-[#C8753D] flex items-center gap-1" onClick={() => goTo(3)}><ArrowLeft className="w-3.5 h-3.5" /> Retour</button></div>}
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-[#1A0F0A] text-[#FFF7EF] text-xs flex gap-3"><Baby className="w-5 h-5 text-[#D49A63] shrink-0" /><p><strong className="block mb-1">Sécurité d’abord.</strong>Ce diagnostic est cosmétique. En cas de douleur persistante, irritation, lésion ou réaction, arrêtez le produit et demandez l’avis d’un professionnel de santé.</p></div>
      </div>
    </div>
  );
};
