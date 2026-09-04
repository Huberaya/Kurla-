import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowLeft, Check, CheckCircle2, Clock, Globe2,
  Image as ImageIcon, Info, Loader2, Mail, PackageCheck, RefreshCw,
  Send, ShieldCheck, ShoppingBag, Star, UserRound, XCircle, AlertTriangle,
  Truck, CreditCard, RotateCcw, BadgeCheck, Lock
} from 'lucide-react';
import { Product, ProductQuestion, ProductReview, ProductVariant } from '../types';
import { getEnrichedProductGallery } from '../services/productImageService';
import { fetchProductIngredients, type ProductIngredientEntry } from '../services/ingredientNavService';
import { useProduct } from '../services/productService';
import { analytics } from '../lib/analytics';
import { TOOL_BY_PRODUCT_SLUG } from '../lib/knowledge/tools';
import { useAuth } from '../context/AuthContext';
import {
  askProductQuestion,
  createProductSubscription,
  fetchProductTrust,
  joinProductWaitlist,
  submitProductReview
} from '../services/marketplaceService';
import { ArchetypeRatingsPanel } from '../components/product/ArchetypeRatingsPanel';
import { ProductVerificationPanel } from '../components/product/ProductVerificationPanel';
import { ProductComplianceBanner } from '../components/product/ProductComplianceBanner';
import { DISPATCH_LEGAL, DISPATCH_SENTENCE, DISPATCH_SHORT } from '../lib/preorderPromise';

interface ProductDetailPageProps {
  slug: string;
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
}

const missing = 'Non renseigné pour le moment';

function valueOrMissing(value?: string | null): string {
  return value?.trim() ? value : missing;
}

function ageBandLabel(value?: Product['recommendedAgeBand']): string {
  switch (value) {
    case 'baby': return 'Bébé';
    case 'child': return 'Enfant';
    case 'teen': return 'Adolescent';
    case 'adult': return 'Adulte';
    case 'all_ages': return 'Tous âges';
    default: return missing;
  }
}

function imageTrustLabel(value?: NonNullable<Product['galleryImages']>[number]['imageTrust']): string {
  switch (value) {
    case 'brand_provided': return 'Image fournie par la marque';
    case 'licensed': return 'Image sous licence vérifiée';
    case 'editorial': return 'Image éditoriale';
    case 'illustrative': return 'Visuel illustratif';
    default: return 'Provenance de l’image non renseignée';
  }
}

function normalizedVariant(value: any, productId: string, productPrice: number): ProductVariant {
  const stock = Number(value.stockQuantity ?? value.stock_quantity ?? 0);
  const reserved = Number(value.reservedQuantity ?? value.reserved_quantity ?? 0);
  return {
    id: String(value.id),
    productId,
    label: value.label || value.name || value.option_value || 'Option',
    optionType: value.optionType || value.option_type,
    optionValue: value.optionValue || value.option_value,
    sku: value.sku,
    price: Number(value.price ?? productPrice),
    stockQuantity: stock,
    reservedQuantity: reserved,
    inStock: value.inStock ?? (stock > reserved)
  };
}

function ReviewCard({ review }: { review: ProductReview }) {
  return (
    <article className="rounded-2xl border border-[#FFF7EF]/10 bg-[#1A0F0A] p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-1 text-amber-300" aria-label={`${review.rating} sur 5`}>
          {Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`w-3.5 h-3.5 ${index < review.rating ? 'fill-current' : 'opacity-30'}`} />)}
        </div>
        <span className="text-[10px] text-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Achat vérifié</span>
      </div>
      {review.title && <h3 className="font-semibold text-sm text-[#FFF7EF] mb-1">{review.title}</h3>}
      <p className="text-xs text-[#FFF7EF]/75 leading-relaxed">{review.comment}</p>
      <p className="text-[10px] text-[#FFF7EF]/45 mt-3 flex items-center gap-1"><UserRound className="w-3 h-3" /> {review.author}</p>
    </article>
  );
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ slug, onAddToCart }) => {
  const { product, loading, error } = useProduct(slug);
  const { user, session } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string>();
  const [trust, setTrust] = useState<{ reviews: ProductReview[]; questions: ProductQuestion[]; verifiedReviewCount: number; questionsCount: number }>({ reviews: [], questions: [], verifiedReviewCount: 0, questionsCount: 0 });
  const [trustLoading, setTrustLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [country, setCountry] = useState('FR');
  const [frequency, setFrequency] = useState<'30_days' | '45_days' | '60_days' | '90_days'>('60_days');
  /**
   * CHANTIER 7.7 — verdict réglementaire du pays affiché. Un produit non
   * commercialisable ne doit pas pouvoir entrer dans le panier depuis la fiche :
   * le checkout le refuserait de toute façon.
   */
  const [sellableInCountry, setSellableInCountry] = useState(true);
  /** Composition reliée au graphe d'ingrédients (Chantier 1 — boucle publique). */
  const [linkedIngredients, setLinkedIngredients] = useState<ProductIngredientEntry[]>([]);

  const variants = useMemo(() => product?.variants?.map(value => normalizedVariant(value, product.id, product.price)) || [], [product]);
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId);
  const gallery = product ? getEnrichedProductGallery(product) : [];
  const currentImage = gallery[activeImageIndex] || gallery[0];
  const shipping = ((product as any)?.shippingInfo || (product as any)?.shippingPolicy || {}) as { countries?: string[]; deliveryEstimate?: string; deliveryFee?: number; freeFromAmount?: number; returnsPolicy?: string };
  const availableCountries = shipping.countries?.length ? shipping.countries : product?.countryAvailability || [];
  const effectiveInStock = selectedVariant ? selectedVariant.inStock : Boolean(product?.inStock);
  const effectivePrice = selectedVariant?.price ?? product?.price ?? 0;
  const isPreorder = product?.isPreorder === true;

  useEffect(() => {
    if (!product) return;
    // Funnel : vue de fiche produit (view_item GA4).
    try { analytics.viewItem(product.id, product.name, product.price, product.category); } catch { /* noop */ }
    setActiveImageIndex(0);
    const firstAvailable = variants.find(variant => variant.inStock);
    setSelectedVariantId(firstAvailable?.id);
    setCountry(availableCountries[0] || 'FR');
    setWaitlistEmail(user?.email || '');
    setTrustLoading(true);
    fetchProductTrust(product.slug || product.id)
      .then(setTrust)
      .catch(() => setTrust({ reviews: [], questions: [], verifiedReviewCount: 0, questionsCount: 0 }))
      .finally(() => setTrustLoading(false));

    // Composition reliée au graphe : fiches ingrédient cliquables. Échoue
    // silencieusement (la liste INCI déclarée reste affichée dans tous les cas).
    setLinkedIngredients([]);
    fetchProductIngredients(product.slug || product.id)
      .then(data => setLinkedIngredients(data.composition || []))
      .catch(() => setLinkedIngredients([]));
  }, [product?.id]);

  const clearAction = () => { setActionMessage(null); setActionError(null); };

  const handleAdd = () => {
    if (!product || !effectiveInStock || !sellableInCountry) return;
    clearAction();
    onAddToCart(product, selectedVariant);
    setActionMessage(isPreorder ? 'Précommande ajoutée au panier.' : 'Article ajouté au panier.');
  };

  const withAction = async (action: () => Promise<{ message?: string }>) => {
    clearAction();
    setBusy(true);
    try {
      const result = await action();
      setActionMessage(result.message || 'Demande enregistrée.');
    } catch (actionFailure: any) {
      setActionError(actionFailure?.message || 'La demande n’a pas pu être enregistrée.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen pt-32 bg-[#050403] text-[#FFF7EF] flex items-center justify-center"><div className="text-center p-8"><Loader2 className="w-10 h-10 text-[#C8753D] animate-spin mx-auto mb-4" /><h2 className="text-xl font-serif-title font-bold mb-2">Chargement du produit…</h2></div></div>;
  }

  if (error || !product) {
    return <div className="min-h-screen pt-32 bg-[#050403] text-[#FFF7EF] flex items-center justify-center"><div className="text-center p-8 max-w-md bg-[#1A0F0A] rounded-3xl border border-[#FFF7EF]/10"><XCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" /><h2 className="text-xl font-serif-title font-bold mb-2">Produit indisponible</h2><p className="text-xs text-[#FFF7EF]/60 mb-6">{error?.message || 'Ce produit n’est pas publié ou n’est plus disponible.'}</p><a href="/boutique" className="px-5 py-2.5 rounded-full bg-[#C8753D] text-white text-xs font-semibold inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Retour à la boutique</a></div></div>;
  }

  const targetTypes = [...(product.targetHairTypes || []), ...(product.targetSkinTypes || [])];
  const certifications = product.certifications || [];

  return (
    <div className="min-h-screen pt-28 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <a href="/boutique" className="inline-flex items-center gap-2 text-xs text-[#FFF7EF]/60 hover:text-[#FFF7EF] mb-6"><ArrowLeft className="w-4 h-4" /> Retour aux produits</a>

        {actionMessage && <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-900/20 p-3 text-sm text-emerald-200 flex items-center gap-2"><Check className="w-4 h-4" />{actionMessage}</div>}
        {actionError && <div className="mb-5 rounded-xl border border-rose-400/30 bg-rose-900/20 p-3 text-sm text-rose-200 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{actionError}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-3">
            <div className="relative aspect-square rounded-3xl overflow-hidden border border-[#FFF7EF]/10 bg-[#1A0F0A]">
              {currentImage?.url ? <img loading="lazy" decoding="async" src={currentImage.url} alt={currentImage.label || product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-sm text-[#FFF7EF]/50"><ImageIcon className="w-5 h-5 mr-2" /> Image en attente de validation</div>}
              {currentImage && <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4"><p className="text-xs text-[#FFF7EF]/85 flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5 text-[#D49A63]" />{imageTrustLabel(currentImage.imageTrust)}</p></div>}
            </div>
            {gallery.length > 1 && <div className="grid grid-cols-4 gap-2">{gallery.map((image, index) => <button key={`${image.url}-${index}`} onClick={() => setActiveImageIndex(index)} className={`aspect-square rounded-xl overflow-hidden border ${index === activeImageIndex ? 'border-[#C8753D] ring-2 ring-[#C8753D]/30' : 'border-[#FFF7EF]/10 opacity-70 hover:opacity-100'}`}><img loading="lazy" decoding="async" src={image.url} alt={image.label || product.name} className="w-full h-full object-cover" /></button>)}</div>}
            <div className="rounded-2xl border border-[#FFF7EF]/10 bg-[#1A0F0A]/70 p-4 text-xs text-[#FFF7EF]/65 flex gap-2"><Info className="w-4 h-4 text-[#D49A63] shrink-0" /><span>La provenance de chaque image est indiquée quand elle est connue. Aucune image de remplacement n’est ajoutée à cette fiche.</span></div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#D49A63] font-semibold mb-2">{product.brand}{product.routineStep ? ` · ${product.routineStep}` : ''}</p>
              <h1 className="text-3xl sm:text-5xl font-serif-title font-bold leading-tight mb-3">{product.name}</h1>
              {product.benefitPrimary && <p className="text-lg text-[#D49A63]">{product.benefitPrimary}</p>}
              <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
                <span className={`px-2.5 py-1 rounded-full border ${effectiveInStock ? (isPreorder ? 'text-amber-300 border-amber-400/30 bg-amber-900/20' : 'text-emerald-300 border-emerald-400/30 bg-emerald-900/20') : 'text-rose-300 border-rose-400/30 bg-rose-900/20'}`}>
                  {effectiveInStock ? (isPreorder ? 'En précommande' : 'Disponible') : 'Indisponible pour cette option'}
                </span>
                {isPreorder && effectiveInStock && (
                  <span className="px-2.5 py-1 rounded-full border border-amber-400/20 bg-amber-900/10 text-amber-200/90 text-[11px]">{DISPATCH_SHORT}</span>
                )}
                {trust.verifiedReviewCount > 0 && <span className="flex items-center gap-1 text-amber-300"><Star className="w-3.5 h-3.5 fill-current" /> {(trust.reviews.reduce((sum, review) => sum + review.rating, 0) / trust.reviews.length).toFixed(1)} · {trust.verifiedReviewCount} avis vérifiés</span>}
              </div>
            </div>

            <p className="text-sm text-[#FFF7EF]/78 leading-relaxed">{valueOrMissing(product.description)}</p>

            {variants.length > 0 && <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#1A0F0A] p-4"><h2 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-3">Choisir une variante</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{variants.map(variant => <button key={variant.id} onClick={() => setSelectedVariantId(variant.id)} className={`p-3 rounded-xl border text-left ${variant.id === selectedVariantId ? 'border-[#C8753D] bg-[#C8753D]/15' : 'border-[#FFF7EF]/10 bg-black/10'} ${!variant.inStock ? 'opacity-50' : ''}`}><span className="block text-sm font-semibold">{variant.label}</span><span className="text-xs text-[#FFF7EF]/60">{variant.price.toFixed(2)} € · {variant.inStock ? (isPreorder ? 'En précommande' : 'En stock') : 'Indisponible'}</span></button>)}</div></section>}

            <ProductComplianceBanner
              productId={product.id}
              country={country}
              onVerdictChange={sellable => setSellableInCountry(sellable)}
            />

            <div className="rounded-2xl border border-[#FFF7EF]/10 bg-[#1A0F0A] p-5 flex flex-wrap items-center justify-between gap-4"><div><span className="text-3xl font-bold">{effectivePrice.toFixed(2)} €</span><span className="block text-[11px] text-[#FFF7EF]/50">Prix affiché avant les frais de livraison</span></div><button onClick={handleAdd} disabled={!effectiveInStock || !sellableInCountry} className="px-7 py-3 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"><ShoppingBag className="w-4 h-4" />{!sellableInCountry ? 'Non commercialisable ici' : effectiveInStock ? (isPreorder ? 'Précommander' : 'Ajouter au panier') : 'Indisponible'}</button></div>

            {/* Bande de garanties — lève les freins à la précommande. Honnête :
                ce sont de vrais engagements (CGV), pas des logos décoratifs. */}
            <TrustGuarantees isPreorder={product.isPreorder === true} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard title="Bénéfice & cible" icon={<CheckCircle2 className="w-4 h-4 text-emerald-300" />}><p>{valueOrMissing(product.benefitPrimary)}</p><p className="mt-2">{targetTypes.length ? targetTypes.join(' · ') : valueOrMissing(product.forWho)}</p></InfoCard>
              <InfoCard title="Pas idéal si…" icon={<AlertCircle className="w-4 h-4 text-amber-300" />}><p>{valueOrMissing(product.notIdealIf)}</p></InfoCard>
              <InfoCard title="Texture, parfum & usage" icon={<RefreshCw className="w-4 h-4 text-[#D49A63]" />}><p>Texture : {valueOrMissing(product.texture)}</p><p>Parfum : {valueOrMissing(product.fragrance)}</p><p>Fréquence : {valueOrMissing(product.usageFrequency)}</p><p>Mode d’emploi : {valueOrMissing(product.howToUse)}</p>{TOOL_BY_PRODUCT_SLUG.has(product.slug) && <a href={`/outils#${TOOL_BY_PRODUCT_SLUG.get(product.slug)!.id}`} className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-[#D49A63] hover:underline">Guide d’utilisation complet de cet outil →</a>}</InfoCard>
              <InfoCard title="Format & rendement" icon={<PackageCheck className="w-4 h-4 text-[#D49A63]" />}><p>Format : {valueOrMissing(product.sizeLabel)}</p><p>Rendement estimé : {valueOrMissing(product.estimatedYield)}</p></InfoCard>
            </div>

            <section className="rounded-2xl border border-[#D49A63]/30 bg-[#D49A63]/10 p-4 text-xs text-[#FFF7EF]/80">
              <h2 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Public concerné & précautions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <p><strong className="text-[#FFF7EF]">Âge recommandé</strong><br />{product.recommendedAgeBand && product.recommendedAgeBand !== 'not_provided' ? `${ageBandLabel(product.recommendedAgeBand)}${product.recommendedAgeMin !== undefined ? ` · dès ${product.recommendedAgeMin} ans` : ''}${product.recommendedAgeMax !== undefined ? ` · jusqu’à ${product.recommendedAgeMax} ans` : ''}` : missing}</p>
                <p><strong className="text-[#FFF7EF]">Sécurité mineur</strong><br />{product.minorSafetyStatus === 'verified' ? 'Vérifiée' : product.minorSafetyStatus === 'pending' ? 'En cours de vérification' : 'Non renseignée'}</p>
                <p><strong className="text-[#FFF7EF]">Actifs réservés aux adultes</strong><br />{product.adultOnlyActives?.length ? `Présents : ${product.adultOnlyActives.join(' · ')}` : 'Non signalés dans la fiche'}</p>
                <p><strong className="text-[#FFF7EF]">Supervision parentale</strong><br />{product.parentalSupervisionRequired ? 'Requise' : 'Non indiquée'}</p>
                <p><strong className="text-[#FFF7EF]">Visuel pour mineur</strong><br />{product.imageSupervisionStatus === 'verified' ? 'Validé' : product.imageSupervisionStatus === 'pending' ? 'À valider' : 'Non renseigné'}</p>
              </div>
              {product.audienceTags?.length ? <p className="mt-3 text-[#FFF7EF]/60">Publics documentés : {product.audienceTags.join(' · ')}</p> : null}
            </section>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
          <section className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6"><SectionTitle icon={<ShieldCheck className="w-5 h-5" />} title="Composition complète" />{linkedIngredients.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-3">Ingrédients reliés au référentiel</h3>
              <div className="flex flex-wrap gap-2">
                {linkedIngredients.map((entry, idx) => {
                  if (!entry.resolved || !entry.inciName) return null;
                  return (
                    <a
                      key={`${entry.ingredientId}-${idx}`}
                      href={`/ingredient/${entry.ingredientId}`}
                      title={entry.functions.length ? entry.functions.join(', ') : undefined}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors hover:border-[#C8753D]/60 ${entry.isKeyIngredient ? 'bg-[#C8753D]/15 border-[#C8753D]/40 text-[#FFF7EF]' : 'bg-[#050403] border-[#FFF7EF]/15 text-[#FFF7EF]/85'}`}
                    >
                      {entry.isKeyIngredient && <Star className="w-3 h-3 text-[#D49A63]" />}
                      {entry.inciName}
                      {entry.isAllergenRegulated && <AlertTriangle className="w-3 h-3 text-amber-400" aria-label="Allergène à déclarer" />}
                      {entry.isFragrance && <span className="text-[#FFF7EF]/40">· parfum</span>}
                    </a>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#FFF7EF]/50 mt-2">Touchez un ingrédient pour voir sa fiche (fonctions CosIng, restrictions UE, allergènes). L’étoile marque un ingrédient clé.</p>
            </div>
          )}<h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-2">INCI</h3><p className="text-sm leading-relaxed text-[#FFF7EF]/80 break-words">{valueOrMissing(product.inci)}</p><h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mt-6 mb-2">Rôle des ingrédients principaux</h3>{product.ingredientRoles?.length ? <ul className="space-y-2">{product.ingredientRoles.map((item, index) => <li key={`${item.name}-${index}`} className="text-xs text-[#FFF7EF]/75"><strong className="text-[#FFF7EF]">{item.name}</strong> · {item.role}</li>)}</ul> : <p className="text-xs text-[#FFF7EF]/60">{missing}</p>}<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"><div><strong className="text-[#FFF7EF]">Allergènes déclarés</strong><p className="text-[#FFF7EF]/65 mt-1">{product.allergens?.length ? product.allergens.join(', ') : missing}</p></div><div><strong className="text-[#FFF7EF]">Parfum</strong><p className="text-[#FFF7EF]/65 mt-1">{product.containsFragrance === undefined ? missing : product.containsFragrance ? 'Présent' : 'Non ajouté'}</p></div></div></section>

          <section className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6"><SectionTitle icon={<Globe2 className="w-5 h-5" />} title="Origine, certifications & livraison" /><div className="space-y-4 text-sm"><div><span className="text-xs text-[#FFF7EF]/50 block">Pays d’origine</span><span>{valueOrMissing(product.originCountry)}</span></div><div><span className="text-xs text-[#FFF7EF]/50 block mb-2">Certifications vérifiables</span>{certifications.length ? <div className="space-y-2">{certifications.map((cert, index) => <div key={`${cert.name}-${index}`} className="rounded-xl border border-[#FFF7EF]/10 p-3"><div className="flex justify-between gap-2"><span>{cert.name}</span><span className={`text-[10px] ${cert.status === 'verified' ? 'text-emerald-300' : 'text-amber-300'}`}>{cert.status === 'verified' ? 'Vérifiée' : 'À vérifier'}</span></div>{cert.verificationUrl && cert.status === 'verified' ? <a className="text-xs text-[#D49A63] hover:underline" href={cert.verificationUrl} target="_blank" rel="noreferrer">Voir la preuve</a> : <p className="text-[10px] text-[#FFF7EF]/50 mt-1">Preuve publique non renseignée</p>}</div>)}</div> : <p className="text-xs text-[#FFF7EF]/60">{missing}</p>}</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><span className="text-xs text-[#FFF7EF]/50 block">Pays livrés</span><span>{availableCountries.length ? availableCountries.join(', ') : missing}</span></div><div><span className="text-xs text-[#FFF7EF]/50 block">Délai indicatif</span><span>{valueOrMissing(shipping.deliveryEstimate)}</span></div></div><div><span className="text-xs text-[#FFF7EF]/50 block">Frais</span><span>{shipping.deliveryFee === undefined ? missing : `${shipping.deliveryFee.toFixed(2)} €`}</span></div><div><span className="text-xs text-[#FFF7EF]/50 block">Retours</span><span>{valueOrMissing(shipping.returnsPolicy || product.returnsPolicy)}</span></div></div></section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <section id="avis" className="scroll-mt-28 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6"><div className="flex items-center justify-between gap-3 mb-4"><SectionTitle icon={<Star className="w-5 h-5" />} title="Avis vérifiés" /><span className="text-xs text-[#FFF7EF]/50">{trustLoading ? 'Chargement…' : `${trust.verifiedReviewCount} avis`}</span></div>{trust.reviews.length ? <div className="space-y-3">{trust.reviews.map(review => <div key={review.id}><ReviewCard review={review} /></div>)}</div> : <p className="text-sm text-[#FFF7EF]/60">Aucun avis vérifié publié pour le moment.</p>}{user && <div className="mt-6 pt-5 border-t border-[#FFF7EF]/10 space-y-2"><p className="text-xs text-[#D49A63] font-semibold">Vous avez acheté ce produit ? Déposez un avis.</p><input value={reviewTitle} onChange={event => setReviewTitle(event.target.value)} placeholder="Titre facultatif" className="w-full rounded-xl border border-[#FFF7EF]/15 bg-black/20 px-3 py-2 text-xs text-[#FFF7EF] placeholder:text-[#FFF7EF]/35 focus:border-[#C8753D] focus:outline-none" /><div className="flex gap-1">{[1, 2, 3, 4, 5].map(value => <button key={value} onClick={() => setReviewRating(value)} aria-label={`${value} étoiles`}><Star className={`w-5 h-5 ${value <= reviewRating ? 'text-amber-300 fill-current' : 'text-[#FFF7EF]/30'}`} /></button>)}</div><textarea value={reviewComment} onChange={event => setReviewComment(event.target.value)} placeholder="Votre expérience après utilisation" rows={3} className="w-full rounded-xl border border-[#FFF7EF]/15 bg-black/20 px-3 py-2 text-xs text-[#FFF7EF] placeholder:text-[#FFF7EF]/35 focus:border-[#C8753D] focus:outline-none resize-none" /><button disabled={busy || !reviewComment.trim()} onClick={() => withAction(() => submitProductReview(product.id, { rating: reviewRating, title: reviewTitle, comment: reviewComment, variantId: selectedVariant?.id }, session?.access_token))} className="inline-flex items-center gap-2 rounded-full bg-[#C8753D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"><Send className="w-3.5 h-3.5" /> Envoyer pour modération</button></div>}</section>

          <section className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6"><div className="flex items-center justify-between gap-3 mb-4"><SectionTitle icon={<Mail className="w-5 h-5" />} title="Questions & réponses" /><span className="text-xs text-[#FFF7EF]/50">{trust.questionsCount} réponse(s)</span></div>{trust.questions.length ? <div className="space-y-3">{trust.questions.map(item => <div key={item.id} className="rounded-xl border border-[#FFF7EF]/10 p-3"><p className="text-xs font-semibold">Q. {item.question}</p>{item.answer && <p className="text-xs text-[#FFF7EF]/70 mt-2">R. {item.answer}</p>}</div>)}</div> : <p className="text-sm text-[#FFF7EF]/60">Aucune question publiée pour le moment.</p>}{user ? <div className="mt-6 pt-5 border-t border-[#FFF7EF]/10 space-y-2"><textarea value={question} onChange={event => setQuestion(event.target.value)} placeholder="Posez une question sur la formule, l’usage ou la livraison" rows={3} className="w-full rounded-xl border border-[#FFF7EF]/15 bg-black/20 px-3 py-2 text-xs text-[#FFF7EF] placeholder:text-[#FFF7EF]/35 focus:border-[#C8753D] focus:outline-none resize-none" /><button disabled={busy || question.trim().length < 5} onClick={() => withAction(() => askProductQuestion(product.id, question, session?.access_token))} className="inline-flex items-center gap-2 rounded-full bg-[#C8753D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"><Send className="w-3.5 h-3.5" /> Poser ma question</button></div> : <p className="mt-5 text-xs text-[#FFF7EF]/60">Connectez-vous pour poser une question à l’équipe.</p>}</section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <ArchetypeRatingsPanel productId={product.id} />
          <ProductVerificationPanel productIdOrSlug={product.slug || product.id} />
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {!effectiveInStock && <div className="rounded-3xl bg-[#1A0F0A] border border-amber-400/20 p-6"><SectionTitle icon={<Clock className="w-5 h-5" />} title="Être prévenu du retour" /><p className="text-xs text-[#FFF7EF]/65 mb-4">Indiquez votre pays pour recevoir une alerte uniquement lorsque cette option est réellement disponible.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><input value={waitlistEmail} onChange={event => setWaitlistEmail(event.target.value)} type="email" placeholder="votre@email.com" className="w-full rounded-xl border border-[#FFF7EF]/15 bg-black/20 px-3 py-2 text-xs text-[#FFF7EF] placeholder:text-[#FFF7EF]/35 focus:border-[#C8753D] focus:outline-none" /><select value={country} onChange={event => setCountry(event.target.value)} className="w-full rounded-xl border border-[#FFF7EF]/15 bg-black/20 px-3 py-2 text-xs text-[#FFF7EF] placeholder:text-[#FFF7EF]/35 focus:border-[#C8753D] focus:outline-none">{(availableCountries.length ? availableCountries : ['FR']).map(item => <option key={item} value={item}>{item}</option>)}</select></div><button disabled={busy || !waitlistEmail} onClick={() => withAction(() => joinProductWaitlist(product.id, { email: waitlistEmail, country, variantId: selectedVariant?.id }, session?.access_token))} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#C8753D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"><Mail className="w-3.5 h-3.5" /> M’inscrire à la liste d’attente</button></div>}
          <div className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6"><SectionTitle icon={<RefreshCw className="w-5 h-5" />} title="Réassort automatique" /><p className="text-xs text-[#FFF7EF]/65 mb-4">Optionnel. Une demande est enregistrée, puis confirmée avant tout prélèvement récurrent.</p>{user ? <div className="flex flex-wrap gap-2"><select value={frequency} onChange={event => setFrequency(event.target.value as typeof frequency)} className="flex-1 min-w-[170px] rounded-xl border border-[#FFF7EF]/15 bg-black/20 px-3 py-2 text-xs text-[#FFF7EF] focus:border-[#C8753D] focus:outline-none"><option value="30_days">Tous les 30 jours</option><option value="45_days">Tous les 45 jours</option><option value="60_days">Tous les 60 jours</option><option value="90_days">Tous les 90 jours</option></select><button disabled={busy || !effectiveInStock || !sellableInCountry} onClick={() => withAction(() => createProductSubscription(product.id, { frequency, quantity: 1, country, variantId: selectedVariant?.id }, session?.access_token))} className="inline-flex items-center gap-2 rounded-full bg-[#C8753D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"><RefreshCw className="w-3.5 h-3.5" /> Demander ce réassort</button></div> : <p className="text-xs text-[#FFF7EF]/60">Connectez-vous pour activer cette option.</p>}</div>
        </section>

        <div className="mt-8 rounded-2xl border border-[#FFF7EF]/10 bg-[#1A0F0A]/70 p-4 text-xs text-[#FFF7EF]/65 flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" /><span>Les avis sont marqués « achat vérifié » uniquement après contrôle d’une commande réglée. Les recommandations beauté ne constituent pas un avis médical.</span></div>
      </div>
    </div>
  );
};

function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-4 text-xs text-[#FFF7EF]/75 leading-relaxed"><h2 className="text-xs uppercase tracking-wider font-bold text-[#D49A63] flex items-center gap-2 mb-2">{icon}{title}</h2>{children}</div>;
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <h2 className="text-xl font-serif-title font-bold flex items-center gap-2 mb-4">{icon}<span>{title}</span></h2>;
}

/**
 * Bande de garanties affichée sous le bouton d'achat. Chaque point correspond à
 * un engagement réel (CGV / processus) : rien de décoratif. En précommande, le
 * premier argument devient l'annulation/remboursement avant expédition.
 */
function TrustGuarantees({ isPreorder }: { isPreorder: boolean }) {
  const items: { icon: React.ReactNode; title: string; body: string }[] = isPreorder
    ? [
        { icon: <RotateCcw className="w-4 h-4" />, title: 'Précommande sans risque', body: 'Annulable et remboursable à tout moment avant expédition.' },
        { icon: <BadgeCheck className="w-4 h-4" />, title: '14 jours pour changer d’avis', body: 'Rétractation après réception, conformément aux CGV.' },
        { icon: <Lock className="w-4 h-4" />, title: 'Paiement sécurisé', body: 'Encaissement via Stripe. Aucune carte n’est stockée par KURLA.' },
        { icon: <Truck className="w-4 h-4" />, title: DISPATCH_SHORT, body: `Suivi communiqué par email. Livraison en France et UE. ${DISPATCH_LEGAL}` },
      ]
    : [
        { icon: <RotateCcw className="w-4 h-4" />, title: '14 jours pour changer d’avis', body: 'Rétractation et retour selon les CGV.' },
        { icon: <BadgeCheck className="w-4 h-4" />, title: 'Avis 100 % vérifiés', body: 'Seuls les acheteurs peuvent déposer un avis, modéré avant publication.' },
        { icon: <Lock className="w-4 h-4" />, title: 'Paiement sécurisé', body: 'Encaissement via Stripe. Aucune carte n’est stockée par KURLA.' },
        { icon: <CreditCard className="w-4 h-4" />, title: 'Livraison suivie UE', body: 'France et plusieurs pays européens, frais calculés avant paiement.' },
      ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-[#FFF7EF]/10 bg-[#1A0F0A] p-3.5">
          <span className="mt-0.5 text-emerald-300 shrink-0">{item.icon}</span>
          <div>
            <p className="text-xs font-semibold text-[#FFF7EF]">{item.title}</p>
            <p className="text-[11px] text-[#FFF7EF]/55 leading-snug mt-0.5">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
