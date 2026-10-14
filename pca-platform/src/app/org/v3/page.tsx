import Link from "next/link";
import { ROLE_LABEL } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { orgsOf, MIN_CELL } from "@/lib/org";
import { campusV3, type Cell } from "@/lib/me-v3/campus";
import { core as coreEntry, registry } from "@/lib/me-v3/core-registry";
import { industryChoices, roleChoices } from "@/lib/me-v3/runtime/session";
import { allLeaves, facultyOf, retiredCodeOf, university } from "@/lib/campus/registry";
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
  /* **Catalog 를 가로질러 읽는다.** 응시 줄에 적힌 코드가 어느 해 구조의
     자리인지는 코드 앞머리가 들고 있고, 담당자가 보는 것은 이름이다 */
  const col = new Map(u.catalogs.flatMap((c) =>
    c.colleges.map((x) => [x.code, x.name] as [string, string])));
  /* **학부가 있으면 함께 적는다**(규격 §12). 같은 이름의 전공이 다른
     학부에 설 수 있고, 집계에서 그 둘이 한 줄로 보이면 안 된다. 굴림은
     등록부가 하고 DB 에 칸을 더하지 않는다 */
  const dep = new Map(allLeaves(u).map((r) => {
    const f = facultyOf(u, r.leaf.code);
    return [r.leaf.code, f ? `${f.name} · ${r.leaf.name}` : r.leaf.name];
  }));
  /* **내려놓은 코드를 학과 이름으로 읽지 않는다.** 등록부에서 내려온
     코드가 담당자 화면에 날것으로 찍히면 읽는 사람이 등록부가 깨진 줄로
     본다. 그 코드가 무엇이었는지를 적는다 */
  return {
    college: (k: string) => col.get(k) ?? k,
    dept: (k: string) => {
      const live = dep.get(k);
      if (live) return live;
      const gone = retiredCodeOf(u, k);
      return gone ? `${gone.was} (지난 등록부 자리)` : k;
    },
  };
}

/**
 * 산업·직무 팩 코드를 담당자가 읽는 이름으로.
 *
 * 전에는 앞뒤를 떼어 `CENTRAL` · `FOUNDRY` · `COMPTEAM` 을 그대로 세웠다.
 * 그것은 **그 팩 파일의 안쪽 코드**이고, 담당자 화면에 그 글자가 서면
 * 읽는 사람은 집계가 깨진 줄로 본다(규격 §16).
 *
 * **이름은 전부 팩 파일이 들고 있다.** 집계는 전공을 가로질러 세므로 Core
 * 를 하나 고를 수 없고, 그래서 열려 있는 전공 전부에서 모아 한 표로
 * 만든다. 같은 코드가 두 전공에서 다른 이름이면 둘 다 적는다: 한쪽을
 * 골라 적으면 다른 전공 담당자가 남의 산업 이름을 읽는다.
 */
function packNames(): (code: string) => string {
  const map = new Map<string, Set<string>>();
  const add = (code: string, name: string) => {
    const got = map.get(code) ?? new Set<string>();
    got.add(name); map.set(code, got);
  };
  for (const c of registry().cores) {
    try { for (const x of industryChoices(c.code)) add(x.code, x.name); } catch { /* 자료가 아직 없는 전공 */ }
    try { for (const x of roleChoices(c.code)) add(x.code, x.name); } catch { /* 같은 까닭 */ }
  }
  return (code: string) => {
    if (code === "(고르지 않음)") return "고르지 않음";
    const got = map.get(code);
    return got ? [...got].join(" / ") : code;
  };
}

/**
 * 최근 2주 추이. **막대 하나가 하루다.**
 *
 * 새 지표를 만들지 않는다: 세는 것은 그날 시작한 사람과 그날 결과를 받은
 * 사람뿐이고, 둘 다 다섯 명이 안 되는 날은 **값을 만들지 않는다.**
 */
function Trend({ rows }: {
  rows: { day: string; started: number | null; scored: number | null }[];
}) {
  /** 그리는 자리의 높이. **백분율로 그리지 않는다**: flex 안에서 퍼센트
      높이가 풀리지 않아 스물일곱이 2px 로 섰다(한 번 그렇게 찍혔다) */
  const PLOT = 112;
  const top = Math.max(1, ...rows.map((r) => Math.max(r.started ?? 0, r.scored ?? 0)));
  const px = (n: number | null) => Math.max(2, Math.round(((n ?? 0) / top) * PLOT));
  return (
    <div className="cv-trend" style={{ ["--cv-plot" as string]: `${PLOT}px` }}>
      {rows.map((r) => (
        <div className="cv-day" key={r.day}>
          <div className="cv-cols">
            <i style={{ height: px(r.started) }}
              title={`시작 ${r.started ?? "5명 미만"}`} />
            <b style={{ height: px(r.scored) }}
              title={`완료 ${r.scored ?? "5명 미만"}`} />
          </div>
          <span>{r.day}</span>
        </div>
      ))}
    </div>
  );
}

function bars(rows: Cell[], name?: (k: string) => string) {
  return rows.map((r) => ({
    label: name ? name(r.key) : r.label, value: r.n ?? 0, hidden: r.n === null,
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

  const packKo = packNames();

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

      {/* **KPI 는 넷이다**(규격 §16): 대상자 · 시작 · 완료 · 완료율.
          캡처해서 내부 보고자료로 쓰는 자리라 이 넷이 한 줄에 서야 한다.
          **새 지표를 만들지 않는다**: 완료율도 세어 둔 둘을 나눈 것이고,
          나눌 바닥이 0 이면 비율을 만들지 않는다 */}
      <Section>
        {/* **쓰는 이름이 CSS 에 있는지 본다.** `sf-kpis` 는 이 저장소의 어느
            CSS 에도 규칙이 없어서 KPI 넷이 세로로 한 줄씩 섰다. 쪽은 200
            으로 멀쩡히 뜨고 생김새만 없는 그 모양이 여기서 아홉 번째다
            (`.btn` · `--sf-r` · `.lg` · `empty` · `industries` · `OC*` ·
            `qs-steps` · `.cm-snap`). 다른 화면이 쓰는 이름으로 맞춘다 */}
        <div className="sf-grid sf-g4">
          <Kpi label="대상자" value={v3.roster} unit="명"
            note="학교가 계정을 발급한 학생" />
          <Kpi label="검사를 시작한 학생" value={v3.started} unit="명" />
          <Kpi label="결과를 받은 학생" value={v3.scored} unit="명" />
          <Kpi label="완료율"
            value={v3.completion === null ? "—" : `${v3.completion}%`}
            note={v3.roster ? "대상자 기준" : "시작한 학생 기준"} />
        </div>
        <p className="sf-meta" style={{ marginTop: 10 }}>
          지금 푸는 중 {v3.in_progress}명 · 경험을 더해 갱신한 학생
          {" "}{v3.recomputed}명
        </p>
      </Section>

      {v3.recent.length ? (
        <Section title="최근 응시 추이"
          note="최근 2주입니다. 옅은 막대가 시작, 짙은 막대가 완료입니다">
          <Trend rows={v3.recent} />
        </Section>
      ) : null}

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
            <BarList rows={bars(v3.by_stage)}
              hiddenLabel={`${MIN_CELL}명 미만`} emptyLabel="아직 없습니다" />
          </Section>

          <Section title="고른 산업"
            note="응시 중에 깊게 보기로 고른 산업입니다. 적합도가 아닙니다">
            <BarList rows={bars(v3.by_industry, packKo)}
              hiddenLabel={`${MIN_CELL}명 미만`} emptyLabel="아직 없습니다" />
          </Section>

          <Section title="고른 직무"
            note="응시 중에 깊게 보기로 고른 직무입니다. 추천이 아닙니다">
            <BarList rows={bars(v3.by_role, packKo)}
              hiddenLabel={`${MIN_CELL}명 미만`} emptyLabel="아직 없습니다" />
          </Section>

          <Section
            title="기술영역이 지금 어디에 있는가"
            note={"사람 수가 아니라 (학생 × 기술영역) 칸 수입니다. "
              + "학생 한 명이 영역 열둘을 들고 있습니다"}
          >
            {/* 묶음 이름은 집계 쪽이 이미 사람의 말로 적어 준다
                (`campus.ts` 의 `zoneKo`). 여기서 코드를 다시 적지 않는다 */}
            <BarList rows={bars(v3.zone_cells)}
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
