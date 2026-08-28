# AIPD-KURLA-PHOTO-v1 — Analyse d'impact relative à la protection des données

**Traitement :** téléversement et conservation d'une photo de profil beauté (cheveux, cuir chevelu, peau).
**Version :** 1.0 — **Date d'analyse :** 28 août 2026 — **Prochaine revue :** 28 août 2027.
**Référence portée par le code :** `src/lib/photoAipd.ts` (`PHOTO_AIPD`, `PHOTO_RETENTION_DAYS`).
**Responsable de traitement :** KURLA. Contact : support in-app (`/account` → Support).

Cette analyse existe parce qu'une photo d'une personne identifiable est une donnée
personnelle dont l'usage peut révéler l'apparence, l'âge perçu ou un état de peau.
Le RGPD (art. 35) impose une analyse d'impact avant un tel traitement. Ce document
est la version humaine ; `src/lib/photoAipd.ts` en est la version exécutable, et les
deux portent la même référence pour qu'ils ne puissent pas dériver l'un de l'autre.

---

## 1. Nécessité et finalité

La photo sert à deux choses, et seulement à deux choses :

1. orienter des **gestes de soin cosmétique** à partir de ce qui est visible
   (texture, densité apparente, état du cuir chevelu, aspect de la peau) ;
2. permettre au membre de **comparer son évolution dans le temps**, à sa demande.

Elle ne sert à rien d'autre. Aucun modèle de reconnaissance faciale n'est exécuté,
aucun vecteur biométrique n'est dérivé, aucune publicité n'est ciblée à partir de
l'image, aucune marque ni professionnel n'y accède.

**Nécessité :** la finalité peut être atteinte sans photo — le profil textuel
(KURLA ID) suffit. La photo est donc strictement optionnelle : aucun parcours n'est
bloqué sans elle, et aucune fonction essentielle n'en dépend.

## 2. Base légale

**Consentement explicite** (RGPD art. 6.1.a). Le consentement est vérifié côté
serveur avant tout téléversement (`POST /api/beauty-profile/photos` refuse sans
`photoConsent` enregistré dans le profil), daté, et retirable à tout moment :
`DELETE /api/beauty-profile/photos` supprime les images **et** révoque le
consentement.

## 3. Données traitées

| Donnée | Origine | Conservation |
|---|---|---|
| Image (JPEG/PNG/WebP, 5 Mo max) | Téléversement du membre | 180 jours, puis purge |
| Identifiant, chemin de stockage | Générés par le serveur | Idem |
| Type MIME, taille en octets | Contrôle d'intégrité | Idem |
| Date de consentement, date de création | Horodatage serveur | Idem |

Le contenu de l'image est vérifié par signature binaire (en-têtes JPEG/PNG/WebP) :
un fichier dont le contenu ne correspond pas au format déclaré est refusé.

## 4. Durées de conservation

**180 jours** (`PHOTO_RETENTION_DAYS`), appliqués par
`purgeExpiredBeautyProfilePhotos()` — pas seulement annoncés. Au maximum
**10 photos** par membre (`PHOTO_MAX_PER_MEMBER`, borne appliquée à l'upload).

Trois sorties anticipées, toutes définitives : retrait du consentement, suppression
du compte (`/account/donnees`), demande au support.

## 5. Risques identifiés et mesures

| Risque | Gravité | Mesure appliquée |
|---|---|---|
| Accès non autorisé à l'image | Élevée | Bucket dédié, chemin non devinable (UUID), aucune route publique de lecture d'image |
| Détournement en outil de diagnostic médical | Élevée | Interdit par conception : aucun diagnostic produit ; la réponse renvoie vers un professionnel de santé en cas de signe inquiétant (15 / 112) |
| Attente déçue / promesse de résultat | Moyenne | Aucun résultat garanti ; les suggestions sont des gestes de soin |
| Conservation au-delà du nécessaire | Moyenne | Purge à 180 jours, borne de 10 photos, suppression au retrait du consentement |
| Usage commercial de l'image | Élevée | Interdit : aucune donnée utilisateur n'est utilisée comme avantage commercial (principe §23/§29 de la charte KURLA) |
| Photo d'un mineur | Moyenne | Traitement non destiné aux mineurs de moins de 15 ans sans consentement du titulaire de l'autorité parentale |
| Fuite de données | Élevée | Chiffrement au repos côté hébergeur, suppression en cascade sur demande, journalisation des erreurs sans contenu d'image |

## 6. Ce que ce traitement n'est pas

- **Ce n'est pas un diagnostic médical.** Aucun état pathologique n'est détecté,
  supposé ou nommé.
- **Ce n'est pas un traitement biométrique.** Aucune identification ou vérification
  d'identité à partir de l'image.
- **Ce n'est pas une source de données pour des tiers.** Aucune transmission à une
  marque, un professionnel, un partenaire ou un annonceur.

## 7. Droits du membre

Accès et export (`GET /api/account/export`, métadonnées des photos incluses),
rectification (remplacement de la photo), effacement (`DELETE
/api/beauty-profile/photos` ou `POST /api/account/delete`), retrait du
consentement à tout moment, réclamation auprès de la CNIL.

## 8. Revue

Cette analyse est relue au plus tard le **28 août 2027**, et avant tout changement
de finalité, de durée de conservation ou de destinataire. Toute modification fait
monter le numéro de version, dans ce document et dans `src/lib/photoAipd.ts`.
