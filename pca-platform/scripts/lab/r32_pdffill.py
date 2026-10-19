# -*- coding: utf-8 -*-
"""쪽마다 글자가 세로로 어디까지 찼는지 센다(96dpi 렌더의 마지막 잉크 줄).
  python3 scripts/lab/r32_pdffill.py var/r32/pdf-c"""
import sys, os
from PIL import Image
import numpy as np
d = sys.argv[1]
pages = sorted(f for f in os.listdir(d) if f.startswith("page") and f.endswith(".png"))
for f in pages:
    im = np.array(Image.open(os.path.join(d, f)).convert("L"))
    H, W = im.shape
    body = im[int(H*0.04):int(H*0.955), :]   # 머리말·쪽 번호 띠는 뺀다
    rows = np.where((body < 200).sum(axis=1) > 3)[0]
    fill = (rows.max() / body.shape[0]) if len(rows) else 0
    print(f"{f}: {fill*100:5.1f}%")
