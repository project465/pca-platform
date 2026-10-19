"""결과지 현재 상태와 홈 현재 상태를 **같은 폭으로 나란히** 둔다(§8 의 열째 장).
늘려 맞추지 않는다: 폭만 같게 두고 세로는 제 비율대로 둔다."""
import sys
from PIL import Image, ImageDraw

out = sys.argv[1]
a = Image.open(f"{out}/1-result-state-d.png").convert("RGB")
b = Image.open(f"{out}/7-me-state-d.png").convert("RGB")
W = 720
def fit(im):
    r = W / im.width
    return im.resize((W, round(im.height * r)), Image.LANCZOS)
a, b = fit(a), fit(b)
pad, head = 24, 44
H = max(a.height, b.height) + head + pad * 2
canvas = Image.new("RGB", (W * 2 + pad * 3, H), "white")
d = ImageDraw.Draw(canvas)
d.text((pad, 14), "Result · Current State", fill=(20, 30, 50))
d.text((pad * 2 + W, 14), "/me Home · Current State", fill=(20, 30, 50))
canvas.paste(a, (pad, head + pad))
canvas.paste(b, (pad * 2 + W, head + pad))
canvas.save(f"{out}/7-compare-result-vs-me.png")
print(f"  떴다 {out}/7-compare-result-vs-me.png")
