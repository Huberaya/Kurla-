import React from 'react';
import { Calendar, Users, Star, ShieldCheck, CheckCircle2, Clock, Plus } from 'lucide-react';

export const ProDashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Dashboard Top Banner */}
        <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#FFF7EF]">Espace Pro — Studio Kadiatou</h1>
              <span className="px-3 py-0.5 rounded-full bg-[#C8753D]/20 text-[#D49A63] text-xs font-semibold border border-[#C8753D]/40 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C8753D]" /> Membre Certifié KURLA
              </span>
            </div>
            <p className="text-xs text-[#FFF7EF]/60">Gère tes créneaux, prestations et demandes de bilan écoute clientes.</p>
          </div>

          <button className="px-5 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Ajouter une prestation
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2">
            <span className="text-xs text-[#D49A63] font-semibold flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> RDV à venir
            </span>
            <span className="text-3xl font-bold text-[#FFF7EF]">12</span>
            <p className="text-[11px] text-[#FFF7EF]/50">4 cette semaine</p>
          </div>

          <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2">
            <span className="text-xs text-[#D49A63] font-semibold flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400" /> Note moyenne
            </span>
            <span className="text-3xl font-bold text-[#FFF7EF]">4.9 / 5</span>
            <p className="text-[11px] text-[#FFF7EF]/50">Basée sur 38 avis vérifiés</p>
          </div>

          <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2">
            <span className="text-xs text-[#D49A63] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Statut Charte
            </span>
            <span className="text-xl font-bold text-emerald-400">100% Conforme</span>
            <p className="text-[11px] text-[#FFF7EF]/50">Renouvelée pour 2026</p>
          </div>
        </div>

        {/* Next Appointments List */}
        <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-6 shadow-xl">
          <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF]">Demandes & Rendez-vous Récents</h2>

          <div className="space-y-4">
            {[
              { client: 'Fatou Diop', service: 'Knotless Braids Taille Moyenne', date: 'Demain à 14:00', status: 'Confirmé' },
              { client: 'Mireille K.', service: 'Consultation Bilan Porosité 4C', date: 'Jeudi 6 Août à 10:30', status: 'En attente' },
              { client: 'Sarah B.', service: 'Départ Microlocks', date: 'Samedi 8 Août à 09:00', status: 'Confirmé' },
            ].map((rdv, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-serif-title font-bold text-[#FFF7EF]">{rdv.client}</h3>
                  <p className="text-xs text-[#D49A63]">{rdv.service}</p>
                  <span className="text-[11px] text-[#FFF7EF]/50 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-[#C8753D]" /> {rdv.date}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    rdv.status === 'Confirmé' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {rdv.status}
                  </span>
                  <button className="px-3 py-1.5 rounded-full bg-[#1A0F0A] hover:bg-[#3A2218] text-xs font-medium text-[#FFF7EF] border border-[#FFF7EF]/15">
                    Gérer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
