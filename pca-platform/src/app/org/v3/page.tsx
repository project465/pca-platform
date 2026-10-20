import Link from "next/link";
import { ROLE_LABEL } from "@/lib/roles";
import { resolveLang } from "@/lib/locale-server";
import { MIN_CELL } from "@/lib/org";
import { campusV3, type Cell } from "@/lib/me-v3/campus";
import { core as coreEntry, registry } from "@/lib/me-v3/core-registry";
import { industryChoices, roleChoices } from "@/lib/me-v3/runtime/session";
import { campusNames, collegeChoices, leafChoices } from "@/lib/campus/labels";
import {
  campusQuery, campusQueryKo, campusQueryString, campusViewer,
} from "@/lib/campus/viewer";
import { studentCounts } from "@/lib/campus/manage";
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
}: {
  searchParams: Promise<{
    lang?: string; demo?: string; e?: string;
    from?: string; to?: string; college?: string; department?: string;
  }>;
}) {
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  /* **시연 자료는 기본으로 거른다**(§23). 운영 지표에서 검사 계정을 빼는
     규칙은 이 저장소가 전부터 들고 있었고 학교 집계만 그 줄을 빠뜨리고
     있었다. 섞어 볼 때는 화면이 그 사실을 적는다 */
  const withDemo = sp.demo === "1";

  const packKo = packNames();

  /**
   * **범위를 이 화면에서 정하지 않는다**(설계 원칙 10).
   *
   * 집계와 명단과 내려받는 자료와 운영 요약이 같은 함수에 묻는다. 각자
   * 정하면 어느 날 한 자리가 기관을 빠뜨리고 **A 대학 담당자가 B 대학
   * 학생의 줄을 받는다.**
   */
  const view = await campusViewer();
  const { user, orgs, org, uni } = view;
  const name = campusNames(uni);
  /* **좁히는 값은 집계 함수에 넘긴다**(규격 §16). 화면이 받아서 따로
     거르면 **5명 미만 규칙이 그 뒤에 적용되어** 가려야 할 칸이 드러난다 */
  const q = campusQuery(sp);
  const qs = campusQueryString(q, withDemo ? { demo: "1" } : {});
  const scopeKo = campusQueryKo(q, name);
  const narrowed = Boolean(q.from || q.to || q.college || q.department);
  const v3 = await campusV3({
    orgIds: view.orgIds, universityCode: uni, withDemo,
    from: q.from, to: q.to, college: q.college, department: q.department,
  });
  /**
   * 미응시 · 진행중 · 완료(규격 §17).
   *
   * **새 지표를 만들지 않는다.** 명단 화면이 상태 tab 마다 세는 것과 같은
   * 함수이고, 그래서 이 수를 눌러 넘어간 목록의 수가 늘 같다. 두 자리에서
   * 따로 세면 담당자가 어느 쪽을 믿어야 할지 모른다.
   */
  /* **명단 화면은 기간으로 좁히지 않는다.** `campus_students` 는 발급
     명단이고 날짜 칸이 없다. 기간을 들고 넘기면 주소에 쓰이지 않는 값이
     남아, 담당자가 그 주소를 북마크했을 때 좁혀진 줄로 읽는다 */
  const place = campusQueryString({ ...q, from: null, to: null },
    withDemo ? { demo: "1" } : {});
  const toStudents = (state: string) =>
    `/org/v3/students${place}${place ? "&" : "?"}state=${state}`;
  const toCsv = (state: string) =>
    `/org/v3/export/students.csv${place}${place ? "&" : "?"}state=${state}`;
  const counts = uni
    ? await studentCounts({
      universityCode: uni, withDemo,
      college: q.college ?? undefined, department: q.department ?? undefined,
    })
    : null;

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
      {/* **첫 화면은 인사로 연다**(화면 시안 2026-10-20). 이 쪽이 무엇인지는
          제목 위 한 줄(`전공 진단 집계`)이 든다 */}
      <PageHead
        eyebrow={`${BRAND.campus} · 전공 진단 집계`}
        title={`${user.name} ${user.role === "instructor" ? "교수님" : "담당자님"}, 안녕하세요`}
        sub={"지금 쓰는 검사를 친 학생의 집계입니다. "
          + `사람이 ${MIN_CELL}명이 안 되는 칸은 숫자를 내지 않습니다.`}
      />

      {/* 내려받기가 거절된 자리(규격 §21). **통보로 끝내지 않고 누구에게
          말하면 되는지 적는다**: 담당자가 고칠 수 있는 값이 아니다 */}
      {sp.e === "scope" ? (
        <Section>
          <p className="sf-note is-bad" role="alert">
            이 계정에 연결된 기관이 학교 등록부의 학교로 잡히지 않아 자료를
            내려받지 못했습니다. 집계는 그대로 보실 수 있습니다. 계속 안 되면
            고객지원으로 알려 주세요.
          </p>
        </Section>
      ) : null}

      {/* ── 좁혀 보기(규격 §16) ──
          **GET 폼이다.** 주소에 조건이 적히므로 담당자가 그 주소를 그대로
          북마크하고 같은 표를 다시 연다. 내려받기 링크도 같은 조건을 들고
          가서, **화면의 수와 CSV 의 수가 갈리지 않는다.**

          **고치는 폼이 아니다.** 여기서 바뀌는 것은 보는 범위뿐이고 학생
          계정과 응시와 결과에 손대지 않는다 */}
      <Section title="좁혀 보기"
        note="기간과 단과대학과 학과로 좁힙니다. 비우면 전체입니다">
        <form className="sf-filters" method="get" action="/org/v3">
          {withDemo ? <input type="hidden" name="demo" value="1" /> : null}
          <label className="sf-field">
            <span>시작일</span>
            <input type="date" name="from" defaultValue={q.from ?? ""} />
          </label>
          <label className="sf-field">
            <span>종료일</span>
            <input type="date" name="to" defaultValue={q.to ?? ""} />
          </label>
          <label className="sf-field">
            <span>단과대학</span>
            <select name="college" defaultValue={q.college ?? ""}>
              <option value="">전체</option>
              {collegeChoices(uni).map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="sf-field">
            <span>학과</span>
            <select name="department" defaultValue={q.department ?? ""}>
              <option value="">전체</option>
              {leafChoices(uni).map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>
          <div className="sf-field">
            <span>&nbsp;</span>
            <button className="sf-btn" type="submit">좁혀 보기</button>
          </div>
        </form>
        {narrowed ? (
          <p className="sf-meta" style={{ marginTop: 8 }}>
            지금 보는 범위 — {scopeKo} · <Link href="/org/v3">전체로 돌아가기</Link>
          </p>
        ) : null}
      </Section>

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
          {/* **대상자는 명단과 학교 진입의 합집합이다**(규격 §22).
              명단만 세면 `/campus/{학교}` 로 혼자 들어와 친 학생이 분모
              밖에 남고, 그 자리에서 완료율이 100 을 넘는다. 두 모집단을
              합쳐 세면 **완료 ≤ 시작 ≤ 대상자가 집계 자체로 참**이고,
              100 에서 자르는 clamp 가 필요 없다 */}
          <Kpi label="대상자" value={v3.target} unit="명"
            note={v3.target > v3.roster
              ? `명단 ${v3.roster}명 + 학교 진입 ${v3.target - v3.roster}명`
              : "학교가 계정을 발급한 학생"} />
          <Kpi label="검사를 시작한 학생" value={v3.started} unit="명" />
          <Kpi label="결과를 받은 학생" value={v3.scored} unit="명" />
          {/* **바닥은 늘 대상자 하나다**(규격 §22). 앞 판본은 바닥을
              `max(명단, 시작)` 으로 두고 어느 쪽이 바닥인지를 라벨로
              적었는데, 그러면 **같은 화면의 수가 날마다 다른 모집단으로
              나뉜다.** 대상자를 합집합으로 세면 바닥이 하나로 고정되고
              라벨도 하나다 */}
          <Kpi label="완료율"
            value={v3.completion === null ? "—" : `${v3.completion}%`}
            note="대상자 기준" />
        </div>
        <p className="sf-meta" style={{ marginTop: 10 }}>
          지금 푸는 중 {v3.in_progress}명 · 경험을 더해 갱신한 학생
          {" "}{v3.recomputed}명
        </p>
        {/* **명단보다 응시가 많으면 그 사실을 적는다**(규격 §23). 숨기면
            완료율이 왜 시작한 학생 기준인지 읽는 사람이 알 수 없다 */}
        {v3.target > v3.roster ? (
          <p className="sf-meta" style={{ marginTop: 6 }}>
            명단에 없는 학생 {v3.target - v3.roster}명이 학교 전용 진입으로
            들어와 검사를 시작했습니다. 대상자에 그 학생들이 함께 들어
            있습니다.
          </p>
        ) : null}
        {/* **섞어서 보고 있으면 화면이 그 사실을 적는다.** 적지 않으면
            캡처한 수가 손님 수로 읽힌다 */}
        {withDemo ? (
          <p className="sf-meta" style={{ marginTop: 6 }}>
            시연·검사 계정을 섞어서 보고 있습니다.{" "}
            <Link href="/org/v3">손님만 보기</Link>
          </p>
        ) : null}
      </Section>

      {/* ── 미응시 · 진행중 · 완료(규격 §17) ──
          **메일이나 문자를 여기서 보내지 않는다.** 그 기능이 이 제품에
          없는데 단추를 만들면 누른 담당자가 보낸 줄로 읽고, 학생은 아무
          것도 받지 않는다. 그래서 하는 일은 둘이다: 그 목록으로 넘어가기와
          **리마인드 대상 명단을 CSV 로 받기** */}
      {counts ? (
        <Section title="응시 상태별 학생"
          note="명단에 올라온 학생을 상태로 가른 수입니다. 눌러서 그 목록으로 갑니다">
          <ul className="sf-list">
            <li>
              <b>아직 시작하지 않은 학생 {counts.none}명</b>{" "}
              <Link href={toStudents("none")}>
                목록 보기
              </Link>{" · "}
              <a href={toCsv("none")}>
                리마인드 대상 CSV
              </a>
            </li>
            <li>
              <b>푸는 중인 학생 {counts.in_progress}명</b>{" "}
              <Link href={toStudents("in_progress")}>
                목록 보기
              </Link>{" · "}
              <a href={toCsv("in_progress")}>
                CSV
              </a>
            </li>
            <li>
              <b>결과를 받은 학생 {counts.scored}명</b>{" "}
              <Link href={toStudents("scored")}>
                목록 보기
              </Link>{" · "}
              <a href={toCsv("scored")}>
                CSV
              </a>
            </li>
            <li>
              이용이 멈춘 계정 {counts.disabled}명{" "}
              <Link href={toStudents("disabled")}>
                목록 보기
              </Link>
            </li>
          </ul>
          <p className="sf-meta" style={{ marginTop: 8 }}>
            이 제품은 학생에게 메일이나 문자를 보내지 않습니다. 안내는 학교가
            쓰는 길로 보내시고, 받는 학생 명단을 위에서 내려받으십시오.
          </p>
        </Section>
      ) : null}

      {/* ── 내려받기(규격 §18) ──
          **개별 답변은 한 칸도 나가지 않는다**(§23). 나가는 것은 계정
          상태와 응시 여부와 집계까지다. 지금 좁혀 본 조건이 그대로 따라
          가고, 받은 파일의 머리에 그 조건이 적힌다 */}
      <Section title="내려받기"
        note="지금 좁혀 본 범위 그대로 받습니다. 개별 답변은 들어 있지 않습니다">
        <ul className="sf-list">
          <li>
            <a href={`/org/v3/export/students.csv${qs}`}>
              학생 응시 상태 CSV
            </a>{" "}— 학번 · 이름 · 학과 · 계정 상태 · 응시 상태 · 완료일
          </li>
          <li>
            <a href={`/org/v3/export/departments.csv${qs}`}>
              학과별 집계 CSV
            </a>{" "}— 단과대학과 학과별 대상자 · 시작 · 완료. {MIN_CELL}명
            미만 칸은 수가 비어 있습니다
          </li>
          <li>
            <a href={`/org/v3/report.pdf${qs}`}>대학 운영 요약 PDF</a>{" · "}
            <Link href={`/org/v3/report${qs}`}>미리 보기</Link>{" "}
            — 개인 응답은 들어 있지 않습니다
          </li>
        </ul>
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
          {/* **학교 전용 진입으로 들어온 응시만 선다**(규격 §13). 소속으로만
              묶인 학생은 학과 칸이 비어 있어 이 두 묶음에 서지 않는다 */}
          {/* ── 단과대학별 응시 현황(규격 §21) ──
              **막대 하나로는 담당자가 판단하지 못한다.** 응시 수만 보여
              주면 `많다 · 적다` 밖에 못 읽고, 그 단과대학이 **몇 명 가운데
              몇 명인지**가 없다. 네 칸을 한 줄에 세우면 어디에 안내를 한 번
              더 보낼지가 그 줄에서 정해진다.

              **등수를 매기지 않는다**: 차례는 사람 수이고 그 옆에 등수를
              적지 않는다. 다섯이 안 되는 칸은 수를 내지 않는다 */}
          {v3.college_rows.length ? (
            <Section title="단과대학별 응시 현황"
              note="학교 전용 진입으로 들어온 응시입니다">
              <div className="sf-tw">
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th scope="col">단과대학</th>
                      <th scope="col">대상자</th>
                      <th scope="col">시작</th>
                      <th scope="col">완료</th>
                      <th scope="col">완료율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v3.college_rows.map((r) => (
                      <tr key={r.code}>
                        <th scope="row">{name.college(r.code)}</th>
                        <td>{r.target === null
                          ? `${MIN_CELL}명 미만` : `${r.target}명`}</td>
                        <td>{r.started === null
                          ? `${MIN_CELL}명 미만` : `${r.started}명`}</td>
                        <td>{r.scored === null
                          ? `${MIN_CELL}명 미만` : `${r.scored}명`}</td>
                        <td>{r.rate === null ? "—" : `${r.rate}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          ) : null}

          {v3.by_department.length ? (
            <Section title="학과"
              note="학과별 응시와 완료입니다. 학생끼리 줄을 세우지 않습니다">
              <BarList rows={bars(v3.by_department, name.dept)}
                hiddenLabel={`${MIN_CELL}명 미만`} emptyLabel="아직 없습니다" />
            </Section>
          ) : null}

          {/* ── 주의가 필요한 학과(규격 §22) ──
              **학과끼리 줄을 세우지 않는다.** 여기 적는 것은 아직 끝내지
              않은 사람이 몇인가이고, 담당자가 이 화면에서 할 수 있는 일이
              그 학과에 안내를 한 번 더 보내는 것이다. 시작한 사람이 다섯이
              안 되는 학과는 서지 않는다: 그런 학과에서 `한 명이 아직 안
              끝냈습니다` 는 그 한 사람을 가리키는 말이다 */}
          <Section title="주의가 필요한 학과"
            note="아직 결과를 받지 않은 학생이 남아 있는 학과입니다">
            {v3.attention.length ? (
              <ul className="sf-list">
                {v3.attention.slice(0, 6).map((r) => (
                  <li key={r.code}>
                    <b>{name.dept(r.code)}</b> — 시작 {r.started}명 가운데
                    {" "}{r.open}명이 아직 결과를 받지 않았습니다
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sf-meta">
                시작한 학생이 다섯 이상인 학과 가운데 아직 끝내지 않은 학생이
                남은 곳은 없습니다.
              </p>
            )}
          </Section>

          {/* ── 최근 응시 ── 날짜마다 몇 명이 시작하고 받았는가.
              **5명 규칙을 날짜 칸에도 건다**: 하루에 한 사람만 친 날이
              그대로 찍히면 그 사람이 누구인지 짐작이 된다 */}
          <Section title="최근 응시"
            note="최근 이레입니다. 다섯이 안 되는 날은 수를 내지 않습니다">
            <ul className="sf-list">
              {v3.recent.slice(-7).map((d) => (
                <li key={d.day}>
                  <b>{d.day}</b> — 시작 {d.started === null ? "5명 미만" : `${d.started}명`}
                  {" · "}결과 {d.scored === null ? "5명 미만" : `${d.scored}명`}
                </li>
              ))}
            </ul>
          </Section>

          {/* **긴 목록을 첫 화면에 펼치지 않는다**(규격 §22). 담당자가 이
              화면을 여는 까닭은 위의 여섯이고, 아래 다섯은 되짚어 보실
              자리다. 담긴 것은 그대로다 */}
          <details className="sf-fold">
            <summary>전공 · 학위 · 산업 · 직무 · 영역 분포 보기</summary>

          <Section title="전공"
            note="학생이 어느 Major Core 로 응시했는가">
            <BarList rows={bars(v3.by_core, niceCore)}
              hiddenLabel={`${MIN_CELL}명 미만`} emptyLabel="아직 없습니다" />
          </Section>

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
          </details>
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
