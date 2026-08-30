import { randomUUID } from 'node:crypto';

import { RoutineTask } from '../adaptiveRoutine';
import { emailService, EmailDeliveryResult, EmailMessage } from '../emailService';
import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';

import type {
  NotificationDeliveryLog,
  NotificationPreference,
  ServerOrder,
  SupabaseServerStore,
  UserNotification,
} from '../serverDb';

/**
 * CHANTIER 8.2 — notifications et emails transactionnels, sortis de
 * `serverDb.ts`. Chaque fonction prend le store en premier argument : le corps
 * est inchangé, seules les références à `this` ont été traduites.
 */
  // ============================================================
  // PHASE 5: USER NOTIFICATIONS & PREFERENCES
  // ============================================================
export async function sendNotification(
    store: SupabaseServerStore,
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string,
    orderId?: string,
    dedupeKey?: string
  ): Promise<UserNotification> {
    const existingLocal = dedupeKey && store.inMemoryNotifications.find(notification => notification.dedupeKey === dedupeKey);
    if (existingLocal) return existingLocal;

    const createdAt = new Date().toISOString();
    const notif: UserNotification = {
      id: randomUUID(),
      userId,
      type,
      title,
      message,
      link,
      orderId,
      dedupeKey,
      read: false,
      createdAt,
      deliveredAt: createdAt
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const payload = {
          id: notif.id,
          user_id: userId,
          type,
          title,
          message,
          link: link || null,
          order_id: orderId || null,
          dedupe_key: dedupeKey || null,
          read: false,
          created_at: createdAt,
          delivered_at: createdAt
        };
        const request = dedupeKey
          ? supabase.from('notifications').upsert(payload, { onConflict: 'dedupe_key', ignoreDuplicates: true }).select('*').maybeSingle()
          : supabase.from('notifications').insert(payload).select('*').single();
        const { data, error } = await request;
        ensureDatabaseSuccess('création de la notification', error);
        let row = data;
        if (!row && dedupeKey) {
          const existingResult = await supabase.from('notifications').select('*').eq('dedupe_key', dedupeKey).maybeSingle();
          ensureDatabaseSuccess('lecture de la notification dédupliquée', existingResult.error);
          row = existingResult.data;
        }
        const persisted = row ? {
          id: row.id,
          userId: row.user_id,
          type: row.type,
          title: row.title,
          message: row.message,
          link: row.link || undefined,
          orderId: row.order_id || undefined,
          dedupeKey: row.dedupe_key || undefined,
          read: row.read === true,
          createdAt: row.created_at,
          deliveredAt: row.delivered_at || undefined,
          errorMessage: row.error_message || undefined
        } : notif;
        const existingIndex = store.inMemoryNotifications.findIndex(notification => notification.id === persisted.id);
        if (existingIndex >= 0) store.inMemoryNotifications[existingIndex] = persisted;
        else store.inMemoryNotifications.unshift(persisted);
        if (data?.id === notif.id || !dedupeKey) {
          await logNotificationDelivery(store, {
            id: randomUUID(),
            userId,
            notificationId: persisted.id,
            channel: 'in_app',
            status: 'sent',
            provider: 'supabase',
            createdAt
          });
        }
        return persisted;
      } catch (err) {
        console.error('[serverDb] sendNotification error:', err);
        throw err;
      }
    }

    store.inMemoryNotifications.unshift(notif);
    await logNotificationDelivery(store, {
      id: randomUUID(),
      userId,
      notificationId: notif.id,
      channel: 'in_app',
      status: 'sent',
      provider: 'memory',
      createdAt
    });
    return notif;
  }

/**
 * Indique si une notification avec cette clé de dédoublonnage existe déjà.
 * Utilisé par les orchestrateurs batch pour ne compter que les créations
 * réelles (sendNotification est idempotent et renvoie l'existant sinon).
 */
export async function notificationExists(
  store: SupabaseServerStore,
  dedupeKey: string
): Promise<boolean> {
  if (store.inMemoryNotifications.some((n) => n.dedupeKey === dedupeKey)) return true;
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase.from('notifications').select('id').eq('dedupe_key', dedupeKey).maybeSingle();
    return Boolean(data);
  }
  return false;
}

export async function logNotificationDelivery(store: SupabaseServerStore, log: NotificationDeliveryLog): Promise<void> {
    store.inMemoryNotificationLogs.unshift(log);
    const supabase = getSupabaseServerClient();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('notification_logs').insert({
        id: log.id,
        user_id: log.userId || null,
        notification_id: log.notificationId || null,
        channel: log.channel,
        status: log.status === 'skipped' ? 'logged' : log.status,
        provider: log.provider || null,
        provider_message_id: log.messageId || null,
        error: log.error || (log.status === 'skipped' ? 'Notification email désactivée par les préférences.' : null),
        created_at: log.createdAt
      });
      ensureDatabaseSuccess('journalisation de la livraison de notification', error);
    } catch (err) {
      // A delivery-log outage must never be reported as a successful delivery
      // or roll back an already committed order/status transition.
      console.error('[serverDb] notification delivery log error:', err);
    }
  }

export async function getEmailForUser(store: SupabaseServerStore, userId: string): Promise<string | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('email').eq('id', userId).maybeSingle();
      ensureDatabaseSuccess('lecture de l’adresse email utilisateur', error);
      return typeof data?.email === 'string' && data.email.includes('@') ? data.email : undefined;
    }
    const localOrder = store.inMemoryOrders.find(order => order.userId === userId);
    return localOrder?.customerEmail;
  }

export async function recordEmailDelivery(
    store: SupabaseServerStore,
    message: EmailMessage,
    result: EmailDeliveryResult,
    userId?: string,
    notificationId?: string
  ): Promise<void> {
    const logStatus: NotificationDeliveryLog['status'] = result.delivered
      ? 'sent'
      : result.status === 'failed' ? 'failed' : 'logged';
    const error = result.error || (!result.delivered ? 'Mode console : email journalisé localement, non envoyé.' : undefined);
    await logNotificationDelivery(store, {
      id: randomUUID(),
      userId,
      notificationId,
      channel: 'email',
      status: logStatus,
      provider: result.provider,
      messageId: result.messageId,
      error,
      createdAt: new Date().toISOString()
    });

    if (notificationId && result.status === 'failed') {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        const { error: notificationError } = await supabase.from('notifications')
          .update({ error_message: result.error || 'Échec du fournisseur email.' })
          .eq('id', notificationId);
        if (notificationError) console.error('[serverDb] notification error update failed:', notificationError);
      }
    }
  }

export async function notifyPaymentPending(store: SupabaseServerStore, order: ServerOrder): Promise<void> {
    const email: EmailMessage = {
      to: order.customerEmail,
      subject: `[KURLA BEAUTY] Paiement en attente pour la commande #${order.id}`,
      template: 'payment_pending',
      data: { orderId: order.id, total: order.total }
    };
    if (order.userId) {
      await notifyUser(store, 
        order.userId,
        'payment_pending',
        'Paiement en attente',
        `Votre commande #${order.id} est enregistrée et attend la confirmation du paiement.`,
        `/account?tab=orders`,
        order.id,
        email,
        `payment-pending:${order.id}`
      );
    } else {
      await sendTransactionalEmail(store, email);
    }
  }

export async function notifyDueRoutineReminders(store: SupabaseServerStore, userId: string, tasks: RoutineTask[]): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const recipientEmail = await getEmailForUser(store, userId);
    const dueTasks = tasks.filter(task => task.status === 'pending' && task.scheduledFor <= today);
    for (const task of dueTasks) {
      await notifyUser(store, 
        userId,
        'routine_reminder',
        'Rappel de votre routine',
        `Votre tâche « ${task.title} » est prévue aujourd’hui.${task.description ? ` ${task.description}` : ''}`,
        `/account?tab=routine`,
        undefined,
        recipientEmail ? {
          to: recipientEmail,
          subject: '[KURLA BEAUTY] Rappel de votre routine',
          template: 'routine_reminder',
          data: { taskId: task.id, taskTitle: task.title, scheduledFor: task.scheduledFor }
        } : undefined,
        `routine-reminder:${userId}:${task.id}:${task.scheduledFor}`
      );
    }
  }

export async function notifyLowStock(
    store: SupabaseServerStore,
    productId: string,
    options: { variantId?: string; quantity?: number; productName?: string } = {}
  ): Promise<void> {
    const threshold = Math.max(0, Number(process.env.LOW_STOCK_THRESHOLD || 5));
    const supabase = getSupabaseServerClient();
    let quantity = options.quantity;
    let productName = options.productName || productId;

    if (supabase && quantity === undefined) {
      const inventoryQuery = supabase.from('inventory').select('quantity, reserved_quantity').eq('product_id', productId);
      const scopedQuery = options.variantId ? inventoryQuery.eq('variant_id', options.variantId) : inventoryQuery.is('variant_id', null);
      const { data: inventory, error: inventoryError } = await scopedQuery.maybeSingle();
      ensureDatabaseSuccess('lecture du stock pour alerte', inventoryError);
      if (inventory) quantity = Math.max(0, Number(inventory.quantity || 0) - Number(inventory.reserved_quantity || 0));
      const { data: product, error: productError } = await supabase.from('products').select('name').eq('id', productId).maybeSingle();
      ensureDatabaseSuccess('lecture du nom du produit pour alerte stock', productError);
      if (product?.name) productName = product.name;
      if (options.variantId) {
        const { data: variant, error: variantError } = await supabase.from('product_variants').select('name').eq('id', options.variantId).maybeSingle();
        ensureDatabaseSuccess('lecture du nom de la variante pour alerte stock', variantError);
        if (variant?.name) productName = `${productName} (${variant.name})`;
      }
    }

    if (quantity === undefined) {
      const product = store.inMemoryProducts.find(item => item.id === productId);
      const variant = options.variantId && Array.isArray(product?.variants)
        ? product.variants.find((item: any) => item.id === options.variantId)
        : undefined;
      quantity = Number(variant?.stockQuantity ?? variant?.stock_quantity ?? product?.stockQuantity ?? product?.stock_quantity ?? 0);
      productName = options.productName || variant?.name || product?.name || productName;
    }
    if (!Number.isFinite(quantity) || quantity > threshold) return;

    if (!supabase) return;
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('role', ['admin', 'superadmin']);
    ensureDatabaseSuccess('lecture des destinataires des alertes stock', adminError);

    for (const admin of admins || []) {
      if (!admin.id || typeof admin.email !== 'string' || !admin.email.includes('@')) continue;
      const title = `Stock faible : ${productName}`;
      await notifyUser(store, 
        admin.id,
        'low_stock',
        title,
        `${productName} est bientôt en rupture : ${quantity} unité(s) disponible(s).`,
        '/admin?tab=inventory',
        undefined,
        {
          to: admin.email,
          subject: `[KURLA BEAUTY] ${title}`,
          template: 'low_stock',
          data: { productName, quantity, threshold, productId, variantId: options.variantId }
        },
        `low-stock:${productId}:${options.variantId || 'product'}:${quantity}`
      );
    }
  }

export async function notifyLowStockForOrder(store: SupabaseServerStore, order: ServerOrder): Promise<void> {
    for (const item of order.items || []) {
      await notifyLowStock(store, item.productId, { variantId: item.variantId });
    }
  }

export async function sendTransactionalEmail(
    store: SupabaseServerStore,
    message: EmailMessage,
    userId?: string,
    notificationId?: string
  ): Promise<EmailDeliveryResult> {
    let result: EmailDeliveryResult;
    try {
      result = await emailService.sendEmail(message);
    } catch (err: any) {
      result = {
        success: false,
        delivered: false,
        status: 'failed',
        provider: emailService.getProviderName(),
        error: err?.message || 'Erreur inattendue du service email.'
      };
    }
    await recordEmailDelivery(store, message, result, userId, notificationId);
    return result;
  }

export async function notifyUser(
    store: SupabaseServerStore,
    userId: string,
    type: string,
    title: string,
    message: string,
    link: string | undefined,
    orderId: string | undefined,
    email: EmailMessage | undefined,
    dedupeKey?: string
  ): Promise<{ notification: UserNotification; email?: EmailDeliveryResult }> {
    let preferences: NotificationPreference;
    try {
      preferences = await getNotificationPreferences(store, userId);
    } catch (err: any) {
      const error = err?.message || 'Préférences de notification indisponibles.';
      console.error('[serverDb] notification preferences unavailable:', error);
      const notification: UserNotification = {
        id: randomUUID(), userId, type, title, message, link, orderId,
        dedupeKey, read: false, createdAt: new Date().toISOString(), errorMessage: error
      };
      if (!email) return { notification };
      const failed: EmailDeliveryResult = {
        success: false,
        delivered: false,
        status: 'failed',
        provider: emailService.getProviderName(),
        error: `Préférences de notification indisponibles : ${error}`
      };
      await recordEmailDelivery(store, email, failed, userId);
      return { notification, email: failed };
    }

    let notification: UserNotification;
    if (preferences.inAppNotifications) {
      try {
        notification = await sendNotification(store, userId, type, title, message, link, orderId, dedupeKey);
      } catch (err: any) {
        const error = err?.message || 'Échec de création de la notification in-app.';
        console.error('[serverDb] in-app notification unavailable:', error);
        notification = {
          id: randomUUID(), userId, type, title, message, link, orderId,
          dedupeKey, read: false, createdAt: new Date().toISOString(), errorMessage: error
        };
        await logNotificationDelivery(store, {
          id: randomUUID(), userId, channel: 'in_app', status: 'failed', error,
          createdAt: new Date().toISOString()
        });
      }
    } else {
      notification = {
        id: randomUUID(), userId, type, title, message, link, orderId,
        dedupeKey, read: false, createdAt: new Date().toISOString()
      };
    }
    const notificationId = preferences.inAppNotifications && !notification.errorMessage ? notification.id : undefined;
    if (!email) return { notification };

    if (!preferences.emailNotifications || !preferences.transactionalEmails) {
      const skipped: EmailDeliveryResult = {
        success: false,
        delivered: false,
        status: 'logged',
        provider: emailService.getProviderName(),
        error: 'Email transactionnel désactivé par les préférences utilisateur.'
      };
      await recordEmailDelivery(store, email, skipped, userId, notificationId);
      return { notification, email: skipped };
    }

    const result = await sendTransactionalEmail(store, email, userId, notificationId);
    return { notification, email: result };
  }

export async function getNotificationDeliveryLogs(store: SupabaseServerStore, userId?: string, limit = 100): Promise<NotificationDeliveryLog[]> {
    const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let query = supabase.from('notification_logs').select('*').order('created_at', { ascending: false }).limit(safeLimit);
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      ensureDatabaseSuccess('lecture du journal de livraison des notifications', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id || undefined,
        notificationId: row.notification_id || undefined,
        channel: row.channel,
        status: row.status,
        provider: row.provider || undefined,
        messageId: row.provider_message_id || undefined,
        error: row.error || undefined,
        createdAt: row.created_at
      }));
    }
    return store.inMemoryNotificationLogs
      .filter(log => !userId || log.userId === userId)
      .slice(0, safeLimit);
  }

export async function getNotifications(store: SupabaseServerStore, userId: string): Promise<UserNotification[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        ensureDatabaseSuccess('lecture des notifications', error);
        if (data) {
          return data.map(n => ({
            id: n.id,
            userId: n.user_id,
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            orderId: n.order_id,
            dedupeKey: n.dedupe_key || undefined,
            read: n.read,
            createdAt: n.created_at,
            deliveredAt: n.delivered_at,
            errorMessage: n.error_message
          }));
        }
      } catch (err) {
        console.error('[serverDb] getNotifications error:', err);
        throw err;
      }
    }
    return store.inMemoryNotifications.filter(n => n.userId === userId);
  }

export async function markNotificationRead(store: SupabaseServerStore, notificationId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId).eq('user_id', userId).select('id').maybeSingle();
        ensureDatabaseSuccess('marquage de notification comme lue', error);
        if (!data) return false;
      } catch (err) {
        console.error('[serverDb] markNotificationRead error:', err);
        throw err;
      }
    }

    const idx = store.inMemoryNotifications.findIndex(n => n.id === notificationId && n.userId === userId);
    if (idx >= 0) store.inMemoryNotifications[idx].read = true;
    return idx >= 0 || !!supabase;
  }

export async function deleteNotification(store: SupabaseServerStore, notificationId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('notifications').delete().eq('id', notificationId).eq('user_id', userId);
        ensureDatabaseSuccess('suppression de notification', error);
      } catch (err) {
        console.error('[serverDb] deleteNotification error:', err);
        throw err;
      }
    }

    const before = store.inMemoryNotifications.length;
    store.inMemoryNotifications = store.inMemoryNotifications.filter(n => !(n.id === notificationId && n.userId === userId));
    return before !== store.inMemoryNotifications.length || !!supabase;
  }

export async function getNotificationPreferences(store: SupabaseServerStore, userId: string): Promise<NotificationPreference> {
    const defaultPref: NotificationPreference = {
      userId,
      emailNotifications: true,
      transactionalEmails: true,
      marketingEmails: false,
      inAppNotifications: true,
      updatedAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
        ensureDatabaseSuccess('lecture des préférences de notification', error);
        if (data) {
          return {
            userId: data.user_id,
            emailNotifications: data.email_notifications,
            transactionalEmails: data.transactional_emails,
            marketingEmails: data.marketing_emails,
            inAppNotifications: data.in_app_notifications,
            updatedAt: data.updated_at
          };
        }
      } catch (err) {
        console.error('[serverDb] getNotificationPreferences error:', err);
        throw err;
      }
    }

    return store.inMemoryPreferences.get(userId) || defaultPref;
  }

export async function updateNotificationPreferences(store: SupabaseServerStore, userId: string, prefs: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const current = await getNotificationPreferences(store, userId);
    const updated: NotificationPreference = {
      ...current,
      ...prefs,
      userId,
      transactionalEmails: true, // Transactional stays mandatory
      updatedAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('notification_preferences').upsert({
          user_id: userId,
          email_notifications: updated.emailNotifications,
          transactional_emails: true,
          marketing_emails: updated.marketingEmails,
          in_app_notifications: updated.inAppNotifications,
          updated_at: updated.updatedAt
        }, { onConflict: 'user_id' });
        ensureDatabaseSuccess('mise à jour des préférences de notification', error);
      } catch (err) {
        console.error('[serverDb] updateNotificationPreferences error:', err);
        throw err;
      }
    }

    store.inMemoryPreferences.set(userId, updated);
    return updated;
  }
