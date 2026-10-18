# -*- coding: utf-8 -*-
"""목표 화면을 데스크톱 판과 손전화 판으로 나눠 화소로 잰다.

**추측하지 않는다.** 경계의 좌표를 읽고, 글자는 가로 잉크 폭으로만
잰다: 올려 그린 그림은 가장자리가 번져 잉크 높이로 재면 한 단 커 보인다.

데스크톱 판은 창 그림의 폭을 1440 으로 보고, 손전화 판은 화면 폭을
390 으로 본다. 두 배율은 따로 구한다.
"""
import sys
from PIL import Image

IMG = "docs/metri/shots/reference/reference-home-desktop.png"
im = Image.open(IMG).convert("RGB")
px = im.load()
W, H = im.size

DWIN = (34, 1046)                  # 데스크톱 창 그림의 왼쪽·오른쪽(배타)
DS = 1440.0 / (DWIN[1] - DWIN[0])  # 1.4229

BG_D = (252, 252, 254)             # 데스크톱 본문 바탕
BG_M = (254, 254, 254)             # 손전화 본문 바탕


def lum(c):
    return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000.0


def near(c, t, tol=2):
    return all(abs(c[i] - t[i]) <= tol for i in range(3))


def card(c):
    """흰 카드: 바탕(252,252,254)보다 밝고 푸른 기가 없다."""
    return c[0] >= 253 and abs(c[2] - c[0]) <= 1


def ink_cols(y0, y1, x0, x1, th=150, minrun=1):
    runs, s = [], None
    for x in range(x0, x1):
        hit = any(lum(px[x, y]) < th for y in range(y0, y1))
        if hit and s is None:
            s = x
        elif not hit and s is not None:
            if x - s >= minrun:
                runs.append((s, x))
            s = None
    if s is not None:
        runs.append((s, x1))
    return runs


def ink_rows(x0, x1, y0, y1, th=150, minrun=1):
    runs, s = [], None
    for y in range(y0, y1):
        hit = any(lum(px[x, y]) < th for x in range(x0, x1))
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


def em_from_ink(ink_w, glyphs):
    """한글 한 자를 1em 으로 보고 양끝이 0.05em 씩 들어간다고 본다."""
    return round(ink_w / max(glyphs - 0.1, 0.1), 2)


def box(x, y, is_in, xlim, ylim):
    """(x,y) 를 품은 덩이의 네 모서리."""
    x0 = x
    while x0 > xlim[0] and is_in(px[x0 - 1, y]):
        x0 -= 1
    x1 = x
    while x1 < xlim[1] - 1 and is_in(px[x1 + 1, y]):
        x1 += 1
    y0 = y
    while y0 > ylim[0] and is_in(px[x, y0 - 1]):
        y0 -= 1
    y1 = y
    while y1 < ylim[1] - 1 and is_in(px[x, y1 + 1]):
        y1 += 1
    return x0, y0, x1 + 1, y1 + 1


def rect(pred, x0, x1, y0, y1, frac=0.5):
    """창 안에서 pred 가 참인 덩이의 네 모서리를 '줄마다 몇 개나 맞는가'로 센다."""
    rowhit = [sum(1 for x in range(x0, x1) if pred(px[x, y])) for y in range(y0, y1)]
    colhit = [sum(1 for y in range(y0, y1) if pred(px[x, y])) for x in range(x0, x1)]
    mw = max(rowhit) if rowhit else 0
    mh = max(colhit) if colhit else 0
    ys = [y0 + i for i, v in enumerate(rowhit) if v >= mw * frac]
    xs = [x0 + i for i, v in enumerate(colhit) if v >= mh * frac]
    if not ys or not xs:
        return None
    return xs[0], ys[0], xs[-1] + 1, ys[-1] + 1


# ── 잰 자리 (화소 좌표는 전부 이 그림에서 읽은 값이다) ───────────────
MSCR = (1073, 1418)                # 손전화 화면의 왼쪽·오른쪽(배타)
MS = 390.0 / (MSCR[1] - MSCR[0])   # 1.1304


def D(v):
    return round(v * DS, 1)


def M(v):
    return round(v * MS, 1)


DESK = [
    # (이름, 그림 화소, 셈하는 법)
    ("창 폭", 1012, "34..1046"),
    ("왼쪽 띠 폭", 218, "34..252"),
    ("본문 왼 여백", 24, "252..276"),
    ("본문 오른 여백", 22, "1024..1046"),
    ("본문 글 폭", 748, "276..1024"),
    ("머리 줄 높이", 86, "본문 위 179 ~ Hero 위 265"),
    ("Hero 높이", 227, "265..492"),
    ("Hero 글 폭", 488, "323..811 (본문 줄)"),
    ("Hero 그림 폭", 213, "811..1024"),
    ("Hero 안쪽 왼 여백", 47, "276..323"),
    ("Hero → 절 머리", 21, "492..513"),
    ("절 머리 → 거드는 줄", 5, "541..546"),
    ("거드는 줄 → 타일", 13, "560..573"),
    ("타일 → 다음 절 머리", 34, "659..693"),
    ("줄 묶음 → 다음 절 머리", 36, "874..910"),
    ("타일 폭", 242, "279..521 · 532..774 · 786..1023"),
    ("타일 사이", 11, "521..532"),
    ("타일 높이", 85, "573..659"),
    ("타일 배지", 53, "53×53"),
    ("변화 줄 높이", 44, "잉크 중심 사이 766→811→855"),
    ("기록 줄 높이", 55, "잉크 중심 사이 983→1038"),
    ("CTA 단추", (196, 45), "323..519 × 425..470"),
    ("기록 단추", (99, 36), "909..1008 × 979..1015"),
    ("검색칸", (197, 40), "661..858 × 195..235"),
]

MOB = [
    ("화면 폭", 345, "1073..1418"),
    ("본문 좌우 여백", 20, "1073..1093 · 1399..1418"),
    ("본문 글 폭", 306, "1093..1399"),
    ("상태 줄", 44, "화면 위 ~ 머리띠 위"),
    ("머리띠 높이", 56, "로고 줄 198..221 둘레"),
    ("쪽 제목 → 메타", 7, "271..278"),
    ("Hero 안쪽 위 여백", 24, "Hero 위 ~ 눈썹 322"),
    ("Hero 높이", 298, "308..606"),
    ("CTA 단추", (273, 39), "1110..1383 × 522..561"),
    ("타일 높이", 70, "카드 테 695..739 에 둥글기"),
    ("타일 사이", 8, "739..763 에서 둥글기를 뺀다"),
    ("타일 묶음 간격", 78, "잉크 699 → 768 → 838"),
    ("아래 띠 높이", 73, "금 1005 ~ 이름표 아래 1078"),
    ("아래 띠 금", 1, "y=1005"),
]


# ── 글자 크기 ──────────────────────────────────────────────────────
# **잉크 높이로 재지 않는다.** 올려 그린 그림은 가장자리가 번져 한 단 커
# 보인다. 재는 것은 **가로 잉크 ÷ 그 글의 진폭(em)** 이다.
LAT = {"(": .33, ")": .33, "P": .62, "R": .64, "O": .74, "D": .72, "F": .56,
       "#": .60, "C": .70, "M": .87, "a": .55, "e": .55, "r": .38, "i": .27,
       "t": .36, "A": .66, "T": .60, "I": .27, "G": .77, "S": .60, "N": .75,
       "E": .58, "L": .53}


def adv(text):
    """그 글이 몇 em 을 차지하는가. 한글 1.0 · 숫자 0.6 · 사이띄개 0.25."""
    t = 0.0
    for ch in text:
        o = ord(ch)
        if 0xAC00 <= o <= 0xD7A3 or 0x3131 <= o <= 0x318E:
            t += 1.0
        elif ch.isdigit():
            t += 0.6
        elif ch == " ":
            t += 0.25
        elif ch in ".,":
            t += 0.27
        elif ch == "·":
            # **가운뎃점은 한 자가 아니다.** 1.0em 으로 잡으면 그 점이 든 줄이
            # 통째로 어긋난다. 두 글(시험·계측 · 구조·내구 해석)의 잉크 폭 비로
            # 풀면 0.34em 이 나온다(R27 §A).
            t += 0.34
        elif ch in LAT:
            t += LAT[ch]
        else:
            t += 0.5
    return t


def size_of(ink_w, text, scale):
    """잉크 폭과 글에서 그 자리의 글자 크기를 구한다(양끝 0.05em 안쪽)."""
    a = adv(text) - 0.1
    return round(ink_w / a * scale, 1)
