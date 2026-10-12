import { notFound } from "next/navigation";
import "../../../surface.css";
import "../../campus.css";
import {
  coreOf, specializationName, statusOf, university,
  type CampusDepartment, type CampusUniversity,
} from "@/lib/campus/registry";
import { CmHead } from "../../../me/shell";
import { PickCard, PickGrid, SectionHeader } from "../../../me/ui";
import { CampusShell } from "../../shell";
import type { IconName } from "@/components/sf/icon";

type Params = { params: Promise<{ universityCode: string }> };

export async function generateMetadata({ params }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  return { title: u ? `학과 선택 · ${u.university_name}` : "CareerMatri" };
}

/**
 * 단과대학마다 쓰는 표시의 색조.
 *
 * **뜻을 갖지 않는다.** 단과대학 넷이 한 덩이로 읽히지 않게 갈라 두는
 * 것이고, 순위도 우선순위도 아니다.
 */
const TONES: ("b" | "c" | "v" | "w")[] = ["b", "w", "v", "c"];
const ICONS: IconName[] = ["layers", "grid", "building", "box"];

/**
 * 그 학과 칸에 적는 한 줄.
 *
 * **학과 소개를 지어내지 않는다.** 우리가 아는 것은 그 학과가 어느 Major
 * Core 로 가는가뿐이고, 학과가 무엇을 가르치는지는 학교가 적는 글이다.
 * 그래서 적는 것은 지금 검사가 할 수 있는 일과 아직 할 수 없는 까닭이다.
 */
function leadOf(u: CampusUniversity, dept: CampusDepartment): string | undefined {
  if (statusOf(u, dept) === "READY") {
    return "해 본 일과 직접 판단한 경험을 읽어 지금 설명할 수 있는 것과"
      + " 아직 부족한 부분을 정리합니다.";
  }
  /* **같은 말을 열 번 적지 않는다.** 준비 중인 까닭은 학과마다 같아서,
     칸마다 되풀이하면 열 칸이 기계가 찍어 낸 표로 읽히고 **정작 다른
     부분(어느 전공으로 이어지는가)이 묻힌다.** 까닭은 쪽 머리가 한 번
     적고 칸에는 그 학과에만 맞는 줄만 남긴다 */
  if (!dept.core_code) {
    return "어느 전공 검사로 이을지 학교와 확인하고 있습니다.";
  }
  return undefined;
}

/** 어느 전공 검사로 이어지는가. **안쪽 코드를 적지 않는다** */
function coreLine(dept: CampusDepartment): string | null {
  const core = coreOf(dept);
  if (!core) return null;
  const spec = specializationName(dept);
  return `CareerMatri ${core.name_ko}${spec ? ` · ${spec}` : ""}`;
}

/**
 * 학과 선택.
 *
 * **학과 이름을 이 쪽에 적지 않는다**(규격 §7). 단과대학과 학과와 그
 * 학과가 가는 Core 는 전부 등록부(`campus-universities.json`)에 있고 이
 * 쪽은 그것을 그린다. 그래서 두 번째 학교를 붙이는 일이 **파일 한 벌을
 * 더하는 일**이 된다.
 *
 * **준비 중인 학과는 눌러도 들어가지 않는다**(규격 §6). 칸을 꺼 두는 것은
 * 안내이고, 막는 것은 학과 상세 쪽이 상태를 다시 보는 자리다: 주소를
 * 손으로 쳐도 거절한다.
 */
export default async function CampusMajors({ params }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  if (!u) notFound();
  const code = u.university_code.toLowerCase();

  return (
    <CampusShell u={u} wide>
      <CmHead
        kicker={`${u.university_name} 전용 진입`}
        title="학과를 선택해주세요"
        lead={"학과에 따라 살펴보는 경험과 기술 분야가 달라집니다."
          + " 준비 중인 학과는 문항과 산업 자료를 준비하고 있어 지금"
          + " 응시할 수 없습니다."}
      />

      {u.colleges.map((college, i) => (
        <section key={college.code}>
          <SectionHeader
            icon={ICONS[i % ICONS.length]}
            tone={i % 2 ? "c" : undefined}
            title={college.name}
            sub={college.note ? "소속 단과대학을 학교 확인 뒤에 적습니다."
              : `학과 ${college.departments.length}개`}
          />
          <PickGrid cols={3}>
            {college.departments.map((dept) => {
              const ready = statusOf(u, dept) === "READY";
              return (
                <PickCard
                  key={dept.code}
                  href={ready ? `/campus/${code}/d/${dept.code}` : undefined}
                  disabled={!ready}
                  icon="compass"
                  tone={TONES[i % TONES.length]}
                  title={dept.name}
                  tag={ready ? "검사 가능" : "준비 중"}
                  lead={leadOf(u, dept)}
                  meta={coreLine(dept)}
                  cta={ready ? "이 학과로 보기" : undefined}
                  strong={ready}
                />
              );
            })}
          </PickGrid>
        </section>
      ))}
    </CampusShell>
  );
}
