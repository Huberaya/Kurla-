import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Loader2, AlertTriangle, RotateCcw, ExternalLink } from 'lucide-react';
import { CartItem } from '../types';
import { useAuth } from '../context/AuthContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout?: () => void;
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

  if (!isOpen) return null;

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleStartCheckout = async () => {
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
        quantity: item.quantity
      }));

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          items: payloadItems,
          customerEmail: user?.email || 'client@kurla-beauty.com'
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

      if (!data.url.startsWith('https://checkout.stripe.com') && !data.url.startsWith('http')) {
        throw new Error("Format d'URL de paiement invalide renvoyé par le serveur.");
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
      <div className="relative w-full max-w-md bg-[#1A0F0A] border-l border-[#FFF7EF]/10 h-full flex flex-col justify-between p-6 z-10 shadow-2xl">

        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#FFF7EF]/10 mb-6">
            <div className="flex items-center gap-2 text-[#FFF7EF]">
              <ShoppingBag className="w-5 h-5 text-[#C8753D]" />
              <h3 className="text-lg font-serif-title font-bold">Ton Panier KURLA</h3>
              <span className="text-xs text-[#D49A63]">({items.reduce((acc, i) => acc + i.quantity, 0)})</span>
            </div>
            <button
              onClick={onClose}
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
                  key={item.product.id}
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
                    <p className="text-[11px] text-[#D49A63] font-medium">{item.product.price.toFixed(2)} €</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-[#FFF7EF]/20 rounded-lg bg-[#1A0F0A]">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          disabled={isCheckoutLoading}
                          className="px-2 py-0.5 text-xs text-[#FFF7EF]/70 hover:text-[#FFF7EF] disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-bold text-[#FFF7EF]">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          disabled={isCheckoutLoading}
                          className="px-2 py-0.5 text-xs text-[#FFF7EF]/70 hover:text-[#FFF7EF] disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => onRemoveItem(item.product.id)}
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
            <div className="flex justify-between text-sm text-[#FFF7EF]">
              <span className="text-[#FFF7EF]/70">Sous-total :</span>
              <span className="font-bold text-lg">{total.toFixed(2)} €</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Livraison suivie Europe & Paiement sécurisé Stripe
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
                  <span>Commander maintenant ({total.toFixed(2)} €)</span>
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
