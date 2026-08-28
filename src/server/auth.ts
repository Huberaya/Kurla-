import type { Response } from 'express';

import { serverDb, ServerOrder } from '../lib/serverDb';
import { getSupabaseAuthVerifier, getSupabaseServerClient } from '../lib/supabaseClient';
import { UserRole } from '../types';

import type { AuthenticatedRequest, AuthenticatedUser } from './types';

/**
 * CHANTIER 8.1 — identité et autorisation, extraites de `server.ts`.
 *
 * Déplacées telles quelles. La règle structurante reste écrite ici parce que
 * c'est elle qui tient tout le reste : **l'identité ne vient que du jeton
 * Supabase**. Les en-têtes `x-user-id` / `x-user-email` sont délibérément ignorés
 * — ils sont fournis par le client et ne peuvent donc pas fonder une
 * autorisation.
 */

export const ADMIN_ROLES: UserRole[] = ['admin', 'superadmin'];
export const SUPPORT_ROLES: UserRole[] = [...ADMIN_ROLES, 'support'];

export function bearerToken(req: AuthenticatedRequest): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

/**
 * Resolve identity exclusively from a Supabase access token.
 * x-user-id/x-user-email are deliberately ignored: they are client supplied
 * and cannot be used for authorization.
 */
export async function authenticateRequest(req: AuthenticatedRequest): Promise<AuthenticatedUser | null> {
  const token = bearerToken(req);
  const verifier = getSupabaseAuthVerifier();
  if (!token || !verifier) return null;

  try {
    const { data, error } = await verifier.auth.getUser(token);
    if (error || !data.user || !data.user.id) return null;

    let role: UserRole = 'customer';
    const serverSupabase = getSupabaseServerClient();
    if (serverSupabase) {
      const { data: profile, error: profileError } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profileError && profile?.role && ADMIN_ROLES.includes(profile.role as UserRole)) {
        role = profile.role as UserRole;
      } else if (!profileError && profile?.role && ['professional', 'support', 'editor'].includes(profile.role)) {
        role = profile.role as UserRole;
      }
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
      role,
    };
  } catch (error) {
    console.error('[Auth] Supabase token verification failed:', error);
    return null;
  }
}

export async function requireUser(req: AuthenticatedRequest, res: Response): Promise<AuthenticatedUser | null> {
  const user = await authenticateRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification Supabase requise.' });
    return null;
  }
  req.authUser = user;
  return user;
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response): Promise<AuthenticatedUser | null> {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (!ADMIN_ROLES.includes(user.role)) {
    res.status(403).json({ error: 'Accès administrateur requis.' });
    return null;
  }
  return user;
}

export async function requireSupport(req: AuthenticatedRequest, res: Response): Promise<AuthenticatedUser | null> {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (!SUPPORT_ROLES.includes(user.role)) {
    res.status(403).json({ error: 'Accès support requis.' });
    return null;
  }
  return user;
}

/**
 * Une commande n'est lisible que par son propriétaire — ou par un administrateur.
 * Centralisé ici pour qu'aucune route ne réinvente le contrôle.
 */
export async function getOwnedOrder(orderId: string, user: AuthenticatedUser): Promise<ServerOrder | undefined> {
  const order = await serverDb.getOrderById(orderId);
  if (!order) return undefined;
  if (ADMIN_ROLES.includes(user.role)) return order;
  return order.userId === user.id ? order : undefined;
}

export type { AuthenticatedRequest, AuthenticatedUser };
