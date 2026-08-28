/**
 * CHANTIER 8.2 — composition du store par domaine.
 *
 * Le store était une classe unique de 6 240 lignes. Chaque domaine vit désormais
 * dans son propre module sous forme de fonctions pures prenant le store en
 * premier argument ; `bindDomain` les recolle sur l'instance pour que les
 * centaines d'appels `serverDb.methode(...)` ne changent pas.
 *
 * `Curried` retire le premier paramètre au niveau du type : l'API publique reste
 * exactement celle d'avant, et `tsc` la vérifie.
 */
export type Curried<Methods> = {
  [Name in keyof Methods]: Methods[Name] extends (store: any, ...args: infer Args) => infer Result
    ? (...args: Args) => Result
    : Methods[Name];
};

export function bindDomain<Store extends object, Methods extends Record<string, (store: any, ...args: any[]) => any>>(
  target: Store,
  methods: Methods
): void {
  for (const [name, fn] of Object.entries(methods)) {
    const bound = (...args: unknown[]) => fn(target, ...args);
    // L'arité fait partie du contrat vérifié par l'inventaire de l'API : le
    // wrapper la reproduit au lieu de la ramener à zéro.
    Object.defineProperty(bound, 'length', { value: Math.max(0, fn.length - 1), configurable: true });
    Object.defineProperty(bound, 'name', { value: name, configurable: true });
    (target as Record<string, unknown>)[name] = bound;
  }
}
