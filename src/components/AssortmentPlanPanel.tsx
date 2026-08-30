import React, { useMemo, useState } from 'react';
import {
  Droplets, Scissors, Sparkles, Search, Filter, AlertTriangle, CheckCircle2,
  Mail, Factory, Truck as TruckIcon, ChevronDown, Package, UserPlus, FlaskConical, Baby, Wrench,
} from 'lucide-react';

import {
  ASSORTMENT_DOMAINS,
  ASSORTMENT_NEEDS,
  CONTACT_TYPE_LABELS,
  type AssortmentDomain,
  type AssortmentNeed,
} from '../lib/assortmentPlan';

type Props = {
  prospects: any[];
  candidates: any[];
};

const DOMAIN_ICONS: Record<AssortmentDomain, React.ComponentType<{ className?: string }>> = {
  hair: Scissors,
  skin: Sparkles,
  kids: Baby,
  tools: Wrench,
};

const PRIORITY_STYLE: Record<string, { label: string; cls: string }> = {
  essential: { label: 'Indispensable', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  important: { label: 'Prioritaire', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  later: { label: 'Plus tard', cls: 'bg-[#FFF7EF]/10 text-[#FFF7EF]/60 border-[#FFF7EF]/20' },
};

export const AssortmentPlanPanel: React.FC<Props> = ({ prospects, candidates }) => {
  const [domain, setDomain] = useState<AssortmentDomain | 'all'>('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(ASSORTMENT_NEEDS[0]?.id ?? null);
  const [gapOnly, setGapOnly] = useState(false);

  const prospectById = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of prospects) m.set(p.id, p);
    return m;
  }, [prospects]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr-FR');
    return ASSORTMENT_NEEDS.filter((need) => {
      if (domain !== 'all' && need.domain !== domain) return false;
      if (gapOnly && !need.supplierGap) return false;
      if (!term) return true;
      const hay = [
        need.concern, need.benefit, need.why,
        ...need.productTypes, ...need.routineSteps, ...need.contactTypes,
      ].join(' ').toLocaleLowerCase('fr-FR');
      return hay.includes(term);
    });
  }, [domain, search, gapOnly]);

  // Candidats produits réels déjà repérés pour un besoin (via l'étape de routine).
  const candidatesFor = (need: AssortmentNeed) =>
    candidates.filter((c) => need.routineSteps.some((step) =>
      (c.routineStep || '').toLocaleLowerCase('fr-FR') === step.toLocaleLowerCase('fr-FR')
    ));

  const counts = useMemo(() => ({
    needs: ASSORTMENT_NEEDS.length,
    gaps: ASSORTMENT_NEEDS.filter((n) => n.supplierGap).length,
    covered: ASSORTMENT_NEEDS.filter((n) => n.prospectIds.length > 0).length,
  }), []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#C8753D]" /> Plan d'assortiment — quels produits, qui contacter
          </h3>
          <p className="text-[11px] text-[#FFF7EF]/60 mt-1">
            Vue « responsable achats » : les besoins par fonction (hydrater, réduire la casse, soigner le cuir chevelu…),
            les produits à commander et les fournisseurs à contacter. Les contacts/prix/MOQ restent gérés dans l'onglet
            « Contacts » ; un besoin sans fournisseur identifié est marqué comme un sourcing à ouvrir.
          </p>
        </div>
        <div className="flex gap-2 text-[11px]">
          <span className="px-3 py-1.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/70">{counts.needs} besoins</span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">{counts.covered} avec fournisseurs</span>
          <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300">{counts.gaps} à sourcer</span>
        </div>
      </div>

      {/* Filtres */}
      <div className="rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 p-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDomain('all')}
            className={`px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2 ${domain === 'all' ? 'bg-[#C8753D] text-white' : 'bg-[#1A0F0A] text-[#FFF7EF]/65 border border-[#FFF7EF]/10'}`}
          >
            <Filter className="w-3.5 h-3.5" /> Tous
          </button>
          {ASSORTMENT_DOMAINS.map((d) => {
            const Icon = DOMAIN_ICONS[d.id];
            const active = domain === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setDomain(d.id)}
                title={d.hint}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2 ${active ? 'bg-[#C8753D] text-white' : 'bg-[#1A0F0A] text-[#FFF7EF]/65 border border-[#FFF7EF]/10 hover:text-white'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {d.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#FFF7EF]/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer par besoin, produit, étape… (ex. hydrater, casse, solaire)"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-xs text-[#FFF7EF] placeholder:text-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]"
            />
          </div>
          <label className="flex items-center gap-2 text-[11px] text-[#FFF7EF]/70 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={gapOnly} onChange={(e) => setGapOnly(e.target.checked)} />
            Fournisseurs à identifier seulement
          </label>
        </div>
      </div>

      {/* Besoins */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-xs text-[#FFF7EF]/45 italic p-4 text-center">Aucun besoin ne correspond à ce filtre.</p>
        )}
        {filtered.map((need) => {
          const open = openId === need.id;
          const prio = PRIORITY_STYLE[need.priority];
          const DomainIcon = DOMAIN_ICONS[need.domain];
          const needProspects = need.prospectIds
            .map((id) => prospectById.get(id))
            .filter(Boolean);
          const needCandidates = candidatesFor(need);

          return (
            <div key={need.id} className="rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : need.id)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[#FFF7EF]/[0.02]"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[#C8753D]"><DomainIcon className="w-4 h-4" /></span>
                  <div>
                    <p className="text-sm font-bold text-[#FFF7EF] flex items-center gap-2 flex-wrap">
                      {need.concern}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${prio.cls}`}>{prio.label}</span>
                      {need.supplierGap && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-rose-500/40 bg-rose-500/10 text-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Fournisseur à identifier
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-[#FFF7EF]/55 mt-0.5">{need.benefit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:flex items-center gap-1 text-[10px] text-[#FFF7EF]/50">
                    <Package className="w-3.5 h-3.5" /> {need.productTypes.length}
                  </span>
                  <span className={`hidden sm:flex items-center gap-1 text-[10px] ${needProspects.length ? 'text-emerald-300' : 'text-rose-300'}`}>
                    <UserPlus className="w-3.5 h-3.5" /> {needProspects.length || '—'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#FFF7EF]/50 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {open && (
                <div className="px-4 pb-4 pt-1 grid lg:grid-cols-3 gap-4">
                  {/* Produits à commander */}
                  <div className="lg:col-span-1 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[#D49A63] font-bold flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /> Produits à commander
                    </p>
                    <ul className="space-y-1.5">
                      {need.productTypes.map((pt) => (
                        <li key={pt} className="text-[11px] text-[#FFF7EF]/80 bg-[#050403] border border-[#FFF7EF]/5 rounded-lg px-3 py-2">{pt}</li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-[#FFF7EF]/45 italic pt-1">{need.why}</p>
                    <p className="text-[10px] text-[#FFF7EF]/50">
                      Route d'achat : <strong className="text-[#D49A63]">{need.routeHint === 'A' ? 'A — revente de marques' : need.routeHint === 'B' ? 'B — façonnage KURLA' : 'A+B — revente puis façonnage'}</strong>
                    </p>
                  </div>

                  {/* Fournisseurs à contacter */}
                  <div className="lg:col-span-2 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[#D49A63] font-bold flex items-center gap-1.5">
                      <TruckIcon className="w-3.5 h-3.5" /> Fournisseurs à contacter
                    </p>

                    {needProspects.length === 0 ? (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-1">
                        <p className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Aucun fournisseur identifié pour ce besoin</p>
                        <p className="text-[10px] text-[#FFF7EF]/60">
                          Types de contacts à chercher : {need.contactTypes.length ? need.contactTypes.map((t) => CONTACT_TYPE_LABELS[t]).join(' · ') : 'à définir (textile / accessoire)'}.<br />
                          À ajouter dans l'onglet « Contacts » une fois la cible trouvée. Aucun nom ni contact n'est inventé.
                        </p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-2">
                        {needProspects.map((p) => {
                          const hasContact = Boolean(p.contactEmail || p.channel || p.sourceUrl);
                          const done = ['agreed'].includes(p.status);
                          return (
                            <div key={p.id} className="rounded-xl bg-[#050403] border border-[#FFF7EF]/8 p-3 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[12px] font-bold text-[#FFF7EF]">{p.name}</p>
                                {done
                                  ? <span className="text-[9px] font-bold text-emerald-300 flex items-center gap-1 shrink-0"><CheckCircle2 className="w-3 h-3" /> Accord</span>
                                  : <span className="text-[9px] font-bold text-amber-300 shrink-0">{STATUS_LABELS[p.status] || p.status}</span>}
                              </div>
                              <p className="text-[10px] text-[#FFF7EF]/55">{p.specialty}</p>
                              <p className="text-[10px] text-[#D49A63] flex items-center gap-1">
                                {p.route === 'B' ? <Factory className="w-3 h-3" /> : <TruckIcon className="w-3 h-3" />}
                                {CONTACT_TYPE_LABELS[p.contactType] || p.contactType}
                              </p>
                              <div className="text-[10px] space-y-0.5 pt-1">
                                {p.contactEmail ? (
                                  <a href={`mailto:${p.contactEmail}`} className="flex items-center gap-1 text-[#C8753D] hover:underline break-all"><Mail className="w-3 h-3 shrink-0" /> {p.contactEmail}</a>
                                ) : (
                                  <p className="flex items-center gap-1 text-[#FFF7EF]/45"><Mail className="w-3 h-3 shrink-0" /> Contact à récupérer{hasContact ? '' : ' (site connu)'}</p>
                                )}
                                {p.sourceUrl && <p className="text-[9px] text-[#FFF7EF]/40 break-all">Source : {p.sourceUrl}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {need.viaDistributor && (
                      <p className="text-[10px] text-[#FFF7EF]/50 flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-sky-300" />
                        Astucieux : le grossiste multimarques (Dina Afro Shop) couvre d'un coup plusieurs références de ce besoin.
                      </p>
                    )}

                    {needCandidates.length > 0 && (
                      <div className="rounded-xl border border-[#C8753D]/25 bg-[#C8753D]/5 p-3 space-y-1.5">
                        <p className="text-[10px] font-bold text-[#D49A63]">Références déjà repérées pour cette étape ({needCandidates.length})</p>
                        <ul className="space-y-1">
                          {needCandidates.slice(0, 6).map((c) => (
                            <li key={c.id} className="text-[10px] text-[#FFF7EF]/70 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${c.governanceStatus === 'published' || c.governanceStatus === 'ready' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                              {c.brand} — {c.product}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const STATUS_LABELS: Record<string, string> = {
  to_contact: 'À contacter',
  emailed: 'Email envoyé',
  followed_up: 'Relancé',
  replied: 'Réponse reçue',
  in_negotiation: 'En négociation',
  samples_sent: 'Échantillons',
  agreed: 'Accord',
  declined: 'Refus',
  no_response: 'Sans réponse',
};
