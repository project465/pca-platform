/**
 * KUS 학생 한 사람의 자료를 **한 자리에서** 모은다. 홈 · 결과 · 리포트가
 * 같은 함수를 부르므로 세 화면이 다른 응시를 읽는 일이 없다.
 *
 * 묻는 차례는 제품 PDF 경로와 같다: 그 응시가 이 사람의 것인가
 * (`attemptOf` 가 남의 응시면 `null`) → 결과가 굳었는가. 하나를 더 본다:
 * **그 응시가 KUS 학교 맥락으로 열린 것인가.** 다른 기관에서 연 응시를 이
 * 묶음으로 그리면 남의 학교 이름이 머리에 선다.
 */
import { query, queryOne } from "@/lib/db";
import { attemptOf, latestResult, answersOf } from "@/lib/me-v3/runtime/session";
import { experiencesOf } from "@/lib/me-v3/platform";
import { majorNameOf } from "@/lib/me-v3/major-name";
import type { ResultModel } from "@/lib/me-v3/result/model";
import { findLeaf } from "@/lib/campus/registry";
import { kusAnalysis, type KusAnalysis } from "./analysis";
import { deptMode, KUS_CODE, kusUniversity } from "./program";
import { visitsOf, type Visit } from "./visits";

export type KusAttemptRow = {
  id: string; status: string; tier: string; core_code: string;
  department_code: string | null; started_at: string; submitted_at: string | null;
};

/** 그 사람의 KUS 응시. 최근 것이 앞이다 */
export async function kusAttempts(userId: string): Promise<KusAttemptRow[]> {
  return query<KusAttemptRow>(
    `SELECT id::text, status, tier, core_code, department_code,
            to_char(started_at, 'YYYY-MM-DD') AS started_at,
            to_char(submitted_at, 'YYYY-MM-DD') AS submitted_at
       FROM v3_attempts
      WHERE user_id = $1::bigint AND university_code = $2
      ORDER BY id DESC`, [userId, KUS_CODE]);
}

export type KusRefusal = "NOT_FOUND" | "NOT_KUS" | "NOT_SCORED" | "NO_REGISTRY";

export type KusBundle = {
  attemptId: string; model: ResultModel; analysis: KusAnalysis; visits: Visit[];
  resultAt: string | null; answered: number; test: boolean;
};

/** 테스트 학생인가. 시연 시드가 `[테스트]` 이름과 `is_demo` 로 표시한다 */
async function isTestUser(userId: string): Promise<boolean> {
  const r = await queryOne<{ t: boolean }>(
    `SELECT (is_demo OR display_name LIKE '[테스트]%') AS t FROM users WHERE id = $1::bigint`, [userId]);
  return r?.t === true;
}

export async function kusBundle(
  userId: string, attemptId: string,
): Promise<{ ok: true; value: KusBundle } | { ok: false; why: KusRefusal }> {
  const u = kusUniversity();
  if (!u) return { ok: false, why: "NO_REGISTRY" };
  const a = await attemptOf(attemptId, userId);
  if (!a) return { ok: false, why: "NOT_FOUND" };
  if (a.university_code !== KUS_CODE) return { ok: false, why: "NOT_KUS" };
  const model = await latestResult(attemptId);
  if (!model) return { ok: false, why: "NOT_SCORED" };
  const found = a.department_code ? findLeaf(u, a.department_code) : null;
  const [who, visits, exps, at, answers] = await Promise.all([
    queryOne<{ name: string }>(`SELECT display_name AS name FROM users WHERE id = $1::bigint`, [userId]),
    visitsOf(userId),
    experiencesOf(userId, a.core_code).catch(() => []),
    queryOne<{ at: string }>(
      `SELECT to_char(created_at, 'YYYY-MM-DD') AS at FROM v3_snapshots
        WHERE attempt_id = $1 ORDER BY id DESC LIMIT 1`, [attemptId]),
    answersOf(attemptId),
  ]);
  const test = (await isTestUser(userId)) || visits.some((v) => v.is_test);
  const analysis = kusAnalysis({
    model, visits,
    experiences: exps.map((e) => ({ title: e.title, kind: e.kind, status: e.status })),
    student: {
      name: who?.name ?? "학생", university: u.university_name,
      college: found?.college.name ?? "", department: found?.leaf.name ?? a.department_code ?? "",
      core: a.core_code, coreName: majorNameOf(a.core_code) ?? a.core_code,
      mode: deptMode(a.department_code),
    },
  });
  return {
    ok: true,
    value: {
      attemptId, model, analysis, visits, resultAt: at?.at ?? null,
      answered: Object.keys(answers).length, test,
    },
  };
}

/** 가장 최근의 채점된 KUS 응시 번호. 없으면 `null` */
export async function latestScoredKus(userId: string): Promise<string | null> {
  const r = await queryOne<{ id: string }>(
    `SELECT a.id::text FROM v3_attempts a
      WHERE a.user_id = $1::bigint AND a.university_code = $2
        AND EXISTS (SELECT 1 FROM v3_snapshots s WHERE s.attempt_id = a.id AND s.result_model IS NOT NULL)
      ORDER BY a.id DESC LIMIT 1`, [userId, KUS_CODE]);
  return r?.id ?? null;
}
