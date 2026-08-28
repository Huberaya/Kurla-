import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { getProfessionalApplications } from './professionalApplicationStore';

import type { ProductQuestionAnswer } from './types';
import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 11 (bloc C) — PETITE COMMUNAUTÉ.
 *
 * Constat vérifié avant d'écrire : on pouvait **poser** une question et
 * **écrire** un avis, mais aucune route ne permettait de les lire. Une
 * communauté qu'on ne peut pas lire n'existe pas — et la page « Communauté »
 * était une coquille annonçant « des milliers de personnes » et un challenge
 * qui n'existe nulle part dans le code.
 *
 * Trois principes, tous opposés aux mécanismes d'engagement classiques :
 *
 *  1. **Utile avant visible.** On expose les questions sans réponse en
 *     priorité : c'est là qu'une réponse sert à quelqu'un. Aucun fil infini,
 *     aucun compteur de likes, aucun classement de membres, aucun abonnement
 *     à un profil.
 *  2. **Le rôle est déduit, pas déclaré.** « Professionnel vérifié » vient du
 *     statut réel en base, jamais d'un choix de l'auteur.
 *  3. **L'identité n'est pas publiée.** Une question ou une réponse expose un
 *     rôle et une date, pas un nom ni un e-mail. Le RGPD passe avant l'effet
 *     de communauté.
 */

export interface QuestionThreadAnswer {
  id: string;
  authorRole: ProductQuestionAnswer['authorRole'];
  body: string;
  createdAt: string;
}

export interface QuestionThread {
  id: string;
  productId: string;
  question: string;
  askedAt: string;
  /** Réponse officielle (marque/KURLA), distincte de l'entraide. */
  officialAnswer?: string;
  officialAnsweredAt?: string;
  answers: QuestionThreadAnswer[];
  resolvedAnswerId?: string | null;
  /** Vrai tant qu'aucune réponse — membre ou officielle — n'existe. */
  open: boolean;
}

export interface CommunityOverview {
  generatedAt: string;
  reviewsApproved: number;
  questionsAsked: number;
  questionsWithAnswer: number;
  openQuestions: number;
  memberAnswers: number;
  verifiedProfessionals: number;
  professionalEndorsements: number;
}

/** Rôle affiché, déduit du statut réel — jamais déclaré par l'auteur. */
async function resolveAuthorRole(store: SupabaseServerStore, userId: string, userRole: string): Promise<ProductQuestionAnswer['authorRole']> {
  if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'support' || userRole === 'editor') return 'kurla';

  /**
   * Le badge « professionnel » exige un **dossier approuvé**, pas seulement un
   * rôle en session. Un rôle peut venir d'un compte ancien ou d'une attribution
   * interne ; la vérification, elle, est un acte tracé (dossier, charte,
   * décision d'administration). Afficher « professionnel vérifié » sur la foi
   * d'un drapeau serait exactement le genre d'affirmation que KURLA refuse.
   */
  const applications = await getProfessionalApplications(store).catch(() => []);
  const approved = applications.some(application => application.userId === userId && application.status === 'approved');
  if (approved) return 'professional';
  return 'member';
}

export async function getProductQuestionThreads(store: SupabaseServerStore, productId: string): Promise<QuestionThread[]> {
  const supabase = getSupabaseServerClient();
  let rows: any[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from('product_questions')
      .select('id, product_id, question, answer, status, user_id, created_at, answered_at')
      .eq('product_id', productId)
      .neq('status', 'rejected')
      .order('created_at', { ascending: false });
    ensureDatabaseSuccess('lecture des questions produit', error);
    rows = data || [];
  } else {
    rows = store.inMemoryProductQuestions.filter(question => question.productId === productId);
  }

  const answersByQuestion = new Map<string, QuestionThreadAnswer[]>();
  if (supabase) {
    const { data } = await supabase
      .from('product_question_answers')
      .select('id, question_id, author_role, body, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });
    for (const row of data || []) {
      const list = answersByQuestion.get(row.question_id) ?? [];
      list.push({ id: row.id, authorRole: row.author_role, body: row.body, createdAt: row.created_at });
      answersByQuestion.set(row.question_id, list);
    }
  } else {
    for (const answer of store.inMemoryQuestionAnswers.filter(item => item.productId === productId)) {
      const list = answersByQuestion.get(answer.questionId) ?? [];
      list.push({ id: answer.id, authorRole: answer.authorRole, body: answer.body, createdAt: answer.createdAt });
      answersByQuestion.set(answer.questionId, list);
    }
  }

  return rows.map(row => {
    const answers = answersByQuestion.get(String(row.id)) ?? [];
    const officialAnswer = (row.answer || undefined) as string | undefined;
    return {
      id: String(row.id),
      productId: String(row.product_id ?? row.productId),
      question: String(row.question),
      askedAt: String(row.created_at ?? row.createdAt),
      officialAnswer: row.status === 'answered' ? officialAnswer : undefined,
      officialAnsweredAt: row.answered_at ?? row.answeredAt ?? undefined,
      answers,
      resolvedAnswerId: row.resolved_answer_id ?? row.resolvedAnswerId ?? null,
      open: answers.length === 0 && !officialAnswer
    };
  });
}

/**
 * Répond à une question. Le rôle est calculé, le contenu est borné, et une
 * réponse vide ou copié-collée de la question est refusée.
 */
export async function answerProductQuestion(
  store: SupabaseServerStore,
  userId: string,
  userRole: string,
  questionId: string,
  body: unknown
): Promise<ProductQuestionAnswer> {
  const text = typeof body === 'string' ? body.trim() : '';
  if (text.length < 10 || text.length > 2000) throw new Error('La réponse doit contenir entre 10 et 2 000 caractères.');

  const supabase = getSupabaseServerClient();
  let question: any;
  if (supabase) {
    const { data, error } = await supabase.from('product_questions').select('id, product_id, user_id, question, status').eq('id', questionId).maybeSingle();
    ensureDatabaseSuccess('lecture de la question', error);
    question = data;
  } else {
    question = store.inMemoryProductQuestions.find(item => item.id === questionId);
  }
  if (!question) throw new Error('Question introuvable.');
  if (question.status === 'rejected') throw new Error('Cette question a été retirée.');

  const authorRole = await resolveAuthorRole(store, userId, userRole);
  const answer: ProductQuestionAnswer = {
    id: randomUUID(),
    questionId,
    productId: String(question.product_id ?? question.productId),
    userId,
    authorRole,
    body: text,
    createdAt: new Date().toISOString()
  };

  if (supabase) {
    const { error } = await supabase.from('product_question_answers').insert({
      id: answer.id,
      question_id: answer.questionId,
      product_id: answer.productId,
      user_id: answer.userId,
      author_role: answer.authorRole,
      body: answer.body,
      created_at: answer.createdAt
    });
    ensureDatabaseSuccess('enregistrement de la réponse', error);
  } else {
    store.inMemoryQuestionAnswers.push(answer);
  }

  return answer;
}

/**
 * Le demandeur — et lui seul — signale la réponse qui l'a aidé.
 *
 * Ce n'est pas un « like » : un seul marquage par question, par la personne
 * concernée. Aucun compteur public, aucun classement.
 */
export async function markQuestionResolved(
  store: SupabaseServerStore,
  userId: string,
  questionId: string,
  answerId: string
): Promise<{ questionId: string; resolvedAnswerId: string }> {
  const supabase = getSupabaseServerClient();
  let question: any;
  if (supabase) {
    const { data, error } = await supabase.from('product_questions').select('id, user_id').eq('id', questionId).maybeSingle();
    ensureDatabaseSuccess('lecture de la question', error);
    question = data;
  } else {
    question = store.inMemoryProductQuestions.find(item => item.id === questionId);
  }
  if (!question) throw new Error('Question introuvable.');
  if (question.user_id !== userId && question.userId !== userId) {
    throw new Error('Seule la personne qui a posé la question peut signaler la réponse utile.');
  }

  const known = supabase
    ? Boolean((await supabase.from('product_question_answers').select('id').eq('id', answerId).eq('question_id', questionId).maybeSingle()).data)
    : store.inMemoryQuestionAnswers.some(item => item.id === answerId && item.questionId === questionId);
  if (!known) throw new Error('Réponse introuvable pour cette question.');

  if (supabase) {
    const { error } = await supabase.from('product_questions').update({ resolved_answer_id: answerId }).eq('id', questionId);
    ensureDatabaseSuccess('marquage de la réponse utile', error);
  } else {
    const row = store.inMemoryProductQuestions.find(item => item.id === questionId);
    if (row) (row as any).resolvedAnswerId = answerId;
  }

  return { questionId, resolvedAnswerId: answerId };
}

export interface OpenQuestionSummary {
  id: string;
  productId: string;
  productName?: string;
  /** La fiche produit se lit `/produit/:slug` — l'identifiant seul ne suffit pas. */
  productSlug?: string;
  question: string;
  askedAt: string;
}

/**
 * Questions qui attendent une aide.
 *
 * C'est la seule « liste » que la communauté expose : pas de fil d'actualité,
 * pas de classement. Une question sans réponse est utile à montrer — c'est là
 * qu'une réponse sert réellement à quelqu'un.
 */
export async function getOpenCommunityQuestions(store: SupabaseServerStore, limit = 20): Promise<OpenQuestionSummary[]> {
  const supabase = getSupabaseServerClient();
  const names = new Map<string, string>();
  const slugs = new Map<string, string>();

  if (supabase) {
    const { data, error } = await supabase
      .from('product_questions')
      .select('id, product_id, question, answer, status, created_at')
      .neq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(200);
    ensureDatabaseSuccess('lecture des questions', error);
    const rows = data || [];
    const answeredIds = new Set(rows.filter((row: any) => row.status === 'answered' && row.answer).map((row: any) => row.id));
    const answeredByMember = await supabase.from('product_question_answers').select('question_id');
    for (const row of answeredByMember.data || []) answeredIds.add((row as any).question_id);
    const open = rows.filter((row: any) => !answeredIds.has(row.id));
    const ids = Array.from(new Set(open.map((row: any) => String(row.product_id))));
    if (ids.length) {
      const products = await supabase.from('products').select('id, name, slug').in('id', ids);
      for (const product of products.data || []) {
        names.set(String((product as any).id), String((product as any).name));
        slugs.set(String((product as any).id), String((product as any).slug ?? ''));
      }
    }
    return open.slice(0, Math.max(1, limit)).map((row: any) => ({
      id: String(row.id),
      productId: String(row.product_id),
      productName: names.get(String(row.product_id)),
      productSlug: slugs.get(String(row.product_id)),
      question: String(row.question),
      askedAt: String(row.created_at)
    }));
  }

  const products = await store.getProducts();
  for (const product of products) {
    names.set(product.id, product.name);
    slugs.set(product.id, product.slug || '');
  }
  return store.inMemoryProductQuestions
    .filter(question => !question.answer && !store.inMemoryQuestionAnswers.some(answer => answer.questionId === question.id))
    .slice(0, Math.max(1, limit))
    .map(question => ({
      id: question.id,
      productId: question.productId,
      productName: names.get(question.productId),
      productSlug: slugs.get(question.productId),
      question: question.question,
      askedAt: question.createdAt
    }));
}

/**
 * État réel de la communauté. Aucun nombre n'est estimé : chaque compteur est
 * calculé, et un zéro est affiché comme un zéro.
 */
export async function getCommunityOverview(store: SupabaseServerStore): Promise<CommunityOverview> {
  const supabase = getSupabaseServerClient();

  let reviewsApproved = 0;
  let questionsAsked = 0;
  let memberAnswers = 0;
  let verifiedProfessionals = 0;
  let questionsWithAnswer = 0;
  let openQuestions = 0;

  const applications = await getProfessionalApplications(store).catch(() => []);
  verifiedProfessionals = applications.filter(application => application.status === 'approved').length;

  if (supabase) {
    const reviews = await supabase.from('reviews').select('id').eq('status', 'approved');
    reviewsApproved = (reviews.data || []).length;
    const questions = await supabase.from('product_questions').select('id, answer, status').neq('status', 'rejected');
    questionsAsked = (questions.data || []).length;
    const answers = await supabase.from('product_question_answers').select('id');
    memberAnswers = (answers.data || []).length;
    const answeredIds = new Set((questions.data || []).filter(row => row.status === 'answered' && row.answer).map(row => row.id));
    const withMemberAnswer = new Set((answers.data || []).map((row: any) => row.question_id));
    questionsWithAnswer = (questions.data || []).filter(row => answeredIds.has(row.id) || withMemberAnswer.has(row.id)).length;
    openQuestions = questionsAsked - questionsWithAnswer;
  } else {
    reviewsApproved = store.inMemoryProductReviews.filter((review: any) => review.status === 'approved' || review.approved === true).length;
    questionsAsked = store.inMemoryProductQuestions.length;
    memberAnswers = store.inMemoryQuestionAnswers.length;
    const answered = store.inMemoryProductQuestions.filter(question => question.answer || store.inMemoryQuestionAnswers.some(answer => answer.questionId === question.id));
    questionsWithAnswer = answered.length;
    openQuestions = questionsAsked - questionsWithAnswer;
  }

  const endorsements = await supabase
    ? (await supabase.from('professional_endorsements').select('id')).data?.length ?? 0
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    reviewsApproved,
    questionsAsked,
    questionsWithAnswer,
    openQuestions,
    memberAnswers,
    verifiedProfessionals,
    professionalEndorsements: endorsements
  };
}
