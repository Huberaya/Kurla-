import React from 'react';
import { useI18n } from '../lib/I18nProvider';
import { Logo } from './Logo';
import { localizedPath } from '../lib/i18n';

/**
 * Pied de page.
 *
 * CHANTIER 7.5 : les libellés passent par le dictionnaire et les liens par
 * `localizedPath`. Les colonnes deviennent des données plutôt que du JSX répété
 * : ajouter un lien se fait dans un tableau, pas en recopiant une balise.
 */
export const Footer: React.FC = () => {
  const { locale, t } = useI18n();

  const columns = [
    {
      heading: t('footer.platform'),
      links: [
        { label: t('footer.diagHair'), path: '/diagnostic/cheveux' },
        { label: t('footer.diagSkin'), path: '/diagnostic/peau' },
        { label: t('footer.routines'), path: '/routines' },
        { label: t('footer.shopBundles'), path: '/boutique' },
        { label: t('footer.ingredients'), path: '/ingredients' },
      ],
    },
    {
      heading: t('footer.marketplace'),
      links: [
        { label: t('footer.findPro'), path: '/professionnels' },
        { label: t('footer.becomePro'), path: '/professionnels/rejoindre' },
        { label: t('footer.charter'), path: '/manifeste' },
        { label: t('footer.journal'), path: '/journal' },
      ],
    },
    {
      heading: t('footer.spaces'),
      links: [
        { label: t('footer.client'), path: '/account' },
        { label: locale === 'fr' ? 'Suivre ma commande' : 'Track my order', path: '/suivi-commande' },
        { label: t('footer.familySpace'), path: '/famille' },
        { label: t('footer.proSpace'), path: '/pro/dashboard' },
        { label: t('footer.cgv'), path: '/cgv' },
        { label: t('footer.privacy'), path: '/confidentialite' },
      ],
    },
  ];

  return (
    <footer className="bg-[#050403] text-[#FFF7EF]/70 border-t border-[#FFF7EF]/10 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Footer Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#FFF7EF]/10">

          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <a href={localizedPath('/', locale)} className="inline-flex" aria-label="KURLA Beauty — accueil">
              <Logo variant="lockup" tone="light" height={34} title="" />
            </a>

            <p className="text-xs text-[#FFF7EF]/60 font-light max-w-sm leading-relaxed">
              {t('footer.tagline')}
            </p>

            <p className="text-xs text-[#D49A63] font-medium italic">
              {t('footer.quote')}
            </p>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            {columns.map((column) => (
              <div key={column.heading}>
                <h4 className="font-semibold text-[#FFF7EF] uppercase tracking-wider mb-4">{column.heading}</h4>
                <ul className="space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.path}>
                      <a href={localizedPath(link.path, locale)} className="hover:text-[#C8753D] transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>

        {/* Disclaimer Bar */}
        <div className="py-6 border-b border-[#FFF7EF]/10 text-[11px] text-[#FFF7EF]/50 leading-relaxed">
          <p>
            <strong>{t('footer.nonMedical')}</strong> {t('footer.nonMedicalBody')}
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#FFF7EF]/40 gap-4">
          <p>© {new Date().getFullYear()} KURLA Beauty SAS. {t('footer.rights')}</p>
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
