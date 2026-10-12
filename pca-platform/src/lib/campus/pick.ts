/**
 * 이 사람에게 어느 학년도 구조를 보여 줄지 정하는 **한 자리**(규격 §4).
 *
 * 화면마다 따로 정하면 첫 화면과 학과 목록이 다른 구조를 그리는 날이 오고,
 * 그날 학생은 첫 화면에서 본 단과대학을 목록에서 찾지 못한다.
 */
import { currentUser } from "@/lib/session";
import { admissionYearOf } from "./student";
import {
  resolveCatalog, type CampusCatalog, type CampusUniversity,
} from "./registry";

/** 주소로 넘어온 학년도. 숫자가 아니면 없는 것으로 본다 */
export function askedYear(v: string | string[] | undefined): number | null {
  const raw = Array.isArray(v) ? v[0] : v;
  const n = Number(raw);
  return Number.isInteger(n) && n > 1900 && n < 2200 ? n : null;
}

/**
 * 고르는 걸음을 만들지 않는다. 들고 있는 값으로 판별되면 그대로 쓰고,
 * 모르면 재학생 구조다.
 */
export async function pickCatalog(
  u: CampusUniversity, year: string | string[] | undefined,
): Promise<CampusCatalog> {
  const who = await currentUser();
  const admissionYear = who ? await admissionYearOf(who.id) : null;
  return resolveCatalog(u, { year: askedYear(year), admissionYear });
}
