/**
 * NOMS MODIFIABLES — fournisseur et produit, dans l'espace Approvisionnement
 * (17/09/2026, deuxième demande de la journée).
 *
 * Demande de l'exploitant, verbatim :
 *
 *   « Approvisionne → Fournisseurs & sourcing : tous les fournisseurs qui sont
 *     dans cet espace, dans les différents onglets et sections doivent pouvoir
 *     être modifiables. […] tous les produits qui sont dans cet espace, dans les
 *     différents onglets et sections doivent pouvoir être modifiables. »
 *
 * Mesure faite avant d'écrire : sur les 17 panneaux de cet espace, 8 affichent
 * des fournisseurs ou des produits, et seulement 4 proposaient une écriture
 * (`SupplierAdminPanel`, `ProductSupplierPanel`, `ProductSourcesPanel`,
 * `SourcingProspectsPanel`). Ailleurs le nom n'était qu'un texte : on voyait le
 * manque sans pouvoir le corriger sur place.
 *
 * Ce module fournit DEUX composants à poser sur n'importe quel nom :
 *
 *   · `<SupplierName>` → ouvre la fiche fournisseur (`SupplierSheet`) ;
 *   · `<ProductName>`  → ouvre la fiche produit (`ProductSheet`), qui propose le
 *     rattachement et renvoie vers la fiche fournisseur.
 *
 * Ils montent leur fiche eux-mêmes : un panneau n'a qu'à passer l'identifiant et
 * les en-têtes, il n'a pas d'état à gérer. Les deux fiches écrivent par le
 * magasin partagé (`adminRecordsStore`) — après un enregistrement, les panneaux
 * abonnés rechargent, la modification apparaît partout sans recharger la page.
 *
 * Trois limites assumées, pour ne pas promettre ce que le serveur refuse :
 *
 *   · un identifiant vide ou nul rend du texte simple, jamais un bouton mort ;
 *   · la raison sociale d'un fournisseur reste en lecture seule dans la fiche —
 *     le serveur la refuse parce que l'identifiant en dérive ;
 *   · si le référentiel fournisseurs ne charge pas, le sélecteur de rattachement
 *     est masqué plutôt qu'affiché vide (un sélecteur vide ferait croire qu'il
 *     n'existe aucun fournisseur).
 */
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
  getAdminRecordsSnapshot,
  loadProduct,
  loadSupplierDirectory,
  readProduct,
  subscribeAdminRecords,
} from '../lib/adminRecordsStore';
import { ProductSheet } from './ProductSheet';
import { SupplierSheet } from './SupplierSheet';

const NAME_BUTTON_CLASS = 'font-bold text-kurla-cream hover:text-kurla-amber underline decoration-kurla-copper/40 underline-offset-2 cursor-pointer text-left';

type NameProps = {
  /** Identifiant en base. Vide ou nul → texte simple, jamais un bouton mort. */
  id?: string | number | null;
  /** Nom déjà connu du panneau : affiché tout de suite, évite un clignotement. */
  label?: string | null;
  /** En-têtes d'authentification admin, nécessaires pour lire et écrire. */
  headers: HeadersInit;
  /** Texte de survol. */
  title?: string;
  /** Classes additionnelles (taille, couleur du panneau hôte). */
  className?: string;
  /** Appelé après un enregistrement accepté, pour que le panneau recharge sa liste. */
  onSaved?: () => void;
};

/** Version du magasin : invalide le nom affiché quand la fiche est modifiée
 *  depuis un autre panneau du même écran. */
function useStoreVersion(): number {
  return useSyncExternalStore(subscribeAdminRecords, () => getAdminRecordsSnapshot().version, () => 0);
}

function normalizeId(id: NameProps['id']): string {
  if (id === null || id === undefined) return '';
  const value = String(id).trim();
  return value === '' ? '' : value;
}

/**
 * Nom de FOURNISSEUR modifiable : ouvre la fiche fournisseur sur place.
 */
export const SupplierName: React.FC<NameProps> = ({ id, label, headers, title, className, onSaved }) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const supplierId = normalizeId(id);

  if (!supplierId) {
    return <span className={className || 'text-kurla-cream/45'}>{label || 'non rattaché'}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={event => { event.preventDefault(); event.stopPropagation(); setSheetOpen(true); }}
        title={title || 'Ouvrir la fiche fournisseur et la modifier'}
        className={`${NAME_BUTTON_CLASS} ${className || ''}`}
      >
        {label || supplierId}
      </button>
      {sheetOpen && (
        <SupplierSheet
          supplierId={supplierId}
          headers={headers}
          onSaved={onSaved}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
};

/**
 * Nom de PRODUIT modifiable : ouvre la fiche produit sur place.
 */
export const ProductName: React.FC<NameProps> = ({ id, label, headers, title, className, onSaved }) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const productId = normalizeId(id);
  const version = useStoreVersion();
  const stored = productId ? readProduct(productId) : null;
  void version; // la lecture ci-dessus doit être refaite à chaque version

  useEffect(() => {
    if (!productId || !sheetOpen) return;
    // Une erreur de chargement s'affiche dans la fiche elle-même : on ne la
    // mange pas ici, et on n'invente rien à la place.
    void loadProduct(productId, headers).catch(() => undefined);
  }, [productId, sheetOpen, headers]);

  if (!productId) {
    return <span className={className || 'text-kurla-cream/45'}>{label || 'sans produit'}</span>;
  }

  const display = stored?.name || label || productId;

  return (
    <>
      <button
        type="button"
        onClick={event => { event.preventDefault(); event.stopPropagation(); setSheetOpen(true); }}
        title={title || 'Ouvrir la fiche produit et la modifier'}
        className={`${NAME_BUTTON_CLASS} ${className || ''}`}
      >
        {display}
      </button>
      {sheetOpen && (
        <ProductSheetHost productId={productId} headers={headers} onSaved={onSaved} onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
};

/**
 * Fiche produit + fiche fournisseur, montées ensemble.
 *
 * `ProductSheet` n'affiche le sélecteur de rattachement que si on lui passe des
 * fournisseurs ; depuis cet espace, le rattachement doit être possible partout,
 * donc la liste est lue une fois par le magasin (`loadSupplierDirectory`) plutôt
 * que requêtée par chaque panneau.
 *
 * Le passage produit → fournisseur se fait ICI, dans ce composant : aucune
 * communication par évènement global, donc une seule fiche ouverte à la fois et
 * aucun panneau voisin qui réagit à tort.
 */
const ProductSheetHost: React.FC<{
  productId: string;
  headers: HeadersInit;
  onClose: () => void;
  onSaved?: () => void;
}> = ({ productId, headers, onClose, onSaved }) => {
  const [suppliers, setSuppliers] = useState<Array<{ id: string; legalName?: string; tradeName?: string }> | undefined>(undefined);
  const [directoryFailed, setDirectoryFailed] = useState(false);
  const [openSupplierId, setOpenSupplierId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void loadSupplierDirectory(headers)
      .then(list => { if (alive) setSuppliers(list.map(item => ({ id: String(item.id ?? ''), legalName: item.legalName, tradeName: item.tradeName }))); })
      .catch(() => { if (alive) { setSuppliers(undefined); setDirectoryFailed(true); } });
    return () => { alive = false; };
  }, [headers]);

  return (
    <>
      <ProductSheet
        productId={productId}
        headers={headers}
        suppliers={directoryFailed ? undefined : suppliers}
        onOpenSupplier={supplierId => setOpenSupplierId(String(supplierId))}
        onSaved={onSaved}
        onClose={onClose}
      />
      {openSupplierId && (
        <SupplierSheet
          supplierId={openSupplierId}
          headers={headers}
          onSaved={onSaved}
          onClose={() => setOpenSupplierId(null)}
        />
      )}
    </>
  );
};
