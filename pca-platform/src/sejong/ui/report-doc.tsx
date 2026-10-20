import { STATE_LABEL } from "@/sejong/lib/analysis";
import { LOCATION_LABEL, ORG_TYPE_LABEL, VERIFY_LABEL, sejongContent } from "@/sejong/lib/content";
import type { ReportProps } from "@/sejong/lib/report";
import { reportHtml } from "@/sejong/lib/report-html";

/**
 * 개인별 취업 전략 결과지. 본문은 `reportHtml` 한 함수가 만든다: 웹 미리보기 · PDF ·
 * 상담사 열람 · 화면 미리보기 링크가 같은 글자를 낸다. PDF 는 이 쪽을 Chromium 으로
 * 인쇄한 것이다. 읽는 값은 제출 때 굳힌 결과(`sj_attempts.result`)와 그때의 응답이다.
 *
 * 편집 짜임: 장 구분 쪽 · 표 번호 · 출처 각주(사용자 제공 라이브러리 보고서), 색과 표지
 * 판(세종 지역 보고서들). 그 문서들의 내용·로고·구호는 쓰지 않는다.
 * 종이 여백 14mm 는 공통 엔진(`drawPagePdf`)이 정한다. 표지 끝까지 채우기는 CR-7.
 */
export function ReportDoc(p: ReportProps) {
  const c = sejongContent();
  const html = reportHtml({
    r: p.r, responses: p.responses, name: p.name, participantNo: p.participantNo,
    programName: p.programName, scoredAt: p.scoredAt, experiences: p.experiences, auxAllowed: p.auxAllowed,
    instrument: c.instrument, levels: c.levels, orgs: c.orgs, links: c.links, region: c.region,
    checkedOn: c.orgsMeta.checked_on,
    labels: { state: STATE_LABEL, verify: VERIFY_LABEL, location: LOCATION_LABEL, orgType: ORG_TYPE_LABEL },
  });
  return <article className="sj-paper sj-rp" id="sj-report" dangerouslySetInnerHTML={{ __html: html }} />;
}
