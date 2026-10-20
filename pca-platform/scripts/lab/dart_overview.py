"""상장사 사업보고서 원문에서 '사업의 개요' 앞부분을 그대로 떼어 둔다.

요약하지 않는다. 고치지 않는다. 받은 원문의 글자를 공백만 정리해 앞에서부터
N 자를 옮기고, 어느 보고서(접수번호)의 어느 절인지를 함께 적는다. 리포트에서 이
글을 쓸 때는 인용으로 표시하고, 회사 설명을 우리 말로 바꿔 쓰는 일은 사람이 한다.

    PCA_DART_KEY=... python3 -I scripts/lab/dart_overview.py
    → data/region/dart-overview.v1.json   (원문 zip 은 var/dart/doc, 저장소에 넣지 않는다)
"""
import html, io, json, os, re, sys, time, urllib.request, zipfile, datetime

KEY = os.environ.get("PCA_DART_KEY")
if not KEY:
    sys.exit("PCA_DART_KEY 가 없습니다")
CHECKS = "data/region/dart-checks.v1.json"
OUT = "data/region/dart-overview.v1.json"
DOC = "var/dart/doc"
N = 900
os.makedirs(DOC, exist_ok=True)

def fetch(rcept):
    path = f"{DOC}/{rcept}.zip"
    if os.path.exists(path) and open(path, "rb").read(2) == b"PK":
        return open(path, "rb").read()
    url = f"https://opendart.fss.or.kr/api/document.xml?crtfc_key={KEY}&rcept_no={rcept}"
    for i in range(4):
        try:
            b = urllib.request.urlopen(url, timeout=180).read()
            if b[:2] == b"PK":
                open(path, "wb").write(b)
                return b
        except Exception:
            pass
        time.sleep(3 * (i + 1))
    return None

def section(xml):
    """본문 첫 'I. 회사의 개요' 뒤에서 나오는 '사업의 개요' 를 찾는다(목차의 같은 글자는 건너뛴다)."""
    s = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", xml)))
    hits = [m.start() for m in re.finditer("사업의 개요", s)]
    if not hits:
        return None
    i = hits[-1] if len(hits) > 1 else hits[0]
    body = s[i + len("사업의 개요"):].strip()
    nxt = re.search(r"\s2\.\s*주요 제품|\s2\.\s*주요제품|\s주요 제품 및 서비스", body)
    if nxt:
        body = body[: nxt.start()]
    return body.strip()

checks = json.load(open(CHECKS, encoding="utf-8"))
out = []
for o in checks["orgs"]:
    d = o.get("dart")
    if not d or not d.get("stock_code") or not o.get("annual_reports"):
        continue
    rep = o["annual_reports"][0]
    b = fetch(rep["rcept_no"])
    if not b:
        out.append({"id": o["id"], "name": o["name"], "excerpt": None, "note": "원문을 받지 못했습니다"})
        continue
    z = zipfile.ZipFile(io.BytesIO(b))
    main = max(z.namelist(), key=lambda n: z.getinfo(n).file_size)
    sec = section(z.read(main).decode("utf-8", "ignore"))
    out.append({
        "id": o["id"], "name": o["name"], "dart_name": d["corp_name"],
        "report": rep["report"], "rcept_no": rep["rcept_no"], "rcept_dt": rep["rcept_dt"], "url": rep["url"],
        "section": "II. 사업의 내용 > 1. 사업의 개요",
        "excerpt": (sec[:N] + ("…" if sec and len(sec) > N else "")) if sec else None,
        "excerpt_chars": min(len(sec), N) if sec else 0,
        "note": None if sec else "‘사업의 개요’ 절을 찾지 못했습니다",
    })
    time.sleep(0.5)

res = {"schema": "careermatri-dart-overview.1", "checked_on": datetime.date.today().isoformat(),
       "rule": "원문 인용이다. 요약·의역하지 않았고 앞에서부터 잘랐다. 리포트에서는 인용 표시와 접수번호를 함께 적는다.",
       "orgs": out}
json.dump(res, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{OUT} · {sum(1 for x in out if x['excerpt'])} / {len(out)}")
for x in out:
    print("○" if x["excerpt"] else "·", x["name"], (x["excerpt"] or x["note"])[:90])
