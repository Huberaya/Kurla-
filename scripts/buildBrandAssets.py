#!/usr/bin/env python3
"""KURLA — génère les assets de marque dérivés de la banque d'images.

Produit :
  public/og-default.png      image de partage 1200x630
  public/icon-192.png        icône PWA
  public/icon-512.png        icône PWA haute résolution
  public/icon-maskable-512.png  icône PWA « maskable » (plein cadre, zone sûre)
  public/favicon.ico         favicon multi-tailles

Tout est construit en local : aucune police ni image n'est téléchargée au runtime
du site. Playfair Display (SIL Open Font License) est attendue dans
/home/user/fonts/PlayfairDisplay.ttf ; à défaut, une serif système est utilisée.

Usage : python3 scripts/buildBrandAssets.py
"""
from __future__ import annotations

import io
import math
import os
import re
import urllib.request

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public')
FONT_CANDIDATES = [
    '/home/user/fonts/PlayfairDisplay.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
]
SANS_CANDIDATES = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]

INK = (5, 4, 3)
INK_SOFT = (26, 15, 10)
CREAM = (255, 247, 239)
COPPER = (200, 117, 61)
AMBER = (212, 154, 99)

UA = {'User-Agent': 'Mozilla/5.0 (KURLA brand assets builder)'}


def font(candidates, size, weight_axis=None):
    for path in candidates:
        if os.path.exists(path):
            try:
                f = ImageFont.truetype(path, size)
                if weight_axis and path.endswith('PlayfairDisplay.ttf'):
                    f.set_variation_by_axes([weight_axis])
                return f
            except Exception:
                continue
    return ImageFont.load_default()


def serif(size, weight=800):
    return font(FONT_CANDIDATES, size, weight)


def sans(size):
    return font(SANS_CANDIDATES, size)


def hero_photo_id() -> str:
    """Lit l'identifiant du visuel héros dans la banque générée."""
    path = os.path.join(ROOT, 'src', 'data', 'brandImages.ts')
    src = open(path, encoding='utf-8').read()
    block = re.search(r"afroStudio: \{(.*?)\n  \},", src, re.S)
    if not block:
        raise SystemExit('Visuel afroStudio introuvable dans src/data/brandImages.ts')
    m = re.search(r"photoId: '(photo-[^']+)'", block.group(1))
    return m.group(1)


def fetch_photo(pid: str, w: int, h: int) -> Image.Image:
    url = f'https://images.unsplash.com/{pid}?auto=format&fit=crop&crop=faces&w={w}&h={h}&q=85'
    req = urllib.request.Request(url, headers=UA)
    return Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read())).convert('RGB')


def vertical_gradient(size, top, bottom):
    w, h = size
    grad = Image.new('RGB', (1, h))
    d = ImageDraw.Draw(grad)
    for y in range(h):
        t = y / max(1, h - 1)
        d.point((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return grad.resize((w, h))


def draw_curl(draw, cx, cy, radius, color, width, turns=1.6, start=140):
    """Spirale évoquant une boucle de cheveu texturé."""
    steps = 160
    pts = []
    total = 360 * turns
    for i in range(steps + 1):
        ang = math.radians(start + total * i / steps)
        r = radius * (1 - 0.62 * i / steps)
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    draw.line(pts, fill=color, width=width, joint='curve')


def build_og(pid: str, out: str) -> None:
    W, H = 1200, 630
    img = vertical_gradient((W, H), INK_SOFT, INK).convert('RGB')

    # Photographie à droite, fondue dans l'encre sur ses 300 premiers pixels
    photo = fetch_photo(pid, 760, 760).crop((60, 55, 760, 685)).resize((620, 630))
    mask = Image.new('L', (620, 630), 255)
    md = ImageDraw.Draw(mask)
    for x in range(0, 300):
        md.line([(x, 0), (x, 630)], fill=int(255 * (x / 300) ** 1.4))
    img.paste(photo, (W - 620, 0), mask)

    # Halos cuivre
    glow = Image.new('RGB', (W, H), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W - 620, -200, W + 260, 400], fill=(46, 23, 11))
    gd.ellipse([-300, H - 340, 320, H + 240], fill=(30, 16, 8))
    img = Image.blend(img, ImageChops.add(img, glow), 0.85)

    d = ImageDraw.Draw(img, 'RGBA')
    # Voile de lisibilité à gauche
    for x in range(0, 700):
        d.line([(x, 0), (x, H)], fill=(5, 4, 3, int(235 * (1 - x / 700) ** 0.8)))
    d.rectangle([0, H - 6, W, H], fill=COPPER)

    f_word = serif(116, 900)
    f_sub = serif(40, 700)
    f_tag = sans(27)
    f_kick = sans(20)

    d.text((72, 96), 'KURLA', font=f_word, fill=CREAM)
    d.text((72, 214), 'BEAUTY', font=f_sub, fill=AMBER)
    d.line([(74, 276), (250, 276)], fill=COPPER, width=3)

    d.text((72, 306), 'La beauté texturée,', font=f_tag, fill=(255, 247, 239))
    d.text((72, 344), 'enfin comprise.', font=f_tag, fill=(255, 247, 239))

    # Encart d'audience — deux lignes pour ne jamais mordre sur la photographie
    chip_lines = [
        'Cheveux 3A – 4C  ·  Peaux riches en mélanine',
        'Femmes, hommes & enfants',
    ]
    d.rounded_rectangle([68, 404, 566, 486], radius=26, fill=(26, 15, 10), outline=COPPER, width=2)
    d.text((94, 422), chip_lines[0], font=f_kick, fill=AMBER)
    d.text((94, 452), chip_lines[1], font=f_kick, fill=(255, 247, 239, 200))

    d.text((72, 540), 'kurlabeauty.vercel.app', font=f_kick, fill=(150, 138, 130))

    # Garde-fou de mise en page : aucun texte ne doit mordre sur la photographie.
    photo_x = W - 620
    for label, box in (
        ('KURLA', d.textbbox((72, 96), 'KURLA', font=f_word)),
        ('BEAUTY', d.textbbox((72, 214), 'BEAUTY', font=f_sub)),
        ('accroche 1', d.textbbox((72, 306), 'La beauté texturée,', font=f_tag)),
        ('accroche 2', d.textbbox((72, 344), 'enfin comprise.', font=f_tag)),
        ('encart 1', d.textbbox((94, 422), chip_lines[0], font=f_kick)),
        ('encart 2', d.textbbox((94, 452), chip_lines[1], font=f_kick)),
        ('url', d.textbbox((72, 540), 'kurlabeauty.vercel.app', font=f_kick)),
    ):
        if box[2] > photo_x:
            raise SystemExit(f'Mise en page OG : « {label} » dépasse sur la photo (x={box[2]} > {photo_x})')

    img.save(out, 'PNG', optimize=True, compress_level=9)
    print(f'✓ {out}')


def build_icon(size: int, maskable: bool) -> Image.Image:
    img = vertical_gradient((size, size), INK_SOFT, INK)
    d = ImageDraw.Draw(img, 'RGBA')

    # Halo cuivre en bas à droite
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([size * 0.35, size * 0.52, size * 1.35, size * 1.5], fill=(200, 117, 61, 46))
    img = Image.alpha_composite(img.convert('RGBA'), glow).convert('RGB')
    d = ImageDraw.Draw(img, 'RGBA')

    # Spirale (boucle texturée) derrière le monogramme
    draw_curl(
        d,
        cx=size * 0.5,
        cy=size * 0.47,
        radius=size * (0.30 if maskable else 0.34),
        color=(200, 117, 61, 235),
        width=max(2, int(size * 0.035)),
        turns=1.7,
        start=150,
    )

    # Monogramme
    fs = int(size * (0.46 if maskable else 0.54))
    f = serif(fs, 900)
    box = d.textbbox((0, 0), 'K', font=f)
    d.text(
        (size / 2 - (box[2] - box[0]) / 2 - box[0], size * 0.46 - (box[3] - box[1]) / 2 - box[1]),
        'K',
        font=f,
        fill=CREAM,
    )

    if not maskable:
        # Coins arrondis (les icônes non maskables sont rognées par Android/iOS)
        radius = int(size * 0.22)
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
        out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        return out
    return img


def main() -> None:
    os.makedirs(PUBLIC, exist_ok=True)
    pid = hero_photo_id()
    build_og(pid, os.path.join(PUBLIC, 'og-default.png'))

    build_icon(192, maskable=False).save(os.path.join(PUBLIC, 'icon-192.png'), 'PNG', optimize=True)
    build_icon(512, maskable=False).save(os.path.join(PUBLIC, 'icon-512.png'), 'PNG', optimize=True)
    build_icon(512, maskable=True).save(os.path.join(PUBLIC, 'icon-maskable-512.png'), 'PNG', optimize=True)
    print('✓ icônes PWA')

    fav = build_icon(256, maskable=False)
    fav.save(
        os.path.join(PUBLIC, 'favicon.ico'),
        'ICO',
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )
    print('✓ favicon.ico')


if __name__ == '__main__':
    main()
