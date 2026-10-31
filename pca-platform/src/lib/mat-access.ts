import { queryOne } from "@/lib/db";
import { activeTrack, hasV3Result } from "@/lib/track";
import { cameVia } from "@/lib/brand";

/**
 * MAT 을 **무료로 한 번씩 써 보고 두 번째부터 기간권으로** 넘어가게 한다
 * (2026-10-31 대표 결정).
 *
 * 전에는 기간권이 없으면 도구가 통째로 숨어 있었다. 그러면 사기 전에 MAT 이
 * 내 자료로 무엇을 해 주는지 볼 길이 없고, "합격서 한 권보다 낫다" 는 말을
 * 믿을 근거가 화면에 없다. 그래서 검사 결과가 있는 사람에게는 도구마다
 * **한 번**을 연다. 공고 하나를 비교해 보고, 메모 하나를 옮겨 보고, 파일 하나를
 * 읽혀 보면 된다. 두 번째부터 기간권으로 간다.
 *
 * **세는 것은 이미 쌓이는 표다**(`assistant_postings` · `assistant_drafts` ·
 * `assistant_uploads`). 새 표를 만들지 않으므로 지운 공고를 다시 붙이면 다시
 * 무료가 되는 길도 없다: 지운 줄도 남은 줄로 센다(공고는 상태만 바꾼다).
 *
 * **판단은 서버가 한다.** 화면이 폼을 꺼 두는 것은 안내이고, 다 쓴 사람이
 * 폼을 직접 보내도 `requireMat` 이 돌려보낸다.
 */

/**
 * **아무 도구나 합쳐서 두 번**(2026-10-31 대표 결정 "아무 도구나 2번으로").
 * 전에는 도구마다 한 번씩(넷이면 네 번)이었다. 무료 체험자의 AI 비용이 결제자 한
 * 사람 몫의 절반을 넘어서 줄였다. 이미 도구마다 한 번씩 쓴 사람은 쓴 횟수를 합쳐
 * 센다: 두 번 이상 썼으면 무료가 끝난다.
 */
export const FREE_TOTAL = 2;
const USES = ["posting", "draft", "upload", "research"] as const;
export type MatUse = (typeof USES)[number];

export type MatAccess = {
  /** 기간권이 열려 있다 */
  paid: boolean;
  /** 검사 결과가 있다(MAT 은 결과에서 시작한다) */
  ready: boolean;
  used: Record<MatUse, number>;
  /** 도구마다 지금 쓸 수 있는 무료 횟수. 합친 남은 횟수와 같다 */
  left: Record<MatUse, number>;
  /** 네 도구를 합쳐 남은 무료 횟수 */
  freeLeft: number;
  /** 도구를 화면에 세운다: 기간권이 있거나, 결과가 있어 무료로 써 볼 수 있다 */
  open: boolean;
  /**
   * 검사 결과 없이도 `내 자료 읽기` 를 쓸 수 있다(2026-10-31 대표 결정: 커리어피크로
   * 들어온 연구자는 자료 올리기부터). **무료 횟수는 그대로 셈한다**(합쳐 2번)
   */
  researchFirst: boolean;
};

const COUNT: Record<MatUse, string> = {
  posting: `SELECT count(*)::int AS n FROM assistant_postings WHERE user_id = $1`,
  /* 메모로 만든 초안만 센다. 파일 · 연구 자료에서 나온 초안은 `note_text` 가 비어 있고
     그쪽 한 번(upload · research)에서 이미 셌다 */
  draft: `SELECT count(*)::int AS n FROM assistant_drafts WHERE user_id = $1 AND note_text IS NOT NULL`,
  /* 실패한 읽기는 세지 않는다(`upload.ts` 의 한도와 같은 규칙) */
  upload: `SELECT count(*)::int AS n FROM assistant_uploads WHERE user_id = $1 AND status IN ('read', 'empty')`,
  /* 논문 · PPT · 이력서 읽기(`research-docs.ts`). 표가 아직 없으면 0 으로 센다 */
  research: `SELECT count(*)::int AS n FROM research_docs WHERE user_id = $1`,
};

export async function freeUsed(userId: string): Promise<Record<MatUse, number>> {
  const out = { posting: 0, draft: 0, upload: 0, research: 0 } as Record<MatUse, number>;
  await Promise.all((Object.keys(COUNT) as MatUse[]).map(async (k) => {
    out[k] = (await queryOne<{ n: number }>(COUNT[k], [userId]).catch(() => null))?.n ?? 0;
  }));
  return out;
}

export async function matAccess(userId: string): Promise<MatAccess> {
  const [state, ready, used] = await Promise.all([
    activeTrack(userId), hasV3Result(userId).catch(() => false), freeUsed(userId),
  ]);
  const paid = state.on;
  const total = USES.reduce((n, k) => n + used[k], 0);
  const freeLeft = paid ? Infinity : Math.max(0, FREE_TOTAL - total);
  const left = {} as Record<MatUse, number>;
  for (const k of USES) left[k] = freeLeft;
  /* 결과가 없는 사람만 한 번 더 묻는다 */
  const researchFirst = !paid && !ready && await cameVia(userId, "careerpeak");
  return { paid, ready, used, left, freeLeft, open: paid || ready, researchFirst };
}

/** 이 사람이 지금 이 도구를 한 번 더 쓸 수 있는가와, 못 쓰면 그 까닭 */
export async function canUseMat(userId: string, use: MatUse): Promise<
  { ok: true; free: boolean } | { ok: false; why: "needtest" | "free" }
> {
  const a = await matAccess(userId);
  if (a.paid) return { ok: true, free: false };
  /* 커리어피크로 들어온 사람은 자료 읽기만 검사 전에 연다. 다른 도구는 결과에서 시작한다 */
  if (!a.ready && !(use === "research" && a.researchFirst)) return { ok: false, why: "needtest" };
  return a.left[use] > 0 ? { ok: true, free: true } : { ok: false, why: "free" };
}
