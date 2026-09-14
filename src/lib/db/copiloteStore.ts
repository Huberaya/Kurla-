/**
 * COPILOTE — le pouls de la plateforme, sans inventer un seul chiffre.
 * ===================================================================
 *
 * Demande du 15/09/2026 : « un copilot qui nous donne les informations de la
 * plateforme, par exemple combien de personnes ont cliqué sur le site,
 * combien ont créé un compte ».
 *
 * La tentation, ici, est de remplir l'écran. Un tableau de bord qui affiche
 * un nombre rassurant qu'il n'a pas mesuré est pire qu'un tableau de bord
 * vide : on pilote avec. La règle est donc celle du module des incidents —
 * **un chiffre qu'on n'a pas lu est `null`, jamais `0`** — étendue à une
 * troisième valeur, parce que « on a lu, et c'est zéro » et « on n'a pas pu
 * lire » ne se pilotent pas du tout de la même manière :
 *
 *   - `mesure`        → la lecture a réussi, voici le nombre ;
 *   - `aucun`         → la lecture a réussi, et il n'y en a **aucun** —
 *                       c'est un fait, pas une panne, et `lecture` dit ce
 *                       qu'il signifie ;
 *   - `non_mesurable` → la lecture a échoué. `valeur` est `null` et restera
 *                       `null` : afficher 0 ferait croire à une absence.
 *
 * Mesuré en production le 15/09/2026, pour que personne n'ait à le
 * redécouvrir : 846 pages vues, 20 diagnostics démarrés et 16 terminés,
 * **0 inscription, 0 ajout au panier, 0 paiement suivi**, 39 commandes en
 * base dont **1 seule réglée** (les 38 autres attendent le webhook Stripe —
 * ce sont des tests de paiement), et 2 comptes, ceux du fondateur. Le tuyau
 * d'événements, lui, fonctionne : éprouvé à la main, un `add_to_cart` envoyé
 * à `/api/events/funnel` arrive bien en base.
 *
 * Autrement dit : le site a du trafic et de l'engagement sur le diagnostic,
 * mais aucune conversion commerciale. Un copilote qui dirait autre chose
 * mentirait.
 */

import { getSupabaseServerClient } from '../supabaseClient';

import type { SupabaseServerStore } from '../serverDb';

/** Les trois états que peut prendre un indicateur, et ils ne se confondent pas. */
export type EtatIndicateur = 'mesure' | 'aucun' | 'non_mesurable';

export interface Indicateur {
  id: string;
  label: string;
  valeur: number | null;
  unite: string;
  etat: EtatIndicateur;
  /** Ce que le nombre veut dire. Toujours renseigné, surtout quand il est nul. */
  lecture: string;
}

export interface PoulsPlateforme {
  source: 'base' | 'memoire';
  periodeJours: number;
  depuis: string;
  /** Vrai si le décompte des sessions a atteint le plafond : il est alors minoré. */
  sessionsPartiel: boolean;
  indicateurs: Indicateur[];
  /** Lecture d'ensemble, déterministe : pas de modèle de langage, pas d'improvisation. */
  lecture: string[];
  avertissements: string[];
}

/**
 * Statuts qui signifient « l'argent est là ».
 *
 * `payment_pending_webhook` est volontairement exclu : une session Stripe
 * ouverte sans confirmation n'est pas une vente. En production le 15/09/2026,
 * 38 commandes sur 39 étaient dans cet état — les compter comme du chiffre
 * d'affaires aurait affiché 39 ventes là où il y en a une.
 */
const STATUTS_REGLES = ['paid', 'preparing', 'shipped', 'delivered'];

/**
 * Plafond du décompte des sessions.
 *
 * PostgreSQL sait compter des lignes ; il ne sait pas compter des valeurs
 * DISTINCTES via PostgREST. On ramène donc les identifiants de session et on
 * dédoublonne en mémoire, avec une borne : au-delà, l'indicateur est annoncé
 * comme minoré plutôt que faux.
 */
const PLAFOND_SESSIONS = 20_000;

/** Compte les lignes d'une table, ou rend `null` si la lecture échoue. */
async function compter(
  supabase: any,
  table: string,
  filtre?: (requete: any) => any
): Promise<number | null> {
  try {
    let requete = supabase.from(table).select('id', { count: 'exact', head: true });
    if (filtre) requete = filtre(requete);
    const { count, error } = await requete;
    if (error) return null;
    return typeof count === 'number' ? count : null;
  } catch {
    return null;
  }
}

async function compterEvenements(
  supabase: any,
  noms: string[],
  depuisIso: string
): Promise<number | null> {
  return compter(supabase, 'growth_funnel_events', requete =>
    requete.in('event_name', noms).gte('occurred_at', depuisIso));
}

/** Fabrique un indicateur ; l'état découle de la lecture, jamais de l'envie. */
function indicateur(
  id: string,
  label: string,
  unite: string,
  valeur: number | null,
  lectureSiMesure: string,
  lectureSiAucun: string
): Indicateur {
  if (valeur === null) {
    return {
      id,
      label,
      unite,
      valeur: null,
      etat: 'non_mesurable',
      lecture: 'Lecture impossible : la base n’a pas répondu. Aucun chiffre n’est affiché plutôt qu’un 0 qui rassurerait.'
    };
  }
  if (valeur === 0) {
    return { id, label, unite, valeur: 0, etat: 'aucun', lecture: lectureSiAucun };
  }
  return { id, label, unite, valeur, etat: 'mesure', lecture: lectureSiMesure };
}

export async function lirePoulsPlateforme(
  store: SupabaseServerStore,
  options: { jours?: number } = {}
): Promise<PoulsPlateforme> {
  const periodeJours = Math.max(1, Math.min(365, Math.round(options.jours ?? 30)));
  const depuis = new Date(Date.now() - periodeJours * 24 * 60 * 60 * 1000);
  const depuisIso = depuis.toISOString();

  const supabase = getSupabaseServerClient();

  // ── Chemin mémoire ────────────────────────────────────────────────────────
  // Il sert aux bancs : sans lui, « non mesurable » serait la seule réponse
  // hors production et aucune règle de ce module ne serait jamais exercée.
  if (!supabase) {
    const evenements = (store.inMemoryGrowthFunnelEvents || []).filter(
      evenement => new Date(evenement.occurredAt) >= depuis
    );
    const compte = (noms: string[]) => evenements.filter(e => noms.includes(e.eventName)).length;
    const sessions = new Set(evenements.map(e => e.sessionId)).size;
    const commandes = (store.inMemoryOrders || []).length;
    const reglees = (store.inMemoryOrders || []).filter(commande =>
      STATUTS_REGLES.includes(String((commande as any).status))).length;
    const valeurs = {
      visites: compte(['page_view']),
      sessions,
      inscriptions: compte(['sign_up']),
      demarres: compte(['diagnostic_start']),
      terminees: compte(['diagnostic_complete']),
      paniers: compte(['add_to_cart']),
      checkouts: compte(['begin_checkout']),
      achats: compte(['purchase']),
      commandes,
      reglees
    };
    return construire('memoire', periodeJours, depuisIso, false, valeurs, null);
  }

  // ── Chemin base : des comptes, jamais des tables entières ─────────────────
  const [
    visites,
    inscriptions,
    demarres,
    terminees,
    paniers,
    checkouts,
    achats,
    commandes,
    reglees,
    sessionsLu
  ] = await Promise.all([
    compterEvenements(supabase, ['page_view'], depuisIso),
    compterEvenements(supabase, ['sign_up'], depuisIso),
    compterEvenements(supabase, ['diagnostic_start'], depuisIso),
    compterEvenements(supabase, ['diagnostic_complete'], depuisIso),
    compterEvenements(supabase, ['add_to_cart'], depuisIso),
    compterEvenements(supabase, ['begin_checkout'], depuisIso),
    compterEvenements(supabase, ['purchase'], depuisIso),
    compter(supabase, 'orders'),
    compter(supabase, 'orders', r => r.in('status', STATUTS_REGLES)),
    lireSessions(supabase, depuisIso)
  ]);

  const comptes = await compter(supabase, 'profiles');

  return construire(
    'base',
    periodeJours,
    depuisIso,
    sessionsLu.partiel,
    {
      visites,
      sessions: sessionsLu.sessions,
      inscriptions,
      demarres,
      terminees,
      paniers,
      checkouts,
      achats,
      commandes,
      reglees
    },
    comptes
  );
}

async function lireSessions(
  supabase: any,
  depuisIso: string
): Promise<{ sessions: number | null; partiel: boolean }> {
  try {
    const { data, error } = await supabase
      .from('growth_funnel_events')
      .select('session_id')
      .gte('occurred_at', depuisIso)
      .limit(PLAFOND_SESSIONS);
    if (error) return { sessions: null, partiel: false };
    const lignes = data || [];
    return {
      sessions: new Set(lignes.map((ligne: any) => ligne.session_id)).size,
      partiel: lignes.length >= PLAFOND_SESSIONS
    };
  } catch {
    return { sessions: null, partiel: false };
  }
}

interface Valeurs {
  visites: number | null;
  sessions: number | null;
  inscriptions: number | null;
  demarres: number | null;
  terminees: number | null;
  paniers: number | null;
  checkouts: number | null;
  achats: number | null;
  commandes: number | null;
  reglees: number | null;
}

function construire(
  source: 'base' | 'memoire',
  periodeJours: number,
  depuisIso: string,
  sessionsPartiel: boolean,
  v: Valeurs,
  comptes: number | null
): PoulsPlateforme {
  const indicateurs: Indicateur[] = [
    indicateur(
      'visites', 'Pages vues', 'vues', v.visites,
      `${v.visites} pages vues sur ${periodeJours} jours.`,
      'Aucune page vue enregistrée sur la période. Soit le site n’a pas reçu de visite, soit le suivi n’a pas été chargé (il est déclenché par la navigation côté client).'
    ),
    indicateur(
      'sessions', 'Visiteurs (sessions)', 'sessions', v.sessions,
      `${v.sessions} sessions distinctes sur ${periodeJours} jours.`,
      'Aucune session enregistrée sur la période.'
    ),
    indicateur(
      'diagnostics', 'Diagnostics terminés', 'diagnostics', v.terminees,
      `${v.terminees} diagnostics terminés sur ${v.demarres ?? 0} démarrés.`,
      'Aucun diagnostic terminé sur la période.'
    ),
    indicateur(
      'inscriptions', 'Comptes créés', 'comptes', v.inscriptions,
      `${v.inscriptions} créations de compte sur ${periodeJours} jours.`,
      'Aucune création de compte enregistrée sur la période. L’événement est émis à l’inscription : un zéro signifie que personne ne s’est inscrit, pas que le suivi est cassé.'
    ),
    indicateur(
      'comptes', 'Comptes existants', 'comptes', comptes,
      `${comptes} comptes au total.`,
      'Aucun compte en base.'
    ),
    indicateur(
      'paniers', 'Ajouts au panier', 'ajouts', v.paniers,
      `${v.paniers} ajouts au panier sur ${periodeJours} jours.`,
      'Aucun ajout au panier sur la période : personne n’est passé à l’achat.'
    ),
    indicateur(
      'checkouts', 'Passages en caisse', 'passages', v.checkouts,
      `${v.checkouts} passages en caisse.`,
      'Aucun passage en caisse sur la période.'
    ),
    indicateur(
      'achats', 'Achats confirmés', 'achats', v.achats,
      `${v.achats} achats confirmés.`,
      'Aucun achat confirmé. Les commandes en attente de webhook Stripe ne comptent pas : une session ouverte n’est pas une vente.'
    ),
    indicateur(
      'commandes', 'Commandes en base', 'commandes', v.commandes,
      `${v.commandes} commandes en base, dont ${v.reglees ?? 0} réellement réglées.`,
      'Aucune commande en base.'
    )
  ];

  const lecture: string[] = [];
  const avertissements: string[] = [];

  if (sessionsPartiel) {
    avertissements.push(
      `Le décompte des sessions a atteint le plafond de ${PLAFOND_SESSIONS} lignes : le nombre affiché est minoré, il faut une agrégation en base pour le rendre exact.`
    );
  }

  const vide = (id: string) => indicateurs.find(i => i.id === id)?.etat === 'aucun';
  const mesure = (id: string) => indicateurs.find(i => i.id === id)?.etat === 'mesure';
  const valeur = (id: string) => indicateurs.find(i => i.id === id)?.valeur ?? 0;

  if (mesure('visites') && valeur('visites') > 0 && vide('achats')) {
    lecture.push(
      `Le site reçoit du trafic (${valeur('visites')} pages vues) mais aucune vente n’est enregistrée : le blocage est en aval de la visite.`
    );
  }
  if (mesure('diagnostics') && valeur('diagnostics') > 0 && vide('paniers')) {
    lecture.push(
      `${valeur('diagnostics')} diagnostics aboutissent, et pourtant personne n’ajoute au panier : c’est l’étape recommandation → produit qui ne passe pas.`
    );
  }
  // `reglees` n'est pas un indicateur affiché : on le lit dans les valeurs,
  // pas dans la liste des indicateurs — sinon `valeur('reglees')` rend 0 et
  // cette lecture ne sort jamais. (Trouvé par le banc, pas par relecture.)
  const reglees = v.reglees ?? 0;
  const commandes = v.commandes ?? 0;
  if (mesure('commandes') && commandes > 0 && reglees === 0) {
    lecture.push(
      `${commandes} commandes en base dont aucune réglée : ce sont des sessions Stripe en attente de confirmation (webhook), pas des ventes.`
    );
  }
  if (mesure('commandes') && commandes > 0 && reglees > 0 && reglees < commandes) {
    lecture.push(
      `${reglees} commande(s) réglée(s) sur ${commandes} : les autres attendent la confirmation du paiement et ne comptent pas comme du chiffre d’affaires.`
    );
  }
  if (vide('inscriptions') && mesure('comptes') && valeur('comptes') > 0) {
    lecture.push(
      `${valeur('comptes')} compte(s) existent au total, mais aucune création sur la période : ils ont été créés avant, ou hors de l’application.`
    );
  }
  if (mesure('visites') && valeur('visites') > 0 && valeur('sessions') > 0) {
    const parSession = Math.round((valeur('visites') / valeur('sessions')) * 10) / 10;
    lecture.push(`En moyenne ${parSession} pages vues par visiteur.`);
  }
  if (mesure('demarres') && valeur('demarres') > 0) {
    const taux = Math.round((valeur('terminees') / valeur('demarres')) * 100);
    lecture.push(`Taux d’achèvement du diagnostic : ${taux} % (${valeur('terminees')} sur ${valeur('demarres')}).`);
  }

  const nonMesurables = indicateurs.filter(i => i.etat === 'non_mesurable').map(i => i.label);
  if (nonMesurables.length > 0) {
    avertissements.push(
      `Indicateurs non mesurables (base muette) : ${nonMesurables.join(', ')}. Aucun 0 n’est affiché à leur place.`
    );
  }

  return { source, periodeJours, depuis: depuisIso, sessionsPartiel, indicateurs, lecture, avertissements };
}
