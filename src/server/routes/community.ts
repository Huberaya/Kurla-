import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit } from '../http';
import { requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 11 (bloc C) — LA COMMUNAUTÉ DEVIENT LISIBLE.
 *
 * Avant ce module, on pouvait écrire un avis ou une question : aucune route ne
 * permettait de les lire. Ces routes ferment ce trou sans ajouter de
 * mécanique d'engagement — pas de likes, pas de followers, pas de fil infini.
 * Les questions sans réponse sont exposées comme telles : c'est la seule
 * information qui donne envie d'aider quelqu'un.
 */
export function registerCommunityRoutes(app: Express): void {
  /** État réel de la communauté — compteurs calculés, jamais estimés. */
  app.get('/api/community', rateLimit('community-overview', 60, 60_000), asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    const overview = await serverDb.getCommunityOverview();
    res.json(overview);
  }));

  /** Questions qui attendent une aide — la seule « liste » de la communauté. */
  app.get('/api/community/questions', rateLimit('community-questions', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const questions = await serverDb.getOpenCommunityQuestions(limit);
    res.json({ questions, count: questions.length });
  }));

  /** Questions d'un produit, réponses comprises, sans identité des auteurs. */
  app.get('/api/products/:productId/questions', rateLimit('product-questions', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const threads = await serverDb.getProductQuestionThreads(req.params.productId);
    res.json({
      productId: req.params.productId,
      questions: threads,
      openQuestions: threads.filter(thread => thread.open).length
    });
  }));

  /** Avis publiés d'un produit. */
  app.get('/api/products/:productId/reviews', rateLimit('product-reviews', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const reviews = await serverDb.getProductReviews(req.params.productId);
    const published = reviews.filter((review: any) => review.status === 'approved' || review.approved === true);
    res.json({
      productId: req.params.productId,
      reviews: published,
      count: published.length
    });
  }));

  /** Répondre à une question. Le rôle affiché est déduit, pas déclaré. */
  app.post('/api/products/:productId/questions/:questionId/answers', rateLimit('question-answer', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const answer = await serverDb.answerProductQuestion(user.id, user.role, req.params.questionId, req.body?.body);
      res.status(201).json({ answer: { id: answer.id, authorRole: answer.authorRole, body: answer.body, createdAt: answer.createdAt } });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Réponse impossible.' });
    }
  }));

  /** Le demandeur signale la réponse qui l'a aidé — un seul marquage, aucun compteur public. */
  app.post('/api/community/questions/:questionId/resolved', rateLimit('question-resolved', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const result = await serverDb.markQuestionResolved(user.id, req.params.questionId, String(req.body?.answerId || ''));
      res.json(result);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Marquage impossible.' });
    }
  }));
}
