/**
 * 화면 하나를 그리는 데 필요한 것만 담는다. **문항 은행을 브라우저로
 * 내려보내지 않는다.**
 *
 * 문항이 291개인데 전부 내려보내면 첫 화면이 그만큼 늦게 서고, 열리지
 * 않은 팩 문항까지 브라우저에 들어간다. 그래서 지금 화면의 문항만 담고,
 * 다음 화면은 다음 요청에서 만든다.
 */
import type { Control } from "@/lib/me-v3/runtime/menus";

export type Field = {
  itemId: string;
  /** 격자와 선호 화면처럼 한 화면에 여럿 설 때의 줄 이름 */
  label?: string;
  control: Control;
  value: number | string | null;
  note?: string;
  /** 보기마다 붙는 짧은 뜻. 보기 넷에서만 쓴다 */
  optionHelp?: string[];
  /** 보기마다 붙는 네 글자 꼬리표. 보기 넷에서만 쓴다 */
  optionTag?: string[];
};

export type Group = {
  slot: string; label: string; items: string[]; picked: string[];
};

export type PackChoice = { code: string; name: string; gloss: string };

/** 보기 넷을 한눈에 가르는 꼬리표. 보기 넷 화면에서만 */
export type OptionTag = string[];

export type ScreenModel = {
  attemptId: string;
  kind: string;
  index: number;
  prevIndex: number | null;
  nextIndex: number | null;
  required: boolean;
  eyebrow?: string;
  subject?: string;
  question?: string;
  help?: string;
  /** 보기 읽는 법 한 줄. 보기 넷 화면에서만 */
  guide?: string;
  fields: Field[];
  groups?: Group[];
  /** 근거 고르기 화면이 쓰는 영역. **사용자에게는 보이지 않는다** */
  domain?: string;
  packs?: PackChoice[];
  picked?: string | null;
  /** 기본 정보를 고치는 화면 */
  profile?: { stage: string; field: string | null };
  /** 완료 화면이 적는 것 */
  answered?: number;
  done?: boolean;
};

export type ProgressModel = {
  /** 지나온 단계 하나 · 지금 · 다음 하나. **여덟을 늘어놓지 않는다** */
  prev: string | null;
  now: string;
  next: string | null;
  inStage: { index: number; total: number };
  percent: number;
};
