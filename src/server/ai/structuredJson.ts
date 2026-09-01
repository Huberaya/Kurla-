/**
 * Réparation du JSON structuré renvoyé par Gemini.
 *
 * Le modèle est contraint par un schéma, mais une réponse longue (routine
 * détaillée) peut être tronquée en fin de génération (`finishReason: MAX_TOKENS`)
 * ou enveloppée dans une clôture ```json. Un `JSON.parse` strict échouait alors
 * et faisait tomber toute la réponse en repli déterministe (`knowledge_base`).
 *
 * On répare : (1) clôtures ```json, (2) virgule finale, (3) valeur/chaîne
 * coupée — on tronque au dernier champ complet puis on referme accolades et
 * crochets dans l'ordre. `sanitizeStructuredAnswer` complète ensuite chaque
 * champ manquant par son repli : on ne perd donc que la fin de la réponse.
 */
export function salvageStructuredJson(raw: string | undefined | null): Record<string, unknown> | null {
  if (!raw) return null;
  let text = String(raw).trim();

  // 1) Débarrasse les clôtures markdown ```json … ```.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  // 2) Resserre sur le premier objet JSON.
  const start = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (start >= 0 && last > start) text = text.slice(start, last + 1);
  else if (start >= 0) text = text.slice(start);

  // 3) Tentative directe.
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch { /* on répare ci-dessous */ }

  // 4) Virgule finale (et virgule juste avant une fermeture, ex. [1,2,]).
  const cleanTrailing = (v: string) => v.replace(/,\s*([}\]])/g, '$1').replace(/,\s*$/, '');
  const noTrailingComma = cleanTrailing(text);
  try {
    const parsed = JSON.parse(noTrailingComma);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch { /* on tronque */ }

  // 5) Troncature au dernier champ complet, puis refermeture des conteneurs.
  const repaired = closeTruncatedJson(noTrailingComma);
  if (repaired) {
    try {
      const parsed = JSON.parse(cleanTrailing(repaired));
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch { /* dernier repli en amont */ }
  }
  return null;
}

/**
 * Referme un JSON tronqué : on garde tout jusqu'au dernier élément *complet*
 * (crochet/accolade fermé au niveau racine, ou virgule de séparation au niveau
 * racine), puis on empile les fermetures dans l'ordre inverse d'ouverture.
 */
function closeTruncatedJson(input: string): string | null {
  let s = input;
  if (!s.startsWith('{')) {
    const i = s.indexOf('{');
    if (i < 0) return null;
    s = s.slice(i);
  }

  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  let lastSafeEnd = 1; // au moins l'accolade racine ouvrante

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{' || c === '[') {
      stack.push(c === '{' ? '}' : ']');
    } else if (c === '}' || c === ']') {
      stack.pop();
      if (stack.length === 0) lastSafeEnd = i + 1; // objet entièrement fermé
    } else if (c === ',' && stack.length === 1) {
      lastSafeEnd = i + 1; // champ complet au niveau de l'objet racine
    }
  }

  let cut = s.slice(0, lastSafeEnd).replace(/,\s*$/, '');

  // Recalcule les conteneurs encore ouverts sur la portion conservée.
  const open: string[] = [];
  inStr = false; esc = false;
  for (let i = 0; i < cut.length; i++) {
    const c = cut[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{' || c === '[') open.push(c === '{' ? '}' : ']');
    else if (c === '}' || c === ']') open.pop();
  }
  cut += open.reverse().join('');
  return cut;
}
