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
  const isPeauProHeader = pro ? /peau|dermato|esthét|skin/i.test(`${pro.profession} ${(pro as any).specialty || ''}`) : false;

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
      <div className="min-h-screen pt-32 pb-24 bg-kurla-ink text-kurla-cream flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-kurla-copper" />
      </div>
    );
  }

  if (!pro) return <NotFoundPage />;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-kurla-ink text-kurla-cream">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        <a href="/professionnels" className="inline-flex items-center gap-2 text-xs font-semibold text-kurla-amber hover:text-kurla-cream mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour à l&apos;annuaire des pros
        </a>

        {/* Pro Header Card */}
        <div className="p-8 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 shadow-2xl mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-kurla-copper/20 border-4 border-kurla-copper/50 shadow-xl flex items-center justify-center text-3xl font-bold text-kurla-amber">
              {pro.name.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-kurla-cream">{pro.name}</h1>
                {pro.verified && (
                  <span className="px-2.5 py-0.5 rounded-full bg-kurla-copper/20 text-kurla-amber text-xs font-semibold border border-kurla-copper/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Identité vérifiée
                  </span>
                )}
              </div>
              <p className="text-sm text-kurla-amber font-medium mb-2">{pro.profession}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-kurla-cream/70">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-kurla-copper" /> {pro.city}</span>
                {pro.experience && (
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-kurla-copper" /> {pro.experience}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsVisioModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-kurla-copper hover:bg-kurla-cocoa text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>{isPeauProHeader ? 'Téléconsultation peau visio' : 'Demande de consultation visio'}</span>
            </button>
            {isPeauProHeader && <p className="text-[11px] text-kurla-cream/60 text-center">Visio 30 min · partage profil peau sur consentement · HPI/SPF/barrière</p>}

            <div className="p-3 rounded-xl bg-kurla-ink border border-kurla-cream/10 text-xs text-kurla-cream/70 max-w-xs">
              <ShieldCheck className="w-4 h-4 text-kurla-copper mb-1" />
              <p><strong>Charte KURLA :</strong> hygiène stricte, conseils personnalisés et bienveillance sans jugement de texture.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          <div className="lg:col-span-7 space-y-6">
            {/* C7 — Prestations peau : jamais inventer, mais préciser le champ peau si pro peau */}
            {(() => {
              const isPeauPro = /peau|dermato|esthét|skin|scalp/i.test(`${pro.profession} ${(pro as any).specialty || ''}`);
              return (
                <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10">
                  <h2 className="text-xl font-serif-title font-bold text-kurla-cream mb-3">{isPeauPro ? 'Prestations peau & conseils' : 'Prestations & tarifs'}</h2>
                  {isPeauPro ? (
                    <div className="space-y-3">
                      <p className="text-sm text-kurla-cream/70 font-light leading-relaxed">
                        Expert·e peau riche en mélanine : conseils routine, HPI/taches, barrière (céramides), SPF sans trace blanche. Aucun tarif affiché tant que le pro ne l’a pas renseigné — KURLA n’invente ni prix ni durée.
                      </p>
                      <ul className="text-xs text-kurla-cream/70 space-y-1.5 list-disc list-inside">
                        <li>Consultation peau 30 min (visio ou présentiel)</li>
                        <li>Suivi journal peau J+7 / J+30 + ajustement routine</li>
                        <li>Atelier SPF invisible · démo texture sur phototype V–VI</li>
                      </ul>
                      <p className="text-[11px] text-kurla-cream/50">Uniformiser ≠ éclaircir · garde : avis non médical, orientation seulement.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-kurla-cream/70 font-light leading-relaxed">
                      Ce professionnel n&apos;a pas encore publié de prestations sur KURLA. Nous n&apos;affichons
                      ni tarif ni durée inventés : contactez-le directement pour connaître ses disponibilités.
                    </p>
                  )}
                  {pro.portfolioUrl && (
                    <a
                      href={pro.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-4 text-xs font-semibold text-kurla-amber hover:text-kurla-cream underline"
                    >
                      Voir son portfolio
                    </a>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* Avis : aucun avis réel. Les deux avis codés en dur ont été retirés. */}
            <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4">
              <h3 className="text-base font-serif-title font-bold text-kurla-cream">Avis clientes</h3>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-kurla-ink border border-kurla-cream/5">
                <MessageSquareQuote className="w-5 h-5 text-kurla-copper shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-kurla-cream/80 font-light leading-relaxed">
                    Aucun avis vérifié pour l&apos;instant.
                  </p>
                  <p className="text-xs text-kurla-cream/50 font-light leading-relaxed mt-1.5">
                    KURLA n&apos;affiche que des avis laissés après une prestation réelle et confirmée.
                    Pas de note moyenne, pas de témoignage rédigé à l&apos;avance.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3">
              <h3 className="text-base font-serif-title font-bold text-kurla-cream">Statut de vérification</h3>
              <ul className="space-y-2 text-xs text-kurla-cream/70 font-light">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-kurla-copper shrink-0" />
                  Identité contrôlée par un administrateur KURLA
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-kurla-copper shrink-0" />
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
