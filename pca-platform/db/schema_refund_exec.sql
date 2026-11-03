-- ============================================================
--  환불 집행 기록 (2026-11-03 수익화 E-1)
--
--  운영자가 환불을 승인하면 결제대행사에 실제로 취소를 요청한다.
--  대행사가 확인한 뒤에만 `refund_done` 메일을 보낸다.
--  대행사 쪽에서 먼저 취소한 결제(웹훅)도 같은 장부에 적는다.
--
--  **더하기만 한다.** 칸을 더하고, 지우거나 이름을 바꾸지 않는다.
-- ============================================================

/* 환불 한 줄이 대행사의 어느 취소와 이어지는가 */
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS provider_refund_id TEXT;
/* approval = 운영자 승인 후 우리가 요청 · pg_cancel = 대행사 웹훅으로 알게 된 취소 */
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS source TEXT;

/* 승인했는데 대행사가 거절한 요청. 운영자 화면이 다시 시도 단추를 세운다 */
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS provider_error TEXT;
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS exec_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ;
