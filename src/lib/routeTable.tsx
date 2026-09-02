import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { ROUTE_META, matchRouteMeta } from './routeMeta';
import type { RouteMetaMatch } from './routeMeta';
import { ProtectedRoute } from '../components/ProtectedRoute';
import type { Product, ProductVariant, UserRole } from '../types';

// Pages
const PrivacyPage = lazy(() => import('../pages/PrivacyPage'));
const HomePage = lazy(() => import('../pages/HomePage').then(m => ({ default: m.HomePage })));
const DiagnosticHairPage = lazy(() => import('../pages/DiagnosticHairPage').then(m => ({ default: m.DiagnosticHairPage })));
const DiagnosticSkinPage = lazy(() => import('../pages/DiagnosticSkinPage').then(m => ({ default: m.DiagnosticSkinPage })));
const DiagnosticResultPage = lazy(() => import('../pages/DiagnosticResultPage').then(m => ({ default: m.DiagnosticResultPage })));
const DiagnosticKidsPage = lazy(() => import('../pages/DiagnosticKidsPage').then(m => ({ default: m.DiagnosticKidsPage })));
const DiagnosticProtectivePage = lazy(() => import('../pages/DiagnosticProtectivePage').then(m => ({ default: m.DiagnosticProtectivePage })));
const BoutiquePage = lazy(() => import('../pages/BoutiquePage').then(m => ({ default: m.BoutiquePage })));
const NeedHubPage = lazy(() => import('../pages/NeedHubPage').then(m => ({ default: m.NeedHubPage })));
const ProductDetailPage = lazy(() => import('../pages/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const RoutinesPage = lazy(() => import('../pages/RoutinesPage').then(m => ({ default: m.RoutinesPage })));
const RoutineDetailPage = lazy(() => import('../pages/RoutineDetailPage').then(m => ({ default: m.RoutineDetailPage })));
const ProfessionalsPage = lazy(() => import('../pages/ProfessionalsPage').then(m => ({ default: m.ProfessionalsPage })));
const ProProfilePage = lazy(() => import('../pages/ProProfilePage').then(m => ({ default: m.ProProfilePage })));
const ProApplicationPage = lazy(() => import('../pages/ProApplicationPage').then(m => ({ default: m.ProApplicationPage })));
const JournalPage = lazy(() => import('../pages/JournalPage').then(m => ({ default: m.JournalPage })));
const ArticleDetailPage = lazy(() => import('../pages/ArticleDetailPage').then(m => ({ default: m.ArticleDetailPage })));
const CustomerAccountPage = lazy(() => import('../pages/CustomerAccountPage').then(m => ({ default: m.CustomerAccountPage })));
const ProDashboardPage = lazy(() => import('../pages/ProDashboardPage').then(m => ({ default: m.ProDashboardPage })));
const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const ManifestePage = lazy(() => import('../pages/ManifestePage').then(m => ({ default: m.ManifestePage })));
const AiBeautyAssistantPage = lazy(() => import('../pages/AiBeautyAssistantPage').then(m => ({ default: m.AiBeautyAssistantPage })));
const KurlaIdPage = lazy(() => import('../pages/KurlaIdPage').then(m => ({ default: m.KurlaIdPage })));
const HairIdPage = lazy(() => import('../pages/HairIdPage').then(m => ({ default: m.HairIdPage })));
const SkinIdPage = lazy(() => import('../pages/SkinIdPage').then(m => ({ default: m.SkinIdPage })));
const RoutineIdPage = lazy(() => import('../pages/RoutineIdPage').then(m => ({ default: m.RoutineIdPage })));
const RoutineTrackerPage = lazy(() => import('../pages/RoutineTrackerPage').then(m => ({ default: m.RoutineTrackerPage })));
const ProgressJournalPage = lazy(() => import('../pages/ProgressJournalPage').then(m => ({ default: m.ProgressJournalPage })));
const ProgressionPage = lazy(() => import('../pages/ProgressionPage').then(m => ({ default: m.ProgressionPage })));
const BeautyJourneyPage = lazy(() => import('../pages/BeautyJourneyPage').then(m => ({ default: m.BeautyJourneyPage })));
const KurlaPlusPage = lazy(() => import('../pages/KurlaPlusPage').then(m => ({ default: m.KurlaPlusPage })));
const TextureGapPage = lazy(() => import('../pages/TextureGapPage').then(m => ({ default: m.TextureGapPage })));
const ApiDocsPage = lazy(() => import('../pages/ApiDocsPage').then(m => ({ default: m.ApiDocsPage })));
const CreatorsPage = lazy(() => import('../pages/CreatorsPage').then(m => ({ default: m.CreatorsPage })));
const BrandSpacePage = lazy(() => import('../pages/BrandSpacePage').then(m => ({ default: m.BrandSpacePage })));
const BrandTestsDashboardPage = lazy(() => import('../pages/BrandTestsDashboardPage').then(m => ({ default: m.BrandTestsDashboardPage })));
const SavedPage = lazy(() => import('../pages/SavedPage').then(m => ({ default: m.SavedPage })));
const KidsModulePage = lazy(() => import('../pages/KidsModulePage').then(m => ({ default: m.KidsModulePage })));
const ProtectiveStylesPage = lazy(() => import('../pages/ProtectiveStylesPage').then(m => ({ default: m.ProtectiveStylesPage })));
const MelaninSkinPage = lazy(() => import('../pages/MelaninSkinPage').then(m => ({ default: m.MelaninSkinPage })));
const MenGroomingPage = lazy(() => import('../pages/MenGroomingPage').then(m => ({ default: m.MenGroomingPage })));
const ToolsPage = lazy(() => import('../pages/ToolsPage').then(m => ({ default: m.ToolsPage })));
const InspirationsPage = lazy(() => import('../pages/InspirationsPage').then(m => ({ default: m.InspirationsPage })));
const ApplicationPage = lazy(() => import('../pages/ApplicationPage').then(m => ({ default: m.ApplicationPage })));
const IngredientsGuidePage = lazy(() => import('../pages/IngredientsGuidePage').then(m => ({ default: m.IngredientsGuidePage })));
const CommunityPage = lazy(() => import('../pages/CommunityPage').then(m => ({ default: m.CommunityPage })));
const FamilySpacePage = lazy(() => import('../pages/FamilySpacePage').then(m => ({ default: m.FamilySpacePage })));
const LegalPage = lazy(() => import('../pages/LegalPage').then(m => ({ default: m.LegalPage })));
const OrderConfirmationPage = lazy(() => import('../pages/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));
const OrderTrackingPage = lazy(() => import('../pages/OrderTrackingPage').then(m => ({ default: m.OrderTrackingPage })));
const ShelfPage = lazy(() => import('../pages/ShelfPage').then(m => ({ default: m.ShelfPage })));
const WashDayPage = lazy(() => import('../pages/WashDayPage').then(m => ({ default: m.WashDayPage })));
const ProtectiveTimelinePage = lazy(() => import('../pages/ProtectiveTimelinePage').then(m => ({ default: m.ProtectiveTimelinePage })));
const SmartSearchPage = lazy(() => import('../pages/SmartSearchPage').then(m => ({ default: m.SmartSearchPage })));
const RoutineBuilderPage = lazy(() => import('../pages/RoutineBuilderPage').then(m => ({ default: m.RoutineBuilderPage })));
const IngredientCardPage = lazy(() => import('../pages/IngredientCardPage').then(m => ({ default: m.IngredientCardPage })));
const IngredientSearchPage = lazy(() => import('../pages/IngredientSearchPage').then(m => ({ default: m.IngredientSearchPage })));
const ProfessionalDirectoryPage = lazy(() => import('../pages/ProfessionalDirectoryPage').then(m => ({ default: m.ProfessionalDirectoryPage })));
const CostSimulatorPage = lazy(() => import('../pages/CostSimulatorPage').then(m => ({ default: m.CostSimulatorPage })));
const MyAppointmentsPage = lazy(() => import('../pages/MyAppointmentsPage').then(m => ({ default: m.MyAppointmentsPage })));

/**
 * Table de routes déclarative.
 *
 * Elle remplace la cascade de quarante `if (pathname === ...)` qui vivait dans
 * `App.tsx`. Deux raisons, dont une seule est esthétique :
 *
 * 1. La correspondance de chemin est **partagée** avec `routeMeta.ts`
 *    (`matchRouteMeta`). Une route ne peut donc pas exister sans ses
 *    métadonnées, ni l'inverse : c'est ce qui rend le sitemap et le prérendu
 *    dérivables de la même source que le rendu, au lieu d'une seconde liste à
 *    tenir à jour à la main.
 * 2. L'authentification devient une donnée (`auth`) plutôt qu'un enrobage JSX
 *    répété, donc vérifiable par test.
 */

export interface RouteContext {
  /** Paramètres capturés par le motif, ex. `{ slug: 'masque-karite' }`. */
  params: Record<string, string>;
  /** Query string de l'URL courante. */
  search: URLSearchParams;
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
}

export interface RouteAuth {
  /** Rôles autorisés. Absent : toute session authentifiée suffit. */
  roles?: UserRole[];
  /** Libellé affiché quand le rôle requis n'est pas détenu. */
  roleLabel?: string;
}

export interface RouteEntry {
  /** Doit correspondre exactement à un `path` de `ROUTE_META`. */
  path: string;
  auth?: RouteAuth;
  render: (ctx: RouteContext) => ReactNode;
}

export const ROUTES: RouteEntry[] = [
  { path: '/', render: () => <HomePage /> },

  // Diagnostics
  { path: '/assistant-beaute', render: () => <AiBeautyAssistantPage /> },
  { path: '/diagnostic/cheveux', render: () => <DiagnosticHairPage /> },
  { path: '/diagnostic/peau', render: () => <DiagnosticSkinPage /> },
  { path: '/diagnostic/enfant', render: () => <DiagnosticKidsPage /> },
  { path: '/diagnostic/protective-style', render: () => <DiagnosticProtectivePage /> },
  { path: '/diagnostic/resultat/:resultId', render: () => <DiagnosticResultPage /> },

  // Modules de contenu
  { path: '/kids', render: () => <KidsModulePage /> },
  { path: '/protective-styles', render: () => <ProtectiveStylesPage /> },
  { path: '/melanin-skin', render: () => <MelaninSkinPage /> },
  { path: '/hommes', render: () => <MenGroomingPage /> },
  { path: '/outils', render: () => <ToolsPage /> },
  { path: '/inspirations', render: () => <InspirationsPage /> },
  { path: '/application', render: () => <ApplicationPage /> },
  { path: '/guides/ingredients', render: () => <IngredientsGuidePage /> },
  { path: '/community', render: () => <CommunityPage /> },
  { path: '/manifeste', render: () => <ManifestePage /> },
  { path: '/journal', render: () => <JournalPage /> },
  { path: '/journal/:slug', render: ({ params }) => <ArticleDetailPage slug={params.slug} /> },

  // Boutique & catalogue
  {
    path: '/boutique',
    render: ({ search, onAddToCart }) => (
      <BoutiquePage onAddToCart={onAddToCart} selectedCategory={search.get('category') || 'tous'} />
    ),
  },
  {
    path: '/produit/:slug',
    render: ({ params, onAddToCart }) => <ProductDetailPage slug={params.slug} onAddToCart={onAddToCart} />,
  },
  {
    path: '/besoin/:need',
    render: ({ params, onAddToCart }) => <NeedHubPage need={params.need} onAddToCart={onAddToCart} />,
  },
  // Recherche d'ingrédients (publique et indexable).
  {
    path: '/ingredients',
    render: () => <IngredientSearchPage />,
  },
  // Publique et indexable : un moteur de recherche doit pouvoir l'atteindre.
  {
    path: '/ingredient/:ingredientId',
    render: ({ params }) => <IngredientCardPage ingredientId={params.ingredientId} />,
  },
  { path: '/routines', render: () => <RoutinesPage /> },
  {
    path: '/routines/:slug',
    render: ({ params, onAddToCart }) => <RoutineDetailPage slug={params.slug} onAddToCart={onAddToCart} />,
  },
  {
    path: '/commande/confirmation',
    render: ({ search }) => (
      <OrderConfirmationPage
        sessionId={search.get('session_id') || undefined}
        orderId={search.get('order_id') || undefined}
      />
    ),
  },
  {
    path: '/suivi-commande',
    render: ({ search }) => (
      <OrderTrackingPage orderId={search.get('order') || undefined} />
    ),
  },

  // Professionnels
  { path: '/pros-verifies', render: () => <ProfessionalDirectoryPage /> },
  { path: '/marques', render: () => <BrandSpacePage /> },
  {
    path: '/marque/tests',
    auth: { roles: ['brand', 'admin', 'superadmin'], roleLabel: 'compte marque' },
    render: () => <BrandTestsDashboardPage />,
  },
  { path: '/createurs', render: () => <CreatorsPage /> },
  { path: '/api-docs', render: () => <ApiDocsPage /> },
  { path: '/professionnels', render: () => <ProfessionalsPage /> },
  { path: '/professionnels/rejoindre', render: () => <ProApplicationPage /> },
  { path: '/professionnels/profil/:slug', render: ({ params }) => <ProProfilePage slug={params.slug} /> },
  {
    path: '/pro/dashboard',
    auth: { roles: ['professional', 'admin', 'superadmin'], roleLabel: 'professionnel certifié' },
    render: () => <ProDashboardPage />,
  },
  {
    path: '/admin',
    auth: { roles: ['admin', 'superadmin'], roleLabel: 'administrateur' },
    render: () => <AdminDashboardPage />,
  },
  {
    path: '/admin/texture-gap',
    auth: { roles: ['admin', 'superadmin'], roleLabel: 'administrateur' },
    render: () => <TextureGapPage />
  },

  // Espace compte
  { path: '/account', auth: {}, render: () => <CustomerAccountPage /> },
  { path: '/account/donnees', auth: {}, render: () => <PrivacyPage /> },
  { path: '/account/kurla-id', auth: {}, render: () => <KurlaIdPage /> },
  { path: '/account/hair-id', auth: {}, render: () => <HairIdPage /> },
  { path: '/account/skin-id', auth: {}, render: () => <SkinIdPage /> },
  { path: '/account/routine-id', auth: {}, render: () => <RoutineIdPage /> },
  { path: '/account/routine-tracker', auth: {}, render: () => <RoutineTrackerPage /> },
  { path: '/account/progress', auth: {}, render: () => <ProgressJournalPage /> },
  { path: '/account/progression', auth: {}, render: () => <ProgressionPage /> },
  { path: '/account/journey', auth: {}, render: () => <BeautyJourneyPage /> },
  { path: '/account/kurla-plus', auth: {}, render: () => <KurlaPlusPage /> },
  { path: '/account/shelf', auth: {}, render: () => <ShelfPage /> },
  { path: '/account/wash-day', auth: {}, render: () => <WashDayPage /> },
  { path: '/account/protective-timeline', auth: {}, render: () => <ProtectiveTimelinePage /> },
  { path: '/account/saved', auth: {}, render: () => <SavedPage /> },
  { path: '/recherche', auth: {}, render: () => <SmartSearchPage /> },
  { path: '/routine-builder', auth: {}, render: () => <RoutineBuilderPage /> },
  { path: '/cout-routine', auth: {}, render: () => <CostSimulatorPage /> },
  { path: '/mes-reservations', auth: {}, render: () => <MyAppointmentsPage /> },
  { path: '/famille', auth: { roleLabel: 'membre de KURLA' }, render: () => <FamilySpacePage /> },

  // Pages légales
  { path: '/cgv', render: () => <LegalPage kind="cgv" /> },
  { path: '/confidentialite', render: () => <LegalPage kind="confidentialite" /> },
];

const ENTRIES_BY_PATH: Map<string, RouteEntry> = new Map(ROUTES.map(entry => [entry.path, entry]));

export interface ResolvedRoute {
  entry: RouteEntry;
  params: Record<string, string>;
  meta: RouteMetaMatch;
}

/**
 * Résout un pathname en entrée de route + métadonnées.
 *
 * `null` signifie « aucune route ne correspond » : l'appelant affiche la page
 * 404. La correspondance passe par `matchRouteMeta`, donc l'ordre de priorité
 * (statique avant paramétré) est défini une seule fois.
 */
export function resolveRoute(pathname: string): ResolvedRoute | null {
  const meta = matchRouteMeta(pathname);
  if (!meta) return null;
  const entry = ENTRIES_BY_PATH.get(meta.basePath);
  if (!entry) return null;
  return { entry, params: meta.params, meta };
}

/**
 * Filet anti-divergence : chaque route déclarée dans `ROUTE_META` doit avoir un
 * composant, et chaque composant doit avoir des métadonnées. Sans ce contrôle,
 * ajouter une page dans un seul des deux fichiers produirait soit une page sans
 * titre, soit une URL de sitemap menant à une 404.
 */
export function auditRouteTable(): { missingComponent: string[]; missingMeta: string[] } {
  const missingComponent = ROUTE_META.map(route => route.path).filter(path => !ENTRIES_BY_PATH.has(path));
  const metaPaths = new Set(ROUTE_META.map(route => route.path));
  const missingMeta = ROUTES.map(entry => entry.path).filter(path => !metaPaths.has(path));
  return { missingComponent, missingMeta };
}
