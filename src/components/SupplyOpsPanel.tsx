import React, { useEffect, useMemo, useState } from 'react';
import { ProductName, SupplierName } from './EditableRecordName';
import { Boxes, Search, TriangleAlert } from 'lucide-react';

/**
 * MISSION SYSTÈME D'ACHAT — VUE OPS APPROVISIONNEMENT (§23, §29).
 *
 * Répond aux questions opérationnelles sans détour : qu'avons-nous, qui le
 * fournit, avec quel modèle, quelle marge, qui expédie, quoi régler en
 * premier. Toute valeur absente s'affiche « à obtenir » — jamais inventée.
 */

const MODEL_LABELS: Record<string, string> = {
  dropshipping: 'Dropshipping',
  affiliation: 'Affiliation',
  '3pl': '3PL',
  stock_kurla: 'Stock KURLA',
  other: 'Autre',
};

const eur = (cents: number | null | undefined) => (cents == null ? 'à obtenir' : `${(cents / 100).toFixed(2).replace('.', ',')} €`);

export const SupplyOpsPanel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  // Rechargé après un enregistrement depuis une fiche : l'alerte corrigée
  // disparaît d'elle-même, la marge recalculée s'affiche.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/admin/sourcing/ops', { headers });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Vue ops indisponible.');
        setData(body);
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement.');
      }
    })();
  }, [headers, reloadToken]);

  const products = useMemo(() => {
    let all = data?.products || [];
    if (modelFilter !== 'all') all = all.filter((p: any) => p.primaryModel === modelFilter);
    if (showAlertsOnly) {
      const alerted = new Set((data?.alerts || []).map((a: any) => a.subject));
      all = all.filter((p: any) => alerted.has(p.name));
    }
    const low = filter.toLowerCase();
    return low ? all.filter((p: any) => p.name.toLowerCase().includes(low)) : all;
  }, [data, filter, modelFilter, showAlertsOnly]);

  if (error) return <div className="p-6 rounded-3xl bg-espresso border border-rose-400/30 text-rose-300 text-xs">{error}</div>;
  if (!data) return <div className="p-6 rounded-3xl bg-espresso border border-kurla-cream/10 text-xs text-kurla-cream/60">Chargement de la vue ops…</div>;

  const { kpi, alerts, dropshipRule } = data;

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3">
        <h3 className="font-bold flex items-center gap-2"><Boxes className="w-4 h-4 text-kurla-amber" /> Approvisionnement — pilotage</h3>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-kurla-ink border border-kurla-cream/10">{kpi.products} produits</span>
          <span className="px-2.5 py-1 rounded-lg bg-kurla-ink border border-kurla-cream/10"><span className="text-emerald-300 font-bold">{kpi.withSource}</span> avec source</span>
          {Object.entries(kpi.byModel || {}).filter(([, n]) => (n as number) > 0).map(([model, n]) => (
            <span key={model} className="px-2.5 py-1 rounded-lg bg-kurla-ink border border-kurla-cream/10">{MODEL_LABELS[model] || model} : <span className="font-bold">{String(n)}</span></span>
          ))}
          <span className="px-2.5 py-1 rounded-lg bg-kurla-ink border border-kurla-cream/10">{kpi.suppliers} fournisseurs · <span className={kpi.suppliersWithoutContact > 0 ? 'text-amber-300' : 'text-emerald-300'}>{kpi.suppliersWithoutContact} sans contact</span></span>
        </div>
      </div>

      {dropshipRule && <DropshipRuleCard dropshipRule={dropshipRule} headers={headers} onSaved={() => setReloadToken(t => t + 1)} />}

      {alerts.length > 0 && (
        <div className="p-6 rounded-3xl bg-rose-950/30 border border-rose-400/30 space-y-2">
          <h3 className="font-bold flex items-center gap-2 text-rose-200"><TriangleAlert className="w-4 h-4" /> Alertes ({kpi.criticalAlerts} critiques / {alerts.length})</h3>
          <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
            {alerts.map((alert: any, index: number) => (
              <p key={index} className="text-[11px]">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold mr-2 ${alert.severity === 'critical' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>{alert.severity === 'critical' ? 'critique' : 'à surveiller'}</span>
                {alert.productId
                  ? <ProductName id={alert.productId} label={alert.supplierId ? String(alert.subject).split(' → ')[0] : alert.subject} headers={headers} className="text-[11px] font-semibold" onSaved={() => setReloadToken(t => t + 1)} />
                  : <span className="font-semibold">{alert.subject}</span>}
                {alert.supplierId && <> → <SupplierName id={alert.supplierId} label={String(alert.subject).split(' → ').slice(1).join(' → ')} headers={headers} className="text-[11px]" /></>} <span className="text-kurla-cream/60">— {alert.message}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold mr-auto">Produits · marge · expédition ({products.length})</h3>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Rechercher un produit…" className="sm:w-64 px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs" />
          <select value={modelFilter} onChange={e => setModelFilter(e.target.value)} className="px-2 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px]">
            <option value="all">Tous les modèles</option>
            {Object.entries(MODEL_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <button type="button" onClick={() => setShowAlertsOnly(v => !v)} className={`px-3 py-2 rounded-xl border text-[11px] font-bold ${showAlertsOnly ? 'bg-rose-500/15 border-rose-400/40 text-rose-300' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/60'}`}>Seulement avec alerte</button>
        </div>
        <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
          {products.map((product: any) => (
            <div key={product.id} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/5 text-[11px] space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex-1 min-w-[180px]"><ProductName id={String(product.id)} label={product.name} headers={headers} className="text-[11px] font-semibold" onSaved={() => setReloadToken(t => t + 1)} /></span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-300">{product.catalogStatus}</span>
                {product.primaryModel
                  ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-kurla-copper/15 text-kurla-copper">{MODEL_LABELS[product.primaryModel] || product.primaryModel}</span>
                  : <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-300">sans source</span>}
                <span className="w-24 text-right">{eur(product.priceCents)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 text-kurla-cream/60">
                <span>coût total : <span className="text-kurla-cream/85 font-semibold">{eur(product.margin?.totalCostCents)}</span></span>
                <span>{product.margin?.model === 'affiliation' ? 'commission attendue' : 'marge'} : <span className={`font-semibold ${product.margin?.marginCents != null && product.margin.marginCents <= 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{product.margin ? (product.margin.marginCents == null ? 'à obtenir' : `${eur(product.margin.marginCents)}${product.margin.marginPct != null ? ` (${product.margin.marginPct} %)` : ''}`) : '—'}</span></span>
                <span>expédition : <span className="text-kurla-cream/85 font-semibold">{product.route?.responsible || 'à déterminer'}</span>{product.route?.leadTimeDays != null && <span className="text-kurla-cream/45"> · {product.route.leadTimeDays} j</span>}{product.route?.shipsFrom && <span className="text-kurla-cream/45"> · depuis {product.route.shipsFrom}</span>}</span>
              </div>
              {(product.route?.blockers?.length > 0 || product.margin?.missing?.length > 0) && (
                <p className="text-[10px] text-amber-300/80">
                  {product.route?.blockers?.length > 0 && <>⛔ {product.route.blockers.join(' · ')}</>}
                  {product.route?.blockers?.length > 0 && product.margin?.missing?.length > 0 && ' — '}
                  {product.margin?.missing?.length > 0 && <>à obtenir pour calculer : {product.margin.missing.join(', ')}</>}
                </p>
              )}
            </div>
          ))}
          {products.length === 0 && <p className="text-[11px] text-kurla-cream/45">Aucun produit ne correspond.</p>}
        </div>
        <p className="text-[10px] text-kurla-cream/45 flex items-center gap-1"><Search className="w-3 h-3" /> Les sources se gèrent par produit (table `product_sources`) ; aucune intégration fournisseur n’est simulée : tant qu’aucun partenaire réel n’est connecté, les valeurs viennent de la saisie admin.</p>
      </div>
    </div>
  );
};

/**
 * CARTE RÈGLE D'OR — matériels & outils = dropship 24–48h, 0 carton à Paris.
 * Présentationale pure : les données viennent de la vue ops (route
 * /api/admin/sourcing/ops, bloc dropshipRule). Chaque nom est cliquable vers
 * la fiche éditable — l'enregistrement déclenche onSaved (rechargement).
 */
export const DropshipRuleCard: React.FC<{ dropshipRule: any; headers: Record<string, string>; onSaved: () => void }> = ({ dropshipRule, headers, onSaved }) => (
        <div className="p-6 rounded-3xl bg-kurla-espresso border-2 border-kurla-copper/50 space-y-3">
          <div className="flex items-start gap-2.5">
            <Boxes className="w-5 h-5 text-kurla-amber shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-kurla-amber">Règle d’or Année 1 — tous les matériels &amp; outils sont en dropship 24–48h</h3>
              <p className="text-[11px] text-kurla-cream/60 mt-1">
                Expédiés à l’unité par notre partenaire UE — <span className="font-bold text-kurla-cream/85">0 carton à Paris</span> (catégorie « accessoires » = matériels &amp; outils).
                {' '}{dropshipRule.toolTotal} produit(s) concerné(s) · <span className="text-emerald-300 font-bold">{dropshipRule.conforming.length} conforme(s)</span>
                {dropshipRule.violations.length > 0 && <> · <span className="text-rose-300 font-bold">{dropshipRule.violations.length} hors règle</span></>}.
              </p>
            </div>
          </div>
          {dropshipRule.violations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-rose-300">Hors règle — cliquez sur le nom pour corriger la fiche</p>
              {dropshipRule.violations.map((violation: any) => (
                <div key={`tool-violation-${violation.productId}`} className="px-3 py-2 rounded-xl bg-rose-950/25 border border-rose-500/25 flex flex-wrap items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                  <ProductName id={String(violation.productId)} label={violation.name} headers={headers} className="text-[11px] font-bold text-rose-100" onSaved={() => onSaved()} />
                  <span className="text-[10px] text-rose-200/75">{(violation.reasons || []).join(' · ')}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-kurla-ink border border-kurla-cream/10 text-kurla-cream/60">{violation.catalogStatus}</span>
                </div>
              ))}
            </div>
          )}
          <details>
            <summary className="cursor-pointer text-[11px] font-bold text-emerald-300">{dropshipRule.conforming.length} matériel(s) &amp; outil(s) conforme(s) — dropship 24–48h ✓</summary>
            <div className="grid md:grid-cols-2 gap-1.5 mt-2">
              {dropshipRule.conforming.map((entry: any) => (
                <div key={`tool-ok-${entry.productId}`} className="px-3 py-2 rounded-xl bg-emerald-950/20 border border-emerald-500/15 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <ProductName id={String(entry.productId)} label={entry.name} headers={headers} className="text-[11px] font-semibold text-emerald-100/90" onSaved={() => onSaved()} />
                </div>
              ))}
            </div>
          </details>
        </div>
      
);

/**
 * SECTION AUTONOME pour l'onglet « Guide dropship 0 carton » : charge le
 * bloc dropshipRule de la vue ops et affiche la même carte — la règle et
 * l'état des matériels & outils sont visibles là où l'on pense à les
 * chercher, pas seulement dans la vue ops.
 */
export const DropshipToolsSection: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/admin/sourcing/ops', { headers });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Vue ops indisponible.');
        setData(body);
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement.');
      }
    })();
  }, [headers, reloadToken]);

  if (error) return <div className="p-6 rounded-3xl bg-kurla-espresso border border-rose-400/30 text-rose-300 text-xs">{error}</div>;
  if (!data?.dropshipRule) return <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 text-xs text-kurla-cream/60">Chargement de l'état dropship des matériels &amp; outils…</div>;
  return <DropshipRuleCard dropshipRule={data.dropshipRule} headers={headers} onSaved={() => setReloadToken(t => t + 1)} />;
};
