/**
 * `/v3/start` 에 들어온 사람이 **어느 길로 응시를 여는가.**
 *
 * 학교가 발급한 계정이 학교 쿠키 없이 `/v3/start` 를 바로 치면, 전에는
 * 학교 맥락이 없다는 까닭으로 **개인 응시(BASIC)가 그대로 열렸다.** 그
 * 응시에는 학교와 학과가 적히지 않아 담당자 화면에 잡히지 않고, 등급도
 * 학교 계약이 정한 것이 아니며, 학교 응시가 한 번이라는 정책도 그 길로
 * 새어 나간다(다시 열면 개인 응시가 하나 더 생긴다).
 *
 * 판정은 여기 한 자리다(설계 원칙 10). 시작 화면과 서버 액션이 같은 함수를
 * 읽는다: 화면만 막으면 폼을 직접 보내는 길이 남고, 액션만 막으면 화면이
 * 개인 응시의 시작 단추를 세워 둔다.
 *
 * - **학교 맥락**: 학교 쿠키가 있고 그 학교의 등록된 학생이다. 학교
 *   이용권(담당자가 열어 준 재응시)만 쓴다. 개인 이용권을 학교 응시에
 *   쓰지 않는다: 산 사람이 그 값을 모르는 채로 잃는다.
 * - **개인**: 등록된 학교 학생이 아니거나, 학생이지만 **개인 이용권을 실제로
 *   들고 있다**. 개인 이용권만 쓴다. 학교 학생이 아닌 사람은 전과 같다
 *   (이용권이 없으면 무료 등급).
 * - **학교 전용**: 학교 학생이고 개인 이용권이 없다. 학교 경로로 보낸다.
 *   개인 응시를 열지 않는다.
 */
import { queryOne } from "@/lib/db";
import { readCampusEntry } from "@/lib/campus/entry";
import { campusStudentOf } from "@/lib/campus/students";
import { v3Grants } from "@/lib/me-v3/runtime/session";
import type { Tier } from "@/lib/me-v3/scoring/types";

/** 담당자가 학교 학생에게 열어 주는 이용권의 상품 코드(`campus/manage.ts`) */
export const CAMPUS_GRANT_PRODUCT = "CM_V3_CAMPUS_PRO";

type Grant = { entitlement_id: string; tier: Tier; product_code: string };

export type StartGate =
  | {
      kind: "campus";
      entry: NonNullable<Awaited<ReturnType<typeof readCampusEntry>>>;
      mine: NonNullable<Awaited<ReturnType<typeof campusStudentOf>>>;
      grants: Grant[];
    }
  | { kind: "personal"; grants: Grant[]; school: string | null }
  | { kind: "school_only"; school: string; to: string };

/**
 * 이 사람이 어느 학교의 등록된 학생인가. **등록부와 맞는지는 보지 않는다.**
 *
 * `campusStudentContext` 는 등록부와 맞지 않으면 `null` 을 돌려주는데,
 * 막는 자리에서 그 `null` 을 `학교 학생이 아니다` 로 읽으면 학과가 개편된
 * 학생이 개인 응시로 빠져나간다. 줄이 있으면 학교 학생이다.
 */
export async function schoolOf(userId: string): Promise<string | null> {
  const r = await queryOne<{ university_code: string }>(
    `SELECT university_code FROM campus_students WHERE user_id = $1::bigint`,
    [userId]).catch(() => null);
  return r?.university_code ?? null;
}

export async function startGate(userId: string): Promise<StartGate> {
  const all = await v3Grants(userId);
  const campusGrants = all.filter((g) => g.product_code === CAMPUS_GRANT_PRODUCT);
  const personal = all.filter((g) => g.product_code !== CAMPUS_GRANT_PRODUCT);

  const entry = await readCampusEntry();
  const mine = entry ? await campusStudentOf(userId, entry.university_code) : null;
  if (entry && mine) return { kind: "campus", entry, mine, grants: campusGrants };

  const school = await schoolOf(userId);
  if (!school) return { kind: "personal", grants: personal, school: null };
  if (personal.length) return { kind: "personal", grants: personal, school };
  return {
    kind: "school_only", school,
    to: `/campus/${school.toLowerCase()}/start`,
  };
}
