import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#050403] text-[#FFF7EF]/70 border-t border-[#FFF7EF]/10 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Footer Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#FFF7EF]/10">

          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3A2218] via-[#C8753D] to-[#D49A63] flex items-center justify-center text-white font-serif-title font-bold text-base">
                K
              </div>
              <span className="font-serif-title text-xl font-bold tracking-tight text-[#FFF7EF]">
                KURLA <span className="font-sans font-light text-xs tracking-widest uppercase text-[#C8753D]">Beauty</span>
              </span>
            </a>

            <p className="text-xs text-[#FFF7EF]/60 font-light max-w-sm leading-relaxed">
              Plateforme européenne dédiée aux cheveux texturés, aux peaux riches en mélanine et à la beauté afro & multiculturelle.
            </p>

            <p className="text-xs text-[#D49A63] font-medium italic">
              “La beauté texturée, enfin comprise.”
            </p>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div>
              <h4 className="font-semibold text-[#FFF7EF] uppercase tracking-wider mb-4">Plateforme</h4>
              <ul className="space-y-2.5">
                <li><a href="/diagnostic/cheveux" className="hover:text-[#C8753D] transition-colors">Diagnostic Cheveux</a></li>
                <li><a href="/diagnostic/peau" className="hover:text-[#C8753D] transition-colors">Diagnostic Peau</a></li>
                <li><a href="/routines" className="hover:text-[#C8753D] transition-colors">Routines Certifiées</a></li>
                <li><a href="/boutique" className="hover:text-[#C8753D] transition-colors">Boutique & Bundles</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#FFF7EF] uppercase tracking-wider mb-4">Marketplace</h4>
              <ul className="space-y-2.5">
                <li><a href="/professionnels" className="hover:text-[#C8753D] transition-colors">Trouver un pro</a></li>
                <li><a href="/professionnels/rejoindre" className="hover:text-[#C8753D] transition-colors">Devenir pro KURLA</a></li>
                <li><a href="/manifeste" className="hover:text-[#C8753D] transition-colors">Charte Qualité</a></li>
                <li><a href="/journal" className="hover:text-[#C8753D] transition-colors">Journal & Guides</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#FFF7EF] uppercase tracking-wider mb-4">Espaces & Légal</h4>
              <ul className="space-y-2.5">
                <li><a href="/account" className="hover:text-[#C8753D] transition-colors">Espace Client</a></li>
                <li><a href="/famille" className="hover:text-[#C8753D] transition-colors">Espace Famille</a></li>
                <li><a href="/pro/dashboard" className="hover:text-[#C8753D] transition-colors">Espace Pro</a></li>
                <li><a href="/cgv" className="hover:text-[#C8753D] transition-colors">CGV & Mentions</a></li>
                <li><a href="/confidentialite" className="hover:text-[#C8753D] transition-colors">Confidentialité</a></li>
              </ul>
            </div>
          </div>

        </div>

        {/* Disclaimer Bar */}
        <div className="py-6 border-b border-[#FFF7EF]/10 text-[11px] text-[#FFF7EF]/50 leading-relaxed">
          <p>
            <strong>Avis important non médical :</strong> Les recommandations fournies par la plateforme KURLA Beauty sont des conseils de soin beauté non médicaux. Elles ne remplacent en aucun cas l’avis, le diagnostic ou le traitement dispensé par un dermatologue ou un professionnel de santé diplômé. En cas de douleur, brûlure, plaie ou réaction allergique, veuillez immédiatement consulter un médecin.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#FFF7EF]/40 gap-4">
          <p>© {new Date().getFullYear()} KURLA Beauty SAS. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#C8753D] transition-colors">Instagram</a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#C8753D] transition-colors">TikTok</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#C8753D] transition-colors">LinkedIn</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
