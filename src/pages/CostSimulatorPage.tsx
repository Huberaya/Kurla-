import React, { useCallback, useState } from 'react';
import { AlertCircle, Info, Loader2, Plus, Scale, Trash2, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  AnnualCostSimulation,
  compareRoutineProfiles,
  CostLineItemInput,
  RoutineComparison,
  simulateRoutineCost
} from '../services/intelligenceService';

const cardClass = 'bg-white border border-[#E8E1DA] rounded-2xl p-5';
const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-sm focus:outline-none focus:border-[#C8753D]';
const primaryButton = 'px-5 py-3 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50';

interface ItemRow {
  label: string;
  price: string;
  estimatedYield: string;
}

const emptyRow = (): ItemRow => ({ label: '', price: '', estimatedYield: '' });

const toItem = (row: ItemRow, index: number): CostLineItemInput => ({
  id: `item-${index}`,
  label: row.label.trim() || `Article ${index + 1}`,
  price: Number(row.price) || 0,
  estimatedYield: row.estimatedYield.trim() || undefined
});

const formatEuro = (value: number | null) =>
  value === null ? '—' : `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;

/**
 * Restitution d'une simulation.
 *
 * Le point d'interface décisif : un article dont le rendement n'est pas déclaré
 * affiche « — » et non un chiffre inventé, et le total est explicitement
 * marqué comme partiel. Afficher « 143 €/an » quand deux produits sur cinq sont
 * inconnus serait un mensonge par omission.
 */
const SimulationResult: React.FC<{ simulation: AnnualCostSimulation }> = ({ simulation }) => (
  <div className="space-y-4">
    <div className={`rounded-xl p-4 ${simulation.partial ? 'bg-[#FFF7ED] border border-[#FED7AA]' : 'bg-[#F5F1EB]'}`}>
      <p className="text-2xl font-bold text-[#111111]">{formatEuro(simulation.annualTotalKnown)}</p>
      <p className="text-xs text-[#666666] mt-1 leading-relaxed">{simulation.statement}</p>
    </div>

    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] font-semibold text-[#999999] uppercase tracking-wider">
          <th className="pb-2">Article</th>
          <th className="pb-2 text-right">Prix</th>
          <th className="pb-2 text-right">Durée d’usage</th>
          <th className="pb-2 text-right">Coût / an</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#E8E1DA]">
        {simulation.lines.map(line => (
          <tr key={line.id}>
            <td className="py-2.5 text-[#111111]">{line.label}</td>
            <td className="py-2.5 text-right text-[#666666]">{line.price.toLocaleString('fr-FR')} €</td>
            <td className="py-2.5 text-right text-[#666666]">
              {line.monthsOfUse === null
                ? <span className="text-[#999999]">non déclaré</span>
                : `${line.monthsOfUse.toLocaleString('fr-FR')} mois`}
            </td>
            <td className={`py-2.5 text-right font-semibold ${line.annualCost === null ? 'text-[#999999]' : 'text-[#111111]'}`}>
              {formatEuro(line.annualCost)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    {simulation.limitations.length > 0 && (
      <ul className="space-y-1.5 border-t border-[#E8E1DA] pt-3">
        {simulation.limitations.map((limitation, index) => (
          <li key={index} className="text-[11px] text-[#999999] leading-relaxed flex gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {limitation}
          </li>
        ))}
      </ul>
    )}
  </div>
);

const ItemEditor: React.FC<{
  rows: ItemRow[];
  onChange: (rows: ItemRow[]) => void;
}> = ({ rows, onChange }) => (
  <div className="space-y-2">
    {rows.map((row, index) => (
      <div key={index} className="flex gap-2 items-start">
        <input
          className={`${inputClass} flex-1`}
          placeholder="Article (ex. shampooing hydratant)"
          value={row.label}
          onChange={event => {
            const next = [...rows];
            next[index] = { ...row, label: event.target.value };
            onChange(next);
          }}
        />
        <input
          className={`${inputClass} w-24`}
          type="number"
          min="0"
          step="0.01"
          placeholder="€"
          value={row.price}
          onChange={event => {
            const next = [...rows];
            next[index] = { ...row, price: event.target.value };
            onChange(next);
          }}
        />
        <input
          className={`${inputClass} w-32`}
          placeholder="ex. 6 mois"
          value={row.estimatedYield}
          onChange={event => {
            const next = [...rows];
            next[index] = { ...row, estimatedYield: event.target.value };
            onChange(next);
          }}
        />
        <button
          className="p-2.5 text-[#999999] hover:text-[#B91C1C] cursor-pointer shrink-0"
          onClick={() => onChange(rows.filter((_, i) => i !== index))}
          aria-label="Retirer la ligne"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ))}
    <button
      className="text-xs text-[#C8753D] hover:underline flex items-center gap-1.5 cursor-pointer pt-1"
      onClick={() => onChange([...rows, emptyRow()])}
    >
      <Plus className="w-3.5 h-3.5" /> Ajouter un article
    </button>
  </div>
);

/**
 * SIMULATEUR DE COÛT ANNUEL + COMPARATEUR DE ROUTINES.
 *
 * Le problème résolu est réel et contre-intuitif : un produit à 9 € qui dure
 * trois semaines coûte plus cher à l'année qu'un produit à 24 € qui dure six
 * mois. Le prix affiché en boutique est un prix d'entrée, pas un coût.
 *
 * Ce que le comparateur ne fait pas : départager l'efficacité. Il porte sur le
 * coût et le temps, les deux seules dimensions comparables sans données
 * longitudinales sur ces produits.
 */
export const CostSimulatorPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;

  const [rowsA, setRowsA] = useState<ItemRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [rowsB, setRowsB] = useState<ItemRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [minutesA, setMinutesA] = useState('');
  const [minutesB, setMinutesB] = useState('');

  const [simulation, setSimulation] = useState<AnnualCostSimulation | null>(null);
  const [comparison, setComparison] = useState<RoutineComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(async () => {
    if (!token) {
      setError('Connexion requise.');
      return;
    }
    const items = rowsA.filter(row => row.label.trim() || row.price.trim()).map(toItem);
    if (items.length === 0) {
      setError('Ajoutez au moins un article avec un prix.');
      return;
    }
    setLoading(true);
    setError(null);
    setComparison(null);
    try {
      const response = await simulateRoutineCost(token, items);
      setSimulation(response.simulation);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Simulation impossible.');
    } finally {
      setLoading(false);
    }
  }, [token, rowsA]);

  const runComparison = useCallback(async () => {
    if (!token) {
      setError('Connexion requise.');
      return;
    }
    const a = rowsA.filter(row => row.label.trim() || row.price.trim()).map(toItem);
    const b = rowsB.filter(row => row.label.trim() || row.price.trim()).map(toItem);
    if (a.length === 0 || b.length === 0) {
      setError('Chaque routine doit contenir au moins un article.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await compareRoutineProfiles(
        token,
        { id: 'routine-a', label: 'Routine A', minutesPerDay: minutesA ? Number(minutesA) : undefined, items: a },
        { id: 'routine-b', label: 'Routine B', minutesPerDay: minutesB ? Number(minutesB) : undefined, items: b }
      );
      setComparison(response.comparison);
      setSimulation(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Comparaison impossible.');
    } finally {
      setLoading(false);
    }
  }, [token, rowsA, rowsB, minutesA, minutesB]);

  const betterLabel = (side: 'a' | 'b' | 'equal' | 'incomparable') => {
    if (side === 'a') return comparison?.a.label ?? 'A';
    if (side === 'b') return comparison?.b.label ?? 'B';
    if (side === 'equal') return 'Identique';
    return 'Non comparable';
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-5">

        <header className={cardClass}>
          <p className="text-[11px] font-semibold text-[#C8753D] uppercase tracking-widest mb-1">
            Économie de routine
          </p>
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight mb-2">
            Ce que votre routine coûte vraiment
          </h1>
          <p className="text-sm text-[#666666] leading-relaxed">
            Un produit à 9 € qui dure trois semaines coûte plus cher à l’année qu’un produit à 24 €
            qui dure six mois. Le prix affiché est un prix d’entrée — pas un coût. Indiquez la durée
            d’usage (ex. « 6 mois » ou « 3 semaines ») pour obtenir un coût annuel comparable.
          </p>
        </header>

        {error && (
          <div className={`${cardClass} flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
            <p className="text-sm text-[#666666]">{error}</p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={cardClass}>
            <h2 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Routine A
            </h2>
            <ItemEditor rows={rowsA} onChange={setRowsA} />
            <label className="block mt-4">
              <span className="text-xs font-medium text-[#666666] block mb-1.5">
                Minutes par jour (optionnel)
              </span>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={minutesA}
                onChange={event => setMinutesA(event.target.value)}
              />
            </label>
          </section>

          <section className={cardClass}>
            <h2 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Scale className="w-4 h-4" /> Routine B
            </h2>
            <ItemEditor rows={rowsB} onChange={setRowsB} />
            <label className="block mt-4">
              <span className="text-xs font-medium text-[#666666] block mb-1.5">
                Minutes par jour (optionnel)
              </span>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={minutesB}
                onChange={event => setMinutesB(event.target.value)}
              />
            </label>
          </section>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className={primaryButton} onClick={runSimulation} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            Calculer le coût annuel de la routine A
          </button>
          <button
            className="px-5 py-3 rounded-xl border border-[#C8753D] text-[#C8753D] text-sm font-semibold flex items-center gap-2 cursor-pointer hover:bg-[#FFF7F1] disabled:opacity-50"
            onClick={runComparison}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
            Comparer A et B
          </button>
        </div>

        {simulation && (
          <section className={cardClass}>
            <h2 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4">
              Coût annuel — Routine A
            </h2>
            <SimulationResult simulation={simulation} />
          </section>
        )}

        {comparison && (
          <section className={cardClass}>
            <h2 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4">
              Comparaison — {comparison.a.label} / {comparison.b.label}
            </h2>

            <div className="rounded-xl bg-[#F5F1EB] p-4 mb-5">
              <p className="text-sm text-[#111111] leading-relaxed">{comparison.verdict}</p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold text-[#999999] uppercase tracking-wider">
                  <th className="pb-2">Critère</th>
                  <th className="pb-2 text-right">{comparison.a.label}</th>
                  <th className="pb-2 text-right">{comparison.b.label}</th>
                  <th className="pb-2 text-right">Avantage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E1DA]">
                {comparison.rows.map(row => (
                  <tr key={row.label}>
                    <td className="py-2.5 text-[#111111]">{row.label}</td>
                    <td className="py-2.5 text-right text-[#666666]">
                      {row.a === null ? '—' : `${row.a.toLocaleString('fr-FR')} ${row.unit}`}
                    </td>
                    <td className="py-2.5 text-right text-[#666666]">
                      {row.b === null ? '—' : `${row.b.toLocaleString('fr-FR')} ${row.unit}`}
                    </td>
                    <td className="py-2.5 text-right text-[#111111] font-medium">
                      {row.better === 'incomparable'
                        ? <span className="text-[#999999]">Non comparable</span>
                        : betterLabel(row.better)}
                      {row.difference !== null && row.difference !== 0 && (
                        <span className="text-[#999999] font-normal"> ({row.difference.toLocaleString('fr-FR')} {row.unit})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {comparison.limitations.length > 0 && (
              <ul className="space-y-1.5 mt-4">
                {comparison.limitations.map((limitation, index) => (
                  <li key={index} className="text-[11px] text-[#999999] leading-relaxed flex gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {limitation}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <p className="text-xs text-[#999999] leading-relaxed px-1">
          Un écart de prix n’est pas un jugement de qualité : une routine plus chère peut être mieux
          adaptée, et une routine moins chère peut l’être tout autant. Cette comparaison porte sur le
          coût et le temps, pas sur l’efficacité — que KURLA ne peut pas évaluer sans données
          longitudinales sur ces produits précis.
        </p>
      </div>
    </div>
  );
};
