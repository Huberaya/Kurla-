import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Sparkles, CheckCircle, ShieldCheck, Video } from 'lucide-react';
import { coordForCity } from '../../lib/cityCoordinates';

interface ApiProfessional {
  id: string;
  name: string;
  city: string;
  profession: string;
  experience: string;
  portfolioUrl?: string;
  verified: boolean;
}

interface CityGroup {
  city: string;
  count: number;
  topSpecialty: string;
  x: number;
  y: number;
  region: string;
  professionals: ApiProfessional[];
  hasVideo?: boolean;
}

export const KURLAPro3DMap: React.FC<{ onSelectCity?: (city: string) => void }> = ({ onSelectCity }) => {
  const [professionals, setProfessionals] = useState<ApiProfessional[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/professionals')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(payload => {
        if (cancelled) return;
        setProfessionals(Array.isArray(payload?.professionals) ? payload.professionals : []);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const cityGroups: CityGroup[] = useMemo(() => {
    if (professionals.length === 0) return [];
    const map = new Map<string, ApiProfessional[]>();
    for (const p of professionals) {
      const key = p.city.trim() || 'Visio';
      const list = map.get(key) || [];
      list.push(p);
      map.set(key, list);
    }
    const groups: CityGroup[] = [];
    for (const [city, list] of map.entries()) {
      const coord = coordForCity(city);
      // spécialité la plus fréquente
      const freq = new Map<string, number>();
      for (const pro of list) freq.set(pro.profession, (freq.get(pro.profession) || 0) + 1);
      const topSpecialty = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || list[0].profession;
      groups.push({ city, count: list.length, topSpecialty, x: coord.x, y: coord.y, region: coord.region, professionals: list });
    }
    // tri : villes avec le plus de pros d'abord, pour le marqueur sélectionné par défaut
    return groups.sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, 'fr'));
  }, [professionals]);

  const [selectedCity, setSelectedCity] = useState<CityGroup | null>(null);

  useEffect(() => {
    if (cityGroups.length > 0 && !selectedCity) setSelectedCity(cityGroups[0]);
    if (cityGroups.length === 0) setSelectedCity(null);
    // si la ville sélectionnée a disparu (dernier pro parti), re-sélectionner
    if (selectedCity && !cityGroups.find(g => g.city === selectedCity.city)) {
      setSelectedCity(cityGroups[0] || null);
    }
  }, [cityGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback quand aucun pro n'est encore vérifié : on affiche les 6 villes pilotes
  // en grisé avec un compteur à 0, pour que la carte ne soit pas vide et que
  // l'appel « Devenir pro » ait un sens géographique.
  const displayGroups = cityGroups.length > 0 ? cityGroups : [];

  return (
    <div className="relative w-full rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-6 md:p-8 overflow-hidden shadow-sm text-[#111111]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(200,117,61,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(200,117,61,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60 pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-[#C8753D]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Carte */}
        <div className="lg:col-span-7 relative h-[340px] md:h-[380px] w-full bg-[#FFFDF9] rounded-2xl border border-[#E8E1DA] p-4 flex flex-col justify-between overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#C8753D] tracking-widest uppercase font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C8753D]" /> {loaded ? `${professionals.length} pros vérifiés` : 'Carte Europe KURLA Pro'}
            </span>
            <span className="bg-[#C8753D]/10 text-[#C8753D] px-2.5 py-0.5 rounded-full border border-[#C8753D]/20">
              {cityGroups.length > 0 ? `${cityGroups.length} villes` : 'Charte Qualité Certifiée'}
            </span>
          </div>

          <div className="relative w-full h-[260px] md:h-[300px] flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-25 stroke-[#C8753D] fill-none stroke-[0.8]">
              <path d="M 45,10 C 60,12 75,20 70,35 C 78,45 80,60 72,75 C 65,85 55,90 40,85 C 25,82 15,65 20,45 C 22,30 35,15 45,10 Z" />
              <path d="M 50,15 L 50,85 M 20,50 L 80,50" strokeDasharray="1 3" strokeWidth="0.4" />
            </svg>

            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-[#C8753D] bg-white/80 px-3 py-1 rounded-full border border-[#E8E1DA]">Chargement des pros…</span>
              </div>
            )}

            {loaded && displayGroups.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <MapPin className="w-8 h-8 text-[#C8753D]/40 mb-2" />
                <p className="text-sm font-semibold text-[#111111]">Aucun pro vérifié pour l'instant</p>
                <p className="text-xs text-[#111111]/60 max-w-xs mt-1">Sois le premier à apparaître sur la carte — à Paris, Lyon, Nantes, Bruxelles, partout.</p>
              </div>
            )}

            {displayGroups.map((group) => {
              const isSelected = selectedCity?.city === group.city;
              return (
                <button
                  key={group.city}
                  onClick={() => {
                    setSelectedCity(group);
                    if (onSelectCity) onSelectCity(group.city);
                  }}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 ${isSelected ? 'z-30 scale-125' : 'z-20 hover:scale-110'}`}
                  style={{ left: `${group.x}%`, top: `${group.y}%` }}
                  aria-label={`Ville ${group.city} — ${group.count} pros`}
                >
                  <span className={`absolute -inset-3 rounded-full opacity-75 animate-ping ${isSelected ? 'bg-[#C8753D]' : 'bg-[#D49A63]/40'}`} />
                  <div className={`relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md border ${isSelected ? 'bg-[#C8753D] text-white border-white ring-2 ring-[#C8753D]/50' : 'bg-[#FFFDF9] text-[#111111] border-[#E8E1DA] group-hover:border-[#C8753D]'}`}>
                    {group.count}
                  </div>
                  <div className={`absolute left-1/2 -bottom-7 transform -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold px-2 py-0.5 rounded shadow-md transition-opacity duration-200 ${isSelected ? 'bg-[#C8753D] text-white opacity-100' : 'bg-[#111111] text-white opacity-0 group-hover:opacity-100'}`}>
                    {group.city}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-[#111111]/50 text-end italic">
            {loaded && displayGroups.length > 0 ? 'Clique sur une ville pour voir ses experts' : 'Chaque candidature approuvée apparaît ici'}
          </p>
        </div>

        {/* Détails ville sélectionnée */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          {selectedCity ? (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold border border-[#C8753D]/20 mb-4 w-fit">
                <ShieldCheck className="w-4 h-4" /> {selectedCity.region} · {selectedCity.count} pro{selectedCity.count > 1 ? 's' : ''}
              </div>

              <h3 className="text-2xl font-serif-title font-bold text-[#111111] mb-2 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[#C8753D]" /> {selectedCity.city}
              </h3>

              <p className="text-sm text-[#111111]/75 mb-3 font-light">
                {selectedCity.count} professionnel{selectedCity.count > 1 ? 's' : ''} vérifié{selectedCity.count > 1 ? 's' : ''} — {selectedCity.professionals.map(p => p.name).slice(0, 3).join(', ')}{selectedCity.count > 3 ? ` +${selectedCity.count - 3}` : ''}.
              </p>

              <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] mb-4 space-y-2 shadow-xs">
                <div className="flex justify-between text-xs">
                  <span className="text-[#111111]/60">Spécialité dominante :</span>
                  <span className="text-[#C8753D] font-semibold">{selectedCity.topSpecialty}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#111111]/60">Visio disponible :</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> Oui — partout
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#111111]/60">Garantie KURLA :</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> 100% vérifiés
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-6 max-h-[140px] overflow-auto pr-1">
                {selectedCity.professionals.slice(0, 4).map(pro => (
                  <a key={pro.id} href={`/professionnels/profil/${pro.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white border border-transparent hover:border-[#E8E1DA] transition-colors">
                    <span className="w-8 h-8 rounded-full bg-[#C8753D]/15 text-[#C8753D] flex items-center justify-center text-xs font-bold shrink-0">{pro.name.trim().charAt(0).toUpperCase()}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#111111] truncate">{pro.name}</span>
                      <span className="block text-xs text-[#111111]/60 truncate">{pro.profession}</span>
                    </span>
                  </a>
                ))}
                {selectedCity.count > 4 && (
                  <a href={`/professionnels?city=${encodeURIComponent(selectedCity.city)}`} className="block text-xs text-[#C8753D] font-semibold text-center py-1">Voir les {selectedCity.count} pros →</a>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a href={`/professionnels?city=${encodeURIComponent(selectedCity.city)}`} className="px-5 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm transition-all text-center shadow-md shadow-[#C8753D]/20">
                  Voir les pros à {selectedCity.city}
                </a>
                <a href="/professionnels/rejoindre" className="px-5 py-3 rounded-full bg-[#FFFDF9] hover:bg-[#E8E1DA] text-[#111111] border border-[#E8E1DA] font-medium text-sm transition-all text-center">
                  Devenir pro KURLA
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold border border-[#C8753D]/20 mb-4 w-fit">
                <ShieldCheck className="w-4 h-4" /> Réseau vérifié
              </div>
              <h3 className="text-2xl font-serif-title font-bold text-[#111111] mb-2">Des pros partout, dès qu'ils s'inscrivent.</h3>
              <p className="text-sm text-[#111111]/70 mb-6 font-light">Aucune ville pilote : un pro à Brest, Dakar ou Lille apparaît instantanément sur la carte dès que sa candidature est approuvée.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="/professionnels" className="px-5 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm text-center">Voir l'annuaire</a>
                <a href="/professionnels/rejoindre" className="px-5 py-3 rounded-full bg-[#FFFDF9] hover:bg-[#E8E1DA] text-[#111111] border border-[#E8E1DA] font-medium text-sm text-center">Devenir pro KURLA</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
