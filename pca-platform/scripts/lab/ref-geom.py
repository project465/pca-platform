# -*- coding: utf-8 -*-
"""목표 화면(`reference-home-2026-10-18.png`)의 자리를 화소로 잰다.

**눈으로 재지 않는다.** 올려 그린 그림은 가장자리가 번져 자리마다
다른 배율을 요구하는 것처럼 보인다. 여기서 재는 것은 **경계의 좌표**
이고, 글자는 **가로 잉크 ÷ 자 수**로만 잰다(잉크 높이는 번진다).

판: x 11..583 (573px) 가 1440 짜리 창이다 → 배율 2.5131.
"""
import sys
from PIL import Image

IMG = "docs/metri/shots/reference/reference-home-2026-10-18.png"
PANEL_X0, PANEL_X1 = 11, 584          # 판의 왼쪽·오른쪽(배타)
SCALE = 1440.0 / (PANEL_X1 - PANEL_X0)

im = Image.open(IMG).convert("RGB")
px = im.load()
W, H = im.size


def lum(c):
    return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000.0


def S(v):
    """목표 화면의 길이를 1440 짜리 창의 길이로 옮긴다."""
    return round(v * SCALE, 1)


def ink_cols(y0, y1, x0, x1, dark=True, th=150, minrun=1):
    """세로 구간 안에서 글자(또는 그림)가 선 가로 토막."""
    runs, s = [], None
    for x in range(x0, x1):
        hit = any((lum(px[x, y]) < th) if dark else (lum(px[x, y]) > th)
                  for y in range(y0, y1))
        if hit and s is None:
            s = x
        elif not hit and s is not None:
            if x - s >= minrun:
                runs.append((s, x))
            s = None
    if s is not None:
        runs.append((s, x1))
    return runs


def ink_rows(x0, x1, y0, y1, dark=True, th=150, minrun=1):
    runs, s = [], None
    for y in range(y0, y1):
        hit = any((lum(px[x, y]) < th) if dark else (lum(px[x, y]) > th)
                  for x in range(x0, x1))
        if hit and s is None:
            s = y
        elif not hit and s is not None:
            if y - s >= minrun:
                runs.append((s, y))
            s = None
    if s is not None:
        runs.append((s, y1))
    return runs


def span(runs):
    return (runs[0][0], runs[-1][1]) if runs else None


def font_from_width(ink_w, glyphs, spaces=0.0, latin=False):
    """**글자 폭 ÷ 자 수.** 잉크 높이로 재면 번져서 한 단 커 보인다.

    한글은 한 자가 1em 이고 잉크가 좌우로 0.05em 씩 들어간다고 본다.
    """
    if latin:
        adv = glyphs * 0.54 + spaces * 0.26
        return ink_w / max(adv - 0.1, 0.1)
    adv = (glyphs - 1) + spaces + 0.9
    return ink_w / adv
