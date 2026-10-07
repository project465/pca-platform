/**
 * 등급이 파는 것.
 *
 * **문항 수로 등급을 가르지 않는다**(규격 §4). 48 · 68 · 92 를 앞세우면
 * 사는 쪽에서 비싼 등급은 "문항이 더 많은 것" 으로 읽는다. 그러면 같은
 * 값을 더 내는 이유가 없다. 받는 것이 달라지는 자리를 적는다.
 *
 *   BASIC      어느 쪽을 먼저 볼지와 다음 한 걸음
 *   STANDARD   직무를 견주는 깊이. 비어 있는 증거와 조직 맥락
 *   PRO        증거 구조와 조직 가치 번역, 다음에 만들 경험, 30·90·365일
 *
 * **한 곳에서만 적는다.** 상품 쪽과 가격표가 각각 적으면 둘이 갈리고,
 * 갈린 날 사는 쪽은 둘 중 하나를 보고 결제한다(설계 원칙 10).
 *
 * **지어내지 않는다.** 여기 적힌 줄은 전부 결과지가 실제로 내보내는 절이고,
 * 등급마다 무엇이 붙는지는 `report_level` 이 정한다. 없는 절을 적어 두면
 * 산 사람이 결과지를 열고 그것을 찾는다.
 */
export type Tier = "BASIC" | "STANDARD" | "PRO";

type Pair = { ko: string; en: string };
const p = (ko: string, en: string): Pair => ({ ko, en });

export type TierValue = {
  tier: Tier;
  /** 한 마디로 무엇을 사는가 */
  headline: Pair;
  /** 받는 것. 결과지의 실제 절과 짝이 맞는다 */
  gets: Pair[];
  /** 누구에게 맞는가 */
  who: Pair;
  /**
   * **언제 이 등급을 고르는가.** 알약 한 줄로 카드 머리에 붙는다.
   *
   * '권해 드리는 등급' 한 마디만 붙여 두었더니 왜 권하는지가 안 보였고,
   * 그러면 위 등급이 '줄이 더 많은 상품' 으로 읽힌다. 세 등급이 서로
   * **다른 처지**를 맡고 있다는 것을 여기서 적는다.
   */
  when: Pair;
};

export const TIER_VALUE: Record<Tier, TierValue> = {
  BASIC: {
    tier: "BASIC",
    headline: p("어디부터 볼지 정하기", "Find where to start"),
    gets: [
      p("먼저 살펴볼 직무 묶음", "The role group to look at first"),
      p("그 묶음이 나온 까닭과 근거가 된 문항", "Why it came out, and the items behind it"),
      p("지금 할 수 있는 다음 한 걸음", "One next step you can take now"),
      p("30일 안에 만들 경험 하나", "One experience to build within 30 days"),
    ],
    who: p(
      "전공은 정했고 어느 직무로 갈지 아직 못 정하신 분",
      "You have your major and have not settled on a role yet",
    ),
    when: p("아직 후보가 없다면", "No candidates yet"),
  },
  STANDARD: {
    tier: "STANDARD",
    headline: p("견주고 고르기", "Compare and decide"),
    gets: [
      p("BASIC 에 있는 것 전부", "Everything in BASIC"),
      p("직무 둘 이상을 나란히 견주는 표", "A table comparing two or more roles side by side"),
      p("직무마다 비어 있는 증거", "The evidence each role still wants to see"),
      p("조직 유형에 따라 달라지는 성과 기준", "How the performance bar shifts by organization type"),
      p("30일 · 90일 계획", "A 30 and 90 day plan"),
    ],
    who: p(
      "후보가 둘셋 있고 그 가운데서 고르셔야 하는 분",
      "You have two or three candidates and need to choose between them",
    ),
    when: p("후보를 좁혀야 한다면", "You need to choose between roles"),
  },
  PRO: {
    tier: "PRO",
    headline: p("증거 전략과 실행 계획", "Build an evidence strategy and an action plan"),
    gets: [
      p("STANDARD 에 있는 것 전부", "Everything in STANDARD"),
      p("먼저 볼 직무 셋을 하나씩 끝까지 파고드는 쪽",
        "Each of your top three roles worked through end to end"),
      p("내 경험이 그 직무와 조직에서 어떻게 읽히는지", "How your experience reads in that role and organization"),
      p("어디까지 설명할 수 있는 근거가 됐는지", "How far your experience already stands up as evidence"),
      p("다음에 만들 경험 하나와 그 조건", "One experience to build next, and what it needs to show"),
      p("30일 · 90일 · 365일 계획", "A 30, 90 and 365 day plan"),
      p("지원 서류와 면접에서 쓸 재료 정리", "Material organized for applications and interviews"),
    ],
    who: p(
      "방향은 정하셨고 증거를 쌓는 순서를 짜셔야 하는 분",
      "You know the direction and need an order for building evidence",
    ),
    when: p("방향은 이미 정해졌다면", "The direction is already set"),
  },
};

export const TIERS: Tier[] = ["BASIC", "STANDARD", "PRO"];

/** 이 언어로 읽는다 */
export function valueOf(tier: Tier, lang: "ko" | "en") {
  const v = TIER_VALUE[tier];
  return {
    tier,
    headline: v.headline[lang],
    gets: v.gets.map((g) => g[lang]),
    who: v.who[lang],
    when: v.when[lang],
  };
}

/**
 * 등급이 서로 구별되는가.
 *
 * 규격 §24 가 요구하는 것을 검사로 옮긴 자리다. 세 등급의 머리말이 같은
 * 말이 되거나 받는 것이 겹치기만 하면, 사는 쪽에서 "문항이 더 많은 것" 이
 * 라고밖에 답할 수 없다. 겹치는 줄은 **'전부' 한 줄까지만** 둔다.
 */
export function tiersDistinct(lang: "ko" | "en"): { ok: boolean; why: string[] } {
  const why: string[] = [];
  const heads = TIERS.map((t) => TIER_VALUE[t].headline[lang]);
  if (new Set(heads).size !== heads.length) why.push("등급 머리말이 겹칩니다.");

  for (let i = 1; i < TIERS.length; i++) {
    const lower = new Set(TIER_VALUE[TIERS[i - 1]].gets.map((g) => g[lang]));
    const mine = TIER_VALUE[TIERS[i]].gets.map((g) => g[lang]);
    const fresh = mine.filter((m) => !lower.has(m));
    /* '아래 등급에 있는 것 전부' 한 줄을 빼고도 새로 붙는 것이 둘 이상
       있어야 등급 값이 선다 */
    if (fresh.length < 3) {
      why.push(`${TIERS[i]} 에 새로 붙는 것이 ${fresh.length}가지뿐입니다.`);
    }
  }
  return { ok: why.length === 0, why };
}
