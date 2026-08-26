import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  city: '',
  profession: 'Coiffeur Afro / Styliste',
  experience: '3-5 ans',
  portfolioUrl: '',
  acceptsCharter: false
};

export const ProApplicationPage: React.FC = () => {
  const { session } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState(initialFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.acceptsCharter || submitting) return;

    setSubmitting(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/professional-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Impossible d’enregistrer la candidature.');
      setSubmitted(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible d’enregistrer la candidature.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center max-w-[520px] mx-auto mb-12">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2">
            Réseau d'Excellence KURLA Pro
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#FFF7EF] mb-3">
            Rejoins le réseau KURLA Pro Europe.
          </h1>
          <p className="text-sm sm:text-base text-[#FFF7EF]/70 font-light leading-relaxed">
            Valorise ton savoir-faire auprès d’une clientèle qualifiée qui cherche un soin respectueux de leur fibre texturée ou de leur peau.
          </p>
        </div>

        {submitted ? (
          <div className="p-10 rounded-3xl bg-[#1A0F0A] border border-emerald-500/40 text-center space-y-4" role="status" aria-live="polite">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">Candidature reçue</h2>
            <p className="text-sm text-[#FFF7EF]/80 max-w-md mx-auto font-light">
              Ta candidature a bien été enregistrée. L’équipe KURLA pourra la consulter et te recontacter avec la suite du processus.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 sm:p-12 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/15 space-y-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-[#D49A63] shrink-0" />
              <div>
                <h3 className="text-xl font-serif-title font-bold text-[#FFF7EF]">Formulaire de candidature</h3>
                <p className="text-xs text-[#FFF7EF]/55 mt-1">Les informations sont transmises à l’équipe KURLA pour examen.</p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm" role="alert">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#D49A63] block mb-1" htmlFor="pro-name">Nom complet / Nom du salon</label>
                <input id="pro-name" type="text" required maxLength={200} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="ex: Kadiatou Diallo Studio" className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#D49A63] block mb-1" htmlFor="pro-email">Email professionnel</label>
                <input id="pro-email" type="email" required maxLength={200} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="kadiatou@studio.fr" className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#D49A63] block mb-1" htmlFor="pro-phone">Téléphone</label>
                <input id="pro-phone" type="tel" required maxLength={50} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+33 6 12 34 56 78" className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#D49A63] block mb-1" htmlFor="pro-city">Ville d'exercice</label>
                <input id="pro-city" type="text" required maxLength={200} value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="Paris, Lyon, Bruxelles..." className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#D49A63] block mb-1" htmlFor="pro-profession">Spécialité principale</label>
                <select id="pro-profession" value={formData.profession} onChange={e => setFormData({ ...formData, profession: e.target.value })} className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]">
                  <option value="Coiffeur Afro / Styliste">Coiffeur Afro / Styliste</option>
                  <option value="Braider / Expert Tresses">Braider / Expert Tresses Knotless</option>
                  <option value="Loctician / Microlocks">Loctician / Expert Microlocks</option>
                  <option value="Experte Skincare Peaux Mélaninées">Experte Skincare Peaux Mélaninées</option>
                  <option value="Coiffure Enfant">Coiffure Enfant & Douceur</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#D49A63] block mb-1" htmlFor="pro-experience">Expérience</label>
                <select id="pro-experience" value={formData.experience} onChange={e => setFormData({ ...formData, experience: e.target.value })} className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]">
                  <option value="Moins d'un an">Moins d'un an</option>
                  <option value="1-2 ans">1-2 ans</option>
                  <option value="3-5 ans">3-5 ans</option>
                  <option value="6-10 ans">6-10 ans</option>
                  <option value="Plus de 10 ans">Plus de 10 ans</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#D49A63] block mb-1" htmlFor="pro-portfolio">Lien Instagram / Portfolio / Planity</label>
              <input id="pro-portfolio" type="url" maxLength={500} value={formData.portfolioUrl} onChange={e => setFormData({ ...formData, portfolioUrl: e.target.value })} placeholder="https://instagram.com/mon_studio" className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]" />
            </div>

            <div className="p-4 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required checked={formData.acceptsCharter} onChange={e => setFormData({ ...formData, acceptsCharter: e.target.checked })} className="mt-1 rounded accent-[#C8753D]" />
                <span className="text-xs text-[#FFF7EF]/80 font-light leading-relaxed">
                  J'adhère à la <strong>Charte Qualité KURLA Pro</strong> : respect des rendez-vous, hygiène du matériel, écoute sans moquerie ni jugement des cheveux texturés, et utilisation de produits adaptés.
                </span>
              </label>
            </div>

            <button type="submit" disabled={submitting} className="w-full py-4 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white text-sm font-semibold tracking-wide shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait">
              {submitting ? 'Enregistrement en cours…' : 'Soumettre ma candidature'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
