import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ThreadAnswer {
  id: string;
  authorRole: 'member' | 'professional' | 'kurla';
  body: string;
  createdAt: string;
}

interface QuestionThread {
  id: string;
  question: string;
  askedAt: string;
  officialAnswer?: string;
  answers: ThreadAnswer[];
  open: boolean;
}

const ROLE_LABEL: Record<ThreadAnswer['authorRole'], string> = {
  member: 'Membre',
  professional: 'Professionnel vérifié',
  kurla: 'Équipe KURLA'
};

/**
 * Réponses communautaires sur une fiche produit.
 *
 * Les réponses passent par le serveur : le rôle est déduit côté API et aucune
 * identité, adresse ou auto-déclaration de compétence n'est affichée.
 */
export const ProductCommunityQuestions: React.FC<{ productId: string }> = ({ productId }) => {
  const { session } = useAuth();
  const [threads, setThreads] = useState<QuestionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}/questions`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Les questions n’ont pas pu être chargées.');
      setThreads(Array.isArray(data.questions) ? data.questions : []);
    } catch (reason: any) {
      setError(reason?.message || 'Les questions n’ont pas pu être chargées.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [productId]);

  const answer = async (questionId: string) => {
    const body = (drafts[questionId] || '').trim();
    if (!session?.access_token || body.length < 10 || busyQuestionId) return;
    setBusyQuestionId(questionId);
    setError('');
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}/questions/${encodeURIComponent(questionId)}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ body })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'La réponse n’a pas pu être envoyée.');
      setDrafts(current => ({ ...current, [questionId]: '' }));
      await load();
    } catch (reason: any) {
      setError(reason?.message || 'La réponse n’a pas pu être envoyée.');
    } finally {
      setBusyQuestionId(null);
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-[#C8753D]/25 bg-[#1A0F0A] p-6" aria-labelledby="community-answers">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 id="community-answers" className="text-xl font-serif-title font-bold flex items-center gap-2"><MessageCircle className="w-5 h-5" /> Entraide de la communauté</h2>
        <span className="text-xs text-[#FFF7EF]/50">{threads.length} question{threads.length > 1 ? 's' : ''}</span>
      </div>
      <p className="mb-5 text-xs text-[#FFF7EF]/60">Répondez à partir de votre expérience. Le rôle affiché est vérifié par KURLA ; aucun nom ni e-mail n’est publié.</p>
      {error && <p className="mb-4 rounded-xl border border-[#C8753D]/30 bg-[#C8753D]/10 p-3 text-xs text-[#FFE0C6]">{error}</p>}
      {loading ? <div className="flex items-center gap-2 text-sm text-[#FFF7EF]/55"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div> : threads.length === 0 ? <p className="text-sm text-[#FFF7EF]/60">Aucune question communautaire pour ce produit.</p> : <div className="space-y-4">{threads.map(thread => <article key={thread.id} className="rounded-2xl border border-[#FFF7EF]/10 bg-[#050403] p-4"><p className="text-sm font-semibold">Q. {thread.question}</p>{thread.officialAnswer && <div className="mt-3 rounded-xl border border-[#D49A63]/25 bg-[#D49A63]/10 p-3 text-xs text-[#FFF7EF]/80"><p className="font-semibold text-[#D49A63]">Réponse KURLA</p><p className="mt-1">{thread.officialAnswer}</p></div>}{thread.answers.length > 0 && <div className="mt-3 space-y-2">{thread.answers.map(answerItem => <div key={answerItem.id} className="rounded-xl border border-[#FFF7EF]/10 p-3 text-xs"><p className="flex items-center gap-1.5 font-semibold text-[#D49A63]"><CheckCircle2 className="h-3.5 w-3.5" /> {ROLE_LABEL[answerItem.authorRole]}</p><p className="mt-1 text-[#FFF7EF]/75">{answerItem.body}</p></div>)}</div>}{session && <div className="mt-4 border-t border-[#FFF7EF]/10 pt-3"><textarea value={drafts[thread.id] || ''} onChange={event => setDrafts(current => ({ ...current, [thread.id]: event.target.value }))} minLength={10} maxLength={2000} rows={3} placeholder="Votre réponse utile, sans diagnostic ni promesse…" className="w-full rounded-xl border border-[#FFF7EF]/15 bg-black/20 px-3 py-2 text-xs text-[#FFF7EF] placeholder:text-[#FFF7EF]/35 focus:border-[#C8753D] focus:outline-none resize-none" /><button type="button" disabled={busyQuestionId === thread.id || (drafts[thread.id] || '').trim().length < 10} onClick={() => void answer(thread.id)} className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#C8753D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{busyQuestionId === thread.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Répondre</button></div>}</article>)}</div>}
      {!session && <p className="mt-4 text-xs text-[#FFF7EF]/60">Connectez-vous pour répondre à une question communautaire.</p>}
    </section>
  );
};
