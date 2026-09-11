#!/usr/bin/env node
/**
 * KURLA — détection du code mort (analyse du graphe d'imports).
 *
 * Un fichier est « mort » s'aucun fichier du dépôt (src, server.ts, scripts,
 * tests, index.html) ne l'importe — directement ou indirectement — depuis un
 * point d'entrée. La transitivité est résolue par point fixe : un module importé
 * par un module vivant est vivant.
 *
 * Usage : node scripts/findDeadCode.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exts = ['.ts', '.tsx', '.js', '.jsx'];

function walk(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'Unselected files'].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walk(p));
    else if (exts.includes(path.extname(p))) out.push(p);
  }
  return out;
}

const sourceFiles = walk(path.join(root, 'src')).concat([path.join(root, 'server.ts')]);
const scriptFiles = walk(path.join(root, 'scripts')).concat(walk(path.join(root, 'tests')));
const indexHtml = path.join(root, 'index.html');

const importRe = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;

function targetsOf(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const out = [];
  let m;
  while ((m = importRe.exec(txt))) {
    out.push(m[1]);
  }
  return out;
}

function resolveSpecifier(spec, fromFile) {
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null;
  const cleaned = spec.startsWith('@/') ? spec.slice(2) : spec;
  const base = path.resolve(path.dirname(fromFile), cleaned);
  for (const e of exts) if (fs.existsSync(base + e)) return base + e;
  for (const e of exts) {
    const idx = path.join(base, 'index' + e);
    if (fs.existsSync(idx)) return idx;
  }
  if (spec.endsWith('.css') || spec.endsWith('.webmanifest') || spec.endsWith('.json')) {
    const p = base;
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Point d'entrée frontal : index.html → /src/main.tsx ; serveur : server.ts.
const roots = new Set([
  path.join(root, 'src/main.tsx'),
  path.join(root, 'server.ts'),
]);

// Arêtes : fichier → fichiers qu'il importe (locaux).
const edges = new Map();
const allLocal = new Set();
for (const f of [...sourceFiles, ...scriptFiles]) {
  const abs = path.resolve(f);
  allLocal.add(abs);
  const targets = targetsOf(abs)
    .map(t => resolveSpecifier(t, abs))
    .filter(Boolean);
  edges.set(abs, targets.map(t => path.resolve(t)));
}
if (fs.existsSync(indexHtml)) {
  const targets = targetsOf(indexHtml)
    .map(t => resolveSpecifier(t, indexHtml))
    .filter(Boolean);
  edges.set(indexHtml, targets.map(t => path.resolve(t)));
  for (const t of targets) allLocal.add(path.resolve(t));
}

// Point fixe : vivants = tout ce qui est atteignable depuis les racines.
const alive = new Set();
const queue = [...roots].filter(r => allLocal.has(r));
while (queue.length) {
  const cur = queue.pop();
  if (alive.has(cur)) continue;
  alive.add(cur);
  for (const next of edges.get(cur) || []) {
    if (allLocal.has(next) && !alive.has(next)) queue.push(next);
  }
}

// Les fichiers de scripts/ et tests/ ne sont pas des cibles de mort : ce sont
// des points d'entrée secondaires. On ne les compte pas, mais ils gardent vivants
// les modules qu'ils importent.
for (const f of scriptFiles) {
  const abs = path.resolve(f);
  const stack = [abs];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of edges.get(cur) || []) {
      if (allLocal.has(next) && !alive.has(next) && !seen.has(next)) stack.push(next);
    }
  }
  for (const s of seen) if (allLocal.has(s)) alive.add(s);
}

const dead = sourceFiles
  .map(f => path.resolve(f))
  .filter(f => !alive.has(f))
  .sort();

console.log(`Modules analysés : ${allLocal.size}`);
console.log(`Modules vivants  : ${alive.size}`);
console.log(`MORTS (aucun import depuis les entrées src/main.tsx, server.ts, scripts/, tests/) : ${dead.length}`);
for (const d of dead) console.log('  ', path.relative(root, d));
