import React from 'react';

/**
 * Illustrations pédagogiques auto-portées (SVG inline) pour guider l'utilisateur
 * dans le diagnostic cheveux, notamment sur les deux questions techniques :
 *  - étape 1 : texture / forme de boucle
 *  - étape 4 : porosité (test du verre d'eau + état des écailles)
 *
 * SVG inline = aucun asset externe, rendu garanti (y compris hors-ligne / preview),
 * style cohérent avec la charte KURLA.
 */

const STROKE = '#D49A63';
const STROKE_SOFT = '#C8753D';
const FILL = '#C8753D';

// ── Brins : formes de boucles ────────────────────────────────────────────────

/** Zigzag serré (type 4, crépu) */
function ZigzagStrand({ x, amp = 5, step = 7, height = 64, y0 = 8 }: { x: number; amp?: number; step?: number; height?: number; y0?: number }) {
  let d = `M ${x} ${y0}`;
  let y = y0;
  let dir = 1;
  while (y < y0 + height) {
    y += step;
    d += ` L ${x + amp * dir} ${y}`;
    dir *= -1;
  }
  return <path d={d} stroke={STROKE} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
}

/** Boucles en S / ressorts (type 3, bouclé) */
function SpiralStrand({ x, amp = 8, waves = 3, height = 64, y0 = 8 }: { x: number; amp?: number; waves?: number; height?: number; y0?: number }) {
  const waveH = height / waves;
  let d = `M ${x} ${y0}`;
  for (let i = 0; i < waves; i++) {
    const cy = y0 + waveH * (i + 0.5);
    const ey = y0 + waveH * (i + 1);
    d += ` C ${x + (i % 2 === 0 ? amp : -amp)} ${cy}, ${x + (i % 2 === 0 ? amp : -amp)} ${cy}, ${x} ${ey}`;
  }
  return <path d={d} stroke={STROKE} strokeWidth={2.6} fill="none" strokeLinecap="round" />;
}

/** Locs : cylindres épais avec anneaux */
function LocStrand({ x, y0 = 8, height = 64 }: { x: number; y0?: number; height?: number }) {
  const rings = 4;
  return (
    <g>
      <path d={`M ${x - 4} ${y0} L ${x - 3} ${y0 + height} Q ${x} ${y0 + height + 6} ${x + 3} ${y0 + height} L ${x + 4} ${y0} Z`}
        fill={FILL} opacity={0.85} />
      {Array.from({ length: rings }).map((_, i) => (
        <path key={i} d={`M ${x - 4} ${y0 + 12 + i * 14} Q ${x} ${y0 + 17 + i * 14} ${x + 4} ${y0 + 12 + i * 14}`}
          stroke="#1A0F0A" strokeWidth={1.6} fill="none" />
      ))}
    </g>
  );
}

/** Tresses / vanilles : deux brins croisés */
function BraidStrand({ x, y0 = 6, height = 68 }: { x: number; y0?: number; height?: number }) {
  const crosses = 5;
  const seg = height / crosses;
  return (
    <g stroke={STROKE} strokeWidth={2.2} fill="none" strokeLinecap="round">
      {Array.from({ length: crosses }).map((_, i) => {
        const y = y0 + i * seg;
        return (
          <g key={i}>
            <path d={`M ${x - 6} ${y} L ${x + 6} ${y + seg}`} />
            <path d={`M ${x + 6} ${y} L ${x - 6} ${y + seg}`} />
          </g>
        );
      })}
    </g>
  );
}

/** Défrisé / lisse : droit avec une légère ondulation en pointe */
function StraightStrand({ x, y0 = 8, height = 64 }: { x: number; y0?: number; height?: number }) {
  return <path d={`M ${x} ${y0} L ${x - 1} ${y0 + height - 14} Q ${x + 6} ${y0 + height - 2} ${x + 2} ${y0 + height}`}
    stroke={STROKE} strokeWidth={2.4} fill="none" strokeLinecap="round" />;
}

// ── Test du verre d'eau (porosité) ───────────────────────────────────────────

function WaterGlass({ hairPosition }: { hairPosition: 'top' | 'middle' | 'bottom' }) {
  const glassX = 34, glassW = 52, topY = 10, botY = 74;
  const waterY = 26; // niveau d'eau
  const strandY = hairPosition === 'top' ? waterY + 6 : hairPosition === 'middle' ? 46 : botY - 8;
  return (
    <g>
      {/* eau */}
      <path d={`M ${glassX + 3} ${waterY} H ${glassX + glassW - 3} V ${botY - 4} Q ${glassX + glassW / 2} ${botY + 2} ${glassX + 3} ${botY - 4} Z`}
        fill={STROKE_SOFT} opacity={0.22} />
      {/* verre */}
      <path d={`M ${glassX} ${topY} L ${glassX + 3} ${botY - 4} Q ${glassX + glassW / 2} ${botY + 4} ${glassX + glassW - 3} ${botY - 4} L ${glassX + glassW} ${topY}`}
        stroke={STROKE} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <line x1={glassX - 3} y1={topY} x2={glassX + glassW + 3} y2={topY} stroke={STROKE} strokeWidth={2.2} strokeLinecap="round" />
      {/* cheveu dans le verre */}
      <path d={`M ${glassX + glassW / 2 - 7} ${strandY} q 7 -4 14 0 q -7 6 -14 0`} stroke="#FFF7EF" strokeWidth={2} fill="none" strokeLinecap="round" />
    </g>
  );
}

/** Écailles de la cuticule : ouvertes / fermées */
function Cuticle({ state }: { state: 'open' | 'closed' | 'medium' }) {
  const lift = state === 'open' ? 6 : state === 'medium' ? 3 : 0.5;
  return (
    <g stroke={STROKE} strokeWidth={1.8} fill="none" strokeLinecap="round">
      <line x1={14} y1={20} x2={14} y2={66} strokeWidth={3} opacity={0.6} />
      {[24, 32, 40, 48, 56, 64].map((y, i) => (
        <path key={i} d={`M 14 ${y} q ${lift} 2 ${lift} 6`} />
      ))}
    </g>
  );
}

function HelpIcon() {
  return (
    <g>
      <circle cx={60} cy={40} r={26} stroke={STROKE} strokeWidth={2.2} fill="none" />
      <path d="M 52 32 q 0 -8 8 -8 q 8 0 8 7 q 0 6 -8 8 v 4" stroke="#FFF7EF" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <circle cx={60} cy={50} r={1.8} fill="#FFF7EF" />
    </g>
  );
}

// ── Composant principal ──────────────────────────────────────────────────────

export const DiagnosticVisual: React.FC<{ step: number; optionId: string }> = ({ step, optionId }) => {
  let art: React.ReactNode = null;

  if (step === 1) {
    // TEXTURE
    switch (optionId) {
      case 'crepue': // 4A-4C zigzag serré
        art = (<g><ZigzagStrand x={34} amp={5} /><ZigzagStrand x={60} amp={6} /><ZigzagStrand x={86} amp={4.5} /></g>);
        break;
      case 'frisee': // 3B-3C boucles S
        art = (<g><SpiralStrand x={34} amp={7} waves={3} /><SpiralStrand x={60} amp={8} waves={4} /><SpiralStrand x={86} amp={7} waves={3} /></g>);
        break;
      case 'locksee':
        art = (<g><LocStrand x={36} /><LocStrand x={60} /><LocStrand x={84} /></g>);
        break;
      case 'protective':
        art = (<g><BraidStrand x={36} /><BraidStrand x={60} /><BraidStrand x={84} /></g>);
        break;
      case 'defrisee':
        art = (<g><StraightStrand x={38} /><StraightStrand x={60} /><StraightStrand x={82} /></g>);
        break;
      default: // inconnue
        art = <HelpIcon />;
    }
  } else if (step === 4) {
    // POROSITÉ — verre d'eau + écailles
    switch (optionId) {
      case 'forte':
        art = (<g><WaterGlass hairPosition="bottom" /><g transform="translate(78,0)"><Cuticle state="open" /></g></g>);
        break;
      case 'faible':
        art = (<g><WaterGlass hairPosition="top" /><g transform="translate(78,0)"><Cuticle state="closed" /></g></g>);
        break;
      case 'moyenne':
        art = (<g><WaterGlass hairPosition="middle" /><g transform="translate(78,0)"><Cuticle state="medium" /></g></g>);
        break;
      default:
        art = <HelpIcon />;
    }
  }

  if (!art) return null;

  return (
    <div className="rounded-xl bg-[#050403] border border-[#FFF7EF]/10 overflow-hidden shrink-0">
      <svg viewBox="0 0 120 80" className="w-full h-20" role="img" aria-hidden="true">
        {art}
      </svg>
    </div>
  );
};

export default DiagnosticVisual;
