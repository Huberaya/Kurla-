#!/usr/bin/env python3
"""
CHANTIER 10 (bloc B4) — génération de la migration du lot vérifié.

Ce script ne contient aucune donnée : il lit la trace produite par
`scripts/verify-ingredient-batch.py` (docs/data/ingredient_batch_1.json) et le
seed produits, puis écrit la migration. Aucune ligne n'est ajoutée à la main,
donc la migration ne peut pas diverger de ce qui a réellement été vérifié.

Les liaisons produit × ingrédient sont calculées : une mention déclarée n'est
rattachée que si elle correspond à un `common_name` du lot vérifié. Ce qui ne
correspond pas est listé en commentaire dans la migration, pas rattaché.
"""
import json
import re
from collections import defaultdict

TRACE = "docs/data/ingredient_batch_1.json"
SEED = "supabase/migrations/20260805000000_seed_demo_products.sql"
# Instantané du catalogue déjà en base : la table `ingredients` a une contrainte
# d'unicité sur `inci_name`, donc un INCI déjà catalogué doit réutiliser son
# identifiant — en inventer un second fait échouer la migration.
EXISTING = "docs/data/existing_ingredients_2026-08-28.json"
OUT = "supabase/migrations/20260868000000_ingredient_verified_batch_1.sql"


def sql_string(value) -> str:
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def sql_array(values) -> str:
    if not values:
        return "'{}'"
    inner = ", ".join("'" + str(v).replace("'", "''") + "'" for v in values)
    return f"ARRAY[{inner}]"


def normalize(value: str) -> str:
    """
    Normalisation volontairement limitée à ce qui ne change pas la substance :
    apostrophes typographiques, parties entre parenthèses, et la concentration
    déclarée (« Niacinamide 5% » désigne la niacinamide à 5 %, pas une autre
    substance). Les qualificatifs de sourcing (« Bio », « Pur ») ne sont PAS
    retirés : s'ils n'ont pas de correspondance, la mention reste non rattachée
    et apparaît dans le rapport.
    """
    value = value.lower().replace("\u2019", "'").replace("\u2018", "'")
    value = re.sub(r"\([^)]*\)", " ", value)
    value = re.sub(r"\s*\d+(?:[.,]\d+)?\s*%\b", " ", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def main() -> int:
    trace = json.load(open(TRACE, encoding="utf-8"))
    rows = trace["verified"] + trace["identified"]

    # --- produits et mentions déclarées, lus du seed ---
    seed_sql = open(SEED, encoding="utf-8").read()
    products = []
    for block in seed_sql.split("\n(\n")[1:]:
        pid_match = re.match(r"\s*'([^']+)',", block)
        if not pid_match:
            continue
        arrays = re.findall(r"ARRAY\[([^\]]*)\]", block)
        if not arrays:
            continue
        declared = [raw.strip().strip("'") for raw in arrays[0].split(",") if raw.strip()]
        products.append({"id": pid_match.group(1), "declared": declared})

    # --- alignement des identifiants sur le catalogue existant ---
    canonical = {row["id"]: row["id"] for row in rows}
    try:
        catalogue = json.load(open(EXISTING, encoding="utf-8"))["ingredients"]
    except FileNotFoundError:
        catalogue = []
    existing_by_norm = {item["inci_name_normalized"]: item["id"] for item in catalogue}
    for row in rows:
        already = existing_by_norm.get(normalize(row["inciVerified"] or row["inciProposed"]))
        if already and already != row["id"]:
            canonical[row["id"]] = already
            print(f"  identifiant aligné : {row['id']} -> {already} (INCI déjà catalogué)")

    # --- index des noms usuels du lot vérifié ---
    by_common = {}
    for row in rows:
        by_common[normalize(row["inciVerified"] or row["inciProposed"])] = canonical[row["id"]]
        for name in row.get("commonNames", []):
            by_common.setdefault(normalize(name), canonical[row["id"]])

    links = []
    unmatched = defaultdict(list)
    for product in products:
        rank = 0
        for declared in product["declared"]:
            ingredient_id = by_common.get(normalize(declared))
            if not ingredient_id:
                unmatched[product["id"]].append(declared)
                continue
            rank += 1
            if any(link[0] == product["id"] and link[1] == ingredient_id for link in links):
                continue
            links.append((product["id"], ingredient_id, rank, declared))

    lines = [
        "-- ============================================================",
        "-- LOT D'INGRÉDIENTS VÉRIFIÉS — LOT 1 (chantier 10, bloc B4)",
        "--",
        f"-- Généré par scripts/build-ingredient-migration.py depuis la trace",
        f"-- docs/data/ingredient_batch_1.json (retraits du {trace['generatedAt']}).",
        "-- NE PAS ÉDITER À LA MAIN : toute ligne doit correspondre à une",
        "-- vérification tracée.",
        "--",
        f"-- Niveau 1 ({trace['verifiedCount']} lignes) : INCI présent littéralement dans la",
        "--   liste de synonymes PubChem + numéro CAS publié → verification_status",
        "--   = 'verified'.",
        f"-- Niveau 2 ({trace['identifiedCount']} lignes) : entité botanique dont l'espèce est",
        "--   vérifiée (NCBI Taxonomy) mais dont la dénomination INCI complète n'est",
        f"--   publiée par aucune des deux sources → verification_status = 'pending'.",
        f"-- Écartées ({trace['rejectedCount']} lignes) : aucune source n'a confirmé l'identité ;",
        "--   elles ne sont PAS insérées.",
        "--",
        "-- Fonctions cosmétiques : volontairement vides pour les nouvelles lignes.",
        "-- Aucune source consultée ne publie de fonction par ingrédient ; en écrire",
        "-- une serait une affirmation sans preuve. Les lignes déjà présentes (seed",
        "-- 20260851, preuve 'consensus') conservent leurs fonctions.",
        "-- ============================================================",
        "",
        "-- ------------------------------------------------------------",
        "-- 1. PROVENANCE : chaque ligne vérifiée porte sa source, son URL et sa date.",
        "-- ------------------------------------------------------------",
        "CREATE TABLE IF NOT EXISTS public.ingredient_provenance (",
        "  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),",
        "  ingredient_id TEXT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,",
        "  source_label TEXT NOT NULL,",
        "  source_url TEXT NOT NULL,",
        "  retrieved_at DATE NOT NULL,",
        "  cas_number TEXT,",
        "  evidence_tier SMALLINT NOT NULL DEFAULT 1 CHECK (evidence_tier IN (1, 2)),",
        "  note TEXT,",
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),",
        "  CONSTRAINT ingredient_provenance_unique UNIQUE (ingredient_id, source_url)",
        ");",
        "CREATE INDEX IF NOT EXISTS idx_ingredient_provenance_ingredient",
        "  ON public.ingredient_provenance(ingredient_id);",
        "",
        "-- ------------------------------------------------------------",
        "-- 2. INGRÉDIENTS",
        "-- ------------------------------------------------------------",
    ]

    for row in rows:
        tier = row["tier"]
        status = "verified" if tier == 1 else "pending"
        # PubChem renvoie parfois le synonyme en minuscules (« glycerin »).
        # Quand la correspondance est exacte à la casse près, on garde la
        # graphie INCI proposée : la nomenclature s'écrit avec une capitale.
        inci = row["inciVerified"] or row["inciProposed"]
        if row.get("inciVerified") and normalize(row["inciVerified"]) == normalize(row["inciProposed"]):
            inci = row["inciProposed"]
        lines.append(
            "INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names,"
            " functions, family, origin, verification_status, updated_at) VALUES ("
            f"{sql_string(canonical[row['id']])}, {sql_string(inci)}, {sql_string(normalize(inci))},"
            f" {sql_array(row.get('commonNames', []))}, '{{}}',"
            f" {sql_string(row.get('family'))}, {sql_string(row.get('origin'))},"
            f" {sql_string(status)}, NOW())"
        )
        lines.append("ON CONFLICT (id) DO UPDATE SET")
        lines.append(f"  inci_name = EXCLUDED.inci_name,")
        lines.append(f"  inci_name_normalized = EXCLUDED.inci_name_normalized,")
        lines.append(f"  common_names = EXCLUDED.common_names,")
        lines.append(f"  family = EXCLUDED.family,")
        lines.append(f"  origin = EXCLUDED.origin,")
        lines.append(f"  verification_status = EXCLUDED.verification_status,")
        lines.append("  updated_at = NOW();")
        lines.append("")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- 3. PROVENANCE DES LIGNES CI-DESSUS")
    lines.append("-- ------------------------------------------------------------")
    for row in rows:
        note = (
            f"INCI vérifié : {row['inciVerified']}"
            if row["tier"] == 1
            else f"Binôme vérifié : {row['binomialVerified']} (taxid {row.get('taxid')})"
        )
        lines.append(
            "INSERT INTO public.ingredient_provenance"
            " (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)"
            f" VALUES ({sql_string(canonical[row['id']])}, {sql_string(row['sourceLabel'])},"
            f" {sql_string(row['sourceUrl'])}, {sql_string(row['retrievedAt'])},"
            f" {sql_string(row.get('casNumber'))}, {row['tier']}, {sql_string(note)})"
            " ON CONFLICT (ingredient_id, source_url) DO UPDATE SET"
            " retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number,"
            " note = EXCLUDED.note;"
        )
    lines.append("")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- 4. LIAISONS PRODUIT × INGRÉDIENT (calculées depuis les mentions déclarées)")
    lines.append("--    source = 'declared' : la marque déclare, KURLA n'a pas analysé.")
    lines.append("-- ------------------------------------------------------------")
    for product_id, ingredient_id, rank, declared in links:
        lines.append(
            "INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank,"
            " is_key_ingredient, source) VALUES ("
            f"{sql_string(product_id)}, {sql_string(ingredient_id)}, {rank},"
            f" {'TRUE' if rank == 1 else 'FALSE'}, 'declared')"
            " ON CONFLICT (product_id, ingredient_id) DO UPDATE SET"
            " inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;"
        )
    lines.append("")

    lines.append("-- Mentions déclarées SANS correspondance dans le lot vérifié : elles ne sont")
    lines.append("-- volontairement rattachées à rien. Une liaison approximative fausserait")
    lines.append("-- silencieusement toutes les statistiques en aval.")
    for product_id, names in sorted(unmatched.items()):
        lines.append(f"--   produit {product_id} : " + " ; ".join(names))
    lines.append("")

    open(OUT, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"migration écrite : {OUT}")
    print(f"  ingrédients : {len(rows)} (niveau 1 : {trace['verifiedCount']}, niveau 2 : {trace['identifiedCount']})")
    print(f"  provenances : {len(rows)}")
    print(f"  liaisons    : {len(links)}")
    print(f"  produits avec mentions non rattachées : {len(unmatched)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
