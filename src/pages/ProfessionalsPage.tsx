import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, MapPin, Search, CheckCircle2, ArrowRight, Video, Info } from 'lucide-react';
import { KURLAPro3DMap } from '../components/3d/KURLAPro3DMap';
import { VirtualConsultationSection } from '../components/VirtualConsultationSection';
import { ConsultationBookingModal } from '../components/ConsultationBookingModal';

/**
 * Annuaire KURLA Pro.
 *
 * Cette page lisait auparavant `MOCK_PROS` : de faux noms, de faux avatars,
 * des notes à 4,98, des nombres d'avis inventés et des adresses réelles, le
 * tout marqué `verified: true`. Pour une plateforme dont la promesse est la
 * confiance vérifiée, c'était le passif le plus grave du dépôt.
 *
 * Désormais : seuls les profils approuvés par un administrateur sont affichés,
 * sans note ni avis tant qu'aucun avis réel n'existe. Un annuaire vide est un
 * état honnête, pas un bug à masquer.
 */
interface PublicProfessional {
  id: string;
  name: string;
  city: string;
  profession: string;
  experience: string;
  portfolioUrl?: string;
  verified: boolean;
}

export const ProfessionalsPage: React.FC = () => {
  const [cityFilter, setCityFilter] = useState('toutes');
  const [searchQuery, setSearchQuery] = useState('');
  const [professionals, setProfessionals] = useState<PublicProfessional[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedProForBooking, setSelectedProForBooking] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/professionals')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('annuaire indisponible'))))
      .then(payload => {
        if (cancelled) return;
        setProfessionals(Array.isArray(payload?.professionals) ? payload.professionals : []);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const handleOpenBooking = (proId?: string) => {
    setSelectedProForBooking(proId);
    setIsBookingModalOpen(true);
  };

  // Les villes proposées sont déduites de l'annuaire réel : proposer « Lyon »
  // alors qu'aucun professionnel n'y est vérifié serait une promesse vide.
  const cities = useMemo(() => {
    const available = Array.from(new Set<string>(professionals.map(pro => pro.city))).sort((a, b) => a.localeCompare(b, 'fr'));
    return ['toutes', ...available];
  }, [professionals]);

  const filteredPros = useMemo(() => professionals.filter(pro => {
    const matchesCity = cityFilter === 'toutes' || pro.city.toLowerCase() === cityFilter.toLowerCase();
    const needle = searchQuery.trim().toLowerCase();
    const matchesSearch = needle === ''
      || pro.name.toLowerCase().includes(needle)
      || pro.profession.toLowerCase().includes(needle)
      || pro.experience.toLowerCase().includes(needle);
    return matchesCity && matchesSearch;
  }), [professionals, cityFilter, searchQuery]);

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

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

        <VirtualConsultationSection onOpenBookingModal={handleOpenBooking} />

        <div className="mb-12">
          <KURLAPro3DMap />
        </div>

        {professionals.length > 0 && (
          <div className="p-4 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 mb-12 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#C8753D] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Rechercher une spécialité (Knotless, Microlocks, Skincare)…"
                className="w-full pl-11 pr-4 py-3 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              {cities.map(city => (
                <button
                  key={city}
                  type="button"
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
        )}

        {!loaded && (
          <p className="text-sm text-[#FFF7EF]/50 text-center py-16">Chargement de l’annuaire vérifié…</p>
        )}

        {loaded && loadError && (
          <div className="max-w-xl mx-auto text-center py-16 px-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
            <Info className="w-6 h-6 text-[#D49A63] mx-auto mb-3" />
            <p className="text-sm text-[#FFF7EF]/75">L’annuaire est momentanément indisponible. KURLA préfère ne rien afficher plutôt que de présenter des profils non vérifiés.</p>
          </div>
        )}

        {loaded && !loadError && professionals.length === 0 && (
          <div className="max-w-2xl mx-auto text-center py-16 px-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
            <ShieldCheck className="w-8 h-8 text-[#C8753D] mx-auto mb-4" />
            <h2 className="text-xl font-serif-title font-bold mb-3">Aucun professionnel vérifié pour le moment</h2>
            <p className="text-sm text-[#FFF7EF]/70 font-light leading-relaxed mb-6">
              KURLA n’affiche que des profils dont l’identité et l’expérience ont été contrôlées. Tant qu’aucune candidature
              n’a été approuvée, cet annuaire reste vide — nous préférons cela plutôt que d’inventer des profils.
            </p>
            <a
              href="/professionnels/rejoindre"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-semibold transition-all"
            >
              Rejoindre le réseau KURLA Pro <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}

        {loaded && !loadError && professionals.length > 0 && filteredPros.length === 0 && (
          <p className="text-sm text-[#FFF7EF]/60 text-center py-16">Aucun professionnel ne correspond à cette recherche.</p>
        )}

        {loaded && !loadError && filteredPros.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredPros.map(pro => (
              <div
                key={pro.id}
                className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 hover:border-[#C8753D]/40 transition-all p-6 flex flex-col justify-between shadow-xl group"
              >
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-1.5">
                      {pro.name}
                      {pro.verified && <CheckCircle2 className="w-4 h-4 text-[#C8753D]" title="Identité vérifiée par KURLA" />}
                    </h3>
                    <p className="text-xs text-[#D49A63] font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {pro.city}
                    </p>
                  </div>

                  <p className="text-xs font-semibold text-[#FFF7EF]/90 mb-1">{pro.profession}</p>
                  <p className="text-xs text-[#FFF7EF]/70 font-light line-clamp-4 mb-4">{pro.experience}</p>

                  {/* Aucune note ni aucun avis ne sont affichés : tant qu'il n'y a
                      pas d'avis réel, afficher un chiffre serait une invention. */}
                  <p className="text-[10px] text-[#FFF7EF]/45 italic mb-4">
                    Identité vérifiée. Aucun avis client pour le moment.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleOpenBooking(pro.id)}
                    className="w-full py-2.5 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Video className="w-3.5 h-3.5" /> Demander une consultation
                  </button>

                  {pro.portfolioUrl && (
                    <a
                      href={pro.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl bg-[#050403] hover:bg-[#1A0F0A] text-[#FFF7EF]/80 hover:text-white border border-[#FFF7EF]/10 text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5"
                    >
                      Voir le portfolio <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <ConsultationBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        preSelectedProId={selectedProForBooking}
      />
    </div>
  );
};
