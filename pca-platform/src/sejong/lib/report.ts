/**
 * 결과지 한 벌의 재료를 모은다. 본인 미리보기 · PDF · 상담사 열람이 같은 함수를 쓴다.
 */
import { queryOne } from "@/lib/db";
import type { Result } from "./analysis";
import { auxAllowed, experienceRows, latestScored, responsesOf, type ExperienceRow } from "./store";

export type ReportProps = {
  attemptId: string;
  r: Result;
  /** 제출 때의 응답. 결과지가 문항마다 고른 답을 그대로 옮긴다 */
  responses: Record<string, number>;
  name: string;
  participantNo: string | null;
  programName: string;
  scoredAt: string;
  experiences: ExperienceRow[];
  auxAllowed: boolean;
};

export async function loadReport(userId: number): Promise<ReportProps | null> {
  const att = await latestScored(userId);
  if (!att?.result) return null;
  const who = await queryOne<{ display_name: string; participant_no: string | null; name: string | null }>(
    `SELECT u.display_name, p.participant_no, g.name
       FROM users u
       LEFT JOIN sj_participants p ON p.user_id = u.id
       LEFT JOIN sj_programs g ON g.code = p.program_code
      WHERE u.id = $1`, [userId]);
  return {
    attemptId: att.id,
    r: att.result,
    responses: await responsesOf(att.id),
    name: who?.display_name ?? "-",
    participantNo: who?.participant_no ?? null,
    programName: who?.name ?? att.program_code,
    scoredAt: att.scored_at ?? att.started_at,
    experiences: await experienceRows(userId),
    auxAllowed: await auxAllowed(att.program_code, att.result.profile),
  };
}
