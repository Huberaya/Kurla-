import React from 'react';
import { Sparkles, Scissors, ShieldCheck, ArrowRight } from 'lucide-react';
import { MEN_GROOMING_IMAGE } from '../data/images';
import { BrandImage } from '../components/BrandImage';
import { CategoryWaitlist } from '../components/CategoryWaitlist';

export const MenGroomingPage: React.FC = () => {
  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-8 sm:p-12 mb-12 flex flex-col md:flex-row items-center gap-8 shadow-sm">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111111] text-white text-xs font-semibold">
              <Scissors className="w-4 h-4 text-[#C8753D]" /> Hommes Grooming & Barbershop
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111]">
              Barbe, moustache, waves, locks et cheveux courts : le soin pensé pour les hommes
            </h1>
            <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
              Un espace pour explorer le rasage, les poils incarnés, la peau, le cuir chevelu, les waves, les locks, les cheveux crépus et les soins du corps. Les fiches distinguent les besoins sans promesse de résultat automatique.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="/professionnels?category=barber"
                className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-md flex items-center gap-2"
              >
                <Scissors className="w-4 h-4" /> Trouver un Barber KURLA Pro
              </a>
              <a
                href="/assistant-beaute"
                className="px-6 py-3.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] text-[#111111] text-xs font-semibold flex items-center gap-2"
              >
                Poser une question Barbe / Waves
              </a>
            {/* Le rayon « les produits grooming » n'a encore aucun produit publié. Plutôt que
                d'envoyer la visiteuse vers une boutique filtrée qui n'affiche
                rien, on lui propose d'être prévenue. Une adresse capturée vaut
                mieux qu'une promesse creuse. */}
            <div className="pt-2">
              <CategoryWaitlist source="categorie_hommes" label="les produits grooming" />
            </div>
            </div>
          </div>

          <div className="w-full md:w-80 aspect-[4/5] rounded-3xl overflow-hidden border border-[#E8E1DA] shrink-0 shadow-md">
            <BrandImage image={MEN_GROOMING_IMAGE} ratio={4 / 5} sizes="(max-width: 768px) 100vw, 320px" />
          </div>
        </div>

        {/* 3 Step Routine Men */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
            <span className="text-xs font-bold text-[#C8753D] uppercase block mb-1">Étape 1</span>
            <h3 className="text-base font-bold text-[#111111] mb-2">Nettoyer & Apaiser le Rasage</h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Préparer la peau avec un geste doux et un produit dont l’usage est renseigné. En cas de poils incarnés répétés ou de lésion, demander un avis professionnel plutôt que multiplier les actifs.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
            <span className="text-xs font-bold text-[#C8753D] uppercase block mb-1">Étape 2</span>
            <h3 className="text-base font-bold text-[#111111] mb-2">Hydrater la Barbe & Waves</h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Choisir un soin dont la texture, le parfum, les ingrédients et les précautions sont renseignés, puis l’appliquer selon l’étiquette sur barbe ou moustache.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
            <span className="text-xs font-bold text-[#C8753D] uppercase block mb-1">Étape 3</span>
            <h3 className="text-base font-bold text-[#111111] mb-2">Brosser & Compresser (Durag)</h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Waves, locks ou cheveux courts : privilégier l’accessoire adapté à la longueur et au confort du cuir chevelu, sans serrer ni prolonger un geste inconfortable.
            </p>
          </div>
        </div>

        <section className="space-y-6">
          <div><span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold">Explorer par besoin</span><h2 className="text-2xl font-serif-title font-bold mt-1">Le grooming ne se résume pas à la barbe.</h2><p className="text-sm text-[#111111]/65 mt-2">Chaque espace pourra afficher uniquement les produits et conseils dont le public, les ingrédients et les précautions sont documentés.</p></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[
            ['Barbe & moustache', 'Entretien, texture et confort du poil'],
            ['Rasage', 'Préparer, raser et apaiser sans promesse'],
            ['Poils incarnés', 'Repères de soin et signaux d’alerte'],
            ['Peau & corps', 'Hydratation, zones sèches et gestes simples'],
            ['Cuir chevelu', 'Cheveux courts, crépus et confort'],
            ['Waves & locks', 'Entretien, accessoires et tension'],
            ['Protection solaire', 'Choisir selon les informations de la fiche'],
            ['Conseils hommes', 'Contenus éditoriaux dédiés']
          ].map(([title, description]) => <div key={title} className="p-5 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] hover:border-[#C8753D] transition-colors"><h3 className="font-semibold text-sm">{title}</h3><p className="text-xs text-[#111111]/60 mt-2 leading-relaxed">{description}</p><ArrowRight className="w-4 h-4 text-[#C8753D] mt-4" /></div>)}</div>
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs"><strong className="block mb-1">À surveiller</strong>Une douleur, une irritation persistante, une plaie ou une réaction importante ne se traite pas avec un conseil cosmétique : arrêtez le geste et demandez un avis médical.</div>
        </section>

      </div>
    </div>
  );
};
