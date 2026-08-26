import React, { useState } from 'react';
import { ShieldCheck, Star, MapPin, Search, CheckCircle2, ArrowRight, Video } from 'lucide-react';
import { MOCK_PROS } from '../data/mockData';
import { KURLAPro3DMap } from '../components/3d/KURLAPro3DMap';
import { VirtualConsultationSection } from '../components/VirtualConsultationSection';
import { ConsultationBookingModal } from '../components/ConsultationBookingModal';

export const ProfessionalsPage: React.FC = () => {
  const [cityFilter, setCityFilter] = useState('toutes');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Consultation Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedProForBooking, setSelectedProForBooking] = useState<string | undefined>(undefined);

  const handleOpenBooking = (proId?: string) => {
    setSelectedProForBooking(proId);
    setIsBookingModalOpen(true);
  };

  const cities = ['toutes', 'Paris', 'Lyon', 'Bruxelles', 'Nantes'];

  const filteredPros = MOCK_PROS.filter(pro => {
    const matchesCity = cityFilter === 'toutes' || pro.city.toLowerCase() === cityFilter.toLowerCase();
    const matchesSearch = pro.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pro.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          pro.bio.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesSearch;
  });

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-[520px] mx-auto mb-12">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2">
            Annuaire & Consultations KURLA Pro Certifié
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#FFF7EF] mb-3">
            Des pros qui comprennent ta texture.
          </h1>
          <p className="text-sm sm:text-base text-[#FFF7EF]/70 font-light leading-relaxed">
            Trouve des spécialistes afro & multiculturels (braiders, locticians, expertes skincare) en salon ou en consultation vidéo privée.
          </p>
        </div>

        {/* Virtual Consultation Banner */}
        <VirtualConsultationSection onOpenBookingModal={handleOpenBooking} />

        {/* 3D Map Component */}
        <div className="mb-12">
          <KURLAPro3DMap />
        </div>

        {/* Search & City Filter Bar */}
        <div className="p-4 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 mb-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#C8753D] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une spécialité (Knotless, Microlocks, Skincare)..."
              className="w-full pl-11 pr-4 py-3 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {cities.map(city => (
              <button
                key={city}
                onClick={() => setCityFilter(city)}
                className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer ${
                  cityFilter === city
                    ? 'bg-[#C8753D] text-white'
                    : 'bg-[#050403] text-[#FFF7EF]/70 border border-[#FFF7EF]/10'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Professionals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredPros.map(pro => (
            <div
              key={pro.id}
              className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 hover:border-[#C8753D]/40 transition-all p-6 flex flex-col justify-between shadow-xl group"
            >
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={pro.avatar}
                    alt={pro.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#C8753D]/50 shadow-md"
                  />
                  <div>
                    <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-1.5">
                      {pro.name}
                      {pro.certified && (
                        <CheckCircle2 className="w-4 h-4 text-[#C8753D]" title="KURLA Certified" />
                      )}
                    </h3>
                    <p className="text-xs text-[#D49A63] font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {pro.city}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-amber-400 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-[#FFF7EF]">{pro.rating}</span>
                      <span className="text-[#FFF7EF]/40">({pro.reviewCount})</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#FFF7EF]/70 font-light line-clamp-3 mb-4">
                  {pro.bio}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {pro.specialties.map((spec, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2.5 py-0.5 rounded-md bg-[#050403] text-[#FFF7EF]/80 border border-[#FFF7EF]/10"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleOpenBooking(pro.id)}
                  className="w-full py-2.5 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Video className="w-3.5 h-3.5" /> Réserver Visio (30 min)
                </button>

                <a
                  href={`/professionnels/profil/${pro.slug}`}
                  className="w-full py-2.5 rounded-xl bg-[#050403] hover:bg-[#1A0F0A] text-[#FFF7EF]/80 hover:text-white border border-[#FFF7EF]/10 text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5"
                >
                  Voir profil & salon <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Booking Calendar Modal */}
      <ConsultationBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        preSelectedProId={selectedProForBooking}
      />
    </div>
  );
};

