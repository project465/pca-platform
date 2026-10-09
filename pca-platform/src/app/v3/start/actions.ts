"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  currentAttempt, openAttempt, setProfile, v3Grants,
} from "@/lib/me-v3/runtime/session";
import type { GradField, Stage, Tier } from "@/lib/me-v3/scoring/types";

const STAGES: Stage[] = ["bachelor", "master", "phd", "postdoc"];
const FIELDS: GradField[] =
  ["STEM", "HUMANITIES_SOCIAL", "BUSINESS", "OTHER_INTERDISCIPLINARY"];

/**
 * 응시를 연다. **등급은 화면이 정하지 않는다.**
 *
 * 폼이 보낼 수 있는 것은 학업 단계와 전공계열뿐이고, 등급은 이용권이
 * 정한다(이용권이 없으면 무료 등급). 받을 수 있게 두면 언젠가 주소로
 * 등급을 올리는 길이 생긴다.
 *
 * **석사 이상은 계열 없이 시작하지 않는다.** 화면이 지키게 두지 않고
 * DB 제약이 한 번 더 막는다: 화면은 늘어나고, 늘어난 화면 하나가
 * 빠뜨린다.
 */
export async function startV3(form: FormData): Promise<void> {
  const user = await requireUser();
  const stage = String(form.get("stage") ?? "");
  const field = String(form.get("field") ?? "");
  if (!STAGES.includes(stage as Stage)) redirect("/v3/start?e=stage");
  const gradField = stage === "bachelor" ? null
    : FIELDS.includes(field as GradField) ? (field as GradField) : null;
  if (stage !== "bachelor" && !gradField) redirect("/v3/start?e=field");

  /**
   * **이미 열린 응시가 있으면 폼의 답을 버리지 않고 그 응시에 적는다.**
   *
   * `openAttempt()` 는 열린 응시가 있으면 받은 학업 단계를 **조용히
   * 버리고** 그 응시를 돌려준다. 그래서 `학부` 를 고르고 `검사 시작` 을
   * 누른 사람이 `박사` 가 적힌 기본 정보 화면을 받는 일이 생겼다
   * (`/v3/start` 가 보통은 먼저 넘겨 주지만, 탭을 열어 둔 채 다른 탭에서
   * 이어 풀면 그 폼이 남는다). 한 응시 안에서 학업 단계의 출처는 응시
   * 줄 하나이므로, 사람이 방금 고른 값을 그 줄에 적고 들여보낸다.
   */
  const open = await currentAttempt(user.id);
  if (open) {
    await setProfile(open.id, stage as Stage, gradField, open.undergrad_core ?? null);
    redirect(`/v3/${open.id}`);
  }

  const grants = await v3Grants(user.id);
  const tier: Tier = grants[0]?.tier ?? "BASIC";

  const a = await openAttempt({
    userId: user.id, tier, stage: stage as Stage, gradField,
    entitlementId: grants[0]?.entitlement_id ?? null,
  });
  redirect(`/v3/${a.id}`);
}
