/**
 * Navigation par sections du dashboard admin.
 *
 * Les pages du dashboard (pilotage catalogue, catalogue produits, opérations,
 * gouvernance…) sont de longues colonnes de sections : passer d'une section à
 * l'autre demandait de scroller une demi-page. Ce composant :
 *
 *   1. détecte automatiquement les sections du panel actif (les <h2>/<h3> du
 *      conteneur — aucune refonte des panels requise),
 *   2. affiche une barre de saut collante sous la barre de nav du site, avec
 *      la section visible surlignée (scrollspy) et un saut fluide au clic,
 *   3. montre la progression de lecture de la page et un retour en haut.
 *
 * Détection : à chaque changement d'onglet + MutationObserver débouncé
 * (les panels chargent leur contenu en asynchrone). Les ids sont stables par
 * libellé (hash), donc le scrollspy survive aux re-scans.
 * Seuil : moins de 3 sections détectées → la barre disparaît (pas de bruit).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, List } from 'lucide-react';

interface SectionInfo {
  id: string;
  label: string;
  level: 2 | 3;
}

function stableHash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const MAX_SECTIONS = 8;
const MIN_SECTIONS = 3;

/** Forme minimale d'un titre de section lue par collectSections (testable sans DOM). */
export interface SectionHeadingEl {
  tagName: string;
  textContent: string | null;
  id: string;
  style: { scrollMarginTop: string };
  /** null pour un élément masqué (display:none) — filtre de visibilité. */
  offsetParent: unknown;
}

/**
 * Construit la liste de saut depuis les h2/h3 d'un conteneur : libellé
 * tronqué, id stable par libellé, marge de saut posée sur l'élément.
 * Fonction pure côté données (le DOM n'entre que par querySelectorAll) :
 * le banc `kurla_admin_section_nav` la couvre sans navigateur.
 */
export function collectSections(root: {
  querySelectorAll: (selector: string) => Iterable<SectionHeadingEl>;
}): SectionInfo[] {
  const seen = new Set<string>();
  const list: SectionInfo[] = [];
  for (const h of root.querySelectorAll('h2, h3')) {
    const rawText = (h.textContent || '').trim().replace(/\s+/g, ' ');
    if (rawText.length <= 1 || h.offsetParent === null || seen.has(rawText)) continue;
    seen.add(rawText);
    let id = h.id;
    if (!id || !id.startsWith('admin-sec-')) {
      id = `admin-sec-${stableHash(rawText)}`;
      h.id = id;
    }
    // Le saut atterrit sous la barre de nav du site + la barre de sections.
    h.style.scrollMarginTop = '132px';
    list.push({ id, label: rawText.length > 28 ? rawText.slice(0, 27).trimEnd() + '…' : rawText, level: h.tagName === 'H2' ? 2 : 3 });
    if (list.length >= MAX_SECTIONS) break;
  }
  return list;
}

export const AdminSectionNav: React.FC<{
  rootRef: React.RefObject<HTMLDivElement>;
  /** Change à chaque changement d'onglet → re-scan du panel. */
  pageKey: string;
}> = ({ rootRef, pageKey }) => {
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);

  /** Lit les h2/h3 visibles du conteneur et construit la liste de saut. */
  const scan = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const list = collectSections(root);
    setSections(prev => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
  }, [rootRef]);

  /* Re-scan : changement d'onglet (+ un 2ᵉ scan différé pour le contenu asynchrone)
     et au fil des mutations du panel. */
  useEffect(() => {
    const t1 = window.setTimeout(scan, 30);
    const t2 = window.setTimeout(scan, 450);
    let cancelled = false;
    let debounce = 0;
    const root = rootRef.current;
    let observer: MutationObserver | null = null;
    if (root && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        window.clearTimeout(debounce);
        debounce = window.setTimeout(() => { if (!cancelled) scan(); }, 300);
      });
      observer.observe(root, { childList: true, subtree: true });
    }
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(debounce);
      observer?.disconnect();
    };
  }, [pageKey, scan, rootRef]);

  /* Scrollspy + progression + bouton retour haut (une seule écoute, rAF). */
  useEffect(() => {
    if (sections.length === 0) return;
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const root = rootRef.current;
        const y = window.scrollY;
        let current: string | null = sections[0]?.id ?? null;
        if (root) {
          const top = root.getBoundingClientRect().top + y;
          const end = top + root.offsetHeight - window.innerHeight;
          setProgress(end > top ? Math.min(1, Math.max(0, (y - top) / (end - top))) : 0);
          for (const s of sections) {
            const el = document.getElementById(s.id);
            // rect.top = distance au haut du viewport (indépendante des
            // ancêtres positionnés) : la section active est la plus basse
            // dont le haut est passé sous la zone de lecture.
            if (el && el.getBoundingClientRect().top <= 150) current = s.id;
          }
        }
        setActiveId(prev => (prev === current ? prev : current));
        setShowTop(y > 600);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [sections, rootRef]);

  /* « En butée » : ombre portée quand la barre colle sous la nav. */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), { threshold: 0 });
    io.observe(sentinel);
    return () => io.disconnect();
  }, [sections.length]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const toTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  if (sections.length < MIN_SECTIONS) return null;

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px -mt-px" />
      <nav
        aria-label="Sections de la page"
        className={`sticky top-[60px] z-30 transition-shadow ${stuck ? 'shadow-xl' : ''}`}
      >
        <div className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 backdrop-blur-md ${stuck ? 'bg-kurla-ink/95 border-kurla-cream/15' : 'bg-kurla-ink/60 border-transparent'}`}>
          <span className="hidden sm:flex items-center gap-1.5 pl-1 pr-2 text-[10px] font-bold uppercase tracking-wider text-kurla-amber/70 whitespace-nowrap">
            <List className="w-3.5 h-3.5" /> Sections
          </span>
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sections.map(section => {
              const active = section.id === activeId;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => jump(section.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    section.level === 3 ? 'text-[10px]' : ''
                  } ${active ? 'bg-kurla-copper text-white shadow' : 'text-kurla-cream/60 hover:text-kurla-cream hover:bg-kurla-cream/10'}`}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
          <span className="relative w-16 h-1 rounded-full bg-kurla-cream/10 shrink-0 overflow-hidden" aria-hidden>
            <span className="absolute inset-y-0 left-0 rounded-full bg-kurla-copper transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
          </span>
        </div>
      </nav>
      <button
        type="button"
        onClick={toTop}
        aria-label="Retour en haut de la page"
        title="Retour en haut"
        className={`fixed bottom-6 right-6 z-40 p-3 rounded-full bg-kurla-copper text-white shadow-xl transition-all duration-300 hover:bg-kurla-cocoa ${
          showTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </>
  );
};
