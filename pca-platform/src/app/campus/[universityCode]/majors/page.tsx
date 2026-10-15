import Link from "next/link";
import { notFound } from "next/navigation";
import "../../../surface.css";
import "../../campus.css";
import {
  leavesOf, offered, otherCatalogs, statusOf, university,
  type CampusCatalog, type CampusLeaf, type CampusUniversity,
} from "@/lib/campus/registry";
import { pickCatalog } from "@/lib/campus/pick";
import { rememberCatalog } from "../../actions";
import { CampusShell } from "../../shell";
import { domainNames } from "../../domains";

type Params = {
  params: Promise<{ universityCode: string }>;
  searchParams: Promise<{
    y?: string | string[]; c?: string | string[]; pick?: string | string[];
  }>;
};

export async function generateMetadata({ params }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  return { title: u ? `학과 선택 · ${u.university_name}` : "CareerMatri" };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * 그 자리에 적는 한 줄.
 *
 * **학과 소개를 지어내지 않는다.** 응시할 수 있는 자리에는 그 검사가
 * 실제로 묻는 영역 이름을 적고(그 값은 Core 의 taxonomy 가 들고 있다),
 * 아직 열리지 않은 자리에는 **아무것도 적지 않는다.**
 *
 * **같은 말을 마흔 번 적지 않는다**(규격 §2). 준비 중인 까닭이 대부분
 * 같아서, 칸마다 되풀이하면 목록이 기계가 찍어 낸 표로 읽히고 정작 다른
 * 부분이 묻힌다. 까닭은 쪽 머리가 한 번 적는다.
 */
function subOf(u: CampusUniversity, row: CampusLeaf): string | undefined {
  if (statusOf(u, row) === "READY" && row.leaf.core_code) {
    const d = domainNames(row.leaf.core_code);
    if (d.length) return d.slice(0, 3).join(" · ");
    return undefined;
  }
  /* **자율전공을 `준비 중` 으로 적지 않는다**(규격 §20). 그 자리는 우리가
     아직 안 만든 것이 아니라 **학생이 전공을 고르는 자리**다. 둘을 같은
     말로 적으면 그 학부 학생이 자기 차례를 기다리는 줄 안다 */
  if (row.leaf.routing_only) return "관심 있는 전공을 고르면 그 전공으로 시작합니다.";
  if (row.leaf.unverified_majors) return "전공 목록을 학교와 확인하고 있습니다.";
  return undefined;
}

function Row({ u, code, row }: {
  u: CampusUniversity; code: string; row: CampusLeaf;
}) {
  const ready = statusOf(u, row) === "READY";
  /* 고르는 자리. **검사를 자동으로 정해 주지 않는다**(규격 §20): 누르면
     전공 목록으로 가고, 어느 전공으로 재는지는 학생이 고른다 */
  const routing = Boolean(row.leaf.routing_only);
  const sub = subOf(u, row);
  const body = (
    <>
      <span className="cm-cmp-row-main">
        <span className="cm-cmp-row-name">{row.leaf.name}</span>
        {sub ? <span className="cm-cmp-row-sub">{sub}</span> : null}
      </span>
      <span className={`cm-cmp-chip${ready || routing ? "" : " is-wait"}`}>
        {ready ? "검사 가능" : routing ? "전공 선택" : "준비 중"}
      </span>
      {ready || routing
        ? <span className="cm-cmp-arrow" aria-hidden="true">›</span> : null}
    </>
  );
  /* **준비 중인 자리는 눌리지 않는다.** 링크로 두고 상세에서 돌려보내면
     누른 사람이 한 번 더 걸음을 쓴다 */
  return ready || routing ? (
    <Link className="cm-cmp-row" href={`/campus/${code}/d/${row.leaf.code}`}>
      {body}
    </Link>
  ) : (
    <div className="cm-cmp-row is-off">{body}</div>
  );
}

/**
 * 학과 선택. **단과대학 탭 → 학과 줄**이다(규격 §4).
 *
 * **select box 를 쓰지 않는다.** 고르기 전에 무엇이 있는지 보이지 않는
 * 입력이라, 자기 학과가 들어 있는지 확인하려면 열어야 한다.
 *
 * **한 화면에 한 단과대학만 세운다.** 전에는 쉰일곱 칸을 한 쪽에 깔아
 * 데스크톱에서 6,500px 이었고 손전화에서 15,000px 이었다. 그 목록은
 * 훑을 수 없고, 한 손으로는 더더욱 닿지 않는다.
 *
 * **Core code 와 갈래 코드와 안쪽 상태를 적지 않는다**(규격 §4). 서는
 * 것은 학과명과 그 검사가 묻는 영역 한 줄과 지금 할 수 있는가와 화살표다.
 *
 * **한 화면에 한 Catalog 만 선다**(규격 §3 전 회차). 개편 전 구조와 개편
 * 후 구조를 한 목록에 섞으면 같은 이름의 전공이 두 번 서고, 읽는 사람은
 * 둘 가운데 어느 쪽이 자기 자리인지 가를 수 없다.
 *
 * **학부와 전공을 한 칸으로 뭉개지 않는다.** 학부를 고르게 두면 그
 * 학생이 어느 전공으로 재어졌는지 아무도 모른다.
 *
 * **준비 중인 학과는 눌러도 들어가지 않는다.** 줄을 꺼 두는 것은
 * 안내이고, 막는 것은 학과 상세 쪽과 시작 처리가 상태를 다시 보는
 * 자리다: 주소를 손으로 쳐도 거절한다.
 */
export default async function CampusMajors({ params, searchParams }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  if (!u) notFound();
  const { y, c, pick } = await searchParams;
  /* 자율전공 자리에서 넘어왔는가(규격 §20). 넘어온 사람에게는 **지금 무엇을
     하는 걸음인지**를 적는다: 목록만 다시 보여 주면 왜 돌아왔는지 모른다 */
  const picking = Boolean(one(pick));
  const cat: CampusCatalog = await pickCatalog(u, y);
  const code = u.university_code.toLowerCase();
  const keep = one(y);
  const q = keep ? `y=${encodeURIComponent(keep)}&` : "";

  /* 끝난 구조의 자리와 감춘 자리는 목록에 세우지 않는다(`offered`) */
  const live = leavesOf(cat).filter(offered);
  const isReady = (r: CampusLeaf) => statusOf(u, r) === "READY";
  const ready = new Set(live.filter(isReady).map((r) => r.college.code));

  /**
   * **지금 할 수 있는 것이 있는 단과대학이 앞에 선다**(규격 §4).
   *
   * **같은 학과를 두 번 세우지 않는다.** 맨 위에 따로 모으면 그 줄이
   * 자기 단과대학에도 한 번 더 서고, 읽는 사람은 둘이 다른 것인 줄 안다.
   * 차례만 바꾼다.
   */
  const colleges = [...cat.colleges]
    .filter((x) => live.some((r) => r.college.code === x.code))
    .sort((a, b) => Number(ready.has(b.code)) - Number(ready.has(a.code)));

  /* 고른 탭. 주소에 없으면 맨 앞(= 지금 할 수 있는 자리가 있는 쪽)이다 */
  const want = one(c);
  const on = colleges.find((x) => x.code === want) ?? colleges[0];

  const mine = on ? live.filter((r) => r.college.code === on.code) : [];
  const first = <T, >(xs: T[], hot: (x: T) => boolean) =>
    [...xs].sort((a, b) => Number(hot(b)) - Number(hot(a)));
  const plain = first(mine.filter((r) => r.unit.code === r.leaf.code), isReady);
  const faculties = on ? on.units.filter((x) => x.majors?.length) : [];

  /**
   * 다른 학년도 구조로 가는 되돌림(규격 §4 전 회차).
   *
   * **고르는 걸음을 하나 더 두지 않는다.** 들어오는 사람 거의 모두가
   * 재학생이라 목록은 그 구조로 서고, 이 줄은 **자기 학과를 못 찾은
   * 사람**만 쓴다. 이 줄이 없으면 개편으로 이름이 달라진 학과의 학생이
   * 막다른 길에서 닫는다.
   */
  const others = otherCatalogs(u, cat);

  return (
    <CampusShell u={u} wide>
      <div className="cm-cmp-sect-h" style={{ marginTop: 4 }}>
        <h2>{picking ? "관심 있는 전공을 고르세요" : "현재 소속 학과를 선택해주세요"}</h2>
        <p>{cat.label} 기준</p>
      </div>
      <p className="cm-cmp-note" style={{ marginTop: 6 }}>
        {picking
          /* **학과 이름을 화면 코드에 적지 않는다.** 등록부가 이름을 들고
             있고, 적어 두면 학교가 이름을 바꾸는 날 고칠 자리가 둘이 된다 */
          ? "전공을 고른 뒤에 그 전공으로 시작합니다. 지금 가장 관심 있는"
            + " 전공을 고르시면 되고, 나중에 다시 고를 수 있습니다. 고르신"
            + " 전공이 어느 영역을 묻는지가 달라집니다."
          : "학과에 따라 살펴보는 경험과 영역이 달라집니다. 준비 중인 학과는"
            + " 문항과 산업 자료를 준비하고 있어 지금 응시할 수 없습니다."}
      </p>

      <nav className="cm-cmp-tabs" aria-label="단과대학">
        {colleges.map((x) => (
          <Link
            key={x.code}
            className={`cm-cmp-tab${on && x.code === on.code ? " is-on" : ""}`}
            href={`/campus/${code}/majors?${q}c=${encodeURIComponent(x.code)}`}
            aria-current={on && x.code === on.code ? "page" : undefined}
          >
            {x.name}
          </Link>
        ))}
      </nav>

      {plain.length ? (
        <div className="cm-cmp-list">
          {plain.map((r) => <Row key={r.leaf.code} u={u} code={code} row={r} />)}
        </div>
      ) : null}

      {faculties.map((f) => {
        const kids = first(mine.filter((r) => r.unit.code === f.code), isReady);
        if (!kids.length) return null;
        return (
          <section key={f.code}>
            {/* 학부 이름은 묶음 머리로 서고, 고르는 자리는 그 아래 전공이다 */}
            <h3 className="cm-cmp-sub-h">{f.name}</h3>
            <div className="cm-cmp-list">
              {kids.map((r) => <Row key={r.leaf.code} u={u} code={code} row={r} />)}
            </div>
          </section>
        );
      })}

      {/**
        * 지금 어느 편제를 보고 있는지 한 줄로 적고, **그 자리에서 고칠 수
        * 있게 둔다**(규격 작업 2 전 회차). 고르는 걸음을 하나 더 만들지
        * 않는다: 목록은 이미 서 있고 이 줄은 자기 학과를 못 찾은 사람만
        * 쓴다.
        *
        * **`p` 안에 `form` 을 두지 않는다.** 브라우저가 그것을 밖으로
        * 끌어내고, 서버가 보낸 것과 브라우저가 세운 것이 달라진다. 이
        * 저장소에서 같은 탈이 한 번 났다.
        */}
      {others.length ? (
        <div className="cm-cmp-note" style={{ marginTop: 22 }}>
          찾는 학과가 없으면{" "}
          {others.map((x, i) => (
            <span key={x.catalog_year}>
              {i ? ", " : ""}
              <form action={rememberCatalog} style={{ display: "inline" }}>
                <input type="hidden" name="u" value={u.university_code} />
                <input type="hidden" name="y" value={x.catalog_year} />
                <button type="submit" className="cm-cmp-swap">
                  {x.label} 학과 구조
                </button>
              </form>
            </span>
          ))}
          로 바꿔 보실 수 있습니다.
        </div>
      ) : null}
    </CampusShell>
  );
}
