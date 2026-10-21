"""세종에 있는 기업을 **공개 자료 두 벌**에서 모은다 (세종일자리경제진흥원 리포트용).

1. 중소벤처기업부 벤처기업 확인 명단(공개 CSV, 전국 39,668곳)에서 소재지가 세종인 곳.
   지역연계(§9) 방이 지역 base 로 옮겨 둔 수집본(`companies_sejong_base.json`)의
   `src: venture` 줄만 쓴다. 회사 이름 · 업종명 · 주생산품은 명단 값 그대로다.
2. OpenDART 기업개황으로 본점이 세종인 것을 확인한 상장사(`dart-sejong.v1.json`).

지어내지 않는다: 설명문(desc)은 명단 값으로 만든 한 문장이라 그 안의 업종명과
주력 품목만 꺼내 쓴다. 수집본의 손으로 쓴 줄(src 없음 · 부처·기관·대학 소개)은
출처가 없어 넣지 않는다. 채용 여부는 어느 줄도 확인하지 않았다.

    python3 -I scripts/lab/sejong_orgs_build.py <companies_sejong_base.json>
    → data/region/sejong-orgs.v1.json
"""
import datetime, json, re, sys

BASE = sys.argv[1] if len(sys.argv) > 1 else "/home/user/pca-line/_RISE_전국데이터_백업/pca-rise-section9/data/companies_sejong_base.json"
DART = "data/region/dart-sejong.v1.json"
OUT = "data/region/sejong-orgs.v1.json"

# KSIC 10차 중분류 (공시 업종 코드의 앞 두 자리)
KSIC2 = {
    "20": "화학 물질 및 화학제품 제조업", "21": "의료용 물질 및 의약품 제조업",
    "22": "고무 및 플라스틱제품 제조업", "23": "비금속 광물제품 제조업",
    "28": "전기장비 제조업", "29": "기타 기계 및 장비 제조업",
    "31": "기타 운송장비 제조업", "64": "금융업",
}

# 업종 묶음. 앞에서부터 처음 맞는 묶음을 쓴다
GROUPS = [
    ("SW", "소프트웨어·IT 서비스", r"소프트웨어|프로그래밍|컴퓨터시스템 통합|데이터베이스|온라인정보|포털|호스팅|정보기술|전자상거래"),
    ("RND", "연구개발·엔지니어링·컨설팅", r"연구개발|엔지니어링|과학 및 기술 서비스|컨설팅|검사 및 분석"),
    ("MEDIA", "광고·디자인·콘텐츠", r"광고|디자인|전시|공연|영화|인쇄"),
    ("BIO", "바이오·의약·식품", r"의약|의학|의료용|화장품|식품|식료품|조미료|낙농|빵|도시락|탁주|차류|사료|유지|절임|작물|비료"),
    ("FIN", "지주·금융", r"금융"),
    ("MACH", "기계·장비·전기·통신기기", r"기계|장비|전동기|발전기|전기|배전|조명|자동차|차체|항공|레이더|통신|광학기기|측정|시험|로봇|컴퓨터 제조|송풍기|여과기|컨베이어|유압|금형|무기 및|운송장비"),
    ("MAT", "소재·화학·부품", r"화학|플라스틱|고무|안료|도료|금속|철강|콘크리트|종이|판지|부직포|나무|합판|전자부품|발광|액정|이차전지|전자감지|핸드백|비금속|제품 제조업"),
    ("SVC", "건설·생활 서비스", r"."),
]


def group_of(sector):
    for code, name, rx in GROUPS:
        if re.search(rx, sector):
            return code
    return "SVC"


def norm(n):
    return re.sub(r"\(주\)|주식회사|\s", "", n)


def main():
    base = json.load(open(BASE))
    pat = re.compile(r"세종특별자치시 (.+?) 분야의 기업(?:으로, 주력 품목은 (.+?)이다|이다)$")
    orgs = {}
    for x in base:
        if x.get("src") != "venture":
            continue
        m = pat.match(x["desc"])
        if not m:
            continue
        # 회사가 아니라 개인 이름이 들어간 줄(예비창업자)은 넣지 않는다: 개인정보다
        if x["name"].startswith("예비창업자"):
            continue
        sector, product = m.group(1), (m.group(2) or "").strip()
        orgs[norm(x["name"])] = {
            "name": x["name"], "source": "venture", "sector": sector,
            "product": product, "group": group_of(sector), "venture_id": x.get("srcid"),
        }
    dart = json.load(open(DART))
    for o in dart["orgs"]:
        code = str(o.get("induty_code") or "")
        sector = KSIC2.get(code[:2], "")
        k = norm(o["corp_name"])
        row = orgs.get(k, {})
        orgs[k] = {
            **row,
            "name": o["corp_name"], "source": "venture+dart" if row else "dart",
            "sector": row.get("sector") or sector, "product": row.get("product", ""),
            "group": row.get("group") or group_of(sector),
            "listed": {"Y": "유가증권", "K": "코스닥", "N": "코넥스", "E": "기타"}.get(o.get("corp_cls"), o.get("corp_cls")),
            "stock_code": o.get("stock_code") or None, "induty_code": code,
            "adres": o.get("adres"),
        }
    rows = sorted(orgs.values(), key=lambda r: (r["group"], r["name"]))
    out = {
        "schema": "sejong-orgs.v1",
        "built_on": datetime.date.today().isoformat(),
        "sources": {
            "venture": "중소벤처기업부 벤처기업 확인 명단(공개 CSV) 가운데 소재지 세종 · 업종명과 주생산품은 명단 값",
            "dart": f"OpenDART 기업개황 · 본점 주소 세종 · 확인일 {dart.get('checked_on')}",
        },
        "groups": [{"code": c, "name": n} for c, n, _ in GROUPS],
        "rule": "공개 명단의 값만 옮겼다. 채용 여부·근무 조건은 확인하지 않았다",
        "orgs": rows,
    }
    json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=1)
    by = {}
    for r in rows:
        by[r["group"]] = by.get(r["group"], 0) + 1
    print(f"→ {OUT} · {len(rows)}곳 · {by}")


if __name__ == "__main__":
    main()
