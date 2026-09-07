# KURLA — SYSTÈME OPÉRATIONNEL DE PÉNÉTRATION & D'EXPANSION

> Ce document n'est PAS la stratégie (elle existe déjà dans `PLAN_CONQUETE_KURLA.md`).
> Il documente **la machine de pénétration** intégrée dans l'admin
> (Business Control Center → onglet **« Pénétration & expansion »**), et l'audit
> de l'existant sous l'angle pénétration. Source de vérité des chiffres :
> `src/lib/penetration.ts` ; interface : `src/components/PenetrationCommandCenter.tsx`.

## Règle de posture
Aucun marché/segment n'est ouvert par ambition. Chaque niveau est **chiffré, daté,
assigné, mesurable** et **conditionné par un critère de validation**. On ne passe
au suivant que lorsque le critère est atteint sur des données réelles. Les chiffres
non encore mesurés sont des **hypothèses explicites** (avec test + seuil + délai),
jamais présentés comme des faits.

## Audit de l'existant (sous l'angle pénétration)
| Élément | Statut | Décision |
|---|---|---|
| Beachhead 4C IdF/Lyon, kits K02/K03, diagnostic | Soutient la pénétration ciblée | **CONSERVER** |
| Paliers 100/1k/10k/50k + 8 conditions d'expansion | Bons mais génériques (objectifs volume) | **MODIFIER** → escalier de pénétration chiffré (part de marché, CAC, réachat, budget, canaux, équipe, critères GO/PIVOT) |
| Vagues Europe/Afrique | Séquencées mais descriptives | **MODIFIER** → une fiche marché par pays (segment d'entrée, offre, prix, canal, partenaires, budget test, seuil succès/échec, déclencheur) |
| Roadmap M0→M36 | Temporelle, pas assez « actions semaine » | **DÉVELOPPER** → plan hebdomadaire S1–S12 « quoi faire lundi » |
| Funnel théorique (causes d'abandon) | Utile comme référentiel | **CONSERVER** en bas de l'entonnoir réel |
| Entonnoir réel (leads→paniers→commandes→kits→réachat) | Mesure le volume, pas encore la **profondeur** par segment | **DÉVELOPPER** → KPI de part de marché + alertes planifié/réel |
| « Faire du social / des influenceurs » | Trop générique | **REMPLACER** → 5 canaux des 100 premiers = 25+20+20+20+15, avec scripts, CTA, budgets, mesures |
| Reco kits, add-ons, parrainage 10/10, relance panier | Leviers AOV/rétention déjà livrés | **CONSERVER** (ce sont les outils de la pénétration) |

## Les 6 paliers de l'escalier (détail dans le dashboard)
100 (M0–2) → 1 000 (M3–6) → 10 000 (M7–18) → 50 000 (M19–36) → 100 000 (M37–54) → 1 M (M55–84).
Chaque palier porte : part de marché visée, CA mensuel, AOV, conversion, réachat, CAC max,
budget, nouveaux clients/mois, contenus/sem., créateurs, partenaires, équipe, fonctionnalités,
marchés, **porte de passage** et **critère d'échec → pivot**.

## Séquence géographique sans faille
- **France** : micro-segment 4C IdF/Lyon (test) → 4C national (validation) → segments adjacents bouclées/protectrices/kids/hommes (scale).
- **Europe** : V1 Belgique/Luxembourg (FR, €, test 1 500 €) → V2 Royaume-Uni (EN, £) → V3 Allemagne/Pays-Bas. Un pays à la fois.
- **Afrique** : sourcing karité Ghana dès M3 (indépendant des ventes) → V2 Afrique du Sud premium 3PL + Sénégal/Côte d'Ivoire distributeur/marketplace/mobile money → V3 Nigeria via Jumia/Konga.
- **Monde** : diaspora + Amérique du Nord + Moyen-Orient, via marketplace, seulement après 100 k et 3 continents.

## Équations du modèle (calculatrice interactive dans l'admin)
- Visiteurs ciblés = clients ÷ taux de conversion
- Diagnostics = visiteurs × 35 % (le diagnostic est l'aimant)
- Budget pénétration = clients × CAC
- CA (1ère commande) = clients × AOV

## État réel au démarrage
1 commande payante (14,80 €), AOV sous la cible 42 €, Stripe en TEST.
→ Le dashboard place KURLA en **Semaine 1–2, palier 100, phase TEST du marché fr-1** et
génère les alertes + actions correspondantes (Stripe live, exécuter les 5 canaux).
