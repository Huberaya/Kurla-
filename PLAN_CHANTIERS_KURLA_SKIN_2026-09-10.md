# Plan directeur des chantiers KURLA SKIN
## Corriger les 7 faiblesses, fermer les 10 lacunes, livrer les 20 fonctionnalités et intégrer les 10 innovations

**Date : 10 septembre 2026**  
**Base :** audit stratégique mondial et vérification directe du dépôt `/home/user/Kurla-`  
**Objectif :** transformer une infrastructure peau riche mais partiellement démonstrative en produit réel, achetable, mesurable et différenciant.

---

# 1. Règle de pilotage

KURLA ne doit pas traiter ces demandes comme quatre listes indépendantes.

- Les **7 faiblesses** décrivent les symptômes visibles.
- Les **10 lacunes critiques** décrivent les causes qui bloquent le produit.
- Les **20 fonctionnalités** sont les livrables utilisateurs et opérationnels.
- Les **10 innovations** sont les actifs différenciants à construire après stabilisation.
- Les **chantiers** sont les unités d’exécution, avec dépendances, responsables et critères d’acceptation.

## Règle absolue

> Aucun nouveau module peau ne doit augmenter la promesse visible tant que le catalogue, le statut commercial, la routine calculée et la politique de données ne sont pas cohérents.

## Les quatre portes de sortie obligatoires

Une version ne peut progresser que si elle passe ces quatre portes :

1. **Porte vérité commerciale** : aucun produit cible, placeholder ou précommande ambiguë ne se présente comme disponible.
2. **Porte personnalisation** : chaque recommandation est reliée à des réponses, une règle et des données produit.
3. **Porte sécurité et données** : photo, phototype, consentement, triage, claims et suppression sont cohérents.
4. **Porte mesure** : chaque fonctionnalité possède un KPI d’usage et un KPI de valeur, pas seulement un test technique.

---

# 2. Les 13 chantiers proposés

| ID | Chantier | Phase | Priorité | Résultat principal |
|---|---|---|---|---|
| C0 | Vérité produit et gouvernance de release | 0–4 semaines | P0 | Une seule réalité entre catalogue, IA, boutique, routines et checkout. |
| C1 | Catalogue peau réellement commercialisable | 0–12 semaines | P0 | 3–5 produits héros réels puis assortiment progressif, validé et achetable. |
| C2 | Taxonomie, profil et phototype v2 | 0–6 semaines | P0 | Type, besoin, carnation, sous-ton et phototype séparés et cohérents. |
| C3 | Moteur de recommandation et routine déterministe | 2–10 semaines | P0 | Une routine calculée, explicable, compatible et alimentée par les vrais produits. |
| C4 | Résultat diagnostic et conversion | 3–10 semaines | P0 | Le résultat visible devient actionnable et ne sur-vend plus l’IA. |
| C5 | Données mélanine, HPI et photoprotection | 4–16 semaines | P0/P1 | Une vraie expertise mesurable sur HPI, trace blanche, sous-tons et lumière visible. |
| C6 | Journal, photos, outcomes et observance | 4–16 semaines | P0/P1 | Une boucle d’apprentissage utilisateur sûre et exploitable. |
| C7 | Shelf, scan INCI et graphe de compatibilité | 3–9 mois | P1 | KURLA devient utile même avant un nouvel achat. |
| C8 | IA générative et pilote d’analyse photo | 4–12 mois | P1 | IA interprétative sûre et vision sous validation indépendante. |
| C9 | Réseau d’experts et escalade responsable | 3–12 mois | P1 | Une vraie réponse humaine, non illustrative et localisée. |
| C10 | Mobile, internationalisation et marchés | 4–18 mois | P1 | Une expérience réellement localisée, pas seulement traduisible. |
| C11 | Rétention, réachat et modèle économique | 6–18 mois | P1/P2 | La routine devient une relation utile et rentable. |
| C12 | Programme d’innovations différenciantes | 6–24 mois | P2 | Les 10 innovations sont testées, mesurées puis industrialisées. |

---

# 3. Chantier C0 — Vérité produit et gouvernance de release

## Objectif

Corriger le décalage entre ce que le code sait et ce que l’interface raconte.

Aujourd’hui, le système contient des formulations cibles, des précommandes, des prix de kits, des fallbacks et des produits illustratifs. C0 crée une règle unique pour que boutique, IA, SEO, routine, panier, sitemap et emails lisent le même état.

## Travaux

### C0.1 — États commerciaux uniques

Formaliser six états publics et administratifs :

- `draft` ;
- `formulation_target` ;
- `pending_validation` ;
- `preorder` ;
- `available` ;
- `unavailable`.

Interdire qu’un champ historique `catalog_status = published` rende public un produit marqué formulation interne ou possédant des validations `pending`.

### C0.2 — Objet `ProductTruth`

Créer une projection serveur unique contenant :

- `commercialState` ;
- `isPubliclyListable` ;
- `isCheckoutEligible` ;
- `availabilityMessage` ;
- `blockers` ;
- `lastVerifiedAt` ;
- `countryAvailability`.

L’IA, les routines et le frontend consomment cet objet, jamais la table brute.

### C0.3 — Garde catalogue

Corriger l’écart reproduit entre `77 SKU` dans `LAUNCH_PRODUCTS` et `54 SKU` attendus par `catalogGuard.ts`.

Deux options acceptables :

- restaurer réellement le périmètre de 54 SKU ;
- mettre à jour explicitement la référence à 77 après revue de chaque produit.

Laisser une garde rouge tout en poursuivant les fonctionnalités est interdit.

### C0.4 — Suppression des prix fictifs visibles

Les prix `49,70 €`, `62 €`, `84,90 €` ne doivent être affichés comme prix d’achat que si les produits sont tous :

- disponibles ;
- dans le panier ;
- disponibles dans le pays ;
- couverts par un stock ou une précommande clairement étiquetée.

Sinon le libellé doit être `prix indicatif de gamme`.

## Livrables

- `ProductTruth` serveur ;
- rapport de publication admin ;
- test de cohérence cross-surface ;
- statut visible dans le résultat diagnostic ;
- garde catalogue verte ;
- audit log de changement de statut.

## Critères d’acceptation

- 0 produit `formulation_target` dans `/api/products` public ;
- 0 produit illustratif dans le checkout ;
- 100 % des recommandations IA renvoient un état commercial ;
- 100 % des prix affichés viennent d’une réponse serveur ;
- `assertCatalogIntegrity().ok === true` ;
- toute fiche bloquée explique pourquoi à l’admin.

## Effort indicatif

- 8–12 jours de développement ;
- 3–5 jours opérations/catalogue ;
- owner : backend + product ops.

---

# 4. Chantier C1 — Catalogue peau réellement commercialisable

## Objectif

Passer de fiches et formules cibles à une petite offre réelle, vérifiée et achetable.

Le premier objectif ne doit pas être 40 références. Il doit être **3 à 5 références héros impeccables**, puis une extension par preuve de demande.

## Assortiment de lancement recommandé

1. nettoyant doux sans parfum ;
2. hydratant barrière ;
3. SPF réellement testé sur phototypes IV–VI et sous-tons variés ;
4. niacinamide ou acide azélaïque ;
5. un produit de traitement secondaire seulement après validation de tolérance.

## Travaux

### C1.1 — Dossier réglementaire par SKU

Aucune publication sans :

- personne responsable ;
- INCI final ;
- CPSR/PIF ;
- CPNP si applicable ;
- preuves de claims ;
- statut GMP/fabrication ;
- pays autorisés ;
- avertissements ;
- lot, DDM ou PAO ;
- stock et fournisseur identifiés.

Le Règlement cosmétique européen 1223/2009 impose notamment une personne responsable, une évaluation de sécurité et un Product Information File avant mise sur le marché [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32009R1223).

### C1.2 — Métadonnées peau obligatoires

Chaque SKU doit déclarer :

- type(s) de peau ;
- préoccupations couvertes ;
- objectifs ;
- actifs normalisés ;
- concentration lorsque vérifiable ;
- texture ;
- fini ;
- parfum ;
- allergènes ;
- routine step ;
- risque de trace blanche ;
- phototypes testés ;
- sous-tons si produit teinté ;
- visibilité de l’INCI ;
- pays et stock.

### C1.3 — Packshots et tests SPF

Les visuels Unsplash/illustratifs restent réservés aux maquettes ou aux fiches cibles non publiées.

Pour les SPF :

- test sur phototypes IV, V et VI ;
- au moins deux sous-tons quand la teinte est concernée ;
- photo lumière naturelle ;
- photo lumière artificielle ;
- photo flash ;
- notation voile blanc/gris/orange ;
- texture et peluchage ;
- méthode documentée.

### C1.4 — Vague d’assortiment externe

Après les héros, viser 20–40 références seulement si :

- chaque besoin principal a au moins 3 produits ;
- les données sont complètes ;
- les prix et délais sont fiables ;
- les alternatives existent.

## Critères d’acceptation

- 3–5 SKU peau réellement achetables dans le premier marché ;
- 95 % des champs peau obligatoires remplis ;
- 100 % des claims revus ;
- 100 % des images sous droits ;
- aucun produit vendu avec `source_supplier = formulation interne` ;
- disponibilité et stock testés par pays.

## Effort indicatif

- 12–20 jours développement ;
- 15–30 jours opérations, sourcing et validation ;
- owner : product ops + regulatory + catalogue.

---

# 5. Chantier C2 — Taxonomie, profil et phototype v2

## Objectif

Éliminer la fragmentation entre `skinTaxonomy`, migrations SQL, diagnostic, scoring, routines et contenu.

## Décisions de modèle

### Les dimensions restent séparées

- **Type de peau** : sèche, grasse, mixte, sensible, etc. ;
- **Préoccupation** : HPI, déshydratation, imperfections, rougeurs, etc. ;
- **Objectif** : apaiser, hydrater, uniformiser, protéger ;
- **Carnation/profondeur** : perception ou choix utilisateur ;
- **Sous-ton** : chaud, froid, neutre, olive ;
- **Phototype** : réaction déclarée au soleil, I–VI ;
- **Contexte** : climat, saison, habitudes, budget ;
- **Préférence sensorielle** : texture et fini.

Le phototype ne doit jamais être automatiquement calculé à partir de `toneDepth`.

### Taxonomie canonique

Créer une table versionnée :

- `skin_need_codes` ;
- `skin_concern_codes` ;
- `skin_objective_codes` ;
- `skin_active_codes` ;
- `skin_synonyms` ;
- `skin_evidence_level` ;
- `skin_deprecated_codes`.

Chaque route lit cette source versionnée.

### Profil incomplet assumé

Un profil vide ou partiel doit produire :

- score `null` ou confiance faible ;
- question de clarification ;
- pas de recommandation trop spécifique ;
- explication des inconnues.

## Critères d’acceptation

- aucun slug contradictoire pour taches/HPI/teint uniforme ;
- 100 % des codes produits reconnus ;
- 100 % des usages phototype testés I à VI et inconnu ;
- `toneDepth`, `undertone`, `phototype` stockés séparément ;
- aucune inférence de race ou d’ethnicité.

## Fonctionnalités couvertes

- F04 phototype séparé ;
- F05 métadonnées peau ;
- F06 explicabilité ;
- F17 score d’incertitude.

---

# 6. Chantier C3 — Moteur de recommandation et routine déterministe

## Objectif

Faire en sorte que la routine affichée soit réellement calculée à partir du profil, du catalogue, de l’étagère et des contraintes.

## Architecture cible

```text
Profil + contexte + shelf + catalogue vérifié
        ↓
Besoin priorisé
        ↓
Contraintes dures : pays, stock, âge, incompatibilités, sécurité
        ↓
Score multi-axes
        ↓
Routine minimale
        ↓
Alternatives
        ↓
Explications + incertitude + panier
```

## Règles

### Contraintes dures

- produit non publié : exclu ;
- produit sans stock : exclu ou précommande explicitement marquée ;
- incompatibilité bloquante : exclue ;
- pays non couvert : exclu ;
- âge ou actif nécessitant prudence : alerte ou exclusion ;
- métadonnée critique absente : score non évaluable.

### Score multi-axes

Au lieu d’un score unique opaque, renvoyer :

- `needFit` ;
- `toleranceFit` ;
- `routineCompatibility` ;
- `sensoryFit` ;
- `photoprotectionFit` ;
- `budgetFit` ;
- `availabilityFit` ;
- `confidence`.

Le score global peut exister pour trier, mais les dimensions restent visibles.

### Routine minimale

La routine doit préférer :

- moins de produits ;
- une introduction progressive ;
- un seul actif nouveau à la fois ;
- la couverture de la barrière et de la photoprotection ;
- les produits déjà possédés ;
- des alternatives réelles.

## Correction obligatoire

Remplacer dans `buildSkinRoutine` la logique `toneDepth → preferInvisible` par :

- `phototype` pour le risque soleil/HPI déclaré ;
- `toneDepth` et `undertone` pour le rendu visuel ;
- métadonnée produit validée pour le white cast ;
- incertitude si les données manquent.

## Critères d’acceptation

- la routine de résultat et la routine de `/peau/routine` proviennent du même service ;
- chaque produit a une raison lisible ;
- chaque produit possède une alternative ou une absence explicitement déclarée ;
- les conflits internes et inter-produits sont cohérents ;
- aucune routine ne contient un produit non achetable sans libellé clair.

## Fonctionnalités couvertes

- F01 routine truth object ;
- F07 budget dynamique ;
- F08 substitutions ;
- F10 patch test ;
- F12 graphe de compatibilité ;
- F20 réachat adaptatif.

---

# 7. Chantier C4 — Résultat diagnostic et conversion

## Objectif

Remplacer la page “belle mais ambiguë” par une page courte, personnelle et actionnable.

## Nouveau résultat en 7 blocs

1. **Votre profil déclaré** : type, préoccupations, objectifs, phototype si consenti ;
2. **Ce qui est certain / inconnu** ;
3. **Deux ou trois priorités** ;
4. **Routine matin/soir minimale** ;
5. **Produits réels, prix, stock, pays** ;
6. **Pourquoi chaque étape** ;
7. **Suivi et prochaine date d’observation**.

## Règles d’interface

- afficher “profil cosmétique” plutôt que diagnostic médical ;
- afficher “calculé à partir de vos réponses” ;
- afficher “conseil général” pour les contenus non personnalisés ;
- afficher “généré avec aide IA” seulement si Gemini a réellement répondu ;
- différencier produit disponible, précommande et cible ;
- supprimer les prix constants du frontend ;
- ne jamais afficher un bloc IA secondaire quand le fallback est le résultat principal sans le préciser.

## Tests utilisateur

Organiser trois profils de test :

- peau mixte, phototype V, HPI fréquente, sans parfum ;
- peau sèche sensible, phototype IV, budget bas ;
- peau grasse, phototype II/III, imperfections et routine existante.

Mesurer :

- complétion ;
- compréhension de la personnalisation ;
- clic produit ;
- ajout panier ;
- compréhension des avertissements ;
- capacité à expliquer pourquoi le produit est recommandé.

## Critères d’acceptation

- 90 % des testeurs comprennent ce qui est personnalisé ;
- 100 % des produits recommandés sont actionnables ou explicitement indisponibles ;
- aucun prix affiché sans provenance serveur ;
- temps résultat inférieur à 2 minutes sur mobile ;
- au moins 70 % des utilisateurs test comprennent la différence conseil cosmétique/avis médical.

## Fonctionnalités couvertes

- F01, F06, F07, F08, F10 et F17.

---

# 8. Chantier C5 — Données mélanine, HPI et photoprotection

## Objectif

Transformer le discours “peaux riches en mélanine” en expertise mesurable et non essentialisante.

## C5.1 — Ontologie HPI

Documenter :

- inflammation déclenchante ;
- marques post-imperfections ;
- sensibilité et sur-traitement ;
- horizon réaliste ;
- prévention ;
- orientation si tache atypique ou persistante.

## C5.2 — Métadonnées photoprotection

Ajouter aux produits pertinents :

- filtres UV ;
- SPF/PA ou niveau revendiqué ;
- organique/minéral/hybride ;
- teinte ;
- oxydes de fer ;
- tests visible light ;
- risque white cast ;
- sous-tons testés ;
- application et réapplication.

Les données sur la lumière visible et les oxydes de fer peuvent soutenir une différenciation, mais il faut les présenter comme une synthèse de preuves et non comme une promesse universelle.

## C5.3 — Panel d’usage

Créer un panel volontaire de testeurs diversifié par :

- phototype déclaré ;
- profondeur ;
- sous-ton ;
- âge ;
- appareil ;
- lumière ;
- climat ;
- préoccupation.

Ce panel n’est pas une étude clinique. Il sert à mesurer :

- rendu ;
- trace blanche ;
- peluchage ;
- confort ;
- compréhension ;
- observance.

## Critères d’acceptation

- chaque claim mélanine renvoie à une source ou à une méthode de test ;
- aucun contenu ne confond couleur et besoin ;
- chaque SPF ciblé dispose d’un statut white cast ;
- les résultats de test sont stratifiés et anonymisés ;
- aucune conclusion médicale tirée du panel.

## Fonctionnalités couvertes

- F05 métadonnées ;
- F10 patch test ;
- F18 indice SPF ;
- I01 Melanin Evidence Graph ;
- I02 Visible Light SPF Index ;
- I03 Irritation-to-Pigmentation Guard.

---

# 9. Chantier C6 — Journal, photos, outcomes et observance

## Objectif

Passer d’un journal principalement local à une boucle de suivi utile, mesurée et conforme.

## C6.1 — Séparer les photos

Créer un modèle `SkinJournalPhoto` séparé de `BeautyProfilePhoto` avec :

- UUID ;
- propriétaire ;
- consentement ;
- finalité ;
- date de création ;
- date d’expiration ;
- storage path ;
- statut suppression ;
- hash technique ;
- aucun embedding par défaut.

Ne plus stocker la photo en base64 dans le profil JSON.

## C6.2 — Consentements distincts

Séparer :

- stockage pour usage personnel ;
- analyse algorithmique ;
- partage à un professionnel ;
- amélioration du service ;
- utilisation agrégée de recherche.

Aucun consentement ne doit en entraîner un autre.

## C6.3 — Outcomes structurés

À J+0, J+7, J+30 :

- confort ;
- tiraillement ;
- picotement ;
- brillance ;
- tolérance ;
- observance matin/soir ;
- préoccupations perçues ;
- produit arrêté ;
- raison d’arrêt ;
- volonté de continuer.

Le score subjectif doit rester un ressenti et non une prétendue mesure médicale.

## C6.4 — Observance réaliste

Le système doit proposer :

- routine minimale ;
- tâche du jour ;
- rappel sans culpabilisation ;
- possibilité de “journée sautée” ;
- adaptation si la routine est trop longue ;
- réévaluation après abandon.

## Critères d’acceptation

- suppression d’une photo du journal vérifiée localement et côté serveur ;
- purge automatique testée ;
- export RGPD documentant les photos et consentements ;
- 100 % des outcomes associés à une version de routine ;
- aucune photo envoyée à l’IA sans consentement spécifique.

## Fonctionnalités couvertes

- F06 journal purgable ;
- F11 outcomes ;
- F13 observance ;
- F20 adaptation/réachat ;
- I04 Digital Twin ;
- I05 Skin Uncertainty Card ;
- I07 Routine N-of-1.

---

# 10. Chantier C7 — Shelf, scan INCI et compatibilité

## Objectif

Créer une raison de revenir même quand l’utilisateur n’achète pas un produit KURLA.

## Travaux

- saisie manuelle d’un produit ;
- recherche par nom ;
- scan code-barres ;
- photo de l’INCI ;
- validation humaine ou base externe avant usage ;
- produits ouverts/fermés ;
- date d’ouverture ;
- fréquence ;
- actifs ;
- conflits ;
- produits redondants ;
- alternatives KURLA ou neutres.

## Règle de confiance

Un INCI OCR non confirmé ne doit jamais être présenté comme certain. Afficher :

- `vérifié` ;
- `déclaré par l’utilisateur` ;
- `OCR à confirmer` ;
- `inconnu`.

## Critères d’acceptation

- une utilisatrice peut analyser sa routine existante sans achat ;
- le moteur détecte rétinol/AHA/BHA dans l’étagère ;
- chaque conflit affiche les produits concernés ;
- aucune affirmation de sécurité avec INCI incomplet.

## Fonctionnalités couvertes

- F11 Shelf scan ;
- F12 graphe compatibilité ;
- I04 Digital Twin ;
- I08 Trust-First Commerce.

---

# 11. Chantier C8 — IA générative et pilote d’analyse photo

## Objectif

Faire de l’IA une couche utile, interprétative et contrôlée, pas une source de vérité improvisée.

## C8.1 — IA générative

- garder les sorties JSON contraintes ;
- séparer données déterministes et texte génératif ;
- enregistrer version du prompt et catalogue ;
- afficher la source des recommandations ;
- permettre feedback helpful/incorrect/unsafe ;
- déclencher revue humaine ;
- ne pas historiser une photo sans consentement.

## C8.2 — Pilote fournisseur photo

Ne pas produire directement une “note santé”. Commencer par 3 usages cosmétiques :

1. qualité de capture ;
2. observation visible de texture ou zone pigmentaire ;
3. suivi de tendance, avec résultat non fiable si conditions non comparables.

## C8.3 — Validation obligatoire

Avant lancement :

- performance par phototype ;
- répétabilité ;
- lumière ;
- appareil ;
- maquillage ;
- lunettes/barbe ;
- âge ;
- HPI et pigmentation ;
- taux de refus ;
- calibration de confiance.

Les claims Perfect Corp., Haut.AI ou Revieve restent des claims fournisseurs jusqu’à validation indépendante.

## Critères d’acceptation

- aucun modèle photo en production sans rapport de validation ;
- résultat “insuffisant” possible ;
- suppression fournisseur contractuelle ;
- aucun stockage image par défaut ;
- audit des écarts entre groupes ;
- pas de déduction de race ou d’origine.

## Fonctionnalités couvertes

- F16 pilote analyse photo ;
- F17 capture et incertitude ;
- I05 Uncertainty Card ;
- I06 Fairness Ledger.

---

# 12. Chantier C9 — Réseau d’experts et escalade responsable

## Objectif

Remplacer les profils professionnels illustratifs par une offre humaine vérifiée.

## Trois niveaux de service

### Niveau 1 — Conseil cosmétique KURLA

- non médical ;
- réponse sur routine, texture, actifs, tolérance ;
- délai documenté ;
- pas de diagnostic.

### Niveau 2 — Revue experte peau

- professionnel vérifié ;
- résumé du profil ;
- produits et journal partagés uniquement avec consentement ;
- recommandations cosmétiques contextualisées.

### Niveau 3 — Orientation santé

- signaux d’alerte ;
- recommandation d’un dermatologue/pharmacien/médecin selon pays ;
- pas de tentative de traitement dans KURLA.

## Données professionnelles

- identité vérifiée ;
- qualification et pays ;
- spécialité ;
- langue ;
- prix ;
- disponibilité ;
- politique d’annulation ;
- assurance/responsabilité lorsque nécessaire ;
- avis modérés et authentifiés.

## Critères d’acceptation

- 10 premiers professionnels réels et vérifiés dans un pays pilote ;
- réservation ou demande de rendez-vous fonctionnelle ;
- SLA et prix visibles ;
- aucun profil illustratif présenté comme disponible ;
- consentement de partage des données tracé.

## Fonctionnalités couvertes

- F14 expert review ;
- F15 escalade santé ;
- I09 Professional Co-Pilot.

---

# 13. Chantier C10 — Mobile, internationalisation et marchés

## Objectif

Passer d’une infrastructure traduisible à une expérience réellement internationale.

## Ordre recommandé

### Marché 1 — France

- langue française ;
- conformité UE ;
- livraison et TVA ;
- fournisseurs et support locaux.

### Marché 2 — Belgique ou Pays-Bas

- catalogue et logistique validés ;
- langue et claims localisés ;
- règles de livraison et retours.

### Marché 3 — Royaume-Uni ou Canada

Seulement après revue réglementaire et commerciale dédiée. Le Royaume-Uni ne doit pas être ouvert comme simple copie de l’UE.

## Travaux

- locale dans tous les appels ;
- traductions du diagnostic et des avertissements ;
- claims approuvés par marché ;
- pays de disponibilité produit ;
- devises ;
- taxes ;
- délais ;
- support ;
- SEO hreflang seulement sur contenu réellement traduit ;
- PWA installable et testée sur appareils réels ;
- caméra seulement après C8.

## Critères d’acceptation

- parcours complet traduit dans chaque marché ;
- 0 page anglaise indexée avec contenu français non signalé ;
- recommandations filtrées par pays ;
- consentements et mentions adaptés ;
- tests sur au moins cinq appareils mobiles.

## Fonctionnalités couvertes

- F19 localisation ;
- F16 capture mobile ;
- I06 Fairness Ledger international.

---

# 14. Chantier C11 — Rétention, réachat et modèle économique

## Objectif

Monétiser une relation utile plutôt qu’un achat opportuniste.

## Boucle de valeur

```text
Diagnostic
 → routine minimale
 → achat ou shelf
 → observance
 → tolérance
 → outcome
 → ajustement
 → réachat ou recommandation
```

## Offres possibles

### Gratuit

- profil ;
- diagnostic questionnaire ;
- routine ;
- journal limité ;
- fiches ingrédients.

### KURLA Plus

- suivi étendu ;
- historique ;
- scan shelf ;
- rappels adaptatifs ;
- revue experte à tarif préférentiel ;
- pas de promesse médicale.

### B2B

- API de scoring cosmétique ;
- catalogue et provenance ;
- profils anonymisés ;
- rapports de tolérance ;
- pas de vente de photos identifiables.

## KPI

- complétion diagnostic ;
- résultat → clic ;
- clic → panier ;
- panier → achat ;
- J+7 observance ;
- J+30 retour ;
- réachat ;
- produit arrêté pour irritation ;
- satisfaction ;
- suppression/consentement.

## Critères d’acceptation

- chaque rappel est explicable ;
- aucune relance si produit arrêté ou réaction signalée ;
- réassort basé sur rendement estimé et non sur pression commerciale ;
- outcomes exploités dans une revue produit mensuelle.

## Fonctionnalités couvertes

- F13 observance ;
- F20 réachat ;
- I07 N-of-1 ;
- I10 benchmark global.

---

# 15. Chantier C12 — Programme des 10 innovations

Les innovations ne doivent pas être livrées comme dix projets parallèles. Elles doivent suivre trois étapes :

1. prototype ;
2. test utilisateur ou opérationnel ;
3. industrialisation seulement si un KPI progresse.

| Innovation | Prototype | KPI de validation | Fenêtre |
|---|---|---|---|
| I01 Melanin Evidence Graph | graphe HPI/actifs/SPF/sources | 80 % des recommandations explicables | M4–M8 |
| I02 Visible Light SPF Index | fiche SPF enrichie | compréhension + réduction des produits mal choisis | M6–M12 |
| I03 Irritation-to-Pigmentation Guard | score de prudence | baisse des routines incompatibles/abandons | M4–M10 |
| I04 Routine Digital Twin | shelf + usages réels | hausse de routines complétées | M6–M14 |
| I05 Skin Uncertainty Card | données certaines/inconnues | compréhension de l’incertitude | M3–M8 |
| I06 Fairness Ledger | rapport modèle et capture | écarts mesurés et corrigés | M8–M18 |
| I07 Routine N-of-1 | changement unitaire + observation | meilleure attribution perçue, moins d’abandon | M8–M18 |
| I08 Trust-First Commerce | blocage des fiches non prouvées | baisse des dead-ends/retours | M0–M8 |
| I09 Professional Co-Pilot | résumé partagé avec consentement | satisfaction pro et utilisateur | M8–M18 |
| I10 Global Melanin Benchmark | rapport agrégé anonymisé | citations, partenariats, qualité data | M18–M24 |

---

# 16. Matrice de couverture des 7 faiblesses

| Faiblesse de l’audit | Chantiers correctifs | Fonctionnalités livrées | Preuve attendue |
|---|---|---|---|
| W1. Interface plus avancée que l’offre réelle | C0, C1, C4 | F01, F07, F08 | résultat et prix cohérents avec stock et statut produit |
| W2. Questionnaire présenté comme mesure | C2, C5, C8 | F04, F16, F17 | libellé profil cosmétique, protocole photo si ajoutée |
| W3. Moteur riche mais peu démontré | C2, C3, C6 | F05, F06, F11, F12 | scores multi-axes, métadonnées, outcomes |
| W4. Marketplace peau trop faible | C0, C1, C7 | F02, F03, F05, F11 | produits réels, INCI, stock, alternatives |
| W5. Professionnels surtout illustratifs | C9 | F14, F15 | réseau vérifié, réservation, escalade |
| W6. Internationalisation déclarative | C10 | F19 | parcours localisé et catalogue pays |
| W7. Rétention non prouvée | C6, C11 | F13, F20 | J+7/J+30, réachat, outcomes et adaptation |

---

# 17. Matrice de fermeture des 10 lacunes critiques

| Lacune | Chantier principal | Jalon de fermeture |
|---|---|---|
| L1. Assortiment peau non sécurisé/achetable | C0 + C1 | 3–5 SKU disponibles et conformes |
| L2. Routine affichée ≠ routine calculée | C3 + C4 | un objet routine serveur utilisé partout |
| L3. Absence d’analyse photo | C8 | pilote fournisseur sous validation, pas de lancement prématuré |
| L4. Validation mélanine non démontrée | C5 + C8 | métriques stratifiées par groupe et lumière |
| L5. Phototype mal relié à la routine | C2 + C3 | phototype et toneDepth séparés dans les règles |
| L6. Journal photo mal couvert par la rétention | C6 | stockage et purge dédiés testés |
| L7. Catalogue insuffisamment annoté | C1 + C2 | 95 % des métadonnées obligatoires présentes |
| L8. Internationalisation de surface | C10 | deux marchés entièrement localisés |
| L9. Professionnels non réservables | C9 | dix profils réels avec prise de contact/réservation |
| L10. Outcomes non reliés au moteur | C6 + C11 | revue mensuelle et versionnement des pondérations |

---

# 18. Matrice des 20 fonctionnalités prioritaires

| # | Fonctionnalité | Chantier | Phase | Definition of Done |
|---:|---|---|---|---|
| F01 | Routine Truth Object | C0/C3/C4 | P0 | étapes, produits, prix et alertes issus d’une réponse serveur unique |
| F02 | Catalog Truth Dashboard | C0/C1 | P0 | blocages et preuves visibles admin |
| F03 | 3–5 SKU héros réels | C1 | P0 | dossier réglementaire, stock, visuels et pays complets |
| F04 | Phototype séparé de toneDepth | C2 | P0 | tests I–VI, inconnu, consentement et suppression |
| F05 | Métadonnées peau obligatoires | C1/C2 | P0 | actif, texture, fini, parfum, whitecast, pays, stock |
| F06 | Explicabilité en trois niveaux | C3/C4 | P0 | réponse / règle / produit affichés |
| F07 | Budget dynamique réel | C0/C3 | P0 | aucun prix constant dans le résultat final |
| F08 | Substitutions stockées | C3 | P0 | rupture → alternative compatible ou absence déclarée |
| F09 | Patch test et fréquence progressive | C3/C5 | P0 | actif sensible = consigne et seuil d’arrêt |
| F10 | Escalade médicale non diagnostique | C5/C9 | P1 | signaux d’alerte et orientation pays |
| F11 | Shelf scan / import INCI | C7 | P1 | produits existants analysables avec niveau de confiance |
| F12 | Graphe de compatibilité | C3/C7 | P1 | conflits et doublons entre produits possédés et proposés |
| F13 | Outcome journal structuré | C6 | P0/P1 | J+0/J+7/J+30 liés à une version de routine |
| F14 | Expert review | C9 | P1 | professionnel réel, vérifié, consentement de partage |
| F15 | Pilote analyse photo | C8 | P1 | validation multi-phototypes avant mise en production |
| F16 | Capture qualité et incertitude | C8 | P1 | mauvaise image refusée ou déclarée non fiable |
| F17 | Indice SPF visible light/white cast | C5 | P1 | méthode et niveau de preuve visibles |
| F18 | Localisation multi-marchés | C10 | P1 | diagnostic, claims, stock, support et SEO localisés |
| F19 | Réachat et routine adaptative | C11 | P1/P2 | rappel basé sur usage, tolérance et stock |
| F20 | Observance non culpabilisante | C6/C11 | P0/P1 | streak, journée sautée, adaptation et abandon mesurés |

---

# 19. Roadmap opérationnelle 0–24 mois

## 0–4 semaines — sécuriser

### À livrer

- C0.1 à C0.4 ;
- correction garde 77/54 ;
- modèle photo journal ;
- séparation phototype/toneDepth ;
- suppression des prix fictifs les plus visibles ;
- décision formelle sur 3–5 produits héros.

### Interdictions

- pas d’analyse photo en production ;
- pas d’expansion internationale ;
- pas de nouveau kit cible ;
- pas de nouveau composant statique de résultat.

## 5–12 semaines — rendre achetable

### À livrer

- C1 complet ;
- C2 ;
- C3 ;
- C4 ;
- F01 à F09 ;
- parcours test Fatou : diagnostic → routine → produit → panier → journal.

### KPI de sortie

- 90 % des recommandations avec produit réel ;
- 95 % des fiches peau avec métadonnées ;
- 0 cible non signalée ;
- conversion mesurée à chaque étape ;
- score d’audit interne au moins 65/100, sans compter les composants non branchés.

## 3–6 mois — suivre et comprendre

### À livrer

- C5 première version ;
- C6 complet ;
- C7 prototype ;
- F11, F12, F13, F17 ;
- rapport de tolérance et observance ;
- premiers professionnels vérifiés.

### KPI de sortie

- 20 % des profils connectés avec shelf ;
- 20 % des routines démarrées suivies 14 jours ;
- suppression photo vérifiée ;
- trois tests SPF documentés ;
- aucun conflit actif critique non signalé.

## 6–12 mois — différencier

### À livrer

- C8 pilote fournisseur ;
- C9 réseau expert ;
- I01 à I09 en prototypes mesurés ;
- F14 à F17 ;
- deux marchés localisés.

### KPI de sortie

- performance photo stratifiée ;
- seuil de confiance ;
- revue humaine opérationnelle ;
- 10 professionnels réels ;
- au moins 30 % des produits SPF pertinents documentés visible light/white cast.

## 12–24 mois — industrialiser et internationaliser

### À livrer

- C10 et C11 ;
- I06 et I10 ;
- membership ;
- API partenaire ;
- 4–6 marchés seulement si les deux premiers sont rentables ou stratégiquement validés.

### KPI de sortie

- réachat et rétention par cohorte ;
- taux de suppression et consentement suivis ;
- revue annuelle fairness ;
- catalogue localisé ;
- contribution réelle des outcomes au moteur.

---

# 20. Équipe et responsabilité

| Rôle | Responsabilité |
|---|---|
| Product lead Skin | arbitrage de promesse, parcours, priorités et KPI |
| Tech lead | C0, C2, C3, C4, intégration et qualité |
| Product ops/catalogue | C1, sourcing, disponibilité, preuves et publication |
| Référent réglementaire | claims, PIF/CPSR/CPNP, pays et données |
| Scientific/dermatology advisor | HPI, photoprotection, protocoles, escalade |
| Data/analytics | funnel, outcomes, fairness, cohortes |
| UX researcher | compréhension, confiance, routines et inclusion |
| Partnerships lead | fournisseurs, experts, Beauty Tech, marchés |

## Règle d’ownership

Aucune fonctionnalité IA ou mélanine ne doit être validée par l’équipe technique seule. Elle doit avoir au minimum :

- un owner produit ;
- un owner données ;
- un avis science/réglementaire ;
- un critère utilisateur ;
- un critère de suppression ou de limitation.

---

# 21. Tableau de bord de direction

## Vérité produit

- nombre de SKU réellement achetables ;
- pourcentage de produits avec preuves complètes ;
- nombre de produits cibles exposés publiquement ;
- garde catalogue ;
- disponibilité par pays.

## Personnalisation

- complétion diagnostic ;
- confiance moyenne ;
- recommandations non évaluables ;
- recommandations avec lien et stock ;
- raisons comprises par les utilisateurs.

## Sécurité

- réactions déclarées ;
- conflits détectés ;
- photos avec consentement ;
- suppressions exécutées ;
- délais de purge ;
- escalades professionnelles.

## Valeur commerciale

- résultat → clic ;
- clic → panier ;
- panier → achat ;
- AOV ;
- réachat ;
- retour produit ;
- abandon de routine.

## Différenciation

- couverture tests phototypes ;
- écart de performance par groupe ;
- produits SPF documentés ;
- utilisation du graphe d’évidence ;
- outcomes liés aux versions de moteur.

---

# Verdict d’exécution

Le plan existant de type “catalogue 40 références + kits + journal” reste utile, mais il doit être **réordonné** :

1. vérité commerciale ;
2. quelques SKU réels ;
3. taxonomie séparée ;
4. moteur et résultat unifiés ;
5. photos et outcomes sécurisés ;
6. shelf et compatibilité ;
7. experts ;
8. analyse photo ;
9. internationalisation ;
10. innovations à grande échelle.

Le mauvais ordre serait :

```text
analyse photo → chatbot plus riche → nouveaux panels → expansion internationale
→ alors que les produits sont encore des formulations cibles
```

Le bon ordre est :

```text
vérité → produit réel → routine achetable → suivi → preuve
→ IA sous validation → différenciation → expansion
```

**Objectif réaliste :** passer de 54/100 à 65–68/100 en 3 mois en fermant les contradictions, puis à 75/100 en 12–18 mois avec catalogue réel, outcomes, professionnels et validation Beauty Tech. Le passage au-dessus de 80/100 doit être réservé à une phase où KURLA possède des preuves d’usage et de performance, pas simplement davantage de code.
