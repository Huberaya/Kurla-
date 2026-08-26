import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export const ProApplicationPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    profession: 'Coiffeur Afro / Styliste',
    experience: '3-5 ans',
    portfolioUrl: '',
    acceptsCharter: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.acceptsCharter) {
      setSubmitted(true);
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
          <div className="p-10 rounded-3xl bg-[#1A0F0A] border border-emerald-500/40 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">Candidature reçue avec succès !</h2>
            <p className="text-sm text-[#FFF7EF]/80 max-w-md mx-auto font-light">
              Notre équipe va examiner tes réalisations et ta conformité avec la Charte KURLA sous 48h. Tu recevras un lien d'activation de ton Espace Pro.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 sm:p-12 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/15 space-y-6 shadow-2xl">
            <h3 className="text-xl font-serif-title font-bold text-[#FFF7EF]">Formulaire d'inscription Certifiée</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#D49A63] block mb-1">Nom complet / Nom du salon</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Kadiatou Diallo Studio"
                  className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#D49A63] block mb-1">Email professionnel</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="kadiatou@studio.fr"
                  className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#D49A63] block mb-1">Téléphone</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#D49A63] block mb-1">Ville d'exercice</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Paris, Lyon, Bruxelles..."
                  className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#D49A63] block mb-1">Spécialité Principale</label>
              <select
                value={formData.profession}
                onChange={e => setFormData({ ...formData, profession: e.target.value })}
                className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]"
              >
                <option value="Coiffeur Afro / Styliste">Coiffeur Afro / Styliste</option>
                <option value="Braider / Expert Tresses">Braider / Expert Tresses Knotless</option>
                <option value="Loctician / Microlocks">Loctician / Expert Microlocks</option>
                <option value="Experte Skincare Peaux Mélaninées">Experte Skincare Peaux Mélaninées</option>
                <option value="Coiffure Enfant">Coiffure Enfant & Douceur</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#D49A63] block mb-1">Lien Instagram / Portfolio / Planity</label>
              <input
                type="url"
                value={formData.portfolioUrl}
                onChange={e => setFormData({ ...formData, portfolioUrl: e.target.value })}
                placeholder="https://instagram.com/mon_studio"
                className="w-full p-3.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formData.acceptsCharter}
                  onChange={e => setFormData({ ...formData, acceptsCharter: e.target.checked })}
                  className="mt-1 rounded accent-[#C8753D]"
                />
                <span className="text-xs text-[#FFF7EF]/80 font-light leading-relaxed">
                  J'adhère à la <strong>Charte Qualité KURLA Pro</strong> : respect des rendez-vous, hygiène du matériel, écoute sans moquerie ni jugement des cheveux texturés, et utilisation de produits adaptés.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white text-sm font-semibold tracking-wide shadow-xl flex items-center justify-center gap-2"
            >
              Soumettre ma candidature certifiée <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
