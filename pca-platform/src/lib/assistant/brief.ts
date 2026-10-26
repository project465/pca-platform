import { areaName } from "./catalog";
import type { ActionRow, Experience } from "@/lib/me-v3/platform";
import type { PostingItem, PostingRow } from "./posting";
import { smallTasks } from "./prep";

/**
 * MAT 브리핑. **이번 주 무엇을 하면 되는가**에 한 판으로 답한다.
 *
 * 셋을 모은다: 가까운 마감 · 이번 주 할 일 하나 · **여러 공고가 함께
 * 요구하는데 아직 채우지 못한 것.** 셋째가 이 판의 몫이다. 공고 한 장씩
 * 보면 `아직 없음` 이 공고마다 따로 서서, 붙여 둔 공고 셋이 모두 같은 것을
 * 묻고 있다는 사실이 화면 어디에도 남지 않는다.
 *
 * **판정을 다시 하지 않는다.** 요구 항목의 영역과 상태는 공고 쪽
 * (`refreshPosting`)이 지금 값으로 단 것을 그대로 읽고, 여기서는 세고
 * 줄 세우기만 한다. 다음 작은 일은 공고 화면과 같은 함수(`smallTasks`)다.
 *
 * **사람을 줄 세우지 않는다.** 차례를 정하는 수는 `그 요구를 낸 공고가
 * 몇 개인가` 하나이고 합격 가능성이나 점수를 만들지 않는다.
 *
 * DB 를 읽지 않는 순수 함수다(`npm run mat:brief` 가 직접 부른다).
 */

/** 한국 날짜로 오늘(`YYYY-MM-DD`) */
export function kstToday(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 마감까지 남은 날. 두 날짜 모두 한국 날짜로 읽는다 */
export function daysLeft(deadline: string, today: string): number {
  return Math.round((Date.parse(deadline) - Date.parse(today)) / 86400_000);
}

export type BriefDeadline = { id: string; label: string; deadline: string; left: number };

/** 보고 있는 공고 가운데 마감이 아직 지나지 않은 것. 가까운 차례 */
export function nearDeadlines(postings: PostingRow[], today: string, max = 3): BriefDeadline[] {
  return postings
    .filter((p) => p.state === "watching" && p.deadline && daysLeft(p.deadline, today) >= 0)
    .map((p) => ({ id: p.id, label: p.label, deadline: p.deadline!, left: daysLeft(p.deadline!, today) }))
    .sort((a, b) => a.left - b.left || Number(a.id) - Number(b.id))
    .slice(0, max);
}

export type BriefTask = {
  body: string;
  /** `open` 아직 시작 전 · `doing` 하는 중 */
  state: "open" | "doing";
  /** 할 일 목록에 담긴 줄인가. 아니면 결과지가 낸 할 일을 그대로 읽은 것이다 */
  saved: boolean;
};

/**
 * 이번 주 할 일 하나. `지금 할 일` 쪽과 **같은 줄을 고른다**: 끝내지 않은
 * 것 가운데 30일 안에 할 것이 먼저고, 없으면 열린 것의 첫 줄이다.
 */
export function weekTask(rows: ActionRow[], fromResult: boolean): BriefTask | null {
  const open = rows.filter((r) => r.state !== "done" && r.state !== "dropped");
  const first = open.find((r) => r.horizon <= 30) ?? open[0];
  if (!first) return null;
  return {
    body: first.body,
    state: first.state === "doing" ? "doing" : "open",
    saved: !fromResult,
  };
}

export type RepeatedGap = {
  domain: string;
  area: string;
  /** 지금 상태. 영역에 적어 둔 경험이 하나도 없으면 `empty` */
  status: "empty" | "partial";
  /** 이 영역을 요구하는데 아직 채우지 못한 공고 수 */
  count: number;
  /** 같은 전공으로 읽어 닫지 않은 공고 수. `{total}개 중 {count}개` 의 분모 */
  total: number;
  /** 그 가운데 필수로 요구한 공고 수 */
  must: number;
  /** 공고마다 그 요구를 적은 한 줄. 공고 이름은 학생이 붙인 이름이다 */
  asks: { id: string; label: string; text: string; kind: "must" | "nice" }[];
  /** 이번 주에 할 수 있는 작은 일 한 줄. 영역 사전에 재료가 없으면 비어 있다 */
  next: string | null;
};

const GAP: ReadonlySet<PostingItem["status"]> = new Set(["empty", "partial"]);

/**
 * 공고 두 개 이상이 요구하는데 **지금도** `아직 없음` · `정리가 덜 됨` 인 영역.
 *
 * 묶는 단위는 영역이다. 공고마다 문장이 달라서(`3D CAD 모델링` · `CAD 를
 * 활용한 설계`) 문장으로 묶으면 같은 요구가 한 번도 겹치지 않는다. 판단축까지
 * 넣으면 한 공고는 축을 적고 다른 공고는 안 적어 같은 영역이 둘로 갈린다.
 *
 * 차례: 요구한 공고 수 → 그 가운데 필수로 낸 수 → `아직 없음` 먼저 → 붙여 둔 차례.
 */
export function repeatedGaps(
  core: string, postings: PostingRow[], exps: Experience[], max = 3, lang: "ko" | "en" = "ko",
): RepeatedGap[] {
  const pool = postings.filter((p) => p.state !== "closed" && (p.core_code ?? core) === core);
  type Acc = { order: number; empty: boolean; asks: RepeatedGap["asks"]; rep: PostingItem; repMust: boolean };
  const by = new Map<string, Acc>();
  let order = 0;
  for (const p of pool) {
    const mine = new Map<string, PostingItem>();
    for (const it of p.analysis.items) {
      if (!it.domain || !GAP.has(it.status)) continue;
      const had = mine.get(it.domain);
      /* 한 공고 안에서는 필수 줄이 그 공고의 대표다 */
      if (!had || (had.kind !== "must" && it.kind === "must")) mine.set(it.domain, it);
    }
    for (const [d, it] of mine) {
      let a = by.get(d);
      if (!a) {
        a = { order: order++, empty: false, asks: [], rep: it, repMust: it.kind === "must" };
        by.set(d, a);
      }
      if (it.status === "empty") a.empty = true;
      if (!a.repMust && it.kind === "must") { a.rep = it; a.repMust = true; }
      a.asks.push({ id: p.id, label: p.label, text: it.text, kind: it.kind });
    }
  }
  const out = [...by.entries()]
    .filter(([, a]) => a.asks.length >= 2)
    .map(([domain, a]) => {
      /* 작은 일은 공고 화면과 같은 함수에서 나온다. 우대로만 요구한 영역도
         할 일은 같으므로 필수 줄로 읽혀 한 줄을 받는다 */
      const t = smallTasks(core, [{ ...a.rep, kind: "must", status: a.empty ? "empty" : a.rep.status }], exps, lang)[0];
      return {
        g: {
          domain, area: areaName(core, domain, lang),
          status: a.empty ? "empty" : "partial",
          count: a.asks.length, total: pool.length,
          must: a.asks.filter((x) => x.kind === "must").length,
          asks: a.asks, next: t?.task ?? null,
        } satisfies RepeatedGap,
        order: a.order,
      };
    })
    .sort((x, y) => y.g.count - x.g.count || y.g.must - x.g.must
      || (x.g.status === y.g.status ? 0 : x.g.status === "empty" ? -1 : 1)
      || x.order - y.order);
  return out.slice(0, max).map((x) => x.g);
}

export type Brief = {
  today: string;
  deadlines: BriefDeadline[];
  task: BriefTask | null;
  gaps: RepeatedGap[];
  /** 같은 전공으로 읽어 닫지 않은 공고 수 */
  pool: number;
};

export function buildBrief(input: {
  core: string | null; postings: PostingRow[]; exps: Experience[];
  actions: ActionRow[]; fromResult: boolean; now?: Date;
  /** 작업공간 언어. 영역 이름과 `이번 주 작은 일` 문장이 이 말로 선다 */
  lang?: "ko" | "en";
}): Brief {
  const today = kstToday(input.now);
  const core = input.core;
  return {
    today,
    deadlines: nearDeadlines(input.postings, today),
    task: weekTask(input.actions, input.fromResult),
    gaps: core ? repeatedGaps(core, input.postings, input.exps, 3, input.lang ?? "ko") : [],
    pool: core ? input.postings.filter((p) => p.state !== "closed" && (p.core_code ?? core) === core).length : 0,
  };
}

/* ── 알림 문장 ─────────────────────────────────────────────────────
   **수만 받는다.** 공고 이름 · 사람 이름 · 할 일 문장 · 점수를 인자로 받지
   않으므로 이 문장에는 그것들이 들어갈 길이 없다. 앱 안 알림 줄과 기기
   알림(잠긴 화면)이 이 둘을 쓴다 */

/** 영어. 한국어와 같이 **수 셋만** 받는다 */
export function weeklyNudgeTextEn(n: { task: boolean; deadlines: number; gaps: number }): {
  title: string; body: string;
} {
  const parts = [
    n.task ? "one task" : "",
    n.deadlines ? `${n.deadlines} posting${n.deadlines === 1 ? "" : "s"} closing within 7 days` : "",
    n.gaps ? `${n.gaps} gap${n.gaps === 1 ? "" : "s"} several postings ask for` : "",
  ].filter(Boolean);
  return {
    title: "This week's MAT briefing",
    body: parts.length
      ? `Waiting on your MAT page: ${parts.join(", ").replace(/, ([^,]*)$/, " and $1")}.`
      : "Write up one thing you did this week as an experience and your briefing will fill in.",
  };
}

export function weeklyNudgeText(n: { task: boolean; deadlines: number; gaps: number }): {
  title: string; body: string;
} {
  const parts = [
    n.task ? "할 일 하나" : "",
    n.deadlines ? `마감이 7일 안인 공고 ${n.deadlines}개` : "",
    n.gaps ? `여러 공고가 함께 요구하는 것 ${n.gaps}가지` : "",
  ].filter(Boolean);
  return {
    title: "이번 주 MAT 브리핑",
    body: parts.length
      ? `${parts.join(" · ")}를 MAT 첫 화면에 모아 두었습니다.`
      : "이번 주에 한 일 가운데 하나를 경험으로 적어 두면 브리핑이 채워집니다.",
  };
}

/** 기기 알림. 잠긴 화면에 그대로 뜨므로 수도 적지 않는다 */
export const PUSH_TEXT = {
  weekly: { title: "CareerMatri", body: "이번 주 MAT 브리핑이 준비됐습니다.", url: "/me/track#brief", tag: "mat-weekly" },
  deadline: { title: "CareerMatri", body: "붙여 둔 공고의 마감이 다가옵니다.", url: "/me/track#brief", tag: "mat-deadline" },
} as const;

/** 영어 작업공간의 기기 알림. 잠긴 화면에 뜨므로 수도 이름도 적지 않는다 */
export const PUSH_TEXT_EN = {
  weekly: { title: "CareerMatri", body: "Your MAT briefing for this week is ready.", url: "/me/track#brief", tag: "mat-weekly" },
  deadline: { title: "CareerMatri", body: "A posting you saved closes soon.", url: "/me/track#brief", tag: "mat-deadline" },
} as const;
