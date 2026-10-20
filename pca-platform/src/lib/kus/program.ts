/**
 * 고려대학교 세종캠퍼스(KUS) 진입이 읽는 자리.
 *
 * **새 등록부를 만들지 않는다.** 학교·단과대학·학과·Core 길은 공통
 * 등록부(`campus/registry.ts`)가 들고, KUS 는 그 위에 fixture 한 벌로
 * 붙는다(`scripts/fixtures/campus-kus.json`). 그래서 `APP_ENV=production`
 * 에서는 KUS 가 아예 서지 않는다 — 운영 등록부로 옮기는 일은 변경
 * 요청서(KUS-CR-01)다.
 *
 * **상태를 여기서 정하지 않는다.** 학생에게 보이는 `검사 가능` 과
 * `준비 중` 은 `statusOf` 가 Core 의 판매 상태와 그 학교의 여는 자리
 * (`student_open`)에서 끌어온다. 여기 더하는 것은 **시연 표시** 하나다:
 * 미리보기 문(`V3_PREVIEW_OPEN`)으로 열린 Core 는 전공 검수 전이라,
 * 그 결과를 학생 진단으로 쓰지 않는다고 화면과 종이가 적어야 한다.
 */
import {
  allLeaves, leafOpen, statusOf, university, type CampusLeaf, type CampusUniversity,
} from "@/lib/campus/registry";
import { core, previewOpen, sellableCores } from "@/lib/me-v3/core-registry";

export const KUS_CODE = "KUS";
/** KUS 기관 줄의 `organizations.code`. 담당자 소속이 여기에 묶인다 */
export const KUS_ORG_CODE = "KUS";

export function kusUniversity(): CampusUniversity | null {
  return university(KUS_CODE);
}

/**
 * 한 자리가 지금 어떻게 열려 있는가.
 *
 * `LIVE`      운영 규칙으로 열린 자리(그 Core 가 학생에게 열려 있고 학교가 그 자리를 열었다)
 * `DEMO`      미리보기 문으로만 열린 자리. **결과를 진단으로 쓰지 않는다**
 * `PREPARING` 닫혀 있다(Core 없음 · 매핑 판단 전 · Core 가 닫힘)
 */
export type KusMode = "LIVE" | "DEMO" | "PREPARING";

export function modeOf(u: CampusUniversity, row: CampusLeaf): KusMode {
  if (statusOf(u, row) !== "READY") return "PREPARING";
  /* 미리보기 없이도 열리는가. 열리면 운영 규칙으로 선 자리다 */
  const live = statusOf(u, row, undefined, { preview: false }) === "READY";
  if (live) return "LIVE";
  return previewOpen(row.leaf.core_code ?? "") ? "DEMO" : "PREPARING";
}

export type KusDept = {
  code: string; name: string; college: string; unit: string | null;
  core_code: string | null; mode: KusMode; note: string | null;
  /** 교육과정 대조 등급(A·B·C·D·R). 화면에는 `COMPAT_KO` 로만 선다 */
  compat: string | null;
  /** 그 자리가 가리키는 전공 검사의 이름. 담당자 표에 Core 코드를 적지 않으려고 둔다 */
  core_name: string | null;
};

/** 교육과정 대조 등급의 사람 말. 리포트와 담당자 표가 같은 표를 읽는다 */
export const COMPAT_KO: Record<string, string> = {
  A: "A · 바로 쓸 수 있음",
  B: "B · 보완하면 쓸 수 있음",
  C: "C · 전공 자료가 더 필요함",
  D: "D · 지금은 검사 없음",
  R: "R · 전공을 고르는 모집단위",
};

/** 학생 화면의 검사 이름. Core 코드와 등급을 적지 않는다. 등록부에 없으면 `전공 검사` */
export function examNameOf(code: string | null | undefined): string {
  const n = coreName(code);
  return n ? `${n} 검사` : "전공 검사";
}

function coreName(code: string | null | undefined): string | null {
  if (!code) return null;
  /* 등록부에 없는 코드면 이름을 지어내지 않고 비운다(표는 `연결한 검사 없음` 으로 선다) */
  try { return core(code).name_ko; } catch { return null; }
}

/** 학과 목록. 화면과 담당자 표가 같은 줄을 읽는다 */
export function kusDepartments(u = kusUniversity()): KusDept[] {
  if (!u) return [];
  return allLeaves(u)
    .filter((r) => r.leaf.student_visible !== false)
    .map((r) => ({
      code: r.leaf.code,
      name: r.leaf.name,
      college: r.college.name,
      unit: r.unit.code !== r.leaf.code ? r.unit.name : null,
      core_code: r.leaf.core_code ?? null,
      mode: modeOf(u, r),
      note: r.leaf.note ?? null,
      compat: (r.leaf as { compat?: string }).compat ?? null,
      core_name: coreName(r.leaf.core_code),
    }));
}

/** 그 학과 코드의 지금 상태. 등록부에 없으면 `PREPARING` */
export function deptMode(code: string | null | undefined): KusMode {
  const u = kusUniversity();
  if (!u || !code) return "PREPARING";
  const row = allLeaves(u).find((r) => r.leaf.code === code);
  return row ? modeOf(u, row) : "PREPARING";
}

/** 운영 규칙으로 열 수 있는 Core 가운데 KUS 가 연 자리 수(담당자 표) */
export function kusLiveCount(u = kusUniversity()): number {
  if (!u) return 0;
  const open = new Set(sellableCores(u.market_code, undefined, { preview: false }).map((c) => c.code));
  return allLeaves(u).filter((r) => open.has(r.leaf.core_code ?? "") && leafOpen(u, r.leaf)).length;
}

export const MODE_KO: Record<KusMode, string> = {
  LIVE: "검사 가능",
  DEMO: "시연 전용",
  PREPARING: "준비 중",
};
