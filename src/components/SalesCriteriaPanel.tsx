import React, { useEffect, useMemo, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { ColumnFilterStrip, applyColumnFilters, emptyFilterState, type ColumnFilter, listFilter } from '../lib/columnFilters';
import { CRITERION_FAMILIES, matchCriterion, type SalesCriterion } from '../lib/salesCriteria';

/**
 * CHANTIER A — ÉCRAN « CRITÈRES DE MISE EN VENTE ».
 *
 * La carte versionnée (GET /api/admin/catalog/criteria) : liste nommée,
 * version, famille, règle, source de donnée — et, en regard, combien de
 * fiches le catalogue actuel bloque sur chaque critère (publication-readiness
 * mesurée, jamais supposée). Cet écran décrit le moteur : il ne change
 * aucune règle.
 */
const FAMILY_BADGE: Record<string, string> = {
  legale: 'bg-rose-500/15 text-rose-300',
  editoriale: 'bg-violet-500/15 text-violet-300',
  visuelle: 'bg-sky-500/15 text-sky-300',
  commerciale: 'bg-emerald-500/15 text-emerald-300',
};

const APPLIES_LABEL: Record<SalesCriterion['appliesTo'], string> = {
  tous: 'tous les produits',
  cosmetiques: 'cosmétiques seulement',
  produits_categorises: 'produits catégorisés',
};

export const SalesCriteriaPanel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [map, setMap] = useState<any | null>(null);
  const [readiness, setReadiness] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [mapRes, readyRes] = await Promise.all([
          fetch('/api/admin/catalog/criteria', { headers }),
          fetch('/api/admin/catalog/publication-readiness', { headers }),
        ]);
        const mapBody = await mapRes.json();
        if (!mapRes.ok) throw new Error(mapBody.error || 'Carte des critères indisponible.');
        if (cancelled) return;
        setMap(mapBody);
        if (readyRes.ok) {
          const readyBody = await readyRes.json();
          if (!cancelled) setReadiness(readyBody);
        }
        // La readiness est un enrichissement : son échec n'empêche pas la carte.
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Erreur de chargement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [headers]);

  // Combien de fiches le catalogue actuel bloque sur chaque critère — mesuré
  // sur les libellés émis par le moteur, reconciliés avec la carte par clé.
  const blockedCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of readiness?.perProduct || []) {
      const seen = new Set<string>();
      for (const label of p.missing || []) {
        const criterion = matchCriterion(label);
        const key = criterion ? criterion.id : `inconnu:${label}`;
        if (seen.has(key)) continue;
        seen.add(key);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    return counts;
  }, [readiness]);

  // Filtres de la carte (calcul partagé du catalogue — même contrat que les
  // autres panneaux) : recherche sur libellé/règle, famille, portée.
  const CRITERIA_FILTER_KEYS = ['label', 'family', 'appliesTo'] as const;
  const criteriaFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'label', ...listFilter({ key: 'label', rows: (map?.criteria || []) as SalesCriterion[], get: (c: SalesCriterion) => c.label, extra: (c: SalesCriterion) => [c.rule, c.id] }) },
    { key: 'family', kind: 'enum', get: (c: SalesCriterion) => c.family, options: Object.entries(CRITERION_FAMILIES).map(([value, label]) => ({ value, label })) },
    { key: 'appliesTo', kind: 'enum', get: (c: SalesCriterion) => c.appliesTo, options: [
      { value: 'tous', label: 'Tous les produits' },
      { value: 'cosmetiques', label: 'Cosmétiques' },
      { value: 'produits_categorises', label: 'Produits catégorisés' },
    ] },
  ], [map]);
  const [criteriaFilterState, setCriteriaFilterState] = useState(() => emptyFilterState(CRITERIA_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]));
  const visibleCriteria = useMemo(
    () => applyColumnFilters((map?.criteria || []) as SalesCriterion[], criteriaFilters, criteriaFilterState),
    [map, criteriaFilters, criteriaFilterState]
  );

  if (loading) return <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 text-xs text-kurla-cream/50">Lecture de la carte des critères…</div>;
  if (error || !map) return <div className="p-6 rounded-3xl bg-espresso border border-rose-400/30 text-rose-300 text-xs">{error || 'Carte des critères indisponible.'}</div>;

  const totalBlockedFiches = (readiness?.perProduct || []).filter((p: any) => (p.missing || []).length > 0).length;

  return (
    <section className="rounded-3xl border border-kurla-cream/10 bg-kurla-espresso/60 p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-bold flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-kurla-amber" /> Critères de mise en vente
          <span className="px-2 py-0.5 rounded-full bg-kurla-copper/15 border border-kurla-copper/40 text-kurla-copper text-[10px] font-bold">v{map.version}</span>
        </h2>
        <p className="text-[11px] text-kurla-cream/55">
          La source unique du moteur de publication-readiness — {map.criteria.length} critères nommés, versionnés.
          Cet écran <span className="font-bold">décrit</span> le moteur : il ne change aucune règle.
          {readiness ? ` Aujourd'hui : ${totalBlockedFiches} fiche${totalBlockedFiches > 1 ? 's' : ''} bloquée${totalBlockedFiches > 1 ? 's' : ''} par au moins un critère.` : ' État du catalogue non mesuré (comptes masqués, jamais supposés).'}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {map.families.map((f: any) => (
          <span key={f.family} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${FAMILY_BADGE[f.family] || 'bg-kurla-cream/10 text-kurla-cream/60'}`}>
            {f.label} · {f.count}
          </span>
        ))}
      </div>

      <ColumnFilterStrip
        filters={criteriaFilters}
        state={criteriaFilterState}
        onChange={(key, value) => setCriteriaFilterState(prev => ({ ...prev, [key]: value }))}
        onReset={() => setCriteriaFilterState(emptyFilterState(CRITERIA_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]))}
        total={(map?.criteria || []).length}
        shown={visibleCriteria.length}
      />

      <div className="overflow-x-auto rounded-2xl border border-kurla-cream/10 [scrollbar-width:thin]">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-[9px] uppercase tracking-wider text-kurla-cream/40 border-b border-kurla-cream/10">
              <th className="px-3 py-2">Critère</th>
              <th className="px-3 py-2">Famille</th>
              <th className="px-3 py-2">Portée</th>
              <th className="px-3 py-2">Règle</th>
              <th className="px-3 py-2">Source de donnée</th>
              <th className="px-3 py-2 text-right">Bloque</th>
            </tr>
          </thead>
          <tbody>
            {visibleCriteria.map((criterion: SalesCriterion) => {
              const blocked = blockedCount.get(criterion.id) || 0;
              return (
                <tr key={criterion.id} className="border-b border-kurla-cream/5 align-top hover:bg-kurla-ink/40">
                  <td className="px-3 py-2 font-bold text-kurla-cream/85 whitespace-nowrap">{criterion.label}</td>
                  <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${FAMILY_BADGE[criterion.family] || 'bg-kurla-cream/10 text-kurla-cream/60'}`}>{CRITERION_FAMILIES[criterion.family]}</span></td>
                  <td className="px-3 py-2 text-kurla-cream/50 whitespace-nowrap">{APPLIES_LABEL[criterion.appliesTo]}</td>
                  <td className="px-3 py-2 text-kurla-cream/65 min-w-[240px]">{criterion.rule}</td>
                  <td className="px-3 py-2 text-kurla-cream/45 font-mono text-[10px] whitespace-nowrap">{criterion.source}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{blocked > 0 ? <span className="font-bold text-amber-300">{blocked} fiche{blocked > 1 ? 's' : ''}</span> : <span className="text-kurla-cream/25">—</span>}</td>
                </tr>
              );
            })}
            {visibleCriteria.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-[11px] text-kurla-cream/40">
                  Aucun critère ne correspond à ces filtres — <button type="button" className="text-kurla-copper font-bold hover:underline" onClick={() => setCriteriaFilterState(emptyFilterState(CRITERIA_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]))}>réinitialiser</button>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-kurla-cream/40">
        « Bloque » = nombre de fiches du catalogue actuel dont la publication-readiness émet ce critère (mesuré, recalculé à l'ouverture).
        Les libellés dynamiques du moteur (ids cités, documents expirés) sont reconciliés sur leur critère par la clé de champ — jamais un critère fantôme.
      </p>
    </section>
  );
};
