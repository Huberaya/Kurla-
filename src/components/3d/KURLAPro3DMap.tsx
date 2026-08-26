import React, { useState } from 'react';
import { MapPin, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';

interface CityMarker {
  id: string;
  name: string;
  count: number;
  topSpecialty: string;
  x: number; // Percentage offset on map
  y: number;
}

const CITIES: CityMarker[] = [
  { id: 'paris', name: 'Paris', count: 14, topSpecialty: 'Master Knotless & Locks', x: 48, y: 32 },
  { id: 'lyon', name: 'Lyon', count: 8, topSpecialty: 'Microlocks & Soins Bio', x: 62, y: 58 },
  { id: 'nantes', name: 'Nantes', count: 6, topSpecialty: 'Skincare Peau Mélaninée', x: 28, y: 44 },
  { id: 'marseille', name: 'Marseille', count: 9, topSpecialty: 'Barber & Protective Styles', x: 68, y: 78 },
  { id: 'bordeaux', name: 'Bordeaux', count: 5, topSpecialty: 'Démêlage Enfant & Braids', x: 32, y: 68 },
  { id: 'bruxelles', name: 'Bruxelles', count: 7, topSpecialty: 'Coiffure Afro Multi-Texture', x: 52, y: 16 },
];

export const KURLAPro3DMap: React.FC<{ onSelectCity?: (city: string) => void }> = ({ onSelectCity }) => {
  const [selectedCity, setSelectedCity] = useState<CityMarker>(CITIES[0]);

  return (
    <div className="relative w-full rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-6 md:p-8 overflow-hidden shadow-sm text-[#111111]">
      {/* Background Grid & Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(200,117,61,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(200,117,61,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60 pointer-events-none" />

      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-[#C8753D]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Interactive Map Visual */}
        <div className="lg:col-span-7 relative h-[340px] md:h-[380px] w-full bg-[#FFFDF9] rounded-2xl border border-[#E8E1DA] p-4 flex flex-col justify-between overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#C8753D] tracking-widest uppercase font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C8753D]" /> Villes Pilotes Europe KURLA Pro
            </span>
            <span className="bg-[#C8753D]/10 text-[#C8753D] px-2.5 py-0.5 rounded-full border border-[#C8753D]/20">
              Charte Qualité Certifiée
            </span>
          </div>

          {/* Map canvas container */}
          <div className="relative w-full h-[260px] md:h-[300px] flex items-center justify-center">
            {/* Stylized France/Europe outline vector */}
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-25 stroke-[#C8753D] fill-none stroke-[0.8]">
              <path d="M 45,10 C 60,12 75,20 70,35 C 78,45 80,60 72,75 C 65,85 55,90 40,85 C 25,82 15,65 20,45 C 22,30 35,15 45,10 Z" />
              <path d="M 50,15 L 50,85 M 20,50 L 80,50" strokeDasharray="1 3" strokeWidth="0.4" />
            </svg>

            {/* Pulsing City Markers */}
            {CITIES.map((city) => {
              const isSelected = selectedCity.id === city.id;
              return (
                <button
                  key={city.id}
                  onClick={() => {
                    setSelectedCity(city);
                    if (onSelectCity) onSelectCity(city.name);
                  }}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 ${
                    isSelected ? 'z-30 scale-125' : 'z-20 hover:scale-110'
                  }`}
                  style={{ left: `${city.x}%`, top: `${city.y}%` }}
                  aria-label={`Ville ${city.name}`}
                >
                  {/* Ripple pulse ring */}
                  <span className={`absolute -inset-3 rounded-full opacity-75 animate-ping ${
                    isSelected ? 'bg-[#C8753D]' : 'bg-[#D49A63]/40'
                  }`} />

                  {/* Pin Dot */}
                  <div className={`relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md border ${
                    isSelected
                      ? 'bg-[#C8753D] text-white border-white ring-2 ring-[#C8753D]/50'
                      : 'bg-[#FFFDF9] text-[#111111] border-[#E8E1DA] group-hover:border-[#C8753D]'
                  }`}>
                    {city.count}
                  </div>

                  {/* Tooltip on marker */}
                  <div className={`absolute left-1/2 -bottom-7 transform -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold px-2 py-0.5 rounded shadow-md transition-opacity duration-200 ${
                    isSelected ? 'bg-[#C8753D] text-white opacity-100' : 'bg-[#111111] text-white opacity-0 group-hover:opacity-100'
                  }`}>
                    {city.name}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-[#111111]/50 text-end italic">
            Clique sur une ville pour voir les experts certifiés KURLA
          </p>
        </div>

        {/* Right Side: Selected City Details */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold border border-[#C8753D]/20 mb-4 w-fit">
            <ShieldCheck className="w-4 h-4" /> KURLA Pro Verified
          </div>

          <h3 className="text-2xl font-serif-title font-bold text-[#111111] mb-2 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#C8753D]" /> {selectedCity.name}
          </h3>

          <p className="text-sm text-[#111111]/75 mb-4 font-light">
            {selectedCity.count} professionnels de beauté texturée & peaux mélaninées actuellement disponibles et vérifiés par notre charte qualité.
          </p>

          <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] mb-6 space-y-2 shadow-xs">
            <div className="flex justify-between text-xs">
              <span className="text-[#111111]/60">Spécialité dominante :</span>
              <span className="text-[#C8753D] font-semibold">{selectedCity.topSpecialty}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#111111]/60">Garantie KURLA :</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> 100% Produits Adaptés
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`/professionnels?city=${selectedCity.name}`}
              className="px-5 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm transition-all duration-200 text-center shadow-md shadow-[#C8753D]/20"
            >
              Voir les pros à {selectedCity.name}
            </a>
            <a
              href="/professionnels/rejoindre"
              className="px-5 py-3 rounded-full bg-[#FFFDF9] hover:bg-[#E8E1DA] text-[#111111] border border-[#E8E1DA] font-medium text-sm transition-all duration-200 text-center"
            >
              Devenir pro KURLA
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
