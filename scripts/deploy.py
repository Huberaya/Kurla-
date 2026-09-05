#!/usr/bin/env python3
"""Déploie la référence demandée (ou HEAD) sur Vercel, puis attend l'état final.

    VERCEL_TOKEN=vcp_… python3 scripts/deploy.py [sha]

Le token n'est jamais écrit dans ce fichier : il vient de l'environnement.
Aucun secret ne doit être commité, y compris celui-ci.

Vercel rejette parfois un token encore valide la minute d'avant avec
« Not authorized: Trying to access resource under scope … You must
re-authenticate ». Ce n'est pas une erreur de ce script : il faut alors
régénérer le token dans Vercel et relancer.
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

PROJECT_ID = "prj_NOZH3rg95ppmyvKy5KAeCbBxCFtl"
REPO_ID = 1322277927
API = "https://api.vercel.com"


def request(method: str, path: str, body=None, token: str = ""):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        API + path,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:400]
        raise SystemExit(f"Vercel a refusé la requête ({e.code}) : {detail}")


def main() -> None:
    token = os.environ.get("VERCEL_TOKEN", "").strip()
    if not token:
        raise SystemExit("VERCEL_TOKEN n'est pas défini dans l'environnement.")

    sha = sys.argv[1] if len(sys.argv) > 1 else subprocess.check_output(
        ["git", "rev-parse", "HEAD"], text=True).strip()

    print(f"Déploiement de {sha[:7]}…")
    deployment = request("POST", "/v13/deployments", {
        "name": "kurlabeauty",
        "project": PROJECT_ID,
        "target": "production",
        "gitSource": {"type": "github", "repoId": REPO_ID, "ref": "main", "sha": sha},
    }, token)

    did = deployment.get("id")
    print(f"  créé : {did}")

    for _ in range(40):
        time.sleep(12)
        current = request("GET", f"/v13/deployments/{did}", token=token)
        state = current.get("status") or current.get("state")
        print(f"  {state}")
        if state in ("READY", "ERROR", "CANCELED"):
            if state == "READY":
                print(f"  en ligne : https://{current.get('url')}")
            return
    print("  délai d'attente dépassé")


if __name__ == "__main__":
    main()
