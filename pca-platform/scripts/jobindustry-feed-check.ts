/**
 * 잡인더스트리 게시판 읽기를 네트워크 없이 센다.
 *
 *   npx tsx scripts/jobindustry-feed-check.ts
 *
 * 흉내 낸 HTML 은 2026-10-31 에 대표님 브라우저로 확인한 원본 꼴을 따른다:
 * 목록 링크 `/487/?q=…&bmode=view&idx=…&t=…`, 다음 쪽 `/487/?q=…&page=N`,
 * 상세의 `og:title`(`제목 : 게시판`) · `.view_tit` · `.board_txt_area`.
 * 실제 화면에서 처음 돌린 날 운영 로그(`jobs.jobindustry`)로 한 번 더 맞춘다.
 *
 * 2026-11-03 에 더한 것(그날 시험 세션이 브라우저로 확인한 꼴): 채용 다섯 곳 + 연구비 · 평가위원 · 교육 게시판,
 * 목록 카드 `a.post_link_wrap` 과 `.title em` 분류, 상세 제목 앞에 붙은 분류, 본문의 `모집 분야 · 지원 자격 · 고용 형태 ·
 * 근무지 · 접수 기간` 틀, 쪽 번호가 열 개씩만 보이는 쪽 넘기기, 여러 당번에 나눠 읽기, 커리어피크 캘린더 공개 JSON.
 * DB 를 쓰지 않는다: 이미 담은 번호 · 저장은 가짜로 갈음한다. 저장 규칙(마감 · 제목 없음)은 `jobs:check` 가 센다.
 */
import { closesOf, hasPage, innerOf, listCards, listRefs, parseView, stripCategory, tagsOf, textOf } from "../src/lib/jobs/jobindustry-parse";
import { degreeOf, employmentOf, fieldOf, isClosed, isResearchPosting, kindOf, periodEnd, regionLabelOf, splitFields } from "../src/lib/jobs/meta";
import { jiRow, runJobindustry } from "../src/lib/jobs/jobindustry";
import { cpDegree, cpRows, cpUrl, cpUrlOk, parseCalendar, runCareerpeak } from "../src/lib/jobs/careerpeak";
import { newImwebState } from "../src/lib/jobs/imweb";
import type { IngestResult, RawPosting } from "../src/lib/jobs/ingest";
import { shownAs } from "../src/lib/mat/pick-jobs";

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, note = "") {
  if (cond) { pass += 1; console.log(`  통과  ${name}`); } else { fail += 1; console.log(`  걸림  ${name}${note ? ` — ${note}` : ""}`); }
}

const LIST = `
<nav><a href="/439/?q=YToxOntz&amp;bmode=view&amp;idx=111111111&amp;t=board">다른 게시판 글</a></nav>
<div class="li_board">
  <a href="/487/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&amp;bmode=view&amp;idx=168452391&amp;t=board" class="list_text_title">가</a>
  <a href="/487/?q=YToxOntz&amp;bmode=view&amp;idx=168452391&amp;t=board">가 (같은 글 둘째 링크)</a>
  <a href='https://www.jobindustry.co.kr/487/?bmode=view&idx=168452002&t=board'>나</a>
  <a href="/487/?q=YToxOntz&amp;bmode=view&amp;idx=abc&amp;t=board">번호 아님</a>
  <a href="/science-conference-news/?idx=168000001&amp;bmode=view">학회</a>
</div>
<div class="pagination"><a href="/487/?q=YToxOntz&amp;page=2">2</a></div>`;

console.log("목록");
const refs = listRefs(LIST, "487");
ok("그 게시판 글만 · 겹치지 않게 · 차례대로", JSON.stringify(refs) === JSON.stringify(["168452391", "168452002"]));
ok("다른 게시판 링크는 섞지 않는다", !listRefs(LIST, "487").includes("111111111") && listRefs(LIST, "439").includes("111111111"));
ok("다음 쪽이 있으면 안다", hasPage(LIST, "487", 2));
ok("없는 쪽은 없다고 한다", !hasPage(LIST, "487", 3));

const VIEW = `<html><head>
<meta property="og:title" content="[연구직] 배터리 셀 설계 연구원 채용 &amp; 인턴 : 기업 R&amp;D" />
<script>var a = "<div class='board_txt_area'>가짜</div>";</script>
</head><body>
<div class="view_tit"><span class="cate">IT/AI/빅데이터/블록체인</span> 배터리 셀 설계 연구원 채용</div>
<div class="board_view"><div class="board_txt_area fr-view">
  <p>모집 분야: 셀 설계</p><div><p>자격: 전기화학 석사 이상</p></div>
  <p>접수 마감 : 2026. 11. 20 (목) 18:00</p>
  <style>.x{color:red}</style>
</div><div class="board_comment">댓글</div></div>
</body></html>`;

console.log("상세");
const v = parseView(VIEW);
ok("제목은 og:title 에서 게시판 꼬리를 뗀다", v.title === "[연구직] 배터리 셀 설계 연구원 채용 & 인턴");
ok("본문은 board_txt_area 안쪽 전부 (겹친 div 포함)", v.body.includes("셀 설계") && v.body.includes("전기화학 석사"));
ok("본문에 댓글 · 스크립트 · 스타일이 섞이지 않는다", !v.body.includes("댓글") && !v.body.includes("가짜") && !v.body.includes("color"));
ok("마감일을 읽는다", v.closes === "2026.11.20");
ok("og:title 이 없으면 view_tit 에서", parseView(VIEW.replace(/<meta[^>]+>/, "")).title.includes("배터리 셀 설계"));
ok("날짜 없는 마감은 비운다", closesOf("마감: 채용 시 마감") === "" && closesOf("상시 채용") === "");
ok("두 자리 연도와 한글 날짜도 읽는다", closesOf("서류 마감일 26-11-03") === "26-11-03" && closesOf("마감 2026년 11월 3일") === "2026년11월3");
ok("못 찾으면 빈 값 (짐작해 채우지 않는다)", innerOf("<div>x</div>", "board_txt_area") === "" && parseView("<html></html>").title === "");
ok("문자 참조를 푼다", textOf("A&nbsp;&amp;&#x41;&#66;") === "A &AB");

/* ── 2026-11-03: 모든 게시판 · 모든 쪽 · 카드 칸 ─────────────────── */

const FRAME = (o: { 분야: string; 자격: string; 형태: string; 근무지: string; 기간: string }) =>
  /* 시험 세션이 본 본문 틀. 한 문단에 이어 적힌 꼴로 둔다(줄이 바뀌어도 같게 읽혀야 한다) */
  `<p>모집 분야: ${o.분야} 지원 자격: ${o.자격} 고용 형태: ${o.형태} 근무지: ${o.근무지} 접수 기간: ${o.기간}</p>`;
const view = (titleText: string, body: string, cate = "", og = true) => `<html><head>
${og ? `<meta property="og:title" content="${cate}${titleText} : 잡인더스트리" />` : ""}</head><body>
<div class="view_tit">${cate ? `<em>${cate}</em>` : ""}${titleText}</div>
<div class="board_txt_area fr-view">${body}</div></body></html>`;
const listPage = (board: string, cards: string[], links: number[] = []) => `<html><body>
<nav><ul><li><a href="/">홈</a></li><li><a href="/487/?bmode=view&amp;idx=99">메뉴 글</a></li></ul></nav>
<div class="li_board">${cards.join("\n")}</div>
<div class="pagination">${links.map((n) => `<a href="/${board}/?q=YToxOntz&amp;page=${n}">${n}</a>`).join("")}</div></body></html>`;
/* 채용 게시판 카드: `a.post_link_wrap` 안 `.title em`(공지 · 분류). 브라우저가 붙이는 `jxbc-` 배지는 서버 HTML 에 없다 */
const card = (board: string, idx: string, title: string, cate = "", notice = false) =>
  `<a href="/${board}/?q=YToxOntz&amp;bmode=view&amp;idx=${idx}&amp;t=board" class="post_link_wrap">`
  + `<div class="title">${notice ? "<em>공지</em>" : ""}${cate ? `<em>${cate}</em>` : ""}<span>${title}</span></div>`
  + `<div class="info">2026.11.01</div></a>`;
/* 연구비 · 평가위원 · 교육 게시판은 카드 꼴이 다르다(idx 가 든 링크만 믿는다) */
const plainCard = (board: string, idx: string, title: string) =>
  `<div class="item"><a href="/${board}/?bmode=view&amp;idx=${idx}">${title}</a></div>`;

const IT = "IT/AI/빅데이터/블록체인", ME = "기계/모빌리티/로봇/조선";
/* 487 은 12쪽인데 쪽 번호는 열 개씩만 보인다: 흉내로 3쪽, 2쪽에는 3쪽 링크가 없다. 4쪽은 3쪽을 다시 준다 */
const P487_3 = listPage("487", [card("487", "1005", "AI 연구원 채용", IT)]);
const SITE: Record<string, string> = {
  "/487/": listPage("487", [
    card("487", "1000", "공지: 게시판 이용 안내", "", true),
    card("487", "1001", "(주)코르트 생체신호처리 엔지니어(2년 이상) 채용", "바이오/의료"),
    card("487", "1002", "리빌더에이아이 AI 엔지니어 채용", IT),
  ], [1, 2]),
  "/487/?page=2": listPage("487", [
    card("487", "1003", "지난 공고", ME),
    `<a href="/487/?bmode=view&amp;idx=1004" class="post_link_wrap"><div class="title"><img src="x.png"></div></a>`,
  ], [1, 2]),
  "/487/?page=3": P487_3,
  "/487/?page=4": P487_3,
  "/488/": listPage("488", [card("488", "4001", "뇌신호 연구실 석사과정 학생 모집", IT), card("488", "4002", "ASU postdoc", IT), card("488", "4003", "연구실 연구원 채용", IT)]),
  "/430/": listPage("430", [card("430", "5001", "한국과학기술연구원 연구직 채용", ME)]),
  "/research-funding/": listPage("research-funding", [plainCard("research-funding", "3001", "신진연구자 지원")]),
  "/evaluator-recruitment/": listPage("evaluator-recruitment", [plainCard("evaluator-recruitment", "3101", "평가위원 모집")]),
  "/505/": listPage("505", [plainCard("505", "3201", "연구윤리 교육")]),
  "/487/?bmode=view&idx=1001": view("(주)코르트 생체신호처리 엔지니어(2년 이상) 채용",
    FRAME({ 분야: "생체신호 처리 알고리즘 개발", 자격: "석사 또는 박사 학위 소지자, 관련 경력 2년 이상", 형태: "정규직", 근무지: "경기 성남시 분당구", 기간: "2099.10.27 ~ 2099.12.31 18:00" }), "바이오/의료"),
  /* og:title 없이 view_tit 에 분류가 글로 붙은 꼴(띄어쓰기 없음) */
  "/487/?bmode=view&idx=1002": `<html><body><div class="view_tit">${IT}리빌더에이아이 AI 엔지니어 채용</div><div class="board_txt_area">${FRAME({ 분야: "LLM", 자격: "학사 이상", 형태: "정규직", 근무지: "서울 강남구", 기간: "~ 2026.11.01(일)" })}</div></body></html>`,
  "/487/?bmode=view&idx=1003": view("지난 공고", FRAME({ 분야: "설계", 자격: "학사", 형태: "계약직", 근무지: "대전", 기간: "2020.01.01 ~ 2020.01.31" }), ME),
  "/487/?bmode=view&idx=1004": `<html><head><meta property="og:title" content="잡인더스트리" /></head><body><div class="board_txt_area"><p><img src="poster.png"></p><p>문의: 대표 메일</p></div></body></html>`,
  "/487/?bmode=view&idx=1005": view("AI 연구원 채용", FRAME({ 분야: "딥러닝", 자격: "석사 이상", 형태: "정규직", 근무지: "서울", 기간: "상시 모집" }), IT),
  "/488/?bmode=view&idx=4001": view("[KAIST 바이오뇌공학과] 뇌신호 연구실 석사과정 학생 모집", FRAME({ 분야: "뇌신호", 자격: "학사 이상", 형태: "학생 연구원", 근무지: "대전 유성구", 기간: "~ 2099.11.30(월)" }), IT),
  "/488/?bmode=view&idx=4002": view("Arizona State University (ASU) Postdoc / PhD student 모집", FRAME({ 분야: "EE", 자격: "박사", 형태: "기타", 근무지: "Tempe, Arizona, USA", 기간: "~ 2099.10.01" }), IT),
  "/488/?bmode=view&idx=4003": view("OO대 연구실 연구원 채용", FRAME({ 분야: "AI", 자격: "석사 이상", 형태: "계약직", 근무지: "서울", 기간: "~ 2099.10.01" }), IT),
  /* 대괄호로 싼 분류가 붙은 제목 */
  "/430/?bmode=view&idx=5001": `<html><body><div class="view_tit">[${ME}]한국과학기술연구원 연구직 채용</div><div class="board_txt_area">${FRAME({ 분야: "로봇", 자격: "박사 이상", 형태: "정규직", 근무지: "서울 성북구", 기간: "2099.11.01 ~ 2099.11.20 14:00" })}</div></body></html>`,
  "/research-funding/?bmode=view&idx=3001": view("2027년 기초연구사업 신진연구자 지원 공고", "<p>소관 부처: 과학기술정보통신부 전문 기관: 한국연구재단 공고 번호: 제2099-001호 공모 유형: 자유공모 접수 기간: 2099.01.01 ~ 2099.02.01</p>"),
  "/evaluator-recruitment/?bmode=view&idx=3101": view("2099년 연구개발과제 평가위원 모집", "<p>모집 분야: 정보통신 모집 인원: 00명 접수 기간: ~ 2099.03.01</p>"),
  "/505/?bmode=view&idx=3201": view("연구윤리 교육 안내", "<p>교육 일시: 2099.04.01</p><p>마감 2099.03.20</p>"),
};
const BASE = "https://www.jobindustry.co.kr";
const hits = new Map<string, number>();
async function fakeGet(url: string): Promise<string> {
  const path = url.replace(BASE, "");
  hits.set(path, (hits.get(path) ?? 0) + 1);
  return SITE[path] ?? listPage(path.split("/")[1] ?? "", []);
}
const B = {
  "487": { path: "487", label: "기업 R&D", kind: "job" as const },
  "488": { path: "488", label: "대학원", kind: "grad" as const },
  "430": { path: "430", label: "출연연", kind: "job" as const },
  "research-funding": { path: "research-funding", label: "연구비", kind: "funding" as const },
  "evaluator-recruitment": { path: "evaluator-recruitment", label: "평가위원", kind: "evaluator" as const },
};

console.log("목록 카드 (a.post_link_wrap · .title em)");
const cards = listCards(SITE["/487/"], "487");
ok("카드마다 번호 · 제목 · 분류(공지 em 은 빼고)", cards.length === 3 && cards[1].idx === "1001"
  && cards[1].title === "(주)코르트 생체신호처리 엔지니어(2년 이상) 채용" && cards[1].tags.join("|") === "바이오/의료"
  && cards[0].tags.length === 0, JSON.stringify(cards));
ok("공지 카드는 공지로 표시한다(상세를 부르지 않는다)", cards[0].notice === true && !cards[1].notice);
ok("메뉴의 같은 게시판 글 링크는 카드가 아니다(post_link_wrap 만)", cards.every((c) => /^100\d$/.test(c.idx)));
ok("카드 꼴이 다른 게시판도 idx 링크로 읽는다", listCards(SITE["/research-funding/"], "research-funding")[0]?.idx === "3001");
/* 2026-11-05 시험 세션이 실제 487 첫 쪽에서 본 `<a>` 그대로: class 둘 · 빈칸 2개 · `&` 그대로 · 닫는 `>` 앞 빈칸 3개 */
const liveCard = (idx: number, title: string) =>
  `<a class="post_link_wrap _fade_link"  href="/487/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&bmode=view&idx=${idx}&t=board"   >`
  + `<div class="title"><em>${IT}</em><span>${title}</span></div><div class="info">2026.11.05</div></a>`;
const LIVE = listPage("487", Array.from({ length: 20 }, (_, i) => liveCard(175345227 - i, `실제 꼴 공고 ${i + 1}`)), [1, 2, 3]);
const live = listCards(LIVE, "487");
ok("실제 487 카드 꼴: 20장 · 번호 · 제목 · 분류", live.length === 20 && live[0].idx === "175345227" && live[0].title === "실제 꼴 공고 1"
  && live[0].tags.join("|") === IT && !live.some((c) => c.idx === "99"), JSON.stringify(live[0]));
ok("실제 487 카드 꼴: 2쪽 링크를 찾는다", hasPage(LIVE, "487", 2));
/* 짝이 맞지 않는 `<style` 글자가 카드 앞에 있으면 스크립트 · 스타일 걷기가 카드까지 지운다. 그때는 걷지 않고 다시 읽는다 */
const torn = LIVE.replace('<div class="li_board">', '<div data-css="<style id=x>" class="li_board">').replace("</body>", "<style>.x{}</style></body>");
ok("시험 화면이 정말 카드를 지우는 꼴이다", !/post_link_wrap/.test(torn.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")));
ok("걷기가 카드를 지우면 걷지 않은 화면으로 다시 읽는다", listCards(torn, "487").filter((c) => c.idx !== "99").length === 20, String(listCards(torn, "487").length));
ok("스크립트 안의 같은 게시판 링크는 여전히 섞지 않는다", listCards(LIVE.replace("</body>", '<script>var u = "/487/?bmode=view&idx=31337";</script></body>'), "487").length === 20);
/* post_link_wrap 이 카드가 아닌 곳(감싼 div)에만 있으면 옛 방식: 그 게시판 글 링크 전부 */
const moved = listPage("487", [`<div class="post_link_wrap"><a href="/487/?bmode=view&amp;idx=2001"><div class="title">감싼 꼴</div></a></div>`]);
ok("post_link_wrap 이 <a> 에 없으면 그 게시판 글 링크를 모두 쓴다", listCards(moved, "487").map((c) => c.idx).join(",") === "99,2001",
  JSON.stringify(listCards(moved, "487")));
ok("같은 번호가 메뉴와 카드에 다 있으면 카드 쪽 제목", listCards(listPage("487", [card("487", "99", "카드 제목")]), "487")
  .map((c) => `${c.idx}:${c.title}`).join(",") === "99:카드 제목");
/* 2026-11-05 시험 세션이 보낸 실제 487 카드 한 장 그대로(배경 주소만 줄임). 숨긴 공지 em · 숨긴 분류 em · 주석 */
const realCard = (idx: number) => `<a class="post_link_wrap _fade_link"  href="/487/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&bmode=view&idx=${idx}&t=board"   > <div class="card_wrapper card-thumbnail-wrap " style="background-image: url(x.jpg)"> <div class="card-head _card_head _img_wrap"> <span> </span> </div> </div> <div class="card-body _card_body list-group"> <div class="title title-block"> <em class="notice-block" style="display: none">공지</em> <span> <em style="padding-right:5px;color:#222;display: none">IT/AI/빅데이터/블록체인</em> </span> (주)심네트 (충남 계룡시) M&S 연구분석가 모집 (석사) <!-- 주석 <b>x</b> --> </div> <div class="text text-block show_body"> <span></span> </div> </div> </a>`;
const real = listCards(listPage("487", Array.from({ length: 20 }, (_, i) => realCard(175345227 - i))), "487");
ok("실제 카드: 숨긴 공지 em 이 있어도 공지가 아니다(20장 모두 새 공고 후보)", real.length === 20 && real.every((c) => !c.notice), JSON.stringify(real[0]));
ok("실제 카드: 제목에서 숨긴 분류 · 주석을 빼고, 분류는 칸으로", real[0].title === "(주)심네트 (충남 계룡시) M&S 연구분석가 모집 (석사)"
  && real[0].tags.join("|") === IT, JSON.stringify(real[0]));
ok("보이는 공지 em 은 여전히 공지", listCards(listPage("487", [realCard(1).replace(' style="display: none">공지', ">공지")]), "487").find((c) => c.idx === "1")?.notice === true);
ok("묶는 요소(.tags)는 건너뛰고 안쪽 표 글만", tagsOf(`<div class="tags"><span class="tag">석사</span><span class="tag">박사</span></div>`).join("|") === "석사|박사");

console.log("상세 제목 (앞에 붙은 분류를 뗀다)");
ok("띄어쓰기 없이 붙은 분류: 카드 분류로 뗀다", parseView(SITE["/487/?bmode=view&idx=1002"], [IT]).title === "리빌더에이아이 AI 엔지니어 채용");
ok("대괄호로 싼 분류는 카드 분류를 몰라도 뗀다", parseView(SITE["/430/?bmode=view&idx=5001"]).title === "한국과학기술연구원 연구직 채용");
ok("view_tit 의 em 분류는 요소째 걷는다", parseView(view("AI 연구원 채용", "", IT, false)).title === "AI 연구원 채용"
  && parseView(view("AI 연구원 채용", "", IT, false)).tags.includes(IT));
ok("og:title 에 붙은 분류도 뗀다", parseView(view("AI 연구원 채용", "", IT)).title === "AI 연구원 채용");
ok("stripCategory: 모르는 분류 + 대괄호 없음은 그대로 둔다", stripCategory("가나다 채용") === "가나다 채용");
ok("og:title 이 사이트 이름뿐이면 제목이 아니다", parseView(SITE["/487/?bmode=view&idx=1004"]).title === "");

console.log("본문 칸 (모집 분야 · 지원 자격 · 고용 형태 · 근무지 · 접수 기간)");
const f1 = splitFields(textOf(FRAME({ 분야: "AI", 자격: "석사 이상", 형태: "정규직", 근무지: "대전 유성구", 기간: "2026.10.27 ~ 2026.11.10 14:00" })));
ok("한 문단에 이어 적혀도 칸마다 나눈다", f1.모집분야 === "AI" && f1.지원자격 === "석사 이상" && f1.고용형태 === "정규직"
  && f1.근무지 === "대전 유성구" && f1.접수기간 === "2026.10.27 ~ 2026.11.10 14:00", JSON.stringify(f1));
ok("줄이 바뀐 꼴도 같다", splitFields("모집 분야: 설계\n지원 자격: 학사\n근무지: 서울").근무지 === "서울");
ok("접수 기간 끝 날짜: ~ 2026.11.01(일)", periodEnd("~ 2026.11.01(일)") === "2026.11.01");
ok("접수 기간 끝 날짜: 2026.10.27 ~ 2026.11.10 14:00", periodEnd("2026.10.27 ~ 2026.11.10 14:00") === "2026.11.10");
ok("상시 모집은 날짜 없음(남긴다)", periodEnd("상시 모집") === "" && periodEnd("채용 시 마감") === "");
ok("연구비 칸: 소관 부처 · 전문 기관 · 공고 번호 · 공모 유형 · 접수 기간", (() => {
  const f = splitFields("소관 부처: 과학기술정보통신부 전문 기관: 한국연구재단 공고 번호: 제2099-001호 공모 유형: 자유공모 접수 기간: 2099.01.01 ~ 2099.02.01");
  return f.소관부처 === "과학기술정보통신부" && f.전문기관 === "한국연구재단" && f.공고번호 === "제2099-001호" && f.공모유형 === "자유공모" && f.접수기간 === "2099.01.01 ~ 2099.02.01";
})());
ok("평가위원 칸: 모집 분야 · 모집 인원 · 접수 기간", (() => { const f = splitFields("모집 분야: 정보통신 모집 인원: 00명 접수 기간: ~ 2099.03.01"); return f.모집분야 === "정보통신" && f.모집인원 === "00명" && f.접수기간 === "~ 2099.03.01"; })());
ok("`마감` 말 없이 기간만 적은 공고는 물결 뒤 날짜", closesOf("접수 기간: 2026.11.01 ~ 2026.11.20") === "2026.11.20");
ok("고용 형태를 짧게", employmentOf("정규직(6급 신입)") === "정규직" && employmentOf("무기 계약직") === "무기계약직" && employmentOf("학생 연구원") === null);

console.log("학위 · 분야 · 지역");
ok("학위 표시: 석·박사", degreeOf("석·박사 학위 소지자").label === "석사·박사" && degreeOf("석·박사 학위 소지자").min === "master");
ok("학위 표시: 석사 이상", degreeOf("석사 이상").label === "석사 이상" && degreeOf("석사 이상").min === "master");
ok("학위 표시: 학사·석사·박사 이상", degreeOf("학사·석사·박사 이상").min === "bachelor");
ok("학위 표시: 전문연구요원(석사)", degreeOf("전문연구요원 편입 가능(석사)").label === "전문연구요원(석사)");
ok("학위 표시: 경력·신입박사", degreeOf("경력 및 신입박사 채용").label === "경력·신입박사" && degreeOf("경력 및 신입박사 채용").min === "phd");
ok("학위 말이 없으면 비운다", degreeOf("성실한 분").label === null && degreeOf("학력 무관").min === "any");
ok("분야(분류가 없을 때): 제목 · 본문 낱말", fieldOf("딥러닝 엔지니어", "모델 학습") === "IT·AI·통신" && fieldOf("연구원 채용", "성실한 분\n전자 결재 가능") === null);
ok("지역: 근무지 칸이 먼저", regionLabelOf("서울 본사 연구원", "", [], "대전광역시 유성구").label === "대전");
ok("지역: 세종대학교는 세종이 아니다", regionLabelOf("세종대학교 연구실", "").label !== "세종");
ok("지역: 본문 아무 데서나 줍지 않는다", regionLabelOf("연구원", "서울대 졸업자 우대").label === null);
ok("지역: 해외(근무지 Tempe, Arizona, USA → 미국)", regionLabelOf("x", "", [], "Tempe, Arizona, USA").abroad === true);
ok("마감 지남은 서울 날짜로", isClosed("2026-11-02", new Date("2026-11-03T01:00:00Z")) && !isClosed("2026-11-03", new Date("2026-11-03T01:00:00Z"))
  && isClosed("2026-11-02", new Date("2026-11-02T15:30:00Z")) && !isClosed(null));

console.log("종류 (대학원 · 연구실 모집은 488 에서 온 것만)");
ok("기업 게시판은 제목 · 요구 줄과 상관없이 채용", kindOf("job") === "job" && kindOf("job", "학생 연구원") === "job");
ok("488 은 대학원", kindOf("grad", "학생 연구원") === "grad" && kindOf("grad", null) === "grad");
ok("488 이라도 정규직 · 계약직이면 채용", kindOf("grad", "정규직") === "job" && kindOf("grad", "계약직") === "job" && kindOf("grad", "무기계약직") === "job");
ok("교원 임용 · 연구비 · 평가위원 · 교육은 게시판 그대로", kindOf("faculty") === "faculty" && kindOf("funding") === "funding"
  && kindOf("evaluator") === "evaluator" && kindOf("education") === "education");
ok("연구자 플랜 묶음: 대학원 · 교원 · 기업 R&D · 출연연 · 석박사(연구비 · 평가위원 · 교육은 따로)", isResearchPosting({ posting_kind: "job", category: "기업 R&D" })
  && isResearchPosting({ posting_kind: "faculty" }) && isResearchPosting({ posting_kind: "job", category: "공공기관", degree_min: "phd" })
  && !isResearchPosting({ posting_kind: "job", category: "공공기관", degree_min: "bachelor" })
  && !isResearchPosting({ posting_kind: "funding", degree_min: "phd" }) && !isResearchPosting({ posting_kind: "education" }));

console.log("상세 → 담을 줄");
const kort = jiRow(B["487"], "1001", SITE["/487/?bmode=view&idx=1001"], cards[1])!;
ok("코르트 경력 채용: 분류 기업 R&D · 종류 채용(대학원 아님)", kort.meta?.category === "기업 R&D" && kort.meta?.kind === "job", JSON.stringify(kort.meta));
ok("코르트: 학위는 지원 자격 · 지역은 근무지 · 분야는 카드 분류 · 마감은 접수 기간 끝", kort.meta?.degreeLabel === "석사·박사" && kort.meta?.regionLabel === "경기"
  && kort.meta?.field === "바이오/의료" && kort.closesOn === "2099.12.31" && kort.meta?.employmentType === "정규직", JSON.stringify(kort));
ok("본문 칸을 함께 담는다", kort.meta?.fields?.모집분야 === "생체신호 처리 알고리즘 개발");
ok("원문 주소는 운영 바탕으로", kort.url === "https://www.jobindustry.co.kr/487/?bmode=view&idx=1001");
const lab = jiRow(B["488"], "4001", SITE["/488/?bmode=view&idx=4001"])!;
ok("488 연구실 학생 모집은 대학원 · 대전", lab.meta?.kind === "grad" && lab.meta?.category === "대학원" && lab.meta?.regionLabel === "대전", JSON.stringify(lab.meta));
ok("488 의 계약직 연구원 채용은 채용", jiRow(B["488"], "4003", SITE["/488/?bmode=view&idx=4003"])!.meta?.kind === "job");
const asu = jiRow(B["488"], "4002", SITE["/488/?bmode=view&idx=4002"])!;
ok("해외 연구실(ASU) → 미국 · 해외", asu.meta?.regionLabel === "미국" && asu.meta?.abroad === true, JSON.stringify(asu.meta));
const kist = jiRow(B["430"], "5001", SITE["/430/?bmode=view&idx=5001"])!;
ok("출연연: 대괄호 분류를 뗀 제목 · 박사 이상 · 마감", kist.title === "한국과학기술연구원 연구직 채용" && kist.meta?.degreeMin === "phd" && kist.closesOn === "2099.11.20");
const fund = jiRow(B["research-funding"], "3001", SITE["/research-funding/?bmode=view&idx=3001"])!;
ok("연구비 → funding · 접수 기간 끝 · 소관 부처 칸", fund.meta?.kind === "funding" && fund.meta?.category === "연구비" && fund.closesOn === "2099.02.01"
  && fund.meta?.fields?.소관부처 === "과학기술정보통신부");
const ev = jiRow(B["evaluator-recruitment"], "3101", SITE["/evaluator-recruitment/?bmode=view&idx=3101"])!;
ok("평가위원 → evaluator · 모집 인원 칸", ev.meta?.kind === "evaluator" && ev.meta?.fields?.모집인원 === "00명" && ev.closesOn === "2099.03.01");

console.log("화면에 세울지 (pickJobs)");
ok("제목 없는 줄은 세우지 않는다(버그 ④)", shownAs({ title: null, raw_requirements: [], posting_kind: "job" }, false) === null);
ok("저장한 제목이 먼저", shownAs({ title: "AI 연구원 채용", raw_requirements: ["고용 형태: 정규직"] }, false)?.title === "AI 연구원 채용");
ok("코르트 경력 채용은 대학원 묶음이 아니다(버그 ③)", shownAs({ title: kort.title, posting_kind: "job", raw_requirements: ["석사 또는 박사 학위 소지자"] }, false)?.research === false);
ok("옛 줄(종류 칸 없음)도 요구 줄의 학위 말로 묶지 않는다", shownAs({ raw_requirements: ["생체신호처리 엔지니어(2년 이상) 채용", "석사 또는 박사 학위 소지자 연구실 경력"], source_url: "https://www.jobindustry.co.kr/487/?bmode=view&idx=1" }, false)?.research === false);
ok("옛 줄: 488 게시판은 대학원, 고용 형태 정규직이면 채용", shownAs({ raw_requirements: ["뇌신호 연구실 석사과정 학생 모집"], source_url: "https://www.jobindustry.co.kr/488/?bmode=view&idx=1" }, false)?.research === true
  && shownAs({ raw_requirements: ["연구실 연구원 채용", "고용 형태: 정규직"], source_url: "https://www.jobindustry.co.kr/488/?bmode=view&idx=2" }, false)?.research === false);
ok("연구비 · 평가위원 · 교육은 보이지 않는다", ["funding", "evaluator", "education"].every((k) => shownAs({ title: "x", posting_kind: k }, true)?.hidden === true)
  && shownAs({ raw_requirements: ["2027년 신진연구자 지원 공고"], source_url: "https://www.jobindustry.co.kr/research-funding/?bmode=view&idx=1" }, true)?.hidden === true);
ok("교원 임용은 석사 이상에게만", shownAs({ title: "전임교원 초빙", posting_kind: "faculty" }, false)?.hidden === true && shownAs({ title: "전임교원 초빙", posting_kind: "faculty" }, true)?.hidden === false);

const CAL = {
  updated_at: "2026-11-03T07:00:00+09:00",
  items: [
    { id: "jcy-001", org: "한국과학기술연구원", org_short: "KIST", title: "한국과학기술연구원 연구직 채용", url: "https://kist.example/recruit/1",
      start: "2099-11-01", end: "2099-11-20", status: "접수중", category: "정규직", job_types: ["연구"], degrees: ["박사"], degree_note: "박사 학위 소지자 이상", evidence: "공고문 2쪽 지원 자격" },
    { id: "jcy-002", org: "한국전자통신연구원", org_short: "ETRI", title: "2026년 하반기 기술직 채용", url: "https://etri.example/2",
      start: "2099-10-01", end: "2099-12-01", status: "접수중", category: "비정규", job_types: "기술·행정", degrees: "학사·석사", degree_note: "", evidence: "근무지: 대전 유성구" },
    { id: "jcy-003", org: "한국원자력연구원", org_short: "KAERI", title: "지난 채용", url: "", start: "2020-01-01", end: "2020-01-31", status: "마감", category: "기타", job_types: [], degrees: [], degree_note: "", evidence: "" },
  ],
};

async function walk(): Promise<void> {
  console.log("여러 쪽 · 여러 당번 (487 은 3쪽, 2쪽에 3쪽 링크 없음 · 한 당번에 깊은 쪽 1쪽 · 상세 4개)");
  Object.assign(process.env, { JOBINDUSTRY_DELAY_MS: "0", JOBINDUSTRY_PAGES_PER_TICK: "1", JOBINDUSTRY_MAX_DETAIL: "4", JOBINDUSTRY_MAX_PAGES: "40" });
  const known = new Set<string>();
  const saved: RawPosting[] = [];
  const save = async (rows: RawPosting[]): Promise<IngestResult> => {
    /* 실제 ingest 의 빼기 규칙만 흉내 낸다(제목 없음 · 마감 지남). 뺀 번호도 다시 부르지 않는다 */
    let noTitle = 0, closed = 0;
    for (const r of rows) {
      known.add(r.sourceRef);
      if (!r.title) noTitle += 1;
      else if (isClosed((r.closesOn ?? "").replace(/\./g, "-").replace(/-(\d)(?!\d)/g, "-0$1") || null)) closed += 1;
      else saved.push(r);
    }
    return { seen: rows.length, mapped: 0, unmapped: 0, stored: rows.length - noTitle - closed, skipped: { noTitle, closed } };
  };
  const state = newImwebState();
  const lines: string[] = [];
  const test = { known: async (refs: string[]) => new Set(refs.filter((r) => known.has(r))), save, log: (l: string) => lines.push(l) };
  const runs = [];
  for (let t = 0; t < 6; t += 1) runs.push(await runJobindustry({ get: fakeGet, state, test }));
  const total = runs.reduce((n, r) => n + r.fresh, 0);
  ok("job-normal 은 읽지 않는다", ![...hits.keys()].some((k) => k.includes("job-normal")));
  ok("첫 당번: 8 게시판 첫 쪽 + 487 2쪽 · 상세 4개", runs[0].pages === 9 && runs[0].fresh === 4, JSON.stringify(runs[0]));
  ok("다음 쪽 링크가 없어도 3쪽을 읽고, 같은 카드가 돌아온 4쪽에서 멈춘다", (hits.get("/487/?page=3") ?? 0) === 1 && (hits.get("/487/?page=4") ?? 0) === 1
    && !hits.has("/487/?page=5"), JSON.stringify([...hits.entries()].filter(([k]) => k.includes("page"))));
  ok("깊은 쪽은 한 번만 · 첫 쪽은 당번마다", (hits.get("/487/?page=2") ?? 0) === 1 && (hits.get("/487/") ?? 0) === 6 && runs[5].pages === 8, JSON.stringify(runs.map((r) => r.pages)));
  ok("밀린 상세를 다음 당번이 이어 부른다", runs.slice(0, 3).every((r) => r.fresh === 4) && runs[5].pending === 0 && total === 12,
    JSON.stringify(runs.map((r) => [r.fresh, r.pending])));
  ok("당번마다 게시판별 한 줄: 쪽 · 카드 수 · 새 번호", lines.length === 6 * 8
    && lines[0] === "[jobs] jobs.jobindustry board=430 pages=1 cards=1 new=1 done"
    && lines.some((l) => l === "[jobs] jobs.jobindustry board=487 pages=1,2 cards=3,2 new=4"), lines.slice(0, 8).join(" / "));
  ok("밤 당번 응답에도 같은 값", runs[0].boards.length === 8 && runs[0].boards.find((x) => x.board === "487")?.cards.join(",") === "3,2");
  ok("같은 상세를 두 번 부르지 않는다", [...hits.entries()].filter(([k]) => k.includes("bmode=view")).every(([, n]) => n === 1));
  ok("제목 없는 공고 · 마감 지난 공고(접수 기간 끝 2020 · 2026.11.01)는 담지 않는다",
    !saved.some((r) => ["1003", "1004"].includes(r.sourceRef)) && runs.reduce((n, r) => n + r.skipped.noTitle, 0) >= 1
    && runs.reduce((n, r) => n + r.skipped.closed, 0) >= 1, saved.map((r) => r.sourceRef).join(","));
  ok("상시 모집은 남긴다", saved.some((r) => r.sourceRef === "1005" && !r.closesOn));
  ok("채용 다섯 곳 · 연구비 · 평가위원 · 교육이 다 들어온다", ["1001", "1005", "4001", "5001", "3001", "3101", "3201"].every((x) => saved.some((r) => r.sourceRef === x)),
    saved.map((r) => r.sourceRef).join(","));

  console.log("커리어피크 정출연 채용 캘린더 (공개 JSON, 칸 구조를 따른 흉내 파일)");
  ok("그 파일 주소만 연다", cpUrlOk("https://hari7211.github.io/careerpeak-calendar/data/jcy_calendar.json")
    && !cpUrlOk("http://hari7211.github.io/careerpeak-calendar/data/jcy_calendar.json") && !cpUrlOk("https://hari7211.github.io/other/x.json")
    && !cpUrlOk("https://evil.github.io/careerpeak-calendar/x.json") && !cpUrlOk("https://169.254.169.254/careerpeak-calendar/")
    && !cpUrlOk("https://u:p@hari7211.github.io/careerpeak-calendar/x.json") && !cpUrlOk("https://hari7211.github.io:8443/careerpeak-calendar/x.json"));
  process.env.CAREERPEAK_CALENDAR_URL = "https://evil.test/careerpeak-calendar/x.json";
  ok("허용되지 않은 시험 주소는 무시하고 원래 주소", cpUrl().startsWith("https://hari7211.github.io/"));
  delete process.env.CAREERPEAK_CALENDAR_URL;
  const cal = parseCalendar(JSON.stringify(CAL));
  ok("칸을 읽는다(배열 · `·` 글 둘 다)", cal.items.length === 3 && cal.items[1].job_types.join("|") === "기술|행정" && cal.items[1].degrees.join("|") === "학사|석사");
  ok("맨 위가 배열인 파일도 받는다", parseCalendar(JSON.stringify(CAL.items)).items.length === 3);
  ok("학위 표시: 박사 이상 · 학사·석사", cpDegree(cal.items[0]).label === "박사 이상" && cpDegree(cal.items[0]).min === "phd" && cpDegree(cal.items[1]).label === "학사·석사");
  const rows = cpRows(cal.items);
  ok("마감 표시 줄은 빼고, 학위 · 직종 · 고용 형태 · 날짜를 칸으로", rows.length === 2 && rows[0].meta?.jobFamily === "연구" && rows[0].meta?.employmentType === "정규직"
    && rows[0].closesOn === "2099-11-20" && rows[0].postedOn === "2099-11-01" && rows[0].url === "https://kist.example/recruit/1" && rows[0].meta?.category === "정출연", JSON.stringify(rows[0]));
  ok("제목에 기관 이름이 없으면 앞에 붙인다", rows[1].title === "ETRI 2026년 하반기 기술직 채용" && rows[1].meta?.regionLabel === "대전");
  const cpSaved: RawPosting[] = [];
  let verifiedWith: string[] = [];
  const r = await runCareerpeak({
    now: new Date("2026-11-03T00:00:00Z"), get: async () => JSON.stringify(CAL),
    test: { save: async (x) => { cpSaved.push(...x); return { seen: x.length, mapped: 0, unmapped: 0, stored: x.length, skipped: { noTitle: 0, closed: 0 } }; },
      verify: async (items) => { verifiedWith = items.map((i) => i.id); return 1; } },
  });
  ok("한 번 읽어 담고, 잡인더스트리 같은 공고에 확인 값을 덮는다", r.ok && r.ingested === 2 && r.verified === 1 && verifiedWith.length === 3 && !r.stale, JSON.stringify(r));
  const old = await runCareerpeak({ now: new Date("2026-11-05T00:00:00Z"), get: async () => JSON.stringify(CAL),
    test: { save: async (x) => ({ seen: x.length, mapped: 0, unmapped: 0, stored: x.length, skipped: { noTitle: 0, closed: 0 } }), verify: async () => 0 } });
  ok("updated_at 이 하루 넘게 지났으면 기록만 남기고 계속 읽는다", old.ok && old.stale && old.ingested === 2);
  const broken = await runCareerpeak({ get: async () => "<html>403</html>" });
  ok("파일을 못 읽으면 실패로 돌려준다(다른 출처를 막지 않는다)", !broken.ok && broken.error === "fetch");
}

walk().then(() => {
  console.log(`\n통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}).catch((e) => { console.error(e); process.exit(1); });
