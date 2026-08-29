import { documentLabel, documentReason } from './sourcingDocuments';

/**
 * CHANTIER 16C — GÉNÉRATION DU CONTENU D'UNE DEMANDE DE PRIX.
 *
 * Ce module produit le texte réellement envoyable. Deux contraintes le
 * gouvernent :
 *
 *  1. **Rien n'est inventé.** Tout ce qui n'est pas connu — identité juridique,
 *     adresse, interlocuteur, volumes — est écrit `⟨à compléter⟩`. Un RFQ qui
 *     contient une adresse fictive part chez un vrai fournisseur, et c'est la
 *     crédibilité de la marque qui part avec.
 *  2. **Les exigences sont les obligations réelles, avec leur fondement.** Un
 *     façonnier à qui l'on demande « un CPSR » sans dire pourquoi répond à
 *     côté ; à qui l'on cite l'obligation, il répond précisément.
 *
 * Le texte est stocké en base au moment de la création de la demande : si les
 * exigences évoluent, l'historique de ce qui a été envoyé ne change pas.
 */

export interface RfqSourceItem {
  id: string;
  wave: string;
  title: string;
  category: string;
  rationale: string;
  specification?: string;
  requiredDocuments: string[];
}

const PLACEHOLDER = '⟨à compléter⟩';

export function buildRfqContent(item: RfqSourceItem): string {
  const today = new Date().toISOString().slice(0, 10);

  const documents = item.requiredDocuments.length
    ? item.requiredDocuments
        .map((type, index) => {
          const reason = documentReason(type);
          return `${index + 1}. **${documentLabel(type)}**${reason ? `\n   _Pourquoi : ${reason}_` : ''}`;
        })
        .join('\n')
    : '_Aucun document spécifique exigé pour cette référence — à justifier avant envoi._';

  return `# Demande de prix — ${item.title}

**Émetteur** : KURLA
**Interlocuteur** : ${PLACEHOLDER}
**Courriel de réponse** : ${PLACEHOLDER}
**Date d'émission** : ${today}
**Vague de sourcing** : ${item.wave}
**Référence interne du besoin** : \`${item.id}\`
**Réponse attendue avant** : ${PLACEHOLDER}

---

## 1. Ce que nous cherchons

**Besoin** : ${item.title}
**Catégorie** : ${item.category}

**Pourquoi ce besoin existe** :

${item.rationale}

${item.specification ? `## 2. Spécification\n\n${item.specification}` : `## 2. Spécification\n\n${PLACEHOLDER} — la spécification technique doit être jointe avant envoi : formulation ou cahier des charges matière, format, contenance, packaging.`}

---

## 3. Documents que vous devez pouvoir fournir

Nous ne retenons aucun fournisseur tant que ces pièces ne sont pas enregistrées
dans notre référentiel, avec leur fichier et leur date d'émission. Une mention
dans un devis ne tient pas lieu de document.

${documents}

Merci d'indiquer, pour chacun, s'il est **déjà établi**, **à établir** (et dans
quel délai), ou **non applicable** — une réponse explicite vaut mieux qu'un
silence.

---

## 4. Ce dont nous avons besoin dans votre réponse

| Élément | Réponse attendue |
|---|---|
| Prix unitaire | Montant, devise, et base de calcul (HT/TTC, départ usine ou rendu) |
| Quantité minimale de commande | En unités |
| Délai de production | En semaines, à compter de la validation |
| Délai d'échantillonnage | En semaines |
| Coût d'outillage ou de mise au point | S'il y en a un, et s'il est amortissable |
| Échelons de prix | Paliers de volume et prix associés |
| Conditions de paiement | ${PLACEHOLDER} |
| Lieu de production | Pays et site |
| Références comparables | Produits similaires déjà fabriqués, sans nom de client si confidentiel |

Un devis partiel est acceptable : indiquez ce que vous ne pouvez pas chiffrer
plutôt que de laisser une case vide. Nous ne complétons rien à votre place.

---

## 5. Ce que nous n'accepterons pas

- Une allégation d'efficacité sans méthode de mesure nommée. Nous ne reprenons
  aucune revendication que vous ne pouvez pas documenter.
- Une revendication SPF sans mesure selon l'ISO 24444, ni un logo UVA sans
  mesure selon l'ISO 24443 atteignant au moins le tiers du SPF.
- Des microplastiques dans une formule rincée au-delà de 0,01 % de la masse :
  l'interdiction est en vigueur depuis le 1er janvier 2026.
- Une matière concernée par le règlement UE 2023/1115 sans diligence raisonnée
  ni géolocalisation des parcelles.
- Un produit présenté comme adapté aux enfants sans données de sécurité
  correspondantes.

---

## 6. Ce que nous ferons de votre réponse

Votre réponse sera enregistrée, datée, et comparée à celles des autres
fournisseurs consultés sur le même besoin. La sélection n'est pas automatique :
un devis moins cher mais incomplet sur les documents ne sera pas retenu.

Nous ne communiquerons pas votre tarif aux autres fournisseurs consultés.

---

_Document généré par la plateforme KURLA à partir du besoin \`${item.id}\`.
Les champs marqués ${PLACEHOLDER} doivent être complétés avant envoi._`;
}
