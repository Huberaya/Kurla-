import { lazy, Suspense } from 'react';
import { HeroSection } from '../components/HeroSection';

// Sections sous la ligne de flottaison : chargées à la demande (après le
// premier rendu du hero) pour réduire le JS du démarrage.
const BenefitStrip = lazy(() => import('../components/BenefitStrip').then(m => ({ default: m.BenefitStrip })));
const HairSkinSection = lazy(() => import('../components/landing/HairSkinSection').then(m => ({ default: m.HairSkinSection })));
const ChooseNeedSection = lazy(() => import('../components/ChooseNeedSection').then(m => ({ default: m.ChooseNeedSection })));
const AIShowcase = lazy(() => import('../components/landing/AIShowcase').then(m => ({ default: m.AIShowcase })));
const BoutiquePreviewSection = lazy(() => import('../components/landing/BoutiquePreviewSection').then(m => ({ default: m.BoutiquePreviewSection })));
const CommunitySection = lazy(() => import('../components/landing/CommunitySection').then(m => ({ default: m.CommunitySection })));
const KidsMenSection = lazy(() => import('../components/landing/KidsMenSection').then(m => ({ default: m.KidsMenSection })));
const DiagnosticPreviewSection = lazy(() => import('../components/DiagnosticPreviewSection').then(m => ({ default: m.DiagnosticPreviewSection })));
const RoutineCarouselSection = lazy(() => import('../components/RoutineCarouselSection').then(m => ({ default: m.RoutineCarouselSection })));
const TextureGallerySection = lazy(() => import('../components/TextureGallerySection').then(m => ({ default: m.TextureGallerySection })));
const BeautyHouseSection = lazy(() => import('../components/BeautyHouseSection').then(m => ({ default: m.BeautyHouseSection })));
const KurlaProSection = lazy(() => import('../components/KurlaProSection').then(m => ({ default: m.KurlaProSection })));
const UgcWallSection = lazy(() => import('../components/UgcWallSection').then(m => ({ default: m.UgcWallSection })));
const JournalSection = lazy(() => import('../components/JournalSection').then(m => ({ default: m.JournalSection })));
const WaitlistSection = lazy(() => import('../components/WaitlistSection').then(m => ({ default: m.WaitlistSection })));

/** Espace réservé léger pendant le chargement d'une section différée. */
const SectionFallback = () => <div className="w-full h-[40vh] bg-[#050403]" aria-hidden="true" />;

/**
 * Page d'accueil.
 *
 * Extraite de `App.tsx` pour que la composition d'accueil soit une page comme
 * les autres : la table de routes la référence au même titre que les autres
 * écrans, au lieu d'être un cas particulier codé en dur dans le composant
 * racine. C'est ce qui permet au prérendu de la traiter uniformément.
 *
 * Performance : seul le hero est dans le chemin critique ; les sections plus
 * bas sont chargées en lazy (voir les `lazy(...)` ci-dessus).
 */
export function HomePage() {
  return (
    <main className="w-full overflow-hidden">
      <HeroSection />
      <Suspense fallback={<SectionFallback />}>
        <BenefitStrip />
        <HairSkinSection />
        <ChooseNeedSection />
        <AIShowcase />
        <BoutiquePreviewSection />
        <CommunitySection />
        <KidsMenSection />
        <DiagnosticPreviewSection />
        <RoutineCarouselSection />
        <TextureGallerySection />
        <BeautyHouseSection />
        <KurlaProSection />
        <UgcWallSection />
        <JournalSection />
        <WaitlistSection />
      </Suspense>
    </main>
  );
}

export default HomePage;
