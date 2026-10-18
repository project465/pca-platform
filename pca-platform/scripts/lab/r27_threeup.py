"""SCENE 1 만 **같은 폭으로** 나란히 세운다(규격 §8).

**늘려 맞추지 않는다**: 셋의 폭만 같게 두고 세로는 제 비율대로 둔다.
늘리면 활자 크기를 눈으로 견줄 수 없게 된다.

레퍼런스에서 자르는 자리는 화소로 재어 둔 값이다(R27 §B·§C): 데스크톱은
본문 왼쪽 276 부터 절 머리 위 500 에서 카드 아래 672 까지, 손전화는 화면
왼쪽부터 절 머리 위 620 에서 카드 아래 895 까지.
"""
import os
from PIL import Image, ImageDraw

REF = "docs/metri/shots/reference/reference-home-desktop.png"
DIR = os.environ.get("OUT", "docs/metri/shots/review-loop/r27")
CROP = {"desktop": (266, 500, 1036, 672), "mobile": (1073, 620, 1418, 895)}
WIDTH = {"desktop": 1012, "mobile": 390}
LABEL = ["REFERENCE", "CURRENT BEFORE", "CURRENT AFTER"]
PAD, TOP = 24, 40


def fit(im, w):
    return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)


def three_up(kind, before, after):
    w = WIDTH[kind]
    ref = fit(Image.open(REF).convert("RGB").crop(CROP[kind]), w)
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
    at = f"{DIR}/threeup-state-{kind}.png"
    out.save(at)
    print(f"  떴다 {at}  {out.width}×{out.height}")


for kind, f in (("desktop", "d2-state.png"), ("mobile", "m2-state.png")):
    three_up(kind, f"{DIR}/before/{f}", f"{DIR}/after/{f}")
