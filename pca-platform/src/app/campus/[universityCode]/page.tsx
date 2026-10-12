import Link from "next/link";
import { notFound } from "next/navigation";
import "../../surface.css";
import "../campus.css";
import {
  departmentsOf, statusOf, university,
} from "@/lib/campus/registry";
import { CmHead } from "../../me/shell";
import {
  PickCard, PickGrid, PrimaryActionHero, SectionHeader,
} from "../../me/ui";
import { CampusShell } from "../shell";

type Params = { params: Promise<{ universityCode: string }> };

export async function generateMetadata({ params }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  return { title: u ? `${u.university_name} · CareerMatri` : "CareerMatri" };
}

/**
 * 학교 전용 진입의 첫 화면.
 *
 * **이 쪽은 추천 화면이 아니다**(규격 §19). 하는 일은 하나다: 학교 학과
 * 이름에서 CareerMatri 의 전공 검사로 가는 길을 여는 것. 그래서 서는 것도
 * 넷뿐이다 — 상표와 학교 이름과 짧은 설명과 학과를 고르는 한 가지.
 *
 * **일반 B2C 흐름과 섞지 않는다**(규격 §1 · §14). 가격표도 상품 쪽도
 * 여기서 가리키지 않고, 검사를 시작한 뒤는 전부 공통 화면이다.
 *
 * **전용 검사를 만들지 않는다.** 이 길로 들어와도 문항과 채점과 결과는
 * 다른 모든 응시자와 같은 것을 쓴다.
 */
export default async function CampusEntry({ params }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  if (!u) notFound();

  const code = u.university_code.toLowerCase();
  const rows = departmentsOf(u);
  const ready = rows.filter((r) => statusOf(u, r.dept) === "READY").length;

  return (
    <CampusShell u={u} wide>
      <CmHead
        kicker={`${u.university_name} 전용 진입`}
        title="학과를 고르면 그 전공의 검사로 이어집니다"
        lead={`${u.university_name} 학과 이름을 고르면 그 전공을 다루는 `
          + "CareerMatri 검사로 연결됩니다. 해 본 일과 직접 판단한 경험을 읽어 "
          + "지금 설명할 수 있는 것과 아직 부족한 부분을 정리합니다."}
      />

      {/* **한 가지만 짙게 세운다.** 첫 화면에서 할 일은 학과를 고르는
          것이고, 그 옆에 같은 무게의 길을 하나 더 두면 고르는 일이 한 번
          늘어난다 */}
      <PrimaryActionHero
        tag="전공 선택"
        tagIcon="compass"
        title={`${u.university_name} 학과 ${rows.length}개 가운데 고릅니다`}
        why={ready
          ? `지금 검사할 수 있는 학과가 ${ready}개입니다.`
          : "지금은 모든 학과가 준비 중입니다. 학과마다 무엇을 준비하고 있는지 적어 두었습니다."}
        action={
          <Link className="cm-btn is-primary" href={`/campus/${code}/majors`}>
            전공 선택하기
          </Link>
        }
      />

      {/* **단과대학을 첫 화면에 적는다.** 학교 담당자와 학생이 가장 먼저
          묻는 것이 `우리 과가 들어 있는가` 이고, 목록에 들어가서야 알면
          자기 학과를 찾던 사람이 빠진 줄로 읽는다 */}
      <SectionHeader icon="layers" title="단과대학" />
      <PickGrid cols={2}>
        {u.colleges.map((c) => {
          const open = c.departments
            .filter((d) => statusOf(u, d) === "READY").length;
          return (
            <PickCard
              key={c.code}
              href={`/campus/${code}/majors`}
              icon="grid"
              tone={c.note ? "c" : "b"}
              title={c.name}
              tag={`학과 ${c.departments.length}개`}
              lead={c.departments.slice(0, 4).map((d) => d.name).join(" · ")}
              meta={c.departments.length > 4
                ? `외 ${c.departments.length - 4}개 학과`
                : open ? `검사 가능 ${open}개` : undefined}
              cta="학과 보기"
            />
          );
        })}
      </PickGrid>

      {/* **같은 말을 두 자리에 적지 않는다.** 검사할 수 있는 학과 수는
          위의 한 가지가 이미 들고 있다 */}
      <dl className="cm-dl" style={{ marginTop: 20 }}>
        {u.region_cities.length ? (
          <div>
            <dt>먼저 보여드리는 지역</dt>
            {/* **고른 지역을 바꾸지 않는다**(규격 §17) */}
            <dd>
              {u.region_cities.join(" · ")} · 다른 지역을 고르면 그대로 둡니다
            </dd>
          </div>
        ) : null}
      </dl>

      {/* **없는 것을 적는다.** 학과 목록이 아직 전부가 아니라는 사실을
          적지 않으면, 자기 학과가 없는 학생이 이 서비스가 그 학과를
          빼놓은 줄로 읽는다 */}
      {u.source_verified ? null : (
        <p className="cm-note" style={{ marginTop: 16 }}>
          지금 보이는 학과는 학교에서 알려주신 목록입니다. 남은 학과는 학교
          확인을 받아 추가합니다.
        </p>
      )}
    </CampusShell>
  );
}
