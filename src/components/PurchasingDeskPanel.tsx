import React, { useMemo } from 'react';
import {
  ClipboardList, Target, Mail, PackageCheck, FlaskConical, Sparkles,
  CheckCircle2, Circle, ArrowRight, Factory, Truck as TruckIcon, Sun, Baby, Scissors,
} from 'lucide-react';

import { PURCHASING_PHASES, RFQ_CHECKLIST_RETAIL, RFQ_CHECKLIST_PRIVATE_LABEL } from '../lib/purchasingDesk';

type Props = { prospects: any[] };

const ROUTE_LABEL: Record<string, string> = {
  A: 'Revente (route A)',
  B: 'Façonnage KURLA (route B)',
  'A+B': 'Revente + façonnage',
};

const PHASE_ICONS = [TruckIcon, TruckIcon, Sparkles, Sun, Baby, FlaskConical];

export const PurchasingDeskPanel: React.FC<Props> = ({ prospects }) => {
  const byId = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of prospects) m.set(p.id, p);
    return m;
  }, [prospects]);

  // Tunnel réel calculé à partir des statuts des prospects.
  const funnel = useMemo(() => {
    const inTouch = new Set(['emailed', 'followed_up', 'replied']);
    const nego = new Set(['in_negotiation', 'samples_sent']);
    return {
      identified: prospects.length,
      to_contact: prospects.filter((p) => p.status === 'to_contact' || !p.status).length,
      in_touch: prospects.filter((p) => inTouch.has(p.status) || nego.has(p.status)).length,
      samples: prospects.filter((p) => p.status === 'samples_sent').length,
      agreed: prospects.filter((p) => p.status === 'agreed' || p.decision === 'accepted').length,
    };
  }, [prospects]);

  const funnelRows = [
    { label: 'Fournisseurs identifiés', value: funnel.identified, tone: 'text-[#FFF7EF]' },
    { label: 'À contacter', value: funnel.to_contact, tone: 'text-amber-300' },
    { label: 'En contact / négociation', value: funnel.in_touch, tone: 'text-sky-300' },
    { label: 'Échantillons reçus', value: funnel.samples, tone: 'text-violet-300' },
    { label: 'Accords / comptes ouverts', value: funnel.agreed, tone: 'text-emerald-300' },
  ];

  const phaseProspects = (ids: string[]) => ids.map((id) => byId.get(id)).filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#C8753D]" /> Bureau des achats — le plan d'action
          </h3>
          <p className="text-[11px] text-[#FFF7EF]/60 mt-1">
            Du compte grossiste au façonnage des héros KURLA. Chaque phase dit qui contacter, quoi demander et
            ce qui valide l'étape. Les prix, MOQ et délais restent vides tant qu'un fournisseur ne les a pas donnés.
          </p>
        </div>
      </div>

      {/* Tunnel d'achat réel */}
      <div className="rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 p-4">
        <p className="text-[10px] uppercase tracking-wider text-[#D49A63] font-bold mb-3">Tunnel d'achat (état réel)</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {funnelRows.map((row, i) => (
            <div key={row.label} className="relative">
              <div className="rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/8 p-3 text-center">
                <div className={`text-2xl font-bold ${row.tone}`}>{row.value}</div>
                <div className="text-[10px] text-[#FFF7EF]/55 mt-1 leading-tight">{row.label}</div>
              </div>
              {i < funnelRows.length - 1 && (
                <ArrowRight className="hidden sm:block w-4 h-4 text-[#FFF7EF]/25 absolute top-1/2 -right-2.5 -translate-y-1/2 z-10" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Prochaine action */}
      <div className="rounded-2xl border border-[#C8753D]/35 bg-[#C8753D]/8 p-4 flex items-start gap-3">
        <Target className="w-5 h-5 text-[#D49A63] shrink-0 mt-0.5" />
        <div className="text-[12px] text-[#FFF7EF]/85 space-y-1">
          <p className="font-bold text-[#FFF7EF]">Prochaine action immédiate</p>
          <p>
            Ouvrir les comptes <strong>grossistes</strong> (Afro Wholesale, Dina Afro Shop, AfricanFabs) : c'est le levier
            le plus rapide pour une gamme large et vendable. Envoyer la demande de prix de gros + MOQ + délais + échantillons,
            puis passer à la première commande d'essai dès réponse chiffrée.
          </p>
          <p className="text-[11px] text-[#FFF7EF]/60">
            En parallèle, lancer le <strong>façonnage</strong> (Noesis dès 500 unités, PIF/CPSR/CPNP fournis) car son délai
            est long — sans bloquer la revente.
          </p>
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-3">
        {PURCHASING_PHASES.map((phase) => {
          const Icon = PHASE_ICONS[phase.order - 1] || ClipboardList;
          const ps = phaseProspects(phase.prospectIds);
          const ready = ps.filter((p) => p.status === 'agreed' || p.decision === 'accepted').length;
          const inTouch = ps.filter((p) => ['emailed', 'followed_up', 'replied', 'in_negotiation', 'samples_sent'].includes(p.status)).length;
          const isRetail = phase.route === 'A';
          return (
            <div key={phase.id} className="rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                <div className="shrink-0 w-9 h-9 rounded-xl bg-[#C8753D]/15 border border-[#C8753D]/30 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] text-[#D49A63]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-[#D49A63]">PHASE {phase.order}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF7EF]/8 border border-[#FFF7EF]/15 text-[#FFF7EF]/65">
                      {phase.horizon}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF]/65 flex items-center gap-1">
                      {phase.route === 'B' ? <Factory className="w-3 h-3" /> : <TruckIcon className="w-3 h-3" />}
                      {ROUTE_LABEL[phase.route]}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#FFF7EF] mt-1.5">{phase.title}</h4>
                  <p className="text-[11px] text-[#FFF7EF]/60 mt-1">{phase.objective}</p>
                </div>
                <div className="text-right shrink-0 text-[10px] text-[#FFF7EF]/60">
                  <div className="flex items-center gap-1 justify-end text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" /> {ready} accord(s)</div>
                  <div className="flex items-center gap-1 justify-end text-sky-300 mt-1"><Circle className="w-3.5 h-3.5" /> {inTouch} en cours</div>
                </div>
              </div>

              <div className="px-4 pb-4 grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-[#D49A63] font-bold flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5" /> Pourquoi cet ordre
                  </p>
                  <p className="text-[11px] text-[#FFF7EF]/65 italic">{phase.rationale}</p>

                  <p className="text-[10px] uppercase tracking-wider text-[#D49A63] font-bold flex items-center gap-1.5 pt-2">
                    <PackageCheck className="w-3.5 h-3.5" /> Étape validée quand
                  </p>
                  <p className="text-[11px] text-emerald-200/80 bg-[#050403] border border-emerald-500/20 rounded-lg px-3 py-2">{phase.doneWhen}</p>
                </div>

                <div className="lg:col-span-1 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-[#D49A63] font-bold flex items-center gap-1.5">
                    <TruckIcon className="w-3.5 h-3.5" /> Fournisseurs concernés ({ps.length})
                  </p>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {ps.map((p) => (
                      <div key={p.id} className="rounded-lg bg-[#050403] border border-[#FFF7EF]/6 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-bold text-[#FFF7EF] truncate">{p.name}</p>
                          {p.status === 'agreed' || p.decision === 'accepted'
                            ? <span className="text-[9px] text-emerald-300 font-bold shrink-0">Accord</span>
                            : <span className="text-[9px] text-amber-300 font-bold shrink-0">À contacter</span>}
                        </div>
                        {p.contactEmail
                          ? <a href={`mailto:${p.contactEmail}`} className="text-[10px] text-[#C8753D] hover:underline break-all flex items-center gap-1"><Mail className="w-3 h-3 shrink-0" /> {p.contactEmail}</a>
                          : <p className="text-[10px] text-[#FFF7EF]/45 flex items-center gap-1"><Mail className="w-3 h-3 shrink-0" /> Contact via site</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-1 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-[#D49A63] font-bold">À demander au fournisseur</p>
                  <ul className="space-y-1">
                    {(isRetail ? RFQ_CHECKLIST_RETAIL : RFQ_CHECKLIST_PRIVATE_LABEL).map((item) => (
                      <li key={item} className="text-[10.5px] text-[#FFF7EF]/70 flex items-start gap-1.5">
                        <span className="text-[#C8753D] mt-0.5">▸</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-[#FFF7EF]/45 text-center pt-1">
        Les réponses chiffrées (prix, MOQ, délais, échantillons) se saisissent dans les onglets « Contacts » et « Références à intégrer »
        au fur et à mesure des retours. Aucune commande ni aucun tarif n'est saisi sans réponse réelle du fournisseur.
      </p>
    </div>
  );
};
