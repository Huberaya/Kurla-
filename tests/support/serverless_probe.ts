/**
 * CHANTIER 13 — sonde du mode serverless.
 *
 * Lancée par `tests/kurla_seo_dynamic.test.ts` dans un processus enfant avec
 * `KURLA_SERVERLESS=true`. Elle importe le serveur, écoute, demande un chemin
 * inconnu et imprime le statut — **sans monter le repli SPA elle-même** : c'est
 * précisément ce que le serveur doit faire tout seul en mode serverless.
 *
 * Le défaut d'origine : le repli était monté dans `startServer()`, jamais appelé
 * sur Vercel, donc aucune route HTML n'atteignait ce code.
 */
async function main(): Promise<void> {
  const { app } = await import('../../server');
  const listener = app.listen(0, '127.0.0.1', async () => {
    const address = listener.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const unknown = await fetch(`http://127.0.0.1:${port}/page-qui-n-existe-pas`);
    const body = await unknown.text();
    console.log(`STATUS:${unknown.status}`);
    console.log(`NOINDEX:${body.includes('noindex') ? 'oui' : 'non'}`);
    listener.close(() => process.exit(0));
  });
}

main().catch(error => {
  console.log(`ERREUR:${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
