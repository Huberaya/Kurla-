import React, { useEffect, useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Loader2, AlertTriangle, RotateCcw, ExternalLink, Check, Tag, Plus, Truck, Sparkles } from 'lucide-react';
import { CartItem, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { calculateShippingCents, getShippingOption, normalizeShippingAddress, SHIPPING_OPTIONS, ShippingMethod } from '../lib/shippingRules';
import { computeOrderVat, formatVatRate } from '../lib/vat';
import { analytics } from '../lib/analytics';
import { getOrderAttribution } from '../lib/attribution';
import { formatMoney, toCents } from '../lib/currency';
import { useI18n } from '../lib/I18nProvider';
import { DISPATCH_LEGAL, DISPATCH_SENTENCE, DISPATCH_SHORT, TOOL_DISPATCH_SHORT, TOOL_DISPATCH_SENTENCE, getCartDispatchSummary, isDropshipProduct } from '../lib/preorderPromise';
import { getNextBatchInfo, getNextBatchShortLabel } from '../lib/fulfillment';
import { recommendAddOns } from '../lib/launchCatalog';
import { useProducts } from '../services/productService';
import { getStoredReferralCode } from '../lib/referralCapture';

interface CartDrawerProps {
  isOpen: boolean;
  onAddItem?: (product: Product, variant?: unknown) => void;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  onRemoveItem: (productId: string, variantId?: string) => void;
  onCheckout?: () => void;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onAddItem,
  onCheckout
}) => {
  const { user, session } = useAuth();
  const { products } = useProducts();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState('');
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'FR',
    phone: ''
  });
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState(() => createIdempotencyKey());

  // ── Code promo ──
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCouponLoading, setIsCouponLoading] = useState(false);
  const [referralHint, setReferralHint] = useState<string | null>(null);

  // Pré-remplissage du code de parrainage capté à l'arrivée (?ref=…). On ne
  // l'applique pas automatiquement : la cliente voit la remise et la valide.
  useEffect(() => {
    if (isOpen && !appliedCoupon && !couponInput) {
      const ref = getStoredReferralCode();
      if (ref) {
        setCouponInput(ref);
        setReferralHint(ref);
      }
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || isCouponLoading) return;
    setIsCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          items: items.map(item => ({
            product_id: item.product.id,
            variant_id: item.variantId,
            quantity: item.quantity
          }))
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAppliedCoupon(null);
        setCouponError(data?.error || 'Code promo invalide.');
        return;
      }
      setAppliedCoupon({ code: data.code, discountAmount: Number(data.discountAmount) });
      setCouponError(null);
    } catch {
      setCouponError('Impossible de vérifier ce code pour le moment.');
    } finally {
      setIsCouponLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email && !guestEmail) setGuestEmail(user.email);
  }, [user?.email, guestEmail]);

  const unitPrice = (item: CartItem): number => {
    if (typeof item.unitPrice === 'number') return item.unitPrice;
    const variant = item.variantId && item.product.variants?.find(candidate => candidate.id === item.variantId);
    return variant?.price ?? item.product.price;
  };
  const cartSignature = items.map(item => `${item.product.id}:${item.variantId || ''}:${unitPrice(item)}:${item.quantity}`).join('|');
  useEffect(() => {
    // Keep the key stable while retrying the same checkout intent. A changed
    // cart starts a new intent and therefore receives a new key.
    setCheckoutIdempotencyKey(createIdempotencyKey());
    setStripeUrl(null);
  }, [cartSignature]);

  // ⚠️ Tous les hooks (useI18n, useMemo) doivent être appelés AVANT le
  // `return null` conditionnel : un hook placé après un retour anticipé
  // change le nombre de hooks entre le rendu « fermé » et le rendu « ouvert »
  // et fait planter React à l'ouverture du panier
  // (« Rendered more hooks than during the previous render »).
  const { locale } = useI18n();
  const total = items.reduce((sum, item) => sum + unitPrice(item) * item.quantity, 0);
  const hasDropshipItems = items.some(item => isDropshipProduct(item.product as any));
  const hasPreorderItems = items.some(item => !isDropshipProduct(item.product as any) && (item.product as any).isPreorder !== false);
  const allItemsPreorder = hasPreorderItems && !hasDropshipItems;
  const isMixedCart = hasPreorderItems && hasDropshipItems;
  const cartDispatchSummary = getCartDispatchSummary(items as any);
  const nextBatch = React.useMemo(() => getNextBatchInfo(new Date()), [items.length]);
  const nextBatchLabel = React.useMemo(() => getNextBatchShortLabel(new Date()), [items.length]);
  const subtotalCents = Math.round(total * 100);
  const shippingOption = getShippingOption(shippingAddress.country);
  const shippingCents = shippingOption ? calculateShippingCents(subtotalCents, shippingAddress.country, shippingMethod) : 0;
  const orderTotalCents = subtotalCents + shippingCents;

  // ── Add-ons de panier : cross-sell d'outils à forte marge + jauge livraison offerte ──
  const addOnData = React.useMemo(() => {
    if (!shippingOption?.freeFromCents || items.length === 0) return null;
    const cartLike = items.map(i => ({ id: i.product.id, price: unitPrice(i), category: i.product.category, inStock: i.product.inStock }));
    const rec = recommendAddOns(cartLike, products as unknown as { id: string; price: number; category?: string; inStock?: boolean }[], { freeFromCents: shippingOption.freeFromCents });
    const addOns = rec.addOnIds
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => !!p)
      .map(p => ({ product: p, crossesThreshold: p.id === rec.crossesId }));
    return { gapCents: rec.gapCents, freeShipUnlocked: rec.freeShipUnlocked, addOns };
  }, [products, items, shippingOption]);
  const discountCents = appliedCoupon ? Math.round(appliedCoupon.discountAmount * 100) : 0;
  // La remise porte sur les articles ; le total affiché ne descend jamais sous
  // 0 (le serveur plafonne déjà la remise au sous-total).
  const finalTotalCents = Math.max(0, orderTotalCents - discountCents);

  /**
   * Estimation de TVA au taux du pays de livraison. Le serveur recalcule tout
   * avant paiement : cette ligne informe, elle ne fait pas foi.
   */
  const vatPreview = React.useMemo(() => {
    if (!shippingOption || items.length === 0) return null;
    try {
      return computeOrderVat({
        lines: items.map(item => ({
          amountCents: toCents(unitPrice(item) * item.quantity),
          includesVat: (item.product as any)?.priceIncludesVat !== false
        })),
        shippingAmountCents: shippingCents,
        country: shippingAddress.country
      });
    } catch {
      // Pays non desservi ou montant invalide : on n'affiche rien plutôt qu'un
      // montant faux.
      return null;
    }
  }, [items, shippingOption, shippingCents, shippingAddress.country]);

  if (!isOpen) return null;

  const handleStartCheckout = async () => {
    const email = user?.email || guestEmail.trim();
    if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCheckoutError('Saisissez une adresse email valide pour recevoir votre confirmation de commande.');
      return;
    }

    try {
      normalizeShippingAddress(shippingAddress);
    } catch (error: any) {
      setCheckoutError(error?.message || 'Vérifiez votre adresse de livraison.');
      return;
    }

    setIsCheckoutLoading(true);
    setCheckoutError(null);
    setStripeUrl(null);

    let isTimedOut = false;
    const timeoutTimer = setTimeout(() => {
      isTimedOut = true;
      setIsCheckoutLoading(false);
      setCheckoutError("Le délai de création de la session Stripe a expiré (12s). Veuillez réessayer.");
    }, 12000);

    try {
      const payloadItems = items.map(item => ({
        product_id: item.product.id,
        variant_id: item.variantId,
        quantity: item.quantity
      }));

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': checkoutIdempotencyKey,
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          items: payloadItems,
          customerEmail: email,
          checkoutIdempotencyKey,
          shippingAddress,
          shippingMethod,
          attribution: getOrderAttribution(),
          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {})
        })
      });

      if (isTimedOut) return;
      clearTimeout(timeoutTimer);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Erreur serveur lors de la création du paiement (code ${res.status}).`);
      }

      if (!data.url || typeof data.url !== 'string') {
        throw new Error("L'URL de paiement Stripe est absente de la réponse du serveur.");
      }

      let checkoutUrl: URL;
      try {
        checkoutUrl = new URL(data.url);
      } catch {
        throw new Error("Format d'URL de paiement invalide renvoyé par le serveur.");
      }
      if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.stripe.com') {
        throw new Error("Domaine de paiement inattendu renvoyé par le serveur.");
      }

      setStripeUrl(data.url);
      setIsCheckoutLoading(false);

      if (onCheckout) {
        try { onCheckout(); } catch (e) {}
      }

      // Tunnel de paiement ouvert → événement conversion (GA4/Plausible si configurés).
      try { analytics.beginCheckout(finalTotalCents ? finalTotalCents / 100 : undefined); } catch (e) {}

      // Attempt automatic top-level redirect
      try {
        window.location.assign(data.url);
      } catch (e) {
        console.warn('Iframe redirect blocked or failed, displaying manual button:', e);
      }
    } catch (err: any) {
      if (!isTimedOut) {
        clearTimeout(timeoutTimer);
        setIsCheckoutLoading(false);
        setCheckoutError(err?.message || 'Une erreur est survenue lors de la création de la session de paiement.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-kurla-ink/80 backdrop-blur-sm"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="relative w-full max-w-md bg-kurla-espresso border-l border-kurla-cream/10 h-full flex flex-col justify-between p-6 z-10 shadow-2xl overflow-y-auto"
      >

        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-kurla-cream/10 mb-6">
            <div className="flex items-center gap-2 text-kurla-cream">
              <ShoppingBag className="w-5 h-5 text-kurla-copper" />
              <h3 id="cart-drawer-title" className="text-lg font-serif-title font-bold">Ton Panier KURLA</h3>
              <span className="text-xs text-kurla-amber">({items.reduce((acc, i) => acc + i.quantity, 0)})</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Fermer le panier"
              className="p-2 rounded-full text-kurla-cream/60 hover:text-kurla-cream hover:bg-kurla-cream/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Message if any */}
          {checkoutError && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs space-y-2.5 shadow-lg">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Erreur de paiement</span>
              </div>
              <p className="text-[11px] text-rose-300/90 leading-relaxed font-light">{checkoutError}</p>
              <button
                onClick={handleStartCheckout}
                className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Réessayer le paiement
              </button>
            </div>
          )}

          {/* Stripe Backup Direct Link Button */}
          {stripeUrl && (
            <div className="mb-4 p-4 rounded-2xl bg-[#1D170E] border border-kurla-copper/50 text-center space-y-3 shadow-xl">
              <div className="flex items-center justify-center gap-2 text-kurla-amber font-semibold text-xs">
                <ExternalLink className="w-4 h-4 text-kurla-copper" />
                <span>Session Stripe prête</span>
              </div>
              <p className="text-xs text-kurla-cream/80 font-light">
                Si la redirection vers Stripe ne s'ouvre pas automatiquement, cliquez ci-dessous :
              </p>
              <a
                href={stripeUrl}
                target="_top"
                rel="noopener noreferrer"
                onClick={() => {
                  try { window.open(stripeUrl, '_top'); } catch(e){}
                }}
                className="w-full py-3 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                Poursuivre le paiement sur Stripe <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Items List */}
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-kurla-ink text-kurla-copper flex items-center justify-center mx-auto text-2xl border border-kurla-cream/10">
                🛍️
              </div>
              <p className="text-sm text-kurla-cream/70 font-light">Ton panier est vide pour le moment.</p>
              <a
                href="/boutique"
                onClick={onClose}
                className="inline-block px-6 py-2.5 rounded-full bg-kurla-copper text-white text-xs font-semibold"
              >
                Explorer la boutique
              </a>
            </div>
          ) : (
            <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={`${item.product.id}:${item.variantId || ''}`}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-kurla-ink/80 border border-kurla-cream/10"
                >
                  <img loading="lazy" decoding="async"
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-serif-title font-bold text-kurla-cream truncate">
                      {item.product.name}
                    </h4>
                    {isDropshipProduct(item.product as any) ? (
                      <p className="text-[10px] text-emerald-300 font-semibold">{TOOL_DISPATCH_SHORT}</p>
                    ) : (
                      <p className="text-[10px] text-amber-300 font-semibold">Précommande · {DISPATCH_SHORT}</p>
                    )}
                    <p className="text-[11px] text-kurla-amber font-medium">{unitPrice(item).toFixed(2)} €{item.variantLabel ? ` · ${item.variantLabel}` : ''}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-kurla-cream/20 rounded-lg bg-kurla-espresso">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1, item.variantId)}
                          disabled={isCheckoutLoading}
                          className="px-2 py-0.5 text-xs text-kurla-cream/70 hover:text-kurla-cream disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-bold text-kurla-cream">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.variantId)}
                          disabled={isCheckoutLoading}
                          className="px-2 py-0.5 text-xs text-kurla-cream/70 hover:text-kurla-cream disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => onRemoveItem(item.product.id, item.variantId)}
                        disabled={isCheckoutLoading}
                        className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── ADD-ONS : jauge livraison offerte + outils à forte marge ── */}
        {addOnData && addOnData.addOns.length > 0 && (
          <div className="px-6 py-5 border-t border-kurla-cream/10 bg-[#0A0705]/60">
            {/* Jauge de livraison offerte */}
            {shippingOption?.freeFromCents && (
              <div className="mb-4">
                {addOnData.freeShipUnlocked ? (
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                    <Truck className="w-4 h-4" /> Livraison offerte débloquée !
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-kurla-cream/75 mb-2 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-kurla-amber" />
                      Plus que <b className="text-kurla-cream">{formatMoney(addOnData.gapCents)}</b> pour la <b className="text-kurla-amber">livraison offerte</b>
                    </p>
                    <div className="h-1.5 rounded-full bg-kurla-cream/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-kurla-copper to-kurla-amber transition-all"
                        style={{ width: `${Math.min(100, Math.round((subtotalCents / shippingOption.freeFromCents) * 100))}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-kurla-amber font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Complétez votre routine
            </p>
            <div className="space-y-2.5">
              {addOnData.addOns.map(({ product: p, crossesThreshold }) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border transition ${
                    crossesThreshold ? 'border-kurla-copper/50 bg-kurla-bark/50' : 'border-kurla-cream/10 bg-kurla-espresso/60'
                  }`}
                >
                  <img loading="lazy" src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-kurla-cream leading-tight line-clamp-2">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold text-kurla-amber">{p.price.toFixed(2)} €</span>
                      {crossesThreshold && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-kurla-copper/20 text-kurla-amber whitespace-nowrap">
                          Débloque la livraison offerte
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { onAddItem?.(p); try { analytics.addToCart(p.id, p.name, p.price, 1, 'cart_addon'); } catch { /* noop */ } }}
                    className="shrink-0 w-8 h-8 rounded-full bg-kurla-copper text-white flex items-center justify-center hover:bg-kurla-cocoa transition"
                    aria-label={`Ajouter ${p.name}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Checkout Summary */}
        {items.length > 0 && (
          <div className="pt-6 border-t border-kurla-cream/10 space-y-4">
            {!user && (
              <div>
                <label htmlFor="guest-checkout-email" className="block text-xs font-semibold text-kurla-cream mb-1.5">
                  Email de confirmation
                </label>
                <input
                  id="guest-checkout-email"
                  type="email"
                  value={guestEmail}
                  onChange={event => setGuestEmail(event.target.value)}
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-sm text-kurla-cream placeholder-kurla-cream/40 focus:outline-none focus:border-kurla-copper"
                />
                <p className="mt-1.5 text-[11px] text-kurla-cream/60">Votre reçu et le suivi de commande seront envoyés à cette adresse.</p>
              </div>
            )}

            <div className="pt-2 border-t border-kurla-cream/10 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-kurla-cream">Adresse de livraison</h4>
                <p className="mt-1 text-[11px] text-kurla-cream/60">Livraison disponible pour le moment en France et dans plusieurs pays de l’Union européenne.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  aria-label="Nom complet de livraison"
                  value={shippingAddress.fullName}
                  onChange={event => setShippingAddress(prev => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Nom complet"
                  autoComplete="name"
                  className="sm:col-span-2 w-full px-3 py-2.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream placeholder-kurla-cream/40 focus:outline-none focus:border-kurla-copper"
                />
                <input
                  aria-label="Adresse"
                  value={shippingAddress.street}
                  onChange={event => setShippingAddress(prev => ({ ...prev, street: event.target.value }))}
                  placeholder="Adresse et numéro"
                  autoComplete="street-address"
                  className="sm:col-span-2 w-full px-3 py-2.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream placeholder-kurla-cream/40 focus:outline-none focus:border-kurla-copper"
                />
                <input
                  aria-label="Ville"
                  value={shippingAddress.city}
                  onChange={event => setShippingAddress(prev => ({ ...prev, city: event.target.value }))}
                  placeholder="Ville"
                  autoComplete="address-level2"
                  className="w-full px-3 py-2.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream placeholder-kurla-cream/40 focus:outline-none focus:border-kurla-copper"
                />
                <input
                  aria-label="Code postal"
                  value={shippingAddress.postalCode}
                  onChange={event => setShippingAddress(prev => ({ ...prev, postalCode: event.target.value }))}
                  placeholder="Code postal"
                  autoComplete="postal-code"
                  className="w-full px-3 py-2.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream placeholder-kurla-cream/40 focus:outline-none focus:border-kurla-copper"
                />
                <select
                  aria-label="Pays de livraison"
                  value={shippingAddress.country}
                  onChange={event => setShippingAddress(prev => ({ ...prev, country: event.target.value }))}
                  autoComplete="country"
                  className="w-full px-3 py-2.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream focus:outline-none focus:border-kurla-copper"
                >
                  {SHIPPING_OPTIONS.map(option => <option key={option.country} value={option.country}>{option.label}</option>)}
                </select>
                <input
                  aria-label="Téléphone de livraison facultatif"
                  value={shippingAddress.phone}
                  onChange={event => setShippingAddress(prev => ({ ...prev, phone: event.target.value }))}
                  placeholder="Téléphone (facultatif)"
                  autoComplete="tel"
                  className="w-full px-3 py-2.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream placeholder-kurla-cream/40 focus:outline-none focus:border-kurla-copper"
                />
              </div>
              <label className="block text-xs text-kurla-cream/80">
                Mode de livraison
                <select
                  value={shippingMethod}
                  onChange={event => setShippingMethod(event.target.value as ShippingMethod)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream focus:outline-none focus:border-kurla-copper"
                >
                  <option value="standard">Standard — {shippingOption?.freeFromCents && subtotalCents >= shippingOption.freeFromCents ? 'offerte' : `${(shippingOption?.standardCents || 0) / 100} €`} — {shippingOption?.estimatedStandardDays}</option>
                  <option value="express">Express — {((shippingOption?.expressCents || 0) / 100).toFixed(2)} € — {shippingOption?.estimatedExpressDays}</option>
                </select>
              </label>
            </div>

            {/* Code promo */}
            <div className="space-y-1.5">
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-xs">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-emerald-300">{appliedCoupon.code}</span>
                    <span className="text-kurla-cream/60">−{formatMoney(discountCents, locale)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setAppliedCoupon(null); setCouponInput(''); }}
                    className="text-kurla-cream/50 hover:text-kurla-cream"
                    aria-label="Retirer le code promo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={event => setCouponInput(event.target.value.toUpperCase())}
                      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); applyCoupon(); } }}
                      placeholder="Code promo (ex : BIENVENUE15)"
                      className="flex-1 px-3 py-2.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs uppercase tracking-wide text-kurla-cream placeholder-kurla-cream/40 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-kurla-copper"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={isCouponLoading || !couponInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-kurla-copper hover:bg-kurla-cocoa disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap"
                    >
                      {isCouponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
                    </button>
                  </div>
                  {couponError && <p className="text-[11px] text-rose-400">{couponError}</p>}
                </>
              )}
            </div>

            <div className="flex justify-between text-sm text-kurla-cream">
              <span className="text-kurla-cream/70">Sous-total :</span>
              <span>{formatMoney(subtotalCents, locale)}</span>
            </div>
            <div className="flex justify-between text-sm text-kurla-cream">
              <span className="text-kurla-cream/70">Livraison :</span>
              <span>{formatMoney(shippingCents, locale)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-sm text-emerald-300">
                <span>Remise {appliedCoupon?.code} :</span>
                <span>−{formatMoney(discountCents, locale)}</span>
              </div>
            )}
            <div className="flex justify-between text-base text-kurla-cream border-t border-kurla-cream/10 pt-3">
              <span className="font-semibold">Total estimé :</span>
              <span className="font-bold">{formatMoney(finalTotalCents, locale)}</span>
            </div>
            {vatPreview && (
              <div className="flex justify-between text-[11px] text-kurla-cream/60">
                <span>dont TVA ({formatVatRate(vatPreview.ratePercent ?? 0)} · {vatPreview.country}) :</span>
                <span>{formatMoney(vatPreview.totalVatCents, locale)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Total recalculé et vérifié côté serveur avant paiement
            </div>
            <p className="text-[10px] leading-relaxed text-kurla-cream/50">
              Aperçu catalogue indicatif : le serveur revalide les lignes, les prix, le stock et l’éligibilité avant de créer le paiement.
            </p>

            {/* Informations précontractuelles précommande + CGV — C1 : petite production hebdomadaire explicite */}
            <div className="rounded-2xl bg-kurla-ink/60 border border-kurla-cream/10 p-3 text-[10.5px] leading-relaxed text-kurla-cream/65 space-y-1.5">
              {items.length > 0 && (
                <p>
                  <span className="text-emerald-300 font-semibold">{hasDropshipItems && !hasPreorderItems ? 'Stock partenaire :' : isMixedCart ? 'Panier mixte :' : 'Précommande :'}</span> {cartDispatchSummary} Vous
                  pouvez annuler et être remboursé·e à tout moment avant expédition, et vous disposez de 14 jours
                  après réception pour vous rétracter.{' '}
                  <span className="text-kurla-cream/55">{DISPATCH_LEGAL}</span>
                </p>
              )}
              {items.length > 0 && (hasPreorderItems || isMixedCart) && (
                <div className="space-y-1.5">
                  <p className="flex items-start gap-1.5 text-amber-200/90 bg-amber-500/10 border border-amber-500/15 rounded-xl px-2.5 py-1.5">
                    <span className="mt-0.5">⏱</span>
                    <span><strong>Commande groupée</strong> — expédition au <strong>prochain batch</strong> : {nextBatchLabel}. Via 3PL IDF, suivi par email dès remise transporteur.</span>
                  </p>
                  <p className="text-[11px] text-kurla-cream/50 pl-1">Petite production hebdomadaire (lun & jeu 18h). 60% expédiés en 24–48h via tampon si disponible. Si délai &gt;5j → info + remboursement immédiat sur demande.</p>
                </div>
              )}
              <p>
                En validant, vous acceptez nos{' '}
                <a href="/cgv" target="_blank" rel="noopener noreferrer" className="text-kurla-amber underline hover:text-[#F3C9A4]">
                  conditions générales de vente
                </a>{' '}
                (prix TTC, frais de livraison et délais affichés avant paiement).
              </p>
            </div>

            {(hasPreorderItems || isMixedCart) && (
              <p className="text-[11px] text-kurla-cream/60 text-center -mb-1">En validant, ta commande est <strong className="text-kurla-cream">réservée</strong> et part au <strong className="text-amber-300">{nextBatch.closeDay} 18h → expédition {nextBatch.shipDay}</strong> (batch {nextBatch.batchId === 'batch-lun' ? 'lundi' : 'jeudi'}).</p>
            )}
            <button
              onClick={handleStartCheckout}
              disabled={isCheckoutLoading}
              className="w-full py-4 rounded-full bg-gradient-to-r from-kurla-copper to-kurla-amber hover:from-kurla-cocoa hover:to-kurla-copper text-white text-sm font-semibold tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCheckoutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Ouverture de Stripe Checkout...</span>
                </>
              ) : (
                <>
                  <span>{(hasPreorderItems || allItemsPreorder) ? 'Précommander' : 'Commander maintenant'} ({formatMoney(finalTotalCents, locale)})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
