#!/usr/bin/env python3
"""PDF 전 쪽을 그림으로 펼치고, 쪽마다 찬 비율을 재고, 한 장으로 모은다.

   python3 scripts/lab/r35_pdfpages.py IN.pdf OUTDIR LABEL

쪽 그림(OUTDIR/LABEL-p-NN.png, 110dpi) · 모은 한 장(OUTDIR/LABEL-sheet.png) ·
쪽마다 글자 수와 아래 여백 비율(OUTDIR/LABEL-pages.json)을 남긴다. 사람이
읽는 판정(한국어 · 줄바꿈 · 여백 · 쪽 나눔)은 이 그림을 보고 따로 적는다.
"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
try:  # 한글 이름표. 기본 글꼴은 한글을 네모로 찍는다
    FONT = ImageFont.truetype("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", 15)
except OSError:
    FONT = None

src, out, label = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
info = subprocess.run(["pdfinfo", src], capture_output=True, text=True).stdout
pages = int([l for l in info.splitlines() if l.startswith("Pages:")][0].split()[1])
subprocess.run(["pdftoppm", "-r", "110", "-png", src, os.path.join(out, f"{label}-p")], check=True)
files = sorted(f for f in os.listdir(out) if f.startswith(f"{label}-p-") and f.endswith(".png"))
rows = []
for i, f in enumerate(files, 1):
    im = Image.open(os.path.join(out, f)).convert("L")
    w, h = im.size
    # 바닥에서 위로 올라가며 잉크가 처음 나오는 줄 (머리말·꼬리말 띠 6% 는 뺀다)
    px = im.load(); last = 0
    for y in range(int(h * 0.06), int(h * 0.94)):
        if any(px[x, y] < 200 for x in range(0, w, 3)):
            last = y
    fill = (last - h * 0.06) / (h * 0.88) if last else 0
    txt = subprocess.run(["pdftotext", "-f", str(i), "-l", str(i), "-layout", src, "-"],
                         capture_output=True, text=True).stdout
    rows.append({"page": i, "file": f, "chars": len("".join(txt.split())), "fill": round(fill, 2)})
json.dump({"pdf": src, "pages": pages, "rows": rows}, open(os.path.join(out, f"{label}-pages.json"), "w"),
          ensure_ascii=False, indent=1)
# 한 장으로 모은다: 네 칸씩
TW = 360; ims = []
for r in rows:
    im = Image.open(os.path.join(out, r["file"])).convert("RGB")
    ims.append(im.resize((TW, round(im.height * TW / im.width)), Image.LANCZOS))
cols = 4; th = max(i.height for i in ims); pad = 16; top = 22
nr = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (TW + pad) + pad, nr * (th + top + pad) + pad), "#e9edf3")
d = ImageDraw.Draw(sheet)
for k, (im, r) in enumerate(zip(ims, rows)):
    x = pad + (k % cols) * (TW + pad); y = pad + (k // cols) * (th + top + pad)
    d.text((x, y + 4), f"{label} p{r['page']}  fill {int(r['fill']*100)}%  chars {r['chars']}", fill="#0a1b31", font=FONT)
    sheet.paste(im, (x, y + top))
sheet.save(os.path.join(out, f"{label}-sheet.png"))
print(f"{label}: {pages}쪽 · " + " ".join(f"p{r['page']}={int(r['fill']*100)}%" for r in rows))
