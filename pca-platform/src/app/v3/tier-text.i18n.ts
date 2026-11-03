/**
 * `tier-text` 를 언어로 고르는 **유일한 자리.**
 *
 * 화면마다 `lang === "en" ? … : …` 를 적으면 한 화면이 빠지는 날 영어 응시에
 * 한국어 꼬리표가 선다. 두 벌의 내보내는 이름이 같아서 고르는 일이 한 줄이다.
 */
import type { Tier } from "@/lib/me-v3/scoring/types";
import * as KO from "./tier-text";
import * as EN from "./tier-text.en";

export type TierText = {
  TIER_WHAT: Record<Tier, { label: string; what: string }>;
  STAGE_LABEL: Record<string, string>;
  FIELD_LABEL: Record<string, string>;
  undergradLabel: (major: string) => Record<string, string>;
  undergradGloss: (major: string, examples: string) => Record<string, string>;
  UNDERGRAD_ASK: string;
  UNDERGRAD_HELP: string;
  OWNERSHIP_SHORT: string[];
  OWNERSHIP_LABEL: string[];
  OWNERSHIP_HELP: string[];
  OWNERSHIP_EXAMPLE: string[];
  INDUSTRY_HINT: Record<string, Record<string, string>>;
  ROLE_HINT: Record<string, Record<string, string>>;
  ORG_HINT: Record<string, Record<string, string>>;
};

/* 두 벌이 같은 모양인지 타입이 센다: 한쪽에 칸이 빠지면 여기서 걸린다 */
const KO_T: TierText = KO;
const EN_T: TierText = EN;

export function tierText(lang?: string | null): TierText {
  return lang === "en" ? EN_T : KO_T;
}
