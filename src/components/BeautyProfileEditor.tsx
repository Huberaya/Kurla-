import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Info, Loader2, Save, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  BeautyProfile,
  BeautyProfilePhoto,
  BeautyProfileHistoryEntry,
  HairBeautyProfile,
  HairZoneKey,
  ProfileConfidence,
  UNKNOWN,
  BUDGET_OPTIONS,
  BREAKAGE_OPTIONS,
  CLIMATE_OPTIONS,
  COLORING_OPTIONS,
  CONDITION_OPTIONS,
  CURL_PATTERN_OPTIONS,
  DENSITY_OPTIONS,
  DRYNESS_OPTIONS,
  ELASTICITY_OPTIONS,
  FINISH_OPTIONS,
  HAIR_TEXTURE_OPTIONS,
  HUMIDITY_OPTIONS,
  HYPERPIGMENTATION_OPTIONS,
  ACTIVE_TOLERANCE_OPTIONS,
  LENGTH_OPTIONS,
  POROSITY_OPTIONS,
  PROTECTIVE_STYLE_OPTIONS,
  SCALP_CONCERN_OPTIONS,
  SCALP_OPTIONS,
  SEASON_OPTIONS,
  SENSITIVITY_OPTIONS,
  SKIN_ZONE_OPTIONS,
  SPF_OPTIONS,
  STYLING_HABIT_OPTIONS,
  SUN_EXPOSURE_OPTIONS,
  TEXTURE_OPTIONS,
  THICKNESS_OPTIONS,
  TIME_OPTIONS,
  TONE_OPTIONS,
  TREATMENT_OPTIONS,
  UNDERTONE_OPTIONS,
  WASH_FREQUENCY_OPTIONS,
  WATER_OPTIONS,
  ACNE_OPTIONS,
  HYDRATION_OPTIONS,
  createEmptyBeautyProfile,
  calculateProfileConfidence
} from '../lib/beautyProfile';

interface BeautyProfileEditorProps {
  focus?: 'all' | 'hair' | 'skin';
}

interface Recommendation {
  product: { id: string; slug: string; name: string; brand: string; price: number; image?: string; category?: string; description?: string };
  fit: { score: number | null; confidence: number; reasons: string[]; evidence: { field: string; label: string; value: string; relation: string }[]; unmetNeeds: string[] };
}

const fieldClass = 'w-full px-3.5 py-3 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs text-[#111111] focus:outline-none focus:border-[#C8753D]';
const sectionClass = 'p-6 sm:p-8 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] shadow-xs space-y-6';
const zoneConcernOptions = [
  { value: 'secheresse', label: 'Sécheresse' },
  { value: 'fragilite', label: 'Fragilité' },
  { value: 'demangeaisons', label: 'Démangeaisons' },
  { value: 'pointes_fourchues', label: 'Pointes fourchues' },
  { value: 'aucun', label: 'Aucun besoin particulier' },
  { value: UNKNOWN, label: 'Je ne sais pas' }
];

function Help({ children }: { children: React.ReactNode }) {
  return (
    <details className="mt-1 text-[11px] text-[#111111]/60">
      <summary className="cursor-pointer list-none inline-flex items-center gap-1 hover:text-[#C8753D]">
        <Info className="w-3 h-3" /> Pourquoi cette question ? <ChevronDown className="w-3 h-3" />
      </summary>
      <p className="mt-2 pl-4 leading-relaxed">{children}</p>
    </details>
  );
}

function SelectField({ label, help, value, options, onChange }: { label: string; help: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#111111] mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={fieldClass}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <Help>{help}</Help>
    </div>
  );
}

function MultiField({ label, help, values, options, onToggle }: { label: string; help: string; values: string[]; options: { value: string; label: string }[]; onToggle: (value: string) => void }) {
  return (
    <fieldset>
      <legend className="block text-xs font-bold text-[#111111] mb-1.5">{label}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map(option => (
          <label key={option.value} className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${values.includes(option.value) ? 'bg-[#C8753D]/10 border-[#C8753D] text-[#111111]' : 'bg-[#FFFDF9] border-[#E8E1DA] text-[#111111]/75 hover:border-[#C8753D]'}`}>
            <input type="checkbox" checked={values.includes(option.value)} onChange={() => onToggle(option.value)} className="mt-0.5 accent-[#C8753D]" />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <Help>{help}</Help>
    </fieldset>
  );
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-[#E8E1DA] pb-4">
      <p className="text-[10px] uppercase tracking-widest font-bold text-[#C8753D]">{eyebrow}</p>
      <h2 className="text-xl font-serif-title font-bold text-[#111111] mt-1">{title}</h2>
      {children && <p className="text-xs text-[#111111]/65 leading-relaxed mt-2">{children}</p>}
    </div>
  );
}

export const BeautyProfileEditor: React.FC<BeautyProfileEditorProps> = ({ focus = 'all' }) => {
  const { session } = useAuth();
  const token = session?.access_token;
  const [profile, setProfile] = useState<BeautyProfile>(createEmptyBeautyProfile());
  const [confidence, setConfidence] = useState<ProfileConfidence>(calculateProfileConfidence(createEmptyBeautyProfile()));
  const [history, setHistory] = useState<BeautyProfileHistoryEntry[]>([]);
  const [photos, setPhotos] = useState<BeautyProfilePhoto[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUploadReady, setPhotoUploadReady] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const loadProfile = async () => {
    if (!token) {
      setLoading(false);
      setError('Une session Supabase est nécessaire pour charger vos données personnelles.');
      return;
    }
    try {
      const response = await fetch('/api/beauty-profile', { headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Impossible de charger le profil beauté.');
      setProfile(data.profile || createEmptyBeautyProfile());
      setConfidence(data.confidence || calculateProfileConfidence(data.profile));
      setHistory(Array.isArray(data.history) ? data.history : []);
      setPhotos(Array.isArray(data.photos) ? data.photos : []);
      setPhotoUploadReady(Boolean(data.profile?.photoConsent));

      const recommendationResponse = await fetch('/api/beauty-recommendations', { headers });
      const recommendationData = await recommendationResponse.json().catch(() => ({}));
      if (recommendationResponse.ok && Array.isArray(recommendationData.recommendations)) setRecommendations(recommendationData.recommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le profil beauté.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [token]);

  const setHair = (key: keyof HairBeautyProfile, value: any) => {
    setProfile(current => ({ ...current, hair: { ...current.hair, [key]: value } }));
  };

  const setSkin = (key: string, value: any) => {
    setProfile(current => ({ ...current, skin: { ...current.skin, [key]: value } }));
  };

  const setEnvironment = (key: string, value: string) => {
    setProfile(current => ({ ...current, environment: { ...current.environment, [key]: value } }));
  };

  const toggleList = (values: string[], value: string): string[] => {
    if (value === UNKNOWN || value === 'aucun') return values.includes(value) ? [UNKNOWN] : [value];
    const next = values.filter(item => item !== UNKNOWN && item !== 'aucun');
    return next.includes(value) ? (next.filter(item => item !== value).length > 0 ? next.filter(item => item !== value) : [UNKNOWN]) : [...next, value];
  };

  const toggleHairList = (key: keyof HairBeautyProfile, value: string) => {
    const current = profile.hair[key];
    if (!Array.isArray(current)) return;
    setHair(key, toggleList(current as string[], value));
  };

  const toggleSkinList = (key: string, value: string) => {
    const current = (profile.skin as any)[key];
    if (!Array.isArray(current)) return;
    setSkin(key, toggleList(current, value));
  };

  const setZone = (zone: HairZoneKey, key: string, value: any) => {
    setProfile(current => ({
      ...current,
      hair: { ...current.hair, zones: { ...current.hair.zones, [zone]: { ...current.hair.zones[zone], [key]: value } } }
    }));
  };

  const saveProfile = async () => {
    if (!token) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/beauty-profile', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Impossible d’enregistrer le profil.');
      setProfile(data.profile);
      setConfidence(data.confidence);
      setPhotos(data.photos || []);
      setPhotoUploadReady(Boolean(data.profile?.photoConsent));
      setMessage('Profil beauté enregistré. Les recommandations peuvent maintenant s’appuyer sur ces informations.');
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer le profil.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token || !photoUploadReady) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choisissez une image JPG, PNG ou WebP de 5 Mo maximum.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const response = await fetch('/api/beauty-profile/photos', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': file.type, 'X-Photo-Consent': 'true' },
        body: file
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Impossible de stocker la photo.');
      setPhotos(current => [data.photo, ...current]);
      setMessage('Photo importée dans l’espace privé du profil.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de stocker la photo.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const deletePhotos = async () => {
    if (!token || !window.confirm('Supprimer toutes les photos du KURLA ID et retirer le consentement photo ?')) return;
    try {
      const response = await fetch('/api/beauty-profile/photos', { method: 'DELETE', headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Impossible de supprimer les photos.');
      setPhotos([]);
      setProfile(current => ({ ...current, photoConsent: false }));
      setPhotoUploadReady(false);
      setMessage('Photos supprimées et consentement photo retiré.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer les photos.');
    }
  };

  const deleteProfile = async () => {
    if (!token || !window.confirm('Supprimer définitivement votre profil beauté KURLA ID, son historique et ses photos ? Cette action ne supprime pas votre compte ni vos commandes.')) return;
    try {
      const response = await fetch('/api/beauty-profile', { method: 'DELETE', headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Impossible de supprimer les données.');
      const empty = createEmptyBeautyProfile();
      setProfile(empty);
      setConfidence(calculateProfileConfidence(empty));
      setHistory([]);
      setPhotos([]);
      setRecommendations([]);
      setPhotoUploadReady(false);
      setMessage('Vos données KURLA ID ont été supprimées.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer les données.');
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-[#111111]/60"><Loader2 className="w-7 h-7 animate-spin text-[#C8753D] mx-auto mb-3" />Chargement de votre profil beauté…</div>;
  }

  if (error && !token) {
    return <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>;
  }

  const showHair = focus === 'all' || focus === 'hair';
  const showSkin = focus === 'all' || focus === 'skin';

  return (
    <div className="space-y-8">
      <div className="p-6 sm:p-8 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#C8753D]">KURLA ID · profil vivant</p>
          <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#111111] mt-1">Votre profil beauté, sans raccourci</h1>
          <p className="text-sm text-[#111111]/65 font-light mt-2 max-w-2xl">Chaque réponse peut rester « je ne sais pas ». Le profil décrit séparément la fibre, le cuir chevelu, la peau et l’environnement : il ne pose aucun diagnostic médical.</p>
        </div>
        <div className="min-w-[180px] p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] text-center">
          <span className="text-[10px] uppercase tracking-wider text-[#111111]/55 block">Confiance du profil</span>
          <span className="text-3xl font-bold text-[#C8753D]">{confidence.overall}%</span>
          <span className="text-[10px] text-[#111111]/55 block">{confidence.knownFields}/{confidence.totalFields} champs documentés</span>
        </div>
      </div>

      {(message || error) && (
        <div className={`p-4 rounded-2xl text-sm flex items-start gap-2 ${error ? 'bg-rose-50 border border-rose-200 text-rose-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'}`} role="status">
          {error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{error || message}</span>
        </div>
      )}

      {showHair && (
        <section className={sectionClass}>
          <SectionTitle eyebrow="01 · Fibre et texture" title="KURLA Hair ID" >La tête peut réunir plusieurs textures. Sélectionnez tout ce qui vous ressemble plutôt que de forcer une seule étiquette.</SectionTitle>
          <MultiField label="Motif(s) de texture" help="Les catégories 2A à 4C décrivent des motifs, pas une valeur de beauté. Plusieurs réponses sont possibles si les zones diffèrent." values={profile.hair.texturePatterns} options={HAIR_TEXTURE_OPTIONS} onToggle={value => toggleHairList('texturePatterns', value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SelectField label="Motif de boucle ou de frisure" help="Cette information guide la définition et la répartition des soins, sans remplacer l’observation de vos zones." value={profile.hair.curlPattern} options={CURL_PATTERN_OPTIONS} onChange={value => setHair('curlPattern', value)} />
            <SelectField label="Porosité" help="La porosité estime la vitesse à laquelle la fibre absorbe et retient l’eau. Elle peut varier après une décoloration ou un traitement." value={profile.hair.porosity} options={POROSITY_OPTIONS} onChange={value => setHair('porosity', value)} />
            <SelectField label="Densité" help="La densité correspond au nombre de cheveux par zone, pas à l’épaisseur d’un cheveu individuel." value={profile.hair.density} options={DENSITY_OPTIONS} onChange={value => setHair('density', value)} />
            <SelectField label="Épaisseur du cheveu" help="L’épaisseur concerne le diamètre du brin. Elle aide à éviter de confondre volume global et résistance de chaque cheveu." value={profile.hair.strandThickness} options={THICKNESS_OPTIONS} onChange={value => setHair('strandThickness', value)} />
            <SelectField label="Longueur actuelle" help="La longueur influence le temps de séchage, le démêlage et la quantité de produit nécessaire." value={profile.hair.length} options={LENGTH_OPTIONS} onChange={value => setHair('length', value)} />
            <SelectField label="État général de la fibre" help="Décrivez l’état actuel de la fibre, notamment après chaleur, coloration ou traitement chimique." value={profile.hair.fiberCondition} options={CONDITION_OPTIONS} onChange={value => setHair('fiberCondition', value)} />
            <SelectField label="Niveau de sécheresse" help="La sécheresse est un ressenti et une observation de la fibre. Elle est distincte de la porosité." value={profile.hair.dryness} options={DRYNESS_OPTIONS} onChange={value => setHair('dryness', value)} />
            <SelectField label="Niveau de casse" help="Indiquez la casse observée au coiffage ou au démêlage, sans chercher à l’interpréter médicalement." value={profile.hair.breakage} options={BREAKAGE_OPTIONS} onChange={value => setHair('breakage', value)} />
            <SelectField label="Élasticité" help="L’élasticité décrit la manière dont le cheveu s’étire puis revient. « Je ne sais pas » est préférable à une mesure improvisée." value={profile.hair.elasticity} options={ELASTICITY_OPTIONS} onChange={value => setHair('elasticity', value)} />
          </div>
        </section>
      )}

      {showHair && (
        <section className={sectionClass}>
          <SectionTitle eyebrow="02 · Cuir chevelu et zones" title="Distinguer le cuir chevelu des longueurs et des pointes">Une même personne peut avoir un cuir chevelu gras et des pointes sèches. Ces zones restent séparées dans le profil.</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SelectField label="État du cuir chevelu" help="Le cuir chevelu est une zone différente de la fibre. En cas de douleur, plaie ou irritation persistante, demandez un avis médical." value={profile.hair.scalpCondition} options={SCALP_OPTIONS} onChange={value => setHair('scalpCondition', value)} />
            <MultiField label="Signes du cuir chevelu" help="Ces signaux servent à éviter des recommandations trop agressives. KURLA ne transforme pas ces réponses en diagnostic." values={profile.hair.scalpConcerns} options={SCALP_CONCERN_OPTIONS} onToggle={value => toggleHairList('scalpConcerns', value)} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(['scalp', 'lengths', 'ends'] as HairZoneKey[]).map(zone => {
              const labels = { scalp: 'Cuir chevelu', lengths: 'Longueurs', ends: 'Pointes' };
              return (
                <div key={zone} className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] space-y-4">
                  <h3 className="text-sm font-bold text-[#111111]">{labels[zone]}</h3>
                  <SelectField label="Sécheresse" help="La sensation peut différer entre les zones." value={profile.hair.zones[zone].dryness} options={DRYNESS_OPTIONS} onChange={value => setZone(zone, 'dryness', value)} />
                  <SelectField label="État de la fibre" help="Une zone fragilisée peut recevoir une routine différente du reste de la tête." value={profile.hair.zones[zone].fiberCondition} options={CONDITION_OPTIONS} onChange={value => setZone(zone, 'fiberCondition', value)} />
                  <SelectField label="Casse" help="Cette réponse est propre à la zone observée." value={profile.hair.zones[zone].breakage} options={BREAKAGE_OPTIONS} onChange={value => setZone(zone, 'breakage', value)} />
                  <MultiField label="Besoins observés" help="Ajoutez plusieurs besoins si nécessaire." values={profile.hair.zones[zone].concerns} options={zoneConcernOptions} onToggle={value => setZone(zone, 'concerns', toggleList(profile.hair.zones[zone].concerns, value))} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {showHair && (
        <section className={sectionClass}>
          <SectionTitle eyebrow="03 · Pratiques et contexte" title="Ce que votre routine doit réellement pouvoir suivre">Le meilleur conseil est inutilisable s’il ne correspond pas à votre temps, votre budget ou votre façon de coiffer.</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <MultiField label="Traitements chimiques" help="Cette information aide à ajuster la prudence et la fréquence des soins. Vous pouvez ne pas répondre." values={profile.hair.chemicalTreatments} options={TREATMENT_OPTIONS} onToggle={value => toggleHairList('chemicalTreatments', value)} />
            <SelectField label="Coloration" help="Une coloration ou décoloration peut changer la porosité et la fragilité perçues." value={profile.hair.coloring} options={COLORING_OPTIONS} onChange={value => setHair('coloring', value)} />
            <MultiField label="Style(s) protecteur(s) porté(s)" help="Les tresses, locks et perruques imposent des besoins d’entretien et de cuir chevelu différents." values={profile.hair.protectiveStyles} options={PROTECTIVE_STYLE_OPTIONS} onToggle={value => toggleHairList('protectiveStyles', value)} />
            <SelectField label="Fréquence de lavage" help="La fréquence est mise en relation avec le cuir chevelu, les styles protecteurs et le temps disponible." value={profile.hair.washFrequency} options={WASH_FREQUENCY_OPTIONS} onChange={value => setHair('washFrequency', value)} />
            <MultiField label="Habitudes de coiffage" help="La chaleur, le démêlage et les coiffures serrées peuvent modifier la lecture de la casse et de l’élasticité." values={profile.hair.stylingHabits} options={STYLING_HABIT_OPTIONS} onToggle={value => toggleHairList('stylingHabits', value)} />
            <SelectField label="Temps disponible" help="Nous préférons proposer une routine réaliste plutôt qu’une routine idéale impossible à tenir." value={profile.hair.availableTime} options={TIME_OPTIONS} onChange={value => setHair('availableTime', value)} />
            <SelectField label="Budget capillaire" help="Le budget n’est jamais interprété comme une qualité de soin ; il sert à filtrer des options réellement accessibles." value={profile.hair.budget} options={BUDGET_OPTIONS} onChange={value => setHair('budget', value)} />
          </div>
        </section>
      )}

      {showSkin && (
        <section className={sectionClass}>
          <SectionTitle eyebrow="04 · Mélanine, inflammation et environnement" title="KURLA Skin ID">La profondeur de carnation est un facteur parmi d’autres : le profil relie pigmentation, inflammation, sensibilité et exposition.</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SelectField label="Profondeur de carnation" help="Cette information peut aider à contextualiser la visibilité d’un voile blanc ou d’une marque, mais ne résume jamais votre besoin cutané." value={profile.skin.toneDepth} options={TONE_OPTIONS} onChange={value => setSkin('toneDepth', value)} />
            <SelectField label="Sous-ton" help="Le sous-ton sert surtout à personnaliser certains choix de teinte et de fini. Il peut rester inconnu." value={profile.skin.undertone} options={UNDERTONE_OPTIONS} onChange={value => setSkin('undertone', value)} />
            <SelectField label="Sensibilité" help="La sensibilité est votre tendance à ressentir inconfort, rougeur ou picotement. Une réaction persistante mérite un avis professionnel." value={profile.skin.sensitivity} options={SENSITIVITY_OPTIONS} onChange={value => setSkin('sensitivity', value)} />
            <SelectField label="Tendance à l’hyperpigmentation" help="Cette réponse concerne la façon dont la peau marque après une inflammation, pas une échelle de couleur." value={profile.skin.hyperpigmentationTendency} options={HYPERPIGMENTATION_OPTIONS} onChange={value => setSkin('hyperpigmentationTendency', value)} />
            <SelectField label="Acné ou imperfections" help="La fréquence des imperfections aide à hiérarchiser les besoins, sans diagnostic ni promesse de traitement." value={profile.skin.acne} options={ACNE_OPTIONS} onChange={value => setSkin('acne', value)} />
            <SelectField label="Marques post-inflammatoires" help="Indiquez si les boutons, irritations ou blessures laissent des marques visibles. Cette réponse ne remplace pas un diagnostic." value={profile.skin.postInflammatoryMarks} options={HYPERPIGMENTATION_OPTIONS.map(option => ({ ...option, value: option.value === 'frequente' ? 'frequentes' : option.value === 'occasionnelle' ? 'occasionnelles' : option.value }))} onChange={value => setSkin('postInflammatoryMarks', value)} />
            <SelectField label="État d’hydratation" help="Une peau déshydratée peut être grasse et manquer d’eau : ce champ est distinct du type de peau." value={profile.skin.hydration} options={HYDRATION_OPTIONS} onChange={value => setSkin('hydration', value)} />
            <SelectField label="Tolérance aux actifs" help="Cette information évite de proposer trop vite des actifs puissants à une peau qui réagit facilement." value={profile.skin.activeTolerance} options={ACTIVE_TOLERANCE_OPTIONS} onChange={value => setSkin('activeTolerance', value)} />
            <SelectField label="Exposition solaire" help="L’exposition, l’usage du SPF et l’historique de pigmentation sont analysés ensemble." value={profile.skin.sunExposure} options={SUN_EXPOSURE_OPTIONS} onChange={value => setSkin('sunExposure', value)} />
            <SelectField label="Usage du SPF" help="Le SPF est une habitude de prévention, pas une promesse d’effacement des marques existantes." value={profile.skin.spfUsage} options={SPF_OPTIONS} onChange={value => setSkin('spfUsage', value)} />
            <MultiField label="Zones concernées" help="Les zones peuvent avoir des besoins différents : sélectionnez celles qui vous intéressent." values={profile.skin.concernZones} options={SKIN_ZONE_OPTIONS} onToggle={value => toggleSkinList('concernZones', value)} />
            <SelectField label="Texture préférée" help="La galénique préférée améliore l’adhésion à la routine, sans déterminer l’efficacité à elle seule." value={profile.skin.texturePreference} options={TEXTURE_OPTIONS} onChange={value => setSkin('texturePreference', value)} />
            <SelectField label="Fini préféré" help="Le fini permet de tenir compte du confort, du maquillage et des préférences sensorielles." value={profile.skin.finishPreference} options={FINISH_OPTIONS} onChange={value => setSkin('finishPreference', value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1.5" htmlFor="reaction-history">Historique de réactions (facultatif)</label>
            <textarea id="reaction-history" rows={4} maxLength={1000} value={profile.skin.reactionHistory} onChange={event => setSkin('reactionHistory', event.target.value)} placeholder="Ex. réaction à un parfum, un acide, un écran solaire… ou « je ne sais pas »." className={`${fieldClass} resize-y`} />
            <Help>Ce texte permet d’expliquer une recommandation et de signaler une prudence. Il n’est pas utilisé pour établir une conclusion médicale.</Help>
          </div>
        </section>
      )}

      {focus === 'all' && (
        <section className={sectionClass}>
          <SectionTitle eyebrow="05 · Environnement" title="Climat, humidité et qualité de l’eau">Le même profil peut nécessiter une adaptation en hiver, en été ou sous climat humide.</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SelectField label="Climat habituel" help="Le climat influence évaporation, confort cutané et comportement de la fibre." value={profile.environment.climate} options={CLIMATE_OPTIONS} onChange={value => setEnvironment('climate', value)} />
            <SelectField label="Humidité ambiante" help="L’humidité peut modifier le volume, la définition et la sensation de sécheresse." value={profile.environment.humidity} options={HUMIDITY_OPTIONS} onChange={value => setEnvironment('humidity', value)} />
            <SelectField label="Qualité de l’eau" help="Une eau calcaire peut laisser des dépôts et modifier le toucher de la fibre. Le filtre est une option distincte." value={profile.environment.waterQuality} options={WATER_OPTIONS} onChange={value => setEnvironment('waterQuality', value)} />
            <SelectField label="Saison à prendre en compte" help="La saison permet de recalculer une routine sans écraser votre profil de base." value={profile.environment.season} options={SEASON_OPTIONS} onChange={value => setEnvironment('season', value)} />
          </div>
        </section>
      )}

      {focus === 'all' && (
        <section className={sectionClass}>
          <SectionTitle eyebrow="06 · Photos facultatives" title="Importer une photo, seulement si vous le souhaitez">Les photos sont privées, stockées sans URL publique et ne sont jamais nécessaires pour utiliser KURLA ID. Retirer le consentement supprime les photos associées.</SectionTitle>
          <label className="flex items-start gap-3 p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] cursor-pointer">
            <input type="checkbox" checked={profile.photoConsent} onChange={event => { setProfile(current => ({ ...current, photoConsent: event.target.checked })); setPhotoUploadReady(false); }} className="mt-1 accent-[#C8753D]" />
            <span className="text-xs text-[#111111]/80 leading-relaxed"><strong>Je consens à importer des photos dans mon espace privé KURLA.</strong><br />La photo sert uniquement à enrichir votre suivi. Elle n’est pas publiée, et vous pouvez retirer ce consentement à tout moment.</span>
          </label>
          {!profile.photoConsent && <p className="text-xs text-[#111111]/55">Enregistrez le profil après avoir coché le consentement pour activer l’import.</p>}
          {profile.photoConsent && !photoUploadReady && <p className="text-xs text-[#C8753D]">Enregistrez d’abord le profil pour activer l’import privé.</p>}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <label className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold ${photoUploadReady ? 'bg-[#111111] text-white cursor-pointer hover:bg-[#C8753D]' : 'bg-[#E8E1DA] text-[#111111]/45 cursor-not-allowed'}`}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {uploading ? 'Import en cours…' : 'Choisir une photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={!photoUploadReady || uploading} onChange={handlePhotoUpload} className="sr-only" />
            </label>
            <span className="text-xs text-[#111111]/55">JPG, PNG ou WebP · 5 Mo maximum · {photos.length} photo{photos.length > 1 ? 's' : ''} privée{photos.length > 1 ? 's' : ''}</span>
            {photos.length > 0 && <button type="button" onClick={deletePhotos} className="text-xs text-rose-700 underline">Supprimer les photos</button>}
          </div>
        </section>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={saveProfile} disabled={saving || !token} className="flex-1 py-4 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Enregistrement…' : 'Enregistrer mon KURLA ID'}
        </button>
        <button type="button" onClick={deleteProfile} disabled={!token} className="px-5 py-4 rounded-full border border-rose-200 text-rose-800 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          <Trash2 className="w-4 h-4" /> Supprimer mes données KURLA ID
        </button>
      </div>

      {focus === 'all' && (
        <>
          <section className="p-6 sm:p-8 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] space-y-4">
            <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#C8753D]" /><h2 className="text-xl font-serif-title font-bold">Comment lire la confiance</h2></div>
            <p className="text-sm text-[#111111]/70 leading-relaxed">{confidence.overall}% correspond à la couverture des informations connues, pas à une vérité sur votre beauté. Les recommandations restent prudentes tant que des champs importants sont inconnus.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F8F2EC]"><strong className="block">Hair ID</strong><span>{confidence.hair}% documenté</span></div>
              <div className="p-3 rounded-xl bg-[#F8F2EC]"><strong className="block">Skin ID</strong><span>{confidence.skin}% documenté</span></div>
              <div className="p-3 rounded-xl bg-[#F8F2EC]"><strong className="block">Environnement</strong><span>{confidence.environment}% documenté</span></div>
            </div>
            {confidence.missingLabels.length > 0 && <p className="text-xs text-[#111111]/55">Encore inconnus : {confidence.missingLabels.slice(0, 7).join(', ')}{confidence.missingLabels.length > 7 ? '…' : ''}</p>}
          </section>

          {recommendations.length > 0 && (
            <section className="p-6 sm:p-8 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] space-y-5">
              <div><p className="text-[10px] uppercase tracking-widest font-bold text-[#C8753D]">07 · Recommandations explicables</p><h2 className="text-xl font-serif-title font-bold mt-1">KURLA Fit, sans score décoratif</h2><p className="text-xs text-[#111111]/65 mt-2">Chaque score repose sur les besoins du produit et les informations réellement renseignées. Les champs inconnus ne sont pas inventés.</p></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {recommendations.slice(0, 4).map(recommendation => (
                  <article key={recommendation.product.id} className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA]">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase text-[#C8753D] font-bold">{recommendation.product.brand}</p><h3 className="text-sm font-bold mt-1">{recommendation.product.name}</h3></div><span className="text-lg font-bold text-[#C8753D]">{recommendation.fit.score}%</span></div>
                    <p className="text-[11px] text-[#111111]/60 mt-2">Confiance des données utilisées : {recommendation.fit.confidence}%</p>
                    {recommendation.fit.reasons.slice(0, 2).map(reason => <p key={reason} className="text-xs text-[#111111]/75 mt-2">• {reason}</p>)}
                    {recommendation.fit.evidence.slice(0, 3).map(item => <p key={`${item.field}-${item.value}`} className="text-[11px] text-[#111111]/55 mt-1"><strong>{item.label} :</strong> {item.value} — {item.relation}.</p>)}
                    <a href={`/produit/${recommendation.product.slug}`} className="inline-block mt-3 text-xs font-semibold text-[#C8753D] underline">Voir le soin</a>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="p-6 sm:p-8 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] space-y-4">
            <div><p className="text-[10px] uppercase tracking-widest font-bold text-[#C8753D]">08 · Historique</p><h2 className="text-xl font-serif-title font-bold mt-1">Évolutions du profil</h2><p className="text-xs text-[#111111]/60 mt-2">Chaque enregistrement crée un instantané. L’historique est supprimé avec vos données KURLA ID.</p></div>
            {history.length === 0 ? <p className="text-sm text-[#111111]/55">Aucun changement enregistré pour le moment.</p> : <div className="space-y-2">{history.slice(0, 10).map(item => <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F8F2EC] text-xs"><span>{new Date(item.createdAt).toLocaleString('fr-FR')} · {item.source === 'user' ? 'modification personnelle' : 'consentement photo retiré'}</span><strong className="text-[#C8753D]">{item.confidence.overall}%</strong></div>)}</div>}
          </section>
        </>
      )}
    </div>
  );
};
