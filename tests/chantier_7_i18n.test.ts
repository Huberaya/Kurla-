/**
 * CHANTIER 7 — sous-chantier 7.5 : i18n et hreflang.
 *
 * Ce banc appelle les fonctions livrées (`splitLocale`, `localizedPath`,
 * `translate`, `matchRouteMeta`, `localizeRouteMeta`, `buildRouteHtml`) : pas de
 * copie de logique. Les défauts couverts sont ceux qui feraient perdre du trafic
 * ou publieraient une déclaration fausse :
 *
 * 1. Une URL historique perd son préfixe ou gagne un préfixe parasite
 *    (`/england` pris pour de l'anglais) → 404 ou contenu mal servi.
 * 2. Une clé manque dans une langue → le libellé anglais retombe sur la clé ou
 *    sur le français, silencieusement.
 * 3. Un `hreflang` déclare une version anglaise dont le corps est français →
 *    signal faux envoyé au moteur, exactement ce que la règle de publication
 *    de `routeTranslations.ts` interdit.
 * 4. La langue du document (`<html lang>`, `og:locale`, `inLanguage`) reste
 *    française sur une page anglaise → mauvaise langue détectée, mauvais
 *    résultats de recherche.
 * 5. Le canonique d'une page anglaise non traduite pointe vers elle-même →
 *    doublon indexé.
 */
import { strict as assert } from 'node:assert';

import {
  DEFAULT_LOCALE,
  LOCALES,
  hreflangAlternates,
  isLocale,
  localizedPath,
  splitLocale,
} from '../src/lib/i18n';
import { translations, translate } from '../src/lib/translations';
import { indexableRoutes, matchRouteMeta } from '../src/lib/routeMeta';
import {
  EN_ROUTE_CONTENT,
  englishBasePaths,
  hasEnglishVersion,
  localizeRouteMeta,
} from '../src/lib/routeTranslations';
import { buildRouteHtml } from '../scripts/prerender';
import { navigate } from '../src/lib/router';

const SITE = 'https://kurlabeauty.vercel.app';

const TEMPLATE = `<!doctype html>
<html lang="fr" class="dark">
  <head>
    <meta charset="UTF-8" />
    <title>Titre par défaut</title>
    <meta name="description" content="Description par défaut." />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

type Leaf = [string, string];

function leaves(value: unknown, prefix = ''): Leaf[] {
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    typeof child === 'string' ? [[`${prefix}${key}`, child] as Leaf] : leaves(child, `${prefix}${key}.`)
  );
}

function runI18nTests(): void {
  // -------------------------------------------------------------------
  // 1. Découpage locale / chemin : les URLs historiques ne doivent pas bouger.
  // -------------------------------------------------------------------
  assert.deepEqual(splitLocale('/en/manifeste'), { locale: 'en', rest: '/manifeste' });
  assert.deepEqual(splitLocale('/manifeste'), { locale: 'fr', rest: '/manifeste' });
  assert.deepEqual(splitLocale('/en'), { locale: 'en', rest: '/' });
  assert.deepEqual(splitLocale('/'), { locale: 'fr', rest: '/' });
  assert.deepEqual(splitLocale(''), { locale: 'fr', rest: '/' });
  // Un segment qui commence par « en » n'est pas une locale : sans cette
  // distinction, `/england` deviendrait la page d'accueil anglaise.
  assert.deepEqual(splitLocale('/england'), { locale: 'fr', rest: '/england' });
  assert.ok(!isLocale('england'), '« england » ne doit pas être reconnu comme locale.');

  assert.equal(localizedPath('/boutique', 'fr'), '/boutique', 'Le français reste non préfixé.');
  assert.equal(localizedPath('/boutique', 'en'), '/en/boutique');
  assert.equal(localizedPath('/', 'en'), '/en', 'La racine anglaise est /en, pas /en/.');
  assert.equal(localizedPath('/', 'fr'), '/');
  assert.equal(
    localizedPath('/boutique?category=skincare', 'en'),
    '/en/boutique?category=skincare',
    'La query string doit survivre à la localisation.'
  );

  // Aller-retour : localiser puis re-découper redonne le chemin d'origine.
  for (const path of ['/', '/boutique', '/manifeste', '/ingredient/glycerin']) {
    for (const locale of LOCALES) {
      const { locale: back, rest } = splitLocale(localizedPath(path, locale));
      assert.equal(back, locale, `Aller-retour de locale échoué pour ${path}.`);
      assert.equal(rest, path, `Aller-retour de chemin échoué pour ${path}.`);
    }
  }

  // -------------------------------------------------------------------
  // 2. hreflang : paire complète + x-default, jamais partielle.
  // -------------------------------------------------------------------
  const alternates = hreflangAlternates('/manifeste', SITE);
  assert.equal(alternates.length, LOCALES.length + 1, 'Il faut une entrée par langue plus x-default.');
  assert.deepEqual(alternates.map(a => a.hreflang), ['fr', 'en', 'x-default']);
  assert.equal(alternates[0].href, `${SITE}/manifeste`);
  assert.equal(alternates[1].href, `${SITE}/en/manifeste`);
  assert.equal(alternates[2].href, `${SITE}/manifeste`, 'x-default doit pointer la locale par défaut.');
  assert.equal(DEFAULT_LOCALE, 'fr');

  // -------------------------------------------------------------------
  // 3. Dictionnaire : parité des clés, aucune valeur vide, aucune copie paresseuse.
  // -------------------------------------------------------------------
  const frLeaves = leaves(translations.fr);
  const enLeaves = leaves(translations.en);
  assert.equal(frLeaves.length, enLeaves.length, 'Les deux langues doivent avoir le même nombre de clés.');

  const enMap = new Map(enLeaves);
  for (const [key, value] of frLeaves) {
    assert.ok(enMap.has(key), `Clé manquante en anglais : ${key}`);
    assert.ok(value.trim().length > 0, `Valeur française vide : ${key}`);
    assert.ok((enMap.get(key) || '').trim().length > 0, `Valeur anglaise vide : ${key}`);
  }

  // Termes volontairement identiques : noms propres et mots partagés.
  const SHARED_TERMS = new Set([
    'nav.diagnostic', 'nav.pro', 'nav.kids', 'nav.protectiveStyles', 'nav.diagnosticCta',
    'footer.marketplace', 'footer.journal',
    'pages.protectiveStyles.eyebrow', 'pages.protectiveStyles.phase',
  ]);
  const identical = frLeaves.filter(([key, value]) => enMap.get(key) === value).map(([key]) => key);
  const unexpected = identical.filter(key => !SHARED_TERMS.has(key));
  assert.deepEqual(unexpected, [],
    `Clés anglaises identiques au français (traduction manquante ?) : ${unexpected.join(', ')}`);

  assert.equal(translate('en', 'nav.login'), 'Sign in');
  assert.equal(translate('fr', 'nav.login'), 'Connexion');
  assert.equal(translate('en', 'footer.privacy'), 'Privacy');
  // Une clé inconnue doit rester lisible, jamais faire tomber le rendu.
  assert.equal(translate('en', 'nav.inexistant'), 'nav.inexistant');
  assert.equal(translate('en', 'pages.manifesto.title'), 'Textured beauty, finally understood.');

  // -------------------------------------------------------------------
  // 4. Cohérence de la table des versions anglaises.
  // -------------------------------------------------------------------
  const knownPaths = new Set(indexableRoutes().map(route => route.path));
  for (const basePath of englishBasePaths()) {
    assert.ok(knownPaths.has(basePath),
      `${basePath} est déclarée traduite mais n'est pas une route publiable existante.`);
    const copy = EN_ROUTE_CONTENT[basePath];
    assert.ok(copy.title.trim().length > 0, `${basePath} : titre anglais vide.`);
    assert.ok(copy.description.trim().length > 0, `${basePath} : description anglaise vide.`);
  }
  assert.ok(englishBasePaths().length >= 3,
    'Au moins trois routes doivent avoir une version anglaise publiée.');
  assert.ok(hasEnglishVersion('/manifeste') && !hasEnglishVersion('/boutique'),
    'Seules les routes réellement traduites doivent annoncer une version anglaise.');

  // -------------------------------------------------------------------
  // 5. Résolution des routes : locale, canonique et alternates.
  // -------------------------------------------------------------------
  const frManifesto = matchRouteMeta('/manifeste');
  assert.ok(frManifesto, '/manifeste doit se résoudre.');
  assert.equal(frManifesto!.locale, 'fr');
  assert.equal(frManifesto!.basePath, '/manifeste');
  assert.equal(frManifesto!.canonicalPath, '/manifeste');

  const enManifesto = matchRouteMeta('/en/manifeste');
  assert.ok(enManifesto, '/en/manifeste doit se résoudre sur la même route.');
  assert.equal(enManifesto!.locale, 'en');
  assert.equal(enManifesto!.basePath, '/manifeste', 'La table de routes se consulte par chemin non localisé.');
  assert.equal(enManifesto!.canonicalPath, '/en/manifeste');

  const enShop = matchRouteMeta('/en/boutique');
  assert.ok(enShop, '/en/boutique doit se résoudre.');
  assert.equal(enShop!.locale, 'en');
  assert.equal(enShop!.canonicalPath, '/boutique',
    'Sans version anglaise traduite, le canonique reste français : pas de doublon indexé.');

  const localizedTranslated = localizeRouteMeta(enManifesto!.meta, 'en', '/manifeste', SITE);
  assert.equal(localizedTranslated.meta.title, EN_ROUTE_CONTENT['/manifeste'].title);
  assert.equal(localizedTranslated.canonicalPath, '/en/manifeste');
  assert.equal(localizedTranslated.alternates.length, 3);

  const localizedUntranslated = localizeRouteMeta(enShop!.meta, 'en', '/boutique', SITE);
  assert.equal(localizedUntranslated.meta.title, enShop!.meta.title,
    'Une route non traduite garde son titre français : c’est le contenu réellement servi.');
  assert.equal(localizedUntranslated.canonicalPath, '/boutique');
  assert.deepEqual(localizedUntranslated.alternates, [],
    'Pas d’alternate hreflang vers une page qui n’existe pas en anglais.');

  // La page française d'une route traduite annonce sa version anglaise.
  const frLocalized = localizeRouteMeta(frManifesto!.meta, 'fr', '/manifeste', SITE);
  assert.equal(frLocalized.alternates.length, 3, 'Le français doit aussi déclarer la paire.');

  // -------------------------------------------------------------------
  // 6. Prérendu : la langue du document suit le contenu servi.
  // -------------------------------------------------------------------
  const enMeta = {
    path: '/en/manifeste',
    title: EN_ROUTE_CONTENT['/manifeste'].title,
    description: EN_ROUTE_CONTENT['/manifeste'].description,
    indexable: true,
  };
  const enHtml = buildRouteHtml(TEMPLATE, enMeta, SITE, 'en');
  assert.ok(enHtml.includes('<html lang="en"'), 'La page anglaise doit déclarer lang="en".');
  assert.ok(!enHtml.includes('<html lang="fr"'), 'Le lang="fr" du gabarit doit avoir disparu.');
  assert.ok(enHtml.includes('content="en_GB"'), 'og:locale doit être en_GB.');
  assert.ok(enHtml.includes('"inLanguage":"en"'), 'Le JSON-LD doit déclarer inLanguage en.');
  assert.ok(enHtml.includes(`<link rel="canonical" href="${SITE}/en/manifeste"`));
  assert.ok(enHtml.includes(`<title>${EN_ROUTE_CONTENT['/manifeste'].title}</title>`));
  assert.equal((enHtml.match(/rel="alternate" hreflang=/g) || []).length, 3);

  const frHtml = buildRouteHtml(TEMPLATE, frManifesto!.meta, SITE);
  assert.ok(frHtml.includes('<html lang="fr"'), 'La page française reste en français.');
  assert.ok(frHtml.includes('content="fr_FR"'));
  assert.equal((frHtml.match(/rel="alternate" hreflang=/g) || []).length, 3,
    'La page française d’une route traduite doit déclarer ses alternates.');

  const shopHtml = buildRouteHtml(TEMPLATE, enShop!.meta, SITE);
  assert.equal((shopHtml.match(/rel="alternate" hreflang=/g) || []).length, 0,
    'Une route non traduite ne doit émettre aucun alternate.');

  // -------------------------------------------------------------------
  // 7. Navigation : la locale choisie doit survivre aux clics suivants.
  //
  // `navigate` n'utilise que `window.location` et `window.history`, donc un
  // objet minimal suffit à exercer le code livré — sans navigateur.
  // -------------------------------------------------------------------
  const pushed: string[] = [];
  const assigned: string[] = [];
  const fakeWindow = {
    location: {
      origin: SITE,
      pathname: '/en/manifeste',
      search: '',
      hash: '',
      assign: (href: string) => { assigned.push(href); },
    },
    // navigate() remonte en haut de page après chaque changement de route.
    scrollTo: () => {},
    history: {
      state: null,
      pushState: (_state: unknown, _title: string, url: string) => { pushed.push(url); },
      replaceState: (_state: unknown, _title: string, url: string) => { pushed.push(url); },
    },
  };
  (globalThis as { window?: unknown }).window = fakeWindow;

  try {
    // Depuis /en/, un lien interne nu reste en anglais.
    navigate('/boutique');
    assert.deepEqual(pushed.at(-1), '/en/boutique',
      'Depuis /en/, un lien interne doit rester préfixé.');

    // Un lien déjà préfixé n'est pas double-préfixé.
    navigate('/en/melanin-skin');
    assert.deepEqual(pushed.at(-1), '/en/melanin-skin', 'Pas de double préfixe /en/en/.');

    // La bascule de langue force la locale du chemin demandé.
    navigate('/manifeste', { preserveLocale: false });
    assert.deepEqual(pushed.at(-1), '/manifeste',
      'La bascule vers le français doit retirer le préfixe.');

    // En français, aucun préfixe n'est ajouté.
    fakeWindow.location.pathname = '/manifeste';
    navigate('/boutique');
    assert.deepEqual(pushed.at(-1), '/boutique', 'En français, les chemins restent nus.');

    // Une URL externe sort du routeur interne.
    navigate('https://stripe.com/checkout');
    assert.deepEqual(assigned, ['https://stripe.com/checkout'],
      'Une URL hors origine doit passer par un vrai rechargement.');
  } finally {
    delete (globalThis as { window?: unknown }).window;
  }

  console.log(
    `[PASS] Chantier 7.5 : ${frLeaves.length} clés traduites (fr/en), ${LOCALES.length} locales, ` +
    `${englishBasePaths().length} routes publiées en anglais, canonique et hreflang cohérents, ` +
    `lang/og:locale/inLanguage alignés sur le contenu servi.`
  );
}

try {
  runI18nTests();
} catch (error) {
  console.error('[FAIL] Chantier 7.5 — i18n :', error);
  process.exitCode = 1;
}
