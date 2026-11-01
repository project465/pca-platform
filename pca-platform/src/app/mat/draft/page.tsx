import { redirect } from "next/navigation";

/** 지원서 초안(예상 화면 3번). 새 화면을 만들기 전까지는 지금 MAT 화면으로 보낸다 */
export default function Page() {
  redirect("/me/track");
}
