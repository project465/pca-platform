#!/usr/bin/env python3
"""BIZ GM 세 벌의 PDF 글자에서 금지 문구와 되풀이 문장을 센다.
   python3 scripts/lab/gm-copycheck.py var/pdf-gm/txt
"""
import os, re, sys, collections, json
d = sys.argv[1]
BAN = ["역량을 강화할 필요가 있습니다","다양한 경험을 쌓는 것이 중요합니다","지속적인 노력이 요구됩니다",
 "본인의 강점을 적극적으로 활용하세요","해당 직무에 적합한 인재로 성장할 수 있습니다","무한한 가능성","더 나은 미래를 향한 여정",
 "탁월한 역량을 보유","귀하의 잠재력","다양한 경험을 통해 역량을 강화하세요","해당 직무에 적합한 인재입니다","성공적인 커리어를 위한 첫걸음",
 "추천 기업","합격 가능성","적합도","상위 ","%"]
LEGAL_OK = ["추천 기업이라고 부르지","합격 가능성이나","적합도 숫자","적합도·"]
tags = ["RICH","POOR","CONTRA"]
txt = {t: open(os.path.join(d, f"{t}.txt")).read() for t in tags}
out = {"banned": {}, "shared_sentences": 0, "examples": []}
for t, s in txt.items():
    flat = re.sub(r"\s+", " ", s)
    hits = []
    for b in BAN:
        for m in re.finditer(re.escape(b), flat):
            ctx = flat[max(0, m.start()-25): m.end()+25]
            if any(ok in ctx for ok in LEGAL_OK): continue
            if b == "%" and re.search(r"\d+(\.\d+)?%", ctx) and ("출처" in ctx or "KODATA" in ctx or "통계" in ctx or "비중" in ctx): continue
            hits.append((b, ctx))
    out["banned"][t] = hits
def sents(s):
    flat = re.sub(r"\s+", " ", s)
    return {x.strip() for x in re.split(r"(?<=[다요\.])\s", flat) if len(x.strip()) >= 28}
S = {t: sents(s) for t, s in txt.items()}
common = S["RICH"] & S["POOR"] & S["CONTRA"]
pers = {t: len(S[t] - set().union(*[S[u] for u in tags if u != t])) for t in tags}
out["shared_sentences"] = len(common); out["unique_sentences"] = pers
out["total_sentences"] = {t: len(S[t]) for t in tags}
out["examples"] = sorted(common, key=len)[:40]
print(json.dumps(out, ensure_ascii=False, indent=1))
