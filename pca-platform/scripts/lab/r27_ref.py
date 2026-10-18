# -*- coding: utf-8 -*-
"""R27 §1 DESIGN CONTRACT. 레퍼런스에서 재어 온 값만 적는다.

**근사치로 비슷하게 만들지 않는다.** 여기 적히는 수는 전부
`reference-home-desktop.png` 의 화소에서 읽은 것이고, 글자는 R24 와 같은
자로 잰다: **가로 잉크 ÷ 그 글의 진폭(em)**. 잉크 높이로 재지 않는다 —
올려 그린 그림은 가장자리가 번져 한 단 커 보인다.
"""
import sys
sys.path.insert(0, "scripts/lab")
from r26_ref import *   # noqa: F401,F403

# ── 덩이를 찾는 자 ──────────────────────────────────────────────────
def band_lum(x0, x1, y):
    v = [lum(px[x, y]) for x in range(x0, x1)]
    return sum(v) / len(v)


def col_lum(x, y0, y1):
    v = [lum(px[x, y]) for y in range(y0, y1)]
    return sum(v) / len(v)


def ink_box(x0, x1, y0, y1, th=170):
    """그 네모 안의 글자 잉크가 차지하는 자리."""
    xs = [x for x in range(x0, x1) if any(lum(px[x, y]) < th for y in range(y0, y1))]
    ys = [y for y in range(y0, y1) if any(lum(px[x, y]) < th for x in range(x0, x1))]
    if not xs or not ys:
        return None
    return xs[0], ys[0], xs[-1] + 1, ys[-1] + 1


def tint_box(x0, x1, y0, y1, d=12):
    """색이 든 면(배지처럼 푸른 기가 도는 자리)."""
    def hit(c):
        return (c[2] - c[0]) > d
    xs = [x for x in range(x0, x1) if any(hit(px[x, y]) for y in range(y0, y1))]
    ys = [y for y in range(y0, y1) if any(hit(px[x, y]) for x in range(x0, x1))]
    if not xs or not ys:
        return None
    return xs[0], ys[0], xs[-1] + 1, ys[-1] + 1


def radius(x0, y0, is_in, lim=30):
    """왼쪽 위 모서리에서 둥글기를 센다. 맨 윗줄이 들어간 만큼이 반지름."""
    for dy in range(lim):
        for dx in range(lim):
            if is_in(px[x0 + dx, y0 + dy]):
                return dx + dy if dy == 0 or dx == 0 else None
    return None
