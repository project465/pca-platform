/**
 * 담당자 화면을 보려면 **학생이 있어야 한다.**
 *
 * 명단과 응시가 비어 있으면 집계도 명단도 내려받는 자료도 전부 0 이고,
 * 그 상태로는 **가리는 규칙도 좁히는 조건도 아무것도 세지 못한다.** 그래서
 * 검사하는 쪽이 작은 묶음을 세우고 끝에서 지운다.
 *
 * **두 자리가 필요하다.** 학교 전체가 다섯이 안 되면 집계가 아래 칸을
 * 아예 만들지 않으므로(`too_few`), 다섯 이상인 학과 하나와 둘뿐인 학과
 * 하나를 함께 세운다.
 *
 * **베껴 두지 않는다.** 같은 바탕을 두 검사가 따로 적어 두면 화면이 한 번
 * 바뀐 날 한 곳만 고쳐진다(`_loop-fixture` 와 `_v3-walk` 에서 이미 겪은
 * 자리다).
 */
import { query, queryOne } from "../src/lib/db";
import { MIN_CELL } from "../src/lib/org";
import { allLeaves, university } from "../src/lib/campus/registry";
import { makeStudent, registerCampusStudent } from "./_loop-fixture";

export type CampusCohort = {
  /** 다섯 이상이 선 자리 */
  big: { code: string; name: string };
  /** 둘만 선 자리. 5명 규칙이 여기서 걸린다 */
  tiny: { code: string; name: string };
  /** 지울 때 쓰는 아이디 */
  logins: string[];
};

export async function seedCampusCohort(
  universityCode: string, tag: string,
): Promise<CampusCohort> {
  const u = university(universityCode);
  if (!u) throw new Error(`등록부에 ${universityCode} 가 없습니다`);
  const leaves = allLeaves(u);
  const big = leaves[0];
  const tiny = leaves.find((r) => r.leaf.code !== big.leaf.code) ?? big;
  const logins: string[] = [];

  const seed = async (where: typeof big, n: number, kind: string) => {
    for (let i = 0; i < n; i++) {
      const login = `zz${tag}-${kind}${i}@test.invalid`;
      const st = await makeStudent(login);
      logins.push(login);
      /* **시연 계정이 아니어야 담당자 화면에 선다.** 집계와 명단이 둘 다
         시연·검사 계정을 거른다(§23) */
      await query(`UPDATE users SET is_demo = FALSE WHERE id = $1`, [st.id]);
      await registerCampusStudent(st.id, universityCode, where.leaf.code);
      await query(
        `INSERT INTO v3_attempts
           (user_id, tier, core_code, education_stage, item_bank_version,
            scoring_version, status, university_code, college_code, department_code)
         VALUES ($1,'PRO',$2,'bachelor','zz','zz',$3,$4,$5,$6)`,
        [st.id, where.leaf.core_code ?? "ME_CORE_V3",
         /* 한 사람은 끝낸 것으로 두어 **완료와 진행중이 갈리는지**를 본다 */
         i === 0 ? "scored" : "in_progress",
         universityCode, where.college.code, where.leaf.code]);
    }
  };
  await seed(big, MIN_CELL, "big");
  await seed(tiny, 2, "few");
  return {
    big: { code: big.leaf.code, name: big.leaf.name },
    tiny: { code: tiny.leaf.code, name: tiny.leaf.name },
    logins,
  };
}

/** 쓴 자료는 끝에서 지운다 */
export async function clearCampusCohort(logins: string[]): Promise<void> {
  for (const l of logins) {
    const row = await queryOne<{ id: string }>(
      `SELECT id::text FROM users WHERE login_id = $1`, [l]);
    if (!row) continue;
    for (const t of ["campus_students", "v3_attempts", "memberships",
                     "entitlements", "career_profiles"]) {
      await query(`DELETE FROM ${t} WHERE user_id = $1`, [row.id]).catch(() => undefined);
    }
    await query(`DELETE FROM users WHERE id = $1`, [row.id]).catch(() => undefined);
  }
}
