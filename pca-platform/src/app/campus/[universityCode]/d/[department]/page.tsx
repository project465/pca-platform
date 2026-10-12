import Link from "next/link";
import { notFound } from "next/navigation";
import "../../../../surface.css";
import "../../../campus.css";
import {
  coreOf, findLeaf, specializationName, statusOf, university,
} from "@/lib/campus/registry";
import { coreFile, hasCoreFile } from "@/lib/me-v3/core-registry";
import { CmHead } from "../../../../me/shell";
import { CampusShell } from "../../../shell";
import { startFromCampus } from "../../../actions";

type Params = { params: Promise<{ universityCode: string; department: string }> };

export async function generateMetadata({ params }: Params) {
  const { universityCode, department } = await params;
  const u = university(universityCode);
  const found = u ? findLeaf(u, department) : null;
  return {
    title: found ? `${found.leaf.name} · ${u?.university_name}` : "CareerMatri",
  };
}

/** 그 Core 가 살펴보는 기술영역 이름. 자료가 없으면 빈 배열이다 */
function domainNames(coreCode: string): string[] {
  if (!hasCoreFile(coreCode, "taxonomy")) return [];
  try {
    const t = coreFile<{ technical_domains?: { name: string }[] }>(
      coreCode, "taxonomy");
    return (t.technical_domains ?? []).map((d) => d.name);
  } catch { return []; }
}

/**
 * 학과 상세. **아주 짧게 둔다**(규격 §9 · §10).
 *
 * 긴 전공 소개 쪽을 만들지 않는다. 적는 것은 셋이다: 어느 전공 검사로
 * 이어지는가 · 무엇을 살펴보는가 · 시작하는 한 가지.
 *
 * **준비 중인 학과를 여기서 막는다.** 목록에서 칸을 꺼 두는 것은 안내이고
 * 막는 것은 이 자리다: 주소를 손으로 쳐도 상태를 다시 보고 돌려보낸다.
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
  const core = coreOf(leaf);
  const spec = specializationName(leaf);
  const domains = ready && leaf.core_code ? domainNames(leaf.core_code) : [];
  /* 학부가 있으면 쪽 머리에 함께 적는다. 같은 이름의 전공이 다른 학부에
     설 수 있고, 그때 어느 쪽인지는 학부가 가른다 */
  const where = found.unit.code === leaf.code
    ? found.college.name : `${found.college.name} · ${found.unit.name}`;
  /* **돌아가는 자리를 그 자리의 학년도 구조로 둔다**(규격 §3·§4). 기본
     구조로 돌려보내면 2027 자리에서 들어온 사람이 자기 목록을 다시 찾아야
     한다 */
  const back = `/campus/${code}/majors?y=${found.catalog.catalog_year}`;

  return (
    <CampusShell u={u}>
      <CmHead
        kicker={`${u.university_name} · ${where}`}
        title={leaf.name}
        meta={core
          ? `CareerMatri ${core.name_ko}${spec ? ` · ${spec}` : ""} 검사로 이어집니다`
          : undefined}
        lead={ready
          ? "아래 영역마다 해 본 일과 직접 판단한 경험을 묻습니다."
          : "이 학과는 지금 응시할 수 없습니다."}
      />

      {ready ? (
        <>
          {domains.length ? (
            <section>
              <h2 className="cm-sub-h">살펴보는 영역</h2>
              <ul className="cm-rows">
                {domains.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </section>
          ) : null}

          {/* **주소로 전공을 바꿀 수 없다.** 폼이 보내는 것은 학교와 학과
              코드 둘뿐이고, 어느 Core 로 가는가는 서버가 등록부에서 읽는다 */}
          <form action={startFromCampus} className="cm-acts" style={{ marginTop: 20 }}>
            <input type="hidden" name="u" value={u.university_code} />
            <input type="hidden" name="d" value={leaf.code} />
            <button type="submit" className="cm-btn is-primary">
              이 전공으로 검사 시작
            </button>
            <Link className="cm-btn" href={back}>다른 전공 선택</Link>
          </form>

          <p className="cm-note" style={{ marginTop: 16 }}>
            문항마다 저장되어 창을 닫아도 보던 자리에서 이어집니다.
          </p>
        </>
      ) : (
        <>
          <p className="cm-note">
            {leaf.routing_only
              ? "전공을 정한 뒤에 그 전공으로 시작합니다."
              : leaf.core_code
                ? "이 학과의 문항과 산업 자료를 그 전공을 아는 분이 써야 열립니다."
                : "어느 전공 검사로 이을지 학교와 확인하고 있습니다."}
          </p>
          <div className="cm-acts" style={{ marginTop: 18 }}>
            <Link className="cm-btn is-primary" href={back}>
              다른 전공 선택
            </Link>
          </div>
        </>
      )}
    </CampusShell>
  );
}
