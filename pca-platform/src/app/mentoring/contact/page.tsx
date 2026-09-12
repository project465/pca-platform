import Link from "next/link";
import { queryOne } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { mentorForUser } from "@/lib/mentoring";
import MentoringShell from "@/components/mentoring-shell";
import ContactForm from "./contact-form";

export const metadata = { title: "문의 — 현멘" };
export const dynamic = "force-dynamic";

/**
 * 문의 창구.
 *
 * 로그인을 요구하지 않는다. 결제가 막힌 사람은 로그인부터 막혀 있을 수 있고,
 * 그 사람이야말로 연락이 제일 급하다.
 *
 * 위에 '먼저 확인할 곳'을 둔 이유는 대부분의 문의가 이미 답이 있는 것이기 때문이다.
 * 답이 있는 질문을 하루 기다리게 하는 것은 답을 못 주는 것과 비슷하다.
 */
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const user = await currentUser();
  const sp = await searchParams;
  const mine = user ? await mentorForUser(user.id) : null;
  // 로그인한 사람은 다시 적지 않아도 되게 채워둔다
  const me = user
    ? await queryOne<{ email: string | null }>(`SELECT email FROM users WHERE id = $1`, [user.id])
    : null;

  return (
    <MentoringShell user={user} current="/mentoring/contact" isMentor={Boolean(mine)}>
      <div className="page-head">
        <h1>문의</h1>
      </div>

      <p className="lede">
        답을 받으실 이메일만 정확하면 됩니다. 보통 하루 안에 답하고, 결제나 세션 문제는
        먼저 봅니다.
      </p>

      <div className="notice" style={{ marginBottom: 22 }}>
        <b>먼저 여기를 보시면 더 빠릅니다</b>
        <br />
        요금·환불·익명·정산은 <Link href="/mentoring/guide">이용 안내</Link>에,
        자주 나오는 질문은 <Link href="/mentoring/faq">자주 묻는 질문</Link>에 있습니다.
      </div>

      <div className="panel form-panel">
        <ContactForm
          defaultName={user?.name ?? ""}
          defaultEmail={me?.email ?? ""}
          defaultKind={sp.kind ?? "general"}
        />
      </div>

      <p className="foot-note">
        남기신 내용과 이메일은 답변에만 씁니다. 보관 기간은{" "}
        <Link href="/privacy">개인정보처리방침</Link>에 있습니다.
      </p>
    </MentoringShell>
  );
}
