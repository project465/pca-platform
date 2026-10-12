/**
 * 학교 진입으로 고른 학과를 **검사 시작까지 들고 가는 자리.**
 *
 * `/campus/{학교}/d/{학과}` 에서 고른 것은 그 순간 응시가 되지 않는다:
 * 로그인하지 않았을 수 있고, 학업 단계를 묻는 공통 화면이 그다음이다.
 * 그래서 고른 것을 짧게 들고 다닌다.
 *
 * **주소에 싣지 않는다.** `?core=CS_CORE_V1` 로 들고 가면 그 주소를 고쳐
 * 아직 열리지 않은 전공으로 들어가는 길이 생긴다. 쿠키는 서버가 적고
 * (`httpOnly`) 서버가 읽으며, 읽을 때 등록부로 한 번 더 맞춰 본다.
 *
 * **오래 들고 있지 않는다.** 두 시간이면 고른 사람이 그 흐름 안에 있고,
 * 그 뒤에 남아 있으면 다음에 들어온 사람이 **자기가 고르지 않은 학과**로
 * 검사를 시작한다.
 */
import { cookies } from "next/headers";
import {
  contextOf, findLeaf, statusOf, university, type CampusContext,
} from "./registry";

const NAME = "cm_campus";
const TTL = 60 * 60 * 2;

/** 학교와 학과 코드 둘만 담는다. **Core 는 서버가 등록부에서 읽는다** */
export async function setCampusEntry(
  universityCode: string, departmentCode: string,
): Promise<void> {
  const jar = await cookies();
  jar.set(NAME, `${universityCode}:${departmentCode}`, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: TTL,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearCampusEntry(): Promise<void> {
  const jar = await cookies();
  jar.set(NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/**
 * 지금 들고 있는 학과. **등록부로 다시 맞춰 본다.**
 *
 * 쿠키에 적힌 학교와 학과가 등록부에 없거나 그 학과가 아직 `준비 중` 이면
 * 없는 것으로 본다: 고른 뒤에 Core 를 닫는 일이 있고, 그때 들고 있던
 * 쿠키로 빈 검사가 열리면 안 된다.
 */
export async function readCampusEntry(): Promise<
  (CampusContext & { university_name: string; department_name: string }) | null
> {
  const raw = (await cookies()).get(NAME)?.value ?? "";
  const [uc, dc] = raw.split(":");
  if (!uc || !dc) return null;
  const u = university(uc);
  if (!u) return null;
  const found = findLeaf(u, dc);
  if (!found) return null;
  /* **상태를 여기서 다시 본다.** 고른 뒤에 Core 를 닫는 일이 있고, 그때
     들고 있던 쿠키로 빈 검사가 열리면 안 된다 */
  if (statusOf(u, found) !== "READY") return null;
  const ctx = contextOf(u, found);
  if (!ctx) return null;
  return {
    ...ctx,
    university_name: u.university_name,
    department_name: found.leaf.name,
  };
}

/**
 * 고쳐 고른 학년도를 기억하는 자리(규격 작업 2).
 *
 * **고르는 걸음을 만들지 않는다.** 목록은 이미 서 있고, 이 값은 자기
 * 학과를 못 찾아 다른 학년도 구조로 되돌아간 사람이 남긴 정정이다.
 * 기억해 두지 않으면 쪽을 옮길 때마다 같은 정정을 다시 해야 한다.
 *
 * **담는 것은 학교와 해 둘뿐이다.** 어느 Catalog 인지는 서버가 등록부에서
 * 읽고, 없는 해가 들어오면 그 값은 버려진다. 학과도 Core 도 담지 않는다.
 */
const YEAR_NAME = "cm_campus_year";
const YEAR_TTL = 60 * 60 * 24 * 180;

export async function setCatalogChoice(
  universityCode: string, year: number,
): Promise<void> {
  const jar = await cookies();
  jar.set(YEAR_NAME, `${universityCode}:${year}`, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: YEAR_TTL,
    secure: process.env.NODE_ENV === "production",
  });
}

/** 그 학교에 대해 남긴 정정. 다른 학교의 값이면 없는 것으로 본다 */
export async function readCatalogChoice(
  universityCode: string,
): Promise<number | null> {
  const raw = (await cookies()).get(YEAR_NAME)?.value ?? "";
  const [uc, y] = raw.split(":");
  if (!uc || uc !== universityCode) return null;
  const n = Number(y);
  return Number.isInteger(n) ? n : null;
}
