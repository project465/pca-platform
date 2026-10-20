import Link from "next/link";
import { notFound } from "next/navigation";
import "../../surface.css";
import "../campus.css";
import {
  campusSay, leavesOf, offered, statusOf, university, visible,
} from "@/lib/campus/registry";
import { pickCatalog } from "@/lib/campus/pick";
import { CampusShell } from "../shell";

type Params = {
  params: Promise<{ universityCode: string }>;
  searchParams: Promise<{ y?: string | string[] }>;
};

export async function generateMetadata({ params }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  return { title: u ? `${u.university_name} CareerMatri` : "CareerMatri" };
}

/**
 * 네 핵심 가치(규격 §3).
 *
 * **번호는 장식이 아니다**(규격 §2). 넷은 이 제품이 생각하는 차례다:
 * 전공에서 시작해 · 해 본 경험을 확인하고 · 산업과 직무로 잇고 · 다음에
 * 할 일을 낸다. 차례가 아니면 번호를 붙이지 않는다.
 *
 * **재지 않은 것을 적지 않는다.** 적성도 유형도 합격 가능성도 말하지
 * 않는다: 이 검사가 내놓는 것은 확인된 판단과 아직 비어 있는 부분이다.
 */
/**
 * 이 검사가 밟는 세 걸음(규격 §3 · §19).
 *
 * **그림으로 빈 면을 채우지 않는다**(레퍼런스 사용 규칙). 여기 서는 것은
 * 실제 흐름이고, 학생이 시작 전에 가장 많이 묻는 `얼마나 걸리고 무엇을
 * 묻느냐` 에 답한다. 지어낸 수치도 임의의 사진도 두지 않는다.
 */
const FLOW = [
  { n: "STEP 1", t: "내 학과 선택", d: "학과에 맞는 영역으로 묻습니다." },
  { n: "STEP 2", t: "경험 중심 응답", d: "해 본 일과 직접 정한 것을 고릅니다." },
  { n: "STEP 3", t: "결과와 다음 행동", d: "산업·직무 연결과 다음 한 가지를 받습니다." },
];

const VALUES = [
  {
    t: "전공 기준 분석",
    d: "학과를 고르면 그 전공이 실제로 다루는 영역을 기준으로 묻습니다.",
  },
  {
    t: "실제 경험 확인",
    d: "해 본 일과 직접 정한 것을 나눠 묻고, 답한 것만 결과에 적습니다.",
  },
  {
    t: "산업·직무 연결",
    d: "확인된 경험이 어떤 산업과 어떤 자리에서 쓰이는지 이어 봅니다.",
  },
  {
    t: "다음 행동 제안",
    d: "아직 부족한 부분과 그것을 메우는 다음 한 가지를 함께 냅니다.",
  },
];

/**
 * 배재대학교 전용 CareerMatri Portal 의 첫 화면.
 *
 * **이 쪽은 추천 화면이 아니다**(규격 §19). 하는 일은 하나다: 학교 학과
 * 이름에서 CareerMatri 의 전공 검사로 가는 길을 여는 것.
 *
 * **등록부를 얼마나 채웠는지 학생에게 숫자로 적지 않는다**(규격 §7).
 * `학과 47개 · 검사 가능 0개` 는 우리 쪽 진행이고, 읽는 사람이 할 일을
 * 하나도 말해 주지 않는다. 적는 것은 무엇을 하면 되는가 한 줄이다.
 *
 * **학년도 구조는 묻지 않고 정한다**(규격 §4). 들고 있는 값으로 판별되면
 * 그대로 쓰고 모르면 재학생 구조다. 첫 화면과 학과 목록이 같은 함수를
 * 부르므로 두 쪽이 같은 구조를 그린다.
 *
 * **일반 B2C 흐름과 섞지 않는다**(규격 §1 · §14). 가격표도 상품 쪽도
 * 여기서 가리키지 않고, 검사를 시작한 뒤는 전부 공통 화면이다.
 */
export default async function CampusEntry({ params, searchParams }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  if (!u) notFound();
  const t = campusSay(u);
  const { y } = await searchParams;
  const cat = await pickCatalog(u, y);
  const code = u.university_code.toLowerCase();
  /* 주소로 학년도를 받아 들어왔으면 그대로 들고 간다 */
  const keep = Array.isArray(y) ? y[0] : y;
  const q = keep ? `?y=${encodeURIComponent(keep)}` : "";
  const majors = `/campus/${code}/majors${q}`;

  /* 지금 응시할 수 있는 자리가 있는 단과대학을 앞에 둔다. **수를 적지
     않는다**(규격 §7): 읽는 사람이 할 일을 말해 주지 않는 값이다 */
  const live = leavesOf(cat).filter(offered);
  const ready = new Set(
    live.filter((r) => statusOf(u, r) === "READY").map((r) => r.college.code));
  const colleges = [...cat.colleges]
    .sort((a, b) => Number(ready.has(b.code)) - Number(ready.has(a.code)));

  return (
    <CampusShell u={u} wide>
      {/* **한 가지만 짙게 세운다.** 첫 화면에서 할 일은 학과를 고르는
          것이고, 그 옆에 같은 무게의 길을 하나 더 두면 고르는 일이 한 번
          늘어난다. 두 번째 줄은 이미 받은 계정으로 돌아오는 사람의 길이다 */}
      <section className="cm-cmp-hero has-flow">
        <div>
        <p className="cm-cmp-eyebrow">{u.university_name} {t("학생")} 전용</p>
        <h1 className="cm-cmp-title">내 전공에서 시작하는 진로 분석</h1>
        <p className="cm-cmp-lead">
          지금까지 해본 경험에서 산업·직무 연결과 다음 준비 방향을
          확인합니다.
        </p>
        <div className="cm-cmp-cta-row">
          <Link className="cm-cmp-cta" href={majors}>
            {t("내 학과 선택하기")}<span aria-hidden="true">→</span>
          </Link>
          <Link className="cm-cmp-cta-2" href={`/campus/${code}/login`}>
            {t("학교 계정으로 로그인")}
          </Link>
        </div>
        </div>

        <ol className="cm-cmp-flow">
          {FLOW.map((f) => (
            <li key={f.n}>
              <b>{f.n}</b>
              <strong>{t(f.t)}</strong>
              <span>{t(f.d)}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="cm-cmp-values">
        {VALUES.map((v, i) => (
          <article className="cm-cmp-value" key={v.t}>
            <span className="cm-cmp-value-n">0{i + 1}</span>
            <h3>{t(v.t)}</h3>
            <p>{t(v.d)}</p>
          </article>
        ))}
      </div>

      {/* **단과대학을 첫 화면에 적는다.** 학생이 가장 먼저 묻는 것이
          `우리 과가 들어 있는가` 이고, 목록에 들어가서야 알면 자기 학과를
          찾던 사람이 빠진 줄로 읽는다 */}
      <section className="cm-cmp-sect">
        <div className="cm-cmp-sect-h">
          <h2>{t("단과대학별로 찾기")}</h2>
          <p>{cat.label} 기준</p>
        </div>
        <nav className="cm-cmp-list">
          {colleges.map((c) => (
            <Link className="cm-cmp-row" key={c.code} href={`${majors}#${c.code}`}>
              <span className="cm-cmp-row-main">
                <span className="cm-cmp-row-name">{c.name}</span>
                {/* 맛보기 줄에 **목록에 서지 않는 자리를 적지 않는다.**
                    적으면 들어가서 찾던 사람이 빠진 줄로 읽는다 */}
                <span className="cm-cmp-row-sub">
                  {c.units.filter(visible).slice(0, 4).map((x) => x.name).join(" · ")}
                </span>
              </span>
              {ready.has(c.code)
                ? <span className="cm-cmp-chip">검사 가능</span>
                : null}
              <span className="cm-cmp-arrow" aria-hidden="true">›</span>
            </Link>
          ))}
        </nav>
        {u.region_cities.length ? (
          <p className="cm-cmp-note">
            {/* **고른 지역을 바꾸지 않는다**(규격 §17) */}
            지역은 {u.region_cities.join(" · ")}을 먼저 보여드리고, 다른 지역을
            고르면 그대로 둡니다.
          </p>
        ) : null}
      </section>
    </CampusShell>
  );
}
