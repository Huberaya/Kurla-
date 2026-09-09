import { getSupabaseServerClient } from '../supabaseClient';
import type { SupabaseServerStore } from '../serverDb';

export type SourcingStrategyRow = {
  country_code: string;
  label: string;
  track: 'A_resale' | 'B_make';
  score: number;
  wave: 1 | 2 | 3;
  model: string;
  moq_target?: string | null;
  lead_time_fr?: string | null;
  margin_target?: string | null;
  prospects: string[];
  requires_rp: boolean;
  updated_at?: string;
};

const FALLBACK_STRATEGY: SourcingStrategyRow[] = [
  { country_code:'FR', label:'France — revente directe marques texturées', track:'A_resale', score:34, wave:1, model:'Revente directe marque — stock léger 12 pcs/réf', moq_target:'≤12 pcs/réf', lead_time_fr:'2–5 j', margin_target:'≥34% (cible 45%)', prospects:['c01','c02','c03','c04','c05','c06','c07','c12','c15'], requires_rp:true },
  { country_code:'NL', label:'Pays-Bas — grossistes multimarques', track:'A_resale', score:30, wave:1, model:'Distributeur gros — stock centralisé Benelux', moq_target:'≤12 pcs/réf paliers', lead_time_fr:'48–72 h', margin_target:'≥34%', prospects:['c22','c23','c15'], requires_rp:true },
  { country_code:'GB', label:'Royaume-Uni — boucles', track:'A_resale', score:28, wave:2, model:'Distributeur UE agréé / importateur FR — pas d’import direct sans RP', moq_target:'≤12 via importateur', lead_time_fr:'≤7 j', margin_target:'≥34% après douane', prospects:['c08','c09','c10','c11'], requires_rp:true },
  { country_code:'DE', label:'Allemagne — demi-gros', track:'A_resale', score:26, wave:2, model:'Demi-gros via distributeur DE', moq_target:'≤24', lead_time_fr:'3–6 j', margin_target:'≥34%', prospects:[], requires_rp:true },
  { country_code:'GH', label:'Ghana / Afrique Ouest — matière karité', track:'B_make', score:26, wave:1, model:'Partenariat coopérative — matière pour marque propre', moq_target:'100 kg matière', lead_time_fr:'4–6 sem', margin_target:'45–55% si coût ≤4,50€', prospects:['c24'], requires_rp:false },
  { country_code:'US', label:'États-Unis — SPF mélanine', track:'A_resale', score:18, wave:3, model:'Import vérifié seulement si RP UE — sinon via Dina FR', moq_target:'refus sans RP', lead_time_fr:'>10 j + douane', margin_target:'≥34% après douane (rare)', prospects:['c13','c14'], requires_rp:true },
  { country_code:'BG', label:'Bulgarie — façonnage Noesis', track:'B_make', score:32, wave:1, model:'Façonnage UE petit MOQ 500 — PIF+CPSR+CPNP fournis', moq_target:'500/1000/5000', lead_time_fr:'échantillon 3 sem prod 8 sem', margin_target:'cible héros 13–18€', prospects:['c18'], requires_rp:true },
  { country_code:'FR_make', label:'France — façonnage', track:'B_make', score:31, wave:1, model:'Made in France — traçabilité karité EUDR', moq_target:'500/1000/5000', lead_time_fr:'échantillon 3–4 sem prod 8–12 sem', margin_target:'cible 11–16€ / 13–18€', prospects:['c16','c17','c19','c20','c21'], requires_rp:true },
];

export async function listSourcingStrategy(store: SupabaseServerStore): Promise<SourcingStrategyRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return FALLBACK_STRATEGY;
  try {
    const { data, error } = await supabase.from('sourcing_country_strategy').select('*').order('score', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return FALLBACK_STRATEGY;
    return (data as SourcingStrategyRow[]).map(r => ({
      ...r,
      prospects: Array.isArray((r as any).prospects) ? (r as any).prospects : [],
    }));
  } catch {
    return FALLBACK_STRATEGY;
  }
}
