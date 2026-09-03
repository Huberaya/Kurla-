#!/usr/bin/env python3
"""Assemble public/favicon.ico (16/32/48/64) depuis favicon-256.png."""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(ROOT, 'public', 'favicon-256.png')
out = os.path.join(ROOT, 'public', 'favicon.ico')
im = Image.open(src).convert('RGBA')
im.save(out, 'ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print(f'✓ {out}')
