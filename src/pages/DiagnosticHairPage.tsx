import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, ShieldAlert, CheckCircle2, Info } from 'lucide-react';
import { HairDiagnosticAnswers } from '../types';
import { navigate } from '../lib/router';
import { markLatestDiagnostic, mergeStoredAnswers, readStoredPrefill, storeHairAnswers } from '../lib/diagnosticSession';
import { analytics } from '../lib/analytics';
import { DiagnosticVisual } from '../components/diagnostic/DiagnosticVisuals';
import { getHairDiagnosticSegment } from '../lib/diagnosticSegments';

/** Défauts du formulaire cheveux — source des réponses avant tout diagnostic. */
const HAIR_DEFAULTS: HairDiagnosticAnswers = {
  texture: 'crepue',
  style: 'naturel',
  focus: '',
  priority: 'hydratation',
  porosity: 'forte',
  scalp: 'sec',
  frequency: '1x_semaine',
  length: 'moyenne',
  experience: 'habituee',
  budget: '40_70',
  email: '',
  // D9 : les quatre nouvelles réponses ont un défaut « inconnu » — une
  // réponse ancienne (sans ces clés) reste comprise exactement comme avant.
  coilyPattern: 'inconnu',
  elasticity: 'inconnu',
  strandWidth: 'inconnue',
  chemicalHeat: 'inconnue',
  // D10 : idem — défaut « inconnue » = comportement antérieur garanti.
  curlyDry: 'inconnue',
  curlyHold: 'inconnue',
  transitionStep: 'inconnue',
  // D11 : idem — trois réponses locks, défaut « inconnu » = routine d'avant.
  locStage: 'inconnu',
  locCare: 'inconnu',
  locDry: 'inconnu',
  // D12 : idem — deux réponses perruque, défaut « inconnu » = cycle d'avant.
  wigBond: 'inconnu',
  wigWear: 'inconnu',
  wigWash: 'inconnu',
  wavyPattern: 'inconnu',
  washTime: 'inconnu',
  water: 'inconnue',
  humidity: 'inconnu'
};
import { useAuth } from '../context/AuthContext';

/** Carte-réponse d'une étape du D9 — même style que les options existantes. */
const AnswerCard: React.FC<{
  title: string; desc?: string; selected: boolean; onClick: () => void;
}> = ({ title, desc, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-2xl border text-left transition-all ${
      selected ? 'bg-kurla-copper/20 border-kurla-copper ring-1 ring-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
    }`}
  >
    <div className="font-bold text-sm mb-1">{title}</div>
    {desc && <div className="text-xs text-kurla-cream/60 leading-relaxed">{desc}</div>}
  </button>
);

/** Étape de question du D9 : kicker + titre + contexte + grille d'options. */
const QuestionStep: React.FC<{
  step: number; kicker: string; title: string; note?: string;
  cols?: string; options: { id: string; title: string; desc?: string }[];
  value: string; onPick: (id: string) => void;
}> = ({ step, kicker, title, note, cols = 'grid-cols-1 sm:grid-cols-2', options, value, onPick }) => (
  <div className="space-y-6">
    <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. {kicker}</span>
    <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">{title}</h2>
    {note && <p className="text-sm text-kurla-cream/65 font-light leading-relaxed">{note}</p>}
    <div className={`grid ${cols} gap-3 pt-2`}>
      {options.map(opt => (
        <AnswerCard key={opt.id} title={opt.title} desc={opt.desc} selected={value === opt.id} onClick={() => onPick(opt.id)} />
      ))}
    </div>
  </div>
);

export const DiagnosticHairPage: React.FC = () => {
  const { session } = useAuth();
  const [step, setStep] = useState(1);
  React.useEffect(() => { try { analytics.diagnosticStart('hair'); } catch { /* noop */ } }, []);
  const [loading, setLoading] = useState(false);

  // Pré-remplissage : les réponses du dernier diagnostic cheveux (miroir du parcours peau).
  const [answers, setAnswers] = useState<HairDiagnosticAnswers>(() => mergeStoredAnswers(HAIR_DEFAULTS, readStoredPrefill('hair')));

  // Question adaptative (chantier diagnostic) : après la texture (Q1) et le
  // coiffage (Q2), un segment de profil peut exister — s'il existe, une
  // question dédiée à CE profil (ses besoins et problèmes) s'insère en Q3,
  // EN PLUS des questions existantes (qui restent intactes).
  const segment = getHairDiagnosticSegment(answers.texture, answers.style);
  // D9 (20/09) — le parcours crépu gagne les questions qui manquaient au
  // diagnostic : sous-motif (4a/4b/4c seulement quand la texture est crépue),
  // élasticité, largeur du cheveu, passé chaleur/chimie (jamais à un enfant).
  const lockedNow = answers.texture === 'locksee' || answers.style === 'locks';
  const isCrepueNow = answers.texture === 'crepue' && !lockedNow;
  const isKidNow = answers.style === 'enfant' || answers.priority === 'demelage_enfant';
  // D10 : les bouclés 3B–3C portés au naturel répondent à leur tour de leur
  // réalité (séchage, fixant) ; la transition remplace la question chaleur/
  // chimie — déjà répondue par la texture — par celle de l'avancement du fade.
  const isTransitionNow = answers.texture === 'defrisee' || answers.style === 'defrise';
  // D12 : sous priorité « démêlage enfant », c'est le cycle enfant qui sert — la
  // routine perruque n'existe plus : pas de question sans endroit où atterrir.
  const isWigNow = answers.style === 'wig' && !lockedNow && answers.priority !== 'demelage_enfant';
  // D14 : le sous-motif ondulé se pose au même étage que le motif crépu (miroir).
  const isWavyNow = answers.texture === 'ondulee' && answers.style === 'naturel' && !lockedNow;
  const isCurlyNow = !lockedNow && !isKidNow && answers.style === 'naturel' && (answers.texture === 'frisee' || answers.texture === 'bouclee' || answers.texture === 'ondulee');
  const stepIds: string[] = ['texture', 'style', ...(segment ? ['focus'] : []), ...(isCrepueNow ? ['pattern'] : []), ...(isWavyNow ? ['wavyPattern'] : []), 'length', 'elasticity', 'strandWidth', ...(lockedNow ? ['locStage', 'locCare', 'locDry'] : []), ...(isCurlyNow ? ['curlyDry', 'curlyHold'] : []), ...(isWigNow ? ['wigBond', 'wigWear', 'wigWash'] : []), ...(isKidNow ? [] : [isTransitionNow ? 'transitionStep' : 'chemicalHeat']), 'priority', 'porosity', 'scalp', 'frequency', 'washTime', 'water', 'humidity', 'experience', 'budget', 'email'];
  const current = stepIds[Math.min(step, stepIds.length) - 1] || 'texture';
  const totalSteps = stepIds.length;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      submitDiagnostic();
    }
  };

  // Choisir texture ou coiffage : si le segment change, l'ancienne réponse
  // adaptative est réinitialisée (elle ne concernait plus le nouveau profil).
  const pickWithSegmentReset = (patch: Partial<HairDiagnosticAnswers>) => {
    const next = { ...answers, ...patch };
    const nextSegment = getHairDiagnosticSegment(next.texture, next.style);
    setAnswers(nextSegment?.id !== segment?.id ? { ...next, focus: '' } : next);
    handleNext();
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const submitDiagnostic = async () => {
    // Funnel : diagnostic complété (KPI diagRate du plan de lancement).
    try { analytics.diagnosticComplete('hair'); } catch { /* noop */ }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/routine-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          diagnosticType: 'hair',
          answers
        })
      });
      const data = await res.json();
      // On conserve le contexte du diagnostic (texture/priorité) pour que la
      // page résultat puisse recommander LE kit le plus pertinent en tête.
      try {
        sessionStorage.setItem('kurla_diagnostic_answers', JSON.stringify(answers));
      } catch { /* sessionStorage indisponible */ }
      sessionStorage.setItem('kurla_diagnostic_result', JSON.stringify(data));
      storeHairAnswers(answers);
      markLatestDiagnostic('hair');
      navigate('/diagnostic/resultat/hair-latest');
    } catch (e) {
      console.error(e);
      navigate('/diagnostic/resultat/hair-latest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 bg-gradient-to-b from-kurla-ink via-kurla-espresso to-kurla-ink text-kurla-cream">
      <div className="max-w-3xl mx-auto px-4">

        {/* En-tête */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-kurla-copper/15 border border-kurla-copper/30 text-kurla-amber text-xs font-semibold tracking-wider uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Diagnostic gratuit · 3–4 minutes · sans abonnement
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif-title font-bold mb-2">Trouvez votre routine cheveux</h1>
          <p className="text-sm text-kurla-cream/70 font-light max-w-md mx-auto">Répondez à {totalSteps} questions simples : vous obtenez une routine sur-mesure, des gestes adaptés et les produits correspondants.</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-10 space-y-2">
          <div className="flex justify-between text-xs text-kurla-amber font-semibold uppercase tracking-wider">
            <span>Question {step} / {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% complété</span>
          </div>
          <div className="w-full h-2 rounded-full bg-kurla-espresso border border-kurla-cream/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-kurla-copper to-kurla-amber transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Diagnostic Form Container */}
        <div className="p-8 sm:p-12 rounded-3xl bg-kurla-espresso border border-kurla-cream/15 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-kurla-copper/10 rounded-full blur-3xl pointer-events-none" />

          {current === 'texture' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Texture Principale</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quelle est la texture dominante de vos cheveux ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'crepue', title: 'Crépue (4A–4C)', desc: 'Très serrée, rétrécissement important à sec.' },
                  { id: 'frisee', title: 'Frisée / Bouclée (3B-3C)', desc: 'Boucles en S bien définies ou ressorts.' },
                { id: 'ondulee', title: 'Ondulée (2A–2C)', desc: 'Vagues en S souples, racines qui s’écrasent vite.' },
                  { id: 'locksee', title: 'Locks / Microlocks', desc: 'Cheveux ancrés en locks ou twist locks.' },
                  { id: 'protective', title: 'Coiffure protectrice', desc: 'En braids, twists ou tissage.' },
                  { id: 'defrisee', title: 'Défrisée / En transition', desc: 'Textures mixtes ou sensibilisées.' },
                  { id: 'inconnue', title: 'Je ne sais pas exactement', desc: 'Laissez KURLA analyser vos réponses.' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => pickWithSegmentReset({ texture: opt.id as any })}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      answers.texture === opt.id
                        ? 'bg-kurla-copper/20 border-kurla-copper ring-1 ring-kurla-copper'
                        : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    <div className="w-24 shrink-0"><DiagnosticVisual step={1} optionId={opt.id} /></div>
                    <div className="min-w-0">
                      <div className="font-serif-title font-bold text-base text-kurla-cream mb-1">{opt.title}</div>
                      <div className="text-xs text-kurla-cream/60 font-light">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'style' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Coiffage Actuel</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Comment portez-vous vos cheveux en ce moment ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'naturel', title: 'Au naturel (afro, puff, wash & go)' },
                  { id: 'braids', title: 'Tresses / Knotless Braids' },
                  { id: 'twists', title: 'Vanilles / Passion Twists' },
                  { id: 'locks', title: 'Locks / Microlocks' },
                  { id: 'wig', title: 'Perruque / Tissage / Pose' },
                  { id: 'enfant', title: 'Coiffure enfant (Douceur)' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => pickWithSegmentReset({ style: opt.id as any })}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.style === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'focus' && segment && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. {segment.label} — votre préoccupation</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">{segment.question}</h2>
              <p className="text-sm text-kurla-cream/65 font-light leading-relaxed">
                En plus des questions à venir, KURLA concentre votre routine sur ce point précis de votre profil —
                les besoins et les problèmes qui comptent pour {segment.label.toLowerCase()}.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {segment.options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, focus: opt.id }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      answers.focus === opt.id ? 'bg-kurla-copper/20 border-kurla-copper ring-1 ring-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">{opt.title}</div>
                    <div className="text-xs text-kurla-cream/60 leading-relaxed">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'length' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Longueur actuelle</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Vos cheveux font quelle longueur aujourd’hui&nbsp;?</h2>
              <p className="text-sm text-kurla-cream/60">Ce n’est pas une question de beauté — la longueur change le dosage, le temps de pose et ce qui casse en premier.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {[
                  { id: 'courte', title: 'Courte', desc: 'Au-dessus des épaules, tiges récentes.' },
                  { id: 'moyenne', title: 'Moyenne', desc: 'Épaules atteintes.' },
                  { id: 'longue', title: 'Longue', desc: 'Au-delà des épaules — les pointes sont anciennes.' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, length: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.length === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    {opt.title}
                    <span className="mt-1 block text-xs font-normal text-kurla-cream/55">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'pattern' && (
            <QuestionStep
              step={step}
              kicker="Motif crépu"
              title="Dans la famille crépue, quel motif dessinent vos cheveux&nbsp;?"
              note="Ce n’est pas une question de beauté : le motif change le shrinkage, la méthode de définition et le poids des produits dont votre fibre a besoin."
              cols="grid-cols-1"
              options={[
                { id: '4a', title: '4A — ressorts en S serrés', desc: 'La boucle est visible, même à sec : c’est la plus définie des crépues.' },
                { id: '4b', title: '4B — angles en Z', desc: 'Peu de boucles rondes, des zigzags : le rétrécissement à sec est déjà fort.' },
                { id: '4c', title: '4C — très serré, motif à peine visible', desc: 'Shrinkage extrême — la longueur réelle se mesure aux pointes, pas au miroir.' },
                { id: 'inconnu', title: 'Je ne sais pas / un peu des deux', desc: 'KURLA répond sur le crépue moyen, sans deviner à votre place.' },
              ]}
              value={answers.coilyPattern ?? 'inconnu'}
              onPick={id => { setAnswers({ ...answers, coilyPattern: id as any }); handleNext(); }}
            />
          )}

          {current === 'wavyPattern' && (
            <QuestionStep
              step={step}
              kicker="Motif ondulé"
              title="À quelle hauteur vos ondes se dessinent-elles le mieux&nbsp;?"
              note="La question que les communautés de l’ondulé se posent le plus (« how do I know if I’m 2A, 2B or 2C »). Le test est simple : cheveux lavés, séchés à l’air, sans brossage ni produit — on regarde où le S apparaît. Le point de départ de la vague change le poids du produit et le maintien, rien d’autre."
              cols="grid-cols-1"
              options={[
                { id: '2a', title: '2A — souples, plutôt vers les pointes', desc: 'Racines droites, vagues légères qui s’écrasent dans la journée : l’ennemi n°1 est le poids.' },
                { id: '2b', title: '2B — S nets à mi-longueurs', desc: 'La vague est franche dès qu’elle a de la place ; le frizz la guette au moindre écart.' },
                { id: '2c', title: '2C — profondes, presque des boucles', desc: 'Serrées près des racines, quelques anneaux : elles se traitent avec les techniques du 3.' },
                { id: 'inconnu', title: 'Je ne sais pas / ça dépend des jours', desc: 'KURLA répond sur l’ondulé moyen — la règle des ondes, sans deviner à votre place.' },
              ]}
              value={answers.wavyPattern ?? 'inconnu'}
              onPick={id => { setAnswers({ ...answers, wavyPattern: id as any }); handleNext(); }}
            />
          )}

          {current === 'elasticity' && (
            <QuestionStep
              step={step}
              kicker="Élasticité de la fibre"
              title="Cheveu mouillé, au rinçage : quand vous étirez un cheveu, que se passe-t-il&nbsp;?"
              note="C’est LE test des professionnelles de la crépue — et c’est lui qui décide si votre masque de la semaine est un soin d’hydratation ou un soin de force. Un cheveu propre, isolé, tiré doucement entre deux doigts, sous l’eau."
              cols="grid-cols-1"
              options={[
                { id: 'ressort', title: 'Il s’étire un peu, puis revient', desc: 'Élasticité saine : la fibre est équilibrée. On garde le rythme, sans cure de force systématique.' },
                { id: 'mou', title: 'Il s’étire sans limite, mou, et ne revient pas', desc: 'La fibre se gorge mais tient mal : elle manque de matière, pas d’eau. Le soin de force devient prioritaire.' },
                { id: 'cassant', title: 'Il résiste à peine puis casse net', desc: 'Le cheveu est sec jusqu’au cœur : avant de le renforcer, il faut le réhydrater.' },
                { id: 'inconnu', title: 'Je n’ai jamais fait ce test', desc: 'Aucun risque : on garde les deux au programme et vous saurez la prochaine fois, au rinçage.' },
              ]}
              value={answers.elasticity ?? 'inconnu'}
              onPick={id => { setAnswers({ ...answers, elasticity: id as any }); handleNext(); }}
            />
          )}

          {current === 'strandWidth' && (
            <QuestionStep
              step={step}
              kicker="Largeur du cheveu"
              title="Un seul de vos cheveux, à contre-jour&nbsp;: il est..."
              note="La largeur, ce n’est pas la densité (la quantité) : un cheveu fin sous un beurre épais s’aplatit et regraisse ; un cheveu épais sous une brume légère reste sec. C’est ce qui règle le POIDS des produits, pas leur nature."
              cols="grid-cols-1 sm:grid-cols-2"
              options={[
                { id: 'fine', title: 'Fin — presque invisible', desc: 'Les textures légères d’abord : huile plutôt que beurre, dosage noisette.' },
                { id: 'moyenne', title: 'Moyen — le fil se voit, solide', desc: 'La routine type s’applique telle quelle.' },
                { id: 'epaisse', title: 'Épais — raide sous les doigts', desc: 'Il accepte — et souvent demande — des textures riches et un temps de pose long.' },
                { id: 'inconnue', title: 'Je ne sais pas', desc: 'On reste sur le cadre standard ; votre ressenti entre deux lavages ajustera.' },
              ]}
              value={answers.strandWidth ?? 'inconnue'}
              onPick={id => { setAnswers({ ...answers, strandWidth: id as any }); handleNext(); }}
            />
          )}

          {current === 'chemicalHeat' && (
            <QuestionStep
              step={step}
              kicker="Passé chaleur & chimie"
              title="Vos longueurs ont-elles connu le lissage, le défrisage ou la chaleur forte&nbsp;?"
              note="Rien n’est jugé ici : ça change le programme. Une fibre vierge se protège ; une fibre passée par la chaleur ou le produit se traite avec un plan — la zone de repousse (la démarcation) est le point faible n°1."
              cols="grid-cols-1"
              options={[
                { id: 'aucun', title: 'Jamais — texture naturelle uniquement', desc: 'La fibre garde toute sa marge : la routine protège, elle ne répare pas.' },
                { id: 'chaleur', title: 'La chaleur seulement (sèche-cheveux, fer, brossage)', desc: 'Pas de produit, des outils chauds : la règle de protection change tout.' },
                { id: 'produit', title: 'Défrisage, texturisation ou lissage chimique', desc: 'Deux textures sur un même cheveu : la démarcation pilote la routine.' },
                { id: 'les_deux', title: 'Les deux — chaleur ET produit', desc: 'Deux agressions cumulées : le plan de récupération passe avant la coquetterie.' },
                { id: 'inconnue', title: 'Préférence pour ne pas dire / je ne sais pas', desc: 'KURLA reste sur le programme général, sans hypothèse.' },
              ]}
              value={answers.chemicalHeat ?? 'inconnue'}
              onPick={id => { setAnswers({ ...answers, chemicalHeat: id as any }); handleNext(); }}
            />
          )}

          {current === 'wigBond' && (
            <QuestionStep
              step={step}
              kicker="Mode de fixation"
              title="Comment votre perruque est-elle tenue sur la peau&nbsp;?"
              note="La fixation décide de la dépose et du sort du contour : on ne prépare pas une lace frontale encollée comme un glueless à élastique. Ce n’est pas un jugement — chaque méthode a son plafond de sécurité, et la routine le pose."
              cols="grid-cols-1"
              options={[
                { id: 'glue', title: 'Colle liquide (lace encollée)', desc: 'La tenue maximale — avec un cadre : solvant à la dépose, test cutané au premier pot.' },
                { id: 'tape', title: 'Adhésif double-face (tape)', desc: 'Tenue plus courte, résidu à dissoudre avant de frotter — la routine le prévoit.' },
                { id: 'glueless', title: 'Sans adhésif — élastique, peignes, grip', desc: 'Le plus sûr pour les tempes : la routine en fixe la vérification, pas la méfiance.' },
                { id: 'inconnu', title: 'Ça change selon les poses', desc: 'La routine garde le cadre prudent du cycle perruque.' },
              ]}
              value={answers.wigBond ?? 'inconnu'}
              onPick={id => { setAnswers({ ...answers, wigBond: id as any }); handleNext(); }}
            />
          )}

          {current === 'wigWear' && (
            <QuestionStep
              step={step}
              kicker="Durée de la portée"
              title="Une fois posée, vous la gardez combien de temps sans la retirer&nbsp;?"
              note="La question la plus posée par les nouvelles porteuses de perruque, et celle que le calendrier de chacun répond mal : les sources convergent — dépose tous les 7 à 14 jours avec adhésif, six semaines est un plafond absolu, jamais un objectif."
              cols="grid-cols-1"
              options={[
                { id: 'quotidienne', title: 'Je la pose et la dépose chaque jour', desc: 'Le modèle : la routine confirme ce rythme et protège le dessous à chaque reprise.' },
                { id: 'une_semaine', title: 'À peu près une semaine, puis dépose', desc: 'Le format standard sain — contrôle et lavage suivent la dépose.' },
                { id: 'deux_quatre', title: 'Deux à quatre semaines d’affilée', desc: 'Tenue longue : la routine pose un contrôle à mi-parcours, sans drame.' },
                { id: 'jamais_retiree', title: 'Plus longtemps, ou presque jamais retirée', desc: 'La routine commence par une remise à zéro — c’est une protection, pas un reproche.' },
                { id: 'inconnu', title: 'Ça dépend des périodes', desc: 'Le cadre standard du cycle s’applique ; votre observation ajustera.' },
              ]}
              value={answers.wigWear ?? 'inconnu'}
              onPick={id => { setAnswers({ ...answers, wigWear: id as any }); handleNext(); }}
            />
          )}

          {current === 'wigWash' && (
            <QuestionStep
              step={step}
              kicker="Le dessous"
              title="Votre cheveu naturel, sous la perruque, vous le lavez quand&nbsp;?"
              note="Ce n’est pas l’entretien de la perruque — c’est celui du dessous, et les forums le traitent à part (« washing under a wig »). Le rythme dépend de la dépose, pas du calendrier de la coiffe."
              cols="grid-cols-1"
              options={[
                { id: 'a_repos', title: 'À chaque dépose (ou presque)', desc: 'Le dessous suit le dessus : le rythme le plus simple à tenir, et le plus sûr pour la raie.' },
                { id: 'deux_semaine', title: 'Tous les quinze jours environ', desc: 'Le rythme courant des poses d’une à deux semaines ; entre deux, l’eau à l’applicateur.' },
                { id: 'rare', title: 'Moins d’une fois par mois', desc: 'C’est ici que la routine reprend la main : sous la coiffe, rien ne se rince tout seul.' },
              ]}
              value={answers.wigWash ?? 'inconnu'}
              onPick={id => { setAnswers({ ...answers, wigWash: id as any }); handleNext(); }}
            />
          )}

          {current === 'locStage' && (
            <QuestionStep
              step={step}
              kicker="Maturité des locks"
              title="Depuis combien de temps vos locks sont-elles lancées&nbsp;?"
              note="Ce n'est pas une question d'esthétique : avant six mois, la lock construit sa matrice — le raccourcissement fait partie du processus et lutter contre lui ralentit la maturation. Après un an, le programme change de priorités."
              cols="grid-cols-1"
              options={[
                { id: 'neuve', title: 'Moins de 6 mois — je débute la matrice', desc: 'Patience d’abord : la routine protège le stade, sans lutter contre le raccourcissement.' },
                { id: 'ado', title: '6 à 12 mois — entre les deux', desc: 'La lock se consolide : l’entretien se tient, la maturation prime encore.' },
                { id: 'mature', title: 'Plus d’un an — bien ancrées', desc: 'Elles supportent un rythme plus libre : entretien espacé, lavages fréquents.' },
                { id: 'inconnu', title: 'Je ne sais pas situer / dates mélangées', desc: 'Aucune supposition : le programme garde le cap prudent.' },
              ]}
              value={answers.locStage ?? 'inconnu'}
              onPick={id => { setAnswers({ ...answers, locStage: id as any }); handleNext(); }}
            />
          )}

          {current === 'locCare' && (
            <QuestionStep
              step={step}
              kicker="Entretien de la racine"
              title="À la racine, vos locks sont entretenues comment&nbsp;?"
              note="La méthode décide du geste recommandé. On ne parle pas retwist à une personne en libre pousse — et on ne laisse pas un interlocking se serrer sans plafond."
              cols="grid-cols-1"
              options={[
                { id: 'palm', title: 'Palm rolling / retwist (chez moi ou au salon)', desc: 'La voie classique : la routine en pose le plafond — jamais quotidien.' },
                { id: 'interlock', title: 'Interlocking (outil, croisement à la racine)', desc: 'Très tenue, exigeante : la routine en fixe le rythme et la limite.' },
                { id: 'freeform', title: 'Libre pousse — pas de produit, pas de retwist', desc: 'C’est une méthode, pas un abandon : la routine donne la séparation, rien d’autre.' },
                { id: 'inconnu', title: 'Ma méthode change / je ne sais pas', desc: 'La méthode standard s’applique, votre observation ajustera.' },
              ]}
              value={answers.locCare ?? 'inconnu'}
              onPick={id => { setAnswers({ ...answers, locCare: id as any }); handleNext(); }}
            />
          )}

          {current === 'locDry' && (
            <QuestionStep
              step={step}
              kicker="Séchage après lavage"
              title="Après le rinçage, vos locks sèchent…&nbsp;"
              note="La question la plus posée dans les communautés locks, et la moins prise au sérieux : l’eau piégée au cœur d’une lock couchée humide est le point de départ de l’odeur et de l’irritation — pas le lavage lui-même."
              cols="grid-cols-1"
              options={[
                { id: 'sec', title: 'À l’air, toujours complètement avant la nuit', desc: 'Le bon réflexe, celui qui ferme le chapitre — la routine le confirme.' },
                { id: 'seche', title: 'Sèche-cheveux, tiède, racine par racine', desc: 'Bon outil, bien employé — la routine ajoute la vérification au toucher.' },
                { id: 'humide', title: 'Il m’arrive de me coucher encore humide', desc: 'C’est le point à corriger en priorité — la routine impose le séchage complet.' },
                { id: 'lentes', title: 'Elles mettent très longtemps, odeur de renfermé', desc: 'La routine traite la cause : rinçage, produits, puis clarifiant si besoin.' },
                { id: 'inconnu', title: 'Ça dépend des semaines', desc: 'Aucune règle ajoutée sans certitude ; la prochaine observation tranchera.' },
              ]}
              value={answers.locDry ?? 'inconnu'}
              onPick={id => { setAnswers({ ...answers, locDry: id as any }); handleNext(); }}
            />
          )}

          {current === 'curlyDry' && (
            <QuestionStep
              step={step}
              kicker="Séchage du jour de lavage"
              title="Après le rinçage, comment finissez-vous de sécher vos boucles&nbsp;?"
              note="Ce n’est pas une préférence cosmétique : la boucle « prend sa forme » pendant le séchage. C’est là que le frizz se fabrique — ou s’évite."
              cols="grid-cols-1"
              options={[
                { id: 'air', title: 'À l’air libre, sans y toucher', desc: 'La méthode native — la routine ajoutera la seule règle qui manque souvent.' },
                { id: 'diffuse_froid', title: 'Diffuseur, air tiède ou froid', desc: 'Le bon réflexe, celui des professionnelles — la routine le confirme.' },
                { id: 'diffuse_chaud', title: 'Diffuseur, chaleur moyenne ou forte', desc: 'Rapide, mais la chaleur qui finit une boucle la fige froissée.' },
                { id: 'serviette', title: 'Je frotte à la serviette éponge', desc: 'Le frottement soulève la cuticule : c’est souvent de là que vient le frizz.' },
                { id: 'inconnue', title: 'Les deux, ça dépend des semaines', desc: 'KURLA garde la méthode standard et ajuste à l’observation.' },
              ]}
              value={answers.curlyDry ?? 'inconnue'}
              onPick={id => { setAnswers({ ...answers, curlyDry: id as any }); handleNext(); }}
            />
          )}

          {current === 'curlyHold' && (
            <QuestionStep
              step={step}
              kicker="Produit de finition"
              title="Pour que la forme tienne jusqu’au lendemain, vous utilisez…&nbsp;"
              note="Un fixant n’est pas une obligation — c’est le moment où la forme « prend ». La routine s’adapte à ce que vous mettez déjà, pas au catalogue d’à côté."
              cols="grid-cols-1"
              options={[
                { id: 'gel', title: 'Un gel (il laisse un film « carton » en séchant)', desc: 'Le carton est un moule, pas un défaut — il se casse, voilà tout.' },
                { id: 'mousse', title: 'Une mousse', desc: 'Maintien léger : elle se pose sur cheveu très mouillé.' },
                { id: 'creme', title: 'Une crème coiffante légère', desc: 'Souple, mais le maintien est court sur certaines boucles.' },
                { id: 'rien', title: 'Rien — juste leave-in ou crème de soin', desc: 'La routine ne force rien ; elle expliquera où se joue la forme.' },
                { id: 'inconnue', title: 'Je change souvent / je ne sais pas', desc: 'La méthode standard s’applique, et votre observation ajustera.' },
              ]}
              value={answers.curlyHold ?? 'inconnue'}
              onPick={id => { setAnswers({ ...answers, curlyHold: id as any }); handleNext(); }}
            />
          )}

          {current === 'transitionStep' && (
            <QuestionStep
              step={step}
              kicker="Avancement de la transition"
              title="Sur votre tête aujourd’hui, les longueurs traitées (défrisées) représentent encore…&nbsp;"
              note="Ce n’est pas une question de courage ni de mode : la part de fibre traitée qui reste décide du programme — stabiliser la ligne, protéger le fade en cours, ou passer à l’entretien d’une texture redevenue naturelle."
              cols="grid-cols-1"
              options={[
                { id: 'majorite', title: 'Plus de la moitié des longueurs', desc: 'Le cap utile n’est pas la coupe : c’est la stabilisation de la démarcation, d’abord.' },
                { id: 'minorite', title: 'Moins de la moitié — le fade avance', desc: 'La ligne recule : la routine protège jusqu’à la sortie complète.' },
                { id: 'quasi_nulle', title: 'Presque rien — c’est presque fini', desc: 'La routine quitte le mode réparation : votre texture nouvelle se protège, unie.' },
                { id: 'inconnue', title: 'Je ne sais pas évaluer', desc: 'Aucun jugement : la routine garde le cap prudent, la ligne reste le point de contrôle.' },
              ]}
              value={answers.transitionStep ?? 'inconnue'}
              onPick={id => { setAnswers({ ...answers, transitionStep: id as any }); handleNext(); }}
            />
          )}

          {current === 'priority' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Priorité Beauté</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quelle est votre priorité ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {(() => {
                  // D6-bis (test utilisateur) : on ne propose plus une option
                  // que le moteur ne peut pas servir sur le segment déclaré.
                  const lockedNow = answers.texture === 'locksee' || answers.style === 'locks';
                  const kidNow = answers.style === 'enfant';
                  return [
                    { id: 'hydratation', title: 'Stopper la sécheresse intense' },
                    { id: 'casse', title: lockedNow ? 'Éviter la casse aux racines et aux pointes' : 'Éviter la casse au démêlage' },
                    ...(lockedNow ? [] : [{ id: 'definition', title: 'Définir les boucles sans cartonner' }]),
                    { id: 'pousse', title: 'Favoriser la santé des longueurs & racines' },
                    { id: 'cuir_chevelu', title: 'Apaiser les démangeaisons cuir chevelu' },
                    ...(kidNow ? [{ id: 'demelage_enfant', title: 'Faciliter le démêlage enfant sans larmes' }] : []),
                  ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, priority: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.priority === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))
                })()}
              </div>
            </div>
          )}

          {current === 'porosity' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Niveau de Porosité</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Comment vos cheveux réagissent-ils à l’eau ?</h2>

              {/* Aide : test du verre d'eau */}
              <div className="rounded-2xl bg-kurla-ink border border-kurla-amber/30 p-4 flex gap-3">
                <Info className="w-5 h-5 text-kurla-amber shrink-0 mt-0.5" />
                <div className="text-xs text-kurla-cream/75 leading-relaxed">
                  <strong className="text-kurla-cream block mb-1">Le test du verre d’eau (30 secondes)</strong>
                  Déposez un cheveu propre et sec dans un verre d’eau claire.
                  <span className="block mt-1">• Il <strong>coule au fond</strong> → porosité <strong>forte</strong> (écailles ouvertes, boit l’eau puis la perd vite).</span>
                  <span className="block">• Il <strong>flotte en surface</strong> → porosité <strong>faible</strong> (écailles serrées, l’eau peine à entrer).</span>
                  <span className="block">• Il <strong>reste au milieu</strong> → porosité <strong>moyenne</strong>, l’idéal équilibré.</span>
                  <span className="block mt-1 text-kurla-cream/50">Pas le temps ? Choisissez « Je ne sais pas », KURLA s’adapte.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                {[
                  { id: 'forte', title: 'Porosité forte : absorbe l’eau en 1 sec mais sèche ultra vite.', desc: 'Besoin de beurres et huiles riches pour sceller l’humidité.' },
                  { id: 'faible', title: 'Porosité faible : l’eau glisse dessus, très longs à mouiller.', desc: 'Besoin de soins légers et de chaleur douce.' },
                  { id: 'moyenne', title: 'Porosité moyenne : équilibrée.', desc: 'L’eau pénètre normalement.' },
                  { id: 'inconnue', title: 'Je ne sais pas.', desc: 'KURLA détermine les produits adaptés à vos réponses.' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, porosity: opt.id as any }); handleNext(); }}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                      answers.porosity === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    <div className="w-28 shrink-0"><DiagnosticVisual step={4} optionId={opt.id} /></div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm mb-1">{opt.title}</div>
                      <div className="text-xs text-kurla-cream/60">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'scalp' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Cuir Chevelu</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quel est l’état de votre cuir chevelu ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'normal', title: 'Normal & confortable' },
                  { id: 'sec', title: 'Sec & tiraillements' },
                  { id: 'demangeaisons', title: 'Démangeaisons sous tresses' },
                  { id: 'pellicules', title: 'Pellicules de sécheresse' },
                  { id: 'irritation', title: 'Sensible / Irrité' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, scalp: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.scalp === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'frequency' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Fréquence Routine</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">À quelle fréquence lavez-vous vos cheveux ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'less_1x', title: 'Moins d’une fois par semaine' },
                  { id: '1x_semaine', title: '1 fois par semaine (Wash Day fixe)' },
                  { id: '2x_semaine', title: '2 fois par semaine (sport, transpiration)' },
                  { id: 'irreguliere', title: 'Variable / Selon le temps' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, frequency: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.frequency === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'experience' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Votre expérience</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Où en êtes-vous avec vos cheveux&nbsp;?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {[
                  { id: 'debutante', title: 'Je débute', desc: 'Pas encore de routine fixe, ou tout récente.' },
                  { id: 'habituee', title: 'J’ai des habitudes', desc: 'Quelques gestes qui tiennent déjà.' },
                  { id: 'expert', title: 'Routine avancée', desc: 'Je connais ma fibre et ses réactions.' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, experience: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.experience === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    {opt.title}
                    <span className="mt-1 block text-xs font-normal text-kurla-cream/55">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'budget' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Budget Routine</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quel budget souhaitez-vous pour votre routine ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'moins_40', title: 'Moins de 40 € (Essential Kit)' },
                  { id: '40_70', title: '40 € à 70 € (Routine Recommandée)' },
                  { id: '70_100', title: '70 € à 100 € (Kit Complet + Accessoires)' },
                  { id: 'premium', title: 'Premium (Prestations Pros incluses)' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, budget: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.budget === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'washTime' && (
            <QuestionStep
              step={step}
              kicker="Jour de lavage"
              title="Votre jour de lavage&nbsp;: vous avez combien de temps devant vous&nbsp;?"
              note="C’est le premier motif d’abandon d’une routine. Selon les témoignages, un wash day va de 20 minutes à plusieurs heures — et le raccourcir est une affaire de méthode et de fréquence, pas de vitesse. Une routine que vous n’avez pas le temps de faire n’est pas une routine."
              cols="grid-cols-1"
              options={[
                { id: 'court', title: 'Moins de 20 minutes', desc: 'Le format court : la routine se réorganise — deux sections, aucune étape supprimée.' },
                { id: 'moyen', title: '20 à 45 minutes', desc: 'Le format de la plupart des routines tenables semaine après semaine.' },
                { id: 'long', title: 'Une heure ou plus', desc: 'Le temps est de votre côté : il ira au pré-démêlage et au temps de pose.' },
                { id: 'inconnu', title: 'Ça dépend des semaines', desc: 'KURLA construit la routine standard, sans variante courte.' },
              ]}
              value={answers.washTime ?? 'inconnu'}
              onPick={id => { setAnswers({ ...answers, washTime: id as any }); handleNext(); }}
            />
          )}

          {current === 'water' && (
            <QuestionStep
              step={step}
              kicker="Votre eau"
              title="L’eau qui coule chez vous laisse-t-elle des traces&nbsp;?"
              note="L’eau calcaire est l’une des questions les plus posées en communauté, et pour cause : le dépôt minéral ne part pas au shampoing doux. La réponse ne change pas toute la routine — elle change un geste par mois."
              cols="grid-cols-1"
              options={[
                { id: 'calcaire', title: 'Calcaire — traces sur la robinetterie, cheveux qui accrochent', desc: 'Un chélateur une fois par mois, jamais toutes les semaines.' },
                { id: 'douce', title: 'Plutôt douce — pas de dépôt visible', desc: 'Rien à corriger de ce côté : si le cheveu pèse, c’est un produit.' },
                { id: 'inconnue', title: 'Je ne sais pas', desc: 'Aucune clause : la routine reste le cadre standard.' },
              ]}
              value={answers.water ?? 'inconnue'}
              onPick={id => { setAnswers({ ...answers, water: id as any }); handleNext(); }}
            />
          )}

          {current === 'humidity' && (
            <QuestionStep
              step={step}
              kicker="Votre climat"
              title="Quand l’air change, que font vos cheveux&nbsp;?"
              note="La glycérine — présente dans la plupart des leave-in et des gels — attire l’eau de l’air. Précieuse par temps tempéré, elle fait gonfler le cheveu par forte humidité et l’assèche en air très sec. Votre observation vaut mieux qu’un chiffre de météo."
              cols="grid-cols-1"
              options={[
                { id: 'gonfle', title: 'Ils gonflent et frisent par temps humide', desc: 'Humectants filmogènes et fixant ferme en saison humide.' },
                { id: 'sallonge', title: 'La forme s’allonge, retombe', desc: 'Surcharge d’eau : on retire une couche, on n’en ajoute pas une.' },
                { id: 'sec', title: 'Ils s’assèchent vite en hiver ou en air sec', desc: 'Leave-in plus riche et émollients en saison sèche.' },
                { id: 'ne_bouge_pas', title: 'Je ne vois pas de différence', desc: 'Aucun ajustement saisonnier à prévoir.' },
                { id: 'inconnu', title: 'Je n’ai pas fait attention', desc: 'La routine reste la même toute l’année.' },
              ]}
              value={answers.humidity ?? 'inconnu'}
              onPick={id => { setAnswers({ ...answers, humidity: id as any }); handleNext(); }}
            />
          )}

          {current === 'email' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Finalisation</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Voulez-vous recevoir votre routine par e-mail ?</h2>
              <p className="text-sm text-kurla-cream/70 font-light">
                Votre routine s’affiche immédiatement à l’écran. L’e-mail est facultatif : il sert uniquement à vous la renvoyer et à la sauvegarder.
              </p>
              <input
                type="email"
                value={answers.email}
                onChange={(e) => setAnswers({ ...answers, email: e.target.value })}
                placeholder="Votre adresse e-mail (facultatif)"
                className="w-full p-4 rounded-2xl bg-kurla-ink border border-kurla-cream/20 text-kurla-cream placeholder-kurla-cream/40 text-base focus:outline-none focus:border-kurla-copper"
              />

              <div className="p-4 rounded-xl bg-kurla-ink/80 border border-kurla-cream/10 flex items-start gap-3 text-xs text-kurla-cream/60">
                <ShieldAlert className="w-4 h-4 text-kurla-amber shrink-0 mt-0.5" />
                <span>
                  <strong>Bon à savoir :</strong> Ces conseils beauté sont personnalisés et ne remplacent pas un avis médical. En cas de problème persistant du cuir chevelu, consultez un professionnel de santé.
                </span>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-8 border-t border-kurla-cream/10 mt-8">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className={`px-5 py-2.5 rounded-full border border-kurla-cream/20 text-xs font-semibold flex items-center gap-2 ${
                step === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-kurla-cream/10'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-kurla-copper to-kurla-amber text-white text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? (
                <span>Génération KURLA en cours…</span>
              ) : current === 'email' ? (
                <>Voir ma routine <Sparkles className="w-4 h-4" /></>
              ) : (
                <>Continuer <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
