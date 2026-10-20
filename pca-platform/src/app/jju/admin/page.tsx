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
  cohortsOf, demoServer, FACT_STATUS_KO, JJU_CODE, jjuUniversity, MODE_KO, officialProgram, tracksOf,
} from "@/lib/jju/program";
import { DemoRibbon, OfficialFacts } from "../parts";

export const metadata = { title: `사업단 현황 · ${BRAND.campus}` };

/**
 * 전주대학교 인공지능학과 × AI 부트캠프 사업단 현황.
 *
 * **새 집계를 만들지 않는다.** 여기 서는 수는 전부 학교 담당자 화면이 이미
 * 세는 함수(`campusV3` · `studentCounts`)에서 오고, 이 쪽은 그것을 학과와
 * 과정으로 다시 묶을 뿐이다. 학과와 과정은 등록부의 자리라서 **DB 에 칸을
 * 더하지 않았다.**
 *
 * **5명 규칙을 그대로 지난다.** 자리마다의 시작 수는 `by_department` 칸을
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
        <Empty icon="group" title="전주대학교 사업단 계정이 아니에요"
          body="이 화면은 전주대학교 담당자 계정으로만 볼 수 있어요." />
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
    <div className="jju-adm">
      {demoServer() ? <div className="jju-admin-ribbon"><DemoRibbon /></div> : null}
      <PageHead
        title="과정별 현황"
        sub="인공지능학과와 부트캠프 과정에서 몇 명이 검사했는지 볼 수 있어요."
        actions={
          <div className="jju-links">
            <Link className="sf-btn" href={`/org/v3/students${demoQs}`}>학생 명단·계정 발급</Link>
            <Link className="sf-btn" href={`/org/v3${demoQs}`}>상세 집계</Link>
          </div>
        }
      />
      {withDemo ? (
        <p className="sf-meta">시연·검사 계정까지 함께 보고 있어요. 실제 운영 숫자가 아니에요.</p>
      ) : null}

      <div className="sf-grid sf-g4">
        <Kpi label="계정 받은 학생" value={all.all} unit="명" icon="users" />
        <Kpi label="검사 시작" value={v3.started} unit="명" />
        <Kpi label="결과 받음" value={v3.scored} unit="명"
          note={v3.completion === null ? "아직 시작한 학생이 없어요" : undefined} />
        <Kpi label="완료율" value={v3.completion === null ? "—" : `${Math.round(v3.completion)}`}
          unit={v3.completion === null ? undefined : "%"} accent />
      </div>

      <Section title="학과·과정별">
        <div className="jju-scroll">
          <table className="jju-matrix">
            <thead>
              <tr>
                <th>학과·과정</th>
                <th className="is-num">계정</th><th className="is-num">아직 안 함</th>
                <th className="is-num">하는 중</th><th className="is-num">완료</th><th className="is-num">검사 시작</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((t, i) => {
                const c = perTrack[i];
                const s = started.get(t.code);
                return (
                  <tr key={t.code}>
                    <td>
                      <strong>{t.short}</strong>
                      <small>{t.kind === "DEPARTMENT" ? t.field.name : "부트캠프 과정"}
                        {t.mode === "PREPARING" ? " · 준비 중" : ""}</small>
                    </td>
                    <td className="is-num">{c.all}</td>
                    <td className="is-num">{c.none}</td>
                    <td className="is-num">{c.in_progress}</td>
                    <td className="is-num">{c.scored}</td>
                    <td className="is-num">
                      {/* 칸이 없는 것은 0 이 아니다: 집계가 다섯이 안 되는 칸을 아예 만들지
                          않으므로, 진행·완료가 있는데 0 을 적으면 바로 옆 칸과 어긋난다 */}
                      {typeof s === "number" ? s
                        : <span className="jju-hidden">{s === null || c.in_progress + c.scored > 0 ? `${MIN_CELL}명 미만` : "0"}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="jju-note">
          {MIN_CELL}명이 안 되는 칸은 숫자를 가려요. 한 학생은 학과나 과정 가운데 한 곳으로만 세요.
          학생 한 명 한 명의 답과 결과는 이 화면에서 볼 수 없어요.
        </p>
      </Section>

      {program ? (
        <Section title="부트캠프 소개">
          <OfficialFacts p={program} />
        </Section>
      ) : null}

      <details className="jju-more">
        <summary>자료 출처와 확인 상태</summary>
        <ul className="jju-kv">
          {cohorts.map((c) => (
            <li key={c.catalog_code}>
              <span>{c.label}</span>
              <span>{c.verification === "VERIFIED" ? "학교 원문과 대조했어요" : "학교 원문과 대조하기 전이에요"}</span>
            </li>
          ))}
          {program?.facts.map((f) => (
            <li key={f.id}>
              <span>{f.say ?? f.text}</span>
              <span>{FACT_STATUS_KO[f.status]}</span>
            </li>
          ))}
        </ul>
        <p className="jju-note">
          사업 내용은 사업단에서 전해 준 학교 뉴스·공지를 옮겼어요. 원문을 직접 대조하면 표시를 바꿔요.
        </p>
      </details>

      <details className="jju-more">
        <summary>지금 되는 것과 아직 안 되는 것</summary>
        <ul className="jju-kv">
          <li><span>검사 응시, 저장, 이어하기</span><span className="is-ok">돼요</span></li>
          <li><span>결과 화면과 개인 PDF</span><span className="is-ok">돼요</span></li>
          <li><span>경험·프로젝트 기록</span><span className="is-ok">돼요</span></li>
          <li><span>{MODE_KO.DEMO} 검사의 결과</span><span>전공자 검토 전이라 학생 진단이나 사업 성과로 쓰지 않아요</span></li>
          <li><span>학과와 과정을 한 학생에게 함께 기록</span><span>아직 한 곳만 기록해요</span></li>
          <li><span>담당자의 개인 결과 열람</span><span>계약과 본인 동의가 있어야 열려요</span></li>
          <li><span>교육 전후 역량 변화</span><span>비교할 평가 기준이 검증되기 전이라 보여 주지 않아요</span></li>
          <li><span>전북 지역 기업·기관 연계</span><span>쓸 수 있는 자료를 아직 받지 못했어요</span></li>
        </ul>
      </details>
    </div>,
  );
}
