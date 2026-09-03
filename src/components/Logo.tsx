// GÉNÉRÉ AUTOMATIQUEMENT — ne pas éditer à la main.
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

const MARK_BODY = `  <g stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M 168 132 L 168 380" stroke="url(#__UID__kurlaMetal)" stroke-width="42"/>
    <path d="M 168 268 L 340 140" stroke="url(#__UID__kurlaMetal)" stroke-width="42"/>
    <path d="M 168 268 L 300 356" stroke="url(#__UID__kurlaMetal)" stroke-width="42"/>
    <path d="M 324.00 373.43 C 316.28 366.72, 312.87 362.99, 310.47 360.09 C 305.29 351.65, 303.22 347.22, 301.84 343.83 C 299.51 334.54, 298.89 329.84, 298.60 326.32 C 299.14 317.07, 299.93 312.57, 300.69 309.24 C 303.87 300.88, 305.90 296.96, 307.57 294.12 C 312.92 287.35, 315.93 284.34, 318.28 282.21 C 325.16 277.54, 328.79 275.65, 331.57 274.38 C 339.23 272.09, 343.11 271.41, 346.02 271.05 C 353.69 271.18, 357.44 271.68, 360.21 272.19 C 367.18 274.54, 370.46 276.08, 372.84 277.35 C 378.52 281.51, 381.06 283.86, 382.86 285.71 C 386.82 291.14, 388.45 294.01, 389.55 296.21 C 391.57 302.29, 392.22 305.37, 392.57 307.69 C 392.65 313.78, 392.33 316.75, 391.99 318.94 C 390.29 324.46, 389.15 327.05, 388.20 328.93 C 385.06 333.40, 383.29 335.40, 381.89 336.81 C 377.78 339.91, 375.61 341.18, 373.95 342.04 C 369.38 343.61, 367.08 344.11, 365.35 344.39 C 360.83 344.46, 358.64 344.24, 357.02 343.98 C 353.00 342.72, 351.14 341.88, 349.79 341.18 C 346.62 338.90, 345.24 337.61, 344.26 336.61 C 342.17 333.68, 341.34 332.15, 340.79 330.99 C 339.85 327.84, 339.59 326.27, 339.46 325.11 C 339.59 326.27, 339.47 323.21, 339.47 323.21 L 340.09 319.67" stroke="url(#__UID__kurlaCopper)" stroke-width="26" opacity="0.98"/>
  </g>`;

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
