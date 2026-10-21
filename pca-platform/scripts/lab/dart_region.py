"""한 지역에 **본점**을 둔 상장사를 OpenDART 로 찾는다 (대학 소개 자료 · 결과지 예시용).

상장사 전부(CORPCODE.xml 의 stock_code 가 있는 회사)의 기업개황(company.json)을 받아
주소가 그 지역으로 시작하는 회사만 남긴다. 남은 회사는 2025 사업보고서 주요 계정과
직원 현황을 받는다. 지어내지 않는다: 이름·주소·업종코드·설립일·누리집은 기업개황 값
그대로이고, 매출·직원 수는 받을 수 있는 회사만 적는다. 채용 여부는 확인하지 않는다.
열쇠는 어디에도 적지 않는다.

    PCA_DART_KEY=... REGION=jeonbuk python3 -I scripts/lab/dart_region.py [CORPCODE.xml]
    → data/region/dart-jeonbuk.v1.json   (중간 기록은 var/dart/listed/)
"""
import datetime, json, os, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

KEY = os.environ.get("PCA_DART_KEY")
if not KEY:
    sys.exit("PCA_DART_KEY 가 없습니다")
REGIONS = {"jeonbuk": ("전북", "전라북도")}
REGION = os.environ.get("REGION", "jeonbuk")
PREFIX = REGIONS[REGION]
XML = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/dart/CORPCODE.xml"
TMP = "var/dart/listed"
OUT = f"data/region/dart-{REGION}.v1.json"
os.makedirs(TMP, exist_ok=True)


def api(name, **q):
    q["crtfc_key"] = KEY
    url = f"https://opendart.fss.or.kr/api/{name}.json?" + urllib.parse.urlencode(q)
    for i in range(4):
        try:
            return json.loads(urllib.request.urlopen(url, timeout=60).read().decode("utf-8"))
        except Exception:
            time.sleep(2 * (i + 1))
    return None


def listed():
    out = []
    for e in ET.parse(XML).getroot():
        sc = (e.findtext("stock_code") or "").strip()
        if sc:
            out.append({"corp_code": e.findtext("corp_code"), "corp_name": e.findtext("corp_name"), "stock_code": sc})
    return out


def overviews(corps):
    """기업개황을 한 번만 받는다. 받은 것은 var/dart/listed/company.jsonl 에 쌓는다."""
    path = f"{TMP}/company.jsonl"
    have = {}
    if os.path.exists(path):
        for line in open(path):
            r = json.loads(line)
            have[r["corp_code"]] = r
    todo = [c for c in corps if c["corp_code"] not in have]
    print(f"상장사 {len(corps)}곳 · 받아 둔 것 {len(have)} · 받을 것 {len(todo)}", flush=True)

    def one(c):
        r = api("company", corp_code=c["corp_code"])
        if not r or r.get("status") != "000":
            return None
        return {k: r.get(k) for k in ("corp_code", "corp_name", "corp_cls", "stock_code", "adres", "induty_code", "est_dt", "hm_url", "acc_mt", "bizr_no")}

    with open(path, "a") as f, ThreadPoolExecutor(max_workers=12) as ex:
        for k, r in enumerate(ex.map(one, todo)):
            if r:
                have[r["corp_code"]] = r
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
            if k % 300 == 0:
                print(f"  {k}/{len(todo)}", flush=True)
    return have


def money(v):
    try:
        return int(str(v).replace(",", ""))
    except Exception:
        return None


def finance(code):
    for year in ("2025", "2024"):
        r = api("fnlttSinglAcnt", corp_code=code, bsns_year=year, reprt_code="11011")
        if not r or r.get("status") != "000":
            continue
        rows = r.get("list", [])
        pick = [x for x in rows if x.get("fs_div") == "CFS"] or [x for x in rows if x.get("fs_div") == "OFS"]
        acc = {x.get("account_nm"): money(x.get("thstrm_amount")) for x in pick}
        rev = acc.get("매출액") or acc.get("수익(매출액)") or acc.get("영업수익")
        return {"year": year, "fs": pick[0].get("fs_div") if pick else None, "revenue": rev,
                "operating_income": acc.get("영업이익"), "net_income": acc.get("당기순이익"), "assets": acc.get("자산총계")}
    return None


def staff(code):
    for year in ("2025", "2024"):
        r = api("empSttus", corp_code=code, bsns_year=year, reprt_code="11011")
        if not r or r.get("status") != "000":
            continue
        tot = 0
        for x in r.get("list", []):
            n = money(x.get("sm"))
            if n:
                tot += n
        if tot:
            return {"year": year, "total": tot}
    return None


def main():
    corps = listed()
    have = overviews(corps)
    hit = [r for r in have.values() if (r.get("adres") or "").strip().startswith(PREFIX)]
    print(f"본점이 {PREFIX[0]}인 상장사 {len(hit)}곳", flush=True)
    with ThreadPoolExecutor(max_workers=8) as ex:
        fins = list(ex.map(lambda r: finance(r["corp_code"]), hit))
        stf = list(ex.map(lambda r: staff(r["corp_code"]), hit))
    orgs = []
    for r, f, s in zip(hit, fins, stf):
        orgs.append({**r, "financials": f, "staff": s})
    orgs.sort(key=lambda o: -((o["financials"] or {}).get("revenue") or 0))
    out = {
        "schema": f"dart-{REGION}.v1",
        "checked_on": datetime.date.today().isoformat(),
        "source": "OpenDART 기업개황(company.json) · 단일회사 주요계정(fnlttSinglAcnt.json, 사업보고서) · 직원현황(empSttus.json)",
        "rule": f"상장사(stock_code 있음) 가운데 기업개황 주소가 {' 또는 '.join(PREFIX)}로 시작하는 회사만. 채용 여부는 확인하지 않았다",
        "listed_checked": len(have),
        "orgs": orgs,
    }
    json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=1)
    print(f"→ {OUT} · {len(orgs)}곳")


if __name__ == "__main__":
    main()
