import Link from "next/link";
import { ROLE_LABEL } from "@/lib/roles";
import { resolveLang } from "@/lib/locale-server";
import {
  listStudents, studentCounts, type StudentState,
} from "@/lib/campus/manage";
import { campusNames, leafChoices } from "@/lib/campus/labels";
import { campusViewer } from "@/lib/campus/viewer";
import { BRAND, toLang2 } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_CAMPUS } from "@/components/sf/nav";
import { campusSay, university } from "@/lib/campus/registry";
import { sayTree } from "@/lib/campus/say-tree";
import { Empty } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";
import StudentRows from "./rows";
import AddStudent from "./add";

export const metadata = { title: `학생 관리 · ${BRAND.campus}` };

const TABS: { key: StudentState; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "none", label: "미응시" },
  { key: "in_progress", label: "진행중" },
  { key: "scored", label: "완료" },
  { key: "disabled", label: "비활성" },
];

/**
 * 학생 계정을 담당자가 직접 다루는 자리(규격 §12·§25).
 *
 * **긴 표 하나로 끝내지 않는다.** 위에 검색과 필터와 등록 길이 서고, 상태
 * tab 으로 묻는 것을 좁히고, 줄마다 할 일 셋이 붙는다. 담당자가 이 화면에서
 * 하는 일은 `누가 아직 안 쳤는가` 를 보고 그 학생의 비밀번호를 다시 내는
 * 것이라, 그 두 걸음이 한 쪽에서 끝나야 한다.
 *
 * **개별 응답과 결과는 한 칸도 서지 않는다**(규격 §23). 담당자가 볼 수
 * 있는 것은 계정 상태와 응시 여부까지다.
 */
export default async function CampusStudents({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string; q?: string; department?: string; college?: string;
    state?: string; page?: string; demo?: string;
  }>;
}) {
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  /* **범위를 이 화면에서 정하지 않는다**(설계 원칙 10). 집계와 내려받는
     자료와 운영 요약이 같은 함수에 묻는다 */
  const { user, org, uni } = await campusViewer();
  /* **시연·검사 계정은 기본으로 거른다.** 집계 쪽은 전부터 이 줄을 들고
     있었고 명단 쪽만 빠져 있었다. 그래서 같은 화면에 `대상자 0명` 과
     `아직 시작하지 않은 학생 63명` 이 나란히 섰다 */
  const withDemo = sp.demo === "1";

  /* 기관(진흥원 등)이면 화면 글자를 기관 낱말로 바꾼다(`sayTree`) */
  const reg = uni ? university(uni) : null;
  const say = campusSay(reg);
  const agency = reg?.org_kind === "agency";
  const shell = (children: React.ReactNode) => (
    <Shell
      surface="campus" lang={L} nav={NAV_CAMPUS} active="/org/v3/students"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={org ? org.name : BRAND.campus}
      topRight={<LangSelect current={L} />}
    >
      {sayTree(children, say, agency)}
    </Shell>
  );

  if (!uni) {
    return shell(
      <>
        <PageHead eyebrow="CAREERMATRI CAMPUS" title="학생 관리" />
        <Section>
          <Empty icon="lock" title="학교 등록부에 연결된 기관이 아닙니다"
            body={"이 화면은 학교 전용 진입을 쓰는 기관에서만 열립니다."
              + " 기관 코드가 등록부의 학교 코드와 같아야 합니다."} />
        </Section>
      </>,
    );
  }

  /* 학과 코드를 담당자가 읽는 이름으로. **등록부 하나에서 읽고 읽는
     자리도 하나다**: 집계 화면과 내려받는 자료가 같은 이름을 쓴다 */
  const deptName = campusNames(uni).dept;
  const leaves = leafChoices(uni);

  const state = (TABS.find((t) => t.key === sp.state)?.key ?? "all") as StudentState;
  const page = Math.max(Number(sp.page ?? "1") || 1, 1);
  const LIMIT = 50;
  /* **집계 화면과 같은 이름의 값을 받는다.** 저쪽 링크가 `department` 와
     `college` 를 달고 오는데 여기가 `dept` 로만 읽으면, 눌러 넘어온
     담당자가 **좁혀지지 않은 전체 목록**을 보고 그것을 그 학과의 수로
     읽는다 */
  const filter = {
    universityCode: uni, q: sp.q ?? "", withDemo,
    department: sp.department ?? "", college: sp.college ?? "",
  };
  const [{ rows, total }, counts] = await Promise.all([
    listStudents({ ...filter, state, limit: LIMIT, offset: (page - 1) * LIMIT }),
    studentCounts(filter),
  ]);
  const pages = Math.max(Math.ceil(total / LIMIT), 1);
  const link = (over: Record<string, string>): string => {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.department) p.set("department", sp.department);
    if (sp.college) p.set("college", sp.college);
    if (withDemo) p.set("demo", "1");
    if (state !== "all") p.set("state", state);
    for (const [k, v] of Object.entries(over)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    const s = p.toString();
    return s ? `/org/v3/students?${s}` : "/org/v3/students";
  };

  return shell(
    <>
      <PageHead
        eyebrow="CAREERMATRI CAMPUS"
        title="학생 관리"
        sub="학교가 발급한 계정입니다. 학생이 적은 답과 결과는 여기 서지 않습니다."
        actions={
          <Link className="sf-btn" href="/org/v3/students/import">
            CSV 로 한꺼번에 등록
          </Link>
        }
      />

      {/* 검색과 학과 좁히기. **GET 폼이라 주소가 그 상태를 든다**:
          담당자가 그 주소를 그대로 북마크하거나 옆자리에 보낼 수 있다 */}
      <Section>
        <form className="sf-filters" method="get" action="/org/v3/students">
          {state !== "all" ? <input type="hidden" name="state" value={state} /> : null}
          {sp.college ? <input type="hidden" name="college" value={sp.college} /> : null}
          {withDemo ? <input type="hidden" name="demo" value="1" /> : null}
          <label className="sf-field">
            <span>이름 · 학번 · 아이디</span>
            <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="찾을 글자" />
          </label>
          <label className="sf-field">
            <span>학과</span>
            <select name="department" defaultValue={sp.department ?? ""}>
              <option value="">전체 학과</option>
              {leaves.map((r) => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
          </label>
          <button className="sf-btn ghost" type="submit">찾기</button>
          {sp.q || sp.department || sp.college ? (
            <Link className="sf-mini"
              href={link({ q: "", department: "", college: "" })}>조건 지우기</Link>
          ) : null}
        </form>

        {/* 상태 tab. **수를 함께 적는다**: 담당자가 묻는 것이 `몇 명` 이다 */}
        <nav className="sf-tabs" aria-label="상태">
          {TABS.map((t) => (
            <Link key={t.key} href={link({ state: t.key === "all" ? "" : t.key, page: "" })}
              className={`sf-tab${state === t.key ? " is-on" : ""}`}
              aria-current={state === t.key ? "page" : undefined}>
              {t.label}<em>{counts[t.key]}</em>
            </Link>
          ))}
        </nav>
      </Section>

      <Section title="학생" note={`${total}명 · ${page} / ${pages}쪽`}>
        {rows.length ? (
          <>
            {/* **함수를 클라이언트 컴포넌트로 넘기지 않는다.** 전에는
                `deptName` 을 그대로 넘겼고, Next 가 그것을 직렬화하지
                못해 **이 쪽이 통째로 500 이었다**(담당자가 명단을 열 수
                없었다). 쪽은 열리는 것으로 보이는 다른 검사들이 이 쪽을
                한 번도 열지 않아 몇 회차 동안 조용했다. 읽는 자리는 그대로
                등록부 하나이고, 넘기는 것은 **그 줄에 쓸 이름뿐**이다 */}
            <StudentRows rows={rows}
              deptNames={Object.fromEntries(
                rows.map((r) => [r.department_code, deptName(r.department_code)]))} />
            {pages > 1 ? (
              <nav className="sf-pager" aria-label="쪽">
                {page > 1 ? <Link href={link({ page: String(page - 1) })}>이전</Link> : null}
                <span>{page} / {pages}</span>
                {page < pages ? <Link href={link({ page: String(page + 1) })}>다음</Link> : null}
              </nav>
            ) : null}
          </>
        ) : (
          <Empty icon="users" title="이 조건에 맞는 학생이 없습니다"
            body={"조건을 지우고 다시 보시거나, 아래에서 학생을 한 명 추가하거나"
              + " CSV 로 한꺼번에 등록할 수 있습니다."} />
        )}
      </Section>

      <AddStudent leaves={leaves.map((r) => ({ code: r.code, name: r.name }))} />
    </>,
  );
}
