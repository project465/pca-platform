/** 등급을 사람의 말로. **문항 수로 등급을 가르지 않는다**(`src/lib/tiers.ts` 와 같은 까닭) */
import type { Tier } from "@/lib/me-v3/scoring/types";

export const TIER_WHAT: Record<Tier, { label: string; what: string }> = {
  BASIC: {
    label: "기본 선별",
    what: "열두 기술영역 가운데 어디부터 볼지와, 지금 확인된 판단이 무엇인지까지",
  },
  STANDARD: {
    label: "경험 심화",
    what: "앞에서 나타난 영역을 여덟 축으로 나눠 보고, 비어 있는 축의 이름과 채우는 조건까지",
  },
  PRO: {
    label: "경험 번역",
    what: "연구나 과제 하나를 직무 언어로 옮기고, 산업과 역할을 하나씩 깊게 보는 데까지",
  },
};

export const STAGE_LABEL: Record<string, string> = {
  bachelor: "학부", master: "석사", phd: "박사", postdoc: "박사후연구원",
};

export const FIELD_LABEL: Record<string, string> = {
  STEM: "이공계",
  HUMANITIES_SOCIAL: "인문·사회",
  BUSINESS: "경상",
  OTHER_INTERDISCIPLINARY: "기타·융합",
};
