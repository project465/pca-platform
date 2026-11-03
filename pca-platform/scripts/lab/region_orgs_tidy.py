"""
지역 기업 명단(공개 명단을 옮긴 JSON)에서 **짝이 안 맞는 괄호**만 고친다. 다른 글자는 건드리지 않는다.

  python3 -I scripts/lab/region_orgs_tidy.py data/region/jeonbuk-orgs.v1.json sites/pca-platform/content/sejong-orgs.v1.json

`region_orgs_build.py` · `sejong_orgs_build.py` 로 다시 만든 뒤에도 이 단계를 한 번 돌린다.

규칙 셋(지어내지 않는다):
  1. 이름 맨 앞의 `주)` · `주 )` 는 회사 표시 `(주)` 의 여는 괄호가 빠진 것이라 `(주)` 로 되돌린다.
  2. 그 밖에 짝 없는 `)` 는 지운다. 여는 괄호가 어디 있었는지 모르는데 넣으면 지어내는 것이다
     ('로봇네프론)' → '로봇네프론').
  3. 짝 없는 `(` 도 지운다.
  목록 번호(`1)` · `2)`)는 괄호 짝으로 세지 않는다.
바꾼 칸은 줄마다 `raw` 에 원래 값을 남기고, 파일의 `tidy` 에 언제 무엇을 고쳤는지 적는다.

전주대 시험에서 본 '로봇네프론)' 류는 이 저장소의 정리 과정(`region_orgs_build.py`)이 만든 것이
아니다: 그 스크립트는 명단 수집본의 설명문에서 업종명과 주력 품목을 그대로 꺼낸다. 같은 수집본의
다른 줄은 괄호가 멀쩡하다('(공연장 등)'). 원본 명단 값인지 수집본을 만드는 쪽의 탈인지는 공개 명단
원본을 받아 대어 봐야 갈린다.
"""
import datetime, json, re, sys

KEYS = ("name", "sector", "product")


# 목록 번호 '1)' · '2)' 는 괄호 짝이 아니다(세종 명단의 품목 줄이 그렇게 적혀 있다)
ENUM = re.compile(r"(?<![^\s/:])(\d{1,2})\)")


def fix(s):
    t = re.sub(r"^주\s*\)", "(주)", s)
    t = ENUM.sub(lambda m: m.group(1) + "\x00", t)
    out, depth = [], 0
    for ch in t:
        if ch == "(":
            depth += 1
        elif ch == ")":
            if depth == 0:
                continue
            depth -= 1
        out.append(ch)
    t = "".join(out)
    while t.count("(") > t.count(")"):
        i = t.rfind("(")
        t = t[:i] + t[i + 1:]
    return t.replace("\x00", ")")


def main():
    for rel in sys.argv[1:]:
        d = json.load(open(rel))
        n = 0
        for o in d.get("orgs", []):
            for k in KEYS:
                v = o.get(k)
                if not isinstance(v, str): continue
                f = fix(v)
                if f != v:
                    o.setdefault("raw", {})[k] = v
                    o[k] = f
                    n += 1
        if n:
            d["tidy"] = {"on": datetime.date.today().isoformat(), "rule": "짝 안 맞는 괄호만 고침(이름 앞 '주)' → '(주)', 짝 없는 괄호 지움) · 원래 값은 줄마다 raw", "fixed": n}
            json.dump(d, open(rel, "w"), ensure_ascii=False, indent=1)
        print(f"{rel} · 고친 칸 {n}")


if __name__ == "__main__":
    main()
