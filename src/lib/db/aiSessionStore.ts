import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';

import type {
  AiAssistantMessage,
  AiAssistantSession,
  AiFeedbackRating,
  AiHumanReview,
  SupabaseServerStore,
} from '../serverDb';

/**
 * CHANTIER 8.2b — sessions de l'assistant IA, retours utilisateurs et revue
 * humaine, sortis de `serverDb.ts`.
 */
export function mapAiSessionRow(store: SupabaseServerStore, row: any, messageCount = 0): AiAssistantSession {
    return {
      id: row.id,
      userId: row.user_id,
      topic: row.topic,
      locale: row.locale || 'fr',
      country: row.country || 'FR',
      objective: row.objective || undefined,
      memoryConsent: row.memory_consent === true,
      lastUncertainty: row.last_uncertainty || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount
    };
  }

export async function createAiSession(store: SupabaseServerStore, userId: string, topic: string, locale: string, country: string, memoryConsent: boolean, objective?: string): Promise<AiAssistantSession> {
    if (!memoryConsent) throw new Error('La mémorisation de la conversation nécessite un consentement explicite.');
    const now = new Date().toISOString();
    const session: AiAssistantSession = {
      id: randomUUID(),
      userId,
      topic,
      locale,
      country,
      objective,
      memoryConsent: true,
      createdAt: now,
      updatedAt: now,
      messageCount: 0
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('advice_sessions').insert({
        id: session.id,
        user_id: userId,
        topic,
        locale,
        country,
        memory_consent: true,
        objective: objective || null,
        created_at: now,
        updated_at: now
      });
      ensureDatabaseSuccess('création de la session IA', error);
    }
    store.inMemoryAiSessions.set(session.id, session);
    store.inMemoryAiMessages.set(session.id, []);
    return session;
  }

export async function addAiMessage(store: SupabaseServerStore, sessionId: string, sender: AiAssistantMessage['sender'], message: string, metadata: Record<string, unknown> = {}, sourceIds: string[] = [], uncertainty?: string): Promise<AiAssistantMessage> {
    const now = new Date().toISOString();
    const aiMessage: AiAssistantMessage = { id: randomUUID(), sessionId, sender, message, metadata, sourceIds, createdAt: now };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('advice_messages').insert({
        id: aiMessage.id,
        session_id: sessionId,
        sender,
        message,
        metadata,
        source_ids: sourceIds,
        created_at: now
      });
      ensureDatabaseSuccess('enregistrement du message IA', error);
      const updatePayload: Record<string, unknown> = { updated_at: now };
      if (uncertainty) updatePayload.last_uncertainty = uncertainty;
      const { error: updateError } = await supabase.from('advice_sessions').update(updatePayload).eq('id', sessionId);
      ensureDatabaseSuccess('mise à jour de la session IA', updateError);
    }
    const messages = store.inMemoryAiMessages.get(sessionId) || [];
    messages.push(aiMessage);
    store.inMemoryAiMessages.set(sessionId, messages);
    const session = store.inMemoryAiSessions.get(sessionId);
    if (session) store.inMemoryAiSessions.set(sessionId, { ...session, updatedAt: now, lastUncertainty: uncertainty || session.lastUncertainty, messageCount: messages.length });
    return aiMessage;
  }

export async function getAiSessions(store: SupabaseServerStore, userId: string): Promise<AiAssistantSession[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('advice_sessions').select('*').eq('user_id', userId).eq('memory_consent', true).order('updated_at', { ascending: false }).limit(50);
      ensureDatabaseSuccess('lecture des sessions IA', error);
      return Promise.all((data || []).map(async (row: any) => {
        const { count, error: countError } = await supabase.from('advice_messages').select('id', { count: 'exact', head: true }).eq('session_id', row.id);
        ensureDatabaseSuccess('comptage des messages IA', countError);
        return mapAiSessionRow(store, row, count || 0);
      }));
    }
    return [...store.inMemoryAiSessions.values()].filter(session => session.userId === userId && session.memoryConsent).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

export async function getAiSession(store: SupabaseServerStore, userId: string, sessionId: string): Promise<{ session: AiAssistantSession; messages: AiAssistantMessage[] } | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: row, error } = await supabase.from('advice_sessions').select('*').eq('id', sessionId).eq('user_id', userId).eq('memory_consent', true).maybeSingle();
      ensureDatabaseSuccess('lecture de la session IA', error);
      if (!row) return undefined;
      const { data: messageRows, error: messagesError } = await supabase.from('advice_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
      ensureDatabaseSuccess('lecture des messages IA', messagesError);
      const messages = (messageRows || []).map((message: any) => ({ id: message.id, sessionId: message.session_id, sender: message.sender, message: message.message, metadata: message.metadata || {}, sourceIds: message.source_ids || [], createdAt: message.created_at }));
      return { session: mapAiSessionRow(store, row, messages.length), messages };
    }
    const session = store.inMemoryAiSessions.get(sessionId);
    if (!session || session.userId !== userId || !session.memoryConsent) return undefined;
    return { session, messages: [...(store.inMemoryAiMessages.get(sessionId) || [])] };
  }

export async function deleteAiSessions(store: SupabaseServerStore, userId: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('advice_sessions').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression de l’historique IA', error);
    }
    for (const [id, session] of store.inMemoryAiSessions) {
      if (session.userId === userId) {
        store.inMemoryAiSessions.delete(id);
        store.inMemoryAiMessages.delete(id);
      }
    }
  }

export async function recordAiFeedback(store: SupabaseServerStore, userId: string, rating: AiFeedbackRating, comment?: string, sessionId?: string, messageId?: string): Promise<void> {
    const createdAt = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('ai_feedback').insert({ user_id: userId, session_id: sessionId || null, message_id: messageId || null, rating, comment: comment || null, created_at: createdAt });
      ensureDatabaseSuccess('enregistrement du feedback IA', error);
    }
    store.inMemoryAiFeedback.unshift({ userId, sessionId, messageId, rating, comment, createdAt });
  }

export async function requestAiHumanReview(store: SupabaseServerStore, userId: string, reason: string, payload: Record<string, unknown>, sessionId?: string, messageId?: string): Promise<AiHumanReview> {
    const now = new Date().toISOString();
    const review: AiHumanReview = { id: randomUUID(), userId, sessionId, messageId, reason, payload, status: 'pending', createdAt: now, updatedAt: now };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('ai_human_reviews').insert({ id: review.id, user_id: userId, session_id: sessionId || null, message_id: messageId || null, reason, payload, status: 'pending', created_at: now, updated_at: now });
      ensureDatabaseSuccess('création de la revue humaine IA', error);
    }
    store.inMemoryAiHumanReviews.unshift(review);
    return review;
  }
