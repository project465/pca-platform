import Link from "next/link";
import { ROLE_LABEL } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { orgsOf, MIN_CELL } from "@/lib/org";
import { campusV3, type Cell } from "@/lib/me-v3/campus";
import { core as coreEntry } from "@/lib/me-v3/core-registry";
import { departmentsOf, university } from "@/lib/campus/registry";
import { BRAND, toLang2 } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_CAMPUS } from "@/components/sf/nav";
import { BarList, Empty, Kpi } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `전공 진단 집계 · ${BRAND.campus}` };

/** 안쪽 코드를 담당자 화면에 적지 않는다 */
function niceCore(code: string): string {
  try { return coreEntry(code).name_ko; } catch { return code; }
}
/**
 * 단과대학과 학과 코드를 담당자가 읽는 이름으로.
 *
 * **등록부 하나에서 읽는다**(`campus-universities.json`). 화면에 학과
 * 이름을 적어 두면 학교가 이름을 바꾸는 날 고칠 자리가 둘이 된다.
 */
function campusNames(universityCode: string | null): {
  college: (k: string) => string; dept: (k: string) => string;
} {
  const u = universityCode ? university(universityCode) : null;
  if (!u) return { college: (k) => k, dept: (k) => k };
  const rows = departmentsOf(u);
  const col = new Map(u.colleges.map((c) => [c.code, c.name]));
  const dep = new Map(rows.map((r) => [r.dept.code, r.dept.name]));
  return {
    college: (k) => col.get(k) ?? k,
    dept: (k) => dep.get(k) ?? k,
  };
}

const PACK_KO = (code: string): string => code
  .replace(/^INDUSTRY_/, "").replace(/^ROLE_/, "").replace(/_V\d+$/, "");

function bars(rows: Cell[], name: (k: string) => string) {
  return rows.map((r) => ({
    label: name(r.key), value: r.n ?? 0, hidden: r.n === null,
  }));
}

/**
 * 학과 담당자가 보는 **지금 파는 검사의 집계.**
 *
 * 전까지 Campus 는 옛 검사 표만 읽어서, V3 를 친 학생이 담당자 화면에
 * 한 명도 잡히지 않았다. 종합대학 담당자에게 보여주는 자리가 거기다.
 *
 * **새 지표를 만들지 않는다**(규격 STEP 4). 여기 서는 것은 전부 세는
 * 값이고, 대학 KPI 도 종합점수도 없다. 그런 수를 하나 만들면 학과끼리
 * 그 수로 견주게 되고, 견줄 자가 없는 값이 생긴다.
 *
 * **5명 규칙을 그대로 지킨다.** 다섯이 안 되는 칸은 가리는 것이 아니라
 * **값을 만들지 않는다**: 화면이 알아서 가려 주기를 바라면 내보내기나
 * 캡처에서 새어 나간다.
 */
export default async function CampusV3({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["org_admin", "instructor"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));

  const orgs = await orgsOf(user.id);
  const org = orgs[0];
  /**
   * **이 기관이 학교 등록부의 어느 학교인가.**
   *
   * `organizations.code` 가 `PCU` 면 그 학교로 들어온 응시가 이 집계에
   * 함께 선다. 소속으로만 묶으면 `/campus/{학교}` 로 혼자 들어온 학생이
   * 담당자 화면에 한 명도 잡히지 않고, 담당자는 그것을 `아직 아무도 안
   * 쳤다` 로 읽는다.
   */
  const uni = orgs.map((o) => o.code).find((c) => Boolean(university(c))) ?? null;
  const name = campusNames(uni);
  const v3 = await campusV3({
    orgIds: orgs.map((o) => Number(o.id)), universityCode: uni,
  });

  const shell = (children: React.ReactNode) => (
    <Shell
      surface="campus" lang={L} nav={NAV_CAMPUS} active="/org/v3"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={org ? org.name : BRAND.campus}
      topRight={<LangSelect current={L} />}
    >
      {children}
    </Shell>
  );

  if (!org) {
    return shell(
      <>
        <PageHead eyebrow={BRAND.campus} title="전공 진단 집계"
          sub="기관이 연결되면 이 자리에 학생 집계가 섭니다." />
        <Section>
          <Empty icon="group" title="연결된 기관이 없습니다"
            body="계약이 열리면 학생이 친 검사가 여기에 모입니다." />
        </Section>
      </>,
    );
  }

  return shell(
    <>
      <PageHead
        eyebrow={BRAND.campus}
        title="전공 진단 집계"
        sub={"지금 쓰는 검사를 친 학생의 집계입니다. "
          + `사람이 ${MIN_CELL}명이 안 되는 칸은 숫자를 내지 않습니다.`}
      />

      <Section>
        <div className="sf-kpis">
          <Kpi label="검사를 시작한 학생" value={v3.started} unit="명" />
          <Kpi label="결과를 받은 학생" value={v3.scored} unit="명" />
          <Kpi label="지금 푸는 중" value={v3.in_progress} unit="명" />
          <Kpi label="경험을 더해 갱신한 학생" value={v3.recomputed} unit="명"
            note="검사 뒤에 다시 들어온 수" />
        </div>
      </Section>

      {v3.too_few ? (
        <Section title="아직 집계를 내지 않습니다">
          {/* **다섯이 안 되면 값을 만들지 않는다.** 네 줄짜리 표에서는
              전공과 학위를 겹치면 누구인지 짐작이 된다 */}
          <Empty
            icon="lock"
            title={`검사를 친 학생이 ${MIN_CELL}명이 안 됩니다`}
            body={"전공과 학위와 산업을 겹치면 네 명 안에서 사람이 "
              + "좁혀집니다. 그래서 숫자를 아예 만들지 않습니다."}
          />
        </Section>
      ) : (
        <>
          <Section title="전공"
            note="학생이 어느 Major Core 로 응시했는가">
            <BarList rows={bars(v3.by_core, niceCore)}
              hiddenLabel={`${MIN_CELL}명 미만`} emptyLabel="아직 없습니다" />
          </Section>

          {/* **학교 전용 진입으로 들어온 응시만 선다**(규격 §13). 소속으로만
              묶인 학생은 학과 칸이 비어 있어 이 두 묶음에 서지 않는다 */}
          {v3.by_college.length ? (
            <Section title="단과대학"
              note="학교 전용 진입으로 들어온 응시입니다">
              <BarList rows={bars(v3.by_college, name.college)}
                hiddenLabel={`${MIN_CELL}명 미만`} emptyLabel="아직 없습니다" />
            </Section>
          ) : null}

          {v3.by_department.length ? (
            <Section title="학과"
              note="학과별 응시와 완료입니다. 학생끼리 줄을 세우지 않습니다">
              <BarList rows={bars(v3.by_department, name.dept)}
                hiddenLabel={`${MIN_CELL}명 미만`} emptyLabel="아직 없습니다" />
            </Section>
          ) : null}

          <Section title="학위 단계"
            note="묻는 장면이 단계마다 갈립니다">
            <BarList rows={bars(v3.by_stage, (k) => k)}
              hiddenLabel={`${MIN_CELL}명 미만`} emptyLabel="아직 없습니다" />
          </Section>

          <Section title="고른 산업"
            note="응시 중에 깊게 보기로 고른 산업입니다. 적합도가 아닙니다">
            <BarList rows={bars(v3.by_industry, PACK_KO)}
              hiddenLabel={`${MIN_CELL}명 미만`} emptyLabel="아직 없습니다" />
          </Section>

          <Section title="고른 직무"
            note="응시 중에 깊게 보기로 고른 직무입니다. 추천이 아닙니다">
            <BarList rows={bars(v3.by_role, PACK_KO)}
              hiddenLabel={`${MIN_CELL}명 미만`} emptyLabel="아직 없습니다" />
          </Section>

          <Section
            title="기술영역이 지금 어디에 있는가"
            note={"사람 수가 아니라 (학생 × 기술영역) 칸 수입니다. "
              + "학생 한 명이 영역 열둘을 들고 있습니다"}
          >
            <BarList rows={bars(v3.zone_cells, (k) => k)}
              hiddenLabel={`${MIN_CELL}명 미만`} emptyLabel="아직 없습니다" />
          </Section>
        </>
      )}

      <Section title="이 수로 하지 않는 것">
        {/* **없는 기능을 있다고 적지 않는다.** 담당자가 가장 먼저 묻는
            것이 `그래서 누가 잘하나요` 이고, 그 물음에 이 제품은 답하지
            않는다. 답하지 않는다는 것을 먼저 적는다 */}
        <ul className="sf-list">
          <li>학생끼리 줄을 세우지 않습니다. 등수도 백분위도 내지 않습니다.</li>
          <li>종합 점수나 대학 KPI 를 만들지 않습니다.</li>
          <li>합격 가능성이나 취업 확률을 내지 않습니다.</li>
          <li>개인 결과지는 본인 동의와 계약에 적힌 범위 안에서만 열립니다.</li>
        </ul>
        <p className="sf-meta" style={{ marginTop: 10 }}>
          <Link href="/org/insights">직무 집계 보기</Link>
        </p>
      </Section>
    </>,
  );
}
