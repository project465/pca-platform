/* 지역 기업 자료(v2)의 줄을 OpenDART 공식 API 에 대어 본다.
 *
 * 열쇠는 PCA_DART_KEY 환경변수에서만 읽고 어디에도 적지 않는다. 결과 파일에는
 * 공식 API 가 돌려준 값과 그 값을 받은 날만 남긴다(열쇠·요청 주소 없음).
 *
 * 무엇을 '공식 원문 직접 확인' 으로 올리는가: DART 기업개황이 돌려준 칸
 * (법인명 · 사업자등록번호 · 법인등록번호 · 본점 주소 · 업종 코드 · 설립일 · 상장 구분 ·
 * 종목 코드 · 홈페이지)과, 그 회사가 낸 정기보고서 목록(접수번호)까지다. 사업 설명이나
 * 매출 구조처럼 보고서 본문을 읽어야 하는 사실은 여기서 올리지 않는다.
 *
 * DART 에 없는 기업(비상장·외감 미대상)은 '없음' 으로 적고 짐작으로 채우지 않는다.
 *
 *   PCA_DART_KEY=... node scripts/lab/dart-verify.mjs
 *   → data/region/dart-checks.v1.json
 */
import fs from "node:fs";

const KEY = process.env.PCA_DART_KEY;
if (!KEY) { console.error("PCA_DART_KEY 가 없습니다"); process.exit(1); }
const ORGS = "data/region/kr-chungcheong-orgs.v2.json";
const CORP = "var/dart/CORPCODE.xml";
const OUT = "data/region/dart-checks.v1.json";
const today = new Date().toISOString().slice(0, 10);

if (!fs.existsSync(CORP)) { console.error(`${CORP} 가 없습니다. corpCode.xml 을 받아 풀어 두세요(var/dart 는 저장소에 넣지 않는다).`); process.exit(1); }
const xml = fs.readFileSync(CORP, "utf8");
const corps = [];
for (const m of xml.matchAll(/<corp_code>(\d+)<\/corp_code>\s*<corp_name>([^<]*)<\/corp_name>[\s\S]*?<stock_code>([^<]*)<\/stock_code>/g))
  corps.push({ code: m[1], name: m[2].trim(), stock: m[3].trim() });

const norm = (s) => s.replace(/\(주\)|㈜|주식회사|\s/g, "").replace(/\(.*?\)/g, "").replace(/—.*$/, "").trim();
/* 이름이 여럿 걸리면 상장사를 먼저 고르고, 그래도 여럿이면 고르지 않는다(짐작하지 않는다) */
const pick = (name) => {
  const n = norm(name);
  const hit = corps.filter((c) => norm(c.name) === n);
  const listed = hit.filter((c) => c.stock);
  if (listed.length === 1) return { ...listed[0], how: "이름 일치(상장)" };
  if (hit.length === 1) return { ...hit[0], how: "이름 일치" };
  return { ambiguous: hit.length };
};

const get = async (path, q) => {
  const u = new URL(`https://opendart.fss.or.kr/api/${path}`);
  u.searchParams.set("crtfc_key", KEY);
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  /* 프록시가 연결을 끊고 글자로 답하는 날이 있다: 세 번까지 다시 묻고, 그래도 아니면 그 줄을 응답 없음으로 적는다 */
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      const t = await r.text();
      if (t.startsWith("{")) return JSON.parse(t);
    } catch { /* 아래에서 다시 묻는다 */ }
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  return { status: "NET", message: "응답을 받지 못했습니다" };
};
const digits = (s) => String(s ?? "").replace(/\D/g, "");
/* 시도 이름을 한 꼴로 맞춰 시도 · 시군구 두 칸을 견준다. v2 가 '사업장' 을 적은 줄은 본점과 달라도 틀린 것이 아니다 */
const SIDO = { 대전: "대전광역시", 충남: "충청남도", 충북: "충청북도", 경기: "경기도", 서울: "서울특별시", 인천: "인천광역시", 세종: "세종특별자치시" };
const toks = (a) => { const t = String(a ?? "").trim().split(/\s+/); return [SIDO[t[0]] ?? t[0], t[1] ?? ""]; };
const hqCmp = (mine, dart) => {
  if (!mine) return "NOT_IN_V2";
  const [a1, a2] = toks(mine), [b1, b2] = toks(dart);
  if (a1 !== b1) return "DIFFERENT_SIDO";
  return a2 && b2 && a2 !== b2 && !/[(（]/.test(a2) ? "SAME_SIDO_DIFFERENT_SIGUNGU" : "SAME";
};
const CLS = { Y: "유가증권시장", K: "코스닥", N: "코넥스", E: "기타(비상장)" };

const d = JSON.parse(fs.readFileSync(ORGS, "utf8"));
const out = [];
for (const o of d.orgs) {
  const alias = { "KR-DJ-ROSSO": "로쏘", "KR-DJ-GYERYONG": "계룡건설산업", "KR-CN-SDC-ASAN": "삼성디스플레이", "KR-NA-KAL": "대한항공", "KR-DJ-GOLFZON": "골프존", "KR-DJ-KORAIL": "한국철도공사", "KR-DJ-KWATER": "한국수자원공사", "KR-DJ-KRNA": "국가철도공단", "KR-DJ-KOMSCO": "한국조폐공사", "KR-NA-KAC": "한국공항공사", "KR-NA-IIAC": "인천국제공항공사", "KR-CB-AEROK": "에어로케이항공", "KR-DJ-DJTO": "대전관광공사",
    /* DART 등록명이 v2 의 이름과 다른 셋. 이름으로 고른 뒤 사업자등록번호가 같은지로 맞는지 다시 본다 */
    "KR-DJ-LIGACHEM": "리가켐바이오", "KR-NA-GEMVAX": "젬백스", "KR-DJ-CAVAC": "중앙백신" }[o.id];
  const p = pick(alias ?? o.name);
  if (!p.code) { out.push({ id: o.id, name: o.name, dart: null, note: p.ambiguous ? `이름이 같은 법인이 ${p.ambiguous}곳이라 고르지 않았습니다` : "DART 고유번호 목록에 없습니다(비상장·공시 대상 아님일 수 있음)" }); continue; }
  const c = await get("company.json", { corp_code: p.code });
  if (c.status !== "000") { out.push({ id: o.id, name: o.name, dart: null, note: `기업개황 응답 ${c.status} ${c.message}` }); continue; }
  const list = await get("list.json", { corp_code: p.code, bgn_de: "20240101", pblntf_ty: "A", page_count: "20" });
  const reports = (list.list ?? []).filter((x) => /사업보고서/.test(x.report_nm)).slice(0, 2).map((x) => ({ report: x.report_nm.trim(), rcept_no: x.rcept_no, rcept_dt: x.rcept_dt, url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${x.rcept_no}` }));
  /* 상장사만: 가장 최근 사업보고서의 주요 계정과 사업부문별 직원 수. 숫자는 받은 그대로 두고(원), 고치거나 반올림하지 않는다 */
  let fin = null, staff = null;
  /* 가장 최근 사업보고서의 사업연도를 보고서 이름에서 읽는다('사업보고서 (2025.12)'). 없으면 2024 */
  const yr = String(reports[0]?.report.match(/\((\d{4})\.\d{2}\)/)?.[1] ?? "2024");
  if (c.stock_code?.trim()) {
    const f = await get("fnlttSinglAcnt.json", { corp_code: p.code, bsns_year: yr, reprt_code: "11011" });
    if (f.status === "000") {
      const want = ["매출액", "영업이익", "당기순이익(손실)", "당기순이익"];
      const pickFs = (div) => Object.fromEntries((f.list ?? []).filter((x) => x.fs_div === div && want.includes(x.account_nm)).map((x) => [x.account_nm.replace("(손실)", ""), Number(String(x.thstrm_amount).replace(/,/g, ""))]));
      fin = { year: Number(yr), report: "사업보고서", unit: "원", consolidated: pickFs("CFS"), separate: pickFs("OFS") };
    }
    const e = await get("empSttus.json", { corp_code: p.code, bsns_year: yr, reprt_code: "11011" });
    if (e.status === "000") {
      const by = new Map();
      for (const x of e.list ?? []) { const k = (x.fo_bbm ?? "").trim() || "구분 없음"; const n = Number(String(x.sm ?? "").replace(/,/g, "")); if (Number.isFinite(n)) by.set(k, (by.get(k) ?? 0) + n); }
      staff = { year: Number(yr), report: "사업보고서 직원 현황", by_segment: [...by].map(([segment, count]) => ({ segment, count })) };
    }
  }
  const mine = o.identifiers ?? {};
  const cmp = {
    bizno: mine.bizno ? (digits(mine.bizno) === digits(c.bizr_no) ? "SAME" : "DIFFERENT") : "NOT_IN_V2",
    corpno: mine.corpno ? (digits(mine.corpno) === digits(c.jurir_no) ? "SAME" : "DIFFERENT") : "NOT_IN_V2",
    hq_region: hqCmp(o.hq?.text, c.adres),
  };
  out.push({
    id: o.id, name: o.name, matched_by: p.how,
    dart: { corp_code: p.code, corp_name: c.corp_name, corp_cls: CLS[c.corp_cls] ?? c.corp_cls, stock_code: c.stock_code?.trim() || null,
      bizr_no: c.bizr_no, jurir_no: c.jurir_no, adres: c.adres.replace(/\s+/g, " ").trim(), induty_code: c.induty_code, est_dt: c.est_dt, acc_mt: c.acc_mt, hm_url: c.hm_url || null },
    compare: cmp, annual_reports: reports, financials: fin, staff, checked_on: today,
  });
  await new Promise((r) => setTimeout(r, 250));
}
const res = { schema: "careermatri-dart-checks.1", checked_on: today, source: "OpenDART 기업개황(company.json) · 공시검색(list.json) · 단일회사 주요계정(fnlttSinglAcnt.json) · 직원현황(empSttus.json)",
  scope: "기업개황 칸 · 정기보고서 접수번호 · 상장사의 가장 최근 사업보고서 주요 계정과 사업부문별 직원 수를 '공식 원문 직접 확인' 으로 본다(API 가 돌려준 값 그대로). 보고서 본문의 사업 설명·매출 구조는 여기서 확인하지 않았다. 채용 여부는 DART 로 확인할 수 없다.",
  orgs: out };
fs.writeFileSync(OUT, JSON.stringify(res, null, 1) + "\n");
const hit = out.filter((x) => x.dart).length;
console.log(`${OUT} · DART 대조 ${hit} / ${out.length}`);
for (const x of out) console.log(`${x.dart ? "○" : "·"} ${x.name}${x.dart ? ` → ${x.dart.corp_name} (${x.dart.corp_cls}) 사업자번호 ${x.compare.bizno} · 법인번호 ${x.compare.corpno} · 본점 ${x.compare.hq_region} · 사업보고서 ${x.annual_reports.length}건${x.financials ? ` · 매출 ${x.financials.separate.매출액 ?? "—"}` : ""}${x.staff ? ` · 직원 ${x.staff.by_segment.map((s) => s.segment + " " + s.count).join("/")}` : ""}` : ` — ${x.note}`}`);
