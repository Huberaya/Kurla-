import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Loader2, MessageSquare, RefreshCw, Target, Users } from 'lucide-react';

type Props = { headers: HeadersInit };

type Metric = {
  value: number | null;
  target?: number;
  available: boolean;
  progressPct?: number | null;
  note?: string;
};

type Traction = {
  generatedAt: string;
  metrics: {
    waitlistTesters: Metric;
    closedTesters: Metric;
    testerActivationRatePct: { value: number | null; available: boolean };
    interviewsThisWeek: Metric;
    interviewsPlannedNextWeek: Metric;
    activePartners: Metric;
    enabledPartners: Metric;
    monthlyActiveUsers: Metric;
    shelfUsers: Metric;
    observations: Metric;
    d30Retention: { ratePct: number | null; eligible: number; retained: number; available: boolean; targetPct: number };
    diagnosticToPurchasePct: { value: number | null; available: boolean };
    returnRatePct: { value: number | null; available: boolean };
    nps: { value: number | null; responses: number; available: boolean };
    archetypeEvidenceK: { value: number | null; target: number; available: boolean; qualifyingBuckets: number };
    verifiedReviews: { value: number | null; available: boolean };
  };
  weekly: Array<{ weekStart: string; interviewsCompleted: number | null; newPartners: number | null; npsResponses: number | null; newWaitlist: number | null }>;
  testerFunnel: { waitlisted: number; invited: number; accepted: number; activated: number; available: boolean };
  testerQueue: Array<{ id: string; email: string; testerStatus: string; createdAt: string; invitedAt: string | null; acceptedAt: string | null; activatedAt: string | null; lastActiveAt: string | null; lastActivityKind: string | null; userId: string | null; invitationLastAttemptAt: string | null; invitationSentAt: string | null; invitationAttempts: number; invitationProvider: string | null; invitationLastError: string | null }>;
};

type Professional = { profile: { id: string; displayName: string; city: string; profession: string; category?: string | null } };

const formatValue = (metric: Metric) => !metric.available ? 'Non mesuré' : metric.value == null ? '—' : metric.value.toLocaleString('fr-FR');
const formatPct = (value: number | null, available: boolean) => !available ? 'Non mesuré' : value == null ? '—' : `${value.toLocaleString('fr-FR')} %`;
const formatNps = (value: number | null, available: boolean) => !available ? 'Non mesuré' : value == null ? '—' : value.toLocaleString('fr-FR');

function MetricCard({ label, metric, suffix }: { label: string; metric: Metric; suffix?: string }) {
  const progress = metric.progressPct == null ? null : Math.min(100, Math.max(0, metric.progressPct));
  return (
    <div className="rounded-2xl bg-kurla-ink border border-kurla-cream/10 p-4">
      <p className="text-[10px] uppercase tracking-wider text-kurla-cream/50">{label}</p>
      <p className={`text-xl font-bold mt-1 ${metric.available ? 'text-kurla-cream' : 'text-kurla-cream/45'}`}>
        {formatValue(metric)}{suffix || ''}
      </p>
      {metric.target !== undefined && <p className="text-[10px] text-kurla-cream/45 mt-1">objectif {metric.target.toLocaleString('fr-FR')}{suffix || ''}</p>}
      {progress !== null && <div className="h-1.5 rounded-full bg-kurla-cream/10 mt-3 overflow-hidden"><div className="h-full rounded-full bg-kurla-copper" style={{ width: `${progress}%` }} /></div>}
    </div>
  );
}

export function LaunchTractionPanel({ headers }: Props) {
  const [data, setData] = useState<Traction | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [participantRef, setParticipantRef] = useState('');
  const [interviewSegment, setInterviewSegment] = useState('client');
  const [interviewStatus, setInterviewStatus] = useState('completed');
  const [interviewScheduledFor, setInterviewScheduledFor] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [partnerStatus, setPartnerStatus] = useState('active');
  const [salonOsStatus, setSalonOsStatus] = useState('not_offered');
  const [routineCosigned, setRoutineCosigned] = useState(false);
  const [npsScore, setNpsScore] = useState('');
  const [selectedTesterId, setSelectedTesterId] = useState('');
  const [testerStatus, setTesterStatus] = useState('invited');
  const [invitingTester, setInvitingTester] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tractionResponse, professionalsResponse] = await Promise.all([
        fetch('/api/admin/launch/traction', { headers }),
        fetch('/api/professionals/verified')
      ]);
      const tractionJson = await tractionResponse.json();
      if (!tractionResponse.ok) throw new Error(tractionJson.error || 'Pilotage indisponible.');
      setData(tractionJson);
      if (professionalsResponse.ok) {
        const professionalsJson = await professionalsResponse.json();
        setProfessionals(Array.isArray(professionalsJson.professionals) ? professionalsJson.professionals : []);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Pilotage indisponible.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  const post = async (path: string, payload: Record<string, unknown>) => {
    setMessage('');
    const response = await fetch(path, { method: 'POST', headers, body: JSON.stringify(payload) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || 'Enregistrement impossible.');
    await load();
  };

  if (loading && !data) return <div className="flex items-center justify-center py-12 text-kurla-cream/60"><Loader2 className="w-5 h-5 animate-spin mr-2 text-kurla-copper" /> Chargement de la traction…</div>;
  if (!data) return <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-sm text-rose-200">{message || 'Données de lancement indisponibles.'}<button onClick={load} className="ml-3 underline">Réessayer</button></div>;

  const m = data.metrics;
  const submitInterview = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await post('/api/admin/launch/interviews', {
        participantRef,
        segment: interviewSegment,
        status: interviewStatus,
        scheduledFor: interviewScheduledFor ? new Date(interviewScheduledFor).toISOString() : undefined
      });
      setParticipantRef('');
      setInterviewScheduledFor('');
      setMessage('Entretien enregistré.');
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Entretien non enregistré.'); }
  };
  const submitPartner = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await post('/api/admin/launch/partners', {
        professionalId,
        status: partnerStatus,
        salonOsStatus,
        routineCosigned
      });
      setMessage('Partenariat enregistré.');
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Partenariat non enregistré.'); }
  };
  const submitNps = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await post('/api/admin/launch/nps', { score: Number(npsScore), source: 'launch' }); setNpsScore(''); setMessage('Réponse NPS enregistrée.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Réponse NPS non enregistrée.'); }
  };
  const submitTester = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTesterId) return;
    try {
      await post('/api/admin/launch/testers', { leadId: selectedTesterId, testerStatus: testerStatus });
      setMessage('Statut testeur mis à jour.');
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Statut testeur non mis à jour.'); }
  };

  const inviteTester = async () => {
    if (!selectedTesterId) return;
    const tester = data.testerQueue.find(item => item.id === selectedTesterId);
    if (!tester || !['waitlisted', 'invited'].includes(tester.testerStatus)) return;
    setInvitingTester(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/launch/testers/invite', {
        method: 'POST',
        headers,
        body: JSON.stringify({ leadId: selectedTesterId, resend: tester.testerStatus === 'invited' })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'Invitation non envoyée.');
      await load();
      setMessage(json.preview ? 'Prévisualisation locale journalisée : aucun email réel envoyé.' : json.alreadySent ? 'Invitation déjà envoyée.' : 'Invitation envoyée.');
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Invitation non envoyée.'); }
    finally { setInvitingTester(false); }
  };

  return (
    <section className="rounded-3xl bg-kurla-espresso border border-kurla-copper/30 p-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-serif-title font-bold flex items-center gap-2"><Target className="w-5 h-5 text-kurla-copper" /> Chantier 6 · Traction France</h2>
          <p className="text-xs text-kurla-cream/55 mt-1">Mesures persistées, objectifs explicites et inconnus affichés comme non mesurés.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-kurla-cream/15 px-3 py-1.5 text-xs text-kurla-cream/70"><RefreshCw className="w-3.5 h-3.5" /> Actualiser</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Inscrits liste" metric={m.waitlistTesters} />
        <MetricCard label="Testeurs cohorte" metric={m.closedTesters} />
        <div className="rounded-2xl bg-kurla-ink border border-kurla-cream/10 p-4"><p className="text-[10px] uppercase tracking-wider text-kurla-cream/50">Activation testeurs</p><p className="text-xl font-bold mt-1">{formatPct(m.testerActivationRatePct.value, m.testerActivationRatePct.available)}</p><p className="text-[10px] text-kurla-cream/45 mt-1">Activés parmi la cohorte fermée</p></div>
        <MetricCard label="Entretiens cette semaine" metric={m.interviewsThisWeek} />
        <MetricCard label="Partenaires actifs" metric={m.activePartners} />
        <MetricCard label="Partenaires activés" metric={m.enabledPartners} />
        <MetricCard label="MAU proxy" metric={m.monthlyActiveUsers} />
        <MetricCard label="Shelf remplis" metric={m.shelfUsers} />
        <MetricCard label="Observations résultat" metric={m.observations} />
        <div className="rounded-2xl bg-kurla-ink border border-kurla-cream/10 p-4"><p className="text-[10px] uppercase tracking-wider text-kurla-cream/50">Rétention D30</p><p className="text-xl font-bold text-kurla-cream mt-1">{formatPct(m.d30Retention.ratePct, m.d30Retention.available)}</p><p className="text-[10px] text-kurla-cream/45 mt-1">{m.d30Retention.retained}/{m.d30Retention.eligible} · objectif 25 %</p></div>
        <div className="rounded-2xl bg-kurla-ink border border-kurla-cream/10 p-4"><p className="text-[10px] uppercase tracking-wider text-kurla-cream/50">NPS</p><p className="text-xl font-bold text-kurla-cream mt-1">{formatNps(m.nps.value, m.nps.available)}</p><p className="text-[10px] text-kurla-cream/45 mt-1">score −100 à 100 · {m.nps.responses} réponse(s)</p></div>
      </div>

      <div className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4">
        <p className="text-[10px] uppercase tracking-wider text-kurla-cream/50">Funnel d’onboarding testeurs</p>
        {!data.testerFunnel.available ? <p className="text-sm text-kurla-cream/45 mt-2">Non mesuré</p> : <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs"><div><p className="text-kurla-cream/45">En attente</p><p className="text-lg font-bold">{data.testerFunnel.waitlisted}</p></div><div><p className="text-kurla-cream/45">Invités</p><p className="text-lg font-bold">{data.testerFunnel.invited}</p></div><div><p className="text-kurla-cream/45">Acceptés</p><p className="text-lg font-bold">{data.testerFunnel.accepted}</p></div><div><p className="text-kurla-cream/45">Activés</p><p className="text-lg font-bold">{data.testerFunnel.activated}</p></div></div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
        <div className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4"><p className="font-semibold flex items-center gap-2"><TrendingIcon /> Diagnostic → achat</p><p className="text-lg font-bold mt-2">{formatPct(m.diagnosticToPurchasePct.value, m.diagnosticToPurchasePct.available)}</p><p className="text-[10px] text-kurla-cream/45">Profils beauté ayant une commande payée</p></div>
        <div className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4"><p className="font-semibold">Taux de retour</p><p className="text-lg font-bold mt-2">{formatPct(m.returnRatePct.value, m.returnRatePct.available)}</p><p className="text-[10px] text-kurla-cream/45">Commandes payées avec retour non rejeté</p></div>
        <div className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4"><p className="font-semibold">Avis vérifiés</p><p className="text-lg font-bold mt-2">{m.verifiedReviews.available ? (m.verifiedReviews.value ?? 0) : 'Non mesuré'}</p><p className="text-[10px] text-kurla-cream/45">Après achat vérifié et modération</p></div>
        <div className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4"><p className="font-semibold">k archétype</p><p className="text-lg font-bold mt-2">{!m.archetypeEvidenceK.available ? 'Non mesuré' : m.archetypeEvidenceK.value == null ? '—' : m.archetypeEvidenceK.value}</p><p className="text-[10px] text-kurla-cream/45">Minimum publié · objectif ≥ 30 · {m.archetypeEvidenceK.qualifyingBuckets} segment(s)</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4 overflow-x-auto">
          <h3 className="text-xs font-bold mb-3">Cadence des 8 dernières semaines</h3>
          <table className="w-full text-[10px] text-left"><thead className="text-kurla-cream/45"><tr><th className="pb-2">Semaine</th><th className="pb-2">Entretiens</th><th className="pb-2">Nouveaux inscrits</th><th className="pb-2">Pros</th><th className="pb-2">NPS</th></tr></thead><tbody>{data.weekly.map(week => <tr key={week.weekStart} className="border-t border-kurla-cream/5"><td className="py-2">{week.weekStart}</td><td>{week.interviewsCompleted ?? '—'}</td><td>{week.newWaitlist ?? '—'}</td><td>{week.newPartners ?? '—'}</td><td>{week.npsResponses ?? '—'}</td></tr>)}</tbody></table>
        </div>
        <form onSubmit={submitTester} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4 space-y-3">
          <h3 className="text-xs font-bold">Faire avancer un testeur</h3>
          <select required value={selectedTesterId} onChange={e => setSelectedTesterId(e.target.value)} className="w-full rounded-xl bg-kurla-espresso border border-kurla-cream/15 px-3 py-2 text-xs"><option value="">Choisir une inscription client FR</option>{data.testerQueue.map(tester => <option key={tester.id} value={tester.id}>{tester.email} · {tester.testerStatus}</option>)}</select>
          <select value={testerStatus} onChange={e => setTesterStatus(e.target.value)} className="w-full rounded-xl bg-kurla-espresso border border-kurla-cream/15 px-3 py-2 text-xs"><option value="waitlisted">En attente</option><option value="invited">Invité</option><option value="accepted">Accepté</option><option value="activated">Activé</option><option value="inactive">Inactif</option><option value="declined">Refusé</option></select>
          <button className="w-full rounded-full bg-kurla-copper py-2 text-xs font-bold text-white">Mettre à jour</button>
          {(() => {
            const selected = data.testerQueue.find(item => item.id === selectedTesterId);
            const canInvite = selected && ['waitlisted', 'invited'].includes(selected.testerStatus);
            return <button type="button" disabled={!canInvite || invitingTester} onClick={inviteTester} className="w-full rounded-full border border-kurla-copper/60 py-2 text-xs font-bold text-kurla-amber disabled:opacity-35 disabled:cursor-not-allowed">{invitingTester ? 'Envoi…' : selected?.testerStatus === 'invited' ? 'Renvoyer l’invitation' : 'Envoyer l’invitation'}</button>;
          })()}
          {!data.testerQueue.length && <p className="text-[10px] text-kurla-cream/45">Aucune inscription client FR disponible, ou migration de cohorte non appliquée.</p>}
          <p className="text-[10px] text-kurla-cream/45">Un envoi réel requiert un fournisseur email configuré ; le mode console reste une prévisualisation.</p>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form onSubmit={submitInterview} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4 space-y-3">
          <h3 className="text-xs font-bold flex items-center gap-2"><CalendarDays className="w-4 h-4 text-kurla-copper" /> Ajouter un entretien</h3>
          <input required value={participantRef} onChange={e => setParticipantRef(e.target.value)} placeholder="Référence interne, pas d’email" className="w-full rounded-xl bg-kurla-espresso border border-kurla-cream/15 px-3 py-2 text-xs" />
          <div className="flex gap-2"><select value={interviewSegment} onChange={e => setInterviewSegment(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-kurla-espresso border border-kurla-cream/15 px-2 py-2 text-xs"><option value="client">Client</option><option value="pro">Pro</option><option value="other">Autre</option></select><select value={interviewStatus} onChange={e => setInterviewStatus(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-kurla-espresso border border-kurla-cream/15 px-2 py-2 text-xs"><option value="completed">Réalisé</option><option value="planned">Planifié</option><option value="no_show">Absent</option></select></div>
          <input type="datetime-local" value={interviewScheduledFor} onChange={e => setInterviewScheduledFor(e.target.value)} className="w-full rounded-xl bg-kurla-espresso border border-kurla-cream/15 px-3 py-2 text-xs" aria-label="Créneau de l’entretien" />
          <button className="w-full rounded-full bg-kurla-copper py-2 text-xs font-bold text-white">Enregistrer</button>
        </form>

        <form onSubmit={submitPartner} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4 space-y-3">
          <h3 className="text-xs font-bold flex items-center gap-2"><Users className="w-4 h-4 text-kurla-copper" /> Suivre un partenaire</h3>
          <select required value={professionalId} onChange={e => setProfessionalId(e.target.value)} className="w-full rounded-xl bg-kurla-espresso border border-kurla-cream/15 px-3 py-2 text-xs"><option value="">Choisir un profil vérifié</option>{professionals.map(item => <option key={item.profile.id} value={item.profile.id}>{item.profile.displayName} · {item.profile.city}</option>)}</select>
          <select value={partnerStatus} onChange={e => setPartnerStatus(e.target.value)} className="w-full rounded-xl bg-kurla-espresso border border-kurla-cream/15 px-3 py-2 text-xs"><option value="active">Partenaire actif</option><option value="prospect">Prospect</option><option value="contacted">Contacté</option><option value="paused">En pause</option></select>
          <select value={salonOsStatus} onChange={e => setSalonOsStatus(e.target.value)} className="w-full rounded-xl bg-kurla-espresso border border-kurla-cream/15 px-3 py-2 text-xs"><option value="not_offered">Salon OS · non proposé</option><option value="offered">Salon OS · proposé</option><option value="activated">Salon OS · activé gratuitement</option><option value="declined">Salon OS · refusé</option></select>
          <label className="flex items-center gap-2 text-[11px] text-kurla-cream/70"><input type="checkbox" checked={routineCosigned} onChange={e => setRoutineCosigned(e.target.checked)} /> Routine co-signée</label>
          <button className="w-full rounded-full bg-kurla-copper py-2 text-xs font-bold text-white">Enregistrer</button>
        </form>

        <form onSubmit={submitNps} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4 space-y-3">
          <h3 className="text-xs font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-kurla-copper" /> Saisir un NPS</h3>
          <select required value={npsScore} onChange={e => setNpsScore(e.target.value)} className="w-full rounded-xl bg-kurla-espresso border border-kurla-cream/15 px-3 py-2 text-xs"><option value="">Score de 0 à 10</option>{Array.from({ length: 11 }, (_, score) => <option key={score} value={score}>{score}</option>)}</select>
          <p className="text-[10px] text-kurla-cream/45">Aucun commentaire libre ni donnée personnelle n’est stocké par ce formulaire.</p>
          <button className="w-full rounded-full bg-kurla-copper py-2 text-xs font-bold text-white">Enregistrer</button>
        </form>
      </div>

      {message && <p className="text-xs text-kurla-amber flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {message}</p>}
    </section>
  );
}

function TrendingIcon() {
  return <span className="text-kurla-copper" aria-hidden="true">↗</span>;
}
