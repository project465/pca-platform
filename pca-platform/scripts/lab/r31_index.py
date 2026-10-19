# -*- coding: utf-8 -*-
"""R31 Human Review Package 의 INDEX.md 를 증거 파일에서 만든다.

손으로 적지 않는다: 캡처 목록은 `shots/index.json`, E2E 는 `e2e/e2e.json`
과 `e2e/e2e.md`, 종이는 `e2e/pdf/page-*.png`, 시나리오와 검사 묶음은 그
폴더에 있는 파일 그대로다. 파일이 없으면 그 줄은 `없음` 으로 선다.

  python3 scripts/lab/r31_index.py docs/metri/review/r31
"""
import json, os, re, sys

root = sys.argv[1]
lines = ["# R31 Human Review Package · INDEX", "",
         "모든 증거가 이 폴더 아래에 있다. 파일명 · 대상 화면 · 시나리오 · 뷰포트 · 결과를 한 줄씩 적는다.",
         "테스트 계정의 비밀번호와 개인정보는 어디에도 적지 않았다(아이디는 `zzr31…` 꼴의 시험용이다).", ""]
bid = os.path.join(root, "BUILD_ID.txt")
if os.path.exists(bid):
    lines += ["- 모든 캡처 · E2E · PDF · 시나리오는 **같은 빌드**에서 떴다: `" + open(bid, encoding="utf-8").read().strip() + "`",
              "- 한 번에 내려받는 묶음: `../R31_HUMAN_REVIEW_PACKAGE.zip` (이 폴더 전체 + 보고서)",
              "- 빠르게 훑는 자리: `contact/` 의 Contact Sheet(썸네일) → 글자를 읽을 때는 각 칸에 적힌 원본 파일을 연다", ""]

def table(rows, head):
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    for r in rows: out.append("| " + " | ".join(str(x).replace("|", "·") for x in r) + " |")
    return out

# 1. 캡처
lines += ["## 1. BIZ 전체 여정 캡처 (`shots/`)", ""]
idx = os.path.join(root, "shots", "index.json")
if os.path.exists(idx):
    rows = []
    for it in json.load(open(idx)):
        ok = os.path.exists(os.path.join(root, "shots", it["file"]))
        rows.append((f"`shots/{it['file']}`", it["target"], it["scenario"], it["viewport"],
                     ("있음 · " if ok else "없음 · ") + (it.get("note") or "")))
    lines += table(rows, ["파일", "대상", "시나리오", "뷰포트", "결과·메모"])
else:
    lines.append("캡처 색인(`shots/index.json`)이 없다 — 캡처가 돌지 않았다.")
lines.append("")

# 1b. Contact Sheet
cdir = os.path.join(root, "contact")
if os.path.isdir(cdir):
    lines += ["## 1b. Contact Sheet (`contact/`) — 썸네일 · 원본은 위 표의 파일", ""]
    rows = []
    for f in sorted(os.listdir(cdir)):
        kind = ("Desktop 캡처 묶음" if "desktop" in f else "Mobile 캡처 묶음" if "mobile" in f
                else "PDF 전체 쪽" if "pdf" in f else "레퍼런스 대조")
        rows.append((f"`contact/{f}`", kind, "격자 썸네일 · 긴 쪽은 위 일부만 · 칸 아래에 원본 파일명", "-", "있음"))
    lines += table(rows, ["파일", "대상", "시나리오", "뷰포트", "결과"]) + [""]

# 2. E2E
lines += ["## 2. 실제 브라우저 E2E (`e2e/`)", ""]
e2e = os.path.join(root, "e2e", "e2e.json")
if os.path.exists(e2e):
    j = json.load(open(e2e))
    lines += [f"- 서버 `{j['base']}` · Core `{j['core']}` · 자리 `{j['leaf']}` · 응시 `{j['attempt']}` · 아이디 `{j['login_id']}` · {j['at']}",
              f"- 통과 {j['pass']} · 걸림 {len(j['fail'])}" + (" — " + " / ".join(j["fail"]) if j["fail"] else ""),
              "- 걸음마다의 판정: `e2e/e2e.md`", ""]
    pages = sorted(f for f in os.listdir(os.path.join(root, "e2e", "pdf")) if re.match(r"page-\d+\.png$", f)) \
        if os.path.isdir(os.path.join(root, "e2e", "pdf")) else []
    rows = [("`e2e/result.pdf`", "내려받은 PDF 원본", "E2E 학생 · 실제 클릭 응답", "Desktop 요청", "있음" if os.path.exists(os.path.join(root, "e2e", "result.pdf")) else "없음"),
            ("`e2e/result.txt`", "PDF 에서 꺼낸 글자(pdftotext)", "-", "-", "있음" if os.path.exists(os.path.join(root, "e2e", "result.txt")) else "없음")]
    for p in pages:
        rows.append((f"`e2e/pdf/{p}`", f"PDF {int(re.findall(r'\d+', p)[0])}쪽 렌더", "-", "96dpi", "있음"))
    lines += table(rows, ["파일", "대상", "시나리오", "뷰포트", "결과"])
else:
    lines.append("E2E 결과(`e2e/e2e.json`)가 없다 — E2E 가 끝나지 않았다.")
lines.append("")

# 3. 시나리오
lines += ["## 3. 학생별 결과 검증 A/B/C/D (`scenarios/`)", "",
          "- `scenarios/scenarios.md` — 네 사람의 입력 → 머리글 → 현재 상태 → Hero → 빈자리 → 할 일 → 근거 → 경험 추가 뒤 /me (서버 함수로 읽은 글자 그대로)",
          "- `scenarios/scenarios.json` — 같은 값의 기계 판독용",
          "- `scenarios/ABCD_COMPARISON.md` — 입력(응답 규칙) → 머리글·묶음 → 현재 상태 카드 → Evidence(사실) → Gap·Action(권고) → 경험 추가 전후 비교표 (`scripts/lab/r31_abcd.py` 가 json 에서 만든다)", ""]

# 4. 레퍼런스 대조
lines += ["## 4. Premium Home Reference 대조 (`shots/cmp-*.png` · `compare/`)", "",
          "- `shots/cmp-home-vs-reference.png` — 레퍼런스(`docs/metri/shots/reference/reference-home-desktop.png`) ↔ 홈 1440×900 나란히(폭 720 · 늘리지 않음)",
          "- `shots/cmp-result-state-vs-home.png` — 결과지 현재 상태 ↔ 홈 현재 상태(같은 함수)",
          "- `compare/geometry-probe.txt` — 레퍼런스 화소값과 실제 그려진 상자·활자의 자리별 차이(`scripts/lab/r23-probe.ts`)", ""]

# 5. 검사 묶음
lines += ["## 5. 검사·상용화 차단 요소 로그 (`checks/`)", ""]
ck = os.path.join(root, "checks")
if os.path.isdir(ck):
    rows = []
    for f in sorted(os.listdir(ck)):
        t = open(os.path.join(ck, f), encoding="utf-8", errors="ignore").read()
        last = [l for l in t.strip().splitlines() if l.strip()][-1:] or [""]
        name = "개인정보·비밀키 검사 (scripts/lab/r31_secrets.py)" if f.startswith("privacy") else f.replace("-", ":").replace(".log", "")
        rows.append((f"`checks/{f}`", name, last[0][:90]))
    lines += table(rows, ["파일", "명령", "마지막 줄"])
lines.append("")
lines += ["## 6. 보고서", "", "- `../../R31_BIZ_GOLD_MASTER_HUMAN_REVIEW.md` — 판정 · P0/P1/P2 · 배포 가능 범위 · 5 기준 PASS/FAIL/NOT VERIFIED · HUMAN REVIEW REQUESTED", ""]
# 7. 전체 파일 목록
lines += ["## 7. 전체 파일 목록 (크기)", ""]
allf = []
for d, _, fs in os.walk(root):
    for f in fs:
        pth = os.path.join(d, f)
        if f == "INDEX.md": continue
        allf.append((os.path.relpath(pth, root), os.path.getsize(pth)))
allf.sort()
lines += table([(f"`{a}`", f"{b/1024:.0f} KB") for a, b in allf], ["파일", "크기"]) + ["",
          f"파일 {len(allf)}벌 · {sum(b for _, b in allf)/1048576:.1f} MB", ""]
open(os.path.join(root, "INDEX.md"), "w", encoding="utf-8").write("\n".join(lines))
print("  떴다", os.path.join(root, "INDEX.md"))
