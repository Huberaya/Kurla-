#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Construit `src/data/catalogueInci.ts` : la liste INCI des produits du catalogue.

Pourquoi la composition n'est jamais inventée ici
------------------------------------------------
Un produit cosmétique vendu dans l'Union doit porter sa liste d'ingrédients
(règlement (CE) n° 1223/2009, art. 19). Reconstituer une composition au jugé
reviendrait à fabriquer une donnée réglementaire. Ce script ne le fait jamais :
chaque entrée est soit

  * `source`     — recopiée d'une fiche publique (site du fabricant ou
                   INCIdecoder), avec l'adresse exacte consultée ;
  * `definition` — le produit est monocomposant (beurre de karité brut, huile
                   de ricin) : la composition découle du produit lui-même ;
  * `kit`        — un kit n'a pas de composition propre : on renvoie vers les
                   fiches des produits inclus, qui portent chacune leur liste.

Un produit dont la composition n'a pu être sourcée reste dans le fichier avec
`provenance: 'introuvable'`, sans composition : il doit être retiré de la vente,
pas complété au jugé. La migration SQL le dépublie.

Relancer :
    SUPABASE_URL=... SUPABASE_SECRET_KEY=... python3 scripts/buildCatalogueInci.py
"""

from __future__ import annotations

import html as html_module
import json
import os
import pathlib
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

RACINE = pathlib.Path(__file__).resolve().parent.parent
SORTIE = RACINE / "src" / "data" / "catalogueInci.ts"

UA = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
INCIDECODER = "https://incidecoder.com"

# Marques dont le site est une boutique Shopify : le catalogue complet, avec les
# compositions, est disponible en un appel. Utilisé en repli.
BOUTIQUES = {
    "Camille Rose": "camillerose.com",
    "Tropic Isle Living": "tropicisleliving.com",
    "Nature Spell": "naturespell.com",
    "As I Am": "asiamnaturally.com",
    "Creme of Nature": "cremeofnature.com",
    "Mielle Organics": "mielleorganics.com",
    "Design Essentials": "designessentials.com",
    "Aphogee": "aphogee.com",
    "Kinky-Curly": "kinky-curly.com",
}

# Le premier résultat de recherche n'est pas toujours le bon produit : quand la
# fiche exacte est connue, on l'impose pour que le script reste déterministe.
PAGE_IMPOSEE = {
    # « Comeback Curl » existe en deux fiches ; la nôtre est la variante
    # « Next Day Curl Revitalizer ».
    "launch-p32": "/products/cantu-shea-butter-comeback-curl",
}

# Requêtes de repli, quand le nom complet du catalogue ne donne rien.
REQUETES = {
    "launch-p08": ["Camille Rose Curl Love Moisture Milk", "Camille Rose Curl Love"],
    "launch-p14": ["Eco Styler Olive Oil Styling Gel", "Eco Style Olive Oil Gel"],
    "launch-p53": ["Nature Spell Rosemary Water", "Nature Spell Growth Complex"],
    "launch-p33": ["Camille Rose Clean Rinse"],
    "launch-p03": ["As I Am Coconut CoWash", "As I Am CoWash Cleansing Conditioner"],
    "launch-p54": ["Creme of Nature Apple Cider Vinegar Clarifying Rinse"],
}

# Produits monocomposant : la composition découle du produit, pas d'une marque.
DEFINITION = {
    "launch-p09": {
        "inci": "Butyrospermum Parkii (Shea) Butter",
        "note": (
            "Beurre de karité brut non raffiné, un seul ingrédient : la composition est "
            "celle du produit lui-même."
        ),
        "actifs": ["Beurre de Karité"],
    },
    "launch-p10": {
        "inci": "Ricinus Communis (Castor) Seed Oil",
        "note": (
            "Huile de ricin noire jamaïcaine, un seul ingrédient. La torréfaction des "
            "graines ne modifie pas la nomenclature INCI."
        ),
        "actifs": ["Huile de Ricin"],
    },
    "launch-p31": {
        "inci": "Ricinus Communis (Castor) Seed Oil",
        "note": (
            "Huile de ricin noire jamaïcaine, un seul ingrédient. La torréfaction des "
            "graines ne modifie pas la nomenclature INCI."
        ),
        "actifs": ["Huile de Ricin"],
    },
}

STOP = {
    "de", "des", "du", "la", "le", "les", "et", "a", "au", "aux", "en", "pour", "sans",
    "avec", "the", "of", "and", "for", "with",
}
# Caractères invisibles que recopient certaines fiches sources.
INVISIBLES = dict.fromkeys(map(ord, "​‌‍﻿"), None)


# ── outils ────────────────────────────────────────────────────────────────────
def get(url: str, timeout: int = 30) -> str:
    return urllib.request.urlopen(
        urllib.request.Request(url, headers=UA), timeout=timeout
    ).read().decode("utf-8", "replace")


def norm(s: str) -> list[str]:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not (0x300 <= ord(c) <= 0x36F))
    return [t for t in re.sub(r"[^a-z0-9\s]", " ", s.lower()).split() if len(t) > 1 and t not in STOP]


def score(a: str, b: str) -> float:
    """Part des mots de `a` retrouvés dans `b` — sert à valider une correspondance."""
    A, B = set(norm(a)), set(norm(b))
    return len(A & B) / len(A) if A else 0.0


def nom_epure(name: str) -> str:
    """Retire contenance et format, absents des titres des fiches sources."""
    name = re.sub(r"\([^)]*\)\s*$", "", name)
    name = re.sub(r"\b\d+\s?(ml|g|oz|fl)\b", "", name, flags=re.I)
    return re.sub(r"\s+", " ", name).strip()


def nettoyer(texte: str) -> str:
    return re.sub(r"\s+", " ", texte.translate(INVISIBLES)).strip()


# ── sources ───────────────────────────────────────────────────────────────────
def chercher_incidecoder(requete: str) -> list[str]:
    page = get(INCIDECODER + "/search?query=" + urllib.parse.quote_plus(requete))
    return [l for l in re.findall(r'href="(/products/[^"?#]+)"', page) if l != "/products/create"]


def lire_incidecoder(chemin: str) -> tuple[str, str]:
    page = get(INCIDECODER + chemin)
    m = re.search(r"<title>(.*?)</title>", page, re.S)
    titre = html_module.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""
    titre = re.sub(r"\s*ingredients \(Explained\)$", "", titre, flags=re.I).strip()
    noms: list[str] = []
    for _, n in re.findall(r'href="/ingredients/([a-z0-9\-]+)"[^>]*>([^<]{2,60})<', page):
        n = html_module.unescape(n).strip().translate(INVISIBLES)
        if n and n not in noms:
            noms.append(n)
    return titre, ", ".join(noms)


def depuis_boutique(marque: str, nom: str) -> dict | None:
    """Repli : le catalogue Shopify de la marque, quand il porte la composition."""
    domaine = BOUTIQUES.get(marque)
    if not domaine:
        return None
    produits = json.loads(get(f"https://{domaine}/products.json?limit=250")).get("products", [])
    meilleur = None
    for p in produits:
        if "ngredient" not in (p.get("body_html") or ""):
            continue
        s = score(nom, p.get("title", ""))
        if not meilleur or s > meilleur[0]:
            meilleur = (s, p)
    if not meilleur or meilleur[0] < 0.5:
        return None
    s, p = meilleur
    corps = re.sub(r"<[^>]+>", " ", p.get("body_html") or "")
    corps = html_module.unescape(re.sub(r"\s+", " ", corps)).translate(INVISIBLES)
    m = re.search(r"[Ii]ngredients?\s*[:\-]\s*(.{20,2500}?)(?:\s{2,}|$)", corps)
    if not m:
        return None
    inci = re.sub(r"\s*(How to use|Directions|Usage|Warning|Caution).*$", "", m.group(1), flags=re.I)
    return {
        "inci": nettoyer(inci),
        "sourceUrl": f"https://{domaine}/products/{p.get('handle')}",
        "sourceTitle": p.get("title"),
        "score": round(s, 2),
    }


# Correspondances INCI → nom courant, pour reconstituer les ingrédients clés
# affichés en boutique. Dérivées de la composition réelle, jamais supposées.
DICO = [
    (r"butyrospermum parkii", "Beurre de Karité"), (r"ricinus communis", "Huile de Ricin"),
    (r"cocos nucifera.*oil|coconut oil", "Huile de Coco"), (r"rosmarinus officinalis", "Romarin"),
    (r"mentha piperita", "Menthe Poivrée"), (r"aloe barbadensis", "Aloe Vera"),
    (r"\bglycerin\b", "Glycérine Végétale"), (r"olea europaea", "Huile d’Olive"),
    (r"argania spinosa", "Huile d’Argan"), (r"persea gratissima|avocado", "Avocat"),
    (r"prunus amygdalus|almond", "Amande Douce"), (r"linum usitatissimum|flaxseed", "Graines de Lin"),
    (r"mangifera indica|mango", "Beurre de Mangue"), (r"tocopherol", "Vitamine E"),
    (r"panthenol", "Panthénol"), (r"hydrolyzed.*protein|keratin", "Protéines"),
    (r"honey", "Miel"), (r"acetum|vinegar", "Vinaigre de Cidre"),
    (r"salvia", "Sauge"), (r"urtica", "Ortie"), (r"equisetum", "Prêle"),
    (r"pimenta|capsicum", "Piment"), (r"zingiber", "Gingembre"),
    (r"camellia sinensis", "Thé Vert"), (r"niacinamide", "Niacinamide"),
    (r"simmondsia chinensis|jojoba", "Jojoba"), (r"shea butter", "Beurre de Karité"),
]


def actifs(inci: str, limite: int = 5) -> list[str] | None:
    if not inci or inci.startswith("[Kit]"):
        return None
    bas = inci.lower()
    out: list[str] = []
    for motif, fr in DICO:
        if re.search(motif, bas) and fr not in out:
            out.append(fr)
    return out[:limite] or None


def composants_kit(description: str, produits: dict) -> list[tuple[str, str]]:
    """Lit la liste « Comprend : … » de la description et la rattache au catalogue."""
    m = re.search(r"Comprend\s*:\s*(.{10,600}?)(?:\.|$|\n)", description or "", re.I)
    if not m:
        return []
    resolus = []
    for part in re.split(r",|;", m.group(1)):
        part = re.sub(r"\s*\([^)]*\)", "", part).strip()
        if len(part) <= 4:
            continue
        candidats = [p for p in produits.values() if p.get("category") != "kits"]
        if not candidats:
            continue
        meilleur = max(candidats, key=lambda x: score(part, x["name"]))
        if score(part, meilleur["name"]) >= 0.5:
            resolus.append((meilleur["id"], part))
    return resolus


# ── assemblage ────────────────────────────────────────────────────────────────
def produits_base() -> dict:
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    cle = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_READ_KEY")
    if not url or not cle:
        raise SystemExit("Renseigner SUPABASE_URL et une clé de lecture pour relancer le sourcing.")
    entetes = {"apikey": cle, "Authorization": f"Bearer {cle}"}
    req = urllib.request.Request(
        f"{url}/rest/v1/products?select=id,name,brand,category,description,ingredients,inci,catalog_status",
        headers=entetes,
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return {p["id"]: p for p in json.loads(r.read().decode())}


def explorer(produits: dict) -> dict:
    """Interroge les sources ; renvoie une entrée par produit sans composition."""
    trouves: dict[str, dict] = {}
    for pid, p in sorted(produits.items()):
        if (p.get("inci") or "").strip():
            continue
        nom, marque = p["name"], p.get("brand") or ""
        entree: dict | None = None

        if p.get("category") == "kits":
            comps = composants_kit(p.get("description") or "", produits)
            if comps:
                liste = " · ".join(f"{nom_c} → {cid}" for cid, nom_c in comps)
                entree = {
                    "inci": (
                        "[Kit] La composition est celle des produits inclus, détaillée sur "
                        f"chaque fiche : {liste}."
                    ),
                    "provenance": "kit",
                    "components": [c[0] for c in comps],
                    "note": (
                        "Un kit n’a pas de composition propre : la réglementation impose la "
                        "liste des ingrédients de chaque produit qui le compose, consultable "
                        "sur la fiche correspondante."
                    ),
                }
        elif pid in DEFINITION:
            entree = {
                "inci": DEFINITION[pid]["inci"],
                "provenance": "definition",
                "note": DEFINITION[pid]["note"],
                "keyIngredients": DEFINITION[pid]["actifs"],
            }
        else:
            for requete in [nom_epure(nom)] + REQUETES.get(pid, []):
                chemins = (
                    [PAGE_IMPOSEE[pid]]
                    if pid in PAGE_IMPOSEE
                    else _chercher(requete)
                )
                for chemin in chemins:
                    try:
                        titre, inci = lire_incidecoder(chemin)
                    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
                        continue
                    if inci and score(requete, titre) >= 0.5:
                        entree = {
                            "inci": nettoyer(inci),
                            "provenance": "source",
                            "sourceUrl": INCIDECODER + chemin,
                            "sourceTitle": nettoyer(titre),
                            "score": round(score(requete, titre), 2),
                        }
                        break
                if entree:
                    break
                time.sleep(0.3)
            if not entree:
                entree = _boutique(marque, nom)

        trouves[pid] = (
            {**entree, "productId": pid}
            if entree
            else {"productId": pid, "inci": "", "provenance": "introuvable"}
        )
        time.sleep(0.3)
    return trouves


def _chercher(requete: str) -> list[str]:
    try:
        return chercher_incidecoder(requete)[:1]
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
        return []


def _boutique(marque: str, nom: str) -> dict | None:
    try:
        entree = depuis_boutique(marque, nom)
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError):
        return None
    if entree:
        entree["provenance"] = "source"
    return entree


def emettre(trouves: dict) -> str:
    lignes = [
        "// GÉNÉRÉ AUTOMATIQUEMENT — ne pas éditer à la main.",
        "// Relancer : python3 scripts/buildCatalogueInci.py",
        "//",
        "// Listes INCI du catalogue KURLA. Une composition cosmétique est une donnée",
        "// réglementaire (règlement (CE) n° 1223/2009, art. 19) : elle est recopiée d’une",
        "// source citée, déduite de la définition d’un produit monocomposant, ou renvoyée",
        "// vers les fiches des produits inclus pour un kit. Jamais inventée.",
        "//",
        "// `provenance: 'introuvable'` signifie qu’aucune source publique ne donne la",
        "// composition : le produit doit être retiré de la vente, pas complété au jugé.",
        "",
        "export type InciProvenance = 'source' | 'definition' | 'kit' | 'introuvable';",
        "",
        "export interface CatalogueInciEntry {",
        "  productId: string;",
        "  /** Liste INCI complète, telle que publiée par la source. */",
        "  inci: string;",
        "  provenance: InciProvenance;",
        "  /** Page exacte consultée — permet de revérifier la composition. */",
        "  sourceUrl?: string;",
        "  /** Titre de la fiche source, pour contrôler la correspondance. */",
        "  sourceTitle?: string;",
        "  /** Ingrédients clés en français, dérivés de la composition réelle. */",
        "  keyIngredients?: string[];",
        "  /** Produits inclus, pour un kit. */",
        "  components?: string[];",
        "  note?: string;",
        "}",
        "",
        "export const CATALOGUE_INCI: CatalogueInciEntry[] = [",
    ]
    for pid in sorted(trouves):
        e = trouves[pid]
        act = e.get("keyIngredients") or actifs(e.get("inci", ""))
        lignes.append("  {")
        lignes.append(f"    productId: {json.dumps(pid, ensure_ascii=False)},")
        lignes.append(f"    inci: {json.dumps(e.get('inci', ''), ensure_ascii=False)},")
        lignes.append(f"    provenance: {json.dumps(e.get('provenance'), ensure_ascii=False)},")
        for cle in ("sourceUrl", "sourceTitle", "note"):
            if e.get(cle):
                lignes.append(f"    {cle}: {json.dumps(e[cle], ensure_ascii=False)},")
        if e.get("components"):
            comps = ", ".join(json.dumps(c, ensure_ascii=False) for c in e["components"])
            lignes.append(f"    components: [{comps}],")
        if act:
            acts = ", ".join(json.dumps(a, ensure_ascii=False) for a in act)
            lignes.append(f"    keyIngredients: [{acts}],")
        if e.get("score") is not None:
            lignes.append(f"    // correspondance avec le titre source : {e['score']}")
        lignes.append("  },")
    lignes += [
        "];",
        "",
        "export const CATALOGUE_INCI_PAR_ID: Record<string, CatalogueInciEntry> =",
        "  Object.fromEntries(CATALOGUE_INCI.map((e) => [e.productId, e]));",
        "",
    ]
    return "\n".join(lignes)


def main() -> None:
    produits = produits_base()
    trouves = explorer(produits)
    SORTIE.write_text(emettre(trouves), encoding="utf-8")
    resolus = sum(1 for e in trouves.values() if e.get("inci"))
    print(f"{len(trouves)} produits sans composition · {resolus} sourcés")
    for pid, e in sorted(trouves.items()):
        if not e.get("inci"):
            statut = produits[pid].get("catalog_status")
            print(f"  introuvable {pid} · {produits[pid]['name'][:52]} (statut : {statut})")
    print(f"écrit {SORTIE.relative_to(RACINE)}")


if __name__ == "__main__":
    main()
