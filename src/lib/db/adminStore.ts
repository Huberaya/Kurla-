import { randomUUID } from 'node:crypto';

import {
  EDUCATIONAL_CONTENT_TYPES,
  EDUCATIONAL_TOPICS,
  EVIDENCE_LEVELS,
  EducationalContentSource,
  normalizeContentSources,
  normalizeContentTranslations,
} from '../educationalContent';
import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess, isUuid, mapOrderVatFields } from './internal';
import { mapRefundRow } from './refundSupport';

import type {
  CustomerRefund,
  OrderStatus,
  ServerOrder,
  SupabaseServerStore,
} from '../serverDb';

/**
 * CHANTIER 8.2b — administration : journal d'audit, contenu éditorial, sources
 * de l'assistant, coupons, tableau de bord et analytique — ainsi que
 * l'idempotence des webhooks (`claimEventForProcessing`, `markEventProcessed`,
 * `markEventError`), qui vivait au même endroit du fichier. Sorti de
 * `serverDb.ts`.
 */
export async function writeAdminAudit(store: SupabaseServerStore, adminId: string, action: string, details: Record<string, unknown>): Promise<void> {
    const entry = { id: randomUUID(), action, userId: adminId, details, createdAt: new Date().toISOString() };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('audit_logs').insert({
        id: entry.id,
        action,
        user_id: adminId,
        details,
        created_at: entry.createdAt
      });
      ensureDatabaseSuccess(`journalisation de l’action admin « ${action} »`, error);
    }
    store.inMemoryAdminAuditLogs.unshift(entry);
  }

export async function recordAdminAudit(store: SupabaseServerStore, adminId: string, action: string, details: Record<string, unknown>): Promise<void> {
    await writeAdminAudit(store, adminId, action, details);
  }

export async function getActiveAiKnowledgeSources(store: SupabaseServerStore): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('ai_knowledge_sources').select('*').eq('active', true).eq('validation_status', 'validated').order('updated_at', { ascending: false });
      ensureDatabaseSuccess('lecture des sources IA actives', error);
      return (data || []).map(row => mapAiSource(store, row));
    }
    return store.inMemoryAdminSources.filter(source => source.active && source.validationStatus === 'validated');
  }

export function mapPublicArticle(store: SupabaseServerStore, row: any): any {
    const contentType = row.content_type || row.contentType || 'article';
    const topic = row.topic;
    const language = row.language;
    const sources = row.sources;
    const translations = row.translations;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      contentType,
      topic: topic || undefined,
      language: language || undefined,
      excerpt: row.excerpt || '',
      readTime: row.read_time || row.readTime || '',
      author: row.author || '',
      imageUrl: row.image_url || row.imageUrl || '',
      content: row.content || '',
      mediaUrl: row.media_url || row.mediaUrl || undefined,
      duration: row.duration || undefined,
      sources: Array.isArray(sources) ? sources : [],
      evidenceLevel: row.evidence_level || row.evidenceLevel || 'not_provided',
      medicalWarning: row.medical_warning || row.medicalWarning || undefined,
      translations: translations && typeof translations === 'object' && !Array.isArray(translations) ? translations : {},
      faq: Array.isArray(row.faq) ? row.faq : [],
      relatedProductIds: Array.isArray(row.related_product_ids) ? row.related_product_ids : (Array.isArray(row.relatedProductIds) ? row.relatedProductIds : []),
      publishedAt: row.published_at || row.publishedAt || row.created_at || row.createdAt,
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt || row.created_at || row.createdAt
    };
  }

export function isPublicEducationalContent(store: SupabaseServerStore, content: any): boolean {
    const evidenceLevel = content.evidence_level || content.evidenceLevel;
    const contentType = content.content_type || content.contentType || 'article';
    const translations = content.translations;
    const mediaUrl = content.media_url || content.mediaUrl;
    return content.status === 'published'
      && typeof content.author === 'string' && content.author.trim() !== ''
      && typeof content.language === 'string' && content.language.trim() !== ''
      && typeof content.topic === 'string' && content.topic.trim() !== ''
      && typeof content.content === 'string' && content.content.trim() !== ''
      && Array.isArray(content.sources) && content.sources.length > 0
      && evidenceLevel !== 'not_provided'
      && (contentType !== 'video' || (typeof mediaUrl === 'string' && mediaUrl.trim() !== ''))
      && translations && typeof translations === 'object' && !Array.isArray(translations)
      && Object.keys(translations).length > 0;
  }

export async function getPublishedArticles(store: SupabaseServerStore): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return store.inMemoryAdminArticles
      .filter(content => isPublicEducationalContent(store, content))
      .sort((a, b) => String(b.published_at || b.created_at || '').localeCompare(String(a.published_at || a.created_at || '')))
      .map(content => mapPublicArticle(store, content));
    const { data, error } = await supabase.from('content_articles').select('id, slug, title, category, content_type, topic, language, excerpt, read_time, author, image_url, content, media_url, duration, sources, evidence_level, medical_warning, translations, faq, related_product_ids, published_at, created_at, updated_at').eq('status', 'published').order('published_at', { ascending: false }).order('created_at', { ascending: false });
    ensureDatabaseSuccess('lecture des contenus éducatifs publiés', error);
    return (data || []).filter(row => isPublicEducationalContent(store, row)).map(row => mapPublicArticle(store, row));
  }

export async function getPublishedArticle(store: SupabaseServerStore, slug: string): Promise<any | undefined> {
    const articles = await getPublishedArticles(store);
    return articles.find(article => article.slug === slug);
  }

export function mapAdminArticle(store: SupabaseServerStore, row: any): any {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      contentType: row.content_type || 'article',
      topic: row.topic || undefined,
      language: row.language || undefined,
      excerpt: row.excerpt || '',
      readTime: row.read_time || '',
      author: row.author || '',
      imageUrl: row.image_url || '',
      content: row.content || '',
      mediaUrl: row.media_url || undefined,
      duration: row.duration || undefined,
      sources: Array.isArray(row.sources) ? row.sources : [],
      evidenceLevel: row.evidence_level || 'not_provided',
      medicalWarning: row.medical_warning || undefined,
      translations: row.translations && typeof row.translations === 'object' && !Array.isArray(row.translations) ? row.translations : {},
      faq: Array.isArray(row.faq) ? row.faq : [],
      relatedProductIds: Array.isArray(row.related_product_ids) ? row.related_product_ids : [],
      status: row.status,
      publishedAt: row.published_at || undefined,
      createdBy: row.created_by || undefined,
      updatedBy: row.updated_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

export function mapAiSource(store: SupabaseServerStore, row: any): any {
    return {
      id: row.id,
      title: row.title,
      domains: Array.isArray(row.domains) ? row.domains : [],
      content: row.content || '',
      sourceLabel: row.source_label,
      validationStatus: row.validation_status,
      active: row.active === true,
      evidenceUrl: row.evidence_url || '',
      lastReviewedAt: row.last_reviewed_at || undefined,
      createdBy: row.created_by || undefined,
      updatedBy: row.updated_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

export function mapCoupon(store: SupabaseServerStore, row: any): any {
    return {
      code: row.code,
      description: row.description || '',
      discountType: row.discount_type,
      discountValue: Number(row.discount_value),
      currency: row.currency,
      minimumOrderAmount: Number(row.minimum_order_amount || 0),
      startsAt: row.starts_at || undefined,
      endsAt: row.ends_at || undefined,
      maxUses: row.max_uses == null ? undefined : Number(row.max_uses),
      usedCount: Number(row.used_count || 0),
      active: row.active === true,
      createdBy: row.created_by || undefined,
      updatedBy: row.updated_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /** Admin-only read model. It intentionally lives behind the server auth
   * boundary: raw operational rows are never included in public catalog APIs. */
export async function getAdminDashboardData(store: SupabaseServerStore): Promise<any> {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return {
        brands: [...store.inMemoryAdminBrands],
        categories: [...store.inMemoryAdminCategories],
        products: await store.getAdminCatalogProducts(),
        variants: [],
        images: [],
        inventory: [],
        orders: [...store.inMemoryOrders],
        payments: [],
        refunds: [...store.inMemoryRefunds],
        shipments: Array.from(store.inMemoryShipments.values()),
        returns: [...store.inMemoryReturns],
        users: [],
        professionals: [...store.inMemoryProfessionalApplications],
        articles: [...store.inMemoryAdminArticles],
        aiSources: [...store.inMemoryAdminSources],
        reviews: [...store.inMemoryProductReviews],
        notifications: [...store.inMemoryNotifications],
        coupons: [...store.inMemoryAdminCoupons],
        roles: [],
        logs: [...store.inMemoryAdminAuditLogs]
      };
    }

    const [brands, categories, variants, images, inventory, orders, payments, refunds, shipments, returns, users, professionals, articles, aiSources, reviews, notifications, coupons, logs] = await Promise.all([
      supabase.from('brands').select('*').order('name').limit(500),
      supabase.from('categories').select('*').order('name').limit(500),
      supabase.from('product_variants').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('product_images').select('*').order('position').limit(1000),
      supabase.from('inventory').select('*').order('updated_at', { ascending: false }).limit(1000),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('refunds').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('shipments').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('returns').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('profiles').select('id, email, full_name, phone, role, avatar_url, created_at, updated_at').order('created_at', { ascending: false }).limit(1000),
      supabase.from('professional_applications').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('content_articles').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('ai_knowledge_sources').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('coupons').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500)
    ]);

    const reads: Array<[string, { error?: { message?: string } | null }]> = [
      ['brands', brands], ['categories', categories], ['variantes', variants], ['images', images], ['inventaire', inventory],
      ['commandes', orders], ['paiements', payments], ['remboursements', refunds], ['expéditions', shipments], ['retours', returns],
      ['utilisateurs', users], ['professionnels', professionals], ['articles', articles], ['sources IA', aiSources], ['avis', reviews],
      ['notifications', notifications], ['coupons', coupons], ['logs d’audit', logs]
    ];
    reads.forEach(([label, result]) => ensureDatabaseSuccess(`lecture admin ${label}`, result.error));

    const mapOrder = (row: any): ServerOrder => ({
      id: row.id,
      userId: row.user_id || undefined,
      customerEmail: row.customer_email,
      items: Array.isArray(row.items) ? row.items : [],
      total: Number(row.total || 0),
      status: row.status,
      stripeSessionId: row.stripe_session_id || undefined,
      stripePaymentIntentId: row.stripe_payment_intent_id || undefined,
      checkoutIdempotencyKey: row.checkout_idempotency_key || undefined,
      shippingAddress: row.shipping_address,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...mapOrderVatFields(row)
    });
    const mapRefund = (row: any) => mapRefundRow(row);
    const mapShipment = (row: any) => ({
      id: row.id,
      orderId: row.order_id,
      userId: row.user_id || undefined,
      carrier: row.carrier,
      method: row.method,
      price: Number(row.price || 0),
      tariff: row.tariff == null ? Number(row.price || 0) : Number(row.tariff),
      address: row.delivery_address || undefined,
      country: row.country || row.delivery_address?.country || undefined,
      trackingNumber: row.tracking_number || undefined,
      trackingUrl: row.tracking_url || undefined,
      status: row.status,
      shippedAt: row.shipped_at || undefined,
      estimatedDelivery: row.estimated_delivery || undefined,
      deliveredAt: row.delivered_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
    const mapReturn = (row: any) => ({
      id: row.id,
      orderId: row.order_id,
      userId: row.user_id,
      reason: row.reason,
      items: Array.isArray(row.items) ? row.items : [],
      quantity: Number(row.quantity || 0),
      status: row.status,
      comment: row.comment || undefined,
      adminComment: row.admin_comment || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
    const mapNotification = (row: any) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      link: row.link || undefined,
      orderId: row.order_id || undefined,
      dedupeKey: row.dedupe_key || undefined,
      read: row.read === true,
      createdAt: row.created_at,
      deliveredAt: row.delivered_at || undefined,
      errorMessage: row.error_message || undefined
    });

    return {
      brands: brands.data || [],
      categories: categories.data || [],
      products: await store.getAdminCatalogProducts(),
      variants: variants.data || [],
      images: images.data || [],
      inventory: inventory.data || [],
      orders: (orders.data || []).map(mapOrder),
      payments: payments.data || [],
      refunds: (refunds.data || []).map(mapRefund),
      shipments: (shipments.data || []).map(mapShipment),
      returns: (returns.data || []).map(mapReturn),
      users: users.data || [],
      professionals: professionals.data || [],
      articles: (articles.data || []).map(row => mapAdminArticle(store, row)),
      aiSources: (aiSources.data || []).map(row => mapAiSource(store, row)),
      reviews: reviews.data || [],
      notifications: (notifications.data || []).map(mapNotification),
      coupons: (coupons.data || []).map(row => mapCoupon(store, row)),
      roles: ['customer', 'professional', 'support', 'editor', 'admin', 'superadmin'].map(role => ({ role })),
      logs: logs.data || []
    };
  }

export async function saveAdminEntity(store: SupabaseServerStore, adminId: string, entity: 'brand' | 'category' | 'article' | 'content' | 'ai_source' | 'coupon', input: any): Promise<any> {
    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();
    let saved: any;
    if (entity === 'brand') {
      const name = typeof input?.name === 'string' ? input.name.trim().slice(0, 180) : '';
      if (!name) throw new Error('Le nom de la marque est obligatoire.');
      const id = isUuid(input?.id) ? input.id : randomUUID();
      const payload = { id, name, logo_url: typeof input.logoUrl === 'string' ? input.logoUrl.trim().slice(0, 2000) || null : null, description: typeof input.description === 'string' ? input.description.trim().slice(0, 4000) || null : null, updated_at: now };
      if (supabase) { const { data, error } = await supabase.from('brands').upsert(payload, { onConflict: 'id' }).select('*').single(); ensureDatabaseSuccess('enregistrement de la marque', error); saved = data; }
      else { saved = { ...payload, created_at: now }; store.inMemoryAdminBrands = [saved, ...store.inMemoryAdminBrands.filter(brand => brand.id !== id)]; }
    } else if (entity === 'category') {
      const name = typeof input?.name === 'string' ? input.name.trim().slice(0, 180) : '';
      const slug = typeof input?.slug === 'string' ? input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 160) : '';
      if (!name || !slug) throw new Error('Le nom et le slug de la catégorie sont obligatoires.');
      const id = isUuid(input?.id) ? input.id : randomUUID();
      const payload = { id, slug, name, description: typeof input.description === 'string' ? input.description.trim().slice(0, 4000) || null : null, updated_at: now };
      if (supabase) { const { data, error } = await supabase.from('categories').upsert(payload, { onConflict: 'id' }).select('*').single(); ensureDatabaseSuccess('enregistrement de la catégorie', error); saved = data; }
      else { saved = { ...payload, created_at: now }; store.inMemoryAdminCategories = [saved, ...store.inMemoryAdminCategories.filter(category => category.id !== id)]; }
    } else if (entity === 'article' || entity === 'content') {
      const title = typeof input?.title === 'string' ? input.title.trim().slice(0, 240) : '';
      const slug = typeof input?.slug === 'string' ? input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 180) : '';
      const content = typeof input?.content === 'string' ? input.content.trim().slice(0, 100000) : '';
      const author = typeof input?.author === 'string' ? input.author.trim().slice(0, 160) : '';
      const language = typeof input?.language === 'string' ? input.language.trim().toLowerCase().slice(0, 20) : '';
      const contentType = typeof input?.contentType === 'string' ? input.contentType.trim() : 'article';
      const topic = typeof input?.topic === 'string' ? input.topic.trim() : '';
      const evidenceLevel = typeof input?.evidenceLevel === 'string' ? input.evidenceLevel.trim() : 'not_provided';
      if (!title || !slug || !content) throw new Error('Le titre, le slug et le contenu sont obligatoires.');
      if (language && !/^[a-z]{2}(?:-[a-z]{2})?$/.test(language)) throw new Error('La langue principale doit être au format ISO simple (ex. fr ou en).');
      if (!(EDUCATIONAL_CONTENT_TYPES as readonly string[]).includes(contentType)) throw new Error('Type de contenu éducatif invalide.');
      if (topic && !(EDUCATIONAL_TOPICS as readonly string[]).includes(topic)) throw new Error('Thématique éducative invalide.');
      if (!(EVIDENCE_LEVELS as readonly string[]).includes(evidenceLevel)) throw new Error('Niveau de preuve invalide.');
      const sources: EducationalContentSource[] = normalizeContentSources(input?.sources);
      const translations = normalizeContentTranslations(input?.translations);
      const mediaUrl = typeof input?.mediaUrl === 'string' ? input.mediaUrl.trim().slice(0, 2000) : '';
      if (mediaUrl && !/^https?:\/\/[^\s]+$/i.test(mediaUrl)) throw new Error('L’URL du média est invalide.');
      const status = ['draft', 'published', 'archived'].includes(input.status) ? input.status : 'draft';
      if (status === 'published') {
        if (!author) throw new Error('L’auteur est obligatoire avant publication.');
        if (!language) throw new Error('La langue principale est obligatoire avant publication.');
        if (!topic) throw new Error('La thématique est obligatoire avant publication.');
        if (!sources.length) throw new Error('Une publication doit comporter au moins une source.');
        if (evidenceLevel === 'not_provided') throw new Error('Un niveau de preuve doit être renseigné avant publication.');
        if (!Object.keys(translations).length) throw new Error('Ajoutez au moins une traduction avant publication.');
        if (contentType === 'video' && !mediaUrl) throw new Error('Une vidéo publiée doit comporter une URL média.');
      }
      const id = isUuid(input?.id) ? input.id : randomUUID();
      const payload = {
        id,
        slug,
        title,
        category: typeof input.category === 'string' ? input.category.trim().slice(0, 100) || topic || 'non-classe' : topic || 'non-classe',
        content_type: contentType,
        topic: topic || null,
        language: language || null,
        excerpt: typeof input.excerpt === 'string' ? input.excerpt.trim().slice(0, 1000) || null : null,
        read_time: typeof input.readTime === 'string' ? input.readTime.trim().slice(0, 80) || null : null,
        author: author || null,
        image_url: typeof input.imageUrl === 'string' ? input.imageUrl.trim().slice(0, 2000) || null : null,
        content,
        media_url: mediaUrl || null,
        duration: typeof input.duration === 'string' ? input.duration.trim().slice(0, 80) || null : null,
        sources,
        evidence_level: evidenceLevel,
        medical_warning: typeof input.medicalWarning === 'string' ? input.medicalWarning.trim().slice(0, 2000) || null : null,
        translations,
        faq: Array.isArray(input.faq) ? input.faq.slice(0, 30) : [],
        related_product_ids: Array.isArray(input.relatedProductIds) ? input.relatedProductIds.filter((productId: unknown) => typeof productId === 'string').slice(0, 50) : [],
        status,
        published_at: status === 'published' ? (input.publishedAt || now) : null,
        created_by: adminId,
        updated_by: adminId,
        updated_at: now
      };
      if (supabase) { const { data, error } = await supabase.from('content_articles').upsert(payload, { onConflict: 'id' }).select('*').single(); ensureDatabaseSuccess('enregistrement du contenu éducatif', error); saved = mapAdminArticle(store, data); }
      else { saved = mapAdminArticle(store, { ...payload, created_at: now }); store.inMemoryAdminArticles = [saved, ...store.inMemoryAdminArticles.filter(article => article.id !== id)]; }
    } else if (entity === 'ai_source') {
      const title = typeof input?.title === 'string' ? input.title.trim().slice(0, 240) : '';
      const content = typeof input?.content === 'string' ? input.content.trim().slice(0, 50000) : '';
      const sourceLabel = typeof input?.sourceLabel === 'string' ? input.sourceLabel.trim().slice(0, 240) : '';
      if (!title || !content || !sourceLabel) throw new Error('Le titre, le contenu et la source de la fiche IA sont obligatoires.');
      const id = isUuid(input?.id) ? input.id : randomUUID();
      const validationStatus = ['pending', 'validated', 'rejected'].includes(input.validationStatus) ? input.validationStatus : 'pending';
      const active = validationStatus === 'validated' && input.active === true;
      const payload = { id, title, domains: Array.isArray(input.domains) ? input.domains.filter((item: unknown) => typeof item === 'string').map((item: string) => item.trim().toLowerCase()).filter(Boolean).slice(0, 40) : [], content, source_label: sourceLabel, validation_status: validationStatus, active, evidence_url: typeof input.evidenceUrl === 'string' ? input.evidenceUrl.trim().slice(0, 2000) || null : null, last_reviewed_at: validationStatus === 'validated' ? now : null, created_by: adminId, updated_by: adminId, updated_at: now };
      if (supabase) { const { data, error } = await supabase.from('ai_knowledge_sources').upsert(payload, { onConflict: 'id' }).select('*').single(); ensureDatabaseSuccess('enregistrement de la source IA', error); saved = mapAiSource(store, data); }
      else { saved = mapAiSource(store, { ...payload, created_at: now }); store.inMemoryAdminSources = [saved, ...store.inMemoryAdminSources.filter(source => source.id !== id)]; }
    } else {
      const code = typeof input?.code === 'string' ? input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40) : '';
      const discountType = input.discountType === 'fixed_amount' ? 'fixed_amount' : 'percentage';
      const discountValue = Number(input.discountValue);
      if (!code || !Number.isFinite(discountValue) || discountValue <= 0 || (discountType === 'percentage' && discountValue > 100)) throw new Error('Code ou remise coupon invalide.');
      const payload = { code, description: typeof input.description === 'string' ? input.description.trim().slice(0, 500) || null : null, discount_type: discountType, discount_value: discountValue, currency: typeof input.currency === 'string' ? input.currency.toUpperCase().slice(0, 3) : 'EUR', minimum_order_amount: Math.max(0, Number(input.minimumOrderAmount || 0)), starts_at: input.startsAt || null, ends_at: input.endsAt || null, max_uses: input.maxUses == null || input.maxUses === '' ? null : Math.max(1, Math.floor(Number(input.maxUses))), active: input.active === true, updated_by: adminId, updated_at: now };
      if (supabase) { const { data, error } = await supabase.from('coupons').upsert(payload, { onConflict: 'code' }).select('*').single(); ensureDatabaseSuccess('enregistrement du coupon', error); saved = mapCoupon(store, data); }
      else { saved = mapCoupon(store, { ...payload, used_count: 0, created_at: now }); store.inMemoryAdminCoupons = [saved, ...store.inMemoryAdminCoupons.filter(coupon => coupon.code !== code)]; }
    }
    await writeAdminAudit(store, adminId, `admin_${entity}_save`, { entity, id: saved?.id || saved?.code, status: saved?.status, active: saved?.active });
    return saved;
  }

export async function updateAdminUserRole(store: SupabaseServerStore, adminId: string, targetUserId: string, role: string, adminRole: string): Promise<any | undefined> {
    if (!['customer', 'professional', 'support', 'editor', 'brand', 'admin', 'superadmin'].includes(role)) throw new Error('Rôle invalide.');
    if (targetUserId === adminId) throw new Error('Un administrateur ne peut pas modifier son propre rôle.');
    if (role === 'superadmin' && adminRole !== 'superadmin') throw new Error('Seul un superadmin peut attribuer ce rôle.');
    const supabase = getSupabaseServerClient();
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', targetUserId).select('id, email, full_name, phone, role, avatar_url, created_at, updated_at').maybeSingle();
    ensureDatabaseSuccess('mise à jour du rôle utilisateur', error);
    if (!data) return undefined;
    await writeAdminAudit(store, adminId, 'admin_user_role_update', { targetUserId, role });
    return data;
  }

export async function updateAdminReviewStatus(store: SupabaseServerStore, adminId: string, reviewId: string, status: string): Promise<any | undefined> {
    if (!['pending', 'approved', 'rejected'].includes(status)) throw new Error('Statut d’avis invalide.');
    const supabase = getSupabaseServerClient();
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('reviews').update({ status, updated_at: new Date().toISOString() }).eq('id', reviewId).select('*').maybeSingle();
    ensureDatabaseSuccess('mise à jour du statut de l’avis', error);
    if (!data) return undefined;
    await writeAdminAudit(store, adminId, 'admin_review_status_update', { reviewId, status });
    return data;
  }

export async function updateAdminPaymentStatus(store: SupabaseServerStore, adminId: string, paymentId: string, status: string): Promise<any | undefined> {
    if (!['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'].includes(status)) throw new Error('Statut de paiement invalide.');
    const supabase = getSupabaseServerClient();
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('payments').update({ status, updated_at: new Date().toISOString() }).eq('id', paymentId).select('*').maybeSingle();
    ensureDatabaseSuccess('mise à jour du statut du paiement', error);
    if (!data) return undefined;
    await writeAdminAudit(store, adminId, 'admin_payment_status_update', { paymentId, status });
    return data;
  }

export async function recordCatalogSearch(store: SupabaseServerStore, query: string, resultCount: number, country?: string, userId?: string): Promise<void> {
    const normalizedQuery = query.trim().slice(0, 200);
    if (normalizedQuery.length < 2 || !Number.isSafeInteger(resultCount) || resultCount < 0) return;
    const event = { id: randomUUID(), query: normalizedQuery, resultCount, country, userId, createdAt: new Date().toISOString() };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('catalog_search_events').insert({ id: event.id, query: event.query, result_count: event.resultCount, country: event.country || null, user_id: event.userId || null, created_at: event.createdAt });
      ensureDatabaseSuccess('enregistrement de la recherche catalogue', error);
    } else store.inMemoryAdminSearchEvents.unshift(event);
  }

export async function recordAiUsage(store: SupabaseServerStore, requestType: string, succeeded: boolean, userId?: string): Promise<void> {
    const event = { id: randomUUID(), requestType: requestType.slice(0, 80), succeeded, userId, createdAt: new Date().toISOString() };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('ai_usage_events').insert({ id: event.id, request_type: event.requestType, succeeded, user_id: userId || null, created_at: event.createdAt });
      ensureDatabaseSuccess('enregistrement de l’utilisation IA', error);
    } else store.inMemoryAdminAiUsageEvents.unshift(event);
  }

  // ============================================================
  // PHASE 5: REAL ADMIN ANALYTICS METRICS
  // ============================================================
export async function getAdminAnalyticsMetrics(store: SupabaseServerStore): Promise<any> {
    const products = await store.getProducts();
    const supabase = getSupabaseServerClient();
    let supaOrders: ServerOrder[] = [];
    let supaRefunds: CustomerRefund[] = [];
    let supaProfilesCount = 0;
    let supaTicketsCount = 0;
    let supaEventsCount = 0;
    let supaSearchEvents: Array<{ query: string; result_count: number }> = [];
    let supaAiUsageEvents: Array<{ user_id?: string | null; succeeded: boolean }> = [];
    let supaRefundCount = 0;

    if (supabase) {
      try {
        const { data: oData, error: ordersError } = await supabase.from('orders').select('*');
        ensureDatabaseSuccess('lecture des commandes pour les métriques', ordersError);
        supaOrders = (oData || []).map(data => ({
          id: data.id,
          userId: data.user_id,
          customerEmail: data.customer_email,
          items: data.items || [],
          total: Number(data.total),
          status: data.status,
          stripeSessionId: data.stripe_session_id,
          stripePaymentIntentId: data.stripe_payment_intent_id,
          checkoutIdempotencyKey: data.checkout_idempotency_key,
          shippingAddress: data.shipping_address,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          ...mapOrderVatFields(data)
        }));

        const { data: refundData, error: refundsError } = await supabase.from('refunds').select('*');
        ensureDatabaseSuccess('lecture des remboursements pour les métriques', refundsError);
        supaRefunds = (refundData || []).map(mapRefundRow);

        const { count: pCount, error: profilesError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        ensureDatabaseSuccess('comptage des profils pour les métriques', profilesError);
        supaProfilesCount = pCount || 0;

        const { count: tCount, error: ticketsError } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']);
        ensureDatabaseSuccess('comptage des tickets ouverts pour les métriques', ticketsError);
        supaTicketsCount = tCount || 0;

        const { count: eCount, error: eventsError } = await supabase.from('stripe_events').select('*', { count: 'exact', head: true });
        ensureDatabaseSuccess('comptage des événements Stripe pour les métriques', eventsError);
        supaEventsCount = eCount || 0;

        const { data: searchData, error: searchError } = await supabase.from('catalog_search_events').select('query, result_count');
        ensureDatabaseSuccess('lecture des recherches catalogue pour les métriques', searchError);
        supaSearchEvents = searchData || [];

        const { data: aiUsageData, error: aiUsageError } = await supabase.from('ai_usage_events').select('user_id, succeeded');
        ensureDatabaseSuccess('lecture de l’utilisation IA pour les métriques', aiUsageError);
        supaAiUsageEvents = aiUsageData || [];

        const { count: refundCount, error: refundCountError } = await supabase.from('refunds').select('*', { count: 'exact', head: true }).in('status', ['succeeded', 'completed', 'pending']);
        ensureDatabaseSuccess('comptage des remboursements pour les métriques', refundCountError);
        supaRefundCount = refundCount || 0;
      } catch (err) {
        console.error('[serverDb] getAdminAnalyticsMetrics error:', err);
        throw err;
      }
    }

    // Never merge the local cache with Supabase: once persistence is
    // configured, the dashboard must describe the persistent source only.
    const sourceOrders: ServerOrder[] = supabase ? supaOrders : store.inMemoryOrders;
    const sourceRefunds: CustomerRefund[] = supabase ? supaRefunds : store.inMemoryRefunds;
    const revenueStatuses: OrderStatus[] = [
      'paid', 'processing', 'packed', 'shipped', 'delivered',
      'return_requested', 'returned', 'partially_refunded', 'refunded'
    ];
    const paidOrders = sourceOrders.filter(order => revenueStatuses.includes(order.status));
    const grossRevenueCents = paidOrders.reduce((sum, order) => sum + Math.round(Number(order.total || 0) * 100), 0);
    const refundedRevenueCents = sourceRefunds
      .filter(refund => ['succeeded', 'completed'].includes(refund.status) && (refund.currency || '').toUpperCase() === 'EUR')
      .reduce((sum, refund) => sum + Math.round(Number(refund.amount || 0) * 100), 0);
    const grossRevenue = grossRevenueCents / 100;
    const revenueTest = Math.max(0, grossRevenueCents - refundedRevenueCents) / 100;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = sourceOrders.filter(order => order.createdAt.startsWith(todayStr));

    const pendingOrders = sourceOrders.filter(order => order.status === 'payment_pending_webhook' || order.status === 'pending_payment');
    const processingOrders = sourceOrders.filter(order => order.status === 'processing' || order.status === 'packed');
    const shippedOrders = sourceOrders.filter(order => order.status === 'shipped' || order.status === 'delivered');
    const refundedOrders = sourceOrders.filter(order => order.status === 'refunded' || order.status === 'partially_refunded');

    // AOV is deliberately calculated from persisted paid orders, not from a
    // fixture. Refunds are shown separately and do not rewrite order history.
    const avgOrderValue = paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0;
    const searchEvents: any[] = supabase ? supaSearchEvents : store.inMemoryAdminSearchEvents;
    const zeroResultSearches = searchEvents.filter(event => Number(event.result_count ?? event.resultCount) === 0);
    const zeroResultByQuery = new Map<string, number>();
    zeroResultSearches.forEach(event => {
      const query = String(event.query).trim();
      zeroResultByQuery.set(query, (zeroResultByQuery.get(query) || 0) + 1);
    });
    const topZeroResultSearches = Array.from(zeroResultByQuery.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count || a.query.localeCompare(b.query))
      .slice(0, 10);
    const aiUsageEvents: any[] = supabase ? supaAiUsageEvents : store.inMemoryAdminAiUsageEvents;
    const activeAiUsers = new Set(aiUsageEvents.filter(event => event.succeeded && (event.user_id || event.userId)).map(event => event.user_id || event.userId));
    const aiUsageRate = supaProfilesCount > 0 ? (activeAiUsers.size / supaProfilesCount) * 100 : null;
    const popularProductCounts = new Map<string, number>();
    paidOrders.forEach(order => (order.items || []).forEach((item: any) => {
      const productId = item.productId || item.product_id;
      const quantity = Number(item.quantity || 0);
      if (productId && quantity > 0) popularProductCounts.set(productId, (popularProductCounts.get(productId) || 0) + quantity);
    }));
    const productById = new Map(products.map(product => [product.id, product]));
    const popularProducts = Array.from(popularProductCounts.entries())
      .map(([productId, quantity]) => ({ productId, name: productById.get(productId)?.name || 'Produit non renseigné', quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
    const inMemoryRefundCount = store.inMemoryRefunds.filter(refund => ['succeeded', 'completed', 'pending'].includes(refund.status)).length;

    const lowStockProducts = products.filter(p => p.stockQuantity < 5 && p.stockQuantity > 0);
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0 || !p.inStock);

    return {
      revenueTest,
      grossRevenue,
      netRevenue: revenueTest,
      totalOrders: sourceOrders.length,
      todayOrdersCount: todayOrders.length,
      pendingOrdersCount: pendingOrders.length,
      paidOrdersCount: paidOrders.length,
      processingOrdersCount: processingOrders.length,
      shippedOrdersCount: shippedOrders.length,
      refundedOrdersCount: refundedOrders.length,
      refundsCount: supabase ? supaRefundCount : inMemoryRefundCount,
      avgOrderValue,
      lowStockProducts,
      outOfStockProducts,
      popularProducts,
      searchesWithoutResultsCount: zeroResultSearches.length,
      topZeroResultSearches,
      aiUsageRate,
      aiUsageEventsCount: aiUsageEvents.length,
      openTicketsCount: supabase
        ? supaTicketsCount
        : store.inMemoryTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
      stripeEventsCount: supabase ? supaEventsCount : store.processedEventsSet.size,
      registeredUsersCount: supabase ? supaProfilesCount : 0
    };
  }

export async function claimEventForProcessing(store: SupabaseServerStore, eventId: string, eventType: string): Promise<boolean> {
    if (store.processedEventsSet.has(eventId)) return false;

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.rpc('claim_stripe_event', {
        p_event_id: eventId,
        p_event_type: eventType
      });
      ensureDatabaseSuccess('réservation idempotente de l’événement Stripe', error);
      if (data === true) return true;
      store.processedEventsSet.add(eventId);
      return false;
    }

    store.processedEventsSet.add(eventId);
    return true;
  }

export async function markEventError(store: SupabaseServerStore, eventId: string, eventType: string, errorMessage: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.rpc('mark_stripe_event_error', {
        p_event_id: eventId,
        p_event_type: eventType,
        p_error: errorMessage
      });
      ensureDatabaseSuccess('enregistrement de l’erreur Stripe', error);
    }
    store.processedEventsSet.delete(eventId);
  }

export async function isEventProcessed(store: SupabaseServerStore, eventId: string): Promise<boolean> {
    if (store.processedEventsSet.has(eventId)) return true;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('stripe_events').select('event_id').eq('event_id', eventId).maybeSingle();
      ensureDatabaseSuccess('lecture de l’idempotence Stripe', error);
      if (data) {
        store.processedEventsSet.add(eventId);
        return true;
      }
    }
    return false;
  }

export async function markEventProcessed(store: SupabaseServerStore, eventId: string, eventType: string = 'stripe_webhook', details?: any): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('stripe_events').upsert({
        event_id: eventId,
        event_type: eventType,
        status: 'processed',
        details: details || null,
        created_at: new Date().toISOString()
      }, { onConflict: 'event_id' });
      ensureDatabaseSuccess('enregistrement de l’événement Stripe', error);
    }
    store.processedEventsSet.add(eventId);
  }
