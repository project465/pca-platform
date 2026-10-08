/**
 * 영역 묶음. **차례를 만들지 않고 처지를 가른다.**
 *
 * 가장 중요한 가름은 `근거가 섰다` 와 `경험은 있으나 아직 근거가 완성되지
 * 않았다` 와 `판단할 근거가 부족하다` 가 서로 다른 상태라는 것이다. 많이
 * 해 봤는데 남은 것이 없는 사람과 아직 아무 경험이 없는 사람을 같은 칸에
 * 넣으면 둘 다 틀린 다음 걸음을 밟는다.
 */
import type { ReasonCode } from "./reason-codes";
import type { Band, DomainResult, Zone } from "./types";

export type ZoneInput = {
  tier: "BASIC" | "STANDARD" | "PRO";
  openedDeep: boolean;
  openedProbe: boolean;
  interest: Band | null;
  confirmedAll: number;
  confirmedScreen: number;
  requiredOk: boolean;
  missingRequired: string[];
  outputOk: boolean;
  outputEvidenceOk: boolean;
  verificationOk: boolean;
  anyAnswer: boolean;
};

/** 근거가 섰다고 말할 수 있는 조건. **개수만으로 판정하지 않는다** */
export const Z1_CONFIRMED_MIN = 4;

export function decide(x: ZoneInput): { zone: Zone; reasons: ReasonCode[] } {
  const reasons: ReasonCode[] = [];

  if (x.tier === "BASIC") {
    if (!x.openedProbe) return { zone: "NOT_EXPLORED", reasons: ["NOT_ROUTED"] };
    reasons.push("TIER_WITHOUT_DEEP_AXES");
    if (x.confirmedScreen === 0) {
      return {
        zone: "Z4_INSUFFICIENT_EVIDENCE",
        reasons: [...reasons, x.anyAnswer ? "NO_CONFIRMED_AXIS" : "NO_RESPONSE"],
      };
    }
    if (x.interest === "LOW") {
      return x.confirmedScreen >= 2
        ? { zone: "Z3_EVIDENCE_LOW_INTEREST", reasons: [...reasons, "LOW_INTEREST_WITH_EVIDENCE"] }
        : { zone: "Z4_INSUFFICIENT_EVIDENCE", reasons: [...reasons, "NO_CONFIRMED_AXIS"] };
    }
    return { zone: "Z2_EVIDENCE_INCOMPLETE", reasons };
  }

  if (!x.openedDeep) return { zone: "NOT_EXPLORED", reasons: ["NOT_ROUTED"] };
  if (x.confirmedAll === 0) {
    return {
      zone: "Z4_INSUFFICIENT_EVIDENCE",
      reasons: [x.anyAnswer ? "NO_CONFIRMED_AXIS" : "NO_RESPONSE"],
    };
  }

  if (!x.requiredOk) reasons.push("MISSING_REQUIRED_AXIS");
  if (!x.outputOk) reasons.push("MISSING_OUTPUT");
  else if (!x.outputEvidenceOk) reasons.push("MISSING_OUTPUT_EVIDENCE");
  if (x.confirmedAll < Z1_CONFIRMED_MIN) reasons.push("INSUFFICIENT_CONFIRMED_AXES");
  if (!x.verificationOk) reasons.push("MISSING_VERIFICATION");

  const z1 = x.confirmedAll >= Z1_CONFIRMED_MIN && x.requiredOk &&
    x.outputOk && x.outputEvidenceOk;
  if (z1) {
    /* 근거가 섰다. 비교·검증이 비어 있으면 그 사실만 다음 걸음으로 남긴다 */
    const rest: ReasonCode[] = x.verificationOk ? [] : ["MISSING_VERIFICATION"];
    return x.interest === "LOW"
      ? { zone: "Z3_EVIDENCE_LOW_INTEREST", reasons: [...rest, "LOW_INTEREST_WITH_EVIDENCE"] }
      : { zone: "Z1_EVIDENCE_ESTABLISHED", reasons: rest };
  }
  if (x.interest === "LOW" && x.confirmedAll >= 3) {
    return { zone: "Z3_EVIDENCE_LOW_INTEREST", reasons: [...reasons, "LOW_INTEREST_WITH_EVIDENCE"] };
  }
  return { zone: "Z2_EVIDENCE_INCOMPLETE", reasons };
}

/** 다음 걸음. **관심과 학습 의향과 경험을 합치지 않고 갈라 읽는다** */
export function nextSteps(d: {
  zone: Zone; interest: Band | null; learning: Band | null;
  experience: "NONE" | "ONCE_OR_TWICE" | "SEVERAL" | null;
  confirmedAll: number; outputOk: boolean; verificationOk: boolean;
}): ReasonCode[] {
  const out: ReasonCode[] = [];
  if (d.interest === "HIGH" && (d.experience === "NONE" || d.confirmedAll === 0)) {
    /* 관심은 높고 겪은 적이 없다. 공부가 아니라 한 번 겪어 보는 것이 먼저다 */
    out.push("TRY_SHORT_EXPERIENCE");
    if (d.learning === "HIGH") out.push("STUDY_NEXT");
  }
  if (d.confirmedAll >= 2 && !d.outputOk) out.push("BUILD_OUTPUT");
  if (d.outputOk && !d.verificationOk) out.push("ADD_VERIFICATION");
  if (d.zone === "Z3_EVIDENCE_LOW_INTEREST") out.push("RECHECK_DIRECTION");
  if (d.interest === "LOW" && d.confirmedAll <= 1) out.push("NOT_A_PRIORITY");
  return out;
}

/** 관심과 근거를 네 칸으로 갈라 읽는다. 더해서 한 점수로 만들지 않는다 */
export function quadrant(
  interest: Band | null, evidenceHigh: boolean,
): DomainResult["quadrant"] {
  if (interest === "HIGH") return evidenceHigh ? "A_HIGH_HIGH" : "B_HIGH_LOW";
  if (interest === "LOW") return evidenceHigh ? "C_LOW_HIGH" : "D_LOW_LOW";
  return null;
}
