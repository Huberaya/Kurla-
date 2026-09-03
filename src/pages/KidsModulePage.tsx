import React from 'react';
import { Heart, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, BookOpen, Clock, AlertTriangle } from 'lucide-react';
import { KIDS_CARE_IMAGE } from '../data/images';
import { BrandImage } from '../components/BrandImage';
import { CategoryWaitlist } from '../components/CategoryWaitlist';

export const KidsModulePage: React.FC = () => {
  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero Section */}
        <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-8 sm:p-12 mb-12 flex flex-col md:flex-row items-center gap-8 shadow-sm">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold">
              <Heart className="w-4 h-4" /> KURLA Kids • Bébés, enfants et adolescents
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111]">
              Des soins doux, adaptés à chaque âge, avec les parents aux commandes
            </h1>
            <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
              Un espace pour les parents : repères par tranche d’âge, routines courtes, démêlage respectueux et conseils pour les bébés, enfants et adolescents. Les recommandations restent cosmétiques et ne remplacent pas l’avis d’un professionnel de santé.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="/diagnostic/enfant"
                className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-md flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Faire le Diagnostic Enfant (2 min)
              </a>
              <a
                href="/assistant-beaute"
                className="px-6 py-3.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] text-[#111111] text-xs font-semibold flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-[#C8753D]" /> Poser une question à l'IA Kids
              </a>
              <a href="/famille" className="px-6 py-3.5 rounded-full border border-[#C8753D]/40 text-[#C8753D] text-xs font-semibold flex items-center gap-2"><Heart className="w-4 h-4" /> Créer un espace famille</a>
            {/* Le rayon « les produits kids » n'a encore aucun produit publié. Plutôt que
                d'envoyer la visiteuse vers une boutique filtrée qui n'affiche
                rien, on lui propose d'être prévenue. Une adresse capturée vaut
                mieux qu'une promesse creuse. */}
            <div className="pt-2">
              <CategoryWaitlist source="categorie_enfants" label="produits kids" />
            </div>
            </div>
          </div>

          <div className="w-full md:w-80 aspect-[4/5] rounded-3xl overflow-hidden border border-[#E8E1DA] shrink-0 shadow-md">
            <BrandImage image={KIDS_CARE_IMAGE} ratio={4 / 5} sizes="(max-width: 768px) 100vw, 320px" />
          </div>
        </div>

        {/* 4 Pillars Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#C8753D]/10 text-[#C8753D] flex items-center justify-center font-bold mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-serif-title font-bold text-[#111111] mb-2">
              Routines adaptées à l’âge
            </h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Bébé, enfant ou adolescent : le temps, la fréquence et les accessoires se choisissent selon la tranche d’âge, la texture et le confort observé. Rien n’est présenté comme universel.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#C8753D]/10 text-[#C8753D] flex items-center justify-center font-bold mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-serif-title font-bold text-[#111111] mb-2">
              Produits doux, vérifiés séparément
            </h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              KURLA n’invente aucune certification ni promesse de tolérance. L’âge recommandé, les actifs réservés aux adultes, les précautions et la supervision parentale doivent être renseignés dans la fiche produit.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#C8753D]/10 text-[#C8753D] flex items-center justify-center font-bold mb-4">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="text-base font-serif-title font-bold text-[#111111] mb-2">
              Accessoires et gestes respectueux
            </h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Brosse, bonnet satin et accessoires sont proposés seulement quand leur public et leur usage sont documentés. En cas de douleur, on arrête et on adapte le geste.
            </p>
          </div>

        </div>

        {/* Parent FAQs Section */}
        <div className="p-8 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] mb-12">
          <h2 className="text-xl font-serif-title font-bold text-[#111111] mb-6">
            Questions Fréquentes des Parents :
          </h2>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA]">
              <span className="font-bold text-[#111111] block mb-1">
                Mon enfant pleure dès que je sors la brosse, que faire ?
              </span>
              <p className="text-[#111111]/70 font-light leading-relaxed">
                Arrêter si le geste fait mal, puis reprendre avec une section plus petite et un produit dont l’âge recommandé est clairement renseigné. Un inconfort ou une douleur persistante mérite un avis professionnel.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA]">
              <span className="font-bold text-[#111111] block mb-1">
                À quelle fréquence laver ses cheveux ?
              </span>
              <p className="text-[#111111]/70 font-light leading-relaxed">
                Il n’existe pas une fréquence valable pour tous. Elle dépend de l’âge, de l’activité, de la coiffure et du confort du cuir chevelu. La fiche du produit doit rester la référence d’usage.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="p-5 rounded-2xl bg-white border border-[#E8E1DA] text-xs"><strong className="block mb-2">Bébés</strong><p className="text-[#111111]/65">Priorité à la douceur, à la supervision et à la vérification de l’âge recommandé. Aucun actif adulte par défaut.</p></div>
          <div className="p-5 rounded-2xl bg-white border border-[#E8E1DA] text-xs"><strong className="block mb-2">Enfants</strong><p className="text-[#111111]/65">Routines simples, accessoires adaptés et temps de soin réaliste, sans photo ni donnée d’enfant nécessaire.</p></div>
          <div className="p-5 rounded-2xl bg-white border border-[#E8E1DA] text-xs"><strong className="block mb-2">Adolescents</strong><p className="text-[#111111]/65">Plus d’autonomie, mais toujours un profil séparé et des produits dont la sécurité mineur est documentée.</p></div>
        </div>

        {/* Warning Banner */}
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Note de Sécurité Enfants :</span>
            <p className="font-light leading-relaxed">
              L’âge recommandé, la présence éventuelle d’actifs réservés aux adultes et la nécessité d’une supervision doivent être vérifiés pour chaque produit. Les images d’enfants sont publiées uniquement après contrôle éditorial ; KURLA ne demande pas de photo pour utiliser cet espace.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
