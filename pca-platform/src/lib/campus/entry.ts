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
  if (statusOf(u, found.leaf) !== "READY") return null;
  const ctx = contextOf(u, found);
  if (!ctx) return null;
  return {
    ...ctx,
    university_name: u.university_name,
    department_name: found.leaf.name,
  };
}
