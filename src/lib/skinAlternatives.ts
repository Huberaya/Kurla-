import { Product } from '../types';

function hay(p: Product): string {
  return `${p.name} ${p.description} ${(p.badges||[]).join(' ')} ${(p.keyIngredients||[]).join(' ')} ${p.inci||''} ${p.routineStep||''}`.toLowerCase();
}

export function isSPFProduct(p: Product): boolean {
  const h = hay(p);
  return /spf|solair|uv|protection/i.test(h) || (p.needs||[]).some(n=>/protection_solaire|spf/i.test(n));
}

export function whitecastRisk(p: Product): 'faible'|'modere'|'eleve'|'na' {
  if (!isSPFProduct(p)) return 'na';
  const h = hay(p);
  const mineral = /titanium|zinc|minéral|mineral/i.test(h);
  const invisible = /invisible|sans.*trace|hybride|organique|fluide invisible/i.test(h);
  if (mineral && !invisible) return 'eleve';
  if (invisible) return 'faible';
  return 'modere';
}

export function routineFamily(p: Product): string {
  const r = (p.routineStep||'').toLowerCase();
  if (/spf|solair/.test(r) || isSPFProduct(p)) return 'spf';
  if (/nettoy/.test(r)) return 'nettoyant';
  if (/tonique|toner|essence/.test(r)) return 'tonique';
  if (/sérum|serum/.test(r)) return 'serum';
  if (/contour.*yeux|yeux/.test(r)) return 'yeux';
  if (/crème|creme|hydrat/.test(r)) return 'hydratant';
  if (/exfol/.test(r)) return 'exfoliant';
  if (/masque/.test(r)) return 'masque';
  if (/huile|baume/.test(r)) return 'huile';
  return r || (p.category==='peau'?'soin':'autre');
}

export interface AltOptions {
  max?: number;
  preferSansParfum?: boolean;
  preferInvisible?: boolean;
  budgetMax?: number;
}

export function findAlternatives(target: Product, all: Product[], opts: AltOptions = {}): Product[] {
  const max = opts.max ?? 3;
  const pool = all.filter(p => p.id !== target.id && p.category === 'peau');
  if (!pool.length) return [];
  const targetFam = routineFamily(target);
  const targetNeeds = new Set((target.needs||[]).map(n=>n.toLowerCase()));
  const targetPrice = target.price;

  const scored = pool.map(p => {
    let score = 0;
    const fam = routineFamily(p);
    if (fam === targetFam) score += 30;
    else if (fam && targetFam && fam[0]===targetFam[0]) score += 8;
    // needs overlap
    const overlap = (p.needs||[]).filter(n=> targetNeeds.has(n.toLowerCase())).length;
    score += overlap * 12;
    // keyIngredients overlap
    const kiOverlap = (p.keyIngredients||[]).filter(k=> (target.keyIngredients||[]).map(x=>x.toLowerCase()).includes(k.toLowerCase())).length;
    score += kiOverlap * 6;
    // sans parfum preference
    if (opts.preferSansParfum) {
      if (!p.containsFragrance && target.containsFragrance) score += 18;
      else if (!p.containsFragrance) score += 8;
      else score -= 10;
    } else {
      if (!p.containsFragrance) score += 3;
    }
    // whitecast for SPF
    if (targetFam==='spf' || isSPFProduct(target)) {
      const r = whitecastRisk(p);
      if (opts.preferInvisible) {
        if (r==='faible') score += 15;
        else if (r==='eleve') score -= 12;
      }
    }
    // price proximity
    const ratio = Math.abs(p.price - targetPrice) / Math.max(targetPrice, 1);
    if (ratio < 0.15) score += 10;
    else if (ratio < 0.30) score += 5;
    else if (ratio > 0.80) score -= 5;
    // budget cap
    if (opts.budgetMax !== undefined && p.price > opts.budgetMax) score -= 20;
    // rating bonus
    score += (p.rating || 0) * 1.2;
    // prefer published? not available, assume all visible are published
    return { p, score };
  }).sort((a,b)=> b.score - a.score);
  return scored.slice(0, max).map(s=>s.p);
}

export function findForStep(keyword: string, all: Product[], opts: AltOptions & { stepFamily?: string } = {}): Product[] {
  const pool = all.filter(p=> p.category==='peau');
  if (!pool.length) return [];
  const kw = keyword.toLowerCase();
  const fam = opts.stepFamily || '';
  const scored = pool.map(p=>{
    let score=0;
    const h = hay(p);
    if (h.includes(kw)) score+=18;
    if (fam && routineFamily(p)===fam) score+=22;
    // check keyIngredients contains keyword
    if ((p.keyIngredients||[]).some(k=>k.toLowerCase().includes(kw))) score+=10;
    if ((p.needs||[]).some(n=>n.toLowerCase().includes(kw))) score+=10;
    if ((p.routineStep||'').toLowerCase().includes(kw)) score+=14;
    // sans parfum
    if (opts.preferSansParfum && !p.containsFragrance) score+=10;
    if (opts.budgetMax && p.price <= opts.budgetMax) score+=5;
    if (opts.budgetMax && p.price > opts.budgetMax) score-=15;
    return {p, score};
  }).filter(s=>s.score>0).sort((a,b)=>b.score-a.score);
  return scored.slice(0, opts.max ?? 3).map(s=>s.p);
}

export function explainAltRelevance(target: Product, alt: Product): string {
  const tf = routineFamily(target);
  const af = routineFamily(alt);
  if (tf===af && tf==='spf') {
    const r = whitecastRisk(alt);
    if (r==='faible') return 'Même étape SPF — fini invisible, adapté peaux foncées';
    if (r==='eleve') return 'Même étape SPF — attention trace blanche';
    return 'Même étape SPF — texture à comparer';
  }
  if (tf===af) return `Même famille ${tf} — texture/prix à comparer`;
  if ((alt.keyIngredients||[]).some(k=> (target.keyIngredients||[]).includes(k))) return 'Même actifs clés';
  return 'Alternative même besoin';
}
