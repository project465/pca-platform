import { queryOne } from "@/lib/db";

/**
 * 응시 하나의 바깥. **학교 색만 고른다**(`theme.css` 의 `data-school`).
 *
 * 읽는 것은 그 응시의 학교 코드 하나다. 누구의 응시인지는 안쪽 쪽이 그대로
 * 확인하고 여기서는 화면을 막지도 열지도 않는다: 학교 코드는 색을 고르는 데만
 * 쓰고 화면에 적지 않는다. 숫자가 아닌 번호나 없는 응시면 칸을 달지 않는다
 * (CareerMatri 색으로 선다).
 *
 * `display: contents` 라 바깥 상자가 생기지 않는다. 응시 화면의 고정 띠와
 * 높이 계산이 이 틀 때문에 달라지지 않는다.
 */
export default async function AttemptLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const row = /^\d+$/.test(attemptId)
    ? await queryOne<{ u: string | null }>(
      `SELECT lower(university_code) u FROM v3_attempts WHERE id = $1::bigint`, [attemptId]).catch(() => null)
    : null;
  return <div data-school={row?.u ?? undefined} style={{ display: "contents" }}>{children}</div>;
}
