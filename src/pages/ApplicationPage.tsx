import React, { useEffect, useState } from 'react';
import { Smartphone, Download, Share, PlusSquare, WifiOff, Bell, Store, CheckCircle2, ArrowRight } from 'lucide-react';

/**
 * PAGE « APPLICATION » — transformer la plateforme en application, visible.
 *
 * Constat d'audit : la PWA existe (manifest + service worker + icônes) et la
 * plateforme est installable depuis des mois… mais AUCUN écran ne le disait.
 * Le menu « Installer » des navigateurs est introuvable pour la plupart des
 * gens, et iOS ne propose JAMAIS l'installation spontanément.
 *
 * Cette page fait trois choses, honnêtement :
 *  1. capture l'évènement `beforeinstallprompt` (Chrome/Edge/Android) pour
 *     offrir un VRAI bouton « Installer » ;
 *  2. donne le pas-à-pas iOS (Partager → Sur l'écran d'accueil), seul chemin
 *     possible sur iPhone — aucune promesse de bouton magique ;
 *  3. dit ce que l'application fait déjà (hors-ligne : coquille seulement,
 *     pas les données) et ce qui viendra avec les stores (Capacitor).
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)')?.matches
    || (navigator as any).standalone === true;
}

export const ApplicationPage: React.FC = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setInstallEvent(null);
  };

  const ios = isIos();

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="rounded-3xl bg-[#1A0F0A] text-[#FFF7EF] p-8 sm:p-12 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/15 text-[#D49A63] text-xs font-semibold mb-4">
            <Smartphone className="w-3.5 h-3.5" /> Application KURLA
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">KURLA sur votre écran d’accueil</h1>
          <p className="text-[#FFF7EF]/70 max-w-2xl text-sm sm:text-base">
            KURLA s’installe comme une application : icône sur l’écran d’accueil, plein écran
            sans barre de navigateur, ouverture instantanée. Sans passer par un store,
            sans compte supplémentaire, sans mise à jour à gérer.
          </p>

          <div className="mt-6">
            {standalone || installed ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/15 text-emerald-300 text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" /> L’application est installée — vous y êtes.
              </div>
            ) : installEvent ? (
              <button
                onClick={install}
                className="px-6 py-3.5 rounded-xl bg-[#C8753D] hover:bg-[#D49A63] text-white text-sm font-bold flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Installer l’application
              </button>
            ) : (
              <p className="text-xs text-[#FFF7EF]/50 max-w-md">
                {ios
                  ? 'Sur iPhone/iPad, l’installation passe par le menu Partager de Safari — le pas-à-pas est juste en dessous.'
                  : 'Votre navigateur n’a pas (encore) proposé l’installation : suivez le pas-à-pas ci-dessous, ou revenez après quelques visites — certains navigateurs attendent avant de la permettre.'}
              </p>
            )}
          </div>
        </div>

        {/* Pas-à-pas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-6 sm:p-8">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Share className="w-5 h-5 text-[#C8753D]" /> Sur iPhone / iPad (Safari)
            </h2>
            <ol className="space-y-3 text-sm text-[#5A4638]">
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white text-xs font-bold flex items-center justify-center shrink-0">1</span> Ouvrez kurlabeauty.vercel.app dans <strong>Safari</strong> (pas Chrome — Apple ne le permet qu’à Safari).</li>
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white text-xs font-bold flex items-center justify-center shrink-0">2</span> Touchez le bouton <strong>Partager</strong> (carré avec flèche vers le haut).</li>
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white text-xs font-bold flex items-center justify-center shrink-0">3</span> Faites défiler et touchez <strong>« Sur l’écran d’accueil »</strong>.</li>
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white text-xs font-bold flex items-center justify-center shrink-0">4</span> Confirmez : l’icône KURLA apparaît comme une app.</li>
            </ol>
          </div>
          <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-6 sm:p-8">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <PlusSquare className="w-5 h-5 text-[#C8753D]" /> Sur Android / ordinateur (Chrome, Edge)
            </h2>
            <ol className="space-y-3 text-sm text-[#5A4638]">
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white text-xs font-bold flex items-center justify-center shrink-0">1</span> Le bouton <strong>« Installer l’application »</strong> ci-dessus apparaît quand le navigateur est prêt.</li>
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white text-xs font-bold flex items-center justify-center shrink-0">2</span> Sinon : menu ⋮ du navigateur → <strong>« Installer KURLA »</strong> ou <strong>« Ajouter à l’écran d’accueil »</strong>.</li>
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white text-xs font-bold flex items-center justify-center shrink-0">3</span> Sur ordinateur, une icône d’installation apparaît aussi à droite de la barre d’adresse.</li>
            </ol>
          </div>
        </div>

        {/* Ce que fait l'app */}
        <div className="rounded-3xl bg-white border border-[#E8E1DA] p-6 sm:p-8 mb-10">
          <h2 className="font-bold text-lg mb-5">Ce que l’application fait — sans exagérer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <Smartphone className="w-5 h-5 text-[#C8753D] mb-2" />
              <p className="text-sm font-bold mb-1">Plein écran, vraie icône</p>
              <p className="text-xs text-[#5A4638]">Sans barre de navigateur : diagnostic, boutique, assistante IA et suivi comme dans une app native.</p>
            </div>
            <div>
              <WifiOff className="w-5 h-5 text-[#C8753D] mb-2" />
              <p className="text-sm font-bold mb-1">Ouverture hors-ligne</p>
              <p className="text-xs text-[#5A4638]">L’application s’ouvre sans réseau. Honnêtement : la coquille seulement — vos données et le catalogue exigent une connexion, et nous ne mettons jamais vos données personnelles en cache sur l’appareil.</p>
            </div>
            <div>
              <Bell className="w-5 h-5 text-[#C8753D] mb-2" />
              <p className="text-sm font-bold mb-1">À venir</p>
              <p className="text-xs text-[#5A4638]">Rappels de routine et notifications (avec votre accord explicite, jamais par défaut) — prévus avec le passage sur les stores.</p>
            </div>
          </div>
        </div>

        {/* Roadmap stores */}
        <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-6 sm:p-8">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Store className="w-5 h-5 text-[#C8753D]" /> Et l’App Store / le Play Store ?
          </h2>
          <p className="text-sm text-[#5A4638] mb-4">
            C’est l’étape suivante, déjà cadrée : le même code sera empaqueté avec Capacitor pour
            les deux stores. Ce qui la déclenche n’est pas technique, ce sont deux comptes :
          </p>
          <ul className="space-y-2 text-sm text-[#5A4638]">
            <li className="flex gap-2"><ArrowRight className="w-4 h-4 text-[#C8753D] shrink-0 mt-0.5" /> <span><strong>Google Play</strong> : compte développeur (25 $ une fois) — publication en quelques jours.</span></li>
            <li className="flex gap-2"><ArrowRight className="w-4 h-4 text-[#C8753D] shrink-0 mt-0.5" /> <span><strong>App Store</strong> : compte Apple Developer (99 $/an) — examen plus long, exige un vrai « plus » par rapport au site (les notifications et rappels de routine le seront).</span></li>
          </ul>
          <p className="text-xs text-[#8A7364] mt-4">
            En attendant, l’installation ci-dessus donne 90 % de l’expérience — aujourd’hui, gratuitement.
          </p>
        </div>
      </div>
    </div>
  );
};
