/**
 * FILTRES PAR COLONNE — bibliothèque partagée (17/09/2026).
 *
 * Le motif a été validé une première fois dans `SupplierAdminPanel` (commit
 * acadc7b) : un filtre sous chaque colonne, combinables entre eux, aucun
 * filtre = liste complète. Recopié panneau par panneau, il serait devenu 20
 * versions légèrement différentes du même calcul — et c'est exactement ce qui
 * rend un filtre imprévisible : « contient » qui ignore les accents ici, pas
 * là ; « rempli » qui accepte 0 dans un panneau et le refuse dans l'autre.
 *
 * Ce module pose le calcul UNE fois, en fonctions pures (donc testables sans
 * navigateur), et `ColumnFilters.tsx` pose le rendu une fois.
 *
 * Règle de fond, valable partout : **un filtre vide ne filtre rien**. Aucune
 * ligne n'est jamais inventée ni complétée pour passer un filtre ; une valeur
 * absente reste absente et se traite comme telle (`present` / `absent`).
 */
import React from 'react';

/** Classe des champs de filtre posés sous un en-tête de colonne. */
export function columnFilterClass(): string {
  return 'w-full min-w-[88px] px-2 py-1 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-kurla-cream text-[11px] font-normal normal-case tracking-normal focus:outline-none focus:border-kurla-copper';
}

/** Enlève les accents et passe en minuscules : « Sérum Éclat » → « serum eclat ».
 *  Un filtre francophone qui exige de taper « é » n'est pas un filtre utile. */
export function normalizeFilterText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Une valeur est « remplie » si elle porte de l'information.
 *  0 est une donnée (stock nul, prix nul) : ce n'est pas une absence. */
export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export type FilterKind = 'text' | 'enum' | 'present' | 'numeric';

export interface ColumnFilter {
  /** Clé du filtre dans l'objet d'état (souvent le nom de la colonne). */
  key: string;
  kind: FilterKind;
  /** Lecteur de la valeur sur la ligne. Peut combiner plusieurs champs. */
  get: (row: any) => unknown;
  /** Pour `enum` : valeurs proposées (valeur → libellé). */
  options?: Array<{ value: string; label: string }>;
  /** Pour `text` : champs supplémentaires inclus dans la comparaison. */
  extra?: (row: any) => unknown[];
  /** Pour `present` : étiquettes des deux états (défaut « Rempli » / « Vide »). */
  presentLabels?: { filled: string; empty: string };
  /** Pour `numeric` : suffixe affiché (€ , j, u…). */
  unit?: string;
  /** Pour `text` : plusieurs mots séparés par des espaces doivent tous coller
   *  (défaut vrai — « huile argan » trouve « Huile d'Argan bio »). */
  everyWord?: boolean;
}

/** Un état de filtres : clé → valeur saisie (chaîne vide = filtre inactif). */
export type FilterState = Record<string, string>;

export const emptyFilterState = (filters: ColumnFilter[]): FilterState =>
  Object.fromEntries(filters.map(filter => [filter.key, '']));

export const hasActiveFilter = (state: FilterState): boolean =>
  Object.values(state).some(value => String(value ?? '').trim() !== '');

/**
 * Applique les filtres. Retourne les lignes conservées, dans leur ordre
 * d'origine : un filtre ne trie jamais, il ne fait que retirer.
 */
export function applyColumnFilters<T>(rows: T[], filters: ColumnFilter[], state: FilterState): T[] {
  const active = filters.filter(filter => String(state[filter.key] ?? '').trim() !== '');
  if (active.length === 0) return rows;

  return rows.filter(row => {
    for (const filter of active) {
      const expected = String(state[filter.key]).trim();
      const value = filter.get(row);

      if (filter.kind === 'text') {
        const haystack = normalizeFilterText(
          [value, ...(filter.extra ? filter.extra(row) : [])].filter(hasValue).join(' ')
        );
        const needle = normalizeFilterText(expected);
        if (filter.everyWord === false) {
          if (!haystack.includes(needle)) return false;
        } else if (!needle.split(' ').filter(Boolean).every(word => haystack.includes(word))) {
          return false;
        }
        continue;
      }

      if (filter.kind === 'enum') {
        const current = String(value ?? '').trim();
        const wanted = expected === '__empty__' ? '' : expected;
        if (current !== wanted) return false;
        continue;
      }

      if (filter.kind === 'present') {
        if (expected === 'filled' && !hasValue(value)) return false;
        if (expected === 'absent' && hasValue(value)) return false;
        continue;
      }

      if (filter.kind === 'numeric') {
        // Formats acceptés : « 10-50 » (entre), « 20- » (20 et plus),
        // « -10 » (jusqu'à 10), ou une valeur exacte (« 18 », « 18,5 »).
        // La virgule décimale française est acceptée partout.
        const raw = expected.replace(/\s+/g, '').replace(',', '.');
        const current = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
        if (!Number.isFinite(current)) return false;

        const openMax = /^(-?\d*\.?\d+)-$/.exec(raw);      // « 20- »
        const openMin = /^-(\d*\.?\d+)$/.exec(raw);        // « -10 »
        const between = /^(-?\d*\.?\d*)-(-?\d*\.?\d*)$/.exec(raw); // « 10-50 »

        const number = Number(raw);
        if (openMax) {
          if (current < Number(openMax[1])) return false;
        } else if (openMin) {
          if (current > Number(openMin[1])) return false;
        } else if (between && !(between[1] === '' && between[2] === '')) {
          const min = between[1] === '' ? -Infinity : Number(between[1]);
          const max = between[2] === '' ? Infinity : Number(between[2]);
          if (current < min || current > max) return false;
        } else if (Number.isFinite(number)) {
          if (current !== number) return false;
        }
        continue;
      }
    }
    return true;
  });
}

/** Libellé court de l'état d'un filtre, pour le résumé « N filtre(s) actif(s) ». */
export function activeFilterLabels(filters: ColumnFilter[], state: FilterState): string[] {
  return filters
    .filter(filter => String(state[filter.key] ?? '').trim() !== '')
    .map(filter => {
      const value = String(state[filter.key]).trim();
      if (filter.kind === 'enum') {
        const option = filter.options?.find(item => item.value === value);
        return option ? option.label : value;
      }
      if (filter.kind === 'present') {
        const labels = filter.presentLabels || { filled: 'Rempli', empty: 'Vide' };
        return value === 'filled' ? labels.filled : labels.empty;
      }
      return `${value}${filter.unit || ''}`;
    });
}

/* ---------- Rendu ---------- */

/** Filtre texte posé sous un en-tête de colonne. */
export const ColumnFilterText: React.FC<{
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}> = ({ placeholder, value, onChange, ariaLabel }) => (
  <input
    className={columnFilterClass()}
    placeholder={placeholder}
    value={value}
    aria-label={ariaLabel || placeholder}
    onChange={event => onChange(event.target.value)}
  />
);

/** Filtre à choix posé sous un en-tête de colonne. `noneLabel` = « Tous ». */
export const ColumnFilterSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  noneLabel?: string;
  ariaLabel: string;
}> = ({ value, onChange, options, noneLabel = 'Tous', ariaLabel }) => (
  <select className={columnFilterClass()} value={value} aria-label={ariaLabel} onChange={event => onChange(event.target.value)}>
    <option value="">{noneLabel}</option>
    {options.map(option => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
);

/** Filtre « rempli / vide » posé sous un en-tête de colonne. */
export const ColumnFilterPresence: React.FC<{
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  labels?: { filled: string; empty: string };
}> = ({ value, onChange, ariaLabel, labels }) => (
  <ColumnFilterSelect
    value={value}
    onChange={onChange}
    ariaLabel={ariaLabel}
    noneLabel="Tous"
    options={[
      { value: 'filled', label: labels?.filled || 'Rempli' },
      { value: 'absent', label: labels?.empty || 'Vide' },
    ]}
  />
);

/**
 * Barre de filtres nommés — même calcul que les filtres sous colonne, posé
 * au-dessus d'une liste de cartes (le catalogue n'est pas un tableau).
 */
export const ColumnFilterStrip: React.FC<{
  filters: ColumnFilter[];
  state: FilterState;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
  total: number;
  shown: number;
}> = ({ filters, state, onChange, onReset, total, shown }) => {
  const active = activeFilterLabels(filters, state);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        {filters.map(filter => {
          const value = state[filter.key] || '';
          const label = filter.key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
          return (
            <label key={filter.key} className="flex flex-col gap-1 min-w-[112px]">
              <span className="text-[9px] uppercase tracking-wider font-bold text-kurla-cream/45">{label}</span>
              {filter.kind === 'text' && (
                <ColumnFilterText placeholder="Contient…" value={value} onChange={next => onChange(filter.key, next)} ariaLabel={`Filtrer par ${label}`} />
              )}
              {filter.kind === 'enum' && (
                <ColumnFilterSelect
                  value={value}
                  onChange={next => onChange(filter.key, next)}
                  options={filter.options || []}
                  ariaLabel={`Filtrer par ${label}`}
                />
              )}
              {filter.kind === 'present' && (
                <ColumnFilterPresence
                  value={value}
                  onChange={next => onChange(filter.key, next)}
                  ariaLabel={`Filtrer par ${label}`}
                  labels={filter.presentLabels}
                />
              )}
              {filter.kind === 'numeric' && (
                <ColumnFilterText placeholder={`10-50${filter.unit || ''}`} value={value} onChange={next => onChange(filter.key, next)} ariaLabel={`Filtrer par ${label}`} />
              )}
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-kurla-cream/55">
          <span className="font-bold text-kurla-cream">{shown}</span>/{total} ligne{total > 1 ? 's' : ''}
          {active.length > 0 && <> · {active.length} filtre{active.length > 1 ? 's' : ''} actif{active.length > 1 ? 's' : ''} : {active.join(' · ')}</>}
        </span>
        {active.length > 0 && (
          <button type="button" onClick={onReset} className="px-2 py-1 rounded-lg border border-kurla-cream/15 text-kurla-cream/60 hover:border-kurla-copper/40 hover:text-kurla-cream">
            Réinitialiser les filtres
          </button>
        )}
      </div>
    </div>
  );
};
