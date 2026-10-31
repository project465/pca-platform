/**
 * 잡인더스트리 게시판 읽기를 네트워크 없이 센다.
 *
 *   npx tsx scripts/jobindustry-feed-check.ts
 *
 * 흉내 낸 HTML 은 2026-10-31 에 대표님 브라우저로 확인한 원본 꼴을 따른다:
 * 목록 링크 `/487/?q=…&bmode=view&idx=…&t=…`, 다음 쪽 `/487/?q=…&page=N`,
 * 상세의 `og:title`(`제목 : 게시판`) · `.view_tit` · `.board_txt_area`.
 * 실제 화면에서 처음 돌린 날 운영 로그(`jobs.jobindustry`)로 한 번 더 맞춘다.
 */
import { closesOf, hasPage, innerOf, listRefs, parseView, textOf } from "../src/lib/jobs/jobindustry-parse";

let pass = 0, fail = 0;
function ok(name: string, cond: boolean) {
  if (cond) { pass += 1; console.log(`  통과  ${name}`); } else { fail += 1; console.log(`  걸림  ${name}`); }
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

console.log(`\n통과 ${pass} · 걸림 ${fail}`);
process.exit(fail ? 1 : 0);
