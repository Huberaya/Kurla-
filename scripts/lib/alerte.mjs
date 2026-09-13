/**
 * ALERTE D'INCIDENT — la logique, sans effet de bord à l'import.
 * =============================================================
 *
 * Le constat, mesuré le 13/09/2026 :
 *
 *   · la sonde tourne toutes les 15 minutes (`production-monitor.yml`) ;
 *   · le banc de rendu tourne toutes les 6 heures (`rendu-pages.yml`) ;
 *   · tous deux échouent correctement — et le signal s'arrête là, dans un
 *     tableau de bord qu'il faut aller ouvrir. Une panne à 3 h du matin est
 *     découverte à 9 h, quand quelqu'un ouvre GitHub.
 *
 * Ce module est le chaînon manquant : il porte le signal jusqu'à un endroit
 * où quelqu'un le reçoit. Deux destinations, dans cet ordre :
 *
 *   1. `ALERT_WEBHOOK_URL` — un POST JSON. Slack, Discord, ntfy, Make, n8n,
 *      un webhook maison : tout ce qui accepte du JSON. Temps réel.
 *   2. Une **issue GitHub** — pas de tiers, pas de compte, pas de clé
 *      supplémentaire : `GITHUB_TOKEN` existe déjà dans chaque exécution.
 *      Une issue est datée, commentable, et **notifiée par courriel** à
 *      tous ceux qui suivent le dépôt. C'est lent, mais c'est durable et
 *      ça ne dépend de personne d'autre que de GitHub.
 *
 * Et si aucune destination n'est disponible ? Le module le **dit**, en
 * échouant. C'est la règle de la sonde appliquée à l'alerte : un silence
 * n'est pas une preuve d'absence. Une alerte qui n'est pas partie ne doit
 * pas se terminer en succès, sinon on croit être couvert alors qu'on est
 * sourd.
 *
 * Dédoublonnage : une panne qui dure six heures produit vingt-quatre
 * exécutions de la sonde. Sans empreinte, vingt-quatre issues. Avec : une
 * seule issue, commentée à chaque récidive, fermée quand c'est fini.
 */

export const ETIQUETTE_INCIDENT = 'incident';

export const CODES_SORTIE = {
  envoye: 0,
  aucune_destination: 3,
  echec_emission: 4
};

/**
 * Quelle destination utiliser, étant donné un environnement ?
 *
 * Extrait pour être testable : c'est la décision, pas l'effet.
 */
export function choisirDestination(env = process.env) {
  const webhook = (env.ALERT_WEBHOOK_URL || '').trim();
  if (webhook) {
    return { canal: 'webhook', url: webhook };
  }
  const token = (env.GITHUB_TOKEN || '').trim();
  const depot = (env.GITHUB_REPOSITORY || '').trim();
  if (token && depot) {
    return { canal: 'github', token, depot };
  }
  return { canal: 'aucun' };
}

/** Empreinte courte et stable : sert au dédoublonnage et au titre. */
export function empreinteDe(parties = []) {
  const brut = parties.filter(Boolean).join('|');
  // FNV-1a 32 bits en hexadécimal : suffisant pour distinguer deux pannes
  // et stable d'un processus à l'autre (pas de dépendance, pas de sel).
  let h = 0x811c9dc5;
  for (let i = 0; i < brut.length; i += 1) {
    h ^= brut.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function titreIncident({ source, empreinte }) {
  return `Incident production — ${source} [${empreinte}]`;
}

export function corpsIncident({ source, empreinte, gravite, detail, lien, quand }) {
  const lignes = [
    `**${source}** a échoué.`,
    '',
    `- Gravité : ${gravite}`,
    `- Empreinte : \`${empreinte}\` (une panne qui dure garde la même)`,
    `- Survenu le : ${quand}`,
    `- Exécution : ${lien || 'non renseignée'}`,
    '',
    '— Détail —',
    '',
    '```',
    String(detail || 'Aucun détail transmis.').slice(0, 6000),
    '```',
    '',
    '_Issue ouverte automatiquement par `scripts/alerter.mjs`. Une panne qui'
    + ' dure ne crée pas d’autre issue : elle commente celle-ci._'
  ];
  return lignes.join('\n');
}

export function construirePayload(options) {
  const { source, empreinte, gravite = 'majeure', detail = '', lien = '', quand = new Date().toISOString() } = options || {};
  return {
    source,
    empreinte,
    gravite,
    detail,
    lien,
    quand,
    titre: titreIncident({ source, empreinte }),
    corps: corpsIncident({ source, empreinte, gravite, detail, lien, quand })
  };
}

/**
 * Le corps envoyé au webhook. Compatible Slack (`text`) et lisible par un
 * humain partout ailleurs.
 */
export function corpsWebhook(payload) {
  return JSON.stringify({
    text: `:rotating_light: ${payload.titre}`,
    gravite: payload.gravite,
    empreinte: payload.empreinte,
    lien: payload.lien,
    quand: payload.quand,
    detail: String(payload.detail).slice(0, 6000)
  });
}

function enTetesGithub(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'kurla-alerter',
    'Content-Type': 'application/json'
  };
}

async function issueOuverte(destination, empreinte, fetchImpl) {
  const url = `https://api.github.com/repos/${destination.depot}/issues`
    + `?state=open&labels=${ETIQUETTE_INCIDENT}&per_page=100`;
  const reponse = await fetchImpl(url, { headers: enTetesGithub(destination.token) });
  if (!reponse.ok) return null;
  const issues = await reponse.json();
  if (!Array.isArray(issues)) return null;
  return issues.find((issue) => String(issue?.title || '').includes(`[${empreinte}]`)) || null;
}

async function creerEtiquette(destination, fetchImpl) {
  // 422 = l'étiquette existe déjà. Ce n'est pas une erreur : c'est la réponse
  // normale après la première alerte.
  await fetchImpl(`https://api.github.com/repos/${destination.depot}/labels`, {
    method: 'POST',
    headers: enTetesGithub(destination.token),
    body: JSON.stringify({ name: ETIQUETTE_INCIDENT, color: 'd73a4a', description: 'Incident de production détecté automatiquement' })
  });
}

/**
 * Publie l'alerte. Retourne `{ canal, action, url }` ou `{ canal, action,
 * erreur }`. Ne lève pas : l'appelant veut un code de sortie, pas une
 * exception.
 */
export async function publier(destination, payload, { fetchImpl = fetch } = {}) {
  if (destination.canal === 'webhook') {
    try {
      const reponse = await fetchImpl(destination.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'kurla-alerter' },
        body: corpsWebhook(payload)
      });
      if (!reponse.ok) {
        return { canal: 'webhook', action: 'echec', erreur: `HTTP ${reponse.status}` };
      }
      return { canal: 'webhook', action: 'envoye' };
    } catch (error) {
      return { canal: 'webhook', action: 'echec', erreur: error?.message || String(error) };
    }
  }

  if (destination.canal === 'github') {
    try {
      const existe = await issueOuverte(destination, payload.empreinte, fetchImpl);
      if (existe) {
        const reponse = await fetchImpl(`https://api.github.com/repos/${destination.depot}/issues/${existe.number}/comments`, {
          method: 'POST',
          headers: enTetesGithub(destination.token),
          body: JSON.stringify({ body: `Nouvelle occurrence — ${payload.quand}.\n\n${lienOuRien(payload.lien)}` })
        });
        if (!reponse.ok) {
          return { canal: 'github', action: 'echec', erreur: `HTTP ${reponse.status} au commentaire` };
        }
        return { canal: 'github', action: 'commentee', url: existe.html_url };
      }

      await creerEtiquette(destination, fetchImpl);
      const reponse = await fetchImpl(`https://api.github.com/repos/${destination.depot}/issues`, {
        method: 'POST',
        headers: enTetesGithub(destination.token),
        body: JSON.stringify({ title: payload.titre, body: payload.corps, labels: [ETIQUETTE_INCIDENT] })
      });
      if (!reponse.ok) {
        const corps = await reponse.text().catch(() => '');
        return { canal: 'github', action: 'echec', erreur: `HTTP ${reponse.status} ${corps.slice(0, 200)}` };
      }
      const issue = await reponse.json().catch(() => null);
      return { canal: 'github', action: 'creee', url: issue?.html_url };
    } catch (error) {
      return { canal: 'github', action: 'echec', erreur: error?.message || String(error) };
    }
  }

  return { canal: 'aucun', action: 'aucune_destination' };
}

function lienOuRien(lien) {
  return lien ? `Exécution : ${lien}` : '';
}

export const RAPPEL_SANS_DESTINATION = [
  'AUCUNE DESTINATION D’ALERTE.',
  '',
  'Le banc a échoué et personne ne sera prévenu. Deux façons d’y remédier :',
  '',
  '  1. ALERT_WEBHOOK_URL — un secret de dépôt pointant vers Slack, Discord,',
  '     ntfy, Make ou n8n. Temps réel, une variable.',
  '  2. Rien à faire si ce banc tourne dans GitHub Actions : le jeton',
  '     GITHUB_TOKEN suffit à ouvrir une issue, qui est notifiée par courriel.',
  '',
  'Une alerte qui n’est pas partie ne doit pas se terminer en succès :',
  'ce banc échoue pour que le silence se voie.'
].join('\n');
