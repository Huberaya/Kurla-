/**
 * Planche de validation du logo — destinée à être regardée par un humain.
 * Rendue avec un vrai moteur de navigateur : ce qu'on voit, c'est ce que le
 * téléphone affichera.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SVG = join(ROOT, 'brand', 'svg');
const svg = (n) => readFileSync(join(SVG, n), 'utf-8');

const mark = svg('logo-mark.svg');
const lockupLight = svg('logo-lockup-light.svg');
const lockupDark = svg('logo-lockup-dark.svg');

const ladder = [192, 128, 96, 64, 44, 32, 24]
  .map((s) => `<div class="lad"><div style="width:${s}px;height:${s}px">${mark}</div><span>${s}px</span></div>`)
  .join('');

const neighbours = [
  { label: 'KURLA', html: `<div style="width:60px;height:60px">${mark}</div>` },
  { label: 'Messages', html: '<div class="nb" style="background:linear-gradient(140deg,#34C759,#0A7C2F)"><div class="nbg"></div></div>' },
  { label: 'Photos', html: '<div class="nb" style="background:linear-gradient(140deg,#FFD60A,#FF9F0A)"><div class="nbr"></div></div>' },
  { label: 'Musique', html: '<div class="nb" style="background:linear-gradient(140deg,#FF375F,#C9184A)"><div class="nbc"></div></div>' },
  { label: 'Réglages', html: '<div class="nb" style="background:linear-gradient(140deg,#8E8E93,#48484A)"><div class="nbs"></div></div>' },
];

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#0B0908;color:#FFF7EF;font-family:Inter,Arial,sans-serif;padding:48px}
  h1{font-size:34px;margin:0 0 6px;letter-spacing:-.02em}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.16em;color:#D49A63;margin:44px 0 18px;font-weight:600}
  .sub{color:#A7968A;font-size:14px;margin:0 0 8px}
  .row{display:flex;gap:28px;align-items:flex-end;flex-wrap:wrap}
  .lad{display:flex;flex-direction:column;align-items:center;gap:8px}
  .lad span{font-size:11px;color:#8C7B6E}
  .panel{padding:28px;border-radius:20px;display:inline-flex;align-items:center;gap:20px}
  .dark{background:#050403;border:1px solid #2A1810}
  .light{background:#FFFDF9;border:1px solid #E8E1DA}
  .chip{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8C7B6E;margin-bottom:10px}
  .phone{width:330px;height:560px;border-radius:44px;padding:26px 18px;
    background:linear-gradient(165deg,#1C1410,#050403 60%);border:1px solid #2A1810;
    display:flex;flex-direction:column;gap:6px}
  .phone .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px 14px;margin-top:18px}
  .app{display:flex;flex-direction:column;align-items:center;gap:7px}
  .app span{font-size:10px;color:#FFF7EF;opacity:.86}
  .nb{width:60px;height:60px;border-radius:15px;position:relative}
  .nbg:after{content:'';position:absolute;left:14px;top:16px;width:32px;height:22px;border-radius:11px;background:rgba(255,255,255,.92)}
  .nbr:after{content:'';position:absolute;left:16px;top:16px;width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,.9)}
  .nbc:after{content:'';position:absolute;left:26px;top:14px;width:14px;height:34px;border-radius:7px;background:rgba(255,255,255,.9)}
  .nbs:after{content:'';position:absolute;left:16px;top:26px;width:28px;height:8px;border-radius:4px;background:rgba(255,255,255,.85)}
  .dock{margin-top:auto;display:flex;justify-content:center;gap:18px;padding:14px;border-radius:26px;background:rgba(255,255,255,.06)}
  .og{width:900px;height:473px;border-radius:14px;overflow:hidden;border:1px solid #2A1810}
  .og img{width:100%;height:100%;object-fit:cover;display:block}
  .note{font-size:12px;color:#8C7B6E;max-width:760px;line-height:1.6}
</style></head><body>
  <h1>KURLA Beauty — planche logo</h1>
  <p class="sub">Monogramme : K géométrique dont la jambe basse s'enroule en boucle de cheveu texturé. Cuivre #C8753D sur encre #050403.</p>

  <h2>1. Lisibilité du monogramme</h2>
  <div class="row">${ladder}</div>

  <h2>2. Signature complète</h2>
  <div class="row">
    <div><div class="chip">sur fond sombre</div><div class="panel dark"><div style="width:270px">${lockupLight}</div></div></div>
    <div><div class="chip">sur fond clair</div><div class="panel light"><div style="width:270px">${lockupDark}</div></div></div>
  </div>

  <h2>3. Sur l'écran d'accueil d'un téléphone</h2>
  <div class="row">
    <div class="phone">
      <div style="font-size:11px;color:#8C7B6E;letter-spacing:.1em">ÉCRAN D'ACCUEIL</div>
      <div class="grid">
        ${neighbours.map((n) => `<div class="app">${n.html}<span>${n.label}</span></div>`).join('')}
      </div>
      <div class="dock"><div class="app">${`<div style="width:52px;height:52px">${mark}</div>`}<span>KURLA</span></div></div>
    </div>
    <div style="max-width:420px">
      <p class="note">Contrôle fait automatiquement : coins transparents sur l'icône « any », plein cadre sur l'icône « maskable », et monogramme entièrement contenu dans la zone sûre (cercle de 80 % du côté) pour survivre au masquage Android.</p>
      <p class="note" style="margin-top:14px">Ce que cette planche ne peut pas dire : si le trait vous plaît. C'est votre marque — dites-moi ce qui cloche, je redessine.</p>
    </div>
  </div>

  <h2>4. Image de partage (Open Graph 1200×630)</h2>
  <div class="og"><img src="file://${join(ROOT, 'public', 'og-default.png')}" alt=""></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1040, height: 1400 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const out = '/home/user/planche-logo-kurla.png';
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('✓', out);
