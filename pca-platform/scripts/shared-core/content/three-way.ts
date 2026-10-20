/**
 * CC-008 독립 출력 실험 (R38) — **제품에 연결하지 않는다.** 결과 모델 · 채점 · 결과지 문장을
 * 바꾸지 않고, 이미 굳은 스냅샷과 결과 모델을 읽어 세 범주로 다시 묶어 본다.
 *
 *   확인된 강점            응답과 고른 근거로 확인된 축 (근거 ID 와 함께)
 *   확인된 개선 과제        답한 범위에서 아직 보이지 않는 것 · 확인은 됐지만 근거 범위가 좁은 것
 *   미확인 · 추가 검증 권고  답하지 않은 축 · 묻지 않은 축 · 골랐지만 그 판단이 확인되지 않은 근거
 *
 * 규칙 셋을 지킨다: ① 답하지 않은 것을 `개선 과제` 에 넣지 않는다(미평가 ≠ 부족)
 * ② 후보 근거를 `강점` 의 근거로 쓰지 않는다 ③ 새 수 · 점수 · 순위를 만들지 않는다.
 * 문장은 고정 틀이고 사람의 검수를 거쳐야 쓸 수 있는 초안이다.
 */
import { createHash } from "node:crypto";
import type { Axis, Snapshot, Submission } from "../../../src/lib/me-v3/scoring/types";
import type { ResultModel } from "../../../src/lib/me-v3/result/model";
import { AXIS_KO } from "../../../src/lib/me-v3/result/text.ko";
import { confirmedKeys, submittedKeys } from "../bench/keys";

export type EvRef = { id: string; domain: string; slot: string; text: string };
export type Strength = { domain: string; axes: Axis[]; owned: Axis[]; evidence: EvRef[]; sentence: string };
export type Improve = { domain: string; axis: Axis | null; gap_id: string; kind: string; action_id: string | null; sentence: string };
export type Unverified = { domain: string; axis: Axis | null; why: "SKIPPED" | "NOT_ROUTED" | "ANSWERED_UNKNOWN" | "CANDIDATE";
  evidence: EvRef[]; sentence: string };
export type ThreeWay = { strengths: Strength[]; improve: Improve[]; unverified: Unverified[] };

/** 근거 ID — DB PK (영역 · 칸 · 글) 에서 만든다. 같은 글이 다른 칸에 있으면 ID 가 다르다 */
export function evId(key: string): EvRef {
  const [domain, slot, ...t] = key.split("|");
  return { id: `EV-${domain}-${slot}-${createHash("sha256").update(key).digest("hex").slice(0, 4)}`,
    domain, slot, text: t.join("|") };
}

const UNSEEN = new Set(["SKIPPED", "NOT_ROUTED", "ANSWERED_UNKNOWN"]);

export function threeWay(sub: Submission, s: Snapshot, m: ResultModel, name: (td: string) => string): ThreeWay {
  const conf = confirmedKeys(s).map(evId);
  const confSet = new Set(confirmedKeys(s));
  const strengths: Strength[] = [];
  for (const d of s.domains) {
    if (!d.confirmed.length) continue;
    const ev = conf.filter((e) => e.domain === d.code);
    const axes = d.confirmed;
    const owned = d.owned;
    strengths.push({
      domain: d.code, axes, owned, evidence: ev,
      sentence: ev.length
        ? `${name(d.code)}: ${axes.map((a) => AXIS_KO[a]).join(" · ")} 쪽이 응답과 고른 근거로 확인됩니다 (근거 ${ev.length}건 · ${ev.slice(0, 3).map((e) => e.id).join(", ")}${ev.length > 3 ? " …" : ""}).`
        : `${name(d.code)}: ${axes.map((a) => AXIS_KO[a]).join(" · ")} 쪽은 응답(자기보고)으로만 확인됩니다. 고른 근거가 없어 지원서에 쓸 경험으로는 아직 이어지지 않습니다.`
        + (owned.length ? ` 직접 정한 기준까지 근거 둘 이상으로 선 것은 ${owned.map((a) => AXIS_KO[a]).join(" · ")}입니다.`
          : " 직접 정한 기준까지는 이번 응답으로 확인되지 않았습니다."),
    });
  }
  const improve: Improve[] = [];
  const unverified: Unverified[] = [];
  for (const g of m.gaps) {
    const ax = g.axis ? s.domains.find((d) => d.code === g.domain)?.axes[g.axis] : undefined;
    if (ax && UNSEEN.has(ax.missing)) {
      unverified.push({ domain: g.domain, axis: g.axis, why: ax.missing as Unverified["why"], evidence: [],
        sentence: `${name(g.domain)} · ${AXIS_KO[g.axis!]}: 이번 검사에서 답하지 않아 판단하지 않았습니다. 해 본 적이 있다면 그 과제를 기록에 더해 확인할 수 있습니다.` });
      continue;
    }
    /* PARTIAL 은 두 까닭이 다르다(R38 자기 검수에서 찾았다): `직접 결정` 이라고 답하지 않았거나,
       답했는데 근거가 둘이 안 된다. 하나로 적으면 근거가 넉넉한 사람에게 `하나뿐` 이라고 쓴다 */
    const decidedAns = ax?.from.some((f) => f.ownership === "DECIDED_USED") ?? false;
    improve.push({ domain: g.domain, axis: g.axis, gap_id: g.id, kind: g.kind, action_id: g.action_id,
      sentence: g.kind === "PARTIAL_EVIDENCE"
        ? (decidedAns
          ? `${name(g.domain)} · ${AXIS_KO[g.axis!]}: 직접 정했다고 답하셨지만 엔진이 센 근거(고른 항목 · 두 번째 문항)가 ${ax!.evidence}건이라 직접 결정까지는 확인되지 않았습니다(둘 이상 필요).`
          : `${name(g.domain)} · ${AXIS_KO[g.axis!]}: 해 본 것은 확인됩니다. 기준을 직접 정했는지는 이번 응답(직접 수행)으로 확인되지 않았습니다.`)
        : `${name(g.domain)}${g.axis ? ` · ${AXIS_KO[g.axis]}` : ""}: 답하신 범위에서 아직 보이지 않습니다.` });
  }
  /* 결과지 빈자리에 서지 않은, 깊게 연 영역의 답하지 않은 축 */
  for (const d of s.domains) {
    if (!d.opened.deep) continue;
    for (const a of d.empty) {
      const mk = d.axes[a].missing;
      if (!UNSEEN.has(mk)) continue;
      if (unverified.some((u) => u.domain === d.code && u.axis === a)) continue;
      unverified.push({ domain: d.code, axis: a, why: mk as Unverified["why"], evidence: [],
        sentence: `${name(d.code)} · ${AXIS_KO[a]}: 답하지 않아 이번 결과에 넣지 않았습니다. 해 본 일이 없다는 뜻으로 읽지 않습니다.` });
    }
  }
  /* 후보 근거: 골랐지만 그 축이 확인되지 않았다 */
  const byDom = new Map<string, EvRef[]>();
  for (const k of submittedKeys(sub)) {
    if (confSet.has(k)) continue;
    const e = evId(k);
    if (conf.some((c) => c.domain === e.domain && c.text === e.text)) continue;
    if (!byDom.has(e.domain)) byDom.set(e.domain, []);
    byDom.get(e.domain)!.push(e);
  }
  for (const [td, ev] of byDom) {
    unverified.push({ domain: td, axis: null, why: "CANDIDATE", evidence: ev,
      sentence: `${name(td)}: 고르신 근거 ${ev.length}건(${ev.slice(0, 2).map((e) => e.id).join(", ")}${ev.length > 2 ? " …" : ""})은 그 판단이 응답으로 확인되지 않아 확인된 경험으로 쓰지 않았습니다.` });
  }
  return { strengths, improve, unverified };
}
