import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { openAttempt, PAGE_SIZE } from "@/lib/attempts";
import { queryOne } from "@/lib/db";

export const metadata = { title: "검사 시작 — METRI" };

export default async function TestEntry() {
  const user = await requireRole(["student"]);
  const attempt = await openAttempt(user.id);

  if (!attempt) {
    return (
      <div className="center-wrap">
        <div className="panel narrow">
          <h1>응시할 검사가 없습니다</h1>
          <p className="sub">
            개인으로 오셨다면 결제 후 바로 응시할 수 있고, 학교를 통해 오셨다면
            학과에서 명단에 올린 뒤 열립니다.
          </p>
          <Link className="act solid" href="/checkout?product=REPORT_UNIV">
            개인으로 시작하기
          </Link>
        </div>
      </div>
    );
  }
  if (attempt.status === "scored") redirect(`/report/${attempt.id}`);

  const inst = await queryOne<{ item_count: number; est_minutes: number }>(
    `SELECT item_count, est_minutes FROM instruments WHERE id = $1`,
    [attempt.instrumentId],
  );
  const page = Math.floor((attempt.resumeOrderNo - 1) / PAGE_SIZE) + 1;

  return (
    <div className="center-wrap">
      <div className="panel narrow">
        <h1>기계공학 직무적합 검사</h1>
        <p className="sub">
          {inst?.item_count ?? attempt.total}문항 · 약 {inst?.est_minutes ?? 30}분
        </p>
        <ul className="brief">
          <li>정답이 없습니다. 오래 고민하지 말고 먼저 떠오르는 쪽을 고르세요.</li>
          <li>한 문항 고를 때마다 저장됩니다. 도중에 닫아도 이어서 볼 수 있습니다.</li>
          <li>끝까지 답해야 결과지가 나옵니다.</li>
        </ul>
        <Link className="act solid" href={`/test/${attempt.id}?p=${page}`}>
          {attempt.answered > 0 ? `${attempt.resumeOrderNo}번부터 이어보기` : "검사 시작"}
        </Link>
      </div>
    </div>
  );
}
