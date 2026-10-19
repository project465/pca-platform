#!/usr/bin/env python3
"""R34-1: trace.json + 종이 글자(pdftotext)에서 ID 단위 추적표(markdown)를 만든다.
   python3 scripts/lab/r34-trace-table.py var/r34/trace/trace.json var/r34/before/trace182.txt > docs/metri/review/r34/TRACE_BEFORE.md
"""
import json, sys, re
trace = json.load(open(sys.argv[1], encoding="utf8"))
pages = open(sys.argv[2], encoding="utf8").read().split("\f")
def page_of(phrase):
    hits = [i + 1 for i, p in enumerate(pages) if phrase in p.replace("\n", " ") or phrase in re.sub(r"\s+", " ", p)]
    return ",".join(map(str, hits)) if hits else "—"
name = {d["code"]: d["name"] for d in trace["domains"]}
out = []
P = out.append
P(f"# 응시 {trace['attempt']} 추적표 (원본 응시 {trace['from_attempt']} 의 응답을 같은 번호·값으로 옮김)\n")
P(f"- 로그인 아이디: `{trace['login']}` · 스냅샷 `{trace['snapshot_id']}`")
db = trace["db"]
P(f"- DB 에 적힌 것: `v3_responses` **{db['responses']}** 줄 · `v3_evidence_picks` **{db['picks']}** 줄 · `v3_snapshots` **{db['snapshots']}** 줄")
P(f"- 응답 종류: " + " · ".join(f"{k} {v}" for k, v in trace["responses_by_kind"].items()))
v = trace["versions"][0]["module_versions"] if trace.get("versions") else {}
if v:
    P("- 판본: " + " · ".join(f"`{k}={v[k]}`" for k in ("core_code", "item_bank_version", "scoring_version", "result_model_version", "result_copy_version", "result_ui_version") if k in v))
P("\n## 1. 고른 근거 8개 → 결과 모델 → 종이\n")
P("| # | 영역 | 자리(slot) | 글자 그대로 | 결과 모델 칸 | 종이 쪽 |")
P("|---|---|---|---|---|---|")
for i, p in enumerate(trace["picks_in_db"], 1):
    d = next(x for x in trace["domains"] if x["code"] == p["domain_code"])
    where = [k for k in ("did", "decided", "artifacts", "verifications") if p["item_text"] in d[k]]
    axes = [a["axis"] for a in d["axes"] if p["item_text"] in a["picks"]]
    P(f"| {i} | {name[p['domain_code']]} | {p['slot']} | {p['item_text']} | axes[{','.join(axes)}].picks → {', '.join(where) or '(확인에 못 미쳐 did/decided 에 없음)'} | {page_of(p['item_text'])} |")
P("\n## 2. 영역별 판정 (응답 → 축 상태 → 묶음)\n")
P("| 영역 | 묶음(zone) | 축 상태 (from = 문항 번호) | did | decided | artifacts | verifications |")
P("|---|---|---|---|---|---|---|")
for d in trace["domains"]:
    if d["zone"] == "NOT_EXPLORED" and not any(a["from"] for a in d["axes"]):
        continue
    ax = " · ".join(f"{a['axis']}:{a['state']}[{','.join(a['from'])}]" for a in d["axes"] if a["from"])
    P(f"| {d['name']} | {d['zone']} | {ax} | {len(d['did'])} | {len(d['decided'])} | {len(d['artifacts'])} | {len(d['verifications'])} |")
P("\n## 3. 종이에 선 표현과 그 출처\n")
o = trace["overview"]
rows = [
    ("머리 알약", o["badge"], "`overview.headline`=" + o["headline"], "result/text.ko.ts `HEADLINE_BADGE_KO`"),
    ("머리글", o["head"]["title"], f"`overview.focus[0]`={o['focus'][0]} + J3 상태", "result/text.ko.ts `headlineKo()`"),
    ("머리 보조 줄", o["head"]["lead"], "`overview.headline`", "result/text.ko.ts `headlineLead()`"),
    ("근거 절 첫 경험 · 행동", trace["story"]["action"], f"domains[{o['focus'][0]}].decided[0] / did[0]", "result/text.ko.ts `evidenceStoryKo()`"),
    ("근거 절 첫 경험 · 지원서", trace["story"]["application"], "영역 사전의 먼저 정하는 것 + verifications", "result/text.ko.ts `evidenceStoryKo()`"),
    ("근거 절 첫 경험 · 면접", trace["story"]["interview"], "verifications[0]", "result/text.ko.ts `evidenceStoryKo()`"),
]
cm = trace["common"]["ko"]
for t in cm["didOwn"]:
    rows.append(("공통 판단 · 직접 정함", t, "`common.items[].item_id` (owned)", "student/common.ts `commonItemKo(core,id)`"))
for t in cm["didConfirm"]:
    rows.append(("공통 판단 · 해 봄", t, "`common.items[].item_id` (confirmed)", "student/common.ts `commonItemKo(core,id)`"))
for a in trace["actions"]:
    rows.append(("할 일", a["ko"], f"`actions[]` {a['code']} {a.get('domain') or ''}/{a.get('axis') or ''}", "result/text.ko.ts `actionKo()`"))
for g in trace["gaps"]:
    rows.append(("빈자리", g["ko"]["title"], f"`gaps[]` {g['domain']}/{g.get('axis')} {g.get('kind')}", "result/text.ko.ts `gapKo()`"))
P("| 자리 | 종이에 선 글자 | 결과 모델의 출처 칸 | 문장을 만든 함수 | 종이 쪽 |")
P("|---|---|---|---|---|")
for a, t, src, fn in rows:
    key = re.sub(r"\s+", " ", t)[:22]
    P(f"| {a} | {t} | {src} | {fn} | {page_of(key)} |")
P("\n## 4. 공통 판단 원자료 (문항 번호 그대로)\n")
P("| 문항 | 축 | ownership | confirmed | owned | 종이에 선 말 |")
P("|---|---|---|---|---|---|")
items = trace["common"]["raw"].get("items", [])
for it in items:
    P(f"| {it['item_id']} | {it['axis']} | {it.get('ownership')} | {it['confirmed']} | {it['owned']} | |")
print("\n".join(out))
