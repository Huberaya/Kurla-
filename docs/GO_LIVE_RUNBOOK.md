# RUNBOOK INCIDENT KURLA — GO-LIVE (1 page)

> Rôle : premier intervenant (dev ou ops). Objectif : **stopper la hémorragie, ne pas diagnostiquer pendant que l'hémorragie dure.**
> Déclaration de l'incident : message `#incidents` avec `[P1|P2] <symptôme> <heure> <lien>`.

## 1. Classification
- **P1** — paiements cassés, données client perdues/falsifiées, prod down, fuite de données → action immédiate, réveil possible.
- **P2** — fonction dégradée (emails non envoyés, reco lentes, checkout lent), pas de perte de données → intervention sous 2 h ouvrées.

## 2. Procédure P1 (ordre strict)
1. **Isoler l'état** : `GET /api/health` (Vercel) + logs Vercel (dernier déploiement) + logs Supabase (Activity). Screenshot/collez dans le thread.
2. **Si le dernier déploiement est suspect** → rollback Vercel (`vercel rollback` ou dashboard) en 1 clic. C'est l'action la plus rentable — on fait ça avant d'analyser.
3. **Si Stripe est en cause** (webhooks échoués, double débit, stock incohérent) →
   - **NE PAS** ré-exécuter manuellement les commandes ;
   - vérifier `/api/stripe/webhook` (logs) + table `stripe_events` (le webhook est idempotent : rejouer un événement Stripe est sans effet) ;
   - en dernier recours `STRIPE_WEBHOOK_ENABLED=false` pour figer les statuts (le polling de secours reprend) + prévenir le thread.
4. **Si la base est en cause** (queries lentes, lock, données corrompues) →
   - ne JAMAIS modifier les données à la main en P1 ;
   - exporter la preuve : `supabase db query` SELECT sur les lignes concernées ;
   - restore de backup : dashboard Supabase → Backups → **restore sur un projet de rattrapage**, jamais in-place pendant un P1.
5. **Commerciale** : si le client est impacté visiblement → bannière de maintenance + délai annoncé, pas de silence.

## 3. Post-incident (obligatoire, même P2)
- Thread clos avec : cause, fix, prévention (ticket ou commit).
- Si un bug de code : test régressif avant merge (règle chantier).
- Backup testé de nouveau si la base a été touchée.

## 4. Contacts & accès (à compléter par l'ops avant M1)
| Ressource | Où |
|---|---|
| Vercel (rollback/logs) | compte `kurlabeauty` — accès : _____ |
| Supabase (logs/backups) | `qzwgsarfdegqtfdnqiql` — accès : _____ |
| Stripe Dashboard (events/charges) | compte live — accès : _____ |
| Provider email (SPF/DKIM) | `kurla-beauty.com` — accès DNS : _____ |

## 5. Rappels durs (décidés au plan)
- Pas de `push --force`, jamais.
- Un incident ne justifie jamais de désactiver RLS ou le service role côté client.
- M1 glisse si un P1 touche paiements/emails : on ne « relance » pas par-dessus.
