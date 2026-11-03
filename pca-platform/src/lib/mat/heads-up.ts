import type { PostingRow } from "@/lib/assistant/posting";
import type { Application } from "@/lib/me-v3/platform";
import { daysLeft } from "./stage";

/**
 * MAT 이 먼저 알려 주는 것(2026-11-02 "먼저 말 걸기"). **홈을 열 때 계산한다**: 새 알림 종류를
 * 표에 쌓지 않으므로 DB 를 바꾸지 않는다. 휴대폰 · 메일로 가는 알림(마감 · 새 공고 · 이용 기간)은
 * 지금처럼 밤 당번(`nudges.ts`)이 보낸다.
 *
 * 넷 가운데 걸리는 것만, 급한 차례로 셋까지:
 * 1. 분석한 공고의 마감이 3일 안이고 아직 지원으로 옮기지 않았다
 * 2. 이번 주에 새로 모인 공고 가운데 내 자료와 겹치는 것이 있다
 * 3. 분석한 공고는 있는데 2주째 지원 기록이 없다(MAT 을 쓴 지 2주가 지난 사람만)
 * 4. 적어 둔 경험이 반영되어 결과의 영역 묶음이 바뀌었다
 *
 * 문장은 사실만 적는다. 재촉 · 칭찬 · 합격 가능성 말이 없다.
 */
export type HeadsUp = { key: string; title: string; body: string; href: string; label: string };

export function headsUp(opts: {
  postings: PostingRow[];
  apps: Application[];
  freshMatches: number;
  zoneMoved: number;
  /** MAT 을 쓰기 시작한 날(처음 열린 이용 기간의 시작). 없으면 오늘로 본다 */
  matSince?: string | null;
  now?: Date;
  lang?: "ko" | "en";
}): HeadsUp[] {
  const en = opts.lang === "en";
  const now = opts.now ?? new Date();
  const out: HeadsUp[] = [];
  const tracked = new Set(opts.apps.filter((a) => a.state !== "watching").map((a) => a.note_text ?? ""));

  const due = opts.postings
    .map((p) => ({ p, left: daysLeft(p.deadline, now) }))
    .filter((x) => x.left !== null && x.left >= 0 && x.left <= 3 && !tracked.has(x.p.label))
    .sort((a, b) => a.left! - b.left!);
  for (const { p, left } of due.slice(0, 2)) {
    const miss = p.analysis.items.filter((i) => i.kind === "must" && (i.status === "empty" || i.status === "partial")).length;
    out.push({
      key: `due:${p.id}`, href: `/mat/jobs/${p.id}`, label: en ? "See posting" : "공고 보기",
      title: en ? (left === 0 ? `“${p.name ?? p.label}” closes today` : `“${p.name ?? p.label}” closes in ${left} ${left === 1 ? "day" : "days"}`)
        : left === 0 ? `‘${p.name ?? p.label}’ 오늘 마감` : `‘${p.name ?? p.label}’ 마감 ${left}일 전`,
      body: en ? (miss ? "Fill in one gap and you get an application sentence." : "Polish the sentence outline and apply.")
        : miss ? "채울 것 하나만 적어도 지원서 문장이 생겨요." : "문장 뼈대를 다듬어 지원해 보세요.",
    });
  }
  if (opts.freshMatches > 0) {
    out.push({
      key: "fresh", href: "/mat/jobs", label: en ? "See matching postings" : "겹친 공고 보기",
      title: en ? "New matching postings this week" : "이번 주 새로 맞는 공고가 있어요",
      body: en ? "Compare a posting you like with your experience." : "마음에 드는 공고를 내 경험과 맞춰 보세요.",
    });
  }
  const twoWeeks = now.getTime() - 14 * 86_400_000;
  const recentApp = opts.apps.some((a) => a.state !== "watching" && Date.parse(a.applied_on ?? a.created_at) >= twoWeeks);
  /* **MAT 을 쓴 지 2주가 지나야 센다**(2026-11-02 운영 시험: 오늘 이용권을 받은 계정에 "2주째" 가 섰다) */
  const since = opts.matSince ? Date.parse(opts.matSince) : now.getTime();
  if (opts.postings.length && !recentApp && since <= twoWeeks) {
    out.push({
      key: "idle", href: "/mat/jobs#track", label: en ? "Applications" : "지원 현황",
      title: en ? "No applications for 2 weeks" : "2주째 지원이 없어요",
      body: en ? "Pick one analyzed posting and apply." : "분석한 공고 하나를 골라 지원해 보세요.",
    });
  }
  if (opts.zoneMoved > 0) {
    out.push({
      key: "moved", href: "/me/results", label: en ? "See result" : "결과 보기",
      title: en ? "Your new experience changed your result" : "적은 경험이 결과에 반영됐어요",
      body: en ? "Check the new stage and tasks." : "바뀐 단계와 할 일을 확인해 보세요.",
    });
  }
  return out.slice(0, 3);
}

/** 지원 현황 네 칸(관심 → 지원·서류 → 면접 → 결과). 표의 상태 다섯을 넷으로 묶는다 */
export const TRACK_COL_EN: Record<string, string> = { watch: "Saved", apply: "Applied", talk: "Interview", done: "Result" };

export const TRACK_COLS = [
  { key: "watch", label: "관심", states: ["watching"] },
  { key: "apply", label: "지원·서류", states: ["applied"] },
  { key: "talk", label: "면접", states: ["interview"] },
  { key: "done", label: "결과", states: ["offer", "closed"] },
] as const;

/** 칸마다 다음 할 일 한 줄. 마감은 분석한 공고에서 읽는다 */
export function nextStep(a: Application, deadline: string | null, postingId: string | null, lang: "ko" | "en" = "ko"): { text: string; href: string | null } {
  const left = daysLeft(deadline);
  if (lang === "en") {
    const draft = postingId ? `/mat/draft?p=${postingId}` : "/mat/draft";
    if (a.state === "watching") return { text: left === null ? "Check the deadline in the original posting and apply" : left <= 0 ? "Closes today · finish your application" : `D-${left} · write the application from the sentence outline`, href: draft };
    if (a.state === "applied") return { text: "Practice likely questions while you wait for the result", href: draft };
    if (a.state === "interview") return { text: "Interview practice · practice with a person in Consult", href: postingId ? draft : "/mat/consult" };
    if (a.state === "offer") return { text: "Offer recorded", href: null };
    return { text: "This application is closed. Pick the next posting", href: "/mat/jobs" };
  }
  if (a.state === "watching") {
    return {
      text: left === null ? "원문에서 마감을 확인하고 지원하기" : left <= 0 ? "오늘 마감 · 지원 마치기" : `마감 D-${left} · 문장 뼈대로 지원서 쓰기`,
      href: postingId ? `/mat/draft?p=${postingId}` : "/mat/draft",
    };
  }
  if (a.state === "applied") return { text: "서류 결과를 기다리는 동안 나올 질문 연습하기", href: postingId ? `/mat/draft?p=${postingId}` : "/mat/draft" };
  if (a.state === "interview") return { text: "면접 연습 · 사람과 연습은 커리어피크 상담", href: postingId ? `/mat/draft?p=${postingId}` : "/mat/consult" };
  if (a.state === "offer") return { text: "합격을 기록했습니다", href: null };
  return { text: "끝난 지원입니다. 다음 공고를 고르세요", href: "/mat/jobs" };
}
