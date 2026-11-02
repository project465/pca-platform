import { currentState, experiencesOf } from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import { openActions } from "@/lib/me-v3/open-actions";
import { postingsOf } from "@/lib/assistant/posting";
import { postingsForMe } from "@/lib/assistant/match";
import { matStage } from "./stage";

/**
 * MAT 질문 입력창이 Claude 에게 넘기는 **이 사람의 자료**와, 답이 댈 수 있는 **근거 칩 목록**.
 *
 * - 답은 이 목록에 있는 근거만 칩으로 단다. 화면도 목록에 없는 칩은 그리지 않는다(지어낸 근거 차단)
 * - 넘기는 것은 화면에 이미 보이는 것뿐이다: 단계 · 근거를 갖춘 영역 · 비어 있는 영역 · 경험 제목 ·
 *   할 일 · 분석한 공고의 요구 · 겹치는 공고의 요구. **이름 · 이메일 · 학번 · 학교 · 회사 이름은 넣지 않는다**
 * - 경험 글 전문은 넘기지 않는다(제목과 영역만). 고칠 문장은 사람이 입력창에 직접 넣는다
 */
export type AskContext = { text: string; evidence: string[] };

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function askContextOf(userId: string): Promise<AskContext> {
  const st = await currentState(userId);
  const name = (td: string) => domainName(st.core, td);
  const [exps, act, mine, pool] = await Promise.all([
    experiencesOf(userId, st.core).catch(() => []),
    openActions(userId).catch(() => null),
    postingsOf(userId).catch(() => []),
    postingsForMe(userId, 10).catch(() => null),
  ]);
  const owned = (st.model?.domains ?? []).filter((d) => d.owned.length > 0).map((d) => d.code);
  const s = matStage(st.zoneOf, owned);
  const ev = new Set<string>();
  const lines: string[] = [];

  lines.push(`지금 단계: ${s.stage} (탐색 · 준비 · 실행 · 도약 가운데)`);
  if (!st.model) lines.push("검사 결과: 아직 없음");
  for (const d of s.established.slice(0, 5)) { const l = `검사: ${name(d)}`; ev.add(l); lines.push(`근거를 갖춘 영역 [${l}]`); }
  for (const g of st.gaps.slice(0, 4)) { const l = `검사: ${name(g.domain)}`; ev.add(l); lines.push(`비어 있는 영역 [${l}]`); }

  const saved = exps.filter((e) => e.status !== "draft").slice(0, 10);
  if (!saved.length) lines.push("적어 둔 경험: 없음");
  for (const e of saved) {
    const l = `경험: ${cut(e.title, 24)}`; ev.add(l);
    const areas = e.td_codes.slice(0, 2).map(name).join(", ");
    lines.push(`적어 둔 경험 [${l}]${areas ? ` 영역: ${areas}` : ""}${e.artifacts.length ? ` · 남긴 것 ${e.artifacts.length}개` : ""}${e.decisions.length ? ` · 직접 정한 것 ${e.decisions.length}개` : ""}`);
  }

  const todo = (act?.rows ?? []).filter((r) => r.state !== "done" && r.state !== "dropped").slice(0, 3);
  for (const r of todo) { const l = `할 일: ${cut(r.body, 20)}`; ev.add(l); lines.push(`이번 주 할 일 [${l}] ${cut(r.body, 80)}`); }

  for (const p of mine.slice(0, 3)) {
    const l = `공고: ${cut(p.label, 20)}`; ev.add(l);
    const c = p.analysis.counts;
    const miss = p.analysis.items.filter((i) => i.kind === "must" && (i.status === "empty" || i.status === "partial")).slice(0, 3).map((i) => i.text);
    lines.push(`분석한 공고 [${l}] 마감 ${p.deadline ?? "미기재"} · 설명할 경험 있음 ${c.ready} · 덜 됨 ${c.partial} · 없음 ${c.empty}${miss.length ? ` · 보완할 필수: ${miss.join(" / ")}` : ""}`);
  }
  const shown = pool ? (pool.rows.length ? pool.rows : pool.recent) : [];
  for (const p of shown.slice(0, 3)) {
    if (!p.requirements.length) continue;
    const l = `공고: ${cut(p.requirements[0], 20)}`; ev.add(l);
    lines.push(`겹치는 공고 [${l}] 마감 ${p.closes_on ?? "상시"} · 요구: ${p.requirements.slice(0, 4).join(" / ")}${p.hits.length ? ` · 겹친 낱말: ${p.hits.slice(0, 4).join(", ")}` : ""}`);
  }
  return { text: lines.join("\n"), evidence: [...ev] };
}
