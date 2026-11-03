/**
 * 개인이 산 등급으로 **지난 응시를 넓힌다.**
 *
 * 홈페이지에서 들어온 개인은 무료 BASIC 을 먼저 풀고, 그 결과를 본 뒤에
 * STANDARD 나 PRO 를 산다. 그 이용권으로 새 응시를 열면 같은 사람의 응답이
 * 두 벌 쌓이고(규준이 오염된다) 앞에서 답한 마흔여섯 문항을 다시 푼다.
 * 등급이 겹쳐 쌓이는 구조(BASIC ⊂ STANDARD ⊂ PRO)라 **같은 응시의 등급을
 * 올리고 새로 묻는 화면만 연다**(`upgradeTier`).
 *
 * **학교 응시는 넓히지 않는다.** 학교 응시는 늘 PRO 이고, 개인 이용권을
 * 학교 응시에 쓰면 산 사람이 그 값을 모르는 채로 잃는다(`startGate`).
 */
import { queryOne } from "@/lib/db";
import { v3Grants } from "@/lib/me-v3/runtime/session";
import type { Tier } from "@/lib/tiers";

const RANK: Record<Tier, number> = { BASIC: 0, STANDARD: 1, PRO: 2 };

export type UpgradeTarget = {
  attemptId: string;
  coreCode: string;
  from: Tier;
  to: Tier;
  entitlementId: string;
};

/**
 * 넓힐 응시와 쓸 이용권. 없으면 `null`.
 *
 * 응시는 **가장 최근에 결과를 받은 개인 응시**이고, 이용권은 그보다 높은
 * 등급 가운데 가장 높은 것이다. 같은 등급이나 낮은 등급 이용권은 여기서
 * 쓰지 않는다: 그것은 넓히는 일이 아니라 다시 보는 일이다.
 */
export async function upgradeTarget(userId: string): Promise<UpgradeTarget | null> {
  const last = await queryOne<{ id: string; tier: Tier; core_code: string }>(
    `SELECT id::text, tier, core_code FROM v3_attempts
      WHERE user_id = $1 AND status = 'scored' AND university_code IS NULL
      ORDER BY submitted_at DESC NULLS LAST, id DESC LIMIT 1`, [userId],
  ).catch(() => null);
  if (!last) return null;
  const grants = await v3Grants(userId);
  const up = grants
    .filter((g) => RANK[g.tier] > RANK[last.tier])
    .sort((a, b) => RANK[b.tier] - RANK[a.tier])[0];
  if (!up) return null;
  return {
    attemptId: last.id, coreCode: last.core_code,
    from: last.tier, to: up.tier, entitlementId: up.entitlement_id,
  };
}
