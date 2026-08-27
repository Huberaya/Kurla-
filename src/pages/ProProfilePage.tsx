import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageSquareQuote,
  ShieldCheck,
  Video
} from 'lucide-react';
import { ConsultationBookingModal } from '../components/ConsultationBookingModal';
import { NotFoundPage } from './NotFoundPage';

/**
 * Profil professionnel.
 *
 * Cette page lisait auparavant `MOCK_PROS` : un faux nom, une fausse adresse
 * réelle à Paris, une note à 4,95 sur 38 avis inventés, des prestations et des
 * tarifs fictifs, plus deux avis clients codés en dur. Pour une plateforme dont
 * la promesse est la confiance vérifiée, c'était la pire des fictions : elle
 * proposait de réserver quelqu'un qui n'existe pas.
 *
 * Désormais : le profil vient de l'annuaire réel (professionnels approuvés par
 * un administrateur). S'il n'y a ni profil ni prestation ni avis, la page le dit
 * au lieu d'inventer.
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

interface ProProfilePageProps {
  slug: string;
}

export const ProProfilePage: React.FC<ProProfilePageProps> = ({ slug }) => {
  const [pro, setPro] = useState<DirectoryProfessional | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isVisioModalOpen, setIsVisioModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/professionals')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('annuaire indisponible'))))
      .then(payload => {
        if (cancelled) return;
        const list: DirectoryProfessional[] = Array.isArray(payload?.professionals) ? payload.professionals : [];
        // L'annuaire réel n'expose pas de slug : on accepte l'identifiant.
        setPro(list.find(entry => entry.id === slug) ?? null);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [slug]);

  if (!loaded) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#C8753D]" />
      </div>
    );
  }

  if (!pro) return <NotFoundPage />;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        <a href="/professionnels" className="inline-flex items-center gap-2 text-xs font-semibold text-[#D49A63] hover:text-[#FFF7EF] mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour à l&apos;annuaire des pros
        </a>

        {/* Pro Header Card */}
        <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 shadow-2xl mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-[#C8753D]/20 border-4 border-[#C8753D]/50 shadow-xl flex items-center justify-center text-3xl font-bold text-[#D49A63]">
              {pro.name.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#FFF7EF]">{pro.name}</h1>
                {pro.verified && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C8753D]/20 text-[#D49A63] text-xs font-semibold border border-[#C8753D]/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Identité vérifiée
                  </span>
                )}
              </div>
              <p className="text-sm text-[#D49A63] font-medium mb-2">{pro.profession}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#FFF7EF]/70">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#C8753D]" /> {pro.city}</span>
                {pro.experience && (
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#C8753D]" /> {pro.experience}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsVisioModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Demande de consultation visio</span>
            </button>

            <div className="p-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 text-xs text-[#FFF7EF]/70 max-w-xs">
              <ShieldCheck className="w-4 h-4 text-[#C8753D] mb-1" />
              <p><strong>Charte KURLA :</strong> hygiène stricte, conseils personnalisés et bienveillance sans jugement de texture.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          <div className="lg:col-span-7 space-y-6">
            {/* Prestations : aucune donnée réelle n'existe encore.
                Plutôt que d'inventer des tarifs, on déclare l'absence. */}
            <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
              <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] mb-3">Prestations &amp; tarifs</h2>
              <p className="text-sm text-[#FFF7EF]/70 font-light leading-relaxed">
                Ce professionnel n&apos;a pas encore publié de prestations sur KURLA. Nous n&apos;affichons
                ni tarif ni durée inventés : contactez-le directement pour connaître ses disponibilités.
              </p>
              {pro.portfolioUrl && (
                <a
                  href={pro.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 text-xs font-semibold text-[#D49A63] hover:text-[#FFF7EF] underline"
                >
                  Voir son portfolio
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* Avis : aucun avis réel. Les deux avis codés en dur ont été retirés. */}
            <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4">
              <h3 className="text-base font-serif-title font-bold text-[#FFF7EF]">Avis clientes</h3>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#050403] border border-[#FFF7EF]/5">
                <MessageSquareQuote className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-[#FFF7EF]/80 font-light leading-relaxed">
                    Aucun avis vérifié pour l&apos;instant.
                  </p>
                  <p className="text-xs text-[#FFF7EF]/50 font-light leading-relaxed mt-1.5">
                    KURLA n&apos;affiche que des avis laissés après une prestation réelle et confirmée.
                    Pas de note moyenne, pas de témoignage rédigé à l&apos;avance.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-3">
              <h3 className="text-base font-serif-title font-bold text-[#FFF7EF]">Statut de vérification</h3>
              <ul className="space-y-2 text-xs text-[#FFF7EF]/70 font-light">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8753D] shrink-0" />
                  Identité contrôlée par un administrateur KURLA
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8753D] shrink-0" />
                  Dossier approuvé manuellement, jamais automatiquement
                </li>
              </ul>
            </div>
          </div>

        </div>

        <ConsultationBookingModal
          isOpen={isVisioModalOpen}
          onClose={() => setIsVisioModalOpen(false)}
          preSelectedProId={pro.id}
        />
      </div>
    </div>
  );
};

export default ProProfilePage;
