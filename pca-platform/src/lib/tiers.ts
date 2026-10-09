/**
 * 등급이 파는 것.
 *
 * **문항 수로 등급을 가르지 않는다.** 46 · 84 · 110 을 앞세우면 사는
 * 쪽에서 비싼 등급은 "문항이 더 많은 것" 으로 읽는다. 그러면 같은 값을
 * 더 내는 이유가 없다. 가르는 것은 **판단의 깊이**다.
 *
 *   BASIC      어디부터 볼지 고르기: 열두 기술영역을 세 묶음으로
 *   STANDARD   내 경험이 어디까지 서는지: 여덟 판단축과 비어 있는 자리
 *   PRO        직무 언어로 옮기기: 번역과 산업·직무 연결과 지원 재료
 *
 * **이 줄들은 코드가 실제로 내놓는 것이다.** 지어낸 줄이 하나도 없다는
 * 것을 `scoring/engine.ts` 의 `limitsFor()` 와 대조해 두었다.
 *
 *   allows_evidence_established   BASIC 은 `근거가 섰다` 를 적지 않는다
 *   allows_axis_names             BASIC 은 판단축 이름을 적지 않는다
 *   deep_axes                     여덟 축 심화는 STANDARD 부터
 *   allows_translation            경험 번역은 PRO 만
 *
 * 앞 판본(ME_V2)의 줄이 그대로 남아 있었다: `먼저 볼 직무 묶음` ·
 * `직무 둘 이상을 나란히 견주는 표` · `조직 유형 성과 기준` ·
 * `30·90·365일 계획`. 넷 다 지금 결과지에 없는 절이다. **없는 절을 적어
 * 두면 산 사람이 결과지를 열고 그것을 찾는다.**
 *
 * **한 곳에서만 적는다.** 상품 쪽과 가격표가 각각 적으면 둘이 갈리고,
 * 갈린 날 사는 쪽은 둘 중 하나를 보고 결제한다(설계 원칙 10).
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
    headline: p("어디부터 볼지 고르기", "Decide where to start"),
    gets: [
      p("열두 기술영역을 관심 · 해 본 적 · 배울 뜻 셋으로 나눠 봅니다",
        "Twelve technical domains read through interest, exposure and willingness to learn"),
      p("직접 해볼 영역 · 짧게 겪어 볼 영역 · 지금은 뒤로 둘 영역",
        "Which to take on, which to sample briefly, which to set aside for now"),
      p("그 묶음이 그렇게 나온 까닭",
        "Why each domain landed in the group it did"),
      p("지금 할 수 있는 다음 한 걸음",
        "One next step you can take now"),
    ],
    who: p(
      "전공은 정했고 어느 쪽부터 파고들지 아직 못 정하신 분",
      "You have your major and have not decided which direction to dig into",
    ),
    when: p("아직 후보가 없다면", "No candidates yet"),
  },
  STANDARD: {
    tier: "STANDARD",
    headline: p("내 경험이 어디까지 서는지", "See how far your experience stands up"),
    gets: [
      p("BASIC 에 있는 것 전부", "Everything in BASIC"),
      p("경험이 있는 영역을 여덟 가지 판단으로 나눠 봅니다",
        "Each domain you have worked in, split across eight kinds of judgement"),
      p("직접 정한 것과 받아서 한 것을 가릅니다",
        "What you decided yourself, separated from what was handed to you"),
      p("남긴 결과물과 무엇과 견주어 확인했는지",
        "What you left behind, and what you checked it against"),
      p("아직 비어 있는 판단과 그것을 채우는 조건",
        "Which judgements are still empty, and what would fill them"),
    ],
    who: p(
      "해 본 일은 있는데 그것이 어디까지 설명되는지 모르시는 분",
      "You have done the work but do not know how far it explains itself",
    ),
    when: p("겪은 것을 정리해야 한다면", "You need your experience sorted out"),
  },
  PRO: {
    tier: "PRO",
    headline: p("직무 언어로 옮기기", "Translate it into the language of the role"),
    gets: [
      p("STANDARD 에 있는 것 전부", "Everything in STANDARD"),
      p("연구나 프로젝트 하나를 지원서에서 말하는 차례로 옮깁니다",
        "One project or research task reordered the way an application tells it"),
      p("고르신 산업 하나에 연결하면 무엇이 서고 무엇이 모자라는지",
        "Connected to one industry you chose: what holds up and what is missing"),
      p("고르신 직무 하나에 연결하면 같은 것",
        "The same, connected to one role you chose"),
      p("지원서와 면접에서 쓸 문장의 밑그림",
        "A draft of the sentences for applications and interviews"),
      p("다음에 만들 경험 하나와 그 경험이 보여야 하는 것",
        "One experience to build next, and what it has to show"),
    ],
    who: p(
      "방향은 정하셨고 지원서에 쓸 근거를 짜셔야 하는 분",
      "You know the direction and need the evidence shaped for an application",
    ),
    when: p("지원을 준비한다면", "You are preparing to apply"),
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
 * 세 등급의 머리말이 같은 말이 되거나 받는 것이 겹치기만 하면, 사는
 * 쪽에서 "문항이 더 많은 것" 이라고밖에 답할 수 없다. 겹치는 줄은
 * **'전부' 한 줄까지만** 둔다.
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
