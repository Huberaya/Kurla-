import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Plus, 
  Droplets, 
  Sun, 
  Moon, 
  RefreshCw, 
  ChevronRight, 
  Sliders, 
  ArrowUpRight,
  Info
} from 'lucide-react';
import { HAIR_KNOWLEDGE } from '../lib/knowledge/hair';
import { SKIN_KNOWLEDGE } from '../lib/knowledge/skin';

export interface RoutineTask {
  id: number;
  title: string;
  completed: boolean;
  category: string;
  day: string;
}

interface AiRoutineAnalysisProps {
  tasks: RoutineTask[];
  notes?: string;
  onAddTask?: (taskTitle: string, category: string, day: string) => void;
}

export const AiRoutineAnalysis: React.FC<AiRoutineAnalysisProps> = ({ 
  tasks, 
  notes = '', 
  onAddTask 
}) => {
  const [selectedContext, setSelectedContext] = useState<'europe-hiver' | 'protective' | 'standard' | 'climat-chaud'>('europe-hiver');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [addedGaps, setAddedGaps] = useState<Record<string, boolean>>({});

  // Trigger re-analysis effect simulation
  const handleReAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 600);
  };

  // Evaluation engine based on KURLA Knowledge Base
  const analysis = useMemo(() => {
    const allTitles = tasks.map(t => t.title.toLowerCase()).join(' ') + ' ' + notes.toLowerCase();

    // Key Pillar Checks
    const hasDeepConditioning = allTitles.includes('masque') || allTitles.includes('soin profond') || allTitles.includes('deep condition');
    const hasSPF = allTitles.includes('spf') || allTitles.includes('solaire') || allTitles.includes('écran');
    const hasHydrationSealing = (allTitles.includes('beurre') || allTitles.includes('huile') || allTitles.includes('leave-in') || allTitles.includes('vaporiser')) && (allTitles.includes('eau') || allTitles.includes('aloe') || allTitles.includes('brume') || allTitles.includes('leave-in'));
    const hasScalpCare = allTitles.includes('cuir chevelu') || allTitles.includes('lotion') || allTitles.includes('massage') || allTitles.includes('apaisant');
    const hasSatinProtection = allTitles.includes('bonnet') || allTitles.includes('satin') || allTitles.includes('taie');
    const hasClarification = allTitles.includes('shampooing') || allTitles.includes('clarifiant') || allTitles.includes('nettoyage') || allTitles.includes('wash day');

    const gaps = [];
    const strengths = [];

    // Evaluate Deep Conditioning
    if (!hasDeepConditioning) {
      gaps.push({
        id: 'gap-deep-conditioning',
        pillar: 'Soin Capillaire Profond',
        icon: Droplets,
        severity: 'high',
        title: 'Absence de Soin Profond / Masque Hydratant',
        explanation: 'Pour les cheveux crépus et bouclés (type 3B à 4C), le shampoing sans masque laisse les cuticules assoiffées. Un bain de nutrition profond hebdomadaire est indispensable.',
        recommendation: 'Ajouter un masque hydratant ou protéiné 1 fois par semaine après le shampoing.',
        quickActionTitle: 'Grand Wash Day : Masque Soin Profond Protéiné',
        category: 'washday',
        day: 'Dimanche 10h',
        productLink: '/produit/masque-hydratant',
        productName: 'Masque Hydratant Profond Cacao & Soie'
      });
    } else {
      strengths.push('Soin profond hebdomadaire inclus (nutrition cuticulaire assurée).');
    }

    // Evaluate SPF Usage
    if (!hasSPF) {
      gaps.push({
        id: 'gap-spf',
        pillar: 'Skincare & Mélanine',
        icon: Sun,
        severity: 'high',
        title: 'Protection Solaire SPF 50 Non Détectée',
        explanation: 'Même en Europe ou par temps nuageux, les rayons UVA/UVB stimulent l’hyperpigmentation post-inflammatoire (marques de boutons) sur les peaux riches en mélanine.',
        recommendation: 'Appliquer quotidiennement un fluide solaire incolore 100% sans trace blanche.',
        quickActionTitle: 'Application Fluide Solaire SPF 50 Incolore Visage',
        category: 'spf',
        day: 'Chaque matin',
        productLink: '/produit/spf-invisible',
        productName: 'Fluide Solaire SPF 50 Invisible Melanin'
      });
    } else {
      strengths.push('Protection solaire SPF 50 quotidienne active contre les taches.');
    }

    // Evaluate Night Protection
    if (!hasSatinProtection) {
      gaps.push({
        id: 'gap-satin',
        pillar: 'Protection Nocturne',
        icon: Moon,
        severity: 'medium',
        title: 'Aucune Protection en Satin pour la Nuit',
        explanation: 'Le coton des taies d’oreiller absorbe jusqu’à 40% de l’eau contenue dans la fibre capillaire et provoque la casse par frottement pendant le sommeil.',
        recommendation: 'Adopter le bonnet satin ou la taie en satin pour préserver l’hydratation nocturne.',
        quickActionTitle: 'Enfiler le Bonnet Satin Premium avant de dormir',
        category: 'soin',
        day: 'Chaque soir',
        productLink: '/produit/bonnet-satin',
        productName: 'Bonnet Satin XL Premium'
      });
    } else {
      strengths.push('Protection nocturne en satin intégrée (anti-déshydratation).');
    }

    // Evaluate Scalp Care
    if (!hasScalpCare) {
      gaps.push({
        id: 'gap-scalp',
        pillar: 'Santé du Cuir Chevelu',
        icon: RefreshCw,
        severity: 'medium',
        title: 'Soin & Massage du Cuir Chevelu Réduits',
        explanation: 'Un cuir chevelu sec ou étouffé freine la pousse et peut provoquer des démangeaisons. Un massage aux huiles légères stimule la microcirculation.',
        recommendation: 'Masser le cuir chevelu 3-5 min avec une huile légère 2 fois par semaine.',
        quickActionTitle: 'Massage Cuir Chevelu à l’Huile Légère de Baobab',
        category: 'soin',
        day: '2x par semaine',
        productLink: '/produit/huile-cuir-chevelu',
        productName: 'Lotion Apaisante Cuir Chevelu Menthe & Baobab'
      });
    } else {
      strengths.push('Soin du cuir chevelu & massage régulier activés.');
    }

    // Context-specific feedback
    if (selectedContext === 'europe-hiver' && !allTitles.includes('beurre') && !allTitles.includes('scellage')) {
      gaps.push({
        id: 'gap-europe-winter',
        pillar: 'Climat & Eau Calcaire',
        icon: AlertTriangle,
        severity: 'high',
        title: 'Ajustement Climat Hiver / Eau Calcaire Européenne',
        explanation: 'L’eau dure (calcaire) et le chauffage d’intérieur assèchent rapidement les boucles. Un scellage plus riche (beurre de karité) est crucial.',
        recommendation: 'Utiliser un beurre riche en scellage après ton leave-in.',
        quickActionTitle: 'Scellage de l’eau au Beurre de Karité Grand Cru',
        category: 'hydratation',
        day: 'Après chaque ré-hydratation',
        productLink: '/boutique/cheveux',
        productName: 'Beurre de Karité Brut de Côte d’Ivoire'
      });
    }

    if (hasHydrationSealing) {
      strengths.push('Méthode d’hydratation + scellage (L.O.C / L.C.O) appliquée.');
    }

    // This is a transparent routine coverage indicator, not a beauty or
    // product-fit score. Every evaluated pillar counts once; no arbitrary
    // severity weighting or minimum score is added.
    const evaluatedPillars = strengths.length + gaps.length;
    const coverageScore = evaluatedPillars > 0
      ? Math.round((strengths.length / evaluatedPillars) * 100)
      : 0;

    return {
      coverageScore,
      gaps,
      strengths,
      totalTasksEvaluated: tasks.length
    };
  }, [tasks, notes, selectedContext]);

  const handleAddGapToTasklist = (gap: any) => {
    if (onAddTask) {
      onAddTask(gap.quickActionTitle, gap.category, gap.day);
      setAddedGaps(prev => ({ ...prev, [gap.id]: true }));
    }
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#FFFDF9] via-[#F8F2EC] to-[#FFF7EF] border border-[#C8753D]/30 shadow-md">
      
      {/* Top Bar / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E8E1DA]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8753D] text-white flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#C8753D] uppercase tracking-wider">
              Analyse KURLA · base de connaissances
            </div>
            <h2 className="text-xl font-serif-title font-bold text-[#111111]">
              Diagnostic & Analyse de Routine
            </h2>
          </div>
        </div>

        {/* Re-analyze CTA & Context Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#FFFDF9] p-1 rounded-xl border border-[#E8E1DA] text-xs">
            <Sliders className="w-3.5 h-3.5 text-[#C8753D] ml-1.5" />
            <select
              value={selectedContext}
              onChange={(e) => setSelectedContext(e.target.value as any)}
              className="bg-transparent text-[#111111] font-medium py-1 px-2 focus:outline-none cursor-pointer"
            >
              <option value="europe-hiver">Europe : Hiver & Eau Calcaire</option>
              <option value="protective">Protective Style Active (Braids/Locks)</option>
              <option value="climat-chaud">Climat Chaud & Humide</option>
              <option value="standard">Standard / Climat Tempéré</option>
            </select>
          </div>

          <button
            onClick={handleReAnalyze}
            disabled={isAnalyzing}
            className="px-3.5 py-2 rounded-xl bg-[#111111] hover:bg-[#3A2218] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyse...' : 'Actualiser L’Analyse'}
          </button>
        </div>
      </div>

      {/* Main Score & Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Transparent routine coverage card */}
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#111111]/70 uppercase">Score d'Équilibre Routine</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-4xl font-serif-title font-extrabold text-[#C8753D]">
                {analysis.coverageScore}%
              </span>
              <span className="text-xs font-semibold text-[#111111]/60">Couverture explicable</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-[#E8E1DA] overflow-hidden mb-3">
              <div 
                className={`h-full transition-all duration-700 ${
                  analysis.coverageScore >= 85 ? 'bg-emerald-500' : analysis.coverageScore >= 70 ? 'bg-[#C8753D]' : 'bg-amber-500'
                }`}
                style={{ width: `${analysis.coverageScore}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-[#111111]/70 leading-relaxed">
            {analysis.coverageScore >= 85
              ? 'Excellente routine globale ! Tes cheveux et ta peau sont bien protégés.'
              : analysis.coverageScore >= 70
              ? 'Routine solide, mais 2 optimisations clés permettraient d’accélérer tes résultats.'
              : 'Routine incomplète. Quelques gestes essentiels manquent pour éviter la casse et la sécheresse.'
            }
          </p>
        </div>

        {/* Summary Stat 1: Gaps Count */}
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#111111]/70 uppercase">Axes d'Amélioration</span>
              <AlertTriangle className="w-4 h-4 text-[#C8753D]" />
            </div>

            <div className="text-3xl font-serif-title font-bold text-[#111111] my-2">
              {analysis.gaps.length} <span className="text-xs font-sans font-normal text-[#111111]/60">lacunes identifiées</span>
            </div>
          </div>

          <p className="text-xs text-[#111111]/70 leading-relaxed">
            Détectées par la base de connaissance selon ton profil (hydratation, masque, SPF & satin).
          </p>
        </div>

        {/* Summary Stat 2: Strengths Count */}
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#111111]/70 uppercase">Points Forts</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="text-3xl font-serif-title font-bold text-[#111111] my-2">
              {analysis.strengths.length} <span className="text-xs font-sans font-normal text-[#111111]/60">piliers validés</span>
            </div>
          </div>

          <p className="text-xs text-[#111111]/70 leading-relaxed">
            Les bonnes habitudes déjà ancrées dans ton suivi hebdomadaire.
          </p>
        </div>

      </div>

      {/* Identified Gaps Section */}
      <div className="mb-8">
        <h3 className="text-sm font-serif-title font-bold text-[#111111] mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#C8753D]" />
          Lacunes & Recommandations Ciblées IA ({analysis.gaps.length})
        </h3>

        {analysis.gaps.length === 0 ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Aucune lacune majeure détectée !</p>
              <p>Ta routine est parfaitement alignée avec les recommandations KURLA pour ta texture et ton climat.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {analysis.gaps.map((gap) => {
              const IconComp = gap.icon;
              const isAdded = addedGaps[gap.id];

              return (
                <div 
                  key={gap.id}
                  className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D]/50 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#C8753D]/10 text-[#C8753D] flex items-center justify-center shrink-0 mt-0.5">
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                          {gap.pillar}
                        </span>
                        <h4 className="text-sm font-bold text-[#111111]">{gap.title}</h4>
                      </div>

                      <p className="text-xs text-[#111111]/80 leading-relaxed">
                        {gap.explanation}
                      </p>

                      <div className="p-3 rounded-xl bg-[#F8F2EC] border border-[#E8E1DA] text-xs font-medium text-[#3A2218] flex items-center gap-2 mt-2">
                        <Info className="w-4 h-4 text-[#C8753D] shrink-0" />
                        <span><strong>Conseil KURLA :</strong> {gap.recommendation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this gap */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end justify-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#E8E1DA]">
                    {onAddTask && (
                      <button
                        onClick={() => handleAddGapToTasklist(gap)}
                        disabled={isAdded}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          isAdded
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-[#C8753D] hover:bg-[#b06330] text-white shadow-xs'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ajouté à la checklist
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Ajouter à mes rappels
                          </>
                        )}
                      </button>
                    )}

                    <a
                      href={gap.productLink}
                      className="px-3.5 py-1.5 rounded-xl bg-[#F8F2EC] hover:bg-[#E8E1DA] text-[#111111] text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>Voir le produit associé</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#C8753D]" />
                    </a>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Strengths List */}
      {analysis.strengths.length > 0 && (
        <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 mb-6">
          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Ce que ta routine réussit très bien ({analysis.strengths.length})
          </h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-emerald-900">
            {analysis.strengths.map((str, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Knowledge Disclaimer */}
      <div className="pt-4 border-t border-[#E8E1DA] flex items-center gap-2 text-[11px] text-[#111111]/60">
        <ShieldCheck className="w-4 h-4 text-[#C8753D] shrink-0" />
        <span>
          Analyse issue des algorithmes KURLA Beauty (non médicale). Pour des questions dermatologiques aiguës, consultez un professionnel de santé.
        </span>
      </div>

    </div>
  );
};
