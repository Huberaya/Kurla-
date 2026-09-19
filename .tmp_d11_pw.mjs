import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4311';
const browser = await chromium.launch();

async function run(label, plan0, asserts) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(BASE + '/diagnostic/cheveux', { waitUntil: 'domcontentloaded' });
  await page.locator('div.grid button').first().waitFor({ timeout: 45000 });
  const plan = [...plan0];
  const seen = [];
  const asked = {};
  let done = false;
  for (let i = 0; i < 34 && !done; i++) {
    const cards = page.locator('div.grid button');
    const n = await cards.count();
    if (n === 0) {
      const fin = page.getByRole('button', { name: /Voir ma routine/ });
      if (await fin.count() > 0) { await fin.click(); done = true; break; }
      await page.waitForTimeout(400);
      continue;
    }
    const texts = [];
    for (let j = 0; j < n; j++) texts.push(await cards.nth(j).innerText());
    asked.locStage = asked.locStage || texts.some(t => /moins de 6 mois/i.test(t));
    asked.locCare = asked.locCare || texts.some(t => /pas de produit, pas de retwist/i.test(t));
    asked.locDry = asked.locDry || texts.some(t => /coucher encore humide/i.test(t));
    asked.chem = asked.chem || texts.some(t => /texture naturelle uniquement/.test(t));
    asked.curly = asked.curly || texts.some(t => /frotte à la serviette|air libre, sans y toucher/.test(t));
    asked.transition = asked.transition || texts.some(t => /la moitié des longueurs|fade avance|presque fini/.test(t));
    const hit = plan.find(p => texts.some(t => p.re.test(t)));
    if (hit) {
      seen.push(hit.key);
      await cards.nth(texts.findIndex(t => hit.re.test(t))).click();
      plan.splice(plan.indexOf(hit), 1);
    } else {
      seen.push('auto:' + texts[0].split('\n')[0].slice(0, 26));
      await cards.first().click();
    }
    await page.waitForTimeout(110);
  }
  try {
    await page.waitForURL(/resultat/, { timeout: 20000 });
  } catch {
    console.log(`\n===== ${label} — ECHEC NAVIGATION`);
    console.log('url:', page.url());
    console.log('vu:', seen.join(' → '));
    console.log('extrait:', (await page.locator('body').innerText()).slice(0, 300).replace(/\n/g, ' / '));
    throw new Error('pas de résultat');
  }
  await page.waitForTimeout(900);
  const body = await page.locator('body').innerText();
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const results = asserts(body, { asked, over, errors });
  const bad = results.filter(r => !r.ok);
  console.log(`\n===== ${label}`);
  console.log('questions (plan) :', seen.join(' → '));
  console.log('demandées       :', JSON.stringify(asked), '| débordement:', over, '| erreurs:', errors.length);
  for (const r of results) console.log((r.ok ? '  PASS ' : '  FAIL ') + r.name);
  if (errors.length) console.log('  erreurs console:', errors.slice(0, 3).join(' | '));
  await ctx.close();
  return bad.length;
}

const has = (name, body, re) => ({ name, ok: re.test(body), got: String(re) });
const not = (name, body, re) => ({ name, ok: !re.test(body), got: String(re) + ' PRÉSENT à tort' });

let failures = 0;

// Parcours A — locks adulte, libre pousse, racines couchées humides : les trois
// questions D11 doivent être posées ET rendre leurs effets exacts.
failures += await run('PARCOURS A — locks (neuve + freeform + humide)', [
  { key: 'texture', re: /^Locks \/ Microlocks\n/ },
  { key: 'style', re: /^Locks \/ Microlocks$/ },
  { key: 'locStage', re: /Moins de 6 mois/ },
  { key: 'locCare', re: /pas de produit, pas de retwist/ },
  { key: 'locDry', re: /coucher encore humide/ },
  { key: 'chem', re: /La chaleur seulement/ },
], (body, { asked, over, errors }) => [
  { name: 'les 3 questions locks ont été posées', ok: asked.locStage && asked.locCare && asked.locDry, got: JSON.stringify(asked) },
  { name: 'questions boucles et transition NON posées', ok: !asked.curly && !asked.transition, got: JSON.stringify(asked) },
  has('étape « Sécher les locks jusqu’au cœur » rendue', body, /Sécher les locks jusqu’au cœur/),
  has('fragment humide rendu', body, /première cause d’odeur/),
  has('freeform : plus de consigne retwist, la séparation à la place', body, /Rien ne sera retordu ici/),
  has('entre-deux lavages adapté au freeform', body, /rien à retordre/),
  has('phrase maturité (neuve) rendue', body, /raccourcissement fait partie du processus/),
  has('résumé : les trois décisions', body, /Maturité : locks de moins de six mois[\s\S]*Entretien déclaré : libre pousse[\s\S]*s’abîment de l’intérieur/),
  not('aucune recette boucles injectée', body, /Séchage et finition, calés sur vos habitudes|presse — t-shirt/),
  { name: 'zéro débordement horizontal à 390px', ok: over === 0, got: 'over=' + over },
  { name: 'zéro erreur console', ok: errors.length === 0, got: errors.slice(0, 2).join(' | ') },
]);

// Parcours B — bouclée au naturel : les questions locks ne doivent PAS être posées
// (garde anti-rémanence prouvée dans le navigateur, pas seulement en banc).
failures += await run('PARCOURS B — frisée au naturel (garde hors locks)', [
  { key: 'texture', re: /Frisée \/ Bouclée/ },
  { key: 'style', re: /Au naturel/ },
  { key: 'curlyDry', re: /frotte à la serviette/ },
  { key: 'curlyHold', re: /film .*carton/ },
], (body, { asked, over, errors }) => [
  { name: 'questions locks jamais posées hors locks', ok: !asked.locStage && !asked.locCare && !asked.locDry, got: JSON.stringify(asked) },
  { name: 'questions boucles posées elles (rappel)', ok: asked.curly, got: 'absentes' },
  has('routine boucles rendue', body, /Séchage et finition, calés sur vos habitudes/),
  not('aucune étape locks parasite', body, /Sécher les locks jusqu’au cœur|Rien ne sera retordu/),
  { name: 'zéro débordement horizontal à 390px', ok: over === 0, got: 'over=' + over },
  { name: 'zéro erreur console', ok: errors.length === 0, got: errors.slice(0, 2).join(' | ') },
]);

await browser.close();
console.log(failures === 0 ? '\nNAVIGATEUR D11 : TOUT PASSE' : `\nÉCHECS NAVIGATEUR : ${failures}`);
process.exit(failures === 0 ? 0 : 1);
