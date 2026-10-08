/**
 * 판단 축 여덟의 상태. **확인과 소유를 합치지 않는다.**
 *
 * 보기에 `내가 정했고 그 결과가 쓰였다` 를 골랐다고 바로 소유가 되지
 * 않는다. 소유는 **응답의 소유 수준과 체크리스트 근거 둘**을 함께 본다.
 * 근거가 하나면 칸 하나를 채운 사람과 끌고 간 사람이 같아진다.
 */
import { maxOwnership, ownershipOf, type Ownership } from "./ownership";
import type { AxisResult, AxisState, Axis, MissingKind, Submission } from "./types";
import { read, routedFor, type BankItem } from "./normalize";

/** 소유로 올라가려면 근거가 이만큼 있어야 한다 */
export const OWNED_EVIDENCE_MIN = 2;

export function evidenceFor(
  sub: Submission, td: string, axis: Axis, secondItemConfirmed: boolean,
): { count: number; keys: string[] } {
  const keys: string[] = [];
  for (const t of sub.checklists?.[`${td}.${axis}`] ?? []) keys.push(`checklist:${t}`);
  if (axis === "J5") {
    for (const t of sub.artifacts?.[td] ?? []) keys.push(`artifact:${t}`);
  }
  if (axis === "J6") {
    for (const t of sub.verifications?.[td] ?? []) keys.push(`verify:${t}`);
  }
  /* 한 칸에 문항이 둘인 자리는 둘 다 확인이면 근거 둘로 센다 */
  if (secondItemConfirmed) keys.push("second_item");
  return { count: keys.length, keys: keys.sort() };
}

export function axisResult(
  sub: Submission, td: string, axis: Axis, items: BankItem[],
): AxisResult {
  const from: { item_id: string; ownership: Ownership }[] = [];
  let missing: MissingKind = "NOT_ROUTED";
  let best: Ownership | null = null;
  let confirmedItems = 0;

  for (const it of items) {
    const routed = routedFor(sub, it);
    const r = read(sub, it, routed);
    if (r.missing !== "NOT_ROUTED" && missing === "NOT_ROUTED") missing = r.missing;
    if (r.missing === "NONE_MISSING" && missing === "SKIPPED") missing = "NONE_MISSING";
    if (!r.answer || r.answer.kind !== "level") continue;
    const own = ownershipOf(r.answer.index);
    from.push({ item_id: it.item_id, ownership: own });
    best = best ? maxOwnership(best, own) : own;
    if (own === "DID" || own === "DECIDED_USED") confirmedItems += 1;
  }

  const ev = evidenceFor(sub, td, axis, confirmedItems >= 2);
  let state: AxisState = "NOT_OBSERVED";
  let rule = "no-answer";
  if (best === "RECEIVED") { state = "PARTICIPATED"; rule = "ownership=RECEIVED"; }
  else if (best === "DID") { state = "CONFIRMED"; rule = "ownership=DID"; }
  else if (best === "DECIDED_USED") {
    if (ev.count >= OWNED_EVIDENCE_MIN) {
      state = "OWNED";
      rule = `ownership=DECIDED_USED & evidence=${ev.count}>=${OWNED_EVIDENCE_MIN}`;
    } else {
      state = "CONFIRMED";
      rule = `ownership=DECIDED_USED & evidence=${ev.count}<${OWNED_EVIDENCE_MIN}`;
    }
  } else if (best === "NONE") { rule = "ownership=NONE"; }

  return { axis, state, from, evidence: ev.count, evidence_keys: ev.keys, missing, rule };
}

export function isConfirmed(s: AxisState): boolean {
  return s === "CONFIRMED" || s === "OWNED";
}
