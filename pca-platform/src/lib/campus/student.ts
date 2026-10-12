/**
 * 어느 학년도 구조로 보여 줄지 **시스템이 이미 들고 있는 값으로 판별한다**
 * (규격 §4 · 작업 2).
 *
 * 학생에게 묻는 것은 `현재 소속 학과` 하나다. 입학년도를 따로 묻는 걸음을
 * 하나 더 두지 않는다: 그 걸음은 거의 모든 사람에게 쓸모가 없고, 쓸모가
 * 없는 걸음은 그 자리에서 닫는 사람을 만든다.
 *
 * **추측하지 않는다.** 들고 있는 값으로 끌어낼 수 있을 때만 값을 내고,
 * 없으면 `null` 이다. `null` 이면 부르는 쪽이 재학생 구조로 간다.
 */
import { queryOne } from "@/lib/db";
import { academicYear, admissionFrom } from "./year";

export { academicYear } from "./year";

/**
 * 입학년도. **없으면 `null` 이다.**
 *
 * **저장소에 입학년도를 담는 칸이 없다.** 들고 있는 것은
 * `learner_profiles.grade_year` 뿐이고 그 칸이 뜻하는 것은 **학년**이다
 * (`evidence-insights.ts` 가 그 값에 `학년` 을 붙여 화면에 적는다). 그래서
 * 입학년도는 적혀 있는 값이 아니라 **끌어낸 값**이고, 끌어내는 식은
 * `그 줄을 적은 학년도 - (학년 - 1)` 이다.
 *
 * **그 줄이 올해 것일 때만 믿는다.** 짝이 되는 시각이 `updated_at` 인데,
 * 그 값은 프로필의 어느 칸을 고쳐도 움직인다. 2026년에 1학년이라고 적어
 * 둔 사람이 2029년에 다른 칸을 고치면 끌어낸 입학년도가 2029가 되고, 그
 * 사람은 **자기 학과가 없는 목록**을 본다. 지난 학년도에 적힌 줄은
 * 그래서 쓰지 않는다. 쓰지 않으면 기본값(재학생 구조)으로 가고, 그쪽이
 * 틀릴 확률은 훨씬 낮다.
 *
 * **학번에서 앞 네 자리를 떼어 쓰지 않는다.** 그 규칙을 지키지 않는 학교가
 * 있고, 틀리면 그 학생이 자기 학과가 없는 목록을 본다.
 *
 * **편입생은 이 식이 맞는 답을 낸다.** 3학년으로 들어온 사람의 소속 편제는
 * 그 학년이 속한 편제이고, 식이 돌려주는 해가 바로 그 해다.
 */
export async function admissionYearOf(
  userId: string | number, now = new Date(),
): Promise<number | null> {
  const row = await queryOne<{ grade_year: number | null; updated_at: Date }>(
    `SELECT grade_year, updated_at FROM learner_profiles WHERE user_id = $1`,
    /* **표가 없거나 읽히지 않아도 쪽은 선다.** 이 값은 어느 목록을 먼저
       보여 줄지 정하는 거리이고, 없으면 재학생 구조로 간다. 여기서
       던지면 학과를 고르러 온 사람이 오류 화면을 본다 */
    [userId]).catch(() => null);
  if (!row) return null;
  /* 끌어내는 식은 `year.ts` 한 곳에 있고 검사가 그 식을 DB 없이 돌린다 */
  return admissionFrom(row.grade_year,
    academicYear(new Date(row.updated_at)), academicYear(now));
}
