#!/usr/bin/env bash
# Build Vercel complet. vercel.json delegue ici parce que buildCommand est
# limite a 256 caracteres et que la chaine (vite + sitemap + prerendu + bundle
# serveur vers api/_server.cjs) depasse largement cette limite.
set -euo pipefail

vite build
tsx scripts/generateSitemap.ts
tsx scripts/prerender.ts
esbuild server.ts --bundle --platform=node --format=cjs --packages=external \
  --loader:.jpg=dataurl --loader:.png=dataurl --loader:.svg=dataurl --loader:.webp=dataurl \
  --outfile=api/_server.cjs
