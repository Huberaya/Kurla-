import React from 'react';
import { ArrowRight, Check, Droplets, Scissors, ShieldCheck, Sparkles } from 'lucide-react';
import { useI18n } from '../lib/I18nProvider';
import { localizedPath } from '../lib/i18n';

/**
 * Point d'entrée commun des diagnostics.
 *
 * Le lien principal « Diagnostic » ne choisit plus arbitrairement les cheveux :
 * il présente les deux parcours publics, peau et cheveux, puis laisse la
 * personne choisir son besoin. Les URLs historiques des deux diagnostics
 * restent inchangées.
 */
export const DiagnosticHubPage: React.FC = () => {
  const { locale } = useI18n();

  const diagnostics = [
    {
      id: 'hair',
      eyebrow: 'KURLA HAIR',
      title: 'Diagnostic cheveux',
      description: 'Texture, porosité, densité, coiffage et priorité du moment pour construire une routine capillaire adaptée.',
      duration: '3 minutes',
      href: localizedPath('/diagnostic/cheveux', locale),
      icon: Scissors,
      className: 'bg-kurla-ink text-kurla-cream border-kurla-cream/15',
      iconClassName: 'bg-kurla-copper/15 text-kurla-amber',
      points: ['Textures 3A à 4C', 'Casse, hydratation et définition', 'Locks et coiffures protectrices'],
    },
    {
      id: 'skin',
      eyebrow: 'KURLA SKIN',
      title: 'Diagnostic peau',
      description: 'Type de peau, phototype, préoccupations et objectifs pour comprendre votre routine beauté sans promesse médicale.',
      duration: '2 à 5 minutes',
      href: localizedPath('/diagnostic/peau', locale),
      icon: Droplets,
      className: 'bg-kurla-sand text-kurla-carbon border-kurla-stone',
      iconClassName: 'bg-kurla-copper/10 text-kurla-copper',
      points: ['Peaux riches en mélanine', 'Hydratation, taches et sensibilité', 'Parcours express ou complet'],
    },
  ] as const;

  return (
    <main className="min-h-screen pt-32 pb-24 bg-kurla-ivory text-kurla-carbon">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-kurla-copper/10 border border-kurla-copper/20 text-kurla-copper text-xs font-bold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" /> KURLA Beauty
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-serif-title font-bold leading-tight">
            Choisissez votre diagnostic
          </h1>
          <p className="mt-4 text-sm sm:text-base text-kurla-carbon/70 font-light leading-relaxed">
            Deux parcours complémentaires, une même approche : mieux comprendre vos cheveux ou votre peau pour recevoir des conseils beauté personnalisés.
          </p>
        </header>

        <section aria-label="Choisir un diagnostic" className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {diagnostics.map((diagnostic) => {
            const Icon = diagnostic.icon;
            return (
              <article key={diagnostic.id} className={`rounded-3xl border p-7 sm:p-9 shadow-sm flex flex-col ${diagnostic.className}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${diagnostic.iconClassName}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">{diagnostic.eyebrow}</span>
                </div>
                <h2 className="mt-7 text-2xl sm:text-3xl font-serif-title font-bold">{diagnostic.title}</h2>
                <p className="mt-3 text-sm leading-relaxed opacity-75">{diagnostic.description}</p>
                <ul className="mt-6 space-y-2.5 text-xs opacity-85">
                  {diagnostic.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-kurla-copper" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8 flex flex-wrap items-center gap-4">
                  <a
                    href={diagnostic.href}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white text-xs font-bold shadow-md transition-colors"
                  >
                    Commencer <ArrowRight className="w-4 h-4" />
                  </a>
                  <span className="text-[11px] opacity-60">{diagnostic.duration} · gratuit · sans abonnement</span>
                </div>
              </article>
            );
          })}
        </section>

        <div className="mt-8 rounded-2xl border border-kurla-stone bg-white/70 p-5 flex items-start gap-3 text-xs text-kurla-carbon/65">
          <ShieldCheck className="w-5 h-5 shrink-0 text-kurla-copper mt-0.5" />
          <p>
            Les diagnostics KURLA donnent des conseils beauté personnalisés. Ils ne constituent pas un diagnostic médical et ne remplacent pas l’avis d’un professionnel de santé.
          </p>
        </div>
      </div>
    </main>
  );
};
