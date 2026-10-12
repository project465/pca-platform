import { notFound } from "next/navigation";
import "../../../surface.css";
import "../../campus.css";
import {
  coreOf, specializationName, statusOf, university, visible,
  type CampusLeaf, type CampusUnit, type CampusUniversity,
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
 * **뜻을 갖지 않는다.** 단과대학 여섯이 한 덩이로 읽히지 않게 갈라 두는
 * 것이고, 순위도 우선순위도 아니다.
 */
const TONES: ("b" | "c" | "v" | "w")[] = ["b", "w", "v", "c"];
const ICONS: IconName[] = ["layers", "grid", "building", "box"];

/**
 * 그 자리에 적는 한 줄.
 *
 * **학과 소개를 지어내지 않는다.** 우리가 아는 것은 그 학과가 어느 Major
 * Core 로 가는가까지이고, 학과가 무엇을 가르치는지는 학교가 적는 글이다.
 * 그래서 적는 것은 지금 할 수 있는 일과 아직 할 수 없는 까닭이다.
 *
 * **같은 말을 마흔 번 적지 않는다.** 준비 중인 까닭이 대부분 같아서,
 * 칸마다 되풀이하면 목록이 기계가 찍어 낸 표로 읽히고 정작 다른 부분이
 * 묻힌다. 까닭은 쪽 머리가 한 번 적고, 칸에는 그 자리에만 맞는 줄만 남긴다.
 */
function leadOf(u: CampusUniversity, leaf: CampusUnit): string | undefined {
  if (statusOf(u, leaf) === "READY") {
    return "해 본 일과 직접 판단한 경험을 읽어 지금 설명할 수 있는 것과"
      + " 아직 부족한 부분을 정리합니다.";
  }
  if (leaf.routing_only) {
    return "전공을 정한 뒤에 그 전공으로 시작합니다.";
  }
  if (leaf.unverified_majors) {
    return "전공 목록을 학교와 확인하고 있습니다.";
  }
  /* **Core 가 아직 없는 자리에 같은 문장을 스물네 번 적지 않는다.**
     준비 중인 까닭은 쪽 머리가 한 번 적었고, 칸마다 되풀이하면 목록이
     기계가 찍어 낸 표로 읽힌다 */
  return undefined;
}

/** 어느 전공 검사로 이어지는가. **안쪽 코드를 적지 않는다** */
function coreLine(leaf: CampusUnit): string | null {
  const core = coreOf(leaf);
  if (!core) return null;
  const spec = specializationName(leaf);
  return `CareerMatri ${core.name_ko}${spec ? ` · ${spec}` : ""}`;
}

function Tile({ u, code, row, tone }: {
  u: CampusUniversity; code: string; row: CampusLeaf;
  tone: "b" | "c" | "v" | "w";
}) {
  const ready = statusOf(u, row.leaf) === "READY";
  return (
    <PickCard
      href={ready ? `/campus/${code}/d/${row.leaf.code}` : undefined}
      disabled={!ready}
      icon="compass"
      tone={tone}
      title={row.leaf.name}
      tag={ready ? "검사 가능" : "준비 중"}
      lead={leadOf(u, row.leaf)}
      meta={coreLine(row.leaf)}
      cta={ready ? "이 학과로 보기" : undefined}
      strong={ready}
    />
  );
}

/**
 * 학과 선택.
 *
 * **학과 이름을 이 쪽에 적지 않는다**(규격 §7). 단과대학과 학부와 전공과
 * 그 자리가 가는 Core 는 전부 등록부에 있고 이 쪽은 그것을 그린다. 그래서
 * 두 번째 학교를 붙이는 일이 **파일 한 벌을 더하는 일**이 된다.
 *
 * **학부와 전공을 한 칸으로 뭉개지 않는다**(규격 §2). 학부를 고르게 두면
 * 그 학생이 어느 전공으로 재어졌는지 아무도 모른다.
 *
 * **준비 중인 학과는 눌러도 들어가지 않는다**(규격 §5·§9). 칸을 꺼 두는
 * 것은 안내이고, 막는 것은 학과 상세 쪽과 시작 처리가 상태를 다시 보는
 * 자리다: 주소를 손으로 쳐도 거절한다.
 */
export default async function CampusMajors({ params }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  if (!u) notFound();
  const code = u.university_code.toLowerCase();

  /**
   * **검사 가능한 자리를 위로 올린다**(규격 §9). 지금 할 수 있는 것이
   * 있으면 그것이 먼저다.
   *
   * **같은 학과를 두 번 세우지 않는다.** 맨 위에 따로 모으면 그 칸이
   * 자기 단과대학에도 한 번 더 서고, 읽는 사람은 둘이 다른 것인 줄
   * 안다. 차례만 바꾼다: 검사 가능한 자리가 있는 단과대학이 앞에 서고,
   * 그 안에서도 검사 가능한 칸이 앞이다.
   */
  const isReady = (leaf: CampusUnit) => statusOf(u, leaf) === "READY";
  const first = <T, >(xs: T[], on: (x: T) => boolean) =>
    [...xs].sort((a, b) => Number(on(b)) - Number(on(a)));
  const colleges = first(u.colleges, (c) =>
    c.units.some((x) => (x.majors ?? [x]).some(isReady)));

  return (
    <CampusShell u={u} wide>
      <CmHead
        kicker={`${u.university_name} 전용 진입`}
        title="학과를 선택해주세요"
        lead={"학과에 따라 살펴보는 경험과 기술 분야가 달라집니다."
          + " 준비 중인 학과는 문항과 산업 자료를 준비하고 있어 지금"
          + " 응시할 수 없습니다."}
      />

      {colleges.map((college, i) => {
        const tone = TONES[i % TONES.length];
        const plain = first(college.units
          .filter((x) => !x.majors?.length && visible(x)), isReady)
          .map((leaf) => ({ college, unit: leaf, leaf }));
        const faculties = college.units.filter((x) => x.majors?.length);
        if (!plain.length && !faculties.length) return null;
        return (
          <section key={college.code} id={college.code}>
            <SectionHeader
              icon={ICONS[i % ICONS.length]}
              tone={i % 2 ? "c" : undefined}
              title={college.name}
            />
            {plain.length ? (
              <PickGrid cols={3}>
                {plain.map((r) => (
                  <Tile key={r.leaf.code} u={u} code={code} row={r} tone={tone} />
                ))}
              </PickGrid>
            ) : null}
            {faculties.map((f) => (
              <section key={f.code}>
                {/* 학부 이름은 묶음 머리로 서고, 고르는 자리는 그 아래
                    전공이다 */}
                <h3 className="cm-sub-h">{f.name}</h3>
                <PickGrid cols={3}>
                  {first((f.majors ?? []).filter(visible), isReady).map((leaf) => (
                    <Tile key={leaf.code} u={u} code={code}
                      row={{ college, unit: f, leaf }} tone={tone} />
                  ))}
                </PickGrid>
              </section>
            ))}
          </section>
        );
      })}
    </CampusShell>
  );
}
