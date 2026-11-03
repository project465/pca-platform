"""
PDF 글에서 'AI 가 만든 문서' 로 읽히게 하는 버릇을 센다. 사람이 판정하기 전의 자다.

세는 것(한글 1000자당 · 또는 비율):
  sep      띄운 가운뎃점 ' · ' — 목록을 쉼표·조사 대신 점으로 잇는 버릇
  arrow    '→' — 문장 대신 화살표로 잇는 버릇
  circled  ①②③ — 제목·목록에 동그라미 숫자
  sym      ● ○ ◇ ■ □ ▲ — 문장 앞 기호
  dash     '—' 대시
  colon    줄 머리 '이름: ' 꼴(라벨 + 값)
  ending   문장 끝맺음 쏠림(가장 많은 끝맺음이 차지하는 비율)
  dup      세 번 이상 되풀이된 같은 문장(서로 다른 쪽에서)
  open     같은 첫 여섯 글자로 시작하는 문장이 다섯 번 이상인 틀
  latin    한글 문서에 끼운 영어 라벨(Chapter · Evidence …)
  short    열두 자 미만 토막 줄 비율
쓰는 법: python3 -I scripts/lab/gm_aitell.py a.pdf [b.pdf …]
"""
import re, subprocess, sys, collections, json

def text(pdf):
    return subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True).stdout

def measure(pdf):
    raw = text(pdf).split("\f")
    # 쪽마다 머리말(첫 줄)과 쪽 번호(끝 줄)는 문서의 글이 아니라 빼고 센다
    def body(p):
        ls = [l for l in p.splitlines() if l.strip()]
        return "\n".join(ls[1:-1] if len(ls) > 2 else ls)
    pages = [body(p) for p in raw]
    t = "\f".join(pages)
    ko = len(re.findall(r"[가-힣]", t)) or 1
    per = lambda n: round(n * 1000 / ko, 2)
    lines = [l.strip() for l in t.splitlines() if l.strip()]
    # 문장: 마침표·물음표로 끝나는 덩이
    flat = re.sub(r"\s+", " ", t)
    sents = [s.strip() for s in re.split(r"(?<=[.?!다요])\s+(?=[가-힣A-Z‘“(])", flat) if len(s.strip()) >= 12]
    ends = collections.Counter()
    for s in sents:
        m = re.search(r"([가-힣]{2})[.?!]?$", s)
        if m: ends[m.group(1)] += 1
    tot = sum(ends.values()) or 1
    top = ends.most_common(5)
    # 쪽을 건넌 같은 문장
    where = collections.defaultdict(set)
    for i, p in enumerate(pages):
        for s in re.split(r"(?<=[.?!])\s+", re.sub(r"\s+", " ", p)):
            s = s.strip()
            if len(s) >= 20: where[s].add(i)
    dup = sorted(((len(v), s) for s, v in where.items() if len(v) >= 3), reverse=True)
    opens = collections.Counter(s[:6] for s in sents if re.match(r"[가-힣]", s))
    tmpl = [(n, o) for o, n in opens.most_common() if n >= 5]
    latin = re.findall(r"\b(Chapter|Evidence|Insight|Summary|Action|Gap|Step|Point|Key|CareerMatri)\b", t)
    short = sum(1 for l in lines if len(re.sub(r"\s", "", l)) < 12)
    return {
        "pdf": pdf, "pages": len([p for p in pages if p.strip()]), "ko_chars": ko,
        "sep": per(t.count(" · ")), "arrow": per(t.count("→")), "circled": per(len(re.findall(r"[①-⑳]", t))),
        "sym": per(len(re.findall(r"[●○◇◆■□▲△]", t))), "dash": per(t.count("—")),
        "colon": per(sum(1 for l in lines if re.match(r"^[가-힣A-Za-z ·]{2,14}:\s", l))),
        "ending_top": [(e, round(n / tot, 3)) for e, n in top],
        "dup3": len(dup), "dup_examples": [s[:60] for _, s in dup[:8]],
        "template_opens": tmpl[:10], "latin": len(latin),
        "short_line_ratio": round(short / (len(lines) or 1), 3),
    }

if __name__ == "__main__":
    out = [measure(p) for p in sys.argv[1:]]
    print(json.dumps(out, ensure_ascii=False, indent=1))
