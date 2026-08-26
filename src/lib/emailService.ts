/**
 * KURLA BEAUTY - INTERCHANGEABLE EMAIL SERVICE
 * Supports console logging in dev mode and transactional API providers (Resend, SendGrid, Postmark).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  template: 
    | 'account_created'
    | 'password_reset'
    | 'order_created'
    | 'payment_pending'
    | 'payment_confirmed'
    | 'payment_failed'
    | 'order_processing'
    | 'order_packed'
    | 'order_shipped'
    | 'order_delivered'
    | 'refund_created'
    | 'support_reply';
  data: Record<string, any>;
}

export class EmailService {
  private provider: string;
  private from: string;
  private apiKey?: string;

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'console';
    this.from = process.env.EMAIL_FROM || 'no-reply@kurla-beauty.com';
    this.apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  }

  public getProviderName(): string {
    return this.provider;
  }

  public async sendEmail(msg: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const isWebhookEnabled = process.env.STRIPE_WEBHOOK_ENABLED === 'true';

    // Guard: Do not send payment_confirmed email if webhook is disabled
    let finalTemplate = msg.template;
    let finalSubject = msg.subject;

    if (msg.template === 'payment_confirmed' && !isWebhookEnabled) {
      finalTemplate = 'payment_pending';
      finalSubject = '[KURLA BEAUTY] Votre commande est en attente de confirmation du paiement';
    }

    const content = this.renderTemplate(finalTemplate, msg.data);

    if (this.provider === 'console') {
      if (process.env.NODE_ENV === 'production') {
        return { success: false, error: 'Le fournisseur email console est interdit en production.' };
      }
      console.log(`============================================================`);
      console.log(`[EMAIL PROVIDER: ${this.provider.toUpperCase()}] MODE DÉVELOPPEMENT`);
      console.log(`De: ${this.from}`);
      console.log(`À: ${msg.to}`);
      console.log(`Sujet: ${finalSubject}`);
      console.log(`Modèle: ${finalTemplate}`);
      console.log(`------------------------------------------------------------`);
      console.log(content);
      console.log(`============================================================`);

      return {
        success: true,
        messageId: `console-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      };
    }

    if (!this.apiKey) {
      return { success: false, error: `Clé API manquante pour le fournisseur email ${this.provider}.` };
    }

    try {
      return await this.sendViaProvider(msg.to, finalSubject, content);
    } catch (err: any) {
      const providerError = err?.message || 'Erreur envoi email';
      console.error(`[Email Provider Error] ${this.provider}:`, providerError);
      return { success: false, error: providerError };
    }
  }

  private async sendViaProvider(to: string, subject: string, content: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    timeout.unref?.();

    try {
      let endpoint: string;
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let body: Record<string, any>;

      switch (this.provider.toLowerCase()) {
        case 'resend':
          endpoint = 'https://api.resend.com/emails';
          headers.Authorization = `Bearer ${this.apiKey}`;
          body = {
            from: this.from,
            to: [to],
            subject,
            html: this.escapeHtml(content).replace(/\n/g, '<br>')
          };
          break;
        case 'sendgrid':
          endpoint = 'https://api.sendgrid.com/v3/mail/send';
          headers.Authorization = `Bearer ${this.apiKey}`;
          body = {
            personalizations: [{ to: [{ email: to }] }],
            from: { email: this.from },
            subject,
            content: [{ type: 'text/plain', value: content }]
          };
          break;
        case 'postmark':
          endpoint = 'https://api.postmarkapp.com/email';
          headers['X-Postmark-Server-Token'] = this.apiKey;
          body = { From: this.from, To: to, Subject: subject, TextBody: content };
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
      return { success: true, messageId: messageId || `api-msg-${Date.now()}` };
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

  private renderTemplate(template: EmailMessage['template'], data: Record<string, any>): string {
    switch (template) {
      case 'account_created':
        return `Bienvenue chez KURLA BEAUTY, ${data.name || 'Cher client'} !\nVotre compte a été créé avec succès.`;

      case 'password_reset':
        return `Bonjour, une demande de réinitialisation de mot de passe a été reçue. Lien : ${data.resetUrl || '#'}`;

      case 'order_created':
        return `Merci pour votre commande #${data.orderId} !\nMontant total : ${data.total} EUR.\nStatut : En cours d'enregistrement.`;

      case 'payment_pending':
        return `Votre commande #${data.orderId} est enregistrée et attend la confirmation du paiement.`;

      case 'payment_confirmed':
        return `Excellente nouvelle ! Le paiement de votre commande #${data.orderId} (${data.total} EUR) est confirmé.`;

      case 'payment_failed':
        return `Attention : Le paiement de votre commande #${data.orderId} a échoué. Veuillez vérifier votre moyen de paiement.`;

      case 'order_processing':
        return `Votre commande #${data.orderId} est en cours de préparation dans nos ateliers.`;

      case 'order_packed':
        return `Votre commande #${data.orderId} a été soigneusement emballée.`;

      case 'order_shipped':
        return `Votre commande #${data.orderId} a été expédiée via ${data.carrier || 'notre transporteur'} !\nNuméro de suivi : ${data.trackingNumber || 'En attente'}\nSuivi : ${data.trackingUrl || '#'}`;

      case 'order_delivered':
        return `Votre commande #${data.orderId} a été livrée ! Profitez bien de vos soins KURLA.`;

      case 'refund_created':
        return `Un remboursement de ${data.amount} EUR a été initié pour votre commande #${data.orderId}.\nRaison : ${data.reason || 'Remboursement validé'}.`;

      case 'support_reply':
        return `Nouvelle réponse concernant votre ticket support #${data.ticketId} ("${data.subject}") :\n"${data.message}"`;

      default:
        return `Notification KURLA BEAUTY pour la commande #${data.orderId || ''}`;
    }
  }
}

export const emailService = new EmailService();
