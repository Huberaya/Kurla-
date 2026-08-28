import { randomUUID } from 'node:crypto';

import { shippingService, ShipmentDetails, ShipmentEvent, ShipmentStatus, ShippingCarrier } from '../shippingService';
import { getShippingOption, normalizeShippingAddress, SHIPPING_OPTIONS } from '../shippingRules';
import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess, isUuid } from './internal';

import type {
  ShippingAddressRecord,
  ShippingRateRecord,
  SupabaseServerStore,
} from '../serverDb';

/**
 * CHANTIER 8.2b — adresses de livraison, tarifs et expéditions (suivi
 * transporteur), sortis de `serverDb.ts`.
 */
  // ============================================================
  // DELIVERY ADDRESSES & RATES
  // ============================================================
export async function getShippingAddresses(store: SupabaseServerStore, userId: string): Promise<ShippingAddressRecord[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('shipping_addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false }).order('created_at', { ascending: false });
      ensureDatabaseSuccess('lecture des adresses de livraison', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        fullName: row.full_name,
        street: row.street,
        city: row.city,
        postalCode: row.postal_code,
        country: row.country,
        phone: row.phone || undefined,
        isDefault: row.is_default === true,
        createdAt: row.created_at
      }));
    }
    return [...(store.inMemoryShippingAddresses.get(userId) || [])];
  }

export async function saveShippingAddress(store: SupabaseServerStore, userId: string, input: unknown, addressId?: string, isDefault = false): Promise<ShippingAddressRecord> {
    const normalized = normalizeShippingAddress(input);
    const now = new Date().toISOString();
    const addresses = await getShippingAddresses(store, userId);
    const existingAddress = addressId ? addresses.find(address => address.id === addressId) : undefined;
    if (addressId && isUuid(addressId) && !existingAddress) throw new Error('Adresse de livraison introuvable pour ce client.');
    const id = existingAddress ? existingAddress.id : randomUUID();
    const record: ShippingAddressRecord = {
      ...normalized,
      id,
      userId,
      isDefault: isDefault || addresses.length === 0,
      createdAt: addresses.find(address => address.id === id)?.createdAt || now
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (record.isDefault) {
        const { error: clearError } = await supabase.from('shipping_addresses').update({ is_default: false }).eq('user_id', userId);
        ensureDatabaseSuccess('réinitialisation de l’adresse par défaut', clearError);
      }
      const { data, error } = await supabase.from('shipping_addresses').upsert({
        id,
        user_id: userId,
        full_name: record.fullName,
        street: record.street,
        city: record.city,
        postal_code: record.postalCode,
        country: record.country,
        phone: record.phone || null,
        is_default: record.isDefault,
        created_at: record.createdAt
      }, { onConflict: 'id' }).select('*').single();
      ensureDatabaseSuccess('enregistrement de l’adresse de livraison', error);
      if (data) {
        record.isDefault = data.is_default === true;
        record.createdAt = data.created_at;
      }
    }
    const next = addresses.filter(address => address.id !== id).map(address => record.isDefault ? { ...address, isDefault: false } : address);
    next.unshift(record);
    store.inMemoryShippingAddresses.set(userId, next);
    return record;
  }

export async function deleteShippingAddress(store: SupabaseServerStore, userId: string, addressId: string): Promise<boolean> {
    const addresses = await getShippingAddresses(store, userId);
    const target = addresses.find(address => address.id === addressId);
    if (!target) return false;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('shipping_addresses').delete().eq('id', addressId).eq('user_id', userId);
      ensureDatabaseSuccess('suppression de l’adresse de livraison', error);
    }
    const remaining = addresses.filter(address => address.id !== addressId);
    if (target.isDefault && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isDefault: true };
      if (supabase) {
        const { error } = await supabase.from('shipping_addresses').update({ is_default: true }).eq('id', remaining[0].id).eq('user_id', userId);
        ensureDatabaseSuccess('sélection de la nouvelle adresse par défaut', error);
      }
    }
    store.inMemoryShippingAddresses.set(userId, remaining);
    return true;
  }

export async function getShippingRates(store: SupabaseServerStore, country?: string, includeInactive = false): Promise<ShippingRateRecord[]> {
    const normalizedCountry = country?.trim().toUpperCase();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let query = supabase.from('shipping_rates').select('*').order('country').order('price');
      if (!includeInactive) query = query.eq('active', true);
      if (normalizedCountry) query = query.or(`country.eq.${normalizedCountry},country.is.null`);
      const { data, error } = await query;
      ensureDatabaseSuccess('lecture des tarifs de livraison', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        country: row.country || undefined,
        carrier: row.carrier as ShippingCarrier,
        method: row.method || 'standard',
        name: row.name,
        price: Number(row.price || 0),
        freeFromCents: row.free_from_cents == null ? undefined : Number(row.free_from_cents),
        estimatedDays: row.estimated_days == null ? undefined : Number(row.estimated_days),
        active: row.active === true,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at
      }));
    }

    const defaults = SHIPPING_OPTIONS
      .filter(option => !normalizedCountry || option.country === normalizedCountry)
      .flatMap(option => [
        { id: `default-${option.country}-standard`, country: option.country, carrier: 'manual' as ShippingCarrier, method: 'standard', name: `Livraison standard — ${option.label}`, price: option.standardCents / 100, freeFromCents: option.freeFromCents, estimatedDays: Number(option.estimatedStandardDays.match(/\d+/)?.[0] || 0), active: true, createdAt: '', updatedAt: '' },
        { id: `default-${option.country}-express`, country: option.country, carrier: 'manual' as ShippingCarrier, method: 'express', name: `Livraison express — ${option.label}`, price: option.expressCents / 100, estimatedDays: Number(option.estimatedExpressDays.match(/\d+/)?.[0] || 0), active: true, createdAt: '', updatedAt: '' }
      ]);
    const custom = store.inMemoryShippingRates.filter(rate => (!normalizedCountry || rate.country === normalizedCountry) && (includeInactive || rate.active));
    return [...custom, ...defaults];
  }

export async function saveShippingRate(store: SupabaseServerStore, adminId: string, input: Partial<ShippingRateRecord>): Promise<ShippingRateRecord> {
    const country = input.country?.trim().toUpperCase() || undefined;
    if (country && !getShippingOption(country)) throw new Error('Pays de livraison non pris en charge.');
    if (!input.name?.trim() || !input.method?.trim() || !input.carrier) throw new Error('Transporteur, méthode et nom du tarif sont obligatoires.');
    if (!['manual', 'colissimo', 'mondial_relay', 'chronopost', 'dhl', 'autre'].includes(input.carrier)) throw new Error('Transporteur de livraison invalide.');
    if (!Number.isFinite(Number(input.price)) || Number(input.price) < 0) throw new Error('Tarif de livraison invalide.');
    if (input.freeFromCents !== undefined && input.freeFromCents !== null && (!Number.isSafeInteger(Number(input.freeFromCents)) || Number(input.freeFromCents) < 0)) throw new Error('Seuil de gratuité invalide.');
    if (input.estimatedDays !== undefined && input.estimatedDays !== null && (!Number.isSafeInteger(Number(input.estimatedDays)) || Number(input.estimatedDays) < 0)) throw new Error('Délai de livraison invalide.');
    const now = new Date().toISOString();
    const record: ShippingRateRecord = {
      id: input.id && isUuid(input.id) ? input.id : randomUUID(),
      country,
      carrier: input.carrier,
      method: input.method.trim().toLowerCase(),
      name: input.name.trim().slice(0, 160),
      price: Number(input.price),
      freeFromCents: input.freeFromCents == null ? undefined : Number(input.freeFromCents),
      estimatedDays: input.estimatedDays == null ? undefined : Number(input.estimatedDays),
      active: input.active !== false,
      createdAt: input.createdAt || now,
      updatedAt: now
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('shipping_rates').upsert({
        id: record.id,
        country: record.country || null,
        carrier: record.carrier,
        method: record.method,
        name: record.name,
        price: record.price,
        free_from_cents: record.freeFromCents ?? null,
        estimated_days: record.estimatedDays ?? null,
        active: record.active,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        updated_by: adminId
      }, { onConflict: 'id' }).select('*').single();
      ensureDatabaseSuccess('enregistrement du tarif de livraison', error);
      if (data) {
        record.country = data.country || undefined;
        record.price = Number(data.price);
        record.updatedAt = data.updated_at;
      }
    }
    store.inMemoryShippingRates = [record, ...store.inMemoryShippingRates.filter(rate => rate.id !== record.id)];
    return record;
  }

  // ============================================================
  // PHASE 5: SHIPMENTS & CARRIER TRACKING
  // ============================================================
export async function getShipmentByOrderId(store: SupabaseServerStore, orderId: string): Promise<ShipmentDetails | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('shipments').select('*').eq('order_id', orderId).maybeSingle();
        ensureDatabaseSuccess('lecture de l’expédition', error);
        if (data) {
          const shipment: ShipmentDetails = {
            id: data.id,
            orderId: data.order_id,
            userId: data.user_id,
            carrier: data.carrier as ShippingCarrier,
            method: data.method,
            price: Number(data.price || 0),
            tariff: data.tariff == null ? Number(data.price || 0) : Number(data.tariff),
            address: data.delivery_address || undefined,
            country: data.country || data.delivery_address?.country || undefined,
            trackingNumber: data.tracking_number || undefined,
            trackingUrl: data.tracking_url || undefined,
            status: data.status,
            shippedAt: data.shipped_at || undefined,
            estimatedDelivery: data.estimated_delivery || undefined,
            deliveredAt: data.delivered_at || undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            history: await getShipmentHistoryById(store, data.id)
          };
          return shipment;
        }
      } catch (err) {
        console.error('[serverDb] getShipmentByOrderId error:', err);
        throw err;
      }
    }
    const shipment = supabase ? undefined : store.inMemoryShipments.get(orderId);
    if (shipment?.id) shipment.history = store.inMemoryShippingEvents.filter(event => event.shipmentId === shipment.id);
    return shipment;
  }

export async function getShipmentHistoryById(store: SupabaseServerStore, shipmentId: string): Promise<ShipmentEvent[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('shipping_events').select('*').eq('shipment_id', shipmentId).order('created_at', { ascending: true });
      ensureDatabaseSuccess('lecture de l’historique de livraison', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        shipmentId: row.shipment_id,
        status: row.status as ShipmentStatus,
        location: row.location || undefined,
        description: row.description || undefined,
        createdAt: row.created_at
      }));
    }
    return store.inMemoryShippingEvents.filter(event => event.shipmentId === shipmentId);
  }

export async function getShipmentHistory(store: SupabaseServerStore, orderId: string): Promise<ShipmentEvent[]> {
    const shipment = await getShipmentByOrderId(store, orderId);
    return shipment?.history || [];
  }

export async function upsertShipment(store: SupabaseServerStore, details: ShipmentDetails): Promise<ShipmentDetails> {
    const allowedCarriers: ShippingCarrier[] = ['manual', 'colissimo', 'mondial_relay', 'chronopost', 'dhl', 'autre'];
    const allowedStatuses: ShipmentStatus[] = ['preparing', 'label_created', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed'];
    if (!details.orderId.trim()) throw new Error('Commande de livraison manquante.');
    if (!allowedCarriers.includes(details.carrier)) throw new Error('Transporteur de livraison invalide.');
    if (!allowedStatuses.includes(details.status)) throw new Error('Statut de livraison invalide.');
    if (!details.method?.trim()) throw new Error('Méthode de livraison obligatoire.');
    if (!Number.isFinite(details.price) || details.price < 0) throw new Error('Tarif de livraison invalide.');
    if (details.country && !getShippingOption(details.country)) throw new Error('Pays de livraison non pris en charge.');
    const validatedAddress = details.address ? normalizeShippingAddress(details.address) : undefined;
    const trackingNumber = details.trackingNumber?.trim() || undefined;
    const trackingUrl = details.trackingUrl?.trim() || undefined;
    const outboundStatuses: ShipmentStatus[] = ['shipped', 'in_transit', 'out_for_delivery', 'delivered'];
    if (outboundStatuses.includes(details.status) && !trackingNumber) {
      throw new Error('Un vrai numéro de suivi saisi par le transporteur est obligatoire avant l’expédition.');
    }
    if (trackingNumber && /^(test|fake|dummy|placeholder|todo|n[\/.-]?a|none|null|example)/i.test(trackingNumber)) {
      throw new Error('Le numéro de suivi fourni ressemble à une valeur de test ou de remplacement. Saisissez le numéro réel du transporteur.');
    }
    if (trackingUrl && !/^https?:\/\//i.test(trackingUrl)) {
      throw new Error('Le lien de suivi doit être une URL HTTP(S) réelle.');
    }

    const now = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    let existing: ShipmentDetails | undefined;
    let shipmentId = isUuid(details.id) ? details.id : randomUUID();
    if (supabase) {
      const { data, error } = await supabase.from('shipments').select('*').eq('order_id', details.orderId).maybeSingle();
      ensureDatabaseSuccess('vérification de l’expédition existante', error);
      if (data) {
        shipmentId = data.id;
        existing = {
          id: data.id,
          orderId: data.order_id,
          userId: data.user_id || undefined,
          carrier: data.carrier as ShippingCarrier,
          method: data.method,
          price: Number(data.price || 0),
          tariff: data.tariff == null ? Number(data.price || 0) : Number(data.tariff),
          address: data.delivery_address || undefined,
          country: data.country || undefined,
          trackingNumber: data.tracking_number || undefined,
          trackingUrl: data.tracking_url || undefined,
          status: data.status as ShipmentStatus,
          shippedAt: data.shipped_at || undefined,
          estimatedDelivery: data.estimated_delivery || undefined,
          deliveredAt: data.delivered_at || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      }
    } else {
      existing = store.inMemoryShipments.get(details.orderId);
      if (existing?.id) shipmentId = existing.id;
    }

    const effectiveTrackingNumber = trackingNumber || existing?.trackingNumber;
    if (effectiveTrackingNumber && /^(test|fake|dummy|placeholder|todo|n[\\/.-]?a|none|null|example)/i.test(effectiveTrackingNumber)) {
      throw new Error('Le numéro de suivi historique ressemble à une valeur de test ou de remplacement. Réconciliation manuelle requise.');
    }
    if (outboundStatuses.includes(details.status) && !effectiveTrackingNumber) {
      throw new Error('Un vrai numéro de suivi est obligatoire pour ce statut de livraison.');
    }
    const effectiveTrackingUrl = trackingUrl || (effectiveTrackingNumber ? shippingService.generateTrackingUrl(details.carrier, effectiveTrackingNumber) : existing?.trackingUrl);
    const tariff = details.tariff == null ? details.price : details.tariff;
    if (!Number.isFinite(tariff) || tariff < 0) throw new Error('Tarif de livraison invalide.');
    const finalDetails: ShipmentDetails = {
      ...details,
      id: shipmentId,
      price: tariff,
      tariff,
      address: validatedAddress || existing?.address,
      country: details.country?.toUpperCase() || validatedAddress?.country || existing?.country || existing?.address?.country,
      trackingNumber: effectiveTrackingNumber,
      trackingUrl: effectiveTrackingUrl,
      createdAt: existing?.createdAt || details.createdAt || now,
      updatedAt: now
    };

    if (supabase) {
      try {
        const { error } = await supabase.from('shipments').upsert({
          id: finalDetails.id,
          order_id: details.orderId,
          user_id: details.userId || existing?.userId || null,
          carrier: details.carrier,
          method: details.method.trim(),
          price: tariff,
          tariff,
          delivery_address: finalDetails.address || null,
          country: finalDetails.country || null,
          tracking_number: finalDetails.trackingNumber || null,
          tracking_url: finalDetails.trackingUrl || null,
          status: details.status,
          shipped_at: details.shippedAt || existing?.shippedAt || null,
          estimated_delivery: details.estimatedDelivery || existing?.estimatedDelivery || null,
          delivered_at: details.deliveredAt || existing?.deliveredAt || null,
          created_at: finalDetails.createdAt,
          updated_at: now
        }, { onConflict: 'order_id' });
        ensureDatabaseSuccess('sauvegarde de l’expédition', error);
      } catch (err) {
        console.error('[serverDb] upsertShipment error:', err);
        throw err;
      }
    }

    const event: ShipmentEvent = {
      id: randomUUID(),
      shipmentId,
      status: details.status,
      location: details.eventLocation?.trim() || undefined,
      description: details.eventDescription?.trim() || (existing && existing.status === details.status ? 'Informations de livraison mises à jour.' : `Statut de livraison : ${details.status}`),
      createdAt: now
    };
    if (supabase) {
      const { error } = await supabase.from('shipping_events').insert({
        id: event.id,
        shipment_id: shipmentId,
        status: event.status,
        location: event.location || null,
        description: event.description || null,
        created_at: event.createdAt
      });
      ensureDatabaseSuccess('journalisation de l’événement de livraison', error);
      finalDetails.history = await getShipmentHistoryById(store, shipmentId);
    } else {
      store.inMemoryShippingEvents.push(event);
      finalDetails.history = [...(existing?.history || []), event];
    }

    store.inMemoryShipments.set(details.orderId, finalDetails);
    return finalDetails;
  }
