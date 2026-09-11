import React, { useState } from 'react';
import { ArrowLeft, Clock, FlaskConical, Info, Droplets, Sparkles, Sun, Waves, ChevronDown, AlertTriangle } from 'lucide-react';
import { useSkinRangeTargets } from '../services/productService';
import {
  AVERTISSEMENT_CIBLE,
  GROUPES_ETAPE_PEAU,
  LIBELLES_PREOCCUPATIONS,
  LIBELLES_TYPES_PEAU,
  libellerCle,
  type FicheCiblePeau,
  type GroupeEtapePeau
} from '../lib/skinRangeTarget';

/**
 * GAMME PEAU — en cours de formulation.
 *
 * Seize fiches existent en base : préoccupation visée, actifs, contenance,
 * formule cible. Elles étaient invisibles, écartées du catalogue achetable
 * parce que ce sont des formules cibles et non des produits fabriqués — ce
 * qui est exact, et qui ne se corrige pas en forçant leur publication.
 *
 * Cette page les rend donc lisibles sans rien leur faire promettre : aucun
 * visuel (elles n'ont pas de packshot), aucun stock, aucun panier, un prix
 * annoncé comme cible et un INCI étiqueté comme tel. Le seul appel à l'action
 * est une liste d'attente.
 *
 * Montrer un soin qu'on ne peut pas acheter n'a de sens que si la page dit
 * pourquoi il n'est pas achetable. C'est le premier bloc sous le titre.
 */

const ICONES_GROUPES: Record<GroupeEtapePeau, React.ComponentType<{ className?: string }>> = {
  nettoyant: Waves,
  traitement: FlaskConical,
  hydratant: Droplets,
  spf: Sun
};

function FicheCible({ fiche }: { fiche: FicheCiblePeau }) {
  const [ouverte, setOuverte] = useState(false);

  return (
    <article className="rounded-3xl border border-kurla-stone bg-kurla-sand p-5 flex flex-col transition-all hover:border-kurla-copper/40">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] px-2 py-1 rounded-full bg-white border border-kurla-stone text-kurla-carbon/70 font-bold">
          {fiche.routineStep || fiche.subCategory}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-kurla-carbon/5 text-kurla-carbon/60 font-bold">
          <Clock className="w-3 h-3" /> Non fabriqué
        </span>
      </div>

      <h3 className="text-sm font-bold leading-tight">{fiche.name}</h3>

      {fiche.actifsAnnonces.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {fiche.actifsAnnonces.slice(0, 4).map(actif => (
            <span key={actif} className="text-[10px] px-2 py-0.5 rounded-full bg-kurla-copper/10 text-kurla-copper font-semibold">
              {actif}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-kurla-carbon/60 font-light mt-2 leading-relaxed">{fiche.benefitPrimary}</p>

      <dl className="mt-3 space-y-1 text-[11px]">
        {[fiche.sizeLabel, fiche.texture, fiche.usageFrequency].filter(Boolean).length > 0 && (
          <div className="flex gap-1.5">
            <dt className="sr-only">Format</dt>
            <dd className="text-kurla-carbon/50">{[fiche.sizeLabel, fiche.texture, fiche.usageFrequency].filter(Boolean).join(' · ')}</dd>
          </div>
        )}
        {fiche.concerns.length > 0 && (
          <div className="flex gap-1.5">
            <dt className="text-kurla-carbon/40 shrink-0">Préoccupations</dt>
            <dd className="text-kurla-carbon/70">{fiche.concerns.map(c => libellerCle(c, LIBELLES_PREOCCUPATIONS)).join(', ')}</dd>
          </div>
        )}
        {fiche.skinTypes.length > 0 && (
          <div className="flex gap-1.5">
            <dt className="text-kurla-carbon/40 shrink-0">Types de peau</dt>
            <dd className="text-kurla-carbon/70">{fiche.skinTypes.map(t => libellerCle(t, LIBELLES_TYPES_PEAU)).join(', ')}</dd>
          </div>
        )}
        {fiche.forWho && (
          <div className="flex gap-1.5">
            <dt className="text-kurla-carbon/40 shrink-0">Pour</dt>
            <dd className="text-kurla-carbon/70">{fiche.forWho}</dd>
          </div>
        )}
        {fiche.notIdealIf && (
          <div className="flex gap-1.5">
            <dt className="text-kurla-carbon/40 shrink-0">À éviter si</dt>
            <dd className="text-kurla-carbon/70">{fiche.notIdealIf}</dd>
          </div>
        )}
      </dl>

      {fiche.howToUse && (
        <p className="text-[11px] text-kurla-carbon/55 mt-2 leading-relaxed">
          <span className="font-semibold">Emploi : </span>{fiche.howToUse}
        </p>
      )}

      {fiche.formuleCible && (
        <div className="mt-3 border-t border-kurla-stone pt-2">
          <button
            type="button"
            onClick={() => setOuverte(!ouverte)}
            className="flex items-center justify-between w-full text-left text-[11px] font-bold text-kurla-carbon/70 hover:text-kurla-copper"
            aria-expanded={ouverte}
          >
            <span className="inline-flex items-center gap-1.5">
              <FlaskConical className="w-3 h-3" /> Formule cible (INCI visé)
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${ouverte ? 'rotate-180' : ''}`} />
          </button>
          {ouverte && (
            <div className="mt-2">
              <p className="text-[10px] font-mono leading-relaxed text-kurla-carbon/60 break-words">{fiche.formuleCible}</p>
              <p className="text-[10px] text-kurla-carbon/45 mt-1.5 italic">
                Liste visée, non industrialisée : elle peut évoluer avant fabrication.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto pt-4 flex items-end justify-between gap-3">
        <div>
          <span className="text-lg font-bold">{fiche.prixCible !== null ? `${fiche.prixCible.toFixed(2)}€` : '—'}</span>
          <p className="text-[10px] text-kurla-carbon/45">prix cible, indicatif</p>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="px-3 py-2 rounded-full bg-kurla-carbon/10 text-kurla-carbon/55 text-[11px] font-bold flex items-center gap-1.5 cursor-not-allowed"
        >
          <Clock className="w-3.5 h-3.5" /> Pas en vente
        </button>
      </div>
    </article>
  );
}

export const SkinRangePage = () => {
  const { fiches, loading, error } = useSkinRangeTargets();

  return (
    <div className="min-h-screen pt-28 pb-24 bg-kurla-ivory text-kurla-carbon">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <a href="/peau" className="inline-flex items-center gap-1.5 text-xs text-kurla-copper font-semibold mb-4 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour pôle peau
        </a>

        <div className="max-w-3xl mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-kurla-carbon text-[#D9A8A4] text-[10px] font-bold tracking-widest uppercase">
            <FlaskConical className="w-3.5 h-3.5" /> KURLA SKIN · gamme en cours de formulation
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold mt-3">La gamme peau KURLA, avant qu’elle existe</h1>
          <p className="text-sm text-kurla-carbon/70 font-light mt-3 leading-relaxed">
            Seize soins sont décrits — nettoyants, actifs, hydratants, SPF — avec la préoccupation visée, les actifs
            retenus et la formule travaillée. Nous publions le travail en cours plutôt que de le garder dans un tiroir :
            c’est lisible, et cela se discute.
          </p>
        </div>

        <div className="rounded-2xl border border-kurla-copper/30 bg-kurla-copper/5 p-4 mb-10 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-kurla-copper shrink-0 mt-0.5" />
          <p className="text-xs text-kurla-carbon/75 leading-relaxed">
            <strong className="font-semibold">Aucun de ces soins n’est en vente.</strong> {AVERTISSEMENT_CIBLE} Les
            fiches ci-dessous décrivent ce que nous cherchons à formuler, pas ce que nous avons fabriqué.
          </p>
        </div>

        {loading && <p className="text-sm text-kurla-carbon/50">Chargement des fiches…</p>}
        {error && (
          <p className="text-sm text-kurla-carbon/60">Les fiches de la gamme n’ont pas pu être chargées. Réessayez plus tard.</p>
        )}

        {!loading && !error && fiches.length === 0 && (
          <p className="text-sm text-kurla-carbon/60">Aucune fiche de formulation n’est publiée pour le moment.</p>
        )}

        {GROUPES_ETAPE_PEAU.map(groupe => {
          const duGroupe = fiches.filter(fiche => fiche.groupe === groupe.id);
          if (duGroupe.length === 0) return null;
          const Icone = ICONES_GROUPES[groupe.id];
          return (
            <section key={groupe.id} className="mb-10">
              <div className="flex items-start gap-2.5 mb-3">
                <Icone className="w-4 h-4 text-kurla-copper mt-1 shrink-0" />
                <div>
                  <h2 className="text-lg font-serif-title font-bold">{groupe.label}</h2>
                  <p className="text-xs text-kurla-carbon/60 font-light">{groupe.role}</p>
                </div>
                <span className="ml-auto text-[11px] text-kurla-carbon/45 shrink-0">{duGroupe.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {duGroupe.map(fiche => <FicheCible key={fiche.id} fiche={fiche} />)}
              </div>
            </section>
          );
        })}

        <section className="rounded-3xl border border-kurla-stone bg-white p-6 sm:p-8">
          <h2 className="text-lg font-serif-title font-bold flex items-center gap-2">
            <Info className="w-4 h-4 text-kurla-copper" /> Être prévenue quand c’est fabriqué
          </h2>
          <p className="text-xs text-kurla-carbon/70 font-light mt-2 leading-relaxed max-w-2xl">
            Nous ne promettons ni date ni prix : une formule qui change de laboratoire change de calendrier. Si vous
            voulez savoir quand ces soins existent réellement, laissez une adresse — la relance parlera de
            disponibilité, pas d’ouverture de rayon.
          </p>
          <div className="mt-4">
            <FormulaireAttente />
          </div>
          <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-kurla-stone">
            {/* C-07 — ce lien pointait vers /boutique?cat=peau, rayon qui ne
                contient aucun produit publié. Le catalogue compte 63
                références, toutes cheveux, accessoires ou kits : on le dit. */}
            <a
              href="/boutique"
              className="px-5 py-2.5 rounded-full bg-kurla-carbon text-white text-xs font-bold hover:opacity-90"
            >
              Le catalogue cheveux &amp; accessoires →
            </a>
            <a
              href="/peau/diagnostic"
              className="px-5 py-2.5 rounded-full border border-kurla-stone text-xs font-bold hover:border-kurla-copper"
            >
              Faire le diagnostic peau
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

/**
 * Formulaire d’attente dédié à la gamme.
 *
 * La source `gamme_peau_cible` est déclarée dans `waitlistSources` : sans
 * cette déclaration, le serveur la ramènerait à `home_waitlist` et la relance
 * ne pourrait pas distinguer « j’attends ces soins » de « je veux la
 * newsletter ».
 */
function FormulaireAttente() {
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<'idle' | 'loading' | 'done'>('idle');
  const [erreur, setErreur] = useState('');

  const envoyer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || etat === 'loading') return;
    setEtat('loading');
    setErreur('');
    try {
      const reponse = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'gamme_peau_cible', profileType: 'client', country: 'FR' })
      });
      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => ({}));
        throw new Error(corps?.error || 'L’inscription n’a pas abouti.');
      }
      setEtat('done');
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'L’inscription n’a pas abouti.');
      setEtat('idle');
    }
  };

  if (etat === 'done') {
    return <p className="text-xs text-kurla-carbon/70">C’est noté. Nous écrirons quand la gamme sera fabriquée.</p>;
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col sm:flex-row gap-2 max-w-md">
      <input
        type="email"
        required
        value={email}
        onChange={event => setEmail(event.target.value)}
        placeholder="votre@email.fr"
        aria-label="Votre adresse e-mail"
        className="flex-1 px-4 py-2.5 rounded-full border border-kurla-stone bg-white text-sm focus:outline-none focus:border-kurla-copper"
      />
      <button
        type="submit"
        disabled={etat === 'loading'}
        className="px-5 py-2.5 rounded-full bg-kurla-copper text-white text-xs font-bold disabled:opacity-60"
      >
        {etat === 'loading' ? 'Envoi…' : 'Prévenez-moi'}
      </button>
      {erreur && <p className="text-[11px] text-red-600 w-full">{erreur}</p>}
    </form>
  );
}

export default SkinRangePage;
