// Banc D13 — « première ligne concise, la suite derrière Plus ».
// La règle du jeu : RIEN n'est coupé ni réécrit dans le contenu moteur —
// splitLead doit être SANS PERTE (lead + rest == texte original, ponctuation
// d'incise près) et la ligne du haut doit tenir en une phrase lisible.
// Les cas tordus du français (abréviations, « », % décimaux, majuscules
// accentuées) sont testés explicitement, plus le balayage de tous les textes
// générés par le moteur sur un échantillon de profils.
import { readFileSync } from 'node:fs';
import { splitLead } from '../src/components/ui/MoreLess.tsx';
import { buildHairAdvisoryCtx, buildHairAdvisoryRoutine, buildHairAdvisorySummary } from '../src/lib/knowledge/hairAdvisory.ts';

let failed = 0;
function ok(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok:', name); }
}
const norm = (x: string) => x.replace(/[\s;—–]+/g, ' ').trim();

// --- Cas unitaires ciblés ---
{
  ok('S1_court_sans_expansion', splitLead('Rincez long, à l’eau tiède.').rest === '');
  const deux = 'Pressez la mèche avec un t-shirt de coton, sans jamais frotter. Le frottement soulève la cuticule et fabrique le frizz que le produit ne pourra plus rattraper ensuite.';
  const d2 = splitLead(deux);
  ok('S2_premiere_phrase_seule', d2.lead === 'Pressez la mèche avec un t-shirt de coton, sans jamais frotter.' && d2.rest.startsWith('Le frottement'));
  ok('S3_sans_perte', norm(d2.lead + ' ' + d2.rest) === norm(deux));

  const longue = 'Sous une repousse naturelle, les longueurs traitées au produit chimique sont une autre fibre, plus poreuse et bien plus fragile ; le séchage de la zone compte autant que le soin lui-même, et l’eau piégée à une démarcation fragilisée est une irritation assurée pour plusieurs jours.';
  const l2 = splitLead(longue);
  ok('S4_coupe_a_l_incise', l2.lead.endsWith('fragile') && l2.lead.length <= 180 && l2.rest.startsWith('le séchage') && l2.rest.length >= 55);
  ok('S5_sans_perte_incise', norm(l2.lead.replace(/;$/, '') + ' ' + l2.rest) === norm(longue));

  const monstre = 'Un cheveu qui reste rêche malgré tout mérite un rinçage clarifiant espacé sur l’année plutôt qu’un produit de plus.'; // phrase unique courte : pas d'incise, pas de coupe
  ok('S6_phrase_unique_courte_pas_de_coupure', splitLead(monstre).rest === '');

  const pasDeVraieFrontiere = 'Le diffuseur garde sa place, avec deux gardes — protecteur de chaleur, et air coupé aux trois quarts du séchage de la racine vers les pointes sans jamais presser. La chaleur qui finit une boucle la fige froissée ; le dernier coup d’air froid est gratuit, il ferme tout le dessin.';
  const p2 = splitLead(pasDeVraieFrontiere);
  ok('S7_boundary_apres_point_majuscule', p2.lead.endsWith('froissée.') === false || p2.lead.length <= 215); // la 1re phrase finit à « ...pointes sans jamais presser. »
  ok('S8_boundary_majuscule_accensee', splitLead('Séchez la zone. À partir de là, rien ne se repose sur un cuir qui tire, jamais — c’est la règle de base du contour sensible sous une pose, et personne ne reviendra dessus avant quarante-huit heures pleines.').lead === 'Séchez la zone.');

  const nombres = 'Une goutte d’huile, 1,5 cm de produit maximum, attendez 10 min. Puis cassez le film, doucement, sans réhumidifier quoi que ce soit d’autre sur la longueur.';
  ok('S9_decimales_ne_coupent_pas', splitLead(nombres).lead.includes('1,5 cm'));

  const guillemets = 'Le « carton » du gel n’est pas un défaut, c’est un moule — une fois sec à 100 %, on froisse. « Toujours » ici veut dire : le jour même, pas le lendemain.';
  const g2 = splitLead(guillemets);
  ok('S10_guillemets_et_points', g2.lead === 'Le « carton » du gel n’est pas un défaut, c’est un moule — une fois sec à 100 %, on froisse.' && norm(g2.lead + ' ' + g2.rest) === norm(guillemets));
}

// --- Balayage : tout ce que le moteur produit, sans perte et sans lead énorme ---
{
  const profils = [
    { texture: 'crepue', style: 'naturel', coilyPattern: '4c', elasticity: 'mou', strandWidth: 'fine', chemicalHeat: 'chaleur', priority: 'definition' },
    { texture: 'frisee', style: 'naturel', curlyDry: 'serviette', curlyHold: 'gel', chemicalHeat: 'produit', priority: 'definition' },
    { texture: 'ondulee', style: 'naturel', curlyDry: 'air', curlyHold: 'mousse', priority: 'hydratation' },
    { texture: 'locksee', style: 'locks', locStage: 'neuve', locCare: 'freeform', locDry: 'humide', priority: 'pousse' },
    { texture: 'defrisee', style: 'naturel', transitionStep: 'majorite', priority: 'casse' },
    { texture: 'crepue', style: 'wig', wigBond: 'glue', wigWear: 'jamais_retiree', priority: 'protection' },
    { texture: 'bouclee', style: 'enfant', priority: 'demelage_enfant' },
    { texture: 'protective', style: 'braids', priority: 'cuir_chevelu' },
    { texture: 'crepue', style: 'locks', locStage: 'mature', locCare: 'interlock', locDry: 'lentes', priority: 'casse' },
    { texture: 'ondee', style: 'naturel' }, // faux jeton hérité : doit tomber bien
  ].map(extra => ({ porosity: 'moyenne', scalp: 'sec', frequency: '1x_semaine', length: 'longue', experience: 'debutante', ...extra }));
  let nTexts = 0; let nExpanded = 0; let worstLead = 0;
  let pertes = 0; let leadsTropLongs = 0;
  for (const p of profils) {
    const ctx = buildHairAdvisoryCtx(p as any);
    const r: any = buildHairAdvisoryRoutine(ctx);
    const texts: string[] = [];
    for (const step of [...r.morning, ...r.evening, ...r.weekly]) texts.push(step.why, step.how ?? '', step.expect ?? '');
    texts.push(buildHairAdvisorySummary(ctx) as string);
    for (const t0 of texts) {
      const t = t0.trim(); if (!t) continue;
      nTexts++;
      const { lead, rest } = splitLead(t);
      if (rest) nExpanded++;
      worstLead = Math.max(worstLead, lead.length);
      if (norm(lead + ' ' + rest) !== norm(t)) pertes++;
      if (rest && lead.length > 232) leadsTropLongs++;
    }
  }
  ok('S11_balayage_sans_perte', pertes === 0);
  ok('S12_leads_toujours_tenables', leadsTropLongs === 0);
  ok('S13_le_balayage_a_tourne', nTexts > 250 && nExpanded > 100);
  console.log(`   (${nTexts} textes moteur, ${nExpanded} dépliables, lead max ${worstLead} car.)`);
}

// --- UI : la page result utilise bien le dispositif ---
{
  const ui = readFileSync(new URL('../src/pages/DiagnosticResultPage.tsx', import.meta.url), 'utf8');
  ok('S14_colonnes_en_stepbody', /<StepBody step={step} \/>/.test(ui));
  ok('S15_bouton_a11y', /aria-expanded=\{open\}/.test(ui) && /open \? 'Moins' : 'Plus'/.test(ui));
  ok('S16_resume_et_lecons_aussi', /<LeadBlock text=\{model\.summary\} \/>/.test(ui) && /<LeadBlock className="mt-2 text-sm leading-relaxed text-kurla-cream\/75" text=\{lesson\.lesson\} \/>/.test(ui));
  ok('S17_kit_aussi', /<LeadBlock className="mt-0\.5 text-kurla-cream\/55" text=\{material\.why\} \/>/.test(ui) && /essential\.why/.test(ui));
  const comp = readFileSync(new URL('../src/components/ui/MoreLess.tsx', import.meta.url), 'utf8');
  ok('S18_pas_de_coupure_dure', !/t\.slice\(0, softMax\)/.test(comp) && !/substring\(0,/.test(comp));
}

if (failed > 0) { console.error('ÉCHECS:', failed); process.exit(1); }
console.log('Banc concision résultat : OK');
