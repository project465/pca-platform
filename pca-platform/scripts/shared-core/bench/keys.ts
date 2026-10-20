/**
 * 근거 열쇠와 집계 (R37 run.ts 에서 옮겼다 · R38 의 content/integrity.ts 도 같이 쓴다).
 * 베껴 두면 한쪽만 고쳐지는 날 두 검사가 다른 수를 낸다.
 */
import type { Snapshot, Submission } from "../../../src/lib/me-v3/scoring/types";
import type { ResultModel } from "../../../src/lib/me-v3/result/model";

/* ── 근거의 안정 열쇠: DB 의 v3_evidence_picks PK 와 같은 (영역, 칸, 글) ── */

export type PickKey = string; // `${domain}|${slot}|${text}`
export function submittedKeys(sub: Submission): PickKey[] {
  const out: PickKey[] = [];
  for (const [k, list] of Object.entries(sub.checklists ?? {})) {
    const [td, ax] = k.split(".");
    for (const t of list) out.push(`${td}|${ax}|${t}`);
  }
  for (const [td, list] of Object.entries(sub.artifacts ?? {})) for (const t of list) out.push(`${td}|ARTIFACT|${t}`);
  for (const [td, list] of Object.entries(sub.verifications ?? {})) for (const t of list) out.push(`${td}|VERIFY|${t}`);
  return [...new Set(out)].sort();
}

/** 확인된 축의 근거 열쇠(= did 가 가리키는 것을 열쇠로 되짚은 것) */
export function confirmedKeys(s: Snapshot): PickKey[] {
  const out: PickKey[] = [];
  for (const d of s.domains) {
    for (const ax of d.confirmed) {
      for (const k of d.axes[ax].evidence_keys) {
        if (!k.includes(":")) continue; // second_item 은 고르기가 아니다
        const [kind, ...rest] = k.split(":");
        const text = rest.join(":");
        const slot = kind === "artifact" ? "ARTIFACT" : kind === "verify" ? "VERIFY" : ax;
        out.push(`${d.code}|${slot}|${text}`);
      }
    }
  }
  return [...new Set(out)].sort();
}

export type Tally = {
  raw: { did: number; decided: number; artifacts: number; verifications: number; sum4: number };
  unique_text: number; unique_key: number; submitted: number; confirmed_keys: number;
  candidates: number; overlap: { did_artifacts: number; did_verifications: number; decided_did: number };
  text_collisions: number;
};
export function tally(sub: Submission, s: Snapshot, m: ResultModel): Tally {
  const r = { did: 0, decided: 0, artifacts: 0, verifications: 0, sum4: 0 };
  let dA = 0, dV = 0, dd = 0;
  const texts = new Set<string>();
  for (const d of m.domains) {
    r.did += d.did.length; r.decided += d.decided.length;
    r.artifacts += d.artifacts.length; r.verifications += d.verifications.length;
    const did = new Set(d.did);
    dA += d.artifacts.filter((x) => did.has(x)).length;
    dV += d.verifications.filter((x) => did.has(x)).length;
    dd += d.decided.filter((x) => did.has(x)).length;
    for (const x of [...d.did, ...d.decided, ...d.artifacts, ...d.verifications]) texts.add(`${d.code}|${x}`);
  }
  r.sum4 = r.did + r.decided + r.artifacts + r.verifications;
  const sk = submittedKeys(sub);
  const ck = confirmedKeys(s);
  /* 같은 영역 안에서 칸이 다른데 글이 같은 고르기 — did 의 Set 이 하나로 합친다 */
  const byText = new Map<string, Set<string>>();
  for (const k of sk) {
    const [td, slot, ...t] = k.split("|");
    const key = `${td}|${t.join("|")}`;
    if (!byText.has(key)) byText.set(key, new Set());
    byText.get(key)!.add(slot);
  }
  const collisions = [...byText.values()].filter((v) => v.size > 1).length;
  return {
    raw: r, unique_text: texts.size, unique_key: sk.length, submitted: sk.length,
    confirmed_keys: ck.length, candidates: sk.length - ck.length,
    overlap: { did_artifacts: dA, did_verifications: dV, decided_did: dd },
    text_collisions: collisions,
  };
}
