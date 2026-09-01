import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL || 'https://qzwgsarfdegqtfdnqiql.supabase.co';
const key = process.env.SUPABASE_SECRET_KEY || '';
const APPLY = process.argv.includes('--apply');
const supa = createClient(url, key, { auth: { persistSession: false } });

const SUPPLIERS = [
  { id:'sup-private-label-cn', legalName:'Guangzhou OEM Haircare Manufacturers (Alibaba)', tradeName:'Private label CN (shampoing/conditionneur/mask/leave-in/gel)', type:'contract_manufacturer', country:'CN', website:'https://www.alibaba.com', moq:200, lead:20,
    notes:'Fabricants OEM/ODM repérés (Chinchy ~0,9-3,2$ MOQ200 ; Cimei masques MOQ300 ; Guangzhou Huati/Napoly sets 1,3-4,6$ MOQ100-500). Sulfate-free, MOQ faible, 10-20 j. Échantillonner + conformité UE (CPNP, allergènes R.1223/2009) avant commande.' },
  { id:'sup-private-label-eu', legalName:'Laboratoire cosmétique private label UE (dLab/NOESIS type)', tradeName:"Façonnier UE (dLab, NOESIS BG…)", type:'laboratory', country:'EU', website:'https://dlabcosmetics.com', moq:200, lead:45,
    notes:'Private label Europe (leave-in ~18€ coût, marge >60% à 22€ de vente). Plus cher que la Chine mais conformité UE/ISO 22716 directe, délai ~45 j. Backup qualité / montée de gamme.' },
  { id:'sup-karite-west-africa', legalName:'Coopératives karité — Ghana/Burkina/Mali (direct)', tradeName:'Karité brut vrac direct productrices', type:'raw_material', country:'GH', website:'https://www.barakasheabutter.com', moq:25, lead:30,
    notes:"Beurre de karité brut non raffiné direct coopératives (Baraka Ghana ; KariteDuFaso Burkina). Vrac ~6-8 €/kg, blocs 25 kg. Commerce équitable femmes. Acheminement + contrôle qualité à prévoir." },
  { id:'sup-karite-eu-wholesale', legalName:'Grossistes karité UE (LOBIKO / Tunteya / Nétyvia)', tradeName:'Karité & huiles vrac, stocké en UE', type:'distributor', country:'FR', website:'https://www.tunteya.eu', moq:5, lead:7,
    notes:"Karité/coco/cacao/mangue en gros dès 5 kg, prix dégressifs, stocké en UE (pas de douane). Tunteya (Slovénie, direct Ghana) ; LOBIKO France 5 kg ; SENIMPEX/KBA/OBI. Idéal premier lot limité." },
  { id:'sup-accessories-cn', legalName:'OEM accessoires cheveux (Chine / Alibaba)', tradeName:'Peignes, bonnets satin, vaporisateurs', type:'textile', country:'CN', website:'https://www.alibaba.com', moq:300, lead:25,
    notes:"Peigne démêloir dents larges, bonnet satin + taie, flacon brume continue. Très bas coût (cible 2,5-4,8 €). Vérifier satin (vs polyester), solidité des dents, contenance 300 ml." },
  { id:'sup-brands-wholesale', legalName:'Grossistes marques afro (AfricanFabs / Afro Wholesale)', tradeName:'Revente marques (contact établi)', type:'brand', country:'NL', website:'https://www.africanfabs.com', moq:50, lead:10,
    notes:"Contacts identifiés : AfricanFabs (info@africanfabs.com / +31 617227322), Afro Wholesale (support@afrowholesale.eu / +31 685 198 455). Revente marques populaires. Marge ~45% mais zéro risque fabrication." }
];

const CAT_SUP = {
  'Shampoing':'sup-private-label-cn','Co-wash':'sup-private-label-cn','Après-shampoing':'sup-private-label-cn',
  'Masque':'sup-private-label-cn','Leave-in':'sup-private-label-cn','Gel/Coiffant':'sup-private-label-cn',
  'Huile/Beurre':'sup-karite-west-africa','Accessoire':'sup-accessories-cn'
};

function guessCategory(name){
  const n=name.toLowerCase();
  // Produits FINIS d'abord (un masque/leave-in "au karité" n'est pas de la matière première).
  if(/co-wash|cowash/.test(n)) return 'Co-wash';
  // Outils matériels : testés avant les produits (un peigne/brosse « démêlant »
  // ou une brosse à « edges » ne sont pas des cosmétiques).
  if(/peigne|bonnet|vaporis|flacon applicat|taie|satin|brosse|bigoudi|pince|foulard|headwrap|filet|à edges|edge control brush|crocodile/.test(n)) return 'Accessoire';
  // « Après-shampoing » avant « shampoing » (sinon le mot « shampoing » l'emporte).
  if(/après|apres|conditionneur/.test(n)) return 'Après-shampoing';
  if(/shampoing|shampoo|gommage cuir/.test(n)) return 'Shampoing';
  if(/masque/.test(n)) return 'Masque';
  if(/leave-in|leave in|spray refresh/.test(n)) return 'Leave-in';
  if(/mousse|gel|coiff|twist|crème de définition|creme de definition/.test(n)) return 'Gel/Coiffant';
  if(/flacon|applicateur/.test(n)) return 'Accessoire';
  // Matières premières / huiles & beurres bruts (héros marque propre).
  if(/karité|karite|beurre|huile|sérum|serum|ricin|jamaï|mangue|coco/.test(n)) return 'Huile/Beurre';
  if(/crème hydratante|creme hydratante|démêl|demel/.test(n)) return 'Leave-in';
  return 'Leave-in';
}

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();

async function main(){
  console.log(`\n${APPLY?'APPLICATION':'SIMULATION'} — ${SUPPLIERS.length} fournisseurs.\n`);
  for(const s of SUPPLIERS){
    const row={ id:s.id, legal_name:s.legalName, legal_name_normalized:norm(s.legalName), trade_name:s.tradeName,
      supplier_type:s.type, country:s.country, website:s.website, contact_email:null, moq_units:s.moq,
      lead_time_days:s.lead, certifications:[], verification_status:'not_provided', notes:s.notes, updated_at:new Date().toISOString() };
    console.log(`  fourn: ${s.id.padEnd(24)} ${s.legalName.slice(0,55)}`);
    if(APPLY){ const {error}=await supa.from('suppliers').upsert(row,{onConflict:'id'}); if(error) console.error('   ✗',error.message); }
  }
  const { data:products, error } = await supa.from('products').select('id,name,slug,category,subcategory,supplier_id').ilike('id','launch-%');
  if(error) throw error;
  console.log(`\n${products.length} produits launch-* à affecter.\n`);
  for(const p of products){
    let supplierId=null, source=null;
    if(p.category==='kits'){ source='Assemblage KURLA (composants sourcés séparément)'; }
    else {
      const catKey = p.category==='accessoires' ? 'Accessoire' : (p.category==='peau' ? 'Huile/Beurre' : guessCategory(p.name));
      supplierId = CAT_SUP[catKey] || 'sup-private-label-cn';
      source = (SUPPLIERS.find(s=>s.id===supplierId)||{}).tradeName || null;
    }
    console.log(`  ${p.id.padEnd(12)} -> ${String(supplierId||'kit/assemblage').padEnd(24)} ${String(p.name).slice(0,42)}`);
    if(APPLY){ const {error:e2}=await supa.from('products').update({supplier_id:supplierId, source_supplier:source, updated_at:new Date().toISOString()}).eq('id',p.id); if(e2) console.error('   ✗',p.id,e2.message); }
  }
  console.log(`\n${APPLY?'Écrit.':'--apply pour écrire.'}`);
}
main().catch(e=>{console.error(e);process.exit(1);});
