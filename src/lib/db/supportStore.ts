import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { getEmailForUser, notifyUser } from './notificationsStore';

import type {
  SupportAttachment,
  SupportMessage,
  SupportTicket,
  SupportTicketEvent,
  SupabaseServerStore,
} from '../serverDb';

/**
 * CHANTIER 8.2 — support client (tickets, messages, pièces jointes, statut),
 * sorti de `serverDb.ts`.
 */
export function mapSupportTicketRow(store: SupabaseServerStore, row: any): SupportTicket {
    return {
      id: row.id,
      userId: row.user_id,
      orderId: row.order_id || undefined,
      subjectCategory: row.subject_category,
      subject: row.subject,
      priority: row.priority || 'normal',
      status: row.status,
      assignedAgentId: row.assigned_agent_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

export function mapSupportMessageRow(store: SupabaseServerStore, row: any): SupportMessage {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      senderId: row.sender_id || undefined,
      senderRole: row.sender_role,
      message: row.message,
      createdAt: row.created_at
    };
  }

export async function recordSupportEvent(store: SupabaseServerStore, input: Omit<SupportTicketEvent, 'id' | 'createdAt'>): Promise<SupportTicketEvent> {
    const event: SupportTicketEvent = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('support_ticket_events').insert({
        id: event.id,
        ticket_id: event.ticketId,
        actor_id: event.actorId || null,
        event_type: event.eventType,
        old_value: event.oldValue || null,
        new_value: event.newValue || null,
        description: event.description || null,
        created_at: event.createdAt
      });
      ensureDatabaseSuccess('journalisation de l’événement support', error);
    }
    store.inMemorySupportEvents.push(event);
    return event;
  }

export async function getSupportTicketEvents(store: SupabaseServerStore, ticketId: string): Promise<SupportTicketEvent[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_ticket_events').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      ensureDatabaseSuccess('lecture de l’historique du ticket support', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        ticketId: row.ticket_id,
        actorId: row.actor_id || undefined,
        eventType: row.event_type,
        oldValue: row.old_value || undefined,
        newValue: row.new_value || undefined,
        description: row.description || undefined,
        createdAt: row.created_at
      }));
    }
    return store.inMemorySupportEvents.filter(event => event.ticketId === ticketId);
  }

export async function createSupportTicket(
    store: SupabaseServerStore,
    userId: string,
    orderId: string | undefined,
    category: SupportTicket['subjectCategory'],
    subject: string,
    message: string,
    priority: SupportTicket['priority'] = 'normal'
  ): Promise<SupportTicket> {
    const allowedCategories: SupportTicket['subjectCategory'][] = ['paiement', 'commande', 'livraison', 'retour', 'remboursement', 'produit', 'compte', 'conseil_ia', 'autre'];
    if (!allowedCategories.includes(category)) throw new Error('Catégorie de ticket invalide.');
    if (!subject.trim() || !message.trim()) throw new Error('Sujet et message obligatoires.');
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) throw new Error('Priorité de ticket invalide.');
    if (orderId) {
      const linkedOrder = await store.getOrderById(orderId);
      if (!linkedOrder || linkedOrder.userId !== userId) throw new Error('Commande liée introuvable pour ce client.');
    }
    const ticketId = randomUUID();
    const now = new Date().toISOString();

    const ticket: SupportTicket = {
      id: ticketId,
      userId,
      orderId,
      subjectCategory: category,
      subject: subject.trim(),
      priority,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };

    const firstMsg: SupportMessage = {
      id: randomUUID(),
      ticketId,
      senderId: userId,
      senderRole: 'customer',
      message: message.trim(),
      createdAt: now
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error: ticketError } = await supabase.from('support_tickets').insert({
          id: ticketId,
          user_id: userId,
          order_id: orderId || null,
          subject_category: category,
          subject: ticket.subject,
          priority,
          status: 'open',
          created_at: now,
          updated_at: now
        });
        ensureDatabaseSuccess('création du ticket support', ticketError);

        const { error: messageError } = await supabase.from('support_messages').insert({
          id: firstMsg.id,
          ticket_id: ticketId,
          sender_id: userId,
          sender_role: 'customer',
          message: firstMsg.message,
          created_at: now
        });
        ensureDatabaseSuccess('création du premier message support', messageError);
      } catch (err) {
        console.error('[serverDb] createSupportTicket error:', err);
        throw err;
      }
    }

    store.inMemoryTickets.unshift(ticket);
    store.inMemoryMessages.push(firstMsg);
    await recordSupportEvent(store, {
      ticketId,
      actorId: userId,
      eventType: 'created',
      newValue: 'open',
      description: `Ticket créé avec la priorité ${priority}.`
    });
    await recordSupportEvent(store, {
      ticketId,
      actorId: userId,
      eventType: 'message_added',
      description: 'Premier message du ticket ajouté.'
    });
    return ticket;
  }

export async function getSupportTicketById(store: SupabaseServerStore, ticketId: string): Promise<SupportTicket | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').select('*').eq('id', ticketId).maybeSingle();
      ensureDatabaseSuccess('lecture du ticket support', error);
      return data ? mapSupportTicketRow(store, data) : undefined;
    }
    return store.inMemoryTickets.find(ticket => ticket.id === ticketId);
  }

export async function getSupportTicketsByUser(store: SupabaseServerStore, userId: string): Promise<SupportTicket[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
      ensureDatabaseSuccess('lecture des tickets utilisateur', error);
      return (data || []).map((row: any) => mapSupportTicketRow(store, row));
    }
    return store.inMemoryTickets.filter(ticket => ticket.userId === userId);
  }

export async function getAllSupportTickets(store: SupabaseServerStore, ): Promise<SupportTicket[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
      ensureDatabaseSuccess('lecture de tous les tickets support', error);
      return (data || []).map((row: any) => mapSupportTicketRow(store, row));
    }
    return [...store.inMemoryTickets];
  }

export async function getSupportMessages(store: SupabaseServerStore, ticketId: string): Promise<SupportMessage[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      ensureDatabaseSuccess('lecture des messages support', error);
      return (data || []).map((row: any) => mapSupportMessageRow(store, row));
    }
    return store.inMemoryMessages.filter(message => message.ticketId === ticketId);
  }

export async function addSupportMessage(store: SupabaseServerStore, ticketId: string, senderId: string, senderRole: 'customer' | 'admin' | 'agent', message: string): Promise<SupportMessage> {
    const cleanMessage = message.trim();
    if (!cleanMessage) throw new Error('Message vide.');
    const now = new Date().toISOString();
    const ticket = await getSupportTicketById(store, ticketId);
    if (!ticket) throw new Error('Ticket support introuvable.');
    const msg: SupportMessage = {
      id: randomUUID(),
      ticketId,
      senderId,
      senderRole,
      message: cleanMessage,
      createdAt: now
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error: messageError } = await supabase.from('support_messages').insert({
        id: msg.id,
        ticket_id: ticketId,
        sender_id: senderId,
        sender_role: senderRole,
        message: cleanMessage,
        created_at: now
      });
      ensureDatabaseSuccess('création du message support', messageError);

      const updatePayload: Record<string, unknown> = { updated_at: now };
      if (senderRole === 'admin' || senderRole === 'agent') updatePayload.status = 'in_progress';
      const { error: ticketError } = await supabase.from('support_tickets').update(updatePayload).eq('id', ticketId);
      ensureDatabaseSuccess('mise à jour du ticket support', ticketError);
    }

    store.inMemoryMessages.push(msg);
    const memoryTicket = store.inMemoryTickets.find(item => item.id === ticketId);
    if (memoryTicket) {
      memoryTicket.updatedAt = now;
      if (senderRole === 'admin' || senderRole === 'agent') memoryTicket.status = 'in_progress';
    }
    await recordSupportEvent(store, {
      ticketId,
      actorId: senderId,
      eventType: 'message_added',
      description: `Message ajouté par le rôle ${senderRole}.`
    });
    if ((senderRole === 'admin' || senderRole === 'agent')) {
      const supportOrder = ticket.orderId ? await store.getOrderById(ticket.orderId) : undefined;
      const recipientEmail = supportOrder?.customerEmail || await getEmailForUser(store, ticket.userId);
      await notifyUser(store, 
        ticket.userId,
        'support_reply',
        `Réponse à votre ticket support #${ticket.id}`,
        `Un conseiller a répondu à votre sujet « ${ticket.subject} » : ${cleanMessage.substring(0, 80)}${cleanMessage.length > 80 ? '…' : ''}`,
        `/account?tab=support`,
        ticket.orderId,
        recipientEmail ? {
          to: recipientEmail,
          subject: `[KURLA BEAUTY] Réponse à votre ticket #${ticket.id}`,
          template: 'support_reply',
          data: { ticketId: ticket.id, subject: ticket.subject, message: cleanMessage }
        } : undefined,
        `support-reply:${msg.id}`
      );
    }
    return msg;
  }

export function sanitizeSupportFileName(store: SupabaseServerStore, fileName: string): string {
    return fileName.normalize('NFKC').replace(/[\\/\0\r\n]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'piece-jointe';
  }

export async function addSupportAttachment(
    store: SupabaseServerStore,
    ticketId: string,
    uploadedBy: string,
    buffer: Uint8Array,
    mimeType: SupportAttachment['mimeType'],
    fileName: string,
    messageId?: string
  ): Promise<SupportAttachment> {
    const ticket = await getSupportTicketById(store, ticketId);
    if (!ticket) throw new Error('Ticket support introuvable.');
    if (messageId && !(await getSupportMessages(store, ticketId)).some(message => message.id === messageId)) {
      throw new Error('Message support lié introuvable.');
    }
    const allowedMimeTypes: SupportAttachment['mimeType'][] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(mimeType)) throw new Error('Format de pièce jointe non pris en charge.');
    if (!buffer.byteLength || buffer.byteLength > 5 * 1024 * 1024) throw new Error('Pièce jointe vide ou trop volumineuse (5 Mo maximum).');
    const id = randomUUID();
    const storagePath = `${ticketId}/${id}-${sanitizeSupportFileName(store, fileName)}`;
    const now = new Date().toISOString();
    const attachment: SupportAttachment = {
      id,
      ticketId,
      messageId,
      uploadedBy,
      fileName: sanitizeSupportFileName(store, fileName),
      mimeType,
      sizeBytes: buffer.byteLength,
      storagePath,
      createdAt: now
    };
    const supabase = getSupabaseServerClient();
    try {
      if (supabase) {
        const { error: uploadError } = await supabase.storage.from('support-attachments').upload(storagePath, buffer as any, { contentType: mimeType, upsert: false });
        ensureDatabaseSuccess('stockage de la pièce jointe support', uploadError);
        const { error } = await supabase.from('support_attachments').insert({
          id,
          ticket_id: ticketId,
          message_id: messageId || null,
          uploaded_by: uploadedBy,
          file_name: attachment.fileName,
          mime_type: mimeType,
          size_bytes: attachment.sizeBytes,
          storage_path: storagePath,
          created_at: now
        });
        ensureDatabaseSuccess('enregistrement de la pièce jointe support', error);
      }
    } catch (error) {
      if (supabase) await supabase.storage.from('support-attachments').remove([storagePath]);
      throw error;
    }
    store.inMemorySupportAttachments.unshift(attachment);
    store.inMemorySupportAttachmentBytes.set(storagePath, new Uint8Array(buffer));
    await recordSupportEvent(store, {
      ticketId,
      actorId: uploadedBy,
      eventType: 'attachment_added',
      description: `Pièce jointe ajoutée : ${attachment.fileName}.`
    });
    return attachment;
  }

export async function getSupportAttachments(store: SupabaseServerStore, ticketId: string): Promise<Array<SupportAttachment & { signedUrl?: string }>> {
    const supabase = getSupabaseServerClient();
    let attachments: SupportAttachment[];
    if (supabase) {
      const { data, error } = await supabase.from('support_attachments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      ensureDatabaseSuccess('lecture des pièces jointes support', error);
      attachments = (data || []).map((row: any) => ({
        id: row.id,
        ticketId: row.ticket_id,
        messageId: row.message_id || undefined,
        uploadedBy: row.uploaded_by,
        fileName: row.file_name,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
        storagePath: row.storage_path,
        createdAt: row.created_at
      }));
    } else {
      attachments = store.inMemorySupportAttachments.filter(attachment => attachment.ticketId === ticketId);
    }
    return Promise.all(attachments.map(async attachment => {
      if (!supabase) return attachment;
      const { data, error } = await supabase.storage.from('support-attachments').createSignedUrl(attachment.storagePath, 600);
      ensureDatabaseSuccess('génération de l’URL sécurisée de la pièce jointe', error);
      return { ...attachment, signedUrl: data?.signedUrl };
    }));
  }

export async function isSupportAgent(store: SupabaseServerStore, userId: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      ensureDatabaseSuccess('vérification de l’agent support', error);
      return !!data && ['support', 'admin', 'superadmin'].includes(data.role);
    }
    return true;
  }

export async function updateSupportTicketStatus(store: SupabaseServerStore, ticketId: string, status: SupportTicket['status'], actorId?: string): Promise<void> {
    const updatedAt = new Date().toISOString();
    const current = await getSupportTicketById(store, ticketId);
    if (!current) throw new Error('Ticket support introuvable.');
    if (current.status === status) return;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').update({ status, updated_at: updatedAt }).eq('id', ticketId).select('id').maybeSingle();
      ensureDatabaseSuccess('mise à jour du statut du ticket support', error);
      if (!data) throw new Error('Ticket support introuvable.');
    }
    const ticket = store.inMemoryTickets.find(item => item.id === ticketId);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = updatedAt;
    }
    await recordSupportEvent(store, { ticketId, actorId, eventType: 'status_changed', oldValue: current.status, newValue: status, description: `Statut support : ${status}.` });
  }

export async function updateSupportTicketPriority(store: SupabaseServerStore, ticketId: string, priority: SupportTicket['priority'], actorId?: string): Promise<SupportTicket | undefined> {
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) throw new Error('Priorité de ticket invalide.');
    const current = await getSupportTicketById(store, ticketId);
    if (!current) return undefined;
    if (current.priority === priority) return current;
    const updatedAt = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').update({ priority, updated_at: updatedAt }).eq('id', ticketId).select('*').maybeSingle();
      ensureDatabaseSuccess('mise à jour de la priorité du ticket support', error);
      if (!data) return undefined;
    }
    const updated: SupportTicket = { ...current, priority, updatedAt };
    const index = store.inMemoryTickets.findIndex(item => item.id === ticketId);
    if (index >= 0) store.inMemoryTickets[index] = updated;
    await recordSupportEvent(store, { ticketId, actorId, eventType: 'priority_changed', oldValue: current.priority, newValue: priority, description: `Priorité support : ${priority}.` });
    return updated;
  }

export async function assignSupportTicket(store: SupabaseServerStore, ticketId: string, assignedAgentId: string | undefined, actorId?: string): Promise<SupportTicket | undefined> {
    const current = await getSupportTicketById(store, ticketId);
    if (!current) return undefined;
    const nextAgentId = assignedAgentId?.trim() || undefined;
    if (current.assignedAgentId === nextAgentId) return current;
    const updatedAt = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').update({ assigned_agent_id: nextAgentId || null, updated_at: updatedAt }).eq('id', ticketId).select('*').maybeSingle();
      ensureDatabaseSuccess('affectation du ticket support', error);
      if (!data) return undefined;
    }
    const updated: SupportTicket = { ...current, assignedAgentId: nextAgentId, updatedAt };
    const index = store.inMemoryTickets.findIndex(item => item.id === ticketId);
    if (index >= 0) store.inMemoryTickets[index] = updated;
    await recordSupportEvent(store, { ticketId, actorId, eventType: 'assignment_changed', oldValue: current.assignedAgentId, newValue: nextAgentId, description: nextAgentId ? `Ticket affecté à ${nextAgentId}.` : 'Affectation retirée.' });
    return updated;
  }

  // ============================================================
  // ADMIN DASHBOARD: DAILY OPERATIONS, CONTENT AND AUDIT
  // ============================================================
