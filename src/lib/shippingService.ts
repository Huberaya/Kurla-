/**
 * KURLA BEAUTY - SHIPPING OPERATIONS
 *
 * Manual mode deliberately never invents tracking identifiers. An operator must
 * enter the identifier issued by the carrier and, when needed, its real
 * tracking URL. Carrier URL helpers only build a link around an identifier
 * that already exists.
 */

export type ShippingCarrier = 'manual' | 'colissimo' | 'mondial_relay' | 'chronopost' | 'dhl' | 'autre';
export type ShipmentStatus = 'preparing' | 'label_created' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  location?: string;
  description?: string;
  createdAt: string;
}

export interface ShipmentDetails {
  id?: string;
  orderId: string;
  userId?: string;
  carrier: ShippingCarrier;
  method: string;
  /** The tariff charged to the customer, in the order currency. */
  price: number;
  tariff?: number;
  address?: {
    fullName: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  country?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  /** Optional event data entered by operations with the status update. */
  eventLocation?: string;
  eventDescription?: string;
  status: ShipmentStatus;
  shippedAt?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  createdAt?: string;
  updatedAt?: string;
  history?: ShipmentEvent[];
}

export class ShippingService {
  private provider: string;

  constructor() {
    this.provider = (process.env.SHIPPING_PROVIDER || 'manual').trim().toLowerCase();
  }

  public getProviderName(): string {
    return this.provider;
  }

  /**
   * Build a carrier link only from an operator/carrier-provided number. This
   * method intentionally does not create, format or guess a tracking number.
   */
  public generateTrackingUrl(carrier: ShippingCarrier, trackingNumber?: string): string | undefined {
    if (!trackingNumber || trackingNumber.trim() === '') return undefined;

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
        // A manual/custom carrier has no trustworthy canonical URL. The
        // operator must enter the real URL instead of receiving a fake anchor.
        return undefined;
    }
  }

  public createManualShipment(
    orderId: string,
    userId?: string,
    carrier: ShippingCarrier = 'manual',
    trackingNumber?: string,
    trackingUrl?: string
  ): ShipmentDetails {
    const finalTrackingUrl = trackingUrl || this.generateTrackingUrl(carrier, trackingNumber);
    const now = new Date().toISOString();

    return {
      orderId,
      userId,
      carrier,
      method: carrier === 'manual' ? 'manual' : carrier.toUpperCase(),
      price: 0,
      trackingNumber: trackingNumber?.trim() || undefined,
      trackingUrl: finalTrackingUrl,
      // A tracking number alone does not prove a carrier event. Operations
      // must explicitly set the status and dates after the parcel is handed
      // over; missing data stays missing.
      status: 'preparing',
      createdAt: now,
      updatedAt: now
    };
  }
}

export const shippingService = new ShippingService();
