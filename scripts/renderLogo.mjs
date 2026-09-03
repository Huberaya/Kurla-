/**
 * KURLA — rasterisation du logo et de l'image de partage.
 *
 * Pourquoi Chromium plutôt qu'une conversion SVG : un SVG rasterisé à l'aveugle
 * produit des dégradés approximatifs et des textes déplacés. Ici le rendu est
 * celui d'un vrai moteur, avec la vraie police, à la taille exacte demandée.
 *
 * Produit :
 *   public/icon-192.png, icon-512.png, icon-maskable-512.png
 *   public/favicon.ico
 *   public/og-default.png
 *
 * Usage : node scripts/renderLogo.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SVG_DIR = join(ROOT, 'brand', 'svg');
const PUBLIC = join(ROOT, 'public');

const svg = (name) => readFileSync(join(SVG_DIR, name), 'utf-8');

/** Rend un SVG (ou un HTML) à une taille exacte, fond transparent possible. */
async function raster(page, content, { width, height, omitBackground = false }) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8">
     <style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}
     svg,img{display:block;width:${width}px;height:${height}px}</style></head>
     <body>${content}</body></html>`,
    { waitUntil: 'load' },
  );
  await page.waitForTimeout(250);
  return page.screenshot({ omitBackground, type: 'png' });
}

async function main() {
  if (!existsSync(PUBLIC)) mkdirSync(PUBLIC, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const mark = svg('logo-mark.svg');
  const markSquare = svg('logo-mark-square.svg');

  // ——— Icônes PWA « any » : coins arrondis, le système les rogne déjà un peu ———
  for (const size of [192, 512]) {
    const buf = await raster(page, mark, { width: size, height: size, omitBackground: true });
    writeFileSync(join(PUBLIC, `icon-${size}.png`), buf);
    console.log(`✓ public/icon-${size}.png`);
  }

  // ——— Icône « maskable » : plein cadre, marque ramenée dans la zone sûre
  //     (cercle de 80 % du côté) pour survivre au masquage Android. ———
  {
    const size = 512;
    const inner = Math.round(size * 0.66);
    const buf = await raster(
      page,
      `<div style="width:${size}px;height:${size}px;background:#050403;display:flex;align-items:center;justify-content:center">
         <div style="width:${inner}px;height:${inner}px">${markSquare}</div>
       </div>`,
      { width: size, height: size },
    );
    writeFileSync(join(PUBLIC, 'icon-maskable-512.png'), buf);
    console.log('✓ public/icon-maskable-512.png');
  }

  // ——— Favicon : on sort un PNG 256 propre, scripts/buildFavicon.py en fait
  //     le .ico multi-tailles (16/32/48/64) — PIL sait le faire, pas besoin
  //     d'une dépendance native de plus. ———
  {
    const buf = await raster(page, mark, { width: 256, height: 256, omitBackground: true });
    writeFileSync(join(PUBLIC, 'favicon-256.png'), buf);
    console.log('✓ public/favicon-256.png');
  }

  // ——— Image de partage 1200x630 ———
  {
    const W = 1200;
    const H = 630;
    const photoId = (() => {
      const src = readFileSync(join(ROOT, 'src', 'data', 'brandImages.ts'), 'utf-8');
      const block = src.match(/afroStudio: \{([\s\S]*?)\n  \},/);
      return block ? block[1].match(/photoId: '(photo-[^']+)'/)[1] : null;
    })();
    const photo = photoId
      ? `<img src="https://images.unsplash.com/${photoId}?auto=format&fit=crop&crop=faces&w=760&h=760&q=85"
             alt="" style="position:absolute;right:0;top:0;width:620px;height:630px;object-fit:cover;
             object-position:center 30%;
             -webkit-mask-image:linear-gradient(to right, transparent 0, #000 300px);
             mask-image:linear-gradient(to right, transparent 0, #000 300px);" />`
      : '';

    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        html,body{margin:0;padding:0;width:${W}px;height:${H}px;overflow:hidden;background:#050403}
        *{box-sizing:border-box}
        .wrap{position:relative;width:${W}px;height:${H}px;
          background:radial-gradient(120% 90% at 12% 8%, #241309 0%, #050403 62%);
          font-family:Inter,'Helvetica Neue',Arial,sans-serif;color:#FFF7EF}
        .glow{position:absolute;width:620px;height:620px;border-radius:50%;filter:blur(90px);
          background:radial-gradient(circle, rgba(200,117,61,.34), transparent 68%)}
        .g1{right:-120px;top:-160px}
        .g2{left:-200px;bottom:-260px;opacity:.7}
        .logo{position:absolute;left:72px;top:78px;width:330px}
        .lede{position:absolute;left:76px;top:300px;width:520px;font-size:31px;line-height:1.32;
          font-weight:400;color:#FFF7EF}
        .lede b{font-weight:600}
        .rule{position:absolute;left:76px;top:270px;width:88px;height:3px;background:#C8753D;border-radius:2px}
        .chip{position:absolute;left:76px;top:432px;display:inline-flex;align-items:center;
          padding:12px 22px;border:2px solid rgba(200,117,61,.55);border-radius:999px;
          font-size:19px;font-weight:500;color:#D49A63;background:rgba(26,15,10,.72)}
        .url{position:absolute;left:76px;bottom:52px;font-size:19px;color:#8C7B6E;letter-spacing:.02em}
        .bar{position:absolute;left:0;right:0;bottom:0;height:6px;background:#C8753D}
      </style></head>
      <body><div class="wrap">
        <div class="glow g2"></div>
        ${photo}
        <div class="glow g1"></div>
        <div class="logo">${svg('logo-lockup-light.svg')}</div>
        <div class="rule"></div>
        <div class="lede">La beauté <b>texturée</b>,<br>enfin <b>comprise</b>.</div>
        <div class="chip">Cheveux 3A – 4C · Peaux riches en mélanine</div>
        <div class="url">kurlabeauty.vercel.app</div>
        <div class="bar"></div>
      </div></body></html>`;

    await page.setViewportSize({ width: W, height: H });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const buf = await page.screenshot({ type: 'png' });
    writeFileSync(join(PUBLIC, 'og-default.png'), buf);
    console.log('✓ public/og-default.png');
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
