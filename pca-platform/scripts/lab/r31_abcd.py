# -*- coding: utf-8 -*-
"""A/B/C/D 학생 시나리오 비교표를 `scenarios/scenarios.json` 에서 만든다.

손으로 적지 않는다. 입력(응답 규칙)은 `scripts/_v3-answer.ts` 의 `PEOPLE` 과
`scripts/lab/r30-scenarios.ts` 의 `D` 를 그대로 읽고, 출력은 서버 함수가 낸
값(`scenarios.json`)을 그대로 옮긴다. 사실(학생이 고른 항목) · 추론(엔진이 가른
묶음과 머리글) · 권고(Hero · 빈자리 · 할 일)를 칸으로 가른다.

  python3 scripts/lab/r31_abcd.py docs/metri/review/r31/scenarios
"""
import json, os, re, sys

root = sys.argv[1]
J = json.load(open(os.path.join(root, "scenarios.json"), encoding="utf-8"))

# ── 입력 규칙: TS 리터럴에서 읽는다 ─────────────────────────────────────
def read(p): return open(p, encoding="utf-8").read()
TS = read("scripts/_v3-answer.ts") + "\n" + read("scripts/lab/r30-scenarios.ts")

def policy(pid):
    m = re.search(r'id:\s*"%s",\s*name:\s*"([^"]+)"' % pid, TS)
    if not m: raise SystemExit(f"입력 규칙을 못 찾았다: {pid}")
    end = re.search(r"\n\s*\}[,;]", TS[m.start():])
    seg = TS[m.start(): m.start() + (end.end() if end else 500)]
    def num(k):
        mm = re.search(r'\b%s:\s*(\d+)' % k, seg); return int(mm.group(1)) if mm else None
    grid = re.search(r'grid:\s*\[(\d+),\s*(\d+),\s*(\d+)\]', seg)
    by = re.search(r'levelBy:\s*\{([^}]*)\}', seg)
    byd = dict(re.findall(r'(J\d):\s*(\d)', by.group(1))) if by else {}
    return {"name": m.group(1), "grid": tuple(map(int, grid.groups())) if grid else None,
            "level": num("level"), "levelBy": byd, "scale5": num("scale5"),
            "picks": num("picks"), "artifacts": num("artifacts"), "verify": num("verify")}

TAX = json.load(open("sites/pca-platform/content/biz-v1-taxonomy.json", encoding="utf-8"))
TD = {d["code"]: d["name"] for d in TAX["technical_domains"]}
def dn(c): return TD.get(c, c)
LV = ["해본 적 없음", "조건은 주어짐(참여)", "직접 수행", "조건·기준까지 직접 정함"]
POL = {k: policy(k) for k in ["A", "B", "C", "D"]}
# D 는 C 를 덮어쓰므로 C 의 grid·scale5 를 물려받는다 (TS 의 `...PEOPLE[2]`)
for k in ("grid", "scale5"):
    if POL["D"].get(k) is None: POL["D"][k] = POL["C"][k]

def cell(x):
    if x is None: return "-"
    if isinstance(x, (list, tuple)):
        return " / ".join(str(v) for v in x) if x else "(없음)"
    return str(x).replace("|", "·").replace("\n", " ")

def table(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    for r in rows: out.append("| " + " | ".join(cell(c) for c in r) + " |")
    return out

L = ["# A/B/C/D 학생 시나리오 비교표 (BIZ_CORE_V1)", "",
     "네 사람은 **같은 문항**에 서로 다른 규칙으로 답한 것이고, 아래 모든 값은 서버 함수가 낸 결과를",
     "글자 그대로 옮긴 것이다(`scenarios.json`). 사실(학생이 고른 항목) · 추론(엔진이 가른 묶음과 머리글) ·",
     "권고(Hero · 빈자리 · 할 일)를 칸으로 가른다. **없는 프로젝트·성과·산출물을 만들지 않는다**: 근거 칸의",
     "항목은 전부 그 Core 의 체크리스트와 산출물·검증 보기에서 학생이 고른 것이다.", ""]

# 1. 입력
L += ["## 1. 입력값 (응답 규칙)", "",
      "`grid` 는 영역 훑기의 관심(1~5) · 경험(0~2) · 배울 뜻(1~5) 보기, `level` 은 소유 사다리 넷 가운데 고른 자리,",
      "`levelBy` 는 축마다 덮는 자리, `picks/artifacts/verify` 는 근거 묶음·산출물·검증 보기에서 앞에서부터 고른 수다.", ""]
rows = []
for k in "ABCD":
    p = POL[k]
    by = ", ".join(f"{a}→{LV[int(v)]}" for a, v in p["levelBy"].items()) or "(전 축 같음)"
    rows.append((k, p["name"], f"관심 {p['grid'][0]} · 경험 {p['grid'][1]} · 배울 뜻 {p['grid'][2]}",
                 LV[p["level"]], by, f"근거 {p['picks']} · 산출물 {p['artifacts']} · 검증 {p['verify']}",
                 f"{J[k]['login']} · 응시 {J[k]['before']['attempt']}"))
L += table(["", "처지", "영역 훑기", "소유 보기(기본)", "축별 덮음", "고른 수", "계정·응시"], rows) + [""]

# 2. 결과 (추론)
L += ["## 2. 결과 — 엔진이 가른 것 (추론)", ""]
rows = []
for k in "ABCD":
    b = J[k]["before"]
    zones = b["zones"]
    z1 = [d for d, z in zones.items() if z.startswith("Z1")]
    z2 = [d for d, z in zones.items() if z.startswith("Z2")]
    z4 = [d for d, z in zones.items() if z.startswith("Z4")]
    nx = [d for d, z in zones.items() if z == "NOT_EXPLORED"]
    rows.append((k, f"**{b['headline']['title']}** — {b['headline']['lead']}",
                 " / ".join(dn(x) for x in b["focus"]) or "(없음)",
                 f"Z1 {len(z1)} · Z2 {len(z2)} · Z4 {len(z4)} · 묻지 않음 {len(nx)}",
                 b["result_state"]["lead"] or "(카드 없음)",
                 "같음" if b["result_state"]["lead"] == b["me_state"]["lead"] and
                 [t["name"] for t in b["result_state"]["tiles"]] == [t["name"] for t in b["me_state"]["ready"]] else "다름"))
L += table(["", "머리글", "먼저 볼 영역(focus)", "묶음 수", "현재 상태 머리", "결과지 ↔ /me"], rows) + [""]

# 3. 현재 상태 카드 (사실 + 추론)
L += ["## 3. 현재 상태 카드 셋 — 결과지와 /me 가 같은 함수로 세운다", ""]
rows = []
for k in "ABCD":
    b = J[k]["before"]
    for t in b["result_state"]["tiles"]:
        rows.append((k, t["name"], t["sub"], t["zone"], t.get("actual_artifacts") or []))
    if not b["result_state"]["tiles"]: rows.append((k, "(카드 없음)", "", "", ""))
L += table(["", "영역", "세부(종류)", "묶음", "실제 남긴 것(사실)"], rows) + [""]

# 4. Evidence (사실)
L += ["## 4. Evidence — 학생이 고른 항목 (사실)", "",
      "`did` 는 체크리스트에서 고른 행동, `decided` 는 그 가운데 직접 정한 것으로 센 항목, `artifacts` 와",
      "`verifications` 는 산출물·검증 보기에서 고른 것이다. 이야기 줄은 그 항목에서 뽑은 것이고 새로 지은 문장이 아니다.", ""]
rows = []
for k in "ABCD":
    ev = J[k]["before"]["evidence"]
    if not ev: rows.append((k, "(근거 없음)", "", "", "", "", "")); continue
    for e in ev:
        s = e.get("story") or {}
        rows.append((k, e["domain"], f"{len(e['did'])} / {len(e['decided'])} / {len(e['artifacts'])} / {len(e['verifications'])}",
                     e["artifacts"] or [], e["verifications"] or [],
                     f"{s.get('action','')} · {s.get('decision','')}".strip(" ·"),
                     f"{s.get('application','')} · 면접 {s.get('question','')}".strip(" ·")))
L += table(["", "영역", "did / decided / artifacts / verif", "남긴 것", "견준 것", "이야기(행동 · 판단)", "지원서 · 면접"], rows) + [""]

# 5. Gap (권고 1)
L += ["## 5. Gap — 더 채울 부분 (권고)", ""]
rows = []
for k in "ABCD":
    g = J[k]["before"]["gaps"]
    if not g: rows.append((k, "(빈자리 없음)", "", "")); continue
    for x in g:
        t = x.get("title", ""); dom, _, rest = t.partition(" · ")
        rows.append((k, dom, rest or t, x.get("why", "")))
L += table(["", "영역", "빈자리(제목)", "왜 필요한가"], rows) + [""]

# 6. Action / Hero (권고 2)
L += ["## 6. Hero(지금 할 일 하나)와 Action 목록 (권고)", ""]
rows = []
for k in "ABCD":
    h = J[k]["before"]["hero"]
    acts = J[k]["before"]["actions"]
    kinds = {}
    for a in acts: kinds[a["code"]] = kinds.get(a["code"], 0) + 1
    rows.append((k, f"[{h['code']}] **{h['head']}** — {h['brief']}", h.get("gain", ""),
                 f"{len(acts)}개 · " + ", ".join(f"{c} {n}" for c, n in kinds.items()),
                 acts[0]["do"] if acts else ""))
L += table(["", "Hero", "왜(gain)", "Action 수·종류", "첫 Action"], rows) + [""]

# 7. 경험 추가 전후
L += ["## 7. 경험 추가 → 현재 상태 갱신 (B · C · D)", ""]
rows = []
for k in "ABCD":
    r = J[k]
    ex = r.get("experience")
    if not ex: rows.append((k, "(추가 없음)", "", "", "", "")); continue
    af = r.get("after") or {}
    rows.append((k, ex.get("td"), ex.get("moved") or [], ex.get("zone_moves") or [], ex.get("closed_gaps"),
                 (af.get("hero") or {}).get("head", "") + " / 빈자리 " + str(len(af.get("gaps") or []))))
L += table(["", "추가한 영역", "움직인 축", "묶음 이동", "닫힌 빈자리", "추가 뒤 Hero / 빈자리 수"], rows) + [""]

# 8. 서로 갈리는 자리
L += ["## 8. 네 사람이 서로 갈리는 자리", ""]
def hl(k): return J[k]["before"]["headline"]["title"]
L += [f"- 머리글이 넷 다 다르다: " + " · ".join(f"{k} `{hl(k)}`" for k in "ABCD"),
      f"- C 와 D 는 활동 수가 같고(`did` 수) 직접 정한 것(J3)만 다르다 → 머리글 `{hl('C')}` vs `{hl('D')}`, "
      f"focus {len(J['C']['before']['focus'])} vs {len(J['D']['before']['focus'])}곳.",
      f"- A 는 Z1·Z2 가 0 이라 카드가 서지 않고 Hero 가 `{J['A']['before']['hero']['head']}` 다. 빈자리를 지어내지 않는다.",
      f"- B 는 해 봤고 정리만 남은 묶음(Z2) {sum(1 for z in J['B']['before']['zones'].values() if z.startswith('Z2'))}곳이고 산출물 0 → Hero 가 `{J['B']['before']['hero']['head']}`.",
      "", "**AI Advantage**: 위의 개인화는 전부 결과 모델 · 학생 사전 · 규칙이 만든다. LLM 호출은 0건이다(FAIL 로 유지).", ""]

open(os.path.join(root, "ABCD_COMPARISON.md"), "w", encoding="utf-8").write("\n".join(L))
print("  떴다", os.path.join(root, "ABCD_COMPARISON.md"))
