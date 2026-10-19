"""두 그림을 **같은 폭으로 나란히** 둔다. 늘려 맞추지 않는다: 폭만 같게 두고
세로는 제 비율대로 둔다. 레퍼런스와 현재 화면을 견주는 자리가 쓴다.

  python3 scripts/lab/r31_compare.py OUT.png "라벨 A" a.png "라벨 B" b.png [폭]
"""
import sys
from PIL import Image, ImageDraw

out, la, fa, lb, fb = sys.argv[1:6]
W = int(sys.argv[6]) if len(sys.argv) > 6 else 720
a = Image.open(fa).convert("RGB"); b = Image.open(fb).convert("RGB")
def fit(im):
    r = W / im.width
    return im.resize((W, round(im.height * r)), Image.LANCZOS)
a, b = fit(a), fit(b)
pad, head = 24, 44
H = max(a.height, b.height) + head + pad * 2
canvas = Image.new("RGB", (W * 2 + pad * 3, H), "white")
d = ImageDraw.Draw(canvas)
d.text((pad, 14), la, fill=(20, 30, 50))
d.text((pad * 2 + W, 14), lb, fill=(20, 30, 50))
canvas.paste(a, (pad, head + pad)); canvas.paste(b, (pad * 2 + W, head + pad))
canvas.save(out)
print(f"  떴다 {out}")
