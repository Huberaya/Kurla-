import { HeroSection } from '../components/HeroSection';
import { BenefitStrip } from '../components/BenefitStrip';
import { HairSkinSection } from '../components/landing/HairSkinSection';
import { ChooseNeedSection } from '../components/ChooseNeedSection';
import { AIShowcase } from '../components/landing/AIShowcase';
import { BoutiquePreviewSection } from '../components/landing/BoutiquePreviewSection';
import { CommunitySection } from '../components/landing/CommunitySection';
import { KidsMenSection } from '../components/landing/KidsMenSection';
import { DiagnosticPreviewSection } from '../components/DiagnosticPreviewSection';
import { RoutineCarouselSection } from '../components/RoutineCarouselSection';
import { TextureGallerySection } from '../components/TextureGallerySection';
import { BeautyHouseSection } from '../components/BeautyHouseSection';
import { KurlaProSection } from '../components/KurlaProSection';
import { UgcWallSection } from '../components/UgcWallSection';
import { JournalSection } from '../components/JournalSection';
import { WaitlistSection } from '../components/WaitlistSection';

/**
 * Page d'accueil.
 *
 * Extraite de `App.tsx` pour que la composition d'accueil soit une page comme
 * les autres : la table de routes la référence au même titre que les autres
 * écrans, au lieu d'être un cas particulier codé en dur dans le composant
 * racine. C'est ce qui permet au prérendu de la traiter uniformément.
 */
export function HomePage() {
  return (
    <main className="w-full overflow-hidden">
      <HeroSection />
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
    </main>
  );
}

export default HomePage;
