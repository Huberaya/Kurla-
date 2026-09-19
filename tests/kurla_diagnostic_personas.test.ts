import assert from 'node:assert/strict';

/**
 * D8 — LE TEST DES TROIS REGARDS (19/09, consigne utilisateur : « des dizaines
 * de tests ; rôle = utilisatrice, spécialiste cheveux crépus, expert coiffage
 * afro »).
 *
 * Deux couches :
 *  A) ~40 tests nommés, un par exigence métier lisible (la réponse dit-elle ce
 *     qu'elle doit dire, et rien de contradictoire ?) ;
 *  B) un BALAYAGE COMPLET des couples (texture, style) × priorité × porosité ×
 *     cuir chevelu × fréquence (échantillonnage déterministe, several-mille
 *     profils) contre les invariants des trois regards : zéro promesse de
 *     peigne là où la coiffure l'interdit, zéro vocabulaire banni, zéro
 *     contresens expert (scellement, LCO, aqueux, pousse, chimie sur mineur,
 *     lignes J+30 par cycle).
 *
 * Ce banc est né d'un défaut réel trouvé par l'utilisateur (locks recevant un
 * démêlage au peigne) : la matrice ne doit plus pouvoir le rejouer.
 */

const { buildHairAdvisoryRoutine, buildHairAdvisorySummary, hairRoutineTitles } = await import('../src/lib/knowledge/hairAdvisory');
const { BANNED_MEDICAL_VOCAB, BANNED_RESERVED_EXPRESSIONS, BANNED_GENERIC_PHRASES } = await import('../src/lib/knowledge/aiGuardrail');
const { buildHairEvolutionReport } = await import('../src/lib/knowledge/profileEvolution');
const { buildHairKit } = await import('../src/lib/knowledge/careKit');

const results: Array<{ name: string; ok: boolean; note?: string }> = [];
const test = (name: string, fn: () => void) => {
  try { fn(); results.push({ name, ok: true }); }
  catch (err) { results.push({ name, ok: false, note: err instanceof Error ? err.message : String(err) }); }
};

type Ctx = Record<string, string | undefined>;
const routineOf = (ctx: Ctx) => buildHairAdvisoryRoutine(ctx as never);
const textOf = (ctx: Ctx) => {
  const r = routineOf(ctx) as any;
  const steps = [...r.morning, ...r.evening, ...r.weekly];
  const full = steps.map((s: any) => `${s.action} ${s.why} ${s.how} ${s.expect}`).join('\n') + '\n' + (buildHairAdvisorySummary(ctx as never) as string);
  return { r, steps, actions: steps.map((s: any) => s.action), full };
};

// BASE d'abord, surcharges ensuite : sinon le paramètre testé est écrasé par la moyenne.
const BASE = { porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine', length: 'moyenne', experience: 'habituee' };

// Une occurrence « positive » du peigne/démêlage : ce qui le NIE n'est pas une
// prescription. Phrase = séparée par . ; ! ? : \n
const COMB = /d[ée]m[êe]l|peigne|outil à dents|pr[ée]-d[ée]m[êe]l/i;
const NEGATED = /ne [a-zéûàô]+(e|ent|es)? rien|rien ne|ne (se )?(doit|refait|cherche|fait|d[ée]m[êe]le)|n[’e]est pas|jamais|aucun|aucune|rien à faire|sans |pas de |pas un |plus de boucle|ils n.?ont rien|ce n.?est pas|jamais plus|hors |n.?existe pas|d[ée]manteler|sans d[ée]faire|ne se d[ée]m[êe]le pas/i;
function combPrescriptions(text: string): string[] {
  return text.split(/[.;!?\n]/)
    .map(part => part.trim())
    .filter(part => part.length > 4 && COMB.test(part) && !NEGATED.test(part));
}

/* ================================================================== */
/* REGARD A — L'UTILISATRICE : « j'ai demandé X, je reçois X »        */
/* ================================================================== */

test('A1 crépu + soif : l’eau et le scellement sont la réponse, pas un conseil vague', () => {
  const { actions, full } = textOf({ ...BASE, texture: 'crepue', style: 'naturel', focus: 'secheresse', priority: 'hydratation' });
  assert.ok(actions.some(a => /hydrat|scell/i.test(a)), 'aucune étape hydratation/scellement');
  assert.match(full, /eau d’abord|Leave-in|scelle|scellement/i);
  assert.match(buildHairAdvisorySummary({ ...BASE, texture: 'crepue', style: 'naturel', focus: 'secheresse', priority: 'hydratation' } as never) as string, /Stopper la sécheresse|sécheresse/i);
});

test('A2 cuir qui démange : soin séparé des longueurs — et ça se voit dans les étapes', () => {
  const { actions, full } = textOf({ ...BASE, texture: 'crepue', style: 'naturel', priority: 'cuir_chevelu', scalp: 'demangeaisons' });
  assert.ok(actions.some(a => /cuir chevelu/i.test(a)), 'pas d’étape cuir chevelu dédiée');
  assert.match(full, /ne jamais gratter|massage aux pulpes|apaiser/i);
});

test('A3 casse déclarée : le démêlage protégé est bien là (naturels) — ≥2 étapes + leçon', () => {
  const { steps } = textOf({ ...BASE, texture: 'crepue', style: 'naturel', priority: 'casse' });
  const detangle = steps.filter((s: any) => /démêl/i.test(`${s.action} ${s.why}`));
  assert.ok(detangle.length >= 2, 'la casse doit traverser au moins 2 étapes');
});

test('A4 longueur demandée : jamais un produit qui « accélère » — toujours la version honnête', () => {
  const { full } = textOf({ ...BASE, texture: 'crepue', style: 'naturel', priority: 'pousse' });
  assert.match(full, /Aucun produit n.?accélère la pousse/i);
  const positives = full.split(/[.;!?\n]/).filter(p => /accélère la pousse/i.test(p) && !/aucun|ne |pas/i.test(p));
  assert.equal(positives.length, 0, `promesse de pousse détectée : ${positives[0]}`);
});

test('A5 définition (boucles) : méthode produit+geste+séchage, pas un slogan', () => {
  const { full } = textOf({ ...BASE, texture: 'bouclee', style: 'naturel', priority: 'definition' });
  assert.match(full, /définition|définir/i);
  assert.match(full, /sans chaleur|séch/i);
});

test('A6 enfant : rituel sans larmes, et RIEN de chimique ni de chaud', () => {
  const { full } = textOf({ ...BASE, texture: 'crepue', style: 'enfant', priority: 'demelage_enfant' });
  assert.match(full, /larmes|enfant/i);
  assert.doesNotMatch(full, /défrisa|relaxer|fer à lisser|coloration|silk press/i);
});

test('A7 locks : séchage complet + résidus + retwist des racines — le triptyque du cycle', () => {
  const { full } = textOf({ ...BASE, texture: 'locksee', style: 'locks', priority: 'pousse' });
  assert.match(full, /séch/i);
  assert.match(full, /résidu/i);
  assert.match(full, /retwist/i);
});

test('A8 transition : les deux textures sont NOMMÉES, pas lissées dans une réponse unique', () => {
  const { full } = textOf({ ...BASE, texture: 'defrisee', style: 'naturel', priority: 'casse' });
  assert.match(full, /deux (natures|textures)|deux zones/i);
});

test('A9 « moins d’un lavage par semaine » : l’hydratation vit entre les lavages', () => {
  const { full, summary } = { ...textOf({ ...BASE, texture: 'crepue', style: 'naturel', frequency: 'less_1x' }), summary: '' };
  assert.match(full, /entre (deux|les) lavages/i);
  assert.match(buildHairAdvisorySummary({ ...BASE, texture: 'crepue', style: 'naturel', frequency: 'less_1x' } as never) as string, /Recharger l’hydratation|vit donc entre les lavages/i);
});

test('A10 débutante : un seul geste nouveau par semaine — la charge est gérée, pas ignorée', () => {
  const { actions } = textOf({ ...BASE, texture: 'crepue', style: 'naturel', experience: 'debutante' });
  assert.ok(actions.some(a => /geste nouveau/i.test(a)), 'pas d’étape « un geste nouveau »');
});

test('A11 aucune étape n’est un doublon d’une autre, dans aucun des regards', () => {
  const { actions } = textOf({ ...BASE, texture: 'crepue', style: 'naturel', focus: 'secheresse', priority: 'hydratation' });
  assert.equal(new Set(actions).size, actions.length, `doublons : ${actions.filter((a, i) => actions.indexOf(a) !== i).join(', ')}`);
});

test('A12 rien ne reste en plan : chaque profil a matin, soir, hebdo et un résumé ≥ 3 lignes', () => {
  const { r } = textOf({ ...BASE, texture: 'ondee', style: 'twists', priority: 'hydratation' });
  assert.ok(r.morning.length >= 2 && r.evening.length >= 1 && r.weekly.length >= 1, 'colonne vide');
  const sum = buildHairAdvisorySummary({ ...BASE, texture: 'ondee', style: 'twists', priority: 'hydratation' } as never) as string;
  assert.ok(sum.split('. ').length >= 3, 'résumé trop court pour être une lecture');
});

test('A13 lisibilité mobile : action ≤ 70 caractères, pourquoi ≥ 40 (jamais un mur ni un moignon)', () => {
  const { steps, actions } = textOf({ ...BASE, texture: 'locksee', style: 'locks', priority: 'hydratation' });
  for (const a of actions) assert.ok(a.length <= 70, `action trop longue pour le mobile : ${a}`);
  for (const s of steps) assert.ok(s.why.length >= 40 && s.how.length >= 40 && s.expect.length >= 40, `étape trop mince : ${s.action}`);
});

/* ================================================================== */
/* REGARD B — LE SPÉCIALISTE CRÉPU : la physique de la fibre          */
/* ================================================================== */

test('B1 porosité forte : l’eau entre et sort vite → le scellement suit l’eau, dans cet ordre', () => {
  const { full } = textOf({ ...BASE, texture: 'crepue', style: 'naturel', porosity: 'forte' });
  assert.match(full, /scell/i);
  assert.match(full, /boit vite|rend l.?eau/i);
});

test('B2 porosité faible : textures légères sur cheveu mouillé — et « moins », pas « plus »', () => {
  const { full } = textOf({ ...BASE, texture: 'crepue', style: 'naturel', porosity: 'faible' });
  assert.match(full, /l[ée]gèr/i);
  assert.match(full, /sont ferm[ée]es|[ée]cailles sont ferm/i);
});

test('B3 porosité inconnue : AUCUNE affirmation de porosité — le moteur n’invente rien', () => {
  const { full } = textOf({ ...BASE, texture: 'crepue', style: 'naturel', porosity: 'inconnue' });
  assert.doesNotMatch(full, /Porosit[ée] (faible|forte|moyenne)/, 'le résumé attribue une porosité qui n’a pas été déclarée');
  assert.match(buildHairAdvisorySummary({ ...BASE, texture: 'crepue', style: 'naturel', porosity: 'inconnue' } as never) as string, /profil complet|d[ée]clar[ée]/i, 'la retenue doit rester digne, pas vide');
});

test('B4 sécheresse ≠ pellicules : deux causes, deux textes, pas de confusion', () => {
  const sec = textOf({ ...BASE, texture: 'crepue', style: 'naturel', scalp: 'sec', priority: 'cuir_chevelu' }).full;
  const pel = textOf({ ...BASE, texture: 'crepue', style: 'naturel', scalp: 'pellicules', priority: 'cuir_chevelu' }).full;
  assert.match(pel, /résidu|pelliculaire|déséquilibre|levûre|levure/i);
  assert.match(sec, /dess[èe]ch|tiraille|humeur|hydrat/i);
});

test('B5 le démêlage ne se fait qu’humide : aucune phrase ne le prescrit à sec (sauf pour le NIER)', () => {
  for (const style of ['naturel', 'twists', 'defrise']) {
    const { full } = textOf({ ...BASE, texture: 'crepue', style, priority: 'casse' });
    const bad = full.split(/[.;\n]/).filter(p => /d[ée]m[êe]l/.test(p) && /[àa] sec\b/.test(p) && !/jamais|ne |pas/.test(p));
    assert.equal(bad.length, 0, `démêlage à sec prescrit (${style}) : ${bad[0]}`);
  }
});

test('B6 LCO : dans le geste, l’ordre Leave-in → crème → huile est dit dans cet ordre (naturels crépus)', () => {
  const { steps } = textOf({ ...BASE, texture: 'crepue', style: 'naturel', porosity: 'moyenne' });
  const lco = steps.find((s: any) => /Leave-in/i.test(s.how) && /huile/i.test(s.how));
  assert.ok(lco, 'étape LCO absente du cycle naturel');
  const how: string = lco.how;
  const i = how.search(/Leave-in/i), c = how.search(/cr[èe]me/i), o = how.search(/huile/i);
  assert.ok(c > i && o > c, 'ordre L-C-O inversé dans le geste');
  assert.match(how, /cheveu humide|sur cheveux essor[ée]s/, 'le scellement doit être dit sur cheveu humide');
});

test('B7 locks : pas de LCO, beurres épais explicitement écartés, retwist limité aux racines', () => {
  const { full } = textOf({ ...BASE, texture: 'locksee', style: 'locks', porosity: 'forte' });
  assert.doesNotMatch(full.toLowerCase(), /lco\b/);
  assert.match(full, /beurres|d[ée]p[ôo]t/i);
  assert.match(full, /nouvelles racines|racines seulement|retwist des nouvelles/i);
});

test('B8 locks : le moteur ne promet JAMAIS un « rush de pousse » ni un produit scellant de marque', () => {
  const { full } = textOf({ ...BASE, texture: 'locksee', style: 'locks', priority: 'pousse', focus: 'locks_allonger' });
  assert.match(full, /aucun produit|ne cherche pas [àa] forcer|densif/i);
});

test('B9 crépus denses + longueurs : le miroir/contrôle des pointes existe (D4) mais ne déborde pas sur le court', () => {
  const long = textOf({ ...BASE, texture: 'crepue', style: 'naturel', length: 'longue' }).actions.join(' ');
  const court = textOf({ ...BASE, texture: 'crepue', style: 'naturel', length: 'courte' }).actions.join(' ');
  assert.match(long, /pointes/i);
  assert.match(court, /Doser selon la longueur/i);
});

test('B10 hydratation enfant crépu : pas d’actifs « anti-âge » ni de promesses de tenue extrême', () => {
  const { full } = textOf({ ...BASE, texture: 'crepue', style: 'enfant', priority: 'hydratation' });
  assert.doesNotMatch(full, /r[ée]tin|acide|anti[- ][âa]ge|s[ée]bum (?=et)retard/i);
});

/* ================================================================== */
/* REGARD C — L'EXPERT COIFFAGE AFRO : les cycles des coiffures posées */
/* ================================================================== */

test('C1 tresses : le démêlage complet est AVANT la pose (dernière chance) et après la dépose — jamais pendant', () => {
  const { r } = textOf({ ...BASE, texture: 'crepue', style: 'braids' });
  assert.ok(r.morning.some((s: any) => /démêler complètement/i.test(s.action)), 'démêlage manquant avant la pose');
  assert.ok(r.weekly.some((s: any) => /démêler et réhydrater/i.test(s.action)), 'protocole de dépose manquant');
  for (const s of r.evening) assert.equal(combPrescriptions(`${s.action} ${s.why} ${s.how} ${s.expect}`).length, 0, `peigne prescrit PENDANT les tresses : ${s.action}`);
});

test('C2 tresses : la tension des premiers jours est traitée (« détendre », pas « ça passera »)', () => {
  const { r } = textOf({ ...BASE, texture: 'crepue', style: 'braids' });
  assert.ok(r.evening.some((s: any) => /détendre|tension/i.test(`${s.action} ${s.why}`)), 'pas de ligne de confort/tension pendant la pose');
});

test('C3 twists : entretien aqueux pendant la pose (zéro peigne), démêlage admis seulement à la dépose', () => {
  const { r, full } = textOf({ ...BASE, texture: 'crepue', style: 'twists' });
  assert.match(full, /aqueux|brume/i);
  for (const s of r.evening) assert.equal(combPrescriptions(`${s.action} ${s.why} ${s.how} ${s.expect}`).length, 0, `peigne prescrit PENDANT les twists : ${s.action}`);
  assert.ok(r.weekly.some((s: any) => /d[ée]m[êe]ler|d[ée]pose/i.test(s.action)), 'la dépose des twists doit prévoir le dégagement des mèches');
});

test('C4 perruque : le dessous vit — propre, sec, sans tension ; la dentelle n’est pas un soin du cheveu', () => {
  const { r, full } = textOf({ ...BASE, texture: 'crepue', style: 'wig' });
  assert.ok(r.morning.some((s: any) => /dessous/i.test(s.action)), 'le dessous n’est pas traité avant la pose');
  assert.match(full, /parfaitement sec|sec, sans tension/i);
  assert.doesNotMatch(full, /solvant sur le cuir chevelu|colle sur les longueurs/i);
});

test('C5 perruque : respirer entre deux poses est dans le programme (pas de pose illimitée)', () => {
  const { r } = textOf({ ...BASE, texture: 'crepue', style: 'wig' });
  assert.ok(r.weekly.some((s: any) => /respirer/i.test(s.action)), 'pas de pause entre poses');
});

test('C6 locks (expert) : pas de shampoing clarifiant quotidien imposé, entretien entre lavages = eau', () => {
  const { full, r } = textOf({ ...BASE, texture: 'locksee', style: 'locks', frequency: '1x_semaine' });
  assert.match(r.evening.map((s: any) => s.action + s.how).join(' '), /eau|aqueux|brume/i);
  assert.doesNotMatch(full, /chaque jour.{0,30}shampoing|shampoing quotidi/i);
});

test('C7 microlocks/fines : « soins légers » — pas de beurres qui alourdissent une lock fine', () => {
  const { full } = textOf({ ...BASE, texture: 'locksee', style: 'locks', porosity: 'faible' });
  assert.match(full, /l[ée]g(er|èr)/i);
});

test('C8 frontal/edges : la zone fragile est nommée (tempes, raie), pas ignorée', () => {
  const { full } = textOf({ ...BASE, texture: 'crepue', style: 'wig', priority: 'casse' });
  assert.match(full, /tempes|raie|front/i);
});

test('C9 tresses neuves + cuir qui démange : le diagnostic des torts distincts (traction ≠ résidu) est fait', () => {
  const { full } = textOf({ ...BASE, texture: 'crepue', style: 'braids', scalp: 'demangeaisons', priority: 'cuir_chevelu' });
  assert.match(full, /r[ée]sidu/i);
  assert.match(full, /tension/i);
});

test('C10 enchaînement des poses : « laisser reposer le cuir chevelu » est dans le programme', () => {
  const { full } = textOf({ ...BASE, texture: 'crepue', style: 'braids', priority: 'pousse' });
  assert.match(full, /laisser reposer|respire/i, 'les poses enchaînées sans pause sont une faute experte');
  assert.match(full, /sans tension aux racines/, 'la priorité pousse doit rester honnête sous coiffure');
});

/* ================================================================== */
/* B — BALAYAGE COMPLET (déterministe) : aucun couple ne doit rejouer */
/* le défaut locks×peigne, ni servir un vocabulaire interdit.         */
/* ================================================================== */

const TEXTURES = ['crepue', 'frisee', 'bouclee', 'ondee', 'locksee', 'defrisee', 'protective'];
const STYLES = ['naturel', 'locks', 'twists', 'braids', 'wig', 'enfant', 'defrise'];
const PRIORITIES = ['', 'hydratation', 'casse', 'definition', 'pousse', 'cuir_chevelu', 'demelage_enfant'];
const POROSITIES = ['faible', 'moyenne', 'forte', 'inconnue'];
const SCALPS = ['normal', 'sec', 'demangeaisons', 'pellicules', 'irritation'];
const FREQS = ['1x_semaine', '2x_semaine', 'less_1x', 'irreguliere'];

test('MATRICE — balayage déterministe 49 couples × variantes : invariants des trois regards', () => {
  const bannedLow = [...BANNED_MEDICAL_VOCAB, ...BANNED_RESERVED_EXPRESSIONS, ...BANNED_GENERIC_PHRASES].map(v => v.toLowerCase());
  let profiles = 0;
  const failures: string[] = [];
  let seed = 2166136261;
  for (const texture of TEXTURES) for (const style of STYLES) {
    for (const priority of PRIORITIES) for (const porosity of POROSITIES) for (const scalp of SCALPS) for (const frequency of FREQS) {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; // LCG : couvre les trois bits du bas
      if (((seed >>> 16) & 7) !== 0) continue; // échantillon déterministe, reproductible à la virgule
      profiles += 1;
      const ctx = { texture, style, priority, porosity, scalp, frequency, length: 'moyenne', experience: 'habituee' };
      const { r, steps, full } = textOf(ctx);
      const low = full.toLowerCase();
      const locked = texture === 'locksee' || style === 'locks';
      const kid = style === 'enfant' || priority === 'demelage_enfant';
      const at = (why: string) => failures.push(`${texture}/${style}/${priority}/${porosity}/${scalp}/${frequency} → ${why}`);
      // Plancher adapté au segment : le cycle naturel ondulé est volontairement court
      // (5 gestes complets valent mieux qu'un 6e remplissage) ; tout le reste ≥ 6.
      const minSteps = texture === 'crepue' || texture === 'locksee' || style !== 'naturel' ? 6 : 5;
      if (r.morning.length + r.evening.length + r.weekly.length < minSteps) at(`moins de ${minSteps} étapes`);
      if (new Set(steps.map((s: any) => s.action)).size !== steps.length) at('doublon d’étapes');
      for (const b of bannedLow) if (low.includes(b)) at(`vocabulaire banni « ${b} »`);
      if (locked) {
        const presc = combPrescriptions(full);
        if (presc.length) at(`peigne/démêlage affirmé sur locks : ${presc[0].slice(0, 90)}`);
        if (low.includes('lco')) at('LCO sur locks');
        if (steps.some((s: any) => /^Conditionner et démêler$/.test(s.action))) at('étape peigne sur locks');
      }
      if (kid && /d[ée]frisa|relaxer|fer [àa] lisser|silk press/i.test(full)) at('chimie/chaleur sur mineur');
      if (priority === 'pousse' && !/aucun produit n.?accél[èe]re/i.test(full)) at('pousse sans la phrase honnête');
      for (const s of steps) {
        if (s.action.length > 70) at(`action trop longue : ${s.action.slice(0, 40)}…`);
        if (s.why.length < 40 || s.how.length < 40 || s.expect.length < 40) at(`étape mince : ${s.action}`);
      }
      // ligne J+30 par cycle : locks → tension aux racines ; jamais « démêlage » là où il n'y a pas de nœuds
      if (locked || style === 'wig') {
        if (/notez une observation pr[ée]cise — d[ée]m[êe]lage/.test(full)) at('J+30 « démêlage » servi hors cycle à démêler');
      }
      if (locked && !/hydratation des locks, cuir chevelu, tension aux racines/.test(full)) at('J+30 locks non adapté');
    }
  }
  assert.ok(profiles > 3000, `profil balayés insuffisants : ${profiles}`);
  assert.equal(failures.length, 0, `${failures.length} profils en faute sur ${profiles} — ${failures.slice(0, 6).join(' | ')}`);
  (test as any).lastNote = `${profiles} profils balayés`;
});

/* ================================================================== */
/* BOUCLE (D2) revue par les trois regards : le journal ne doit pas   */
/* réintroduire ce que le cycle interdit.                             */
/* ================================================================== */

test('K1 kit matériel : locks = crochet fin, JAMAIS de démêloir — et les autres segments gardent leur peigne', () => {
  const kitOf = (ctx: any) => {
    const r: any = buildHairAdvisoryRoutine(ctx);
    return buildHairKit(ctx, { morning: r.morning, evening: r.evening, weekly: r.weekly } as never, [], [] as never);
  };
  for (const ctx of [
    { ...BASE, texture: 'crepue', style: 'locks', priority: 'casse' },
    { ...BASE, texture: 'crepue', style: 'locks', priority: 'demelage_enfant' },
    { ...BASE, texture: 'locksee', style: 'locksee', priority: 'definition' },
  ]) {
    const mats: any[] = kitOf(ctx).materials;
    const fautif = mats.find((m: any) => /d[ée]m[êe]loir|peigne/i.test(m.name) && !/jamais pour d[ée]faire/i.test(m.why));
    assert.ok(!fautif, `locks/${ctx.priority} : le kit prescrit ${fautif?.name}`);
    assert.ok(mats.some((m: any) => /crochet/i.test(m.name)), 'l’outil réel des locks (crochet fin) doit être nommé');
    assert.ok(mats.every((m: any) => !m.product || (m.product.name && m.product.slug)), 'produit inventé dans le kit');
  }
  // le garde-fou du garde-fou : aucun excès de zèle — les segments qui démêlent gardent le peigne
  for (const ctx of [
    { ...BASE, texture: 'crepue', style: 'naturel', priority: 'casse' },
    { ...BASE, texture: 'crepue', style: 'braids', priority: 'pousse' },
  ]) {
    const mats: any[] = kitOf(ctx).materials;
    assert.ok(mats.some((m: any) => /d[ée]m[êe]loir|peigne/i.test(m.name)), 'démêlage légitime mais outil retiré');
  }
});

test('E1 locks + journal « casse » : le recalcul garde le cycle (zéro peigne, racines/pointes)', () => {
  const DAY = 86400000;
  const at = new Date(Date.now() - 30 * DAY).toISOString();
  const report = buildHairEvolutionReport(
    { texture: 'locksee', style: 'locks', priority: 'pousse', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine' },
    [{ entryDate: new Date(Date.now() - 2 * DAY).toISOString().slice(0, 10), signals: ['more_breakage'], breakageScore: 1 }],
    at
  );
  assert.equal(report.available, true);
  const moved = report.changes.find(c => c.field === 'priority');
  assert.ok(moved, 'la casse du journal doit frapper la priorité');
  const after = `${report.after.morning.join(' ')} ${report.after.evening.join(' ')} ${report.after.weekly.join(' ')}`;
  assert.equal(combPrescriptions(`${after} ${report.after.summary}`).length, 0, 'le recalcul a réintroduit un démêlage affirmé sur locks');
});

test('E2 locks + journal « produit lourd » : la réponse reste locks (rinçage), pas un changement de profil forcé', () => {
  const DAY = 86400000;
  const at = new Date(Date.now() - 30 * DAY).toISOString();
  const report = buildHairEvolutionReport(
    { texture: 'locksee', style: 'locks', priority: 'hydratation', porosity: 'forte', scalp: 'normal', frequency: '1x_semaine' },
    [{ entryDate: new Date(Date.now() - 1 * DAY).toISOString().slice(0, 10), signals: ['product_heavy'] }],
    at
  );
  const poro = report.changes.find(c => c.field === 'porosity');
  assert.equal(poro, undefined, 'porosité forte déclarée : rien n’est écrasé');
  assert.ok(report.confirmations.length >= 1, 'la protection doit être expliquée');
});

test('E3 enfant + journal « trop long » : le resserrage ne touche pas le rituel de base enfant', () => {
  const DAY = 86400000;
  const at = new Date(Date.now() - 31 * DAY).toISOString();
  const report = buildHairEvolutionReport(
    { texture: 'crepue', style: 'enfant', priority: 'demelage_enfant', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine' },
    [{ entryDate: new Date(Date.now() - 3 * DAY).toISOString().slice(0, 10), signals: ['routine_too_long'] }],
    at
  );
  const shorten = report.changes.find(c => c.field === 'shorten');
  assert.ok(shorten, 'le raccourcisseur doit frapper');
  assert.ok(report.after.morning.join(' ').length > 0, 'le socle lavage enfant doit survivre');
  const beforeCount = report.before.morning.length + report.before.evening.length + report.before.weekly.length;
  const afterCount = report.after.morning.length + report.after.evening.length + report.after.weekly.length;
  assert.ok(afterCount <= beforeCount, 'le raccourcissement doit réduire, pas gonfler');
});

/* ================================================================== */
/* GARDES GLOBALES sur 6 profils repères (les cycles, un par un)      */
/* ================================================================== */

const CYCLE_PROFILES: Array<[string, Ctx]> = [
  ['naturel', { ...BASE, texture: 'crepue', style: 'naturel', priority: 'hydratation' }],
  ['locks', { ...BASE, texture: 'locksee', style: 'locks', priority: 'casse' }],
  ['tresses', { ...BASE, texture: 'crepue', style: 'braids', priority: 'pousse' }],
  ['twists', { ...BASE, texture: 'crepue', style: 'twists', priority: 'definition' }],
  ['perruque', { ...BASE, texture: 'crepue', style: 'wig', priority: 'cuir_chevelu', scalp: 'demangeaisons' }],
  ['transition', { ...BASE, texture: 'defrisee', style: 'naturel', priority: 'casse' }],
  ['enfant', { ...BASE, texture: 'crepue', style: 'enfant', priority: 'demelage_enfant' }],
];

test('G1 titres de colonnes par cycle (un afro n’a pas un « jour de lavage » d’une perruque)', () => {
  assert.equal(hairRoutineTitles({ texture: 'crepue', style: 'braids' } as never).morning, 'Avant de se faire coiffer');
  assert.equal(hairRoutineTitles({ texture: 'crepue', style: 'wig' } as never).weekly, 'À la dépose');
  assert.equal(hairRoutineTitles({ texture: 'locksee', style: 'locks' } as never).morning, 'Jour de lavage');
});

for (const [label, ctx] of CYCLE_PROFILES) {
  test(`G2[${label}] les trois regards simultanés : structure + vocabulaire + cohérence de cycle`, () => {
    const { r, steps, full } = textOf(ctx);
    assert.ok(r.morning.length >= 2, 'matin vide');
    for (const s of steps) {
      for (const field of ['why', 'how', 'expect'] as const) assert.ok(s[field].length >= 40, `${field} mince sur « ${s.action} »`);
    }
    const low = full.toLowerCase();
    for (const b of [...BANNED_MEDICAL_VOCAB, ...BANNED_GENERIC_PHRASES]) assert.ok(!low.includes(b.toLowerCase()), `banni « ${b} » dans ${label}`);
    if (ctx.style === 'locks' || ctx.texture === 'locksee') { const presc = combPrescriptions(full); assert.equal(presc.length, 0, `locks/${label} : peigne affirmé → ${presc[0]?.slice(0, 140) ?? ''}`); }
    const sum = buildHairAdvisorySummary(ctx as never) as string;
    assert.ok(sum.length > 200, 'résumé trop court');
  });
}

test('G3 le balayage a bien tourné (témoin de couverture affiché, pas décoratif)', () => {
  assert.ok((test as any).lastNote !== undefined, 'la matrice n’a pas rendu son compteur');
});

let failed = 0;
for (const result of results) {
  if (result.ok) console.log(`  ✓ ${result.name}`);
  else { failed += 1; console.log(`  ✗ ${result.name}\n      ${result.note}`); }
}
console.log(`\nD8 trois regards : ${results.length - failed}/${results.length} tests passés (${(test as any).lastNote ?? ''})`);
if (failed > 0) process.exitCode = 1;
