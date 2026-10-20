/**
 * 전주대학교 인공지능학과 × AI 부트캠프 화면이 읽는 **유일한 자리.**
 *
 * **새 검사를 만들지 않는다.** 학과와 과정은 학교 등록부의 자리 하나씩이고,
 * 재는 자는 공통 Major Core 다(컴퓨터·소프트웨어 검사의 인공지능·데이터 갈래).
 * 여기서 하는 일은 등록부가 이미 들고 있는 값을 학생과 사업단이 읽는 모양으로
 * 다시 묶는 것뿐이다: 학과 또는 과정 → 어느 검사로 재는가.
 *
 * **학과와 과정을 한 목록에 섞지 않는다.** 인공지능학과는 학생의 소속이고
 * 부트캠프 과정은 사업단이 운영하는 교육이다. 등록부에서 둘 다 `자리` 이지만
 * 화면은 `kind` 로 갈라 세운다.
 *
 * **상태를 적어 두지 않고 끌어온다.** 학과·과정이 지금 실제로 열리는지는
 * `statusOf` 가 정한다. 여기서 따로 적으면 Core 가 열린 날 이 파일이 옛
 * 상태를 들고 있고, 두 자리가 갈리면 `실제 운영` 이라고 적힌 자리에서 빈
 * 검사가 열린다.
 *
 * **시연과 실제를 한 칸에 섞지 않는다.** 세 갈래로 나눈다.
 *
 * `LIVE`       미리보기 없이도 열린다. 그 검사가 지금 학생에게 열려 있다
 * `DEMO`       이 서버가 미리보기로 연 검사다. **운영에서는 열리지 않는다**
 *              (`previewOpenCores()` 가 운영에서 거절한다)
 * `PREPARING`  열리지 않는다
 *
 * **사업 사실과 검사 자리를 두 층으로 둔다.** `officialProgram()` 은 출처와
 * 확인 날짜와 상태가 붙은 사업 사실(선정 · 기간 · 사업비 · 운영 방식 · 실제
 * 과정)이고, `tracksOf()` 는 등록부의 자리(인공지능학과 · 부트캠프 과정)를
 * 어느 검사로 재는가다. 이름은 옛 시연 트랙 시절의 것을 그대로 둔다(부르는
 * 곳이 많다). 화면은 둘을 한 목록에 섞지 않는다.
 *
 * **이 학교는 등록부에 없으면 없다.** 지금 전주대는 시연 fixture 로만
 * 서므로 운영에서는 `jjuUniversity()` 가 `null` 이고 화면이 404 를 낸다.
 */
import { appEnv } from "@/lib/env";
import { coverageOf, type CapStatus } from "@/lib/jju/coverage";
import { core as coreEntry } from "@/lib/me-v3/core-registry";
import {
  allLeaves, catalogsOf, provenanceOf, specializationName, statusOf, university,
  type CampusCatalog, type CampusLeaf, type CampusUniversity,
} from "@/lib/campus/registry";

export const JJU_CODE = "JJU";

export function jjuUniversity(): CampusUniversity | null {
  return university(JJU_CODE);
}

export type FactStatus = "CONFIRMED_BY_OWNER" | "EXISTS_DETAIL_UNVERIFIED" | "VERIFIED";

export type OfficialProgram = {
  name: string;
  checked_on: string;
  verification: string;
  verification_note: string;
  sources: { id: string; kind: string; title: string; url: string }[];
  facts: {
    id: string; text: string; source: string; status: FactStatus; caution?: string;
    /** 학생 화면에 서는 말(해요체). 없으면 `text` */
    say?: string;
    /** 학생 화면에 바로 붙는 한 줄. 검수 기록(`caution`)과 다르다 */
    note?: string;
  }[];
  courses: { code: string; name: string; topics: string[]; source: string; status: FactStatus }[];
};

/**
 * 공식 출처가 붙은 사업 사실. **등록부 정본에는 없는 칸이라 fixture 만 든다.**
 * 칸이 없으면 `null` 이고 화면은 그 절을 세우지 않는다(지어내지 않는다).
 */
export function officialProgram(u: CampusUniversity): OfficialProgram | null {
  const p = (u as unknown as { official_program?: OfficialProgram }).official_program;
  return p && Array.isArray(p.facts) ? p : null;
}

/**
 * 전북·전국 산업 사실(R3 Track B). 출처 URL 과 확인 방식이 함께 온다.
 * **지금 줄은 전부 검색 결과만으로 적은 것이다**(원문을 열지 못함). 화면과 종이는 그 사실을 함께 적는다.
 */
export type RegionFactRow = {
  id: string; claim: string; status: "FACT" | "INTERPRETATION" | "RECOMMENDATION";
  url: string; how: string; tracks: string[]; checked_on: string;
};
export function regionFacts(u: CampusUniversity): RegionFactRow[] {
  const p = (u as unknown as { region_facts?: { facts?: RegionFactRow[] } }).region_facts;
  return Array.isArray(p?.facts) ? p!.facts! : [];
}

export const FACT_STATUS_KO: Record<FactStatus, string> = {
  VERIFIED: "원문 대조",
  CONFIRMED_BY_OWNER: "공식 출처 · 사업주 확인",
  EXISTS_DETAIL_UNVERIFIED: "있음 · 세부 미확인",
};

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
  /** 학과(학생의 소속)인가, 사업단 과정인가 */
  kind: "DEPARTMENT" | "COURSE";
  /** 이 자리에 거는 지역·산업 사실의 낱말. fixture 만 든다(정본 등록부에는 없는 칸) */
  region_tags: string[];
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
      kind: row.leaf.kind === "track" ? "COURSE" : "DEPARTMENT",
      region_tags: (row.leaf as { region_tags?: string[] }).region_tags ?? [],
    };
  });
}

export function cohortsOf(u: CampusUniversity): CampusCatalog[] {
  return [...catalogsOf(u)].sort((a, b) => a.catalog_year - b.catalog_year);
}

/** 첫 학년도의 자리. 소개 화면은 같은 자리를 학년도마다 되풀이하지 않는다 */
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
  DEMO: "시연 서버 전용",
  PREPARING: "준비 중",
};

export const MODE_NOTE: Record<TrackMode, string> = {
  LIVE: "검사·결과·PDF 가 실제 엔진으로 돕니다.",
  DEMO: "이 검사는 전공자 검수 전이라 학생에게 닫혀 있고, 이 서버에서만 미리보기로 엽니다. 결과를 실제 진단으로 쓰지 않습니다.",
  PREPARING: "아직 열리지 않습니다. 어느 검사로 잴지 정해지지 않았거나 그 검사가 닫혀 있습니다.",
};

/**
 * 부트캠프 과정 주제마다 **그 과정을 재는 검사가 실제로 묻는가.**
 *
 * 과정을 재는 검사는 등록부의 과정 자리가 든 Core 이고, 셈은 `coverageOf()`
 * 가 문항 번호로 한다(리포트와 같은 함수 · 설계 원칙 10). 여기서는 과정이
 * 다루는 주제로 좁혀 사람이 읽는 말만 붙인다. 주제가 확인되지 않은 과정은
 * 줄을 만들지 않는다(지어내지 않는다).
 */
export function courseCoverage(u: CampusUniversity): {
  course: string; core_name: string | null; spec_name: string | null;
  rows: { topic: string; status: CapStatus; how: string }[];
}[] {
  const p = officialProgram(u);
  if (!p) return [];
  const leaves = tracksOf(u).filter((t) => t.kind === "COURSE" && t.core_code);
  return p.courses.filter((c) => c.topics.length).flatMap((c) => {
    const leaf = leaves.find((t) => t.name.includes(c.name) || c.name.includes(t.name));
    if (!leaf?.core_code) return [];
    const cells = coverageOf(leaf.core_code, c.topics);
    const rows = c.topics.map((topic) => {
      const cell = cells.find((x) => x.cap.course === topic);
      const status: CapStatus = cell?.status ?? "NOT_MEASURED";
      const how = status === "MEASURED" ? `판정 문항 ${cell!.core.length + cell!.pack.length}개가 직접 묻는다`
        : status === "SELF_REPORT" ? "판정 문항은 없고, 스스로 답하는 격자·체크리스트 문구에만 나온다"
        : status === "CURRICULUM" ? "과정이 다루지만 어느 문항도 묻지 않는다. 이수만으로 역량을 확인했다고 적지 않는다"
        : "검사가 묻지 않는다";
      return { topic, status, how };
    });
    return [{ course: c.name, core_name: leaf.core_name, spec_name: leaf.spec_name, rows }];
  });
}
