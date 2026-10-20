/**
 * KUS 화면 하나를 그리는 데 필요한 것을 **한 번에** 모은다. 쪽마다 같은
 * 쿼리를 따로 적으면 홈과 결과가 다른 응시를 읽는 날이 온다.
 */
import { queryOne } from "@/lib/db";
import { campusAttemptState } from "@/lib/campus/attempt-state";
import { answersOf } from "@/lib/me-v3/runtime/session";
import type { SessionUser } from "@/lib/session";
import type { KusStudent } from "./access";
import { kusBundle, latestScoredKus, type KusBundle } from "./load";
import { findLeaf } from "@/lib/campus/registry";
import { deptMode, kusUniversity, type KusMode } from "./program";
import { visitPrograms, visitsOf, type Visit, type VisitProgram } from "./visits";
import type { AttemptState } from "./home";

export type KusWorkspace = {
  name: string; dept: string; college: string; mode: KusMode; test: boolean;
  st: AttemptState; bundle: KusBundle | null; visits: Visit[]; programs: VisitProgram[];
};

export async function kusWorkspace(user: SessionUser, me: KusStudent): Promise<KusWorkspace> {
  const [raw, scored, visits, programs, who] = await Promise.all([
    campusAttemptState(user.id), latestScoredKus(user.id), visitsOf(user.id), visitPrograms(),
    queryOne<{ name: string; test: boolean }>(
      `SELECT display_name AS name, (is_demo OR display_name LIKE '[테스트]%') AS test
         FROM users WHERE id = $1::bigint`, [user.id]),
  ]);
  const st: AttemptState = raw.kind === "resume"
    ? { kind: "resume", attemptId: raw.attemptId, answered: Object.keys(await answersOf(raw.attemptId)).length }
    : raw;
  const b = scored ? await kusBundle(user.id, scored) : null;
  return {
    name: who?.name ?? user.name, dept: me.department_name,
    college: collegeName(me),
    mode: deptMode(me.row.department_code), test: who?.test === true,
    st, bundle: b && b.ok ? b.value : null, visits, programs,
  };
}

function collegeName(me: KusStudent): string {
  const u = kusUniversity();
  return (u && findLeaf(u, me.row.department_code)?.college.name) ?? "";
}
