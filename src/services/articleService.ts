import { useEffect, useState } from 'react';
import { Article } from '../types';

function mapArticle(row: any): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category || 'non-classé',
    excerpt: row.excerpt || '',
    readTime: row.readTime || '',
    date: row.publishedAt || row.createdAt || '',
    createdAt: row.createdAt || undefined,
    author: row.author || '',
    image: row.imageUrl || '',
    content: row.content || '',
    contentType: row.contentType || 'article',
    topic: row.topic || undefined,
    language: row.language || undefined,
    updatedAt: row.updatedAt || row.createdAt || undefined,
    sources: Array.isArray(row.sources) ? row.sources : [],
    evidenceLevel: row.evidenceLevel || 'not_provided',
    medicalWarning: row.medicalWarning || undefined,
    translations: row.translations && typeof row.translations === 'object' ? row.translations : {},
    mediaUrl: row.mediaUrl || undefined,
    duration: row.duration || undefined,
    faq: Array.isArray(row.faq) ? row.faq : [],
    relatedProducts: Array.isArray(row.relatedProductIds) ? row.relatedProductIds : []
  };
}

export function usePublishedArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/articles')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Articles indisponibles.');
        return data;
      })
      .then(data => { if (active) setArticles((data.articles || []).map(mapArticle)); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Articles indisponibles.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { articles, loading, error };
}

export async function fetchPublishedArticle(slug: string): Promise<Article | null> {
  const response = await fetch(`/api/articles/${encodeURIComponent(slug)}`);
  if (response.status === 404) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Article indisponible.');
  return data.article ? mapArticle(data.article) : null;
}
