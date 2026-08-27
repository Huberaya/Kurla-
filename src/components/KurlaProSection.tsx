import React, { useEffect, useState } from 'react';
import { ShieldCheck, MapPin, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { KURLAPro3DMap } from './3d/KURLAPro3DMap';

/**
 * Cette section lisait auparavant `MOCK_PROS` : de faux noms, de faux avatars,
 * des notes à 4,98 et des nombres d'avis inventés, le tout marqué `verified`.
 * Pour une plateforme dont la promesse est la confiance vérifiée, c'était le
 * passif le plus grave du dépôt.
 *
 * Désormais : seuls les profils approuvés par un administrateur sont affichés,
 * sans note ni avis tant qu'aucun avis réel n'existe.
 */
interface DirectoryProfessional {
  id: string;
  name: string;
  city: string;
  profession: string;
  experience: string;
  portfolioUrl?: string;
  verified: boolean;
}

export const KurlaProSection: React.FC = () => {
  const [professionals, setProfessionals] = useState<DirectoryProfessional[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/professionals')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('annuaire indisponible'))))
      .then(payload => {
        if (cancelled) return;
        setProfessionals(Array.isArray(payload?.professionals) ? payload.professionals : []);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="py-24 bg-[#FFFDF9] text-[#111111] relative border-t border-[#E8E1DA] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-16">
          <div className="lg:col-span-7 space-y-4">
            <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C8753D]" /> Charte Qualité Certifiée KURLA Pro
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] leading-tight">
              Des pros qui comprennent vraiment ta texture.
            </h2>
            <p className="text-base text-[#111111]/75 font-light max-w-[520px] leading-relaxed">
              Braiders, locticians, coiffeurs afro et expertes skincare peaux mélaninées sélectionnés selon une charte d'hygiène, d'écoute et de maîtrise de la fibre texturée.
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-wrap gap-4 lg:justify-end">
            <a
              href="/professionnels"
              className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm transition-all shadow-md shadow-[#C8753D]/20 flex items-center gap-2"
            >
              Trouver un pro <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/professionnels/rejoindre"
              className="px-6 py-3.5 rounded-full bg-[#F8F2EC] hover:bg-[#E8E1DA] border border-[#E8E1DA] text-[#111111] font-medium text-sm transition-all"
            >
              Devenir pro KURLA
            </a>
          </div>
        </div>

        {/* 3D City Map Component */}
        <div className="mb-16">
          <KURLAPro3DMap />
        </div>

        {/* Pros Showcase Grid — annuaire réel, jamais de profil inventé */}
        {professionals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {professionals.map((pro) => (
              <div
                key={pro.id}
                className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] transition-all p-6 flex flex-col justify-between shadow-xs hover:shadow-xl group"
              >
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-[#F8F2EC] border-2 border-[#C8753D]/40 flex items-center justify-center text-lg font-bold text-[#C8753D]">
                      {pro.name.trim().charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-serif-title font-bold text-[#111111] flex items-center gap-1.5">
                        {pro.name}
                        {pro.verified && (
                          <span title="Identité vérifiée" aria-label="Identité vérifiée" className="inline-flex">
                            <CheckCircle2 className="w-4 h-4 text-[#C8753D]" aria-hidden="true" />
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-[#C8753D] font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {pro.city}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-[#111111]/75 font-light line-clamp-3 mb-4">
                    {pro.profession}
                  </p>

                  {pro.experience && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#F8F2EC] text-[#111111]/80 border border-[#E8E1DA]">
                        {pro.experience}
                      </span>
                    </div>
                  )}
                </div>

                <a
                  href={`/professionnels/profil/${pro.id}`}
                  className="w-full py-2.5 rounded-xl bg-[#F8F2EC] hover:bg-[#C8753D] text-[#111111] hover:text-white border border-[#E8E1DA] text-xs font-semibold text-center transition-all"
                >
                  Voir le profil
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] p-10 text-center">
            <Info className="w-6 h-6 text-[#C8753D] mx-auto mb-3" />
            <h3 className="text-lg font-serif-title font-bold text-[#111111] mb-2">
              Aucun professionnel vérifié pour l&apos;instant
            </h3>
            <p className="text-sm text-[#111111]/70 font-light max-w-md mx-auto leading-relaxed">
              {loaded
                ? 'KURLA n’affiche que des professionnels dont l’identité et les qualifications ont été vérifiées par un administrateur. L’annuaire est vide aujourd’hui : nous préférons cela à une liste de profils inventés.'
                : 'Chargement de l’annuaire…'}
            </p>
            <a
              href="/professionnels"
              className="inline-flex items-center gap-1.5 mt-5 text-xs font-semibold text-[#C8753D] hover:underline"
            >
              Voir l’annuaire complet <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

      </div>
    </section>
  );
};
