/**
 * KURLA BEAUTY - TRANSACTIONAL EMAIL SERVICE
 *
 * EMAIL_PROVIDER=console is a development logger only: it never represents a
 * delivered email. Production must use a configured provider and a verified
 * sender domain (SPF/DKIM are DNS/provider responsibilities).
 */
import { renderOrderEmail } from './emailTemplates';

export type EmailTemplate =
  | 'account_created'
  | 'email_confirmation_pending'
  | 'password_reset'
  | 'order_created'
  | 'payment_pending'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'order_processing'
  | 'order_packed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'order_returned'
  | 'order_refunded'
  | 'order_partially_refunded'
  | 'refund_created'
  | 'return_requested'
  | 'support_reply'
  | 'low_stock'
  | 'routine_reminder';

export type EmailDeliveryStatus = 'sent' | 'logged' | 'failed';

export interface EmailMessage {
  to: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
}

export interface EmailDeliveryResult {
  success: boolean;
  delivered: boolean;
  status: EmailDeliveryStatus;
  provider: string;
  messageId?: string;
  error?: string;
}

const REAL_PROVIDERS = new Set(['resend', 'sendgrid', 'postmark']);

export class EmailService {
  private provider: string;
  private from: string;
  private replyTo?: string;
  private apiKey?: string;

  constructor() {
    this.provider = (process.env.EMAIL_PROVIDER || 'console').trim().toLowerCase();
    this.from = (process.env.EMAIL_FROM || 'no-reply@kurla-beauty.com').trim();
    this.replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;
    this.apiKey = process.env.EMAIL_PROVIDER_API_KEY?.trim() || undefined;
  }

  public getProviderName(): string {
    return this.provider;
  }

  public async sendEmail(msg: EmailMessage): Promise<EmailDeliveryResult> {
    const isWebhookEnabled = process.env.STRIPE_WEBHOOK_ENABLED === 'true';
    let finalTemplate = msg.template;
    let finalSubject = msg.subject;

    // A local/test process must not announce a definitive payment when the
    // signed Stripe webhook is disabled.
    if (msg.template === 'payment_confirmed' && !isWebhookEnabled) {
      finalTemplate = 'payment_pending';
      finalSubject = '[KURLA BEAUTY] Votre commande est en attente de confirmation du paiement';
    }

    // Rendu HTML de marque (+ version texte brut). En l'absence de template
    // dédié, on retombe sur un rendu texte simple.
    const rendered = renderOrderEmail(finalTemplate, msg.data || {});
    const textContent = rendered?.text || this.renderTemplate(finalTemplate, msg.data);
    const htmlContent = rendered?.html || null;

    if (this.provider === 'console') {
      if (process.env.NODE_ENV === 'production') {
        return {
          success: false,
          delivered: false,
          status: 'failed',
          provider: this.provider,
          error: 'Le fournisseur email console est interdit en production.'
        };
      }
      console.log('============================================================');
      console.log('[EMAIL PROVIDER: CONSOLE] MODE DÉVELOPPEMENT — NON ENVOYÉ');
      console.log(`De: ${this.from}`);
      console.log(`À: ${msg.to}`);
      console.log(`Sujet: ${finalSubject}`);
      console.log(`Modèle: ${finalTemplate}`);
      console.log('------------------------------------------------------------');
      console.log(htmlContent ? textContent + '\n[HTML disponible pour les fournisseurs réels]' : textContent);
      console.log('============================================================');

      return {
        success: true,
        delivered: false,
        status: 'logged',
        provider: this.provider,
        messageId: `console-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      };
    }

    if (!REAL_PROVIDERS.has(this.provider)) {
      return {
        success: false,
        delivered: false,
        status: 'failed',
        provider: this.provider,
        error: `Fournisseur email non supporté : ${this.provider}.`
      };
    }

    if (!this.apiKey) {
      return {
        success: false,
        delivered: false,
        status: 'failed',
        provider: this.provider,
        error: `Clé API manquante pour le fournisseur email ${this.provider}.`
      };
    }

    try {
      return await this.sendViaProvider(msg.to, finalSubject, htmlContent, textContent);
    } catch (err: any) {
      const providerError = err?.message || 'Erreur envoi email';
      console.error(`[Email Provider Error] ${this.provider}:`, providerError);
      return {
        success: false,
        delivered: false,
        status: 'failed',
        provider: this.provider,
        error: providerError
      };
    }
  }

  private async sendViaProvider(to: string, subject: string, html: string | null, text: string): Promise<EmailDeliveryResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    timeout.unref?.();

    try {
      let endpoint: string;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let body: Record<string, any>;
      // HTML de marque si disponible ; sinon texte brut converti en paragraphes.
      const htmlBody = html || this.escapeHtml(text).replace(/\n/g, '<br>');

      switch (this.provider) {
        case 'resend':
          endpoint = 'https://api.resend.com/emails';
          headers.Authorization = `Bearer ${this.apiKey}`;
          body = {
            from: this.from,
            to: [to],
            subject,
            ...(this.replyTo ? { reply_to: this.replyTo } : {}),
            html: htmlBody,
            ...(text ? { text } : {})
          };
          break;
        case 'sendgrid':
          endpoint = 'https://api.sendgrid.com/v3/mail/send';
          headers.Authorization = `Bearer ${this.apiKey}`;
          body = {
            personalizations: [{ to: [{ email: to }] }],
            from: { email: this.from },
            ...(this.replyTo ? { reply_to: { email: this.replyTo } } : {}),
            subject,
            content: [
              { type: 'text/plain', value: text },
              { type: 'text/html', value: htmlBody }
            ]
          };
          break;
        case 'postmark':
          endpoint = 'https://api.postmarkapp.com/email';
          headers['X-Postmark-Server-Token'] = this.apiKey!;
          body = {
            From: this.from,
            To: to,
            ...(this.replyTo ? { ReplyTo: this.replyTo } : {}),
            Subject: subject,
            TextBody: text,
            HtmlBody: htmlBody
          };
          break;
        default:
          throw new Error(`Fournisseur email non supporté : ${this.provider}.`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`API ${this.provider} HTTP ${response.status}: ${responseText.slice(0, 200)}`);
      }

      let messageId: string | undefined;
      try {
        const parsed = responseText ? JSON.parse(responseText) : undefined;
        messageId = parsed?.id || parsed?.message_id || parsed?.MessageID;
      } catch {
        // SendGrid commonly answers 202 with an empty body.
      }
      return {
        success: true,
        delivered: true,
        status: 'sent',
        provider: this.provider,
        messageId: messageId || `api-msg-${Date.now()}`
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character] || character);
  }

  private renderTemplate(template: EmailTemplate, data: Record<string, any>): string {
    switch (template) {
      case 'account_created':
        return `Bienvenue chez KURLA BEAUTY, ${data.name || 'Cher client'} !\nVotre compte a été créé avec succès.`;
      case 'email_confirmation_pending':
        return `Votre compte KURLA BEAUTY est créé. Confirmez votre adresse email pour activer votre compte${data.confirmationUrl ? ` : ${data.confirmationUrl}` : '.'}`;
      case 'password_reset':
        return `Bonjour, une demande de réinitialisation de mot de passe a été reçue. Lien : ${data.resetUrl || '#'}`;
      case 'order_created':
        return `Merci pour votre commande #${data.orderId} !\nMontant total : ${data.total} EUR.\nStatut : En cours d'enregistrement.`;
      case 'payment_pending':
        return `Votre commande #${data.orderId} est enregistrée et attend la confirmation du paiement.`;
      case 'payment_confirmed':
        return `Excellente nouvelle ! Le paiement de votre commande #${data.orderId} (${data.total} EUR) est confirmé.`;
      case 'payment_failed':
        return `Attention : le paiement de votre commande #${data.orderId} a échoué. Veuillez vérifier votre moyen de paiement.`;
      case 'order_processing':
        return `Votre commande #${data.orderId} est en cours de préparation dans nos ateliers.`;
      case 'order_packed':
        return `Votre commande #${data.orderId} a été soigneusement emballée.`;
      case 'order_shipped':
        return `Votre commande #${data.orderId} a été expédiée via ${data.carrier || 'notre transporteur'} !\nNuméro de suivi : ${data.trackingNumber || 'En attente'}\nSuivi : ${data.trackingUrl || '#'}`;
      case 'order_delivered': {
        const links: string[] = Array.isArray(data.reviewLinks) ? data.reviewLinks : [];
        const reviewBlock = links.length
          ? `\n\nVotre avis compte vraiment : après quelques jours d'utilisation, pourriez-vous partager votre expérience honnête sur vos soins ? Cela aide d'autres cheveux texturés à se lancer en confiance (et nous aide à corriger ce qui ne va pas, promis).\nC'est ici, 1 minute :\n${links.join('\n')}\n`
          : `\n\nAprès quelques jours d'utilisation, votre avis honnête sur votre expérience nous aiderait énormément — et aiderait d'autres cheveux texturés à se lancer en confiance. Vous pourrez déposer votre avis directement sur la fiche de chaque produit de votre commande.`;
        return `Votre commande #${data.orderId} a été livrée ! Profitez bien de vos soins KURLA.${reviewBlock}`;
      }
      case 'order_cancelled':
        return `Votre commande #${data.orderId} a été annulée. Si un paiement a été capturé, son traitement vous sera confirmé séparément.`;
      case 'order_returned':
        return `Le retour de votre commande #${data.orderId} a été enregistré.`;
      case 'order_refunded':
        return `Le remboursement de votre commande #${data.orderId} a été finalisé.`;
      case 'order_partially_refunded':
        return `Un remboursement partiel de votre commande #${data.orderId} a été finalisé.`;
      case 'refund_created':
        return `Un remboursement de ${data.amount} EUR a été initié pour votre commande #${data.orderId}.\nRaison : ${data.reason || 'Remboursement validé'}.`;
      case 'return_requested':
        return `Votre demande de retour pour la commande #${data.orderId} a bien été enregistrée. Notre équipe vous tiendra informé de sa validation.`;
      case 'support_reply':
        return `Nouvelle réponse concernant votre ticket support #${data.ticketId} ("${data.subject}") :\n"${data.message}"`;
      case 'low_stock':
        return `Alerte stock faible : ${data.productName || data.productId || 'un produit'} dispose de ${data.quantity ?? 'une quantité non renseignée'} unité(s) disponible(s).`;
      case 'routine_reminder':
        return `Rappel KURLA BEAUTY : ${data.message || (data.taskTitle ? `la tâche « ${data.taskTitle} » est prévue le ${data.scheduledFor || 'aujourd’hui'}.` : 'une étape de votre routine vous attend aujourd’hui.')}`;
      default:
        return `Notification KURLA BEAUTY pour la commande #${data.orderId || ''}`;
    }
  }
}

export const emailService = new EmailService();
