import { redirect } from "next/navigation";

/** 맞는 공고는 MAT 의 공고 쪽(`/mat/jobs`)으로 옮겼다 */
export default function JobsForMe(): never {
  redirect("/mat/jobs");
}
