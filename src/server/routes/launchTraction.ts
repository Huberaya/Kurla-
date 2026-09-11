import type { Express, Response } from 'express';

import { emailService } from '../../lib/emailService';
import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { asyncRoute, getAppUrl, rateLimit } from '../http';
import { requireAdmin, requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';

const PAID_STATUSES = new Set(['paid', 'processing', 'packed', 'shipped', 'delivered', 'completed']);
const LAUNCH_COHORT = 'france-2026';
const DAY = 24 * 60 * 60 * 1000;

/**
 * CHANTIER 6 — pilotage de traction.
 *
 * Toutes les métriques sont calculées à partir de lignes existantes ou portent
 * explicitement `available: false` si la migration/table n'est pas présente.
 * Aucun zéro ne doit être lu comme une preuve de traction nulle quand la source
 * est indisponible.
 */

async function readRows(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  table: string,
  columns: string,
  limit = 10000
): Promise<{ rows: any[]; available: boolean }> {
  try {
    const { data, error } = await supabase.from(table).select(columns).limit(limit);
    if (error) return { rows: [], available: false };
    return { rows: Array.isArray(data) ? data : [], available: true };
  } catch {
    return { rows: [], available: false };
  }
}

async function countRows(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  table: string,
  filter?: (query: any) => any
): Promise<{ count: number | null; available: boolean }> {
  try {
    let query: any = supabase.from(table).select('*', { count: 'exact', head: true });
    if (filter) query = filter(query);
    const { count, error } = await query;
    if (error) return { count: null, available: false };
    return { count: Number(count ?? 0), available: true };
  } catch {
    return { count: null, available: false };
  }
}

function isoOrNull(value: unknown): string | null {
  const date = new Date(String(value || ''));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function dateMs(value: unknown): number | null {
  const iso = isoOrNull(value);
  return iso ? new Date(iso).getTime() : null;
}

function distinctUserIds(rows: any[], key = 'user_id'): Set<string> {
  return new Set(
    rows
      .map(row => typeof row?.[key] === 'string' ? row[key] : null)
      .filter((value): value is string => Boolean(value))
  );
}

function ratio(part: number | null, total: number | null): number | null {
  if (part === null || total === null || total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

function nps(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const promoters = scores.filter(score => score >= 9).length;
  const detractors = scores.filter(score => score <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

function metric(value: number | null, target: number, available: boolean, note?: string) {
  return { value, target, available, progressPct: value === null ? null : Math.round((value / target) * 1000) / 10, note };
}

export function registerLaunchTractionRoutes(app: Express): void {
  app.get(
    '/api/admin/launch/traction',
    rateLimit('admin-launch-traction', 30, 60_000),
    asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const supabase = getSupabaseServerClient();
      if (!supabase) {
        res.status(503).json({ error: 'Base indisponible pour le pilotage du lancement.' });
        return;
      }

      const now = Date.now();
      const weekStart = now - 7 * DAY;
      const monthStart = now - 30 * DAY;
      const d30End = now - 30 * DAY;

      const [profiles, loyaltyEvents, beautyProfiles, userProducts, outcomes, outcomeCount, orders, adviceSessions, launchLeads, launchLeadRows, launchLeadInvitationRows, interviews, partners, npsRows, archetypeOutcomes, returns, reviews] = await Promise.all([
        readRows(supabase, 'profiles', 'id,created_at', 20000),
        readRows(supabase, 'loyalty_events', 'user_id,occurred_at', 50000),
        readRows(supabase, 'beauty_profiles', 'user_id,created_at,updated_at', 20000),
        readRows(supabase, 'user_products', 'user_id,created_at,updated_at,status', 20000),
        readRows(supabase, 'outcome_observations', 'user_id,observed_at,created_at', 30000),
        countRows(supabase, 'outcome_observations'),
        readRows(supabase, 'orders', 'id,user_id,status,created_at,updated_at', 20000),
        readRows(supabase, 'advice_sessions', 'user_id,created_at,updated_at', 20000),
        countRows(supabase, 'launch_leads', q => q.eq('status', 'subscribed').eq('profile_type', 'client').eq('country', 'FR')),
        readRows(supabase, 'launch_leads', 'id,email,profile_type,country,status,tester_status,created_at,invited_at,accepted_at,activated_at,last_active_at,last_activity_kind,tester_user_id', 1000),
        readRows(supabase, 'launch_leads', 'id,invitation_last_attempt_at,invitation_sent_at,invitation_attempts,invitation_provider,invitation_message_id,invitation_last_error', 1000),
        readRows(supabase, 'launch_interviews', 'id,status,segment,scheduled_for,completed_at', 10000),
        readRows(supabase, 'launch_partner_links', 'id,professional_id,status,cohort,salon_os_status,routine_cosigned,joined_at', 10000),
        readRows(supabase, 'launch_nps_responses', 'score,source,created_at,campaign_key', 10000),
        readRows(supabase, 'ingredient_archetype_outcomes', 'observation_count,k_anonymity_threshold,is_publishable', 10000),
        readRows(supabase, 'returns', 'id,order_id,status,created_at', 10000),
        readRows(supabase, 'reviews', 'id,status,verified_purchase,created_at', 10000)
      ]);

      // `launch_leads` existe sur la base live. Le repli conserve la cohérence
      // avec la route de capture si seule product_waitlist a été migrée.
      let waitlistCount = launchLeads.count;
      let waitlistAvailable = launchLeads.available;
      if (!launchLeads.available) {
        const fallback = await countRows(supabase, 'product_waitlist', q => q.eq('status', 'waiting').eq('country', 'FR'));
        waitlistCount = fallback.count;
        waitlistAvailable = fallback.available;
      }

      const invitationByLeadId = new Map(
        launchLeadInvitationRows.rows.map(row => [row.id, row])
      );
      const launchClientLeads = launchLeadRows.rows
        .map(row => ({ ...row, ...(invitationByLeadId.get(row.id) || {}) }))
        .filter(row => row.profile_type === 'client' && row.country === 'FR' && row.status === 'subscribed');
      const testerStatuses = new Set(['invited', 'accepted', 'activated', 'inactive']);
      const closedTesterRows = launchClientLeads.filter(row => testerStatuses.has(row.tester_status));
      const activatedTesterCount = closedTesterRows.filter(row => row.tester_status === 'activated' || row.tester_status === 'inactive').length;
      const closedTesterCount = launchLeadRows.available ? closedTesterRows.length : null;
      const testerActivationRate = launchLeadRows.available
        ? ratio(activatedTesterCount, closedTesterRows.length)
        : null;
      const testerFunnel = {
        waitlisted: launchClientLeads.filter(row => row.tester_status === 'waitlisted' || !row.tester_status).length,
        invited: closedTesterRows.length,
        accepted: closedTesterRows.filter(row => ['accepted', 'activated', 'inactive'].includes(row.tester_status)).length,
        activated: activatedTesterCount,
        available: launchLeadRows.available
      };
      const testerQueue = launchLeadRows.available
        ? launchClientLeads
          .sort((a, b) => (dateMs(a.created_at) ?? 0) - (dateMs(b.created_at) ?? 0))
          .slice(0, 300)
          .map(row => ({
            id: row.id,
            email: row.email,
            testerStatus: row.tester_status || 'waitlisted',
            createdAt: row.created_at,
            invitedAt: row.invited_at || null,
            acceptedAt: row.accepted_at || null,
            activatedAt: row.activated_at || null,
            lastActiveAt: row.last_active_at || null,
            lastActivityKind: row.last_activity_kind || null,
            userId: row.tester_user_id || null,
            invitationLastAttemptAt: row.invitation_last_attempt_at || null,
            invitationSentAt: row.invitation_sent_at || null,
            invitationAttempts: Number(row.invitation_attempts || 0),
            invitationProvider: row.invitation_provider || null,
            invitationLastError: row.invitation_last_error || null
          }))
        : [];

      const activeShelfUsers = new Set(
        userProducts.rows
          .filter(row => row.status !== 'abandoned')
          .map(row => row.user_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      ).size;

      const observationCount = outcomeCount.available ? outcomeCount.count : null;
      const paidOrders = orders.rows.filter(row => PAID_STATUSES.has(row.status));
      const paidOrderUsers = new Set(paidOrders.map(row => row.user_id).filter((id): id is string => typeof id === 'string' && id.length > 0));

      const profileCreated = new Map<string, number>();
      for (const row of profiles.rows) {
        const created = dateMs(row.created_at);
        if (typeof row.id === 'string' && created !== null) profileCreated.set(row.id, created);
      }
      const activityRows = [
        ...beautyProfiles.rows.map(row => ({ userId: row.user_id, at: row.updated_at || row.created_at })),
        ...userProducts.rows.map(row => ({ userId: row.user_id, at: row.updated_at || row.created_at })),
        ...outcomes.rows.map(row => ({ userId: row.user_id, at: row.observed_at || row.created_at })),
        ...orders.rows.map(row => ({ userId: row.user_id, at: row.updated_at || row.created_at })),
        ...adviceSessions.rows.map(row => ({ userId: row.user_id, at: row.updated_at || row.created_at }))
      ].filter(row => typeof row.userId === 'string');

      // Un proxy d'activité ne peut être annoncé que si toutes les sources qui
      // le composent ont répondu : une table indisponible rend le décompte
      // incomplet, même si les autres renvoient des lignes.
      const activitySourcesAvailable = profiles.available
        && userProducts.available
        && outcomes.available
        && orders.available
        && adviceSessions.available;
      const activeUsersLast30 = new Set(
        activityRows
          .filter(row => {
            const at = dateMs(row.at);
            return at !== null && at >= monthStart && at <= now;
          })
          .map(row => row.userId)
      ).size;

      // La rétention affichée dans le chantier 6 est celle de la cohorte
      // activée, pas celle de tous les profils historiques. Les événements de
      // progression sont déjà persistés : on les réutilise au lieu de créer un
      // second journal d'activité.
      const eligibleTesterD30 = launchLeadRows.available
        ? launchClientLeads.filter(row => {
          const activatedAt = dateMs(row.activated_at);
          return Boolean(row.tester_user_id) && activatedAt !== null && activatedAt <= d30End && testerStatuses.has(row.tester_status);
        })
        : [];
      const retainedTesterD30 = eligibleTesterD30.filter(row => {
        const activatedAt = dateMs(row.activated_at);
        return activatedAt !== null && loyaltyEvents.rows.some(event => {
          if (event.user_id !== row.tester_user_id) return false;
          const occurredAt = dateMs(event.occurred_at);
          return occurredAt !== null && occurredAt >= activatedAt + 30 * DAY && occurredAt < activatedAt + 37 * DAY;
        });
      });
      const d30Available = launchLeadRows.available && loyaltyEvents.available;
      const d30Retention = d30Available
        ? { eligible: eligibleTesterD30.length, retained: retainedTesterD30.length, ratePct: ratio(retainedTesterD30.length, eligibleTesterD30.length), available: true, windowDays: 7 }
        : { eligible: 0, retained: 0, ratePct: null, available: false, windowDays: 7 };

      const diagnosticUsers = new Set(beautyProfiles.rows.map(row => row.user_id).filter((id): id is string => typeof id === 'string'));
      const diagnosticBuyers = Array.from(diagnosticUsers).filter(userId => paidOrderUsers.has(userId)).length;
      const diagnosticToPurchase = ratio(diagnosticBuyers, diagnosticUsers.size);

      const paidOrderIds = new Set(paidOrders.map(row => row.id));
      const returnedOrderIds = new Set(
        returns.rows
          .filter(row => ['requested', 'approved', 'received', 'refunded'].includes(row.status) && paidOrderIds.has(row.order_id))
          .map(row => row.order_id)
      );
      const returnRate = ratio(returnedOrderIds.size, paidOrderIds.size);

      const completedInterviews = interviews.rows.filter(row => row.status === 'completed');
      const interviewsThisWeek = completedInterviews.filter(row => {
        const completed = dateMs(row.completed_at);
        return completed !== null && completed >= weekStart && completed <= now;
      }).length;
      const plannedNextWeek = interviews.rows.filter(row => {
        const scheduled = dateMs(row.scheduled_for);
        return row.status === 'planned' && scheduled !== null && scheduled >= now && scheduled <= now + 7 * DAY;
      }).length;

      const launchPartners = partners.rows.filter(row => row.cohort === LAUNCH_COHORT);
      const activePartnerCount = launchPartners.filter(row => row.status === 'active').length;
      const enabledPartnerCount = launchPartners.filter(row =>
        row.status === 'active' && row.salon_os_status === 'activated' && row.routine_cosigned === true
      ).length;
      const npsScores = npsRows.rows
        .filter(row => row.campaign_key === LAUNCH_COHORT)
        .map(row => Number(row.score))
        .filter(score => Number.isInteger(score) && score >= 0 && score <= 10);
      const publishableArchetypeKs = archetypeOutcomes.rows
        .filter(row => row.is_publishable === true)
        .map(row => Number(row.observation_count ?? row.k_anonymity_threshold))
        .filter(value => Number.isFinite(value) && value >= 0);
      const archetypeEvidenceK = publishableArchetypeKs.length > 0 ? Math.min(...publishableArchetypeKs) : null;
      const verifiedReviewCount = reviews.available
        ? reviews.rows.filter(row => row.status === 'approved' && row.verified_purchase === true).length
        : null;

      const startOfUtcWeek = (timestamp: number): number => {
        const date = new Date(timestamp);
        const day = date.getUTCDay();
        const mondayOffset = day === 0 ? 6 : day - 1;
        return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - mondayOffset);
      };
      const currentWeekStart = startOfUtcWeek(now);
      const weekly = Array.from({ length: 8 }, (_, index) => {
        const start = currentWeekStart - (7 - index) * 7 * DAY;
        const end = start + 7 * DAY;
        const inWindow = (value: unknown) => {
          const timestamp = dateMs(value);
          return timestamp !== null && timestamp >= start && timestamp < end;
        };
        return {
          weekStart: new Date(start).toISOString().slice(0, 10),
          interviewsCompleted: interviews.available
            ? interviews.rows.filter(row => row.status === 'completed' && inWindow(row.completed_at)).length
            : null,
          newPartners: partners.available
            ? partners.rows.filter(row => row.cohort === LAUNCH_COHORT && inWindow(row.joined_at)).length
            : null,
          npsResponses: npsRows.available
            ? npsRows.rows.filter(row => row.campaign_key === LAUNCH_COHORT && inWindow(row.created_at)).length
            : null,
          newWaitlist: launchLeadRows.available
            ? launchClientLeads.filter(row => inWindow(row.created_at)).length
            : null
        };
      });

      res.json({
        generatedAt: new Date().toISOString(),
        weekly,
        testerQueue,
        testerFunnel,
        targets: {
          waitlistTesters: 300,
          closedTesters: 300,
          interviewsPerWeek: 10,
          activePartners: 10,
          monthlyActiveUsers: 1000,
          shelfUsers: 300,
          observations: 1000,
          d30RetentionPct: 25
        },
        metrics: {
          waitlistTesters: metric(waitlistCount, 300, waitlistAvailable, 'Inscrits clients FR abonnés à la liste de lancement.'),
          closedTesters: metric(closedTesterCount, 300, launchLeadRows.available, 'Testeurs ayant quitté waitlisted : invité, accepté, activé ou inactif.'),
          testerActivationRatePct: { value: testerActivationRate, available: launchLeadRows.available, note: 'Activés ou inactifs parmi les testeurs invités/acceptés/activés.' },
          interviewsThisWeek: metric(interviews.available ? interviewsThisWeek : null, 10, interviews.available, 'Entretiens marqués completed sur les 7 derniers jours.'),
          interviewsPlannedNextWeek: metric(interviews.available ? plannedNextWeek : null, 10, interviews.available, 'Créneaux planifiés dans les 7 prochains jours.'),
          activePartners: metric(partners.available ? activePartnerCount : null, 10, partners.available, 'Partenaires France au statut active.'),
          enabledPartners: metric(partners.available ? enabledPartnerCount : null, 10, partners.available, 'Partenaires actifs avec Salon OS activé et au moins une routine co-signée.'),
          monthlyActiveUsers: metric(activitySourcesAvailable ? activeUsersLast30 : null, 1000, activitySourcesAvailable, 'Proxy d’activité : profil, étagère, observation, commande ou session conseil persistée sur 30 jours.'),
          shelfUsers: metric(userProducts.available ? activeShelfUsers : null, 300, userProducts.available, 'Utilisateurs ayant au moins une ligne Shelf non abandonnée.'),
          observations: metric(observationCount, 1000, outcomeCount.available, 'Observations de résultat enregistrées, sans extrapolation.'),
          d30Retention: { ...d30Retention, targetPct: 25, progressPct: d30Retention.ratePct === null ? null : Math.round((d30Retention.ratePct / 25) * 1000) / 10 },
          diagnosticToPurchasePct: { value: diagnosticToPurchase, available: beautyProfiles.available && orders.available, note: 'Profils beauté avec au moins une commande payée.' },
          returnRatePct: { value: returnRate, available: returns.available && orders.available, note: 'Commandes payées ayant une demande de retour non rejetée/annulée.' },
          nps: { value: nps(npsScores), responses: npsScores.length, available: npsRows.available, note: 'NPS calculé sur les réponses enregistrées : promoteurs 9–10, détracteurs 0–6.' },
          archetypeEvidenceK: { value: archetypeEvidenceK, target: 30, available: archetypeOutcomes.available, qualifyingBuckets: publishableArchetypeKs.length, note: 'Plus petit k parmi les agrégats par archétype publiables.' },
          verifiedReviews: { value: verifiedReviewCount, available: reviews.available, note: 'Avis approuvés et achat vérifié.' }
        },
        dataAvailability: {
          launchLeads: waitlistAvailable,
          testerCohort: launchLeadRows.available,
          testerInvitations: launchLeadInvitationRows.available,
          loyaltyEvents: loyaltyEvents.available,
          interviews: interviews.available,
          partners: partners.available,
          nps: npsRows.available,
          archetypeOutcomes: archetypeOutcomes.available,
          profiles: profiles.available,
          shelf: userProducts.available,
          outcomes: outcomeCount.available && outcomes.available,
          orders: orders.available,
          returns: returns.available,
          reviews: reviews.available
        }
      });
    })
  );

  app.post('/api/admin/launch/testers/invite', rateLimit('admin-launch-tester-invite', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const supabase = getSupabaseServerClient();
    if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });

    const leadId = typeof req.body?.leadId === 'string' ? req.body.leadId.trim() : '';
    const resend = req.body?.resend === true;
    if (!leadId) return res.status(400).json({ error: 'Lead testeur requis.' });

    const { data: lead, error: leadError } = await supabase.from('launch_leads')
      .select('id,email,status,profile_type,country,tester_status,invited_at,accepted_at,invitation_sent_at,invitation_attempts')
      .eq('id', leadId)
      .eq('status', 'subscribed')
      .eq('profile_type', 'client')
      .eq('country', 'FR')
      .maybeSingle();
    if (leadError) return res.status(503).json({ error: 'Migration des invitations non disponible.' });
    if (!lead) return res.status(404).json({ error: 'Lead client FR introuvable.' });
    if (!['waitlisted', 'invited'].includes(lead.tester_status)) {
      return res.status(409).json({ error: 'Ce lead ne peut pas recevoir une invitation dans son statut actuel.' });
    }
    if (lead.invitation_sent_at && !resend) {
      return res.json({
        alreadySent: true,
        preview: false,
        delivered: true,
        testerStatus: lead.tester_status,
        invitationSentAt: lead.invitation_sent_at
      });
    }

    const provider = emailService.getProviderName();
    if (!emailService.isProductionReady() && provider !== 'console') {
      return res.status(503).json({ error: 'Le fournisseur email transactionnel n’est pas prêt.' });
    }

    const now = new Date().toISOString();
    const attempts = Number(lead.invitation_attempts || 0) + 1;
    const { error: attemptError } = await supabase.from('launch_leads').update({
      invitation_last_attempt_at: now,
      invitation_attempts: attempts,
      invitation_last_error: null
    }).eq('id', lead.id);
    if (attemptError) return res.status(503).json({ error: 'Suivi de tentative d’invitation indisponible.' });

    const appUrl = getAppUrl(req);
    let invitationUrl = `${appUrl}/account?pilot=france-2026`;
    if (provider !== 'console') {
      let linkResult = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: String(lead.email).trim().toLowerCase(),
        options: { redirectTo: `${appUrl}/account` }
      });
      // Un compte créé avant la sélection peut déjà exister. Un magic link est
      // alors le seul flux sans mot de passe qui conserve le même onboarding.
      if (linkResult.error && /already|registered|exists/i.test(linkResult.error.message)) {
        linkResult = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: String(lead.email).trim().toLowerCase(),
          options: { redirectTo: `${appUrl}/account` }
        });
      }
      if (linkResult.error || !linkResult.data?.properties?.action_link) {
        const detail = String(linkResult.error?.message || 'Lien Supabase absent').slice(0, 500);
        await supabase.from('launch_leads').update({ invitation_last_error: detail }).eq('id', lead.id);
        return res.status(502).json({ error: 'Lien d’invitation impossible à générer.' });
      }
      invitationUrl = linkResult.data.properties.action_link;
    }

    const delivery = await emailService.sendEmail({
      to: String(lead.email).trim().toLowerCase(),
      subject: 'KURLA — votre accès au pilote fermé France',
      template: 'launch_tester_invitation',
      data: { invitationUrl }
    });

    if (!delivery.success) {
      const detail = String(delivery.error || 'Fournisseur email indisponible.').slice(0, 500);
      await supabase.from('launch_leads').update({ invitation_last_error: detail }).eq('id', lead.id);
      return res.status(502).json({ error: 'Invitation non envoyée. Le statut du testeur reste inchangé.' });
    }

    // En mode console, le message est seulement journalisé. Ne pas transformer
    // une prévisualisation locale en invitation réellement comptée.
    if (!delivery.delivered) {
      await supabase.from('launch_leads').update({
        invitation_last_error: 'Mode console : message journalisé, non envoyé.'
      }).eq('id', lead.id);
      return res.status(202).json({
        preview: true,
        delivered: false,
        message: 'Prévisualisation locale journalisée ; aucun email réel envoyé.'
      });
    }

    const { data: updated, error: updateError } = await supabase.from('launch_leads').update({
      tester_status: 'invited',
      invited_at: lead.invited_at || now,
      invitation_sent_at: now,
      invitation_provider: delivery.provider,
      invitation_message_id: delivery.messageId || null,
      invitation_last_error: null
    }).eq('id', lead.id).select('id,email,tester_status,invited_at,invitation_sent_at,invitation_attempts,invitation_provider,invitation_message_id').single();
    if (updateError) return res.status(503).json({ error: 'Invitation envoyée mais statut non confirmé ; vérifier la file admin.' });
    res.status(201).json({ invitation: updated, delivered: true, updatedBy: admin.id });
  }));

  app.post('/api/launch/invitation/accept', rateLimit('launch-invitation-accept', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const supabase = getSupabaseServerClient();
    if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
    const email = user.email.trim().toLowerCase();
    if (!email) return res.json({ accepted: false });

    const { data: lead, error: leadError } = await supabase.from('launch_leads')
      .select('id,tester_status,tester_user_id,accepted_at')
      .eq('email', email)
      .eq('status', 'subscribed')
      .eq('profile_type', 'client')
      .eq('country', 'FR')
      .in('tester_status', ['invited', 'accepted', 'activated'])
      .maybeSingle();
    if (leadError) return res.status(503).json({ error: 'Migration de cohorte non disponible.' });
    if (!lead) return res.json({ accepted: false });
    if (lead.tester_user_id && lead.tester_user_id !== user.id) return res.json({ accepted: false });

    const now = new Date().toISOString();
    const { data: linked, error: linkError } = await supabase.from('launch_leads').update({
      tester_user_id: user.id,
      tester_status: lead.tester_status === 'invited' ? 'accepted' : lead.tester_status,
      accepted_at: lead.accepted_at || now
    }).eq('id', lead.id).select('id,tester_status,tester_user_id,accepted_at').single();
    if (linkError) return res.status(503).json({ error: 'Rattachement du testeur impossible.' });
    res.json({ accepted: true, tester: linked });
  }));

  app.post('/api/admin/launch/testers', rateLimit('admin-launch-tester-write', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const supabase = getSupabaseServerClient();
    if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
    const leadId = typeof req.body?.leadId === 'string' ? req.body.leadId.trim() : '';
    const testerStatus = ['waitlisted', 'invited', 'accepted', 'activated', 'inactive', 'declined'].includes(req.body?.testerStatus)
      ? req.body.testerStatus
      : '';
    if (!leadId || !testerStatus) return res.status(400).json({ error: 'Lead et statut de cohorte requis.' });

    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = { tester_status: testerStatus };
    if (testerStatus === 'invited') patch.invited_at = nowIso;
    if (testerStatus === 'accepted') patch.accepted_at = nowIso;
    if (testerStatus === 'activated') {
      patch.activated_at = nowIso;
      patch.last_active_at = nowIso;
    }
    const { data, error } = await supabase.from('launch_leads')
      .update(patch)
      .eq('id', leadId)
      .eq('profile_type', 'client')
      .eq('country', 'FR')
      .select('id,email,tester_status,invited_at,accepted_at,activated_at,last_active_at')
      .maybeSingle();
    if (error) return res.status(400).json({ error: 'Cohorte testeur non mise à jour.' });
    if (!data) return res.status(404).json({ error: 'Lead client FR introuvable.' });
    res.json({ tester: data, updatedBy: admin.id });
  }));

  app.post('/api/admin/launch/interviews', rateLimit('admin-launch-interview-write', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const supabase = getSupabaseServerClient();
    if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
    const participantRef = typeof req.body?.participantRef === 'string' ? req.body.participantRef.trim().slice(0, 120) : '';
    const segment = ['client', 'pro', 'other'].includes(req.body?.segment) ? req.body.segment : 'client';
    const status = ['planned', 'completed', 'no_show', 'cancelled'].includes(req.body?.status) ? req.body.status : 'planned';
    if (!participantRef) return res.status(400).json({ error: 'Référence participant requise.' });
    const scheduledFor = isoOrNull(req.body?.scheduledFor);
    const completedAt = status === 'completed' ? (isoOrNull(req.body?.completedAt) || new Date().toISOString()) : null;
    const { data, error } = await supabase.from('launch_interviews').insert({
      participant_ref: participantRef,
      segment,
      status,
      scheduled_for: scheduledFor,
      completed_at: completedAt,
      created_by: admin.id
    }).select('id,participant_ref,segment,status,scheduled_for,completed_at').single();
    if (error) return res.status(400).json({ error: 'Entretien non enregistré.' });
    res.status(201).json({ interview: data });
  }));

  app.post('/api/admin/launch/partners', rateLimit('admin-launch-partner-write', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const supabase = getSupabaseServerClient();
    if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
    const professionalId = typeof req.body?.professionalId === 'string' ? req.body.professionalId.trim() : '';
    const status = ['prospect', 'contacted', 'active', 'paused', 'declined'].includes(req.body?.status) ? req.body.status : 'prospect';
    const cohort = typeof req.body?.cohort === 'string' && req.body.cohort.trim() ? req.body.cohort.trim().slice(0, 80) : LAUNCH_COHORT;
    const salonOsStatus = ['not_offered', 'offered', 'activated', 'declined'].includes(req.body?.salonOsStatus) ? req.body.salonOsStatus : 'not_offered';
    const routineCosigned = req.body?.routineCosigned === true;
    if (!professionalId) return res.status(400).json({ error: 'Professionnel requis.' });
    const { data, error } = await supabase.from('launch_partner_links').upsert({
      professional_id: professionalId,
      status,
      cohort,
      salon_os_status: salonOsStatus,
      routine_cosigned: routineCosigned,
      joined_at: status === 'active' ? (isoOrNull(req.body?.joinedAt) || new Date().toISOString()) : null,
      created_by: admin.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'professional_id,cohort' }).select('id,professional_id,status,cohort,salon_os_status,routine_cosigned,joined_at').single();
    if (error) return res.status(400).json({ error: 'Partenariat non enregistré.' });
    res.status(201).json({ partner: data });
  }));

  app.post('/api/admin/launch/nps', rateLimit('admin-launch-nps-write', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const supabase = getSupabaseServerClient();
    if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
    const score = Number(req.body?.score);
    if (!Number.isInteger(score) || score < 0 || score > 10) return res.status(400).json({ error: 'Le score NPS doit être un entier de 0 à 10.' });
    const userId = typeof req.body?.userId === 'string' && req.body.userId.trim() ? req.body.userId.trim() : null;
    const campaignKey = typeof req.body?.campaignKey === 'string' && req.body.campaignKey.trim() ? req.body.campaignKey.trim().slice(0, 80) : 'france-2026';
    const source = ['launch', 'post_purchase', 'interview', 'in_app'].includes(req.body?.source) ? req.body.source : 'launch';
    const payload = { user_id: userId, campaign_key: campaignKey, score, source };
    const query = userId
      ? supabase.from('launch_nps_responses').upsert(payload, { onConflict: 'user_id,campaign_key' }).select('id,user_id,campaign_key,score,source,created_at').single()
      : supabase.from('launch_nps_responses').insert(payload).select('id,user_id,campaign_key,score,source,created_at').single();
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: 'Réponse NPS non enregistrée.' });
    res.status(201).json({ response: data });
  }));
}
