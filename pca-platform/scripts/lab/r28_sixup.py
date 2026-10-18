"""여섯 Core 의 같은 자리를 한 장으로 세운다(§8).

**늘려 맞추지 않는다**: 폭만 같게 두고 세로는 제 비율대로 둔다. 키가
갈리는 것 자체가 이 비교판이 보려는 것이다.

    python3 scripts/lab/r28_sixup.py c-state-d 2 out.png
"""
import sys
from PIL import Image, ImageDraw

import os
ROOT = os.environ.get("SIXUP_ROOT", "docs/metri/shots/review-loop/r28")
CORES = ["BIZ", "NURSING", "PUBADM", "CS", "EE", "MEDIA"]
NAME = {"BIZ": "경영", "NURSING": "간호", "PUBADM": "행정",
        "CS": "컴퓨터", "EE": "전기전자", "MEDIA": "미디어"}

which = sys.argv[1] if len(sys.argv) > 1 else "c-state-d"
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 2
out = sys.argv[3] if len(sys.argv) > 3 else f"{ROOT}/sixup-{which}.png"

ims, labels = [], []
for c in CORES:
    try:
        ims.append(Image.open(f"{ROOT}/{c}/{which}.png").convert("RGB"))
        labels.append(f"{c} · {NAME[c]}")
    except FileNotFoundError:
        print(f"  없다 {c}/{which}.png")

if not ims:
    sys.exit("그림이 하나도 없습니다")

W = min(i.width for i in ims)
ims = [i.resize((W, round(i.height * W / i.width)), Image.LANCZOS) for i in ims]
PAD, HEAD = 26, 34
rows = (len(ims) + cols - 1) // cols
rowh = [max(ims[r * cols + k].height
            for k in range(cols) if r * cols + k < len(ims)) for r in range(rows)]
sheet = Image.new("RGB",
                  (PAD + cols * (W + PAD), PAD + sum(h + HEAD + PAD for h in rowh)),
                  "#ffffff")
dr = ImageDraw.Draw(sheet)
y = PAD
for r in range(rows):
    x = PAD
    for k in range(cols):
        i = r * cols + k
        if i >= len(ims):
            break
        dr.text((x, y + 8), labels[i], fill="#0b1b33")
        sheet.paste(ims[i], (x, y + HEAD))
        x += W + PAD
    y += rowh[r] + HEAD + PAD
sheet.save(out)
print(f"떴다 {out}  {sheet.width}x{sheet.height}")
