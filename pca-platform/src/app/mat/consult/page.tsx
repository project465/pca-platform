import { redirect } from "next/navigation";

/** 커리어피크 상담(예상 화면 5번). 새 화면을 만들기 전까지는 지금 MAT 화면으로 보낸다 */
export default function Page() {
  redirect("/me/track/research#careerpeak");
}
