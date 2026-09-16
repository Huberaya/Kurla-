import React, { useEffect, useMemo, useState } from 'react';
import { ColumnFilterStrip, applyColumnFilters, emptyFilterState, type ColumnFilter } from '../lib/columnFilters';
import { Boxes, ChevronRight, Search } from 'lucide-react';

/**
 * RÉFÉRENCES IDENTIFIÉES — l'inventaire complet de ce que le sourcing a
 * trouvé, classé par catégorie puis par usage (étape de routine), avec la
 * piste/fournisseur derrière chaque référence.
 *
 * Données réelles uniquement : la table `sourcing_product_candidates`
 * (mesuré le 16/09 : 121 références — 100 peau, 12 cheveux, 6 outils,
 * 2 enfants, 1 solaire), chaque référence rattachée à sa piste. Aucun
 * regroupement inventé : une référence sans usage renseigné est affichée
 * dans « Usage non précisé », pas devinée.
 */

const CATEGORY_LABELS: Record<string, string> = {
  peau: 'Peau',
  hair: 'Cheveux',
  tools: 'Outils & accessoires',
  kids: 'Enfants',
  solar: 'Solaire',
};

const GOVERNANCE_LABELS: Record<string, { label: string; tone: string }> = {
  blocked: { label: 'bloquée — preuve manquante', tone: 'border-rose-500/25 bg-rose-500/10 text-rose-300' },
  waiting_inci: { label: 'INCI attendu', tone: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  in_progress: { label: 'en cours', tone: 'border-sky-500/25 bg-sky-500/10 text-sky-300' },
  ready: { label: 'prête', tone: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' },
  published: { label: 'publiée', tone: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200' },
};

const eur = (cents?: number | null) =>
  typeof cents === 'number' && cents > 0 ? `${(cents / 100).toFixed(2).replace('.', ',')} €` : null;

type Candidate = {
  id: string;
  prospectId?: string;
  brand?: string;
  product?: string;
  routineStep?: string;
  category?: string;
  purchasePriceCents?: number | null;
  publicPriceCents?: number | null;
  marginPct?: number | null;
  governanceStatus?: string;
};

export const SourcedReferencesPanel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Inventaire COMPLET : les références identifiées ne dépendent pas de
  // l'espace de travail affiché — on interroge sans filtre de workspace.
  const allHeaders = useMemo(() => {
    const normalized: Record<string, string> = {};
    new Headers(headers as HeadersInit).forEach((value, key) => { normalized[key] = value; });
    delete normalized['x-kurla-workspace'];
    return normalized;
  }, [headers]);

  useEffect(() => {
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch('/api/admin/sourcing/candidates', { headers: allHeaders }),
          fetch('/api/admin/sourcing/prospects', { headers: allHeaders }),
        ]);
        const cBody = await cRes.json();
        if (!cRes.ok) throw new Error(cBody.error || 'Références indisponibles.');
        setCandidates(cBody.candidates || []);
        if (pRes.ok) {
          const pBody = await pRes.json();
          setProspects(pBody.prospects || []);
        }
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    })();
  }, [allHeaders]);

  const prospectName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of prospects) map.set(String(p.id), String(p.name || p.id));
    return map;
  }, [prospects]);

  const searchFiltered = useMemo(() => {
    const low = search.trim().toLowerCase();
    if (!low) return candidates;
    return candidates.filter(c =>
      `${c.brand || ''} ${c.product || ''} ${c.routineStep || ''} ${prospectName.get(String(c.prospectId || '')) || ''}`.toLowerCase().includes(low),
    );
  }, [candidates, search, prospectName]);

  // Filtres par champ (17/09), posés APRÈS la recherche existante : la
  // recherche reste le réflexe, les filtres précisent (marque exacte, piste,
  // gouvernance, prix). 121 candidats en base — dérouler n'est pas tenable.
  const SOURCED_FILTER_KEYS = ['brand', 'prospect', 'gov', 'purchase', 'public', 'margin'] as const;
  const sourcedFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'brand', kind: 'text', get: (c: Candidate) => c.brand, extra: (c: Candidate) => [c.product] },
    { key: 'prospect', kind: 'text', get: (c: Candidate) => prospectName.get(String(c.prospectId || '')) || '' },
    { key: 'gov', kind: 'enum', get: (c: Candidate) => String(c.governanceStatus || 'blocked'), options: Object.entries(GOVERNANCE_LABELS).map(([value, meta]) => ({ value, label: meta.label })) },
    { key: 'purchase', kind: 'numeric', get: (c: Candidate) => (c.purchasePriceCents == null ? NaN : c.purchasePriceCents / 100), unit: ' €' },
    { key: 'public', kind: 'numeric', get: (c: Candidate) => (c.publicPriceCents == null ? NaN : c.publicPriceCents / 100), unit: ' €' },
    { key: 'margin', kind: 'numeric', get: (c: Candidate) => (typeof c.marginPct === 'number' ? c.marginPct : NaN), unit: ' %' },
  ], [prospectName]);
  const [sourcedFilterState, setSourcedFilterState] = useState(() => emptyFilterState(SOURCED_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]));
  const filtered = useMemo(
    () => applyColumnFilters(searchFiltered, sourcedFilters, sourcedFilterState),
    [searchFiltered, sourcedFilters, sourcedFilterState]
  );

  // catégorie → usage → références. Ordre des catégories : les plus fournies d'abord.
  const grouped = useMemo(() => {
    const byCategory = new Map<string, Map<string, Candidate[]>>();
    for (const c of filtered) {
      const category = String(c.category || 'autre');
      const usage = String(c.routineStep || '').trim() || 'Usage non précisé';
      if (!byCategory.has(category)) byCategory.set(category, new Map());
      const byUsage = byCategory.get(category)!;
      if (!byUsage.has(usage)) byUsage.set(usage, []);
      byUsage.get(usage)!.push(c);
    }
    return [...byCategory.entries()]
      .map(([category, byUsage]) => ({
        category,
        total: [...byUsage.values()].reduce((n, list) => n + list.length, 0),
        usages: [...byUsage.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  if (loading) return <div className="p-5 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 text-xs text-kurla-cream/50">Chargement des références identifiées…</div>;
  if (error) return <div className="p-5 rounded-3xl bg-kurla-espresso border border-rose-400/30 text-rose-300 text-xs">Références : {error}</div>;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold flex items-center gap-2 text-kurla-cream"><Boxes className="w-4 h-4 text-kurla-amber" /> Références identifiées — par catégorie et par usage</h3>
          <p className="text-[11px] text-kurla-cream/55 mt-1 max-2xl">
            Tout ce que le sourcing a identifié : {candidates.length} références, chacune avec sa piste/fournisseur. Une référence « bloquée » attend sa preuve (tarif écrit, INCI, visuel) — rien n'est masqué, rien n'est inventé.
          </p>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-kurla-cream/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrer (marque, produit, usage, fournisseur)…" className="pl-8 pr-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] text-kurla-cream w-64 focus:outline-none focus:border-kurla-copper" />
        </div>
      </div>

      <ColumnFilterStrip
        filters={sourcedFilters}
        state={sourcedFilterState}
        onChange={(key, value) => setSourcedFilterState(prev => ({ ...prev, [key]: value }))}
        onReset={() => setSourcedFilterState(emptyFilterState(SOURCED_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]))}
        total={searchFiltered.length}
        shown={filtered.length}
      />

      {grouped.length === 0 && <p className="text-xs text-kurla-cream/45 italic">Aucune référence ne correspond à ce filtre.</p>}

      <div className="space-y-2">
        {grouped.map(({ category, total, usages }) => (
          <details key={category} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink overflow-hidden" open={total <= 20}>
            <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 text-sm font-bold text-kurla-cream hover:bg-kurla-cream/[0.03]">
              <ChevronRight className="w-4 h-4 text-kurla-copper transition-transform [[open]>&]:rotate-90" />
              {CATEGORY_LABELS[category] || category}
              <span className="px-2 py-0.5 rounded-full bg-kurla-copper/15 text-kurla-copper text-[10px] font-bold">{total} référence(s)</span>
              <span className="text-[10px] font-normal text-kurla-cream/40">{usages.length} usage(s)</span>
            </summary>
            <div className="px-4 pb-4 space-y-3">
              {usages.map(([usage, list]) => (
                <div key={usage}>
                  <p className="text-[10px] uppercase tracking-wider text-kurla-amber font-bold mb-1.5">{usage} <span className="text-kurla-cream/40 font-normal">· {list.length}</span></p>
                  <div className="space-y-1">
                    {list.map(c => {
                      const gov = GOVERNANCE_LABELS[String(c.governanceStatus || 'blocked')] || GOVERNANCE_LABELS.blocked;
                      const purchase = eur(c.purchasePriceCents);
                      const publicPrice = eur(c.publicPriceCents);
                      return (
                        <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 rounded-xl bg-kurla-espresso border border-kurla-cream/5 text-[11px]">
                          <span className="font-semibold text-kurla-cream">{c.brand && !c.brand.startsWith('À confirmer') ? `${c.brand} — ` : ''}{c.product || c.id}</span>
                          {c.brand?.startsWith('À confirmer') && <span className="text-amber-300/80 text-[10px]">marque à confirmer</span>}
                          <span className="text-kurla-cream/55">Fournisseur/piste : <span className="text-kurla-copper">{prospectName.get(String(c.prospectId || '')) || 'non rattachée'}</span></span>
                          {purchase && <span className="text-kurla-cream/55">achat : {purchase}</span>}
                          {publicPrice && <span className="text-kurla-cream/55">public : {publicPrice}</span>}
                          {typeof c.marginPct === 'number' && <span className="text-emerald-300">marge {c.marginPct}%</span>}
                          <span className={`ml-auto px-2 py-0.5 rounded-full border text-[9px] font-bold ${gov.tone}`}>{gov.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>

      <p className="text-[10px] text-kurla-cream/40">Source : table des références candidates (sourcing) + pistes. Pour faire avancer une référence : panneau « Workflow candidat » ci-dessous.</p>
    </div>
  );
};
