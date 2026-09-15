/**
 * « À faire aujourd'hui » — file d'actions de l'acheteur (chantier 17/09, phase 1).
 *
 * Le travail d'acheteur tient en quatre familles d'actions :
 *   1. **Débloquer une fiche** — publiée mais non listable (un manquement est nommé),
 *   2. **Traiter un lot** — de la demande ferme existe mais aucun lot n'est enregistré
 *      (traçabilité / réception à caler),
 *   3. **Relancer une RFQ** — une demande est envoyée sans réponse depuis plus de
 *      `RELANCE_AFTER_DAYS` jours (J+3) : c'est le rythme de relance du cahier,
 *   4. **Envoyer une RFQ** — un besoin de sourcing est encore `to_source`.
 *
 * Tout est **déréglé à partir d'endpoints admin existants** (publication-readiness,
 * sourcing/items, preorder-demand, batches) : aucune donnée n'est inventée, la file
 * est une lecture. Si une source est indisponible, la file est affichée PARTIELLE et
 * l'indisponibilité est nommée — jamais masquée.
 *
 * Chaque ligne porte un bouton « Y aller » qui mène au bon onglet avec le contexte
 * présélectionné (fiche focalisée dans le catalogue, produit présélectionné dans le
 * formulaire de lot). La dérivation est une fonction pure (`buildActionQueue`)
 * couverte par le banc `kurla_admin_action_queue`.
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, BellRing, CheckSquare, Package, Send } from 'lucide-react';

export type QueueKind = 'unblock' | 'lot' | 'relance' | 'rfq';
export type QueueTab = 'catalog' | 'batches' | 'suppliers';

export interface QueueAction {
  key: string;
  kind: QueueKind;
  /** Verbe d'action court, affiché comme pastille. */
  title: string;
  /** Le sujet : titre de la fiche, du besoin ou du produit. */
  context: string;
  /** Le détail qui permet d'agir sans ouvrir l'onglet (premier manquement, vague, quantités). */
  detail: string;
  tab: QueueTab;
  focusProductId?: string;
  focusLabel?: string;
}

/** Formes minimales lues par buildActionQueue (contrats figés par les endpoints). */
export interface QueueInputs {
  /** /api/admin/catalog/publication-readiness */
  readiness?: {
    publishedButNotListableProducts?: Array<{ productId: string; title: string; missing: string[] }>;
  } | null;
  /** /api/admin/sourcing/items */
  items?: Array<{
    id: string; title: string; wave: string; status: string; requiredDocuments?: string[];
    /** Demandes envoyées sans réponse (mesuré côté route). */
    sentAwaitingCount?: number;
    /** Date d'envoi de la plus ancienne de ces demandes (ISO). */
    oldestAwaitingSentOn?: string | null;
  }> | null;
  /** /api/admin/preorder-demand → products */
  demandProducts?: Array<{ productId: string; name: string; isKit?: boolean; qtyFirm: number }> | null;
  /** /api/admin/batches → ids de produits ayant au moins un lot enregistré */
  batchProductIds?: string[] | null;
}

export interface QueueResult {
  counters: Record<QueueKind, number>;
  actions: QueueAction[];
  /** Actions existantes mais non affichées (plafond de lisibilité). */
  hiddenCount: number;
}

/** Plafond de lisibilité de la file (les compteurs restent complets). */
export const QUEUE_MAX_ROWS = 12;

/** Rythme de relance RFQ : sans réponse depuis plus de N jours → à relancer. */
export const RELANCE_AFTER_DAYS = 3;

const KIND_ORDER: QueueKind[] = ['unblock', 'lot', 'relance', 'rfq'];

/**
 * Dériver la file d'actions depuis les lectures admin. Fonction pure, sans DOM,
 * sans réseau : le banc `kurla_admin_action_queue` la couvre directement.
 * Ordre de priorité : commercial d'abord (fiche visible mais invendable), puis
 * physique (lot à traiter), puis le suivi (relance RFQ sans réponse), enfin le
 * plus long (nouveau sourcing/RFQ à envoyer).
 * `now` est injectable pour figer le calcul des délais dans les tests.
 */
export function buildActionQueue(input: QueueInputs, now: Date = new Date()): QueueResult {
  const unblock: QueueAction[] = [];
  const lot: QueueAction[] = [];
  const relance: QueueAction[] = [];
  const rfq: QueueAction[] = [];

  const listable = input.readiness?.publishedButNotListableProducts || [];
  for (const product of listable) {
    unblock.push({
      key: `unblock-${product.productId}`,
      kind: 'unblock',
      title: 'Débloquer',
      context: product.title,
      detail: product.missing && product.missing.length > 0 ? product.missing[0] : 'manquement non nommé',
      tab: 'catalog',
      focusProductId: product.productId,
      focusLabel: product.title
    });
  }

  const batchIds = new Set((input.batchProductIds || []).map(String));
  const demand = input.demandProducts || [];
  for (const row of demand) {
    const qtyFirm = Number(row.qtyFirm) || 0;
    if (qtyFirm <= 0) continue;
    if (batchIds.has(String(row.productId))) continue;
    lot.push({
      key: `lot-${row.productId}`,
      kind: 'lot',
      title: 'Lot à traiter',
      context: row.name,
      detail: `${qtyFirm} unité${qtyFirm > 1 ? 's' : ''} ferme${qtyFirm > 1 ? 's' : ''} sans lot enregistré`,
      tab: 'batches',
      focusProductId: row.productId,
      focusLabel: row.name
    });
  }

  const items = input.items || [];
  for (const item of items) {
    // Relance J+3 : un besoin EN CONSULTATION (in_rfq) dont la plus ancienne
    // demande envoyée n'a toujours pas de réponse au-delà du seuil.
    if (item.status === 'in_rfq') {
      const sentOn = item.oldestAwaitingSentOn ? new Date(item.oldestAwaitingSentOn) : null;
      if (sentOn && !Number.isNaN(sentOn.getTime())) {
        const days = Math.floor((now.getTime() - sentOn.getTime()) / 86_400_000);
        if (days >= RELANCE_AFTER_DAYS) {
          const count = Number(item.sentAwaitingCount) || 1;
          relance.push({
            key: `relance-${item.id}`,
            kind: 'relance',
            title: 'À relancer',
            context: item.title,
            detail: `${count} demande${count > 1 ? 's' : ''} envoyée${count > 1 ? 's' : ''}, sans réponse depuis ${days} j`,
            tab: 'suppliers'
          });
          continue; // un besoin déjà en relance n'est pas aussi « à envoyer »
        }
      }
      continue;
    }
    if (item.status !== 'to_source') continue;
    const docs = item.requiredDocuments || [];
    rfq.push({
      key: `rfq-${item.id}`,
      kind: 'rfq',
      title: 'RFQ à envoyer',
      context: item.title,
      detail: `Vague ${item.wave}${docs.length > 0 ? ` · ${docs.length} document${docs.length > 1 ? 's' : ''} requis` : ''}`,
      tab: 'suppliers'
    });
  }

  const grouped: Record<QueueKind, QueueAction[]> = { unblock, lot, relance, rfq };
  const ordered = KIND_ORDER.flatMap(kind => grouped[kind]);
  const actions = ordered.slice(0, QUEUE_MAX_ROWS);
  return {
    counters: {
      unblock: unblock.length,
      lot: lot.length,
      relance: relance.length,
      rfq: rfq.length
    },
    actions,
    hiddenCount: Math.max(0, ordered.length - actions.length)
  };
}

const KIND_STYLE: Record<QueueKind, { chip: string; icon: React.ReactNode; tone: string }> = {
  unblock: { chip: 'bg-rose-500/15 text-rose-300 border-rose-500/25', icon: <AlertTriangle className="w-3.5 h-3.5" />, tone: 'text-rose-300' },
  lot: { chip: 'bg-amber-500/15 text-amber-300 border-amber-500/25', icon: <Package className="w-3.5 h-3.5" />, tone: 'text-amber-300' },
  relance: { chip: 'bg-sky-500/15 text-sky-300 border-sky-500/25', icon: <BellRing className="w-3.5 h-3.5" />, tone: 'text-sky-300' },
  rfq: { chip: 'bg-kurla-copper/15 text-kurla-copper border-kurla-copper/30', icon: <Send className="w-3.5 h-3.5" />, tone: 'text-kurla-copper' }
};

const KIND_LABEL: Record<QueueKind, string> = {
  unblock: 'fiches à débloquer',
  lot: 'lots à traiter',
  relance: 'RFQ à relancer',
  rfq: 'RFQ à envoyer'
};

export const AdminActionQueue: React.FC<{
  headers: HeadersInit;
  /** Clé stable du workspace ('hair' | 'skin') : re-lit la file quand l'espace change,
      sans dépendre de l'identité de `headers` (récréée à chaque rendu). */
  scopeKey: string;
  onNavigate: (nav: { tab: QueueTab; focusProductId?: string; focusLabel?: string }) => void;
}> = ({ headers, scopeKey, onNavigate }) => {
  const [queue, setQueue] = useState<QueueResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    setUnavailable([]);
    // Promise.allSettled : une source en panne ne masque pas les autres ;
    // la file est alors affichée partielle et l'indisponibilité est nommée.
    const [readiness, items, demand, batches] = await Promise.allSettled([
      fetch('/api/admin/catalog/publication-readiness', { headers }).then(r => r.json()),
      fetch('/api/admin/sourcing/items', { headers }).then(r => r.json()),
      fetch('/api/admin/preorder-demand', { headers }).then(r => r.json()),
      fetch('/api/admin/batches', { headers }).then(r => r.json())
    ]);
    const failed: string[] = [];
    const names = ['l’état de publication', 'les besoins de sourcing', 'la demande précommandes', 'les lots reçus'];
    [readiness, items, demand, batches].forEach((result, index) => {
      if (result.status === 'rejected' || !result.value || result.value.error) failed.push(names[index]);
    });
    setUnavailable(failed);
    setQueue(buildActionQueue({
      readiness: readiness.status === 'fulfilled' ? readiness.value : null,
      items: items.status === 'fulfilled' && Array.isArray((items.value as any)?.items) ? (items.value as any).items : null,
      demandProducts: demand.status === 'fulfilled' && Array.isArray((demand.value as any)?.products) ? (demand.value as any).products : null,
      batchProductIds: batches.status === 'fulfilled' && Array.isArray((batches.value as any)?.batches)
        ? (batches.value as any).batches.map((batch: any) => String(batch.productId ?? batch.product_id ?? ''))
        : null
    }));
    setLoading(false);
  };

  // Re-lit quand le workspace change (scopeKey) — même convention que les autres
  // panels : `headers` volontairement hors deps (identité récréée à chaque rendu,
  // sinon boucle de re-chargements).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [scopeKey]);

  const total = queue ? queue.counters.unblock + queue.counters.lot + queue.counters.relance + queue.counters.rfq : 0;

  return (
    <section className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-copper/30 shadow-xl space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-kurla-copper" /> À faire aujourd'hui
          </h2>
          <p className="text-xs text-kurla-cream/55 mt-1 max-w-2xl">
            La file d'actions de l'acheteur, lue sur les données réelles du workspace :
            fiches publiées mais non listables, lots sans traçabilité, RFQ sans réponse à relancer
            (J+3), besoins encore à sourcer. Chaque ligne mène directement au bon écran,
            contexte présélectionné.
          </p>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${total > 0 ? 'bg-kurla-copper/15 text-kurla-copper border-kurla-copper/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'}`}>
          {total > 0 ? `${total} action${total > 1 ? 's' : ''}` : 'à jour'}
        </span>
      </div>

      {/* Compteurs cliquables : un clic mène au bon onglet. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {KIND_ORDER.map(kind => {
          const count = queue?.counters[kind] ?? 0;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onNavigate({ tab: kind === 'unblock' ? 'catalog' : kind === 'lot' ? 'batches' : 'suppliers' })}
              className={`rounded-2xl border p-3 text-left transition-colors hover:bg-kurla-cream/5 ${count > 0 ? 'border-kurla-cream/15 bg-kurla-ink' : 'border-kurla-cream/10 bg-kurla-ink/50'}`}
            >
              <p className={`text-2xl font-bold ${count > 0 ? KIND_STYLE[kind].tone : 'text-kurla-cream/35'}`}>{loading ? '…' : count}</p>
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45 mt-0.5">{KIND_LABEL[kind]}</p>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="rounded-xl border border-kurla-cream/10 p-4 text-xs text-kurla-cream/45">
          Lecture des données en cours (publication, sourcing, demande, lots)…
        </div>
      )}

      {!loading && queue && queue.actions.length === 0 && unavailable.length === 0 && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-xs text-emerald-200/90">
          Rien à faire — les fiches publiées sont listables, les demandes fermes ont leurs lots,
          aucune RFQ n'est sans réponse au-delà de J+3, et aucun besoin n'est encore à sourcer.
          C'est exactement l'état recherché.
        </div>
      )}

      {!loading && queue && queue.actions.length > 0 && (
        <ul className="space-y-1.5">
          {queue.actions.map(action => (
            <li key={action.key} className="flex items-center gap-3 rounded-xl border border-kurla-cream/10 bg-kurla-cream/[0.02] px-3 py-2">
              <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold ${KIND_STYLE[action.kind].chip}`}>
                {KIND_STYLE[action.kind].icon} {action.title}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-kurla-cream truncate">{action.context}</p>
                <p className="text-[11px] text-kurla-cream/45 truncate">{action.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate({ tab: action.tab, focusProductId: action.focusProductId, focusLabel: action.focusLabel })}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-kurla-copper text-white text-[11px] font-bold hover:bg-kurla-cocoa transition-colors"
              >
                Y aller →
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && queue && queue.hiddenCount > 0 && (
        <p className="text-[11px] text-kurla-cream/45">
          + {queue.hiddenCount} autre{queue.hiddenCount > 1 ? 's' : ''} action{queue.hiddenCount > 1 ? 's' : ''} —
          voir les onglets Catalogue produits, Lots &amp; traçabilité et Fournisseurs &amp; sourcing.
        </p>
      )}

      {!loading && unavailable.length > 0 && (
        <p className="text-[11px] text-amber-200/80">
          Source{unavailable.length > 1 ? 's' : ''} indisponible{unavailable.length > 1 ? 's' : ''} : {unavailable.join(', ')} —
          la file est partielle, rien n'est masqué ni inventé.
        </p>
      )}
    </section>
  );
};
