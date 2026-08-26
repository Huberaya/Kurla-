import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Lock, Loader2, LogIn, ArrowLeft } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredRoleLabel?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredRoleLabel = 'membre'
}) => {
  const { user, profile, loading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center">
        <div className="text-center p-8">
          <Loader2 className="w-10 h-10 text-[#C8753D] animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#FFF7EF]/70">Vérification de votre session Supabase Auth...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user && !profile) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#1A0F0A] border border-[#C8753D]/30 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#C8753D]/10 border border-[#C8753D]/30 flex items-center justify-center mx-auto text-[#C8753D]">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">Connexion Requise</h2>
            <p className="text-xs text-[#FFF7EF]/70 mt-2 leading-relaxed">
              Cette page est sécurisée. Veuillez vous connecter avec votre compte Supabase pour accéder à vos données personnelles (KURLA ID, routines et historique).
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-6 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#C8753D]/25"
            >
              <LogIn className="w-4 h-4" /> Se connecter / S’inscrire
            </button>
            <a
              href="/"
              className="px-6 py-3 rounded-full bg-[#050403] hover:bg-[#FFF7EF]/10 text-xs font-semibold text-[#FFF7EF] border border-[#FFF7EF]/15 inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Retour à l’accueil
            </a>
          </div>

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />
        </div>
      </div>
    );
  }

  // Role validation
  if (allowedRoles && allowedRoles.length > 0) {
    const currentRole = profile?.role || 'customer';
    if (!allowedRoles.includes(currentRole)) {
      return (
        <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center px-4">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#1D0F0F] border border-rose-500/30 text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">Accès Refusé</h2>
              <p className="text-xs text-[#FFF7EF]/70 mt-2 leading-relaxed">
                Votre rôle actuel (<strong className="text-rose-400 font-mono">{currentRole}</strong>) ne possède pas les permissions nécessaires pour accéder à cet espace (Niveau requis : <span className="text-[#C8753D] font-semibold">{requiredRoleLabel}</span>).
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <a
                href="/account"
                className="px-6 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold inline-flex items-center gap-2"
              >
                Retour à Mon Compte
              </a>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
