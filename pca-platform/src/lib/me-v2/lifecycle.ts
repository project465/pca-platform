/**
 * 개인 첫 화면이 ME_V2 에서 읽는 상태.
 *
 * 여섯 칸이고 **순서가 곧 우선순위**다. 화면마다 if 를 쌓으면 화면이 늘 때
 * 판단이 복사되고, 복사된 것 중 하나가 틀리면 산 사람이 자기 결과지를 못
 * 찾는다(설계 원칙 10 과 같은 이유다).
 *
 *   none          아직 안 샀다            → 가격표
 *   purchased     샀는데 시작하지 않았다   → 검사 시작
 *   progress      풀고 있다               → 이어서
 *   evidence      다 풀었고 경험이 비었다  → 경험 적기
 *   generating    낼 수 있는데 아직 안 냈다 → 결과지 만들기
 *   done          결과지가 있다            → 결과지 열기
 *
 * **'경험이 비었다' 를 결과지 앞에 두지 않는다.** 경험을 안 적어도 결과지는
 * 나가야 하므로 `evidence` 는 막는 칸이 아니라 **권하는 칸**이고, 그 상태에서도
 * 결과지를 만드는 길이 함께 있다.
 */
import { queryOne } from "@/lib/db";
import { currentV2, openGrants, progressOf, type V2Attempt } from "./attempt";
import { isEmpty, profileOf } from "./evidence";
import { latestSnapshot } from "./render";

export type V2State =
  | { kind: "none" }
  | { kind: "purchased"; tier: string; grants: number }
  | {
      kind: "progress"; attemptId: string; tier: string; stage: string;
      answered: number; total: number; percent: number; section: string | null;
    }
  | { kind: "evidence"; attemptId: string; tier: string }
  | { kind: "generating"; attemptId: string; tier: string; failedAt: string | null }
  | {
      kind: "done"; attemptId: string; tier: string; snapshotId: string;
      generatedAt: string; evidenceItems: number; hasPdf: boolean;
    };

export async function v2State(userId: string): Promise<V2State> {
  /* 가장 최근에 제출된 응시가 가장 쓸모 있는 상태다. 아직 안 끝낸 응시보다
     결과지 쪽을 먼저 보여 준다: 들어오는 이유가 보통 그것이다 */
  const sub = await queryOne<{ id: string; tier: string }>(
    `SELECT id::text, tier FROM attempts
      WHERE user_id = $1 AND assessment_version = 'ME_V2'
        AND submitted_at IS NOT NULL
      ORDER BY submitted_at DESC LIMIT 1`,
    [userId],
  ).catch(() => null);

  if (sub) {
    const snap = await latestSnapshot(sub.id);
    const prof = await profileOf(userId);
    if (snap) {
      const { countOf } = await import("./evidence");
      const c = countOf(prof);
      return {
        kind: "done", attemptId: sub.id, tier: sub.tier,
        snapshotId: snap.id, generatedAt: String(snap.generated_at).slice(0, 16),
        evidenceItems: c.items + c.research, hasPdf: !!snap.pdf_path,
      };
    }
    /* 결과지가 없다. 경험부터 권하는 자리인지, 바로 만드는 자리인지 */
    if (isEmpty(prof)) {
      return { kind: "evidence", attemptId: sub.id, tier: sub.tier };
    }
    const fail = await queryOne<{ created_at: string }>(
      `SELECT created_at::text FROM job_failures
        WHERE attempt_id = $1 AND kind = 'result' AND resolved_at IS NULL
        ORDER BY created_at DESC LIMIT 1`,
      [sub.id],
    ).catch(() => null);
    return {
      kind: "generating", attemptId: sub.id, tier: sub.tier,
      failedAt: fail?.created_at ? String(fail.created_at).slice(0, 16) : null,
    };
  }

  const cur: V2Attempt | null = await currentV2(userId);
  if (cur) {
    const p = await progressOf(cur);
    const at = p.sections[p.resumeSection];
    return {
      kind: "progress", attemptId: cur.id, tier: cur.tier,
      stage: cur.education_stage,
      answered: p.answered, total: p.total, percent: p.percent,
      section: at?.key ?? null,
    };
  }

  const grants = await openGrants(userId);
  if (grants.length) {
    return { kind: "purchased", tier: grants[0].tier, grants: grants.length };
  }
  return { kind: "none" };
}
