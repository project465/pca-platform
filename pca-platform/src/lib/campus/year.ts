/**
 * 학년도를 다루는 **순수한 자리**(규격 작업 2).
 *
 * DB 를 모르는 파일로 떼어 둔 까닭은 검사가 이 식을 DB 없이 그대로 돌려
 * 보기 위해서다. 식이 DB 안에 묻혀 있으면 사람 다섯 벌을 세우는 일이
 * 운영 자료를 만드는 일이 되고, 그러면 아무도 세지 않는다.
 */

/**
 * 학년도는 3월에 바뀐다. 1·2월에 적힌 줄은 앞 학년도의 줄이다.
 *
 * 이 한 줄이 없으면 2월에 고친 프로필이 한 해 뒤 구조를 가리킨다.
 */
export function academicYear(d: Date): number {
  return d.getFullYear() - (d.getMonth() + 1 < 3 ? 1 : 0);
}

/**
 * 학년에서 입학년도를 끌어낸다. **못 끌어내면 `null` 이다.**
 *
 * `wrote` 는 그 학년을 적은 학년도이고 `now` 는 지금 학년도다.
 *
 * **지난 학년도에 적힌 학년은 쓰지 않는다.** 짝이 되는 시각이 프로필의
 * 어느 칸을 고쳐도 움직여서, 2026년에 1학년이라고 적어 둔 사람이
 * 2029년에 다른 칸을 고치면 끌어낸 입학년도가 2029가 된다. 그 사람은
 * **자기 학과가 없는 목록**을 본다. 쓰지 않으면 기본값(재학생 구조)으로
 * 가고, 그쪽이 틀릴 확률은 훨씬 낮다.
 *
 * **편입생은 이 식이 맞는 답을 낸다.** 3학년으로 들어온 사람의 소속
 * 편제는 그 학년이 속한 편제이고, 식이 돌려주는 해가 바로 그 해다.
 */
export function admissionFrom(
  gradeYear: number | null | undefined, wrote: number, now: number,
): number | null {
  if (!gradeYear || gradeYear < 1) return null;
  if (wrote !== now) return null;
  const y = wrote - (gradeYear - 1);
  return y >= 1990 && y <= now + 2 ? y : null;
}
