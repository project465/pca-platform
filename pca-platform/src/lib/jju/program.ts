/**
 * 전주대학교 AI·첨단산업 부트캠프 화면이 읽는 **유일한 자리.**
 *
 * **새 검사를 만들지 않는다.** 전주대 트랙은 학교 등록부의 자리 하나씩이고,
 * 재는 자는 공통 Major Core 다(컴퓨터·소프트웨어 · 전기전자 · 기계공학).
 * 여기서 하는 일은 등록부가 이미 들고 있는 값을 사업단이 읽는 모양으로
 * 다시 묶는 것뿐이다: 기수 → 분야 → 트랙 → 어느 검사로 재는가.
 *
 * **상태를 적어 두지 않고 끌어온다.** 트랙이 지금 실제로 열리는지는
 * `statusOf` 가 정한다. 여기서 따로 적으면 Core 가 열린 날 이 파일이 옛
 * 상태를 들고 있고, 두 자리가 갈리면 `실제 운영` 이라고 적힌 트랙에서 빈
 * 검사가 열린다.
 *
 * **시연과 실제를 한 칸에 섞지 않는다.** 세 갈래로 나눈다.
 *
 * `LIVE`       미리보기 없이도 열린다. 그 검사가 지금 학생에게 열려 있다
 * `DEMO`       이 서버가 미리보기로 연 검사다. **운영에서는 열리지 않는다**
 *              (`previewOpenCores()` 가 운영에서 거절한다)
 * `PREPARING`  열리지 않는다
 *
 * **이 학교는 등록부에 없으면 없다.** 지금 전주대는 시연 fixture 로만
 * 서므로 운영에서는 `jjuUniversity()` 가 `null` 이고 화면이 404 를 낸다.
 */
import { appEnv } from "@/lib/env";
import { core as coreEntry } from "@/lib/me-v3/core-registry";
import {
  allLeaves, catalogsOf, provenanceOf, specializationName, statusOf, university,
  type CampusCatalog, type CampusLeaf, type CampusUniversity,
} from "@/lib/campus/registry";

export const JJU_CODE = "JJU";

export function jjuUniversity(): CampusUniversity | null {
  return university(JJU_CODE);
}

export type TrackMode = "LIVE" | "DEMO" | "PREPARING";

export type JjuTrack = {
  code: string;
  name: string;
  /** `[시연]` 을 뗀 이름. 표 안에서 같은 말을 되풀이하지 않으려고 쓴다 */
  short: string;
  cohort: { code: string; label: string; year: number; status: string };
  field: { code: string; name: string };
  core_code: string | null;
  core_name: string | null;
  spec_name: string | null;
  mode: TrackMode;
  /** 등록부가 적어 둔 까닭. 사업단 화면에만 선다 */
  note: string | null;
  /** 공식 교육과정을 확인했는가. **지금은 전부 아니다** */
  official: boolean;
};

export function modeOf(u: CampusUniversity, row: CampusLeaf): TrackMode {
  if (statusOf(u, row, undefined, { preview: false }) === "READY") return "LIVE";
  if (statusOf(u, row) === "READY") return "DEMO";
  return "PREPARING";
}

const shortName = (s: string) => s.replace(/^\[시연\]\s*/, "");

function coreName(code: string | null | undefined): string | null {
  if (!code) return null;
  try { return coreEntry(code).name_ko; } catch { return null; }
}

export function tracksOf(u: CampusUniversity): JjuTrack[] {
  return allLeaves(u).map((row) => {
    const prov = provenanceOf(row.catalog, row.leaf);
    return {
      code: row.leaf.code,
      name: row.leaf.name,
      short: shortName(row.leaf.name),
      cohort: {
        code: row.catalog.catalog_code, label: row.catalog.label,
        year: row.catalog.catalog_year, status: prov.status,
      },
      field: { code: row.college.code, name: row.college.name },
      core_code: row.leaf.core_code ?? null,
      core_name: coreName(row.leaf.core_code),
      spec_name: specializationName(row.leaf),
      mode: modeOf(u, row),
      note: row.leaf.note ?? null,
      official: prov.verification === "VERIFIED",
    };
  });
}

export function cohortsOf(u: CampusUniversity): CampusCatalog[] {
  return [...catalogsOf(u)].sort((a, b) => a.catalog_year - b.catalog_year);
}

/** 첫 기수의 트랙. 소개 화면은 같은 트랙을 기수마다 되풀이하지 않는다 */
export function firstCohortTracks(u: CampusUniversity): JjuTrack[] {
  const first = cohortsOf(u)[0];
  return tracksOf(u).filter((t) => t.cohort.code === first?.catalog_code);
}

/** 이 서버가 운영이 아닌가. 시연 표시를 세울지 정한다 */
export function demoServer(): boolean {
  return appEnv() !== "production";
}

export const MODE_KO: Record<TrackMode, string> = {
  LIVE: "실제 응시 가능",
  DEMO: "시연 전용",
  PREPARING: "준비 중",
};

export const MODE_NOTE: Record<TrackMode, string> = {
  LIVE: "검사·결과·PDF 가 실제 엔진으로 돕니다. 트랙 자체는 공식 교육과정 확인 전입니다.",
  DEMO: "이 검사는 전공자 검수 전이라 학생에게 닫혀 있고, 이 서버에서만 미리보기로 엽니다. 결과를 실제 진단으로 쓰지 않습니다.",
  PREPARING: "이 서버에서는 열리지 않습니다.",
};
