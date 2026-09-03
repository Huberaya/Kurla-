import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Database, EyeOff, Info, SearchX } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import type { TextureGapReport } from '../lib/textureGap';
import type { TextureGapAvailability } from '../lib/db/textureGapStore';

/**
 * CHANTIER 8.6a — Texture Gap Report (administration).
 *
 * L'écran n'affiche que des agrégats déjà k-anonymisés : une cellule sous le
 * seuil n'est pas masquée ici, elle n'est pas dans la réponse. Le nombre de
 * cellules supprimées est affiché, parce qu'un lecteur doit savoir qu'un angle
 * mort peut exister sans apparaître.
 */

const VERDICT_LABEL: Record<string, { label: string; className: string }> = {
  angle_mort: { label: 'Angle mort', className: 'text-red-300 bg-red-500/10 border-red-500/30' },
  partiel: { label: 'Couverture partielle', className: 'text-amber-200 bg-amber-500/10 border-amber-500/30' },
  couvert: { label: 'Couvert', className: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/30' },
  donnees_insuffisantes: { label: 'Données insuffisantes', className: 'text-[#FFF7EF]/60 bg-[#FFF7EF]/5 border-[#FFF7EF]/15' }
};

export const TextureGapPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;

  const [report, setReport] = useState<TextureGapReport | null>(null);
  const [availability, setAvailability] = useState<TextureGapAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/intelligence/texture-gap', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Le rapport n’a pas pu être généré.');
      setReport(data.report);
      setAvailability(data.availability);
    } catch (err: any) {
      setError(err?.message || 'Le rapport n’a pas pu être généré.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C8753D]">KURLA Intelligence</p>
          <h1 className="text-3xl sm:text-4xl font-semibold">Texture Gap Report</h1>
          <p className="text-[#FFF7EF]/70 max-w-2xl">
            Besoins déclarés par les membres, par archétype, face à la couverture du catalogue publié.
            Agrégats uniquement : aucune donnée individuelle n’entre dans ce rapport ni n’en sort.
          </p>
        </header>

        {error && (
          <p className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </p>
        )}
        {loading && <p className="text-[#FFF7EF]/60">Génération KURLA de ton rapport…</p>}

        {availability && (
          <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-medium"><Database className="w-4 h-4 text-[#C8753D]" /> Base du rapport</h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-[#FFF7EF]/75">
              <div className="flex justify-between gap-4"><dt>Profils lus</dt><dd className="text-[#FFF7EF]">{availability.membersRead}</dd></div>
              <div className="flex justify-between gap-4"><dt>dont archétype connu</dt><dd className="text-[#FFF7EF]">{availability.membersWithArchetype}</dd></div>
              <div className="flex justify-between gap-4"><dt>Produits lus</dt><dd className="text-[#FFF7EF]">{availability.productsRead}</dd></div>
              <div className="flex justify-between gap-4"><dt>dont publiés</dt><dd className="text-[#FFF7EF]">{availability.publishedProducts}</dd></div>
              <div className="flex justify-between gap-4"><dt>Seuil de k-anonymité</dt><dd className="text-[#FFF7EF]">{report?.kThreshold ?? '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt>Origine des données</dt><dd className="text-[#FFF7EF]">{availability.persistence === 'supabase' ? 'Supabase' : 'repli mémoire'}</dd></div>
            </dl>
            {availability.membersTruncated && (
              <p className="text-xs text-amber-200">Lecture bornée : le rapport porte sur un échantillon, pas sur toute la base.</p>
            )}
            <p className="flex items-start gap-2 text-sm text-[#FFF7EF]/60">
              <Info className="w-4 h-4 mt-0.5 shrink-0" /> {availability.coverageNote}
            </p>
          </section>
        )}

        {report && (
          <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-3">
            <h2 className="text-lg font-medium">Ce que le rapport peut dire</h2>
            <dl className="grid sm:grid-cols-3 gap-4 text-sm">
              <div><dt className="text-[#FFF7EF]/60">Cellules publiées</dt><dd className="text-2xl text-[#FFF7EF]">{report.totals.publishedCells}</dd></div>
              <div><dt className="text-[#FFF7EF]/60">Angles morts</dt><dd className="text-2xl text-red-300">{report.totals.blindSpots}</dd></div>
              <div><dt className="text-[#FFF7EF]/60">Couverture partielle</dt><dd className="text-2xl text-amber-200">{report.totals.partial}</dd></div>
            </dl>
            {report.totals.suppressedCells > 0 && (
              <p className="flex items-start gap-2 text-sm text-[#FFF7EF]/60">
                <EyeOff className="w-4 h-4 mt-0.5 shrink-0" />
                {report.totals.suppressedCells} cellule{report.totals.suppressedCells > 1 ? 's' : ''} supprimée{report.totals.suppressedCells > 1 ? 's' : ''}
                {' '}(cohorte sous {report.kThreshold}, {report.totals.suppressedMembers} membre{report.totals.suppressedMembers > 1 ? 's' : ''}) :
                un angle mort peut exister sans apparaître ici.
              </p>
            )}
          </section>
        )}

        {report && report.cells.length === 0 && (
          <p className="flex items-start gap-2 text-sm text-[#FFF7EF]/60 bg-[#0B0806] border border-[#FFF7EF]/10 rounded-2xl px-4 py-3">
            <SearchX className="w-4 h-4 mt-0.5 shrink-0" />
            Aucune cellule publiable : pas assez de profils déclarés pour atteindre le seuil de {report.kThreshold} membres par archétype et préoccupation.
          </p>
        )}

        {report && report.cells.length > 0 && (
          <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-[#FFF7EF]/50 border-b border-[#FFF7EF]/10">
                <tr>
                  <th className="px-4 py-3 font-normal">Archétype</th>
                  <th className="px-4 py-3 font-normal">Besoin déclaré</th>
                  <th className="px-4 py-3 font-normal text-right">Membres</th>
                  <th className="px-4 py-3 font-normal text-right">Couverture</th>
                  <th className="px-4 py-3 font-normal">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {report.cells.map(cell => {
                  const verdict = VERDICT_LABEL[cell.verdict] ?? VERDICT_LABEL.donnees_insuffisantes;
                  return (
                    <tr key={`${cell.archetypeId}-${cell.concern}`} className="border-b border-[#FFF7EF]/5 align-top">
                      <td className="px-4 py-3 text-[#FFF7EF]/80">{cell.archetypeLabel}</td>
                      <td className="px-4 py-3 text-[#FFF7EF]/80">
                        {cell.concern}
                        <span className="block text-xs text-[#FFF7EF]/45">{cell.explanation}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[#FFF7EF]">{cell.memberCount}</td>
                      <td className="px-4 py-3 text-right text-[#FFF7EF]/70">
                        {cell.coverage === null ? 'inconnue' : `${Math.round(cell.coverage * 100)} %`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs border ${verdict.className}`}>{verdict.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {report && (
          <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-2">
            <h2 className="text-base font-medium">Réserves</h2>
            <ul className="text-xs text-[#FFF7EF]/55 space-y-1">
              {report.caveats.map(caveat => <li key={caveat}>• {caveat}</li>)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default TextureGapPage;
