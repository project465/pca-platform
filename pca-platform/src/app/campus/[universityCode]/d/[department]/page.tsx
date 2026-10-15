import Link from "next/link";
import { notFound } from "next/navigation";
import "../../../../surface.css";
import "../../../campus.css";
import {
  coreOf, findLeaf, specializationName, statusOf, university,
} from "@/lib/campus/registry";
import { CampusShell } from "../../../shell";
import { startFromCampus } from "../../../actions";
import { domainNames } from "../../../domains";

type Params = { params: Promise<{ universityCode: string; department: string }> };

export async function generateMetadata({ params }: Params) {
  const { universityCode, department } = await params;
  const u = university(universityCode);
  const found = u ? findLeaf(u, department) : null;
  return {
    title: found ? `${found.leaf.name} · ${u?.university_name}` : "CareerMatri",
  };
}

/**
 * 학과 상세. **아주 짧게 둔다**(규격 §9 · §10 전 회차).
 *
 * 긴 전공 소개 쪽을 만들지 않는다. 적는 것은 셋이다: 내 학과가 맞는가 ·
 * 무엇을 묻는가 · 시작하는 한 가지.
 *
 * **Core code 와 갈래 코드를 적지 않는다**(규격 §4). 서는 것은 그 검사가
 * 묻는 영역 이름이고, 그 값은 그 Core 의 taxonomy 가 들고 있다.
 *
 * **준비 중인 학과를 여기서 막는다.** 목록에서 줄을 꺼 두는 것은
 * 안내이고 막는 것은 이 자리다: 주소를 손으로 쳐도 상태를 다시 보고
 * 돌려보낸다.
 */
export default async function CampusDepartment({ params }: Params) {
  const { universityCode, department } = await params;
  const u = university(universityCode);
  if (!u) notFound();
  const found = findLeaf(u, department);
  if (!found) notFound();
  const { leaf } = found;
  const code = u.university_code.toLowerCase();
  const ready = statusOf(u, found) === "READY";
  /* **고르는 자리는 준비 중이 아니다**(규격 §20). 자율전공학부처럼 전공을
     뒤에 정하는 자리는 우리가 안 만든 것이 아니라 **학생이 고르는
     자리**다. 여기서 Core 를 자동으로 정해 주지 않는다: 자동으로 정하면
     그 학생이 고르지 않은 전공의 자로 재어진다 */
  const routing = Boolean(leaf.routing_only);
  const core = coreOf(leaf);
  const spec = specializationName(leaf);
  const domains = ready && leaf.core_code ? domainNames(leaf.core_code) : [];
  /* 학부가 있으면 함께 적는다. 같은 이름의 전공이 다른 학부에 설 수 있고,
     그때 어느 쪽인지는 학부가 가른다 */
  const where = found.unit.code === leaf.code
    ? found.college.name : `${found.college.name} · ${found.unit.name}`;
  /* **돌아가는 자리를 그 자리의 학년도 구조와 단과대학으로 둔다**(규격
     §3·§4 전 회차). 기본 구조로 돌려보내면 2027 자리에서 들어온 사람이
     자기 목록을 다시 찾아야 한다 */
  const back = `/campus/${code}/majors?y=${found.catalog.catalog_year}`
    + `&c=${encodeURIComponent(found.college.code)}`;

  return (
    <CampusShell u={u}>
      <section className="cm-cmp-hero">
        <p className="cm-cmp-eyebrow">{u.university_name} · {where}</p>
        <h1 className="cm-cmp-title">{leaf.name}</h1>
        <p className="cm-cmp-lead">
          {ready
            ? "이 전공이 다루는 영역마다 해 본 일과 직접 정한 것을 묻습니다."
              + " 문항마다 저장되어 창을 닫아도 보던 자리에서 이어집니다."
            : routing
              ? "전공을 고른 뒤에 그 전공으로 시작합니다. 지금 가장 관심 있는"
                + " 전공을 고르시면 됩니다. 나중에 다시 고를 수 있습니다."
              : "이 학과는 지금 응시할 수 없습니다."}
        </p>
        {ready ? (
          /* **주소로 전공을 바꿀 수 없다.** 폼이 보내는 것은 학교와 학과
             코드 둘뿐이고, 어느 Core 로 가는가는 서버가 등록부에서 읽는다 */
          <form action={startFromCampus} className="cm-cmp-cta-row">
            <input type="hidden" name="u" value={u.university_code} />
            <input type="hidden" name="d" value={leaf.code} />
            <button type="submit" className="cm-cmp-cta">
              검사 시작하기<span aria-hidden="true">→</span>
            </button>
            <Link className="cm-cmp-cta-2" href={back}>다른 학과 선택</Link>
          </form>
        ) : (
          <div className="cm-cmp-cta-row">
            <Link className="cm-cmp-cta" href={routing ? `${back}&pick=1` : back}>
              {routing ? "전공 고르기" : "다른 학과 선택"}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </section>

      {ready ? (
        domains.length ? (
          <section className="cm-cmp-sect">
            <div className="cm-cmp-sect-h">
              <h2>이 전공에서 살펴보는 영역</h2>
              <p>{core ? `CareerMatri ${core.name_ko}${spec ? ` · ${spec}` : ""}` : null}</p>
            </div>
            <ul className="cm-cmp-tags">
              {domains.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </section>
        ) : null
      ) : (
        <p className="cm-cmp-note">
          {routing
            ? "어느 전공으로 재는지는 고르신 전공이 정합니다. 학부 이름만"
              + " 보고 특정 전공으로 판단하지 않습니다."
            : leaf.core_code
              ? "이 학과의 문항과 산업 자료를 그 전공을 아는 분이 써야 열립니다."
              : "어느 전공 검사로 이을지 학교와 확인하고 있습니다."}
        </p>
      )}
    </CampusShell>
  );
}
