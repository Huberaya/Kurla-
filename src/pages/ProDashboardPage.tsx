import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, Calendar, CalendarClock, CheckCircle2, Clock, FolderOpen,
  Loader2, Lock, ShieldCheck, Star, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  createProfessionalEndorsement,
  fetchProfessionalDossierAccess,
  getMyProfessionalDashboard,
  ProfessionalDashboardResponse,
  ProfessionalDossierAccessResponse
} from '../services/intelligenceService';
import { ENDORSEMENT_STANCES, ENDORSEMENT_STANCE_LABELS, EndorsementStance } from '../lib/proEndorsement';
import type { Appointment } from '../lib/professionalStore';

const STATUS_LABELS: Record<Appointment['status'], { label: string; className: string }> = {
  requested: { label: 'En attente', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  confirmed: { label: 'Confirmé', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  completed: { label: 'Réalisé', className: 'bg-[#C8753D]/20 text-[#D49A63] border-[#C8753D]/40' },
  cancelled_by_client: { label: 'Annulé par le client', className: 'bg-white/5 text-[#FFF7EF]/50 border-[#FFF7EF]/15' },
  cancelled_by_pro: { label: 'Annulé par vous', className: 'bg-white/5 text-[#FFF7EF]/50 border-[#FFF7EF]/15' },
  no_show: { label: 'Non présenté', className: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
};

const SCOPE_LABELS = [
  { key: 'beautyProfile', label: 'Profil beauté' },
  { key: 'shelf', label: 'Étagère produits' },
  { key: 'outcomes', label: 'Résultats observés' },
  { key: 'protectiveStyles', label: 'Coiffures protectrices' }
] as const;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  });
}

function formatPrice(priceCents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'EUR' })
    .format(priceCents / 100);
}

/**
 * Espace professionnel.
 *
 * Cette page n'affiche que des données issues du compte connecté. Elle a
 * remplacé un tableau de bord entièrement fictif (nom de studio, note « 4,9/5 sur
 * 38 avis vérifiés », trois clientes inventées) : afficher des avis et des
 * rendez-vous qui n'existent pas est précisément ce que la charte KURLA
 * interdit, y compris dans un espace privé.
 *
 * Si le compte n'a pas de profil vérifié, la page le dit au lieu de simuler.
 */
export const ProDashboardPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token || '';

  const [dashboard, setDashboard] = useState<ProfessionalDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dossier, setDossier] = useState<ProfessionalDossierAccessResponse | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);

  const [formClient, setFormClient] = useState('');
  const [formStance, setFormStance] = useState<EndorsementStance>('approved');
  const [formRationale, setFormRationale] = useState('');
  const [formConsent, setFormConsent] = useState(false);
  const [endorsementBusy, setEndorsementBusy] = useState(false);
  const [endorsementNotice, setEndorsementNotice] = useState<string | null>(null);
  const [endorsementError, setEndorsementError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setDashboard(await getMyProfessionalDashboard(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'L’espace professionnel est indisponible.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const openDossier = async (clientUserId: string) => {
    setDossierLoading(true);
    setDossierError(null);
    setDossier(null);
    try {
      setDossier(await fetchProfessionalDossierAccess(token, clientUserId));
    } catch (err) {
      setDossierError(err instanceof Error ? err.message : 'Le dossier est inaccessible.');
    } finally {
      setDossierLoading(false);
    }
  };

  const submitEndorsement = async () => {
    setEndorsementBusy(true);
    setEndorsementNotice(null);
    setEndorsementError(null);
    try {
      await createProfessionalEndorsement(token, {
        clientUserId: formClient,
        stance: formStance,
        rationale: formRationale,
        isDisplayable: formConsent,
        clientConsentAt: formConsent ? new Date().toISOString() : undefined
      });
      setEndorsementNotice('Co-signature enregistrée.');
      setFormRationale('');
      setFormConsent(false);
    } catch (err) {
      setEndorsementError(err instanceof Error ? err.message : 'La co-signature n’a pas pu être enregistrée.');
    } finally {
      setEndorsementBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center px-4">
        <p className="text-sm text-[#FFF7EF]/60">Connectez-vous pour accéder à votre espace professionnel.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center">
        <p className="flex items-center gap-2 text-sm text-[#FFF7EF]/60">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement de votre espace…
        </p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
        <div className="max-w-2xl mx-auto px-4">
          <div className="rounded-3xl border border-[#FFF7EF]/10 bg-[#1A0F0A] p-8">
            <h1 className="text-xl font-serif-title font-bold mb-3">Espace professionnel</h1>
            <p className="flex items-start gap-2 text-sm text-[#FFF7EF]/70">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{error || 'Aucun profil professionnel vérifié n’est associé à ce compte.'}</span>
            </p>
            <p className="text-xs text-[#FFF7EF]/50 mt-4 leading-relaxed">
              KURLA n’ouvre l’espace professionnel qu’après un contrôle manuel d’identité. Si vous avez
              déposé une candidature, elle est en cours d’examen ; aucune donnée de démonstration n’est
              affichée en attendant.
            </p>
            <a href="/kurla-pro" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#C8753D] px-5 py-2.5 text-xs font-semibold text-white">
              Déposer une candidature
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { profile, trust, services, appointments, shares } = dashboard;

  // Une co-signature ne peut porter que sur une cliente réellement liée :
  // partage de dossier actif ou rendez-vous. Le serveur applique la même règle.
  const eligibleClients = Array.from(new Set<string>([
    ...shares.map(share => share.clientUserId),
    ...appointments.map(appointment => appointment.clientUserId)
  ]));

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-serif-title font-bold">{profile.displayName}</h1>
              {profile.identityVerified && (
                <span className="px-3 py-0.5 rounded-full bg-[#C8753D]/20 text-[#D49A63] text-xs font-semibold border border-[#C8753D]/40 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Identité vérifiée
                </span>
              )}
            </div>
            <p className="text-xs text-[#FFF7EF]/60">
              {profile.profession}{profile.specialty ? ` · ${profile.specialty}` : ''} · {profile.city}
              {profile.qualificationLabel ? ` · ${profile.qualificationLabel}` : ''}
            </p>
          </div>
          <a
            href="/mes-reservations"
            className="px-5 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-2"
          >
            <CalendarClock className="w-4 h-4" /> Gérer les réservations
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2">
            <span className="text-xs text-[#D49A63] font-semibold flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Rendez-vous à venir
            </span>
            <span className="text-3xl font-bold">{dashboard.upcomingCount}</span>
            <p className="text-[11px] text-[#FFF7EF]/50">
              {appointments.length} réservation(s) au total, tous statuts confondus
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2">
            <span className="text-xs text-[#D49A63] font-semibold flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400" /> Trust Score
            </span>
            {trust.publishable && trust.score !== null ? (
              <>
                <span className="text-3xl font-bold">{trust.score}<span className="text-base text-[#FFF7EF]/50">/100</span></span>
                <p className="text-[11px] text-[#FFF7EF]/50">
                  {trust.reviews.count} avis issu(s) de prestations réellement effectuées
                </p>
              </>
            ) : (
              <>
                <span className="text-xl font-bold text-[#FFF7EF]/60">Non publiable</span>
                <p className="text-[11px] text-[#FFF7EF]/50">
                  {trust.limitations[0] || 'Trop peu d’éléments vérifiés pour publier un score.'}
                </p>
              </>
            )}
          </div>

          <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2">
            <span className="text-xs text-[#D49A63] font-semibold flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4" /> Dossiers partagés
            </span>
            <span className="text-3xl font-bold">{dashboard.activeShareCount}</span>
            <p className="text-[11px] text-[#FFF7EF]/50">
              Consentements actifs, révocables à tout moment par le client
            </p>
          </div>
        </div>

        {trust.limitations.length > 0 && (
          <div className="mb-8 rounded-2xl border border-[#FFF7EF]/10 bg-[#1A0F0A]/60 p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#D49A63] font-bold mb-2">Ce que ce score ne dit pas</p>
            <ul className="space-y-1">
              {trust.limitations.map((limitation, index) => (
                <li key={index} className="text-xs text-[#FFF7EF]/60 leading-relaxed">· {limitation}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4">
            <h2 className="text-xl font-serif-title font-bold">Vos prestations</h2>
            {services.length === 0 ? (
              <p className="text-xs text-[#FFF7EF]/55">
                Aucune prestation enregistrée. Vos clientes ne peuvent pas encore réserver en ligne.
              </p>
            ) : (
              <ul className="space-y-2">
                {services.map(service => (
                  <li key={service.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{service.name}</p>
                      <p className="text-[11px] text-[#FFF7EF]/50 mt-0.5">
                        {service.durationMinutes} min{service.isRemote ? ' · à distance' : ' · en salon'}
                        {!service.isActive && ' · désactivée'}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[#D49A63] shrink-0">
                      {formatPrice(service.priceCents, service.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4">
            <h2 className="text-xl font-serif-title font-bold">Demandes & rendez-vous</h2>
            {appointments.length === 0 ? (
              <p className="text-xs text-[#FFF7EF]/55">Aucune réservation pour le moment.</p>
            ) : (
              <ul className="space-y-3">
                {appointments.slice(0, 8).map(appointment => {
                  const status = STATUS_LABELS[appointment.status];
                  return (
                    <li key={appointment.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#D49A63] capitalize">{formatDateTime(appointment.scheduledAt)}</p>
                        <p className="text-[11px] text-[#FFF7EF]/50 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {appointment.durationMinutes} min
                          {appointment.isRemote ? ' · à distance' : ' · en salon'}
                          {appointment.dossierShareConsentAt ? ' · dossier partagé' : ''}
                        </p>
                        {appointment.clientNotes && (
                          <p className="text-[11px] text-[#FFF7EF]/45 mt-1 italic">« {appointment.clientNotes} »</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${status.className}`}>
                        {status.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-6 p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-serif-title font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D49A63]" /> Dossiers clients partagés
              </h2>
              <p className="text-xs text-[#FFF7EF]/55 mt-1 max-w-2xl">
                Vous ne voyez que ce que chaque cliente a explicitement autorisé, champ par champ.
                « Tout le dossier » n’existe pas. Un partage révoqué disparaît immédiatement de cette liste.
              </p>
            </div>
          </div>

          {shares.length === 0 ? (
            <p className="text-xs text-[#FFF7EF]/55">
              Aucune cliente n’a partagé son dossier avec vous pour le moment.
            </p>
          ) : (
            <ul className="space-y-2">
              {shares.map(share => (
                <li key={share.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-[#FFF7EF]/50">
                        Consentement du {new Date(share.consentAt).toLocaleDateString('fr-FR')}
                        {share.expiresAt ? ` · expire le ${new Date(share.expiresAt).toLocaleDateString('fr-FR')}` : ' · sans expiration'}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {SCOPE_LABELS.map(scope => (
                          <span
                            key={scope.key}
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${
                              share[scope.key]
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                : 'border-[#FFF7EF]/10 text-[#FFF7EF]/35'
                            }`}
                          >
                            {share[scope.key] ? <CheckCircle2 className="w-2.5 h-2.5 inline mr-1" /> : <Lock className="w-2.5 h-2.5 inline mr-1" />}
                            {scope.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDossier(share.clientUserId)}
                      disabled={dossierLoading}
                      className="px-3 py-1.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-[11px] font-semibold disabled:opacity-40 shrink-0"
                    >
                      {dossierLoading ? 'Ouverture…' : 'Ouvrir le dossier'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {dossierError && (
            <p className="text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {dossierError}
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-[#FFF7EF]/10">
            <h3 className="text-base font-serif-title font-bold mb-1">Co-signer une routine</h3>
            <p className="text-xs text-[#FFF7EF]/55 mb-4 max-w-2xl">
              Votre identité et votre statut vérifié sont lus depuis votre compte : ils ne peuvent pas
              être déclarés dans la demande. Une co-signature sans justification est refusée, et elle
              n'est affichée publiquement qu'avec le consentement daté de la cliente.
            </p>
            {eligibleClients.length === 0 ? (
              <p className="text-xs text-[#FFF7EF]/50">
                Aucune cliente éligible : la co-signature suppose un rendez-vous ou un partage de
                dossier actif.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={formClient}
                    onChange={event => setFormClient(event.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs"
                  >
                    <option value="">Choisir une cliente…</option>
                    {eligibleClients.map(clientId => (
                      <option key={clientId} value={clientId}>{clientId.slice(0, 8)}…</option>
                    ))}
                  </select>
                  <select
                    value={formStance}
                    onChange={event => setFormStance(event.target.value as EndorsementStance)}
                    className="px-3 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs"
                  >
                    {ENDORSEMENT_STANCES.map(stance => (
                      <option key={stance} value={stance}>{ENDORSEMENT_STANCE_LABELS[stance]}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  rows={3}
                  value={formRationale}
                  onChange={event => setFormRationale(event.target.value)}
                  placeholder="Votre justification professionnelle — obligatoire"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs resize-none"
                />
                <label className="flex items-start gap-2 text-[11px] text-[#FFF7EF]/60">
                  <input
                    type="checkbox"
                    checked={formConsent}
                    onChange={event => setFormConsent(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    La cliente a donné son consentement daté pour que cette co-signature soit
                    affichée publiquement.
                  </span>
                </label>
                <button
                  type="button"
                  disabled={endorsementBusy || !formClient || formRationale.trim().length < 10}
                  onClick={submitEndorsement}
                  className="px-4 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold disabled:opacity-40"
                >
                  {endorsementBusy ? 'Enregistrement…' : 'Enregistrer la co-signature'}
                </button>
                {endorsementNotice && <p className="text-xs text-emerald-300">{endorsementNotice}</p>}
                {endorsementError && (
                  <p className="text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> {endorsementError}
                  </p>
                )}
              </div>
            )}
          </div>

          {dossier && (
            <div className="mt-4 rounded-2xl border border-[#C8753D]/30 bg-[#C8753D]/5 p-4">
              {!dossier.access ? (
                <p className="text-xs text-[#FFF7EF]/70">{dossier.reason}</p>
              ) : (
                <>
                  <p className="text-[11px] uppercase tracking-wider text-[#D49A63] font-bold mb-3">
                    Périmètre autorisé
                  </p>
                  <dl className="space-y-3">
                    {Object.entries(dossier.data || {}).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs font-semibold text-[#FFF7EF]">{key}</dt>
                        <dd className="text-[11px] text-[#FFF7EF]/60 mt-1 break-words">
                          {value === null
                            ? 'Aucune donnée renseignée par la cliente.'
                            : Array.isArray(value)
                              ? `${value.length} élément(s) partagés.`
                              : 'Données partagées.'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-[10px] text-[#FFF7EF]/45 leading-relaxed">{dossier.note}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
