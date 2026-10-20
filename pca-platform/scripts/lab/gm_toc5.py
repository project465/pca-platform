"""80쪽 설계(data/report-gm/biz-pro-toc.v1.json)를 사람이 읽는 표로 옮긴다.

표를 손으로 적지 않는다. 쪽을 고칠 곳은 JSON 하나이고 이 스크립트가 문서를 다시 만든다.

    python3 -I scripts/lab/gm_toc5.py   → docs/metri/review/pdf-gm/v5-plan/TOC_80.md
"""
import json
from collections import Counter

d = json.load(open("data/report-gm/biz-pro-toc.v1.json", encoding="utf-8"))
P = d["pages"]
out = ["# CareerMatri PRO · 경영학과 80쪽 상세 목차와 쪽별 설계", "",
       "> 이 문서는 `data/report-gm/biz-pro-toc.v1.json` 에서 만든다(`scripts/lab/gm_toc5.py`). 손으로 고치지 않는다.", "",
       f"상태: **{d['status']}** — 설계안이다. 80쪽을 다시 뽑지 않았고 운영 PDF 와 연결하지 않았다. 쪽 수 범위 {d['range'][0]}~{d['range'][1]}.", "",
       f"규칙: {d['rule']}", "", "## 1. 장별 쪽 수", "", "| 장 | 이름 | 쪽 |", "|---|---|---|"]
for k, v in d["parts"].items():
    out.append(f"| {k} | {v['title']} | {v['pages']} |")
c = Counter(p["feasible"] for p in P)
gap = sum(1 for p in P if p["missing"])
cond = sum(1 for p in P if p["when"])
out += ["", "## 2. 작성 가능 여부 요약", "", "| 구분 | 뜻 | 쪽 |", "|---|---|---|"]
for k, v in d["feasible"].items():
    out.append(f"| `{k}` | {v} | {c.get(k, 0)} |")
out += ["", f"- 부족한 조사 자료가 걸린 쪽: **{gap}쪽**(그 쪽은 자료가 없는 칸을 ‘확인 필요’ 로 세우고 지어내지 않는다).",
        f"- 학생 자료에 따라 서거나 빠지는 쪽: **{cond}쪽**(`언제` 칸). 빠지면 다른 쪽으로 채우지 않는다.", "",
        "## 3. 검증 상태 표기", "", "| 표기 | 뜻 |", "|---|---|"]
for k, v in d["verify"].items():
    out.append(f"| `{k}` | {v} |")
out += ["", "## 4. 쪽별 설계", ""]
cur = None
for p in P:
    if p["part"] != cur:
        cur = p["part"]
        out += ["", f"### {cur}. {d['parts'][str(cur)]['title']} ({d['parts'][str(cur)]['pages']}쪽)", "",
                "| 쪽 | 제목 | 유형 | 층 | 담는 것 | 입력(파일·칸) | 검증 | 작성 | 부족 자료 | 언제 · 재사용 |",
                "|---|---|---|---|---|---|---|---|---|---|"]
    note = " · ".join(x for x in [p["when"] and f"언제: {p['when']}", p["reuse"] and f"재사용: {p['reuse']}"] if x) or "—"
    out.append(f"| {p['n']} | {p['title']} | {p['type']} | {p['layer']} | {p['content']} | {p['inputs']} | `{p['verify']}` | `{p['feasible']}` | {', '.join(p['missing']) or '—'} | {note} |")
out += ["", "## 5. 부족한 조사 자료", "", "| 번호 | 무엇 | 왜 | 어디서 | 상태 | 걸린 쪽 |", "|---|---|---|---|---|---|"]
for k, m in d["missing"].items():
    out.append(f"| {k} | {m['what']} | {m['why']} | {m['where']} | `{m['status']}` | {', '.join(map(str, m['pages']))} |")
open("docs/metri/review/pdf-gm/v5-plan/TOC_80.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
print("TOC_80.md ·", dict(c), "· 부족 자료 걸린 쪽", gap, "· 조건부", cond)
