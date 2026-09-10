# AUDIT STRATÉGIQUE INDÉPENDANT — KURLA SKIN

**Date de l'audit : 10 septembre 2026**
**Périmètre :** dépôt Git `Huberaya/Kurla-`, commit local `4a1f214`, build propre, suite de tests, API publique de production `https://kurlabeauty.vercel.app` et benchmark international documenté.
**Question :** que doit encore construire KURLA Skin pour devenir une référence mondiale de la beauté personnalisée — et pas seulement une application riche en fonctionnalités ?

---

## Note de méthode — ce que j'ai réellement vérifié

Je n'ai pas repris le score de l'audit fourni comme une vérité.

### Vérifications effectuées

- lecture du code réel : routage, diagnostic, profil, moteur de recommandation, routines, catalogue, ingrédients, IA, suivi, professionnels, internationalisation, conformité et tests ;
- `npm run build` sur un environnement propre ;
- `npm test` : suite verte dans le mode mémoire, avec avertissements Node/Supabase et sans preuve que la base de production est couverte par cette commande ;
- appel de `GET /api/products` en production le 10/09/2026 : **67 produits au total, dont 3 catégorie peau, 10 kits et 26 cheveux** ;
- appel de `GET /api/professionals/verified` : **6 professionnels peau visibles**, tous avec un Trust Score de 70/100 ;
- comparaison entre ce qui est dans le code, ce qui est dans les scripts de migration et ce qui est réellement exposé par l'API ;
- recherche internationale sur Perfect Corp, Sephora, Ulta, Boots/No7, Douglas, Olive Young, Curology, Skin + Me, Lookfantastic et YesStyle.

### Correction importante par rapport à l'audit fourni

L'audit joint est utile mais partiellement daté par rapport au commit et à la production observés :

- **le phototype existe maintenant** dans `src/lib/skinPhototype.ts`, le diagnostic le recueille avec consentement et des tests le verrouillent ;
- **la photo existe**, mais comme import privé et comparaison manuelle dans le journal — pas comme analyse IA ;
- **la base de connaissance comporte maintenant trois profils** (`acné`, `pigmentation`, `sécheresse`) ;
- **un comparateur peau existe** sur `/peau/comparer` ;
- le catalogue de production n'est pas à 7 mais à **3 produits peau actuellement exposés** ;
- les 13 fiches de `src/lib/kurlaSkinRange.ts` sont des **formulations cibles en précommande**, avec validation et visuels encore en attente. Elles ne doivent pas être comptées comme 13 produits disponibles.

**Conclusion de méthode :** KURLA a progressé sur la structure. Le problème principal demeure la différence entre la richesse du code et la réalité commerciale, scientifique et data du produit déployé.

---

# 1. Executive summary

## Verdict en une phrase

> **KURLA Skin possède déjà l'ossature d'un excellent Skin Operating System, mais pas encore la preuve, le catalogue réel, la boucle de résultats ni l'infrastructure de confiance qui permettent de se présenter comme une référence mondiale.**

## Score global

# **KURLA SKIN : 45/100**

Ce score est supérieur au score de l'audit joint parce que le produit a effectivement gagné le phototype, trois profils de connaissance, le comparateur, les filtres peau, le journal photo et six professionnels visibles. Il reste nettement inférieur à un niveau mondial parce que les éléments décisifs ne sont pas encore opérationnels :

1. **3 produits peau live**, tous en précommande, stock physique nul ;
2. aucune vision par ordinateur ni analyse photo automatisée ;
3. aucune preuve clinique ou benchmark de performance, notamment sur les phototypes IV–VI ;
4. les métadonnées nécessaires aux filtres peau sont absentes de l'API publique actuelle ;
5. le suivi mesure surtout des déclarations, une observance et un slider photo, pas un résultat objectivé ;
6. le produit est principalement français : deux locales d'interface, seulement trois routes SEO réellement traduites ;
7. la production, le build SEO et la base de données ne sont pas encore alignés de façon fiable.

## La décision stratégique recommandée

Ne pas essayer de devenir un mini-Sephora.

KURLA doit devenir :

> **la plateforme de référence pour comprendre, choisir et suivre une routine cosmétique adaptée aux peaux riches en mélanine, avec transparence sur les données, le coût, les actifs, les limites et les résultats.**

Le moat ne sera pas « un chatbot » ni « une caméra ». Ces briques sont achetables. Le moat sera la combinaison suivante :

- un catalogue réellement qualifié et testé ;
- une taxonomie peau exploitable ;
- des tests SPF/whitecast et texture sur phototypes IV–VI ;
- des profils et historiques consentis ;
- des résultats longitudinaux et des données d'observance ;
- un moteur explicable et prudent ;
- une validation externe publiée, y compris quand le résultat n'est pas favorable.

---

# 2. État actuel réel de KURLA Skin

## 2.1 Architecture fonctionnelle observée

| Bloc | Ce qui existe réellement | Niveau de maturité |
|---|---|---:|
| Front | React/Vite, routes lazy, pages peau dédiées, PWA | 3/5 |
| Backend | Express, routes API, stores Supabase avec fallback mémoire | 3/5 |
| Compte | KURLA ID, profil beauté, historique, suppression/export de données | 3/5 |
| Diagnostic | Mode express 5 étapes ou complet 12 étapes, phototype séparé | 3/5 |
| Connaissance peau | 3 profils atteignables et affichés dans le résultat | 2/5 |
| Recommandation | scoring explicable, filtres, garde-fous ingrédients, alternatives | 2/5 |
| Routine | tiers Essentielle/Équilibrée/Experte, builder, coûts et conflits | 3/5 |
| Catalogue | 67 produits totaux, mais 3 peau dans l'API live | 1/5 |
| Suivi | observance locale, journal, ressenti 1–5, photos et slider | 2/5 |
| IA | assistant structuré, catalogue contraint, sources, triage et revue humaine | 3/5 |
| Professionnels | six profils peau vérifiés publiquement, booking câblé | 2/5 |
| Communauté | stores, avis/questions et pages présentes | 1–2/5 |
| International | FR par défaut, EN partiel, assistant FR/EN/ES/PT | 1/5 |
| Preuve scientifique | sources et garde-fous éditoriaux ; pas de validation de performance KURLA | 1/5 |

## 2.2 Ce qui est une capacité, pas encore une offre

Le repository contient une gamme cible de 13 références supplémentaires (`peau-ess-004` à `peau-ess-016`). Mais le générateur SQL les décrit explicitement comme :

- formulation interne en précommande ;
- `image_ownership_status = illustrative` ;
- statuts de validation `pending` ;
- stock quantité 0 ;
- fournisseur déclaré comme formulation KURLA et non comme lot réceptionné.

Cela est utile pour préparer un modèle de catalogue. Ce n'est pas une gamme commercialisable.

Même problème pour `peauKits.ts` : plusieurs produits des kits sont des placeholders et `peauKitsAsProducts()` fabrique un pseudo-produit avec `inStock: true` et une image vide. Cette fonction doit être enfermée derrière un statut `draft/preorder`, sinon le code peut donner l'impression qu'un kit est achetable alors que ses composants ne sont pas tous des SKUs réels.

## 2.3 Production au moment de l'audit

`GET /api/products` renvoie :

- 67 produits au total ;
- 3 produits peau : nettoyant, crème, SPF ;
- 10 kits dans la catégorie catalogue ;
- les trois produits peau sont en précommande avec stock physique nul ;
- les trois produits peau ont une INCI et des ingrédients affichés ;
- `originCountry` et `metadata` ne sont pas présents dans la réponse publique observée ;
- les galeries publiques utilisent des URLs Unsplash alors que les cartes les présentent comme `brand_provided` : la provenance doit être corrigée ou documentée.

Le produit n'est donc pas « vide », mais il est encore **une promesse de gamme** plus qu'une gamme mondiale.

## 2.4 Build et release

Le build local passe, mais sans credentials Supabase il génère :

- 64 pages prérendues ;
- 36 URLs de sitemap ;
- **0 URL produit et 0 URL ingrédient**.

La production est donc dépendante de variables d'environnement de build pour rendre son SEO catalogue cohérent. Un produit accessible en runtime mais absent du sitemap ne peut pas être considéré comme correctement distribué à l'international.

La suite `npm test` passe dans le mode mémoire. C'est un bon signal de discipline logicielle, pas une preuve de production : il faut un job séparé qui interroge la vraie base, la vraie build et un environnement de préproduction.

---

# 3. Ce que KURLA fait bien

## 3.1 Les vraies forces

### 1. Une base de données conceptuelle plus ambitieuse que le catalogue

KURLA a compris qu'une recommandation ne doit pas être seulement : « peau grasse → produit A ». Le modèle prévoit type de peau, hydratation, sensibilité, préoccupations, objectifs, budget, préférences, environnement, phototype et historique.

### 2. Une bonne intuition sur la mélanine

Le produit distingue correctement, au moins dans le discours et le diagnostic :

- couleur perçue et réaction au soleil ;
- phototype et besoins individuels ;
- hyperpigmentation et simple « éclaircissement » ;
- risque d'agression et risque de marques ;
- SPF invisible/whitecast et recommandation générique.

C'est beaucoup plus sérieux que de réduire une peau foncée à une catégorie marketing.

### 3. La transparence ingrédients et conflits

Le graphe d'ingrédients, les fonctions CosIng, les restrictions, les sources et les incompatibilités sont de bonnes briques. Le marché parle beaucoup de personnalisation mais explique rarement pourquoi deux produits ne devraient pas être superposés.

### 4. Le coût comme dimension de confiance

Le calcul de coût de routine et les paliers de routine sont une excellente idée. La promesse « cette routine coûte X € et comporte Y étapes » est plus utile qu'un score IA spectaculaire.

### 5. Des garde-fous IA sérieux

Le code possède :

- une réponse structurée ;
- une sélection de produits limitée au catalogue ;
- une divulgation de l'usage de l'IA ;
- un triage pour les urgences et demandes médicales ;
- une demande de revue humaine ;
- un historique avec consentement.

### 6. Une culture de test inhabituelle pour une jeune plateforme

Les tests d'autorisation, catalogue, stock, routines adaptatives, profil, phototype, confidentialité et routes sont un actif d'exécution. Le point à corriger n'est pas l'absence de tests, mais la tendance à tester des capacités mémoire alors que le risque principal est maintenant la vérité des données live.

---

# 4. Ce qui empêche KURLA d'être une référence mondiale

## Les cinq décalages structurants

### A. Le code est en avance sur l'assortiment

Un moteur de recommandation sophistiqué sur 3 produits ne produit pas une personnalisation mondiale. Il produit un classement de 3 choix précommandables.

### B. La donnée produit n'est pas assez riche pour soutenir les promesses

Les filtres actif, phototype, texture et fini existent dans le code. En production, les champs `metadata` nécessaires ne sont pas renseignés sur les 3 produits observés. Le filtre « phototype VI » risque donc de laisser passer des produits non documentés et le filtre « fini mat » ne peut pas être fiable.

### C. La photo n'est pas encore de l'intelligence

KURLA stocke des photos privées et propose une comparaison manuelle. Cela répond à la confidentialité et au suivi subjectif. Cela ne mesure pas les taches, la texture, l'hydratation ou une évolution avec un protocole reproductible.

### D. Le moteur n'est pas encore une boucle d'apprentissage globale

Il existe des pondérations explicables et un apprentissage de préférences individuelles. Il n'existe pas encore une cohorte longitudinale suffisante, un protocole expérimental, une mesure de qualité par phototype et un réentraînement validé.

### E. La production est encore en pré-lancement

Précommande, stock nul, visuels illustratifs, placeholders et build sans credentials sont des signaux de chantier — pas des défauts honteux. Mais ils rendent prématurée toute prétention de leadership mondial.

---

# 5. Benchmark mondial : pourquoi les utilisateurs choisissent les autres

Les acteurs ci-dessous ne sont pas tous des concurrents directs. Certains sont des distributeurs, d'autres des fournisseurs de technologie ou des services de téléd dermatologie. Leur comparaison sert à comprendre les attentes que KURLA doit dépasser.

## 5.1 Sephora — découverte, communauté, conversion omnicanale

**Pourquoi les utilisateurs y vont :** largeur de choix, confiance de marque, avis, fidélité, contenu, magasins, essais virtuels et capacité à passer de l'inspiration à l'achat.

Sephora propose actuellement un outil Smart Skin Scan présenté comme un outil IA de détection des besoins avec recommandations personnalisées, accessible aux Beauty Insiders [1](https://www.sephora.com/beauty/skin-analysis-tool). Son avantage principal n'est pas seulement le scan : c'est la combinaison catalogue + communauté + compte client + transaction.

**KURLA peut faire mieux sur :** la neutralité de recommandation, le coût réel, les conflits d'actifs, l'hyperpigmentation post-inflammatoire et la transparence des limites.

**KURLA ne peut pas faire semblant d'avoir déjà :** la profondeur de catalogue, le volume d'avis et la puissance omnicanale de Sephora.

## 5.2 Ulta Beauty — le benchmark de la transformation en panier

**Pourquoi les utilisateurs y vont :** assortiment large, promotions, points, magasins, shade matching et expérience visuelle. GLAMlab permet d'essayer virtuellement de nombreux produits et teintes [1](https://www.ulta.com/innovation/glamlab/).

**Leçon :** l'IA n'est pas la proposition de valeur finale. Elle doit réduire l'hésitation et augmenter la confiance avant achat.

## 5.3 Boots / No7 — le pont entre technologie, conseiller et magasin

No7 combine questionnaire, analyse de teinte, préférences, essai AR et un dispositif Pro Derm Scan. Le dispositif revendique une analyse de 20 millions de zones cutanées par scan et fait intervenir un conseiller pour transformer le résultat en régime et produits [2](https://www.boots.com/brands/brands-n/no7/no7-pro-derm-scan).

**Leçon pour KURLA :** si elle construit de la photo, elle doit également construire le protocole, l'explication et le passage vers un humain. Une image plus un score ne suffisent pas.

## 5.4 Douglas — profil, catalogue et IA conversationnelle à grande échelle

Douglas a lancé en 2026 l'assistant IA ANNA en Allemagne, avec un déploiement progressif et une ambition internationale. Le système s'appuie sur les données de plus de 64 millions de membres Beauty Card, le profil beauté, le type de peau et le catalogue pour répondre et recommander [2](https://douglas.group/en/newsroom/press-releases/douglas-group-elevates-digital-shopping-experience-with-ai-powered-beauty-advisor-chatbot-anna).

**Leçon :** un assistant devient puissant quand il est branché sur un grand historique client, une donnée produit propre et un assortiment réel. Le LLM n'est pas le moat.

## 5.5 Olive Young — le benchmark du scan répété et de l'omnicanal

SKIN SCAN, basé sur ChoiceDx, relie appareil en magasin, analyse, application, historique et recommandations. Les éléments documentés incluent six catégories de résultat et la comparaison entre scans ; ChoiceTech rapporte plus d'un million d'utilisations et un déploiement d'environ 60 magasins avec extension prévue [1](https://www.choicedx.com/en/post/olive-young-skin-scan-ai-platform-choicetech-1).

**Leçon la plus importante :** la valeur n'est pas le premier diagnostic. C'est la trajectoire : scan initial, routine, nouveau scan, comparaison, adaptation.

## 5.6 Perfect Corp. — le fournisseur de technologie à intégrer, pas à imiter immédiatement

Perfect Corp. propose une API de skin analysis qui couvre jusqu'à 14 préoccupations, avec photo/caméra, scores, overlays, support développeur et conformité annoncée HIPAA/GDPR [1](https://www.perfectcorp.com/business/blog/ai-skincare/skin-analysis-api) ; sa documentation produit indique également le suivi dans le temps et la possibilité d'utiliser les scores pour des rapports d'évolution [4](https://yce.perfectcorp.com/features/skin-analysis-api).

**Leçon :** acheter une brique peut faire gagner 12 à 18 mois. Mais l'intégrer telle quelle ne crée aucun moat. Il faut l'utiliser comme baseline puis mesurer spécifiquement les performances de KURLA sur les phototypes IV–VI, la lumière, les téléphones et les préoccupations réellement utiles à KURLA.

## 5.7 Curology — le benchmark de la personnalisation médicalisée

Curology combine questionnaire, photos, historique, revue par un professionnel licencié, prescription et suivi. La marque explique que chaque patient est associé à un professionnel médical et que les formules sont ajustées lorsque les objectifs évoluent [3](https://curology.com/blog/why-custom-skincare-by-real-people-is-better-curology-providers-arent-bots/) [4](https://curology.com/).

**Leçon :** si KURLA reste cosmétique, elle doit arrêter de se comparer implicitement à une télédermatologie. Elle peut offrir une orientation et un réseau de professionnels, mais elle ne doit pas suggérer une prescription qu'elle ne fournit pas.

## 5.8 Skin + Me — le benchmark de la cadence et de l'abonnement

Skin + Me associe consultation en ligne, trois selfies, équipe de dermatologie, formule personnalisée et livraison mensuelle [4](https://www.skinandme.com/info/support/getting-started/what-is-skin-me/).

**Leçon :** la personnalisation est crédible parce qu'elle évolue et parce qu'une équipe humaine assume la décision. KURLA doit reproduire la cadence d'apprentissage, pas la dimension médicale.

## 5.9 Lookfantastic — le benchmark de l'assistant catalogue

Lookfantastic présente un AI Skin Expert capable de comprendre les besoins, de construire une routine ou de compléter une routine existante, avec une base annoncée d'un million de visages [3](https://www.lookfantastic.com/c/health-beauty/face/ai-skin-expert/).

**Leçon :** KURLA devra démontrer que ses réponses ne sont pas uniquement plus chaleureuses, mais plus fiables, plus explicables et plus adaptées aux contraintes de budget, d'actifs et de phototype.

## 5.10 YesStyle — le benchmark de la découverte par contenu

Le Beauty Quiz de YesStyle promet de relier type de peau, causes des préoccupations, actifs et routine [1](https://www.yesstyle.com/en/beauty-consultation.html).

**Leçon :** le questionnaire reste utile pour démarrer. KURLA doit le compléter par des preuves et un suivi, pas le mépriser.

---

# 6. Matrice concurrentielle mondiale

Échelle : **0 absent**, **1 basique**, **2 solide**, **3 avancé**, **— non comparable**. Cette matrice compare l'expérience publique et le modèle stratégique, pas la qualité clinique de chaque algorithme.

| Dimension | KURLA live | Sephora | Ulta | Boots/No7 | Douglas | Olive Young | Perfect Corp | Curology / Skin+Me | Leader actuel |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Catalogue achetable | **1** | 3 | 3 | 3 | 3 | 3 | — | 1–2 | Sephora/Ulta |
| Questionnaire | 2 | 2 | 2 | 2 | 2 | 2 | — | 2 | Égalité |
| Analyse photo consommateur | **0** | 2 | 1–2 | 3 | 2 | 3 | 3 | 2 | Perfect/No7 |
| Analyse multi-indicateurs | **0** | 1–2 | 1 | 3 | 2 | 3 | 3 | 1–2 | Perfect/Olive |
| Scan répété dans le temps | **1** | 1 | 1 | 2 | 1 | 3 | 2 | 3 | Olive/Skin+Me |
| Phototype exploité | 2 | 2 | 2 | 3 | 2 | 2 | 2–3 | 1–2 | No7/Perfect |
| Personnalisation déclarative | 3 | 2 | 2 | 2 | 3 | 2 | — | 3 | KURLA/Douglas |
| Moteur explicable | 2 | 1 | 1 | 2 | 2 | 1–2 | — | 2 | KURLA potentiel |
| Routine étape par étape | 2–3 | 2 | 3 | 3 | 2 | 3 | 2 | 3 | Ulta/Olive |
| Ajustement humain | **0–1** | 2 | 2 | 3 | 1 | 1 | — | 3 | Curology/Skin+Me |
| Ingrédients et incompatibilités | **3 potentiel / 1 live** | 1–2 | 1 | 1–2 | 2 | 1 | 1 | 2 | KURLA potentiel |
| Comparateur | 2 | 2–3 | 2–3 | 1 | 2 | 1 | — | 0 | Sephora/Ulta |
| Coût de routine | **3** | 1 | 1 | 1 | 1 | 1 | — | 2 | KURLA |
| Avis / preuve sociale | 1 | 3 | 3 | 2 | 3 | 3 | — | 2–3 | Sephora/Ulta/Douglas |
| Communauté | 1 | 3 | 2–3 | 1 | 2 | 2–3 | 2 | 1 | Sephora |
| Réseau de professionnels | 2 | 2 | 2 | 3 | 1–2 | 2 | — | 3 | Curology/Boots |
| Spécialisation mélanine prouvée | **1 discours / 0 preuve** | 1 | 1 | 2 | 1 | 1–2 | non démontré publiquement | 1 | **Personne** |
| Internationalisation | 1 | 3 | 1–2 | 2 | 3 | 3 | 3 | 1 | Douglas/Perfect |
| Mobile/omnicanal | 2 | 3 | 3 | 2–3 | 3 | 3 | — | 2 | Sephora/Ulta/Olive |

## Lecture de la matrice

- KURLA ne perd pas parce qu'elle n'a pas 100 fonctionnalités.
- Elle perd parce que ses trois meilleures idées — coût, conflits, suivi — ne sont pas encore nourries par des données et un assortiment suffisants.
- La case **« spécialisation mélanine prouvée » est vide chez tout le monde**. C'est le véritable espace de différenciation.
- La caméra n'est pas le moat. C'est le ticket d'entrée technique ; la preuve de qualité sur les populations et situations mal servies est le moat.

---

# 7. Score KURLA /100

| Dimension | Score | Pourquoi |
|---|---:|---|
| Technologie produit | 62 | Architecture propre, API, tests et données structurées ; pas de vision/ML propriétaire |
| Diagnostic | 55 | 5/12 étapes express, 12/12 complet, phototype avec consentement ; pas de photo analysée |
| Base de connaissance | 38 | 3 profils atteignables ; couverture encore très loin d'une ontologie peau mondiale |
| Personnalisation | 50 | profil riche, budget, préférences, environnement ; plusieurs champs ne pilotent pas encore le live catalogue |
| IA | 42 | assistant structuré, garde-fous, catalogue contraint ; pas de vision ni apprentissage global validé |
| Catalogue peau | **15** | 3 produits live, tous en précommande, aucune profondeur par besoin |
| Qualité des données produit | 35 | INCI présents sur les 3 live ; metadata phototype/fini/origine absentes dans l'API observée |
| Recommandation | 48 | scoring et alternatives ; filtres dépendants de metadata manquantes et risque de règles divergentes |
| Routines | 55 | tiers, coûts, étapes, conflits ; composants placeholders et couverture réelle limitée |
| UX/UI | 64 | expérience soignée, pages dédiées, express mobile ; répétitions et dead-ends catalogue |
| Mobile/performance | 58 | PWA et code splitting ; chunk admin lourd, diagnostic long et SEO catalogue fragile |
| Suivi | 50 | observance, journal, ressenti, photo/slider ; pas de mesure objective de résultat |
| Contenu | 52 | guides peau et ingrédients ; profondeur, sourçage et traduction à industrialiser |
| Communauté | 30 | tuyauterie et pages ; peu de preuve d'activité et de contenu utilisateur vivant |
| Professionnels | 45 | 6 profils peau et trust score ; réseau, spécialités et disponibilité à prouver |
| Confiance scientifique | 32 | prudence éditoriale ; aucune validation KURLA publiée ni comité identifiable comme instance de validation |
| Internationalisation | 28 | FR/EN partiel, IA 4 langues ; pas d'offre localisée par pays, réglementation, prix et climat |
| Innovation défendable | 55 | excellente direction : mélanine, coût, whitecast, conflits ; aucun actif encore difficile à copier |

# **SCORE GLOBAL : 45/100**

### Interprétation

- **0–30 :** concept ou démo ;
- **31–50 :** produit fonctionnel mais non leader ;
- **51–70 :** offre nationale crédible ;
- **71–85 :** acteur international spécialisé ;
- **86–100 :** référence démontrée, avec données, résultats et distribution.

KURLA est à la fin de la phase « produit fonctionnel » et au début de la phase « offre crédible ». Elle n'est pas en retard d'une fonctionnalité : elle est en retard de preuve, de catalogue et d'alignement production.

---

# 8. Les 10 lacunes critiques

## 🔴 C1 — La promesse commerciale dépasse le catalogue live

- **Manque :** une offre peau réellement achetable, variée et livrable.
- **Constat code/prod :** 3 produits peau live, tous en précommande ; le reste est cible, placeholder ou migration.
- **Pourquoi c'est critique :** une recommandation qui finit dans un produit indisponible détruit la confiance.
- **À construire :** 25 SKUs réellement sourcés pour le premier marché, puis 60–80 après preuve de demande ; pas 80 formulations théoriques.
- **Difficulté :** élevée en opérations, moyenne en code.
- **Impact :** maximal sur conversion, réachat et crédibilité.

## 🔴 C2 — Il n'y a pas d'analyse photo, seulement de la gestion photo

- **Manque :** capture standardisée et analyse non médicale des préoccupations cosmétiques.
- **Ce qui existe :** upload privé, rétention, journal et slider manuel.
- **À construire :** d'abord un protocole photo reproductible + qualité d'image + comparaison ; ensuite une API d'analyse comme baseline, calibrée et auditée sur IV–VI.
- **Difficulté :** élevée.
- **Risque :** lancer une fausse précision ou un outil médical implicite.

Les outils du marché savent déjà fournir des scores et overlays sur de nombreuses préoccupations [1](https://www.perfectcorp.com/business/blog/ai-skincare/skin-analysis-api). KURLA doit donc entrer par la qualité de données et la transparence, pas par la simple présence d'une caméra.

## 🔴 C3 — La personnalisation n'est pas encore reliée de bout en bout à la donnée live

- **Manque :** chaque filtre affiché doit reposer sur une metadata renseignée, validée et testée.
- **Constat :** les produits live n'exposent pas `metadata` phototype/texture/fini ; dans `BoutiquePage`, l'absence de metadata fait passer certains produits par défaut.
- **À construire :** catalogue data contract, taux de complétude obligatoire, fallback explicite `information non renseignée` au lieu de `pass`.
- **Difficulté :** moyenne.

## 🔴 C4 — La vérité produit et le statut de publication sont mélangés

- **Manque :** distinction technique stricte entre idée, formulation cible, échantillon, lot testé, produit commercialisé, précommande et SKU livrable.
- **Constat :** le générateur range des fiches avec `catalog_status = published` alors que les validations sont `pending` et les visuels `illustrative` ; les kits contiennent des placeholders.
- **À construire :** machine à états de publication fail-closed et tests de cohérence migration/API/checkout.
- **Difficulté :** moyenne.
- **Impact :** confiance, droit de la consommation, risque de paiement et de réputation.

## 🔴 C5 — Aucune preuve KURLA de performance sur les peaux riches en mélanine

La littérature récente montre que des systèmes dermatologiques obtiennent de meilleures performances sur les phototypes I–III que IV–VI ; une méta-analyse rapporte AUROC 0,89 contre 0,82 [1](https://www.mdpi.com/1648-9144/61/12/2186), et des travaux sur le dataset DDI montrent des écarts de sensibilité sur les peaux foncées, avec amélioration après fine-tuning sur des données diversifiées [3](https://www.science.org/doi/10.1126/sciadv.abq6147).

- **Manque :** validation externe KURLA, jeu de test séparé, métriques par phototype et lumière.
- **À construire :** protocole non médical pour analyse cosmétique, comité externe, test IV/V/VI équilibré, publication des limites.
- **Difficulté :** très élevée.
- **Impact :** c'est la seule base défendable du positionnement mondial.

## 🟠 C6 — Le suivi mesure surtout l'activité, pas le résultat

- **Manque :** lien causal prudent entre routine, observance, tolérance et évolution.
- **Ce qui existe :** cases matin/soir, streak, ressenti 1–5, préoccupations, photos et slider.
- **À construire :** protocole J0/J30/J90, même lumière, mêmes zones, consentement, annotation humaine et incertitude. Ne jamais transformer un slider en preuve d'efficacité.
- **Difficulté :** moyenne à élevée.

## 🟠 C7 — Le moteur de recommandation a plusieurs sources de vérité

On trouve un moteur générique, `skinRecommendation`, `skinRoutine`, `peauKits`, la base de connaissance, des fallback UI et des besoins dupliqués dans des pages. `SkinLandingPage` maintient par exemple sa propre liste de besoins alors que `skinTaxonomy.ts` est censé être la source unique.

- **Risque :** le diagnostic, le ranking, la routine et le SEO peuvent parler de besoins différents.
- **À construire :** un contrat canonique `SkinProduct`, `SkinNeed`, `SkinEvidence`, puis des adaptateurs uniques.
- **Difficulté :** moyenne.

## 🟠 C8 — Les filtres existent visuellement avant d'être data-complets

- `phototype` : si la metadata manque, le produit passe ;
- `fini` : si la metadata manque, le filtre n'exclut rien ;
- `actif` : la page possède une logique regex, mais le scoring de `skinRecommendation.ts` ajoute l'actif demandé dans les actifs analysés, ce qui peut donner un bonus à un produit qui ne le contient pas ;
- `texture` : fallback lexical fragile.

**À construire :** tests contractuels sur chaque filtre avec vrais produits et cas négatifs obligatoires.

## 🟠 C9 — La crédibilité professionnelle est nominale, pas encore un réseau

Six profils peau visibles est un début. Ce n'est pas encore un réseau mondial : pas de densité géographique, pas de preuve de disponibilité, pas de mesure de qualité des consultations, pas de spécialité standardisée par pays.

- **À construire :** taxonomie de compétences, vérification documentaire différenciée esthétique/dermatologie, disponibilité, avis vérifiés, SLA de réponse, orientation hors périmètre cosmétique.

## 🟠 C10 — L'internationalisation est une traduction de surface

Le code prévoit FR/EN pour le chrome, quatre langues côté assistant et trois routes anglaises réellement indexables. Il manque :

- catalogue et prix par pays ;
- devise, TVA, livraison, retours ;
- restrictions d'ingrédients et claims locaux ;
- climat, UV et habitudes ;
- support et professionnels locaux ;
- traduction de toutes les pages et du contenu produit.

Une expansion internationale doit commencer par un pays maîtrisé, pas par une page `/en`.

---

# 9. Les white spaces que KURLA peut réellement prendre

## W1 — Le premier parcours HPI de référence, sans promesse d'éclaircissement

Le marché parle de « dark spots » et de « brightening ». KURLA peut posséder une catégorie pédagogique et produit : inflammation → marque → prévention → routine douce → délai réaliste → réévaluation.

## W2 — Le SPF invisible testé sur des peaux réelles

Ne pas dire seulement « invisible ». Publier une note de whitecast par phototype, texture, lumière du jour, réapplication et sous-ton. Les tests doivent être reproductibles et rémunérer les contributrices.

## W3 — Le moteur d'évitement de l'agression

La plupart des moteurs optimisent le nombre d'actifs. KURLA peut optimiser : moins de produits, introduction progressive, tolérance, conflits et risque d'irritation. C'est une philosophie utile et défendable.

## W4 — L'audit de routine multi-marques

L'utilisateur colle sa routine actuelle ou scanne ses produits. KURLA détecte doublons, conflits, étapes manquantes, parfum, budget et produit déjà possédé. C'est une excellente porte d'entrée même sans acheter chez KURLA.

## W5 — Le coût réel et le coût d'abandon

Afficher : prix initial, coût mensuel déclaré, coût par usage, nombre d'étapes, temps quotidien et coût d'une routine abandonnée. Une routine plus courte peut être meilleure business si elle est suivie.

## W6 — La routine qui suit le climat sans sur-réagir

Le changement de saison, humidité, chauffage, eau et UV peuvent modifier le confort. KURLA peut proposer une adaptation légère, mais doit éviter de produire une nouvelle routine chaque semaine sans preuve.

## W7 — La transparence de l'incertitude

Une carte « ce que nous savons / ce qui est déclaré / ce qui n'est pas vérifié / quand consulter » peut être plus différenciante qu'un score de 94/100.

## W8 — Un réseau de praticiens réellement formés aux peaux pigmentées

Pas un annuaire générique relabellisé. Un réseau dont les compétences, formations, preuves et limites sont visibles.

## Ce que KURLA ne doit pas faire

- prétendre diagnostiquer l'acné, le mélanome ou une pathologie ;
- déduire une origine ethnique d'une photo ;
- recommander un actif uniquement parce qu'il est populaire ;
- publier des formulations cibles comme si elles étaient des produits fabriqués ;
- fabriquer des avis ou photos avant/après ;
- faire du « phototype V–VI safe » sans protocole de test ;
- construire une communauté vide juste pour cocher une case.

---

# 10. Spécificité des peaux riches en mélanine

## Ce qui est juste dans l'approche actuelle

KURLA a raison de ne pas utiliser la carnation comme raccourci. Le diagnostic demande une réaction au soleil et le modèle sépare :

- type de peau ;
- sensibilité ;
- acné et imperfections ;
- HPI et marques post-inflammatoires ;
- phototype ;
- besoin de SPF sans trace.

## Ce qui manque encore

| Sujet | État KURLA | Chantier nécessaire |
|---|---|---|
| Phototype | recueilli avec consentement | le propager partout et mesurer le taux de consentement/refus |
| HPI | bien présente dans textes et règles | protocole de suivi non médical, zones et sévérité déclarée |
| SPF whitecast | heuristique lexicale | test par lot, formule, phototype, lumière, sous-ton |
| Images | visuels catalogue génériques | galerie de vraies textures et teintes avec consentement |
| Analyse photo | absente | baseline fournisseur + audit IV/V/VI |
| Données longitudinales | photos et ressentis | cohorte consentie, métriques, rétention et biais |
| Actes professionnels | orientation textuelle | spécialités HPI et formation vérifiée |
| Contenu | guides prometteurs | sources, relecture experte, mises à jour et traduction |

Le principal risque est de passer d'une sous-représentation à une nouvelle simplification : « peau riche en mélanine = routine unique ». La personnalisation doit être croisée, pas identitaire.

---

# 11. Analyse IA / Beauty Tech

## 11.1 Niveau actuel

L'architecture actuelle est :

```text
Réponses déclarées + profil
        ↓
Règles / score explicable / base de connaissance
        ↓
Routine, produits, garde-fous ingrédients
        ↓
Assistant conversationnel avec catalogue contraint
        ↓
Journal, feedback et observance
```

C'est mieux qu'un simple quiz, mais ce n'est pas encore :

```text
Photo standardisée + données déclarées + contexte
        ↓
Analyse calibrée et auditée par phototype
        ↓
Recommandation avec incertitude et alternatives
        ↓
Observance + tolérance + résultat déclaré/mesuré
        ↓
Réévaluation contrôlée
        ↓
Apprentissage validé, jamais automatique sans garde-fou
```

## 11.2 Ce qu'il faut construire, dans le bon ordre

1. **Data contract catalogue** : INCI, actif, concentration si vérifiée, texture, fini, parfum, whitecast, phototype testé, pays, preuve et date.
2. **Moteur explicable canonique** : une seule fonction qui reçoit profil + catalogue + contraintes.
3. **Photo Quality Gate** : lumière, cadrage, distance, filtres, maquillage, exposition.
4. **Baseline computer vision** : intégrer un fournisseur ou modèle pour obtenir un point de comparaison ; pas encore un moat.
5. **Evaluation interne** : erreur par phototype, appareil, lumière, zone et préoccupation.
6. **Suivi** : score d'incertitude, comparaison temporelle, tolérance, observance.
7. **Apprentissage** : uniquement sur feedback consenti, avec cohortes, versioning et rollback.
8. **Assistant contextuel** : profil, étagère, budget, contraintes, pays, historique — sans inventer de preuve.

## 11.3 Règles non négociables

- jamais de diagnostic médical ;
- pas de « score de santé » présenté comme mesure clinique ;
- sortie « image inexploitable » plutôt qu'un résultat inventé ;
- disclaimer visible avant et après analyse ;
- consentement séparé pour photo, phototype et réutilisation à des fins d'amélioration ;
- suppression et export réellement testés ;
- revue humaine pour les cas hors cadre ;
- publication des résultats par phototype, pas seulement moyenne globale.

---

# 12. Parcours utilisateurs simulés

| Utilisateur | KURLA répond-elle ? | Ce qui fonctionne | Point de rupture |
|---|---|---|---|
| 1. Débutante | Partiellement | express mobile, contenu, routine Essentielle, coût | 3 produits en précommande ; trop de vocabulaire actif ; pas d'achat immédiat |
| 2. Grasse + imperfections | Partiellement | profil acné, prévention HPI, conflits | pas de vraie gamme acné disponible ; pas de suivi objectivé ; la routine complète peut manquer de produits |
| 3. Taches + teint uniforme | Conceptuellement oui | HPI, SPF, niacinamide/azélaïque dans la gamme cible | produits anti-taches non live ; aucune mesure J0/J90 ; promesse à prouver |
| 4. Sensible + routine simple | Oui sur l'intention, non sur l'exécution | sans parfum, mode Essentielle, gardes | risque de surcharge : les pages affichent 5/9/12 étapes alors que la personne veut moins |
| 5. Experte cherchant un produit précis | Non suffisamment | recherche, actif, comparateur, INCI | catalogue minuscule, metadata incomplètes, pas de vraie comparaison de concentrations/preuves |
| 6. Routine avec 50 € | Meilleur cas | coût, paliers et optimisation budgétaire | le kit Équilibré à 62 € n'est pas un budget 50 €, les composants ne sont pas tous live |
| 7. Professionnel près de chez soi | Partiellement | 6 pros peau et profils géographiques | disponibilité, spécialité, qualité de preuve et maillage international insuffisants |

## Cas critique : Fatou, 28 ans, phototype V, peau mixte sensible, HPI, sans parfum, budget moyen

Le parcours cible est bien spécifié dans `docs/PLAN_P0_KURLA_PEAU_2026-09-11.md`. Mais au jour de l'audit :

1. diagnostic : faisable ;
2. phototype : faisable et consentable ;
3. profil HPI : faisable ;
4. boutique sans parfum : faisable avec 3 produits ;
5. routine de 5 soins : principalement théorique ;
6. achat : précommande, pas stock réceptionné ;
7. shelf/journal : faisable, mais résultat subjectif ;
8. réassort : non prouvé par une cohorte réelle.

**Le parcours est donc fonctionnel en démonstration et incomplet en commerce réel.**

---

# 13. Parcours découverte → achat → suivi

| Étape | Note | Diagnostic |
|---|---:|---|
| Découverte | 4/5 | positionnement mélanine clair, pages et guides présents |
| Compréhension | 3/5 | très bon vocabulaire, mais promesse de personnalisation supérieure à la profondeur live |
| Diagnostic | 3/5 | express/complet, phototype ; pas de photo analysée |
| Recherche | 2/5 | moteur et filtres présents, data produits trop courte |
| Recommandation | 2/5 | explicable, mais peu de choix et possible fallback trompeur |
| Comparaison | 3/5 | page dédiée, utile dès que le catalogue grandit |
| Routine | 3/5 | tiers/coûts/conflits, mais placeholders |
| Achat | 1/5 | précommande, stock nul, sourcing non finalisé |
| Utilisation | 3/5 | consignes, fréquence et observance |
| Suivi | 2/5 | journal, ressenti et photo manuelle |
| Réévaluation | 1/5 | pas encore une vraie boucle de recommandation fondée sur résultat |
| Réachat | 1/5 | pas encore démontré par métriques live |

### Les trois principales fuites

1. **Le passage routine → panier** : la routine contient des composants non disponibles ou des prix cibles.
2. **Le passage filtre → vérité produit** : metadata absente, certains filtres deviennent permissifs par défaut.
3. **Le passage résultat → preuve** : le journal montre une évolution, mais ne peut pas établir que la routine l'a causée.

---

# 14. Le moat recommandé — KURLA Evidence OS

## Positionnement

> **KURLA Evidence OS : l'infrastructure de choix et de suivi cosmétique la plus transparente et la mieux évaluée pour les peaux riches en mélanine.**

Ce n'est pas une promesse de diagnostic. C'est une infrastructure de confiance.

## Les cinq actifs cumulatifs

1. **Product Evidence Graph** : chaque produit possède une source, un INCI, une date, une juridiction, une allégation autorisée, un niveau de preuve, des tests de texture/whitecast et des limites.
2. **Melanin Skin Cohort** : données opt-in, longitudinales, diversifiées, rémunérées et séparées des données marketing.
3. **Routine Outcome Loop** : routine prescrite au sens cosmétique, observance, tolérance, coût, ressenti, évolution déclarée et décision suivante.
4. **Professional Trust Network** : professionnels formés, compétences vérifiées, orientation responsable et avis de prestations réelles.
5. **Public Evaluation** : performances par phototype et environnement publiées, y compris les limites.

## Pourquoi ce moat est plus solide qu'une app photo

Un concurrent peut acheter le même SDK de vision. Il ne peut pas racheter en un week-end :

- trois ans de données consenties ;
- un protocole de capture reproductible ;
- des tests whitecast IV–VI ;
- une ontologie HPI ;
- un historique d'observance et de tolérance ;
- une réputation née de la transparence.

## Ce qu'il ne faut pas appeler moat

- un assistant LLM ;
- un quiz ;
- une liste de 15 besoins ;
- un score sans test ;
- un catalogue KURLA fermé ;
- une expertise déclarée mais non mesurée.

---

# 15. KURLA Skin 2030

## V1 — aujourd'hui

Plateforme peau structurée : diagnostic déclaratif, phototype consenti, trois profils de connaissance, moteur à règles, routines, coût, comparateur, ingrédients, assistant, journal et professionnels. **3 produits peau live en précommande. Score 45/100.**

## V2 — parité avec les meilleurs spécialistes

- 25–40 produits réels dans un premier marché ;
- 100 % INCI, métadonnées et provenance complètes ;
- comparateur et alternatives fiables ;
- routine minimale, budget, actifs et conflits ;
- 6–10 professionnels peau réellement actifs ;
- journal J0/J30/J90 ;
- achat et livraison réels ;
- anglais produit complet sur un marché choisi ;
- baseline analyse photo non médicale avec protocole.

**Objectif : 65–70/100.**

## V3 — dépasser les meilleurs

- parcours HPI de référence ;
- lab SPF invisible avec tests publics ;
- audit de routine multi-marques ;
- adaptation climat/saison contrôlée ;
- cohorte longitudinale opt-in ;
- évaluation par phototype publiée ;
- moteur adaptatif avec incertitude et rollback ;
- communauté centrée sur la progression, pas seulement les avis.

**Objectif : 80–85/100.**

## World Leader

KURLA devient l'endroit où :

- les consommatrices comprennent la peau sans être médicalisées ;
- les marques doivent apporter des preuves produit ;
- les professionnels spécialisés sont trouvables ;
- les phototypes IV–VI ne sont pas une note de bas de page ;
- l'utilisateur sait ce qu'il paie, ce qu'il utilise, ce que le système sait et ce qu'il ignore ;
- les données de performance sont publiées, auditables et réutilisables par des partenaires scientifiques.

---

# 16. Roadmap 0–24 mois

## Priorité 0 — 0 à 4 semaines : vérité et conversion

| Chantier | Livrable | Critère de sortie |
|---|---|---|
| P0.1 Environnement parity | endpoint/version + commit déployé + smoke live | dépôt, build et prod identifiables sans ambiguïté |
| P0.2 Catalogue truth layer | états `draft`, `target`, `sample`, `verified`, `preorder`, `available` | aucun produit target avec statut achetable |
| P0.3 3 SKUs actuels | sourcing, CPNP/RP/CPSR et preuves SPF selon pays | 3 fiches réellement commercialisables ou explicitement waitlist |
| P0.4 Metadata contract | actif, texture, fini, parfum, whitecast, phototype testé, pays, preuve/date | 100 % des produits visibles ont toutes les données nécessaires ou affichent « non documenté » |
| P0.5 Fix filtres | supprimer les fallbacks permissifs ; corriger le bonus actif | tests positifs et négatifs sur chaque filtre |
| P0.6 SEO live | credentials Supabase au build ou génération sécurisée | sitemap produit/ingrédient non vide et vérifié en préprod |
| P0.7 Kit integrity | aucun kit pseudo-produit sans composants réels | checkout impossible si un composant n'est pas achetable |

## Priorité 1 — 1 à 3 mois : rendre l'offre crédible

| Chantier | Valeur utilisateur | Complexité |
|---|---|---:|
| 20–25 SKUs sourcés en FR | choix réel sans catalogue obèse | M/H opérations |
| 15 fiches ingrédients peau | compréhension et SEO | M |
| comparateur coût/usage/preuves | achat rationnel | M |
| routine minimale 3 étapes | débutants et sensibles | F |
| audit de routine actuelle | acquisition sans vente forcée | M |
| avis vérifiés et questions produits | preuve sociale | M |
| trust score professionnel différencié | confiance | M |
| dashboard funnel peau | pilotage | F/M |

**Jalon :** une personne peut faire diagnostic → routine ≤ budget → produit réellement livrable → suivi sans dead-end.

## Priorité 2 — 3 à 6 mois : posséder une catégorie

| Chantier | Résultat attendu |
|---|---|
| HPI as a first-class journey | catégorie HPI structurée, non médicale, avec délais et prévention |
| SPF Invisible Lab | 10–15 tests phototypes IV–VI avec protocole et photos consenties |
| routine conflict engine multi-marques | détection complète des actifs déjà possédés |
| coût d'usage réel | rendement déclaré, coût mensuel, coût par usage |
| calendrier J0/J30/J90 | observance, confort, évolution déclarée |
| contenus revus par comité | sources, date, niveau de preuve et limites |
| 10–20 pros spécialisés | disponibilité, spécialité, avis de prestation |

**Jalon :** KURLA est citée pour une catégorie précise : SPF sans whitecast et routine HPI prudente.

## Priorité 3 — 6 à 12 mois : photo et boucle de données

| Chantier | Dépendance | Critère |
|---|---|---|
| Photo Quality Gate | protocole capture | 90 % des photos exploitables sans filtre |
| baseline vision fournisseur | P0 data contract | résultat non médical, incertitude et fallback |
| benchmark IV/V/VI | cohorte consentie + relecteurs | métriques par phototype et lumière publiées |
| analyse multi-zones | baseline validée | zones front/joues/nez/menton, pas de diagnostic |
| boucle feedback | journal et achats | feedback lié à une routine/version |
| adaptation routine | historique suffisant | rollback et explication de chaque changement |
| optimisation budgétaire | catalogue complet | routine minimale et routine budget toujours disponibles |

## Priorité 4 — 12 à 24 mois : expansion et moat

1. publier la première étude de performance KURLA ;
2. constituer une cohorte France + Afrique francophone + diaspora, sans réduire la diversité à une géographie ;
3. ouvrir le Royaume-Uni ou les Pays-Bas, un pays à la fois, avec conformité et logistique ;
4. localiser catalogue, prix, TVA, claims, support et contenu ;
5. proposer des outils B2B aux marques et professionnels sans revendre les données individuelles ;
6. créer un programme de contribution rémunérée et gouverné ;
7. envisager une formulation propriétaire uniquement après validation de la demande et du suivi.

---

# 17. Les 20 fonctionnalités prioritaires à construire

| Rang | Fonctionnalité | Priorité | Effort | KPI / acceptation |
|---:|---|---|---:|---|
| 1 | Truth layer produit | P0 | M | 0 fiche target payable |
| 2 | 20–25 SKUs peau réels | P0 | H ops | ≥3 options sur 10 besoins clés |
| 3 | INCI + provenance + pays + preuves | P0 | M | 100 % fiches complètes |
| 4 | Metadata canonique peau | P0 | M | actifs/texture/fini/whitecast renseignés |
| 5 | Correction filtres peau | P0 | F | tests négatifs sur chaque filtre |
| 6 | Kit integrity/checkout | P0 | M | aucun placeholder dans un panier |
| 7 | Sitemap catalogue live | P0 | F | URLs produits >0 en build |
| 8 | Routine minimale 3 étapes | P1 | F | parcours sensible sans surcharge |
| 9 | Comparateur coût/usage/preuve | P1 | M | coût mensuel uniquement si rendement déclaré |
| 10 | Audit routine multi-marques | P1 | M | conflits + doublons + étapes manquantes |
| 11 | Avis vérifiés | P1 | M | uniquement commandes/prestations vérifiées |
| 12 | HPI journey | P1 | M | prévention, routine, délai, limites |
| 13 | SPF Invisible Lab | P1 | H ops | tests IV–VI documentés |
| 14 | Journal J0/J30/J90 | P1 | M | timeline et consentement clairs |
| 15 | Photo Quality Gate | P2 | M | rejet photos non comparables |
| 16 | Baseline vision non médicale | P2 | H | benchmark par phototype |
| 17 | Moteur adaptatif versionné | P2 | H | raison et rollback de chaque adaptation |
| 18 | Réseau pros spécialisé | P2 | H ops | 10 profils actifs et disponibilité visible |
| 19 | Dashboard data/funnel | P0 | M | diagnostic→routine→panier→commande→réachat |
| 20 | Localisation pays par pays | P3 | H | pays ouvert seulement après checklist légale/logistique |

---

# 18. Les 10 innovations réellement différenciantes

1. **Melanin Skin Benchmark public** : publier la performance par phototype et lumière, au lieu d'une moyenne marketing.
2. **SPF Invisible Lab** : notation expérimentale whitecast, texture, réapplication et sous-ton.
3. **HPI Journey** : prévention de l'inflammation, patience, routines minimales et orientation pro.
4. **Routine Aggression Index** : score explicable de complexité, irritation potentielle et conflits ; jamais présenté comme score médical.
5. **Audit de routine multi-marques** : aide même si l'utilisateur n'achète pas chez KURLA.
6. **Cost-to-follow** : coût, nombre d'étapes, temps, fréquence et probabilité d'abandon déclarée.
7. **Photo Protocol at Home** : cadrage et lumière standardisés avant toute analyse ; la qualité de mesure avant l'IA.
8. **Evidence Card produit** : INCI, source, date, test, niveau de confiance, pays et ce qui n'a pas été vérifié.
9. **Professionnels pigmentés vérifiés** : spécialités et preuves adaptées, pas une simple liste de salons.
10. **Données contributrices rémunérées** : partage opt-in, compensation, gouvernance, retrait et publication agrégée des résultats.

---

# 19. Les questions les plus difficiles d'un investisseur

## 1. Combien de produits peau pouvez-vous réellement vendre demain ?
**Réponse actuelle :** trois en précommande, zéro stock physique, gamme complémentaire encore cible.
**Réponse à construire :** un tableau public de SKUs achetables, pays, délai, stock et preuve de conformité.

## 2. Votre IA analyse-t-elle une peau ?
**Réponse actuelle :** non. Elle analyse des réponses et des métadonnées ; les photos sont stockées/comparées manuellement.
**Réponse à construire :** oui pour des indicateurs cosmétiques limités, avec incertitude, protocole et résultats par phototype.

## 3. Qu'avez-vous de propriétaire ?
**Réponse actuelle :** architecture, taxonomie et logique, mais pas encore de données différenciantes.
**Réponse à construire :** cohorte longitudinale, tests SPF/whitecast, protocoles, résultats et graphe de preuves.

## 4. Comment prouvez-vous votre expertise mélanine ?
**Réponse actuelle :** textes, filtres, phototype et professionnels ; pas de benchmark KURLA.
**Réponse à construire :** étude externe avec IV/V/VI, méthodologie publiée et limites.

## 5. Êtes-vous une marketplace, une marque ou une télédermatologie ?
**Réponse recommandée :** aujourd'hui une plateforme cosmétique de recommandation, de compréhension et de suivi, avec orientation vers des professionnels ; pas un service de diagnostic médical.

## 6. Pourquoi ne pas acheter Perfect Corp. et vous arrêter là ?
**Réponse :** l'intégrer peut accélérer le ticket photo, mais le fournisseur n'est pas le moat. KURLA doit posséder le protocole, la mesure, les données et la preuve sur les cas mal servis.

## 7. Comment savez-vous qu'une routine fonctionne ?
**Réponse actuelle :** observance, ressenti et photos manuelles ; pas causalité ni mesure clinique.
**Réponse à construire :** résultats déclarés standardisés, suivi long, cohortes, transparence sur l'incertitude.

## 8. Quelle est votre économie unitaire ?
**Réponse actuelle :** plusieurs plans de prix et de sourcing ; pas de preuve live suffisante sur CAC, conversion, marge, retour et réachat peau.
**Réponse à construire :** dashboard par pays et par routine, avec précommande séparée du stock.

## 9. Peut-on vous faire confiance sur les produits et les claims ?
**Réponse actuelle :** garde-fous présents, mais formulations cibles, visuels illustratifs et statut de publication encore trop proches dans le modèle.
**Réponse à construire :** publication fail-closed, dossier de conformité par SKU et audit indépendant.

## 10. Que se passe-t-il si Sephora ou Douglas copie votre positionnement ?
**Réponse :** si KURLA ne possède qu'un slogan, elle perd. Si elle possède un réseau de données longitudinales, un benchmark mélanine, des preuves SPF et un moteur de confiance, la copie marketing ne suffit plus.

---

# 20. Verdict final et ordre exact des chantiers

## Ce qu'il ne faut pas faire maintenant

- ne pas commencer par entraîner un modèle propriétaire ;
- ne pas ouvrir dix pays ;
- ne pas lancer une communauté vide ;
- ne pas publier 13 formulations cibles comme une gamme ;
- ne pas acheter de la technologie photo avant d'avoir un protocole de données ;
- ne pas compter des tests mémoire comme preuve de production ;
- ne pas ajouter de nouvelles pages avant de fermer le tunnel d'achat.

## Ce qu'il faut faire dans cet ordre

### 1. Rendre la vérité produit impossible à contourner
Séparer draft, formulation cible, précommande, produit conforme et produit livrable. Corriger les kits et les metadata.

### 2. Rendre les trois premiers produits irréprochables
Conformité, sourcing, SPF, visuels, provenance, délais, pays, retours et checkout réellement cohérents.

### 3. Passer de 3 à une profondeur utile — pas seulement à un gros nombre
Construire 20–25 SKUs avec trois choix minimum sur chaque besoin prioritaire et des données complètes.

### 4. Brancher réellement les filtres et le moteur sur les données
Le système doit pouvoir dire « je ne sais pas » ; il ne doit jamais traiter une metadata absente comme une compatibilité.

### 5. Construire le HPI/whitecast lab
C'est la première différenciation mondiale crédible et opérationnelle.

### 6. Construire le suivi avant la vision avancée
Une photo standardisée et comparable vaut mieux qu'une analyse IA impressionnante mais non validée.

### 7. Valider, publier, puis seulement apprendre
La preuve publique et les métriques par phototype précèdent le moat.

## Conclusion

> **KURLA n'a pas besoin de devenir plus grosse que Sephora. Elle doit devenir plus fiable là où Sephora, les marketplaces et les outils IA restent génériques.**
>
> Aujourd'hui, KURLA possède la bonne intuition, une architecture supérieure à son niveau de traction et plusieurs briques remarquables. Mais le monde ne reconnaît pas une référence à son code : il la reconnaît à la profondeur de son offre, à la vérité de ses résultats, à la qualité de ses données et à la confiance qu'elle mérite.
>
> **Le chantier prioritaire n'est donc pas “ajouter l'IA”. C'est “rendre la promesse vraie, mesurable et achetable”.**

---

## Sources benchmark sélectionnées

- Perfect Corp., Skin Analysis API : [perfectcorp.com/business/blog/ai-skincare/skin-analysis-api](https://www.perfectcorp.com/business/blog/ai-skincare/skin-analysis-api) ; [yce.perfectcorp.com/features/skin-analysis-api](https://yce.perfectcorp.com/features/skin-analysis-api)
- Sephora Smart Skin Scan : [sephora.com/beauty/skin-analysis-tool](https://www.sephora.com/beauty/skin-analysis-tool)
- Ulta GLAMlab : [ulta.com/innovation/glamlab](https://www.ulta.com/innovation/glamlab/)
- Boots / No7 Pro Derm Scan : [boots.com/brands/brands-n/no7/no7-pro-derm-scan](https://www.boots.com/brands/brands-n/no7/no7-pro-derm-scan)
- Douglas ANNA : [douglas.group/en/newsroom/press-releases/douglas-group-elevates-digital-shopping-experience-with-ai-powered-beauty-advisor-chatbot-anna](https://douglas.group/en/newsroom/press-releases/douglas-group-elevates-digital-shopping-experience-with-ai-powered-beauty-advisor-chatbot-anna)
- Olive Young / ChoiceDx : [choicedx.com/en/post/olive-young-skin-scan-ai-platform-choicetech-1](https://www.choicedx.com/en/post/olive-young-skin-scan-ai-platform-choicetech-1)
- Curology : [curology.com/blog/why-custom-skincare-by-real-people-is-better-curology-providers-arent-bots](https://curology.com/blog/why-custom-skincare-by-real-people-is-better-curology-providers-arent-bots/) ; [curology.com](https://curology.com/)
- Skin + Me : [skinandme.com/info/support/getting-started/what-is-skin-me](https://www.skinandme.com/info/support/getting-started/what-is-skin-me/)
- Lookfantastic AI Skin Expert : [lookfantastic.com/c/health-beauty/face/ai-skin-expert](https://www.lookfantastic.com/c/health-beauty/face/ai-skin-expert/)
- YesStyle Beauty Quiz : [yesstyle.com/en/beauty-consultation.html](https://www.yesstyle.com/en/beauty-consultation.html)
- Méta-analyse sur les écarts de performance selon le phototype : [mdpi.com/1648-9144/61/12/2186](https://www.mdpi.com/1648-9144/61/12/2186)
- DDI, disparités des modèles dermatologiques sur peaux foncées : [science.org/doi/10.1126/sciadv.abq6147](https://www.science.org/doi/10.1126/sciadv.abq6147)
- Règlement cosmétique européen et mises à jour : [single-market-economy.ec.europa.eu/sectors/cosmetics/legislation_en](https://single-market-economy.ec.europa.eu/sectors/cosmetics/legislation_en)

**Note :** les sources concurrentielles décrivent les fonctionnalités et annonces publiques des acteurs ; elles ne constituent pas une validation indépendante de leurs performances commerciales ou cliniques. Les chiffres de KURLA dans cet audit proviennent du dépôt audité, du build et des endpoints publics observés le 10/09/2026.
