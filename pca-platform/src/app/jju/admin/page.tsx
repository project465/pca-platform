import Link from "next/link";
import "../jju.css";
import { ROLE_LABEL } from "@/lib/roles";
import { MIN_CELL } from "@/lib/org";
import { campusV3 } from "@/lib/me-v3/campus";
import { studentCounts } from "@/lib/campus/manage";
import { campusViewer } from "@/lib/campus/viewer";
import { campusNav } from "@/lib/campus/org-mode";
import { BRAND } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { Empty, Kpi } from "@/components/sf/parts";
import {
  cohortsOf, demoServer, JJU_CODE, jjuUniversity, MODE_KO, officialProgram, tracksOf,
} from "@/lib/jju/program";
import { DemoRibbon, ModeChip, OfficialFacts } from "../parts";

export const metadata = { title: `사업단 현황 · ${BRAND.campus}` };

/**
 * 전주대학교 부트캠프 사업단 현황.
 *
 * **새 집계를 만들지 않는다.** 여기 서는 수는 전부 학교 담당자 화면이 이미
 * 세는 함수(`campusV3` · `studentCounts`)에서 오고, 이 쪽은 그것을 기수와
 * 트랙으로 다시 묶을 뿐이다. 기수는 등록부의 Catalog 이고 트랙은 그 안의
 * 자리라서 **DB 에 칸을 더하지 않았다.**
 *
 * **5명 규칙을 그대로 지난다.** 트랙마다의 시작 수는 `by_department` 칸을
 * 쓰고, 그 칸은 다섯이 안 되면 값이 아예 없다.
 *
 * **범위를 이 화면이 정하지 않는다**(설계 원칙 10). 기관과 학교는
 * `campusViewer()` 가 정하고, 그 학교가 전주대가 아니면 아무 수도 세지
 * 않는다.
 */
export default async function JjuAdmin({
  searchParams,
}: { searchParams: Promise<{ demo?: string }> }) {
  const sp = await searchParams;
  const withDemo = sp.demo === "1";
  const view = await campusViewer();
  const { user, org, uni } = view;
  const nav = await campusNav(user.id);
  const shell = (children: React.ReactNode) => (
    <Shell
      surface="campus" lang="ko" nav={nav} active="/jju/admin"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={org ? org.name : BRAND.campus}
    >
      {children}
    </Shell>
  );

  const u = jjuUniversity();
  if (!u || uni !== JJU_CODE) {
    return shell(
      <Section>
        <Empty icon="group" title="전주대학교 사업단 계정이 아닙니다"
          body="이 화면은 전주대학교 기관에 연결된 담당자만 봅니다." />
      </Section>,
    );
  }

  const v3 = await campusV3({ orgIds: view.orgIds, universityCode: JJU_CODE, withDemo });
  const all = await studentCounts({ universityCode: JJU_CODE, withDemo });
  const tracks = tracksOf(u);
  const started = new Map(v3.by_department.map((c) => [c.key, c.n]));
  const perTrack = await Promise.all(tracks.map((t) =>
    studentCounts({ universityCode: JJU_CODE, withDemo, department: t.code })));
  const cohorts = cohortsOf(u);
  const program = officialProgram(u);
  const demoQs = withDemo ? "?demo=1" : "";

  return shell(
    <>
      {demoServer() ? <div className="jju-admin-ribbon"><DemoRibbon /></div> : null}
      <PageHead
        eyebrow={`전주대학교 ${program?.name ?? "AI 부트캠프"}`}
        title="사업단 현황"
        sub={"기수·트랙별 학생과 검사 현황입니다. "
          + `응시 집계는 ${MIN_CELL}명이 안 되는 칸에 숫자를 내지 않습니다.`}
        actions={
          <div className="jju-links">
            <Link className="sf-btn" href={`/org/v3/students${demoQs}`}>학생 명단·계정 발급</Link>
            <Link className="sf-btn" href={`/org/v3${demoQs}`}>상세 집계</Link>
          </div>
        }
      />
      {withDemo ? (
        <p className="sf-meta">시연·검사 계정을 섞어 보고 있습니다. 실제 운영 수가 아닙니다.</p>
      ) : null}

      <div className="sf-grid sf-g4">
        <Kpi label="발급한 학생" value={all.all} unit="명" icon="users" />
        <Kpi label="응시 시작" value={v3.started} unit="명" />
        <Kpi label="결과 받음" value={v3.scored} unit="명"
          note={v3.completion === null ? "아직 시작한 학생이 없습니다" : undefined} />
        <Kpi label="완료율" value={v3.completion === null ? "—" : `${Math.round(v3.completion)}`}
          unit={v3.completion === null ? undefined : "%"} accent
          note="바닥은 명단과 학교 진입을 합친 대상자입니다" />
      </div>

      <Section title="기수 × 트랙 현황 (시연용 분류)"
        note="기수·트랙은 사업단 공식 트랙이 아닌 시연용 분류입니다. 발급·진행·완료는 명단 화면과 같은 수이고, 시작은 응시 집계 칸입니다">
        <div className="jju-scroll">
          <table className="jju-matrix">
            <thead>
              <tr>
                <th>기수</th><th>트랙</th><th>재는 검사</th><th>열림</th>
                <th>발급</th><th>미응시</th><th>진행 중</th><th>완료</th><th>응시 시작</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((t, i) => {
                const c = perTrack[i];
                const s = started.get(t.code);
                return (
                  <tr key={t.code}>
                    <td>{t.cohort.label}</td>
                    <td>{t.short}</td>
                    <td>{t.core_name ?? "—"}{t.spec_name ? ` · ${t.spec_name}` : ""}</td>
                    <td><ModeChip mode={t.mode} /></td>
                    <td className="is-num">{c.all}</td>
                    <td className="is-num">{c.none}</td>
                    <td className="is-num">{c.in_progress}</td>
                    <td className="is-num">{c.scored}</td>
                    <td className="is-num">
                      {/* 칸이 없는 것은 0 이 아니다: 집계가 다섯이 안 되는 칸을 아예 만들지
                          않으므로, 이 트랙에 진행·완료가 있는데 0 을 적으면 바로 옆 칸과
                          서로 어긋난 말을 한다(R5 실제 화면에서 `완료 4 · 응시 시작 0`) */}
                      {typeof s === "number" ? s
                        : <span className="jju-hidden">{s === null || c.in_progress + c.scored > 0 ? `${MIN_CELL}명 미만` : "0"}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {program ? (
        <Section title="사업 개요 · 공식 교육과정"
          note="출처가 붙은 사실만 적습니다. 사업비는 사업단 전체 금액이며 CareerMatri 계약 예산이 아닙니다">
          <OfficialFacts p={program} />
        </Section>
      ) : null}

      <Section title="시연용 기수 분류">
        <ul className="jju-flow">
          {cohorts.map((c) => (
            <li key={c.catalog_code}>
              <strong>{c.label}</strong>
              <span>{c.effective_from} 시작 가정</span>
              <span>{c.verification === "VERIFIED"
                ? "공식 교육과정과 맞춰 봤습니다."
                : c.verification_note ?? "시연용 분류입니다."}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="기능 상태: 실제 동작과 시연 구분">
        <ul className="jju-flow">
          <li><strong>검사 응시·저장·이어하기</strong><span className="jju-ok">실제 동작</span>
            <span>공통 검사 엔진 그대로입니다. 문항과 채점을 바꾸지 않았습니다.</span></li>
          <li><strong>결과 화면</strong><span className="jju-ok">실제 동작</span>
            <span>제출 때 굳힌 결과를 그대로 읽습니다.</span></li>
          <li><strong>개인 PDF</strong><span className="jju-ok">실제 동작</span>
            <span>웹 결과를 그 자리에서 PDF 로 뽑습니다. 미리 만들어 두지 않습니다.</span></li>
          <li><strong>경험·프로젝트 기록</strong><span className="jju-ok">실제 동작</span>
            <span>적은 경험이 현재 상태에 더해지고, 검사 당시 결과는 바뀌지 않습니다.</span></li>
          <li><strong>{MODE_KO.DEMO} 트랙의 결과</strong><span className="jju-demo">시연</span>
            <span>전공자 검수 전 검사입니다. 결과를 학생 진단이나 사업 성과로 쓰지 않습니다.</span></li>
          <li><strong>트랙·기수 구성</strong><span className="jju-demo">시연</span>
            <span>공식 과정을 검사에 잇기 위한 시연용 분류입니다. 사업단 공식 트랙과 같다고 적지 않습니다.</span></li>
          <li><strong>사업 선정·기간·운영 방식</strong><span className="jju-ok">공식 출처</span>
            <span>공식 페이지 두 곳을 출처로 적었습니다. 원문 직접 대조는 남아 있습니다.</span></li>
          <li><strong>개인 결과·PDF 담당자 열람</strong><span className="jju-no">막혀 있음</span>
            <span>계약 조항과 본인 동의가 모두 있을 때만 열리는 공통 규칙입니다. 지금은 열리지 않습니다.</span></li>
          <li><strong>교육 전후 역량 변화</strong><span className="jju-no">표시하지 않음</span>
            <span>비교할 수 있는 평가 체계가 검증되기 전이라 교육 효과로 보여 주지 않습니다.</span></li>
          <li><strong>전북권 기업·기관 연계</strong><span className="jju-no">자료 없음</span>
            <span>출처와 사용 권리를 확인한 자료가 아직 없습니다.</span></li>
        </ul>
      </Section>
    </>,
  );
}
