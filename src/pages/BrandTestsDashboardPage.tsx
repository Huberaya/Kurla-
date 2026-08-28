import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Info, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * CHANTIER 8.6c2 — espace marque : suivi des tests et rapports k-anonymes.
 *
 * L'écran n'affiche que ce que le rapport contient. Quand une cellule est sous
 * le seuil k, elle n'est pas « masquée à l'affichage » : elle n'est pas dans la
 * réponse. L'écran le dit, plutôt que de laisser croire à un résultat absent.
 */

interface BrandTestSummary {
  id: string;
  productName: string;
  status: string;
  statusLabel: string;
  cohort: { needs: string[] };
  targetParticipants: number;
  durationDays: number;
  submittedAt: string;
  adminComment: string | null;
}

interface ReportCell {
  need: string;
  participants: number;
  positive: number;
  neutral: number;
  negative: number;
  positiveShare: number | null;
}

interface BrandTestReport {
  productName: string;
  hypothesis: string;
  cohortNeeds: string[];
  totals: { participants: number; withdrawals: number; suppressedCells: number; publishable: boolean };
  cells: ReportCell[];
  signals: { positive: number; neutral: number; negative: number; unknown: number } | null;
  kThreshold: number;
  caveats: string[];
}

const NEED_LABELS: Record<string, string> = {
  hydrater_cheveux: 'Hydrater les longueurs',
  reduire_casse: 'Réduire la casse',
  definir_boucles: 'Définir les boucles',
  cuir_chevelu: 'Cuir chevelu',
  entretenir_tresses: 'Entretenir les tresses',
  entretenir_locks: 'Entretenir les locks',
  entretenir_perruque: 'Entretenir une perruque',
  proteger_nuit: 'Protéger la nuit',
  protection_solaire: 'Protection solaire',
  taches_hyperpigmentation: 'Taches et hyperpigmentation',
  imperfections_acne: 'Imperfections',
  peau_sensible: 'Peau sensible',
  hydrater_peau: 'Hydrater la peau'
};

const authHeaders = (token?: string) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

export const BrandTestsDashboardPage: React.FC = () => {
  const [tests, setTests] = useState<BrandTestSummary[]>([]);
  const [reports, setReports] = useState<Record<string, BrandTestReport | null>>({});
  const [error, setError] = useState<string | null>(null);
  // Le jeton vient du contexte d'authentification existant, jamais d'un
  // stockage relu à la main.
  const { session } = useAuth();
  const token = session?.access_token;

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/brand-tests/mine', { headers: authHeaders(token) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Vos tests n’ont pas pu être chargés.');
      const list: BrandTestSummary[] = Array.isArray(data?.requests) ? data.requests : [];
      setTests(list);

      const entries = await Promise.all(
        list.map(async test => {
          const reportResponse = await fetch(`/api/brand-tests/${test.id}/report`, { headers: authHeaders(token) });
          const reportData = await reportResponse.json().catch(() => ({}));
          return [test.id, reportResponse.ok ? (reportData?.report as BrandTestReport) : null] as const;
        })
      );
      setReports(Object.fromEntries(entries));
    } catch (err: any) {
      setError(err?.message || 'Vos tests n’ont pas pu être chargés.');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-10">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2">Espace marque</span>
          <h1 className="text-3xl sm:text-4xl font-serif-title font-bold mb-2">Vos tests produits</h1>
          <p className="text-sm text-[#FFF7EF]/65">
            Les rapports sont k-anonymes. Aucune donnée personnelle n’y figure, et une cellule sous le seuil n’est pas
            transmise du tout.
          </p>
        </div>

        {error && (
          <div className="mb-8 rounded-xl border border-[#C8753D]/40 bg-[#C8753D]/10 p-4 text-sm text-[#FFF7EF]/80">{error}</div>
        )}

        {!token && (
          <p className="rounded-xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-4 text-sm text-[#FFF7EF]/65">
            Connexion requise : cet espace n’est accessible qu’à un compte portant le rôle marque.
          </p>
        )}

        {token && tests.length === 0 && !error && (
          <p className="rounded-xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-4 text-sm text-[#FFF7EF]/65">
            Aucun test pour le moment. Déposez une demande depuis la page espace marque.
          </p>
        )}

        <ul className="space-y-6">
          {tests.map(test => {
            const report = reports[test.id];
            return (
              <li key={test.id} className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
                  <h2 className="text-lg font-semibold">{test.productName}</h2>
                  <span className="text-xs uppercase tracking-wide text-[#C8753D]">{test.statusLabel}</span>
                </div>
                <p className="text-xs text-[#FFF7EF]/55 mb-4">
                  Cohorte : {test.cohort.needs.map(need => NEED_LABELS[need] ?? need).join(', ')} · cible{' '}
                  {test.targetParticipants} participants · {test.durationDays} jours
                </p>
                {test.adminComment && (
                  <p className="mb-4 rounded-lg border border-[#FFF7EF]/10 p-3 text-xs text-[#FFF7EF]/60">
                    Retour KURLA : {test.adminComment}
                  </p>
                )}

                {!report ? (
                  <p className="text-sm text-[#FFF7EF]/55">Rapport non disponible pour ce test.</p>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap gap-4 text-sm">
                      <span>
                        Participants comptés : <strong>{report.totals.participants}</strong>
                      </span>
                      <span>
                        Retraits : <strong>{report.totals.withdrawals}</strong>
                      </span>
                      <span>
                        Cellules non transmises : <strong>{report.totals.suppressedCells}</strong>
                      </span>
                    </div>

                    {report.totals.publishable && report.signals ? (
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-[#FFF7EF]/50">
                          <tr>
                            <th className="py-2">Besoin</th>
                            <th className="py-2">Participants</th>
                            <th className="py-2">Positifs</th>
                            <th className="py-2">Neutres</th>
                            <th className="py-2">Négatifs</th>
                            <th className="py-2">Part de positifs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.cells.map(cell => (
                            <tr key={cell.need} className="border-t border-[#FFF7EF]/10">
                              <td className="py-2">{NEED_LABELS[cell.need] ?? cell.need}</td>
                              <td className="py-2">{cell.participants}</td>
                              <td className="py-2">{cell.positive}</td>
                              <td className="py-2">{cell.neutral}</td>
                              <td className="py-2">{cell.negative}</td>
                              <td className="py-2">
                                {cell.positiveShare === null ? '—' : `${Math.round(cell.positiveShare * 100)} %`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="flex items-start gap-2 rounded-lg border border-[#FFF7EF]/10 p-3 text-sm text-[#FFF7EF]/65">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                        Effectif sous le seuil k = {report.kThreshold} : aucune distribution n’est transmise. Ce n’est
                        pas un résultat négatif, c’est un résultat non publiable.
                      </p>
                    )}

                    <div className="mt-4 flex items-start gap-2 text-xs text-[#FFF7EF]/50">
                      <BarChart3 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Signaux non reconnus comptés à part : {report.signals?.unknown ?? 0}. Un résultat négatif a la
                        même valeur qu’un résultat positif.
                      </span>
                    </div>

                    <ul className="mt-4 space-y-1 text-xs text-[#FFF7EF]/45">
                      {report.caveats.slice(0, 3).map(caveat => (
                        <li key={caveat.slice(0, 32)} className="flex items-start gap-2">
                          <Info className="mt-0.5 h-3 w-3 shrink-0" />
                          {caveat}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
