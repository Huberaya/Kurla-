# CHECKLIST OPS — GO-LIVE KURLA (ce qui manque pour M1)

> Tout le code est prêt. Il ne manque que des **accès** (ci-dessous) et des **décisions ops**. Rien n'est inventé : chaque ligne cite où la valeur est consommée.

## A. À fournir par le propriétaire du compte (bloquant M1)
| # | Élément | Où le consommer | Blocage |
|---|---|---|---|
| A1 | ~~**`SUPABASE_SERVICE_ROLE_KEY`** (`sb_secret_…`)~~ | env `KURLA_STORE_MODE=server` ; prérequis des 6 bancs `test:realdb` + `scripts/verifier-schema.mjs` | ✅ **RÉSOLU (2026-09-12)** : 6 bancs verts en prod, `docs/GO_LIVE_RLS_AB_REPORT.md` |
| A2 | **Stripe live keys** : `STRIPE_SECRET_KEY` (`sk_live_…`) + `STRIPE_PUBLISHABLE_KEY` (`pk_live_…`) | `.env.example` (déjà câblé) ; Vercel env | **G2** (cycle 1 € payé→stock→remboursé→stock restauré) |
| A3 | **Provider email live** : `EMAIL_PROVIDER` (resend/sendgrid/postmark) + `EMAIL_PROVIDER_API_KEY` + `EMAIL_FROM` | `src/lib/emailService.ts` (console **refusé** en prod, verrou par banc) | **G3** (4 emails réels) |
| A4 | **Accès DNS `kurla-beauty.com`** (ou le faire soi-même) : enregistrements **SPF, DKIM, DMARC** du provider | délivrabilité + confiance des messageries | **G3** |
| A5 | **Webhook Stripe** : URL `https://kurlabeauty.vercel.app/api/stripe/webhook`, events `checkout.session.completed`, `charge.refunded`, `charge.dispute.created` + signature `whsec_…` dans Vercel | route existante `server.ts:183` (idempotent, verrou `STRIPE_WEBHOOK_ENABLED=true` à mettre) | **G2** (webhook idempotent) |
| A6 | **Box mail de test** dédiée (ex. `kurla-m1-test@…`) | réception des 4 emails G3 | **G3** |
| A7 | **Accès Vercel** (logs/rollback) + **accès Stripe Dashboard** remplis dans `docs/GO_LIVE_RUNBOOK.md` §4 | runbook | **G4** |

## B. Décisions ops (sans clé, à valider)
| # | Décision | Recommandation |
|---|---|---|
| B1 | CSP : passage de **Report-Only → enforce** | Actuel : `content-security-policy-report-only` actif en prod avec `report-uri` conseillé. Attendre **2 semaines de reporting sans violation** avant de forcer (sinon casser le chargement GTM/Plausible/fonts). C'est un basculement de header Vercel, 10 min. |
| B2 | Alerting incident | Vercel alerts (déploiements + errors) + Supabase log alerts (auth + API) ; destination : canal `#incidents`. |
| B3 | Backup testé | Restore **sur projet de rattrapage** (jamais in-place) avant M1 ; le faire après chaque migration majeure. |
| B4 | Cohorte France | Cohorte `france-2026` (catégories, unités, TVA, formats) : 100 % configuration, **0 jour de dev** — exécuter après G1-G4 verts. |

## C. Séquence exécution (ordre)
1. **A1** → `npm run test:realdb` → 6/6 → G1 ✅ (je le fais dès réception).
2. **A2 + A5** → `STRIPE_WEBHOOK_ENABLED=true` → cycle 1 € payé→stock→remboursé→stock restauré + webhook rejoué (idempotence) → G2 ✅.
3. **A3 + A4 + A6** → 4 emails reçus dans la box de test + console refusée en prod (déjà verrou) → G3 ✅.
4. **B1-B3 + A7** → G4 ✅.
5. **B4** → G5 ✅.
6. **Gate M1** : T1/T4/T5/T6 verts en prod → ouverture trafic.

> Règle du plan : **si G2 ou G3 échoue, M1 glisse** — pas de lancement « à moitié ».
