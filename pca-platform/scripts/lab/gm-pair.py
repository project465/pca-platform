#!/usr/bin/env python3
"""v3 쪽과 v4 쪽을 같은 높이로 나란히 놓은 그림 한 장.
   python3 scripts/lab/gm-pair.py <v3.jpg> <v4.png> <out.jpg> "<왼쪽 이름>" "<오른쪽 이름>"
"""
import sys
from PIL import Image, ImageDraw, ImageFont

a, b, out, la, lb = sys.argv[1:6]
H = 1100
def fit(p):
    im = Image.open(p).convert("RGB")
    return im.resize((round(im.width * H / im.height), H))
A, B = fit(a), fit(b)
pad, top = 28, 46
W = A.width + B.width + pad * 3
canvas = Image.new("RGB", (W, H + top + pad), "#e9edf3")
canvas.paste(A, (pad, top)); canvas.paste(B, (pad * 2 + A.width, top))
d = ImageDraw.Draw(canvas)
font = None
for f in ["var/pdf-gm/fonts/nanum/NanumGothicBold.ttf", "var/pdf-gm/fonts/pretendard/Pretendard-Bold.otf"]:
    try:
        font = ImageFont.truetype(f, 20); break
    except OSError:
        pass
d.text((pad, 14), la, fill="#5e6675", font=font)
d.text((pad * 2 + A.width, 14), lb, fill="#13294b", font=font)
canvas.save(out, quality=88)
