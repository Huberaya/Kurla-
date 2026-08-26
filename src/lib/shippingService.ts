/**
 * KURLA BEAUTY - INTERCHANGEABLE SHIPPING SERVICE
 * Supports manual provider (SHIPPING_PROVIDER=manual) and carrier integrations.
 */

export type ShippingCarrier = 'manual' | 'colissimo' | 'mondial_relay' | 'chronopost' | 'dhl' | 'autre';

export interface ShipmentDetails {
  id?: string;
  orderId: string;
  userId?: string;
  carrier: ShippingCarrier;
  method: string;
  price: number;
  trackingNumber?: string;
  trackingUrl?: string;
  status: 'preparing' | 'label_created' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
  shippedAt?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class ShippingService {
  private provider: string;

  constructor() {
    this.provider = process.env.SHIPPING_PROVIDER || 'manual';
  }

  public getProviderName(): string {
    return this.provider;
  }

  public generateTrackingNumber(carrier: ShippingCarrier = 'colissimo'): string {
    const prefix = carrier === 'colissimo' ? 'FR' : carrier === 'mondial_relay' ? 'MR' : 'KB';
    const rand = Math.floor(100000000 + Math.random() * 900000000);
    return `${prefix}${rand}`;
  }

  public generateTrackingUrl(carrier: ShippingCarrier, trackingNumber?: string): string {
    if (!trackingNumber || trackingNumber.trim() === '') return '#';

    switch (carrier) {
      case 'colissimo':
        return `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(trackingNumber)}`;
      case 'mondial_relay':
        return `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${encodeURIComponent(trackingNumber)}`;
      case 'chronopost':
        return `https://www.chronopost.fr/tracking-no-cms/livraison-page-synthese?listeNumeros=${encodeURIComponent(trackingNumber)}`;
      case 'dhl':
        return `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${encodeURIComponent(trackingNumber)}`;
      default:
        return `#suivi-${trackingNumber}`;
    }
  }

  public createManualShipment(orderId: string, userId?: string, carrier: ShippingCarrier = 'manual', trackingNumber?: string, trackingUrl?: string): ShipmentDetails {
    const finalTrackingUrl = trackingUrl || this.generateTrackingUrl(carrier, trackingNumber);
    const now = new Date().toISOString();
    const estDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    return {
      orderId,
      userId,
      carrier,
      method: carrier === 'manual' ? 'Livraison Standard' : carrier.toUpperCase(),
      price: 0,
      trackingNumber,
      trackingUrl: finalTrackingUrl,
      status: trackingNumber ? 'in_transit' : 'preparing',
      shippedAt: trackingNumber ? now : undefined,
      estimatedDelivery: estDate,
      createdAt: now,
      updatedAt: now
    };
  }
}

export const shippingService = new ShippingService();
