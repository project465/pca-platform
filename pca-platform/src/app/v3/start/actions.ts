"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { retakeState } from "@/lib/me-v3/retake";
import { clearCampusEntry } from "@/lib/campus/entry";
import { pickRequired } from "@/lib/campus/registry";
import { startGate } from "@/lib/campus/start-gate";
import {
  currentAttempt, openAttempt, setProfile,
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
  /* **고른 전공을 돌려보낼 때도 들고 간다.** 빠뜨리면 학업 단계를 고르지
     않아 돌아온 사람이 그 다음에 **기본 전공으로** 시작한다 */
  const picked = String(form.get("core") ?? "").trim();
  const back = picked ? `&core=${encodeURIComponent(picked)}` : "";
  if (!STAGES.includes(stage as Stage)) redirect(`/v3/start?e=stage${back}`);
  const gradField = stage === "bachelor" ? null
    : FIELDS.includes(field as GradField) ? (field as GradField) : null;
  if (stage !== "bachelor" && !gradField) redirect(`/v3/start?e=field${back}`);

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
    /* **열린 응시의 전공을 바꾸지 않는다.** 푸는 중에 Core 가 갈리면 앞에
       답한 문항이 다른 전공의 영역 사전 위에 선다. 들고 있던 학과 선택은
       여기서 버린다: 다음 응시에 조용히 묻어 들어가면 그 사람이 고르지
       않은 학과로 검사가 시작된다 */
    await clearCampusEntry();
    redirect(`/v3/${open.id}`);
  }

  /**
   * **학교가 발급한 계정은 학교 경로로만 응시를 연다.**
   *
   * 학교 쿠키가 없거나 다른 학교 것이면 전에는 맥락만 버리고 **개인 응시가
   * 그대로 열렸다.** 그 응시는 담당자 화면에 잡히지 않고 등급도 학교 계약이
   * 정한 것이 아니다. 판정은 `startGate()` 한 자리이고 시작 화면도 같은
   * 함수를 읽는다: 화면만 막으면 이 폼을 직접 보내는 길이 남는다.
   *
   * 개인 응시는 **개인 이용권을 실제로 들고 있는** 학교 학생과 학교 학생이
   * 아닌 사람에게만 열린다. 학교 응시에는 학교 이용권만 쓰고, 개인 응시에는
   * 개인 이용권만 쓴다: 섞으면 산 사람이 그 값을 모르는 채로 잃는다.
   */
  const gate = await startGate(user.id);
  if (gate.kind === "school_only") {
    await clearCampusEntry();
    redirect(gate.to);
  }

  /* **막는 자리는 서버다**(규격 §7). 화면이 먼저 돌려보내지만, 폼을 직접
     보내는 길이 남아 있으면 끝낸 사람의 응시가 하나 더 생긴다. **다시 여는
     권한은 그 길의 이용권만 센다**: 학교 응시를 한 번 끝낸 학생이 산 개인
     이용권으로 학교 응시를 하나 더 여는 길이 없다 */
  const retake = await retakeState(user.id);
  if (retake.done > 0 && !gate.grants.length && retake.lastAttemptId) {
    redirect(gate.kind === "campus"
      ? `/campus/${gate.mine.row.university_code.toLowerCase()}/start`
      : `/v3/${retake.lastAttemptId}/result?again=1`);
  }

  const grants = gate.grants;
  const tier: Tier = grants[0]?.tier ?? "BASIC";

  /**
   * **학교 진입으로 고른 학과가 있으면 그 전공으로 연다**(규격 §11 · §12).
   *
   * 폼이 보낸 값이 아니라 쿠키에 적힌 학교·학과 코드를 **등록부로 다시
   * 맞춰 본 값**이다(`readCampusEntry`). 그래서 주소나 폼을 고쳐 아직
   * 열리지 않은 전공으로 들어가는 길이 없다.
   *
   * **학교 맥락은 그 학교의 학생에게만 적는다**(`startGate` 가 쿠키를 그
   * 사람의 등록된 줄에 대고 맞춘다). 믿을 것은 명단이 적어 준 자리이고
   * 쿠키는 어느 학교 쪽에서 들어왔는지만 말한다.
   */
  const entry = gate.kind === "campus" ? gate.entry : null;
  const mine = gate.kind === "campus" ? gate.mine : null;

  /**
   * **자율전공학부 학생의 Core 는 고른 전공이 정한다**(규격 §32 · §33).
   *
   * 소속은 등록된 줄 그대로 적고(자율전공학부) 어느 전공의 자로 재는가만
   * 학생이 고른 자리에서 가져온다. **자동으로 배정하지 않는다**: 고르지
   * 않았으면 그 자리로 되돌려 보내고, 학부 이름만 보고 특정 Core 로
   * 짐작하지 않는다.
   *
   * 고른 값은 쿠키가 들고 오지만 **그것을 그대로 믿지 않는다**:
   * `readCampusEntry()` 가 등록부로 다시 맞춰 보고 그 자리가 지금
   * 응시할 수 있는지까지 본 값이고, 거기서 가져오는 것은 Core 와 갈래
   * 둘뿐이다. 학과와 단과대학은 늘 등록된 줄이 정한다.
   */
  let campus = mine ? mine.ctx : null;
  if (campus && pickRequired(campus)) {
    if (!entry || !entry.core_code) {
      redirect(`/campus/${
        mine!.row.university_code.toLowerCase()}/majors?pick=1`);
    }
    campus = {
      ...campus,
      core_code: entry.core_code,
      specialization: entry.specialization,
    };
  }

  /* **고른 전공을 그 응시에 적는다**(규격 §20). 폼이 들고 온 값이고,
     믿는 자리는 `openAttempt()` 하나다: 그 시장에서 응시할 수 있는 Core
     가 아니면 거기서 버리고 기본 전공으로 연다(학교 맥락이 늘 먼저다) */
  const a = await openAttempt({
    userId: user.id, tier, stage: stage as Stage, gradField,
    entitlementId: grants[0]?.entitlement_id ?? null,
    campus,
    core: picked || null,
  });
  /* 응시 줄에 적혔으므로 쿠키는 더 들고 있지 않는다 */
  await clearCampusEntry();
  /**
   * **첫 문항 앞에 안내 한 쪽을 둔다.** 이어보기로 들어오는 사람은 위에서
   * 이미 `/v3/{id}` 로 갔으므로, 이 쪽을 보는 것은 지금 막 응시를 연
   * 사람뿐이다. 나가도 응답은 그대로 남는다.
   */
  redirect(`/v3/${a.id}/intro`);
}
