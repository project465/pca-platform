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
  /** 영역 훑기에서 **고정으로** 받는 수. 관심 열둘 + 경험 열둘 */
  grid: number;
  judge: number; force: number;
  /** 영역 하나에서 **선별 등급에 받는** 선별 축 자리 (축마다 하나) */
  probePerDomain: number;
  /**
   * 영역 하나에서 **STANDARD 부터 받는** 선별 축의 둘째 자리.
   *
   * 한 칸에 문항을 둘 둔 까닭은 체크리스트를 고르지 않은 사람도 소유까지
   * 갈 수 있게 하려는 것인데, 선별 등급에는 소유 판정이 없다. 그래서 둘째
   * 자리는 소유를 말하는 등급에서만 뜬다.
   */
  probeSecondPerDomain: number;
  deepPerDomain: number;
  /** 영역 하나당 학습 의향. 선별된 영역에만 묻는다 */
  learningPerDomain: number;
  consist: number; trans: number; target: number;
  branch: number;
  /** 산업팩 하나 + 역할팩 둘까지 */
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
  /** 선별 영역 하나를 여는 값. 그 영역의 선별 축과 학습 의향 */
  const openProbe = b.probePerDomain + b.learningPerDomain;
  const basic = fixed + b.branch + openProbe * DOMAINS_BY_TIER.basic;
  /** 심화 영역 하나를 여는 값. 선별 축 둘째 자리와 심화 축까지 */
  const openDomain = openProbe + b.probeSecondPerDomain + b.deepPerDomain;
  const deepOnly = (b.deepPerDomain + b.probeSecondPerDomain) * DOMAINS_BY_TIER.basic;
  const stdAdd = deepOnly + openDomain + b.consist;
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

/**
 * 추정 시간. **실측이 아니다.** 파일럿에서 재서 고친다.
 *
 * 노리는 길이는 BASIC 8~12분 · STANDARD 15~22분 · PRO 22~35분이다. 박사와
 * 포닥은 분기 때문에 조금 더 길어질 수 있다. `npm run v3:length` 가 실제
 * 계획으로 세어 이 선을 넘는지 본다.
 */
export const SECONDS = {
  grid: 5,
  /**
   * 보기 넷 하나를 읽고 고르는 시간.
   *
   * 18 에서 13 으로 내렸다. 한 선택으로 끝나는 화면이 **눌리면 저절로
   * 넘어가서** 두 번째 누르기가 없어졌고, 한 축의 두 문항이 한 화면에
   * 서면서 머리말과 영역 이름을 두 번 읽지 않는다. **실측이 아니다.**
   */
  lv4: 13, five: 8, force: 15, pick: 20, trans: 40,
  /** 화면이 넘어가는 사이 */
  turn: 2,
  /** 산업 장면 한 절. 읽기만 한다 */
  scene: 25,
  /** 영역마다 한 번 띄우는 판단·산출물·검증 체크리스트 */
  checklist: 60,
  /** 안내와 영역 고르기 */
  intro: 60,
} as const;

export function minutes(b: Blocks): Record<string, number> {
  const S = SECONDS;
  const basic = b.grid * S.grid + b.judge * S.lv4 + b.force * S.force +
    (b.probePerDomain * DOMAINS_BY_TIER.basic + b.branch) * S.lv4 +
    b.learningPerDomain * DOMAINS_BY_TIER.basic * S.grid +
    DOMAINS_BY_TIER.basic * S.checklist + S.intro + S.pick + S.scene;
  const stdAdd = (b.probePerDomain + b.deepPerDomain * DOMAINS_BY_TIER.standard) * S.lv4 +
    b.consist * S.lv4 + S.checklist + S.pick * 2;
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
