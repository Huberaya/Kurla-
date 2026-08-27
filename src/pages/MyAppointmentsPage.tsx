import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Appointment,
  confirmServicePayment,
  createServiceCheckout,
  DossierShare,
  fetchAppointmentPayments,
  fetchMyAppointments,
  fetchMyDossierShares,
  revokeDossierShare,
  ServicePayment
} from '../services/intelligenceService';

const cardClass = 'bg-white border border-[#E8E1DA] rounded-2xl p-5';
const primaryButton = 'px-5 py-3 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50';

const STATUS_LABELS: Record<Appointment['status'], { label: string; className: string }> = {
  requested: { label: 'Demande envoyée', className: 'bg-amber-50 border-amber-200 text-amber-900' },
  confirmed: { label: 'Confirmée', className: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  completed: { label: 'Effectuée', className: 'bg-sky-50 border-sky-200 text-sky-900' },
  cancelled_by_client: { label: 'Annulée par vous', className: 'bg-neutral-50 border-neutral-200 text-neutral-700' },
  cancelled_by_pro: { label: 'Annulée par le professionnel', className: 'bg-neutral-50 border-neutral-200 text-neutral-700' },
  no_show: { label: 'Non présentée', className: 'bg-red-50 border-red-200 text-red-900' }
};

const PAYMENT_LABELS: Record<ServicePayment['status'], string> = {
  pending: 'En attente',
  authorized: 'Autorisé',
  paid: 'Réglé',
  refunded: 'Remboursé',
  failed: 'Échoué'
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR');
};

/**
 * MES RÉSERVATIONS — réservation, paiement de prestation, consentements.
 *
 * Trois règles d'interface :
 *  - le paiement n'apparaît que sur une réservation confirmée, jamais sur une
 *    simple demande : KURLA n'encaisse pas pour une prestation non acceptée ;
 *  - le statut de paiement affiché vient du serveur, qui lui-même le relit chez
 *    Stripe. Le retour `?paid=1` n'est qu'une indication de navigation, jamais
 *    une preuve de paiement ;
 *  - chaque consentement de partage est listé avec son périmètre et révocable
 *    en un clic.
 */
export const MyAppointmentsPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Record<string, ServicePayment[]>>({});
  const [shares, setShares] = useState<DossierShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [appointmentResponse, shareResponse] = await Promise.all([
        fetchMyAppointments(token),
        fetchMyDossierShares(token)
      ]);
      setAppointments(appointmentResponse.appointments);
      setShares(shareResponse.shares);

      const entries = await Promise.all(
        appointmentResponse.appointments.map(async appointment => {
          const response = await fetchAppointmentPayments(token, appointment.id);
          return [appointment.id, response.payments] as const;
        })
      );
      setPayments(Object.fromEntries(entries));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Réservations indisponibles.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Le retour de Stripe est une indication de navigation, pas une preuve : le
  // statut réel est relu côté serveur.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') {
      setNotice('Retour de Stripe. Confirmation du paiement en cours de vérification auprès du serveur.');
    } else if (params.get('canceled') === '1') {
      setNotice('Paiement interrompu. Aucun montant n’a été prélevé.');
    }
  }, []);

  const pay = useCallback(async (appointment: Appointment) => {
    if (!token) return;
    setBusyId(appointment.id);
    setNotice(null);
    setError(null);
    try {
      const response = await createServiceCheckout(token, appointment.id);
      if (!response.url) {
        setError('Stripe n’a pas renvoyé d’URL de paiement.');
        return;
      }
      window.location.href = response.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Paiement impossible.');
    } finally {
      setBusyId(null);
    }
  }, [token]);

  const confirm = useCallback(async (appointment: Appointment, payment: ServicePayment) => {
    if (!token) return;
    setBusyId(payment.id);
    setNotice(null);
    setError(null);
    try {
      const response = await confirmServicePayment(token, payment.id, appointment.id);
      setNotice(response.note);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Confirmation impossible.');
    } finally {
      setBusyId(null);
    }
  }, [token, load]);

  const revoke = useCallback(async (share: DossierShare) => {
    if (!token) return;
    setBusyId(share.id);
    setError(null);
    try {
      const response = await revokeDossierShare(token, share.id);
      setNotice(response.note);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Révocation impossible.');
    } finally {
      setBusyId(null);
    }
  }, [token, load]);

  if (!token) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] px-4 py-16">
        <p className="text-sm text-[#666666] text-center">Connexion requise.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] px-4 py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#C8753D]" />
      </div>
    );
  }

  const activeShares = shares.filter(share => !share.revokedAt);

  return (
    <div className="min-h-screen bg-[#FFFDF9] px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-5">

        <header className={cardClass}>
          <p className="text-[11px] font-semibold text-[#C8753D] uppercase tracking-widest mb-1">
            Espace client
          </p>
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight mb-2">Mes réservations</h1>
          <p className="text-sm text-[#666666] leading-relaxed">
            Le paiement n’est proposé qu’après confirmation du professionnel. Les consentements de
            partage de votre dossier sont listés plus bas et révocables à tout moment.
          </p>
        </header>

        {error && (
          <div className={`${cardClass} flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
            <p className="text-sm text-[#666666]">{error}</p>
          </div>
        )}

        {notice && (
          <div className={`${cardClass} flex items-start gap-3`}>
            <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
            <p className="text-sm text-[#666666]">{notice}</p>
          </div>
        )}

        {appointments.length === 0 ? (
          <div className={`${cardClass} text-center py-10`}>
            <Calendar className="w-8 h-8 text-[#D4A574] mx-auto mb-3" />
            <p className="text-sm text-[#666666]">Aucune réservation pour le moment.</p>
            <a href="/pros-verifies" className="text-sm text-[#C8753D] hover:underline mt-2 inline-block">
              Voir les professionnels vérifiés
            </a>
          </div>
        ) : (
          appointments.map(appointment => {
            const status = STATUS_LABELS[appointment.status];
            const appointmentPayments = payments[appointment.id] || [];
            const latest = appointmentPayments[appointmentPayments.length - 1];
            const isPaid = appointmentPayments.some(payment => payment.status === 'paid');

            return (
              <article key={appointment.id} className={cardClass}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#111111]">
                      {formatDate(appointment.scheduledAt)}
                    </h2>
                    <p className="text-xs text-[#999999] mt-0.5">
                      {appointment.durationMinutes} min · {appointment.isRemote ? 'à distance' : 'en personne'}
                      {appointment.dossierShareConsentAt ? ' · dossier partagé' : ''}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full border text-[11px] font-semibold shrink-0 ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                {appointment.clientNotes && (
                  <p className="text-sm text-[#666666] leading-relaxed mb-3">{appointment.clientNotes}</p>
                )}

                {appointment.cancelledReason && (
                  <p className="text-xs text-[#999999] mb-3">Motif : {appointment.cancelledReason}</p>
                )}

                {/* Paiement : uniquement si confirmée, non réglée, et tarifée */}
                {appointment.status === 'confirmed' && !isPaid && appointment.serviceId && (
                  <div className="pt-3 border-t border-[#E8E1DA]">
                    {latest && latest.status === 'pending' ? (
                      <div className="space-y-2">
                        <p className="text-xs text-[#666666]">
                          Paiement de {(latest.amountCents / 100).toLocaleString('fr-FR')} {latest.currency} initié, non confirmé.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className={primaryButton}
                            onClick={() => pay(appointment)}
                            disabled={busyId === appointment.id}
                          >
                            {busyId === appointment.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <CreditCard className="w-4 h-4" />}
                            Reprendre le paiement
                          </button>
                          <button
                            className="px-4 py-3 rounded-xl border border-[#E8E1DA] text-sm text-[#666666] hover:bg-[#FFFDF9] cursor-pointer"
                            onClick={() => confirm(appointment, latest)}
                            disabled={busyId === latest.id}
                          >
                            {busyId === latest.id ? 'Vérification…' : 'J’ai déjà payé'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className={primaryButton}
                        onClick={() => pay(appointment)}
                        disabled={busyId === appointment.id}
                      >
                        {busyId === appointment.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <CreditCard className="w-4 h-4" />}
                        Payer la prestation
                      </button>
                    )}
                  </div>
                )}

                {appointmentPayments.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-[#E8E1DA] space-y-1.5">
                    <p className="text-[11px] font-semibold text-[#999999] uppercase tracking-wider">
                      Paiements
                    </p>
                    {appointmentPayments.map(payment => (
                      <div key={payment.id} className="flex items-center justify-between text-xs">
                        <span className="text-[#666666]">
                          {(payment.amountCents / 100).toLocaleString('fr-FR')} {payment.currency}
                          {payment.paidAt ? ` · ${formatDate(payment.paidAt)}` : ''}
                        </span>
                        <span className={payment.status === 'paid' ? 'text-[#16A34A] font-semibold' : 'text-[#999999]'}>
                          {PAYMENT_LABELS[payment.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}

        {/* Consentements de partage */}
        <section className={cardClass}>
          <h2 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Partages de mon dossier
          </h2>

          {activeShares.length === 0 ? (
            <p className="text-sm text-[#666666]">
              Vous ne partagez actuellement votre dossier avec aucun professionnel.
            </p>
          ) : (
            <div className="space-y-3">
              {activeShares.map(share => {
                const scope = [
                  share.scopeBeautyProfile && 'profil de beauté',
                  share.scopeShelf && 'étagère',
                  share.scopeOutcomes && 'résultats observés',
                  share.scopeProtectiveStyles && 'coiffures protectrices'
                ].filter(Boolean);

                return (
                  <div key={share.id} className="rounded-xl border border-[#E8E1DA] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#111111]">
                          Périmètre : {scope.length > 0 ? scope.join(', ') : 'aucun'}
                        </p>
                        <p className="text-xs text-[#999999] mt-1">
                          Consentement du {formatDate(share.consentAt)}
                          {share.expiresAt ? ` · expire le ${formatDate(share.expiresAt)}` : ' · sans expiration'}
                        </p>
                      </div>
                      <button
                        className="px-3 py-2 rounded-xl border border-[#E8E1DA] text-xs text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer shrink-0"
                        onClick={() => revoke(share)}
                        disabled={busyId === share.id}
                      >
                        {busyId === share.id ? '…' : 'Révoquer'}
                      </button>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-[#999999] leading-relaxed">
                La révocation supprime l’accès immédiatement. La trace du consentement est conservée,
                conformément à l’obligation de preuve.
              </p>
            </div>
          )}
        </section>

        <p className="text-xs text-[#999999] leading-relaxed px-1 flex gap-2">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          KURLA ne marque jamais un paiement comme réglé sur la seule foi d’un retour de navigation :
          le statut est relu auprès de Stripe avant confirmation.
        </p>
      </div>
    </div>
  );
};

export default MyAppointmentsPage;
