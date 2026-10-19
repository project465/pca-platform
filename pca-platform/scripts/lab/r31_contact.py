# -*- coding: utf-8 -*-
"""Contact Sheet: 캡처 전체를 한 장씩 훑어볼 수 있게 격자로 깐다.

  python3 scripts/lab/r31_contact.py docs/metri/review/r31

- `contact/contact-desktop-N.png`  Desktop 1440×900 캡처 (4열)
- `contact/contact-mobile-N.png`   Mobile 390×844 @2x 캡처 (6열)
- `contact/contact-pdf.png`        PDF 쪽 렌더 (4열)
- `contact/contact-compare.png`    레퍼런스 대조 두 장

썸네일은 **원본을 줄인 것**이라 글자가 작다. 글자를 읽을 때는 각 칸 아래에 적힌
파일명의 원본(`shots/*.png` · `e2e/pdf/*.png`)을 연다. 긴 쪽은 위에서 `MAXH` 까지만
보이고 그 사실을 칸에 적는다.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

root = sys.argv[1]
out = os.path.join(root, "contact"); os.makedirs(out, exist_ok=True)

def font(sz):
    for p in ["/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
              "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
              "/usr/share/fonts/truetype/nanum/NanumGothic.ttf"]:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, sz)
            except Exception: pass
    return ImageFont.load_default()

F = font(15); FS = font(13); FH = font(22)

def fit(d, t, f, w):
    while t and d.textlength(t, font=f) > w: t = t[:-2] + "…"
    return t

def wrap(d, t, f, w):
    out, cur = [], ""
    for tok in t.split(" "):
        nxt = (cur + " " + tok).strip()
        if d.textlength(nxt, font=f) <= w or not cur: cur = nxt
        else: out.append(cur); cur = tok
    if cur: out.append(cur)
    if len(out) > 2: out = out[:1] + [fit(d, " ".join(out[1:]), f, w)]
    return out

def sheet(items, cols, thumb_w, maxh, title, path):
    """items: [(abs_path, label1, label2)]"""
    pad, lab = 14, 64
    cells = []
    for p, l1, l2 in items:
        im = Image.open(p).convert("RGB")
        w, h = im.size
        s = thumb_w / w
        nh = int(h * s)
        im = im.resize((thumb_w, nh), Image.LANCZOS)
        cut = nh > maxh
        if cut: im = im.crop((0, 0, thumb_w, maxh))
        cells.append((im, l1, l2 + (f" · 위 {maxh}px 까지 (원본 {h}px)" if cut else f" · 원본 {w}×{h}")))
    rows = (len(cells) + cols - 1) // cols
    ch = maxh + lab + pad
    W = pad + cols * (thumb_w + pad)
    H = 60 + rows * ch + pad
    img = Image.new("RGB", (W, H), (246, 247, 249))
    d = ImageDraw.Draw(img)
    d.text((pad, 18), title, fill=(16, 27, 49), font=FH)
    for i, (im, l1, l2) in enumerate(cells):
        r, c = divmod(i, cols)
        x = pad + c * (thumb_w + pad); y = 60 + r * ch
        d.rectangle([x - 1, y - 1, x + thumb_w, y + maxh], outline=(205, 210, 220))
        img.paste(im, (x, y))
        d.text((x, y + maxh + 6), fit(d, l1, F, thumb_w), fill=(16, 27, 49), font=F)
        ls = wrap(d, l2, FS, thumb_w)
        for j, ln in enumerate(ls[:2]):
            d.text((x, y + maxh + 26 + j * 17), ln, fill=(90, 100, 118), font=FS)
    img.save(path, optimize=True)
    print("  떴다", path, f"{W}×{H}")

idx = json.load(open(os.path.join(root, "shots", "index.json"), encoding="utf-8"))
shots = [(os.path.join(root, "shots", it["file"]), it["file"], it["target"]) for it in idx
         if os.path.exists(os.path.join(root, "shots", it["file"]))]
desk = [s for s in shots if s[1].endswith("-d.png")]
mob = [s for s in shots if s[1].endswith("-m.png")]

def chunks(xs, n):
    for i in range(0, len(xs), n): yield xs[i:i + n]

for n, part in enumerate(chunks(desk, 9), 1):
    sheet(part, 3, 620, 560, f"R31 BIZ · Desktop 1440×900 · 장 {n}", os.path.join(out, f"contact-desktop-{n}.png"))
for n, part in enumerate(chunks(mob, 12), 1):
    sheet(part, 6, 240, 620, f"R31 BIZ · Mobile 390×844 @2x · 장 {n}", os.path.join(out, f"contact-mobile-{n}.png"))

pdfdir = os.path.join(root, "e2e", "pdf")
if os.path.isdir(pdfdir):
    pages = sorted(f for f in os.listdir(pdfdir) if f.startswith("page-") and f.endswith(".png"))
    sheet([(os.path.join(pdfdir, f), f, f"PDF {int(f[5:7])}쪽") for f in pages], 4, 400, 566,
          "R31 BIZ · 내려받은 PDF 전체 쪽 (96dpi 렌더)", os.path.join(out, "contact-pdf.png"))

cmp = [(os.path.join(root, "shots", f), f, t) for f, t in
       [("cmp-home-vs-reference.png", "Premium Home Reference ↔ 홈 /me"),
        ("cmp-result-state-vs-home.png", "결과지 현재 상태 ↔ 홈 현재 상태")]
       if os.path.exists(os.path.join(root, "shots", f))]
if cmp: sheet(cmp, 1, 1400, 1000, "R31 BIZ · 레퍼런스 대조", os.path.join(out, "contact-compare.png"))
