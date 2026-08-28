import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * CHANTIER 8.1 — surface source du backend.
 *
 * Le backend n'est plus un seul fichier : `server.ts` monte des modules de
 * routes (`src/server/routes/*`) et délègue sa plomberie (`src/server/http.ts`,
 * `auth.ts`, `ai/*`, `payments/*`, `compliance.ts`). Les bancs qui vérifiaient
 * « le serveur expose X » en lisant `server.ts` cassaient donc au découpage.
 *
 * Ce helper renvoie la concaténation de toute la surface serveur, pour que ces
 * vérifications portent sur le backend et non sur un fichier. Quand l'enjeu est
 * « la route est-elle servie ? », préférez l'inventaire des routes montées
 * (`tests/route_inventory.test.ts`) : une chaîne dans un fichier ne prouve pas
 * qu'un `app.use()` existe.
 */
export async function readServerSources(): Promise<string> {
  const root = process.cwd();
  const chunks: string[] = [`// --- server.ts ---\n${await readFile(path.join(root, 'server.ts'), 'utf8')}`];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        chunks.push(`// --- ${path.relative(root, full)} ---\n${await readFile(full, 'utf8')}`);
      }
    }
  }

  await walk(path.join(root, 'src', 'server'));
  return chunks.join('\n');
}
