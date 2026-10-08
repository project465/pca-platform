"use server";

import { requireUser } from "@/lib/session";
import {
  attemptOf, choosePack, moveTo, planFor, saveAnswer, saveNote, savePicks, submit,
} from "@/lib/me-v3/runtime/session";
import { setProfile } from "@/lib/me-v3/runtime/session";
import type { Answer, GradField, Stage } from "@/lib/me-v3/scoring/types";

const STAGES: Stage[] = ["bachelor", "master", "phd", "postdoc"];
const FIELDS: GradField[] =
  ["STEM", "HUMANITIES_SOCIAL", "BUSINESS", "OTHER_INTERDISCIPLINARY"];

/**
 * 응시 화면이 서버에 쓰는 자리 전부.
 *
 * **주인 확인을 서버가 한다.** 화면이 보낸 응시 번호를 믿지 않고
 * `attemptOf` 가 `user_id` 로 다시 거른다. 남의 번호를 넣으면 아무것도
 * 쓰이지 않고 거짓이 돌아온다.
 *
 * **응답을 되돌려 보내지 않는다.** 화면이 이미 들고 있고, 되돌려 보내면
 * 늦게 도착한 응답 하나가 방금 고친 답을 덮어쓴다. 돌려보내는 것은
 * 들어왔는지와, 끝났는지뿐이다.
 *
 * **끝난 응시에는 쓰지 않는다.** 제출한 뒤에도 쓰이게 두면 그때 낸
 * 판정과 응답이 어긋난다. 등급을 올리면 `upgradeTier` 가 다시 연다.
 */
async function mine(attemptId: string) {
  const user = await requireUser();
  const a = await attemptOf(attemptId, user.id);
  if (!a || a.status !== "in_progress") return null;
  return a;
}

export async function answerAction(
  attemptId: string, itemId: string, a: Answer,
): Promise<{ ok: boolean }> {
  const at = await mine(attemptId);
  if (!at) return { ok: false };
  await saveAnswer(attemptId, itemId, a);
  return { ok: true };
}

export async function noteAction(
  attemptId: string, itemId: string, text: string,
): Promise<{ ok: boolean }> {
  const at = await mine(attemptId);
  if (!at) return { ok: false };
  await saveNote(attemptId, itemId, text);
  return { ok: true };
}

/**
 * 학업 단계와 계열을 고친다. **묻는 장면만 달라지고 판정 기준은 같다.**
 *
 * 앞에서 답한 것을 지우지 않는다: 계열을 바꾸면 전에 받던 분기 묶음의
 * 응답이 읽히지 않을 뿐이고, 되돌리면 그대로 쓰인다.
 */
export async function profileAction(
  attemptId: string, stage: string, field: string | null,
): Promise<{ ok: boolean }> {
  const at = await mine(attemptId);
  if (!at) return { ok: false };
  if (!STAGES.includes(stage as Stage)) return { ok: false };
  const f = FIELDS.includes((field ?? "") as GradField) ? (field as GradField) : null;
  if (stage !== "bachelor" && !f) return { ok: false };
  await setProfile(attemptId, stage as Stage, f);
  return { ok: true };
}

export async function picksAction(
  attemptId: string, domain: string, slot: string, items: string[],
): Promise<{ ok: boolean }> {
  const at = await mine(attemptId);
  if (!at) return { ok: false };
  await savePicks(attemptId, domain, slot, items);
  return { ok: true };
}

export async function packAction(
  attemptId: string, kind: "industry" | "role", code: string,
): Promise<{ ok: boolean }> {
  const at = await mine(attemptId);
  if (!at) return { ok: false };
  try { await choosePack(attemptId, kind, code); } catch { return { ok: false }; }
  return { ok: true };
}

/** 이어보기 자리를 옮긴다. **주소의 수가 아니라 화면 이름으로 적는다** */
export async function cursorAction(
  attemptId: string, index: number,
): Promise<{ ok: boolean }> {
  const at = await mine(attemptId);
  if (!at) return { ok: false };
  const plan = await planFor(at);
  const s = plan.screens[index];
  if (!s) return { ok: false };
  await moveTo(attemptId, s.id);
  return { ok: true };
}

/**
 * 제출하고 판정 한 줄을 적는다.
 *
 * **결과 화면을 여기서 열지 않는다.** 이 회차는 판정을 만들어 두는
 * 데까지다. 결과지는 디자인 승인 뒤에 붙는다.
 */
export async function finishAction(attemptId: string): Promise<{ ok: boolean }> {
  const at = await mine(attemptId);
  if (!at) return { ok: false };
  await submit(at);
  return { ok: true };
}
