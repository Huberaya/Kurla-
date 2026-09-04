/**
 * CHANTIER « AUCUN E-MAIL NE PART » — la panne doit se voir.
 *
 * Constat, en production, le 2026-09-03 : le fournisseur Resend renvoyait
 * « HTTP 401 — API key is invalid » depuis le 1er septembre. Résultat :
 * aucune confirmation de commande, aucune notification d'expédition, aucune
 * réinitialisation de mot de passe, aucune alerte de stock aux administrateurs.
 * Les paiements, eux, passaient normalement.
 *
 * Le plus grave n'est pas la panne : c'est qu'elle soit restée invisible. Une
 * clé invalide ne fait échouer aucune page. La cliente paie, voit une
 * confirmation à l'écran, et n'a jamais rien reçu. Personne ne le sait avant
 * qu'elle se plaigne — ou qu'elle ne se plaigne pas et ne revienne jamais.
 *
 * Ce banc verrouille la détection : la panne doit être déduite des
 * tentatives réelles, avec les vrais libellés d'erreur.
 */
import { strict as assert } from 'node:assert';

import {
  OUTAGE_WINDOW,
  computeEmailHealth,
  shouldWarn
} from '../src/lib/emailHealth';
import type { NotificationDeliveryLog } from '../src/lib/db/types';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const RESEND_401 = 'API resend HTTP 401: {"statusCode":401,"name":"validation_error","message":"API key is invalid"}';

function email(index: number, status: 'sent' | 'failed' | 'logged', error?: string): NotificationDeliveryLog {
  return {
    id: `log-${index}`,
    channel: 'email',
    status,
    provider: status === 'sent' ? 'resend' : 'resend',
    error,
    // Ordre antéchronologique, comme le renvoie la base.
    createdAt: new Date(Date.UTC(2026, 8, 30 - index, 12, 0, 0)).toISOString()
  };
}

// ——— 1. La panne réelle est détectée ———
{
  const logs = Array.from({ length: 5 }, (_, i) => email(i, 'failed', RESEND_401));
  const health = computeEmailHealth(logs, 'resend', true);

  assert.equal(health.outage, true, 'cinq échecs consécutifs doivent être une panne');
  assert.equal(health.counts.failed, 5);
  assert.equal(health.counts.sent, 0);
  assert.equal(shouldWarn(health), true);
  assert.equal(health.lastError, RESEND_401, 'la cause exacte doit être remontée, pas résumée');
  assert.match(health.lastError ?? '', /API key is invalid/);
  // Le fournisseur est déclaré et valide en apparence : seule la tentative
  // révèle la panne. C'est exactement pour ça qu'il faut lire les logs.
  assert.equal(health.isRealProvider, true);
  ok('panne Resend 401 détectée, cause exacte remontée');
}

// ——— 2. Un incident isolé n'est pas une panne ———
{
  const logs = [
    email(0, 'failed', 'adresse invalide'),
    email(1, 'sent'),
    email(2, 'sent'),
    email(3, 'sent')
  ];
  const health = computeEmailHealth(logs, 'resend', true);
  assert.equal(health.outage, false, 'un échec isolé ne doit pas crier à la panne');
  assert.equal(shouldWarn(health), false);
  assert.equal(health.counts.failed, 1);
  assert.equal(health.counts.sent, 3);
  ok('échec isolé : aucune alerte, le fournisseur fonctionne');
}

// ——— 3. Seuil minimal d'observations ———
{
  const one = computeEmailHealth([email(0, 'failed', RESEND_401)], 'resend', true);
  assert.equal(one.outage, false, 'un seul échantillon ne suffit pas à conclure');
  assert.equal(shouldWarn(one), false);

  const three = computeEmailHealth(
    [email(0, 'failed', 'x'), email(1, 'failed', 'x'), email(2, 'failed', 'x')],
    'resend',
    true
  );
  assert.equal(three.outage, true, 'trois échecs consécutifs suffisent');
  ok(`seuil : 1 tentative n'alerte pas, ${OUTAGE_WINDOW} échecs consécutifs alertent`);
}

// ——— 4. Fournisseur non configuré ———
{
  // Mode console en production : rien ne part, sans qu'aucune tentative
  // n'apparaisse dans les logs. L'alerte doit venir de la configuration.
  const health = computeEmailHealth([], 'console', false);
  assert.equal(health.outage, false);
  assert.equal(shouldWarn(health), true, 'fournisseur non configuré : alerte sans attendre un échec');
  assert.equal(health.counts.total, 0);

  const configured = computeEmailHealth([], 'resend', true);
  assert.equal(shouldWarn(configured), false, 'aucune tentative et fournisseur valide : rien à signaler');
  ok('fournisseur non configuré détecté même sans aucune tentative');
}

// ——— 4 bis. Journal réel : échecs récents mêlés à d'anciennes entrées console ———
{
  // C'est le journal exact relevé en production. Les quatre dernières lignes
  // sont des « logged » (mode console d'avant la mise en production) : exiger
  // que TOUTES les tentatives soient des échecs passait à côté de la panne.
  const real = [
    email(0, 'failed', RESEND_401),
    email(1, 'failed', RESEND_401),
    email(2, 'failed', RESEND_401),
    email(3, 'failed', RESEND_401),
    email(4, 'failed', RESEND_401),
    email(5, 'logged'),
    email(6, 'logged'),
    email(7, 'logged'),
    email(8, 'logged')
  ];
  const health = computeEmailHealth(real, 'resend', true);
  assert.equal(health.counts.sent, 0);
  assert.equal(health.outage, true, 'aucun succès et des échecs : c’est une panne, même avec d’anciennes entrées console');
  assert.equal(shouldWarn(health), true);
  ok('journal de production réel : panne détectée malgré les entrées console mêlées');
}

// ——— 5. Robustesse ———
{
  const empty = computeEmailHealth([], 'resend', true);
  assert.equal(empty.counts.total, 0);
  assert.equal(empty.lastError, null);
  assert.equal(empty.lastAttemptAt, null);
  assert.deepEqual(empty.recent, []);

  const nullish = computeEmailHealth(undefined as unknown as NotificationDeliveryLog[], 'resend', true);
  assert.equal(nullish.counts.total, 0, 'un journal absent ne doit pas faire échouer le tableau de bord');

  // Les canaux autres que l'e-mail ne comptent pas : une notification
  // applicative réussie ne dit rien de la délivrabilité.
  const mixed = computeEmailHealth(
    [
      email(0, 'failed', RESEND_401),
      { ...email(1, 'sent'), channel: 'in_app' },
      email(2, 'failed', RESEND_401),
      email(3, 'failed', RESEND_401)
    ],
    'resend',
    true
  );
  assert.equal(mixed.counts.total, 3, 'seuls les envois e-mail sont comptés');
  assert.equal(mixed.outage, true);
  ok('journal vide, absent ou mixte : calcul robuste, seuls les e-mails comptent');
}

console.log(`\nCHANTIER E-MAILS — ${checks} contrôles passés.\n`);
