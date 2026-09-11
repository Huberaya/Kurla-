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
    title: 'Prix indicatifs de précommande : 49,70€, 62€ ou 84,90€ — que choisit-on vraiment ?',
    desc: 'Moins de produits mais les bons, à votre enveloppe. Ces montants restent indicatifs tant que les fiches serveur correspondantes ne sont pas publiées.',
    hero: 'Prix indicatifs de précommande : 49,70€ = nettoyant → hydratant céramides → SPF invisible (Essentielle · −5% · 3 soins). 62€ ajoute tonique niacinamide + gel HA + sérum HPI (Équilibrée · −13% · Recommandée · 5 soins). 84,90€ ajoute double nettoyage + contour yeux + exfoliant AHA/BHA + masques (Experte · −15% · liv. gratuite · 7 soins).',
    points: [
      'Essentielle (49,70€) : 3 soins, le meilleur rapport si budget serré ou débutante — barrière + SPF invisible en 2 min.',
      'Équilibrée (62€) : 5 soins, la plus équilibrée pour HPI/barrière sans routine de 9 étapes — niacinamide + HA + céramides.',
      'Experte (84,90€) : 7 soins, pour passionnées qui aiment le layering + hebdo 1×/sem — pas “mieux”, juste plus complet, grain & taches.',
      'Chaque étape propose une alternative sans parfum et un prix serveur quand la référence est publiée ; sinon le montant reste indicatif. Exemple Fatou 28 ans mixte V HPI sans parfum : Équilibrée sans parfum est son entrée idéale.',
    ],
    routine: 'Dites à KURLA “routine à 62€” → sélection dans l’enveloppe. Fatou 28 ans mixte V HPI a choisi Équilibrée sans parfum (62€).',
    cta: '/peau/routine?tier=equilibree&budget=40_70',
  },
];

export const SkinGuidePage: React.FC = () => {
  const [open, setOpen] = useState<string | null>('hpi');
  const [q, setQ] = useState('');

  const filtered = GUIDES.filter(g => !q.trim() || `${g.title} ${g.desc} ${g.tag}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen pt-28 pb-24 bg-kurla-ivory text-kurla-carbon">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <a href="/peau" className="inline-flex items-center gap-1.5 text-xs text-kurla-copper font-semibold mb-4 hover:underline"><ArrowLeft className="w-4 h-4" /> Retour pôle peau</a>

        <div className="text-center max-w-3xl mx-auto mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-kurla-carbon text-[#D9A8A4] text-[10px] font-bold tracking-widest uppercase"><BookOpen className="w-3.5 h-3.5" /> KURLA SKIN · guide peau</span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold mt-3">Le guide peau — 7 essentiels</h1>
          <p className="text-sm text-kurla-carbon/70 font-light mt-3 leading-relaxed">HPI, SPF sans trace blanche, niacinamide, barrière : 7 fiches de 3–6 min, vocabulaire <strong className="font-semibold text-kurla-carbon">uniformiser ≠ éclaircir</strong>, routines chiffrées, gardes actifs. Aucun diagnostic médical.</p>
          <div className="mt-5 flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-kurla-carbon/40" />
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher hpi, spf, niacinamide, barrière..." className="w-full pl-9 pr-3 py-3 rounded-full bg-white border border-kurla-stone text-xs focus:outline-none focus:border-kurla-copper" />
            </div>
            <a href="/peau/diagnostic" className="px-5 py-3 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white text-xs font-bold shrink-0">Diagnostic →</a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {filtered.map(g => {
              const isOpen = open===g.id;
              return (
                <article key={g.id} className={`rounded-3xl border p-6 text-left transition-all ${isOpen? 'bg-kurla-ivory border-kurla-copper shadow-sm' : 'bg-kurla-sand border-kurla-stone hover:border-kurla-copper/40'}`}>
                  <button onClick={()=>setOpen(isOpen?null:g.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-white border border-kurla-stone font-bold text-kurla-copper">{g.tag} · {g.read}</span>
                        <h2 className="text-sm sm:text-base font-bold leading-tight mt-2">{g.title}</h2>
                        <p className="text-xs text-kurla-carbon/60 font-light mt-1 leading-relaxed">{g.desc}</p>
                      </div>
                      <span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${isOpen?'bg-kurla-carbon border-kurla-carbon text-white':'bg-white border-kurla-stone text-kurla-carbon/40'}`}>{isOpen?'−':'+'}</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-4 space-y-4 animate-in fade-in">
                      <div className="p-4 rounded-2xl bg-kurla-sand border border-kurla-stone text-xs leading-relaxed">
                        <p className="font-bold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-kurla-copper" /> En bref</p>
                        <p className="mt-1 text-kurla-carbon/75">{g.hero}</p>
                      </div>
                      <ul className="space-y-2 text-xs leading-relaxed">
                        {g.points.map((pt,i)=> <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-kurla-copper shrink-0 mt-0.5" /><span>{pt}</span></li>)}
                      </ul>
                      <div className="p-3 rounded-xl bg-kurla-carbon text-white text-xs flex gap-2">
                        <Clock className="w-4 h-4 text-kurla-amber shrink-0" />
                        <span><strong>Routine associée :</strong> {g.routine}</span>
                      </div>
                      <div className="flex gap-2">
                        <a href={g.cta} className="px-4 py-2 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white text-xs font-bold">Appliquer →</a>
                        <a href="/peau/routine" className="px-4 py-2 rounded-full bg-white border border-kurla-stone text-xs font-bold hover:border-kurla-copper">Voir ma routine</a>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
            {filtered.length===0 && <div className="p-10 rounded-3xl bg-white border border-kurla-stone text-center text-xs text-kurla-carbon/60">Aucun guide ne correspond à “{q}”. <button onClick={()=>setQ('')} className="text-kurla-copper underline">Effacer</button></div>}
          </div>

          <div className="space-y-4">
            <div className="p-6 rounded-3xl bg-kurla-carbon text-white">
              <h3 className="text-sm font-bold flex items-center gap-1.5"><Shield className="w-4 h-4 text-kurla-amber" /> Gardes mélanine KURLA</h3>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/80">
                <li>• <strong className="text-white">Uniformiser ≠ éclaircir.</strong> Aucune promesse d’éclaircissement de carnation.</li>
                <li>• HPI = tache post-inflammation. SPF quotidien = 1re prévention, même phototype foncé.</li>
                <li>• White-cast : filtres minéraux bruts = voile gris → privilégier hybrides/organiques invisibles.</li>
                <li>• Rétinol + AHA le même soir = alerte irritation. Jamais sans alternance.</li>
              </ul>
              <p className="text-[11px] text-white/50 mt-3 leading-relaxed">Guides cosmétiques, pas médicaux. Si lésion qui saigne, douleur ou HPI qui s’étend, consultez un dermato.</p>
            </div>
            <div className="p-6 rounded-3xl bg-kurla-ivory border border-kurla-stone">
              <h3 className="text-sm font-bold flex items-center gap-1.5"><Layers className="w-4 h-4 text-kurla-copper" /> Besoin d’un pro peau ?</h3>
              <p className="text-xs text-kurla-carbon/65 font-light mt-2 leading-relaxed">6 experts peaux riches en mélanine vérifier leur identité. Prenez un créneau vidéo ou atelier.</p>
              <a href="/pros-verifies?cat=peau" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-kurla-carbon text-white text-xs font-bold">Voir les pros peau →</a>
              <p className="text-[11px] text-kurla-carbon/45 mt-2">Catégorie <code>skincare_expert</code> — Trust Score vérifié, avis issus de prestations.</p>
            </div>
            <div className="p-6 rounded-3xl bg-kurla-sand border border-kurla-stone">
              <h3 className="text-sm font-bold flex items-center gap-1.5"><FlaskConical className="w-4 h-4 text-kurla-copper" /> Par ingrédient</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['Niacinamide 5%', 'Acide azélaïque', 'Céramides', 'Squalane', 'Vitamine C 10%', 'AHA 5%', 'Rétinol 0,3%'].map(k=> <a key={k} href={`/boutique?cat=peau&q=${encodeURIComponent(k.split(' ')[0])}`} className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-kurla-stone font-semibold hover:border-kurla-copper">{k}</a>)}
              </div>
              <a href="/guides/ingredients" className="mt-3 inline-block text-xs font-bold text-kurla-copper hover:underline">Fiches INCI →</a>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>KURLA ne revend jamais vos données peau. Journal et profil restent modifiables/exportables dans <a href="/account/skin-id" className="underline">Ma peau</a>.</span>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 rounded-3xl bg-kurla-sand border border-kurla-stone flex flex-col sm:flex-row gap-3 items-center justify-between">
          <p className="text-xs text-kurla-carbon/70"><strong className="text-kurla-carbon">Fatou 28 ans mixte V HPI sans parfum</strong> a commencé par HPI → SPF invisible : Équilibrée, prix indicatif 62€ (5 soins · −13%), 2 alternatives sans parfum par étape.</p>
          <a href="/peau/guide#hpi" className="px-5 py-2.5 rounded-full bg-kurla-copper text-white text-xs font-bold">Commencer par HPI →</a>
        </div>
      </div>
    </div>
  );
};
