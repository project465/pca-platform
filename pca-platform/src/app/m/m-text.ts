/**
 * 손전화 앱(`/m`) 문구 파일(CLAUDE.md 화면 문구 규칙 8). 번역은 같은 열쇠에 `en` · `ja` 를 붙인다.
 */
import type { Txt } from "../me/me-text";

export const M_TAB_TEXT = {
  mat: { ko: "MAT" },
  home: { ko: "홈" },
  todo: { ko: "할 일" },
  experience: { ko: "경험" },
  me: { ko: "내 정보" },
  menu: { ko: "앱 메뉴" },
  pass: { ko: "이용권" },
} satisfies Record<string, Txt>;
