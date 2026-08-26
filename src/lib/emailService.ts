/**
 * KURLA BEAUTY - INTERCHANGEABLE EMAIL SERVICE
 * Supports console logging in dev mode (EMAIL_PROVIDER=console) and future API providers.
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

    if (this.provider === 'console' || !this.apiKey) {
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

    // Custom API Provider integration hook (SendGrid/Resend/Postmark placeholder)
    try {
      // In non-console mode, send request using apiKey...
      console.log(`[Email Provider API] Sending email via ${this.provider} to ${msg.to}`);
      return { success: true, messageId: `api-msg-${Date.now()}` };
    } catch (err: any) {
      console.error(`[Email Provider Error] Failed to send email:`, err?.message || err);
      return { success: false, error: err?.message || 'Erreur envoi email' };
    }
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
