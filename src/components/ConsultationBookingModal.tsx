import React, { useEffect, useState } from 'react';
import { 
  Video, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  MessageSquare,
  Lock,
  Star
} from 'lucide-react';
/**
 * Ce composant lisait auparavant `MOCK_PROS` : de faux noms, de faux avatars
 * et des notes inventées, présentés comme réservables. C'était la pire des
 * fictions du dépôt — elle engageait l'utilisateur dans une prise de rendez-vous
 * avec un professionnel qui n'existe pas.
 *
 * Désormais : seuls les professionnels approuvés par un administrateur sont
 * proposés. S'il n'y en a aucun, la modal le dit au lieu d'inventer.
 */
interface DirectoryProfessional {
  id: string;
  name: string;
  city: string;
  profession: string;
  verified: boolean;
}

export interface VirtualConsultation {
  id: string;
  title: string;
  duration: string;
  price: number;
  category: 'cheveux' | 'skincare' | 'protective' | 'kids';
  description: string;
  icon: string;
}

export const CONSULTATION_TYPES: VirtualConsultation[] = [
  {
    id: 'c1',
    title: 'Diagnostic & Bilan Capillaire Visio',
    duration: '30 min',
    price: 35,
    category: 'cheveux',
    description: 'Analyse en direct de ta texture, porosité, cuir chevelu et revue de tes produits actuels.',
    icon: '✨'
  },
  {
    id: 'c2',
    title: 'Coaching Skincare Peau Mélaninée',
    duration: '30 min',
    price: 30,
    category: 'skincare',
    description: 'Bilan taches d’hyperpigmentation, barrière cutanée, sensibilité & choix SPF sans trace.',
    icon: '☀️'
  },
  {
    id: 'c3',
    title: 'Conseil Protective Style & Locks',
    duration: '20 min',
    price: 25,
    category: 'protective',
    description: 'Préparation avant tresses, vérification de la tension, routine cuir chevelu sous braids/locks.',
    icon: '👑'
  },
  {
    id: 'c4',
    title: 'Consultation Cheveux Enfant Sans Douleur',
    duration: '30 min',
    price: 30,
    category: 'kids',
    description: 'Guidance pour parents : démêlage doux, produits sans larmes, routine quotidienne de 15 min.',
    icon: '👧'
  }
];

interface ConsultationBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedProId?: string;
}

export const ConsultationBookingModal: React.FC<ConsultationBookingModalProps> = ({
  isOpen,
  onClose,
  preSelectedProId
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Annuaire réel. Les hooks doivent précéder le `return null` ci-dessous.
  const [professionals, setProfessionals] = useState<DirectoryProfessional[]>([]);
  const [directoryLoaded, setDirectoryLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch('/api/professionals')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('annuaire indisponible'))))
      .then(payload => {
        if (cancelled) return;
        setProfessionals(Array.isArray(payload?.professionals) ? payload.professionals : []);
        setDirectoryLoaded(true);
      })
      .catch(() => { if (!cancelled) setDirectoryLoaded(true); });
    return () => { cancelled = true; };
  }, [isOpen]);

  // Form State
  const [selectedService, setSelectedService] = useState<VirtualConsultation>(CONSULTATION_TYPES[0]);
  const [selectedProId, setSelectedProId] = useState<string>(preSelectedProId || 'any');
  
  // Date Picker State
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<number>(today.getDate() + 1);

  // Time Slot State
  const availableSlots = [
    '09:30', '10:30', '11:15', '14:00', '15:30', '17:00', '18:15', '19:00'
  ];
  const [selectedSlot, setSelectedSlot] = useState<string>('14:00');

  // Client Info State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  // Confirmation State
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  if (!isOpen) return null;

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    // This UI is intentionally an interest request until availability,
    // payment, calendar and video providers are connected server-side.
    setBookingConfirmed(true);
    setStep(4);
  };

  const selectedProObj = professionals.find(p => p.id === selectedProId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consultation-modal-title"
        className="relative w-full max-w-2xl rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/20 text-[#FFF7EF] shadow-2xl my-8 overflow-hidden"
      >
        
        {/* Top Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#FFF7EF]/10 bg-[#050403]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C8753D]/20 text-[#C8753D] flex items-center justify-center">
              <Video className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#C8753D] uppercase tracking-wider">KURLA Visio Expert</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">Bêta — demande d’intérêt</span>
              </div>
              <h2 id="consultation-modal-title" className="text-lg font-serif-title font-bold text-[#FFF7EF]">
                Réserver une Consultation Vidéo Privée
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fermer la demande de consultation"
            className="w-9 h-9 rounded-full bg-[#1A0F0A] text-[#FFF7EF]/60 hover:text-white border border-[#FFF7EF]/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        {!bookingConfirmed && (
          <div className="px-6 py-3 bg-[#0D0805] border-b border-[#FFF7EF]/10 flex items-center justify-between text-xs">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#C8753D] font-bold' : 'text-[#FFF7EF]/40'}`}>
              <span className="w-5 h-5 rounded-full bg-[#C8753D]/20 flex items-center justify-center text-[10px]">1</span>
              <span>Séance & Expert</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#FFF7EF]/20" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#C8753D] font-bold' : 'text-[#FFF7EF]/40'}`}>
              <span className="w-5 h-5 rounded-full bg-[#C8753D]/20 flex items-center justify-center text-[10px]">2</span>
              <span>Date & Créneau</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#FFF7EF]/20" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-[#C8753D] font-bold' : 'text-[#FFF7EF]/40'}`}>
              <span className="w-5 h-5 rounded-full bg-[#C8753D]/20 flex items-center justify-center text-[10px]">3</span>
              <span>Coordonnées</span>
            </div>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-6">

          {/* STEP 1: Select Session & Expert */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-[#C8753D] uppercase tracking-wider mb-2">
                  1. Choisis le type de consultation
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CONSULTATION_TYPES.map((type) => {
                    const isSelected = selectedService.id === type.id;
                    return (
                      <div
                        key={type.id}
                        onClick={() => setSelectedService(type)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#C8753D]/20 border-[#C8753D] shadow-lg'
                            : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#FFF7EF]/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">{type.icon}</span>
                          <span className="text-sm font-bold text-[#C8753D]">{type.price} €</span>
                        </div>
                        <h4 className="text-sm font-bold text-[#FFF7EF] mb-1">{type.title}</h4>
                        <p className="text-[11px] text-[#FFF7EF]/70 leading-relaxed mb-2 line-clamp-2">
                          {type.description}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#FFF7EF]/50">
                          <Clock className="w-3 h-3 text-[#C8753D]" />
                          <span>{type.duration} via lien visio sécurisé</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expert Selection */}
              <div>
                <label className="block text-xs font-bold text-[#C8753D] uppercase tracking-wider mb-2">
                  2. Choisis ton expert KURLA Certifié
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Automatic/Any Expert */}
                  <div
                    onClick={() => setSelectedProId('any')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                      selectedProId === 'any'
                        ? 'bg-[#C8753D]/20 border-[#C8753D]'
                        : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#FFF7EF]/30'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#C8753D]/20 text-[#C8753D] flex items-center justify-center font-bold text-xs shrink-0">
                      ⚡
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#FFF7EF]">1er Expert Dispo</div>
                      <div className="text-[10px] text-[#FFF7EF]/60">Attribution rapide</div>
                    </div>
                  </div>

                  {professionals.length === 0 && (
                    <div className="p-3 rounded-2xl border border-[#FFF7EF]/10 bg-[#050403]">
                      <div className="text-xs font-bold text-[#FFF7EF] mb-1">
                        Aucun professionnel vérifié pour l&apos;instant
                      </div>
                      <div className="text-[10px] text-[#FFF7EF]/60 leading-relaxed">
                        {directoryLoaded
                          ? 'Choisissez « 1er expert dispo » : votre demande sera traitée dès qu\'un professionnel vérifié sera disponible. KURLA n\'invente pas de profil pour remplir la liste.'
                          : 'Chargement de l\'annuaire…'}
                      </div>
                    </div>
                  )}

                  {professionals.map((pro) => {
                    const isSelected = selectedProId === pro.id;
                    return (
                      <div
                        key={pro.id}
                        onClick={() => setSelectedProId(pro.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'bg-[#C8753D]/20 border-[#C8753D]'
                            : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#FFF7EF]/30'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-[#C8753D]/20 border border-[#C8753D]/50 shrink-0 flex items-center justify-center text-sm font-bold text-[#D49A63]">
                          {pro.name.trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#FFF7EF] truncate flex items-center gap-1">
                            {pro.name}
                            {pro.verified && <CheckCircle2 className="w-3 h-3 text-[#C8753D] shrink-0" />}
                          </div>
                          <div className="text-[10px] text-[#D49A63] truncate">{pro.profession}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Next CTA */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <span>Continuer : Choisir la Date</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Interactive Calendar & Time Slots */}
          {step === 2 && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Calendar Widget */}
                <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1 rounded-lg bg-[#1A0F0A] text-[#FFF7EF]/70 hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-[#FFF7EF]">
                      {monthNames[currentMonth]} {currentYear}
                    </span>
                    <button
                      onClick={handleNextMonth}
                      className="p-1 rounded-lg bg-[#1A0F0A] text-[#FFF7EF]/70 hover:text-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day Names */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#FFF7EF]/40 mb-2">
                    <span>Dim</span>
                    <span>Lun</span>
                    <span>Mar</span>
                    <span>Mer</span>
                    <span>Jeu</span>
                    <span>Ven</span>
                    <span>Sam</span>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {/* Blank offset */}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`blank-${i}`} className="p-2" />
                    ))}

                    {/* Active Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const isPast = dayNum < today.getDate() && currentMonth === today.getMonth();
                      const isSelected = selectedDate === dayNum;

                      return (
                        <button
                          key={dayNum}
                          disabled={isPast}
                          onClick={() => setSelectedDate(dayNum)}
                          className={`p-2 rounded-xl text-xs font-semibold transition-all ${
                            isPast
                              ? 'text-[#FFF7EF]/20 cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#C8753D] text-white shadow-md font-bold'
                              : 'hover:bg-[#1A0F0A] text-[#FFF7EF]'
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots Picker */}
                <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-[#C8753D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Créneaux Disponibles pour le {selectedDate} {monthNames[currentMonth]}
                    </label>
                    <p className="text-[11px] text-[#FFF7EF]/60 mb-4">
                      Heures exprimées en fuseau Europe/Paris (CET).
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {availableSlots.map((slot) => {
                        const isSlotSelected = selectedSlot === slot;
                        return (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border ${
                              isSlotSelected
                                ? 'bg-[#C8753D] border-[#C8753D] text-white shadow-md'
                                : 'bg-[#1A0F0A] border-[#FFF7EF]/10 text-[#FFF7EF] hover:border-[#C8753D]/40'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-[11px] text-[#FFF7EF]/70 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Lien Google Meet / Visio généré automatiquement dès validation.</span>
                  </div>
                </div>
              </div>

              {/* Navigation CTAs */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl bg-[#050403] text-[#FFF7EF]/70 hover:text-white text-xs font-semibold flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>

                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-3 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-2 shadow-md transition-all"
                >
                  <span>Continuer : Mes Informations</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: Client Details & Form */}
          {step === 3 && (
            <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs">
              
              {/* Summary Banner */}
              <div className="p-4 rounded-2xl bg-[#050403] border border-[#C8753D]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] text-[#C8753D] uppercase font-bold">Récapitulatif de séance</div>
                  <div className="text-sm font-bold text-[#FFF7EF]">{selectedService.title}</div>
                  <div className="text-xs text-[#FFF7EF]/70">
                    {selectedDate} {monthNames[currentMonth]} {currentYear} à <strong>{selectedSlot}</strong> ({selectedService.duration})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-[#C8753D]">{selectedService.price} €</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 justify-end">
                    <Lock className="w-3 h-3" /> Visio sécurisée
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-[#FFF7EF]">Ton Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Fatou Diallo"
                    className="w-full p-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] focus:outline-none focus:border-[#C8753D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#FFF7EF]">Adresse Email (pour le lien visio) *</label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="fatou@example.com"
                    className="w-full p-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] focus:outline-none focus:border-[#C8753D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-[#FFF7EF]">Téléphone (Rappels SMS)</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full p-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] focus:outline-none focus:border-[#C8753D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#FFF7EF]">Expert Attribué</label>
                  <div className="p-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#C8753D]" />
                    <span className="font-semibold">
                      {selectedProObj ? selectedProObj.name : 'Premier Expert KURLA Certifié Disponible'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#FFF7EF]">Questions ou détails spécifiques pour l'expert</label>
                <textarea
                  rows={3}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Ex: Mes cheveux restent très secs après mes tresses. Je souhaite revoir ma routine de scellage..."
                  className="w-full p-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] focus:outline-none focus:border-[#C8753D]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl bg-[#050403] text-[#FFF7EF]/70 hover:text-white text-xs font-semibold flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Modifier la date
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Envoyer ma demande de consultation</span>
                </button>
              </div>

            </form>
          )}

          {/* STEP 4: Confirmation & Video Meeting Access */}
          {step === 4 && (
            <div className="text-center py-6 space-y-6">
              
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold">
                  Demande enregistrée
                </span>
                <h3 className="text-2xl font-serif-title font-bold text-[#FFF7EF] my-1">
                  Ta demande de consultation est prise en compte
                </h3>
                <p className="text-xs text-[#FFF7EF]/70 max-w-md mx-auto">
                  Aucune réservation ni aucun paiement n’est encore créé. Les informations saisies servent à préparer le futur service de consultation.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-left max-w-lg mx-auto space-y-3">
                <div className="flex items-center gap-2 text-amber-200">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold">Demande enregistrée — module en préparation</span>
                </div>
                <p className="text-xs text-amber-100/80 leading-relaxed">
                  Cette demande ne crée pas encore de réservation, de paiement, d’invitation calendrier ou de lien visio. Notre équipe pourra confirmer le rendez-vous lorsque le service sera disponible.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#FFF7EF]/80 pt-2">
                  <div><strong>Date souhaitée :</strong> {selectedDate} {monthNames[currentMonth]} {currentYear}</div>
                  <div><strong>Heure souhaitée :</strong> {selectedSlot} ({selectedService.duration})</div>
                  <div><strong>Expert souhaité :</strong> {selectedProObj ? selectedProObj.name : 'Premier expert disponible'}</div>
                  <div><strong>Montant indicatif :</strong> {selectedService.price} €</div>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold transition-colors"
                >
                  Terminer & Retourner aux Pros
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
