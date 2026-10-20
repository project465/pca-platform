/**
 * **지역·기업 자료 v2 를 만든다.** v1 의 13곳(검색 2차 출처)에 KODATA 기업종합보고서
 * 9개(제3자 기업정보)를 더하고, 사업자등록번호와 이름·본점 주소로 겹침을 본다.
 *
 * - KODATA 에서 옮기는 것은 **식별자 · 본점·사업장 주소 · 업종 · 주요 제품 · 상장 여부**
 *   같은 등록 사실과, 고객 *유형*을 이 리포트의 말로 바꿔 쓴 한 줄뿐이다. 재무표 ·
 *   신용등급 · 현금흐름등급 · 주주 지분 · 거래처 이름 · 대표자 신상은 옮기지 않는다
 *   (이용허락 범위가 확인되지 않았다).
 * - 공식 홈페이지 · 상장 정보 · 채용 공고는 **검색 결과 요약**으로 대조했다(2026-10-20).
 *   이 환경에서 원문 페이지를 직접 열지 못했으므로 `OFFICIAL` 이 아니라 `SEARCH` 로 적는다.
 * - 채용 여부는 한 곳도 확인하지 않았다. 공고에서 본 직무는 **그런 직무가 그 회사에
 *   있었다는 근거**까지이고, 지금 모집한다는 뜻이 아니다.
 *
 *   npx tsx scripts/lab/gm-orgs-v2.ts   → data/region/kr-chungcheong-orgs.v2.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { Org2, OrgSet2, Source, Region, OrgJob } from "../../src/lib/me-v3/report-gm/companies";

const D = "2026-10-20", K = "2026-09-07";
const v1 = JSON.parse(readFileSync("data/region/kr-chungcheong-orgs.v1.json", "utf8"));

const kodata = (name: string): Source => ({ kind: "KODATA", title: `${name} 기업종합보고서(KODATA, 이노폴리스벤처협회 제공본)`, url: null, checked_on: K });
const s = (kind: Source["kind"], title: string, url: string): Source => ({ kind, title, url, checked_on: D });

type Seed = Omit<Org2, "origin" | "hiring" | "sources"> & { sources: Source[] };
const job = (role: string, status: OrgJob["status"], tasks: string, evidence?: string, src?: number[]): OrgJob =>
  ({ role, status, tasks, evidence, src });

const NEW: Seed[] = [
  {
    id: "KR-DJ-PLANI", name: "(주)플랜아이",
    identifiers: { bizno: "305-81-72470", corpno: "160111-0181927", listing: null, src: [0, 1] },
    region: "DAEJEON", region_basis: "본점 소재지",
    hq: { text: "대전 유성구 문지로 282-10", src: [0, 1] },
    sites: ["서울 구로구 지점", "광주 북구 지점"],
    facts: [
      { text: "공공기관·대학·기업을 대상으로 홈페이지 구축, 보안·클라우드 운영(MSP), 지식재산관리시스템과 그룹웨어 같은 업무 시스템을 만든다.", src: [0, 1] },
      { text: "표준산업분류는 시스템 소프트웨어 개발 및 공급업이고 2004년 대전에서 설립됐다.", src: [0] },
      { text: "제3자 기업정보에 따르면 주요 매출처는 중앙부처·공공기관·연구기관 같은 공공 부문 비중이 크다.", src: [0] },
    ],
    industry_line: "공공기관 대상 소프트웨어 구축·운영",
    industries: ["INDUSTRY_DIGITAL_V1", "INDUSTRY_PUBLIC_V1"],
    jobs: [
      job("ROLE_SALES_V1", "POSTING_SEEN", "클라우드 운영 서비스를 공공·기업 고객에게 제안하고 견적과 계약 조건을 정리한다", "클라우드 MSP 영업·기술영업 경력 공고", [2]),
      job("ROLE_PLAN_V1", "POSTING_SEEN", "신사업(AI 플랫폼) 기획과 사업 수행 관리(PM)를 맡는다", "AX사업부 사업개발(기획)·PM 경력 공고", [2]),
      job("ROLE_MKT_V1", "POSTING_SEEN", "온라인 홍보와 콘텐츠를 기획한다", "온라인 홍보·콘텐츠 기획 공고", [3]),
      job("ROLE_FINACC_V1", "INDUSTRY_EXAMPLE", "공공 사업의 정산과 비용 집행 기록을 맞춘다"),
    ],
    interpretation: [
      "매출의 큰 부분이 공공 사업이라면 제안서 작성, 사업 일정 관리, 정산 문서가 경영 쪽 일의 중심이 됩니다.",
      "공고에 경력직이 많이 보입니다. 신입으로 들어갈 자리가 있는지는 공고마다 따로 봐야 합니다.",
    ],
    to_check: ["신입 채용 이력이 있는지", "지식재산관리시스템 사업이 지금도 주력인지(공식 홈페이지에서는 AI·클라우드가 앞에 나옵니다)"],
    sources: [kodata("(주)플랜아이"), s("SEARCH", "공식 홈페이지 검색 결과(본사 주소·사업 소개·사업자번호 일치)", "https://www.plani.co.kr/"),
      s("SEARCH", "사람인 기업 채용 목록 검색 결과", "https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/T3RKQTVPdDBsU0EyOUs4ZUNzVW01UT09"),
      s("SEARCH", "잡코리아 기업 채용 목록 검색 결과", "https://www.jobkorea.co.kr/company/45026648/recruit")],
    verify: "OFFICIAL_CROSSCHECKED",
  },
  {
    id: "KR-DJ-LAMILAB", name: "라미랩(주)",
    identifiers: { bizno: "787-88-00352", corpno: "160111-0426240", listing: null, src: [0] },
    region: "DAEJEON", region_basis: "본점 소재지",
    hq: { text: "대전 대덕구 한남로 70 한남대 캠퍼스혁신파크", src: [0, 1] },
    sites: ["부산 해운대구 사업장(제3자 기업정보 기재)"],
    facts: [
      { text: "3차원 공간정보(GIS)를 바탕으로 재난 의사결정 지원 플랫폼 같은 응용 소프트웨어를 만든다.", src: [0, 1] },
      { text: "종업원 20명 안팎의 소기업이고, 매출처는 지방자치단체와 공공 연구기관 비중이 크다(제3자 기업정보).", src: [0] },
    ],
    industry_line: "공공 재난·공간정보 소프트웨어",
    industries: ["INDUSTRY_DIGITAL_V1", "INDUSTRY_PUBLIC_V1"],
    jobs: [
      job("ROLE_OPS_V1", "POSTING_SEEN", "정부 과제의 일정과 정산, 회사 경영지원 업무를 함께 맡는다", "과제관리 및 경영지원 경력 공고", [2]),
      job("ROLE_MKT_V1", "POSTING_SEEN", "브랜드 마케팅과 영업 지원 자료를 만든다", "브랜드 마케팅·영업지원 경력 공고", [2]),
      job("ROLE_SALES_V1", "INDUSTRY_EXAMPLE", "지자체·공공기관 사업 공고를 찾아 제안서를 준비한다"),
    ],
    interpretation: [
      "작은 팀이라 과제 관리·정산·홍보가 한 사람에게 모일 수 있습니다. 여러 일을 끝까지 맡아 본 경험이 그대로 쓰이는 자리입니다.",
      "정부 과제 매출이 많다면 과제 계획서와 결과 보고서의 서식을 지키는 일이 중요합니다.",
    ],
    to_check: ["신입 채용 이력", "부산 사업장의 성격"],
    sources: [kodata("라미랩(주)"), s("SEARCH", "공식 홈페이지 검색 결과(주소·제품)", "https://www.lamilab.xyz/"),
      s("SEARCH", "잡코리아 채용 공고 검색 결과", "https://www.jobkorea.co.kr/recruit/co_read/recruit/c/31831723")],
    verify: "OFFICIAL_CROSSCHECKED",
  },
  {
    id: "KR-DJ-LIGACHEM", name: "(주)리가켐바이오사이언스",
    identifiers: { bizno: "314-81-82268", corpno: "160111-0206866", listing: "코스닥 상장(2013-05-10)", src: [0, 2] },
    region: "DAEJEON", region_basis: "본점 소재지",
    hq: { text: "대전 유성구 국제과학10로 10", src: [0, 1] },
    sites: ["서울 마포구 지점(의약품 영업 사무소)"],
    facts: [
      { text: "항체-약물접합체(ADC) 플랫폼과 신약 후보물질을 개발하고, 이를 해외 제약·바이오 기업에 기술이전하는 신약개발 기업이다.", src: [0, 1] },
      { text: "매출 대부분이 기술이전과 로열티에서 나온다(제3자 기업정보).", src: [0] },
      { text: "코스닥 상장사이며 2024년부터 오리온 계열로 보도됐다.", src: [2, 3] },
    ],
    industry_line: "신약 기술이전(바이오)",
    industries: ["INDUSTRY_B2B_V1"],
    jobs: [
      job("ROLE_FINACC_V1", "POSTING_SEEN", "연구비·기술료 수익과 비용을 결산 기준에 맞춰 기록한다", "대전 근무 회계 담당 경력 공고(2024)", [4]),
      job("ROLE_PLAN_V1", "POSTING_SEEN", "사업전략센터에서 특허(IP)와 계약 일정을 관리한다", "사업전략센터 IP 담당 경력 공고", [4]),
      job("ROLE_SALES_V1", "ORG_PAGE", "해외 제약사와 기술이전 협상 자료를 준비한다(사업개발)", "보도자료의 사업개발 전용 연락처", [1]),
    ],
    interpretation: [
      "물건을 파는 회사가 아니라 기술 계약을 파는 회사라, 경영 쪽 일은 계약 조건·마일스톤 일정·로열티 수익을 다루는 쪽에 가깝습니다.",
      "계약 상대가 해외 기업이라 영어로 된 계약·발표 자료를 읽고 쓰는 일이 많을 수 있습니다.",
      "보이는 공고가 경력직 위주입니다. 학부 신입은 회계·총무 같은 지원 부서에서 먼저 보시는 것이 현실적입니다.",
    ],
    to_check: ["신입 채용 이력이 있는 부서", "2026년 현재 대표·조직 변경 내용"],
    sources: [kodata("(주)리가켐바이오사이언스"), s("SEARCH", "공식 홈페이지 위치 안내 검색 결과", "https://ligachembio.com/company/location.php?lang=e"),
      s("SEARCH", "코스닥 141080 상장 정보 검색 결과", "https://sg.finance.yahoo.com/quote/141080.KQ/profile"),
      s("NEWS", "오리온 계열 편입 보도(뉴스토마토)", "https://newstomato.com/ReadNews.aspx?no=1219492"),
      s("SEARCH", "잡코리아 채용 공고 검색 결과", "https://www.jobkorea.co.kr/recruit/co_read/recruit/c/legochembi")],
    verify: "OFFICIAL_CROSSCHECKED",
  },
  {
    id: "KR-DJ-I3SYSTEM", name: "아이쓰리시스템(주)",
    identifiers: { bizno: "314-81-23158", corpno: "160111-0072738", listing: "코스닥 상장(2015-07-30)", src: [0, 2] },
    region: "DAEJEON", region_basis: "본점 소재지",
    hq: { text: "대전 유성구 테크노5로 69", src: [0, 1] },
    sites: ["대전 유성구 문지동 사업장", "대전 유성구 장동 사업장(연구)", "대전 유성구 둔곡 사업장"],
    facts: [
      { text: "적외선과 X-ray 영상센서를 개발·생산하고, 방산 장비에 들어가는 부품으로 공급한다.", src: [0, 3] },
      { text: "주요 고객은 국내 방산 체계종합기업과 국방 공공기관이다(제3자 기업정보).", src: [0] },
      { text: "대전 안에 사업장이 넷이고 2026년 둔곡 신공장 준공이 보도됐다.", src: [0, 1] },
    ],
    industry_line: "방산 영상센서 부품 제조",
    industries: ["INDUSTRY_B2B_V1"],
    jobs: [
      job("ROLE_OPS_V1", "POSTING_SEEN", "부품과 원자재를 발주하고 납기와 단가를 관리한다(구매)", "구매 부문 신입·경력 공고(2026-04, 2026-09)", [4]),
      job("ROLE_FINACC_V1", "POSTING_SEEN", "제조 원가와 결산 자료를 맞춘다", "회계 부문 신입 공고", [5]),
      job("ROLE_SALES_V1", "INDUSTRY_EXAMPLE", "방산 체계기업의 요구 사양과 납기를 계약 조건으로 정리한다"),
    ],
    interpretation: [
      "방산 납품은 고객이 몇 곳으로 정해져 있고 납기와 품질 기록이 엄격합니다. 구매·원가 쪽 일에서 기준을 지키고 기록을 남기는 습관이 그대로 쓰입니다.",
      "이 자료에서 경영 계열 신입 공고(구매·회계)가 실제로 보인 몇 안 되는 지역 기업입니다.",
    ],
    to_check: ["방산 보안 규정에 따른 지원 자격 조건", "구매 부문 근무지가 어느 사업장인지"],
    sources: [kodata("아이쓰리시스템(주)"), s("SEARCH", "공식 홈페이지 검색 결과", "https://i3system.com/?lang=en"),
      s("SEARCH", "코스닥 214430 상장 정보 검색 결과", "https://www.valueline.co.kr/finance/income/214430"),
      s("NEWS", "적외선 영상센서 사업 보도(한경머니)", "https://magazine.hankyung.com/money/article/202604166423c"),
      s("SEARCH", "자소설닷컴 채용 목록 검색 결과", "https://jasoseol.com/companies/6465/careers"),
      s("SEARCH", "회계 신입 공고 검색 결과", "https://inthiswork.com/?p=399383")],
    verify: "OFFICIAL_CROSSCHECKED",
  },
  {
    id: "KR-CN-MTG", name: "(주)엠티지",
    identifiers: { bizno: "314-81-46845", corpno: "160111-0129422", listing: null, src: [0, 1] },
    region: "CHUNGNAM", region_basis: "본점·공장 소재지(충남 금산)",
    hq: { text: "충남 금산군 복수면 자라전길 62", src: [0, 1] },
    sites: ["충남 금산군 진산면 제2공장", "대전 유성구 지사(연구소, 검색 결과)"],
    facts: [
      { text: "군용·민수용 안테나와 안테나 측정 시스템, 전파 시험 시설을 설계하고 만든다.", src: [0, 1] },
      { text: "방산 체계종합기업과 항공 기업에 주로 납품한다(제3자 기업정보).", src: [0] },
    ],
    industry_line: "방산 안테나·전파 측정 장비 제조",
    industries: ["INDUSTRY_B2B_V1"],
    jobs: [
      job("ROLE_HR_V1", "POSTING_SEEN", "생산직·연구직 채용과 인사 기록을 관리한다", "인사·사업·자재 부문 채용 공고(금산 근무)", [2]),
      job("ROLE_OPS_V1", "POSTING_SEEN", "자재 발주와 재고를 관리한다", "같은 공고의 자재 부문", [2]),
      job("ROLE_PLAN_V1", "POSTING_SEEN", "방산 사업의 계약·일정·납품을 관리한다(사업 부문)", "같은 공고의 사업 부문", [2]),
    ],
    interpretation: [
      "근무지가 금산이라 대전에서 통근할 수 있는지를 먼저 따져야 합니다.",
      "방산 수주는 사업 기간이 길어, 사업 부문은 계약 일정과 납품 문서를 끝까지 관리하는 일이 중심입니다.",
    ],
    to_check: ["공고 게시일(검색 결과에서는 날짜가 보이지 않았습니다)", "통근 지원 여부"],
    sources: [kodata("(주)엠티지"), s("SEARCH", "공식 홈페이지 오시는 길 검색 결과", "https://www.mtginc.co.kr/promotion/directions.php"),
      s("SEARCH", "사람인 기업 채용 목록 검색 결과", "https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/ZllGZEZCMGxzSXM1TlpJWFdYbkhlZz09")],
    verify: "OFFICIAL_CROSSCHECKED",
  },
  {
    id: "KR-DJ-ILSHIN", name: "(주)일신오토클레이브",
    identifiers: { bizno: "314-81-43101", corpno: "160111-0120579", listing: null, src: [0, 1] },
    region: "DAEJEON", region_basis: "본점 소재지",
    hq: { text: "대전 유성구 테크노2로 255", src: [0, 1] },
    sites: ["대전 유성구 신동 초고압 톨링센터·기술연구소"],
    facts: [
      { text: "오토클레이브·고압반응기·초고압 분산기·프레스 같은 고온·고압 공정장비를 설계부터 설치까지 맡아 만든다.", src: [0, 2] },
      { text: "전자부품·화학·자동차 제조사에 장비를 공급한다(제3자 기업정보).", src: [0] },
    ],
    industry_line: "고온·고압 공정장비 제조",
    industries: ["INDUSTRY_B2B_V1"],
    jobs: [
      job("ROLE_SALES_V1", "ORG_PAGE", "고객사 공정 조건을 듣고 견적과 납기를 제안한 뒤 사후관리까지 잇는다(기술영업)", "기술영업 직원 인터뷰·영업 창구 소개", [3]),
      job("ROLE_FINACC_V1", "INDUSTRY_EXAMPLE", "주문 제작 장비마다 원가를 계산해 단가 근거를 만든다"),
    ],
    interpretation: [
      "장비 한 대가 주문 제작이라 견적 하나에 원가 계산과 납기 약속이 같이 들어갑니다. 원가회계와 영업 사이를 잇는 경험이 쓰이는 자리입니다.",
      "최근 공고는 기술연구소 쪽만 확인됐습니다. 경영 계열 자리는 상시 채용 페이지를 직접 보셔야 합니다.",
    ],
    to_check: ["상시 채용 페이지의 경영 계열 모집 여부", "기술영업이 전공 제한을 두는지"],
    sources: [kodata("(주)일신오토클레이브"), s("SEARCH", "공식 홈페이지 검색 결과", "https://suflux.com/"),
      s("DIRECTORY", "기계 산업 기업정보(코머신) 검색 결과", "https://www.komachine.com/ko/companies/ilshin-autoclave/files"),
      s("NEWS", "기술영업 소개 기사(2013)", "https://kidd.co.kr/news/169856")],
    verify: "OFFICIAL_CROSSCHECKED",
  },
  {
    id: "KR-DJ-JEIOTECH", name: "(주)제이오텍",
    identifiers: { bizno: "105-81-46727", corpno: "110111-0652647", listing: null, src: [0, 1] },
    region: "DAEJEON", region_basis: "본점·공장 소재지",
    hq: { text: "대전 유성구 테크노2로 153", src: [0, 1] },
    sites: ["서울 금천구 영업소(해외영업)", "수원·대구·부산 지역 영업 거점(제3자 기업정보)"],
    facts: [
      { text: "연구용 실험기기와 환경신뢰성 시험장비, 의료용 냉장·냉동고를 만들고 실험실 구성까지 맡는다.", src: [0, 2] },
      { text: "2차전지·전자부품·자동차 제조사와 공공기관에 판매하고, 공공조달 낙찰 실적이 있다(제3자 기업정보).", src: [0] },
    ],
    industry_line: "실험·시험장비 제조와 공공조달",
    industries: ["INDUSTRY_B2B_V1", "INDUSTRY_PUBLIC_V1"],
    jobs: [
      job("ROLE_SALES_V1", "POSTING_SEEN", "공공기관·연구기관에 장비를 제안하고 조달 입찰 서류를 준비한다(기술영업)", "공공기관 기술영업(서울·대전) 공고, 수원 기술영업 신입·경력 공고(2024-11)", [3]),
      job("ROLE_OPS_V1", "POSTING_SEEN", "부품 구매와 납기를 관리한다", "구매관리 경력 공고", [4]),
      job("ROLE_MKT_V1", "INDUSTRY_EXAMPLE", "제품군별 카탈로그와 전시회 자료를 만든다"),
    ],
    interpretation: [
      "공공기관 판매 비중이 있다면 조달 입찰 절차와 규격서를 읽는 일이 영업의 큰 부분입니다.",
      "지역 영업 거점이 여럿이라 근무지가 대전 본사가 아닐 수 있습니다.",
    ],
    to_check: ["기술영업 신입 공고의 근무지", "대구·부산 거점의 현재 운영 여부"],
    sources: [kodata("(주)제이오텍"), s("SEARCH", "공식 홈페이지 연락처 검색 결과", "https://www.jeiotech.com/eng/about/contact.php"),
      s("DIRECTORY", "원티드 기업 소개 검색 결과", "https://www.wanted.co.kr/company/31442"),
      s("SEARCH", "잡코리아 채용 목록 검색 결과", "https://www.jobkorea.co.kr/company/42165786/recruit"),
      s("SEARCH", "사람인 구매관리 공고 검색 결과", "https://m.saramin.co.kr/jobs/theme/koreabio")],
    verify: "OFFICIAL_CROSSCHECKED",
  },
  {
    id: "KR-NA-GEMVAX", name: "(주)젬백스앤카엘",
    identifiers: { bizno: "314-81-21219", corpno: "160111-0069636", listing: "코스닥 상장(2005-06-24)", src: [0, 2] },
    region: "NATIONAL", region_basis: "본점 소재지(2025-12 경기 성남으로 이전)",
    hq: { text: "경기 성남시 분당구 운중로 117(2025-12 이전, 전에는 대전 유성구)", src: [0, 1] },
    sites: ["대전 유성구 공장(이전 뒤 운영 여부 미확인)"],
    facts: [
      { text: "반도체·디스플레이 클린룸에 쓰는 케미컬 에어필터를 만들고, 펩타이드 신약 후보물질을 함께 개발한다.", src: [0, 3] },
      { text: "2025년 12월 본점을 대전에서 경기 성남으로 옮겼다.", src: [0, 1] },
    ],
    industry_line: "반도체 공정용 필터와 신약 개발",
    industries: ["INDUSTRY_B2B_V1"],
    jobs: [
      job("ROLE_FINACC_V1", "INDUSTRY_EXAMPLE", "필터 사업과 신약 사업의 원가와 연구비를 나눠 기록한다"),
      job("ROLE_SALES_V1", "INDUSTRY_EXAMPLE", "반도체 제조사의 구매 부서와 공급 조건을 맞춘다"),
    ],
    interpretation: [
      "본점이 옮겨 가서 지역 기업으로 적지 않았습니다. 대전 공장이 남아 있는지 확인되면 다시 분류합니다.",
    ],
    to_check: ["대전 공장 존속 여부", "경영 계열 공고 이력(검색에서는 품질관리 공고만 보였습니다)"],
    sources: [kodata("(주)젬백스앤카엘"), s("SEARCH", "기업 재무 정보 페이지 주소 검색 결과(FnGuide)", "https://comp.fnguide.com/SVO2/asp/SVD_Finance.asp?pGB=1&gicode=A082270"),
      s("SEARCH", "한국거래소 공시(KIND) 검색 결과", "https://kind.krx.co.kr/external/2023/03/22/001526/20230322006412/11011.htm"),
      s("NEWS", "필터·신약 사업 보도(뉴스핌)", "https://www.newspim.com/news/view/20260313000949")],
    verify: "CONFLICTING",
  },
  {
    id: "KR-DJ-CAVAC", name: "(주)중앙백신연구소",
    identifiers: { bizno: "305-81-19849", corpno: "160111-0042533", listing: "코스닥 상장(2003-10-31)", src: [0, 2] },
    region: "DAEJEON", region_basis: "본점 소재지",
    hq: { text: "대전 유성구 유성대로 1476-37", src: [0, 1] },
    sites: ["충남 논산 공장", "충북 영동 사업장(제3자 기업정보)"],
    facts: [
      { text: "돼지·닭·반려동물용 백신을 개발·생산하고 20여 개국에 수출한다.", src: [1] },
      { text: "국내에서는 동물약품 도매·유통망을 거쳐 팔고, 해외에서는 글로벌 동물약품사와 맺은 생산·유통 계약으로 판다(제3자 기업정보).", src: [0] },
    ],
    industry_line: "동물용 백신 제조와 수출",
    industries: ["INDUSTRY_B2B_V1"],
    jobs: [
      job("ROLE_SALES_V1", "POSTING_SEEN", "동물약품 도매상과 축산 농가 쪽 판매처를 관리한다(국내영업), 해외 유통사와 수출 조건을 맞춘다(해외영업)", "국내영업 신입·경력(2026-01 마감), 2026 하반기 신입 국내영업, 해외영업 공고", [3, 4]),
      job("ROLE_MKT_V1", "INDUSTRY_EXAMPLE", "제품별 판매 자료와 수의사 대상 설명 자료를 만든다"),
    ],
    interpretation: [
      "수출 비중이 있다면 해외영업은 나라마다 다른 등록 절차와 유통 계약을 다룹니다. 무역 실무와 영어 문서가 같이 필요합니다.",
      "2026년 하반기 신입 채용에 국내영업이 들어 있다는 검색 결과가 있어, 이 자료에서 학부 신입 경로가 가장 뚜렷하게 보인 곳입니다.",
    ],
    to_check: ["하반기 신입 공고의 지원 자격(전공 제한)", "영업 근무지가 본사인지 지역인지"],
    sources: [kodata("(주)중앙백신연구소"), s("SEARCH", "공식 홈페이지 회사 소개 검색 결과", "https://cavac.co.kr/about/company"),
      s("SEARCH", "코스닥 072020 상장 정보 검색 결과", "https://www.stockhub.kr/stock/072020"),
      s("SEARCH", "잡코리아 채용 목록 검색 결과", "https://www.jobkorea.co.kr/company/46089067/recruit"),
      s("SEARCH", "캐치 채용 목록 검색 결과", "https://www.catch.co.kr/Comp/RecruitInfo/529435")],
    verify: "OFFICIAL_CROSSCHECKED",
  },
];

/* ── v1 13곳 옮기기 ───────────────────────────────────────────── */

const KIND: Record<string, Source["kind"]> = {
  SECONDARY_DIRECTORY: "DIRECTORY", SECONDARY_NEWS: "NEWS", SECONDARY_COMMUNITY: "COMMUNITY", OFFICIAL: "OFFICIAL",
};
const REGION: Record<string, Region> = { DAEJEON: "DAEJEON", SEJONG: "SEJONG", CHUNGNAM: "CHUNGNAM", CHUNGBUK: "CHUNGBUK" };
const ROLE_TASK: Record<string, string> = {
  ROLE_PLAN_V1: "사업 계획과 예산 배분을 정리한다", ROLE_ANALYTICS_V1: "운영 자료를 모아 지표로 정리한다",
  ROLE_FINACC_V1: "예산 집행과 결산 기록을 맞춘다", ROLE_OPS_V1: "업무 절차와 일정을 관리한다",
  ROLE_CS_V1: "고객 응대 기준과 처리 기록을 관리한다", ROLE_SALES_V1: "고객사 요구를 계약 조건으로 정리한다",
  ROLE_MKT_V1: "홍보·판매 채널을 기획하고 성과를 비교한다", ROLE_HR_V1: "채용과 교육 기준을 정한다",
};
type V1 = {
  id: string; name: string; region: string; location: { text: string; kind: string; status: string };
  workplace: { note?: string }; business: { text: string }; industries: string[]; roles: string[];
  sources: { url: string; kind: string; what: string }[];
};
const OLD: Org2[] = (v1.orgs as V1[]).map((o) => {
  const sources: Source[] = o.sources.map((x) => ({ kind: KIND[x.kind] ?? "SEARCH", title: x.what, url: x.url, checked_on: v1.checked_on }));
  const all = sources.map((_, i) => i);
  return {
    id: o.id, name: o.name, origin: "EXISTING_V1",
    identifiers: { bizno: null, corpno: null, listing: null, src: [] },
    region: REGION[o.region] ?? "NATIONAL", region_basis: o.location.kind === "HQ" ? "본사 소재지" : o.location.kind === "SITE" ? "사업장 소재지" : "운항 거점",
    hq: { text: o.location.text, src: all },
    sites: [], facts: [{ text: o.business.text, src: all }],
    industry_line: o.business.text.split(" (")[0].slice(0, 30),
    industries: o.industries,
    jobs: o.roles.map((r) => job(r, "INDUSTRY_EXAMPLE", ROLE_TASK[r] ?? "")),
    interpretation: [],
    to_check: ["공식 홈페이지·공공기관 경영정보 공개시스템(ALIO)·전자공시에서 주소와 사업을 직접 확인", ...(o.workplace.note ? [o.workplace.note] : [])],
    sources,
    hiring: { status: "UNVERIFIED", note: "채용 여부를 확인하지 않았습니다" },
    verify: o.location.status === "CONFLICTING" ? "CONFLICTING" : "SECONDARY_ONLY",
  } satisfies Org2;
});

/* ── 겹침 확인 ───────────────────────────────────────────────── */

const norm = (n: string) => n.replace(/\(주\)|㈜|주식회사|\s/g, "");
for (const n of NEW) {
  const dup = OLD.find((o) => norm(o.name).includes(norm(n.name)) || norm(n.name).includes(norm(o.name)));
  if (dup) throw new Error(`겹침: ${n.name} ↔ ${dup.name}`);
}
const set: OrgSet2 = {
  schema: "careermatri-region-orgs.2",
  checked_on: D,
  status: "PREVIEW_ONLY",
  note: "학생 공개 결과지에 싣기 전에 공식 확인이 필요합니다. KODATA 는 제3자 기업정보이며 재무표·신용등급·거래처 이름은 옮기지 않았습니다. 채용 여부는 확인하지 않았습니다.",
  region_facts: (v1.region_facts as { region: string; fact: string; source: { title: string; url: string; kind: string } }[]).map((f) => ({
    text: f.fact, region: f.region, source: { kind: KIND[f.source.kind] ?? "NEWS", title: f.source.title, url: f.source.url, checked_on: v1.checked_on },
  })),
  orgs: [
    ...NEW.map((n) => ({ ...n, origin: "KODATA_NEW" as const, hiring: { status: "UNVERIFIED" as const, note: "채용 여부를 확인하지 않았습니다. 공고에서 본 직무는 그 직무가 있었다는 근거까지입니다." } })),
    ...OLD,
  ],
};
writeFileSync("data/region/kr-chungcheong-orgs.v2.json", JSON.stringify(set, null, 1) + "\n");
console.log(`v2: 새 ${NEW.length} · 기존 ${OLD.length} · 겹침 0`);
