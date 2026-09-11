# C6 — clôture de l’instrumentation lancement France & traction

**Date du contrôle :** 11 septembre 2026  
**Cohorte :** `france-2026`  
**Décision :** instrumentation C6 opérationnelle ; lancement terrain non commencé et aucune traction inventée.

## 1. Ce qui est livré

Le cockpit admin `/api/admin/launch/traction` calcule les métriques depuis les tables serveur et expose `available: false` lorsque la source est absente. Il ne transforme donc pas une absence de données en « zéro utilisateur » implicite.

Sont instrumentés :

- passage waitlist → invitation → acceptation → activation des testeurs ;
- invitations transactionnelles sans stockage de token ;
- entretiens hebdomadaires avec référence participant minimisée ;
- partenariats professionnels, activation Salon OS et routine co-signée ;
- NPS 0–10 sans commentaire libre ;
- MAU, Shelf, observations, diagnostic → achat, retours, D30 et avis vérifiés ;
- k-anonymat des résultats par archétype avant publication.

Les routes d’écriture sont réservées aux administrateurs : invitations, statuts testeurs, entretiens, partenariats et NPS.

## 2. État réellement mesuré dans Supabase

Les tables C6 sont présentes côté distant : `launch_leads`, `launch_interviews`, `launch_partner_links`, `launch_nps_responses`, ainsi que les tables de profils, Shelf, observations, commandes, retours et avis.

| Indicateur contrôlé | Valeur distante | Interprétation |
|---|---:|---|
| Leads lancement France | 0 | aucune inscription de cohorte actuellement |
| Entretiens | 0 | aucun entretien planifié ou terminé |
| Partenariats | 0 | aucun partenaire C6 enregistré |
| Réponses NPS | 0 | aucune réponse exploitable |
| Observations de résultat | 0 | aucune donnée d’usage |
| Lignes Shelf | 0 | aucun Shelf rempli |
| Avis vérifiés approuvés | 0 | aucun avis vérifié |

Les objectifs de 300 testeurs, 10 entretiens/semaine, 10 partenaires, 1 000 MAU, 300 Shelf, 1 000 observations et D30 ≥ 25 % restent donc **ouverts**. Ils ne sont pas des résultats de code et ne doivent pas être présentés comme atteints.

## 3. Règles de lancement

- Ne pas semer de comptes, leads, entretiens, NPS, Shelf ou observations de démonstration dans la base de production.
- Ne pas appeler « actif » un testeur dont aucune activité serveur n’est enregistrée.
- Ne pas publier de résultat par archétype avant le seuil d’anonymat prévu.
- Ne pas déduire la conversion, la rétention ou le NPS à partir de zéros artificiels.
- Les 300 testeurs doivent venir de la waitlist France réelle, puis être invités et activés via le cockpit.

## 4. Prochaines actions opérationnelles

1. Recruter les premiers inscrits France via les canaux validés ;
2. inviter un premier petit groupe, vérifier l’email transactionnel et suivre l’activation ;
3. planifier les 10 premiers entretiens hebdomadaires ;
4. contacter les 10 professionnelles et enregistrer uniquement leur statut opérationnel ;
5. recueillir les premiers NPS et observations après usage ;
6. ne communiquer une métrique qu’avec sa source et sa fenêtre temporelle.

C6 est prêt à mesurer. Il n’est pas encore validé par la traction : cette validation dépend de données utilisateurs réelles.
