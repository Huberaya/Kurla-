import { randomUUID } from 'node:crypto';

import { CATALOG_AUDIENCES, CATALOG_CATEGORIES, catalogCsvRowToInput, parseBoolean, parseCatalogCsv, parseJsonCell } from '../catalogManagement';
import { checkProductVocabulary } from './taxonomyStore';
import { registerSupplierByName } from './supplierStore';
import { getSupabaseServerClient } from '../supabaseClient';
import {
  effectiveCatalogPrice,
  ensureDatabaseSuccess,
  isPromotionActive,
  isPublishableProduct,
  isUuid,
  recordLoyaltySafely,
  toPublicProduct,
} from './internal';

import type {
  MarketplaceQuestion,
  MarketplaceReview,
  ProductSubscription,
  SupabaseServerStore,
} from '../serverDb';

/**
 * CHANTIER 8.2c — catalogue : produits publics, avis, questions, liste
 * d'attente, abonnements, normalisation des fiches, gouvernance admin,
 * imports CSV/fournisseur et événements de validation. Sorti de `serverDb.ts`.
 *
 * Les appels aux autres domaines (`store.notifyLowStock`, `store.getOrdersByCustomer`,
 * `store.syncInventoryToSupabase`) passent par la surface composée déclarée sur
 * la classe : aucun import croisé entre modules de domaine, donc aucun cycle.
 */
export async function getProducts(store: SupabaseServerStore, options: { publishedOnly?: boolean; includeInactive?: boolean } = {}): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let productsQuery = supabase.from('products').select('*');
      if (!options.includeInactive) productsQuery = productsQuery.eq('is_active', true);
      const { data, error } = await productsQuery;
      ensureDatabaseSuccess('lecture du catalogue', error);
      const { data: variants, error: variantsError } = await supabase.from('product_variants').select('*');
      ensureDatabaseSuccess('lecture des variantes produit', variantsError);
      const { data: inventoryRows, error: inventoryError } = await supabase.from('inventory').select('product_id, variant_id, quantity, reserved_quantity, available_quantity');
      ensureDatabaseSuccess('lecture du stock catalogue', inventoryError);
      const { data: imageRows, error: imagesError } = await supabase.from('product_images').select('*').order('position', { ascending: true });
      ensureDatabaseSuccess('lecture des images catalogue', imagesError);
      const imagesByProduct = new Map<string, any[]>();
      (imageRows || []).forEach((image: any) => {
        const lines = imagesByProduct.get(image.product_id) || [];
        lines.push({
          id: image.id,
          url: image.url,
          label: image.alt || 'Image du catalogue',
          type: image.image_type || 'gallery',
          imageTrust: image.ownership_status || 'unverified',
          validationStatus: image.validation_status || 'pending'
        });
        imagesByProduct.set(image.product_id, lines);
      });
      const inventoryByKey = new Map<string, any>();
      (inventoryRows || []).forEach((row: any) => inventoryByKey.set(`${row.product_id}:${row.variant_id || ''}`, row));
      const variantsByProduct = new Map<string, any[]>();
      (variants || []).forEach((variant: any) => {
        if (variant.is_active === false) return;
        const lines = variantsByProduct.get(variant.product_id) || [];
        lines.push(variant);
        variantsByProduct.set(variant.product_id, lines);
      });
      const mapped = (data || []).map((p: any) => {
        const productVariants = (variantsByProduct.get(p.id) || []).map((variant: any) => {
          const stock = inventoryByKey.get(`${p.id}:${variant.id}`);
          return stock ? {
            ...variant,
            stock_quantity: stock.quantity,
            reserved_quantity: stock.reserved_quantity,
            available_quantity: stock.available_quantity ?? Number(stock.quantity) - Number(stock.reserved_quantity || 0)
          } : variant;
        });
        const baseStock = inventoryByKey.get(`${p.id}:`);
        const baseAvailable = baseStock
          ? Number(baseStock.available_quantity ?? Number(baseStock.quantity) - Number(baseStock.reserved_quantity || 0))
          : Number(p.stock_quantity || 0);
        const variantAvailable = productVariants.some((variant: any) => Number(variant.available_quantity ?? (Number(variant.stock_quantity || 0) - Number(variant.reserved_quantity || 0))) > 0);
        return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        price: effectiveCatalogPrice(p),
        basePrice: Number(p.price),
        originalPrice: p.original_price == null ? (isPromotionActive(p) ? Number(p.price) : undefined) : Number(p.original_price),
        rating: p.rating == null ? 0 : Number(p.rating),
        reviewsCount: Number(p.reviews_count || 0),
        inStock: p.in_stock === true && (productVariants.length > 0 ? variantAvailable : baseAvailable > 0),
        stockQuantity: baseStock ? Number(baseStock.quantity) : Number(p.stock_quantity || 0),
        category: p.category,
        subCategory: p.subcategory,
        description: p.description || '',
        image: p.image_url || imagesByProduct.get(p.id)?.[0]?.url || '',
        galleryImages: imagesByProduct.get(p.id) || [],
        ingredients: p.ingredients || [],
        inci: p.inci || '',
        forWho: p.for_who || '',
        notIdealIf: p.not_ideal_if || '',
        howToUse: p.how_to_use || '',
        routineStep: p.routine_step || '',
        badges: p.badges || [],
        keyIngredients: p.ingredients || [],
        hairTypes: p.hair_types || [],
        targetHairTypes: p.hair_types || [],
        skinTypes: p.skin_types || [],
        targetSkinTypes: p.skin_types || [],
        concerns: p.concerns || [],
        needs: p.concerns || [],
        countryAvailability: p.country_availability || [],
        isActive: p.is_active === true,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        benefitPrimary: p.benefit_primary,
        texture: p.texture,
        fragrance: p.fragrance,
        usageFrequency: p.usage_frequency,
        sizeLabel: p.size_label,
        estimatedYield: p.estimated_yield,
        ingredientRoles: p.ingredient_roles || [],
        allergens: p.allergens || [],
        containsFragrance: p.contains_fragrance,
        originCountry: p.origin_country,
        certifications: p.certifications || [],
        returnsPolicy: p.returns_policy,
        shippingPolicy: p.shipping_policy || {},
        shippingInfo: { ...(p.shipping_policy || {}), countries: p.country_availability || [] },
        communityBrand: p.community_brand === true,
        isNew: p.is_new === true,
        isPromo: isPromotionActive(p),
        catalogCategoryTags: p.catalog_category_tags || [],
        targetAudiences: p.target_audiences || [],
        audienceTags: p.audience_tags || [],
        recommendedAgeBand: p.recommended_age_band || undefined,
        recommendedAgeMin: p.recommended_age_min == null ? undefined : Number(p.recommended_age_min),
        recommendedAgeMax: p.recommended_age_max == null ? undefined : Number(p.recommended_age_max),
        minorSafetyStatus: p.minor_safety_status || 'not_provided',
        adultOnlyActives: p.adult_only_actives || [],
        parentalSupervisionRequired: p.parental_supervision_required === true,
        imageSupervisionStatus: p.image_supervision_status || 'not_provided',
        vatRate: p.vat_rate == null ? undefined : Number(p.vat_rate),
        priceIncludesVat: p.price_includes_vat !== false,
        promotionPrice: p.promotion_price == null ? undefined : Number(p.promotion_price),
        promotionStartsAt: p.promotion_starts_at,
        promotionEndsAt: p.promotion_ends_at,
        warnings: p.warnings || [],
        sourceSupplier: p.source_supplier || undefined,
        supplierId: p.supplier_id || undefined,
        supplierSku: p.supplier_sku || undefined,
        lastImportedAt: p.last_imported_at,
        catalogUpdatedBy: p.catalog_updated_by,
        catalogStatus: p.catalog_status,
        ingredientVerificationStatus: p.ingredient_verification_status,
        claimsValidationStatus: p.claims_validation_status,
        imagesValidationStatus: p.images_validation_status,
        stockValidationStatus: p.stock_validation_status,
        certificationsValidationStatus: p.certifications_validation_status,
        translationsValidationStatus: p.translations_validation_status,
        brandVerificationStatus: p.brand_verification_status,
        imageOwnershipStatus: p.image_ownership_status,
        lastCatalogReviewedAt: p.last_catalog_reviewed_at,
        lastCatalogUpdatedAt: p.last_catalog_updated_at,
        variants: productVariants
      };
      });
      return options.publishedOnly ? mapped.filter(product => isPublishableProduct({
        ...product,
        is_active: true,
        catalog_status: product.catalogStatus,
        ingredient_verification_status: product.ingredientVerificationStatus,
        claims_validation_status: product.claimsValidationStatus,
        images_validation_status: product.imagesValidationStatus,
        stock_validation_status: product.stockValidationStatus,
        certifications_validation_status: product.certificationsValidationStatus,
        translations_validation_status: product.translationsValidationStatus,
        brand_verification_status: product.brandVerificationStatus,
        image_ownership_status: product.imageOwnershipStatus
      })) : mapped;
    }
    // The local development catalogue remains available to internal tests and
    // non-public server routines. Customer-facing API calls always pass
    // publishedOnly, so unvalidated development records cannot be published.
    return options.publishedOnly
      ? store.inMemoryProducts.filter(product => isPublishableProduct(product))
      : [...store.inMemoryProducts];
  }

export async function getProductById(store: SupabaseServerStore, idOrSlug: string): Promise<any | undefined> {
    const products = await getProducts(store);
    return products.find(p => p.id === idOrSlug || p.slug === idOrSlug);
  }

/**
 * CHANTIER 14 — chargement **administratif**, produits désactivés inclus.
 *
 * `getProductById` filtre `is_active = true`, ce qui est juste pour une route
 * publique : un produit désactivé ne doit pas être servi. Mais toute la chaîne
 * de préparation passait par lui, et le verrou remontait : impossible de
 * rattacher une composition, d'enregistrer une vérification, ou même de
 * **réactiver** un produit — `updateCatalogStatus` ne trouvait plus le produit
 * qu'elle devait changer de statut. Les 16 produits du catalogue réel étant
 * désactivés, aucune opération de préparation n'était possible sur aucun.
 *
 * Le choix est donc explicite dans le nom : la visibilité publique reste
 * filtrée par `getProductById`, la préparation passe par ici.
 */
export async function getProductForAdministration(store: SupabaseServerStore, idOrSlug: string): Promise<any | undefined> {
    const products = await getProducts(store, { includeInactive: true });
    return products.find(p => String(p.id) === idOrSlug || String(p.slug) === idOrSlug);
  }

export async function getPublicProducts(store: SupabaseServerStore): Promise<any[]> {
    return (await getProducts(store, { publishedOnly: true })).map(toPublicProduct);
  }

export async function getProductReviews(store: SupabaseServerStore, productId: string): Promise<MarketplaceReview[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, product_id, rating, title, comment, verified_purchase, status, created_at')
        .eq('product_id', productId)
        .eq('status', 'approved')
        .eq('verified_purchase', true)
        .order('created_at', { ascending: false });
      ensureDatabaseSuccess('lecture des avis vérifiés', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        productId: row.product_id,
        rating: Number(row.rating),
        title: row.title || undefined,
        comment: row.comment || '',
        author: 'Client vérifié',
        verifiedPurchase: true,
        createdAt: row.created_at,
        status: row.status
      }));
    }
    return store.inMemoryProductReviews.filter(review => review.productId === productId && review.status === 'approved' && review.verifiedPurchase);
  }

async function createProductReviewInner(store: SupabaseServerStore, userId: string, productId: string, rating: number, comment: string, title?: string, variantId?: string): Promise<MarketplaceReview> {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment.trim() || comment.trim().length > 4000) {
      throw new Error('Un avis doit contenir une note de 1 à 5 et un commentaire valide.');
    }
    const orders = await store.getOrdersByCustomer('', userId);
    const eligible = orders.some(order =>
      ['paid', 'processing', 'packed', 'shipped', 'delivered'].includes(order.status) &&
      order.items.some(item => item.productId === productId && (!variantId || item.variantId === variantId))
    );
    if (!eligible) throw new Error('Un achat réglé de ce produit est nécessaire pour déposer un avis vérifié.');

    const now = new Date().toISOString();
    const review: MarketplaceReview = {
      id: randomUUID(), productId, rating, title: title?.trim() || undefined,
      comment: comment.trim(), author: 'Client vérifié', userId, verifiedPurchase: true,
      createdAt: now, status: 'pending'
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('reviews').insert({
        id: review.id, product_id: productId, user_id: userId, rating,
        title: review.title || null, comment: review.comment,
        verified_purchase: true, verified_at: now, status: 'pending'
      }).select('id, product_id, rating, title, comment, verified_purchase, status, created_at').single();
      ensureDatabaseSuccess('enregistrement de l’avis', error);
      return { ...review, id: data.id, createdAt: data.created_at, status: data.status };
    }
    store.inMemoryProductReviews.unshift(review);
    return review;
  }

export async function getProductQuestions(store: SupabaseServerStore, productId: string, userId?: string): Promise<MarketplaceQuestion[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let request = supabase.from('product_questions')
        .select('id, product_id, question, answer, status, created_at, answered_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      const { data, error } = await request;
      ensureDatabaseSuccess('lecture des questions produit', error);
      return (data || []).filter((row: any) => row.status === 'answered').map((row: any) => ({
        id: row.id, productId: row.product_id, question: row.question,
        answer: row.answer || undefined, createdAt: row.created_at, answeredAt: row.answered_at || undefined
      }));
    }
    return store.inMemoryProductQuestions.filter(question => question.productId === productId && question.answer);
  }

async function createProductQuestionInner(store: SupabaseServerStore, userId: string, productId: string, question: string, email?: string): Promise<MarketplaceQuestion> {
    const value = question.trim();
    if (value.length < 5 || value.length > 1000) throw new Error('La question doit contenir entre 5 et 1 000 caractères.');
    const published = (await getProducts(store, { publishedOnly: true })).some(product => product.id === productId);
    if (!published) throw new Error('Produit non disponible.');
    const now = new Date().toISOString();
    const draft: MarketplaceQuestion = { id: randomUUID(), productId, question: value, userId, createdAt: now };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('product_questions').insert({
        id: draft.id, product_id: productId, user_id: userId,
        asker_email: email || null, question: value, status: 'pending'
      }).select('id, product_id, question, answer, created_at, answered_at').single();
      ensureDatabaseSuccess('enregistrement de la question produit', error);
      return { id: data.id, productId: data.product_id, question: data.question, answer: data.answer || undefined, userId, createdAt: data.created_at, answeredAt: data.answered_at || undefined };
    }
    store.inMemoryProductQuestions.unshift(draft);
    return draft;
  }

export async function joinProductWaitlist(store: SupabaseServerStore, productId: string, email: string, country: string, variantId?: string, userId?: string): Promise<{ id: string; status: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCountry = country.trim().toUpperCase();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalizedEmail) || !/^[A-Z]{2}$/.test(normalizedCountry)) {
      throw new Error('Adresse e-mail ou pays invalide.');
    }
    const products = await getProducts(store, { publishedOnly: true });
    const product = products.find(item => item.id === productId);
    if (!product) throw new Error('Produit non disponible.');
    if (variantId && !(product.variants || []).some((variant: any) => variant.id === variantId)) throw new Error('Variante inconnue.');
    const now = new Date().toISOString();
    const entry = { id: randomUUID(), productId, variantId, userId, email: normalizedEmail, country: normalizedCountry, status: 'waiting' as const, createdAt: now };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('product_waitlist').upsert({
        id: entry.id, product_id: productId, variant_id: variantId || null,
        user_id: userId || null, email: normalizedEmail, country: normalizedCountry, status: 'waiting'
      }, { onConflict: 'product_id,variant_id,email,country' }).select('id, status').single();
      ensureDatabaseSuccess('inscription à la liste d’attente', error);
      return { id: data.id, status: data.status };
    }
    const existing = store.inMemoryProductWaitlist.find(item => item.productId === productId && item.variantId === variantId && item.email === normalizedEmail && item.country === normalizedCountry);
    if (existing) return { id: existing.id, status: existing.status };
    store.inMemoryProductWaitlist.push(entry);
    return { id: entry.id, status: entry.status };
  }

export async function createProductSubscription(store: SupabaseServerStore, userId: string, productId: string, frequency: ProductSubscription['frequency'], quantity: number, country: string, variantId?: string, paymentMethod?: string): Promise<ProductSubscription> {
    if (!['30_days', '45_days', '60_days', '90_days'].includes(frequency) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error('Fréquence ou quantité de réassort invalide.');
    }
    const product = (await getProducts(store, { publishedOnly: true })).find(item => item.id === productId);
    if (!product) throw new Error('Produit non disponible.');
    if (variantId && !(product.variants || []).some((variant: any) => variant.id === variantId && variant.inStock)) throw new Error('Variante indisponible.');
    const normalizedCountry = country.trim().toUpperCase();
    if (!product.countryAvailability?.includes(normalizedCountry) && !product.countryAvailability?.includes('INT')) throw new Error('Ce produit n’est pas livré dans ce pays.');
    const now = new Date().toISOString();
    const subscription: ProductSubscription = { id: randomUUID(), userId, productId, variantId, quantity, frequency, country: normalizedCountry, paymentMethod, status: 'pending', createdAt: now, updatedAt: now };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('product_subscriptions').insert({
        id: subscription.id, user_id: userId, product_id: productId, variant_id: variantId || null,
        quantity, frequency, country: normalizedCountry, payment_method: paymentMethod || null, status: 'pending'
      }).select('*').single();
      ensureDatabaseSuccess('création du réassort', error);
      return { ...subscription, id: data.id, createdAt: data.created_at, updatedAt: data.updated_at };
    }
    store.inMemoryProductSubscriptions.push(subscription);
    return subscription;
  }

export function normalizeCatalogProductInput(store: SupabaseServerStore, input: any, existing?: any): any {
    const source = { ...(existing || {}), ...(input || {}) };
    const text = (value: unknown, max = 5000): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed ? trimmed.slice(0, max) : undefined;
    };
    const array = (value: unknown): string[] => Array.isArray(value)
      ? value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 100)
      : typeof value === 'string' ? value.split(/[|;]/).map(item => item.trim()).filter(Boolean).slice(0, 100) : [];
    const number = (value: unknown, fallback?: number): number | undefined => {
      if (value === undefined || value === null || value === '') return fallback;
      const parsed = Number(String(value).replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const slugify = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);
    const name = text(source.name || source.nom, 240);
    if (!name) throw new Error('Le nom du produit est obligatoire.');
    const slug = slugify(text(source.slug || source.handle, 180) || name);
    if (!slug) throw new Error('Le slug produit est obligatoire.');
    const price = number(source.price ?? source.prix);
    if (price === undefined || price < 0) throw new Error(`Prix invalide pour « ${name} » : renseignez un montant positif ou nul.`);

    const categoryRaw = text(source.category || source.department || source.departement, 80);
    const categoryKey = categoryRaw?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const category = categoryKey?.includes('peau') ? 'peau' : categoryKey?.includes('cheveu') ? 'cheveux' : categoryRaw ? categoryRaw : undefined;
    /**
     * CHANTIER 14 — on valide ce qui est **écrit**, pas ce qui est hérité.
     *
     * `source` fusionne la fiche existante et l'entrée : le département et les
     * marchés déjà en base retombaient dans la validation, et toute
     * modification — même un simple mode d'emploi — était refusée. Mesuré sur
     * le catalogue réel : 14 écritures sur 14 refusées, 9 par
     * « Département inconnu » ou « Pays de disponibilité invalide » alors que
     * l'appel ne touchait ni l'un ni l'autre. Une porte de validation qui
     * bloque les champs qu'on ne modifie pas rend le chemin d'écriture
     * inutilisable, ce qui est pire que l'absence de porte.
     *
     * `checkProductVocabulary`, juste au-dessus, ne lit déjà que l'entrée : ce
     * correctif aligne les deux contrôles sur la même règle.
     */
    const providedCategory = input?.category ?? input?.department ?? input?.departement;
    const categoryIsProvided = providedCategory !== undefined && providedCategory !== null && String(providedCategory).trim() !== '';
    if (categoryIsProvided && category && !['cheveux', 'peau'].includes(category)) throw new Error(`Département inconnu pour « ${name} ». Utilisez cheveux ou peau.`);

    const validCategories = new Set<string>(CATALOG_CATEGORIES.map(item => item.slug));
    const catalogCategoryTags = array(source.catalogCategoryTags ?? source.catalog_category_tags ?? source.categoryTags);
    const unknownCategory = catalogCategoryTags.find(tag => !validCategories.has(tag));
    if (unknownCategory) throw new Error(`Catégorie catalogue inconnue : ${unknownCategory}.`);
    const validAudiences = new Set<string>(CATALOG_AUDIENCES.map(item => item.slug));
    const targetAudiences = array(source.targetAudiences ?? source.target_audiences);
    const unknownAudience = targetAudiences.find(audience => !validAudiences.has(audience));
    if (unknownAudience) throw new Error(`Public inconnu : ${unknownAudience}.`);
    const audienceTags = array(source.audienceTags ?? source.audience_tags);
    const ageBand = text(source.recommendedAgeBand ?? source.recommended_age_band, 40);
    const validAgeBands = new Set(['baby', 'child', 'teen', 'adult', 'all_ages', 'not_provided']);
    if (ageBand && !validAgeBands.has(ageBand)) throw new Error(`Tranche d’âge recommandée invalide pour « ${name} ».`);
    const ageMin = number(source.recommendedAgeMin ?? source.recommended_age_min);
    const ageMax = number(source.recommendedAgeMax ?? source.recommended_age_max);
    if ((ageMin !== undefined && (!Number.isInteger(ageMin) || ageMin < 0)) || (ageMax !== undefined && (!Number.isInteger(ageMax) || ageMax < 0)) || (ageMin !== undefined && ageMax !== undefined && ageMax < ageMin)) throw new Error(`Âge recommandé incohérent pour « ${name} ».`);
    const minorSafetyStatus = ['verified', 'pending', 'not_provided'].includes(source.minorSafetyStatus ?? source.minor_safety_status) ? (source.minorSafetyStatus ?? source.minor_safety_status) : existing?.minorSafetyStatus || existing?.minor_safety_status || 'not_provided';
    const imageSupervisionStatus = ['verified', 'pending', 'not_provided'].includes(source.imageSupervisionStatus ?? source.image_supervision_status) ? (source.imageSupervisionStatus ?? source.image_supervision_status) : existing?.imageSupervisionStatus || existing?.image_supervision_status || 'not_provided';
    const adultOnlyActives = array(source.adultOnlyActives ?? source.adult_only_actives);
    const parentalSupervisionRequired = source.parentalSupervisionRequired === undefined && source.parental_supervision_required === undefined
      ? existing?.parentalSupervisionRequired === true || existing?.parental_supervision_required === true
      : parseBoolean(source.parentalSupervisionRequired ?? source.parental_supervision_required, false);
    const countries = array(source.countryAvailability ?? source.country_availability).map(country => country.toUpperCase());
    // Même règle que pour le département : les marchés hérités ne sont pas
    // revalidés. Le catalogue réel porte `DOM` et `AFR` (codes de zone à trois
    // lettres) que cette règle refuse — la question de ces codes reste ouverte,
    // mais elle ne doit pas bloquer l'écriture d'un mode d'emploi.
    const providedCountries = input?.countryAvailability ?? input?.country_availability;
    const countriesAreProvided = providedCountries !== undefined && providedCountries !== null;
    if (countriesAreProvided && countries.some(country => country !== 'INT' && !/^[A-Z]{2}$/.test(country))) throw new Error(`Pays de disponibilité invalide pour « ${name} ».`);

    const rawImages = typeof source.images === 'string' ? parseJsonCell(source.images, []) : source.images;
    const imagesProvided = rawImages !== undefined;
    const images = imagesProvided
      ? (Array.isArray(rawImages) ? rawImages : [])
        .map((image: any) => typeof image === 'string' ? { url: image } : image)
        .filter((image: any) => image && typeof image.url === 'string' && image.url.trim())
        .map((image: any, index: number) => ({
          url: image.url.trim().slice(0, 2000),
          alt: text(image.alt || image.label, 300),
          position: Number.isInteger(image.position) ? image.position : index,
          imageType: ['hero', 'gallery', 'detail'].includes(image.imageType || image.type) ? (image.imageType || image.type) : index === 0 ? 'hero' : 'gallery',
          ownershipStatus: ['brand_provided', 'licensed', 'editorial', 'illustrative', 'unverified'].includes(image.ownershipStatus || image.imageTrust) ? (image.ownershipStatus || image.imageTrust) : 'unverified',
          validationStatus: ['verified', 'pending', 'rejected', 'not_provided'].includes(image.validationStatus) ? image.validationStatus : 'pending',
          sourceNote: text(image.sourceNote, 1000)
        }))
        .filter((image: any) => /^https?:\/\//i.test(image.url)).slice(0, 30)
      : undefined;
    if (imagesProvided && Array.isArray(rawImages) && rawImages.length > 0 && images.length === 0) throw new Error(`Aucune URL d’image exploitable pour « ${name} ».`);

    const rawVariants = typeof source.variants === 'string' ? parseJsonCell(source.variants, []) : source.variants;
    const variantsProvided = rawVariants !== undefined;
    const variants = variantsProvided
      ? (Array.isArray(rawVariants) ? rawVariants : []).map((variant: any, index: number) => {
        const variantName = text(variant?.name || variant?.label || variant?.optionValue || variant?.option_value, 240);
        if (!variantName) throw new Error(`La variante ${index + 1} de « ${name} » doit avoir un nom.`);
        const variantPrice = number(variant.price, price);
        const stockQuantity = number(variant.stockQuantity ?? variant.stock_quantity, 0);
        if (variantPrice === undefined || variantPrice < 0 || stockQuantity === undefined || !Number.isSafeInteger(stockQuantity) || stockQuantity < 0) {
          throw new Error(`Prix ou stock invalide pour la variante « ${variantName} ».`);
        }
        return {
          id: isUuid(variant.id) ? variant.id : randomUUID(),
          name: variantName,
          sku: text(variant.sku, 120),
          barcode: text(variant.barcode, 120),
          price: variantPrice,
          stockQuantity,
          isActive: variant.isActive === undefined && variant.is_active === undefined ? true : parseBoolean(variant.isActive ?? variant.is_active, true),
          optionType: text(variant.optionType || variant.option_type, 40),
          optionValue: text(variant.optionValue || variant.option_value, 240),
          weightGrams: number(variant.weightGrams ?? variant.weight_grams),
          formatLabel: text(variant.formatLabel || variant.format_label, 120),
          shade: text(variant.shade, 120),
          color: text(variant.color, 120),
          scent: text(variant.scent, 120),
          vatRate: number(variant.vatRate ?? variant.vat_rate),
          promotionPrice: number(variant.promotionPrice ?? variant.promotion_price),
          promotionStartsAt: text(variant.promotionStartsAt || variant.promotion_starts_at, 80),
          promotionEndsAt: text(variant.promotionEndsAt || variant.promotion_ends_at, 80)
        };
      })
      : undefined;

    const stockQuantity = number(source.stockQuantity ?? source.stock_quantity ?? source.stock, 0);
    if (stockQuantity === undefined || !Number.isSafeInteger(stockQuantity) || stockQuantity < 0) throw new Error(`Stock invalide pour « ${name} ».`);
    const vatRate = number(source.vatRate ?? source.vat_rate ?? source.tva, 20);
    if (vatRate === undefined || vatRate < 0 || vatRate > 100) throw new Error(`TVA invalide pour « ${name} ».`);
    const promotionPrice = number(source.promotionPrice ?? source.promotion_price);
    if (promotionPrice !== undefined && (promotionPrice < 0 || promotionPrice > price)) throw new Error(`Prix promotionnel invalide pour « ${name} ».`);
    const isPromo = source.isPromo === undefined && source.is_promo === undefined ? promotionPrice !== undefined : parseBoolean(source.isPromo ?? source.is_promo, false);
    if (isPromo && promotionPrice === undefined) throw new Error(`La promotion de « ${name} » est signalée mais son prix est absent.`);
    const toIso = (value: unknown): string | undefined => {
      if (value === undefined || value === null || value === '') return undefined;
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) throw new Error(`Date catalogue invalide pour « ${name} ».`);
      return date.toISOString();
    };
    const promotionStartsAt = toIso(source.promotionStartsAt ?? source.promotion_starts_at);
    const promotionEndsAt = toIso(source.promotionEndsAt ?? source.promotion_ends_at);
    if (promotionStartsAt && promotionEndsAt && new Date(promotionEndsAt) < new Date(promotionStartsAt)) throw new Error(`Période promotionnelle incohérente pour « ${name} ».`);
    const image = text(source.image || source.image_url, 2000) || images?.[0]?.url;
    if (image && !/^https?:\/\//i.test(image)) throw new Error(`URL d’image invalide pour « ${name} ».`);
    const imageOwnershipStatus = ['brand_provided', 'licensed', 'editorial', 'illustrative', 'unverified'].includes(source.imageOwnershipStatus)
      ? source.imageOwnershipStatus
      : images?.[0]?.ownershipStatus || existing?.imageOwnershipStatus || existing?.image_ownership_status || 'unverified';
    const id = text(source.id, 240) || existing?.id || `product-${randomUUID()}`;
    const active = source.isActive === undefined && source.is_active === undefined
      ? existing?.isActive ?? existing?.is_active ?? false
      : parseBoolean(source.isActive ?? source.is_active, false);
    const effectiveInStock = variantsProvided ? variants.some((variant: any) => variant.isActive && variant.stockQuantity > 0) : stockQuantity > 0;
    return {
      id,
      slug,
      name,
      brand: text(source.brand, 240),
      price,
      originalPrice: number(source.originalPrice ?? source.original_price),
      promotionPrice,
      promotionStartsAt,
      promotionEndsAt,
      vatRate,
      priceIncludesVat: source.priceIncludesVat === undefined && source.price_includes_vat === undefined ? true : parseBoolean(source.priceIncludesVat ?? source.price_includes_vat, true),
      isPromo,
      stockQuantity,
      inStock: source.inStock === undefined && source.in_stock === undefined ? effectiveInStock : parseBoolean(source.inStock ?? source.in_stock, effectiveInStock),
      isActive: active,
      category,
      subCategory: text(source.subCategory || source.subcategory || source.sub_category_tag, 160),
      catalogCategoryTags,
      targetAudiences,
      audienceTags,
      recommendedAgeBand: ageBand || undefined,
      recommendedAgeMin: ageMin,
      recommendedAgeMax: ageMax,
      minorSafetyStatus,
      adultOnlyActives,
      parentalSupervisionRequired,
      imageSupervisionStatus,
      countryAvailability: countries,
      description: text(source.description, 10000),
      image,
      images,
      imageOwnershipStatus,
      imagesProvided,
      variants,
      variantsProvided,
      ingredients: array(source.ingredients || source.keyIngredients),
      inci: text(source.inci, 12000),
      warnings: array(source.warnings),
      certifications: Array.isArray(typeof source.certifications === 'string' ? parseJsonCell(source.certifications, []) : source.certifications)
        ? (typeof source.certifications === 'string' ? parseJsonCell(source.certifications, []) : source.certifications).slice(0, 50)
        : [],
      hairTypes: array(source.hairTypes || source.hair_types || source.targetHairTypes),
      skinTypes: array(source.skinTypes || source.skin_types || source.targetSkinTypes),
      concerns: array(source.concerns || source.needs),
      sourceSupplier: text(source.sourceSupplier || source.source_supplier || source.supplier, 240),
      supplierId: text(source.supplierId || source.supplier_id, 80),
      supplierSku: text(source.supplierSku || source.supplier_sku, 240),
      benefitPrimary: text(source.benefitPrimary, 500),
      forWho: text(source.forWho, 1000),
      notIdealIf: text(source.notIdealIf, 1000),
      howToUse: text(source.howToUse, 3000),
      routineStep: text(source.routineStep, 300),
      texture: text(source.texture, 240),
      fragrance: text(source.fragrance, 240),
      usageFrequency: text(source.usageFrequency, 240),
      sizeLabel: text(source.sizeLabel, 120),
      estimatedYield: text(source.estimatedYield, 240),
      ingredientRoles: Array.isArray(source.ingredientRoles) ? source.ingredientRoles.slice(0, 50) : [],
      allergens: array(source.allergens),
      containsFragrance: typeof source.containsFragrance === 'boolean' ? source.containsFragrance : undefined,
      originCountry: text(source.originCountry, 80),
      returnsPolicy: text(source.returnsPolicy, 3000),
      shippingPolicy: source.shippingPolicy && typeof source.shippingPolicy === 'object' ? source.shippingPolicy : {},
      lastImportedAt: new Date().toISOString()
    };
  }

export function catalogAdminView(store: SupabaseServerStore, product: any): any {
    return {
      ...product,
      price: product.basePrice ?? product.price,
      isActive: product.isActive ?? product.is_active ?? false,
      catalogStatus: product.catalogStatus ?? product.catalog_status ?? 'draft',
      validation: {
        ingredients: product.ingredientVerificationStatus ?? product.ingredient_verification_status ?? 'not_provided',
        claims: product.claimsValidationStatus ?? product.claims_validation_status ?? 'not_provided',
        images: product.imagesValidationStatus ?? product.images_validation_status ?? 'not_provided',
        stock: product.stockValidationStatus ?? product.stock_validation_status ?? 'not_provided',
        certifications: product.certificationsValidationStatus ?? product.certifications_validation_status ?? 'not_provided',
        translations: product.translationsValidationStatus ?? product.translations_validation_status ?? 'not_provided',
        brand: product.brandVerificationStatus ?? product.brand_verification_status ?? 'not_provided'
      },
      lastCatalogUpdatedAt: product.lastCatalogUpdatedAt ?? product.last_catalog_updated_at,
      lastCatalogReviewedAt: product.lastCatalogReviewedAt ?? product.last_catalog_reviewed_at
    };
  }

export async function getAdminCatalogProducts(store: SupabaseServerStore): Promise<any[]> {
    return (await getProducts(store, { includeInactive: true })).map(product => catalogAdminView(store, product));
  }

export async function getCatalogTaxonomy(store: SupabaseServerStore): Promise<{ categories: any[]; audiences: any[] }> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: categories, error: categoryError } = await supabase.from('catalog_categories').select('slug, department, label, sort_order, active').eq('active', true).order('sort_order');
      ensureDatabaseSuccess('lecture des catégories catalogue', categoryError);
      return { categories: categories || [], audiences: [...CATALOG_AUDIENCES] };
    }
    return { categories: [...CATALOG_CATEGORIES], audiences: [...CATALOG_AUDIENCES] };
  }

export async function saveCatalogProduct(store: SupabaseServerStore, adminId: string, input: any): Promise<any> {
    /**
     * CHANTIER 10 (bloc B3) — les vocabulaires contrôlés sont appliqués à
     * l'écriture. Un code hors référentiel est refusé nommément : sans cette
     * porte, `concerns` redevient une chaîne libre et aucune agrégation par
     * besoin n'est fiable. Les synonymes déclarés sont résolus vers leur code
     * canonique, et la résolution est remontée plutôt que masquée.
     */
    const vocabulary = await checkProductVocabulary(store, {
      concerns: input?.concerns ?? input?.needs,
      hairTypes: input?.hairTypes ?? input?.hair_types,
      routineSteps: input?.routineSteps,
      countryAvailability: input?.countryAvailability ?? input?.country_availability,
      toneDepths: input?.toneDepths
    });
    if (!vocabulary.valid) {
      const details = vocabulary.unknown.map(item => `${item.field} : « ${item.value} » (taxonomie ${item.taxonomy})`).join(' ; ');
      throw new Error(`Vocabulaire contrôlé — valeur(s) hors référentiel : ${details}.`);
    }
    if (vocabulary.vocabularyLoaded) {
      if (vocabulary.values.concerns) input = { ...input, concerns: vocabulary.values.concerns };
      if (vocabulary.values.hairTypes) input = { ...input, hairTypes: vocabulary.values.hairTypes };
      if (vocabulary.values.countryAvailability) input = { ...input, countryAvailability: vocabulary.values.countryAvailability };
      if (vocabulary.resolvedFromSynonym.length > 0) {
        console.warn(`[Catalogue] synonymes résolus vers leur code canonique : ${vocabulary.resolvedFromSynonym.map(item => `${item.from} → ${item.to}`).join(', ')}`);
      }
    }

    const allProducts = await getProducts(store, { includeInactive: true });
    const requestedId = typeof input?.id === 'string' ? input.id.trim() : undefined;
    const requestedSlug = typeof input?.slug === 'string' ? input.slug.trim() : undefined;
    const requestedSupplier = typeof input?.sourceSupplier === 'string' ? input.sourceSupplier.trim() : typeof input?.supplier === 'string' ? input.supplier.trim() : undefined;
    const requestedSupplierSku = typeof input?.supplierSku === 'string' ? input.supplierSku.trim() : typeof input?.supplier_sku === 'string' ? input.supplier_sku.trim() : undefined;
    const existing = allProducts.find(product =>
      (requestedId && product.id === requestedId)
      || (requestedSlug && product.slug === requestedSlug)
      || (requestedSupplier && requestedSupplierSku && product.sourceSupplier === requestedSupplier && product.supplierSku === requestedSupplierSku)
    );
    const normalized = normalizeCatalogProductInput(store, input, existing);
    if (existing && normalized.id !== existing.id) normalized.id = existing.id;
    const now = new Date().toISOString();
    const imagesChanged = normalized.imagesProvided === true;
    const supabase = getSupabaseServerClient();
    let savedProduct: any = { ...existing, ...normalized, id: normalized.id };

    if (supabase) {
      const quality = {
        catalog_status: existing?.catalogStatus || existing?.catalog_status || 'draft',
        ingredient_verification_status: existing?.ingredientVerificationStatus || existing?.ingredient_verification_status || 'not_provided',
        claims_validation_status: existing?.claimsValidationStatus || existing?.claims_validation_status || 'not_provided',
        images_validation_status: imagesChanged ? 'pending' : (existing?.imagesValidationStatus || existing?.images_validation_status || 'not_provided'),
        stock_validation_status: existing?.stockValidationStatus || existing?.stock_validation_status || 'not_provided',
        certifications_validation_status: existing?.certificationsValidationStatus || existing?.certifications_validation_status || 'not_provided',
        translations_validation_status: existing?.translationsValidationStatus || existing?.translations_validation_status || 'not_provided',
        brand_verification_status: existing?.brandVerificationStatus || existing?.brand_verification_status || 'not_provided',
        image_ownership_status: imagesChanged ? normalized.imageOwnershipStatus : (existing?.imageOwnershipStatus || existing?.image_ownership_status || 'unverified')
      };
      const payload: Record<string, unknown> = {
        id: normalized.id,
        slug: normalized.slug,
        name: normalized.name,
        brand: normalized.brand || null,
        price: normalized.price,
        original_price: normalized.originalPrice ?? null,
        promotion_price: normalized.promotionPrice ?? null,
        promotion_starts_at: normalized.promotionStartsAt || null,
        promotion_ends_at: normalized.promotionEndsAt || null,
        vat_rate: normalized.vatRate,
        price_includes_vat: normalized.priceIncludesVat,
        is_promo: normalized.isPromo,
        in_stock: normalized.inStock,
        stock_quantity: normalized.stockQuantity,
        is_active: normalized.isActive,
        category: normalized.category || null,
        subcategory: normalized.subCategory || null,
        sub_category_tag: normalized.subCategory || null,
        catalog_category_tags: normalized.catalogCategoryTags,
        target_audiences: normalized.targetAudiences,
        audience_tags: normalized.audienceTags,
        recommended_age_band: normalized.recommendedAgeBand || null,
        recommended_age_min: normalized.recommendedAgeMin ?? null,
        recommended_age_max: normalized.recommendedAgeMax ?? null,
        minor_safety_status: normalized.minorSafetyStatus,
        adult_only_actives: normalized.adultOnlyActives,
        parental_supervision_required: normalized.parentalSupervisionRequired,
        image_supervision_status: normalized.imageSupervisionStatus,
        country_availability: normalized.countryAvailability,
        description: normalized.description || null,
        image_url: normalized.image || null,
        ingredients: normalized.ingredients,
        inci: normalized.inci || null,
        warnings: normalized.warnings,
        certifications: normalized.certifications,
        hair_types: normalized.hairTypes,
        skin_types: normalized.skinTypes,
        concerns: normalized.concerns,
        source_supplier: normalized.sourceSupplier || null,
        supplier_id: normalized.supplierId || null,
        supplier_sku: normalized.supplierSku || null,
        benefit_primary: normalized.benefitPrimary || null,
        for_who: normalized.forWho || null,
        not_ideal_if: normalized.notIdealIf || null,
        how_to_use: normalized.howToUse || null,
        routine_step: normalized.routineStep || null,
        texture: normalized.texture || null,
        fragrance: normalized.fragrance || null,
        usage_frequency: normalized.usageFrequency || null,
        size_label: normalized.sizeLabel || null,
        estimated_yield: normalized.estimatedYield || null,
        ingredient_roles: normalized.ingredientRoles,
        allergens: normalized.allergens,
        contains_fragrance: normalized.containsFragrance ?? null,
        origin_country: normalized.originCountry || null,
        returns_policy: normalized.returnsPolicy || null,
        shipping_policy: normalized.shippingPolicy,
        last_imported_at: normalized.lastImportedAt,
        catalog_updated_by: adminId,
        last_catalog_updated_at: now,
        updated_at: now,
        ...quality
      };
      const { data, error } = await supabase.from('products').upsert(payload, { onConflict: 'id' }).select('*').single();
      ensureDatabaseSuccess('enregistrement du produit catalogue', error);
      savedProduct = { ...savedProduct, ...data };

      if (normalized.variantsProvided) {
        const { data: currentVariants, error: variantLookupError } = await supabase.from('product_variants').select('id').eq('product_id', normalized.id);
        ensureDatabaseSuccess('lecture des variantes existantes', variantLookupError);
        const retained = new Set<string>();
        for (const variant of normalized.variants || []) {
          retained.add(variant.id);
          const { error: variantError } = await supabase.from('product_variants').upsert({
            id: variant.id,
            product_id: normalized.id,
            name: variant.name,
            sku: variant.sku || null,
            price: variant.price,
            stock_quantity: variant.stockQuantity,
            is_active: variant.isActive,
            option_type: variant.optionType || null,
            option_value: variant.optionValue || null,
            weight_grams: variant.weightGrams || null,
            format_label: variant.formatLabel || null,
            shade: variant.shade || null,
            color: variant.color || null,
            scent: variant.scent || null,
            barcode: variant.barcode || null,
            vat_rate: variant.vatRate ?? null,
            promotion_price: variant.promotionPrice ?? null,
            promotion_starts_at: variant.promotionStartsAt || null,
            promotion_ends_at: variant.promotionEndsAt || null,
            updated_at: now
          }, { onConflict: 'id' });
          ensureDatabaseSuccess('enregistrement d’une variante catalogue', variantError);
          await store.syncVariantInventoryToSupabase(normalized.id, variant.id, variant.stockQuantity, 0);
        }
        for (const current of currentVariants || []) {
          if (!retained.has(current.id)) {
            const { error: deactivateError } = await supabase.from('product_variants').update({ is_active: false, updated_at: now }).eq('id', current.id);
            ensureDatabaseSuccess('désactivation d’une variante catalogue', deactivateError);
          }
        }
      }
      await store.syncInventoryToSupabase(normalized.id, normalized.stockQuantity, 0);
      await store.notifyLowStock(normalized.id, { quantity: normalized.stockQuantity, productName: normalized.name });
      for (const variant of normalized.variants || []) {
        await store.notifyLowStock(normalized.id, {
          variantId: variant.id,
          quantity: variant.stockQuantity,
          productName: `${normalized.name} (${variant.name})`
        });
      }

      if (normalized.imagesProvided) {
        const { error: deleteImagesError } = await supabase.from('product_images').delete().eq('product_id', normalized.id);
        ensureDatabaseSuccess('remplacement des images catalogue', deleteImagesError);
        if (normalized.images.length > 0) {
          const { error: imageError } = await supabase.from('product_images').insert(normalized.images.map((image: any) => ({
            product_id: normalized.id,
            url: image.url,
            alt: image.alt || null,
            position: image.position,
            image_type: image.imageType,
            ownership_status: image.ownershipStatus,
            validation_status: image.validationStatus,
            source_note: image.sourceNote || null,
            updated_at: now
          })));
          ensureDatabaseSuccess('enregistrement des images catalogue', imageError);
        }
      }
      return catalogAdminView(store, {
        ...savedProduct,
        ...normalized,
        id: normalized.id,
        catalogStatus: quality.catalog_status,
        ingredientVerificationStatus: quality.ingredient_verification_status,
        claimsValidationStatus: quality.claims_validation_status,
        imagesValidationStatus: quality.images_validation_status,
        stockValidationStatus: quality.stock_validation_status,
        certificationsValidationStatus: quality.certifications_validation_status,
        translationsValidationStatus: quality.translations_validation_status,
        brandVerificationStatus: quality.brand_verification_status,
        imageOwnershipStatus: quality.image_ownership_status,
        lastCatalogUpdatedAt: now
      });
    }

    const memoryRecord = {
      ...savedProduct,
      ...normalized,
      id: normalized.id,
      catalog_status: existing?.catalog_status || existing?.catalogStatus || 'draft',
      ingredient_verification_status: existing?.ingredient_verification_status || existing?.ingredientVerificationStatus || 'not_provided',
      claims_validation_status: existing?.claims_validation_status || existing?.claimsValidationStatus || 'not_provided',
      images_validation_status: imagesChanged ? 'pending' : (existing?.images_validation_status || existing?.imagesValidationStatus || 'not_provided'),
      stock_validation_status: existing?.stock_validation_status || existing?.stockValidationStatus || 'not_provided',
      certifications_validation_status: existing?.certifications_validation_status || existing?.certificationsValidationStatus || 'not_provided',
      translations_validation_status: existing?.translations_validation_status || existing?.translationsValidationStatus || 'not_provided',
      brand_verification_status: existing?.brand_verification_status || existing?.brandVerificationStatus || 'not_provided',
      image_ownership_status: imagesChanged ? normalized.imageOwnershipStatus : (existing?.image_ownership_status || existing?.imageOwnershipStatus || 'unverified'),
      last_catalog_updated_at: now,
      last_imported_at: normalized.lastImportedAt,
      variants: normalized.variantsProvided ? normalized.variants.map((variant: any) => ({ ...variant, stock_quantity: variant.stockQuantity, reserved_quantity: 0 })) : (existing?.variants || []),
      galleryImages: normalized.imagesProvided ? normalized.images : (existing?.galleryImages || [])
    };
    const index = store.inMemoryProducts.findIndex(product => product.id === normalized.id);
    if (index >= 0) store.inMemoryProducts[index] = memoryRecord;
    else store.inMemoryProducts.unshift(memoryRecord);
    return catalogAdminView(store, memoryRecord);
  }

export async function createCatalogImportAudit(store: SupabaseServerStore, adminId: string, sourceType: 'manual' | 'csv' | 'supplier', rowsReceived: number, supplier?: string, fileName?: string): Promise<string> {
    const id = randomUUID();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('catalog_imports').insert({ id, initiated_by: adminId, source_type: sourceType, supplier: supplier || null, file_name: fileName || null, rows_received: rowsReceived, status: 'processing' });
      ensureDatabaseSuccess('création du journal d’import catalogue', error);
    }
    return id;
  }

export async function finishCatalogImportAudit(store: SupabaseServerStore, importId: string, result: { imported: number; rejected: number; errors: any[] }): Promise<void> {
    const status = result.rejected > 0 ? (result.imported > 0 ? 'completed_with_errors' : 'failed') : 'completed';
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('catalog_imports').update({ status, rows_imported: result.imported, rows_rejected: result.rejected, error_report: result.errors, completed_at: new Date().toISOString() }).eq('id', importId);
      ensureDatabaseSuccess('clôture du journal d’import catalogue', error);
    }
  }

export async function importCatalogRecords(store: SupabaseServerStore, adminId: string, records: any[], sourceType: 'manual' | 'supplier' | 'csv', supplier?: string, fileName?: string): Promise<any> {
    if (!Array.isArray(records) || records.length === 0) throw new Error('Aucune ligne catalogue à importer.');
    if (records.length > 1000) throw new Error('Un import est limité à 1 000 lignes par opération.');
    // CHANTIER 16A — la provenance est résolue **avant** toute écriture.
    //
    // Le nom de fournisseur d'un fichier est une chaîne libre : « Laboratoire
    // X » et « LABORATOIRE X SAS » désignent le même acteur. On le replie sur
    // une seule entité ; si deux entités pourraient convenir, l'import échoue
    // en les nommant plutôt que d'en choisir une, et **aucune ligne n'a été
    // écrite** à ce stade. Un produit rattaché au mauvais fournisseur casse la
    // traçabilité en aval, donc on préfère s'arrêter.
    const resolvedSupplier = sourceType === 'supplier' && supplier
      ? await registerSupplierByName(store, adminId, supplier)
      : null;
    const canonicalSupplierName = resolvedSupplier ? resolvedSupplier.supplier.legalName : supplier;
    const importId = await createCatalogImportAudit(store, adminId, sourceType, records.length, canonicalSupplierName, fileName);
    const result = { importId, imported: 0, rejected: 0, errors: [] as any[], products: [] as any[] };
    for (let index = 0; index < records.length; index += 1) {
      const raw = { ...(records[index] || {}) };
      if (resolvedSupplier && !raw.supplierId && !raw.supplier_id) raw.supplierId = resolvedSupplier.supplier.id;
      if (sourceType === 'supplier' && supplier && !raw.sourceSupplier && !raw.source_supplier) {
        // On enregistre la raison sociale retenue, pas la chaîne du fichier.
        raw.sourceSupplier = canonicalSupplierName;
      }
      try {
        const product = await saveCatalogProduct(store, adminId, raw);
        result.imported += 1;
        result.products.push(product);
        const supabase = getSupabaseServerClient();
        if (supabase) {
          const { error } = await supabase.from('catalog_import_rows').insert({ import_id: importId, row_number: index + 1, external_key: String(raw.supplierSku || raw.supplier_sku || raw.id || raw.slug || ''), status: 'imported' });
          ensureDatabaseSuccess('journalisation d’une ligne d’import catalogue', error);
        }
      } catch (error: any) {
        result.rejected += 1;
        const message = error?.message || 'Ligne catalogue rejetée.';
        result.errors.push({ row: index + 1, message });
        const supabase = getSupabaseServerClient();
        if (supabase) {
          const { error: rowError } = await supabase.from('catalog_import_rows').insert({ import_id: importId, row_number: index + 1, external_key: String(raw.supplierSku || raw.supplier_sku || raw.id || raw.slug || ''), status: 'rejected', error_message: message });
          ensureDatabaseSuccess('journalisation d’une erreur d’import catalogue', rowError);
        }
      }
    }
    await finishCatalogImportAudit(store, importId, result);
    return result;
  }

export async function importCatalogCsv(store: SupabaseServerStore, adminId: string, csv: string, fileName?: string): Promise<any> {
    const rows = parseCatalogCsv(csv).map(catalogCsvRowToInput);
    return importCatalogRecords(store, adminId, rows, 'csv', undefined, fileName);
  }

export async function getCatalogImports(store: SupabaseServerStore, limit = 30): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from('catalog_imports').select('*').order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, limit)));
    ensureDatabaseSuccess('lecture du journal des imports catalogue', error);
    return data || [];
  }

/**
 * Enregistre une vérification de catalogue : l'événement (traçable) puis le
 * statut qui en découle sur le produit.
 *
 * CHANTIER 14 — `adminId` accepte `null`. Deux raisons, toutes deux vérifiées :
 * la colonne `validator_id` est nullable (sa contrainte externe est
 * `ON DELETE SET NULL`), et un contrôle automatique n'a pas d'auteur humain à
 * qui l'attribuer. Écrire l'identifiant d'un compte qui n'a rien vérifié
 * fabriquerait une attribution fausse dans un journal de conformité ; le
 * laisser vide, avec une note qui nomme le contrôle, dit la vérité.
 */
export async function recordCatalogValidation(store: SupabaseServerStore, adminId: string | null, productId: string, checkType: string, status: 'passed' | 'failed' | 'pending', evidenceUrl?: string, note?: string): Promise<void> {
    // Vérifier un produit désactivé est le cas normal : c'est avant activation
    // que la préparation a lieu.
    if (!await getProductForAdministration(store, productId)) throw new Error('Produit introuvable.');
    const checkColumns: Record<string, string> = {
      ingredients: 'ingredient_verification_status', claims: 'claims_validation_status', images: 'images_validation_status',
      stock: 'stock_validation_status', brand: 'brand_verification_status', certifications: 'certifications_validation_status', translations: 'translations_validation_status'
    };
    const column = checkColumns[checkType];
    if (!column) throw new Error('Type de validation inconnu.');
    const value = status === 'passed' ? 'verified' : status === 'failed' ? 'not_provided' : 'pending';
    const now = new Date().toISOString();
    const event = { id: randomUUID(), productId, checkType, status, evidenceUrl, note, createdAt: now };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error: eventError } = await supabase.from('catalog_validation_events').insert({
        id: event.id, product_id: productId, validator_id: adminId, check_type: checkType, status, evidence_url: evidenceUrl || null, note: note || null
      });
      ensureDatabaseSuccess('enregistrement de la validation catalogue', eventError);
      const { error: updateError } = await supabase.from('products').update({ [column]: value, last_catalog_reviewed_at: now }).eq('id', productId);
      ensureDatabaseSuccess('mise à jour de la validation catalogue', updateError);
      return;
    }
    store.inMemoryCatalogValidationEvents.unshift(event);
    const product = store.inMemoryProducts.find(item => item.id === productId);
    if (product) product[column] = value;
  }

export async function getCatalogValidationEvents(store: SupabaseServerStore, productId: string): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('catalog_validation_events').select('id, product_id, validator_id, check_type, status, evidence_url, note, created_at').eq('product_id', productId).order('created_at', { ascending: false });
      ensureDatabaseSuccess('lecture de l’historique de validation', error);
      return data || [];
    }
    return store.inMemoryCatalogValidationEvents.filter(event => event.productId === productId);
  }

export async function updateCatalogStatus(store: SupabaseServerStore, productId: string, status: 'draft' | 'pending_review' | 'published' | 'unavailable'): Promise<void> {
    if (!['draft', 'pending_review', 'published', 'unavailable'].includes(status)) throw new Error('Statut catalogue invalide.');
    // Changer le statut d'un produit désactivé est précisément l'usage : sans
    // ce chargement, aucune réactivation n'était possible.
    const existing = await getProductForAdministration(store, productId);
    if (!existing) throw new Error('Produit introuvable.');

    /**
     * CHANTIER 10 (bloc B2) — la porte de publication est appliquée à
     * l'ÉCRITURE, pas seulement à la lecture.
     *
     * Jusqu'ici `isPublishableProduct` filtrait l'affichage, mais rien
     * n'empêchait de passer un produit à `published` sans aucune vérification.
     * Le statut mentait alors deux fois : l'administration voyait « publié »
     * pour un produit invisible, et ce même statut sert de condition dans des
     * politiques en base (`product_ingredients` ne devient lisible que pour un
     * produit publié). Un statut qui ne correspond à rien est pire qu'un
     * statut absent.
     */
    if (status === 'published') {
      const readiness = await getCatalogPublicationReadiness(store, productId);
      if (!readiness.ready) {
        throw new Error(`Publication refusée — ${readiness.missing.length} exigence(s) non satisfaite(s) : ${readiness.missing.map(item => item.label).join(' ; ')}.`);
      }
    }
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('products').update({ catalog_status: status, last_catalog_updated_at: new Date().toISOString() }).eq('id', productId);
      ensureDatabaseSuccess('mise à jour du statut catalogue', error);
      return;
    }
    const product = store.inMemoryProducts.find(item => item.id === productId);
    if (product) product.catalog_status = status;
  }

/** Un avis publié fait progresser — davantage s'il est adossé à un achat réglé. */
export async function createProductReview(store: SupabaseServerStore, userId: string, productId: string, rating: number, comment: string, title?: string, variantId?: string): Promise<MarketplaceReview> {
  const review = await createProductReviewInner(store, userId, productId, rating, comment, title, variantId);
  await recordLoyaltySafely(store, userId, review.verifiedPurchase ? 'review_verified' : 'review_unverified', review.id);
  return review;
}

export async function createProductQuestion(store: SupabaseServerStore, userId: string, productId: string, question: string, email?: string): Promise<MarketplaceQuestion> {
  const questionRecord = await createProductQuestionInner(store, userId, productId, question, email);
  await recordLoyaltySafely(store, userId, 'question_asked', questionRecord.id);
  return questionRecord;
}

/**
 * CHANTIER 10 (bloc B2) — état de préparation à la publication.
 *
 * Reprend exactement les exigences de `isPublishableProduct`, **moins** le
 * statut lui-même (sinon un brouillon ne pourrait jamais devenir publiable).
 * La liste des manques est nominative : dire « non publiable » sans dire quoi
 * ne permet à personne d'agir.
 */
/**
 * CHANTIER 14 — évaluation pure de la préparation à la publication.
 *
 * Extraite de `getCatalogPublicationReadiness` pour une raison précise : le
 * rapport global lisait déjà toutes les lignes du catalogue, puis rappelait le
 * getter unitaire produit par produit. Or `getProductById` passe par
 * `getProducts()` **sans option**, donc filtre `is_active = true` : un produit
 * désactivé disparaissait du rapport, et comme l'appel était enveloppé dans un
 * `.catch(() => null)` le produit était simplement sauté. Résultat mesuré en
 * production : 16 produits en base, rapport annonçant « produits : 0 ».
 *
 * Un rapport de gouvernance qui omet les lignes qu'il est censé auditer est
 * plus dangereux qu'un rapport absent : il se lit comme « rien à faire ».
 * L'évaluation prend donc la ligne en paramètre ; le getter ne fait plus que la
 * charger.
 */
export function evaluateCatalogPublicationReadiness(product: any, productId?: string): {
  productId: string;
  checkedAt: string;
  ready: boolean;
  missing: Array<{ field: string; label: string }>;
} {
  const missing: Array<{ field: string; label: string }> = [];
  /**
   * CHANTIER 14 — les deux formes de l'objet circulent, et la règle doit lire
   * les deux.
   *
   * `getProducts` renvoie des objets **mappés en camelCase**
   * (`claimsValidationStatus`), alors que le rapport global lit des lignes
   * **brutes en snake_case**. Cette évaluation ne lisait que le snake_case :
   * appelée depuis le getter unitaire, elle déclarait les sept vérifications
   * manquantes même sur un produit intégralement vérifié. Le rapport global
   * disait vrai, l'endpoint produit disait faux — deux réponses contraires à la
   * même question, et c'est la seconde qu'un opérateur consulte avant de
   * publier.
   */
  const read = (snakeKey: string): unknown => {
    if (product[snakeKey] !== undefined) return product[snakeKey];
    const camelKey = snakeKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return product[camelKey];
  };
  const requireVerified = (field: string, label: string) => {
    if (read(field) !== 'verified') missing.push({ field, label: `${label} non vérifié(e)` });
  };

  const isActive = read('is_active');
  if (isActive !== true && isActive !== undefined) missing.push({ field: 'is_active', label: 'produit désactivé' });
  requireVerified('ingredient_verification_status', 'composition');
  requireVerified('claims_validation_status', 'allégations');
  requireVerified('images_validation_status', 'visuels');
  requireVerified('stock_validation_status', 'stock');
  requireVerified('certifications_validation_status', 'certifications');
  requireVerified('translations_validation_status', 'traductions');
  requireVerified('brand_verification_status', 'marque');

  if (!['brand_provided', 'licensed'].includes(read('image_ownership_status') as string)) {
    missing.push({ field: 'image_ownership_status', label: 'droits sur les visuels non établis (brand_provided ou licensed)' });
  }
  const brand = read('brand');
  if (typeof brand !== 'string' || brand.trim() === '') {
    missing.push({ field: 'brand', label: 'marque absente' });
  }

  const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
  const inciRaw = read('inci');
  const inci = typeof inciRaw === 'string' ? inciRaw.trim() : '';
  if (ingredients.length === 0 && inci === '') missing.push({ field: 'ingredients', label: 'composition déclarée vide' });

  const gallery = Array.isArray(product.galleryImages) ? product.galleryImages : [];
  const imageUrl = product.image || read('image_url');
  const hasImage = gallery.length > 0 || (typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl));
  if (!hasImage) missing.push({ field: 'images', label: 'aucun visuel exploitable' });

  const countries = product.countryAvailability || read('country_availability') || [];
  if (!Array.isArray(countries) || countries.length === 0) missing.push({ field: 'country_availability', label: 'aucun marché renseigné' });

  const isPromo = Boolean(product.isPromo ?? product.is_promo);
  if (isPromo && !isPromotionActive(product)) missing.push({ field: 'promotion', label: 'promotion annoncée mais inactive ou expirée' });

  return {
    productId: productId || String(product.id || ''),
    checkedAt: new Date().toISOString(),
    ready: missing.length === 0,
    missing
  };
}

export async function getCatalogPublicationReadiness(store: SupabaseServerStore, productId: string): Promise<{
  productId: string;
  checkedAt: string;
  ready: boolean;
  missing: Array<{ field: string; label: string }>;
}> {
  // L'admin prépare des produits désactivés : la préparation doit pouvoir les
  // nommer, sinon la réponse est « introuvable » pour un produit qui existe.
  const product = await getProductForAdministration(store, productId);
  if (!product) throw new Error('Produit introuvable.');
  return evaluateCatalogPublicationReadiness(product, productId);
}

/**
 * Vue d'ensemble : combien de produits sont réellement publiables, et ce qui
 * bloque chacun. C'est la réponse à « pourquoi ma boutique est vide » — une
 * question à laquelle un tableau de bord qui compte les statuts ne répond pas.
 */
export async function getCatalogPublicationReadinessReport(store: SupabaseServerStore): Promise<{
  generatedAt: string;
  products: number;
  readyToPublish: number;
  publishedStatus: number;
  publishedButNotListable: number;
  perProduct: Array<{ productId: string; title: string; catalogStatus: string; ready: boolean; missing: string[] }>;
}> {
  const supabase = getSupabaseServerClient();
  let rows: any[] = [];
  if (supabase) {
    const { data, error } = await supabase.from('products').select('*');
    ensureDatabaseSuccess('lecture du catalogue pour l’état de publication', error);
    rows = data || [];
  } else {
    rows = store.inMemoryProducts;
  }

  const perProduct: Array<{ productId: string; title: string; catalogStatus: string; ready: boolean; missing: string[] }> = [];
  let readyToPublish = 0;
  let publishedStatus = 0;
  let publishedButNotListable = 0;

  for (const row of rows) {
    const product = row;
    const productId = String(product.id);
    const readiness = evaluateCatalogPublicationReadiness(product, productId);
    const status = String(product.catalog_status || product.catalogStatus || 'draft');
    if (status === 'published') publishedStatus += 1;
    if (readiness.ready) readyToPublish += 1;
    if (status === 'published' && !isPublishableProduct(product)) publishedButNotListable += 1;
    perProduct.push({
      productId,
      title: String(product.title || product.name || productId),
      catalogStatus: status,
      ready: readiness.ready,
      missing: readiness.missing.map(item => item.label)
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    products: perProduct.length,
    readyToPublish,
    publishedStatus,
    publishedButNotListable,
    perProduct
  };
}
