"""REFERENCE / CURRENT BEFORE / CURRENT AFTER 를 **같은 폭으로** 나란히 세운다(규격 §9).

**그림을 늘려 맞추지 않는다**: 셋의 폭만 같게 두고 세로는 제 비율대로
둔다. 늘리면 활자 크기를 눈으로 견줄 수 없게 된다.

목표 화면은 한 장짜리 시안이라 데스크톱 판과 손전화 판을 잘라 쓴다.
자른 자리는 화소로 재어 둔 값이다.
"""
import os
from PIL import Image, ImageDraw

REF = "docs/metri/shots/reference/reference-home-desktop.png"
DIR = os.environ.get("OUT", "docs/metri/shots/review-loop/r26")
PANEL = {"desktop": (34, 0, 1046, 1086), "mobile": (1073, 140, 1418, 1086)}
WIDTH = {"desktop": 1012, "mobile": 390}
LABEL = ["REFERENCE", "CURRENT BEFORE", "CURRENT AFTER"]
PAD, TOP = 24, 40


def fit(im, w):
    return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)


def three_up(kind, before, after):
    w = WIDTH[kind]
    ref = fit(Image.open(REF).convert("RGB").crop(PANEL[kind]), w)
    imgs = [ref, fit(Image.open(before).convert("RGB"), w),
            fit(Image.open(after).convert("RGB"), w)]
    h = max(i.height for i in imgs)
    out = Image.new("RGB", (w * 3 + PAD * 4, h + TOP + PAD), (27, 37, 52))
    d = ImageDraw.Draw(out)
    for i, im in enumerate(imgs):
        x = PAD + i * (w + PAD)
        out.paste((255, 255, 255), (x, TOP, x + w, TOP + h))
        out.paste(im, (x, TOP))
        d.text((x, TOP - 18), LABEL[i], fill=(255, 255, 255))
    at = f"{DIR}/threeup-{kind}.png"
    out.save(at)
    print(f"  떴다 {at}  {out.width}×{out.height}")


three_up("desktop", f"{DIR}/before/d0-viewport.png", f"{DIR}/after/d0-viewport.png")
three_up("mobile", f"{DIR}/before/m0-viewport.png", f"{DIR}/after/m0-viewport.png")
