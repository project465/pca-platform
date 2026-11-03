/**
 * 새 경험 하나(규격 §9).
 *
 * **적는 자리는 한 벌이다**(`../compose`). 고치는 쪽과 두 벌로 적어 두면
 * 걸음이 한 번 바뀐 날 한 곳만 고쳐지고, 그러면 고치러 들어온 사람이 새로
 * 적을 때와 다른 칸을 본다.
 */
import { currentUser, requireUser } from "@/lib/session";
import { wsLang } from "@/lib/me-v3/ws-lang";
import { wsSay } from "@/lib/me-v3/ws-say";
import { mark } from "@/lib/me-v3/workspace-events";
import { draftOf } from "@/lib/assistant/draft";
import Compose from "../compose";

export async function generateMetadata() {
  const u = await currentUser().catch(() => null);
  const t = wsSay(u ? await wsLang(u.id) : "ko");
  return { title: t("경험 추가 · 내 CareerMatri") };
}

export default async function NewExperience(
  { searchParams }: { searchParams: Promise<{ e?: string; td?: string; kind?: string; draft?: string }> },
) {
  const user = await requireUser();
  const sp = await searchParams;
  /* **적기 시작한 사람과 저장한 사람을 가른다.** 둘이 크게 벌어지면
     고칠 자리는 결과가 아니라 이 화면이다 */
  await mark("experience_add_started", user.id);
  /* 초안은 **그 사람의 것만** 열린다(`draftOf` 가 사람과 번호로 함께 거른다) */
  const d = sp.draft ? await draftOf(user.id, sp.draft).catch(() => null) : null;
  /* **초안마다 폼을 새로 세운다.** 파일에서 옮긴 초안 목록은 같은 쪽 안의
     링크라, 열쇠가 같으면 React 가 칸을 재사용해 앞 초안의 선택(또는 빈
     칸)이 그대로 남고 `defaultChecked` 가 다시 걸리지 않는다 */
  return <Compose key={sp.draft ?? "new"} userId={user.id} e={sp.e} td={sp.td} kind={sp.kind}
    draft={d?.value ?? null} {...(d && sp.draft ? { draftId: sp.draft } : {})} />;
}
