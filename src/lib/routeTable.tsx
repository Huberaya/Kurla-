import type { ReactNode } from 'react';
import { ROUTE_META, matchRouteMeta } from './routeMeta';
import type { RouteMetaMatch } from './routeMeta';
import { ProtectedRoute } from '../components/ProtectedRoute';
import type { Product, ProductVariant, UserRole } from '../types';

// Pages
import { HomePage } from '../pages/HomePage';
import { DiagnosticHairPage } from '../pages/DiagnosticHairPage';
import { DiagnosticSkinPage } from '../pages/DiagnosticSkinPage';
import { DiagnosticResultPage } from '../pages/DiagnosticResultPage';
import { DiagnosticKidsPage } from '../pages/DiagnosticKidsPage';
import { DiagnosticProtectivePage } from '../pages/DiagnosticProtectivePage';
import { BoutiquePage } from '../pages/BoutiquePage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { RoutinesPage } from '../pages/RoutinesPage';
import { RoutineDetailPage } from '../pages/RoutineDetailPage';
import { ProfessionalsPage } from '../pages/ProfessionalsPage';
import { ProProfilePage } from '../pages/ProProfilePage';
import { ProApplicationPage } from '../pages/ProApplicationPage';
import { JournalPage } from '../pages/JournalPage';
import { ArticleDetailPage } from '../pages/ArticleDetailPage';
import { CustomerAccountPage } from '../pages/CustomerAccountPage';
import { ProDashboardPage } from '../pages/ProDashboardPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { ManifestePage } from '../pages/ManifestePage';
import { AiBeautyAssistantPage } from '../pages/AiBeautyAssistantPage';
import { KurlaIdPage } from '../pages/KurlaIdPage';
import { HairIdPage } from '../pages/HairIdPage';
import { SkinIdPage } from '../pages/SkinIdPage';
import { RoutineIdPage } from '../pages/RoutineIdPage';
import { RoutineTrackerPage } from '../pages/RoutineTrackerPage';
import { ProgressJournalPage } from '../pages/ProgressJournalPage';
import { ProgressionPage } from '../pages/ProgressionPage';
import { SavedPage } from '../pages/SavedPage';
import { KidsModulePage } from '../pages/KidsModulePage';
import { ProtectiveStylesPage } from '../pages/ProtectiveStylesPage';
import { MelaninSkinPage } from '../pages/MelaninSkinPage';
import { MenGroomingPage } from '../pages/MenGroomingPage';
import { ToolsPage } from '../pages/ToolsPage';
import { IngredientsGuidePage } from '../pages/IngredientsGuidePage';
import { CommunityPage } from '../pages/CommunityPage';
import { FamilySpacePage } from '../pages/FamilySpacePage';
import { LegalPage } from '../pages/LegalPage';
import { OrderConfirmationPage } from '../pages/OrderConfirmationPage';
import { ShelfPage } from '../pages/ShelfPage';
import { WashDayPage } from '../pages/WashDayPage';
import { ProtectiveTimelinePage } from '../pages/ProtectiveTimelinePage';
import { SmartSearchPage } from '../pages/SmartSearchPage';
import { RoutineBuilderPage } from '../pages/RoutineBuilderPage';
import { IngredientCardPage } from '../pages/IngredientCardPage';
import { ProfessionalDirectoryPage } from '../pages/ProfessionalDirectoryPage';
import { CostSimulatorPage } from '../pages/CostSimulatorPage';
import { MyAppointmentsPage } from '../pages/MyAppointmentsPage';

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

  // Professionnels
  { path: '/pros-verifies', render: () => <ProfessionalDirectoryPage /> },
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

  // Espace compte
  { path: '/account', auth: {}, render: () => <CustomerAccountPage /> },
  { path: '/account/kurla-id', auth: {}, render: () => <KurlaIdPage /> },
  { path: '/account/hair-id', auth: {}, render: () => <HairIdPage /> },
  { path: '/account/skin-id', auth: {}, render: () => <SkinIdPage /> },
  { path: '/account/routine-id', auth: {}, render: () => <RoutineIdPage /> },
  { path: '/account/routine-tracker', auth: {}, render: () => <RoutineTrackerPage /> },
  { path: '/account/progress', auth: {}, render: () => <ProgressJournalPage /> },
  { path: '/account/progression', auth: {}, render: () => <ProgressionPage /> },
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
