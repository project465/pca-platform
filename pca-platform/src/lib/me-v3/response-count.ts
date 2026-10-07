/**
 * 한 사람이 받는 응답 수와 등급을 올릴 때 **새로 묻는** 수.
 *
 * **세는 자리를 하나로 둔다.** `v3:items` 와 `v3:wording` 이 같은 수를
 * 따로 세고 있었고, 둘이 84 와 88 로 갈렸다. 갈린 까닭이 실수가 아니라
 * **설계 구멍**이었다: 심화 영역을 하나 더 열면 그 영역의 선별 네 축도
 * 같이 열려야 하는데 한쪽이 그것을 빼먹었다. 그러면 셋째 영역이 여덟 축
 * 가운데 넷만 답한 상태로 묶음 판정에 들어간다.
 *
 * **등급은 겹쳐 쌓인다**(BASIC ⊂ STANDARD ⊂ PRO). 그래서 올라갈 때 같은
 * 응시에 추가 블록만 열고, 앞에서 답한 것은 그대로 쓴다. 처음부터 그
 * 등급으로 시작한 사람과 올라온 사람의 **최종 응답 묶음이 같다.**
 */

export type Blocks = {
  grid: number; judge: number; force: number;
  probePerDomain: number; deepPerDomain: number;
  pref: number; consist: number; trans: number; target: number;
  branch: number;
  /** 산업팩 하나 + 역할팩 하나 */
  pack: number;
};

export type Counts = {
  basic: number;
  standard: number; standard4: number;
  pro: number; pro4: number; proFull: number;
  upgradeBasicToStandard: number;
  upgradeStandardToPro: number;
  extraFourthDomain: number;
  extraPack: number;
};

/** BASIC 은 선별 영역 둘 · STANDARD 이상은 심화 영역 셋(조건 맞으면 넷) */
export const DOMAINS_BY_TIER = { basic: 2, standard: 3, standard4: 4 } as const;

export function counts(b: Blocks): Counts {
  const fixed = b.grid + b.judge + b.force;
  const basic = fixed + b.branch + b.probePerDomain * DOMAINS_BY_TIER.basic;
  /** 심화 영역 하나를 여는 값. 선별 넷이 아직 없으면 그것까지 */
  const openDomain = b.probePerDomain + b.deepPerDomain;
  const deepOnly = b.deepPerDomain * DOMAINS_BY_TIER.basic;
  const stdAdd = deepOnly + openDomain + b.pref + b.consist;
  const standard = basic + stdAdd;
  const standard4 = standard + openDomain;
  const proAdd = b.trans + b.target;
  return {
    basic,
    standard, standard4,
    pro: standard + proAdd,
    pro4: standard4 + proAdd,
    proFull: standard4 + proAdd + b.pack,
    upgradeBasicToStandard: stdAdd,
    upgradeStandardToPro: proAdd,
    extraFourthDomain: openDomain,
    extraPack: b.pack,
  };
}

/** 추정 시간. **실측이 아니다.** 파일럿에서 재서 고친다 */
export const SECONDS = {
  grid: 5, lv4: 18, five: 8, force: 15, pick: 20, trans: 40,
  /** 영역마다 한 번 띄우는 판단·산출물·검증 체크리스트 */
  checklist: 60,
  /** 안내와 영역 고르기 */
  intro: 60,
} as const;

export function minutes(b: Blocks): Record<string, number> {
  const S = SECONDS;
  const basic = b.grid * S.grid + b.judge * S.lv4 + b.force * S.force +
    (b.probePerDomain * DOMAINS_BY_TIER.basic + b.branch) * S.lv4 + S.intro;
  const stdAdd = (b.probePerDomain + b.deepPerDomain * DOMAINS_BY_TIER.standard) * S.lv4 +
    b.pref * S.five + b.consist * S.lv4 + DOMAINS_BY_TIER.standard * S.checklist;
  const proAdd = b.trans * S.trans + b.target * S.pick;
  const packAdd = b.pack * S.lv4;
  const m = (x: number) => Math.round(x / 60);
  return {
    basic: m(basic),
    standardFresh: m(basic + stdAdd),
    proFresh: m(basic + stdAdd + proAdd),
    proFreshWithPack: m(basic + stdAdd + proAdd + packAdd),
    upgradeToStandard: m(stdAdd),
    upgradeToPro: m(proAdd),
    upgradeToProWithPack: m(proAdd + packAdd),
  };
}
