# 05 — Architecture IA : ce qui est rule-based, ce qui est IA, ce qui est hybride

> Principe directeur (règle de la plateforme) : **l'IA formule, les règles décident.**
> L'IA ne doit pas être partout parce qu'elle est possible : elle apporte de la
> valeur dans le langage, pas dans le verdict. Tout verdict produit/sécurité est
> rule-based et explicable.

---

## 1. Inventaire exact de l'IA (vérifié dans le code)

**Modèle** : Google Gemini `gemini-3.5-flash` — configurable (`GEMINI_MODEL`,
fallback `GEMINI_MODEL_FALLBACK`). **Côté serveur uniquement** : la clé n'existe que
dans l'environnement serveur ; le bundle navigateur est vérifié sans secret.

| Endpoint | Rôle de l'IA | Rôle des règles |
|----------|--------------|-----------------|
| `POST /api/ai/assistant` (30 req/min) | Assistant beauté conversationnel (FR/EN/ES/PT) | **Catalogue contraint** : l'IA ne « voit » que des produits publiés projetés (prix, besoins, disponibilité) — elle ne peut pas inventer de produit ; **triage médical** avant tout appel ; JSON validé ; sources citées ; disclaimer constant |
| `POST /api/ai/routine-result` (20 req/min) | Rédige le résultat du diagnostic (résumé, routine, justification) **à partir de 5 candidats déjà retenus par les règles** | 100 % du verdict est rule-based : `kurlaFit` (adéquation), besoins déclarés, **garde-fou de domaine** (un diagnostic peau ne retient que des produits porteurs d'un besoin peau — correction C-07 testée), budget filtrant, triage médical court-circuite l'IA (`requiresHumanReview: true`, `generatedWithAI: false`) ; sans client IA → **fallback déterministe** (`source: 'fallback'`) |
| `POST /api/recommendations` | — (aucun appel IA) | Moteur v2 complet : profil, Shelf, observations, ingrédients évités (abandons), budget, juridiction, incompatibilités, produits possédés — chaque ajustement de score est traçable |
| `POST /api/ai/support-draft` | Brouillon de mail de support (admin) | L'envoi reste l'action humaine |
| Sessions | — | `/api/ai/history` (lecture seule), `/api/ai/feedback` (notation 1–5), `/api/ai/human-review` (revue marquée par un admin), `/api/ai/disclosure` (transparence : ce que l'IA est et n'est pas) |

**Données utilisées par l'IA** : profil de l'utilisateur (autorisant, authentifié),
questions de l'utilisateur, catalogue publié projeté (5 candidats max dans le
diagnostic), cartes de connaissance sourcées. **Produites** : texte (résumé,
routine, justification), identifiants de produits **déjà validés par les règles**,
session persistée (historique), feedback, revue humaine.

**Limites documentées** (exposées par `/api/ai/disclosure`) : pas de diagnostic
médical, pas de prescription, les recommandations sont cosmétiques et fondées sur
les déclarations de l'utilisateur ; triage d'urgence → oriente vers un professionnel.

## 2. Ce qui est RULE-BASED (et doit le rester)

| Système | Fichier | Pourquoi pas d'IA |
|---------|---------|-------------------|
| Scoring cheveux `kurlaFit` | `src/lib/kurlaFit.ts` | `score: null` plutôt qu'une note inventée — la confiance de la marque repose sur l'absence de score factice ; un modèle régresserait ce contrat |
| Scoring peau | `src/lib/skinRecommendation.ts` | Règles explicites testées : incompatibilités d'actifs (rétinol×AHA bloquant…), whitecast phototype V–VI, boost HPI, sensibilité/parfum — chaque score a des raisons lisibles |
| Moteur de recommandation v2 | `src/lib/recommendationEngine.ts` | Orchestration du contexte réel (possédés, évités, juridiction) ; « le feedback réordonne, il n'autorise jamais » |
| Conflits de routine | `src/lib/routineConflicts.ts` + `ingredientGraph.ts` | Sécurité : calculée sur l'usage réel (Shelf) |
| Triage médical | `src/server/ai/assistant.ts → medicalTriage` | Mot-clefs d'urgence → réponse humaine, sans IA |
| Publiabilité catalogue (7 validations) | `catalogStore.ts` | Gouvernance : une IA ne publie jamais un produit |
| TVA / juridictions / compliance | `vat.ts`, `jurisdiction.ts`, `compliance.ts` | Droit : aucune tolérance à l'hallucination |
| Prix / stock / paiement | `orderStore.ts`, `checkoutVat.ts` | Argent : le serveur est l'autorité |

## 3. Ce qui est HYBRIDE (IA + règles) — le pattern à généraliser

**Le pattern du diagnostic** (`/api/ai/routine-result`) est la référence :

```
questions utilisateur
   → règles : profil normalisé, besoins, kurlaFit sur le catalogue,
     garde-fou de domaine, budget, triage médical
   → règles : ≤ 5 candidats retenus (slugs)
   → IA : rédige résumé + routine + justifications À PARTIR des slugs retenus
   → règles : validation du JSON (produits inconnus refusés),
     disclaimer, sources, generatedWithAI: true (étiqueté), revue humaine possible
```

**L'IA ne choisit rien** : elle exprime. Si le JSON cite un produit hors liste,
il est rejeté. Le fallback déterministe garantit le service sans IA.

## 4. Ce qui n'est PAS de l'IA (et doit être nommé comme tel)

- `semanticSearch.ts` : parsing d'intent sur lexique — déterministe, testé. Ce n'est
  pas un embedding : c'est un dictionnaire. (Un embedding pourrait venir plus tard
  pour la recherche floue à grande échelle — doc 10 — sans changer le contrat.)
- L'archétype (`archetype.ts`) : k-anonymat des profils — statistique, pas IA.
- Le Trust Score catalogue/pros : score de gouvernance calculé sur des statuts —
  jamais une « note IA ».

## 5. Arbitrage recommandé pour les prochains chantiers

| Besoin futur | Décision | Raison |
|--------------|----------|--------|
| Recherche floue / sémantique à grande échelle | **Hybride** : règles d'abord (lexique), embedding en second ressort | La détermination d'abord ; l'embedding n'ajoute que de la tolérance |
| Analyse photo (cuir chevelu / HPI) | **Pas d'IA maintenant** — P3, et seulement comme aide déclarée avec consentement explicite + revue, jamais comme diagnostic | Le moat de KURLA est la donnée consentie et la prudence, pas la caméra (audit stratégique 10/09) ; l'AIPD (règlement AI Act) encadre déjà les photos du journal |
| Personnalisation par apprentissage | **Rule-based apprenant** : le feedback (outcomes, abandons) réordonne les poids — sans modèle entraîné | Les poids appris restent bornés par les règles de sécurité ; auditable ; RGPD (données du seul utilisateur) |
| Copilote admin (sourcing, facturation) | **IA** (brouillons) — l'action reste humaine | Zéro risque client, gain d'opérationnel |
| Traductions | **IA en production assistée** : propositions → validation humaine → dictionnaire typé (le compilateur verrouille la parité FR/EN) | Le dictionnaire typé est le garde-fou qui autorise l'IA à produire |

## 6. Garde-fous transversaux (tous testés)

1. Clé IA jamais côté client (audit de bundle + `src/server/ai/client.ts`).
2. Rate limiting dédié (30 et 20 req/min) — l'IA est le endpoint le plus coûteux.
3. Catalogue contraint : l'IA ne connaît que des produits réellement publiés.
4. Triage médical avant génération ; urgence = réponse humaine sans IA.
5. `generatedWithAI` toujours affiché quand l'IA a écrit (résultat de diagnostic).
6. Feedback utilisateur (1–5) + revue humaine persistée — la boucle d'amélioration
   existe et est lisible.
7. Disclaimer constant (`AI_DISCLAIMER`) dans toutes les réponses IA.
