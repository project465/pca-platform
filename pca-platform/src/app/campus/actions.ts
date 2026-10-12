"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { setCampusEntry } from "@/lib/campus/entry";
import { findLeaf, statusOf, university } from "@/lib/campus/registry";

/**
 * 고른 학과를 들고 **공통 검사 시작 화면**으로 보낸다.
 *
 * **전용 검사를 열지 않는다**(규격 §11). 여기서 하는 일은 셋뿐이다:
 * 학교와 학과가 등록부에 있는지 보고 · 그 학과가 지금 응시할 수 있는지
 * 보고 · 고른 것을 들려 보낸다. 학업 단계를 묻는 화면과 문항과 결과는
 * 다른 모든 응시자와 같은 것을 쓴다.
 *
 * **폼이 보낼 수 있는 것이 둘뿐이다.** 어느 Core 로 가는가는 서버가
 * 등록부에서 읽는다: 받을 수 있게 두면 주소로 아직 열리지 않은 전공을
 * 여는 길이 생긴다(등급을 화면이 정하지 않는 것과 같은 까닭이다).
 */
export async function startFromCampus(form: FormData): Promise<void> {
  const uc = String(form.get("u") ?? "");
  const dc = String(form.get("d") ?? "");
  const u = university(uc);
  if (!u) redirect("/cores");
  const code = u.university_code.toLowerCase();
  const found = findLeaf(u, dc);
  /* 준비 중인 학과는 주소를 손으로 쳐도 들어가지 않는다(규격 §5 · §9) */
  if (!found || statusOf(u, found.leaf) !== "READY") {
    redirect(`/campus/${code}/majors`);
  }

  await setCampusEntry(u.university_code, found.leaf.code);

  /* **로그인 뒤에 제자리로 돌아온다.** 쿠키는 이미 적혀 있으므로 돌아온
     사람은 고른 학과를 그대로 들고 있다 */
  const who = await currentUser();
  if (!who) redirect(`/login?next=${encodeURIComponent("/v3/start")}`);
  redirect("/v3/start");
}
