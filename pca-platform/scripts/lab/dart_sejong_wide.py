"""세종에 본점을 둔 회사를 **비상장까지** 넓혀 찾는다 (OpenDART).

상장사만 보면 세종 본점이 17곳이다. 외부감사를 받는 회사는 해마다 감사보고서를
DART 에 내므로, 그 공시를 낸 회사 목록(list.json)을 모으고 회사마다 기업개황
(company.json)의 주소를 본다. **주소가 '세종특별자치시'로 시작하는 회사만** 남긴다.

지어내지 않는다: 이름·주소·업종코드·설립일·누리집은 기업개황 값 그대로이고,
매출·직원 수는 받을 수 있는 회사만 적는다. 열쇠는 어디에도 적지 않는다.

    PCA_DART_KEY=... python3 -I scripts/lab/dart_sejong_wide.py
    → data/region/dart-sejong-wide.v1.json  (중간 기록은 var/dart/wide/)
"""
import datetime, json, os, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

KEY = os.environ.get("PCA_DART_KEY")
if not KEY:
    sys.exit("PCA_DART_KEY 가 없습니다")
OUT = "data/region/dart-sejong-wide.v1.json"
TMP = "var/dart/wide"
os.makedirs(TMP, exist_ok=True)
TARGET = int(os.environ.get("TARGET", "140"))
BUDGET = int(os.environ.get("BUDGET", "14000"))
calls = 0


def api(name, **q):
    global calls
    q["crtfc_key"] = KEY
    url = f"https://opendart.fss.or.kr/api/{name}.json?" + urllib.parse.urlencode(q)
    for i in range(4):
        try:
            calls += 1
            return json.loads(urllib.request.urlopen(url, timeout=60).read().decode("utf-8"))
        except Exception:
            time.sleep(2 * (i + 1))
    return None


def windows():
    """3개월 이하 창으로 나눈다(회사를 지정하지 않으면 그 이상은 받지 않는다)."""
    out = []
    for (a, b) in [("20250101", "20250331"), ("20250401", "20250630"), ("20250701", "20250930"),
                   ("20251001", "20251231"), ("20260101", "20260331"), ("20260401", "20260630")]:
        out.append((a, b))
    return out


def collect():
    path = f"{TMP}/filers.json"
    if os.path.exists(path):
        return json.load(open(path))
    seen = {}
    jobs = []
    for (a, b) in windows():
        r = api("list", bgn_de=a, end_de=b, pblntf_ty="F", page_no=1, page_count=100)
        if not r or r.get("status") != "000":
            continue
        for it in r.get("list", []):
            seen.setdefault(it["corp_code"], {"corp_name": it["corp_name"], "corp_cls": it.get("corp_cls")})
        jobs += [(a, b, p) for p in range(2, int(r.get("total_page", 1)) + 1)]

    def page(job):
        a, b, p = job
        r = api("list", bgn_de=a, end_de=b, pblntf_ty="F", page_no=p, page_count=100)
        return r.get("list", []) if r and r.get("status") == "000" else []

    with ThreadPoolExecutor(max_workers=16) as ex:
        for k, lst in enumerate(ex.map(page, jobs)):
            for it in lst:
                seen.setdefault(it["corp_code"], {"corp_name": it["corp_name"], "corp_cls": it.get("corp_cls")})
            if k % 50 == 0:
                print(f"  쪽 {k}/{len(jobs)} · 누적 {len(seen)}곳 · 호출 {calls}", flush=True)
    json.dump(seen, open(path, "w"), ensure_ascii=False)
    return seen


def main():
    filers = collect()
    done_path = f"{TMP}/company.jsonl"
    done = {}
    if os.path.exists(done_path):
        for line in open(done_path):
            j = json.loads(line)
            done[j["corp_code"]] = j
    # 이미 아는 세종 상장사는 빼지 않는다: 같은 목록에서 다시 확인된다
    todo = [c for c in filers if c not in done]
    print(f"감사·정기 공시를 낸 회사 {len(filers)} · 이미 본 {len(done)} · 남은 {len(todo)}", flush=True)
    found = [j for j in done.values() if str(j.get("adres", "")).replace(" ", "").startswith("세종")]
    f = open(done_path, "a")

    def one(c):
        r = api("company", corp_code=c)
        if not r or r.get("status") != "000":
            return {"corp_code": c, "status": (r or {}).get("status")}
        keep = {k: r.get(k) for k in ("corp_code", "corp_name", "corp_cls", "stock_code", "adres",
                                      "induty_code", "est_dt", "hm_url", "acc_mt", "status")}
        return keep

    with ThreadPoolExecutor(max_workers=20) as ex:
        for i in range(0, len(todo), 200):
            if len(found) >= TARGET or calls >= BUDGET:
                break
            for j in ex.map(one, todo[i:i + 200]):
                f.write(json.dumps(j, ensure_ascii=False) + "\n")
                if j.get("status") == "020":
                    print("호출 한도에 걸렸습니다", flush=True)
                    f.close()
                    return finish(found)
                if str(j.get("adres") or "").replace(" ", "").startswith("세종"):
                    found.append(j)
            f.flush()
            print(f"  본 {i + 200}/{len(todo)} · 세종 {len(found)} · 호출 {calls}", flush=True)
    f.close()
    finish(found)


def finish(found):
    uniq = {j["corp_code"]: j for j in found}
    out = {
        "schema": "dart-sejong-wide.v1",
        "checked_on": datetime.date.today().isoformat(),
        "source": "OpenDART 공시검색(list.json, 2025-01~2026-06 감사보고서·정기공시) · 기업개황(company.json)",
        "rule": "공시를 낸 회사 가운데 기업개황 주소가 '세종'으로 시작하는 회사. 이름·주소·업종코드는 기업개황 값 그대로",
        "orgs": sorted(uniq.values(), key=lambda x: x.get("corp_name") or ""),
    }
    json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=1)
    print(f"→ {OUT} · 세종 {len(uniq)}곳 · 호출 {calls}")


if __name__ == "__main__":
    main()
