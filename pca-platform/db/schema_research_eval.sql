-- ============================================================
--  논문 읽기 채점표 (2026-10-31 대표 지시)
--
--  MAT 이 읽은 자료 한 건마다, 그 자료를 쓴 본인이 여섯 칸을 누른다:
--  핵심 요약 · 방법 · 핵심 결과와 근거 위치 · 직무의 말 · 면접 질문은
--  맞음 / 일부 / 틀림, 그리고 자료에 없는 것을 지어냈는가는 있음 / 없음.
--
--  **본인이 채점한다.** 논문이 맞게 읽혔는지는 그 논문을 쓴 사람이 가장 잘 안다.
--  **자유입력을 받지 않는다**: 남는 것은 칸과 고른 값뿐이라 이 표 자체는 개인의
--  서술을 품지 않는다. 자료 줄을 지우면(본인이 지우거나 탈퇴하면) 같이 지워진다.
--
--  **점수에 들어가지 않는다**(설계 원칙 6). MAT 의 읽기 품질을 재는 데만 쓴다.
-- ============================================================

CREATE TABLE IF NOT EXISTS research_feedback (
  doc_id      BIGINT NOT NULL REFERENCES research_docs(id) ON DELETE CASCADE,
  part        TEXT NOT NULL CHECK (part IN ('summary', 'methods', 'findings', 'job', 'interview', 'invented')),
  verdict     TEXT NOT NULL CHECK (verdict IN ('right', 'partly', 'wrong', 'yes', 'no')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (doc_id, part),
  /* 지어냈는가 칸만 있음 / 없음을 받고, 나머지는 맞음 / 일부 / 틀림만 받는다 */
  CONSTRAINT research_feedback_verdict_kind CHECK ((part = 'invented') = (verdict IN ('yes', 'no')))
);

COMMENT ON TABLE research_feedback IS
  'MAT 자료 읽기 채점표. 본인이 칸마다 맞음/일부/틀림, 지어냄 있음/없음을 누른다. 자유입력 없음';
