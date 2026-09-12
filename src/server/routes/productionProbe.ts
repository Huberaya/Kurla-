import type { Express, Response } from 'express';

import { asyncRoute, safeApiError } from '../http';
import type { AuthenticatedRequest } from '../auth';
// Module .mjs sans déclaration de types : `allowJs` laisse tsc inférer depuis
// la source, et esbuild l'embarque dans le bundle serverless. Aucun import
// Node dedans — la sonde n'utilise que `fetch`.
import { sonderTout, resumer, detailDe } from '../../../scripts/lib/sonde.mjs';

/**
 * SONDE HORAIRE — la dégradation entre deux déploiements.
 *
 * `verifier-deploiement.mjs` sonde après chaque mise en ligne. Ce cron couvre
 * ce qu'il ne peut pas voir : une donnée modifiée à la main, un service tiers
 * qui tombe, une table qui disparaît. Mesuré le 11/09/2026, la gamme peau est
 * restée invisible plusieurs jours sans qu'aucun déploiement ne change.
 *
 * Le signal est le **statut HTTP**, pas une ligne de journal. C'est délibéré :
 * les notifications push échouaient dans un `.catch` qui se contentait de
 * logger, et personne ne l'a vu. Ici, un silence fait répondre 500, donc Vercel
 * classe l'invocation du cron en échec et la montre dans le tableau de bord.
 *
 * Aucun tiers n'est requis : ni email, ni webhook, ni table. Une alerte par
 * email exigerait une adresse destinataire qui n'existe dans aucune
 * configuration actuelle — l'inventer aurait créé un silence de plus.
 */
export function registerProductionProbeRoutes(app: Express): void {
  app.get('/api/cron/sonde', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      // Même règle que /api/cron/retention : sans secret, pas d'exécution
      // publique. Un visiteur anonyme ne doit pas pouvoir déclencher la sonde.
      return res.status(503).json({
        error: 'Cron non configuré.',
        code: 'CRON_NOT_CONFIGURED',
        note: 'CRON_SECRET est absente. Renseignez-la pour activer la sonde horaire.'
      });
    }
    const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (provided !== secret) {
      return res.status(401).json({ error: 'Accès cron refusé.' });
    }

    const base = (process.env.VITE_APP_URL || '').replace(/\/+$/, '');
    if (!base) {
      // Sans URL publique la sonde n'a rien à interroger. Le dire plutôt que
      // de répondre « tout va bien » : ce serait exactement le silence que ce
      // cron existe pour empêcher.
      return res.status(503).json({
        error: 'Sonde impossible.',
        code: 'APP_URL_MISSING',
        note: 'VITE_APP_URL est absente : la sonde ne sait pas quelle production interroger.'
      });
    }

    try {
      // 8 s et non 15 : 15 routes par paquets de 4, soit 4 lots. Le pire cas
      // doit rester sous maxDuration (60 s) pour que la réponse — donc le
      // signal — ne soit pas perdue dans un timeout de fonction.
      const bilan = await sonderTout(base, { delaiMs: 8000 });
      const corps = {
        ok: true,
        base,
        productId: bilan.productId,
        resume: resumer(bilan),
        compteurs: {
          ok: bilan.ok.length,
          silences: bilan.silences.length,
          videsExpliques: bilan.expliques.length,
          videsAttendus: bilan.attendus.length,
          erreurs: bilan.erreurs.length,
          proteges: bilan.proteges.length
        },
        silences: bilan.silences.map((r: any) => ({ chemin: r.chemin, classe: r.classe, detail: detailDe(r) })),
        erreurs: bilan.erreurs.map((r: any) => ({ chemin: r.chemin, classe: r.classe, detail: detailDe(r) })),
        sondeLe: new Date().toISOString()
      };

      if (bilan.silences.length > 0 || bilan.erreurs.length > 0) {
        // 500 : Vercel classe l'invocation en échec. Le corps nomme les routes,
        // pour que la cause soit lisible sans rejouer la sonde.
        return res.status(500).json({
          ...corps,
          ok: false,
          error: `${bilan.silences.length} silence(s) et ${bilan.erreurs.length} erreur(s) en production.`,
          note: 'Un silence n’est pas une preuve d’absence : vérifier si la base contient les données attendues avant de corriger.'
        });
      }
      return res.json(corps);
    } catch (error) {
      // Une sonde qui échoue ne doit pas répondre 200.
      console.error('[Sonde] erreur :', error);
      return res.status(500).json({ error: safeApiError(error, 'Sonde indisponible.') });
    }
  }));
}
