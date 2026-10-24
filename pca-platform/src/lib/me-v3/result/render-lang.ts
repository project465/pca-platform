/**
 * 결과지를 그리는 **한 요청 안에서** 응시 언어를 들고 다닌다.
 *
 * 결과지 쪽은 작은 서버 컴포넌트 수십 개가 모인 것이라, 조각마다 `lang` 을
 * 인자로 넘기면 하나가 빠지는 날 그 조각만 한국어로 선다. 모듈 전역 변수로
 * 두면 서버가 두 사람의 결과지를 동시에 그릴 때 섞인다. React 의 `cache()` 는
 * 한 요청 동안만 같은 값을 돌려주므로 그 둘 사이의 자리다.
 *
 * 요청 밖(검사 스크립트)에서는 기억하지 않아 늘 한국어다: 지금의 동작 그대로다.
 */
import { cache } from "react";
import type { V3Lang } from "../i18n";

const box = cache((): { lang: V3Lang } => ({ lang: "ko" }));

/** 그 쪽의 맨 위에서 한 번 부른다 */
export function setRenderLang(lang: V3Lang): void {
  box().lang = lang;
}

export function renderLang(): V3Lang {
  return box().lang;
}
