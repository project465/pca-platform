import Link from "next/link";
import { verifyEmail } from "@/lib/signup";

export const metadata = { title: "이메일 확인 — 현멘" };
export const dynamic = "force-dynamic";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ok = await verifyEmail(token);

  return (
    <div className="center-wrap">
      <div className="panel narrow">
        <h1>{ok ? "가입이 끝났습니다" : "링크가 만료됐습니다"}</h1>
        <p className="sub">
          {ok
            ? "이제 로그인해서 현직자 멘토링을 신청할 수 있습니다."
            : "이미 사용했거나 3일이 지난 링크입니다. 로그인해 보시고, 안 되면 다시 가입해 주세요."}
        </p>
        <Link className="act solid full" href="/login">
          로그인으로
        </Link>
      </div>
    </div>
  );
}
