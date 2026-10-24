/**
 * 검사 화면 글을 **언어마다 한 벌씩** 든다. 고르는 자리는 `copyFor()` 하나다.
 *
 * 화면 코드에 언어 분기를 흩어 두면 한 언어만 고쳐지는 날이 오고, 그날
 * 영어 화면 한가운데 한국어가 선다. 모양을 한 타입으로 묶어 두면 영어판이
 * 빠뜨린 칸을 타입 검사가 먼저 잡는다.
 *
 * **판정에 들어가지 않는다.** 채점은 이 파일을 읽지 않는다.
 */
import type { V3Lang } from "../i18n";
import { COPY_KO } from "./copy.ko";
import { COPY_EN } from "./copy.en";

type Ax = "J1" | "J2" | "J3" | "J4" | "J5" | "J6" | "J7" | "J8";
type Stage = "PROFILE" | "FIELD" | "EXPLORE" | "JUDGE" | "DEEP" | "EVIDENCE"
  | "PACK" | "TRANSLATE" | "DONE";
type Branch = "ug-core" | "ms-core" | "phd-core" | "postdoc-core";
type Lines = { eyebrow: string; question: string; help: string };
type CoreCopy = {
  pairAsk: Record<string, string>;
  deepPair: Record<string, string>;
  exposureHelp: string;
};

export type RuntimeCopy = {
  stages: Record<Stage, string>;
  stageLead: Record<Stage, string>;
  transGroups: Record<"frame" | "method" | "result" | "handoff",
    { subject: string; question: string }>;
  coreDefault: CoreCopy;
  coreCopy: Record<string, Partial<{
    pairAsk: Partial<Record<string, string>>;
    deepPair: Partial<Record<string, string>>;
    exposureHelp: string;
  }>>;
  /** 영역 수를 글로. 한국어는 `세`, 영어는 `three` */
  count: (n: number) => string;
  plan: {
    profile: Lines;
    pickIndustry: Lines;
    scene: {
      eyebrow: string;
      questionTwo: (major: string) => string;
      questionOne: (industry: string, major: string) => string;
      help: string;
    };
    sweepInterest: Lines;
    sweepExposure: { eyebrow: string; question: string };
    sweepLearning: Lines;
    sweepPage: (eyebrow: string, k: number, n: number) => string;
    force: Record<string, { eyebrow: string; help: string }>;
    forceFallback: { eyebrow: string; help: string };
    judge: { eyebrow: string; pair: (grad: boolean) => string };
    xfield: {
      eyebrow: string; question: string;
      help: (major: string) => string;
      chips: (major: string) => string[];
      itemHelp: string;
    };
    judgeStrip: (count: string, names: string[], many: boolean) => string;
    pairFallback: string;
    checklist: { eyebrow: string; question: (domain: string) => string; help: string };
    consist: { eyebrow: string; j3Postdoc: string; j3: string; j5: string; other: string };
    pickRole: Lines;
    pickOrg: Lines;
    industry: { strip: (name: string | null) => string; eyebrowFallback: string };
    trans: {
      eyebrow: string; question: (grad: boolean) => string; help: string; chips: string[];
    };
    target: Lines;
    done: { eyebrow: string; question: string };
  };
  branch: Record<Branch, { eyebrow: string; ask: string; help: string }>;
  branchByCore: Record<string,
    Partial<Record<Branch, Partial<{ eyebrow: string; ask: string; help: string }>>>>;
  axisLabel: Record<Ax, string>;
  axisAsk: Record<Ax, string>;
  axisAskByCore: Record<string, Partial<Record<string, string>>>;
  slotLabel: { ARTIFACT: string; VERIFY: string };
  menus: {
    scale5: string[];
    exposure: string[];
    unknown: string;
    fullScale5: Record<string, Record<number, string>>;
    orgTypes: string[];
  };
  sceneHint: (scenes: string[]) => string;
  /**
   * 보기 넷의 뜻풀이(자리 0~3). **한국어는 `scoring/ownership.ts` 가 유일한
   * 출처다**: 그 파일은 측정 동결 안에 있어 손대지 않고, 여기서는 읽어 쓴다.
   * 다른 언어는 같은 뜻을 그 언어로 적는다. 판정은 자리 번호만 본다.
   */
  ownershipMeans: string[];
  /** 뜻풀이 뒤에 장면 하나를 붙이는 꼴 */
  ownershipWithExample: (means: string, example: string) => string;
};

/** 그 언어의 화면 글. 모르는 값이면 한국어(원본)다 */
export function copyFor(lang?: V3Lang | string | null): RuntimeCopy {
  return lang === "en" ? COPY_EN : COPY_KO;
}
