import React, { useState } from 'react';
import { Star, MapPin, CheckCircle2, ShieldCheck, Calendar, Clock, ArrowLeft, Video } from 'lucide-react';
import { MOCK_PROS } from '../data/mockData';
import { ConsultationBookingModal } from '../components/ConsultationBookingModal';
import { NotFoundPage } from './NotFoundPage';

interface ProProfilePageProps {
  slug: string;
}

export const ProProfilePage: React.FC<ProProfilePageProps> = ({ slug }) => {
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isVisioModalOpen, setIsVisioModalOpen] = useState(false);

  const pro = MOCK_PROS.find(p => p.slug === slug);
  if (!pro) return <NotFoundPage />;

  const handleBook = (serviceName: string) => {
    setSelectedService(serviceName);
    setBookingSuccess(true);
  };

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        <a href="/professionnels" className="inline-flex items-center gap-2 text-xs font-semibold text-[#D49A63] hover:text-[#FFF7EF] mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour à l'annuaire des pros
        </a>

        {/* Pro Header Card */}
        <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 shadow-2xl mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <img src={pro.avatar} alt={pro.name} className="w-24 h-24 rounded-full object-cover border-4 border-[#C8753D]/50 shadow-xl" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#FFF7EF]">{pro.name}</h1>
                {pro.certified && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C8753D]/20 text-[#D49A63] text-xs font-semibold border border-[#C8753D]/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> KURLA Certified
                  </span>
                )}
              </div>
              <p className="text-sm text-[#D49A63] font-medium mb-2">{pro.title}</p>
              <div className="flex items-center gap-4 text-xs text-[#FFF7EF]/70">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#C8753D]" /> {pro.address} ({pro.city})</span>
                <span className="flex items-center gap-1 text-amber-400 font-bold"><Star className="w-3.5 h-3.5 fill-current" /> {pro.rating} ({pro.reviewCount} avis)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsVisioModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Video className="w-4 h-4 animate-pulse" />
              <span>Réserver Consultation Visio Privée (30 min)</span>
            </button>

            <div className="p-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 text-xs text-[#FFF7EF]/70 max-w-xs">
              <ShieldCheck className="w-4 h-4 text-[#C8753D] mb-1" />
              <p><strong>Charte KURLA :</strong> Hygiène stricte, conseils personnalisés et bienveillance sans jugement de texture.</p>
            </div>
          </div>
        </div>

        {/* Success Modal Notification */}
        {bookingSuccess && (
          <div className="p-6 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <h4 className="font-bold text-sm">Demande préparée — fonctionnalité bêta</h4>
                <p className="text-xs font-light">Service sélectionné : {selectedService}. Aucune réservation n’est encore créée ; le service sera disponible après connexion du calendrier KURLA Pro.</p>
              </div>
            </div>
            <button onClick={() => setBookingSuccess(false)} className="text-xs underline text-emerald-400">Fermer</button>
          </div>
        )}

        {/* Content 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left: Services Menu */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">Prestations & Tarifs</h2>

            <div className="space-y-4">
              {pro.services.map((svc, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 flex items-center justify-between gap-4 hover:border-[#C8753D]/40 transition-all">
                  <div>
                    <h3 className="text-base font-serif-title font-bold text-[#FFF7EF] mb-1">{svc.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-[#FFF7EF]/50">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#D49A63]" /> {svc.duration}</span>
                      <span>•</span>
                      <span>Texture 4A-4C / Boucles / Locks</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold text-[#FFF7EF] block">{svc.price.toFixed(2)} €</span>
                    <button
                      onClick={() => handleBook(svc.name)}
                      className="mt-2 px-4 py-1.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold transition-all"
                    >
                      Réserver
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bio */}
            <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-3">
              <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF]">À propos de {pro.name}</h3>
              <p className="text-sm text-[#FFF7EF]/80 font-light leading-relaxed">{pro.bio}</p>
            </div>
          </div>

          {/* Right: Certified Badges & Reviews */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4">
              <h3 className="text-base font-serif-title font-bold text-[#FFF7EF]">Spécialités Validées</h3>
              <div className="flex flex-wrap gap-2">
                {pro.specialties.map((s, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-[#050403] text-xs text-[#D49A63] border border-[#C8753D]/30">
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4">
              <h3 className="text-base font-serif-title font-bold text-[#FFF7EF]">Derniers Avis Clientes</h3>
              <div className="space-y-4">
                {[
                  { author: 'Sonia T.', rating: 5, comment: 'Prestation Knotless incroyable, aucune douleur au cuir chevelu. Très professionnelle.' },
                  { author: 'Clarisse M.', rating: 5, comment: 'Bilan de porosité super clair et conseils personnalisés pour la pousse.' },
                ].map((rev, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/5 space-y-1">
                    <div className="flex justify-between text-xs text-[#FFF7EF]">
                      <span className="font-bold">{rev.author}</span>
                      <span className="text-amber-400">★★★★★</span>
                    </div>
                    <p className="text-xs text-[#FFF7EF]/70 font-light italic">"{rev.comment}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Visio Booking Modal */}
        <ConsultationBookingModal
          isOpen={isVisioModalOpen}
          onClose={() => setIsVisioModalOpen(false)}
          preSelectedProId={pro.id}
        />
      </div>
    </div>
  );
};

