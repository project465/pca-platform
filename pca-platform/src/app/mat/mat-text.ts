/**
 * MAT(`/mat`) 문구 파일(CLAUDE.md 화면 문구 규칙 8). 번역은 같은 열쇠에 `en` · `ja` 를 붙인다.
 * MAT 화면의 높임은 `-요` 한 꼴이다.
 */
import type { Txt } from "../me/me-text";

/** 지원서(`/mat/draft`) */
export const DRAFT_TEXT = {
  needFirst: { ko: "필수 요건에 맞는 경험을 먼저 적어 보세요." },
  lead: { ko: "공고 요건마다 내 경험으로 초안 문장을 만들어요. 빈칸을 채우면 지원서 문장이 돼요." },
  draftTitle: { ko: "초안 문장" },
  more: { ko: "경험을 더 적으면 초안 문장이 늘어요." },
  otherCore: { ko: "다른 전공으로 읽은 공고예요." },
  empty: { ko: "공고를 하나 분석하면 필수 요건마다 내 경험으로 만든 초안 문장이 여기에 생겨요." },
  toFill: { ko: "채울 것 보기" },
} satisfies Record<string, Txt>;
