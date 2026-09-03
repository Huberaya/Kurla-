#!/usr/bin/env python3
"""KURLA — générateur de la banque d'images de marque.

Rôle : pour chaque visuel retenu, calcule la couleur dominante et un LQIP
(placeholder flouté en base64) puis écrit `src/data/brandImages.ts`.

Les visuels ne sont PAS réhébergés : ils restent servis par images.unsplash.com
(licence Unsplash, hotlinking autorisé) avec des paramètres imgix d'art-direction
(fit=crop, crop=faces, largeur/hauteur explicites) — voir BrandImage.tsx.

Usage : python3 scripts/buildBrandVisuals.py
"""
from __future__ import annotations

import base64
import io
import json
import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'data', 'brandImages.ts')

# key, unsplash photo id, alt FR, alt EN, photographe, page unsplash, tonalité mesurée
IMAGES = [
    ("afroStudio",     "photo-1632765866070-3fadf25d3d5b",
     "Femme noire coiffée d’un afro volumineux, lèvres glossy, mains levées",
     "Black woman wearing a voluminous afro, glossy lips, hands raised",
     "Good Faces", "https://unsplash.com/photos/woman-with-afro-and-glossy-lips-62wQhEghaw0", "deep"),
    ("afroPortrait",   "photo-1632765854612-9b02b6ec2b15",
     "Portrait d’une femme noire avec un afro, regard franc vers l’objectif",
     "Portrait of a Black woman with an afro looking straight at the camera",
     "Good Faces", "https://unsplash.com/photos/a-woman-with-an-afro-is-looking-at-the-camera-xmSWVeGEnJw", "deep"),
    ("afroRed",        "photo-1709810529099-0ce6102692df",
     "Femme noire avec un afro devant un fond rouge vitaminé",
     "Black woman with an afro in front of a vivid red backdrop",
     "LOLA AZIZADA", "https://unsplash.com/photos/a-woman-with-an-afro-standing-in-front-of-a-red-background-HyoTmwZQwWU", "dark"),
    ("afroSunglasses", "photo-1583147610149-78ac5cb5a303",
     "Femme noire en débardeur blanc et lunettes de soleil, en extérieur",
     "Black woman in a white tank top wearing black sunglasses outdoors",
     "Justin Essah", "https://unsplash.com/photos/woman-in-white-tank-top-wearing-black-sunglasses-8bPw733XN-g", "deep"),
    ("afroSquare",     "photo-1519699047748-de8e457a634e",
     "Femme noire avec un afro, épaules dénudées, lumière naturelle",
     "Black woman with an afro, bare shoulders, natural light",
     "Jessica Felicio", "https://unsplash.com/photos/a-woman-with-an-afro-is-looking-at-the-camera-_cvwXhGqG-o", "dark"),
    ("braidsProfile",  "photo-1527203561188-dae1bc1a417f",
     "Profil d’une femme noire avec une queue-de-cheval tressée",
     "Profile of a Black woman with a braided ponytail",
     "Jessica Felicio", "https://unsplash.com/photos/woman-profile-with-braided-ponytail-QS9ZX5UnS14", "deep"),
    ("braidsYellow",   "photo-1613099084406-4b9140fc780a",
     "Femme noire en haut jaune, cheveux tressés en arrière",
     "Black woman in a yellow top with braided hair pulled back",
     "Gama. Films", "https://unsplash.com/photos/woman-in-yellow-shirt-wearing-black-braided-hair-tZx2TIOBQnQ", "dark"),
    ("braidsWall",     "photo-1535588706069-af8f2d837332",
     "Femme noire debout devant un mur blanc, cheveux texturés coiffés",
     "Black woman standing against a white wall, textured hair styled",
     "Leighann Blackwood", "https://unsplash.com/photos/woman-standing-near-white-wall-EUedgXxvTAs", "deep"),
    ("locsGlasses",    "photo-1614174669570-037a92241af8",
     "Femme noire avec locks et lunettes de vue cerclées de noir",
     "Black woman with locs wearing black-framed eyeglasses",
     "Baptista Ime James", "https://unsplash.com/photos/woman-in-white-shirt-wearing-black-framed-eyeglasses-o-f9IhaLB5k", "dark"),
    ("textureCurls",   "photo-1759865775535-7e4e3d2bbf3a",
     "Gros plan sur des boucles serrées et brillantes, cheveux texturés",
     "Close-up of tight glossy curls, textured hair",
     "Liana S", "https://unsplash.com/photos/close-up-of-a-persons-dark-curly-hair-9Vx-Dm9y-0A", "texture"),
    ("manCrewNeck",    "photo-1587064712555-6e206484699b",
     "Portrait d’un homme noir en t-shirt col rond noir",
     "Portrait of a Black man in a black crew neck t-shirt",
     "Jassir Jonis", "https://unsplash.com/photos/man-in-black-crew-neck-shirt-QWa0TIUW638", "dark"),
    ("manSmile",       "photo-1522529599102-193c0d76b5b6",
     "Portrait en lumière naturelle d’un homme noir qui sourit",
     "Natural-light portrait of a smiling Black man",
     "Elizeu Dias", "https://unsplash.com/photos/selective-focus-of-man-smiling-during-daytime-2EGNqazbAMk", "deep"),
    ("manStudio",      "photo-1529111290557-82f6d5c6cf85",
     "Portrait studio d’un homme noir barbu",
     "Studio portrait of a bearded Black man",
     "Pacha Shot’s", "https://unsplash.com/photos/derek-fisher-d0peGya6R5Y", "deep"),
    ("childNature",    "photo-1535043883-2548fb805573",
     "Petite fille noire en débardeur blanc, en extérieur",
     "Young Black girl in a white tank top outdoors",
     "Zach Lucero", "https://unsplash.com/photos/shallow-focus-photography-of-girl-in-white-tank-top-near-tree-during-daytime-rj6ARBSk98g", "deep"),
    ("skincareTowel",  "photo-1648203276014-20f97ba1f817",
     "Femme noire avec une serviette sur la tête et un soin sur le visage",
     "Black woman with a towel on her head and a cream mask on her face",
     "Kaeme", "https://unsplash.com/photos/a-woman-with-a-towel-on-her-head-and-a-jar-of-cream-on-her-face-WrZutKjrI2U", "dark"),
    ("skincareLotion", "photo-1693004927824-f2623bbedc8b",
     "Femme noire appliquant une crème hydratante sur son visage",
     "Black woman applying a moisturising cream to her face",
     "Leighann Blackwood", "https://unsplash.com/photos/a-woman-is-putting-a-lotion-on-her-face-zoYLGk2oULA", "deep"),
    ("beautyLips",     "photo-1613218107829-ebb0faf26e6b",
     "Gros plan beauté : rouge à lèvres rouge et peau mélaninée éclatante",
     "Beauty close-up: red lipstick and glowing melanin skin",
     "Jean Jacobs", "https://unsplash.com/photos/woman-with-red-lipstick-and-black-hair-YzeyYBCs28U", "dark"),
    ("salonStyling",   "photo-1634449571017-5fecfd26ad76",
     "Une coiffeuse coiffe une cliente dans un salon",
     "A hairstylist styling a client’s hair in a salon",
     "Lindsay Cash", "https://unsplash.com/photos/a-woman-getting-her-hair-styled-by-another-woman-x1UvHQ-OWvw", "dark"),
    ("salonClient",    "photo-1629397662621-0d4b8e82801f",
     "Cliente en débardeur noir pendant un soin chez le coiffeur",
     "Client in a black tank top during a salon treatment",
     "Giorgio Trovato", "https://unsplash.com/photos/woman-in-black-tank-top-XQlRnx0nfAs", "dark"),
    ("washDay",        "photo-1522337360788-8b13dee7a37e",
     "Moment de soin sur cheveux texturés, gestes lents et précis",
     "Care moment on textured hair, slow precise gestures",
     "Unsplash", "https://unsplash.com/", "deep"),
]

UA = {'User-Agent': 'Mozilla/5.0 (KURLA brand visuals builder)'}


def analyse(pid: str) -> tuple[str, str, int, int]:
    """Retourne (lqip_base64, couleur_dominante_hex, largeur, hauteur)."""
    url = f'https://images.unsplash.com/{pid}?auto=format&fit=crop&w=1400&q=80'
    req = urllib.request.Request(url, headers=UA)
    raw = urllib.request.urlopen(req, timeout=60).read()
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    w, h = im.size

    tiny = im.copy()
    tiny.thumbnail((20, 20))
    buf = io.BytesIO()
    tiny.save(buf, format='JPEG', quality=40)
    lqip = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

    small = im.copy()
    small.thumbnail((80, 80))
    px = list(small.getdata())
    # couleur dominante = moyenne pondérée des pixels non extrêmes
    keep = [p for p in px if 18 < sum(p) / 3 < 238] or px
    r = sum(p[0] for p in keep) // len(keep)
    g = sum(p[1] for p in keep) // len(keep)
    b = sum(p[2] for p in keep) // len(keep)
    return lqip, '#%02X%02X%02X' % (r, g, b), w, h


def main() -> None:
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(lambda row: analyse(row[1]), IMAGES))

    lines = []
    lines.append('// GÉNÉRÉ AUTOMATIQUEMENT — ne pas éditer à la main.')
    lines.append('// Relancer : python3 scripts/buildBrandVisuals.py')
    lines.append('//')
    lines.append('// Banque de visuels de marque KURLA.')
    lines.append('// Chaque visuel a été retenu parce qu’il montre réellement des personnes')
    lines.append('// afro-descendantes / métisses, des cheveux texturés ou des peaux riches en')
    lines.append('// mélanine. La source est la licence Unsplash (usage commercial autorisé,')
    lines.append('// hotlinking autorisé). Le photographe et la page d’origine sont conservés')
    lines.append('// dans `credit` pour traçabilité.')
    lines.append('')
    lines.append("import type { BrandImage } from '../types';")
    lines.append('')
    lines.append('export const BRAND_IMAGES = {')
    for (key, pid, alt_fr, alt_en, author, page, tone), (lqip, color, w, h) in zip(IMAGES, results):
        lines.append(f"  {key}: {{")
        lines.append(f"    id: '{key}',")
        lines.append(f"    photoId: '{pid}',")
        lines.append(f"    alt: '{alt_fr.replace(chr(39), chr(92) + chr(39))}',")
        lines.append(f"    altEn: '{alt_en.replace(chr(39), chr(92) + chr(39))}',")
        lines.append(f"    credit: {{ author: '{author.replace(chr(39), chr(92) + chr(39))}', url: '{page}' }},")
        lines.append(f"    tone: '{tone}',")
        lines.append(f"    color: '{color}',")
        lines.append(f"    ratio: {round(w / h, 4)},")
        lines.append(f"    lqip: '{lqip}',")
        lines.append('  },')
    lines.append('} as const;')
    lines.append('')
    lines.append('export type BrandImageId = keyof typeof BRAND_IMAGES;')
    lines.append('')
    lines.append('export const BRAND_IMAGE_LIST: BrandImage[] = Object.values(BRAND_IMAGES);')
    lines.append('')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))
    print(f'✓ {OUT} — {len(IMAGES)} visuels')
    for (key, *_), (_l, color, w, h) in zip(IMAGES, results):
        print(f'   {key:16} {color}  {w}x{h}')


if __name__ == '__main__':
    main()
