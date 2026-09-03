#!/usr/bin/env python3
"""KURLA — génère les sources SVG du logo.

Pourquoi un script plutôt qu'un fichier SVG écrit à la main : la spirale (la
boucle de cheveu texturé qui termine le K) est calculée, pas tracée à l'œil.
Relancer ce script régénère exactement le même trait.

Produit :
  brand/svg/logo-mark.svg          monogramme seul (512x512)
  brand/svg/logo-lockup-dark.svg   monogramme + signature, pour fonds clairs
  brand/svg/logo-lockup-light.svg  monogramme + signature, pour fonds sombres

Le raster (icônes PWA, favicon, image de partage) est fait par
scripts/renderLogo.mjs, qui utilise un vrai moteur de rendu (Chromium) : pas de
conversion approximative SVG -> PNG.

Usage : python3 scripts/buildLogo.py
"""
from __future__ import annotations

import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'brand', 'svg')

INK = '#050403'
WARM_DARK = '#241309'
COPPER = '#C8753D'
AMBER = '#D49A63'
CREAM = '#FFF7EF'


def spiral(cx: float, cy: float, r0: float, r1: float, turns: float, start_deg: float, steps: int = 90) -> str:
    """Archimédienne de r0 à r1, échantillonnée en polyligne (lissage cubique)."""
    pts = []
    total = 360.0 * turns
    for i in range(steps + 1):
        t = i / steps
        ang = math.radians(start_deg + total * t)
        r = r0 + (r1 - r0) * t
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    d = f'M {pts[0][0]:.2f} {pts[0][1]:.2f}'
    for i in range(1, len(pts) - 2, 3):
        p0, p1, p2, p3 = pts[i], pts[i + 1], pts[i + 2], pts[i + 3]
        c1 = (p0[0] + (p1[0] - p0[0]) * 0.6, p0[1] + (p1[1] - p0[1]) * 0.6)
        c2 = (p1[0] + (p2[0] - p1[0]) * 0.4, p1[1] + (p2[1] - p1[1]) * 0.4)
        d += f' C {c1[0]:.2f} {c1[1]:.2f}, {c2[0]:.2f} {c2[1]:.2f}, {p2[0]:.2f} {p2[1]:.2f}'
        if i + 3 >= len(pts) - 3:
            d += f' C {c2[0]:.2f} {c2[1]:.2f}, {p3[0]:.2f} {p3[1]:.2f}, {p3[0]:.2f} {p3[1]:.2f}'
            break
    last = pts[-1]
    d += f' L {last[0]:.2f} {last[1]:.2f}'
    return d


def mark_defs() -> str:
    return f'''  <defs>
    <linearGradient id="kurlaBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{WARM_DARK}"/>
      <stop offset="1" stop-color="{INK}"/>
    </linearGradient>
    <radialGradient id="kurlaGlow" cx="0.74" cy="0.84" r="0.62">
      <stop offset="0" stop-color="{COPPER}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="{COPPER}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="kurlaMetal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{CREAM}"/>
      <stop offset="0.5" stop-color="#F6E7D6"/>
      <stop offset="1" stop-color="{AMBER}"/>
    </linearGradient>
    <linearGradient id="kurlaCopper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{AMBER}"/>
      <stop offset="1" stop-color="{COPPER}"/>
    </linearGradient>
  </defs>'''


def mark_body() -> str:
    """Le monogramme : un K géométrique dont la jambe basse se termine en boucle.

    Le K est tracé en traits ronds (pas en empattements) : c'est ce qui reste
    lisible à 48 px sur l'écran d'accueil d'un téléphone. La boucle en cuivre
    est le seul ornement — elle dit « cheveu texturé » sans un mot.
    """
    # Hampe et bras : traits ronds, épaisseur 42, joints ronds.
    stem = 'M 168 132 L 168 380'
    upper_arm = 'M 168 268 L 340 140'
    # Jambe basse : droite puis enroulée en spirale (1,15 tour).
    lower_leg = 'M 168 268 L 300 356'
    curl = spiral(cx=356, cy=318, r0=64, r1=16, turns=1.15, start_deg=120, steps=72)
    return f'''  <g stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="{stem}" stroke="url(#kurlaMetal)" stroke-width="42"/>
    <path d="{upper_arm}" stroke="url(#kurlaMetal)" stroke-width="42"/>
    <path d="{lower_leg}" stroke="url(#kurlaMetal)" stroke-width="42"/>
    <path d="{curl}" stroke="url(#kurlaCopper)" stroke-width="26" opacity="0.98"/>
  </g>'''


def mark_svg(rounded: bool = True) -> str:
    rx = 116 if rounded else 0
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="KURLA Beauty">
  <title>KURLA Beauty</title>
{mark_defs()}
  <rect width="512" height="512" rx="{rx}" fill="url(#kurlaBg)"/>
  <rect width="512" height="512" rx="{rx}" fill="url(#kurlaGlow)"/>
{mark_body()}
</svg>
'''


def lockup_svg(on_dark: bool) -> str:
    """Signature complète : monogramme + KURLA + BEAUTY."""
    text = CREAM if on_dark else '#2A1810'
    beauty = AMBER if on_dark else COPPER
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 160" width="560" height="160" role="img" aria-label="KURLA Beauty">
  <title>KURLA Beauty</title>
{mark_defs()}
  <g transform="translate(0,8)">
    <rect width="144" height="144" rx="34" fill="url(#kurlaBg)"/>
    <rect width="144" height="144" rx="34" fill="url(#kurlaGlow)"/>
    <g transform="scale(0.28125)">{mark_body()}</g>
  </g>
  <text x="176" y="82" font-family="Playfair Display, Georgia, serif" font-size="72" font-weight="800" letter-spacing="1" fill="{text}">KURLA</text>
  <text x="178" y="116" font-family="Inter, Helvetica, Arial, sans-serif" font-size="20" font-weight="600" letter-spacing="9.5" fill="{beauty}">BEAUTY</text>
</svg>
'''


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    files = {
        'logo-mark.svg': mark_svg(rounded=True),
        'logo-mark-square.svg': mark_svg(rounded=False),
        'logo-lockup-light.svg': lockup_svg(on_dark=True),
        'logo-lockup-dark.svg': lockup_svg(on_dark=False),
    }
    for name, content in files.items():
        path = os.path.join(OUT_DIR, name)
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(content)
        print(f'✓ {path}')
    # Le composant React est généré depuis les mêmes fonctions : une seule source.
    body = mark_body().replace('url(#kurla', 'url(#__UID__kurla')
    tsx = LOGO_TSX.replace('__MARK_BODY__', body.replace('`', '\\`'))
    tsx_path = os.path.join(ROOT, 'src', 'components', 'Logo.tsx')
    with open(tsx_path, 'w', encoding='utf-8') as fh:
        fh.write(tsx)
    print(f'✓ {tsx_path}')



# ————————————————————————————————————————————————————————————————————————
# Le composant React est GÉNÉRÉ depuis ces mêmes fonctions : une seule source
# de vérité. Éditer Logo.tsx à la main, c'est le désynchroniser du raster.
# ————————————————————————————————————————————————————————————————————————

LOGO_TSX = '''// GÉNÉRÉ AUTOMATIQUEMENT — ne pas éditer à la main.
// Source : scripts/buildLogo.py  (puis `python3 scripts/buildLogo.py`)
//
// Logo KURLA Beauty, en SVG inline : aucun fichier à télécharger, aucune police
// à charger, aucun clignotement au premier rendu. Les identifiants de dégradé
// sont préfixés par useId() pour que deux logos coexistent sans se voler leurs
// couleurs.
import React, { useId } from 'react';

export interface LogoProps {
  /** « mark » = monogramme seul (icône). « lockup » = monogramme + signature. */
  variant?: 'mark' | 'lockup';
  /** « light » pour fond sombre, « dark » pour fond clair. */
  tone?: 'light' | 'dark';
  /** Hauteur en pixels (le lockup fait 3,5 × cette hauteur en largeur). */
  height?: number;
  className?: string;
  title?: string;
}

const MARK_BODY = `__MARK_BODY__`;

export const Logo: React.FC<LogoProps> = ({
  variant = 'lockup',
  tone = 'light',
  height = 36,
  className = '',
  title = 'KURLA Beauty',
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const body = MARK_BODY.replace(/__UID__/g, uid);

  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 512 512"
        width={height}
        height={height}
        role="img"
        aria-label={title}
        className={className}
      >
        {title ? <title>{title}</title> : null}
        <defs>
          <linearGradient id={uid + 'kurlaBg'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#241309" />
            <stop offset="1" stopColor="#050403" />
          </linearGradient>
          <radialGradient id={uid + 'kurlaGlow'} cx="0.74" cy="0.84" r="0.62">
            <stop offset="0" stopColor="#C8753D" stopOpacity="0.55" />
            <stop offset="1" stopColor="#C8753D" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={uid + 'kurlaMetal'} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFF7EF" />
            <stop offset="0.5" stopColor="#F6E7D6" />
            <stop offset="1" stopColor="#D49A63" />
          </linearGradient>
          <linearGradient id={uid + 'kurlaCopper'} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#D49A63" />
            <stop offset="1" stopColor="#C8753D" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="116" fill={'url(#' + uid + 'kurlaBg)'} />
        <rect width="512" height="512" rx="116" fill={'url(#' + uid + 'kurlaGlow)'} />
        {body}
      </svg>
    );
  }

  const wordmark = tone === 'light' ? '#FFF7EF' : '#2A1810';
  const width = Math.round(height * 3.5);
  return (
    <svg
      viewBox="0 0 560 160"
      width={width}
      height={height}
      role="img"
      aria-label={title}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={uid + 'kurlaBg'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#241309" />
          <stop offset="1" stopColor="#050403" />
        </linearGradient>
        <radialGradient id={uid + 'kurlaGlow'} cx="0.74" cy="0.84" r="0.62">
          <stop offset="0" stopColor="#C8753D" stopOpacity="0.55" />
          <stop offset="1" stopColor="#C8753D" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={uid + 'kurlaMetal'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF7EF" />
          <stop offset="0.5" stopColor="#F6E7D6" />
          <stop offset="1" stopColor="#D49A63" />
        </linearGradient>
        <linearGradient id={uid + 'kurlaCopper'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D49A63" />
          <stop offset="1" stopColor="#C8753D" />
        </linearGradient>
      </defs>
      <g transform="translate(0,8)">
        <rect width="144" height="144" rx="34" fill={'url(#' + uid + 'kurlaBg)'} />
        <rect width="144" height="144" rx="34" fill={'url(#' + uid + 'kurlaGlow)'} />
        <g transform="scale(0.28125)">{body}</g>
      </g>
      <text
        x="176"
        y="82"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="72"
        fontWeight={800}
        letterSpacing="1"
        fill={wordmark}
      >
        KURLA
      </text>
      <text
        x="178"
        y="116"
        fontFamily="Inter, Helvetica, Arial, sans-serif"
        fontSize="20"
        fontWeight={600}
        letterSpacing="9.5"
        fill="#C8753D"
      >
        BEAUTY
      </text>
    </svg>
  );
};

export default Logo;
'''


if __name__ == '__main__':
    main()
