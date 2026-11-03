"""
지역 기업 자료의 글자를 센다: 학생 화면(/me/region)과 책 01·05장에 그대로 서는 칸만 본다.

  python3 -I scripts/lab/region_text_check.py

걸림(종료 1)
  짝 안 맞는 괄호 ( ) [ ] 「 」 ‘ ’ “ ” — 이름·업종·주력 품목에서 여는 쪽이나 닫는 쪽이 빠진 값
보고(종료 0)
  흔한 회사 이름 낱말에 글자 하나가 끼어든 곳('엔지니지어링' ← 엔지니어링)
  — 한 글자를 사이에 둔 되풀이(ABA)를 통째로 세어 봤더니 마흔두 곳이 걸렸고 거의 다
    맞는 이름이었다(에이아이 · 지엔지 · 손에손에). 그래서 낱말 목록(`WORDS`)에 대어
    한 글자가 더 들어간 꼴만 센다. 원본 명단의 값일 수 있어 고치지 않고 사람이 보게 적는다.

네 기관이 읽는 파일: 세종(고려대 세종 · 세종일자리경제진흥원) · 전북(전주대) · 대전·충청(배재대).
대전·충청 명단(`chungcheong-orgs.v1.json`)은 있으면 함께 센다.
"""
import json, os, re, sys

FILES = [
    ("sites/pca-platform/content/sejong-orgs.v1.json", ("name", "sector", "product")),
    ("data/region/jeonbuk-orgs.v1.json", ("name", "sector", "product")),
    ("data/region/chungcheong-orgs.v1.json", ("name", "sector", "product")),
    ("data/region/dart-sejong.v1.json", ("corp_name", "adres")),
    ("data/region/dart-jeonbuk.v1.json", ("corp_name", "adres")),
    ("data/region/jeonbuk-big.v1.json", ("name", "where", "what")),
    ("data/region/dart-checks.v1.json", ("name",)),
]
PAIRS = [("(", ")"), ("[", "]"), ("「", "」"), ("‘", "’"), ("“", "”")]
WORDS = ["엔지니어링", "테크놀로지", "솔루션", "시스템", "인터내셔널", "코리아", "네트웍스", "네트워크", "에너지", "디자인", "컴퍼니", "홀딩스", "바이오", "테크", "산업", "건설", "개발"]


def variant_re(w):
    alts = [re.escape(w[:i]) + "[가-힣]" + re.escape(w[i:]) for i in range(1, len(w))]
    return re.compile("|".join(alts))


VARIANTS = [(w, variant_re(w)) for w in WORDS if len(w) >= 3]


ENUM = re.compile(r"(?<![^\s/:])\d{1,2}\)")


def unbalanced(s):
    s = ENUM.sub("", s)  # 목록 번호 '1)' 는 괄호 짝이 아니다
    out = []
    for a, b in PAIRS:
        depth = 0
        for ch in s:
            if ch == a: depth += 1
            elif ch == b: depth -= 1
            if depth < 0: break
        if depth != 0: out.append(a + b)
    return out


def repeats(s):
    hits = []
    for w, rx in VARIANTS:
        for m in rx.finditer(s):
            if w not in m.group(0): hits.append(f"{m.group(0)} ← {w}?")
    return hits


def main():
    fail, warn, seen = [], [], 0
    for rel, keys in FILES:
        if not os.path.exists(rel):
            print(f"  (없음) {rel}")
            continue
        d = json.load(open(rel))
        rows = d.get("orgs", []) if isinstance(d, dict) else []
        for o in rows:
            for k in keys:
                v = o.get(k)
                if not isinstance(v, str) or not v: continue
                seen += 1
                ub = unbalanced(v)
                if ub: fail.append(f"{rel} · {k} · {v}  ← 짝 안 맞음 {''.join(ub)}")
                rp = repeats(v)
                if rp: warn.append(f"{rel} · {k} · {v}  ← 되풀이 {', '.join(rp)}")
        print(f"  {rel} · {len(rows)}줄")
    print(f"\n칸 {seen}개 · 걸림 {len(fail)} · 보고 {len(warn)}")
    for x in fail: print("  걸림", x)
    for x in warn: print("  보고", x)
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
