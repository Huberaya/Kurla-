import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { calculateKurlaFit } from '../../lib/kurlaFit';
import { normalizeBeautyProfile } from '../../lib/beautyProfile';
import { asyncRoute, rateLimit } from '../http';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 8.6b — API PUBLIQUE CATALOGUE + SCORING.
 *
 * Une ouverture vers l'extérieur, sur des données qui sont déjà publiques : le
 * catalogue vérifié et le score d'adéquation KURLA Fit. Rien de plus.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CETTE API NE FAIT PAS
 * ---------------------------------------------------------------------------
 * - Elle n'expose aucune donnée de membre : ni profil, ni journal, ni photo, ni
 *   cohorte, ni compte de fidélité, ni commande.
 * - Elle n'enregistre rien. `POST /api/v1/scoring/fit` reçoit un profil, répond,
 *   et l'oublie : aucun upsert, aucune session, aucun fait de progression. Le
 *   banc le vérifie en comparant l'état du store avant et après.
 * - Elle ne sert que des produits publiés. Un produit retiré ou non publiable
 *   renvoie 404, pas un enregistrement incomplet.
 * - Elle n'invente pas de score : quand le profil ne permet pas de conclure,
 *   `score` vaut `null`.
 *
 * Le scoring est sans état et sans compte parce qu'un tiers doit pouvoir
 * l'interroger sans que KURLA constitue un fichier de profils qui ne lui
 * appartiennent pas.
 */

export const PUBLIC_API_VERSION = 'v1';

/** Les engagements de l'API, dans les termes où l'écran et la doc les disent. */
export const PUBLIC_API_ENGAGEMENTS: string[] = [
  'Aucune donnée de membre n’est exposée par cette API, et aucune n’y entre : le scoring est sans état.',
  'Seuls les produits publiés sont servis ; un produit retiré renvoie 404.',
  'Le score KURLA Fit exprime l’adéquation entre un profil déclaré et un produit. Ce n’est ni une efficacité mesurée, ni un avis médical.',
  'Un score vaut null quand le profil ne permet pas de conclure : aucune note n’est inventée.',
  'Les prix sont indiqués dans la devise de règlement (EUR) et s’entendent hors taxe ; la TVA du pays de destination s’ajoute à la commande.'
];

/** Ce que cette API n'exposera jamais, quoi qu'on lui demande. */
export const PUBLIC_API_NEVER_EXPOSED: string[] = [
  'profils de membres',
  'journaux de progression et scores déclarés',
  'photos',
  'cohortes et agrégats communautaires',
  'comptes et faits de fidélité',
  'commandes, retours et paiements',
  'identité des professionnels et Trust Score nominatif'
];

export const PUBLIC_API_ATTRIBUTION =
  'Toute réutilisation doit citer « KURLA Beauty » et pointer vers la fiche d’origine du produit sur kurlabeauty.vercel.app. Les données de catalogue peuvent être mises en cache 24 heures maximum.';

export const PUBLIC_API_ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/manifest',
    description: 'Auto-description de l’API : version, limites, engagements, ce qui n’est jamais exposé.',
    auth: false
  },
  {
    method: 'GET',
    path: '/api/v1/products',
    description: 'Produits publiés, paginés. Paramètres : limit (1-100), offset, category.',
    auth: false
  },
  {
    method: 'GET',
    path: '/api/v1/products/:idOrSlug',
    description: 'Un produit publié, par identifiant ou par slug. 404 sinon.',
    auth: false
  },
  {
    method: 'GET',
    path: '/api/v1/scoring/schema',
    description: 'Les champs de profil acceptés par le scoring, et la façon dont le score est construit.',
    auth: false
  },
  {
    method: 'POST',
    path: '/api/v1/scoring/fit',
    description: 'Score d’adéquation entre un profil et le catalogue publié. Sans état : rien n’est enregistré.',
    auth: false
  }
] as const;

/** Nombre maximum de produits renvoyés par le scoring. */
const SCORING_MAX_RESULTS = 20;

function pageParams(req: AuthenticatedRequest): { limit: number; offset: number } {
  const rawLimit = Number(req.query.limit);
  const rawOffset = Number(req.query.offset);
  return {
    limit: Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 50,
    offset: Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0
  };
}

export function registerPublicApiRoutes(app: Express): void {
  app.get('/api/v1/manifest', rateLimit('public-api-manifest', 120, 60_000), asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      name: 'KURLA Public API',
      version: PUBLIC_API_VERSION,
      baseUrl: '/api/v1',
      attribution: PUBLIC_API_ATTRIBUTION,
      rateLimits: {
        manifest: '120 requêtes / minute',
        products: '60 requêtes / minute',
        scoring: '20 requêtes / minute'
      },
      endpoints: PUBLIC_API_ENDPOINTS,
      engagements: PUBLIC_API_ENGAGEMENTS,
      neverExposed: PUBLIC_API_NEVER_EXPOSED,
      statusUrl: '/api/health'
    });
  }));

  app.get('/api/v1/products', rateLimit('public-api-products', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const { limit, offset } = pageParams(req);
    const category = typeof req.query.category === 'string' && req.query.category.trim() ? req.query.category.trim() : null;
    const all = await serverDb.getPublicProducts();
    const filtered = category ? all.filter(product => product.category === category) : all;
    res.json({
      products: filtered.slice(offset, offset + limit),
      count: filtered.slice(offset, offset + limit).length,
      total: filtered.length,
      limit,
      offset,
      categories: [...new Set(all.map(product => product.category).filter(Boolean))]
    });
  }));

  app.get('/api/v1/products/:idOrSlug', rateLimit('public-api-product', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const wanted = String(req.params.idOrSlug || '').trim();
    const all = await serverDb.getPublicProducts();
    const product = all.find(item => item.id === wanted || item.slug === wanted);
    // Un produit non publié ne doit pas être devinable : même réponse qu'un
    // identifiant inexistant.
    if (!product) {
      res.status(404).json({ error: 'Produit indisponible.', code: 'PRODUCT_NOT_FOUND' });
      return;
    }
    res.json({ product });
  }));

  app.get('/api/v1/scoring/schema', rateLimit('public-api-scoring-schema', 60, 60_000), asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      version: PUBLIC_API_VERSION,
      endpoint: 'POST /api/v1/scoring/fit',
      body: { profile: 'objet profil KURLA (mêmes champs que le KURLA ID) ; les champs absents restent inconnus' },
      profileFields: {
        'hair.curlPattern': 'motif de boucle déclaré',
        'hair.porosity': 'porosité déclarée',
        'hair.density': 'densité déclarée',
        'hair.strandThickness': 'épaisseur du fil déclarée',
        'hair.breakage': 'casse déclarée',
        'hair.dryness': 'sécheresse déclarée',
        'hair.scalpCondition': 'état du cuir chevelu déclaré',
        'hair.scalpConcerns': 'signes du cuir chevelu déclarés',
        'skin.toneDepth': 'profondeur de carnation déclarée',
        'skin.sensitivity': 'sensibilité cutanée déclarée'
      },
      response: {
        score: 'adéquation de 0 à 100, ou null si le profil ne permet pas de conclure',
        confidence: 'part des dimensions réellement renseignées, en pourcentage (0 à 100)',
        evaluable: 'false quand aucun champ n’est renseigné : le score vaut alors null, jamais 0',
        reasons: 'explications lisibles, chacune rattachée à un champ déclaré',
        unmetNeeds: 'besoins du profil que le produit ne couvre pas'
      },
      needCodes: [
        'hydrater_cheveux',
        'reduire_casse',
        'definir_boucles',
        'cuir_chevelu',
        'entretenir_tresses',
        'entretenir_locks',
        'peau_sensible',
        'hydrater_peau'
      ],
      engagements: PUBLIC_API_ENGAGEMENTS,
      note: 'Le scoring est sans état : le profil envoyé n’est ni enregistré, ni rattaché à un compte, ni réutilisé.'
    });
  }));

  app.post('/api/v1/scoring/fit', rateLimit('public-api-scoring', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const rawProfile = req.body?.profile;
    if (!rawProfile || typeof rawProfile !== 'object') {
      res.status(400).json({
        error: 'Le corps de la requête doit contenir un objet « profile ».',
        schemaUrl: '/api/v1/scoring/schema'
      });
      return;
    }

    // Les champs absents restent inconnus : normalizeBeautyProfile ne complète
    // rien, et un profil vide produit des scores null plutôt que des notes
    // inventées.
    const profile = normalizeBeautyProfile(rawProfile);
    const products = await serverDb.getPublicProducts();

    const scored = products
      .map(product => {
        const fit = calculateKurlaFit(
          { category: product.category, needs: product.needs ?? [], concerns: product.concerns ?? [] },
          profile
        );
        // Un score de 0 avec une confiance nulle ne veut pas dire « mauvais
        // produit » : il veut dire « on ne sait rien ». Le renvoyer tel quel
        // ferait classer des produits non évaluables comme des mauvais choix.
        const evaluable = fit.confidence > 0;
        return {
          product: {
            id: product.id,
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            category: product.category,
            price: product.price,
            currency: product.currency ?? 'EUR',
            needs: product.needs ?? []
          },
          fit: {
            ...fit,
            score: evaluable ? fit.score : null,
            evaluable,
            evaluationNote: evaluable
              ? undefined
              : 'Aucun champ du profil n’est renseigné : aucune adéquation ne peut être établie.'
          }
        };
      })
      .sort((a, b) => {
        // Les scores null passent en dernier : un produit non évaluable n'est
        // pas un produit mal classé.
        if (a.fit.score === null && b.fit.score === null) return 0;
        if (a.fit.score === null) return 1;
        if (b.fit.score === null) return -1;
        return b.fit.score - a.fit.score;
      })
      .slice(0, SCORING_MAX_RESULTS);

    res.json({
      version: PUBLIC_API_VERSION,
      evaluated: products.length,
      returned: scored.length,
      results: scored,
      disclaimer:
        'Le score KURLA Fit exprime l’adéquation entre un profil déclaré et un produit. Ce n’est ni une efficacité mesurée, ni un diagnostic, ni un avis médical.',
      stateless: true
    });
  }));
}
