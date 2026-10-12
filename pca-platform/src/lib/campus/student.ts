/**
 * 어느 학년도 구조로 보여 줄지 **시스템이 이미 들고 있는 값으로 판별한다**
 * (규격 §4).
 *
 * 학생에게 묻는 것은 `현재 소속 학과` 하나다. 입학년도를 따로 묻는 걸음을
 * 하나 더 두지 않는다: 그 걸음은 거의 모든 사람에게 쓸모가 없고, 쓸모가
 * 없는 걸음은 그 자리에서 닫는 사람을 만든다.
 *
 * **추측하지 않는다.** 들고 있는 값으로 끌어낼 수 있을 때만 값을 내고,
 * 없으면 `null` 이다. `null` 이면 부르는 쪽이 재학생 구조로 간다.
 */
import { queryOne } from "@/lib/db";

/**
 * 학년도는 3월에 바뀐다. 1·2월에 적힌 줄은 앞 학년도의 줄이다.
 *
 * 이 한 줄이 없으면 2월에 고친 프로필이 한 해 뒤 구조를 가리킨다.
 */
export function academicYear(d: Date): number {
  return d.getFullYear() - (d.getMonth() + 1 < 3 ? 1 : 0);
}

/**
 * 입학년도. **없으면 `null` 이다.**
 *
 * 지금 들고 있는 것은 `learner_profiles.grade_year`(그 줄을 적을 때의
 * 학년)뿐이라, 그 줄이 적힌 학년도에서 학년을 빼서 끌어낸다.
 *
 * **지금 이 값이 서는 줄이 흔하지 않다.** V3 로 들어온 사람의 프로필에는
 * 학년이 적히지 않는 경우가 대부분이고, 그러면 이 함수는 `null` 을
 * 돌려주고 화면은 재학생 구조로 간다. 그래도 읽는 자리를 하나 두는
 * 까닭은, 학과가 명단을 올릴 때 학번이나 입학년도가 들어오는 날 **고칠
 * 자리가 여기 하나**가 되기 때문이다.
 *
 * **학번에서 앞 네 자리를 떼어 쓰지 않는다.** 그 규칙을 지키지 않는 학교가
 * 있고, 틀리면 그 학생이 자기 학과가 없는 목록을 본다.
 */
export async function admissionYearOf(userId: string | number): Promise<number | null> {
  const row = await queryOne<{ grade_year: number | null; updated_at: Date }>(
    `SELECT grade_year, updated_at FROM learner_profiles WHERE user_id = $1`,
    /* **표가 없거나 읽히지 않아도 쪽은 선다.** 이 값은 어느 목록을 먼저
       보여 줄지 정하는 거리이고, 없으면 재학생 구조로 간다. 여기서
       던지면 학과를 고르러 온 사람이 오류 화면을 본다 */
    [userId]).catch(() => null);
  if (!row?.grade_year || row.grade_year < 1) return null;
  const y = academicYear(new Date(row.updated_at)) - (row.grade_year - 1);
  /* 끌어낸 값이 말이 안 되면 **쓰지 않는다** */
  return y >= 1990 && y <= academicYear(new Date()) + 2 ? y : null;
}
