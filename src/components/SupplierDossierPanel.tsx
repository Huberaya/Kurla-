import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Mail, Search, Users } from 'lucide-react';

/**
 * DOSSIER FOURNISSEUR (chantier B, 16/09/2026).
 *
 * Un fournisseur vu en un seul endroit : son identité, son contact réel (ou
 * l'endroit du système qui en propose un, jamais écrit à sa place), les huit
 * pièces d'achat avec leur état, ce qui manque nommément, ses candidats
 * rattachés et l'état de la relance.
 *
 * Ce panneau ne prétend pas combler les manques : il les nomme. Mesuré en
 * production à l'écriture : 28 fournisseurs, 3 joignables, 25 sans aucun
 * contact connu, 0 relance enregistrée. Une pièce « en attente » (demandée)
 * est affichée différemment d'une pièce « inconnue » (jamais demandée) :
 * la première se relance, la seconde se demande.
 *
 * Aucun envoi depuis la plateforme : copier et ouvrir dans la messagerie
 * restent des actes humains.
 */

const PIECES: { cle: string; libelle: string; court: string }[] = [
  { cle: 'wholesalePricing', libelle: 'tarif de gros', court: 'Tarif' },
  { cle: 'moq', libelle: 'quantité minimale', court: 'MOQ' },
  { cle: 'leadTimeFr', libelle: 'délai vers la France', court: 'Délai' },
  { cle: 'dropshipping', libelle: 'dropshipping', court: 'Drop' },
  { cle: 'inciProvided', libelle: 'INCI fournie', court: 'INCI' },
  { cle: 'euCompliance', libelle: 'conformité UE', court: 'UE' },
  { cle: 'visualsGranted', libelle: 'droits visuels', court: 'Visuels' },
  { cle: 'samplesReceived', libelle: 'échantillons reçus', court: 'Échant.' },
];

const CHIP: Record<string, { classe: string; signe: string; titre: string }> = {
  oui: { classe: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30', signe: '✓', titre: 'obtenu' },
  en_attente: { classe: 'bg-amber-500/15 text-amber-300 border-amber-400/30', signe: '…', titre: 'demandé, en attente' },
  non: { classe: 'bg-rose-500/15 text-rose-300 border-rose-400/30', signe: '✗', titre: 'refusé' },
  inconnu: { classe: 'bg-kurla-ink text-kurla-cream/40 border-kurla-cream/15', signe: '·', titre: 'jamais demandé' },
};

const RELANCE: Record<string, { classe: string; texte: string }> = {
  aucune_demarche: { classe: 'bg-kurla-ink text-kurla-cream/50 border-kurla-cream/15', texte: 'jamais démarché' },
  a_relancer: { classe: 'bg-amber-500/15 text-amber-300 border-amber-400/30', texte: 'à relancer' },
  relance: { classe: 'bg-amber-500/15 text-amber-300 border-amber-400/30', texte: 'relancé' },
  repondu: { classe: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30', texte: 'a répondu' },
  sans_reponse: { classe: 'bg-rose-500/15 text-rose-300 border-rose-400/30', texte: 'sans réponse' },
  decide: { classe: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30', texte: 'décidé' },
};

export const SupplierDossierPanel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [filtre, setFiltre] = useState('');
  const [sansContact, setSansContact] = useState(false);
  const [avecCandidats, setAvecCandidats] = useState(false);
  const [copie, setCopie] = useState<string | null>(null);

  const load = async () => {
    try {
      const response = await fetch('/api/admin/sourcing/supplier-dossier', { headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Dossier fournisseur indisponible.');
      setData(body);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers]);

  const rows = useMemo(() => {
    let all: any[] = data?.rows || [];
    if (sansContact) all = all.filter((r) => r.contactEmail === null);
    if (avecCandidats) all = all.filter((r) => (r.candidates?.count ?? 0) > 0);
    const low = filtre.trim().toLowerCase();
    if (low) {
      all = all.filter((r) =>
        `${r.name} ${r.specialty || ''} ${r.contactEmail || ''} ${r.proposedContact?.email || ''}`.toLowerCase().includes(low),
      );
    }
    return all;
  }, [data, filtre, sansContact, avecCandidats]);

  const copier = async (id: string, texte: string) => {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(id);
      setTimeout(() => setCopie(null), 2500);
    } catch {
      setError('Copie impossible dans ce navigateur — sélectionnez le texte manuellement.');
    }
  };

  if (error) return <div className="p-6 rounded-3xl bg-kurla-espresso border border-rose-400/30 text-rose-300 text-xs">{error}</div>;
  if (!data) return <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 text-xs text-kurla-cream/60">Chargement du dossier fournisseur…</div>;

  const s = data.summary;

  return (
    <section className="space-y-4">
      <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-kurla-amber" /> Dossier fournisseur — ce qu’on sait, ce qui manque
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {([
            ['Fournisseurs', s.suppliers, ''],
            ['Joignables', s.withContact, s.withContact === 0 ? 'text-rose-300' : 'text-emerald-300'],
            ['Sans contact', s.unreachable, s.unreachable > 0 ? 'text-rose-300' : ''],
            ['Jamais démarchés', s.neverContacted, s.neverContacted > 0 ? 'text-amber-300' : ''],
            ['Complétude', `${s.completenessPct} %`, s.completenessPct < 50 ? 'text-rose-300' : 'text-emerald-300'],
          ] as Array<[string, string | number, string]>).map(([label, valeur, classe]) => (
            <div key={label} className="p-3 rounded-2xl bg-kurla-ink border border-kurla-cream/10">
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/50">{label}</p>
              <p className={`text-lg font-bold ${classe || 'text-kurla-cream'}`}>{valeur}</p>
            </div>
          ))}
        </div>

        {s.piecesManquantes?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] text-kurla-cream/60">Ce qui manque le plus souvent :</p>
            <div className="flex flex-wrap gap-1.5">
              {s.piecesManquantes.map((p: any) => (
                <span key={p.cle} className="px-2 py-0.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[10px] text-kurla-cream/70">
                  {p.libelle} — {p.count}/{s.suppliers}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-kurla-cream/60">
          Un contact n’est jamais inventé : il est affiché s’il est enregistré sur le fournisseur, ou proposé
          s’il existe ailleurs dans la plateforme (la source est citée). L’adoption reste un acte humain.
          Aucun envoi depuis la plateforme.
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-kurla-cream/40" />
            <input
              value={filtre}
              onChange={(e) => setFiltre(e.target.value)}
              placeholder="Nom, spécialité, contact…"
              className="pl-9 pr-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream placeholder:text-kurla-cream/30 focus:border-kurla-copper/40 outline-none"
            />
          </div>
          {([['sansContact', 'Sans contact', setSansContact, sansContact], ['avecCandidats', 'Avec candidats', setAvecCandidats, avecCandidats]] as const).map(([cle, label, setter, actif]) => (
            <button
              key={cle}
              type="button"
              onClick={() => (setter as (v: boolean) => void)(!actif)}
              className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition-colors ${
                actif ? 'bg-kurla-copper/20 text-kurla-copper border-kurla-copper/40' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/60 hover:border-kurla-copper/30'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="text-[11px] text-kurla-cream/50">{rows.length} affiché{rows.length > 1 ? 's' : ''}</span>
        </div>

        {rows.length === 0 ? (
          <p className="text-xs text-kurla-cream/50">Aucun fournisseur ne correspond à ce filtre.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r: any) => {
              const relance = RELANCE[r.followUp?.state] ?? RELANCE.aucune_demarche;
              return (
                <article key={r.id} className="p-4 rounded-2xl bg-kurla-ink border border-kurla-cream/10 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm">
                        {r.name}
                        <span className="ml-2 text-[10px] font-normal text-kurla-cream/50">
                          {r.contactType} · voie {r.route} · {r.status}
                        </span>
                      </h4>
                      {r.specialty && <p className="text-[11px] text-kurla-cream/60 mt-0.5">{r.specialty}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${relance.classe}`}>
                        {r.followUp?.overdue ? `${relance.texte} — échu` : relance.texte}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                        r.message?.state === 'pret' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                          : r.message?.state === 'a_preparer' ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                          : 'bg-kurla-ink text-kurla-cream/40 border-kurla-cream/15'
                      }`}>
                        {r.message?.state === 'pret' ? 'e-mail prêt' : r.message?.state === 'a_preparer' ? 'e-mail à préparer' : 'aucun e-mail'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full border border-kurla-cream/15 bg-kurla-espresso text-[10px] font-bold text-kurla-cream/70">
                        {r.candidates?.count ?? 0} candidat{(r.candidates?.count ?? 0) > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] space-y-1">
                    {r.contactEmail ? (
                      <p className="text-kurla-cream/70">
                        Contact :{' '}
                        <a className="text-kurla-amber underline" href={`mailto:${r.contactEmail}`}>{r.contactEmail}</a>
                        {r.contactName ? ` · ${r.contactName}` : ''}
                      </p>
                    ) : r.proposedContact ? (
                      <p className="text-amber-300">
                        Aucun contact enregistré — trouvé dans « {r.proposedContact.source} » :{' '}
                        <span className="font-mono">{r.proposedContact.email}</span>
                        <button
                          type="button"
                          onClick={() => copier(r.id, r.proposedContact.email)}
                          className="ml-2 px-2 py-0.5 rounded-lg border border-kurla-cream/15 text-[10px] font-bold"
                        >
                          {copie === r.id ? 'Copié !' : 'Copier'}
                        </button>
                        <span className="ml-1 text-kurla-cream/40">— à valider et enregistrer par vous</span>
                      </p>
                    ) : (
                      <p className="text-rose-300">Aucun contact connu, nulle part dans la plateforme — à obtenir.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {PIECES.map((p) => {
                      const etat = r.pieces?.[p.cle] ?? 'inconnu';
                      const chip = CHIP[etat] ?? CHIP.inconnu;
                      return (
                        <span
                          key={p.cle}
                          title={`${p.libelle} : ${chip.titre}`}
                          className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${chip.classe}`}
                        >
                          {chip.signe} {p.court}
                        </span>
                      );
                    })}
                    <span className="px-2 py-0.5 rounded-lg border border-kurla-cream/10 text-[10px] text-kurla-cream/50">
                      {r.completeness?.pct ?? 0} %
                    </span>
                  </div>

                  {r.missing?.length > 0 && (
                    <details className="text-[11px] text-kurla-cream/60 border-t border-kurla-cream/5 pt-2">
                      <summary className="cursor-pointer">Ce qu’il reste à obtenir ({r.missing.length})</summary>
                      <ul className="mt-1.5 space-y-0.5 list-disc pl-5">
                        {r.missing.map((m: string) => <li key={m}>{m}</li>)}
                      </ul>
                    </details>
                  )}

                  {r.message?.subject && (
                    <p className="text-[10px] text-kurla-cream/40">
                      Objet prêt : « {r.message.subject} »
                      {r.contactEmail && (
                        <a
                          className="ml-2 inline-flex items-center gap-1 text-kurla-amber underline"
                          href={`mailto:${r.contactEmail}?subject=${encodeURIComponent(r.message.subject)}`}
                        >
                          <Mail className="w-3 h-3" /> Ouvrir dans la messagerie
                        </a>
                      )}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[10px] text-kurla-cream/40 flex items-center gap-1.5">
        <Copy className="w-3 h-3" /> Relevé au {new Date(data.generatedAt).toLocaleString('fr-FR')} · lecture seule
      </p>
    </section>
  );
};
