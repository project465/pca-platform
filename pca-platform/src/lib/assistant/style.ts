/**
 * **MAT AI 답의 글쓰기 규칙**(2026-11-03 대표 "가독성과 AI느낌 안나는게 중요", "외국인들도 다 진행할꺼잖아").
 * 화면 문구 규칙(CLAUDE.md `화면 문구 규칙`)과 같은 자다. 모든 부름의 시스템 글 끝에 붙는다(`claude.ts` `systemBlocks`).
 * 고정 글이라 캐시가 그대로 듣는다.
 */
export const STYLE_KO = [
  "글쓰기 규칙(답은 화면에 그대로 나간다. 읽는 사람은 한국어가 모국어가 아닐 수도 있다):",
  "- 한 문장에 한 뜻만 쓴다. 한 문장은 60자를 넘기지 않는다.",
  "- 주어와 동사를 분명히 쓴다.",
  "- 비유 · 관용구 · 수필체를 쓰지 않는다(예: 파고들다, 결, 밑그림, 한 걸음, 서다).",
  "- 줄임말을 쓰지 않는다.",
  "- 인사 · 칭찬 · 격려 · 다짐 · 맺음 문장을 쓰지 않는다.",
  "- '함께', '여정', '인사이트', '효과적으로', '체계적으로', '도와드릴게요' 같은 말을 쓰지 않는다.",
  "- 대시(—)와 'A가 아니라 B' 꼴을 쓰지 않는다.",
  "- 하지 않는 일을 늘어놓지 않는다.",
  "- 같은 대상은 답 전체에서 한 단어로 부른다.",
].join("\n");

export const STYLE_EN = [
  "Writing rules (the answer is shown as is; the reader may not be a native English speaker):",
  "- One idea per sentence. Keep sentences under 20 words.",
  "- Use a clear subject and verb.",
  "- No idioms, metaphors or essay style.",
  "- No abbreviations.",
  "- No greetings, praise, encouragement, promises or closing lines.",
  "- Avoid filler such as 'journey', 'insight', 'leverage', 'effectively', 'I'd be happy to'.",
  "- No dashes (—).",
  "- Do not list things you will not do.",
  "- Call the same thing by the same word throughout.",
].join("\n");

/**
 * 시스템 글의 언어에 맞는 규칙을 끝에 붙인다(한글이 있으면 한국어 규칙). **답의 언어를 따로 정한 부름**
 * (`style`)은 그 언어의 규칙이다: 한국어 지시로 영어 답을 받는 자료 정리(`research-docs.ts`)가 그렇다
 */
export function withStyle(system: string, style?: "ko" | "en"): string {
  const ko = style ? style === "ko" : /[가-힣]/.test(system);
  return `${system}\n\n${ko ? STYLE_KO : STYLE_EN}`;
}
