/**
 * Pré-vol de délivrabilité des e-mails.
 *
 *   npm run email:check -- vous@exemple.com
 *
 * Pourquoi ce script existe. Une configuration d'e-mail a trois pièces
 * indépendantes, et chacune casse silencieusement à sa manière :
 *
 *   1. la clé d'API      — invalide → 401
 *   2. le domaine        — non vérifié chez le fournisseur → 403
 *   3. l'expéditeur      — EMAIL_FROM absent → envoi depuis un domaine
 *                          que personne ne possède → 403
 *
 * Une boutique peut très bien encaisser des paiements avec les trois cassées :
 * rien ne lève, aucune page ne se casse, la cliente ne reçoit simplement rien.
 * Le seul moyen de savoir, c'est d'envoyer un e-mail réel et de regarder ce que
 * le fournisseur répond.
 *
 * Ce script ne lit aucune valeur sensible depuis le dépôt : tout vient de
 * l'environnement. La clé n'est jamais écrite, jamais journalisée, jamais
 * commitée — il n'affiche que son préfixe.
 */

import { classifyEmailError } from '../src/lib/emailHealth';

const PROVIDERS = new Set(['resend', 'sendgrid', 'postmark']);

interface Verdict {
  ok: boolean;
  lines: string[];
}

function mask(secret: string | undefined): string {
  if (!secret) return 'absente';
  const head = secret.slice(0, Math.min(5, secret.length));
  return `${head}${'•'.repeat(Math.max(6, secret.length - head.length))} (${secret.length} caractères)`;
}

function domainOf(address: string): string {
  return address.split('@')[1]?.trim().toLowerCase() ?? '';
}

async function sendTestEmail(to: string): Promise<{ ok: boolean; body: string; status: number }> {
  const provider = (process.env.EMAIL_PROVIDER || 'console').trim().toLowerCase();
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (provider === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: from as string,
        to: [to],
        subject: 'KURLA — test de délivrabilité',
        html: '<p>Si vous lisez ceci, la configuration d’envoi fonctionne.</p>'
      })
    });
    const body = await response.text();
    return { ok: response.ok, body, status: response.status };
  }

  return {
    ok: false,
    body: `Fournisseur « ${provider} » : ce pré-vol ne sait tester que resend. Pour les autres, déclenchez un envoi réel depuis l’application et lisez la réponse dans le bandeau d’administration.`,
    status: 0
  };
}

async function main(): Promise<void> {
  const to = process.argv[2];
  const provider = (process.env.EMAIL_PROVIDER || 'console').trim().toLowerCase();
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  console.log('\nPRÉ-VOL DE DÉLIVRABILITÉ — KURLA\n' + '─'.repeat(64));

  const problems: string[] = [];

  console.log(`  fournisseur   ${provider}`);
  if (!PROVIDERS.has(provider)) {
    problems.push(`EMAIL_PROVIDER vaut « ${provider} » : ce n'est pas un fournisseur réel. Aucun e-mail ne partira, tout sera simplement journalisé.`);
  }

  console.log(`  clé d'API     ${mask(apiKey)}`);
  if (!apiKey) problems.push('EMAIL_PROVIDER_API_KEY est absente : le fournisseur refusera tous les envois (401).');

  console.log(`  expéditeur    ${from || 'absent (valeur de repli : domaine non possédé)'}`);
  if (!from) {
    problems.push('EMAIL_FROM est absente. Sans elle, l’application envoie depuis une adresse de repli dont le domaine n’appartient à personne : le fournisseur refusera l’envoi même avec une clé valide (403).');
  } else if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(from)) {
    problems.push(`EMAIL_FROM (« ${from} ») n'est pas une adresse valide.`);
  }

  console.log('─'.repeat(64));

  if (problems.length > 0) {
    console.log('\n  CONFIGURATION INCOMPLÈTE\n');
    for (const problem of problems) console.log(`  • ${problem}\n`);
    console.log('  Rien n’a été envoyé : inutile de tester un envoi qui ne peut\n  qu’échouer.\n');
    process.exitCode = 1;
    return;
  }

  if (!to) {
    console.log('\n  Configuration complète. Pour tester un envoi réel :');
    console.log('    npm run email:check -- vous@exemple.com\n');
    return;
  }

  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(to)) {
    console.log(`\n  « ${to} » n'est pas une adresse valide.\n`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n  Envoi d'un e-mail de test à ${to}…\n`);

  let result: { ok: boolean; body: string; status: number };
  try {
    result = await sendTestEmail(to);
  } catch (error: any) {
    console.log(`  ÉCHEC RÉSEAU — impossible de joindre le fournisseur : ${error?.message || error}\n`);
    process.exitCode = 1;
    return;
  }

  if (result.ok) {
    console.log('  ENVOI ACCEPTÉ par le fournisseur.');
    console.log(`  Expéditeur : ${from} (domaine ${domainOf(from as string)})`);
    console.log(`  Destinataire : ${to}\n`);
    console.log('  Vérifiez la réception — y compris dans les indésirables.\n');
    console.log(`  Réponse : ${result.body.slice(0, 200)}\n`);
    return;
  }

  const diagnosis = classifyEmailError(result.body);
  console.log(`  ENVOI REFUSÉ (HTTP ${result.status || '—'})\n`);
  console.log(`  Cause      ${diagnosis.what}`);
  console.log(`  Réparation ${diagnosis.fix}\n`);
  console.log(`  Message brut du fournisseur :\n    ${result.body.slice(0, 400)}\n`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('\nPré-vol interrompu :', error?.message || error, '\n');
  process.exitCode = 1;
});
