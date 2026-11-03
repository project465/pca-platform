import { redirect } from "next/navigation";

/** 메모 → 경험은 MAT 의 파일 쪽(`/mat/files`)으로 옮겼다 */
export default function ImportPage(): never {
  redirect("/mat/files");
}
