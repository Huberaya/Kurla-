import React, { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, FileText, Image as ImageIcon, Package, Plus, RefreshCw, Save, Upload, X } from 'lucide-react';

type CatalogAdminPanelProps = {
  headers: HeadersInit;
  onSuccess?: (message: string) => void;
};

type VariantDraft = {
  id?: string;
  name: string;
  price: string;
  stockQuantity: string;
  size: string;
  format: string;
  color: string;
  shade: string;
  scent: string;
  sku: string;
  isActive: boolean;
};

type ProductDraft = {
  id?: string;
  name: string;
  slug: string;
  brand: string;
  category: 'cheveux' | 'peau';
  subCategory: string;
  price: string;
  originalPrice: string;
  promotionPrice: string;
  promotionStartsAt: string;
  promotionEndsAt: string;
  isPromo: boolean;
  vatRate: string;
  priceIncludesVat: boolean;
  stockQuantity: string;
  isActive: boolean;
  countryAvailability: string;
  description: string;
  image: string;
  imageOwnershipStatus: 'brand_provided' | 'licensed' | 'unverified';
  images: string;
  ingredients: string;
  inci: string;
  warnings: string;
  certifications: string;
  catalogCategoryTags: string[];
  targetAudiences: string[];
  sourceSupplier: string;
  supplierSku: string;
  variants: VariantDraft[];
};

const emptyVariant = (): VariantDraft => ({ name: '', price: '', stockQuantity: '0', size: '', format: '', color: '', shade: '', scent: '', sku: '', isActive: true });
const emptyDraft = (): ProductDraft => ({
  name: '', slug: '', brand: '', category: 'cheveux', subCategory: '', price: '', originalPrice: '', promotionPrice: '',
  promotionStartsAt: '', promotionEndsAt: '', isPromo: false, vatRate: '20', priceIncludesVat: true, stockQuantity: '0',
  isActive: false, countryAvailability: 'FR', description: '', image: '', imageOwnershipStatus: 'unverified', images: '', ingredients: '', inci: '', warnings: '',
  certifications: '[]', catalogCategoryTags: [], targetAudiences: [], sourceSupplier: '', supplierSku: '', variants: []
});

function inputClass(): string {
  return 'w-full px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-xs focus:outline-none focus:border-[#C8753D]';
}
function labelClass(): string {
  return 'text-[10px] uppercase tracking-wider font-bold text-[#D49A63]';
}
function splitLines(value: string): string[] {
  return value.split(/[|;\n]/).map(item => item.trim()).filter(Boolean);
}
function variantFromApi(variant: any): VariantDraft {
  return {
    id: variant.id,
    name: variant.name || variant.label || '',
    price: String(variant.price ?? ''),
    stockQuantity: String(variant.stockQuantity ?? variant.stock_quantity ?? 0),
    size: variant.option_type === 'size' ? (variant.option_value || '') : '',
    format: variant.format_label || '',
    color: variant.color || '',
    shade: variant.shade || '',
    scent: variant.scent || '',
    sku: variant.sku || '',
    isActive: variant.isActive ?? variant.is_active !== false
  };
}
function draftFromProduct(product: any): ProductDraft {
  return {
    id: product.id,
    name: product.name || '', slug: product.slug || '', brand: product.brand || '', category: product.category === 'peau' ? 'peau' : 'cheveux',
    subCategory: product.subCategory || product.subcategory || '', price: String(product.price ?? ''), originalPrice: String(product.originalPrice ?? ''),
    promotionPrice: String(product.promotionPrice ?? product.promotion_price ?? ''), promotionStartsAt: product.promotionStartsAt ? product.promotionStartsAt.slice(0, 16) : '',
    promotionEndsAt: product.promotionEndsAt ? product.promotionEndsAt.slice(0, 16) : '', isPromo: product.isPromo === true || product.is_promo === true,
    vatRate: String(product.vatRate ?? product.vat_rate ?? 20), priceIncludesVat: product.priceIncludesVat !== false,
    stockQuantity: String(product.stockQuantity ?? product.stock_quantity ?? 0), isActive: product.isActive === true || product.is_active === true,
    countryAvailability: (product.countryAvailability || []).join(', '), description: product.description || '', image: product.image || '',
    imageOwnershipStatus: product.imageOwnershipStatus || product.image_ownership_status || 'unverified',
    images: (product.galleryImages || []).map((image: any) => image.url).filter(Boolean).join('\n'), ingredients: (product.ingredients || []).join(' | '),
    inci: product.inci || '', warnings: (product.warnings || []).join(' | '), certifications: JSON.stringify(product.certifications || [], null, 2),
    catalogCategoryTags: product.catalogCategoryTags || [], targetAudiences: product.targetAudiences || [], sourceSupplier: product.sourceSupplier || '',
    supplierSku: product.supplierSku || '', variants: (product.variants || []).map(variantFromApi)
  };
}

export const CatalogAdminPanel: React.FC<CatalogAdminPanelProps> = ({ headers, onSuccess }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [audiences, setAudiences] = useState<any[]>([]);
  const [imports, setImports] = useState<any[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft());
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [supplier, setSupplier] = useState('');
  const [supplierJson, setSupplierJson] = useState('[]');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  const loadCatalog = async () => {
    setBusy(true);
    setError('');
    try {
      const [catalogResponse, taxonomyResponse, importsResponse] = await Promise.all([
        fetch('/api/admin/catalog/products', { headers }),
        fetch('/api/admin/catalog/taxonomy', { headers }),
        fetch('/api/admin/catalog/imports', { headers })
      ]);
      const catalog = await catalogResponse.json();
      const taxonomy = await taxonomyResponse.json();
      const importData = await importsResponse.json();
      if (!catalogResponse.ok) throw new Error(catalog.error || 'Catalogue indisponible.');
      setProducts(catalog.products || []);
      setCategories(taxonomy.categories || []);
      setAudiences(taxonomy.audiences || []);
      setImports(importData.imports || []);
    } catch (loadError: any) {
      setError(loadError.message || 'Impossible de charger le catalogue.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { loadCatalog(); }, []);

  const filteredProducts = useMemo(() => products.filter(product => `${product.name} ${product.brand || ''} ${product.slug}`.toLowerCase().includes(filter.toLowerCase())), [products, filter]);

  const setField = (field: keyof ProductDraft, value: any) => setDraft(current => ({ ...current, [field]: value }));
  const toggleValue = (field: 'catalogCategoryTags' | 'targetAudiences', value: string) => {
    setDraft(current => ({ ...current, [field]: current[field].includes(value) ? current[field].filter(item => item !== value) : [...current[field], value] }));
  };
  const updateVariant = (index: number, field: keyof VariantDraft, value: any) => setDraft(current => ({
    ...current,
    variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant)
  }));

  const payloadFromDraft = () => {
    let certifications: unknown = [];
    try {
      certifications = draft.certifications.trim() ? JSON.parse(draft.certifications) : [];
      if (!Array.isArray(certifications)) throw new Error('Les certifications doivent être un tableau JSON.');
    } catch (parseError: any) {
      throw new Error(parseError.message || 'Certifications JSON invalides.');
    }
    return {
      ...(draft.id ? { id: draft.id } : {}), name: draft.name, slug: draft.slug, brand: draft.brand, category: draft.category, subCategory: draft.subCategory,
      price: draft.price, originalPrice: draft.originalPrice || undefined, promotionPrice: draft.promotionPrice || undefined,
      promotionStartsAt: draft.promotionStartsAt || undefined, promotionEndsAt: draft.promotionEndsAt || undefined, isPromo: draft.isPromo,
      vatRate: draft.vatRate, priceIncludesVat: draft.priceIncludesVat, stockQuantity: draft.stockQuantity, isActive: draft.isActive,
      countryAvailability: splitLines(draft.countryAvailability).map(country => country.toUpperCase()), description: draft.description, image: draft.image, imageOwnershipStatus: draft.imageOwnershipStatus,
      images: splitLines(draft.images).map(url => ({ url, ownershipStatus: draft.imageOwnershipStatus, validationStatus: 'pending' })), ingredients: splitLines(draft.ingredients), inci: draft.inci, warnings: splitLines(draft.warnings), certifications,
      catalogCategoryTags: draft.catalogCategoryTags, targetAudiences: draft.targetAudiences, sourceSupplier: draft.sourceSupplier, supplierSku: draft.supplierSku,
      variants: draft.variants.map(variant => ({ id: variant.id, name: variant.name, price: variant.price || draft.price, stockQuantity: variant.stockQuantity, sku: variant.sku,
        optionType: variant.size ? 'size' : variant.format ? 'format' : variant.shade ? 'shade' : variant.scent ? 'scent' : undefined,
        optionValue: variant.size || variant.format || variant.shade || variant.scent || undefined, formatLabel: variant.format, color: variant.color, shade: variant.shade,
        scent: variant.scent, isActive: variant.isActive }))
    };
  };

  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch(draft.id ? `/api/admin/catalog/products/${draft.id}` : '/api/admin/catalog/products', {
        method: draft.id ? 'PATCH' : 'POST', headers, body: JSON.stringify(payloadFromDraft())
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Produit non enregistré.');
      onSuccess?.(draft.id ? 'Produit catalogue mis à jour.' : 'Produit catalogue créé en brouillon.');
      setDraft(emptyDraft()); await loadCatalog();
    } catch (saveError: any) { setError(saveError.message || 'Impossible d’enregistrer le produit.'); }
    finally { setBusy(false); }
  };

  const importCsv = async () => {
    if (!csvText.trim()) return setError('Sélectionnez un CSV avant de lancer l’import.');
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/catalog/import/csv', { method: 'POST', headers, body: JSON.stringify({ csv: csvText, fileName: csvFile?.name }) });
      const data = await response.json();
      if (!response.ok && !data.import) throw new Error(data.error || 'Import CSV refusé.');
      onSuccess?.(`Import CSV terminé : ${data.import?.imported || 0} ligne(s) importée(s), ${data.import?.rejected || 0} rejetée(s).`);
      setCsvText(''); setCsvFile(null); await loadCatalog();
    } catch (importError: any) { setError(importError.message || 'Impossible d’importer le CSV.'); }
    finally { setBusy(false); }
  };

  const importSupplier = async () => {
    let records: unknown;
    try { records = JSON.parse(supplierJson); } catch { return setError('Le flux fournisseur doit être un tableau JSON valide.'); }
    if (!Array.isArray(records)) return setError('Le flux fournisseur doit être un tableau JSON.');
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/catalog/import/supplier', { method: 'POST', headers, body: JSON.stringify({ supplier, records }) });
      const data = await response.json();
      if (!response.ok && !data.import) throw new Error(data.error || 'Import fournisseur refusé.');
      onSuccess?.(`Flux fournisseur terminé : ${data.import?.imported || 0} ligne(s) importée(s), ${data.import?.rejected || 0} rejetée(s).`);
      await loadCatalog();
    } catch (importError: any) { setError(importError.message || 'Impossible d’importer le fournisseur.'); }
    finally { setBusy(false); }
  };

  const markValidation = async (productId: string, checkType: string) => {
    if (!confirm(`Confirmer que le contrôle « ${checkType} » a été vérifié à partir d’une source réelle ?`)) return;
    try {
      const response = await fetch('/api/admin/catalog/validation', { method: 'POST', headers, body: JSON.stringify({ productId, checkType, status: 'passed', note: 'Contrôle confirmé par un administrateur depuis le catalogue.' }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Validation refusée.');
      onSuccess?.(`Contrôle ${checkType} enregistré sans inventer de donnée.`); await loadCatalog();
    } catch (validationError: any) { setError(validationError.message || 'Validation impossible.'); }
  };

  const setStatus = async (product: any, status: string) => {
    try {
      const response = await fetch(`/api/admin/catalog/${product.id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Statut refusé.');
      onSuccess?.(`Statut de ${product.name} mis à jour.`); await loadCatalog();
    } catch (statusError: any) { setError(statusError.message || 'Impossible de modifier le statut.'); }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#C8753D]/30 shadow-xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif-title font-bold flex items-center gap-2"><Package className="w-5 h-5 text-[#C8753D]" /> Catalogue commercial administrable</h2>
            <p className="text-xs text-[#FFF7EF]/55 mt-2">Les produits importés restent en brouillon et non publiés tant que les contrôles de confiance ne sont pas tous confirmés.</p>
          </div>
          <button onClick={loadCatalog} className="px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 text-xs flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} /> Actualiser</button>
        </div>
        {error && <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">{error}</div>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form onSubmit={saveDraft} className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-5">
          <div className="flex items-center justify-between"><h3 className="font-bold flex items-center gap-2"><Save className="w-4 h-4 text-[#D49A63]" /> {draft.id ? 'Modifier la fiche' : 'Créer une fiche manuelle'}</h3>{draft.id && <button type="button" onClick={() => setDraft(emptyDraft())} className="text-xs text-[#FFF7EF]/50">Nouvelle fiche</button>}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className={labelClass()}>Nom *</span><input required value={draft.name} onChange={e => setField('name', e.target.value)} className={inputClass()} /></label>
            <label className="space-y-1"><span className={labelClass()}>Slug</span><input value={draft.slug} onChange={e => setField('slug', e.target.value)} className={inputClass()} placeholder="généré si vide" /></label>
            <label className="space-y-1"><span className={labelClass()}>Marque</span><input value={draft.brand} onChange={e => setField('brand', e.target.value)} className={inputClass()} /></label>
            <label className="space-y-1"><span className={labelClass()}>Département *</span><select value={draft.category} onChange={e => setField('category', e.target.value)} className={inputClass()}><option value="cheveux">Cheveux</option><option value="peau">Peau</option></select></label>
            <label className="space-y-1"><span className={labelClass()}>Sous-catégorie</span><input value={draft.subCategory} onChange={e => setField('subCategory', e.target.value)} className={inputClass()} /></label>
            <label className="space-y-1"><span className={labelClass()}>Prix TTC *</span><input required type="number" min="0" step="0.01" value={draft.price} onChange={e => setField('price', e.target.value)} className={inputClass()} /></label>
            <label className="space-y-1"><span className={labelClass()}>Prix avant promotion</span><input type="number" min="0" step="0.01" value={draft.originalPrice} onChange={e => setField('originalPrice', e.target.value)} className={inputClass()} /></label>
            <label className="space-y-1"><span className={labelClass()}>TVA (%)</span><input type="number" min="0" max="100" step="0.01" value={draft.vatRate} onChange={e => setField('vatRate', e.target.value)} className={inputClass()} /></label>
          </div>

          <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-3"><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={draft.isPromo} onChange={e => setField('isPromo', e.target.checked)} /> Promotion active</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.priceIncludesVat} onChange={e => setField('priceIncludesVat', e.target.checked)} /> Prix TTC</label></div>{draft.isPromo && <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><label className="space-y-1"><span className={labelClass()}>Prix promo *</span><input required type="number" min="0" step="0.01" value={draft.promotionPrice} onChange={e => setField('promotionPrice', e.target.value)} className={inputClass()} /></label><label className="space-y-1"><span className={labelClass()}>Début</span><input type="datetime-local" value={draft.promotionStartsAt} onChange={e => setField('promotionStartsAt', e.target.value)} className={inputClass()} /></label><label className="space-y-1"><span className={labelClass()}>Fin</span><input type="datetime-local" value={draft.promotionEndsAt} onChange={e => setField('promotionEndsAt', e.target.value)} className={inputClass()} /></label></div>}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className={labelClass()}>Stock de base</span><input type="number" min="0" step="1" value={draft.stockQuantity} onChange={e => setField('stockQuantity', e.target.value)} className={inputClass()} /></label>
            <label className="space-y-1"><span className={labelClass()}>Pays (codes ISO, INT)</span><input value={draft.countryAvailability} onChange={e => setField('countryAvailability', e.target.value)} className={inputClass()} placeholder="FR, BE, CH" /></label>
            <label className="space-y-1 sm:col-span-2"><span className={labelClass()}>Image principale (URL vérifiable)</span><input value={draft.image} onChange={e => setField('image', e.target.value)} className={inputClass()} placeholder="https://…" /></label>
            <label className="space-y-1"><span className={labelClass()}>Provenance image</span><select value={draft.imageOwnershipStatus} onChange={e => setField('imageOwnershipStatus', e.target.value)} className={inputClass()}><option value="unverified">Non vérifiée</option><option value="brand_provided">Fournie par la marque</option><option value="licensed">Sous licence documentée</option></select></label>
            <p className="text-[10px] text-[#FFF7EF]/45 self-end pb-2">Le choix est une attestation opérateur, pas une preuve automatique. Le contrôle Images reste à valider.</p>
            <label className="space-y-1 sm:col-span-2"><span className={labelClass()}>Autres images (une URL par ligne)</span><textarea rows={3} value={draft.images} onChange={e => setField('images', e.target.value)} className={inputClass()} /></label>
          </div>

          <div className="space-y-2"><span className={labelClass()}>Catégories administrées</span><div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-3 rounded-xl bg-[#050403]">{categories.map(category => <label key={category.slug} className="text-[11px] flex items-center gap-2"><input type="checkbox" checked={draft.catalogCategoryTags.includes(category.slug)} onChange={() => toggleValue('catalogCategoryTags', category.slug)} />{category.label}</label>)}</div></div>
          <div className="space-y-2"><span className={labelClass()}>Publics</span><div className="flex flex-wrap gap-2 p-3 rounded-xl bg-[#050403]">{audiences.map(audience => <label key={audience.slug} className="text-[11px] flex items-center gap-2"><input type="checkbox" checked={draft.targetAudiences.includes(audience.slug)} onChange={() => toggleValue('targetAudiences', audience.slug)} />{audience.label}</label>)}</div></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="space-y-1"><span className={labelClass()}>Composition / ingrédients</span><textarea rows={3} value={draft.ingredients} onChange={e => setField('ingredients', e.target.value)} className={inputClass()} placeholder="Séparer par |" /></label><label className="space-y-1"><span className={labelClass()}>INCI</span><textarea rows={3} value={draft.inci} onChange={e => setField('inci', e.target.value)} className={inputClass()} /></label><label className="space-y-1"><span className={labelClass()}>Avertissements</span><textarea rows={3} value={draft.warnings} onChange={e => setField('warnings', e.target.value)} className={inputClass()} placeholder="Uniquement ceux fournis par la source" /></label><label className="space-y-1"><span className={labelClass()}>Certifications (JSON)</span><textarea rows={3} value={draft.certifications} onChange={e => setField('certifications', e.target.value)} className={inputClass()} placeholder='[] si non renseigné' /></label></div>
          <label className="space-y-1 block"><span className={labelClass()}>Description</span><textarea rows={3} value={draft.description} onChange={e => setField('description', e.target.value)} className={inputClass()} /></label>

          <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-3"><div className="flex items-center justify-between"><span className={labelClass()}>Variantes : tailles, formats, couleurs, parfums</span><button type="button" onClick={() => setDraft(current => ({ ...current, variants: [...current.variants, emptyVariant()] }))} className="px-2.5 py-1.5 rounded-lg bg-[#C8753D] text-[11px] font-bold flex items-center gap-1"><Plus className="w-3 h-3" /> Ajouter</button></div>{draft.variants.map((variant, index) => <div key={index} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl border border-[#FFF7EF]/10"><input placeholder="Nom / libellé *" value={variant.name} onChange={e => updateVariant(index, 'name', e.target.value)} className={inputClass()} /><input placeholder="Prix" type="number" min="0" step="0.01" value={variant.price} onChange={e => updateVariant(index, 'price', e.target.value)} className={inputClass()} /><input placeholder="Stock" type="number" min="0" value={variant.stockQuantity} onChange={e => updateVariant(index, 'stockQuantity', e.target.value)} className={inputClass()} /><input placeholder="SKU" value={variant.sku} onChange={e => updateVariant(index, 'sku', e.target.value)} className={inputClass()} /><input placeholder="Taille" value={variant.size} onChange={e => updateVariant(index, 'size', e.target.value)} className={inputClass()} /><input placeholder="Format" value={variant.format} onChange={e => updateVariant(index, 'format', e.target.value)} className={inputClass()} /><input placeholder="Couleur / teinte" value={variant.color || variant.shade} onChange={e => { updateVariant(index, 'color', e.target.value); updateVariant(index, 'shade', e.target.value); }} className={inputClass()} /><input placeholder="Parfum" value={variant.scent} onChange={e => updateVariant(index, 'scent', e.target.value)} className={inputClass()} /><label className="text-[11px] flex items-center gap-2"><input type="checkbox" checked={variant.isActive} onChange={e => updateVariant(index, 'isActive', e.target.checked)} /> Variante active</label><button type="button" onClick={() => setDraft(current => ({ ...current, variants: current.variants.filter((_, variantIndex) => variantIndex !== index) }))} className="text-[11px] text-rose-300 flex items-center gap-1"><X className="w-3 h-3" /> Retirer</button></div>)}</div>
          <div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={draft.isActive} onChange={e => setField('isActive', e.target.checked)} /> Fiche active (publication toujours soumise aux contrôles)</label><button disabled={busy} type="submit" className="px-5 py-2.5 rounded-xl bg-[#C8753D] hover:bg-[#D49A63] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2"><Save className="w-3.5 h-3.5" /> Enregistrer</button></div>
        </form>

        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4"><h3 className="font-bold flex items-center gap-2"><Upload className="w-4 h-4 text-[#D49A63]" /> Import CSV</h3><p className="text-[11px] text-[#FFF7EF]/50">Séparateur virgule, point-virgule ou tabulation. Les tableaux utilisent |. Les variantes et certifications peuvent être des tableaux JSON. Champs principaux : name, slug, brand, price, vat_rate, promotion_price, stock_quantity, country_availability, composition, warnings, images.</p><input type="file" accept=".csv,text/csv" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setCsvFile(file); setCsvText(await file.text()); }} className="text-xs w-full" /><button onClick={importCsv} disabled={busy || !csvText} className="px-4 py-2 rounded-xl bg-[#C8753D] disabled:opacity-50 text-xs font-bold">Importer le CSV</button></div>
          <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4"><h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-[#D49A63]" /> Import fournisseur</h3><p className="text-[11px] text-[#FFF7EF]/50">Collez le flux JSON fourni par le partenaire. Aucune certification, image ou disponibilité n’est complétée automatiquement.</p><input value={supplier} onChange={e => setSupplier(e.target.value)} className={inputClass()} placeholder="Nom exact du fournisseur" /><textarea rows={8} value={supplierJson} onChange={e => setSupplierJson(e.target.value)} className={inputClass()} placeholder='[{"supplierSku":"…","name":"…","price":0}]' /><button onClick={importSupplier} disabled={busy} className="px-4 py-2 rounded-xl bg-[#C8753D] disabled:opacity-50 text-xs font-bold">Importer le flux</button></div>
          <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-3"><h3 className="font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-[#D49A63]" /> Journal des imports</h3>{imports.length === 0 ? <p className="text-xs text-[#FFF7EF]/45">Aucun import enregistré.</p> : imports.slice(0, 8).map(item => <div key={item.id} className="text-[11px] flex justify-between gap-2 border-b border-[#FFF7EF]/5 pb-2"><span>{item.source_type}{item.supplier ? ` • ${item.supplier}` : ''}</span><span className={item.status === 'completed' ? 'text-emerald-300' : 'text-amber-300'}>{item.status} • {item.rows_imported}/{item.rows_received}</span></div>)}</div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><h3 className="font-bold">Fiches produits ({products.length})</h3><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Rechercher un produit…" className="sm:w-72 px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs" /></div>{filteredProducts.length === 0 ? <p className="text-xs text-[#FFF7EF]/45">Aucune fiche catalogue.</p> : <div className="space-y-3">{filteredProducts.map(product => <div key={product.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-sm">{product.name}</span><span className="px-2 py-0.5 rounded-full text-[10px] bg-[#C8753D]/15 text-[#D49A63]">{product.catalogStatus || 'draft'}</span><span className={`px-2 py-0.5 rounded-full text-[10px] ${product.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}`}>{product.isActive ? 'actif' : 'inactif'}</span></div><p className="text-[11px] text-[#FFF7EF]/55 mt-1">{product.brand || 'Marque non renseignée'} • {Number(product.price || 0).toFixed(2)} € • stock {product.stockQuantity ?? 0} • modifié {product.lastCatalogUpdatedAt ? new Date(product.lastCatalogUpdatedAt).toLocaleString('fr-FR') : 'date non renseignée'}</p></div><div className="flex flex-wrap items-center gap-2"><select value={product.catalogStatus || 'draft'} onChange={e => setStatus(product, e.target.value)} className="px-2 py-1.5 rounded-lg bg-[#1A0F0A] border border-[#FFF7EF]/15 text-[11px]"><option value="draft">brouillon</option><option value="pending_review">à vérifier</option><option value="published">publier</option><option value="unavailable">indisponible</option></select><button onClick={() => setDraft(draftFromProduct(product))} className="px-3 py-1.5 rounded-lg bg-[#C8753D] text-[11px] font-bold">Modifier</button></div></div><div className="flex flex-wrap gap-1.5 mt-3">{Object.entries(product.validation || {}).map(([check, status]) => <button key={check} onClick={() => status === 'verified' ? undefined : markValidation(product.id, check)} disabled={status === 'verified'} className={`px-2 py-1 rounded-lg text-[10px] border ${status === 'verified' ? 'border-emerald-500/30 text-emerald-300' : 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10'}`}><span className="capitalize">{check}</span>: {String(status)}{status !== 'verified' && <Check className="inline w-3 h-3 ml-1" />}</button>)}</div></div>)}</div>}</div>
    </div>
  );
};
