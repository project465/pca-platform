#!/usr/bin/env python3
"""BEFORE | AFTER 를 같은 폭으로 나란히 붙인다. 늘려 맞추지 않는다(폭만 같게).
   python3 scripts/lab/r34-sheet.py OUT.png "LABEL_A" a.png "LABEL_B" b.png [W]
"""
import sys
from PIL import Image, ImageDraw
out, la, a, lb, b = sys.argv[1:6]
W = int(sys.argv[6]) if len(sys.argv) > 6 else 720
def fit(p):
    im = Image.open(p).convert("RGB"); return im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
ia, ib = fit(a), fit(b)
PAD, TOP = 20, 36
sheet = Image.new("RGB", (W * 2 + PAD * 3, max(ia.height, ib.height) + TOP + PAD * 2), "#e9edf3")
d = ImageDraw.Draw(sheet)
for i, (lab, im) in enumerate(((la, ia), (lb, ib))):
    x = PAD + i * (W + PAD)
    d.text((x, 10), lab, fill="#0a1b31")
    sheet.paste(im, (x, TOP + PAD))
sheet.save(out); print(out, sheet.size)
