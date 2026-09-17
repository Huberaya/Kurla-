import React, { useCallback, useEffect, useState } from 'react';
import { Power, Eye, Zap, PauseCircle, PlayCircle, Undo2, RefreshCw, ShieldCheck } from 'lucide-react';
import { AUTO_PUBLISH_EXCLUSION_LABELS, AUTO_PUBLISH_STAGE_LABELS, type AutoPublishPlan, type AutoPublishStage } from '../lib/autoPublication';

/**
 * CHANTIER E — AUTO-PUBLICATION (watch → active).
 *
 * L'écran de la machine : son état (éteinte / surveillance / active), sa
 * pause en un clic (datée, nommée, journalisée), l'évaluation à la demande
 * (« N fiches deviendraient conformes » en watch — rien n'est écrit), et le
 * rollback d'un clic de la dernière vague.
 *
 * Règle d'or affichée à l'écran : la machine ne publie que les fiches
 * draft TOUS CRITÈRES AU VERT (carte du chantier A, version inscrite dans
 * chaque décision d'audit) — fiches de test, kits et fiches sous drapeau
 * « publication manuelle » en sont exclus, avec leur raison nommée.
 *
 * Une seule boucle de données (la liste des décisions) : ce panneau ne
 * filtre pas un catalogue, il lit l'état d'une machine.
 */

interface PolicyState {
  available: boolean;
  reason?: string;
  autoPublishAvailable: boolean;
  autoPublishStage: AutoPublishStage;
  autoPublishPausedAt: string | null;
  autoPublishPausedBy: string | null;
  autoPublishLastBatch: { batchId: string; at: string | null; productIds: string[] } | null;
  note: string | null;
}

interface DecisionRow {
  key: string;
  title: string;
  kind: 'eligible' | 'excluded';
  reason?: string;
  detail?: string;
}

export const AutoPublicationPanel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [policy, setPolicy] = useState<PolicyState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<{ mode: 'watch' | 'active'; plan: AutoPublishPlan; published?: Array<{ productId: string; title: string }>; message?: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auto-publication/state', { headers });
      const data = await res.json();
      if (!res.ok || !data.policy) throw new Error(data.error || `HTTP ${res.status}`);
      setPolicy(data.policy);
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.message || 'état illisible');
    }
  }, [headers]);

  // `headers` est récréé à chaque rendu du parent : on re-lit l'état une
  // seule fois au montage (même convention que les panneaux voisins).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const call = async (path: string, body: any, busyKey: string) => {
    setBusy(busyKey);
    setActionError(null);
    try {
      const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.policy) setPolicy(data.policy);
      return { res, data };
    } catch (error: any) {
      setActionError(error?.message || 'action impossible');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const handleStage = (stage: AutoPublishStage) => {
    if (stage === 'active' && !window.confirm('Armer la machine en mode ACTIF : les évaluations suivantes publieront les fiches draft au vert (fiches de test, kits et publication manuelle exclus). Continuer ?')) return;
    call('/api/admin/auto-publication/stage', { stage, note: note.trim() || undefined }, `stage-${stage}`).then(out => {
      if (out) setNote('');
    });
  };

  const handlePause = () => {
    const paused = !policy?.autoPublishPausedAt;
    if (paused && !window.confirm('Mettre la machine en pause : les évaluations seront refusées tant qu’on ne reprend pas. Continuer ?')) return;
    call('/api/admin/auto-publication/pause', { paused }, 'pause');
  };

  const handleRun = async () => {
    setBusy('run');
    setActionError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/auto-publication/run', { method: 'POST', headers, body: JSON.stringify({ trigger: 'manuel' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult({ mode: data.mode, plan: data.plan, published: data.published, message: data.note || data.error });
      load();
    } catch (error: any) {
      setActionError(error?.message || 'évaluation impossible');
    } finally {
      setBusy(null);
    }
  };

  const handleRollback = () => {
    if (!window.confirm(`Annuler la dernière auto-publication ? Les fiches de la vague toujours publiées repartent en draft (auditée).`)) return;
    call('/api/admin/auto-publication/rollback', {}, 'rollback').then(out => {
      if (out) setResult(null);
    });
  };

  if (loadError) {
    return (
      <section className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3">
        <h2 className="font-bold flex items-center gap-2"><Zap className="w-4 h-4 text-kurla-amber" /> Auto-publication</h2>
        <p className="text-xs text-kurla-cream/60">État de la machine illisible : {loadError}</p>
      </section>
    );
  }

  if (!policy) {
    return (
      <section className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10">
        <h2 className="font-bold flex items-center gap-2"><Zap className="w-4 h-4 text-kurla-amber" /> Auto-publication</h2>
        <p className="text-xs text-kurla-cream/50 mt-2">Lecture de l'état de la machine…</p>
      </section>
    );
  }

  const paused = Boolean(policy.autoPublishPausedAt);
  const lastBatch = policy.autoPublishLastBatch;

  // Une seule boucle de rendu dans ce panneau : la construction se fait en
  // parcours classique, l'affichage en unique .map (contrat du banc des filtres).
  const decisions: DecisionRow[] = [];
  if (result) {
    for (const e of result.plan.eligible) decisions.push({ key: `ok-${e.productId}`, title: e.title, kind: 'eligible' });
    for (const x of result.plan.excluded) decisions.push({ key: `no-${x.productId}`, title: x.title, kind: 'excluded', reason: AUTO_PUBLISH_EXCLUSION_LABELS[x.reason], detail: x.detail });
  }

  return (
    <section className="rounded-3xl border border-kurla-cream/10 bg-kurla-espresso/60 p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold flex items-center gap-2 text-kurla-cream"><Zap className="w-4 h-4 text-kurla-amber" /> Auto-publication — la machine</h2>
          <p className="text-[11px] text-kurla-cream/55 mt-1 max-w-2xl leading-relaxed">
            Publie seule les fiches <strong className="text-kurla-cream/80">draft tous critères au vert</strong> (carte versionnée, chantier A) —
            et rien d’autre. Fiches de test, kits et fiches sous drapeau « publication manuelle » sont exclus, avec leur raison nommée.
            Chaque décision est journalisée (produit, version des critères, déclencheur, date) ; la dernière vague s’annule en un clic.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-full bg-kurla-ink border border-kurla-cream/15 text-kurla-cream/70 hover:text-white transition-colors"
          title="Relire l’état de la machine"
        >
          <RefreshCw className={`w-4 h-4 ${busy === 'state' ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!policy.available && (
        <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
          Politique de publication non lisible — machine off : {policy.reason || 'raison non fournie'}.
        </div>
      )}
      {policy.available && !policy.autoPublishAvailable && (
        <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200">
          Colonnes auto-publication absentes de la base — machine off, état nommé.
          Migration à appliquer (éditeur SQL Supabase) : <span className="font-mono break-all">supabase/migrations/20261004000000_auto_publication.sql</span>.
        </div>
      )}

      {/* État de la machine : stage + pause (interrupteur daté et nommé). */}
      {policy.available && policy.autoPublishAvailable && (
        <div className="space-y-3">
          {/* Trois états fixes de la machine : un contrôle, pas des données. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => handleStage('off')}
              className={`text-left p-3 rounded-2xl border transition-colors disabled:opacity-50 ${policy.autoPublishStage === 'off' ? 'bg-rose-500/10 border-rose-400/40 text-kurla-cream' : 'bg-kurla-ink border-kurla-cream/10 text-kurla-cream/60 hover:border-kurla-cream/25'}`}
            >
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${policy.autoPublishStage === 'off' ? '' : 'opacity-70'}`}><Power className="w-3.5 h-3.5" />{AUTO_PUBLISH_STAGE_LABELS.off}</span>
              <span className="block text-[10px] mt-1 text-kurla-cream/50 leading-snug">Aucune évaluation, aucun écrit.</span>
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => handleStage('watch')}
              className={`text-left p-3 rounded-2xl border transition-colors disabled:opacity-50 ${policy.autoPublishStage === 'watch' ? 'bg-sky-500/15 border-sky-400/50 text-kurla-cream' : 'bg-kurla-ink border-kurla-cream/10 text-kurla-cream/60 hover:border-kurla-cream/25'}`}
            >
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${policy.autoPublishStage === 'watch' ? '' : 'opacity-70'}`}><Eye className="w-3.5 h-3.5" />{AUTO_PUBLISH_STAGE_LABELS.watch}</span>
              <span className="block text-[10px] mt-1 text-kurla-cream/50 leading-snug">Journalise ce qui deviendrait publié. Rien n’est écrit.</span>
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => handleStage('active')}
              className={`text-left p-3 rounded-2xl border transition-colors disabled:opacity-50 ${policy.autoPublishStage === 'active' ? 'bg-kurla-copper/25 border-kurla-copper text-kurla-cream' : 'bg-kurla-ink border-kurla-cream/10 text-kurla-cream/60 hover:border-kurla-cream/25'}`}
            >
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${policy.autoPublishStage === 'active' ? '' : 'opacity-70'}`}><Zap className="w-3.5 h-3.5" />{AUTO_PUBLISH_STAGE_LABELS.active}</span>
              <span className="block text-[10px] mt-1 text-kurla-cream/50 leading-snug">Publie les fiches draft au vert, auditée, rollbackable.</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePause}
              disabled={busy !== null}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[11px] font-bold transition-colors ${paused ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30' : 'bg-amber-500/15 border-amber-400/40 text-amber-200 hover:bg-amber-500/25'}`}
            >
              {paused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
              {paused ? 'Reprendre la machine' : 'Mettre en pause (un clic)'}
            </button>
            {paused && policy.autoPublishPausedAt && (
              <span className="text-[10px] text-amber-200/80">
                en pause depuis le {new Date(policy.autoPublishPausedAt).toLocaleString('fr-FR')} par {policy.autoPublishPausedBy || 'admin inconnu'}
              </span>
            )}
            <button
              type="button"
              onClick={handleRun}
              disabled={busy !== null || paused}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-kurla-copper text-white text-[11px] font-bold hover:bg-kurla-copper/85 disabled:opacity-40 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {busy === 'run' ? 'Évaluation en cours…' : policy.autoPublishStage === 'watch' ? 'Évaluer (surveillance — rien ne sera écrit)' : 'Évaluer et publier les fiches prêtes'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={500}
              placeholder="Note pour le journal (facultatif) — ex. « avant le lot de septembre »"
              className="flex-1 px-3 py-1.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] text-kurla-cream focus:outline-none focus:border-kurla-copper/50"
            />
          </div>
        </div>
      )}

      {/* Dernière vague + rollback d'un clic. */}
      {lastBatch && lastBatch.productIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl border border-kurla-copper/30 bg-kurla-copper/10">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-kurla-cream">Dernière auto-publication : {lastBatch.productIds.length} fiche{lastBatch.productIds.length > 1 ? 's' : ''}</p>
            <p className="text-[10px] text-kurla-cream/55">
              vague <span className="font-mono">{lastBatch.batchId}</span>{lastBatch.at ? ` · le ${new Date(lastBatch.at).toLocaleString('fr-FR')}` : ''} — à vérifier.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRollback}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-bold disabled:opacity-40 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" /> Annuler (rollback)
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">{actionError}</div>
      )}

      {/* Résultat de la dernière évaluation : les décisions, avec leurs raisons. */}
      {result && (
        <div className="space-y-3">
          <div className={`p-3 rounded-2xl border text-xs ${result.mode === 'watch' ? 'bg-sky-950/40 border-sky-400/30 text-sky-100' : 'bg-emerald-950/40 border-emerald-400/30 text-emerald-100'}`}>
            {result.mode === 'watch'
              ? <><strong>{result.plan.eligible.length} fiche{result.plan.eligible.length > 1 ? 's' : ''} deviendrait{result.plan.eligible.length > 1 ? 'aient' : ''} publiée{result.plan.eligible.length > 1 ? 's' : ''}</strong> — surveillance : rien n’a été écrit. Déclencheur : {result.plan.trigger} · critères v{result.plan.criteriaVersion}.</>
              : <><strong>{result.published ? result.published.length : 0} fiche{(result.published ? result.published.length : 0) > 1 ? 's' : ''} auto-publiée{(result.published ? result.published.length : 0) > 1 ? 's' : ''}</strong> (vague {result.plan.batchId}, critères v{result.plan.criteriaVersion}, déclencheur : {result.plan.trigger}) — à vérifier. {(result.plan.eligible.length || 0) > (result.published ? result.published.length : 0) ? result.message : ''}</>}
          </div>

          {decisions.length > 0 && (
            <div className="rounded-2xl border border-kurla-cream/10 overflow-hidden">
              <div className="px-3 py-2 bg-kurla-ink text-[10px] uppercase tracking-wider text-kurla-cream/50 font-bold">
                Décisions de l’évaluation ({result.plan.eligible.length} éligible{result.plan.eligible.length > 1 ? 's' : ''} · {result.plan.excluded.length} exclu{result.plan.excluded.length > 1 ? 'e' : ''}s)
              </div>
              <ul className="divide-y divide-kurla-cream/5 max-h-72 overflow-y-auto">
                {decisions.map(row => (
                  <li key={row.key} className={`px-3 py-2 text-[11px] flex items-center gap-2 ${row.kind === 'eligible' ? 'text-emerald-200' : 'text-kurla-cream/60'}`}>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold border ${row.kind === 'eligible' ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300' : 'bg-kurla-cream/10 border-kurla-cream/20 text-kurla-cream/60'}`}>
                      {row.kind === 'eligible' ? 'publié' : 'exclu'}
                    </span>
                    <span className="truncate font-semibold">{row.title}</span>
                    {row.reason && <span className="shrink-0 text-[9px] uppercase tracking-wide text-amber-300/80">{row.reason}</span>}
                    {row.detail && <span className="truncate text-[10px] text-kurla-cream/40">{row.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-kurla-cream/40 leading-relaxed">
        Mode strict de la boutique (C3) et machine d’auto-publication vivent dans la même ligne de politique, journalisée : un interrupteur sans journal
        n’est pas un interrupteur. Le déclencheur aujourd’hui est l’action manuelle ; les événements (import, document, rattachement fournisseur,
        expiration) appelleront la même évaluation — même moteur, même audit.
      </p>
    </section>
  );
};
