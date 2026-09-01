import React, { useEffect, useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Loader2, AlertTriangle, RotateCcw, ExternalLink } from 'lucide-react';
import { CartItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { calculateShippingCents, getShippingOption, normalizeShippingAddress, SHIPPING_OPTIONS, ShippingMethod } from '../lib/shippingRules';
import { computeOrderVat, formatVatRate } from '../lib/vat';
import { formatMoney, toCents } from '../lib/currency';
import { useI18n } from '../lib/I18nProvider';

interface CartDrawerProps {
  isOpen: boolean;
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
  onCheckout
}) => {
  const { user, session } = useAuth();
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

  if (!isOpen) return null;

  const { locale } = useI18n();
  const total = items.reduce((sum, item) => sum + unitPrice(item) * item.quantity, 0);
  const allItemsPreorder = items.length > 0 && items.every(item => (item.product as any).isPreorder === true);
  const subtotalCents = Math.round(total * 100);
  const shippingOption = getShippingOption(shippingAddress.country);
  const shippingCents = shippingOption ? calculateShippingCents(subtotalCents, shippingAddress.country, shippingMethod) : 0;
  const orderTotalCents = subtotalCents + shippingCents;

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
          shippingMethod
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
        className="absolute inset-0 bg-[#050403]/80 backdrop-blur-sm"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="relative w-full max-w-md bg-[#1A0F0A] border-l border-[#FFF7EF]/10 h-full flex flex-col justify-between p-6 z-10 shadow-2xl overflow-y-auto"
      >

        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#FFF7EF]/10 mb-6">
            <div className="flex items-center gap-2 text-[#FFF7EF]">
              <ShoppingBag className="w-5 h-5 text-[#C8753D]" />
              <h3 id="cart-drawer-title" className="text-lg font-serif-title font-bold">Ton Panier KURLA</h3>
              <span className="text-xs text-[#D49A63]">({items.reduce((acc, i) => acc + i.quantity, 0)})</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Fermer le panier"
              className="p-2 rounded-full text-[#FFF7EF]/60 hover:text-[#FFF7EF] hover:bg-[#FFF7EF]/10 transition-colors"
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
            <div className="mb-4 p-4 rounded-2xl bg-[#1D170E] border border-[#C8753D]/50 text-center space-y-3 shadow-xl">
              <div className="flex items-center justify-center gap-2 text-[#D49A63] font-semibold text-xs">
                <ExternalLink className="w-4 h-4 text-[#C8753D]" />
                <span>Session Stripe prête</span>
              </div>
              <p className="text-xs text-[#FFF7EF]/80 font-light">
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
              <div className="w-16 h-16 rounded-full bg-[#050403] text-[#C8753D] flex items-center justify-center mx-auto text-2xl border border-[#FFF7EF]/10">
                🛍️
              </div>
              <p className="text-sm text-[#FFF7EF]/70 font-light">Ton panier est vide pour le moment.</p>
              <a
                href="/boutique"
                onClick={onClose}
                className="inline-block px-6 py-2.5 rounded-full bg-[#C8753D] text-white text-xs font-semibold"
              >
                Explorer la boutique
              </a>
            </div>
          ) : (
            <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={`${item.product.id}:${item.variantId || ''}`}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-[#050403]/80 border border-[#FFF7EF]/10"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-serif-title font-bold text-[#FFF7EF] truncate">
                      {item.product.name}
                    </h4>
                    {(item.product as any).isPreorder && (
                      <p className="text-[10px] text-emerald-400 font-semibold">Précommande · expédiée à la réception du lot</p>
                    )}
                    <p className="text-[11px] text-[#D49A63] font-medium">{unitPrice(item).toFixed(2)} €{item.variantLabel ? ` · ${item.variantLabel}` : ''}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-[#FFF7EF]/20 rounded-lg bg-[#1A0F0A]">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1, item.variantId)}
                          disabled={isCheckoutLoading}
                          className="px-2 py-0.5 text-xs text-[#FFF7EF]/70 hover:text-[#FFF7EF] disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-bold text-[#FFF7EF]">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.variantId)}
                          disabled={isCheckoutLoading}
                          className="px-2 py-0.5 text-xs text-[#FFF7EF]/70 hover:text-[#FFF7EF] disabled:opacity-50"
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

        {/* Footer Checkout Summary */}
        {items.length > 0 && (
          <div className="pt-6 border-t border-[#FFF7EF]/10 space-y-4">
            {!user && (
              <div>
                <label htmlFor="guest-checkout-email" className="block text-xs font-semibold text-[#FFF7EF] mb-1.5">
                  Email de confirmation
                </label>
                <input
                  id="guest-checkout-email"
                  type="email"
                  value={guestEmail}
                  onChange={event => setGuestEmail(event.target.value)}
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-sm text-[#FFF7EF] placeholder-[#FFF7EF]/40 focus:outline-none focus:border-[#C8753D]"
                />
                <p className="mt-1.5 text-[11px] text-[#FFF7EF]/60">Votre reçu et le suivi de commande seront envoyés à cette adresse.</p>
              </div>
            )}

            <div className="pt-2 border-t border-[#FFF7EF]/10 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-[#FFF7EF]">Adresse de livraison</h4>
                <p className="mt-1 text-[11px] text-[#FFF7EF]/60">Livraison disponible pour le moment en France et dans plusieurs pays de l’Union européenne.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  aria-label="Nom complet de livraison"
                  value={shippingAddress.fullName}
                  onChange={event => setShippingAddress(prev => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Nom complet"
                  autoComplete="name"
                  className="sm:col-span-2 w-full px-3 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] placeholder-[#FFF7EF]/40 focus:outline-none focus:border-[#C8753D]"
                />
                <input
                  aria-label="Adresse"
                  value={shippingAddress.street}
                  onChange={event => setShippingAddress(prev => ({ ...prev, street: event.target.value }))}
                  placeholder="Adresse et numéro"
                  autoComplete="street-address"
                  className="sm:col-span-2 w-full px-3 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] placeholder-[#FFF7EF]/40 focus:outline-none focus:border-[#C8753D]"
                />
                <input
                  aria-label="Ville"
                  value={shippingAddress.city}
                  onChange={event => setShippingAddress(prev => ({ ...prev, city: event.target.value }))}
                  placeholder="Ville"
                  autoComplete="address-level2"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] placeholder-[#FFF7EF]/40 focus:outline-none focus:border-[#C8753D]"
                />
                <input
                  aria-label="Code postal"
                  value={shippingAddress.postalCode}
                  onChange={event => setShippingAddress(prev => ({ ...prev, postalCode: event.target.value }))}
                  placeholder="Code postal"
                  autoComplete="postal-code"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] placeholder-[#FFF7EF]/40 focus:outline-none focus:border-[#C8753D]"
                />
                <select
                  aria-label="Pays de livraison"
                  value={shippingAddress.country}
                  onChange={event => setShippingAddress(prev => ({ ...prev, country: event.target.value }))}
                  autoComplete="country"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] focus:outline-none focus:border-[#C8753D]"
                >
                  {SHIPPING_OPTIONS.map(option => <option key={option.country} value={option.country}>{option.label}</option>)}
                </select>
                <input
                  aria-label="Téléphone de livraison facultatif"
                  value={shippingAddress.phone}
                  onChange={event => setShippingAddress(prev => ({ ...prev, phone: event.target.value }))}
                  placeholder="Téléphone (facultatif)"
                  autoComplete="tel"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] placeholder-[#FFF7EF]/40 focus:outline-none focus:border-[#C8753D]"
                />
              </div>
              <label className="block text-xs text-[#FFF7EF]/80">
                Mode de livraison
                <select
                  value={shippingMethod}
                  onChange={event => setShippingMethod(event.target.value as ShippingMethod)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] focus:outline-none focus:border-[#C8753D]"
                >
                  <option value="standard">Standard — {shippingOption?.freeFromCents && subtotalCents >= shippingOption.freeFromCents ? 'offerte' : `${(shippingOption?.standardCents || 0) / 100} €`} — {shippingOption?.estimatedStandardDays}</option>
                  <option value="express">Express — {((shippingOption?.expressCents || 0) / 100).toFixed(2)} € — {shippingOption?.estimatedExpressDays}</option>
                </select>
              </label>
            </div>

            <div className="flex justify-between text-sm text-[#FFF7EF]">
              <span className="text-[#FFF7EF]/70">Sous-total :</span>
              <span>{formatMoney(subtotalCents, locale)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#FFF7EF]">
              <span className="text-[#FFF7EF]/70">Livraison :</span>
              <span>{formatMoney(shippingCents, locale)}</span>
            </div>
            <div className="flex justify-between text-base text-[#FFF7EF] border-t border-[#FFF7EF]/10 pt-3">
              <span className="font-semibold">Total estimé :</span>
              <span className="font-bold">{formatMoney(orderTotalCents, locale)}</span>
            </div>
            {vatPreview && (
              <div className="flex justify-between text-[11px] text-[#FFF7EF]/60">
                <span>dont TVA ({formatVatRate(vatPreview.ratePercent ?? 0)} · {vatPreview.country}) :</span>
                <span>{formatMoney(vatPreview.totalVatCents, locale)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Total recalculé et vérifié côté serveur avant paiement
            </div>
            <button
              onClick={handleStartCheckout}
              disabled={isCheckoutLoading}
              className="w-full py-4 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] hover:from-[#b06330] hover:to-[#c8753d] text-white text-sm font-semibold tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCheckoutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Ouverture de Stripe Checkout...</span>
                </>
              ) : (
                <>
                  <span>{allItemsPreorder ? 'Précommander' : 'Commander maintenant'} ({formatMoney(orderTotalCents, locale)})</span>
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
