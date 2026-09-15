import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Eye, Info, RefreshCw, Sparkles, Users } from 'lucide-react';

/**
 * COPILOTE — le pouls de la plateforme.
 *
 * Règle d'affichage, et elle n'est pas négociable : **un indicateur non
 * mesurable affiche un tiret, jamais un zéro.** Un zéro se lit comme « il
 * n'y en a pas » ; un tiret se lit comme « on ne sait pas ». Les deux
 * n'appellent pas la même décision.
 *
 * Aucune estimation, aucune projection : tout ce qui est affiché est lu.
 */

type Etat = 'mesure' | 'aucun' | 'non_mesurable';

type Indicateur = {
  id: string;
  label: string;
  valeur: number | null;
  unite: string;
  etat: Etat;
  lecture: string;
};

type Pouls = {
  genereLe: string;
  periodeJours: number;
  source: string;
  indicateurs: Indicateur[];
  lecture: string[];
  avertissements: string[];
  produitsActifs: number | null;
  sante: { incidents24h: number | null; incidentsSource: string };
  neFaitPas: string[];
};

const ETATS: Record<Etat, { bord: string; fond: string; texte: string; libelle: string }> = {
  mesure: {
    bord: 'border-emerald-400/30',
    fond: 'bg-emerald-950/25',
    texte: 'text-emerald-200',
    libelle: 'mesuré'
  },
  aucun: {
    bord: 'border-kurla-amber/35',
    fond: 'bg-amber-950/20',
    texte: 'text-kurla-amber',
    libelle: 'aucun'
  },
  non_mesurable: {
    bord: 'border-rose-400/30',
    fond: 'bg-rose-950/20',
    texte: 'text-rose-200',
    libelle: 'non mesurable'
  }
};

const PERIODES = [7, 30, 90, 365];

export const CopilotePanel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [jours, setJours] = useState(30);
  const [data, setData] = useState<Pouls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const reponse = await fetch(`/api/admin/copilote?jours=${jours}`, { headers });
      const corps = await reponse.json();
      if (!reponse.ok) throw new Error(corps.error || 'Copilote indisponible');
      setData(corps as Pouls);
    } catch (e: any) {
      setError(e?.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [headers, jours]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-kurla-amber" />
            <div>
              <h2 className="text-xl font-serif-title font-bold text-kurla-cream">Copilote</h2>
              <p className="text-xs text-kurla-cream/55">
                Tout ce qui est affiché est lu. Rien n’est estimé, rien n’est extrapolé.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {PERIODES.map(valeur => (
              <button
                key={valeur}
                onClick={() => setJours(valeur)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                  jours === valeur
                    ? 'bg-kurla-copper/25 text-kurla-cream border-kurla-copper/60'
                    : 'bg-kurla-ink text-kurla-cream/55 border-kurla-cream/10 hover:border-kurla-copper/40'
                }`}
              >
                {valeur === 365 ? '1 an' : `${valeur} j`}
              </button>
            ))}
            <button
              onClick={load}
              className="p-2 rounded-lg bg-kurla-ink hover:bg-kurla-bark text-kurla-amber border border-kurla-copper/30 transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-400/30 text-sm text-rose-100 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data && (
        <div className="p-8 text-center text-sm text-kurla-cream/50">Lecture des indicateurs…</div>
      )}

      {data && (
        <>
          {/* Indicateurs */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.indicateurs.map(indicateur => {
              const style = ETATS[indicateur.etat];
              return (
                <div key={indicateur.id} className={`p-5 rounded-2xl border ${style.bord} ${style.fond}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-wider text-kurla-cream/60 font-bold">
                      {indicateur.label}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold border ${style.bord} ${style.texte}`}>
                      {style.libelle}
                    </span>
                  </div>
                  <p className="mt-3 flex items-baseline gap-1.5">
                    {/* Un tiret, jamais un zéro, quand la lecture a échoué. */}
                    <span className={`text-3xl font-bold ${indicateur.etat === 'non_mesurable' ? 'text-kurla-cream/40' : 'text-kurla-cream'}`}>
                      {indicateur.valeur === null ? '—' : indicateur.valeur.toLocaleString('fr-FR')}
                    </span>
                    {indicateur.valeur !== null && (
                      <span className="text-xs text-kurla-cream/50">{indicateur.unite}</span>
                    )}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-kurla-cream/65">{indicateur.lecture}</p>
                </div>
              );
            })}

            {/* Catalogue */}
            <div className="p-5 rounded-2xl border border-kurla-cream/10 bg-kurla-ink">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] uppercase tracking-wider text-kurla-cream/60 font-bold">Produits actifs</p>
                <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold border border-kurla-cream/15 text-kurla-cream/60">
                  {data.produitsActifs === null ? 'non mesurable' : 'mesuré'}
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-kurla-cream">
                {data.produitsActifs === null ? '—' : data.produitsActifs.toLocaleString('fr-FR')}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-kurla-cream/65">
                Fiches actives au catalogue, publiées ou non.
              </p>
            </div>

            {/* Santé */}
            <div className="p-5 rounded-2xl border border-kurla-cream/10 bg-kurla-ink">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] uppercase tracking-wider text-kurla-cream/60 font-bold">Incidents serveur (24 h)</p>
                <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold border border-kurla-cream/15 text-kurla-cream/60">
                  {data.sante.incidents24h === null ? 'non mesurable' : 'mesuré'}
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-kurla-cream">
                {data.sante.incidents24h === null ? '—' : data.sante.incidents24h.toLocaleString('fr-FR')}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-kurla-cream/65">
                {data.sante.incidents24h === null
                  ? 'Lecture impossible : la base n’a pas répondu.'
                  : data.sante.incidents24h === 0
                    ? 'Aucune erreur serveur consignée sur 24 heures.'
                    : `${data.sante.incidents24h} erreur(s) serveur consignée(s) : elles sont dans le journal d’audit.`}
              </p>
            </div>
          </div>

          {/* Lecture d'ensemble */}
          {data.lecture.length > 0 && (
            <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10">
              <h3 className="text-sm font-bold text-kurla-cream flex items-center gap-2">
                <Activity className="w-4 h-4 text-kurla-amber" /> Lecture d’ensemble
              </h3>
              <ul className="mt-4 space-y-2.5">
                {data.lecture.map((ligne, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-kurla-cream/80">
                    <Eye className="w-4 h-4 shrink-0 mt-0.5 text-kurla-amber/70" />
                    <span className="leading-relaxed">{ligne}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.lecture.length === 0 && (
            <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10">
              <h3 className="text-sm font-bold text-kurla-cream flex items-center gap-2">
                <Activity className="w-4 h-4 text-kurla-amber" /> Lecture d’ensemble
              </h3>
              <p className="mt-3 text-sm text-kurla-cream/60 leading-relaxed">
                Aucune lecture automatique : il n’y a pas encore assez de données mesurées pour dire
                quelque chose qui ne soit pas une supposition.
              </p>
            </div>
          )}

          {/* Avertissements */}
          {data.avertissements.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-950/25 border border-kurla-amber/30">
              <h3 className="text-sm font-bold text-kurla-amber flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> À savoir sur ces chiffres
              </h3>
              <ul className="mt-3 space-y-2">
                {data.avertissements.map((ligne, index) => (
                  <li key={index} className="text-xs leading-relaxed text-amber-100/80">• {ligne}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Ce que le copilote ne fait pas */}
          <div className="p-5 rounded-2xl border border-kurla-cream/10 bg-kurla-ink/60">
            <h3 className="text-xs font-bold text-kurla-cream/70 flex items-center gap-2 uppercase tracking-wider">
              <Info className="w-3.5 h-3.5" /> Ce que ce copilote ne fait pas
            </h3>
            <ul className="mt-3 space-y-1.5">
              {data.neFaitPas.map((ligne, index) => (
                <li key={index} className="text-xs leading-relaxed text-kurla-cream/55">— {ligne}</li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-kurla-cream/35 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Source : {data.source === 'base' ? 'base de production' : 'jeu de données en mémoire'} ·
            période {data.periodeJours} jours
          </p>
        </>
      )}
    </div>
  );
};
