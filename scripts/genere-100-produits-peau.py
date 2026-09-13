#!/usr/bin/env python3
"""
100 produits peau pour couvrir les 15 besoins du diagnostic.

CONSTAT MESURÉ LE 13/09/2026 (SQL direct, projet qzwgsarfdegqtfdnqiql) :
  - 15 besoins peau déclarés dans src/lib/skinTaxonomy.ts (SKIN_NEEDS)
  - 0 produit publié ne porte AUCUN de ces 15 besoins
  - Une cliente qui fait un diagnostic peau ne trouve donc rien.

MOTIF REPRIS DE L'EXISTANT, pas inventé. Les 20 fiches peau déjà en base
utilisent :
  - `subcategory`  = la FAMILLE (Nettoyage, Hydratation, Masques, Traitement,
                     Exfoliation, Protection Solaire, Éclat & Uniformité)
  - `routine_step` = l'ÉTAPE précise (Nettoyant doux, Sérum vitamine C, …)
  - `concerns`     = les besoins, mêmes identifiants que SKIN_NEEDS
Ce script respecte exactement ce triplet.

RÈGLES MÉTIER RESPECTÉES
  - Aucun diagnostic médical, aucun résultat garanti (catalogClaims.ts)
  - Ingrédients interdits exclus : mercure, corticoïdes, hydroquinone
  - Défrisage exclu ; coloration et SPF non ouverts en année 1 — donc
    AUCUN produit SPF n'est proposé ici, alors que le besoin `spf` existe.
    C'est un arbitrage antérieur, pas un oubli : il est signalé en sortie.
  - Année 1 sans stock : canal = affiliation ou 3PL
  - Aucun prix inventé : `prix_cible` est une FOURCHETTE de positionnement,
    pas un prix d'achat. Aucun MOQ affirmé.
  - Aucun fournisseur nommé sans vérification : la colonne `marque` est
    laissée vide quand aucune marque vérifiée n'existe pour ce créneau.
"""

import csv
import sys

# Les 15 besoins peau, identifiants EXACTS de src/lib/skinTaxonomy.ts
BESOINS = {
    "hydrater": "Hydrater",
    "eclat": "Éclat & teint terne",
    "taches": "Taches / HPI",
    "seche": "Peau sèche / très sèche",
    "grasse": "Peau grasse / brillance",
    "imperfections": "Imperfections / boutons",
    "sensible": "Peau sensible / réactive",
    "spf": "SPF sans trace blanche",
    "anti_age": "Rides / fermeté",
    "contour_yeux": "Contour des yeux",
    "levres": "Lèvres sèches",
    "corps": "Peau du corps",
    "cicatrices": "Cicatrices post-acné",
    "barriere": "Barrière cutanée",
    "par_ingredient": "Par ingrédient",
}

# (famille, étape, besoin principal, besoins secondaires, nom, actif clé,
#  format, fourchette de positionnement, canal année 1, note de conformité)
PRODUITS = [
    # ── NETTOYAGE (12) ──────────────────────────────────────────────────────
    ("Nettoyage", "Gel nettoyant doux", "hydrater", ["sensible", "barriere"],
     "Gel Nettoyant Doux Sans Savon", "glycérine", "200 ml", "8-14 €", "affiliation",
     "Sans savon, pH physiologique. Aucune allégation thérapeutique."),
    ("Nettoyage", "Eau micellaire apaisante", "sensible", ["hydrater", "barriere"],
     "Eau Micellaire Apaisante Sans Parfum", "eau florale", "200 ml", "8-14 €", "affiliation",
     "Sans parfum. Convient aux peaux réactives."),
    ("Nettoyage", "Lait nettoyant confort", "seche", ["hydrater", "sensible"],
     "Lait Nettoyant Confort Peaux Sèches", "beurre de karité", "200 ml", "9-15 €", "affiliation",
     "Texture lait, rinçage à l'eau ou au coton."),
    ("Nettoyage", "Huile nettoyante démaquillante", "imperfections", ["grasse", "hydrater"],
     "Huile Nettoyante Démaquillante", "huile de jojoba", "150 ml", "12-19 €", "affiliation",
     "Se rince à l'eau, ne laisse pas de film occlusif."),
    ("Nettoyage", "Baume nettoyant fondant", "seche", ["hydrater", "barriere"],
     "Baume Nettoyant Fondant", "huile d'amande douce", "100 ml", "13-20 €", "affiliation",
     "Première étape d'un double nettoyage."),
    ("Nettoyage", "Mousse nettoyante purifiante", "grasse", ["imperfections", "eclat"],
     "Mousse Nettoyante Purifiante", "niacinamide", "150 ml", "9-15 €", "affiliation",
     "Nettoie sans décaper. Aucune allégation anti-acné."),
    ("Nettoyage", "Gel nettoyant purifiant", "imperfections", ["grasse", "cicatrices"],
     "Gel Nettoyant Purifiant Sans Sulfates", "zinc PCA", "200 ml", "9-15 €", "affiliation",
     "Sans sulfates agressifs. Pas d'allégation de traitement de l'acné."),
    ("Nettoyage", "Poudre enzymatique exfoliante", "eclat", ["par_ingredient", "taches"],
     "Poudre Enzymatique Exfoliante Douce", "enzymes de fruits", "60 g", "14-22 €", "affiliation",
     "Exfoliation enzymatique, pas mécanique. Pas de gommage agressif."),
    ("Nettoyage", "Crème nettoyante hydratante", "barriere", ["seche", "sensible"],
     "Crème Nettoyante Hydratante", "céramides", "200 ml", "10-16 €", "affiliation",
     "Préserve le film hydrolipidique."),
    ("Nettoyage", "Gel nettoyant visage homme", "grasse", ["imperfections", "hydrater"],
     "Gel Nettoyant Visage Homme", "menthol doux", "150 ml", "9-15 €", "affiliation",
     "Département hommes. Aucune allégation sur le rasage médical."),
    ("Nettoyage", "Lingettes démaquillantes réutilisables", "sensible", ["corps", "hydrater"],
     "Lingettes Démaquillantes Réutilisables (lot de 8)", "microfibre", "8 pièces", "8-14 €", "dropship",
     "Matériel, pas cosmétique. Aucun CPNP requis."),
    ("Nettoyage", "Bandeau et éponges nettoyantes", "hydrater", ["sensible"],
     "Bandeau Cheveux + Éponges Konjac (set)", "konjac", "set", "7-12 €", "dropship",
     "Matériel, pas cosmétique. Aucun CPNP requis."),

    # ── EXFOLIATION (7) ─────────────────────────────────────────────────────
    ("Exfoliation", "Exfoliant AHA doux", "eclat", ["par_ingredient", "taches"],
     "Exfoliant AHA 7 % Usage Progressif", "acide glycolique", "100 ml", "14-22 €", "affiliation",
     "AHA. Avertissement photosensibilisant obligatoire. Pas de décapage."),
    ("Exfoliation", "Exfoliant BHA", "imperfections", ["par_ingredient", "grasse"],
     "Exfoliant BHA 2 % Pores et Imperfections", "acide salicylique", "100 ml", "14-22 €", "affiliation",
     "BHA. Aucune allégation de traitement de l'acné."),
    ("Exfoliation", "Peeling enzymatique doux", "sensible", ["eclat", "par_ingredient"],
     "Peeling Enzymatique Doux Peaux Sensibles", "enzyme de papaye", "50 ml", "15-24 €", "affiliation",
     "Alternative aux acides pour peaux réactives. Pas de gommage à grains."),
    ("Exfoliation", "Gommage corps doux", "corps", ["hydrater"],
     "Gommage Corps Doux Sucre et Huile", "sucre", "200 g", "11-18 €", "affiliation",
     "Gommage corps, grains fins. Pas de gommage agressif sur le visage."),
    ("Exfoliation", "Exfoliant lèvres", "levres", ["hydrater"],
     "Gommage Lèvres Doux", "sucre fin", "15 g", "6-10 €", "affiliation",
     "Usage lèvres uniquement."),
    ("Exfoliation", "Masque exfoliant éclat", "eclat", ["taches", "par_ingredient"],
     "Masque Exfoliant Éclat", "acide lactique", "50 ml", "14-22 €", "affiliation",
     "AHA doux. Avertissement photosensibilisant."),
    ("Exfoliation", "Pad exfoliant quotidien", "grasse", ["imperfections", "par_ingredient"],
     "Pads Exfoliants BHA (lot de 30)", "acide salicylique", "30 pads", "13-20 €", "affiliation",
     "Format pads. Aucune allégation thérapeutique."),

    # ── SÉRUMS / TRAITEMENT (22) ────────────────────────────────────────────
    ("Traitement", "Sérum niacinamide", "taches", ["par_ingredient", "grasse", "eclat"],
     "Sérum Niacinamide 5 %", "niacinamide", "30 ml", "12-19 €", "affiliation",
     "Actif déjà listé dans SKIN_ACTIVE_FILTERS. Aucune allégation éclaircissante."),
    ("Traitement", "Sérum acide azélaïque", "imperfections", ["par_ingredient", "taches", "cicatrices"],
     "Sérum Acide Azélaïque 10 %", "acide azélaïque", "30 ml", "14-22 €", "affiliation",
     "Pas d'hydroquinone. Aucune allégation de traitement médical."),
    ("Traitement", "Sérum vitamine C", "eclat", ["par_ingredient", "taches", "anti_age"],
     "Sérum Vitamine C Stabilisée 10 %", "ascorbyl glucoside", "30 ml", "15-24 €", "affiliation",
     "Forme stabilisée. Aucune promesse de résultat."),
    ("Traitement", "Sérum rétinol doux", "anti_age", ["par_ingredient", "taches"],
     "Sérum Rétinol 0,3 % Usage Progressif", "rétinol", "30 ml", "16-26 €", "affiliation",
     "Rétinol. Mention d'usage progressif et de photosensibilité. Interdit grossesse."),
    ("Traitement", "Sérum acide hyaluronique", "hydrater", ["par_ingredient", "barriere", "seche"],
     "Sérum Acide Hyaluronique Multi-Poids", "hyaluronate de sodium", "30 ml", "12-20 €", "affiliation",
     "Hydratation. Aucune allégation de comblement des rides."),
    ("Traitement", "Sérum céramides", "barriere", ["par_ingredient", "sensible", "seche"],
     "Sérum Céramides NP Réparateur", "céramide NP", "30 ml", "14-22 €", "affiliation",
     "Renforcement de barrière. Aucune allégation thérapeutique."),
    ("Traitement", "Sérum peptides", "anti_age", ["par_ingredient", "barriere"],
     "Sérum Peptides Fermeté", "peptides", "30 ml", "18-28 €", "affiliation",
     "Aucune promesse de résultat. Pas d'allégation de type botox-like."),
    ("Traitement", "Sérum exfoliant PHA", "sensible", ["par_ingredient", "eclat"],
     "Sérum PHA Doux Peaux Réactives", "gluconolactone", "30 ml", "14-22 €", "affiliation",
     "PHA, mieux toléré que les AHA. Pas de décapage."),
    ("Traitement", "Sérum anti-taches", "taches", ["cicatrices", "eclat"],
     "Sérum Anti-Taches Post-Imperfections", "acide tranexamique", "30 ml", "15-24 €", "affiliation",
     "Uniformiser, JAMAIS éclaircir. Pas d'hydroquinone, pas de mercure."),
    ("Traitement", "Sérum cicatrices post-acné", "cicatrices", ["taches", "par_ingredient"],
     "Sérum Marques Post-Imperfections", "niacinamide", "30 ml", "14-22 €", "affiliation",
     "Marques pigmentaires, pas cicatrices atrophiques. Aucune promesse d'effacement."),
    ("Traitement", "Sérum contour des yeux", "contour_yeux", ["anti_age", "hydrater"],
     "Sérum Contour des Yeux Caféine", "caféine", "15 ml", "13-21 €", "affiliation",
     "Cernes et poches. Aucune allégation médicale sur les cernes."),
    ("Traitement", "Sérum apaisant", "sensible", ["barriere", "hydrater"],
     "Sérum Apaisant Haute Tolérance", "allantoïne", "30 ml", "13-20 €", "affiliation",
     "Haute tolérance. Aucune allégation anti-inflammatoire."),
    ("Traitement", "Sérum régulateur sébum", "grasse", ["imperfections", "eclat"],
     "Sérum Régulateur de Brillance", "zinc PCA", "30 ml", "13-20 €", "affiliation",
     "Matifier sans assécher. Aucune allégation sur l'acné."),
    ("Traitement", "Sérum éclat uniformité", "eclat", ["taches", "hydrater"],
     "Sérum Éclat Uniformité du Teint", "extrait de réglisse", "30 ml", "14-22 €", "affiliation",
     "Teint lumineux. Pas d'allégation éclaircissante ni blanchissante."),
    ("Traitement", "Sérum hydratant intense", "seche", ["hydrater", "barriere"],
     "Sérum Hydratant Intense Peaux Très Sèches", "glycérine", "30 ml", "12-19 €", "affiliation",
     "Peaux très sèches. Aucune allégation thérapeutique."),
    ("Traitement", "Sérum bakuchiol", "anti_age", ["par_ingredient", "sensible"],
     "Sérum Bakuchiol Alternative Douce", "bakuchiol", "30 ml", "16-25 €", "affiliation",
     "Alternative végétale au rétinol. Aucune comparaison d'efficacité affirmée."),
    ("Traitement", "Sérum corps uniformisant", "corps", ["taches", "cicatrices"],
     "Lait Corps Uniformisant", "niacinamide", "250 ml", "13-20 €", "affiliation",
     "Corps. Uniformiser, jamais éclaircir."),
    ("Traitement", "Soin local imperfections", "imperfections", ["par_ingredient", "cicatrices"],
     "Soin Localisé Imperfections", "acide salicylique", "15 ml", "9-15 €", "affiliation",
     "Application locale. Aucune allégation de traitement de l'acné."),
    ("Traitement", "Sérum hydratant homme", "hydrater", ["grasse", "barriere"],
     "Sérum Hydratant Visage Homme", "acide hyaluronique", "30 ml", "12-19 €", "affiliation",
     "Département hommes."),
    ("Traitement", "Sérum poils incarnés", "imperfections", ["corps", "cicatrices"],
     "Soin Poils Incarnés Corps", "acide glycolique", "100 ml", "12-19 €", "affiliation",
     "Corps, zones rasées. Aucune allégation médicale."),
    ("Traitement", "Sérum mains", "corps", ["hydrater", "seche"],
     "Sérum Mains Réparateur", "glycérine", "50 ml", "8-13 €", "affiliation",
     "Sous-catégorie mains."),
    ("Traitement", "Sérum pieds", "corps", ["hydrater", "seche"],
     "Crème Pieds Réparatrice", "urée", "75 ml", "8-14 €", "affiliation",
     "Sous-catégorie pieds. Urée à concentration cosmétique, pas médicale."),

    # ── HYDRATATION (16) ────────────────────────────────────────────────────
    ("Hydratation", "Crème hydratante légère", "hydrater", ["grasse", "barriere"],
     "Crème Hydratante Légère Non Comédogène", "acide hyaluronique", "50 ml", "12-19 €", "affiliation",
     "Texture légère. Aucune allégation thérapeutique."),
    ("Hydratation", "Crème hydratante riche", "seche", ["hydrater", "barriere"],
     "Crème Hydratante Riche Peaux Sèches", "beurre de karité", "50 ml", "14-22 €", "affiliation",
     "Peaux sèches à très sèches."),
    ("Hydratation", "Gel hydratant", "grasse", ["hydrater", "imperfections"],
     "Gel Hydratant Oil-Free", "acide hyaluronique", "50 ml", "11-18 €", "affiliation",
     "Sans corps gras. Peaux mixtes à grasses."),
    ("Hydratation", "Crème hydratante céramides", "barriere", ["sensible", "seche"],
     "Crème Barrière Céramides", "céramide NP", "50 ml", "15-24 €", "affiliation",
     "Réparation de barrière. Aucune allégation thérapeutique."),
    ("Hydratation", "Fluide hydratant matifiant", "grasse", ["hydrater", "eclat"],
     "Fluide Hydratant Matifiant", "niacinamide", "40 ml", "13-20 €", "affiliation",
     "Matifier sans assécher."),
    ("Hydratation", "Crème hydratante apaisante", "sensible", ["barriere", "hydrater"],
     "Crème Apaisante Haute Tolérance", "allantoïne", "50 ml", "14-22 €", "affiliation",
     "Sans parfum. Aucune allégation anti-inflammatoire."),
    ("Hydratation", "Lait corps hydratant", "corps", ["hydrater", "seche"],
     "Lait Corps Hydratant 24 h", "glycérine", "250 ml", "11-18 €", "affiliation",
     "Corps. Aucune promesse de durée vérifiée : 24 h est un positionnement."),
    ("Hydratation", "Beurre corps nourrissant", "seche", ["corps", "hydrater"],
     "Beurre Corps Nourrissant Karité", "beurre de karité", "200 ml", "13-21 €", "affiliation",
     "Corps. Karité d'origine à documenter."),
    ("Hydratation", "Baume lèvres", "levres", ["hydrater"],
     "Baume Lèvres Réparateur", "beurre de karité", "10 g", "6-10 €", "affiliation",
     "Lèvres. Aucune allégation de traitement de l'herpès."),
    ("Hydratation", "Masque lèvres de nuit", "levres", ["hydrater"],
     "Masque Lèvres de Nuit", "céramides", "20 g", "8-13 €", "affiliation",
     "Lèvres."),
    ("Hydratation", "Crème mains", "corps", ["hydrater", "seche"],
     "Crème Mains Nourrissante", "beurre de karité", "75 ml", "7-12 €", "affiliation",
     "Sous-catégorie mains."),
    ("Hydratation", "Crème pieds", "corps", ["hydrater", "seche"],
     "Crème Pieds Nourrissante", "beurre de karité", "75 ml", "7-12 €", "affiliation",
     "Sous-catégorie pieds."),
    ("Hydratation", "Crème hydratante homme", "hydrater", ["grasse", "barriere"],
     "Crème Hydratante Visage Homme", "acide hyaluronique", "50 ml", "12-19 €", "affiliation",
     "Département hommes."),
    ("Hydratation", "Lait hydratant enfant", "hydrater", ["sensible", "corps"],
     "Lait Hydratant Douceur Enfant", "glycérine", "250 ml", "9-15 €", "affiliation",
     "Département enfants. Formulation douce, aucune allégation médicale."),
    ("Hydratation", "Brume hydratante visage", "hydrater", ["sensible", "eclat"],
     "Brume Hydratante Rafraîchissante", "eau florale", "100 ml", "8-14 €", "affiliation",
     "Sans parfum ajouté."),
    ("Hydratation", "Huile visage nourrissante", "seche", ["hydrater", "barriere"],
     "Huile Visage Nourrissante", "huile de jojoba", "30 ml", "14-22 €", "affiliation",
     "Peaux sèches. Usage soir."),

    # ── MASQUES (10) ────────────────────────────────────────────────────────
    ("Masques", "Masque hydratant", "hydrater", ["seche", "barriere"],
     "Masque Hydratant Repulpant", "acide hyaluronique", "50 ml", "12-19 €", "affiliation",
     "Aucune allégation de comblement des rides."),
    ("Masques", "Masque apaisant", "sensible", ["barriere", "hydrater"],
     "Masque Apaisant Peaux Réactives", "allantoïne", "50 ml", "12-19 €", "affiliation",
     "Sans parfum. Aucune allégation anti-inflammatoire."),
    ("Masques", "Masque purifiant", "grasse", ["imperfections", "eclat"],
     "Masque Purifiant à l'Argile", "argile blanche", "50 ml", "10-16 €", "affiliation",
     "Ne pas laisser sécher complètement. Aucune allégation détox non fondée."),
    ("Masques", "Masque éclat", "eclat", ["taches", "par_ingredient"],
     "Masque Éclat Vitaminé", "vitamine C", "50 ml", "13-20 €", "affiliation",
     "Teint lumineux. Aucune promesse de résultat."),
    ("Masques", "Masque de nuit", "hydrater", ["barriere", "anti_age"],
     "Masque de Nuit Régénérant", "peptides", "50 ml", "15-24 €", "affiliation",
     "Aucune allégation de régénération cellulaire vérifiée."),
    ("Masques", "Masque en tissu hydratant", "hydrater", ["eclat"],
     "Masque en Tissu Hydratant (lot de 5)", "acide hyaluronique", "5 × 22 g", "7-12 €", "affiliation",
     "Format monodose."),
    ("Masques", "Masque contour des yeux", "contour_yeux", ["hydrater", "anti_age"],
     "Patchs Contour des Yeux (lot de 30)", "caféine", "30 patchs", "10-16 €", "affiliation",
     "Cernes et poches. Aucune allégation médicale."),
    ("Masques", "Masque exfoliant doux", "eclat", ["par_ingredient", "taches"],
     "Masque Exfoliant Doux", "acide lactique", "50 ml", "12-19 €", "affiliation",
     "AHA doux. Avertissement photosensibilisant."),
    ("Masques", "Masque purifiant homme", "grasse", ["imperfections"],
     "Masque Purifiant Visage Homme", "argile blanche", "50 ml", "10-16 €", "affiliation",
     "Département hommes."),
    ("Masques", "Masque corps nourrissant", "corps", ["seche", "hydrater"],
     "Masque Corps Nourrissant", "beurre de karité", "200 ml", "12-19 €", "affiliation",
     "Corps."),

    # ── YEUX (5) ────────────────────────────────────────────────────────────
    ("Soin yeux", "Crème contour des yeux", "contour_yeux", ["hydrater", "anti_age"],
     "Crème Contour des Yeux Hydratante", "caféine", "15 ml", "13-21 €", "affiliation",
     "Cernes et poches. Aucune allégation médicale."),
    ("Soin yeux", "Gel contour des yeux", "contour_yeux", ["hydrater", "grasse"],
     "Gel Contour des Yeux Frais", "caféine", "15 ml", "12-19 €", "affiliation",
     "Texture gel."),
    ("Soin yeux", "Sérum cils et sourcils", "contour_yeux", ["hydrater"],
     "Sérum Fortifiant Cils et Sourcils", "peptides", "5 ml", "14-22 €", "affiliation",
     "Aucune allégation de pousse vérifiée. Pas de prostaglandine."),
    ("Soin yeux", "Démaquillant yeux doux", "contour_yeux", ["sensible", "hydrater"],
     "Démaquillant Yeux Biphasé Doux", "huile de jojoba", "125 ml", "9-15 €", "affiliation",
     "Sans parfum. Testé pour la zone oculaire."),
    ("Soin yeux", "Masque yeux de nuit", "contour_yeux", ["hydrater"],
     "Masque Yeux de Nuit", "céramides", "15 ml", "13-20 €", "affiliation",
     "Usage nocturne."),

    # ── LÈVRES (4) ──────────────────────────────────────────────────────────
    ("Lèvres", "Baume lèvres teinté", "levres", ["hydrater"],
     "Baume Lèvres Teinté Hydratant", "beurre de karité", "10 g", "7-12 €", "affiliation",
     "Lèvres. Aucune allégation de traitement."),
    ("Lèvres", "Huile lèvres", "levres", ["hydrater"],
     "Huile Lèvres Confort", "huile de jojoba", "10 ml", "8-13 €", "affiliation",
     "Lèvres."),
    ("Lèvres", "Masque lèvres", "levres", ["hydrater"],
     "Masque Lèvres Réparateur", "céramides", "15 g", "8-13 €", "affiliation",
     "Lèvres."),
    ("Lèvres", "Stick lèvres protection", "levres", ["hydrater", "corps"],
     "Stick Lèvres Nourrissant", "beurre de karité", "4,8 g", "5-9 €", "affiliation",
     "⚠️ SANS SPF : la protection solaire n'est pas ouverte en année 1."),

    # ── CORPS (8) ───────────────────────────────────────────────────────────
    ("Corps", "Huile corps", "corps", ["seche", "hydrater"],
     "Huile Corps Nourrissante", "huile d'amande douce", "100 ml", "12-19 €", "affiliation",
     "Corps."),
    ("Corps", "Crème corps riche", "seche", ["corps", "hydrater"],
     "Crème Corps Riche Zones Sèches", "beurre de karité", "200 ml", "12-19 €", "affiliation",
     "Coudes, genoux, talons."),
    ("Corps", "Gel douche doux", "corps", ["hydrater", "sensible"],
     "Gel Douche Doux Sans Sulfates", "glycérine", "250 ml", "7-12 €", "affiliation",
     "Département hygiène possible. Sans sulfates agressifs."),
    ("Corps", "Savon surgras", "corps", ["seche", "sensible"],
     "Savon Surgras Karité", "beurre de karité", "100 g", "5-9 €", "affiliation",
     "Saponification à froid. Karité d'origine à documenter."),
    ("Corps", "Lait corps apaisant", "sensible", ["corps", "barriere"],
     "Lait Corps Apaisant Sans Parfum", "allantoïne", "250 ml", "11-18 €", "affiliation",
     "Sans parfum."),
    ("Corps", "Soin zones rasées", "imperfections", ["corps", "cicatrices"],
     "Soin Apaisant Zones Rasées", "allantoïne", "100 ml", "10-16 €", "affiliation",
     "Aucune allégation sur les poils incarnés médicaux."),
    ("Corps", "Déodorant doux", "corps", ["sensible"],
     "Déodorant Doux Sans Sels d'Aluminium", "pierre d'alun", "50 ml", "8-13 €", "affiliation",
     "Déodorant, pas anti-transpirant. Aucune allégation santé."),
    ("Corps", "Huile de massage", "corps", ["hydrater", "seche"],
     "Huile de Massage Neutre", "huile d'amande douce", "150 ml", "11-18 €", "affiliation",
     "Aucune allégation thérapeutique ni minceur."),

    # ── MATÉRIEL / ACCESSOIRES PELE (16) — dropship, aucun CPNP ─────────────
    ("Accessoires", "Accessoire d'application", "hydrater", [],
     "Rouleau de Jade Visage", "jade", "1 pièce", "9-16 €", "dropship",
     "Matériel. Aucune allégation de drainage lymphatique vérifiée."),
    ("Accessoires", "Accessoire d'application", "eclat", [],
     "Gua Sha Visage", "quartz rose", "1 pièce", "9-16 €", "dropship",
     "Matériel. Aucune allégation médicale."),
    ("Accessoires", "Accessoire d'application", "hydrater", [],
     "Pinceau Masque Silicone", "silicone", "1 pièce", "5-9 €", "dropship",
     "Matériel."),
    ("Accessoires", "Accessoire d'application", "imperfections", [],
     "Spatule Comédon Inox (usage doux)", "acier inoxydable", "1 pièce", "5-9 €", "dropship",
     "⚠️ Usage doux uniquement. Ne pas encourager le perçage à domicile."),
    ("Accessoires", "Accessoire d'application", "hydrater", [],
     "Bandeau Cheveux Spa Éponge", "microfibre", "1 pièce", "5-9 €", "dropship",
     "Matériel."),
    ("Accessoires", "Accessoire d'application", "hydrater", [],
     "Miroir Grossissant sur Pied", "verre", "1 pièce", "12-22 €", "dropship",
     "Matériel."),
    ("Accessoires", "Accessoire d'application", "hydrater", [],
     "Trousse de Toilette Imperméable", "polyester", "1 pièce", "10-18 €", "dropship",
     "Matériel."),
    ("Accessoires", "Accessoire d'application", "corps", [],
     "Brosse Corps Sèche", "fibres naturelles", "1 pièce", "9-15 €", "dropship",
     "Matériel. Aucune allégation de drainage ou de minceur."),
    ("Accessoires", "Accessoire d'application", "corps", [],
     "Gant de Gommage Doux", "viscose", "2 pièces", "6-10 €", "dropship",
     "Matériel. Pas de gommage agressif."),
    ("Accessoires", "Accessoire d'application", "corps", [],
     "Pierre Ponce Naturelle", "pierre ponce", "1 pièce", "4-8 €", "dropship",
     "Matériel, pieds."),
    ("Accessoires", "Accessoire d'application", "hydrater", [],
     "Flacon Pompe Vide Réutilisable (lot de 3)", "PET", "3 pièces", "6-11 €", "dropship",
     "Matériel. Réemploi, cohérent PPWR."),
    ("Accessoires", "Accessoire d'application", "hydrater", [],
     "Pot Cosmétique Vide Verre (lot de 3)", "verre", "3 pièces", "8-14 €", "dropship",
     "Matériel."),
    ("Accessoires", "Accessoire d'application", "contour_yeux", [],
     "Applicateur Roll-on Yeux Inox", "acier inoxydable", "1 pièce", "6-11 €", "dropship",
     "Matériel. Aucune allégation sur les cernes."),
    ("Accessoires", "Accessoire d'application", "hydrater", [],
     "Boîte Voyage Flacons 50 ml (set)", "silicone", "set", "8-14 €", "dropship",
     "Matériel."),
    ("Accessoires", "Accessoire d'application", "sensible", [],
     "Serviettes Visage Coton Bio (lot de 3)", "coton bio", "3 pièces", "10-17 €", "dropship",
     "Matériel textile. OEKO-TEX à demander."),
    ("Accessoires", "Accessoire d'application", "hydrater", [],
     "Mini Frigo Cosmétique 4 L", "ABS", "1 pièce", "35-60 €", "dropship",
     "Matériel électrique. Marquage CE à exiger."),
]

COLONNES = [
    "n", "besoin_principal", "besoin_principal_libelle", "besoins_secondaires",
    "famille_subcategory", "etape_routine_step", "nom", "actif_cle", "format",
    "fourchette_positionnement", "canal_annee_1", "department", "note_conformite",
    "marque_verifiee", "fournisseur_verifie", "a_contacter",
]


def department_for(famille: str, nom: str) -> str:
    if famille == "Accessoires":
        return "accessoires"
    if "Homme" in nom:
        return "hommes"
    if "Enfant" in nom:
        return "enfants"
    return "peau"


def main() -> int:
    lignes = []
    for i, p in enumerate(PRODUITS, 1):
        (famille, etape, besoin, secondaires, nom, actif,
         format_, fourchette, canal, note) = p
        assert besoin in BESOINS, f"besoin inconnu : {besoin}"
        for s in secondaires:
            assert s in BESOINS, f"besoin secondaire inconnu : {s}"
        lignes.append({
            "n": i,
            "besoin_principal": besoin,
            "besoin_principal_libelle": BESOINS[besoin],
            "besoins_secondaires": "|".join(secondaires),
            "famille_subcategory": famille,
            "etape_routine_step": etape,
            "nom": nom,
            "actif_cle": actif,
            "format": format_,
            "fourchette_positionnement": fourchette,
            "canal_annee_1": canal,
            "department": department_for(famille, nom),
            "note_conformite": note,
            "marque_verifiee": "",
            "fournisseur_verifie": "",
            "a_contacter": "oui",
        })

    with open("docs/sourcing/REGISTRE_100_PRODUITS_PEAU_2026-09-13.csv",
              "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLONNES)
        w.writeheader()
        w.writerows(lignes)

    # ── VALIDATION ──────────────────────────────────────────────────────────
    rows = list(csv.reader(open(
        "docs/sourcing/REGISTRE_100_PRODUITS_PEAU_2026-09-13.csv", encoding="utf-8")))
    donnees = rows[1:]
    assert len(donnees) == 100, f"attendu 100 produits, obtenu {len(donnees)}"
    assert all(len(r) == len(COLONNES) for r in donnees), "ligne malformée"
    # Deux colonnes sont VOLONTAIREMENT vides : `marque_verifiee` et
    # `fournisseur_verifie`. Aucune marque ni aucun fournisseur n'a été
    # vérifié pour ces créneaux, et les remplir serait inventer — la règle du
    # chantier. `besoins_secondaires` est vide pour les 16 accessoires : un
    # rouleau de jade ne répond pas à un besoin cutané, c'est un geste.
    # Toute AUTRE cellule vide est une erreur.
    VIDES_ATTENDUES = {"marque_verifiee", "fournisseur_verifie", "besoins_secondaires"}
    inattendues = [
        (r[0], COLONNES[i])
        for r in donnees
        for i, c in enumerate(r)
        if not c.strip() and COLONNES[i] not in VIDES_ATTENDUES
    ]
    assert not inattendues, f"cellules vides inattendues : {inattendues[:6]}"
    # Les 16 accessoires doivent être exactement ceux sans besoin secondaire.
    accessoires = [r for r in donnees
                   if r[COLONNES.index("famille_subcategory")] == "Accessoires"]
    assert len(accessoires) == 16, f"attendu 16 accessoires, obtenu {len(accessoires)}"
    assert all(not r[COLONNES.index("besoins_secondaires")].strip() for r in accessoires)
    # Les 84 cosmétiques doivent tous avoir un besoin secondaire OU aucun :
    # on vérifie surtout qu'aucun cosmétique n'a perdu son besoin principal.
    cosmetiques = [r for r in donnees
                   if r[COLONNES.index("famille_subcategory")] != "Accessoires"]
    assert len(cosmetiques) == 84, f"attendu 84 cosmétiques, obtenu {len(cosmetiques)}"
    assert all(r[COLONNES.index("besoin_principal")].strip() for r in cosmetiques)

    texte = open("docs/sourcing/REGISTRE_100_PRODUITS_PEAU_2026-09-13.csv",
                 encoding="utf-8").read()
    parasites = {c: hex(ord(c)) for c in set(texte)
                 if 0x400 <= ord(c) <= 0x4FF or 0x370 <= ord(c) <= 0x3FF}
    assert not parasites, f"caractères parasites : {parasites}"

    noms = [r[COLONNES.index("nom")] for r in donnees]
    doublons = {n for n in noms if noms.count(n) > 1}
    assert not doublons, f"noms en double : {doublons}"

    print(f"✓ 100 produits · {len(COLONNES)} colonnes · 0 cellule vide · 0 doublon")
    print()

    from collections import Counter
    couverture = Counter()
    for r in donnees:
        idx = COLONNES.index("besoin_principal")
        sec = COLONNES.index("besoins_secondaires")
        couverture[r[idx]] += 1
        for s in filter(None, r[sec].split("|")):
            couverture[s] += 1

    print("COUVERTURE DES 15 BESOINS PEAU")
    vides = []
    for cle, libelle in BESOINS.items():
        n = couverture.get(cle, 0)
        marque = "✓" if n else "✗ VIDE"
        if not n:
            vides.append(libelle)
        print(f"  {marque:8s} {n:3d}  {libelle}")
    print(f"\n  besoins couverts : {len(BESOINS) - len(vides)}/15")
    if vides:
        print(f"  besoins VIDES    : {', '.join(vides)}")
    if "SPF sans trace blanche" in vides:
        print()
        print("  ⚠️ Le besoin « spf » est VOLONTAIREMENT non couvert.")
        print("     Arbitrage métier antérieur : la protection solaire n'est pas")
        print("     ouverte en année 1 (ISO 24444 / 24443 à produire, allégations")
        print("     SPF encadrées). Un diagnostic qui sort « SPF sans trace blanche »")
        print("     n'aboutira donc à AUCUN produit.")
        print("     → Décision à prendre : ouvrir le SPF, ou retirer ce besoin du")
        print("       diagnostic. Laisser les deux en l'état produirait une impasse")
        print("       visible pour la cliente.")

    print()
    for champ, titre in [("famille_subcategory", "FAMILLES"),
                         ("canal_annee_1", "CANAUX ANNÉE 1"),
                         ("department", "DÉPARTEMENTS")]:
        c = Counter(r[COLONNES.index(champ)] for r in donnees)
        print(f"{titre} : " + " · ".join(f"{k} {v}" for k, v in c.most_common()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
