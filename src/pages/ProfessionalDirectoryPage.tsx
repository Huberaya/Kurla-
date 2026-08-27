import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Loader2,
  MessageSquareQuote,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchVerifiedProfessionals,
  ProfessionalTrustAssessment,
  PublicProfessionalSummary,
  requestAppointment
} from '../services/intelligenceService';

const cardClass = 'bg-white border border-[#E8E1DA] rounded-2xl p-5';
const inputClass = 'w-full px-4 py-3 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-sm focus:outline-none focus:border-[#C8753D]';
const primaryButton = 'px-5 py-3 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50';

/**
 * Affichage du Trust Score.
 *
 * Deux choix d'interface qui ne sont pas cosmétiques :
 *  - les composantes non satisfaites sont visibles, pas seulement le total ;
 *  - un professionnel sans note n'est pas affiché comme « 0/100 » mais comme
 *    « pas encore assez d'avis vérifiés ». Un zéro affiché serait une sanction
 *    injuste pour quelqu'un qui vient d'arriver.
 */
const TrustBadge: React.FC<{ trust: ProfessionalTrustAssessment }> = ({ trust }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-3 flex-wrap">
      {trust.publishable ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-xs font-semibold text-[#15803D]">
          <BadgeCheck className="w-4 h-4" /> Identité vérifiée
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C]">
          <XCircle className="w-4 h-4" /> Non vérifié
        </span>
      )}

      {trust.score === null ? (
        <span className="text-xs text-[#666666]">Score non publié</span>
      ) : (
        <span className="text-sm font-semibold text-[#111111]">
          Trust Score {trust.score}
          <span className="text-[#999999] font-normal">/100</span>
        </span>
      )}
    </div>

    <p className="text-xs text-[#666666] leading-relaxed">{trust.statement}</p>

    {/* Note d'avis : publiée seulement au-dessus du seuil, sinon la raison est dite */}
    {trust.reviews.publishable && trust.reviews.average !== null ? (
      <p className="text-xs text-[#666666]">
        Note {trust.reviews.average.toFixed(2)}/5 sur {trust.reviews.count} avis issus de prestations effectuées.
      </p>
    ) : (
      <p className="text-xs text-[#999999]">
        {trust.reviews.suppressionReason || 'Aucun avis vérifié pour le moment.'}
      </p>
    )}

    <details className="text-xs">
      <summary className="cursor-pointer text-[#C8753D] hover:underline font-medium">
        Voir le détail du score
      </summary>
      <ul className="mt-3 space-y-2">
        {trust.components.map(component => (
          <li key={component.key} className="flex items-start gap-2">
            {component.satisfied ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-[#D4A574] shrink-0 mt-0.5" />
            )}
            <span className="text-[#666666] leading-relaxed">
              <span className="font-medium text-[#111111]">{component.label}</span> — {component.detail}
              <span className="text-[#999999]"> ({component.weight} points)</span>
            </span>
          </li>
        ))}
      </ul>
      {trust.limitations.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-[#E8E1DA] pt-3">
          {trust.limitations.map((limitation, index) => (
            <li key={index} className="text-[11px] text-[#999999] leading-relaxed">
              {limitation}
            </li>
          ))}
        </ul>
      )}
    </details>
  </div>
);

/**
 * ANNUAIRE DES PROFESSIONNELS VÉRIFIÉS.
 *
 * Ce qui distingue cet annuaire d'une liste de profils auto-déclarés :
 * personne n'y figure sans un contrôle d'identité effectué par l'équipe, et la
 * note ne peut pas être achetée — seuls les avis rattachés à une prestation
 * réellement effectuée comptent.
 */
export const ProfessionalDirectoryPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;

  const [entries, setEntries] = useState<{ profile: PublicProfessionalSummary; trust: ProfessionalTrustAssessment }[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bookingFor, setBookingFor] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [shareConsent, setShareConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchVerifiedProfessionals()
      .then(response => {
        if (!active) return;
        setEntries(response.professionals);
        setNote(response.note || null);
      })
      .catch(caught => {
        if (active) setError(caught instanceof Error ? caught.message : 'Annuaire indisponible.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const submitBooking = useCallback(async (professionalId: string) => {
    if (!token) {
      setBookingResult('Connexion requise pour réserver.');
      return;
    }
    setSubmitting(true);
    setBookingResult(null);
    try {
      const response = await requestAppointment(token, {
        professionalId,
        scheduledAt: scheduledAt || undefined,
        clientNotes: clientNotes || undefined,
        dossierShareConsent: shareConsent
      });
      setBookingResult(response.note);
      setBookingFor(null);
      setClientNotes('');
      setShareConsent(false);
    } catch (caught) {
      setBookingResult(caught instanceof Error ? caught.message : 'Réservation impossible.');
    } finally {
      setSubmitting(false);
    }
  }, [token, scheduledAt, clientNotes, shareConsent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] px-4 py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#C8753D]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-5">

        <header className={cardClass}>
          <p className="text-[11px] font-semibold text-[#C8753D] uppercase tracking-widest mb-1">
            Réseau KURLA Pro
          </p>
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight mb-2">
            Professionnels vérifiés
          </h1>
          <p className="text-sm text-[#666666] leading-relaxed">
            Chaque professionnel listé a fait vérifier son identité auprès de l’équipe KURLA. Le
            Trust Score repose sur des faits vérifiables : identité, qualification, charte signée,
            avis issus de prestations réellement effectuées.
          </p>
        </header>

        {error && (
          <div className={`${cardClass} flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
            <p className="text-sm text-[#666666]">{error}</p>
          </div>
        )}

        {entries.length === 0 && (
          <div className={`${cardClass} text-center py-10`}>
            <ShieldCheck className="w-8 h-8 text-[#D4A574] mx-auto mb-3" />
            <p className="text-sm text-[#666666] leading-relaxed max-w-md mx-auto">
              {note || 'Aucun professionnel vérifié n’est encore listé.'}
            </p>
            <p className="text-xs text-[#999999] mt-3">
              KURLA préfère un annuaire vide à un annuaire non vérifié.
            </p>
          </div>
        )}

        {entries.map(({ profile, trust }) => (
          <article key={profile.id} className={cardClass}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#111111]">{profile.displayName}</h2>
                <p className="text-sm text-[#666666]">
                  {profile.profession}
                  {profile.specialty ? ` · ${profile.specialty}` : ''}
                  {profile.city ? ` · ${profile.city}` : ''}
                </p>
                {profile.qualificationLabel && (
                  <p className="text-xs text-[#999999] mt-1">{profile.qualificationLabel}</p>
                )}
                {!!profile.verifiedExperienceYears && profile.verifiedExperienceYears > 0 && (
                  <p className="text-xs text-[#999999] mt-1">
                    {profile.verifiedExperienceYears} an{profile.verifiedExperienceYears > 1 ? 's' : ''} d’expérience déclarés
                  </p>
                )}
              </div>
              {trust.publishable && (
                <Award className="w-6 h-6 text-[#C8753D] shrink-0" />
              )}
            </div>

            <TrustBadge trust={trust} />

            {trust.publishable && (
              <div className="mt-5 pt-5 border-t border-[#E8E1DA]">
                {bookingFor === profile.id ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-xs font-medium text-[#666666] block mb-1.5">
                        Date souhaitée (optionnel)
                      </span>
                      <input
                        type="datetime-local"
                        className={inputClass}
                        value={scheduledAt}
                        onChange={event => setScheduledAt(event.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-[#666666] block mb-1.5">
                        Votre besoin (optionnel)
                      </span>
                      <textarea
                        className={inputClass}
                        rows={3}
                        value={clientNotes}
                        onChange={event => setClientNotes(event.target.value)}
                        placeholder="Ce que vous souhaitez aborder lors du rendez-vous."
                      />
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-[#C8753D]"
                        checked={shareConsent}
                        onChange={event => setShareConsent(event.target.checked)}
                      />
                      <span className="text-xs text-[#666666] leading-relaxed">
                        Je consens à partager mon profil de beauté avec ce professionnel pour ce
                        rendez-vous. Ce partage est révocable à tout moment et ne porte que sur ce
                        périmètre.
                      </span>
                    </label>

                    <div className="flex gap-2">
                      <button
                        className={primaryButton}
                        onClick={() => submitBooking(profile.id)}
                        disabled={submitting}
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                        Envoyer la demande
                      </button>
                      <button
                        className="px-4 py-3 rounded-xl border border-[#E8E1DA] text-sm text-[#666666] hover:bg-[#FFFDF9] cursor-pointer"
                        onClick={() => {
                          setBookingFor(null);
                          setBookingResult(null);
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={primaryButton}
                    onClick={() => {
                      setBookingFor(profile.id);
                      setBookingResult(null);
                    }}
                  >
                    <Calendar className="w-4 h-4" /> Demander un rendez-vous
                  </button>
                )}
              </div>
            )}
          </article>
        ))}

        {bookingResult && (
          <div className={`${cardClass} flex items-start gap-3`}>
            <MessageSquareQuote className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
            <p className="text-sm text-[#666666] leading-relaxed">{bookingResult}</p>
          </div>
        )}

        <p className="text-xs text-[#999999] leading-relaxed px-1">
          Le Trust Score mesure des faits vérifiables, pas la qualité humaine d’un praticien ni son
          talent. L’absence de diplôme ou de certificat affiché n’est pas un indice d’incompétence :
          beaucoup de professionnels exercent légalement sans titre reconnu dans un cadre donné.
        </p>
      </div>
    </div>
  );
};
