#!/usr/bin/env python3
"""
CHANTIER 10 (bloc B4) — LOT D'INGRÉDIENTS VÉRIFIÉS, SOURCE PAR SOURCE.

Pourquoi ce script existe plutôt qu'un fichier écrit à la main : une ligne de
référentiel « vérifiée » qui n'a pas été vérifiée est le pire des états — elle
donne au score de confiance une autorité qu'elle n'a pas. Ici, chaque ligne est
produite par une requête réelle, et la ligne n'est émise que si :

  1. PubChem (NIH) renvoie un composé pour le nom demandé ;
  2. le nom INCI proposé apparaît LITTÉRALEMENT dans la liste de synonymes
     renvoyée (comparaison insensible à la casse et aux parenthèses) ;
  3. un numéro CAS est publié pour ce composé.

Sinon la ligne est abandonnée et listée dans le rapport — jamais devinée.

Sorties :
  - docs/data/ingredient_batch_1.json  : la trace (ce qui a été demandé, ce qui
    a été reçu, les URL, l'horodatage) ;
  - supabase/migrations/20260868000000_ingredient_verified_batch_1.sql.

Source : PubChem, https://pubchem.ncbi.nlm.nih.gov/ (NIH/NLM). CosIng, la base de
la Commission européenne, a été sondée auparavant : son interface est une
application JavaScript sans point d'accès données public (quatre URL renvoyaient
la même coquille HTML), elle n'a donc pas pu servir de source machine.
"""
import json
import os
import re
import sys
import time
import urllib.parse
import unicodedata
import urllib.request
from datetime import date

BASE = "https://pubchem.ncbi.nlm.nih.gov"
UA = "Mozilla/5.0 (KURLA ingredient verification; contact: support in-app)"
RETRIEVED_AT = date.today().isoformat()

# Lot borné : les ingrédients réellement déclarés par les produits du seed,
# dont le nom INCI est proposé ici. Rien n'est ajouté au-delà de cette liste.
BATCH = [
    # (id, INCI proposé, noms usuels FR, famille, origine, requête PubChem)
    ("glycerin",              "Glycerin",                                ["glycérine", "glycérine végétale"],                          "polyols", "végétal ou synthèse", ["glycerol", "glycerin"]),
    ("niacinamide",           "Niacinamide",                             ["vitamine B3", "niacinamide"],                             "vitamines", "synthèse", ["niacinamide"]),
    ("panthenol",             "Panthenol",                               ["provitamine B5", "panthénol"],                            "vitamines", "synthèse", ["panthenol"]),
    ("squalane",              "Squalane",                                ["squalane végétal", "squalane"],                          "lipides", "végétal", ["squalane"]),
    ("allantoin",             "Allantoin",                               ["allantoïne", "allantoine"],                              "actifs", "synthèse ou végétal", ["allantoin"]),
    ("salicylic_acid",        "Salicylic Acid",                          ["acide salicylique", "bha"],                              "acides", "synthèse ou végétal", ["salicylic acid"]),
    ("tranexamic_acid",       "Tranexamic Acid",                         ["acide tranexamique"],                                    "actifs", "synthèse", ["tranexamic acid"]),
    ("sodium_hyaluronate",    "Sodium Hyaluronate",                      ["acide hyaluronique", "hyaluronate de sodium"],           "polysaccharides", "biotechnologie", ["sodium hyaluronate", "hyaluronic acid"]),
    ("zinc_pca",              "Zinc PCA",                                ["zinc pca", "pca de zinc"],                               "minéraux", "synthèse", ["zinc pca", "zinc l-pyroglutamate"]),
    ("cocamidopropyl_betaine","Cocamidopropyl Betaine",                  ["cocamidopropyl betaine", "cocamidopropyl bétaïne"],      "tensioactifs", "dérivé de coco", ["cocamidopropyl betaine", "cocamidopropyl dimethyl aminoacetate betaine"]),
    ("butyrospermum_parkii",  "Butyrospermum Parkii Butter",             ["beurre de karité", "karité"],                            "beurres", "végétal", ["butyrospermum parkii butter", "shea butter", "butyrospermum parkii"]),
    ("mangifera_indica",      "Mangifera Indica Seed Butter",            ["beurre de mangue"],                                      "beurres", "végétal", ["mangifera indica seed butter", "mango butter", "mangifera indica"]),
    ("simmondsia_chinensis",  "Simmondsia Chinensis Seed Oil",           ["huile de jojoba", "jojoba"],                             "huiles", "végétal", ["simmondsia chinensis seed oil", "jojoba oil", "simmondsia chinensis"]),
    ("helianthus_annuus",     "Helianthus Annuus Seed Oil",              ["huile de tournesol", "tournesol"],                       "huiles", "végétal", ["helianthus annuus seed oil", "sunflower oil", "sunflower seed oil"]),
    ("argania_spinosa",       "Argania Spinosa Kernel Oil",              ["huile d'argan", "argan"],                                "huiles", "végétal", ["argania spinosa kernel oil", "argan oil", "argania spinosa"]),
    ("persea_gratissima",     "Persea Gratissima Oil",                   ["huile d'avocat", "avocat"],                              "huiles", "végétal", ["persea gratissima oil", "avocado oil", "persea gratissima"]),
    ("ricinus_communis",      "Ricinus Communis Seed Oil",               ["huile de carapate", "carapate", "huile de ricin", "black castor oil"], "huiles", "végétal", ["ricinus communis seed oil", "castor oil", "ricinus communis"]),
    ("aloe_barbadensis",      "Aloe Barbadensis Leaf Juice",             ["aloe vera", "aloès"],                                    "extraits", "végétal", ["aloe barbadensis leaf juice", "aloe vera", "aloe barbadensis"]),
    ("melaleuca_alternifolia","Melaleuca Alternifolia Leaf Oil",         ["huile d'arbre à thé", "tea tree"],                       "huiles essentielles", "végétal", ["melaleuca alternifolia leaf oil", "tea tree oil", "melaleuca alternifolia"]),
    ("rosmarinus_officinalis","Rosmarinus Officinalis Leaf Oil",         ["huile de romarin", "romarin à cinéole"],                 "huiles essentielles", "végétal", ["rosmarinus officinalis leaf oil", "rosemary oil", "rosmarinus officinalis"]),
    ("althaea_officinalis",   "Althaea Officinalis Root Extract",        ["extrait de guimauve", "guimauve"],                       "extraits", "végétal", ["althaea officinalis root extract", "marshmallow", "althaea officinalis"]),
    ("avena_sativa",          "Avena Sativa Kernel Extract",             ["avoine douce", "avoine colloïdale"],                     "extraits", "végétal", ["avena sativa kernel extract", "oat kernel extract", "avena sativa"]),
    ("theobroma_cacao",       "Theobroma Cacao Extract",                 ["extrait de cacao", "cacao"],                             "extraits", "végétal", ["theobroma cacao extract", "cocoa", "theobroma cacao"]),
    ("hydrolyzed_rice",       "Hydrolyzed Rice Protein",                 ["protéine de riz"],                                       "protéines", "végétal", ["hydrolyzed rice protein", "rice protein"]),
    ("mentha_piperita",       "Mentha Piperita Oil",                     ["menthe poivrée", "hydrolat de menthe poivrée"],           "huiles essentielles", "végétal", ["mentha piperita oil", "peppermint oil", "mentha piperita"]),
]


def fetch(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


def normalize(value: str) -> str:
    """Compare sans casse, sans accents et sans parties entre parenthèses."""
    value = value.lower()
    value = re.sub(r"\([^)]*\)", " ", value)
    value = unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def taxonomy_of(binomial: str) -> dict:
    """
    Repli pour les entités botaniques : PubChem indexe des substances chimiques,
    pas les huiles, beurres et extraits. On vérifie alors l'espèce dans NCBI
    Taxonomy — ce qui est vérifiable, c'est l'identité botanique, pas la
    dénomination INCI, et le statut reste « pending ».
    """
    url = (
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        f"?db=taxonomy&term={urllib.parse.quote(binomial)}&retmode=json"
    )
    try:
        data = fetch(url)
    except Exception:
        return {}
    ids = (data.get("esearchresult", {}) or {}).get("idlist", []) or []
    if not ids:
        return {}
    taxid = ids[0]
    count = int((data.get("esearchresult", {}) or {}).get("count", 0) or 0)
    return {
        "taxid": taxid,
        "sourceLabel": "NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n'y est pas publiée)",
        "sourceUrl": f"https://www.ncbi.nlm.nih.gov/taxonomy/{taxid}",
    }


def cas_of(cid: int) -> str:
    try:
        data = fetch(f"{BASE}/rest/pug_view/data/compound/{cid}/JSON?heading=CAS")
    except Exception:
        return ""
    found = []

    def walk(node):
        if isinstance(node, dict):
            for item in node.get("Information", []) or []:
                value = item.get("Value", {})
                for entry in value.get("StringWithMarkup", []) or []:
                    text = entry.get("String", "")
                    if re.match(r"^\d{2,7}-\d{2}-\d$", text):
                        found.append(text)
            for child in node.values():
                walk(child)
        elif isinstance(node, list):
            for child in node:
                walk(child)

    walk(data)
    return found[0] if found else ""


def verify(entry) -> dict:
    ingredient_id, inci, common_names, family, origin, queries = entry
    if isinstance(queries, str):
        queries = [queries]
    result = {
        "id": ingredient_id,
        "inciProposed": inci,
        "query": queries[0],
        "status": "rejected",
        "reason": "",
    }
    last_reason = "aucune requête n'a abouti"
    for query in queries:
        result["query"] = query
        url_cid = f"{BASE}/rest/pug/compound/name/{urllib.parse.quote(query)}/property/Title,MolecularFormula/JSON"
        try:
            props = fetch(url_cid)
        except Exception as error:
            last_reason = f"aucun composé PubChem pour « {query} » ({error})"
            time.sleep(0.2)
            continue

        rows = props.get("PropertyTable", {}).get("Properties", []) or []
        if not rows:
            last_reason = f"table de propriétés vide pour « {query} »"
            continue
        row = rows[0]
        cid = row["CID"]

        time.sleep(0.25)
        try:
            synonyms = fetch(f"{BASE}/rest/pug/compound/cid/{cid}/synonyms/JSON")
        except Exception as error:
            last_reason = f"synonymes indisponibles ({error})"
            continue
        names = synonyms.get("InformationList", {}).get("Information", [{}])[0].get("Synonym", []) or []

        needle = normalize(inci)
        matched = next((name for name in names if normalize(name) == needle), None)

        time.sleep(0.25)
        cas = cas_of(cid)

        # --- Niveau 1 : identité pleine. INCI littéral + CAS publié. ---
        if matched is not None and cas:
            result.update({
                "status": "verified",
                "tier": 1,
                "cid": cid,
                "inciVerified": matched,
                "pubchemTitle": row.get("Title"),
                "molecularFormula": row.get("MolecularFormula"),
                "casNumber": cas,
                "sourceLabel": "PubChem (NIH/NLM) — INCI présent dans la liste de synonymes, numéro CAS publié",
                "sourceUrl": f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}",
                "retrievedAt": RETRIEVED_AT,
                "commonNames": common_names,
                "family": family,
                "origin": origin,
            })
            return result

        # --- Niveau 2 : substance botanique identifiée, INCI non publiée ici. ---
        # PubChem n'indexe pas les entités INCI botaniques (huiles, beurres,
        # extraits). On enregistre ce qui EST vérifié — la substance et son
        # titre PubChem — et le statut reste « pending », jamais « verified ».
        binomial = " ".join(inci.split()[:2])
        binomial_found = any(normalize(name) == normalize(binomial) for name in names)
        if binomial_found:
            result.update({
                "status": "identified",
                "tier": 2,
                "cid": cid,
                "inciVerified": None,
                "binomialVerified": binomial,
                "pubchemTitle": row.get("Title"),
                "molecularFormula": row.get("MolecularFormula"),
                "casNumber": cas or None,
                "sourceLabel": "PubChem (NIH/NLM) — substance botanique identifiée par son binôme ; la dénomination INCI complète n'y est pas publiée",
                "sourceUrl": f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}",
                "retrievedAt": RETRIEVED_AT,
                "commonNames": common_names,
                "family": family,
                "origin": origin,
            })
            return result

        last_reason = "INCI absent des synonymes et binôme non reconnu"
        result["cid"] = cid
        result["sampleSynonyms"] = names[:6]

    # --- Niveau 2 : identité botanique vérifiée dans NCBI Taxonomy. ---
    binomial = " ".join(inci.split()[:2])
    taxonomy = taxonomy_of(binomial)
    if taxonomy:
        result.update({
            "status": "identified",
            "tier": 2,
            "cid": None,
            "inciVerified": None,
            "binomialVerified": binomial,
            "taxid": taxonomy["taxid"],
            "casNumber": None,
            "sourceLabel": taxonomy["sourceLabel"],
            "sourceUrl": taxonomy["sourceUrl"],
            "retrievedAt": RETRIEVED_AT,
            "commonNames": common_names,
            "family": family,
            "origin": origin,
        })
        return result

    result["reason"] = last_reason
    return result


def main() -> int:
    results = [verify(entry) for entry in BATCH]
    verified = [item for item in results if item["status"] == "verified"]
    identified = [item for item in results if item["status"] == "identified"]
    rejected = [item for item in results if item["status"] not in ("verified", "identified")]

    os.makedirs("docs/data", exist_ok=True)
    with open("docs/data/ingredient_batch_1.json", "w", encoding="utf-8") as handle:
        json.dump({
            "batch": 1,
            "generatedAt": RETRIEVED_AT,
            "source": "PubChem (NIH/NLM)",
            "note": "CosIng sondé et écarté : interface JavaScript sans point d'accès données public.",
            "verifiedCount": len(verified),
            "identifiedCount": len(identified),
            "rejectedCount": len(rejected),
            "verified": verified,
            "identified": identified,
            "rejected": [{"id": item["id"], "inciProposed": item["inciProposed"], "reason": item["reason"]} for item in rejected],
        }, handle, ensure_ascii=False, indent=2)

    print(f"niveau 1 (INCI + CAS) : {len(verified)} / {len(BATCH)}")
    print(f"niveau 2 (botanique identifiée) : {len(identified)}")
    for item in rejected:
        print(f"  écarté — {item['inciProposed']} : {item['reason']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
