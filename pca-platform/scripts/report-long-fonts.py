#!/usr/bin/env python3
"""
긴 결과지(PRO 책자)가 쓰는 글꼴 네 벌을 만든다.

    python3 scripts/report-long-fonts.py <Pretendard 정적 OTF 폴더>

까닭: 가변 글꼴(PretendardVariable)과 CFF 윤곽의 OTF 는 크로뮴이 PDF 에 Type 3 로
싣는다. 굵기마다 쪽마다 윤곽을 다시 실어서 책 한 권이 8~10MB 가 됐다. 윤곽을
TrueType(glyf)으로 바꾸면 크로뮴이 쓴 글자만 골라 싣고 책이 1~2MB 로 준다.

하는 일: 굵기 넷(400·600·700·800)을 글자 묶음으로 줄이고, 윤곽을 TrueType 으로
바꾸고, 이름을 바꿔 woff2 로 쓴다. 이름을 바꾸는 까닭은 원본 라이선스(SIL OFL 1.1)가
'Pretendard' 를 예약 이름으로 두어서, 고친 판은 다른 이름을 써야 하기 때문이다.

글자 묶음: 한글 음절 전부와 자모, 기본 라틴, 문장 부호와 기호, 그리고 콘텐츠 파일과
직무 안내와 지역 자료에 실제로 나오는 글자 전부. 묶음에 없는 글자는 화면과 종이 모두
다음 글꼴(Noto Sans CJK KR)로 넘어간다.

필요한 것: fonttools, brotli (pip install fonttools brotli)
"""
import glob
import json
import os
import sys

from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont, newTable

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "fonts", "cm-book")
FAMILY = "CM Book Sans"
WEIGHTS = [(400, "Regular"), (600, "SemiBold"), (700, "Bold"), (800, "ExtraBold")]

RANGES = [
    (0x20, 0x7E), (0xA0, 0xFF), (0x2000, 0x206F), (0x2070, 0x209F), (0x20A9, 0x20AC),
    (0x2100, 0x214F), (0x2150, 0x218F), (0x2190, 0x21FF), (0x2200, 0x22FF), (0x2460, 0x24FF),
    (0x2500, 0x257F), (0x25A0, 0x25FF), (0x2600, 0x26FF), (0x2700, 0x27BF), (0x3000, 0x303F),
    (0x3130, 0x318F), (0x3200, 0x32FF), (0x1100, 0x11FF), (0xAC00, 0xD7A3), (0xFF00, 0xFFEF),
    (0x0391, 0x03C9),
]


def chars_in_sources() -> set:
    files = (glob.glob(os.path.join(ROOT, "sites/pca-platform/content/*.json"))
             + glob.glob(os.path.join(ROOT, "data/report-gm/*.json"))
             + glob.glob(os.path.join(ROOT, "data/report-gm/role-guide/*.json"))
             + glob.glob(os.path.join(ROOT, "data/region/dart-*.json"))
             + glob.glob(os.path.join(ROOT, "data/region/jeonbuk-*.json"))
             + glob.glob(os.path.join(ROOT, "src/lib/me-v3/report-long/*.ts")))
    out = set()
    for f in files:
        with open(f, encoding="utf-8") as fh:
            out.update(ord(c) for c in fh.read())
    return {c for c in out if c >= 0x20}


def to_quadratic(font: TTFont) -> None:
    order = font.getGlyphOrder()
    gs = font.getGlyphSet()
    glyf = newTable("glyf")
    glyf.glyphOrder = order
    glyf.glyphs = {}
    for name in order:
        pen = TTGlyphPen(gs)
        gs[name].draw(Cu2QuPen(pen, 1.0, reverse_direction=True))
        glyf.glyphs[name] = pen.glyph()
    font["loca"] = newTable("loca")
    font["glyf"] = glyf
    del font["CFF "]
    for t in ("VORG",):
        if t in font:
            del font[t]
    glyf.compile(font)
    hmtx = font["hmtx"]
    for name, g in glyf.glyphs.items():
        if hasattr(g, "xMin"):
            hmtx[name] = (hmtx[name][0], g.xMin)
    maxp = newTable("maxp")
    maxp.tableVersion = 0x00010000
    for k in ("maxZones",):
        setattr(maxp, k, 1)
    for k in ("maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs",
              "maxStackElements", "maxSizeOfInstructions", "maxComponentElements"):
        setattr(maxp, k, 0)
    font["maxp"] = maxp
    post = font["post"]
    post.formatType = 3.0
    font.sfntVersion = "\x00\x01\x00\x00"


def rename(font: TTFont, style: str) -> None:
    name = font["name"]
    full = f"{FAMILY} {style}"
    ps = f"CMBookSans-{style}"
    for rec in list(name.names):
        if rec.nameID in (1, 3, 4, 6, 16, 17, 21, 22):
            name.removeNames(nameID=rec.nameID)
    for nid, val in ((1, FAMILY if style == "Regular" else f"{FAMILY} {style}"),
                     (2, "Regular"), (3, f"{ps};derived-from-Pretendard"), (4, full), (6, ps),
                     (16, FAMILY), (17, style)):
        name.setName(val, nid, 3, 1, 0x409)
    desc = ("Derived from Pretendard (c) 2021 Kil Hyung-jin, SIL OFL 1.1. "
            "Subset and converted to TrueType outlines for CareerMatri reports.")
    name.setName(desc, 10, 3, 1, 0x409)


def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/.fonts")
    os.makedirs(OUT, exist_ok=True)
    cps = set()
    for a, b in RANGES:
        cps.update(range(a, b + 1))
    cps |= chars_in_sources()
    sizes = {}
    for w, style in WEIGHTS:
        f = os.path.join(src, f"Pretendard-{style}.otf")
        font = TTFont(f)
        opt = Options()
        opt.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "tnum"]
        opt.name_IDs = ["*"]
        opt.notdef_outline = True
        opt.hinting = False
        sub = Subsetter(opt)
        sub.populate(unicodes=sorted(cps))
        sub.subset(font)
        to_quadratic(font)
        rename(font, style)
        font.flavor = "woff2"
        dst = os.path.join(OUT, f"cm-book-sans-{w}.woff2")
        font.save(dst)
        sizes[w] = os.path.getsize(dst)
    with open(os.path.join(OUT, "fonts.json"), "w", encoding="utf-8") as fh:
        json.dump({"family": FAMILY, "weights": [w for w, _ in WEIGHTS], "codepoints": len(cps), "bytes": sizes}, fh)
    print(json.dumps(sizes))


if __name__ == "__main__":
    main()
