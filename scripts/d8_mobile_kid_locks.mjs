// D8 — preuve navigateur : enfant + locks, rendu 390 px, zéro peigne prescrit.
import { chromium } from 'playwright';

const TARGETS = ['Crépus', 'Locks', null, null, 'Démêlage', null, null, null, null, null];
const NEG = /ne [a-zéûàô]+(e|ent|es)?[^\n]{0,12} rien|rien ne|n[’e]est pas|ne (se )?(doit|refait|cherche|fait)/i;
const isPrescription = (txt) => /d[ée]m[êe]ler|peigne|d[ée]m[êe]lage/.test(txt) && !NEG.test(txt);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://127.0.0.1:3000/diagnostic/cheveux', { waitUntil: 'domcontentloaded' });

for (let i = 0; i < 14; i++) {
  const result = await page.evaluate(() => document.body.innerText.includes('Votre priorité') && document.body.innerText.includes('routine'));
  const heading = await page.locator('h1, h2').first().innerText().catch(() => '');
  if (await page.getByText(/Ce que KURLA a compris/i).count()) break;
  const want = TARGETS[i];
  let btn = null;
  if (want) btn = page.getByRole('button', { name: new RegExp(want, 'i') }).first();
  if (!btn || !(await btn.count().catch(() => 0))) btn = page.getByRole('button', { name: /^(Premiers|Voir|Suivant|Continuer)/i }).first();
  if (!btn || !(await btn.count().catch(() => 0))) break;
  await btn.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);
}

const data = await page.evaluate(() => ({
  text: document.body.innerText,
  over: document.documentElement.scrollWidth - 390,
}));
const kit = /Crochet fin — les poils qui dépassent/.test(data.text);
const demeloir = /Peigne à dents larges|démêloir/i.test(data.text);
console.log(JSON.stringify({
  reached: /RÉSULTAT DU QUESTIONNAIRE/i.test(data.text),
  over: data.over,
  kit_crochet: kit,
  kit_demeloir_present: demeloir,
  washDayCond: /Conditionner sans défaire les locks/.test(data.text),
  locksCycle: /la routine suit le cycle locks/.test(data.text),
}, null, 2));
await browser.close();
