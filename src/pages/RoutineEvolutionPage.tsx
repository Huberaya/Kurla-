import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle2, ClipboardCheck, GitCompareArrows, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { applyRoutineEvolution, getProgressJournal, getRoutineEvolution, getSkinJournal } from '../services/routineService';
import type { HairEvolutionReport } from '../lib/knowledge/profileEvolution';
import { JOURNAL_SIGNAL_LABELS, skinSignalLabel } from '../lib/knowledge/profileEvolution';

/**
 * D2 + D6 — « VOTRE PROFIL A ÉVOLUÉ ». Le pont entre les journaux (cheveux ET
 * peau) et les moteurs de conseil : ce que le journal a dit, ce que KURLA en
 * déduit, la routine re-exécutée avec la cause de chaque changement. Les deux
 * parcours partagent le même écran et le même contrat — parité stricte :
 * même structure, logique spécialisée. L'application au profil est un choix
 * explicite de l'utilisateur — KURLA ne réécrit jamais un profil en silence.
 */

type HairJournalEntry = { id: string; entryDate: string; signals: string[]; note?: string };
type SkinJournalEntry = { id?: string; date: string; concerns: string[]; feelingScore?: number; note?: string; notes?: string };

interface DomainBlockProps {
  readonly title: string;
  /** Libellés de colonnes propres au domaine (cycle de lavage vs matin/soir). */
  readonly columns?: readonly [string, string, string];
  readonly intro: string;
  readonly report: HairEvolutionReport | null;
  readonly applied: boolean;
  readonly saving: boolean;
  readonly onApply: () => void;
  readonly children: React.ReactNode;
}

const DomainBlock: React.FC<DomainBlockProps> = ({ title, columns = ['Jour après jour (matin)', 'Le soir', 'Chaque semaine'], intro, report, applied, saving, onApply, children }) => {
  if (!report?.available) {
    return (
      <section className="p-6 rounded-3xl bg-kurla-ivory border border-kurla-stone space-y-4">
        <h2 className="text-lg font-serif-title font-bold">{title}</h2>
        <p className="text-sm text-kurla-carbon/70">{report?.whyUnavailable ?? 'La boucle attend un diagnostic enregistré.'}</p>
        {children}
      </section>
    );
  }
  const changes = report.changes ?? [];
  const confirmations = report.confirmations ?? [];
  const addedSet = new Set(report.added ?? []);
  const changedSet = new Set(report.changed ?? []);
  return (
    <section className="space-y-4">
      <header className="p-6 rounded-3xl bg-kurla-ivory border border-kurla-stone">
        <h2 className="text-lg font-serif-title font-bold">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-kurla-carbon/65">{intro}</p>
      </header>

      <section className="p-6 rounded-3xl bg-kurla-ivory border border-kurla-stone space-y-4">
        <h3 className="text-base font-serif-title font-bold">1 · Ce que ton journal a dit</h3>
        <p className="text-xs text-kurla-carbon/60">{report.entriesUsed} observation{report.entriesUsed > 1 ? 's' : ''} prise{report.entriesUsed > 1 ? 's' : ''} en compte depuis le diagnostic{report.entriesIgnored > 0 ? ` · ${report.entriesIgnored} ignorée${report.entriesIgnored > 1 ? 's' : ''} (antérieure${report.entriesIgnored > 1 ? 's' : ''} ou datée de trop loin)` : ''}.</p>
        {children}
      </section>

      <section className="p-6 rounded-3xl bg-kurla-ivory border border-kurla-stone space-y-4">
        <h3 className="text-base font-serif-title font-bold">2 · Ce que KURLA en déduit</h3>
        {changes.length === 0 && <p className="text-sm text-kurla-carbon/65">Aucun ajustement à proposer : ton journal confirme la routine en cours. C’est un résultat, pas une attente.</p>}
        {changes.map(change => (
          <article key={`${change.field}-${change.to}`} className="p-4 rounded-2xl border border-kurla-copper/30 bg-kurla-sand">
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <span className="text-kurla-carbon/60">{change.from}</span>
              <GitCompareArrows className="w-4 h-4 text-kurla-copper" />
              <span className="text-kurla-copper">{change.to}</span>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-kurla-carbon/50">cause : {change.causedBy}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-kurla-carbon/75">{change.reason}</p>
          </article>
        ))}
        {confirmations.length > 0 && (
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wide text-kurla-carbon/55">Ce qui ne change pas — et pourquoi</h4>
            {confirmations.map((confirmation, index) => (
              <p key={`${confirmation.signal}-${index}`} className="flex items-start gap-2 text-xs leading-relaxed text-kurla-carbon/70"><CheckCircle2 className="mt-0.5 w-3.5 h-3.5 shrink-0 text-emerald-600" /><span><strong>{confirmation.signal} :</strong> {confirmation.reason}</span></p>
            ))}
          </div>
        )}
      </section>

      <section className="p-6 rounded-3xl bg-kurla-ivory border border-kurla-stone space-y-4">
        <h3 className="text-base font-serif-title font-bold">3 · Ta routine recalculée</h3>
        <p className="text-xs text-kurla-carbon/60">Le moteur a été re-exécuté avec tes observations. « Nouveau » = l’étape est apparue ; « recalée » = l’étape reste mais son geste ou son pourquoi a changé à cause du journal.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {([[columns[0], 'morning'], [columns[1], 'evening'], [columns[2], 'weekly']] as const).map(([label, key]) => (
            <div key={key} className="p-4 rounded-2xl bg-kurla-sand space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-kurla-carbon/55">{label}</h4>
              {(report.after as unknown as Record<string, string[]>)[key]?.map(action => (
                <p key={action} className="text-xs leading-relaxed">
                  {addedSet.has(action) && <span className="inline-block mr-1 px-1.5 py-0.5 rounded-full bg-kurla-copper text-white text-[9px] font-bold uppercase align-middle">nouveau</span>}
                  {!addedSet.has(action) && changedSet.has(action) && <span className="inline-block mr-1 px-1.5 py-0.5 rounded-full bg-kurla-amber text-kurla-espresso text-[9px] font-bold uppercase align-middle">recalée</span>}
                  {action}
                </p>
              ))}
              {((report.after as unknown as Record<string, string[]>)[key] ?? []).length === 0 && <p className="text-xs text-kurla-carbon/45">—</p>}
            </div>
          ))}
        </div>
        {report.removed.length > 0 && <p className="text-xs text-kurla-carbon/60">Retirées cette fois : {report.removed.join(' · ')}.</p>}
        <details className="text-xs text-kurla-carbon/70">
          <summary className="cursor-pointer font-bold text-kurla-carbon/60">Comparer avec la version du diagnostic (J+0)</summary>
          <div className="mt-3 space-y-1 leading-relaxed">
            <p><strong>Avant — matin :</strong> {report.before.morning.join(' · ') || '—'}</p>
            <p><strong>Avant — soir :</strong> {report.before.evening.join(' · ') || '—'}</p>
            <p><strong>Avant — chaque semaine :</strong> {report.before.weekly.join(' · ') || '—'}</p>
          </div>
        </details>
        {report.after.summary && <p className="text-xs leading-relaxed text-kurla-carbon/75 border-t border-kurla-stone pt-3">{report.after.summary}</p>}
      </section>

      <section className="p-6 rounded-3xl bg-kurla-ivory border border-kurla-stone flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-base font-serif-title font-bold">4 {applied ? '· Appliquée' : '· Valider dans ton profil'}</h3>
          <p className="mt-1 text-xs leading-relaxed text-kurla-carbon/65">
            {applied
              ? 'Les ajustements sont enregistrés dans ton profil KURLA ID. Continue de noter : la page se remet à jour à chaque nouvelle observation.'
              : 'En appliquant, seul le profil cosmétique change — rien d’autre n’est collecté.'}
          </p>
        </div>
        {!applied && changes.length > 0 && (
          <button type="button" onClick={onApply} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-kurla-copper px-6 py-3 text-sm font-bold text-white hover:bg-kurla-cocoa disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
            {saving ? 'Application…' : 'Appliquer à mon profil'}
          </button>
        )}
        {changes.length === 0 && <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="w-4 h-4" />Rien à appliquer</span>}
      </section>
    </section>
  );
};

export const RoutineEvolutionPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hairReport, setHairReport] = useState<HairEvolutionReport | null>(null);
  const [skinReport, setSkinReport] = useState<HairEvolutionReport | null>(null);
  const [hairApplied, setHairApplied] = useState(false);
  const [skinApplied, setSkinApplied] = useState(false);
  const [hairEntries, setHairEntries] = useState<HairJournalEntry[]>([]);
  const [skinEntries, setSkinEntries] = useState<SkinJournalEntry[]>([]);
  const [saving, setSaving] = useState<'hair' | 'skin' | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Une session KURLA ID est nécessaire pour voir l’évolution de ton profil.');
      return;
    }
    let cancelled = false;
    Promise.all([getRoutineEvolution(token), getProgressJournal(token), getSkinJournal(token).catch(() => ({ entries: [] }))])
      .then(([evolution, hairJournal, skinJournal]) => {
        if (cancelled) return;
        const payload = evolution as { report: HairEvolutionReport | null; skinReport?: HairEvolutionReport | null; applied?: boolean; skinApplied?: boolean };
        setHairReport(payload.report ?? null);
        setSkinReport(payload.skinReport ?? null);
        setHairApplied(Boolean(payload.applied));
        setSkinApplied(Boolean(payload.skinApplied));
        setHairEntries((hairJournal.journal ?? []) as HairJournalEntry[]);
        setSkinEntries((skinJournal.entries ?? []) as SkinJournalEntry[]);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger ton évolution.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const apply = async (domain: 'hair' | 'skin') => {
    if (!token) return;
    setSaving(domain);
    setError('');
    try {
      const result = await applyRoutineEvolution(token, domain);
      const next = (result.report ?? null) as HairEvolutionReport | null;
      if (domain === 'skin') { setSkinReport(next); setSkinApplied(true); }
      else { setHairReport(next); setHairApplied(true); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’appliquer ces ajustements.');
    } finally {
      setSaving(null);
    }
  };

  const shell = 'min-h-screen bg-kurla-sand py-10 px-4 text-kurla-carbon';
  if (loading) return <div className={shell}><div className="mx-auto flex max-w-3xl items-center gap-3 py-20 text-sm text-kurla-carbon/60"><Loader2 className="w-5 h-5 animate-spin text-kurla-copper" />Le moteur relit tes journaux…</div></div>;

  return (
    <div className={shell}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <a href="/account" className="inline-flex items-center gap-2 text-sm font-semibold text-kurla-carbon/70 hover:text-kurla-copper"><ArrowLeft className="w-4 h-4" />Mon espace</a>
          <div className="flex items-center gap-3">
            <a href="/account/progress" className="inline-flex items-center gap-1.5 text-sm font-semibold text-kurla-copper hover:underline">Journal cheveux <Calendar className="w-3.5 h-3.5" /></a>
            <a href="/peau/journal" className="inline-flex items-center gap-1.5 text-sm font-semibold text-kurla-copper hover:underline">Journal peau</a>
          </div>
        </div>

        <header className="p-6 rounded-3xl bg-kurla-ivory border border-kurla-stone">
          <span className="inline-flex items-center gap-2 rounded-full bg-kurla-copper/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-kurla-copper"><Sparkles className="w-3.5 h-3.5" />Votre profil a évolué</span>
          <h1 className="mt-3 text-2xl font-serif-title font-bold">Ce que tes journaux ont changé dans tes routines</h1>
          <p className="mt-2 text-sm text-kurla-carbon/65 leading-relaxed">
            Cheveux et peau suivent la même règle : tu notes ce que tu observes, le moteur KURLA relit et
            recalcule. Rien n’est modifié dans ton profil sans ton accord — tu lis, tu compares, tu appliques.
          </p>
          {error && <p className="mt-3 flex items-start gap-2 text-sm text-kurla-copper"><AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" /><span>{error}</span></p>}
        </header>

        <DomainBlock
          title="Routines cheveux"
          columns={['Jour de lavage', 'Entre deux lavages', 'Chaque semaine']}
          intro="Le journal de progression capillaire (signaux + jauges 1–5) rencontre le moteur segmenté."
          report={hairReport}
          applied={hairApplied}
          saving={saving === 'hair'}
          onApply={() => apply('hair')}
        >
          {hairEntries.slice(0, 4).map(entry => (
            <div key={entry.id} className="p-4 rounded-2xl bg-kurla-sand text-xs space-y-2">
              <time className="font-bold text-sm">{new Date(`${entry.entryDate}T12:00:00`).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</time>
              {entry.signals.length > 0 && <div className="flex flex-wrap gap-1.5">{entry.signals.map(signal => <span key={signal} className="px-2 py-0.5 rounded-full bg-kurla-copper/10 text-kurla-copper font-semibold">{(JOURNAL_SIGNAL_LABELS as Record<string, string>)[signal] ?? signal}</span>)}</div>}
              {entry.note && <p className="text-kurla-carbon/70 leading-relaxed line-clamp-3">{entry.note}</p>}
            </div>
          ))}
          {hairEntries.length === 0 && <p className="text-kurla-carbon/55">Aucune entrée pour le moment — note une observation après ton prochain lavage pour nourrir la boucle.</p>}
          {!hairReport?.available && <div className="flex flex-wrap gap-3 pt-1"><a href="/diagnostic" className="rounded-full bg-kurla-copper px-5 py-2.5 text-sm font-bold text-white hover:bg-kurla-cocoa">Faire un diagnostic cheveux</a><a href="/account/progress" className="rounded-full border border-kurla-stone px-5 py-2.5 text-sm font-semibold hover:border-kurla-copper">Ouvrir le journal cheveux</a></div>}
        </DomainBlock>

        <DomainBlock
          title="Routines peau"
          intro="Le journal cutané (préoccupations + ressenti 1–5) rencontre le moteur de conseil peau — mêmes mécanismes, logique peau."
          report={skinReport}
          applied={skinApplied}
          saving={saving === 'skin'}
          onApply={() => apply('skin')}
        >
          {skinEntries.slice(0, 4).map(entry => (
            <div key={`${entry.date}-${entry.id ?? ''}`} className="p-4 rounded-2xl bg-kurla-sand text-xs space-y-2">
              <time className="font-bold text-sm">{new Date(`${entry.date}T12:00:00`).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</time>
              {(entry.concerns ?? []).length > 0 && <div className="flex flex-wrap gap-1.5">{entry.concerns.map(concern => <span key={concern} className="px-2 py-0.5 rounded-full bg-kurla-copper/10 text-kurla-copper font-semibold">{skinSignalLabel(concern)}</span>)}</div>}
              {typeof entry.feelingScore === 'number' && <p className="text-kurla-carbon/60">Ressenti : {entry.feelingScore}/5</p>}
              {(entry.note || entry.notes) && <p className="text-kurla-carbon/70 leading-relaxed line-clamp-3">{entry.note || entry.notes}</p>}
            </div>
          ))}
          {skinEntries.length === 0 && <p className="text-kurla-carbon/55">Aucune entrée pour le moment — deux minutes de note ce soir nourrissent la boucle.</p>}
          {!skinReport?.available && <div className="flex flex-wrap gap-3 pt-1"><a href="/diagnostic/peau" className="rounded-full bg-kurla-copper px-5 py-2.5 text-sm font-bold text-white hover:bg-kurla-cocoa">Faire un diagnostic peau</a><a href="/peau/journal" className="rounded-full border border-kurla-stone px-5 py-2.5 text-sm font-semibold hover:border-kurla-copper">Ouvrir le journal peau</a></div>}
        </DomainBlock>

        <p className="text-[10px] text-kurla-carbon/45 leading-relaxed">Conseil cosmétique : l’évolution recalcule des routines de soin à partir de tes observations déclarées. Elle ne pose pas de diagnostic et ne remplace pas un avis médical.</p>
      </div>
    </div>
  );
};
