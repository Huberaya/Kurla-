/**
 * Templates d'EMAILS TRANSACTIONNELS KURLA — HTML responsive, auto-portés
 * (styles en ligne, pas de CSS/fonts externes) + version texte brut.
 *
 * Aucun bout de données utilisateur n'est injecté sans échappement : tous les
 * champs dynamiques passent par `esc()`. Le HTML reste volontairement simple
 * pour passer les filtres des webmails (tableaux, styles en ligne).
 */

export interface EmailOrderItem {
  name?: string;
  quantity?: number;
  price?: number;
  isPreorder?: boolean;
}

export interface EmailData {
  orderId?: string;
  total?: number | string;
  currency?: string;
  status?: string;
  name?: string;
  items?: EmailOrderItem[];
  shippingCost?: number | string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  preorder?: boolean;
  amount?: number | string;
  reason?: string;
  subject?: string;
  message?: string;
  ticketId?: string | number;
  productName?: string;
  productId?: string;
  quantity?: number;
  confirmationUrl?: string;
  resetUrl?: string;
  taskTitle?: string;
  scheduledFor?: string;
  [key: string]: unknown;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

// ── Couleurs KURLA ───────────────────────────────────────────────────────────
const C = {
  orange: '#C8753D',
  orangeDark: '#B3632F',
  ink: '#2B1C12',
  cream: '#FAF7F2',
  creamCard: '#F3EBE2',
  green: '#2F7D4F',
  rose: '#A83A3A'
};

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(value: unknown, currency = 'EUR'): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');
  const symbol = currency === 'EUR' ? '€' : `${currency} `;
  return `${n.toFixed(2).replace('.', ',')} ${symbol}`;
}

function fmtDate(value: unknown): string {
  if (!value) return '';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const CARRIER_LABELS: Record<string, string> = {
  colissimo: 'Colissimo',
  mondial_relay: 'Mondial Relay',
  chronopost: 'Chronopost',
  dhl: 'DHL',
  manual: 'Remise en main propre',
  autre: 'notre transporteur'
};

function carrierName(c?: string): string {
  if (!c) return 'notre transporteur';
  return CARRIER_LABELS[c] || c;
}

// ── Coquille HTML de marque ──────────────────────────────────────────────────
function shell(opts: { heading: string; intro: string; blocks: string; cta?: { label: string; url: string }; accent?: string }): string {
  const accent = opts.accent || C.orange;
  const cta = opts.cta
    ? `<tr><td style="padding:8px 40px 24px;"><a href="${esc(opts.cta.url)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;padding:13px 30px;border-radius:999px;">${esc(opts.cta.label)}</a></td></tr>`
    : '';
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.cream};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(43,28,18,0.08);">
  <tr><td style="background:${C.ink};padding:26px 40px;text-align:center;">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;letter-spacing:3px;color:#fff;">KURLA</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;color:#D49A63;text-transform:uppercase;margin-top:4px;">Beauty — soins capillaires naturels</div>
  </td></tr>
  <tr><td style="padding:32px 40px 8px;">
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${C.ink};margin:0 0 10px;">${opts.heading}</h1>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#5c4a3c;margin:0;">${opts.intro}</p>
  </td></tr>
  ${opts.blocks}
  ${cta}
  <tr><td style="padding:20px 40px 32px;border-top:1px solid #eee3d6;">
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#9a8977;margin:0;">
      Merci de soutenir KURLA. Vous recevez cet email car une commande est associée à cette adresse.
      Les fonctions de confiance KURLA sont gratuites pour toujours ; vos données ne sont jamais revendues.
      Besoin d'aide ? Répondez à cet email ou écrivez à bonjour@kurlabeauty.fr.</p>
  </td></tr>
</table>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#b7a996;margin:16px 0 0;">KURLA Beauty — kurlabeauty.fr</p>
</td></tr></table></body></html>`;
}

function orderItemsBlock(items?: EmailOrderItem[], total?: number | string, currency = 'EUR', showPreorderNote = false): string {
  const rows = (Array.isArray(items) ? items : [])
    .map(it => {
      const name = esc(it.name || 'Soin KURLA');
      const qty = Number(it.quantity) || 1;
      const line = it.price != null ? money(it.price, currency) : '';
      const tag = it.isPreorder ? `<span style="display:inline-block;background:${C.green};color:#fff;font-size:10px;font-weight:bold;padding:2px 8px;border-radius:999px;margin-left:6px;vertical-align:middle;">PRÉCOMMANDE</span>` : '';
      return `<tr>
        <td style="padding:9px 0;border-bottom:1px solid #f0e8de;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${C.ink};">${qty} × ${name}${tag}</td>
        <td align="right" style="padding:9px 0;border-bottom:1px solid #f0e8de;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5c4a3c;white-space:nowrap;">${line}</td>
      </tr>`;
    })
    .join('');
  const totalRow = total != null
    ? `<tr><td style="padding:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${C.ink};">Total TTC</td>
       <td align="right" style="padding:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${C.orange};white-space:nowrap;">${money(total, currency)}</td></tr>`
    : '';
  const preorderRow = showPreorderNote
    ? `<tr><td colspan="2" style="padding:14px;margin-top:12px;background:${C.creamCard};border-radius:12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${C.ink};">
        <strong>Commande en précommande.</strong> Votre colis est expédié à la réception de notre premier lot de production. Nous vous écrivons dès qu'il prend la route, avec le numéro de suivi.</td></tr>`
    : '';
  return `<tr><td style="padding:16px 40px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${rows}${totalRow}${preorderRow}
  </table></td></tr>`;
}

function trackingBlock(data: EmailData): string {
  const carrier = carrierName(data.carrier);
  const trackUrl = data.trackingUrl ? String(data.trackingUrl) : '';
  const eta = fmtDate(data.estimatedDelivery);
  return `<tr><td style="padding:8px 40px 8px;">
    <div style="background:${C.creamCard};border-radius:14px;padding:18px 20px;">
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${C.ink};margin:0 0 8px;">📦 Suivi de votre colis</p>
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5c4a3c;margin:0 0 4px;">Transporteur : <strong>${esc(carrier)}</strong></p>
      ${data.trackingNumber ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5c4a3c;margin:0 0 4px;">N° de suivi : <strong style="font-family:monospace;">${esc(data.trackingNumber)}</strong></p>` : ''}
      ${eta ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5c4a3c;margin:0 0 10px;">Livraison estimée : <strong>${eta}</strong></p>` : ''}
      ${trackUrl ? `<a href="${esc(trackUrl)}" style="display:inline-block;background:${C.orange};color:#fff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;padding:10px 22px;border-radius:999px;margin-top:4px;">Suivre mon colis</a>
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9a8977;margin:10px 0 0;word-break:break-all;">${esc(trackUrl)}</p>` : ''}
    </div></td></tr>`;
}

function baseUrl(): string {
  return (process.env.VITE_APP_URL || process.env.APP_URL || 'https://kurlabeauty.fr').replace(/\/$/, '');
}
function trackLink(orderId?: string): string {
  return `${baseUrl()}/suivi-commande${orderId ? `?order=${encodeURIComponent(orderId)}` : ''}`;
}

// ── Rendu par template ───────────────────────────────────────────────────────
export function renderOrderEmail(template: string, data: EmailData): RenderedEmail | null {
  const currency = (data.currency as string) || 'EUR';
  const orderId = data.orderId ? String(data.orderId) : '';
  const hasPreorder = data.preorder === true || (Array.isArray(data.items) && data.items.some(i => i.isPreorder));

  switch (template) {
    case 'payment_confirmed':
    case 'order_created': {
      const heading = 'Merci pour votre commande ! 🧡';
      const intro = `Votre commande <strong>${esc(orderId)}</strong> est confirmée${data.total != null ? ` — montant <strong>${money(data.total, currency)}</strong>` : ''}. ${hasPreorder ? 'Elle contient des articles en <strong>précommande</strong>.' : 'Nous vous écrivons à chaque étape de sa préparation.'}`;
      return {
        html: shell({
          heading, intro,
          blocks: orderItemsBlock(data.items, data.total, currency, hasPreorder),
          cta: { label: 'Suivre ma commande', url: trackLink(orderId) }
        }),
        text: `Merci pour votre commande ${orderId} ! Montant : ${money(data.total, currency)}.${hasPreorder ? ' (précommande — expédition à la réception du premier lot.)' : ''}\nSuivez-la : ${trackLink(orderId)}`
      };
    }
    case 'payment_pending': {
      return {
        html: shell({
          heading: 'Commande enregistrée, paiement en cours de confirmation',
          intro: `Nous avons bien reçu votre commande <strong>${esc(orderId)}</strong>. La confirmation bancaire peut prendre quelques instants. Vous recevrez un email dès que le paiement est validé.`,
          blocks: orderItemsBlock(data.items, data.total, currency, hasPreorder)
        }),
        text: `Commande ${orderId} enregistrée, en attente de confirmation du paiement.`
      };
    }
    case 'payment_failed': {
      return {
        html: shell({
          heading: 'Paiement non abouti',
          accent: C.rose,
          intro: `Le paiement de votre commande <strong>${esc(orderId)}</strong> n'a pas pu être confirmé. Aucune somme n'est débitée. Vérifiez votre moyen de paiement et repassez commande, ou contactez-nous si le problème persiste.`,
          blocks: '',
          cta: { label: 'Reprendre mes achats', url: `${baseUrl()}/boutique` }
        }),
        text: `Le paiement de la commande ${orderId} a échoué. Aucun montant débité.`
      };
    }
    case 'order_processing': {
      return {
        html: shell({
          heading: 'Votre commande est en préparation',
          intro: `Bonne nouvelle : votre commande <strong>${esc(orderId)}</strong> est entrée en préparation${hasPreorder ? ' (votre lot est en cours de réception)' : ''}. Nous vous prévenons dès son expédition.`,
          blocks: trackingBlock({ ...data, trackingNumber: undefined, trackingUrl: undefined }),
          cta: { label: 'Voir le suivi', url: trackLink(orderId) }
        }),
        text: `Commande ${orderId} en cours de préparation. Suivi : ${trackLink(orderId)}`
      };
    }
    case 'order_packed': {
      return {
        html: shell({
          heading: 'Votre commande est emballée',
          intro: `Votre commande <strong>${esc(orderId)}</strong> est soigneusement emballée et prête à être remise au transporteur. Expédition imminente !`,
          blocks: '',
          cta: { label: 'Voir le suivi', url: trackLink(orderId) }
        }),
        text: `Commande ${orderId} emballée, remise imminente au transporteur.`
      };
    }
    case 'order_shipped': {
      return {
        html: shell({
          heading: 'Votre commande est expédiée ! 🚚',
          intro: `Votre colis (commande <strong>${esc(orderId)}</strong>) a pris la route avec <strong>${esc(carrierName(data.carrier))}</strong>. Vous pouvez suivre son acheminement en temps réel ci-dessous.`,
          blocks: trackingBlock(data),
          cta: { label: 'Suivre ma commande', url: trackLink(orderId) }
        }),
        text: `Commande ${orderId} expédiée via ${carrierName(data.carrier)}. N° de suivi : ${data.trackingNumber || '—'}. Lien : ${data.trackingUrl || trackLink(orderId)}`
      };
    }
    case 'order_delivered': {
      return {
        html: shell({
          heading: 'Votre commande est livrée 🎉',
          accent: C.green,
          intro: `Votre commande <strong>${esc(orderId)}</strong> vient d'être livrée. Profitez de vos soins KURLA — et pensez à nous dire ce que vous en pensez !`,
          blocks: '',
          cta: { label: 'Voir mes soins / donner mon avis', url: `${baseUrl()}/account` }
        }),
        text: `Commande ${orderId} livrée. Bonne routine KURLA !`
      };
    }
    case 'order_cancelled': {
      return {
        html: shell({
          heading: 'Commande annulée',
          accent: C.rose,
          intro: `Votre commande <strong>${esc(orderId)}</strong> a été annulée. Si un paiement avait été capturé, son remboursement vous est confirmé dans un email séparé.`,
          blocks: ''
        }),
        text: `Commande ${orderId} annulée. Tout remboursement sera confirmé séparément.`
      };
    }
    case 'order_refunded':
    case 'order_partially_refunded':
    case 'refund_created': {
      const partial = template === 'order_partially_refunded';
      return {
        html: shell({
          heading: partial ? 'Remboursement partiel effectué' : 'Remboursement confirmé',
          accent: C.green,
          intro: `${data.amount != null ? `<strong>${money(data.amount, currency)}</strong> ` : ''}${partial ? 'ont été remboursés' : 'vous sont remboursés'} pour la commande <strong>${esc(orderId)}</strong>. Le délai de rétrocession bancaire dépend de votre établissement (généralement 3 à 5 jours ouvrés).`,
          blocks: ''
        }),
        text: `Remboursement ${partial ? 'partiel' : ''}${data.amount != null ? ` de ${money(data.amount, currency)}` : ''} pour la commande ${orderId}.`
      };
    }
    case 'order_returned':
    case 'return_requested': {
      return {
        html: shell({
          heading: template === 'return_requested' ? 'Demande de retour enregistrée' : 'Retour traité',
          intro: `Votre demande concernant la commande <strong>${esc(orderId)}</strong> est prise en compte. Notre équipe vous tient informé(e) de sa validation et des modalités de renvoi.`,
          blocks: ''
        }),
        text: `Retour commande ${orderId} : demande enregistrée.`
      };
    }
    case 'account_created': {
      return {
        html: shell({
          heading: 'Bienvenue chez KURLA 🧡',
          intro: `Bonjour ${esc(data.name || '')}, votre compte est créé. Découvrez votre diagnostic de texture, vos routines personnalisées et votre tableau de bord beauté.`,
          blocks: '',
          cta: { label: 'Accéder à mon espace', url: `${baseUrl()}/account` }
        }),
        text: `Bienvenue chez KURLA${data.name ? ' ' + data.name : ''}. Votre compte est créé.`
      };
    }
    case 'password_reset': {
      return {
        html: shell({
          heading: 'Réinitialisation de votre mot de passe',
          intro: 'Une réinitialisation a été demandée. Cliquez ci-dessous pour choisir un nouveau mot de passe (lien valable 60 minutes). Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.',
          blocks: '',
          cta: { label: 'Réinitialiser mon mot de passe', url: data.resetUrl ? String(data.resetUrl) : `${baseUrl()}/account` }
        }),
        text: `Réinitialisation du mot de passe : ${data.resetUrl || 'lien non fourni'}`
      };
    }
    case 'support_reply': {
      return {
        html: shell({
          heading: 'Réponse à votre demande',
          intro: `Concernant votre ticket <strong>#${esc(data.ticketId ?? '')}${data.subject ? ` — ${esc(data.subject)}` : ''}</strong> :`,
          blocks: `<tr><td style="padding:8px 40px 8px;"><div style="background:${C.creamCard};border-radius:14px;padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${C.ink};white-space:pre-wrap;">${esc(data.message || '')}</div></td></tr>`
        }),
        text: `Réponse ticket #${data.ticketId}: ${data.message || ''}`
      };
    }
    case 'routine_reminder': {
      return {
        html: shell({
          heading: 'Un petit geste pour votre routine ✨',
          intro: esc(data.message || (data.taskTitle ? `L'étape « ${data.taskTitle } » est prévue ${data.scheduledFor ? `le ${fmtDate(data.scheduledFor)}` : "aujourd'hui"}.` : 'Une étape de votre routine vous attend aujourd’hui.')),
          blocks: '',
          cta: { label: 'Ouvrir mon suivi de routine', url: `${baseUrl()}/account/routine-tracker` }
        }),
        text: `Rappel routine KURLA : ${data.message || data.taskTitle || 'une étape vous attend.'}`
      };
    }
    case 'low_stock': {
      return {
        html: shell({
          heading: 'Stock faible (interne)',
          intro: `${esc(data.productName || data.productId || 'Un produit')} : ${data.quantity ?? 'quantité inconnue'} unité(s) restante(s).`,
          blocks: ''
        }),
        text: `Stock faible: ${data.productName || data.productId} (${data.quantity ?? '?'} restants).`
      };
    }
    default:
      return null;
  }
}
