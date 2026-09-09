import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Shield, Sun, Droplets, FlaskConical, Sparkles, Clock, AlertTriangle, Heart, Layers, Eye, Info, Search, CheckCircle2 } from 'lucide-react';

const GUIDES = [
  {
    id: 'hpi',
    tag: 'Taches · HPI',
    read: '6 min',
    title: 'Comprendre l’hyperpigmentation post-inflammatoire (HPI)',
    desc: 'Pourquoi les peaux riches en mélanine marquent plus, et comment uniformiser sans “éclaircir”.',
    hero: 'Mélanosomes plus gros et plus dispersés → toute inflammation (bouton, frottement) peut laisser une tache sombre plus visible phototypes IV–VI. Ce n’est pas un défaut, c’est une mémoire de la peau.',
    points: [
      'HPI ≠ mélasma ≠ tache solaire : HPI suit un bouton/grattage, le mélasma est hormonal/solaire diffus.',
      'Vocabulaire : nous parlons d’“uniformiser le teint”, jamais d’“éclaircir la peau”.',
      '3 leviers cosmétiques documentés : limiter l’inflammation (barrière), limiter le transfert de mélanine (niacinamide 5%), protéger du soleil (SPF quotidien) pour ne pas foncer la marque.',
      'Ce que KURLA ne fait pas : ne promet pas d’effacer, ne propose pas d’actifs dépigmentants agressifs sans suivi pro.',
    ],
    routine: 'Matin : tonique niacinamide 5% → SPF invisible. Soir : sérum azélaïque 10% 3×/sem, jamais même soir que AHA fort.',
    cta: '/peau/routine',
  },
  {
    id: 'spf',
    tag: 'SPF · trace blanche',
    read: '4 min',
    title: 'SPF et peaux foncées : indispensable, même phototype foncé',
    desc: 'SPF naturel 13 ≠ protection. Comment choisir un SPF invisible (sans white cast) et l’appliquer.',
    hero: 'Un phototype VI a un SPF naturel ≈13, loin des 50 nécessaires pour limiter HPI. Le soleil n’éclaircit pas moins, il fige la tache.',
    points: [
      'Filtres minéraux (zinc/titane) 100% = risque élevé de voile gris si non teinté. Préférer hybride/organique “invisible”.',
      'Dose : 2 doigts pour visage + cou, réappliquer si exposition >2h. Texture fluide = plus facile à doser qu’une crème épaisse.',
      'Test lumière du jour : appliquer sur mâchoire, vérifier à la fenêtre. Notre comparateur affiche le risque whitecast.',
      'Hiver/grisaille : UV passent les nuages. SPF reste le meilleur investissement anti-taches.',
    ],
    routine: 'Dernier geste du matin, après hydratant. Même en intérieur si grande baie vitrée.',
    cta: '/peau/comparer',
  },
  {
    id: 'niacinamide',
    tag: 'Actif · niacinamide',
    read: '5 min',
    title: 'Niacinamide 5% : pour qui, comment, avec quoi',
    desc: 'Uniformiser, lisser le grain, réguler le sébum — sans agresser la barrière.',
    hero: '5% est le sweet spot : assez pour limiter le transfert de mélanosome, assez doux pour peaux sensibles et HPI.',
    points: [
      'Tolérance : commencer 3×/sem le soir, puis quotidien. Picotement léger = espacer.',
      'Associations sûres : niacinamide + SPF le matin, + céramides le soir. Éviter même routine que vitamine C forte au début (alterner matins).',
      'Texture : sérum aqueux 3 gouttes sur peau encore humide, puis crème barrière.',
      'Résultats : 4–8 semaines à dose régulière, pas de miracle en 3 jours.',
    ],
    routine: 'Tonique ou sérum 5% le soir, SPF le matin. Alternative : azélaïque si niacinamide ne convient pas.',
    cta: '/boutique?cat=peau&q=niacinamide',
  },
  {
    id: 'barriere',
    tag: 'Barrière · céramides',
    read: '4 min',
    title: 'Barrière cutanée : céramides + squalane = réparer',
    desc: 'Tiraillement, picotement, HPI qui revient = barrière fragilisée. Comment la reconstruire.',
    hero: 'Céramides + cholestérol + acides gras = mortier entre les briques de la peau. Sans eux, tout s’évapore.',
    points: [
      'Signaux barrière KO : peau qui tiraille après nettoyage, rougeurs qui durent, HPI qui s’assombrit.',
      'Nettoyant sans sulfates (glycérine) + crème céramides le soir scelle l’hydratation. Le squalane végétal est biomimétique et non comédogène.',
      'Mois d’hiver : passer de gel à crème riche. Été : gel léger suffit si mixte.',
      'Exfoliant et rétinol mis en pause si barrière abîmée — on répare d’abord.',
    ],
    routine: 'Soir étape 7 : crème barrière généreuse. Hebdo : masque céramides 10 min.',
    cta: '/boutique?cat=peau&q=ceramides',
  },
  {
    id: 'retinol-aha',
    tag: 'Exfoliation · garde-fou',
    read: '5 min',
    title: 'Rétinol et AHA/BHA : jamais le même soir sans avis',
    desc: 'Deux actifs puissants, une seule peau. Comment alterner sans irriter.',
    hero: 'Rétinol accélère le renouvellement, AHA exfolie en surface. Ensemble = irritation, et sur peau riche en mélanine, irritation = HPI.',
    points: [
      'Règle KURLA : rétinol mar./ven., AHA lun./jeu., repos le week-end. Le site alerte si vous tentez le même soir.',
      'Débutant : AHA 5% 1×/sem, puis 2×. Rétinol 0,3% 2×/sem. Arrêt si desquamation.',
      'Toujours SPF le lendemain — les deux photosensibilisent.',
      'Alternative douce si sensible : enzymatique (papaye) 1×/sem.',
    ],
    routine: 'Soir : nettoyant → tonique hydratant → (un seul actif) → crème barrière.',
    cta: '/peau/routine',
  },
  {
    id: 'textures',
    tag: 'Textures · finis',
    read: '3 min',
    title: 'Gel, crème ou huile ? Choisir selon type et fini souhaité',
    desc: 'Mixte qui brille, sèche qui tiraille : une texture = un usage.',
    hero: 'La même molécule n’a pas le même toucher : gel = eau+ céramides, crème = émulsion, huile = scellage.',
    points: [
      'Mixte/grasse : gel léger matin (fini naturel, non gras), crème légère le soir.',
      'Sèche/très sèche : lait le matin, crème riche + 1 goutte squalane le soir.',
      'Fini “glowy” = hydratant + SPF fluide, pas huile lourde qui marque les taches.',
      'Phototype foncé : les finis mats poudrés peuvent griser — préférer satiné invisible.',
    ],
    routine: 'Matin 5 hydratant : gel si mixte, crème si sèche. Toujours sceller avant SPF.',
    cta: '/boutique?cat=peau',
  },
  {
    id: 'budget',
    tag: 'Budget · routine',
    read: '3 min',
    title: 'Routine à 32€, 68€ ou 124€ : que choisit-on vraiment ?',
    desc: 'Moins de produits mais les bons, à votre enveloppe. Prix total et alternatives à chaque étape.',
    hero: '32€ = nettoyant → hydratant → SPF (2 min). 68€ ajoute tonique + sérum + exfoliant doux (équilibre HPI). 124€ ajoute double nettoyage + contour yeux + masques.',
    points: [
      'Essentielle : 3 produits, le meilleur rapport qualité/prix si budget serré ou débutant.',
      'Complète (recommandée) : 6 produits, la plus équilibrée pour HPI/barrière sans routine de 9 étapes.',
      'Premium : 9 produits, pour passionnés qui aiment le layering — pas “mieux”, juste plus complet.',
      'Chaque étape propose alternative sans parfum et prix au 10 ml pour comparer.',
    ],
    routine: 'Dites à KURLA “routine à 40€” → sélection dans l’enveloppe. Fatou 28 ans a choisi Complète sans parfum.',
    cta: '/peau/routine?budget=40_70',
  },
];

export const SkinGuidePage: React.FC = () => {
  const [open, setOpen] = useState<string | null>('hpi');
  const [q, setQ] = useState('');

  const filtered = GUIDES.filter(g => !q.trim() || `${g.title} ${g.desc} ${g.tag}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen pt-28 pb-24 bg-[#FFFDF9] text-[#111111]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <a href="/peau" className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] font-semibold mb-4 hover:underline"><ArrowLeft className="w-4 h-4" /> Retour pôle peau</a>

        <div className="text-center max-w-3xl mx-auto mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] text-[#D9A8A4] text-[10px] font-bold tracking-widest uppercase"><BookOpen className="w-3.5 h-3.5" /> KURLA SKIN · guide peau</span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold mt-3">Le guide peau — 7 essentiels</h1>
          <p className="text-sm text-[#111111]/70 font-light mt-3 leading-relaxed">HPI, SPF sans trace blanche, niacinamide, barrière : 7 fiches de 3–6 min, vocabulaire <strong className="font-semibold text-[#111111]">uniformiser ≠ éclaircir</strong>, routines chiffrées, gardes actifs. Aucun diagnostic médical.</p>
          <div className="mt-5 flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#111111]/40" />
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher hpi, spf, niacinamide, barrière..." className="w-full pl-9 pr-3 py-3 rounded-full bg-white border border-[#E8E1DA] text-xs focus:outline-none focus:border-[#C8753D]" />
            </div>
            <a href="/peau/diagnostic" className="px-5 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold shrink-0">Diagnostic →</a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {filtered.map(g => {
              const isOpen = open===g.id;
              return (
                <article key={g.id} className={`rounded-3xl border p-6 text-left transition-all ${isOpen? 'bg-[#FFFDF9] border-[#C8753D] shadow-sm' : 'bg-[#F8F2EC] border-[#E8E1DA] hover:border-[#C8753D]/40'}`}>
                  <button onClick={()=>setOpen(isOpen?null:g.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-white border border-[#E8E1DA] font-bold text-[#C8753D]">{g.tag} · {g.read}</span>
                        <h2 className="text-sm sm:text-base font-bold leading-tight mt-2">{g.title}</h2>
                        <p className="text-xs text-[#111111]/60 font-light mt-1 leading-relaxed">{g.desc}</p>
                      </div>
                      <span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${isOpen?'bg-[#111111] border-[#111111] text-white':'bg-white border-[#E8E1DA] text-[#111111]/40'}`}>{isOpen?'−':'+'}</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-4 space-y-4 animate-in fade-in">
                      <div className="p-4 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] text-xs leading-relaxed">
                        <p className="font-bold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-[#C8753D]" /> En bref</p>
                        <p className="mt-1 text-[#111111]/75">{g.hero}</p>
                      </div>
                      <ul className="space-y-2 text-xs leading-relaxed">
                        {g.points.map((pt,i)=> <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#C8753D] shrink-0 mt-0.5" /><span>{pt}</span></li>)}
                      </ul>
                      <div className="p-3 rounded-xl bg-[#111111] text-white text-xs flex gap-2">
                        <Clock className="w-4 h-4 text-[#D49A63] shrink-0" />
                        <span><strong>Routine associée :</strong> {g.routine}</span>
                      </div>
                      <div className="flex gap-2">
                        <a href={g.cta} className="px-4 py-2 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold">Appliquer →</a>
                        <a href="/peau/routine" className="px-4 py-2 rounded-full bg-white border border-[#E8E1DA] text-xs font-bold hover:border-[#C8753D]">Voir ma routine</a>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
            {filtered.length===0 && <div className="p-10 rounded-3xl bg-white border border-[#E8E1DA] text-center text-xs text-[#111111]/60">Aucun guide ne correspond à “{q}”. <button onClick={()=>setQ('')} className="text-[#C8753D] underline">Effacer</button></div>}
          </div>

          <div className="space-y-4">
            <div className="p-6 rounded-3xl bg-[#111111] text-white">
              <h3 className="text-sm font-bold flex items-center gap-1.5"><Shield className="w-4 h-4 text-[#D49A63]" /> Gardes mélanine KURLA</h3>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/80">
                <li>• <strong className="text-white">Uniformiser ≠ éclaircir.</strong> Aucune promesse d’éclaircissement de carnation.</li>
                <li>• HPI = tache post-inflammation. SPF quotidien = 1re prévention, même phototype foncé.</li>
                <li>• White-cast : filtres minéraux bruts = voile gris → privilégier hybrides/organiques invisibles.</li>
                <li>• Rétinol + AHA le même soir = alerte irritation. Jamais sans alternance.</li>
              </ul>
              <p className="text-[11px] text-white/50 mt-3 leading-relaxed">Guides cosmétiques, pas médicaux. Si lésion qui saigne, douleur ou HPI qui s’étend, consultez un dermato.</p>
            </div>
            <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
              <h3 className="text-sm font-bold flex items-center gap-1.5"><Layers className="w-4 h-4 text-[#C8753D]" /> Besoin d’un pro peau ?</h3>
              <p className="text-xs text-[#111111]/65 font-light mt-2 leading-relaxed">6 experts peaux riches en mélanine vérifier leur identité. Prenez un créneau vidéo ou atelier.</p>
              <a href="/pros-verifies?cat=peau" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111111] text-white text-xs font-bold">Voir les pros peau →</a>
              <p className="text-[11px] text-[#111111]/45 mt-2">Catégorie <code>skincare_expert</code> — Trust Score vérifié, avis issus de prestations.</p>
            </div>
            <div className="p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA]">
              <h3 className="text-sm font-bold flex items-center gap-1.5"><FlaskConical className="w-4 h-4 text-[#C8753D]" /> Par ingrédient</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['Niacinamide 5%', 'Acide azélaïque', 'Céramides', 'Squalane', 'Vitamine C 10%', 'AHA 5%', 'Rétinol 0,3%'].map(k=> <a key={k} href={`/boutique?cat=peau&q=${encodeURIComponent(k.split(' ')[0])}`} className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-[#E8E1DA] font-semibold hover:border-[#C8753D]">{k}</a>)}
              </div>
              <a href="/guides/ingredients" className="mt-3 inline-block text-xs font-bold text-[#C8753D] hover:underline">Fiches INCI →</a>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>KURLA ne revend jamais vos données peau. Journal et profil restent modifiables/exportables dans <a href="/account/skin-id" className="underline">Ma peau</a>.</span>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] flex flex-col sm:flex-row gap-3 items-center justify-between">
          <p className="text-xs text-[#111111]/70"><strong className="text-[#111111]">Fatou 28 ans, HPI</strong> a commencé par HPI → SPF invisible : 68€ routine Complète, 2 alternatives sans parfum par étape.</p>
          <a href="/peau/guide#hpi" className="px-5 py-2.5 rounded-full bg-[#C8753D] text-white text-xs font-bold">Commencer par HPI →</a>
        </div>
      </div>
    </div>
  );
};
