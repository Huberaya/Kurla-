/**
 * Attribution d'acquisition (UTM + canal) — capture à la première visite et
 * réutilisée au moment du checkout pour savoir PAR QUEL CANAL un client arrive.
 *
 * Stratégie « first-touch » (origine de la découverte, conservée 90 jours) tout
 * en enregistrant aussi le « last-touch » (dernier point de contact avant achat).
 * Aucune donnée personnelle : uniquement des paramètres marketing et le référent.
 */

const FIRST_KEY = 'kurla_attribution_first';
const LAST_KEY = 'kurla_attribution_last';
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours

export type Attribution = {
  source?: string | null;      // utm_source
  medium?: string | null;      // utm_medium
  campaign?: string | null;    // utm_campaign
  term?: string | null;        // utm_term
  content?: string | null;     // utm_content
  referrer?: string | null;    // hostname du référent
  channel?: string | null;     // canal normalisé (voir normalizeChannel)
  landingPath?: string | null; // 1re page vue
  capturedAt?: string | null;  // ISO
};

const UTM_KEYS: Array<{ param: string; field: keyof Attribution }> = [
  { param: 'utm_source', field: 'source' },
  { param: 'utm_medium', field: 'medium' },
  { param: 'utm_campaign', field: 'campaign' },
  { param: 'utm_term', field: 'term' },
  { param: 'utm_content', field: 'content' },
];

const clamp = (v: string | null, n = 80): string | null => {
  const s = (v || '').trim().slice(0, n);
  return s || null;
};

/**
 * Déduit un canal lisible à partir des UTM / du référent.
 * Ordre : paramètres explicites > référent connu > direct.
 */
function normalizeChannel(utm: Record<string, string | null>, referrer: string | null): string {
  const source = (utm.source || '').toLowerCase();
  const medium = (utm.medium || '').toLowerCase();
  const ref = (referrer || '').toLowerCase();

  if (medium.includes('cpc') || medium.includes('paid') || source.includes('google-ads') || source.includes('tiktok-ads') || source.includes('fbads')) return 'Paid';
  if (source.includes('tiktok')) return 'TikTok';
  if (source.includes('instagram') || source.includes('ig')) return 'Instagram';
  if (source.includes('youtube') || source.includes('yt')) return 'YouTube';
  if (source.includes('pinterest')) return 'Pinterest';
  if (source.includes('newsletter') || source.includes('email') || medium.includes('email')) return 'Email';
  if (source.includes('referral') || medium.includes('referral') || source.includes('parrainage') || source.includes('ambassad')) return 'Parrainage';
  if (source.includes('creator') || source.includes('influence') || medium.includes('affiliate') || medium.includes('affilie')) return 'Créateurs';
  if (source.includes('google') || medium.includes('organic')) return 'Recherche (SEO)';

  if (ref) {
    if (ref.includes('tiktok.com')) return 'TikTok';
    if (ref.includes('instagram.com')) return 'Instagram';
    if (ref.includes('youtube.com')) return 'YouTube';
    if (ref.includes('pinterest.')) return 'Pinterest';
    if (ref.includes('google.')) return 'Recherche (SEO)';
    if (ref.includes('facebook.com')) return 'Facebook';
    return 'Référent (autre site)';
  }
  return 'Direct';
}

function readCurrentAttribution(): Attribution | null {
  if (typeof window === 'undefined' || typeof URLSearchParams === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string | null> = {};
  let hasUtm = false;
  const data: Attribution = {};
  for (const { param, field } of UTM_KEYS) {
    const val = clamp(params.get(param));
    if (val) hasUtm = true;
    (data as Record<string, unknown>)[field] = val;
    utm[field] = val;
  }

  let referrer: string | null = null;
  try {
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (host && host !== window.location.hostname) referrer = host;
    }
  } catch { /* referrer invalide */ }

  // On n'enregistre un « point de contact » que s'il y a un signal (UTM ou référent externe).
  if (!hasUtm && !referrer) return null;

  data.referrer = referrer;
  data.channel = normalizeChannel(utm, referrer);
  data.landingPath = clamp(window.location.pathname, 120);
  data.capturedAt = new Date().toISOString();
  return data;
}

function load(key: string): (Attribution & { ts?: number }) | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Attribution & { ts?: number };
  } catch {
    return null;
  }
}

function save(key: string, data: Attribution): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, ts: Date.now() }));
  } catch { /* stockage indisponible (mode privé) */ }
}

/**
 * À appeler au démarrage de l'app. Enregistre la 1re origine (first-touch) et
 * met à jour le dernier point de contact (last-touch) à chaque visite signalée.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  const current = readCurrentAttribution();

  // First-touch : on conserve la toute première origine pendant 90 j.
  const first = load(FIRST_KEY);
  const expired = first?.ts && Date.now() - first.ts > TTL_MS;
  if ((!first || expired) && current) {
    save(FIRST_KEY, current);
  }

  // Last-touch : rafraîchi à chaque visite avec un signal d'acquisition.
  if (current) save(LAST_KEY, current);
}

/**
 * Attributtion à joindre à une commande. Priorité au dernier point de contact
 * (last-click) pour le pilotage canal, avec l'origine first-touch en miroir.
 */
export function getOrderAttribution(): { last: Attribution | null; first: Attribution | null } {
  const last = load(LAST_KEY);
  const first = load(FIRST_KEY);
  const strip = (a: (Attribution & { ts?: number }) | null): Attribution | null => {
    if (!a) return null;
    const { ts: _ts, ...rest } = a;
    return rest;
  };
  return { last: strip(last), first: strip(first) };
}
