/**
 * NAVIGATION PAR SECTIONS (dashboard admin) — contrat de la détection.
 *
 * La barre de saut du dashboard admin est construite automatiquement depuis
 * les h2/h3 du panel actif (`collectSections`). Contrats :
 *   - libellé = le texte du titre (espaces normalisés), tronqué au-delà de 28,
 *   - id stable par libellé (re-scan → même id) et unique par libellé,
 *   - uniquement les titres visibles (offsetParent null = masqué → ignoré),
 *   - h2 et h3 reconnus (niveau conservé), doublons de libellé dédupliqués,
 *   - marge de saut posée sur l'élément (atterrissage sous la barre collante),
 *   - plafonné à 12 sections (mesuré sur « Catalogue produits », l'onglet
 *     le plus long : à 8, ses derniers panneaux étaient hors de la barre).
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { collectSections, type SectionHeadingEl } from '../src/components/AdminSectionNav';

function heading(tag: 'h2' | 'h3', text: string, overrides: Partial<SectionHeadingEl> = {}): SectionHeadingEl {
  return {
    tagName: tag.toUpperCase(),
    textContent: text,
    id: '',
    style: { scrollMarginTop: '' },
    offsetParent: {}, // « visible »
    ...overrides,
  };
}

function rootOf(...heads: SectionHeadingEl[]) {
  return { querySelectorAll: (_sel: string) => heads };
}

/* 1. Cas de base : h2/h3 visibles → liste ordonnée, labels, niveaux. */
{
  const a = heading('h2', 'Pilotage économique');
  const b = heading('h3', 'Marge / LTV / CAC');
  const c = heading('h2', 'Commandes récentes');
  const list = collectSections(rootOf(a, b, c));
  assert.deepEqual(list.map(s => s.label), ['Pilotage économique', 'Marge / LTV / CAC', 'Commandes récentes']);
  assert.deepEqual(list.map(s => s.level), [2, 3, 2]);
  for (const s of list) assert.ok(s.id.startsWith('admin-sec-'), 'id auto posé');
  for (const h of [a, b, c]) assert.equal(h.style.scrollMarginTop, '132px', 'marge de saut posée');
  console.log('✓ détection : h2/h3 ordonnés, niveaux conservés, marge de saut posée');
}

/* 2. Id stables au re-scan ; libellé tronqué > 28 ; espaces normalisés. */
{
  const long = heading('h2', 'Supervision des commandes, expéditions, retours et support');
  const first = collectSections(rootOf(long))[0];
  assert.ok(first.label.endsWith('…'), 'libellé long tronqué avec ellipses');
  assert.ok(first.label.length <= 28, 'troncature bornée à 28 caractères');
  const second = collectSections(rootOf(long))[0];
  assert.equal(first.id, second.id, 're-scan : même libellé → même id (scrollspy stable)');
  const spaced = heading('h2', '  Marge   /   LTV  ');
  const norm = collectSections(rootOf(spaced))[0];
  assert.equal(norm.label, 'Marge / LTV', 'espaces multiples normalisés');
  console.log('✓ ids stables, troncature bornée, espaces normalisés');
}

/* 3. Visibilité + doublons + plafond. */
{
  const hidden = heading('h2', 'Section masquée', { offsetParent: null });
  const dup1 = heading('h2', 'Doublon');
  const dup2 = heading('h3', 'Doublon');
  const list = collectSections(rootOf(hidden, dup1, dup2));
  assert.deepEqual(list.map(s => s.label), ['Doublon'], 'masqué ignoré, doublon dédupliqué (le premier reste)');
  const many = Array.from({ length: 18 }, (_, i) => heading('h2', `Section ${i + 1}`));
  assert.equal(collectSections(rootOf(...many)).length, 12, 'plafonné à 12 sections');
  assert.deepEqual(collectSections(rootOf()).length, 0, 'conteneur vide → liste vide');
  console.log('✓ visibilité, déduplication, plafond 12, conteneur vide');
}

/* 4. Ids distincts pour des libellés distincts. */
{
  const h1 = heading('h2', 'Catalogue produits');
  const h2 = heading('h2', 'Lots & traçabilité');
  const list = collectSections(rootOf(h1, h2));
  assert.notEqual(list[0].id, list[1].id, 'libellés distincts → ids distincts');
  console.log('✓ ids distincts par libellé');
}

/* 5. LISTE DÉROULANTE SUR LA MENTION « Sections » (20/09, rectification de
      l'utilisatrice) : « la liste déroulante doit être SUR la mention
      Sections ». Le libellé est le déclencheur lui-même — plus de <select>
      flottant à côté. Le banc vérifie le contrat données (fullLabel complet)
      et la structure de la liste ancrée sous la mention. */
{
  const long = heading('h2', 'Approvisionnement — 24 besoins couverts par le sourcing');
  const [section] = collectSections(rootOf(long));
  assert.ok(section.label.endsWith('…'), 'le bouton garde son libellé tronqué');
  assert.equal(section.fullLabel, 'Approvisionnement — 24 besoins couverts par le sourcing', 'la liste déroulante doit servir le libellé COMPLET');

  const short = heading('h3', 'Produit par produit');
  const [s2] = collectSections(rootOf(short));
  assert.equal(s2.fullLabel, s2.label, 'libellé court : complet = tronqué');

  const source = readFileSync(new URL('../src/components/AdminSectionNav.tsx', import.meta.url), 'utf8');
  assert.ok(!source.includes('<select'), 'un <select> séparé subsiste — la liste doit être sur la mention « Sections », pas à côté.');
  assert.ok(/aria-haspopup="true"[\s\S]{0,600}?List className[\s\S]{0,40}Sections/.test(source), 'la mention « Sections » doit être le déclencheur du déroulant.');
  assert.ok(source.includes('aria-expanded={open}'), 'le déclencheur doit exposer son état ouvert/fermé.');
  assert.ok(/absolute left-0 top-full/.test(source), 'la liste doit s\'ouvrir sous la mention, pas ailleurs.');
  assert.ok(source.includes('role="listbox"') && source.includes('role="option"'), 'liste accessible : listbox + options.');
  assert.ok(source.includes('aria-selected={active}'), 'la section visible doit être marquée dans la liste (synchronisation scrollspy).');
  assert.ok(/onClick=\{\(\) => \{ jump\(section\.id\); setOpen\(false\); \}\}/.test(source), 'choisir une section y fait défiler la page et referme la liste.');
  assert.ok(/e\.key === 'Escape'/.test(source), 'Échap doit refermer la liste.');
  assert.ok(source.includes('menuRef.current.contains(e.target as Node)') || source.includes('!menuRef.current.contains'), 'un clic dehors doit refermer la liste.');
  assert.ok(source.includes('setOpen(false); }, [pageKey]') || /setOpen\(false\);\s*\}, \[pageKey\]/.test(source), 'changer d\'onglet referme la liste.');
  console.log('✓ liste déroulante SUR la mention « Sections » : déclencheur, libellés complets, surlignage, fermeture (clic/Échap/onglet)');
}

console.log('\n5 blocs de contrôles navigation par sections validés — détection, stabilité, visibilité, bornes, déroulant sur la mention.');
