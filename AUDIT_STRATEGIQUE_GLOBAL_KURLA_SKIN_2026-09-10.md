# Audit stratégique mondial de KURLA SKIN
## Version réellement présente dans le dépôt — 10 septembre 2026

> **Verdict en une phrase :** KURLA SKIN possède une excellente intention de positionnement, une taxonomie peau inhabituelle et des garde-fous de données plus sérieux que beaucoup de prototypes, mais ce n’est pas encore un produit peau mondialement compétitif : le cœur visible de la promesse reste largement déclaratif, statique ou dépendant de produits non fabriqués, alors que les leaders ont déjà relié mesure, catalogue, conseil, achat, suivi et données à grande échelle.

---

## 0. Périmètre, méthode et niveau de preuve

### Périmètre audité

Cet audit repose sur :

1. l’inspection directe des routes, pages, composants, moteurs, stores, APIs, migrations et tests présents dans le dépôt ;
2. l’exécution de tests ciblés réellement disponibles dans le dépôt ;
3. une comparaison internationale avec des retailers, plateformes de personnalisation, fournisseurs Beauty Tech et services de dermatologie digitale ;
4. les informations publiques disponibles au 10/09/2026.

Le dépôt audité est `/home/user/Kurla-`. Les documents stratégiques antérieurs ont été utilisés comme hypothèses à contrôler, jamais comme preuves.

### Échelle utilisée dans ce rapport

Chaque fonctionnalité est classée selon quatre états :

- **Opérationnelle dans le parcours** : visible, branchée, actionnable et reliée aux données attendues ;
- **Disponible côté code** : fonction, endpoint ou store existant, mais intégration produit incomplète ou non vérifiée dans le parcours ;
- **Seed, cible ou fallback** : donnée illustrative, formulation cible, migration préparatoire, prix codé en dur ou scénario de repli ;
- **Non présente** : pas d’implémentation dans le parcours peau actuel.

Cette distinction est déterminante. Un endpoint `outcomes`, un test qui passe ou un composant nommé `AI` ne constituent pas une preuve de valeur utilisateur, de performance réelle ou d’exploitation en production.

### Tests ciblés exécutés

Les bancs suivants passent dans l’environnement mémoire :

- phototype et consentement ;
- gamme peau ;
- publication catalogue ;
- AIPD photo ;
- conflits d’actifs ;
- routines adaptatives ;
- vie privée ;
- API publique ;
- application mobile/PWA ;
- profil beauté ;
- trust score catalogue ;
- sourcing catalogue ;
- `tsc --noEmit`.

Ils valident des contrats de code. Ils ne prouvent ni que les produits peau sont fabriqués, ni qu’ils sont publiés dans la base live, ni que les recommandations produisent un résultat cosmétique, ni qu’une utilisatrice revient à J+30.

---

# 1. Executive Summary

## 1.1 Ce que KURLA SKIN est réellement aujourd’hui

KURLA SKIN est un **pôle peau spécialisé dans les besoins des peaux mates, foncées et riches en mélanine**, intégré à une plateforme plus large dédiée aux cheveux texturés et à la beauté afro/multiculturelle.

Le produit actuel combine :

- un diagnostic peau questionnaire, express ou complet ;
- une question séparée de phototype Fitzpatrick, avec consentement explicite ;
- une taxonomie de besoins, actifs, textures, finis et sensibilité ;
- un moteur de scoring cosmétique ;
- un moteur de routines par tiers ;
- un endpoint IA Gemini optionnel avec sortie JSON contrainte ;
- une boutique filtrée et une couche de vérité catalogue ;
- une routine peau principalement codée dans le frontend ;
- un journal local avec ressenti, observance et photo optionnelle ;
- des briques de profil, étagère, outcomes, historique IA, feedback, revue humaine et suppression de données.

Le problème stratégique est que **ces briques ne forment pas encore une boucle produit cohérente**.

## 1.2 La réalité commerciale est le goulet d’étranglement

Le dépôt contient :

- 3 références peau MVP dans une migration ;
- 13 références supplémentaires dans `KURLA_SKIN_RANGE` ;
- 16 références peau comptabilisées par le test de gamme ;
- 3 kits peau avec prix cibles ;
- des formules cibles, des visuels illustratifs et des données de précommande.

Mais la migration de gamme supplémentaire marque explicitement les 13 fiches comme :

- `is_active = FALSE` ;
- `catalog_status = 'draft'` ;
- `image_ownership_status = 'illustrative'` ;
- validations ingrédients, claims, images, stock, certifications et traductions à `pending` ;
- source fournisseur `formulation interne (précommande)`.

Ces produits ne sont donc pas des produits vendables. Les trois références MVP portent elles aussi une source `formulation interne (précommande)`. La couche `catalogTruth` les traite correctement comme des cibles de formulation, même lorsque des champs historiques les décrivent comme publiés.

**Conséquence :** KURLA peut montrer une routine plus complète qu’elle ne peut réellement vendre ou livrer.

## 1.3 La promesse IA est surévaluée par l’interface

KURLA n’a actuellement **aucune analyse photo peau automatisée**. Le diagnostic est un questionnaire.

Le endpoint `/api/ai/routine-result` est correctement prudent sur plusieurs points :

- catalogue filtré ;
- slugs validés ;
- JSON structuré ;
- triage de sécurité ;
- fallback déterministe.

Mais :

- le client du modèle est optionnel et dépend de `GEMINI_API_KEY` ;
- le frontend visible affiche encore des étapes, prix et routines hard codés ;
- le résultat IA est montré surtout dans un bloc secondaire “étapes calculées par l’IA” ;
- les routines affichées ne sont pas systématiquement la projection de la routine calculée ;
- les précommandes ne sont pas transmises au catalogue achetable de l’IA ;
- la recommandation doit donc souvent retomber sur des textes génériques ou des noms de produits non actionnables.

KURLA doit éviter de devenir une simple interface de texte généré autour d’un assortiment incomplet.

## 1.4 Position face au marché mondial

KURLA est en retard sur :

- la mesure objective et répétable ;
- le scan photo ou appareil ;
- le catalogue réel et la profondeur d’assortiment ;
- l’achat immédiat ;
- la personnalisation de masse ;
- l’historique longitudinal exploité ;
- le mobile natif et omnicanal ;
- le réseau de professionnels réellement réservable ;
- l’internationalisation.

KURLA a une chance sur :

- une spécialisation plus crédible des peaux riches en mélanine, sans confondre carnation et besoin cutané ;
- le lien entre HPI, irritation, photoprotection, lumière visible, trace blanche, texture et budget ;
- une couche de confiance catalogue plus honnête que la moyenne ;
- une personnalisation cosmétique explicable et non médicalisée ;
- un futur graphe d’outcomes réellement lié aux recommandations ;
- un positionnement neutre entre marketplace, conseil et éducation.

## 1.5 Score final

> **Maturité produit peau mondiale : 54/100.**

Ce score n’est pas un jugement sur le volume de code. Il pénalise fortement l’absence de produits peau réellement disponibles, le décalage entre le résultat affiché et le moteur réel, l’absence de mesure photo validée et la faible internationalisation.

> **Maturité d’infrastructure : environ 72/100.**

Le code est plus avancé que le produit. C’est précisément le risque : continuer à enrichir l’infrastructure sans résoudre le catalogue, la vérité commerciale et la boucle de valeur.

---

# 2. État actuel réel de KURLA SKIN

## 2.1 Parcours accessibles

Les routes peau montées dans `src/lib/routeTable.tsx` sont :

- `/peau` ;
- `/peau/diagnostic` ;
- `/peau/diagnostic/resultats` ;
- `/peau/comparer` ;
- `/peau/guide` ;
- `/peau/journal` ;
- `/peau/routine` ;
- `/account/skin-id` ;
- `/melanin-skin`.

S’y ajoutent les routes globales de :

- boutique ;
- produits ;
- ingrédients ;
- routines ;
- communauté ;
- professionnels ;
- compte ;
- assistant beauté ;
- données personnelles.

La surface est donc suffisante pour raconter une expérience complète. Elle ne signifie pas que chaque promesse est opérante.

## 2.2 Diagnostic : riche en questions, pas en observation objective

### Mode express

Le mode express couvre cinq étapes et une étape phototype séparée.

### Mode complet

Le mode complet couvre douze étapes et une étape phototype séparée, notamment :

- type de peau ;
- niveau d’hydratation ;
- profondeur de carnation ;
- sous-ton ;
- tendance HPI ;
- préoccupations ;
- objectifs ;
- sensibilité ;
- soleil et SPF ;
- routine actuelle ;
- budget ;
- âge ;
- climat et contexte ;
- préférence de texture et de fini.

### Ce qui est bien conçu

- Le phototype n’est pas obligatoirement déduit de la couleur déclarée.
- Le consentement phototype est distinct et réversible.
- Le profil peut être mis à jour partiellement sans écraser les champs absents.
- Le diagnostic est non médical et ne prétend pas repérer une pathologie.
- La conception croise plusieurs axes au lieu de réduire une personne à sa carnation.

### Ce qui manque

- aucune capture photo de qualité contrôlée ;
- aucun protocole de lumière ;
- aucune analyse objective de texture, rougeur, pores, sécheresse ou pigmentation ;
- aucune mesure de confiance calibrée ;
- aucun test de répétabilité utilisateur ;
- aucun résultat “je ne sais pas” intégré à une incertitude visible ;
- aucune validation empirique des recommandations par rapport à un panel.

KURLA a donc un **bon questionnaire cosmétique**. Elle n’a pas encore un “skin analysis tool” au sens donné au marché par Sephora, Boots, Olive Young, Perfect Corp., Revieve ou Haut.AI.

## 2.3 Profil et données

`SkinBeautyProfile` contient une structure riche : phototype optionnel, consentement, type, hydratation, préoccupations, objectifs, sensibilité, historique, routine, préférences et journal.

Le code vérifie correctement plusieurs points :

- normalisation ;
- suppression du phototype si le consentement est retiré ;
- fusion des PUT partiels ;
- suppression dédiée des photos de profil ;
- limite de taille et formats ;
- export et suppression de compte ;
- rétention annoncée de 180 jours pour les photos de profil dédiées.

### Réserve importante : le journal photo n’est pas le même objet que la photo profil

`SkinJournalPage.tsx` transforme la photo du journal en `data URL` base64 et la conserve :

- dans le `localStorage` ;
- dans l’entrée du journal ;
- puis dans `beautyProfile.skin.journal` pour un compte connecté.

La purge AIPD de 180 jours porte sur `beauty_profile_photos`, pas sur ces images embarquées dans le JSON du journal. La promesse “photo chiffrée, supprimable, purgée” ne couvre donc pas exactement toutes les copies réellement créées par le parcours peau.

Ce n’est pas un détail technique : une photo de visage est une donnée personnelle à haut risque contextuel. Avant toute analyse automatisée, KURLA doit avoir :

1. une table et un stockage dédiés au journal ;
2. une durée de conservation appliquée à cette table ;
3. une suppression qui purge aussi les copies locales synchronisées ;
4. une politique d’export cohérente ;
5. une explication claire de ce qui reste sur l’appareil ;
6. une stratégie de minimisation, compression et chiffrement.

## 2.4 Taxonomie : un atout, mais déjà fragmenté

Le frontend `skinTaxonomy.ts` expose :

- 15 besoins peau ;
- 9 filtres actifs ;
- 6 phototypes ;
- 5 textures ;
- 3 finis ;
- 2 niveaux de sensibilité.

Les migrations SQL ajoutent de leur côté 8 types, 17 préoccupations et 12 objectifs.

Cette richesse est intéressante, mais elle crée une dette de cohérence :

- `taches`, `taches_hyperpigmentation`, `hyperpigmentation`, `teint_non_uniforme` et `uniformiser` coexistent ;
- les codes du diagnostic, du moteur, de la boutique, des kits et de la base de connaissance ne sont pas tous strictement identiques ;
- les filtres produit attendent des métadonnées JSONB `phototype`, `texture`, `finish`, `actifs`, `whitecastRisk`, `sansParfum`, mais la couverture catalogue de ces métadonnées n’est pas démontrée.

**Décision recommandée :** une taxonomie versionnée avec identifiants stables, synonymes, niveau de preuve et règles d’héritage. Pas de nouvelle catégorie libre dans les pages.

## 2.5 Moteur de scoring

`scoreSkinProduct` part d’une base neutre de 50 et ajuste le score selon :

- actifs ;
- HPI ;
- risque de trace blanche ;
- sensibilité et parfum ;
- texture ;
- fini ;
- budget ;
- compatibilités ;
- stock ;
- note produit.

Les raisons sont limitées aux quatre premières. Le moteur est donc explicable dans son principe, mais pas encore suffisamment traçable pour une recommandation de confiance à grande échelle.

### Problème technique central : phototype et profondeur de carnation sont mélangés

Dans `buildSkinRoutine`, le phototype utilisé par la routine est alimenté principalement par `skin.toneDepth`. Les valeurs frontend sont `clair`, `intermediaire`, `fonce`, `tres_fonce`, alors que la taxonomie phototype attend `I` à `VI`.

La logique “préférer un SPF invisible” peut donc fonctionner comme proxy pour une carnation foncée, mais elle n’est pas réellement pilotée par le phototype Fitzpatrick explicite.

C’est contraire à la bonne règle produit :

- la carnation n’est pas le phototype ;
- le phototype n’est pas un besoin cutané ;
- ni l’un ni l’autre ne doit être utilisé pour inférer une origine ethnique ;
- le risque de pigmentation, de trace blanche et de tolérance doit être traité comme une combinaison de données, pas comme une couleur.

## 2.6 Moteur de routine

`buildSkinRoutine` sait produire trois tiers :

- Essentielle ;
- Équilibrée ;
- Experte.

Il sait détecter certaines incompatibilités et proposer des alertes.

Mais sa sélection reste principalement :

- keyword-based ;
- dépendante de caps budgétaires ;
- dépendante d’étapes prévues à l’avance ;
- partiellement codée en dur ;
- non entièrement pilotée par un graphe d’ingrédients ;
- non reliée à des résultats utilisateurs réels.

La page `/peau/routine` confirme ce diagnostic : les étapes, descriptions, prix de 49,70 €, 62 € et 84,90 €, nombre de produits et alternatives sont majoritairement codés dans le frontend. Les produits réels ne sont utilisés dynamiquement que dans certaines alternatives si le catalogue peau contient suffisamment de fiches.

## 2.7 Résultats du diagnostic : l’écart le plus visible

`DiagnosticResultPage.tsx` :

- charge les produits publics ;
- reconnaît les réponses du diagnostic ;
- peut résoudre certains noms de la base de connaissance vers des fiches ;
- affiche un résultat IA s’il existe ;
- conserve un fallback déterministe.

Mais la partie visible principale repose encore sur :

- `fallbackSteps` matin/soir/hebdo ;
- prix de tiers hard codés ;
- textes statiques ;
- sélection par mots-clés ;
- un `recommendKit` importé depuis le catalogue cheveux, utilisé avec une texture peau ;
- un bloc secondaire “Voir les étapes calculées par l’IA”.

Le risque UX est sérieux : l’utilisatrice peut croire que l’ensemble de la routine a été calculé pour elle alors qu’une partie substantielle est une structure générique.

## 2.8 IA réellement disponible

Le endpoint `/api/ai/routine-result` est techniquement plus prudent que l’interface :

- il accepte un diagnostic peau ou cheveux ;
- filtre le catalogue publié et achetable ;
- vérifie les slugs renvoyés par Gemini ;
- limite les étapes ;
- conserve les avertissements ;
- déclenche un triage si le texte contient des signaux inquiétants ;
- utilise un fallback déterministe si Gemini n’est pas configuré ou échoue.

Cependant, `getAvailableCatalog` exclut explicitement :

- les produits non publiés ;
- les produits sans preuve suffisante ;
- les précommandes ;
- les produits sans stock ;
- les produits non livrables dans le pays.

C’est une bonne règle de vérité. Elle révèle aussi le problème commercial : si le catalogue peau consiste principalement en produits formulation-target ou preorder, l’IA ne peut pas recommander une offre peau réellement achetable.

Dans le frontend, l’appel ne transmet pas explicitement le pays et la locale dans le body ; l’API retombe donc sur les valeurs par défaut FR/fr. Une architecture internationale ne doit pas dépendre de ces défauts.

## 2.9 Catalogue et produits

### Ce qui existe dans le code

- 3 produits peau MVP dans `20260910000001_seed_peau_mvp.sql` ;
- 13 produits de gamme interne dans `src/lib/kurlaSkinRange.ts` ;
- 3 kits dans `src/lib/peauKits.ts` ;
- 15 fiches ingrédients peau structurées ;
- attributs de texture, fini, parfum, actifs, HPI et trace blanche prévus.

### Ce qui est réellement commercialisable

La migration de gamme est honnête : les 13 produits supplémentaires sont des formulations cibles, pas des références fabriquées. Les kits eux-mêmes indiquent `availabilityState: 'formulation_target'`, `inStock: false` et aucun packshot.

Les trois MVP sont présentés historiquement comme “publiés, précommande, 0 stock”, mais la couche de vérité bloque la combinaison “formulation interne” / preuves insuffisantes / visuel illustratif. C’est le comportement correct.

### Anomalie reproduite

`LAUNCH_PRODUCTS.length` vaut 77 au moment de l’audit, alors que `catalogGuard.ts` attend 54 SKU et 10 kits. L’appel à `assertCatalogIntegrity()` retourne `ok: false`.

La gouvernance catalogue n’est donc pas verte, indépendamment des tests unitaires qui valident la logique de la garde.

## 2.10 Professionnels

La page peau affiche des profils professionnels illustratifs lorsqu’aucune donnée réelle n’est disponible. Ils ne sont pas réservables et ne constituent pas une marketplace peau opérationnelle.

C’est utile pour une maquette de parcours, mais ne doit pas être compté comme :

- réseau expert ;
- preuve clinique ;
- supply de consultations ;
- solution d’escalade ;
- avantage concurrentiel existant.

## 2.11 Internationalisation

Le moteur IA connaît quatre locales (`fr`, `en`, `es`, `pt`). Le routage éditorial n’expose toutefois qu’un petit nombre de versions anglaises réellement déclarées : manifeste, guide melanin-skin et protective styles.

La plupart des routes `/en/...` restent servies avec le contenu français et sont canonisées en français. C’est techniquement honnête pour le SEO, mais cela signifie que KURLA SKIN n’est pas encore une expérience internationale en anglais, encore moins en espagnol, portugais, arabe ou langues d’Afrique anglophone/francophone.

## 2.12 Mobile

KURLA possède une stratégie PWA : installation, manifeste, service worker, file offline et synchronisation. Les tests mobiles passent.

Mais cela ne constitue pas une application mobile native, ni une distribution App Store/Google Play, ni un vrai parcours caméra peau. Le mobile actuel est une base technique, pas un avantage de produit prouvé.

---

# 3. Benchmark mondial

## 3.1 Les quatre familles concurrentielles

Le marché n’est pas constitué d’un seul type de concurrent.

### A. Retailers omnicanaux

Sephora, Ulta, Boots, Douglas et Olive Young ont :

- assortiment ;
- logistique ;
- comptes fidélité ;
- acquisition ;
- magasins ou partenaires ;
- contenu ;
- données comportementales ;
- puissance mobile.

Ils peuvent financer une expérience de diagnostic même lorsque la conversion est l’objectif principal.

### B. Fournisseurs Beauty Tech

Perfect Corp., Revieve et Haut.AI vendent l’infrastructure de mesure et de recommandation aux retailers et marques. Ils commoditisent la partie “selfie + scores + recommandations”.

### C. Services personnalisés ou prescription

Curology, Skin + Me et Dermatica vendent la continuité, le suivi et l’expertise humaine. Leur force n’est pas le catalogue mondial mais la responsabilité clinique et la boucle d’ajustement.

### D. Scanners et bases indépendantes

OnSkin se rapproche d’un “OS de la décision cosmétique” : scanner produit, base de plusieurs millions de références, score ingrédients, alternatives, routine et étagère.

**KURLA ne doit pas essayer de battre simultanément ces quatre familles par le nombre de fonctionnalités. Elle doit choisir une position : la couche de confiance et de personnalisation cosmétique dédiée aux peaux riches en mélanine, alimentée par des données d’usage réelles et un catalogue honnête.**

## 3.2 Ce que font déjà les leaders

### Sephora

Le Smart Skin Scan public annonce sept catégories de préoccupations : ridules/rides, taches, texture, rougeurs, sécheresse, pores et imperfections. Sephora indique une base de plus de 70 000 images médicales et une fiabilité test-retest de 95 % [1](https://www.sephora.com/beauty/skin-analysis-tool).

La leçon n’est pas seulement “avoir une caméra”. Le scan est relié à une sélection dans un immense catalogue, à une marque mondiale et à un compte retail.

### Ulta Beauty

Ulta combine Skin Analysis, GLAMlab, essayage virtuel, shade matching, loyalty, achat et services en magasin. Son app publique est distribuée à très grande échelle et ajoute une couche d’analyse à un assortiment américain profond. Les annonces historiques montrent déjà le couplage selfie, questionnaire, scores et recommandations [2](https://www.revieve.com/insider/news/best-face-forward-ulta-beauty-revieve-and-samsung-launch-new-skin-diagnostics-tool).

KURLA ne peut pas concurrencer Ulta sur la largeur. Elle peut être meilleure sur la pertinence d’un sous-segment précis et la confiance.

### Boots / No7

Boots a relié un analyseur peau, une recommandation dans des milliers de références et, avec No7, des dispositifs en magasin combinant condition de peau, ton de peau et conseil humain. Boots/Revieve annonçait plus de 200 sous-métriques et une vingtaine de métriques principales [1](https://www.revieve.com/insider/news/boots-and-revieve-launch-an-ai-skincare-advisor-experience-to-support-customers-on-their-unique-skincare-journey). No7 a également communiqué sur environ 10 millions d’échantillons et près de 90 000 carnations pour le matching fond de teint [1](https://www.the-independent.com/life-style/no7-ai-foundation-skin-match-b1953725.html).

La leçon : l’inclusivité crédible est mesurée par la couverture des données, la qualité de capture et le résultat, pas par l’emploi du mot “melanin”.

### Douglas

Douglas a lancé ANNA en Allemagne en juin 2026, avec Google Cloud, entraînement avec des Beauty Experts et exploitation d’insights provenant de plus de 64 millions de membres Beauty Card. Le déploiement est progressif, mais l’ambition est omnicanale et internationale [3](https://douglas.group/en/newsroom/press-releases/douglas-group-elevates-digital-shopping-experience-with-ai-powered-beauty-advisor-chatbot-anna).

KURLA peut apprendre de Douglas que l’IA utile n’est pas un chatbot isolé : elle doit connaître le profil, le catalogue, le stock, les préférences et le contexte de relation.

### Olive Young

Olive Young est particulièrement instructif. SKIN SCAN, alimenté par ChoiceDx, relie un scan en magasin à six indicateurs, un historique dans l’app, des routines et la comparaison temporelle. Le service a dépassé un million d’utilisations cumulées selon les communications publiques [1](https://www.choicedx.com/en/post/olive-young-skin-scan-ai-platform-choicetech-1).

Olive Young est plus avancé que KURLA sur la boucle : **mesurer → sauvegarder → revoir → comparer → recommander**.

### Lookfantastic

Lookfantastic dispose d’un assortiment international, de guides par type de peau et de navigation par ingrédient. Les routines éditoriales sont surtout prescriptives et génériques, avec un large choix de marques [3](https://www.lookfantastic.com/blog/advice/skincare-routines-for-every-skin-type/).

KURLA peut dépasser Lookfantastic si elle rend la personnalisation réelle, mesurable et récurrente. Aujourd’hui, l’écart n’est pas encore assez grand, car les routines KURLA visibles sont elles aussi largement génériques.

### YesStyle

Le Beauty Quiz de YesStyle est conçu avec une experte ITEC et relie type de peau, causes des préoccupations et ingrédients utiles [1](https://www.yesstyle.com/en/beauty-consultation.html). YesStyle a une profondeur K-beauty et une portée internationale que KURLA n’a pas.

KURLA peut gagner sur la contextualisation : HPI, trace blanche, climat, tolérance, budget, disponibilité locale et explication des limites.

## 3.3 Fournisseurs Beauty Tech

### Perfect Corp.

Perfect Corp. propose une API annonçant 15 préoccupations, scores 0–100, contrôles qualité de capture, masques et suivi [1](https://yce.perfectcorp.com/ai-api/products/skin-analysis-api).

C’est une solution probablement plus rapide à intégrer que de construire un modèle. Ses chiffres restent des claims fournisseur. KURLA devra exiger des métriques indépendantes par phototype, appareil, éclairage, âge, sexe et type de préoccupation.

### Haut.AI

Haut.AI annonce plus de 150 biomarqueurs, 3 millions de points de données, 94 algorithmes et une couverture des classifications Fitzpatrick [1](https://haut.ai/product/ai-skin-analysis).

C’est un concurrent technologique sérieux pour une intégration B2B. Mais “fonctionne sur les six classifications” ne signifie pas automatiquement égalité de performance. Il faut obtenir la matrice de performance par sous-groupe, les conditions d’éclairage et le protocole de validation.

### Revieve

Revieve annonce plus de 60 millions d’utilisateurs, plus de 15 millions de selfies, plus de 200 métriques et des déploiements online, mobile, CRM et magasin [3](https://www.revieve.com/platform). C’est probablement le benchmark B2B le plus proche de la chaîne complète diagnostic → conseil → conversion → fidélisation.

La conclusion stratégique est nette : **la computer vision générique est une brique achetable**. L’avantage KURLA doit se situer au-dessus : dans la taxonomie, les preuves, la gouvernance, la logique d’usage, la diversité de validation et la relation avec des professionnels.

## 3.4 Personnalisation avancée et expertise humaine

### Curology

Curology demande un questionnaire, des photos et des informations d’historique, puis relie la personne à un professionnel licencié qui prescrit une formule personnalisée. Le service propose un suivi par messagerie et l’ajustement des ingrédients [1](https://curology.com/offers/). Ce n’est pas un benchmark de cosmétique neutre : c’est un benchmark de continuité, de responsabilité et d’escalade clinique.

### Skin + Me

Skin + Me demande trois selfies, fait revoir l’information par une équipe dermatologique et propose une formule personnalisée mensuelle, avec consultation continue [2](https://www.skinandme.com/info/support/getting-started/what-is-skin-me/).

### Dermatica

Dermatica suit le même principe : consultation, équipe clinique, formule personnalisée et ajustements. Des sources publiques décrivent un suivi continu et des changements de formule selon la progression [1](https://miiskin.com/dermatology/dermatica-vs-miiskin/).

KURLA ne doit pas imiter la prescription sans cadre réglementaire. Elle doit en revanche offrir une vraie escalade : “conseil cosmétique”, “revue experte”, “avis médical recommandé”, chacun avec une responsabilité et une promesse différente.

## 3.5 OnSkin

OnSkin annonce plus de 2 millions de produits, scanner code-barres/photo/nom, score de sécurité, alternatives, Skincare Finder, routine et Shelf Scan [3](https://onskin.com/). Sa force est le volume et l’utilité immédiate sur les produits que l’utilisateur possède déjà.

Sa limite potentielle est la distinction entre :

- danger général ;
- risque allergique individuel ;
- adéquation à un profil ;
- preuve d’efficacité pour une préoccupation ;
- compatibilité avec une routine existante.

KURLA doit éviter de transformer son futur score en nouveau score vague. Le produit doit afficher plusieurs dimensions séparées : **preuve, tolérance, adéquation, disponibilité et incertitude**.

---

# 4. Matrice concurrentielle sophistiquée

Notation directionnelle 1–5 :

- 1 = faible ou absent ;
- 3 = crédible mais limité ;
- 5 = avantage établi à grande échelle.

Il s’agit d’une comparaison stratégique basée sur les parcours publics et les preuves disponibles, pas d’un benchmark de conversion réalisé avec des panels identiques.

| Acteur | Distribution / catalogue | Diagnostic / mesure | Personnalisation | IA / données | Routine / suivi | Communauté / contenu | Pro humain | Mobile / omni | International | Science / confiance | Pertinence mélanine | Modèle économique |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Sephora | 5 | 4 | 4 | 4 | 3 | 4 | 3 | 5 | 5 | 3 | 2–3 | retail, fidélité, marge produit |
| Ulta | 5 | 4 | 4 | 4 | 3 | 4 | 4 | 5 | 2 | 3 | 2–3 | retail, loyalty, services |
| Boots / No7 | 5 | 4–5 | 4 | 4 | 4 | 4 | 4–5 | 4 | 3 | 4 | 3–4 | retail, pharmacie, services |
| Douglas | 5 | 3–4 | 4 | 5 | 3 | 4 | 4 | 5 | 4 | 3–4 | 2–3 | retail premium, loyalty |
| Olive Young | 5 en Asie | 4–5 | 4 | 4 | 5 | 4 | 3 | 5 | 4 | 3 | 3 | retail, marketplace, in-store |
| Lookfantastic | 5 | 2 | 2–3 | 2 | 2 | 4 | 1 | 4 | 5 | 2–3 | 2 | retail, affiliate, marques |
| YesStyle | 5 | 2–3 | 2–3 | 2 | 2 | 4 | 1 | 4 | 5 | 2–3 | 2–3 | retail, marketplace |
| Perfect Corp. | B2B | 4 | 3–4 | 5 | 3 | 1 | 1 | 5 | 5 | claims fournisseur | configurable | licence SaaS / API |
| Haut.AI | B2B | 5 selon claims | 4 | 5 | 3 | 1 | 1 | 4–5 | 5 | claims fournisseur | claim six Fitzpatrick | licence SaaS |
| Revieve | B2B | 5 | 5 | 5 | 4 | 1 | 2 | 5 | 5 | expert validation revendiquée | configurable | licence enterprise |
| OnSkin | 3 | 1–2 | 4 | 3–4 | 4 | 3 | 2 | 5 | 4 | science / toxicologie interne | non centré | freemium / abonnement |
| Curology | 2 | 3 | 5 | 3 | 5 | 2 | 5 | 4 | 2 | prescription / professionnels | variable, à vérifier par population | abonnement Rx |
| Skin + Me | 2 | 3 | 5 | 2–3 | 5 | 2 | 5 | 4 | 2 | dermatologie / pharmacie | variable | abonnement Rx |
| Dermatica | 2 | 3 | 5 | 2–3 | 5 | 2 | 5 | 4 | 2–3 | clinique / prescription | variable | abonnement Rx |
| **KURLA SKIN actuel** | **1–2** | **2** | **2–3** | **2** | **2–3** | **3** | **1–2** | **3** | **1–2** | **3** | **4 sur l’intention, 2 sur la preuve d’usage** | précommande / futur retail / futur membership |

## Lecture de la matrice

1. KURLA ne perd pas parce qu’elle n’a pas assez de routes. Elle perd parce que la boucle commerciale n’est pas encore fermée.
2. KURLA ne doit pas copier les scores de Perfect Corp. Elle doit exiger une validation qui prouve une performance équivalente sur les populations ciblées.
3. KURLA est plus précise dans son vocabulaire mélanine que beaucoup de retailers, mais la précision éditoriale n’est pas encore une preuve de pertinence algorithmique.
4. Les services cliniques gagnent sur la continuité et le traitement. KURLA doit clarifier sa frontière : cosmétique, non médical, mais réellement expert et orientant.
5. OnSkin gagne sur l’usage “ce produit que j’ai déjà chez moi”. C’est un white space très pertinent pour KURLA : l’étagère utilisateur doit devenir le point de départ de la routine, pas seulement un écran secondaire.

---

# 5. Score KURLA SKIN /100 par domaine

| Domaine | Poids | Score | Points obtenus | Justification réelle |
|---|---:|---:|---:|---|
| Positionnement et pertinence marché | 15 | 11/15 | 11 | Focus mélanine/HPI/SPF/trace blanche distinctif et utile, mais preuve de demande et de préférence internationale encore absente. |
| Diagnostic et profil | 12 | 5/12 | 6 | Questionnaire très riche, phototype consenti, mais pas de mesure objective ni validation des résultats. |
| Personnalisation et recommandation | 15 | 6/15 | 9 | Moteur explicable et taxonomie forte ; intégration incomplète, mots-clés et fallbacks dominants. |
| Catalogue, vérité commerciale et achat | 15 | 4/15 | 6 | Couche de gouvernance prometteuse, mais produits peau majoritairement cibles/précommandes et garde-fou SKU rouge. |
| Science, claims, sécurité et confiance | 10 | 7/10 | 7 | Bonne discipline cosmétique et non médicale ; manque de tests utilisateurs, preuves d’efficacité et revue scientifique opérationnelle. |
| UX de découverte et conversion | 10 | 6/10 | 6 | Parcours bien découpés et contenu utile ; résultat trompeusement statique, panier/routine non toujours actionnables. |
| Données longitudinales, observance et outcomes | 8 | 4/8 | 3 | Journal, streak et outcomes existent ; faible exploitation réelle, photo journal mal séparée et pas de preuve de rétention. |
| IA et Beauty Tech | 5 | 2/5 | 2 | Gemini structuré mais optionnel ; aucune vision peau, aucune validation modèle, aucun multimodal réel. |
| Mobile et internationalisation | 5 | 2/5 | 2 | PWA et locale IA préparées ; routes anglaises réelles très limitées, pas d’app native ni adaptation pays complète. |
| Experts, communauté et modèle relationnel | 5 | 2/5 | 2 | Endpoints et profils illustratifs ; pas de réseau professionnel peau réservable ni boucle communautaire prouvée. |
| **Total** | **100** |  | **54/100** | **Fondation sérieuse, produit peau pas encore au niveau mondial.** |

---

# 6. Forces

## 6.1 Une distinction correctement formulée

KURLA ne dit pas seulement “peau noire”. Elle essaie de croiser :

- type de peau ;
- préoccupation ;
- objectif ;
- sensibilité ;
- phototype ;
- habitudes solaires ;
- climat ;
- budget ;
- texture ;
- fini ;
- préférence parfum.

C’est la bonne direction. La carnation n’est pas un besoin.

## 6.2 Une vraie sensibilité à l’HPI

Le code et les contenus traitent :

- marques post-inflammatoires ;
- irritation comme facteur aggravant ;
- SPF quotidien ;
- trace blanche ;
- niacinamide ;
- acide azélaïque ;
- prudence sur AHA/BHA/rétinol ;
- différence entre uniformiser et éclaircir.

Cette ligne éditoriale est plus responsable que la plupart des contenus beauté qui promettent “brightening” sans clarifier le risque de dépigmentation ou d’irritation.

## 6.3 Des garde-fous de vérité catalogue

`catalogTruth` est une bonne décision d’architecture :

- séparation entre statut administratif et état commercial ;
- distinction formulation cible / placeholder / précommande / disponible ;
- refus des visuels illustratifs comme preuve produit ;
- blocage des fiches dont les validations sont incomplètes ;
- checkout plus strict que la simple page publique.

La plupart des jeunes produits font l’inverse : ils affichent d’abord et vérifient plus tard.

## 6.4 Une IA volontairement non médicale

Le triage, le disclaimer, la revue humaine potentielle et la validation des slugs sont de bonnes protections.

Le système évite aussi de laisser Gemini inventer un produit non présent dans le catalogue. C’est une base saine.

## 6.5 Une architecture personnelle exploitable

Le profil, l’historique, la shelf, les observations, les routines adaptatives et l’export/suppression donnent à KURLA une base pour construire une relation longue plutôt qu’un quiz jetable.

Le problème est l’intégration et la preuve d’usage, pas l’absence absolue de primitives.

---

# 7. Faiblesses

## 7.1 L’interface raconte un produit plus avancé que l’offre réelle

Les pages parlent de routines, de prix, d’alternatives, de SPF teinté et de sélection peau alors que beaucoup de fiches sont formulées pour plus tard.

Le code sait le dire côté admin, mais certains écrans continuent à présenter une intention commerciale comme une expérience achetable.

## 7.2 Le diagnostic n’est pas encore une mesure

Un questionnaire de 12 étapes peut être utile. Il ne produit pas une observation objective et ne peut pas justifier des scores de texture, de pores, de rougeur ou d’hydratation.

KURLA doit arrêter d’utiliser “diagnostic” sans préciser systématiquement **profil cosmétique déclaratif**.

## 7.3 Le moteur est riche mais peu démontré

Le score de 50 + boosts/malus est lisible, mais :

- les poids ne sont pas validés par outcomes ;
- la couverture metadata n’est pas mesurée ;
- l’explication est tronquée à quatre raisons ;
- le produit indisponible peut être fortement pénalisé sans que le classement frontal expose toujours pourquoi ;
- le phototype est partiellement réduit à `toneDepth` dans la routine.

## 7.4 La boutique n’est pas encore un moteur de choix mondial

Une marketplace peau doit avoir :

- stock ;
- pays ;
- délais ;
- droits image ;
- INCI ;
- claims ;
- certifications ;
- résultats ;
- avis ;
- alternatives ;
- retours ;
- compatibilité.

KURLA a les champs et les écrans de gouvernance, mais pas encore une profondeur commerciale suffisante.

## 7.5 Le “professionnel” est surtout une possibilité

Une liste illustrative ne crée pas la confiance experte. Il faut identité vérifiée, spécialité, pays d’exercice, disponibilité, prix, prise de rendez-vous, responsabilité et retours modérés.

## 7.6 Internationalisation trop déclarative

Avoir `SUPPORTED_AI_LOCALES = fr/en/es/pt` ne suffit pas. Il faut traduire :

- diagnostic ;
- consentements ;
- claims ;
- avertissements ;
- routage ;
- disponibilité par pays ;
- taxes ;
- support ;
- données et droits.

## 7.7 La rétention n’est pas prouvée

Un streak local et un journal ne constituent pas une stratégie de rétention. KURLA ne sait pas encore démontrer que l’utilisatrice :

- suit la routine ;
- comprend un changement ;
- obtient un bénéfice ;
- revient pour ajuster ;
- recommande le produit.

---

# 8. Dix lacunes critiques à corriger

## Lacune 1 — Aucun assortiment peau réellement sécurisé et achetable à l’échelle

**Impact : critique.** Sans produit disponible, la recommandation n’a pas de valeur et le revenu ne peut pas financer la suite.

**Correction :** lancer 3 à 5 produits héros réellement fabriqués, avec PIF/CPSR/CPNP, packaging, lot, visuels propriétaires, pays, stock et preuve de claims. Les 13 formulations cibles restent hors catalogue public jusqu’à validation.

## Lacune 2 — Décalage entre routine affichée et routine réellement calculée

**Impact : critique.** Risque de perte de confiance et de recommandation non traçable.

**Correction :** un seul objet `RoutineRecommendation` issu du serveur doit alimenter : résumé, étapes, prix, produits, alternatives, alertes, panier et historique. Aucun prix hard codé dans le résultat.

## Lacune 3 — Absence d’analyse photo peau

**Impact : élevé.** KURLA est comparée à des acteurs qui mesurent déjà des dizaines de métriques.

**Correction :** ne pas construire un modèle maison en premier. Piloter un fournisseur, avec validation indépendante sur les phototypes, conditions de capture et objectifs cosmétiques non médicaux.

## Lacune 4 — Validation mélanine non démontrée

**Impact : critique si l’IA est lancée.** Les biais de modèles dermatologiques sont documentés : une méta-analyse rapporte un AUROC groupé de 0,89 pour Fitzpatrick I–III contre 0,82 pour IV–VI [1](https://doi.org/10.3390/medicina61122186). Cela concerne surtout le diagnostic dermatologique, pas directement la recommandation cosmétique, mais impose le même niveau d’exigence de stratification.

**Correction :** tableau de performance par groupe, lumière, appareil, âge, genre, niveau d’HPI et qualité de photo ; seuil “pas assez fiable” ; revue humaine.

## Lacune 5 — Phototype mal relié à la routine

**Impact : élevé.** Le diagnostic demande Fitzpatrick mais la routine s’appuie surtout sur la profondeur déclarée.

**Correction :** stocker `phototype` et `toneDepth` comme dimensions séparées ; ne jamais faire de conversion silencieuse ; tester I à VI ; utiliser le phototype pour les risques de réponse UV et non pour essentialiser une identité.

## Lacune 6 — Journal photo non couvert par la même politique de rétention

**Impact : élevé RGPD.** Les photos base64 du journal persistent dans localStorage et profil JSON.

**Correction :** remplacer les data URLs par des objets photos versionnés, un stockage dédié, une suppression transactionnelle et une purge automatique documentée.

## Lacune 7 — Catalogue peau insuffisamment annoté

**Impact : élevé.** Le scoring ne peut pas être meilleur que les métadonnées.

**Correction :** couverture obligatoire par SKU : INCI vérifié, actif normalisé, concentration si autorisée, texture, fini, parfum, allergènes, risque de trace blanche, phototypes testés, test lumière visible, pays et stock.

## Lacune 8 — Internationalisation de surface

**Impact : moyen/élevé.** Trois routes anglaises traduites ne font pas un service mondial.

**Correction :** commencer par France, Belgique, Royaume-Uni et Canada/Québec ou un autre marché cohérent ; traduire le parcours complet et adapter la réglementation plutôt que publier des langues décoratives.

## Lacune 9 — Absence de professionnels réservables

**Impact : élevé sur la confiance.** La promesse “orienter vers un professionnel” reste abstraite.

**Correction :** réseau vérifié de dermatologues, pharmaciens, esthéticiennes ou experts peau selon le pays ; réservation, triage, responsabilité et distinction non médical/médical.

## Lacune 10 — Pas de preuve de boucle outcome → recommandation

**Impact : critique.** Les tables existent, mais il n’est pas démontré qu’elles alimentent les pondérations ou qu’elles améliorent un résultat.

**Correction :** mesurer tolérance, observance, évolution perçue, abandon, retour, réachat et photo optionnelle ; utiliser ces données dans une revue scientifique avant de modifier un score.

---

# 9. White spaces du marché

## 9.1 Un vrai moteur “fit”, pas un score de sécurité unique

Le marché mélange encore :

- sécurité toxicologique ;
- risque allergique ;
- adéquation au besoin ;
- préférence sensorielle ;
- preuve d’efficacité ;
- compatibilité de routine ;
- disponibilité.

KURLA peut créer un modèle à plusieurs axes :

1. **Fit profil** ;
2. **Tolérance probable** ;
3. **Preuve de l’actif** ;
4. **Compatibilité routine** ;
5. **Trace blanche / lumière visible** ;
6. **Disponibilité pays** ;
7. **Niveau d’incertitude**.

## 9.2 Une vérité SPF pour les peaux riches en mélanine

Le marché affirme souvent “invisible” sans préciser :

- sur quelle gamme de phototypes ;
- sur quelle profondeur et sous-ton ;
- sous quelle lumière ;
- avec quel type de filtre ;
- si le produit protège contre la lumière visible ;
- si la formule teintée couvre réellement les teintes.

Les oxydes de fer et les filtres teintés sont une piste pertinente pour la pigmentation induite par lumière visible, mais les publications soulignent aussi le manque de transparence des fabricants et l’absence de standardisation [3](https://practicaldermatology.com/news/iron-oxides-in-tinted-sunscreens-may-improve-hyperpigmentation-protection-study/2487035/).

KURLA peut transformer cette opacité en **indice de transparence photoprotection** : présence d’oxydes de fer déclarée, test de lumière visible, teintes disponibles, rendu sur sous-tons, niveau de preuve.

## 9.3 Une étagère multi-marques réellement utile

OnSkin montre la valeur d’un scan de produits déjà possédés. KURLA peut se spécialiser dans une étagère qui répond :

- Que puis-je garder ?
- Que ne dois-je pas superposer ?
- Qu’est-ce qui est redondant ?
- Quel produit est sans preuve ou mal étiqueté ?
- Quel produit risque d’aggraver l’irritation ou l’HPI ?
- Que manque-t-il pour une routine minimale ?

## 9.4 Une mesure de tolérance, pas seulement d’apparence

Les outils photo mesurent ce qui est visible. Les utilisateurs savent aussi :

- si ça pique ;
- si la peau tire ;
- si le produit peluche ;
- si la teinte blanchit ;
- si la routine est tenable ;
- si la personne arrête au bout de trois jours.

KURLA peut devenir la meilleure base de données de **tolérance et d’usage réel** sur des routines adaptées à différents profils de mélanine, sans prétendre produire une preuve clinique.

## 9.5 La transparence du “je ne sais pas”

Les grands acteurs affichent souvent un score même lorsque la photo est mauvaise. KURLA peut gagner en confiance avec :

- score absent si données insuffisantes ;
- recommandation “à vérifier” ;
- explication de l’incertitude ;
- demande d’une seconde capture ;
- revue humaine si enjeu important.

## 9.6 Le pont entre cosmétique et orientation professionnelle

Le white space n’est pas de diagnostiquer. Il consiste à savoir quand ne pas continuer à vendre :

- lésion nouvelle ;
- douleur ;
- aggravation rapide ;
- réaction importante ;
- tache qui change ;
- échec répété malgré routine correctement suivie.

KURLA peut offrir un parcours responsable sans devenir une plateforme médicale.

---

# 10. Opportunités spécifiques pour les peaux riches en mélanine

## 10.1 Ne jamais essentialiser

Une personne à peau foncée peut avoir une peau :

- sèche ;
- grasse ;
- sensible ;
- acnéique ;
- réactive ;
- mature ;
- déshydratée ;
- ou plusieurs simultanément.

La mélanine modifie certaines réponses au soleil et la visibilité de certaines manifestations. Elle ne remplace pas le profil cutané.

## 10.2 Hyperpigmentation post-inflammatoire

KURLA doit se positionner sur la prévention de la boucle :

1. irritation ou inflammation ;
2. marque ;
3. sur-traitement ;
4. barrière fragilisée ;
5. nouvelle inflammation.

La bonne recommandation n’est donc pas “actif le plus puissant”, mais “bénéfice suffisant avec risque de tolérance acceptable”.

## 10.3 Photoprotection sans trace blanche

Les données produit doivent distinguer :

- SPF mesuré ;
- filtres UV ;
- fini ;
- trace blanche ;
- teinte ;
- oxydes de fer ;
- compatibilité avec le sous-ton ;
- réapplication ;
- résistance à la transpiration ;
- test sur phototypes et sous-tons.

Un SPF invisible pour phototype V peut encore laisser un reflet gris sur un sous-ton froid ou sous lumière flash. KURLA doit rendre cette variabilité visible.

## 10.4 Incertitude de la classification Fitzpatrick

Le Fitzpatrick a été conçu pour la réaction aux UV et est souvent utilisé comme proxy de couleur, alors que la revue de 2024 souligne ses limites pour les peaux de couleur [1](https://www.jaadreviews.org/article/S2950-1989(24)00048-5/fulltext).

KURLA doit :

- conserver le phototype comme donnée déclarée de réaction au soleil ;
- séparer profondeur, sous-ton et phototype ;
- proposer “je ne sais pas” ;
- ne pas déduire race/ethnicité ;
- ne pas utiliser Fitzpatrick comme vérité visuelle absolue ;
- documenter tout éventuel score photo avec une mesure continue et une incertitude.

## 10.5 Données et inclusion

Si KURLA lance une analyse photo, elle doit publier un rapport de validation :

- nombre d’images par groupe ;
- diversité des pays et appareils ;
- phototypes et nuances à l’intérieur de IV–VI ;
- conditions de lumière ;
- maquillage, barbes, lunettes ;
- HPI et mélasma ;
- métriques par préoccupation ;
- taux de refus “photo non exploitable”.

“Tous les tons de peau” est un message marketing. “Voici nos métriques par groupe et nos limites” est une preuve.

---

# 11. IA et Beauty Tech

## 11.1 Faut-il construire une analyse photo propriétaire ?

**Non, pas en première étape.**

La computer vision est une infrastructure coûteuse et déjà disponible chez plusieurs fournisseurs. Construire un modèle KURLA trop tôt détournerait l’équipe de ses vrais actifs : données produit, taxonomy, catalogue, outcomes, validation mélanine et confiance.

KURLA devrait construire :

- la couche de consentement ;
- la qualité de capture ;
- la provenance et la rétention ;
- le mapping métrique → besoin cosmétique ;
- la recommandation explicable ;
- le suivi ;
- la validation équitable ;
- l’escalade humaine.

Elle peut acheter ou piloter la vision.

## 11.2 Cahier des charges d’un fournisseur

Avant signature avec Perfect Corp., Haut.AI, Revieve ou autre :

1. performance par phototype et non seulement globale ;
2. données de validation indépendantes ;
3. métriques non médicales clairement séparées des métriques dermatologiques ;
4. absence d’inférence d’ethnicité ou de race ;
5. possibilité de ne pas conserver l’image ;
6. suppression et localisation des données ;
7. traitement européen si nécessaire ;
8. qualité de capture et refus automatique ;
9. sortie avec score de confiance ;
10. capacité à calibrer les seuils sur les cas mélanine ;
11. logs d’audit ;
12. aucun entraînement fournisseur sans consentement contractuellement explicite ;
13. SLA et export des données ;
14. dégradation sûre si l’API est indisponible.

## 11.3 Les claims fournisseurs ne sont pas des preuves KURLA

Perfect Corp. revendique une fiabilité test-retest de 95 %, Haut.AI une précision clinique de 98 % et Revieve une couverture massive. Ce sont des claims commerciaux utiles pour construire une short-list, pas une validation indépendante de KURLA.

Chaque fournisseur doit passer un pilote A/B technique avec :

- un jeu de référence annoté par experts pour l’objectif cosmétique ;
- un jeu de répétition même personne, lumière et appareil variables ;
- un jeu de phototypes et sous-tons ;
- une mesure de calibration ;
- un audit des faux positifs ;
- une analyse de l’impact sur la recommandation et non seulement sur le score.

## 11.4 Limite réglementaire et produit

KURLA doit rester dans :

- observation cosmétique ;
- éducation ;
- recommandation de routine ;
- tolérance et usage ;
- orientation vers un professionnel.

Elle ne doit pas :

- reconnaître une maladie ;
- attribuer une pathologie à partir d’une image ;
- promettre un résultat thérapeutique ;
- inférer race ou origine ;
- présenter un score comme vérité médicale.

L’AI Act définit la catégorisation biométrique et encadre fortement l’inférence de caractéristiques sensibles ; le texte consolidé rappelle aussi les exigences de contrôle et de documentation des données sensibles [3](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02024R1689-20260727). Le bon design KURLA est de demander les informations utiles, de minimiser les images et de ne pas déduire une identité.

## 11.5 IA générative : rôle acceptable

Gemini peut :

- reformuler un résultat ;
- expliquer une routine ;
- comparer deux produits ;
- répondre à une question contextualisée ;
- résumer un journal ;
- rendre l’incertitude lisible.

Gemini ne doit pas être la source de vérité pour :

- la liste INCI ;
- le stock ;
- les claims ;
- la compatibilité réglementaire ;
- le prix ;
- l’état commercial ;
- la décision de triage.

Ces éléments doivent venir de données structurées et de règles déterministes.

---

# 12. Expérience utilisateur

## 12.1 Parcours actuel

Le parcours idéal affiché est :

1. découverte de KURLA SKIN ;
2. diagnostic ;
3. profil peau ;
4. résultat ;
5. routine ;
6. boutique ;
7. journal ;
8. observance ;
9. réajustement.

Le parcours réel est plus fragmenté :

- réponses en `sessionStorage` / `localStorage` ;
- sauvegarde profil seulement si connecté ;
- résultat IA optionnel ;
- fallback principal ;
- routine statique ;
- catalogue éventuellement vide ou filtré ;
- prix de kits non corrélés au stock ;
- journal séparé de la recommandation ;
- experts non réservables.

## 12.2 Forces UX

- diagnostic progressif ;
- formulation non anxiogène ;
- option “je ne sais pas” ;
- rappel “uniformiser ≠ éclaircir” ;
- alertes d’incompatibilité ;
- alternatives ;
- journal déclaratif ;
- observance très simple ;
- suppression accessible.

## 12.3 Frictions majeures

### Friction 1 — Le résultat peut ne pas avoir de produit achetable

Un nom de produit peut rester affiché sans lien lorsqu’aucune fiche ne correspond. C’est honnête techniquement, mais frustrant commercialement.

### Friction 2 — Le prix paraît calculé alors qu’il est cible

49,70 €, 62 € et 84,90 € donnent une impression de panier réel. Tant que les produits sont des formulations cibles, il faut afficher “prix indicatif de gamme”, pas un prix de routine achetable.

### Friction 3 — Le niveau de personnalisation est difficile à comprendre

L’utilisateur ne sait pas toujours :

- ce qui vient de ses réponses ;
- ce qui vient d’une règle générale ;
- ce qui vient de l’IA ;
- ce qui vient d’une donnée catalogue ;
- ce qui est seulement un conseil éditorial.

Il faut un panneau “Pourquoi cette étape ?” avec trois rubriques : **vos réponses / règle cosmétique / donnée produit**.

### Friction 4 — La promesse de suivi est prématurée

Le journal permet de noter un ressenti, mais KURLA n’a pas encore une vraie boucle “votre routine a changé parce que…”.

## 12.4 UX cible

Le résultat devrait afficher :

- une synthèse du profil ;
- 2 ou 3 priorités maximum ;
- niveau de confiance ;
- ce qui est inconnu ;
- routine calculée ;
- produit réel avec disponibilité et prix ;
- alternative ;
- interaction de routine ;
- temps quotidien ;
- patch test ;
- horizon d’observation réaliste ;
- bouton “je ne tolère pas” ;
- escalade si besoin.

Pas une page de six blocs de texte.

---

# 13. Avantage concurrentiel potentiel

## 13.1 Ce qui ne sera pas un avantage

Ne seront pas des avantages durables :

- avoir une IA générative ;
- avoir un quiz ;
- avoir une page peau sombre ;
- avoir 15 ingrédients dans un fichier ;
- avoir une PWA ;
- afficher un score sur 100 ;
- intégrer une API photo ;
- afficher une liste de professionnels non réservables.

Ces éléments sont copiables ou déjà banalisés.

## 13.2 Le véritable avantage possible

KURLA peut devenir :

> **la plateforme mondiale de décision cosmétique fiable pour les peaux riches en mélanine, qui relie profil multi-dimensionnel, preuve produit, tolérance, photoprotection, routine et résultat d’usage sans réduire la personne à sa couleur de peau.**

Cet avantage repose sur cinq actifs difficiles à copier ensemble :

1. **Melanin Evidence Graph** : connaissances, actifs, HPI, lumière visible, tolérance et sources ;
2. **Catalog Truth Layer** : aucune formulation cible ou image illustrative présentée comme vendable ;
3. **Routine Compatibility Graph** : actifs, fréquence, tolérance et étagère existante ;
4. **Outcome Dataset** : observance, tolérance et évolution perçue, stratifiées prudemment ;
5. **Expert Escalation Network** : cosmétique d’abord, professionnel quand nécessaire.

C’est une stratégie de données et de confiance, pas une stratégie de nombre de pages.

---

# 14. Vision KURLA SKIN 2030

## 14.1 Vision

En 2030, KURLA SKIN doit permettre à une personne, quel que soit son pays, son sous-ton, son phototype, son climat et son budget, de :

1. comprendre son profil sans être catégorisée racialement ;
2. scanner ou importer les produits qu’elle possède ;
3. connaître la composition, la preuve, la compatibilité et les limites ;
4. obtenir une routine courte réellement achetable ;
5. savoir pourquoi chaque produit est recommandé ;
6. suivre tolérance et observance ;
7. comparer une tendance dans le temps avec une incertitude claire ;
8. accéder à un professionnel vérifié si le cosmétique ne suffit pas ;
9. choisir des produits adaptés à la pigmentation et à la lumière visible ;
10. supprimer et exporter ses données facilement.

## 14.2 Architecture cible

### Couche 1 — identité et consentement

- profil déclaratif ;
- phototype séparé ;
- consentement photo distinct ;
- consentement IA distinct ;
- âge et mineurs ;
- région et droit applicable.

### Couche 2 — données produit

- INCI vérifié ;
- fonctions ;
- actifs et concentrations ;
- revendications ;
- preuves ;
- tests texture/fini ;
- trace blanche ;
- visible light ;
- stock et pays ;
- image et droits.

### Couche 3 — moteur déterministe

- scoring ;
- conflits ;
- budget ;
- inventaire ;
- disponibilité ;
- conformité.

### Couche 4 — IA interprétative

- dialogue ;
- explication ;
- synthèse ;
- adaptation de ton ;
- clarification ;
- jamais source de vérité.

### Couche 5 — outcomes

- observance ;
- tolérance ;
- ressenti ;
- abandon ;
- réachat ;
- recommandation ;
- révision humaine et scientifique.

---

# 15. Roadmap 0–24 mois

## Phase 0 — 0 à 3 mois : rétablir la vérité produit

### Priorités

1. Unifier le résultat autour d’un seul objet routine serveur.
2. Supprimer les prix et étapes hard codés des résultats principaux.
3. Corriger phototype vs `toneDepth`.
4. Mettre le catalogue peau en état vérité : cible, précommande, disponible.
5. Résoudre l’écart `77 SKU` vs `54 attendus`.
6. Livrer 3 produits héros réellement fabriqués, ou arrêter d’afficher la vente.
7. Couvrir les photos journal par une politique de rétention dédiée.
8. Passer explicitement locale et pays dans tous les appels.

### KPI de sortie

- 0 produit formulation-target dans le catalogue IA ou checkout ;
- 100 % des produits peau publics avec état commercial cohérent ;
- 100 % des résultats affichés mappés à un identifiant produit ou marqués éditoriaux ;
- 0 prix hard codé dans le résultat final ;
- garde catalogue verte ;
- phototype et profondeur indépendants dans 100 % des profils ;
- suppression photo vérifiée pour profil et journal.

## Phase 1 — 3 à 6 mois : MVP commercial crédible

### Priorités

1. Catalogue de 3 à 5 SKU héros disponibles dans 1 à 2 marchés.
2. Fiches complètes et photos propriétaires.
3. Routines Essentielle et Équilibrée réellement achetables.
4. Recommandation par étapes avec alternatives stockées.
5. Avis vérifiés, même peu nombreux.
6. Patch test, fréquence, durée et avertissements.
7. Tableau d’administration catalogue peau.
8. Instrumentation funnel complète.

### KPI de sortie

- 90 % des recommandations avec stock et lien d’achat ;
- 95 % des fiches avec métadonnées peau obligatoires ;
- temps résultat < 60 secondes sans IA et < 8 secondes avec IA dans le p95 ;
- taux diagnostic commencé → terminé suivi ;
- taux résultat → clic produit et résultat → panier mesurés ;
- aucune allégation non reliée à une preuve.

## Phase 2 — 6 à 12 mois : boucle outcomes et pilote Beauty Tech

### Priorités

1. Piloter un fournisseur photo, sans engagement mondial.
2. Valider la qualité sur téléphones et lumières réalistes.
3. Créer un jeu de validation mélanine séparé.
4. Ajouter scan code-barres/INCI des produits existants.
5. Relier shelf, conflits, routine et journal.
6. Créer une revue humaine pour cas à incertitude élevée.
7. Lancer 10 à 20 professionnels vérifiés dans un marché.
8. Publier un rapport de transparence IA et catalogue.

### KPI de sortie

- couverture et métriques par sous-groupe publiées ;
- seuil de refus photo explicite ;
- <5 points d’écart de répétabilité entre groupes pour les métriques retenues, ou affichage d’un résultat non fiable ;
- 25 % des utilisateurs connectés avec étagère renseignée ;
- 20 % des routines suivies au moins 14 jours ;
- premier signal de réduction d’abandon ou de retour produit.

## Phase 3 — 12 à 18 mois : différenciation mélanine

### Priorités

1. Indice SPF trace blanche / lumière visible / teinte.
2. Tests de sous-tons et rendus sur appareils.
3. Modèle HPI orienté prévention de l’irritation.
4. Observance et tolérance dans le classement.
5. Programme de tests utilisateurs transparents.
6. Contenu éditorial par preuve, non par promesse.
7. Escalade professionnelle réservable.
8. Premiers partenariats pharmacies, cabinets, distributeurs ou créateurs experts.

### KPI de sortie

- 30 % du catalogue peau annoté visible light et trace blanche si pertinent ;
- 3 marchés servis avec contenus et stock local cohérents ;
- 10 000 profils peau consentis ou volume suffisant pour des analyses sans surinterprétation ;
- réachat et satisfaction suivis par profil, pas seulement globalement.

## Phase 4 — 18 à 24 mois : plateforme internationale

### Priorités

1. Déploiement de 4 à 6 marchés cohérents.
2. Localisation juridique et catalogue pays.
3. Application mobile distribuée ou PWA très mature selon preuve d’usage.
4. API partenaire pour pharmacies, salons et professionnels.
5. Modèle de données outcomes et gouvernance scientifique externe.
6. Membership : recomplètement, suivi, consultation ou avantages, sans enfermer l’utilisateur.
7. Publication annuelle de métriques de fairness, disponibilité et suppression.

### Ordres de grandeur de ressources

À titre indicatif, hors coût industriel complet des produits :

- 0–3 mois : 2–3 ingénieurs, 1 responsable produit/catalogue, 0,3 ETP réglementaire/scientifique ; 40–100 k€ ;
- 3–6 mois : 3–4 ingénieurs, 1 ops catalogue, 1 advisor scientifique ; 75–180 k€ ;
- 6–12 mois : 3–5 ingénieurs, 1 data/ML ou intégration fournisseur, 1 expert science, budget pilote 100–250 k€ ;
- 12–24 mois : 5–8 personnes cœur, conformité et support marchés ; 300–800 k€ selon pays, fournisseur, stock et marketing.

Ces montants sont des enveloppes de décision, pas des devis.

---

# 16. Vingt fonctionnalités prioritaires

| # | Fonctionnalité | Priorité | Effort | Valeur | Critère d’acceptation |
|---:|---|---|---|---|---|
| 1 | **Routine Truth Object** unique serveur | P0 | M | Élimine la divergence IA/frontend | Chaque étape affichée possède un produit, un statut, un prix et une raison provenant de la même réponse. |
| 2 | **Catalog Truth Dashboard peau** | P0 | M | Bloque les promesses fictives | Aucun SKU cible/précommande ambigu dans le parcours public. |
| 3 | **3–5 SKU héros réellement disponibles** | P0 | L | Rend le produit achetable | Lot, PIF/CPSR/CPNP, packaging, stock, pays et visuels propriétaires vérifiés. |
| 4 | **Phototype séparé de toneDepth** | P0 | S | Corrige le biais conceptuel | I–VI, inconnu et consentement testés sans conversion silencieuse. |
| 5 | **Métadonnées peau obligatoires par SKU** | P0 | M | Rend le score fiable | 95 % des champs requis complétés et validés avant publication. |
| 6 | **Explicabilité “vos réponses / règle / produit”** | P0 | M | Augmente confiance et compréhension | Trois raisons lisibles sur chaque recommandation. |
| 7 | **Journal photo séparé et purgable** | P0 | M | Corrige le risque RGPD | Suppression locale, distante et purge de rétention testées. |
| 8 | **Budget dynamique réel** | P0 | S | Rend la promesse économique vraie | Prix total calculé depuis les produits disponibles, jamais depuis une constante. |
| 9 | **Routines avec substitutions stockées** | P0 | M | Évite les impasses | Une rupture propose une alternative compatible ou déclare l’absence. |
| 10 | **Patch test et fréquence progressive** | P1 | S | Réduit irritation et HPI secondaire | Chaque actif sensible fournit fréquence de départ et consigne d’arrêt. |
| 11 | **Shelf scan / import INCI** | P1 | L | Crée un usage récurrent | L’utilisateur peut déclarer ses produits et obtenir compatibilités/conflits. |
| 12 | **Graphe de compatibilité multi-marques** | P1 | L | Avantage décisionnel | Le moteur détecte les doublons et incompatibilités de l’étagère. |
| 13 | **Outcome journal structuré** | P1 | M | Rend les données utiles | Tolérance, observance, confort et abandon alimentent une revue agrégée. |
| 14 | **Expert review non médical** | P1 | M | Crée une confiance humaine | Cas incertains assignables à un professionnel vérifié avec SLA. |
| 15 | **Escalade médicale explicite** | P1 | S | Protège l’utilisateur | Symptômes et signaux persistants affichent une orientation locale adaptée. |
| 16 | **Pilote analyse photo fournisseur** | P1 | L | Réduit l’écart Beauty Tech | Rapport par groupe, lumière, appareil et métrique avant lancement. |
| 17 | **Capture qualité et score d’incertitude** | P1 | M | Évite le faux diagnostic | Mauvaise lumière/angle/qualité = capture refusée ou résultat non fiable. |
| 18 | **Indice SPF visible light / trace blanche** | P1 | L | White space stratégique | Tests et sources visibles sur les fiches pertinentes. |
| 19 | **Localisation France/Belgique/Royaume-Uni** | P1 | L | Première internationalisation réelle | Parcours, claims, consentements, stock, devise, livraison et support localisés. |
| 20 | **Réachat et routine adaptative** | P2 | M | Monétise la rétention | Rappel basé sur usage, feedback et stock, sans pression commerciale trompeuse. |

---

# 17. Dix innovations différenciantes

## Innovation 1 — Melanin Evidence Graph

Un graphe reliant préoccupation, actif, phototype déclaré, sensibilité, HPI, lumière visible, texture, pays et niveau de preuve. Chaque recommandation indique le chemin de justification.

## Innovation 2 — Visible Light SPF Transparency Index

Un indice public séparant SPF UV, présence d’oxydes de fer, test de lumière visible, teinte, sous-ton, risque de reflet et niveau de preuve.

## Innovation 3 — Irritation-to-Pigmentation Guard

Un moteur qui estime le risque de boucle irritation → marque et réduit les routines trop agressives, plutôt que de maximiser le nombre d’actifs.

## Innovation 4 — Routine Digital Twin minimaliste

Une représentation de ce que la personne possède réellement, de ce qu’elle applique réellement et de ce qu’elle tolère réellement. La recommandation part de l’étagère avant de pousser un achat.

## Innovation 5 — Personal Skin Uncertainty Card

Une carte qui affiche :

- ce qui est déclaré ;
- ce qui est observé ;
- ce qui est inconnu ;
- ce qui est inféré ;
- la confiance ;
- la date de dernière mise à jour.

## Innovation 6 — Fairness Ledger utilisateur

Pour chaque version d’un module photo : phototypes testés, taux de refus, performance, dérives et correctifs. Pas un badge “inclusif”, un journal de preuve.

## Innovation 7 — Routine N-of-1 cosmétique

Le système propose un changement à la fois, une durée d’observation, une mesure de tolérance et une comparaison avant/après prudente. Il ne promet pas une causalité médicale ; il aide à réduire le chaos des routines.

## Innovation 8 — Trust-First Commerce

Impossible d’ajouter au panier une formulation cible ou une fiche sans preuve minimale. Les indisponibilités sont expliquées et non masquées.

## Innovation 9 — Professional Co-Pilot

Le professionnel reçoit un résumé non médical : profil, produits utilisés, tolérance, photos consenties, changements, questions et limites. Le consommateur reste maître du partage.

## Innovation 10 — Global Melanin Skin Benchmark

À terme, KURLA peut publier un rapport agrégé et anonymisé sur :

- HPI ;
- tolérance ;
- SPF ;
- habitudes ;
- textures ;
- climat ;
- observance ;
- besoins par pays.

Cette base peut devenir un actif de recherche, à condition de consentement, minimisation, gouvernance et absence d’inférence ethnique.

---

# 18. Verdict final

## 18.1 Ce que KURLA doit arrêter immédiatement

1. Présenter une formulation cible comme une routine achetable.
2. Afficher des prix de routine sans panier réel.
3. Laisser le fallback statique occuper la place du résultat personnalisé sans le signaler.
4. Demander un phototype puis laisser la routine se baser surtout sur `toneDepth`.
5. Ajouter de nouvelles features avant de mesurer la complétude catalogue.
6. Utiliser “diagnostic” sans préciser “profil cosmétique non médical”.
7. Compter les professionnels illustratifs comme une offre disponible.
8. Stocker des photos de journal dans un JSON sans la même politique de rétention que les photos profil.
9. Publier une expérience anglaise qui n’est pas réellement traduite.
10. Acheter une IA photo avant d’avoir défini les métriques d’équité et le cas d’usage.

## 18.2 Ce que KURLA doit construire en priorité

1. Une offre peau réellement disponible.
2. Une seule routine calculée de bout en bout.
3. Un catalogue annoté au niveau des preuves.
4. Une séparation stricte carnation / phototype / besoin.
5. Un suivi outcome lié aux recommandations.
6. Une vraie politique photo de bout en bout.
7. Une validation mélanine indépendante si l’image est introduite.
8. Une escalade professionnelle réelle.
9. Une internationalisation de marchés, pas seulement de locales.
10. Un avantage fondé sur la confiance et les données d’usage plutôt que sur le mot IA.

## 18.3 Positionnement recommandé

KURLA ne doit pas se vendre comme :

> “un autre scanner de peau propulsé par l’IA”.

Elle devrait se vendre comme :

> “la plateforme qui vous aide à choisir, combiner et suivre des soins adaptés à votre peau, votre tolérance, votre phototype, votre environnement et votre budget — avec une preuve claire de ce qui est connu, disponible et réellement personnalisé.”

## 18.4 Décision go / no-go

### Go conditionnel

KURLA SKIN mérite de poursuivre si l’équipe accepte de :

- réduire le périmètre visible ;
- livrer une petite offre réelle ;
- retirer les illusions de personnalisation ;
- mesurer les outcomes ;
- investir dans la confiance et la validation mélanine ;
- choisir deux marchés avant d’en promettre dix.

### No-go sur le modèle actuel

Il ne faut pas investir prioritairement dans :

- une analyse photo propriétaire ;
- davantage de pages éditoriales ;
- davantage de panels statiques ;
- davantage de kits formulés mais non fabriqués ;
- une expansion mondiale marketing ;
- un chatbot plus bavard.

Tant que le résultat n’est pas relié à un produit réel, à une routine cohérente et à un suivi mesurable, ces investissements augmenteront surtout la surface de promesse.

## Conclusion

KURLA SKIN n’est pas un échec. C’est une **fondation produit sérieuse, moralement plus lucide que beaucoup de prototypes, mais encore au stade de validation commerciale et de cohérence système**.

Son potentiel mondial ne vient pas du fait qu’elle a déjà plus de code que ses concurrents. Il vient du fait qu’elle peut encore choisir une position qu’ils n’occupent pas complètement : **une personnalisation cosmétique honnête, construite pour la diversité des peaux riches en mélanine, mesurée par l’usage réel, sans confondre technologie, science et promesse commerciale**.

Aujourd’hui, KURLA doit gagner le droit de dire qu’elle personnalise.

Dans 24 mois, elle peut gagner le droit de dire qu’elle comprend.

En 2030, elle peut gagner le droit de devenir une référence — si elle transforme ses primitives de code en preuves de produit.

---

## Annexe A — Sources internationales principales

### Retailers et expériences

- Sephora Smart Skin Scan : [sephora.com/beauty/skin-analysis-tool](https://www.sephora.com/beauty/skin-analysis-tool)
- Douglas ANNA : [douglas.group — ANNA](https://douglas.group/en/newsroom/press-releases/douglas-group-elevates-digital-shopping-experience-with-ai-powered-beauty-advisor-chatbot-anna)
- Olive Young / ChoiceDx : [choicedx.com — Olive Young SKIN SCAN](https://www.choicedx.com/en/post/olive-young-skin-scan-ai-platform-choicetech-1)
- Boots / Revieve : [revieve.com — Boots Skin Analysis](https://www.revieve.com/insider/news/boots-and-revieve-launch-an-ai-skincare-advisor-experience-to-support-customers-on-their-unique-skincare-journey)
- No7 / Boots Foundation Tool : [The Independent — No7](https://www.the-independent.com/life-style/no7-ai-foundation-skin-match-b1953725.html)
- Lookfantastic routines : [lookfantastic.com — skincare routines](https://www.lookfantastic.com/blog/advice/skincare-routines-for-every-skin-type/)
- YesStyle Beauty Quiz : [yesstyle.com — Beauty Consultation](https://www.yesstyle.com/en/beauty-consultation.html)

### Beauty Tech

- Perfect Corp. Skin Analysis API : [yce.perfectcorp.com](https://yce.perfectcorp.com/ai-api/products/skin-analysis-api)
- Haut.AI : [haut.ai — AI Skin Analysis](https://haut.ai/product/ai-skin-analysis)
- Revieve : [revieve.com — Platform](https://www.revieve.com/platform)
- OnSkin : [onskin.com](https://onskin.com/)

### Personnalisation et expertise

- Curology : [curology.com — How Curology works](https://curology.com/offers/)
- Skin + Me : [skinandme.com — What is Skin + Me](https://www.skinandme.com/info/support/getting-started/what-is-skin-me/)
- Dermatica : [miiskin.com — Dermatica comparison](https://miiskin.com/dermatology/dermatica-vs-miiskin/)

### Science, équité et réglementation

- Performance dermatologie IA par phototype : [MDPI Medicina 2025](https://doi.org/10.3390/medicina61122186)
- Limites du Fitzpatrick : [JAAD Reviews 2024](https://www.jaadreviews.org/article/S2950-1989(24)00048-5/fulltext)
- Lumière visible et oxydes de fer : [Practical Dermatology 2026](https://practicaldermatology.com/news/iron-oxides-in-tinted-sunscreens-may-improve-hyperpigmentation-protection-study/2487035/)
- Règlement cosmétique européen 1223/2009 : [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32009R1223)
- AI Act consolidé, catégorisation biométrique : [EUR-Lex — Regulation 2024/1689](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02024R1689-20260727)

## Annexe B — Fichiers du dépôt ayant servi de preuves

- `src/lib/routeTable.tsx` — routes montées ;
- `src/pages/DiagnosticSkinPage.tsx` — diagnostic et persistance ;
- `src/pages/DiagnosticResultPage.tsx` — résultat et fallback ;
- `src/pages/RoutinesPage.tsx` — routines peau visibles ;
- `src/pages/SkinJournalPage.tsx` — journal et photos ;
- `src/lib/beautyProfile.ts` — profil et phototype ;
- `src/server/routes/beautyProfile.ts` — APIs profil ;
- `src/server/routes/recommendations.ts` — IA et routine ;
- `src/server/ai/catalog.ts` — catalogue disponible pour l’IA ;
- `src/lib/skinTaxonomy.ts` — taxonomie ;
- `src/lib/skinRecommendation.ts` — score ;
- `src/lib/skinRoutine.ts` — routine V1 ;
- `src/lib/peauKits.ts` — kits cibles ;
- `src/lib/kurlaSkinRange.ts` — 13 fiches de gamme cible ;
- `supabase/migrations/20260910000001_seed_peau_mvp.sql` — 3 produits MVP ;
- `supabase/migrations/20260912000000_skin_range.sql` — 13 fiches formulation interne ;
- `src/lib/catalogTruth.ts` — porte de vérité commerciale ;
- `src/lib/catalogGuard.ts` — garde-fou SKU ;
- `src/lib/routeTranslations.ts` — contenu anglais réellement déclaré ;
- `src/lib/photoAipd.ts` et `src/server/routes/privacy.ts` — AIPD et vie privée ;
- `tests/kurla_skin_phototype.test.ts` ;
- `tests/kurla_skin_range.test.ts` ;
- `tests/kurla_catalog_publication.test.ts` ;
- `tests/kurla_photo_aipd.test.ts` ;
- `tests/kurla_privacy.test.ts` ;
- `tests/public_api.test.ts` ;
- `tests/mobile_app.test.ts`.
