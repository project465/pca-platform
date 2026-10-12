import Link from "next/link";
import { notFound } from "next/navigation";
import "../../surface.css";
import "../campus.css";
import { university } from "@/lib/campus/registry";
import { CmHead } from "../../me/shell";
import { PickCard, PickGrid, PrimaryActionHero, SectionHeader } from "../../me/ui";
import { CampusShell } from "../shell";
import type { IconName } from "@/components/sf/icon";

type Params = { params: Promise<{ universityCode: string }> };

export async function generateMetadata({ params }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  return { title: u ? `${u.university_name} · CareerMatri` : "CareerMatri" };
}

/** 단과대학 칸의 표시. **색과 그림은 뜻을 갖지 않는다** */
const TONES: ("b" | "c" | "v" | "w")[] = ["b", "w", "v", "c"];
const ICONS: IconName[] = ["layers", "grid", "building", "box"];

/**
 * 학교 전용 진입의 첫 화면.
 *
 * **이 쪽은 추천 화면이 아니다**(규격 §19). 하는 일은 하나다: 학교 학과
 * 이름에서 CareerMatri 의 전공 검사로 가는 길을 여는 것.
 *
 * **등록부를 얼마나 채웠는지 학생에게 숫자로 적지 않는다**(규격 §8).
 * `학과 10개 · 검사 가능 0개` 는 우리 쪽 진행이고, 읽는 사람이 할 일을
 * 하나도 말해 주지 않는다. 적는 것은 무엇을 하면 되는가 한 줄이다.
 *
 * **일반 B2C 흐름과 섞지 않는다**(규격 §1 · §14). 가격표도 상품 쪽도
 * 여기서 가리키지 않고, 검사를 시작한 뒤는 전부 공통 화면이다.
 */
export default async function CampusEntry({ params }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  if (!u) notFound();
  const code = u.university_code.toLowerCase();

  return (
    <CampusShell u={u} wide>
      <CmHead
        kicker={`${u.university_name} 전용 진입`}
        title={`${u.university_name} CareerMatri`}
        lead="학교 학과를 고르면 해당 전공의 CareerMatri로 이어집니다."
      />

      {/* **한 가지만 짙게 세운다.** 첫 화면에서 할 일은 학과를 고르는
          것이고, 그 옆에 같은 무게의 길을 하나 더 두면 고르는 일이 한 번
          늘어난다 */}
      <PrimaryActionHero
        tag="학과 선택"
        tagIcon="compass"
        title="다니는 학과를 고르면 그 전공의 검사로 이어집니다"
        why="현재 검사 가능한 학과부터 먼저 표시합니다."
        action={
          <Link className="cm-btn is-primary" href={`/campus/${code}/majors`}>
            학과 선택하기
          </Link>
        }
      />

      {/* **단과대학을 첫 화면에 적는다.** 학생이 가장 먼저 묻는 것이
          `우리 과가 들어 있는가` 이고, 목록에 들어가서야 알면 자기 학과를
          찾던 사람이 빠진 줄로 읽는다. **수를 적지 않는다**(규격 §8) */}
      <SectionHeader icon="layers" title="단과대학" />
      <PickGrid cols={3}>
        {u.colleges.map((c, i) => (
          <PickCard
            key={c.code}
            href={`/campus/${code}/majors#${c.code}`}
            icon={ICONS[i % ICONS.length]}
            tone={TONES[i % TONES.length]}
            title={c.name}
            lead={c.units.slice(0, 3).map((x) => x.name).join(" · ")}
            cta="학과 보기"
          />
        ))}
      </PickGrid>

      {u.region_cities.length ? (
        <p className="cm-note" style={{ marginTop: 18 }}>
          {/* **고른 지역을 바꾸지 않는다**(규격 §17) */}
          지역은 {u.region_cities.join(" · ")}을 먼저 보여드리고, 다른 지역을
          고르면 그대로 둡니다.
        </p>
      ) : null}
    </CampusShell>
  );
}
