import type { HairDerivation } from './diagnosticDerivations';
import type { HairSegmentId } from '../diagnosticSegments';

/**
 * D3 — LE GARDE-FOU IA du diagnostic cheveux (programme « solidification du
 * diagnostic », docs/CHANTIERS_DIAGNOSTIC_SOLIDIFICATION.md).
 *
 * Constat : la sortie de Gemini était servie après validation des SEULS
 * types (safeResult) — une réponse hors-sujet, générique ou médicalement
 * mal placée passait. D1 a ajouté des dérivations que l'IA est priée de
 * reprendre : sans porte, cette consigne était un vœu.
 *
 * Principe : la sortie IA est validée par les MÊMES invariants que le
 * fallback déterministe (mot-clé du segment, préoccupation reprise,
 * dérivations D1 non contredites, actions de la routine moteur présentes,
 * zéro vocabulaire banni, longueurs minimales). Si la sortie échoue,
 * l'appelant bascule AUTOMATIQUEMENT sur le déterministe — jamais un
 * générique n'est servi au client.
 *
 * Les listes de vocabulaire interdite vivent ICI (source unique) : les bancs
 * kurla_hair_advisory et kurla_diagnostic_quality les importent, pour que la
 * porte et les tests ne puissent pas diverger.
 */

// ————————————————————— vocabulaire interdit (source unique) —————————————————————

/** Vocabulaire médical — hors périmètre d'un conseil cosmétique. */
export const BANNED_MEDICAL_VOCAB: readonly string[] = [
  'traitement', 'guérir', 'guérison', 'prescription', 'ordonnance',
  'maladie', 'thérapie', 'pathologie', 'diagnostic médical',
];

/** Formules appartenant à d'autres modules (jamais recyclées ici). */
export const BANNED_RESERVED_EXPRESSIONS: readonly string[] = [
  'texture fluide', 'seule zone réellement accessible', 'occlusif de la formule',
  'retirez la perruque la nuit', 'lavage clarifiant régulier', 'consultez un dermatologue',
  'avis dermatologique', 'doivent être montrés à un dermatologue',
  'Rétinol + AHA', 'Rétinol + BHA', 'Rétinol + vitamine C', 'AHA + BHA',
];

/** Le générique que KURLA refuse de servir (listes de repli bannies). */
export const BANNED_GENERIC_PHRASES: readonly string[] = [
  'routine capillaire structurée à ajuster progressivement',
  'commencer doucement et introduire un changement à la fois',
  'observer la tolérance et ajuster la fréquence',
  'routine de soin de la peau structurée à ajuster progressivement',
  'demander un avis professionnel en cas de symptôme persistant',
];

/**
 * Le disclaimer « pas un avis médical / sans diagnostic médical » est la
 * phrase de conformité que KURLA exige partout : pour le vocabulaire
 * médical, seule une AFFIRMATION (proposer un acte médical) est bannie,
 * une NÉGATION est requise. On neutralise donc les négations avant scan.
 */
function stripMedicalDisclaimers(low: string): string {
  return low.replace(
    /(?:sans|ni|jamais|pas\s+(?:de|un|le)|ne\s+remplace\s+pas\s+(?:un|de|le|la)|ne\s+constitue\s+pas\s+(?:un|de|le|la)|ne\s+remplace\s+(?:en\s+aucun\s+cas)\s+(?:un|de|le|la))\s+(?:un\s+|de\s+|le\s+|la\s+)?(?:diagnostic|avis|conseil)\s+m[ée]dical(?:e)?/g,
    ' ');
}

/** Trouve toute occurrence bannie dans un texte (minuscules, sans accents des tirets). */
export function findBannedIn(text: string): string[] {
  const low = text.toLowerCase();
  const hits: string[] = [];
  const medicalLow = stripMedicalDisclaimers(low);
  for (const term of BANNED_MEDICAL_VOCAB) if (medicalLow.includes(term.toLowerCase())) hits.push(term);
  for (const term of BANNED_RESERVED_EXPRESSIONS) if (low.includes(term.toLowerCase())) hits.push(term);
  for (const term of BANNED_GENERIC_PHRASES) if (low.includes(term.toLowerCase())) hits.push(term);
  return hits;
}

// ————————————————————— mots de contenu (couverture lexicale) —————————————————————

const STOPWORDS = new Set([
  'avec', 'sans', 'dans', 'sur', 'pour', 'parce', 'quand', 'comme', 'entre', 'chaque',
  'toute', 'toutes', 'tous', 'tout', 'votre', 'vos', 'elle', 'elles', 'ainsi', 'donc',
  'seule', 'seules', 'lorsque', 'puisque', 'nos', 'notre', 'cette', 'celle', 'celui',
  'peut', 'peuvent', 'faire', 'fait', 'etre', 'sont', 'avait', 'avons', 'allez', 'plus',
  'tres', 'chez', 'vers', 'soit', 'deux', 'trois', 'quatre', 'avant', 'apres', 'encore',
  'plutot', 'seulement', 'également', 'egalement', 'selon', 'grace', 'contre', 'entre ',
]);

/** Mots significatifs (≥5 lettres, hors stopwords), normalisés pour le croisement. */
export function contentWords(text: string): Set<string> {
  const clean = text
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^0-9a-z]+/g, ' ');
  return new Set(clean.split(/\s+/).filter(w => w.length >= 5 && !STOPWORDS.has(w)));
}

/** Fraction des mots de `need` présents dans `hay`. */
function coverage(hay: Set<string>, need: Set<string>): number {
  if (need.size === 0) return 1;
  let found = 0;
  for (const word of need) if (hay.has(word)) found += 1;
  return found / need.size;
}

// ————————————————————— la porte —————————————————————

export interface HairAiGuardrailInput {
  summary?: unknown;
  recommendedRoutine?: unknown;
  reason?: unknown;
  steps?: unknown;
  /** Les avertissements générés sont scannés aussi : la porte vaut sur TOUT le texte servi. */
  warnings?: unknown;
}

export interface HairAiGuardrailGate {
  segmentId: HairSegmentId | null;
  focusLabel: string | null;
  /** Les dérivations D1 du profil (grille de lecture que l'IA ne doit ni contredire ni oublier). */
  derived: readonly HairDerivation[];
  /** Actions de la routine moteur (l'IA reformule, n'invente pas). */
  engineActions: readonly string[];
}

/** Mot-clés acceptés par segment : un seul suffit (le résumé IA est une reformulation). */
const SEGMENT_TOKENS: Record<HairSegmentId, readonly string[]> = {
  locks: ['lock'],
  protective: ['protectrice', 'tresse', 'twist', 'coiffure'],
  wig: ['perruque', 'tissage', 'dessous', 'pose'],
  enfant: ['enfant'],
  transition: ['transition', 'défrisé', 'repousse', 'démarcation'],
  naturel_cresp: ['naturel', 'crépu', 'hydrat', 'lavag'],
  naturel_boucle: ['naturel', 'boucl', 'frisé', 'définition', 'hydrat'],
};

export interface GuardrailVerdict {
  ok: boolean;
  reasons: string[];
}

/**
 * Valide la sortie IA d'un diagnostic CHEVEUX contre les invariants du
 * fallback. Renvoie le verdict + les raisons (journalisées côté serveur,
 * jamais affichées au client).
 */
export function validateHairAiOutput(out: HairAiGuardrailInput, gate: HairAiGuardrailGate): GuardrailVerdict {
  const reasons: string[] = [];
  const summary = typeof out.summary === 'string' ? out.summary.trim() : '';
  const routine = typeof out.recommendedRoutine === 'string' ? out.recommendedRoutine.trim() : '';
  const reason = typeof out.reason === 'string' ? out.reason.trim() : '';
  const steps = Array.isArray(out.steps) ? out.steps.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length >= 8) : [];

  // 1. Structure minimale.
  if (summary.length < 120) reasons.push('résumé trop court pour être une lecture du profil');
  if (reason.length < 40) reasons.push('raison trop courte pour être une explication');
  if (steps.length < 5) reasons.push(`moins de 5 étapes exploitables (${steps.length})`);

  // 2. Zéro vocabulaire banni (médical, réservé, générique) sur tout le texte servi.
  const warningsArr = Array.isArray(out.warnings) ? out.warnings.filter((w: unknown): w is string => typeof w === 'string') : [];
  const banned = findBannedIn([summary, routine, reason, ...steps, ...warningsArr].join('\n'));
  if (banned.length) reasons.push(`vocabulaire banni : ${banned.join(', ')}`);

  // 3. Le segment est reconnu dans le résumé (jamais une réponse « flottante »).
  if (gate.segmentId) {
    const tokens = SEGMENT_TOKENS[gate.segmentId];
    const low = summary.toLowerCase();
    if (!tokens.some(token => low.includes(token))) reasons.push(`aucun mot-clé du segment (${tokens.join('/')}) dans le résumé`);
  }

  // 4. La préoccupation déclarée est reprise (au moins un mot de contenu du libellé).
  if (gate.focusLabel) {
    const focusWords = contentWords(gate.focusLabel);
    const summaryWords = contentWords(summary);
    const hit = [...focusWords].some(word => summaryWords.has(word));
    if (!hit) reasons.push('la préoccupation déclarée n’est pas reprise');
  }

  // 5. Les dérivations D1 sont reprises (couverture lexicale), pas contredites.
  if (gate.derived.length) {
    const summaryWords = contentWords(summary);
    const picked = gate.derived.filter(d => coverage(summaryWords, contentWords(d.text)) >= 0.35).length;
    const needed = Math.min(2, gate.derived.length);
    if (picked < needed) reasons.push(`${picked} dérivation(s) D1 reprise(s) sur ${needed} attendues`);
  }

  // 6. Les étapes reformulent la routine moteur — l'IA n'invente pas un autre programme.
  if (gate.engineActions.length && steps.length) {
    const engineWordSets = gate.engineActions.map(action => contentWords(action));
    const anchored = steps.filter(step => {
      const words = contentWords(step);
      return engineWordSets.some(set => coverage(set, words) >= 0.3);
    }).length;
    if (anchored < Math.ceil(steps.length * 0.6)) reasons.push('les étapes ne suivent pas la routine moteur (reformulation hors-programme)');
    const stepsUnion = new Set<string>();
    for (const step of steps) for (const word of contentWords(step)) stepsUnion.add(word);
    const represented = engineWordSets.filter(set => coverage(stepsUnion, set) >= 0.4).length;
    if (represented < Math.ceil(gate.engineActions.length * 0.5)) reasons.push('des actions moteur majeures ont disparu de la réponse');
  }

  return { ok: reasons.length === 0, reasons };
}
