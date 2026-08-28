import React, { useCallback, useEffect, useState } from 'react';
import { Code2, Info, Lock, ShieldCheck } from 'lucide-react';

/**
 * CHANTIER 8.6b — documentation de l'API publique.
 *
 * Page publique et indexable : une API que personne ne peut découvrir n'est pas
 * une ouverture. Le manifeste est chargé en direct, donc la documentation ne
 * peut pas dériver de ce qui est réellement monté.
 */

interface Endpoint {
  method: string;
  path: string;
  description: string;
  auth: boolean;
}

interface Manifest {
  name: string;
  version: string;
  baseUrl: string;
  attribution: string;
  rateLimits: Record<string, string>;
  endpoints: Endpoint[];
  engagements: string[];
  neverExposed: string[];
}

const METHOD_CLASS: Record<string, string> = {
  GET: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/30',
  POST: 'text-[#C8753D] bg-[#C8753D]/10 border-[#C8753D]/30'
};

export const ApiDocsPage: React.FC = () => {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/manifest');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Le manifeste n’a pas pu être chargé.');
      setManifest(data as Manifest);
    } catch (err: any) {
      setError(err?.message || 'Le manifeste n’a pas pu être chargé.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C8753D]">Développeurs</p>
          <h1 className="text-3xl sm:text-4xl font-semibold">API publique KURLA</h1>
          <p className="text-[#FFF7EF]/70 max-w-2xl">
            Le catalogue vérifié et le score d’adéquation KURLA Fit, en lecture seule. Sans compte, sans clé,
            sans état : vous envoyez un profil, vous recevez un classement, KURLA ne conserve rien.
          </p>
        </header>

        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
        )}

        <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-medium"><Code2 className="w-4 h-4 text-[#C8753D]" /> Endpoints</h2>
          {!manifest && !error && <p className="text-sm text-[#FFF7EF]/60">Chargement du manifeste…</p>}
          {manifest && (
            <ul className="space-y-3">
              {manifest.endpoints.map(endpoint => (
                <li key={`${endpoint.method} ${endpoint.path}`} className="space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`px-2 py-0.5 rounded border text-xs ${METHOD_CLASS[endpoint.method] ?? ''}`}>{endpoint.method}</span>
                    <code className="text-[#FFF7EF]">{endpoint.path}</code>
                  </p>
                  <p className="text-sm text-[#FFF7EF]/60">{endpoint.description}</p>
                </li>
              ))}
            </ul>
          )}
          {manifest && (
            <p className="text-xs text-[#FFF7EF]/45">
              Version {manifest.version} · base {manifest.baseUrl} · manifeste machine :{' '}
              <code>/api/v1/manifest</code>
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-4">
          <h2 className="text-lg font-medium">Exemple — scorer un profil</h2>
          <pre className="text-xs text-[#FFF7EF]/80 bg-black/40 rounded-xl p-4 overflow-x-auto">{`POST /api/v1/scoring/fit
Content-Type: application/json

{
  "profile": {
    "hair": { "curlPattern": "4c", "porosity": "haute", "breakage": "frequente" },
    "skin": { "sensitivity": "sensible" }
  }
}`}</pre>
          <p className="text-sm text-[#FFF7EF]/60">
            Les champs absents restent inconnus : rien n’est complété à votre place. Si aucun champ n’est
            renseigné, chaque score vaut <code>null</code> avec <code>evaluable: false</code> — jamais 0, car 0
            voudrait dire « mauvais produit » alors que cela veut dire « on ne sait rien ».
          </p>
        </section>

        <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-medium"><ShieldCheck className="w-4 h-4 text-emerald-300" /> Engagements</h2>
          <ul className="text-sm text-[#FFF7EF]/70 space-y-1">
            {(manifest?.engagements ?? []).map(item => <li key={item}>• {item}</li>)}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-medium"><Lock className="w-4 h-4 text-[#FFF7EF]/60" /> Ce que cette API n’expose jamais</h2>
          <ul className="text-sm text-[#FFF7EF]/60 space-y-1">
            {(manifest?.neverExposed ?? []).map(item => <li key={item}>• {item}</li>)}
          </ul>
          <p className="text-sm text-[#FFF7EF]/60">
            Les données des membres ne sont pas une marchandise. Les cohortes et agrégats communautaires ne
            sortent que dans le cadre d’un accord B2B, k-anonymisés, et jamais par cette API.
          </p>
        </section>

        {manifest && (
          <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-2">
            <h2 className="flex items-center gap-2 text-base font-medium"><Info className="w-4 h-4 text-[#C8753D]" /> Réutilisation</h2>
            <p className="text-sm text-[#FFF7EF]/70">{manifest.attribution}</p>
            <ul className="text-xs text-[#FFF7EF]/50 space-y-1">
              {Object.entries(manifest.rateLimits).map(([key, value]) => <li key={key}>• {key} : {value}</li>)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default ApiDocsPage;
