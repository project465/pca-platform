/**
 * 결과지 첫 쪽의 **머리 한 줄**: 학교 · 학과 · 전공 · 등급 · 응답일.
 *
 * 종이는 학생이 보관하고 대학이 결과물로 전달하는 자리다. 그런데 전까지
 * 첫 쪽에 적힌 것이 등급과 전공 이름뿐이었고, **그 전공 이름마저
 * `기계공학` 으로 박혀 있었다.** 언제 친 것인지도 종이 어디에도 없었다.
 *
 * **여기서 값을 만들지 않는다.** 전공은 등록부, 학교와 학과는 학교
 * 등록부, 날짜는 응시 줄이 들고 있는 것을 그대로 읽는다.
 */
import { queryOne } from "@/lib/db";
import { core as coreEntry, sharedFile, specializationOf } from "@/lib/me-v3/core-registry";
import { facultyOf, findLeaf, university } from "@/lib/campus/registry";

export type ResultMeta = {
  /** 전공(Major Core)의 한국어 이름 */
  major: string | null;
  /** 학교 진입으로 들어온 응시면 그 학교와 학과. 아니면 둘 다 `null` */
  school: string | null;
  department: string | null;
  /** 갈래. 학과가 갈래를 가리키면 그 이름 */
  specialization: string | null;
  /**
   * 갈래의 코드. **화면에 적지 않는다.**
   *
   * 결과지가 그 학과의 사례와 읽는 차례를 등록부에서 꺼낼 때 쓴다
   * (`result/spec-view.ts`). 이름만으로는 등록부를 되찾을 수 없고, 이름이
   * 같은 갈래가 Core 둘에 설 수 있다.
   */
  specializationCode: string | null;
  /** 학교 코드. **화면에 적지 않는다**: 그 학교 지역의 기업 명단을 고를 때만 쓴다 */
  universityCode: string | null;
  /** 응답을 끝낸 날. 없으면 결과를 굳힌 날 */
  answeredOn: string | null;
};

type Row = {
  university_code: string | null; department_code: string | null;
  specialization_code: string | null; answered: string | null;
};

export async function resultMeta(
  attemptId: string, core: string, lang = "ko",
): Promise<ResultMeta> {
  const row = await queryOne<Row>(
    `SELECT a.university_code, a.department_code, a.specialization_code,
            to_char(coalesce(a.submitted_at, s.created_at), 'YYYY-MM-DD') AS answered
       FROM v3_attempts a
       LEFT JOIN LATERAL (
         SELECT created_at FROM v3_snapshots
          WHERE attempt_id = a.id ORDER BY created_at DESC LIMIT 1) s ON TRUE
      WHERE a.id = $1`, [attemptId]);

  let major: string | null = null;
  try { major = coreEntry(core).name_ko ?? null; } catch { major = null; }
  /* 다른 언어의 전공 이름은 공용 원고가 든다. 없으면 등록부의 영어 이름이다 */
  if (lang !== "ko") {
    try { major = sharedFile(core, lang).core_name || coreEntry(core).name_en; }
    catch { try { major = coreEntry(core).name_en; } catch { major = null; } }
  }

  let school: string | null = null;
  let department: string | null = null;
  let specialization: string | null = null;
  const u = row?.university_code ? university(row.university_code) : null;
  if (u) {
    school = u.university_name;
    if (row?.department_code) {
      const found = findLeaf(u, row.department_code);
      if (found) {
        /* **학부가 있으면 함께 적는다.** 같은 이름의 전공이 다른 학부에
           설 수 있고, 종이에서 그 둘이 한 줄로 보이면 안 된다 */
        const f = facultyOf(u, found.leaf.code);
        department = f ? `${f.name} · ${found.leaf.name}` : found.leaf.name;
      }
    }
  }
  /* 갈래 이름은 **Core 등록부**가 정본이다. 응시 줄에 적힌 코드를 그대로
     찍지 않는다: 손님 화면에 안쪽 코드가 서면 읽는 사람이 고장으로 본다 */
  if (row?.specialization_code && lang === "ko") {
    specialization = specializationOf(core, row.specialization_code)?.name_ko ?? null;
  }

  return {
    major, school, department, specialization,
    specializationCode: row?.specialization_code ?? null,
    universityCode: u ? row?.university_code ?? null : null,
    answeredOn: row?.answered ?? null,
  };
}
