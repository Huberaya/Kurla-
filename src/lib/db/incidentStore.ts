/**
 * INCIDENTS DE PRODUCTION — compter, consigner, et ne jamais afficher un
 * nombre que personne n'a lu.
 *
 * Trois fonctions, pour trois trous mesurés le 13/09/2026 :
 *
 *   1. `/api/health` annonçait `orderCount: 0` alors que la base comptait
 *      39 commandes. La valeur venait du cache mémoire du processus, pas
 *      de la base. Un indicateur de santé qui ne lit pas la santé est pire
 *      qu'un indicateur absent : il rassure.
 *
 *   2. Sentry n'est pas configuré en production (`monitoring.configured` =
 *      `false`). `captureServerException` ne faisait donc rien du tout : une
 *      erreur serveur sortait dans un journal que personne ne relit, puis
 *      disparaissait. `consignerIncident` lui donne un repli durable — le
 *      journal d'audit, déjà en base, déjà protégé, déjà relu par
 *      l'administration.
 *
 *   3. Personne n'était réveillé. Le compteur d'incidents récents est là
 *      pour ça : il rend le nombre d'erreurs **visible dans une réponse
 *      HTTP**, donc sondable, donc alertable — par `scripts/alerter.mjs`.
 *
 * Règle tenue ici : **un compte qu'on n'a pas lu est `null`, jamais `0`**.
 * Un 0 faux se lit comme « il n'y en a pas » ; un `null` se lit comme « on
 * ne sait pas », et c'est la vérité.
 */

import { getSupabaseServerClient } from '../supabaseClient';

import type { SupabaseServerStore } from '../serverDb';

/**
 * Valeur portée par les lignes d'incident dans `audit_logs`.
 *
 * Non exportée, et c'est volontaire : `bindDomain` recopie **toutes** les
 * entrées d'un module de domaine sur le store — une constante exportée
 * deviendrait une « méthode » de l'API publique, avec l'arité de la longueur
 * de sa chaîne. Mesuré : `ACTION_INCIDENT` était apparu dans l'inventaire
 * comme `ACTION_INCIDENT/14`. Rien hors de ce module n'a besoin de la
 * valeur ; elle reste donc locale.
 */
const ACTION_INCIDENT = 'server_incident';

export type SourceDuCompte = 'base' | 'non_lu';

export interface Compte {
  compte: number | null;
  source: SourceDuCompte;
}

export interface IncidentServeur {
  empreinte: string;
  message: string;
  chemin: string;
  methode: string;
  statut: number;
  commit: string | null;
  deploiement: string | null;
  requestId: string | null;
  survenuLe: string;
}

/** Ce qu'on répond quand la base n'a pas pu être lue : rien, et on le dit. */
const NON_LU: Compte = { compte: null, source: 'non_lu' };

/**
 * Le nombre réel de commandes, lu en base.
 *
 * `head: true` + `count: 'exact'` : PostgreSQL compte, aucune ligne n'est
 * ramenée. La route de santé est appelée toutes les quinze minutes par la
 * sonde ; charger les commandes pour les compter serait absurde.
 */
export async function compterCommandes(_store: SupabaseServerStore): Promise<Compte> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return NON_LU;
  try {
    const { count, error } = await supabase.from('orders').select('id', { count: 'exact', head: true });
    if (error) return NON_LU;
    return typeof count === 'number' ? { compte: count, source: 'base' } : NON_LU;
  } catch {
    // Une base injoignable n'est pas « zéro commande » : c'est une lecture
    // qui a échoué. La différence est tout l'objet de ce module.
    return NON_LU;
  }
}

/**
 * Écrit un incident dans `audit_logs`.
 *
 * Ne lève jamais : l'incident est consigné depuis le gestionnaire d'erreurs,
 * au moment où la requête va répondre 500. Faire échouer la consignation
 * ajouterait une deuxième erreur à la première et masquerait le message
 * d'origine.
 */
export async function consignerIncident(
  _store: SupabaseServerStore,
  incident: IncidentServeur
): Promise<{ ecrit: boolean; raison?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ecrit: false, raison: 'base_non_configuree' };
  try {
    const { error } = await supabase.from('audit_logs').insert({
      action: ACTION_INCIDENT,
      user_id: null,
      details: {
        empreinte: incident.empreinte,
        message: incident.message.slice(0, 500),
        chemin: incident.chemin,
        methode: incident.methode,
        statut: incident.statut,
        commit: incident.commit,
        deploiement: incident.deploiement,
        requestId: incident.requestId,
        survenuLe: incident.survenuLe
      }
    });
    if (error) return { ecrit: false, raison: error.message };
    return { ecrit: true };
  } catch (error) {
    return { ecrit: false, raison: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Compte les incidents des dernières heures.
 *
 * Sert à `/api/health` : un nombre d'erreurs dans une réponse HTTP est un
 * signal qu'une sonde peut voir. Une erreur dans un journal n'est rien.
 */
export async function compterIncidentsRecents(
  _store: SupabaseServerStore,
  depuisIso: string
): Promise<Compte> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return NON_LU;
  try {
    const { count, error } = await supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action', ACTION_INCIDENT)
      .gte('created_at', depuisIso);
    if (error) return NON_LU;
    return typeof count === 'number' ? { compte: count, source: 'base' } : NON_LU;
  } catch {
    return NON_LU;
  }
}
