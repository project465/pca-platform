/**
 * 응답 품질. **점수를 깎지 않는다.**
 *
 * 고르게 답하는 것이 솔직한 경우가 많고, 그렇게 적을 근거도 없다. 여기서
 * 하는 일은 결과를 얼마나 좁게 읽어야 하는지를 **따로 적어 두는 것**이다.
 */
import type { ReasonCode } from "./reason-codes";
import type { Answer, ResponseQuality, Submission } from "./types";
import { DEEP_BLOCK, PROBE_BLOCK, type BankItem } from "./normalize";

function levelOf(a: Answer | undefined): number | null {
  if (!a) return null;
  if (a.kind === "level") return a.index;
  if (a.kind === "scale5") return a.value;
  if (a.kind === "exposure") return a.value;
  return null;
}

/** 5점과 보기 넷을 같은 자로 보려면 0에서 1로 옮긴다 */
function unit(a: Answer | undefined): number | null {
  if (!a) return null;
  if (a.kind === "level") return a.index / 3;
  if (a.kind === "scale5") return (a.value - 1) / 4;
  if (a.kind === "exposure") return a.value / 2;
  return null;
}

export type AxisPeek = {
  confirmed: boolean;
  /** 보기에서 고른 소유 수준 가운데 가장 높은 것 */
  claimed: "NONE" | "RECEIVED" | "DID" | "DECIDED_USED" | null;
  evidence: number;
};

export function quality(
  sub: Submission, items: BankItem[],
  peek: (td: string, axis: string) => AxisPeek,
): ResponseQuality {
  const reasons: ReasonCode[] = [];
  const detail: string[] = [];
  const byId = new Map(items.map((i) => [i.item_id, i]));

  /**
   * 1. 반대 방향 두 문항에 비슷하게 답했는가.
   *
   * **짝을 글자로 적어 두지 않는다.** 전에 여기 적혀 있던 `CJ_PROBLEM` 은
   * 어느 판본의 은행에도 없는 번호여서 `forward` 가 늘 `null` 이었고, 그래서
   * 이 규칙이 **한 번도 돌지 않았다.** 이 저장소에서 같은 탈이 두 번째다:
   * 앞서 `DEEP-J8` 과 `PROBE-J4` 가 같은 자리에서 for 문의 몸통을 영원히
   * 건너뛰게 만들었다. 지금은 은행에서 같은 묶음 · 같은 축의 정방향 문항을
   * 찾고, `v3:measure` 가 **코드가 글자로 적어 둔 문항 번호가 은행에
   * 있는지**를 센다.
   *
   * **지금 이 규칙은 설 자리가 없다.** `ME_V3_ITEM_BANK_V2.5` 에서 역방향
   * 문항이 0개가 됐다. 하나뿐이던 `CJ_GIVEN_REV` 의 문면이 `~편이 편하다` 로
   * 선호를 묻는데 보기가 소유 사다리 넷이어서, 2026-10-10 에 문면을 겪은
   * 장면으로 다시 쓰고 역방향 표시를 내렸다. 그 전에도 같은 묶음 · 같은
   * 축에 정방향 짝이 없어 이 규칙은 한 번도 돌지 않았으므로, 표시를 내려도
   * 판정이 한 글자도 바뀌지 않는다.
   *
   * **규칙을 지우지 않고 둔다.** 역방향 문항을 다시 넣는 날 이 자리가 그대로
   * 돌아야 하고, 짝이 없는 역방향 문항은 `v3:registry` 가 먼저 걸러 준다.
   * **전부 최고로 답한 사람을 막는 것은 이 규칙이 아니라 근거를 요구하는
   * 소유 판정이다**(`v3:gaming` 이 사람 열세 벌로 센다).
   */
  const rev = items.filter((i) => i.reverse_flag);
  for (const r of rev) {
    const pair = items.find((i) => !i.reverse_flag && i.module === r.module
      && i.evidence_axis === r.evidence_axis);
    if (!pair) continue;
    const mine = unit(sub.answers[r.item_id]);
    const forward = unit(sub.answers[pair.item_id]);
    if (mine !== null && forward !== null && mine >= 0.75 && forward >= 0.75) {
      reasons.push("REVERSE_PAIR_AGREED");
      detail.push(`${r.item_id}~${pair.item_id}`);
    }
  }

  /* 2. 격자가 거의 한 값인가 */
  const grid = items.filter((i) => i.module === "CORE-GRID" &&
    i.measurement_axis !== "exposure");
  const vals = grid.map((i) => levelOf(sub.answers[i.item_id]))
    .filter((v): v is number => v !== null);
  if (vals.length >= 12 && new Set(vals).size <= 1) {
    reasons.push("LOW_VARIANCE_GRID");
    detail.push(`grid=${vals.length}cells-one-value`);
  }

  /* 3. 같은 축을 두 장면에서 물었는데 크게 갈렸는가 */
  const pairs = items.filter((i) => i.consistency_pair);
  const seen = new Set<string>();
  for (const p of pairs) {
    const other = byId.get(p.consistency_pair as string);
    if (!other || seen.has(other.item_id)) continue;
    seen.add(p.item_id);
    const a = levelOf(sub.answers[p.item_id]);
    const b = levelOf(sub.answers[other.item_id]);
    if (a !== null && b !== null && Math.abs(a - b) >= 2) {
      reasons.push("CONSISTENCY_PAIR_GAP");
      detail.push(`${p.item_id}=${a} ${other.item_id}=${b}`);
    }
  }

  /* 4. 응답과 체크리스트가 어긋났는가. 함정 문항을 쓰지 않는 대신 이것을 본다.
        **세는 것은 과대 보고 쪽이다**: `내가 정했고 그 결과가 쓰였다` 를
        고르고 그 축에서 고른 항목이 하나도 없는 자리다. `내가 했다` 에
        항목이 비는 것은 흔한 일이라 세지 않는다. 세면 성실하게 답한
        사람이 전부 `다시 볼 것` 으로 적힌다 */
  let highMismatch = 0, lowMismatch = 0;
  for (const [key, list] of Object.entries(sub.checklists ?? {})) {
    const [td, axis] = key.split(".");
    if (list.length && !peek(td, axis).confirmed) lowMismatch += 1;
  }
  const seenCell = new Set<string>();
  for (const i of items) {
    /* **묶음 이름을 글자로 적어 두지 않는다.** 전에 여기 적혀 있던
       `DEEP-J8` 과 `PROBE-J4` 는 어느 판본에도 없는 이름이어서, 이 for 문의
       몸통이 **한 번도 돌지 않았다.** 그래서 과대 보고 어긋남이 영원히 0
       이었다. 지금 묶음 이름은 `normalize.ts` 가 들고 있다 */
    if (i.module !== DEEP_BLOCK && i.module !== PROBE_BLOCK) continue;
    if (!i.technical_domain || !i.evidence_axis) continue;
    const key = `${i.technical_domain}.${i.evidence_axis}`;
    if (seenCell.has(key)) continue;
    seenCell.add(key);
    const p = peek(i.technical_domain, i.evidence_axis);
    if (p.claimed === "DECIDED_USED" && p.evidence === 0) highMismatch += 1;
  }
  if (highMismatch >= 2) {
    reasons.push("CHECKLIST_MISMATCH_HIGH");
    detail.push(`claimed-without-evidence=${highMismatch}`);
  }
  if (lowMismatch >= 1) {
    reasons.push("CHECKLIST_MISMATCH_LOW");
    detail.push(`evidence-without-answer=${lowMismatch}`);
  }

  const uniq = [...new Set(reasons)];
  let flag: ResponseQuality["flag"] = "OK";
  if (uniq.includes("CONSISTENCY_PAIR_GAP")) flag = "INCONSISTENT";
  else if (uniq.includes("LOW_VARIANCE_GRID")) flag = "LOW_VARIANCE";
  else if (uniq.length) flag = "REVIEW";
  return { flag, reasons: uniq.sort(), detail: detail.sort() };
}
