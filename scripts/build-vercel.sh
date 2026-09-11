#!/usr/bin/env bash
# Build Vercel complet. vercel.json delegue ici parce que buildCommand est
# limite a 256 caracteres et que la chaine (vite + sitemap + prerendu + bundle
# serveur vers api/_server.cjs) depasse largement cette limite.
set -euo pipefail

# ------------------------------------------------------------
# Vercel crée automatiquement un miroir préfixé VITE_ de chacune de ses
# variables VERCEL_ (VITE_VERCEL_GIT_COMMIT_MESSAGE, VITE_VERCEL_PROJECT_ID,
# VITE_VERCEL_URL…). Or Vite inline **toute** variable VITE_ dans le bundle
# client : `envPrefix` vaut `VITE_` par défaut et `import.meta.env` est émis
# comme un objet complet.
#
# Mesuré sur le bundle déployé le 29/08/2026 : 19 variables exposées, dont le
# message de commit **intégral**, le SHA, le propriétaire et le slug du dépôt,
# l'identifiant de projet et les URLs internes de déploiement. Aucun secret
# n'était en jeu — vérifié sur tout l'historique — mais les messages de commit
# devenaient un canal public : un jeton écrit un jour dans un message aurait
# été publié dans la foulée.
#
# Les variables sont retirées de l'environnement du build, pas filtrées dans la
# config : la purge porte sur tout ce que Vercel ajoutera demain, sans liste à
# tenir à jour. SUPABASE_* et les VITE_* applicatifs ne sont pas touchés.
# ------------------------------------------------------------
for __vercel_var in $(env | grep -o '^VITE_VERCEL_[A-Za-z0-9_]*' || true); do
  unset "$__vercel_var"
done
unset __vercel_var

vite build
tsx scripts/generateSitemap.ts
tsx scripts/prerender.ts
esbuild server.ts --bundle --platform=node --format=cjs --packages=external \
  --loader:.jpg=dataurl --loader:.png=dataurl --loader:.svg=dataurl --loader:.webp=dataurl \
  --outfile=api/_server.cjs
